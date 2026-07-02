import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { heuristicDetector } from "../_shared/aiDetector.ts";

const MAX_TEXT_LENGTH = 20000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { text?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { text } = body;
  if (typeof text !== "string" || text.trim().length === 0) {
    return jsonResponse({ error: "'text' is required and must be a non-empty string" }, 400);
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonResponse({ error: `'text' must be at most ${MAX_TEXT_LENGTH} characters` }, 400);
  }

  try {
    const result = await heuristicDetector.detect(text);
    return jsonResponse(result);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Failed to analyze text" }, 502);
  }
});
