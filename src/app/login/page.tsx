"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2 } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { signInWithEmail, signInWithGoogle, fetchProfile, roleHome } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attemptLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await signInWithEmail(email.trim(), password);
      const profile = user ? await fetchProfile(user.id) : null;
      router.push(profile ? roleHome(profile.role) : "/dashboard");
    } catch {
      setError(
        "Email atau kata sandi salah, atau akun ini belum terdaftar. Coba lagi atau buat akun baru."
      );
    } finally {
      setLoading(false);
    }
  }

  async function attemptGoogleLogin() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError(
        "Login Google belum aktif untuk aplikasi ini. Gunakan email & kata sandi, atau hubungi admin."
      );
    }
  }

  return (
    <AuthShell title="Selamat datang kembali" subtitle="Masuk untuk melanjutkan sesi konselingmu.">
      <button
        type="button"
        onClick={attemptGoogleLogin}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <GoogleIcon />
        Lanjutkan dengan Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        atau masuk dengan email
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={attemptLogin} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500">
            <Mail size={16} className="text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Kata Sandi</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500">
            <Lock size={16} className="text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-70"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Masuk
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link href="/signup" className="font-semibold text-teal-600 hover:text-teal-700">
          Daftar di sini
        </Link>
      </p>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.1-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5c-2 1.5-4.6 2.6-7.6 2.6-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 39.8 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C40.9 36.6 44 30.9 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
