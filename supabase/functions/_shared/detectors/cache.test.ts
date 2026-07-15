import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import {
  type CachingMultiDetectorOptions,
  configuredSignature,
  createCachingMultiDetector,
  createTtlLruCache,
  sha256Hex,
} from "./cache.ts";
import { type MultiDetector } from "./index.ts";
import {
  type AiDetectorProvider,
  type DetectResponse,
  type ProviderResult,
} from "./types.ts";

// --- test helpers ----------------------------------------------------------

// A mutable clock so TTL/LRU behaviour is deterministic (no real time).
function fakeClock(start = 0): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

function providerCard(id: string, available = true): ProviderResult {
  return { id, name: id, score: 90, risk: "red", available };
}

function response(source: DetectResponse["source"], cards: ProviderResult[]): DetectResponse {
  return {
    overallScore: 90,
    risk: "red",
    sentences: [],
    source,
    providers: cards,
  };
}

// A fake aggregator that counts how often it actually runs (i.e. how often the
// cache missed) and returns whatever the given factory produces per call.
function countingInner(make: (call: number) => DetectResponse): {
  detector: MultiDetector;
  calls: () => number;
} {
  let calls = 0;
  return {
    detector: {
      detect: () => {
        calls += 1;
        return Promise.resolve(make(calls));
      },
    },
    calls: () => calls,
  };
}

// Wrapper options that never touch the environment: a fixed signature and clock.
function stableOptions(over: Partial<CachingMultiDetectorOptions> = {}): CachingMultiDetectorOptions {
  return { providerSignature: () => "test", now: fakeClock().now, ...over };
}

function stubProvider(id: string, configured: boolean): AiDetectorProvider {
  return {
    id,
    name: id,
    isConfigured: () => configured,
    detect: () => Promise.reject(new Error("not used in signature tests")),
  };
}

// --- TtlLruCache: TTL ------------------------------------------------------

Deno.test("cache: serves a value until it expires, then drops it", () => {
  const clock = fakeClock();
  const cache = createTtlLruCache<string>({ maxEntries: 8, ttlMs: 100, now: clock.now });

  cache.set("k", "v");
  assertEquals(cache.get("k"), "v");

  clock.advance(99);
  assertEquals(cache.get("k"), "v"); // still inside the TTL window

  clock.advance(1); // now() === expiresAt → treated as expired
  assertEquals(cache.get("k"), undefined);
  assertEquals(cache.size(), 0); // the expired entry is pruned on read
});

Deno.test("cache: TTL runs from insertion, not from last read", () => {
  const clock = fakeClock();
  const cache = createTtlLruCache<string>({ maxEntries: 8, ttlMs: 100, now: clock.now });

  cache.set("k", "v");
  clock.advance(50);
  assertEquals(cache.get("k"), "v"); // a read must not extend the lifetime

  clock.advance(50); // 100ms since insertion
  assertEquals(cache.get("k"), undefined);
});

// --- TtlLruCache: LRU ------------------------------------------------------

Deno.test("cache: evicts the least-recently-used entry past capacity", () => {
  const cache = createTtlLruCache<string>({ maxEntries: 2, ttlMs: 10_000 });

  cache.set("a", "1");
  cache.set("b", "2");
  cache.get("a"); // 'a' is now the most-recently-used, 'b' the least
  cache.set("c", "3"); // over capacity → evict 'b'

  assertEquals(cache.get("b"), undefined);
  assertEquals(cache.get("a"), "1");
  assertEquals(cache.get("c"), "3");
  assertEquals(cache.size(), 2);
});

Deno.test("cache: re-setting a key refreshes its value and recency", () => {
  const cache = createTtlLruCache<string>({ maxEntries: 2, ttlMs: 10_000 });

  cache.set("a", "1");
  cache.set("b", "2");
  cache.set("a", "1b"); // update 'a' → 'b' becomes least-recently-used
  cache.set("c", "3"); // evict 'b'

  assertEquals(cache.get("a"), "1b");
  assertEquals(cache.get("b"), undefined);
  assertEquals(cache.get("c"), "3");
});

Deno.test("cache: clear empties the map", () => {
  const cache = createTtlLruCache<string>({ maxEntries: 4, ttlMs: 10_000 });
  cache.set("a", "1");
  cache.set("b", "2");
  cache.clear();
  assertEquals(cache.size(), 0);
  assertEquals(cache.get("a"), undefined);
});

// --- sha256Hex -------------------------------------------------------------

Deno.test("sha256Hex: matches known vectors", async () => {
  assertEquals(
    await sha256Hex(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  assertEquals(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

// --- configuredSignature ---------------------------------------------------

Deno.test("configuredSignature: sorted ids of only the configured providers", () => {
  const sig = configuredSignature([
    stubProvider("gptzero", true),
    stubProvider("originality", false), // no key → excluded
    stubProvider("copyleaks", true),
  ]);
  assertEquals(sig, "copyleaks,gptzero"); // sorted, originality dropped
});

Deno.test("configuredSignature: empty when nothing is configured", () => {
  assertEquals(configuredSignature([stubProvider("gptzero", false)]), "");
});

// --- caching wrapper -------------------------------------------------------

Deno.test("wrapper: a repeated request is served from cache, not re-billed", async () => {
  const inner = countingInner(() => response("providers", [providerCard("gptzero")]));
  const md = createCachingMultiDetector(inner.detector, stableOptions());

  const first = await md.detect("same text");
  const second = await md.detect("same text");

  assertEquals(inner.calls(), 1); // second request never reached the providers
  assertEquals(second, first);
});

Deno.test("wrapper: distinct texts are billed independently", async () => {
  const inner = countingInner((n) => response("providers", [providerCard(`call-${n}`)]));
  const md = createCachingMultiDetector(inner.detector, stableOptions());

  await md.detect("text one");
  await md.detect("text two");

  assertEquals(inner.calls(), 2); // different hashes → two provider runs
});

Deno.test("wrapper: heuristic fallbacks are not cached (retry stays possible)", async () => {
  const inner = countingInner(() => response("heuristic", [providerCard("heuristic")]));
  const md = createCachingMultiDetector(inner.detector, stableOptions());

  await md.detect("same text");
  await md.detect("same text");

  assertEquals(inner.calls(), 2); // free result → recomputed so providers can recover
});

Deno.test("wrapper: a heuristic miss does not poison a later paid result", async () => {
  // First call degrades to heuristic (providers down); the second recovers. The
  // cache must not have stored the heuristic answer, and must cache the paid one.
  const inner = countingInner((n) =>
    n === 1
      ? response("heuristic", [providerCard("heuristic")])
      : response("providers", [providerCard("gptzero")])
  );
  const md = createCachingMultiDetector(inner.detector, stableOptions());

  const degraded = await md.detect("same text");
  const recovered = await md.detect("same text");
  const cached = await md.detect("same text");

  assertEquals(degraded.source, "heuristic");
  assertEquals(recovered.source, "providers");
  assertEquals(inner.calls(), 2); // 3rd request hit the cached paid result
  assertEquals(cached, recovered);
});

Deno.test("wrapper: the provider set is part of the key", async () => {
  // Same text, but the configured provider set changes between the two calls: the
  // results must not collide. Switching the signature back returns the first hit.
  let signature = "gptzero";
  const inner = countingInner((n) => response("providers", [providerCard(`call-${n}`)]));
  const md = createCachingMultiDetector(
    inner.detector,
    stableOptions({ providerSignature: () => signature }),
  );

  const withGptzero = await md.detect("same text");
  signature = "gptzero,originality";
  const withBoth = await md.detect("same text");

  assertEquals(inner.calls(), 2); // signature change forced a recompute
  assertNotEquals(withBoth, withGptzero);

  signature = "gptzero"; // back to the first set → served from cache
  const again = await md.detect("same text");
  assertEquals(inner.calls(), 2);
  assertEquals(again, withGptzero);
});

Deno.test("wrapper: entries expire so a later identical request is re-billed", async () => {
  const clock = fakeClock();
  const inner = countingInner(() => response("providers", [providerCard("gptzero")]));
  const md = createCachingMultiDetector(
    inner.detector,
    stableOptions({ now: clock.now, ttlMs: 1_000 }),
  );

  await md.detect("same text");
  await md.detect("same text");
  assertEquals(inner.calls(), 1); // second is a cache hit

  clock.advance(1_000); // entry expires
  await md.detect("same text");
  assertEquals(inner.calls(), 2); // recomputed after TTL
});

Deno.test("wrapper: honours an injected cache instance", async () => {
  const cache = createTtlLruCache<DetectResponse>({ maxEntries: 4, ttlMs: 10_000 });
  const inner = countingInner(() => response("providers", [providerCard("gptzero")]));
  const md = createCachingMultiDetector(inner.detector, { providerSignature: () => "x", cache });

  await md.detect("same text");
  assertEquals(cache.size(), 1); // the wrapper populated the shared cache
  assert(inner.calls() === 1);
});
