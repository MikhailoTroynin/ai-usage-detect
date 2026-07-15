import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { multiDetector } from "../_shared/detectors/index.ts";
import { createCachingMultiDetector } from "../_shared/detectors/cache.ts";

const MAX_TEXT_LENGTH = 20000;

// The endpoint queries the real detectors through the MultiDetector aggregator
// (DETECTOR-INTEGRATION-PLAN.md item 5) instead of the bare heuristic. Real
// detectors are paid per request, so we wrap it in the text-hash cache (item 6)
// so identical, back-to-back requests on a warm instance are served from memory
// rather than re-billing every provider. With no provider keys configured the
// aggregator transparently falls back to the heuristic (`source: "heuristic"`).
const detector = createCachingMultiDetector(multiDetector);

// Sign-in is temporarily disabled (free Supabase tier can't be configured for
// email-OTP): this endpoint is open, no requireUser() gate for now. See
// ../_shared/auth.ts to re-enable.

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
    const result = await detector.detect(text);
    return jsonResponse(result);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Failed to analyze text" }, 502);
  }
});
