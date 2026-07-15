// MultiDetector aggregator (DETECTOR-INTEGRATION-PLAN.md item 5).
//
// This is the fan-out layer `POST /detect` (item 7) calls instead of any single
// detector. It:
//   - collects the configured real providers (those whose keys are present),
//   - queries them in parallel with `Promise.allSettled` (one flaky provider can
//     never fail the whole request — see the never-throw contract in types.ts),
//   - picks the overall score + sentence highlighting from the primary provider
//     (GPTZero) when it answered, otherwise from a consensus of the providers
//     that did, otherwise from the always-available heuristic fallback, and
//   - returns one `providers[]` card entry per configured provider (available or
//     not) so the client can render real per-provider scores and honest "N/A"s.
//
// The default provider set is wired here (GPTZero → Originality.ai → Copyleaks,
// in priority order) but every collaborator is injectable so the aggregation
// logic is unit-testable without any network or real keys.

import {
  type AiDetectorProvider,
  type DetectionResult,
  type DetectResponse,
  type ProviderDetection,
  type ProviderResult,
  scoreToRisk,
  unavailableDetection,
} from "./types.ts";
import { heuristicProvider } from "./heuristic.ts";
import { gptzeroProvider } from "./gptzero.ts";
import { originalityProvider } from "./originality.ts";
import { copyleaksProvider } from "./copyleaks.ts";

// The aggregator's public shape. It returns the extended `DetectResponse` (the
// original DetectionResult fields plus `source` and `providers[]`), not a bare
// DetectionResult, so it is deliberately not itself an `AiDetectorProvider`.
export interface MultiDetector {
  detect(text: string): Promise<DetectResponse>;
}

export interface MultiDetectorDeps {
  // Real detectors, in priority order. Defaults to GPTZero, Originality.ai,
  // Copyleaks. Only the configured ones (keys present) are actually queried.
  providers?: AiDetectorProvider[];
  // Always-available fallback used for overall/sentences when no real provider
  // produced a result. Defaults to the heuristic adapter.
  fallback?: AiDetectorProvider;
  // Id of the primary provider whose result is used verbatim when available.
  // Defaults to GPTZero; when it is unavailable we fall back to consensus.
  primaryId?: string;
}

// Default real-provider set, in priority order (item 5: "від основного — GPTZero").
// Exported so the caching layer (item 6) can derive the same active-provider
// signature for its cache key without re-declaring the list here.
export const DEFAULT_PROVIDERS: AiDetectorProvider[] = [
  gptzeroProvider,
  originalityProvider,
  copyleaksProvider,
];

export function createMultiDetector(deps: MultiDetectorDeps = {}): MultiDetector {
  const providers = deps.providers ?? DEFAULT_PROVIDERS;
  const fallback = deps.fallback ?? heuristicProvider;
  const primaryId = deps.primaryId ?? "gptzero";

  return {
    async detect(text: string): Promise<DetectResponse> {
      // Skip unconfigured providers entirely (no key → not on the card at all).
      const configured = providers.filter((p) => p.isConfigured());

      // No real detector wired up → pure heuristic mode. The single heuristic
      // card gives the client an honest live score; `source` marks it approximate.
      if (configured.length === 0) {
        const heuristic = await fallback.detect(text);
        return toResponse(resultOf(heuristic), "heuristic", [heuristic.summary]);
      }

      // Fan out. `detect` never throws per contract, so every outcome should be
      // fulfilled; a rejection (a provider violating the contract) is still
      // mapped to an unavailable card rather than failing the whole request.
      const settled = await Promise.allSettled(configured.map((p) => p.detect(text)));
      const detections: ProviderDetection[] = settled.map((outcome, i) => {
        if (outcome.status === "fulfilled") return outcome.value;
        const p = configured[i];
        return unavailableDetection({ id: p.id, name: p.name }, describeRejection(outcome.reason));
      });

      const summaries: ProviderResult[] = detections.map((d) => d.summary);

      // Primary (GPTZero) answered → use its result verbatim for overall/sentences.
      const primary = detections.find((d) => d.summary.id === primaryId && d.detail !== null);
      if (primary?.detail) {
        return toResponse(primary.detail, "providers", summaries);
      }

      // Otherwise take the consensus of whichever providers did answer.
      const available = detections.filter((d) => d.detail !== null);
      if (available.length > 0) {
        return toResponse(consensus(available), "providers", summaries);
      }

      // Every configured provider failed at runtime → heuristic fallback. Keep the
      // failed cards (so the client shows their N/A + error) and append heuristic.
      const heuristic = await fallback.detect(text);
      return toResponse(resultOf(heuristic), "heuristic", [...summaries, heuristic.summary]);
    },
  };
}

// Default singleton for `POST /detect` (item 7). Reads every provider's key from
// the environment at call time, so it stays in heuristic-fallback mode until at
// least one detector secret is set.
export const multiDetector = createMultiDetector();

// --- aggregation helpers ---------------------------------------------------

function toResponse(
  result: DetectionResult,
  source: DetectResponse["source"],
  providers: ProviderResult[],
): DetectResponse {
  return {
    overallScore: result.overallScore,
    risk: result.risk,
    sentences: result.sentences,
    source,
    providers,
  };
}

// Consensus of the providers that answered: the overall score is the median of
// their scores (robust to one outlier), and the sentence highlighting is taken
// from the highest-priority provider that produced any (they use different
// segmentation, so merging is not meaningful — we surface one coherent set).
// `available` is in priority order, so `available[0]` is the highest priority.
function consensus(available: ProviderDetection[]): DetectionResult {
  const details = available.map(resultOf);
  const overallScore = median(details.map((d) => d.overallScore));
  const sentences = details.find((d) => d.sentences.length > 0)?.sentences ??
    details[0].sentences;
  return { overallScore, risk: scoreToRisk(overallScore), sentences };
}

// A detection's normalized result. Only ever called for available detections
// (detail present) and the heuristic fallback (which always produces one); the
// empty-result guard keeps a contract-violating provider from crashing us.
function resultOf(detection: ProviderDetection): DetectionResult {
  return detection.detail ?? { overallScore: 0, risk: "green", sentences: [] };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(m);
}

function describeRejection(reason: unknown): string {
  const detail = reason instanceof Error ? reason.message : String(reason);
  return `provider threw: ${detail}`;
}
