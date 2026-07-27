"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useRequireAuth } from "@/lib/useAuth";
import { fetchActiveSubscription, fetchTransactions, SubscriptionView, TransactionView } from "@/lib/queries";
import { formatIDR } from "@/lib/utils";

const navItems = [
  { label: "Beranda", href: "/dashboard" },
  { label: "Riwayat Sesi", href: "/dashboard/riwayat" },
  { label: "Langganan Saya", href: "/dashboard/langganan" },
  { label: "Profil", href: "/profil" },
];

export default function LanggananPage() {
  const { profile, loading: authLoading } = useRequireAuth(["patient"]);
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [transactions, setTransactions] = useState<TransactionView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([fetchActiveSubscription(profile.id), fetchTransactions(profile.id)]).then(
      ([sub, tx]) => {
        setSubscription(sub);
        setTransactions(tx);
        setLoading(false);
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

  const remaining = subscription ? subscription.totalQuota - subscription.usedQuota : 0;
  const pct = subscription ? Math.round((subscription.usedQuota / subscription.totalQuota) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader navItems={navItems} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-heading text-xl font-bold text-slate-900">Langganan Saya</h1>
        <p className="mt-1 text-sm text-slate-500">Kelola paket konseling dan lihat riwayat pembayaranmu.</p>

        {loading ? (
          <div className="mt-8 flex justify-center py-10">
            <Loader2 className="animate-spin text-teal-600" size={24} />
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6">
              {subscription ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                        Paket Aktif
                      </span>
                      <h2 className="mt-2 font-heading text-lg font-semibold text-slate-900">
                        {subscription.packageName}
                      </h2>
                      <p className="text-sm text-slate-500">Berlaku sampai {subscription.expiresAt}</p>
                    </div>
                    <Link
                      href="/pricing"
                      className="rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      Perpanjang / Ganti Paket
                    </Link>
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Kuota terpakai</span>
                      <span>
                        {subscription.usedQuota} / {subscription.totalQuota} sesi
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-600 to-teal-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">Sisa {remaining} sesi tersedia</p>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-slate-500">Kamu belum punya paket aktif.</p>
                  <Link
                    href="/pricing"
                    className="mt-4 inline-block rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white"
                  >
                    Lihat Paket
                  </Link>
                </div>
              )}
            </div>

            <h3 className="mt-8 font-heading text-base font-semibold text-slate-900">Riwayat Pembayaran</h3>
            {transactions.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                Belum ada riwayat pembayaran.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Tanggal</th>
                      <th className="px-5 py-3 font-medium">Item</th>
                      <th className="px-5 py-3 font-medium">Metode</th>
                      <th className="px-5 py-3 font-medium">Jumlah</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 text-slate-500">{t.date}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">{t.item}</td>
                        <td className="px-5 py-3.5 text-slate-500">{t.method}</td>
                        <td className="px-5 py-3.5 text-slate-800">{formatIDR(t.amount)}</td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
