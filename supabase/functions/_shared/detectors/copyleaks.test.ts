import { assert, assertEquals } from "jsr:@std/assert@1";
import { type CopyleaksDeps, createCopyleaksProvider } from "./copyleaks.ts";

// Hermetic provider factory for the tests: both credentials are present, the
// sensitivity pin is explicitly empty, and the scan id is deterministic so
// nothing reads the real environment or randomness (keeps `deno test` runnable
// without --allow-env). Individual tests override what they exercise.
function makeProvider(overrides: Partial<CopyleaksDeps> = {}) {
  return createCopyleaksProvider({
    getApiKey: () => "k",
    getEmail: () => "me@example.com",
    getSensitivity: () => undefined,
    generateScanId: () => "scan-1",
    ...overrides,
  });
}

// The submitted text whose character offsets the mock `checkBody` slices back
// into per-segment sentences. "This was written by a machine." occupies chars
// 0-29; "But this part feels human." occupies chars 31-56.
const SOURCE_TEXT = "This was written by a machine. But this part feels human.";

function loginBody(overrides: Record<string, unknown> = {}) {
  return {
    access_token: "tok-abc",
    ".issued": "2026-07-15T00:00:00Z",
    ".expires": "2026-07-17T00:00:00Z", // 48h after issue
    ...overrides,
  };
}

// A realistic slice of Copyleaks' writer-detector response. Segment offsets index
// into SOURCE_TEXT; classification 2 is an AI run, 1 a human run.
function checkBody(overrides: Record<string, unknown> = {}) {
  return {
    modelVersion: "v9.0",
    results: [
      {
        classification: 2,
        probability: 0.9,
        matches: [{
          text: {
            chars: { starts: [0], lengths: [30] },
            words: { starts: [0], lengths: [6] },
          },
        }],
      },
      {
        classification: 1,
        probability: 0.8,
        matches: [{
          text: {
            chars: { starts: [31], lengths: [26] },
            words: { starts: [6], lengths: [5] },
          },
        }],
      },
    ],
    summary: { human: 0.1, ai: 0.9 },
    scannedDocument: { scanId: "scan-1", totalWords: 11, credits: 1 },
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Route the two-step flow (login then check) to canned bodies and record the
// calls each stage received. `onLogin` / `onCheck` observe request shape.
interface RouteOpts {
  login?: () => Response;
  check?: () => Response;
  onLogin?: (url: string, init?: RequestInit) => void;
  onCheck?: (url: string, init?: RequestInit) => void;
}
function routedFetch(opts: RouteOpts = {}): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/account/login/api")) {
      opts.onLogin?.(u, init);
      return Promise.resolve(
        opts.login ? opts.login() : jsonResponse(loginBody()),
      );
    }
    opts.onCheck?.(u, init);
    return Promise.resolve(
      opts.check ? opts.check() : jsonResponse(checkBody()),
    );
  }) as typeof fetch;
}

Deno.test("copyleaks needs both key and email to be configured", () => {
  assertEquals(
    createCopyleaksProvider({ getApiKey: () => "k", getEmail: () => "e" })
      .isConfigured(),
    true,
  );
  assertEquals(
    createCopyleaksProvider({ getApiKey: () => "k", getEmail: () => undefined })
      .isConfigured(),
    false,
  );
  assertEquals(
    createCopyleaksProvider({ getApiKey: () => undefined, getEmail: () => "e" })
      .isConfigured(),
    false,
  );
  const p = createCopyleaksProvider({
    getApiKey: () => undefined,
    getEmail: () => undefined,
  });
  assertEquals(p.id, "copyleaks");
  assertEquals(p.name, "Copyleaks");
  assertEquals(p.isConfigured(), false);
});

Deno.test("copyleaks logs in then normalizes a successful check response", async () => {
  let loginUrl = "";
  let loginInit: RequestInit | undefined;
  let checkUrl = "";
  let checkInit: RequestInit | undefined;
  const provider = makeProvider({
    fetchImpl: routedFetch({
      onLogin: (u, i) => {
        loginUrl = u;
        loginInit = i;
      },
      onCheck: (u, i) => {
        checkUrl = u;
        checkInit = i;
      },
    }),
  });

  const { summary, detail } = await provider.detect(SOURCE_TEXT);

  // Login request: correct endpoint, POST, { email, key } body.
  assertEquals(loginUrl, "https://id.copyleaks.com/v3/account/login/api");
  assertEquals(loginInit?.method, "POST");
  assertEquals(JSON.parse(String(loginInit?.body)), {
    email: "me@example.com",
    key: "k",
  });

  // Check request: scan-id in the path, Bearer token from login, `text` body.
  assertEquals(
    checkUrl,
    "https://api.copyleaks.com/v2/writer-detector/scan-1/check",
  );
  assertEquals(checkInit?.method, "POST");
  assertEquals(
    (checkInit?.headers as Record<string, string>).authorization,
    "Bearer tok-abc",
  );
  assertEquals(JSON.parse(String(checkInit?.body)), { text: SOURCE_TEXT });

  // Overall uses summary.ai (0.9 -> 90).
  assertEquals(summary.available, true);
  assertEquals(summary.id, "copyleaks");
  assertEquals(summary.score, 90);
  assertEquals(summary.risk, "red");

  // Sentences reconstructed from char offsets. AI run keeps its probability;
  // the human run's AI-likelihood is the complement (1 - 0.8 = 0.2 -> 20).
  assert(detail !== null);
  assertEquals(detail?.overallScore, 90);
  assertEquals(detail?.sentences.length, 2);
  assertEquals(detail?.sentences[0], {
    text: "This was written by a machine.",
    score: 90,
    risk: "red",
  });
  assertEquals(detail?.sentences[1], {
    text: "But this part feels human.",
    score: 20,
    risk: "green",
  });
});

Deno.test("copyleaks reuses the cached token across calls (logs in once)", async () => {
  let logins = 0;
  let checks = 0;
  const provider = makeProvider({
    fetchImpl: routedFetch({
      onLogin: () => {
        logins++;
      },
      onCheck: () => {
        checks++;
      },
    }),
  });

  await provider.detect(SOURCE_TEXT);
  await provider.detect(SOURCE_TEXT);

  assertEquals(logins, 1);
  assertEquals(checks, 2);
});

Deno.test("copyleaks re-logins after the token expires", async () => {
  let logins = 0;
  let clock = Date.parse("2026-07-15T00:00:00Z");
  const provider = makeProvider({
    now: () => clock,
    fetchImpl: routedFetch({
      onLogin: () => {
        logins++;
      },
    }),
  });

  await provider.detect(SOURCE_TEXT); // login #1, token good until 2026-07-17
  clock = Date.parse("2026-07-18T00:00:00Z"); // past expiry
  await provider.detect(SOURCE_TEXT); // login #2

  assertEquals(logins, 2);
});

Deno.test("copyleaks caches for a fallback TTL when .expires is unparseable", async () => {
  let logins = 0;
  const provider = makeProvider({
    now: () => 0,
    fetchImpl: routedFetch({
      login: () => jsonResponse(loginBody({ ".expires": "not-a-date" })),
      onLogin: () => {
        logins++;
      },
    }),
  });

  await provider.detect(SOURCE_TEXT);
  await provider.detect(SOURCE_TEXT);

  // Token still cached (via the fallback TTL) despite the bad expiry, so no re-login.
  assertEquals(logins, 1);
});

Deno.test("copyleaks passes the sensitivity pin through when valid", async () => {
  let capturedBody: unknown;
  const provider = makeProvider({
    getSensitivity: () => "3",
    fetchImpl: routedFetch({
      onCheck: (_u, i) => {
        capturedBody = JSON.parse(String(i?.body));
      },
    }),
  });

  await provider.detect(SOURCE_TEXT);
  assertEquals(capturedBody, { text: SOURCE_TEXT, sensitivity: 3 });
});

Deno.test("copyleaks ignores an out-of-range sensitivity pin", async () => {
  let capturedBody: unknown;
  const provider = makeProvider({
    getSensitivity: () => "9",
    fetchImpl: routedFetch({
      onCheck: (_u, i) => {
        capturedBody = JSON.parse(String(i?.body));
      },
    }),
  });

  await provider.detect(SOURCE_TEXT);
  assertEquals(capturedBody, { text: SOURCE_TEXT });
});

Deno.test("copyleaks reports unavailable without credentials and never calls fetch", async () => {
  let called = false;
  const provider = makeProvider({
    getEmail: () => undefined,
    fetchImpl: routedFetch({
      onLogin: () => {
        called = true;
      },
      onCheck: () => {
        called = true;
      },
    }),
  });

  const { summary, detail } = await provider.detect(SOURCE_TEXT);
  assertEquals(called, false);
  assertEquals(summary.available, false);
  assertEquals(summary.error, "missing COPYLEAKS_API_KEY or COPYLEAKS_EMAIL");
  assertEquals(detail, null);
});

Deno.test("copyleaks maps a login failure to unavailable and never checks", async () => {
  let checked = false;
  const provider = makeProvider({
    fetchImpl: routedFetch({
      login: () => jsonResponse({ error: "bad key" }, 401),
      onCheck: () => {
        checked = true;
      },
    }),
  });

  const { summary, detail } = await provider.detect(SOURCE_TEXT);
  assertEquals(checked, false);
  assertEquals(summary.available, false);
  assert(summary.error?.includes("login failed"));
  assert(summary.error?.includes("401"));
  assertEquals(detail, null);
});

Deno.test("copyleaks treats a 429 login as unavailable with a rate-limit note", async () => {
  const provider = makeProvider({
    fetchImpl: routedFetch({
      login: () => jsonResponse({ error: "slow down" }, 429),
    }),
  });

  const { summary } = await provider.detect(SOURCE_TEXT);
  assertEquals(summary.available, false);
  assert(summary.error?.includes("login failed"));
  assert(summary.error?.includes("429"));
  assert(summary.error?.includes("rate limited"));
});

Deno.test("copyleaks maps a login response without a token to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: routedFetch({
      login: () => jsonResponse({ ".expires": "2026-07-17T00:00:00Z" }),
    }),
  });

  const { summary } = await provider.detect(SOURCE_TEXT);
  assertEquals(summary.available, false);
  assertEquals(summary.error, "unexpected Copyleaks login response shape");
});

Deno.test("copyleaks maps a non-ok check status to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: routedFetch({
      check: () => jsonResponse({ error: "nope" }, 400),
    }),
  });

  const { summary, detail } = await provider.detect(SOURCE_TEXT);
  assertEquals(summary.available, false);
  assert(summary.error?.includes("Copyleaks API error"));
  assert(summary.error?.includes("400"));
  assertEquals(detail, null);
});

Deno.test("copyleaks treats a 429 check as unavailable with a rate-limit note", async () => {
  const provider = makeProvider({
    fetchImpl: routedFetch({
      check: () => jsonResponse({ error: "slow down" }, 429),
    }),
  });

  const { summary } = await provider.detect(SOURCE_TEXT);
  assertEquals(summary.available, false);
  assert(summary.error?.includes("429"));
  assert(summary.error?.includes("rate limited"));
});

Deno.test("copyleaks maps an unexpected check response shape to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: routedFetch({
      check: () => jsonResponse({ modelVersion: "v9.0" }),
    }),
  });

  const { summary, detail } = await provider.detect(SOURCE_TEXT);
  assertEquals(summary.available, false);
  assertEquals(summary.error, "unexpected Copyleaks response shape");
  assertEquals(detail, null);
});

Deno.test("copyleaks keeps the overall-only result when results is absent", async () => {
  const provider = makeProvider({
    fetchImpl: routedFetch({
      check: () => jsonResponse(checkBody({ results: undefined })),
    }),
  });

  const { summary, detail } = await provider.detect(SOURCE_TEXT);
  assertEquals(summary.available, true);
  assertEquals(summary.score, 90);
  assert(detail !== null);
  assertEquals(detail?.overallScore, 90);
  assertEquals(detail?.sentences, []);
});

Deno.test("copyleaks aborts and reports a timeout when a request hangs", async () => {
  const provider = makeProvider({
    timeoutMs: 10,
    fetchImpl: ((_url: string | URL | Request, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(
            new DOMException("The signal has been aborted", "AbortError"),
          ));
      })) as typeof fetch,
  });

  const { summary, detail } = await provider.detect(SOURCE_TEXT);
  assertEquals(summary.available, false);
  assert(summary.error?.includes("timed out"));
  assertEquals(detail, null);
});

Deno.test("copyleaks maps a network error to unavailable", async () => {
  const provider = makeProvider({
    fetchImpl: (() =>
      Promise.reject(new TypeError("network down"))) as typeof fetch,
  });

  const { summary } = await provider.detect(SOURCE_TEXT);
  assertEquals(summary.available, false);
  assert(summary.error?.includes("network down"));
});
