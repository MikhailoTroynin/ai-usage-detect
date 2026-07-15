import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { multiDetector } from "../_shared/detectors/index.ts";
import { createCachingMultiDetector } from "../_shared/detectors/cache.ts";
import { clientKey, createRateLimiter } from "../_shared/rateLimit.ts";

const MAX_TEXT_LENGTH = 20000;

// The endpoint queries the real detectors through the MultiDetector aggregator
// (DETECTOR-INTEGRATION-PLAN.md item 5) instead of the bare heuristic. Real
// detectors are paid per request, so we wrap it in the text-hash cache (item 6)
// so identical, back-to-back requests on a warm instance are served from memory
// rather than re-billing every provider. With no provider keys configured the
// aggregator transparently falls back to the heuristic (`source: "heuristic"`).
const detector = createCachingMultiDetector(multiDetector);

// Per-caller rate limit (DETECTOR-INTEGRATION-PLAN.md item 11). Real detector
// calls cost money, so we cap how often one caller can hit /detect. Both the
// cap and the window are env-tunable without a code change; defaults are
// generous for a human (the client runs ~2 detects per humanize cycle) but
// throttle scripted abuse. In-memory, so the limit is per warm instance.
const RATE_LIMIT = parsePositiveInt(Deno.env.get("DETECT_RATE_LIMIT"), 30);
const RATE_WINDOW_MS = parsePositiveInt(Deno.env.get("DETECT_RATE_WINDOW_MS"), 60_000);
const rateLimiter = createRateLimiter({ limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS });

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// Sign-in is temporarily disabled (free Supabase tier can't be configured for
// email-OTP): this endpoint is open, no requireUser() gate for now. See
// ../_shared/auth.ts to re-enable. Until then the rate limit is keyed by client
// IP (see clientKey) rather than a user id.

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Throttle before doing any (paid) work: a blocked caller gets a 429 with a
  // Retry-After hint and never reaches the detectors.
  const limit = rateLimiter.check(clientKey(req));
  if (!limit.allowed) {
    const retryAfterSec = Math.ceil(limit.retryAfterMs / 1000);
    return jsonResponse(
      { error: "Too many requests. Please slow down and try again shortly." },
      429,
      { "Retry-After": String(retryAfterSec) },
    );
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
