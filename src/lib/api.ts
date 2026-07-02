import { Risk } from '../data/content';

// Base URL for the Supabase Edge Functions backend (see README.md → "Backend proxy").
// Defaults to the local `supabase functions serve` address for dev; override via
// EXPO_PUBLIC_API_URL for staging/prod builds. No secrets live here — the client
// only ever talks to our own proxy, never directly to Anthropic.
const DEFAULT_API_URL = 'http://127.0.0.1:54321/functions/v1';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export class ApiError extends Error {}

async function post<T>(path: string, payload: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await res.json();
  } catch {
    // fall through to status-based error below
  }

  if (!res.ok) {
    const message = typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`;
    throw new ApiError(message);
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
