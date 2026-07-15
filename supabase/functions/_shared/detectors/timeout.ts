// Shared timeout budget for provider external calls
// (DETECTOR-INTEGRATION-PLAN.md item 11).
//
// Every real provider (GPTZero, Originality.ai, Copyleaks) talks to a
// third-party API that can hang. The client gives the whole `/detect` request a
// 45s budget (src/lib/api.ts, `DEFAULT_TIMEOUT_MS`). Providers are queried in
// parallel by the aggregator, so a single per-provider cap that sits comfortably
// under that 45s keeps one slow provider from ever blowing the client's
// deadline. Centralizing the value (and the AbortController plumbing) here means
// the providers can't quietly drift apart from each other or from the client.

// Per-provider timeout. Deliberately less than half the client's 45s so that
// even a login-then-check flow (Copyleaks) plus a little scheduling slack still
// finishes before the client gives up.
export const DETECTOR_TIMEOUT_MS = 20_000;

// Run `work` under an AbortController that fires after `timeoutMs`, always
// clearing the timer afterwards. The signal is handed to the callback so a
// multi-request flow (e.g. Copyleaks logs in, then checks) can share one
// deadline across every fetch it makes. `work` is expected to pass the signal to
// each `fetch`; when the deadline fires the in-flight request rejects with an
// `AbortError`, which callers recognize via `isTimeoutError`.
export async function withTimeout<T>(
  timeoutMs: number,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// True when an error is the AbortController firing (i.e. the timeout elapsed),
// so a provider can report a precise "timed out" message instead of a generic
// request failure.
export function isTimeoutError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
