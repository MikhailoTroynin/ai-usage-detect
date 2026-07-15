import { assert, assertEquals } from "jsr:@std/assert@1";
import { createMultiDetector, multiDetector } from "./index.ts";
import {
  type AiDetectorProvider,
  type DetectionResult,
  detectionFromResult,
  type SentenceDetection,
  scoreToRisk,
  unavailableDetection,
} from "./types.ts";

// --- fake providers --------------------------------------------------------
//
// The aggregator's collaborators are fully injected, so these tests exercise the
// fan-out/consensus/fallback logic with no network and no environment access
// (keeps `deno test` runnable without --allow-env, like the provider tests).

function sentence(text: string, score: number): SentenceDetection {
  return { text, score, risk: scoreToRisk(score) };
}

function makeResult(overallScore: number, sentences: SentenceDetection[] = []): DetectionResult {
  return { overallScore, risk: scoreToRisk(overallScore), sentences };
}

// A configured provider that answers with a normalized result.
function availableProvider(
  id: string,
  result: DetectionResult,
  onDetect?: () => void,
): AiDetectorProvider {
  return {
    id,
    name: id,
    isConfigured: () => true,
    detect: () => {
      onDetect?.();
      return Promise.resolve(detectionFromResult({ id, name: id }, result));
    },
  };
}

// A configured provider whose call failed (HTTP error / timeout / 429).
function failingProvider(id: string, error = "boom"): AiDetectorProvider {
  return {
    id,
    name: id,
    isConfigured: () => true,
    detect: () => Promise.resolve(unavailableDetection({ id, name: id }, error)),
  };
}

// A provider with no key — must be skipped entirely (never queried, not carded).
function unconfiguredProvider(id: string, onDetect?: () => void): AiDetectorProvider {
  return {
    id,
    name: id,
    isConfigured: () => false,
    detect: () => {
      onDetect?.();
      return Promise.resolve(unavailableDetection({ id, name: id }, "unconfigured"));
    },
  };
}

// A provider that violates the never-throw contract, to prove the aggregator
// still isolates it via Promise.allSettled.
function throwingProvider(id: string): AiDetectorProvider {
  return {
    id,
    name: id,
    isConfigured: () => true,
    detect: () => Promise.reject(new Error("kaboom")),
  };
}

function fakeFallback(result: DetectionResult): AiDetectorProvider {
  const self = { id: "heuristic", name: "Heuristic" };
  return {
    ...self,
    isConfigured: () => true,
    detect: () => Promise.resolve(detectionFromResult(self, result)),
  };
}

// --- tests -----------------------------------------------------------------

Deno.test("falls back to heuristic when no real provider is configured", async () => {
  let realCalled = false;
  const md = createMultiDetector({
    providers: [unconfiguredProvider("gptzero", () => (realCalled = true))],
    fallback: fakeFallback(makeResult(20, [sentence("hello world.", 20)])),
  });

  const res = await md.detect("hello world.");

  assertEquals(realCalled, false); // unconfigured provider is never queried
  assertEquals(res.source, "heuristic");
  assertEquals(res.overallScore, 20);
  assertEquals(res.risk, "green");
  assertEquals(res.sentences, [sentence("hello world.", 20)]);
  assertEquals(res.providers.map((p) => p.id), ["heuristic"]);
  assertEquals(res.providers[0].available, true);
});

Deno.test("uses the primary (gptzero) result verbatim when it is available", async () => {
  const md = createMultiDetector({
    providers: [
      availableProvider("gptzero", makeResult(90, [sentence("ai text.", 95)])),
      availableProvider("originality", makeResult(10)),
    ],
    fallback: fakeFallback(makeResult(0)),
  });

  const res = await md.detect("x");

  assertEquals(res.source, "providers");
  assertEquals(res.overallScore, 90); // gptzero verbatim, not the 90/10 consensus
  assertEquals(res.risk, "red");
  assertEquals(res.sentences, [sentence("ai text.", 95)]);
  assertEquals(res.providers.map((p) => p.id), ["gptzero", "originality"]);
  assert(res.providers.every((p) => p.available));
});

Deno.test("uses the median consensus when the primary is unavailable", async () => {
  const md = createMultiDetector({
    providers: [
      failingProvider("gptzero", "GPTZero API error (429) — rate limited"),
      availableProvider("originality", makeResult(40, [sentence("first.", 40)])),
      availableProvider("copyleaks", makeResult(80, [sentence("second.", 80)])),
    ],
    fallback: fakeFallback(makeResult(0)),
  });

  const res = await md.detect("x");

  assertEquals(res.source, "providers");
  assertEquals(res.overallScore, 60); // median of [40, 80]
  assertEquals(res.risk, "amber");
  // Sentences come from the highest-priority provider that produced any.
  assertEquals(res.sentences, [sentence("first.", 40)]);
  assertEquals(res.providers.map((p) => p.id), ["gptzero", "originality", "copyleaks"]);
  assertEquals(res.providers[0].available, false);
  assert(res.providers[0].error?.includes("429"));
});

Deno.test("consensus skips providers that produced no sentences for highlighting", async () => {
  const md = createMultiDetector({
    providers: [
      failingProvider("gptzero"),
      availableProvider("originality", makeResult(50, [])), // overall-only, no sentences
      availableProvider("copyleaks", makeResult(70, [sentence("has text.", 70)])),
    ],
    fallback: fakeFallback(makeResult(0)),
  });

  const res = await md.detect("x");

  assertEquals(res.overallScore, 60); // median of [50, 70]
  assertEquals(res.sentences, [sentence("has text.", 70)]);
});

Deno.test("falls back to heuristic when every configured provider fails, keeping their cards", async () => {
  const md = createMultiDetector({
    providers: [
      failingProvider("gptzero", "GPTZero API error (500)"),
      failingProvider("originality", "Originality.ai request timed out after 20000ms"),
    ],
    fallback: fakeFallback(makeResult(33, [sentence("approximate.", 33)])),
  });

  const res = await md.detect("x");

  assertEquals(res.source, "heuristic");
  assertEquals(res.overallScore, 33);
  assertEquals(res.sentences, [sentence("approximate.", 33)]);
  // Failed real cards are preserved (N/A + error), heuristic appended last.
  assertEquals(res.providers.map((p) => p.id), ["gptzero", "originality", "heuristic"]);
  assertEquals(res.providers[0].available, false);
  assertEquals(res.providers[1].available, false);
  assertEquals(res.providers[2].available, true);
});

Deno.test("skips unconfigured providers so they never appear on the card", async () => {
  const md = createMultiDetector({
    providers: [
      availableProvider("gptzero", makeResult(90)),
      unconfiguredProvider("copyleaks"),
    ],
    fallback: fakeFallback(makeResult(0)),
  });

  const res = await md.detect("x");

  assertEquals(res.providers.map((p) => p.id), ["gptzero"]); // copyleaks absent
});

Deno.test("isolates a provider that throws, mapping it to an unavailable card", async () => {
  const md = createMultiDetector({
    providers: [
      throwingProvider("gptzero"),
      availableProvider("originality", makeResult(55)),
    ],
    fallback: fakeFallback(makeResult(0)),
  });

  const res = await md.detect("x");

  // gptzero threw → unavailable; originality answered → consensus of [55].
  assertEquals(res.source, "providers");
  assertEquals(res.overallScore, 55);
  const gptzero = res.providers.find((p) => p.id === "gptzero");
  assertEquals(gptzero?.available, false);
  assert(gptzero?.error?.includes("provider threw"));
});

Deno.test("queries every configured provider exactly once, in parallel", async () => {
  const calls: string[] = [];
  const md = createMultiDetector({
    providers: [
      availableProvider("gptzero", makeResult(90), () => calls.push("gptzero")),
      availableProvider("originality", makeResult(10), () => calls.push("originality")),
      unconfiguredProvider("copyleaks", () => calls.push("copyleaks")),
    ],
    fallback: fakeFallback(makeResult(0)),
  });

  await md.detect("x");

  assertEquals(calls.sort(), ["gptzero", "originality"]);
});

Deno.test("exports a default multiDetector singleton", () => {
  assertEquals(typeof multiDetector.detect, "function");
});
