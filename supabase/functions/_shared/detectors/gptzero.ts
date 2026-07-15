// GPTZero provider (DETECTOR-INTEGRATION-PLAN.md item 2) — the primary real
// detector. It calls GPTZero's public `/v2/predict/text` endpoint and
// normalizes the document- and sentence-level probabilities into our shared
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

const ID = "gptzero";
const NAME = "GPTZero";
const ENDPOINT = "https://api.gptzero.me/v2/predict/text";

export interface GptzeroDeps {
  // Lazy key lookup; defaults to `GPTZERO_API_KEY` from the environment.
  getApiKey?: () => string | undefined;
  // Optional model version pin; defaults to `GPTZERO_VERSION` if set, else the
  // API's own latest model.
  getVersion?: () => string | undefined;
  // Injectable for unit tests (mock fetch); defaults to the global `fetch`.
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
}

export function createGptzeroProvider(deps: GptzeroDeps = {}): AiDetectorProvider {
  const getApiKey = deps.getApiKey ?? (() => Deno.env.get("GPTZERO_API_KEY"));
  const getVersion = deps.getVersion ?? (() => Deno.env.get("GPTZERO_VERSION"));
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
        return unavailableDetection(self, "missing GPTZERO_API_KEY");
      }

      try {
        return await withTimeout(timeoutMs, async (signal) => {
          const requestBody: Record<string, unknown> = { document: text };
          const version = getVersion();
          if (version) requestBody.version = version;

          const response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify(requestBody),
            signal,
          });

          if (!response.ok) {
            // Don't leak the response stream on the error path.
            await response.body?.cancel();
            const note = response.status === 429 ? " — rate limited" : "";
            return unavailableDetection(self, `GPTZero API error (${response.status})${note}`);
          }

          const data = await response.json();
          const result = normalizeGptzero(data);
          if (!result) {
            return unavailableDetection(self, "unexpected GPTZero response shape");
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
export const gptzeroProvider = createGptzeroProvider();

// --- normalization ---------------------------------------------------------

// GPTZero returns per-document results. We use the first document's AI
// probability for the overall score (preferring the explicit `ai` class
// probability, then `completely_generated_prob`, then `average_generated_prob`)
// and map its sentence array onto our sentence-level breakdown.
function normalizeGptzero(data: unknown): DetectionResult | null {
  const root = asRecord(data);
  const documents = root?.documents;
  const doc = Array.isArray(documents) ? asRecord(documents[0]) : null;
  if (!doc) return null;

  const prob = pickOverallProb(doc);
  if (prob === null) return null;

  const overallScore = probabilityToScore(prob);
  return {
    overallScore,
    risk: scoreToRisk(overallScore),
    sentences: normalizeSentences(doc.sentences),
  };
}

function pickOverallProb(doc: Record<string, unknown>): number | null {
  const classProbs = asRecord(doc.class_probabilities);
  const ai = classProbs ? numberOrNull(classProbs.ai) : null;
  if (ai !== null) return ai;

  const completely = numberOrNull(doc.completely_generated_prob);
  if (completely !== null) return completely;

  return numberOrNull(doc.average_generated_prob);
}

function normalizeSentences(raw: unknown): SentenceDetection[] {
  if (!Array.isArray(raw)) return [];
  const sentences: SentenceDetection[] = [];
  for (const entry of raw) {
    const record = asRecord(entry);
    const text = record?.sentence;
    const prob = record ? numberOrNull(record.generated_prob) : null;
    if (typeof text !== "string" || prob === null) continue;
    const score = probabilityToScore(prob);
    sentences.push({ text, score, risk: scoreToRisk(score) });
  }
  return sentences;
}

function describeError(err: unknown, timeoutMs: number): string {
  if (isTimeoutError(err)) {
    return `GPTZero request timed out after ${timeoutMs}ms`;
  }
  const reason = err instanceof Error ? err.message : "request failed";
  return `GPTZero request failed: ${reason}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
