"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HeartPulse,
  Stethoscope,
  Mail,
  Lock,
  User,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  MailCheck,
} from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { Role, signUpWithEmail, signInWithGoogle, setPendingRole, roleHome } from "@/lib/auth";

const roleOptions: {
  role: Role;
  title: string;
  description: string;
  icon: typeof HeartPulse;
}[] = [
  {
    role: "patient",
    title: "Saya Butuh Konseling",
    description: "Terhubung dengan psikolog untuk sesi konseling pribadi.",
    icon: HeartPulse,
  },
  {
    role: "psychologist",
    title: "Saya Psikolog",
    description: "Bergabung sebagai mitra psikolog dan bantu lebih banyak orang.",
    icon: Stethoscope,
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleGoogleSignup() {
    if (!role) return;
    setError(null);
    setPendingRole(role);
    try {
      await signInWithGoogle();
    } catch {
      setError("Login Google belum aktif untuk aplikasi ini. Silakan daftar dengan email.");
    }
  }

  async function handleEmailSignup(e: FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError(null);
    setLoading(true);
    try {
      const { user, session } = await signUpWithEmail(email.trim(), password, name.trim(), role);
      if (session && user) {
        router.push(roleHome(role));
      } else {
        setNeedsConfirmation(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat akun. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  if (needsConfirmation) {
    return (
      <AuthShell title="Konfirmasi email kamu" subtitle="Satu langkah terakhir sebelum masuk.">
        <div className="rounded-2xl bg-teal-50 p-5 text-center">
          <MailCheck className="mx-auto text-teal-600" size={28} />
          <p className="mt-3 text-sm text-teal-800">
            Kami sudah mengirim link konfirmasi ke <strong>{email}</strong>. Buka email tersebut
            lalu klik link-nya untuk mengaktifkan akun Pulih-mu.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-5 block w-full rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-3 text-center text-sm font-semibold text-white"
        >
          Ke Halaman Masuk
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={role ? "Lengkapi akun Pulih-mu" : "Buat akun Pulih"}
      subtitle={
        role
          ? "Satu langkah lagi untuk mulai menggunakan Pulih."
          : "Pilih peranmu untuk memulai pengalaman yang sesuai kebutuhanmu."
      }
    >
      {!role ? (
        <div className="space-y-4">
          {roleOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.role}
                type="button"
                onClick={() => setRole(opt.role)}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-slate-100 p-4 text-left transition hover:border-teal-500 hover:bg-teal-50/50"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white">
                  <Icon size={22} />
                </span>
                <span>
                  <span className="block font-heading text-sm font-semibold text-slate-900">
                    {opt.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{opt.description}</span>
                </span>
              </button>
            );
          })}

          <p className="pt-2 text-center text-sm text-slate-500">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700">
              Masuk di sini
            </Link>
          </p>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setRole(null)}
            className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={14} /> Ganti peran
          </button>

          <div className="mb-5 flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-700">
            <CheckCircle2 size={16} />
            Daftar sebagai {role === "patient" ? "Pasien" : "Psikolog"}
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <GoogleIcon />
            Lanjutkan dengan Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            atau daftar dengan email
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nama Lengkap
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500">
                <User size={16} className="text-slate-400" />
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama kamu"
                  className="w-full text-sm outline-none"
                />
              </div>
            </div>
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Kata Sandi
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500">
                <Lock size={16} className="text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
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
              Buat Akun
            </button>
          </form>
        </div>
      )}
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
