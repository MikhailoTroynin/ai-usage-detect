// Re-exports the readability engine from its canonical location in
// src/utils/readability.ts so the Metrics screen (Expo) and this backend
// share a single implementation (PLAN.md item 5).
export * from "../../../src/utils/readability.ts";
