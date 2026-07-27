"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useRequireAuth } from "@/lib/useAuth";
import { fetchSessionHistory, SessionHistoryView } from "@/lib/queries";

const navItems = [
  { label: "Beranda", href: "/dashboard" },
  { label: "Riwayat Sesi", href: "/dashboard/riwayat" },
  { label: "Langganan Saya", href: "/dashboard/langganan" },
  { label: "Profil", href: "/profil" },
];

const statusStyle: Record<string, string> = {
  Selesai: "bg-emerald-50 text-emerald-700",
  Dibatalkan: "bg-red-50 text-red-600",
  Terjadwal: "bg-sky-50 text-sky-700",
};

export default function RiwayatPage() {
  const { profile, loading: authLoading } = useRequireAuth(["patient"]);
  const [history, setHistory] = useState<SessionHistoryView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchSessionHistory(profile.id).then((h) => {
      setHistory(h);
      setLoading(false);
    });
  }, [profile]);

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-teal-600" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader navItems={navItems} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-heading text-xl font-bold text-slate-900">Riwayat Sesi</h1>
        <p className="mt-1 text-sm text-slate-500">Daftar seluruh sesi konseling yang pernah kamu jalani.</p>

        {loading ? (
          <div className="mt-8 flex justify-center py-10">
            <Loader2 className="animate-spin text-teal-600" size={24} />
          </div>
        ) : history.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            Belum ada riwayat sesi. Mulai sesi konseling pertamamu dari halaman Beranda.
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Psikolog</th>
                  <th className="px-5 py-3 font-medium">Tanggal</th>
                  <th className="px-5 py-3 font-medium">Durasi</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{s.psychologistName}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.date}</td>
                    <td className="px-5 py-3.5 text-slate-500">{s.durationMinutes} menit</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[s.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
