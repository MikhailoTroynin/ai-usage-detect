import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { AnthropicConfigError, callClaude } from "../_shared/anthropic.ts";
import { cleanAiSlop } from "../_shared/aiSlopCleanup.ts";
import {
  buildHumanizeSystemPrompt,
  isValidMode,
  isValidStyle,
  isValidTone,
  MODES,
  STYLES,
  TONES,
} from "../_shared/humanizePrompt.ts";

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
  if (mode !== undefined && !isValidMode(mode)) {
    return jsonResponse({ error: `'mode' must be one of: ${MODES.join(", ")}` }, 400);
  }
  if (tone !== undefined && !isValidTone(tone)) {
    return jsonResponse({ error: `'tone' must be one of: ${TONES.join(", ")}` }, 400);
  }
  if (style !== undefined && !isValidStyle(style)) {
    return jsonResponse({ error: `'style' must be one of: ${STYLES.join(", ")}` }, 400);
  }

  const system = buildHumanizeSystemPrompt({ mode, tone, style });

  try {
    const rewritten = await callClaude({ system, prompt: text });
    return jsonResponse({ text: cleanAiSlop(rewritten) });
  } catch (err) {
    if (err instanceof AnthropicConfigError) {
      return jsonResponse({ error: err.message }, 500);
    }
    console.error(err);
    return jsonResponse({ error: "Failed to humanize text" }, 502);
  }
});
