// Text-hash cache for /detect (DETECTOR-INTEGRATION-PLAN.md item 6).
//
// Real detectors are paid per request, so re-running `/detect` on the same text
// while an instance is still warm should never bill the providers a second
// time. This module is that guard: an in-memory LRU with per-entry TTL, keyed by
// the SHA-256 of the text plus the active provider set, and a thin wrapper that
// layers it over the `MultiDetector` aggregator (item 5).
//
// Scope (per the plan): in-memory only — it lives and dies with the function
// instance, so a cold start starts empty and there is no cross-instance sharing.
// A persistent Postgres cache is explicitly out of scope. We also deliberately
// cache only *paid* results (`source === "providers"`): a heuristic fallback
// costs nothing and usually means the real providers were transiently down, so
// caching it would just suppress the retry that could recover them.

import {
  type AiDetectorProvider,
  type DetectResponse,
} from "./types.ts";
import { DEFAULT_PROVIDERS, type MultiDetector } from "./index.ts";

// --- generic TTL + LRU map -------------------------------------------------

export interface TtlLruCacheOptions {
  // Maximum live entries. On overflow the least-recently-used key is evicted.
  maxEntries: number;
  // How long after insertion an entry is served before it is treated as absent.
  ttlMs: number;
  // Injectable clock (ms) for deterministic tests; defaults to `Date.now`.
  now?: () => number;
}

export interface TtlLruCache<V> {
  // Returns the live value, or undefined when missing or expired. A read counts
  // as a use, refreshing the key's LRU recency (but not its TTL).
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  size(): number;
  clear(): void;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export function createTtlLruCache<V>(options: TtlLruCacheOptions): TtlLruCache<V> {
  const maxEntries = Math.max(1, Math.floor(options.maxEntries));
  const ttlMs = Math.max(0, options.ttlMs);
  const now = options.now ?? Date.now;

  // A Map preserves insertion order, so its first key is the least-recently
  // used: on `get` we re-insert to move the key to the end (most recent), and on
  // overflow we evict from the front. That gives O(1) LRU without a linked list.
  const map = new Map<string, Entry<V>>();

  return {
    get(key: string): V | undefined {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (now() >= entry.expiresAt) {
        map.delete(key);
        return undefined;
      }
      // Refresh recency: delete + re-set moves this key to the most-recent slot.
      map.delete(key);
      map.set(key, entry);
      return entry.value;
    },

    set(key: string, value: V): void {
      // Delete first so a re-set counts as a fresh, most-recent insertion.
      map.delete(key);
      map.set(key, { value, expiresAt: now() + ttlMs });
      while (map.size > maxEntries) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        map.delete(oldest);
      }
    },

    size(): number {
      return map.size;
    },

    clear(): void {
      map.clear();
    },
  };
}

// --- cache key -------------------------------------------------------------

// Lowercase-hex SHA-256 of the input. Web Crypto is available globally in Deno,
// so this needs no extra permissions.
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Stable identifier of the currently *configured* providers (sorted ids). Mixed
// into the cache key so that if the active provider set changes — a key added or
// removed — old entries computed against a different set are never served.
export function configuredSignature(providers: AiDetectorProvider[]): string {
  return providers
    .filter((p) => p.isConfigured())
    .map((p) => p.id)
    .sort()
    .join(",");
}

// The exact bytes hashed for a request. The provider signature and text are
// joined with a newline so a request can't be crafted to collide with another
// (the text may itself contain the signature string, but not a leading one plus
// a newline that also reproduces the intended text).
function cacheKeyInput(signature: string, text: string): string {
  return `${signature}\n${text}`;
}

// --- caching wrapper -------------------------------------------------------

// A conservative default footprint for a warm instance: cap memory at a few
// hundred documents and let entries age out after a few minutes.
const DEFAULT_MAX_ENTRIES = 256;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface CachingMultiDetectorOptions {
  // Produces the provider-set portion of the cache key, evaluated per request
  // (cheap). Defaults to the configured ids of the aggregator's default set.
  providerSignature?: () => string;
  // Whether a given response is worth caching. Default: only paid provider
  // results, never a heuristic fallback (see the module note above).
  shouldCache?: (response: DetectResponse) => boolean;
  // Bring your own cache (e.g. shared across wrappers, or for tests). When
  // omitted one is created from the size/ttl/clock options below.
  cache?: TtlLruCache<DetectResponse>;
  maxEntries?: number;
  ttlMs?: number;
  now?: () => number;
}

// Wrap a MultiDetector so identical, back-to-back requests are served from
// memory instead of re-billing the providers. Same `MultiDetector` shape, so it
// is a drop-in for `POST /detect` (item 7).
export function createCachingMultiDetector(
  inner: MultiDetector,
  options: CachingMultiDetectorOptions = {},
): MultiDetector {
  const providerSignature = options.providerSignature ??
    (() => configuredSignature(DEFAULT_PROVIDERS));
  const shouldCache = options.shouldCache ?? ((r: DetectResponse) => r.source === "providers");
  const cache = options.cache ?? createTtlLruCache<DetectResponse>({
    maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
    ttlMs: options.ttlMs ?? DEFAULT_TTL_MS,
    now: options.now,
  });

  return {
    async detect(text: string): Promise<DetectResponse> {
      const key = await sha256Hex(cacheKeyInput(providerSignature(), text));
      const hit = cache.get(key);
      if (hit) return hit;

      const response = await inner.detect(text);
      if (shouldCache(response)) cache.set(key, response);
      return response;
    },
  };
}
