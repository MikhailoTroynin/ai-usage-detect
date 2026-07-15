import { assert, assertEquals } from "jsr:@std/assert@1";
import { createOriginalityProvider, type OriginalityDeps } from "./originality.ts";

// Hermetic provider factory for the tests: a key is present and the model
// version pin is explicitly empty so nothing reads the real environment (keeps
// `deno test` runnable without --allow-env). Individual tests override what they
// exercise.
function makeProvider(overrides: Partial<OriginalityDeps> = {}) {
  return createOriginalityProvider({
    getApiKey: () => "k",
    getModelVersion: () => undefined,
    ...overrides,
  });
}

// A realistic slice of Originality.ai's /api/v1/scan/ai response. Only the
// fields the adapter reads are asserted on; the rest mirror the real payload for
// fidelity. Each block carries its AI probability under `result.fake`.
function originalityBody(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    score: { original: 0.09, ai: 0.91 },
    credits_used: 3,
    credits: 5081,
    blocks: [
      { result: { fake: 0.98, real: 0.02 }, text: "This was written by a machine." },
      { result: { fake: 0.1, real: 0.9 }, text: "But this part feels human." },
    ],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.test("originality is unconfigured without a key and configured with one", () => {
  const withoutKey = createOriginalityProvider({ getApiKey: () => undefined });
  const withKey = createOriginalityProvider({ getApiKey: () => "k" });
  assertEquals(withoutKey.id, "originality");
  assertEquals(withoutKey.name, "Originality.ai");
  assertEquals(withoutKey.isConfigured(), false);
  assertEquals(withKey.isConfigured(), true);
});

Deno.test("originality normalizes a successful response (score.ai + result.fake blocks)", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const provider = makeProvider({
    getApiKey: () => "secret-key",
    fetchImpl: (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return Promise.resolve(jsonResponse(originalityBody()));
    },
  });

  const { summary, detail } = await provider.detect("some text");

  // Request shape: correct endpoint, POST, X-OAI-API-KEY header, `content` body.
  assertEquals(capturedUrl, "https://api.originality.ai/api/v1/scan/ai");
  assertEquals(capturedInit?.method, "POST");
  assertEquals((capturedInit?.headers as Record<string, string>)["X-OAI-API-KEY"], "secret-key");
  assertEquals(JSON.parse(String(capturedInit?.body)), { content: "some text" });

  // Overall uses score.ai (0.91 -> 91).
  assertEquals(summary.available, true);
  assertEquals(summary.id, "originality");
  assertEquals(summary.score, 91);
  assertEquals(summary.risk, "red");

  assert(detail !== null);
  assertEquals(detail?.overallScore, 91);
  assertEquals(detail?.sentences.length, 2);
  assertEquals(detail?.sentences[0], {
    text: "This was written by a machine.",
    score: 98,
    risk: "red",
  });
  assertEquals(detail?.sentences[1], {
    text: "But this part feels human.",
    score: 10,
    risk: "green",
  });
});

Deno.test("originality reads block AI probability from score_breakdown when blocks is absent", async () => {
  const body = originalityBody({
    blocks: undefined,
    score_breakdown: [
      { ai: 0.8, original: 0.2, text: "Alpha sentence." },
      { ai: 0.2, original: 0.8, text: "Beta sentence." },
    ],
  });
  const provider = makeProvider({
    fetchImpl: () => Promise.resolve(jsonResponse(body)),
  });

  const { detail } = await provider.detect("text");
  assert(detail !== null);
  assertEquals(detail?.sentences.length, 2);
  assertEquals(detail?.sentences[0], { text: "Alpha sentence.", score: 80, risk: "red" });
  assertEquals(detail?.sentences[1], { text: "Beta sentence.", score: 20, risk: "green" });
});

Deno.test("originality keeps the overall-only result when no block breakdown is present", async () => {
  const body = originalityBody({ blocks: undefined });
  const provider = makeProvider({
    fetchImpl: () => Promise.resolve(jsonResponse(body)),
  });

  const { summary, detail } = await provider.detect("text");
  assertEquals(summary.available, true);
  assertEquals(summary.score, 91);
  assert(detail !== null);
  assertEquals(detail?.overallScore, 91);
  assertEquals(detail?.sentences, []);
});

Deno.test("originality passes the model version pin through when configured", async () => {
  let capturedBody: unknown;
  const provider = createOriginalityProvider({
    getApiKey: () => "k",
    getModelVersion: () => "3",
    fetchImpl: (_url, init) => {
      capturedBody = JSON.parse(String(init?.body));
      return Promise.resolve(jsonResponse(originalityBody()));
    },
  });

  await provider.detect("text");
  assertEquals(capturedBody, { content: "text", aiModelVersion: "3" });
});

Deno.test("originality reports unavailable without a key and never calls fetch", async () => {
  let called = false;
  const provider = makeProvider({
    getApiKey: () => undefined,
    fetchImpl: () => {
      called = true;
      return Promise.resolve(jsonResponse(originalityBody()));
    },
  });

  const { summary, detail } = await provider.detect("text");
  assertEquals(called, false);
  assertEquals(summary.available, false);
  assertEquals(summary.error, "missing ORIGINALITY_API_KEY");
  assertEquals(detail, null);
});

Deno.test("originality maps a non-ok HTTP status to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: () => Promise.resolve(jsonResponse({ error: "bad key" }, 401)),
  });

  const { summary, detail } = await provider.detect("text");
  assertEquals(summary.available, false);
  assert(summary.error?.includes("401"));
  assertEquals(detail, null);
});

Deno.test("originality treats 429 as unavailable with a rate-limit note", async () => {
  const provider = makeProvider({
    fetchImpl: () => Promise.resolve(jsonResponse({ error: "slow down" }, 429)),
  });

  const { summary } = await provider.detect("text");
  assertEquals(summary.available, false);
  assert(summary.error?.includes("429"));
  assert(summary.error?.includes("rate limited"));
});

Deno.test("originality maps an unexpected response shape to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: () => Promise.resolve(jsonResponse({ success: true })),
  });

  const { summary, detail } = await provider.detect("text");
  assertEquals(summary.available, false);
  assertEquals(summary.error, "unexpected Originality.ai response shape");
  assertEquals(detail, null);
});

Deno.test("originality aborts and reports a timeout when the request hangs", async () => {
  const provider = makeProvider({
    timeoutMs: 10,
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The signal has been aborted", "AbortError")));
      }),
  });

  const { summary, detail } = await provider.detect("text");
  assertEquals(summary.available, false);
  assert(summary.error?.includes("timed out"));
  assertEquals(detail, null);
});

Deno.test("originality maps a network error to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: () => Promise.reject(new TypeError("network down")),
  });

  const { summary } = await provider.detect("text");
  assertEquals(summary.available, false);
  assert(summary.error?.includes("network down"));
});
