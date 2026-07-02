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

export interface DetectResult {
  overallScore: number;
  risk: Risk;
  sentences: DetectSentenceResult[];
}

export async function detect(text: string): Promise<DetectResult> {
  const body = await post<Partial<DetectResult>>('/detect', { text });
  if (typeof body?.overallScore !== 'number' || !Array.isArray(body.sentences)) {
    throw new ApiError('Unexpected response from server');
  }
  return body as DetectResult;
}

export async function alternatives(sentence: string, count = 3): Promise<string[]> {
  const body = await post<{ alternatives?: unknown }>('/alternatives', { sentence, count });
  if (!Array.isArray(body?.alternatives) || !body.alternatives.every(a => typeof a === 'string')) {
    throw new ApiError('Unexpected response from server');
  }
  return body.alternatives;
}
