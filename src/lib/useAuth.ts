"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase/client";
import { fetchProfile, roleHome } from "./auth";
import type { Profile, Role } from "./supabase/types";

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load(userId: string | undefined) {
      if (!userId) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const p = await fetchProfile(userId);
      if (active) {
        setProfile(p);
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}

/** Redirects to /login if signed out, or to the correct role home if visiting the wrong section. */
export function useRequireAuth(allowedRoles?: Role[]) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/login");
      return;
    }
    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      router.replace(roleHome(profile.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  return { profile, loading };
}
