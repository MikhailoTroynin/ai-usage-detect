// Copyleaks provider (DETECTOR-INTEGRATION-PLAN.md item 4) — an optional third
// detector, gated behind its own credentials. Unlike GPTZero/Originality it needs
// a two-step OAuth2 flow: log in with email + API key to mint a short-lived
// Bearer token, then call the AI content detector (`writer-detector`). The token
// is cached in memory for the life of a warm function instance (Copyleaks tokens
// last 48h) so repeated `/detect` calls don't re-login every time.
//
// Contract rules from `types.ts`: `detect` MUST NOT throw. Missing credentials,
// login failure, HTTP errors, 429s, timeouts, malformed payloads — every failure
// comes back as an `unavailableDetection` so one flaky provider never fails the
// whole `/detect`. Credentials are read lazily from the environment so importing
// this module needs no `--allow-env` and setting the secrets after boot still
// takes effect.

import {
  type AiDetectorProvider,
  detectionFromResult,
  type DetectionResult,
  probabilityToScore,
  type ProviderDetection,
  scoreToRisk,
  type SentenceDetection,
  unavailableDetection,
} from "./types.ts";
import { DETECTOR_TIMEOUT_MS, isTimeoutError, withTimeout } from "./timeout.ts";

const ID = "copyleaks";
const NAME = "Copyleaks";
const LOGIN_ENDPOINT = "https://id.copyleaks.com/v3/account/login/api";
// The check endpoint takes a caller-supplied scan id (3-36 chars) in its path.
const CHECK_ENDPOINT_BASE = "https://api.copyleaks.com/v2/writer-detector";

// Re-login this many ms before the cached token's stated expiry, so we never
// hand a request a token that lapses mid-flight.
const TOKEN_SAFETY_MARGIN_MS = 60_000;

// If the login response omits or mangles `.expires`, cache the token for this
// long rather than not at all (Copyleaks tokens really last 48h; this is a
// conservative floor).
const FALLBACK_TOKEN_TTL_MS = 30 * 60_000;

interface CachedToken {
  token: string;
  expiresAtMs: number;
}

export interface CopyleaksDeps {
  // Lazy credential lookup; default to `COPYLEAKS_API_KEY` / `COPYLEAKS_EMAIL`.
  getApiKey?: () => string | undefined;
  getEmail?: () => string | undefined;
  // Optional detection-strictness pin (1-3); defaults to `COPYLEAKS_SENSITIVITY`
  // if it holds a valid integer, else the API's own default. Sent as `sensitivity`.
  getSensitivity?: () => string | undefined;
  // Injectable for unit tests (mock fetch); defaults to the global `fetch`.
  fetchImpl?: typeof fetch;
  // Injectable clock (ms) so token-expiry logic is testable; defaults to Date.now.
  now?: () => number;
  // Injectable unique scan-id generator; defaults to crypto.randomUUID().
  generateScanId?: () => string;
  loginEndpoint?: string;
  checkEndpointBase?: string;
  timeoutMs?: number;
}

export function createCopyleaksProvider(
  deps: CopyleaksDeps = {},
): AiDetectorProvider {
  const getApiKey = deps.getApiKey ?? (() => Deno.env.get("COPYLEAKS_API_KEY"));
  const getEmail = deps.getEmail ?? (() => Deno.env.get("COPYLEAKS_EMAIL"));
  const getSensitivity = deps.getSensitivity ??
    (() => Deno.env.get("COPYLEAKS_SENSITIVITY"));
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => Date.now());
  const generateScanId = deps.generateScanId ?? (() => crypto.randomUUID());
  const loginEndpoint = deps.loginEndpoint ?? LOGIN_ENDPOINT;
  const checkEndpointBase = deps.checkEndpointBase ?? CHECK_ENDPOINT_BASE;
  const timeoutMs = deps.timeoutMs ?? DETECTOR_TIMEOUT_MS;

  const self = { id: ID, name: NAME };

  // Per-instance token cache: persists across `detect` calls within a warm
  // function instance, and stays isolated per provider factory in tests.
  let cachedToken: CachedToken | null = null;

  // Return a valid Bearer token, reusing the cache or logging in as needed.
  // Resolves to a typed result rather than throwing so the caller can map a
  // login failure to a precise `unavailable` message.
  async function ensureToken(
    email: string,
    key: string,
    signal: AbortSignal,
  ): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
    if (
      cachedToken && cachedToken.expiresAtMs - TOKEN_SAFETY_MARGIN_MS > now()
    ) {
      return { ok: true, token: cachedToken.token };
    }

    const response = await fetchImpl(loginEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ email, key }),
      signal,
    });

    if (!response.ok) {
      await response.body?.cancel();
      const note = response.status === 429 ? " — rate limited" : "";
      return {
        ok: false,
        error: `Copyleaks login failed (${response.status})${note}`,
      };
    }

    const data = asRecord(await response.json());
    const token = data?.access_token;
    if (typeof token !== "string" || !token) {
      return { ok: false, error: "unexpected Copyleaks login response shape" };
    }

    const expiresAtMs = parseExpires(data?.[".expires"]) ??
      now() + FALLBACK_TOKEN_TTL_MS;
    cachedToken = { token, expiresAtMs };
    return { ok: true, token };
  }

  return {
    id: ID,
    name: NAME,
    // Copyleaks needs BOTH the API key and the account email; either alone can't
    // authenticate, so the provider stays unconfigured (skipped) until both exist.
    isConfigured: () => Boolean(getApiKey()) && Boolean(getEmail()),

    async detect(text: string): Promise<ProviderDetection> {
      const apiKey = getApiKey();
      const email = getEmail();
      if (!apiKey || !email) {
        return unavailableDetection(
          self,
          "missing COPYLEAKS_API_KEY or COPYLEAKS_EMAIL",
        );
      }

      try {
        return await withTimeout(timeoutMs, async (signal) => {
          const auth = await ensureToken(email, apiKey, signal);
          if (!auth.ok) {
            return unavailableDetection(self, auth.error);
          }

          const requestBody: Record<string, unknown> = { text };
          const sensitivity = parseSensitivity(getSensitivity());
          if (sensitivity !== null) requestBody.sensitivity = sensitivity;

          const endpoint = `${checkEndpointBase}/${generateScanId()}/check`;
          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
              authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify(requestBody),
            signal,
          });

          if (!response.ok) {
            // Don't leak the response stream on the error path.
            await response.body?.cancel();
            const note = response.status === 429 ? " — rate limited" : "";
            return unavailableDetection(
              self,
              `Copyleaks API error (${response.status})${note}`,
            );
          }

          const data = await response.json();
          const result = normalizeCopyleaks(data, text);
          if (!result) {
            return unavailableDetection(
              self,
              "unexpected Copyleaks response shape",
            );
          }
          return detectionFromResult(self, result);
        });
      } catch (err) {
        return unavailableDetection(self, describeError(err, timeoutMs));
      }
    },
  };
}

// Default singleton used by the aggregator (plan item 5). Reads its credentials
// from the environment at call time, so it stays "unconfigured" until both
// secrets are set.
export const copyleaksProvider = createCopyleaksProvider();

// --- normalization ---------------------------------------------------------

// Copyleaks returns `summary.ai` (0-1) as the document AI probability, which we
// use for the overall score. Sentence-level detail is reconstructed from the
// `results[]` classification runs: each result carries a `classification`
// (1 = human, 2 = AI), a `probability` (confidence in that class), and
// `matches[].text.chars` character offsets into the submitted text. We slice the
// original text at those offsets to recover each segment's words.
function normalizeCopyleaks(
  data: unknown,
  sourceText: string,
): DetectionResult | null {
  const root = asRecord(data);
  const summary = asRecord(root?.summary);
  const ai = summary ? numberOrNull(summary.ai) : null;
  if (ai === null) return null;

  const overallScore = probabilityToScore(ai);
  return {
    overallScore,
    risk: scoreToRisk(overallScore),
    sentences: normalizeResults(root?.results, sourceText),
  };
}

function normalizeResults(
  raw: unknown,
  sourceText: string,
): SentenceDetection[] {
  if (!Array.isArray(raw)) return [];
  const sentences: SentenceDetection[] = [];
  for (const entry of raw) {
    const record = asRecord(entry);
    if (!record) continue;
    const classification = numberOrNull(record.classification);
    const probability = numberOrNull(record.probability);
    if (classification === null || probability === null) continue;

    // `probability` is the confidence in the assigned class. Convert to an
    // AI-likelihood: for an AI run (classification 2) it already is that; for a
    // human run (classification 1) the AI-likelihood is the complement.
    const aiProb = classification === 2 ? probability : 1 - probability;
    const score = probabilityToScore(aiProb);
    const risk = scoreToRisk(score);

    for (const text of extractMatchTexts(record.matches, sourceText)) {
      sentences.push({ text, score, risk });
    }
  }
  return sentences;
}

// Recover each match's text by slicing the submitted document at the reported
// character offsets. `chars.starts[]` / `chars.lengths[]` are parallel arrays, so
// one match may cover several disjoint ranges. Whitespace-only slices (offset
// boundaries landing on gaps) are dropped.
function extractMatchTexts(matches: unknown, sourceText: string): string[] {
  if (!Array.isArray(matches)) return [];
  const texts: string[] = [];
  for (const match of matches) {
    const chars = asRecord(asRecord(asRecord(match)?.text)?.chars);
    const starts = chars?.starts;
    const lengths = chars?.lengths;
    if (!Array.isArray(starts) || !Array.isArray(lengths)) continue;
    const count = Math.min(starts.length, lengths.length);
    for (let i = 0; i < count; i++) {
      const start = numberOrNull(starts[i]);
      const length = numberOrNull(lengths[i]);
      if (start === null || length === null) continue;
      const slice = sourceText.slice(start, start + length).trim();
      if (slice) texts.push(slice);
    }
  }
  return texts;
}

// Parse the login response's `.expires` ISO timestamp into epoch ms.
function parseExpires(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

// Accept only an integer strictness in [1, 3]; anything else is ignored so the
// API falls back to its own default.
function parseSensitivity(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : null;
}

function describeError(err: unknown, timeoutMs: number): string {
  if (isTimeoutError(err)) {
    return `Copyleaks request timed out after ${timeoutMs}ms`;
  }
  const reason = err instanceof Error ? err.message : "request failed";
  return `Copyleaks request failed: ${reason}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
