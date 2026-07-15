import { assert, assertEquals } from "jsr:@std/assert@1";
import { clientKey, createRateLimiter } from "./rateLimit.ts";

// A mutable clock so window/expiry behaviour is deterministic (no real time).
function fakeClock(start = 0): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

// --- fixed-window counting -------------------------------------------------

Deno.test("rateLimit: allows up to the limit, then blocks within the window", () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 1_000, now: fakeClock().now });

  assertEquals(limiter.check("ip").allowed, true); // 1
  assertEquals(limiter.check("ip").allowed, true); // 2
  const third = limiter.check("ip"); // 3 — last allowed
  assertEquals(third.allowed, true);
  assertEquals(third.remaining, 0);

  const fourth = limiter.check("ip"); // over the limit
  assertEquals(fourth.allowed, false);
  assertEquals(fourth.remaining, 0);
});

Deno.test("rateLimit: reports remaining allowance as it counts down", () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 1_000, now: fakeClock().now });
  assertEquals(limiter.check("ip").remaining, 2);
  assertEquals(limiter.check("ip").remaining, 1);
  assertEquals(limiter.check("ip").remaining, 0);
});

Deno.test("rateLimit: keys are independent", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: fakeClock().now });
  assertEquals(limiter.check("a").allowed, true);
  assertEquals(limiter.check("a").allowed, false); // 'a' is spent
  assertEquals(limiter.check("b").allowed, true); // 'b' is untouched
});

// --- window reset ----------------------------------------------------------

Deno.test("rateLimit: the window resets after windowMs, restoring the allowance", () => {
  const clock = fakeClock();
  const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: clock.now });

  assertEquals(limiter.check("ip").allowed, true);
  assertEquals(limiter.check("ip").allowed, true);
  assertEquals(limiter.check("ip").allowed, false); // limit hit

  clock.advance(999);
  assertEquals(limiter.check("ip").allowed, false); // still inside the window

  clock.advance(1); // now() === start + windowMs → fresh window
  assertEquals(limiter.check("ip").allowed, true);
});

Deno.test("rateLimit: retryAfterMs counts down to the window reset", () => {
  const clock = fakeClock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: clock.now });

  const first = limiter.check("ip"); // opens the window at t=0
  assertEquals(first.retryAfterMs, 1_000);

  clock.advance(300);
  const blocked = limiter.check("ip");
  assertEquals(blocked.allowed, false);
  assertEquals(blocked.retryAfterMs, 700); // 1000 - 300
});

Deno.test("rateLimit: a blocked request does not consume the next window", () => {
  const clock = fakeClock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: clock.now });

  assertEquals(limiter.check("ip").allowed, true);
  assertEquals(limiter.check("ip").allowed, false); // blocked, must not advance count
  assertEquals(limiter.check("ip").allowed, false);

  clock.advance(1_000); // new window — full allowance despite the earlier blocks
  assertEquals(limiter.check("ip").allowed, true);
});

// --- option hygiene --------------------------------------------------------

Deno.test("rateLimit: a limit below 1 is floored to 1 (never allows zero)", () => {
  const limiter = createRateLimiter({ limit: 0, windowMs: 1_000, now: fakeClock().now });
  assertEquals(limiter.check("ip").allowed, true); // floored to 1 → one allowed
  assertEquals(limiter.check("ip").allowed, false);
});

// --- memory bounding -------------------------------------------------------

Deno.test("rateLimit: prunes elapsed windows once over maxKeys", () => {
  const clock = fakeClock();
  const limiter = createRateLimiter({
    limit: 5,
    windowMs: 1_000,
    maxKeys: 2,
    now: clock.now,
  });

  limiter.check("a");
  limiter.check("b");
  assertEquals(limiter.size(), 2);

  clock.advance(1_000); // 'a' and 'b' windows have now elapsed
  limiter.check("c"); // over maxKeys → prune elapsed 'a'/'b', keep 'c'
  assertEquals(limiter.size(), 1);
  assert(limiter.check("c").remaining >= 0);
});

Deno.test("rateLimit: caps memory even when all windows are still active", () => {
  const limiter = createRateLimiter({
    limit: 5,
    windowMs: 10_000,
    maxKeys: 2,
    now: fakeClock().now,
  });

  // Three distinct, still-active callers with only room for two: the oldest is
  // dropped (fail-open) so size never exceeds the cap.
  limiter.check("a");
  limiter.check("b");
  limiter.check("c");
  assertEquals(limiter.size(), 2);
});

Deno.test("rateLimit: reset clears all state", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: fakeClock().now });
  limiter.check("ip");
  assertEquals(limiter.size(), 1);
  limiter.reset();
  assertEquals(limiter.size(), 0);
  assertEquals(limiter.check("ip").allowed, true); // allowance restored
});

// --- clientKey -------------------------------------------------------------

function reqWith(headers: Record<string, string>): Request {
  return new Request("https://example.test/detect", { method: "POST", headers });
}

Deno.test("clientKey: uses the first x-forwarded-for hop", () => {
  const key = clientKey(reqWith({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" }));
  assertEquals(key, "203.0.113.7");
});

Deno.test("clientKey: falls back to x-real-ip when no forwarded header", () => {
  assertEquals(clientKey(reqWith({ "x-real-ip": "198.51.100.4" })), "198.51.100.4");
});

Deno.test("clientKey: falls back to 'unknown' when no client IP is present", () => {
  assertEquals(clientKey(reqWith({})), "unknown");
});

Deno.test("clientKey: ignores an empty forwarded value and uses the next signal", () => {
  // A present-but-empty x-forwarded-for must not yield an empty key.
  assertEquals(clientKey(reqWith({ "x-forwarded-for": "  ", "x-real-ip": "198.51.100.9" })), "198.51.100.9");
});
