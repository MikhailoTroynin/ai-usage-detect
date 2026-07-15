import { Risk } from '../data/content';
import { getAccessToken, refreshSession, signOut } from './supabase';

// Base URL for the Supabase Edge Functions backend (see README.md → "Backend proxy").
// Defaults to the local `supabase functions serve` address for dev; override via
// EXPO_PUBLIC_API_URL for staging/prod builds. No secrets live here — the client
// only ever talks to our own proxy, never directly to Anthropic.
const DEFAULT_API_URL = 'http://127.0.0.1:54321/functions/v1';
const DEFAULT_TIMEOUT_MS = 45_000;

function normalizeApiUrl(value: string | undefined): string {
  const raw = value?.trim() || DEFAULT_API_URL;
  return raw.replace(/\/+$/, '');
}

function parseTimeout(value: string | undefined): number {
  if (!value) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export const apiConfig = {
  baseUrl: normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL),
  timeoutMs: parseTimeout(process.env.EXPO_PUBLIC_API_TIMEOUT_MS),
};

export class ApiError extends Error {}
export class ApiTimeoutError extends ApiError {}
export class ApiAuthError extends ApiError {}

async function sendRequest(path: string, payload: unknown): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiConfig.timeoutMs);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(`${apiConfig.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiTimeoutError('The request timed out. Check your connection and try again.');
    }
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

async function post<T>(path: string, payload: unknown): Promise<T> {
  let res = await sendRequest(path, payload);

  // The access token may have expired mid-session: try one silent refresh and
  // retry before surfacing an auth error that would bounce the user to sign-in.
  if (res.status === 401 && (await refreshSession())) {
    res = await sendRequest(path, payload);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await res.json();
  } catch {
    // fall through to status-based error below
  }

  if (res.status === 401) {
    // Refresh already failed (or there was nothing to refresh): drop the session
    // so the app returns to the sign-in screen instead of retrying forever.
    signOut();
    const message = typeof body?.error === 'string' ? body.error : 'Please sign in again.';
    throw new ApiAuthError(message);
  }

  if (!res.ok) {
    const message = typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`;
    throw new ApiError(message);
  }

  if (!body) {
    throw new ApiError('Unexpected empty response from server');
  }

  return body as T;
}

export interface HumanizeParams {
  text: string;
  mode: string;
  tone: string;
  style: string;
}

export async function humanize({ text, mode, tone, style }: HumanizeParams): Promise<string> {
  const body = await post<{ text?: unknown }>('/humanize', { text, mode, tone, style });
  if (typeof body?.text !== 'string') {
    throw new ApiError('Unexpected response from server');
  }
  return body.text;
}

export interface DetectSentenceResult {
  text: string;
  score: number;
  risk: Risk;
}

// Where the overall score + sentence highlighting came from: real detector
// providers, or the heuristic fallback (client renders "approximate").
export type DetectSource = 'providers' | 'heuristic';

// One provider's row on the Detectors card. Mirrors the backend `ProviderResult`
// (supabase/functions/_shared/detectors/types.ts). When `available` is false the
// score is meaningless — the client shows "N/A" (and the optional `error`).
export interface DetectProviderResult {
  id: string;
  name: string;
  score: number;
  risk: Risk;
  available: boolean;
  error?: string;
}

export interface DetectResult {
  overallScore: number;
  risk: Risk;
  sentences: DetectSentenceResult[];
  // Extended by the multi-detector backend (DETECTOR-INTEGRATION-PLAN.md item 7).
  // Optional so the client keeps working against an older server that returns
  // only the sentence-level fields.
  source?: DetectSource;
  providers?: DetectProviderResult[];
}

const RISK_VALUES: readonly Risk[] = ['red', 'amber', 'green'];

function isRisk(value: unknown): value is Risk {
  return typeof value === 'string' && (RISK_VALUES as readonly string[]).includes(value);
}

// Same thresholds as the backend `scoreToRisk`, used only as a fallback when a
// response omits or malforms `risk` so we never show a misleading level.
function scoreToRisk(score: number): Risk {
  if (score >= 66) return 'red';
  if (score >= 35) return 'amber';
  return 'green';
}

// Keep only well-formed provider rows; a malformed entry is dropped rather than
// failing the whole detect call, and an absent/non-array `providers` yields
// `undefined` so the client falls back to its demo data.
function parseProviders(value: unknown): DetectProviderResult[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const providers: DetectProviderResult[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const p = entry as Record<string, unknown>;
    if (
      typeof p.id !== 'string' ||
      typeof p.name !== 'string' ||
      typeof p.score !== 'number' ||
      !isRisk(p.risk) ||
      typeof p.available !== 'boolean'
    ) {
      continue;
    }
    const provider: DetectProviderResult = {
      id: p.id,
      name: p.name,
      score: p.score,
      risk: p.risk,
      available: p.available,
    };
    if (typeof p.error === 'string') provider.error = p.error;
    providers.push(provider);
  }
  return providers;
}

export async function detect(text: string): Promise<DetectResult> {
  const body = await post<Record<string, unknown>>('/detect', { text });
  if (typeof body?.overallScore !== 'number' || !Array.isArray(body.sentences)) {
    throw new ApiError('Unexpected response from server');
  }
  const result: DetectResult = {
    overallScore: body.overallScore,
    risk: isRisk(body.risk) ? body.risk : scoreToRisk(body.overallScore),
    sentences: body.sentences as DetectSentenceResult[],
  };
  // Extended fields are optional: validate and attach only when well-formed.
  if (body.source === 'providers' || body.source === 'heuristic') {
    result.source = body.source;
  }
  const providers = parseProviders(body.providers);
  if (providers) result.providers = providers;
  return result;
}

export async function alternatives(sentence: string, count = 3): Promise<string[]> {
  const body = await post<{ alternatives?: unknown }>('/alternatives', { sentence, count });
  if (!Array.isArray(body?.alternatives) || !body.alternatives.every(a => typeof a === 'string')) {
    throw new ApiError('Unexpected response from server');
  }
  return body.alternatives;
}
