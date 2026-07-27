import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

export function hasServiceRoleKey(): boolean {
  return !!SERVICE_ROLE_KEY;
}

/** Full-access client. Server-only — SUPABASE_SERVICE_ROLE_KEY must never be prefixed
 * with NEXT_PUBLIC_ or it would get bundled into client-side JS. */
export function getSupabaseAdmin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Verifies the bearer token belongs to a logged-in user with role='admin'. Returns the
 * user id if so, otherwise null. */
export async function requireAdminUserId(authHeader?: string): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: userData } = await anon.auth.getUser(token);
  if (!userData.user) return null;

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return profile?.role === "admin" ? userData.user.id : null;
}

/** Verifies the bearer token belongs to any logged-in user. Returns the user id if so. */
export async function requireUserId(authHeader?: string): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data } = await anon.auth.getUser(token);
  return data.user?.id ?? null;
}

export function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
