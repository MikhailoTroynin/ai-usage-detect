// Originality.ai provider (DETECTOR-INTEGRATION-PLAN.md item 3) — the second
// real detector. It calls Originality.ai's public `/api/v1/scan/ai` endpoint and
// normalizes the document- and block-level probabilities into our shared
// `DetectionResult`.
//
// Contract rules from `types.ts`: `detect` MUST NOT throw. Missing key, HTTP
// errors, 429s, timeouts, malformed payloads — every failure comes back as an
// `unavailableDetection` so one flaky provider never fails the whole `/detect`.
// The key is read lazily from the environment so importing this module needs no
// `--allow-env` and setting the secret after boot still takes effect.

import {
  type AiDetectorProvider,
  type DetectionResult,
  type ProviderDetection,
  type SentenceDetection,
  detectionFromResult,
  probabilityToScore,
  scoreToRisk,
  unavailableDetection,
} from "./types.ts";
import { DETECTOR_TIMEOUT_MS, isTimeoutError, withTimeout } from "./timeout.ts";

const ID = "originality";
const NAME = "Originality.ai";
const ENDPOINT = "https://api.originality.ai/api/v1/scan/ai";

export interface OriginalityDeps {
  // Lazy key lookup; defaults to `ORIGINALITY_API_KEY` from the environment.
  getApiKey?: () => string | undefined;
  // Optional AI-model version pin; defaults to `ORIGINALITY_MODEL_VERSION` if
  // set, else the API's own default model. Sent as the `aiModelVersion` field.
  getModelVersion?: () => string | undefined;
  // Injectable for unit tests (mock fetch); defaults to the global `fetch`.
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
}

export function createOriginalityProvider(deps: OriginalityDeps = {}): AiDetectorProvider {
  const getApiKey = deps.getApiKey ?? (() => Deno.env.get("ORIGINALITY_API_KEY"));
  const getModelVersion = deps.getModelVersion ??
    (() => Deno.env.get("ORIGINALITY_MODEL_VERSION"));
  const fetchImpl = deps.fetchImpl ?? fetch;
  const endpoint = deps.endpoint ?? ENDPOINT;
  const timeoutMs = deps.timeoutMs ?? DETECTOR_TIMEOUT_MS;

  const self = { id: ID, name: NAME };

  return {
    id: ID,
    name: NAME,
    isConfigured: () => Boolean(getApiKey()),

    async detect(text: string): Promise<ProviderDetection> {
      const apiKey = getApiKey();
      if (!apiKey) {
        return unavailableDetection(self, "missing ORIGINALITY_API_KEY");
      }

      try {
        return await withTimeout(timeoutMs, async (signal) => {
          const requestBody: Record<string, unknown> = { content: text };
          const modelVersion = getModelVersion();
          if (modelVersion) requestBody.aiModelVersion = modelVersion;

          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
              "X-OAI-API-KEY": apiKey,
            },
            body: JSON.stringify(requestBody),
            signal,
          });

          if (!response.ok) {
            // Don't leak the response stream on the error path.
            await response.body?.cancel();
            const note = response.status === 429 ? " — rate limited" : "";
            return unavailableDetection(self, `Originality.ai API error (${response.status})${note}`);
          }

          const data = await response.json();
          const result = normalizeOriginality(data);
          if (!result) {
            return unavailableDetection(self, "unexpected Originality.ai response shape");
          }
          return detectionFromResult(self, result);
        });
      } catch (err) {
        return unavailableDetection(self, describeError(err, timeoutMs));
      }
    },
  };
}

// Default singleton used by the aggregator (plan item 5). Reads its key from the
// environment at call time, so it stays "unconfigured" until the secret is set.
export const originalityProvider = createOriginalityProvider();

// --- normalization ---------------------------------------------------------

// Originality.ai returns `score.ai` (0-1) as the document AI probability, which
// we use for the overall score. Sentence-level detail is best-effort: the API
// exposes a per-block breakdown (`blocks[]`, or `score_breakdown[]` on some
// endpoints) with each block's text and AI probability. When no block array is
// present we keep the overall-only result (plan item 3).
function normalizeOriginality(data: unknown): DetectionResult | null {
  const root = asRecord(data);
  const score = asRecord(root?.score);
  const ai = score ? numberOrNull(score.ai) : null;
  if (ai === null) return null;

  const overallScore = probabilityToScore(ai);
  return {
    overallScore,
    risk: scoreToRisk(overallScore),
    sentences: normalizeBlocks(root),
  };
}

function normalizeBlocks(root: Record<string, unknown> | null): SentenceDetection[] {
  const blocks = firstArray(root?.blocks, root?.score_breakdown);
  if (!blocks) return [];
  const sentences: SentenceDetection[] = [];
  for (const entry of blocks) {
    const record = asRecord(entry);
    const text = record?.text;
    const prob = record ? pickBlockAiProb(record) : null;
    if (typeof text !== "string" || prob === null) continue;
    const score = probabilityToScore(prob);
    sentences.push({ text, score, risk: scoreToRisk(score) });
  }
  return sentences;
}

// A block's AI probability lives under `result.fake` (AI-detection block shape),
// `ai` (`score_breakdown` shape), or `ai_score` depending on the API version.
function pickBlockAiProb(block: Record<string, unknown>): number | null {
  const result = asRecord(block.result);
  const fake = result ? numberOrNull(result.fake) : null;
  if (fake !== null) return fake;

  const ai = numberOrNull(block.ai);
  if (ai !== null) return ai;

  return numberOrNull(block.ai_score);
}

function firstArray(...values: unknown[]): unknown[] | null {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return null;
}

function describeError(err: unknown, timeoutMs: number): string {
  if (isTimeoutError(err)) {
    return `Originality.ai request timed out after ${timeoutMs}ms`;
  }
  const reason = err instanceof Error ? err.message : "request failed";
  return `Originality.ai request failed: ${reason}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
