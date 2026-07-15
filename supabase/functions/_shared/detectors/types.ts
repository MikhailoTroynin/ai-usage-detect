// Provider abstraction for AI-text detection (DETECTOR-INTEGRATION-PLAN.md item 1).
//
// The heuristic detector proved out the shape; now every real provider
// (GPTZero, Originality.ai, Copyleaks, ...) implements the same
// `AiDetectorProvider` contract and normalizes its own response into our
// shared `DetectionResult` (0-100, red/amber/green, sentence breakdown).
// The `MultiDetector` aggregator (item 5) then fans requests out across the
// configured providers and assembles the `DetectResponse` returned by
// `POST /detect`.

import {
  type AiDetector,
  type DetectionResult,
  type DetectionRisk,
  type SentenceDetection,
  scoreToRisk,
} from "../aiDetector.ts";

// Re-export the shared primitives so provider modules only import from here.
export type { AiDetector, DetectionResult, DetectionRisk, SentenceDetection };
export { scoreToRisk };

// One provider's contribution to the Detectors card. This is the wire shape
// sent to the client in `DetectResponse.providers[]` — a per-provider summary,
// without the sentence breakdown (that lives on the top-level result).
export interface ProviderResult {
  id: string; // "gptzero" | "originality" | "copyleaks" | "heuristic"
  name: string; // "GPTZero", "Originality.ai", ...
  score: number; // 0-100 AI-likelihood; ignored by the client when !available
  risk: DetectionRisk;
  available: boolean; // false → client renders "N/A" / the error, never a 0 score
  error?: string;
}

// The extended `/detect` response. Backwards-compatible: it still carries the
// original `DetectionResult` fields for sentence highlighting, plus `source`
// (where the overall/sentences came from) and the per-provider `providers[]`.
export interface DetectResponse extends DetectionResult {
  source: "providers" | "heuristic";
  providers: ProviderResult[];
}

// What a single provider yields for one request: the summary that always feeds
// the Detectors card, plus the full sentence-level `detail` when the provider
// produced one (only the main provider's detail is promoted to the top-level
// result). Unavailable providers return `detail: null`.
export interface ProviderDetection {
  summary: ProviderResult;
  detail: DetectionResult | null;
}

// The contract every provider implements. `detect` MUST NOT throw: network
// errors, timeouts, missing keys and 429s all come back as an unavailable
// summary (see `unavailableDetection`) so one flaky provider never fails the
// whole request.
export interface AiDetectorProvider {
  readonly id: string;
  readonly name: string;
  // True when the provider has the configuration it needs (e.g. its API key is
  // present in the environment). Unconfigured providers are skipped entirely.
  isConfigured(): boolean;
  detect(text: string): Promise<ProviderDetection>;
}

// Normalize a provider's probability (0-1, "how likely AI") to our 0-100 score.
// Clamps out-of-range and non-finite inputs so a malformed provider payload can
// never produce a NaN score.
export function probabilityToScore(prob: number): number {
  if (!Number.isFinite(prob)) return 0;
  return Math.round(Math.min(1, Math.max(0, prob)) * 100);
}

// Build a ProviderDetection from a fully-normalized DetectionResult. Providers
// call this on their happy path; the score/risk summary is derived from the
// result's overall so the card and the sentence view never disagree.
export function detectionFromResult(
  provider: Pick<AiDetectorProvider, "id" | "name">,
  result: DetectionResult,
): ProviderDetection {
  return {
    summary: {
      id: provider.id,
      name: provider.name,
      score: result.overallScore,
      risk: result.risk,
      available: true,
    },
    detail: result,
  };
}

// Build a ProviderDetection for a provider that could not run: no key, HTTP
// error, timeout, or rate limit. The score is a placeholder the client ignores
// (it shows "N/A" whenever `available` is false).
export function unavailableDetection(
  provider: Pick<AiDetectorProvider, "id" | "name">,
  error: string,
): ProviderDetection {
  return {
    summary: {
      id: provider.id,
      name: provider.name,
      score: 0,
      risk: "green",
      available: false,
      error,
    },
    detail: null,
  };
}
