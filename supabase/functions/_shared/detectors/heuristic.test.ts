import { assert, assertEquals } from "jsr:@std/assert@1";
import { analyzeText } from "../aiDetector.ts";
import { heuristicProvider } from "./heuristic.ts";

Deno.test("heuristic provider is always configured (no API key needed)", () => {
  assertEquals(heuristicProvider.id, "heuristic");
  assertEquals(heuristicProvider.isConfigured(), true);
});

Deno.test("heuristic provider delegates to analyzeText and mirrors its overall", async () => {
  const text =
    "In today's fast-paced digital landscape, businesses must leverage cutting-edge solutions. " +
    "Moreover, it is important to note that quality remains crucial.";
  const expected = analyzeText(text);

  const { summary, detail } = await heuristicProvider.detect(text);

  assertEquals(summary.available, true);
  assertEquals(summary.score, expected.overallScore);
  assertEquals(summary.risk, expected.risk);
  assert(detail !== null);
  assertEquals(detail?.overallScore, expected.overallScore);
  assertEquals(detail?.sentences.length, expected.sentences.length);
});
