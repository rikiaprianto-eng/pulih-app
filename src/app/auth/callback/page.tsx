"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
  applyRoleAfterOAuth,
  consumePendingRole,
  consumeRedirectAfterLogin,
  fetchProfile,
  roleHome,
} from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      // Give supabase-js a moment to parse the OAuth redirect and store the session.
      const { data } = await supabase.auth.getSession();
      let session = data.session;

      if (!session) {
        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
          if (s) {
            sub.subscription.unsubscribe();
            proceed(s.user.id);
          }
        });
        setTimeout(() => {
          if (!cancelled && !session) {
            sub.subscription.unsubscribe();
            setError("Sesi login tidak ditemukan. Coba masuk kembali.");
          }
        }, 6000);
        return;
      }

      proceed(session.user.id);
    }

    async function proceed(userId: string) {
      const pendingRole = consumePendingRole();
      if (pendingRole) {
        await applyRoleAfterOAuth(userId, pendingRole);
      }
      const profile = await fetchProfile(userId);
      if (cancelled) return;
      router.replace(consumeRedirectAfterLogin() ?? (profile ? roleHome(profile.role) : "/dashboard"));
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
      {error ? (
        <>
          <p className="text-sm font-medium text-red-600">{error}</p>
          <a href="/login" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
            Kembali ke halaman masuk
          </a>
        </>
      ) : (
        <>
          <Loader2 size={28} className="animate-spin text-teal-600" />
          <p className="text-sm text-slate-500">Menyelesaikan proses masuk...</p>
        </>
      )}
    </div>
  );
}
