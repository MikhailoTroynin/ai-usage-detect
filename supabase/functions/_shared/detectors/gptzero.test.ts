import { assert, assertEquals } from "jsr:@std/assert@1";
import { createGptzeroProvider, type GptzeroDeps } from "./gptzero.ts";

// Hermetic provider factory for the tests: a key is present and the version pin
// is explicitly empty so nothing reads the real environment (keeps `deno test`
// runnable without --allow-env). Individual tests override what they exercise.
function makeProvider(overrides: Partial<GptzeroDeps> = {}) {
  return createGptzeroProvider({
    getApiKey: () => "k",
    getVersion: () => undefined,
    ...overrides,
  });
}

// A realistic slice of GPTZero's /v2/predict/text response. Only the fields the
// adapter reads are asserted on; the rest mirror the real payload for fidelity.
function gptzeroBody(overrides: Record<string, unknown> = {}) {
  return {
    documents: [
      {
        completely_generated_prob: 0.5,
        average_generated_prob: 0.4,
        class_probabilities: { ai: 0.92, human: 0.05, mixed: 0.03 },
        predicted_class: "ai",
        sentences: [
          { sentence: "This was written by a machine.", generated_prob: 0.97, perplexity: 12 },
          { sentence: "But this part feels human.", generated_prob: 0.12, perplexity: 88 },
        ],
        ...overrides,
      },
    ],
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.test("gptzero is unconfigured without a key and configured with one", () => {
  const withoutKey = createGptzeroProvider({ getApiKey: () => undefined });
  const withKey = createGptzeroProvider({ getApiKey: () => "k" });
  assertEquals(withoutKey.id, "gptzero");
  assertEquals(withoutKey.name, "GPTZero");
  assertEquals(withoutKey.isConfigured(), false);
  assertEquals(withKey.isConfigured(), true);
});

Deno.test("gptzero normalizes a successful response (prefers class_probabilities.ai)", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const provider = makeProvider({
    getApiKey: () => "secret-key",
    fetchImpl: (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return Promise.resolve(jsonResponse(gptzeroBody()));
    },
  });

  const { summary, detail } = await provider.detect("some text");

  // Request shape: correct endpoint, POST, x-api-key header, `document` body.
  assertEquals(capturedUrl, "https://api.gptzero.me/v2/predict/text");
  assertEquals(capturedInit?.method, "POST");
  assertEquals((capturedInit?.headers as Record<string, string>)["x-api-key"], "secret-key");
  assertEquals(JSON.parse(String(capturedInit?.body)), { document: "some text" });

  // Overall uses the AI class probability (0.92) rather than completely_generated_prob.
  assertEquals(summary.available, true);
  assertEquals(summary.id, "gptzero");
  assertEquals(summary.score, 92);
  assertEquals(summary.risk, "red");

  assert(detail !== null);
  assertEquals(detail?.overallScore, 92);
  assertEquals(detail?.sentences.length, 2);
  assertEquals(detail?.sentences[0], {
    text: "This was written by a machine.",
    score: 97,
    risk: "red",
  });
  assertEquals(detail?.sentences[1], {
    text: "But this part feels human.",
    score: 12,
    risk: "green",
  });
});

Deno.test("gptzero falls back to completely_generated_prob when class_probabilities is absent", async () => {
  const body = gptzeroBody({ class_probabilities: undefined, completely_generated_prob: 0.7 });
  const provider = makeProvider({
    fetchImpl: () => Promise.resolve(jsonResponse(body)),
  });

  const { summary } = await provider.detect("text");
  assertEquals(summary.available, true);
  assertEquals(summary.score, 70);
  assertEquals(summary.risk, "red");
});

Deno.test("gptzero passes the version pin through when configured", async () => {
  let capturedBody: unknown;
  const provider = createGptzeroProvider({
    getApiKey: () => "k",
    getVersion: () => "2024-01-09",
    fetchImpl: (_url, init) => {
      capturedBody = JSON.parse(String(init?.body));
      return Promise.resolve(jsonResponse(gptzeroBody()));
    },
  });

  await provider.detect("text");
  assertEquals(capturedBody, { document: "text", version: "2024-01-09" });
});

Deno.test("gptzero reports unavailable without a key and never calls fetch", async () => {
  let called = false;
  const provider = makeProvider({
    getApiKey: () => undefined,
    fetchImpl: () => {
      called = true;
      return Promise.resolve(jsonResponse(gptzeroBody()));
    },
  });

  const { summary, detail } = await provider.detect("text");
  assertEquals(called, false);
  assertEquals(summary.available, false);
  assertEquals(summary.error, "missing GPTZERO_API_KEY");
  assertEquals(detail, null);
});

Deno.test("gptzero maps a non-ok HTTP status to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: () => Promise.resolve(jsonResponse({ error: "bad key" }, 401)),
  });

  const { summary, detail } = await provider.detect("text");
  assertEquals(summary.available, false);
  assert(summary.error?.includes("401"));
  assertEquals(detail, null);
});

Deno.test("gptzero treats 429 as unavailable with a rate-limit note", async () => {
  const provider = makeProvider({
    fetchImpl: () => Promise.resolve(jsonResponse({ error: "slow down" }, 429)),
  });

  const { summary } = await provider.detect("text");
  assertEquals(summary.available, false);
  assert(summary.error?.includes("429"));
  assert(summary.error?.includes("rate limited"));
});

Deno.test("gptzero maps an unexpected response shape to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: () => Promise.resolve(jsonResponse({ documents: [] })),
  });

  const { summary, detail } = await provider.detect("text");
  assertEquals(summary.available, false);
  assertEquals(summary.error, "unexpected GPTZero response shape");
  assertEquals(detail, null);
});

Deno.test("gptzero aborts and reports a timeout when the request hangs", async () => {
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

Deno.test("gptzero maps a network error to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: () => Promise.reject(new TypeError("network down")),
  });

  const { summary } = await provider.detect("text");
  assertEquals(summary.available, false);
  assert(summary.error?.includes("network down"));
});
