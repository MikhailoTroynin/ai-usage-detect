import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { AnthropicConfigError, callClaude } from "../_shared/anthropic.ts";

// Minimal proxy for item 1 of PLAN.md: keeps ANTHROPIC_API_KEY server-side.
// Mode/tone/style-aware prompt tuning is item 2, not implemented here yet.
const BASE_SYSTEM_PROMPT =
  "You rewrite text so it reads naturally, as if written by a human. " +
  "Preserve the original meaning, facts, and approximate length. " +
  "Reply with only the rewritten text, no preamble or explanation.";

const MAX_TEXT_LENGTH = 20000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { text?: unknown; mode?: unknown; tone?: unknown; style?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { text, mode, tone, style } = body;
  if (typeof text !== "string" || text.trim().length === 0) {
    return jsonResponse({ error: "'text' is required and must be a non-empty string" }, 400);
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonResponse({ error: `'text' must be at most ${MAX_TEXT_LENGTH} characters` }, 400);
  }

  const hints = [
    typeof mode === "string" && mode ? `Mode: ${mode}.` : null,
    typeof tone === "string" && tone ? `Tone: ${tone}.` : null,
    typeof style === "string" && style ? `Style: ${style}.` : null,
  ].filter(Boolean);
  const system = hints.length > 0 ? `${BASE_SYSTEM_PROMPT} ${hints.join(" ")}` : BASE_SYSTEM_PROMPT;

  try {
    const rewritten = await callClaude({ system, prompt: text });
    return jsonResponse({ text: rewritten });
  } catch (err) {
    if (err instanceof AnthropicConfigError) {
      return jsonResponse({ error: err.message }, 500);
    }
    console.error(err);
    return jsonResponse({ error: "Failed to humanize text" }, 502);
  }
});
