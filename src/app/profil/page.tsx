"use client";

import { useEffect, useState, FormEvent } from "react";
import { User, Mail, Phone, Camera, Loader2, Check } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useRequireAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase/client";
import { avatarUrl } from "@/lib/utils";

const navByRole: Record<string, { label: string; href: string }[]> = {
  patient: [
    { label: "Beranda", href: "/dashboard" },
    { label: "Riwayat Sesi", href: "/dashboard/riwayat" },
    { label: "Langganan Saya", href: "/dashboard/langganan" },
    { label: "Profil", href: "/profil" },
  ],
  psychologist: [
    { label: "Beranda", href: "/psikolog" },
    { label: "Profil", href: "/profil" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin" },
    { label: "Profil", href: "/profil" },
  ],
};

export default function ProfilPage() {
  const { profile, loading } = useRequireAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone_number ?? "");
    }
  }, [profile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from("profiles")
      .update({ full_name: name, phone_number: phone })
      .eq("id", profile.id);
    setSaving(false);
    setSaved(true);
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-teal-600" size={28} />
      </div>
    );
  }

  const navItems = navByRole[profile.role];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader navItems={navItems} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-heading text-xl font-bold text-slate-900">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola informasi akun Pulih-mu.</p>

        <form onSubmit={handleSave} className="mt-6 rounded-2xl border border-slate-100 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={avatarUrl(profile.full_name || "Pengguna Pulih")}
                alt="avatar"
                className="h-20 w-20 rounded-full"
              />
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white shadow"
                aria-label="Ganti foto"
                title="Unggah foto segera hadir"
              >
                <Camera size={13} />
              </button>
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-slate-900">
                {profile.full_name}
              </p>
              <span className="mt-1 inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                {profile.role === "psychologist"
                  ? "Psikolog"
                  : profile.role === "admin"
                    ? "Admin"
                    : "Pasien"}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama Lengkap</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                <User size={16} className="text-slate-400" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <Mail size={16} className="text-slate-400" />
                <input
                  defaultValue={profile.email ?? ""}
                  disabled
                  className="w-full bg-transparent text-sm text-slate-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Nomor Telepon</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                <Phone size={16} className="text-slate-400" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xx-xxxx-xxxx"
                  className="w-full text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saved && !saving && <Check size={15} />}
            Simpan Perubahan
          </button>
        </form>
      </main>
    </div>
  );
}
