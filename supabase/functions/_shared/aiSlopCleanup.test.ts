import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { cleanAiSlop } from "./aiSlopCleanup.ts";

Deno.test("replaces known AI-slop markers", () => {
  const input = "Let's delve into this crucial, vibrant tapestry.";
  const output = cleanAiSlop(input);
  assertNotEquals(output, input);
  for (const marker of ["delve", "crucial", "vibrant", "tapestry"]) {
    assert(!new RegExp(`\\b${marker}\\b`, "i").test(output), `expected "${marker}" to be replaced`);
  }
});

Deno.test("preserves capitalization of the original word", () => {
  const output = cleanAiSlop("Furthermore, this matters.");
  assert(/^[A-Z]/.test(output), "sentence-initial replacement should stay capitalized");
});

Deno.test("preserves full-uppercase words", () => {
  const output = cleanAiSlop("DELVE into it.");
  const firstWord = output.split(" ")[0];
  assertEquals(firstWord, firstWord.toUpperCase());
});

Deno.test("leaves text without markers untouched", () => {
  const input = "The cat sat on the mat.";
  assertEquals(cleanAiSlop(input), input);
});

Deno.test("does not partially match inside unrelated words", () => {
  // "crucially" contains "crucial" as a substring but should not match \bcrucial\b.
  const output = cleanAiSlop("This works crucially well.");
  assert(/crucially/i.test(output));
});
