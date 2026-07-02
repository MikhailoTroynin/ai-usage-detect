// Shared auth guard for the Edge Functions (PLAN.md item 13).
//
// Requires a real, logged-in Supabase user before running the (expensive)
// endpoints. We validate the caller's access token against Supabase Auth
// rather than trusting the gateway's verify_jwt alone: verify_jwt would also
// accept the public anon key (which ships in the client bundle), so it does
// not, by itself, distinguish an anonymous request from a signed-in user.
// Here we call GET /auth/v1/user and reject anything that is not an
// authenticated user — so the anon key alone is not enough.
//
// SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically into deployed
// Edge Functions by Supabase, so no extra secret is needed for this.

import { jsonResponse } from "./cors.ts";

export class AuthError extends Error {}

export interface AuthUser {
  id: string;
  email?: string;
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    // Misconfiguration, not the caller's fault — surface as 500 upstream.
    throw new AuthError("__config__");
  }

  const authz = req.headers.get("Authorization") ?? "";
  const token = authz.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new AuthError("Sign in required");
  }

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
  } catch {
    throw new AuthError("Could not verify session");
  }

  if (!res.ok) {
    throw new AuthError("Invalid or expired session");
  }

  const user = await res.json().catch(() => null);
  // `aud: "authenticated"` and a real id distinguish a signed-in user from the
  // anonymous role that the public anon key carries.
  if (!user?.id || user?.aud !== "authenticated") {
    throw new AuthError("Sign in required");
  }

  return { id: user.id, email: user.email };
}

// Maps an AuthError to an HTTP response: 500 for our own misconfiguration,
// 401 for anything the caller can fix by signing in.
export function authErrorResponse(err: AuthError): Response {
  if (err.message === "__config__") {
    return jsonResponse({ error: "Auth is not configured on the server" }, 500);
  }
  return jsonResponse({ error: err.message }, 401);
}
