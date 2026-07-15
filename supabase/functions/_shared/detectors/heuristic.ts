// Heuristic detector as an AiDetectorProvider (DETECTOR-INTEGRATION-PLAN.md item 1).
//
// This is a thin adapter over the existing `analyzeText` — no scoring logic
// changes here. It plays two roles in the aggregator: a normal provider entry
// when no real detector is configured, and the guaranteed fallback that keeps
// `/detect` answering (with `source: "heuristic"`) even when every external
// provider is unavailable. Because it needs no API key, `isConfigured` is
// always true.

import { analyzeText } from "../aiDetector.ts";
import {
  type AiDetectorProvider,
  type ProviderDetection,
  detectionFromResult,
} from "./types.ts";

const ID = "heuristic";
const NAME = "Heuristic";

export const heuristicProvider: AiDetectorProvider = {
  id: ID,
  name: NAME,
  isConfigured: () => true,
  detect(text: string): Promise<ProviderDetection> {
    return Promise.resolve(detectionFromResult({ id: ID, name: NAME }, analyzeText(text)));
  },
};
