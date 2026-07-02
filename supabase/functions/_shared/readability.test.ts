import { assert, assertEquals } from "jsr:@std/assert@1";
import { analyzeReadability, countSyllables } from "./readability.ts";

Deno.test("countSyllables handles common cases", () => {
  assertEquals(countSyllables("cat"), 1);
  assertEquals(countSyllables("apple"), 2);
  assertEquals(countSyllables("banana"), 3);
  assertEquals(countSyllables("readability"), 5);
  assertEquals(countSyllables(""), 0);
});

Deno.test("analyzeReadability returns zeroed result for empty text", () => {
  const result = analyzeReadability("");
  assertEquals(result.wordCount, 0);
  assertEquals(result.sentenceCount, 0);
  assertEquals(result.fleschReadingEase, 0);
  assertEquals(result.fleschKincaidGrade, 0);
});

Deno.test("analyzeReadability scores simple short sentences as easy", () => {
  const text = "The cat sat on the mat. The dog ran to the park.";
  const result = analyzeReadability(text);
  assertEquals(result.sentenceCount, 2);
  assert(result.fleschReadingEase > 80, `expected easy text to score high, got ${result.fleschReadingEase}`);
  assert(result.fleschKincaidGrade < 5, `expected easy text to have a low grade level, got ${result.fleschKincaidGrade}`);
});

Deno.test("analyzeReadability scores long, complex sentences as harder", () => {
  const text =
    "Notwithstanding the aforementioned considerations, the multifaceted implications of " +
    "organizational restructuring necessitate comprehensive stakeholder deliberation prior to " +
    "implementation, particularly regarding operational interdependencies.";
  const result = analyzeReadability(text);
  assert(result.fleschReadingEase < 40, `expected complex text to score low, got ${result.fleschReadingEase}`);
  assert(result.fleschKincaidGrade > 12, `expected complex text to have a high grade level, got ${result.fleschKincaidGrade}`);
});

Deno.test("analyzeReadability counts words and syllables consistently", () => {
  const result = analyzeReadability("Simple words are easy to read.");
  assertEquals(result.wordCount, 6);
  assert(result.syllableCount >= result.wordCount);
  assertEquals(result.avgWordsPerSentence, 6);
});
