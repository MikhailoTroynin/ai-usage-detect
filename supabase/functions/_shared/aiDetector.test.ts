import { assert, assertEquals } from "jsr:@std/assert@1";
import { analyzeText } from "./aiDetector.ts";

Deno.test("flags text full of stock AI phrases as red", () => {
  const text =
    "In today's fast-paced digital landscape, businesses must leverage cutting-edge solutions. " +
    "Moreover, it is important to note that quality remains crucial. " +
    "Furthermore, this represents a paradigm shift in the realm of marketing.";
  const result = analyzeText(text);
  assertEquals(result.risk, "red");
  assert(result.overallScore >= 66);
  assert(result.sentences.every((s) => s.risk === "red"));
});

Deno.test("scores plain, varied human text as green", () => {
  const text =
    "Grabbed coffee with Dana this morning, then fixed the leaky kitchen faucet. " +
    "The dog seemed thrilled about the extra attention. " +
    "Not exactly a thrilling Tuesday, but a good one.";
  const result = analyzeText(text);
  assertEquals(result.risk, "green");
});

Deno.test("flags repeated sentence openers", () => {
  const text =
    "The team shipped the feature on time. " +
    "The team celebrated with pizza afterward. " +
    "The team is already planning the next sprint.";
  const result = analyzeText(text);
  assert(result.sentences.every((s) => s.score > 0), "repeated openers should raise every sentence's score");
});

Deno.test("returns no sentences for empty text", () => {
  const result = analyzeText("");
  assertEquals(result.sentences, []);
  assertEquals(result.overallScore, 0);
  assertEquals(result.risk, "green");
});

Deno.test("each sentence keeps its original text", () => {
  const text = "First sentence here. Second sentence here.";
  const result = analyzeText(text);
  assertEquals(result.sentences.map((s) => s.text), ["First sentence here.", "Second sentence here."]);
});
