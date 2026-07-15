import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { DETECTOR_TIMEOUT_MS, isTimeoutError, withTimeout } from "./timeout.ts";

// --- DETECTOR_TIMEOUT_MS ---------------------------------------------------

Deno.test("timeout: the shared budget stays under the client's 45s deadline", () => {
  // The client (src/lib/api.ts) gives the whole /detect request 45s. A provider
  // cap at/above that could blow the client's deadline; item 11 wants it well
  // under. We also leave room for a two-request flow (Copyleaks) within budget.
  assert(DETECTOR_TIMEOUT_MS < 45_000);
  assert(DETECTOR_TIMEOUT_MS * 2 < 45_000);
});

// --- withTimeout: happy path ----------------------------------------------

Deno.test("withTimeout: resolves with the work's value and clears the timer", async () => {
  const value = await withTimeout(1_000, () => Promise.resolve(42));
  assertEquals(value, 42);
  // If the timer were left pending, Deno's op-sanitizer would fail this test.
});

Deno.test("withTimeout: passes a live (un-aborted) signal to the work", async () => {
  const aborted = await withTimeout(1_000, (signal) => Promise.resolve(signal.aborted));
  assertEquals(aborted, false);
});

Deno.test("withTimeout: does not abort work that finishes before the deadline", async () => {
  let abortedDuringWork = false;
  const result = await withTimeout(1_000, (signal) => {
    signal.addEventListener("abort", () => (abortedDuringWork = true));
    return Promise.resolve("done");
  });
  assertEquals(result, "done");
  assertEquals(abortedDuringWork, false);
});

// --- withTimeout: the deadline fires --------------------------------------

Deno.test("withTimeout: aborts the signal once the deadline elapses", async () => {
  // Work that only settles when the signal aborts — i.e. a hung request. The
  // deadline must fire and reject with an AbortError that isTimeoutError spots.
  const err = await assertRejects(() =>
    withTimeout(10, (signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(new DOMException("The signal has been aborted", "AbortError")));
      }))
  );
  assert(isTimeoutError(err));
});

Deno.test("withTimeout: propagates a work rejection and still clears the timer", async () => {
  // A non-timeout failure (network error) surfaces unchanged, and the pending
  // timer is cleared so the op-sanitizer stays happy.
  const err = await assertRejects(
    () => withTimeout(1_000, () => Promise.reject(new TypeError("network down"))),
    TypeError,
    "network down",
  );
  assertEquals(isTimeoutError(err), false);
});

// --- isTimeoutError --------------------------------------------------------

Deno.test("isTimeoutError: true only for an AbortError DOMException", () => {
  assert(isTimeoutError(new DOMException("aborted", "AbortError")));
  assertEquals(isTimeoutError(new DOMException("boom", "SyntaxError")), false);
  assertEquals(isTimeoutError(new Error("AbortError")), false); // name matches, wrong type
  assertEquals(isTimeoutError(new TypeError("network down")), false);
  assertEquals(isTimeoutError("AbortError"), false);
  assertEquals(isTimeoutError(null), false);
});
