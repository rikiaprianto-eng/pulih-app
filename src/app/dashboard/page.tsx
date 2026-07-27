"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, History, Wallet2, Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PsychologistCard from "@/components/PsychologistCard";
import { useRequireAuth } from "@/lib/useAuth";
import { fetchPsychologists, fetchActiveSubscription, SubscriptionView } from "@/lib/queries";
import type { Psychologist } from "@/lib/data";

const navItems = [
  { label: "Beranda", href: "/dashboard" },
  { label: "Riwayat Sesi", href: "/dashboard/riwayat" },
  { label: "Langganan Saya", href: "/dashboard/langganan" },
  { label: "Profil", href: "/profil" },
];

const specialtyFilters = ["Semua", "Kecemasan", "Karir", "Keluarga", "Remaja", "Depresi"];

export default function DashboardPage() {
  const { profile, loading: authLoading } = useRequireAuth(["patient"]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [filter, setFilter] = useState("Semua");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!profile) return;
    Promise.all([fetchPsychologists(), fetchActiveSubscription(profile.id)]).then(
      ([psy, sub]) => {
        setPsychologists(psy);
        setSubscription(sub);
        setDataLoading(false);
      }
    );
  }, [profile]);

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-teal-600" size={28} />
      </div>
    );
  }

  const filtered = psychologists.filter((p) => {
    const matchSpecialty = filter === "Semua" || p.specialties.includes(filter);
    const matchQuery = p.name.toLowerCase().includes(query.toLowerCase());
    return matchSpecialty && matchQuery;
  });

  const remainingQuota = subscription ? subscription.totalQuota - subscription.usedQuota : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader navItems={navItems} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-sky-700 to-teal-600 p-6 text-white sm:p-8">
          <h1 className="font-heading text-xl font-bold sm:text-2xl">
            Halo, {profile.full_name?.split(" ")[0] ?? "Sahabat Pulih"}. Bagaimana perasaanmu hari
            ini?
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-white/90">
            {subscription ? (
              <>
                Sisa kuota sesimu: <strong>{remainingQuota} sesi</strong> — berlaku sampai{" "}
                {subscription.expiresAt}.
              </>
            ) : (
              "Kamu belum punya paket aktif. Yuk pilih paket konseling untuk mulai sesi."
            )}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/langganan"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900"
            >
              <Wallet2 size={14} /> Kelola Langganan
            </Link>
            <Link
              href="/dashboard/riwayat"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur"
            >
              <History size={14} /> Riwayat Sesi
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-slate-900">Psikolog Aktif</h2>
            <p className="text-sm text-slate-500">Pilih psikolog dan mulai sesi konseling sekarang.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
            <Search size={15} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama psikolog..."
              className="w-44 text-sm outline-none sm:w-56"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {specialtyFilters.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                filter === s
                  ? "bg-teal-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="mt-10 flex justify-center py-10">
            <Loader2 className="animate-spin text-teal-600" size={24} />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((psy) => (
              <PsychologistCard key={psy.id} psy={psy} />
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-slate-400">
                Tidak ada psikolog yang cocok dengan pencarianmu.
              </p>
            )}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between rounded-2xl border border-dashed border-teal-200 bg-teal-50/60 p-5">
          <div>
            <p className="font-heading text-sm font-semibold text-slate-900">
              Belum menemukan psikolog yang cocok?
            </p>
            <p className="text-xs text-slate-500">Lihat seluruh paket dan harga konseling kami.</p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            Lihat Harga <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
}
