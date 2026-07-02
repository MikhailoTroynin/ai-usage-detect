// Lightweight Supabase Auth client (PLAN.md item 13).
//
// Email one-time-code (OTP) sign-in via the Supabase Auth REST API, using plain
// fetch so we add no native dependency. The anon key is a PUBLIC value (it is
// meant to ship in the client bundle) and only ever reaches our own Supabase
// project; the real secret (ANTHROPIC_API_KEY) stays server-side.
//
// Session is kept in memory for now: on a cold app start the user signs in
// again. Persisting it across restarts is a small follow-up (see PLAN.md).

import { useEffect, useState } from 'react';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export function isAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && ANON_KEY);
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  email?: string;
}

let currentSession: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();

export function getSession(): Session | null {
  return currentSession;
}

export function getAccessToken(): string | null {
  return currentSession?.accessToken ?? null;
}

function setSession(s: Session | null) {
  currentSession = s;
  listeners.forEach(l => l(s));
}

export function signOut() {
  setSession(null);
}

/** Subscribe to auth changes. Returns an unsubscribe fn. */
export function onAuthChange(l: (s: Session | null) => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** React hook: current session (re-renders on sign in / out). */
export function useSession(): Session | null {
  const [s, set] = useState<Session | null>(currentSession);
  useEffect(() => onAuthChange(set), []);
  return s;
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
  };
}

async function readError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j.error_description || j.msg || j.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

function sessionFromTokenResponse(data: Record<string, unknown>, fallbackEmail?: string): Session {
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  const user = data.user as { email?: string } | undefined;
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token),
    expiresAt: Date.now() + expiresIn * 1000,
    email: user?.email ?? fallbackEmail,
  };
}

/** Step 1: email the user a 6-digit sign-in code. Creates the user if new. */
export async function sendCode(email: string): Promise<void> {
  if (!isAuthConfigured()) throw new Error('Sign-in is not configured yet.');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email: email.trim(), create_user: true }),
  });
  if (!res.ok) throw new Error(await readError(res));
}

/** Step 2: exchange the emailed code for a session. */
export async function verifyCode(email: string, code: string): Promise<void> {
  if (!isAuthConfigured()) throw new Error('Sign-in is not configured yet.');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email: email.trim(), token: code.trim(), type: 'email' }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = await res.json();
  setSession(sessionFromTokenResponse(data, email.trim()));
}

/**
 * Refresh the access token using the stored refresh token. Returns true on
 * success. On failure the session is cleared (forces re-login). Used by the API
 * layer when a call comes back 401.
 */
export async function refreshSession(): Promise<boolean> {
  const rt = currentSession?.refreshToken;
  if (!rt) return false;
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token: rt }),
    });
  } catch {
    return false;
  }
  if (!res.ok) {
    setSession(null);
    return false;
  }
  const data = await res.json();
  setSession(sessionFromTokenResponse(data, currentSession?.email));
  return true;
}
