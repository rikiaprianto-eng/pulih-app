"use client";

import { supabase } from "./supabase/client";
import type { Profile, Role } from "./supabase/types";

export type { Role, Profile };

const PENDING_ROLE_KEY = "pulih_pending_role";
const REDIRECT_AFTER_LOGIN_KEY = "pulih_redirect_after_login";

export function setPendingRole(role: Role) {
  window.localStorage.setItem(PENDING_ROLE_KEY, role);
}

export function consumePendingRole(): Role | null {
  const role = window.localStorage.getItem(PENDING_ROLE_KEY) as Role | null;
  window.localStorage.removeItem(PENDING_ROLE_KEY);
  return role;
}

/** Remembers where to send the user after they finish logging in/signing up — used so
 * actions like "pay for a package" don't strand the user on /dashboard afterward. */
export function setRedirectAfterLogin(path: string) {
  window.sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, path);
}

export function consumeRedirectAfterLogin(): string | null {
  const path = window.sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
  window.sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
  return path;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  role: Role
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback/` },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) return null;
  return data;
}

export async function applyRoleAfterOAuth(userId: string, role: Role) {
  await supabase.from("profiles").update({ role }).eq("id", userId);
  if (role === "psychologist") {
    await supabase.from("psychologist_profiles").upsert({ id: userId });
  }
}

export function roleHome(role: Role): string {
  if (role === "psychologist") return "/psikolog";
  if (role === "admin") return "/admin";
  return "/dashboard";
}
