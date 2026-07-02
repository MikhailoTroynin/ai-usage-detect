import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { AnthropicConfigError, callClaude } from "../_shared/anthropic.ts";

// Minimal proxy for item 1 of PLAN.md: keeps ANTHROPIC_API_KEY server-side.
const SYSTEM_PROMPT =
  "You rewrite a single sentence in a few alternative ways, preserving its meaning. " +
  "Reply with only a JSON array of strings (the alternative sentences), nothing else.";

const MAX_SENTENCE_LENGTH = 2000;
const DEFAULT_COUNT = 3;
const MAX_COUNT = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { sentence?: unknown; count?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { sentence, count } = body;
  if (typeof sentence !== "string" || sentence.trim().length === 0) {
    return jsonResponse({ error: "'sentence' is required and must be a non-empty string" }, 400);
  }
  if (sentence.length > MAX_SENTENCE_LENGTH) {
    return jsonResponse({ error: `'sentence' must be at most ${MAX_SENTENCE_LENGTH} characters` }, 400);
  }
  const alternativeCount =
    typeof count === "number" && Number.isInteger(count) && count > 0
      ? Math.min(count, MAX_COUNT)
      : DEFAULT_COUNT;

  const prompt = `Sentence: ${sentence}\n\nGive ${alternativeCount} alternative phrasings.`;

  try {
    const raw = await callClaude({ system: SYSTEM_PROMPT, prompt, temperature: 1.0 });
    let alternatives: unknown;
    try {
      alternatives = JSON.parse(raw);
    } catch {
      return jsonResponse({ error: "Model did not return valid JSON" }, 502);
    }
    if (!Array.isArray(alternatives) || !alternatives.every((a) => typeof a === "string")) {
      return jsonResponse({ error: "Model did not return an array of strings" }, 502);
    }
    return jsonResponse({ alternatives });
  } catch (err) {
    if (err instanceof AnthropicConfigError) {
      return jsonResponse({ error: err.message }, 500);
    }
    console.error(err);
    return jsonResponse({ error: "Failed to generate alternatives" }, 502);
  }
});
