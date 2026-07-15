import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  detectionFromResult,
  probabilityToScore,
  scoreToRisk,
  unavailableDetection,
} from "./types.ts";

Deno.test("probabilityToScore maps 0-1 onto 0-100", () => {
  assertEquals(probabilityToScore(0), 0);
  assertEquals(probabilityToScore(1), 100);
  assertEquals(probabilityToScore(0.5), 50);
  assertEquals(probabilityToScore(0.234), 23);
});

Deno.test("probabilityToScore clamps out-of-range and non-finite inputs", () => {
  assertEquals(probabilityToScore(-0.5), 0);
  assertEquals(probabilityToScore(1.5), 100);
  assertEquals(probabilityToScore(NaN), 0);
  assertEquals(probabilityToScore(Infinity), 0);
});

Deno.test("scoreToRisk uses the shared 66/35 bands", () => {
  assertEquals(scoreToRisk(90), "red");
  assertEquals(scoreToRisk(66), "red");
  assertEquals(scoreToRisk(50), "amber");
  assertEquals(scoreToRisk(35), "amber");
  assertEquals(scoreToRisk(10), "green");
});

Deno.test("detectionFromResult derives the summary from the result overall", () => {
  const { summary, detail } = detectionFromResult(
    { id: "gptzero", name: "GPTZero" },
    { overallScore: 82, risk: "red", sentences: [{ text: "hi", score: 82, risk: "red" }] },
  );
  assertEquals(summary.id, "gptzero");
  assertEquals(summary.name, "GPTZero");
  assertEquals(summary.score, 82);
  assertEquals(summary.risk, "red");
  assertEquals(summary.available, true);
  assertEquals(summary.error, undefined);
  assert(detail !== null);
  assertEquals(detail?.sentences.length, 1);
});

Deno.test("unavailableDetection carries the error and no detail", () => {
  const { summary, detail } = unavailableDetection(
    { id: "gptzero", name: "GPTZero" },
    "missing GPTZERO_API_KEY",
  );
  assertEquals(summary.available, false);
  assertEquals(summary.error, "missing GPTZERO_API_KEY");
  assertEquals(detail, null);
});
