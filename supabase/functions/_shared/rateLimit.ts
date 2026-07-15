// In-memory per-caller rate limiter for /detect (DETECTOR-INTEGRATION-PLAN.md
// item 11; overlaps PLAN.md item 14).
//
// Real detectors are paid per call, so a single caller hammering `/detect` can
// run up real cost. This is the cheap first line of defense: a fixed-window
// request counter keyed by caller, held in memory on the function instance.
//
// Scope, like the text-hash cache (item 6): in-memory only. It lives and dies
// with the warm instance and is not shared across instances, so under horizontal
// fan-out the effective limit is per-instance (N instances → up to N× the cap).
// That is acceptable for a "minimal" abuse guard; a global limit would need a
// shared store (Redis/Postgres), which is out of scope for this pass.
//
// Failure mode is deliberately fail-open: when memory pressure forces eviction
// we drop counters (granting a fresh allowance) rather than block, so the
// limiter can never wrongly lock out a legitimate caller.

export interface RateLimitResult {
  // False → the caller has exhausted its allowance for the current window.
  allowed: boolean;
  // Requests still permitted in the current window (0 once blocked).
  remaining: number;
  // ms until the current window resets — i.e. how long a blocked caller should
  // wait before retrying. Surface it to clients as a `Retry-After` header.
  retryAfterMs: number;
}

export interface RateLimiterOptions {
  // Max requests allowed per window, per key.
  limit: number;
  // Window length in ms.
  windowMs: number;
  // Cap on distinct keys held at once. On overflow, elapsed windows are pruned
  // first, then (if still over) the oldest are dropped, so a flood of unique
  // callers can't grow memory without bound. Defaults to DEFAULT_MAX_KEYS.
  maxKeys?: number;
  // Injectable clock (ms) for deterministic tests; defaults to Date.now.
  now?: () => number;
}

export interface RateLimiter {
  // Records one request for `key` and reports whether it is within the limit.
  // A blocked request does not consume from a future window (the counter only
  // advances while allowed).
  check(key: string): RateLimitResult;
  // Drop all state (mainly for tests).
  reset(): void;
  // Number of keys currently tracked (mainly for tests / introspection).
  size(): number;
}

interface Window {
  count: number;
  startMs: number;
}

// A generous default: enough distinct callers that a normal instance never
// prunes, small enough that a unique-key flood stays bounded.
const DEFAULT_MAX_KEYS = 10_000;

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const limit = Math.max(1, Math.floor(options.limit));
  const windowMs = Math.max(1, Math.floor(options.windowMs));
  const maxKeys = Math.max(1, Math.floor(options.maxKeys ?? DEFAULT_MAX_KEYS));
  const now = options.now ?? Date.now;

  // Insertion-ordered, so the first key is the oldest-inserted — used as a
  // last-resort eviction order when pruning elapsed windows isn't enough.
  const windows = new Map<string, Window>();

  function bound(current: number): void {
    if (windows.size <= maxKeys) return;
    // Cheap and safe: an elapsed window would reset on next sight anyway.
    for (const [key, w] of windows) {
      if (current - w.startMs >= windowMs) windows.delete(key);
    }
    // Still over budget (many active callers) → drop oldest. Fail-open: the
    // dropped caller simply gets a fresh allowance.
    while (windows.size > maxKeys) {
      const oldest = windows.keys().next().value;
      if (oldest === undefined) break;
      windows.delete(oldest);
    }
  }

  return {
    check(key: string): RateLimitResult {
      const current = now();
      let w = windows.get(key);

      // Start a fresh window on first sight or once the previous one elapsed.
      if (!w || current - w.startMs >= windowMs) {
        w = { count: 0, startMs: current };
        windows.set(key, w);
      }

      const retryAfterMs = Math.max(0, w.startMs + windowMs - current);

      if (w.count >= limit) {
        return { allowed: false, remaining: 0, retryAfterMs };
      }

      w.count += 1;
      bound(current);
      return { allowed: true, remaining: limit - w.count, retryAfterMs };
    },

    reset(): void {
      windows.clear();
    },

    size(): number {
      return windows.size;
    },
  };
}

// Derive the rate-limit key for a request. Sign-in is currently disabled on
// /detect (see detect/index.ts), so there is no user id to key on; the caller's
// IP is the best available per-user proxy. Supabase/Deno Deploy sets
// `x-forwarded-for` (client first, proxies appended); `x-real-ip` is a fallback.
// When neither is present every caller shares the "unknown" bucket, which only
// makes the limit stricter — a safe degradation. When requireUser() is
// re-enabled, prefer keying on the authenticated user id instead.
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
