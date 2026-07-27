"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Image as ImageIcon,
  Tag,
  Check,
  X as XIcon,
  TrendingUp,
  Wallet2,
  UserCheck,
  Activity,
  Pencil,
  Loader2,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useRequireAuth } from "@/lib/useAuth";
import {
  fetchAdminUsers,
  fetchPendingPayments,
  fetchAdminStats,
  fetchBanners,
  fetchPackages,
  verifyPayment,
  updatePackage,
  updateBanner,
  AdminUserView,
  PendingPaymentView,
  AdminStats,
} from "@/lib/queries";
import type { Banner, Package } from "@/lib/data";
import { formatIDR } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Profil", href: "/profil" },
];

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Manajemen User", icon: Users },
  { id: "payments", label: "Manajemen Pembayaran", icon: CreditCard },
  { id: "content", label: "Manajemen Konten", icon: ImageIcon },
  { id: "pricing", label: "Manajemen Harga", icon: Tag },
] as const;

type TabId = (typeof tabs)[number]["id"];

const userStatusStyle: Record<string, string> = {
  Aktif: "bg-emerald-50 text-emerald-700",
  Tertunda: "bg-amber-50 text-amber-700",
  Ditangguhkan: "bg-red-50 text-red-600",
};

export default function AdminPage() {
  const { profile, loading: authLoading } = useRequireAuth(["admin"]);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [payments, setPayments] = useState<PendingPaymentView[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => {
    if (!profile) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function reload() {
    setLoading(true);
    Promise.all([
      fetchAdminUsers(),
      fetchPendingPayments(),
      fetchAdminStats(),
      fetchBanners(),
      fetchPackages(),
    ]).then(([u, p, s, b, pkgs]) => {
      setUsers(u);
      setPayments(p);
      setStats(s);
      setBanners(b);
      setPackages(pkgs);
      setLoading(false);
    });
  }

  async function handleVerify(id: string, approve: boolean) {
    await verifyPayment(id, approve);
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  async function savePackage(pkg: Package) {
    await updatePackage(pkg.id, pkg);
    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? pkg : p)));
    setEditingPackage(null);
  }

  async function saveBanner(banner: Banner) {
    await updateBanner(banner.id, banner);
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? banner : b)));
    setEditingBanner(null);
  }

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

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="space-y-1 rounded-2xl border border-slate-100 bg-white p-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    tab === t.id ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} /> {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar md:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                tab === t.id ? "bg-teal-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <main className="min-w-0 flex-1">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-teal-600" size={28} />
            </div>
          ) : (
            <>
              {tab === "overview" && stats && (
                <div>
                  <h1 className="font-heading text-xl font-bold text-slate-900">Dashboard Admin</h1>
                  <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard icon={<UserCheck size={18} />} label="Total Pengguna" value={stats.totalUsers.toLocaleString("id-ID")} />
                    <StatCard icon={<Users size={18} />} label="Total Psikolog" value={stats.totalPsychologists.toString()} />
                    <StatCard icon={<TrendingUp size={18} />} label="Pendapatan Bulan Ini" value={formatIDR(stats.monthlyRevenue)} />
                    <StatCard icon={<Activity size={18} />} label="Sesi Hari Ini" value={stats.activeSessionsToday.toString()} />
                  </div>

                  {payments.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      {payments.length} pembayaran menunggu verifikasi. Lihat tab{" "}
                      <button onClick={() => setTab("payments")} className="font-semibold underline">
                        Manajemen Pembayaran
                      </button>
                      .
                    </div>
                  )}
                </div>
              )}

              {tab === "users" && (
                <div>
                  <h1 className="font-heading text-xl font-bold text-slate-900">Manajemen User</h1>
                  <p className="mt-1 text-sm text-slate-500">Kelola akun pasien dan mitra psikolog.</p>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Nama</th>
                          <th className="px-5 py-3 font-medium">Role</th>
                          <th className="px-5 py-3 font-medium">Bergabung</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/60">
                            <td className="px-5 py-3.5">
                              <p className="font-medium text-slate-800">{u.name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500">{u.role}</td>
                            <td className="px-5 py-3.5 text-slate-500">{u.joined}</td>
                            <td className="px-5 py-3.5">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${userStatusStyle[u.status]}`}>
                                {u.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                              Belum ada pengguna.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === "payments" && (
                <div>
                  <h1 className="font-heading text-xl font-bold text-slate-900">Manajemen Pembayaran</h1>
                  <p className="mt-1 text-sm text-slate-500">Verifikasi transaksi masuk dan laporan keuangan.</p>

                  <div className="mt-5 space-y-3">
                    {payments.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                        Tidak ada pembayaran yang menunggu verifikasi.
                      </p>
                    )}
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.user}</p>
                          <p className="text-xs text-slate-500">
                            {p.item} &middot; {p.method} &middot; {p.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-heading text-sm font-bold text-slate-900">
                            {formatIDR(p.amount)}
                          </span>
                          <button
                            onClick={() => handleVerify(p.id, true)}
                            className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            <Check size={13} /> Verifikasi
                          </button>
                          <button
                            onClick={() => handleVerify(p.id, false)}
                            className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
                          >
                            <XIcon size={13} /> Tolak
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "content" && (
                <div>
                  <h1 className="font-heading text-xl font-bold text-slate-900">Manajemen Konten</h1>
                  <p className="mt-1 text-sm text-slate-500">Kelola banner Hero Section pada halaman utama.</p>

                  <div className="mt-5 space-y-3">
                    {banners.map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4"
                      >
                        <img src={b.image} alt={b.title} className="h-16 w-28 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{b.title}</p>
                          <p className="truncate text-xs text-slate-500">{b.href}</p>
                        </div>
                        <button
                          onClick={() => setEditingBanner(b)}
                          className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      </div>
                    ))}
                    {banners.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                        Belum ada banner. Tambahkan lewat Supabase Table Editor &rarr; banners.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {tab === "pricing" && (
                <div>
                  <h1 className="font-heading text-xl font-bold text-slate-900">Manajemen Harga</h1>
                  <p className="mt-1 text-sm text-slate-500">Atur tarif paket langganan konseling.</p>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Paket</th>
                          <th className="px-5 py-3 font-medium">Durasi</th>
                          <th className="px-5 py-3 font-medium">Kuota</th>
                          <th className="px-5 py-3 font-medium">Harga</th>
                          <th className="px-5 py-3 font-medium" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {packages.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/60">
                            <td className="px-5 py-3.5 font-medium text-slate-800">{p.name}</td>
                            <td className="px-5 py-3.5 text-slate-500">{p.durationMinutes} menit</td>
                            <td className="px-5 py-3.5 text-slate-500">{p.sessionQuota}x sesi</td>
                            <td className="px-5 py-3.5 font-semibold text-slate-800">
                              {formatIDR(p.price)}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => setEditingPackage(p)}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                <Pencil size={13} /> Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {editingPackage && (
        <EditPackageModal
          pkg={editingPackage}
          onCancel={() => setEditingPackage(null)}
          onSave={savePackage}
        />
      )}
      {editingBanner && (
        <EditBannerModal
          banner={editingBanner}
          onCancel={() => setEditingBanner(null)}
          onSave={saveBanner}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        {icon}
      </div>
      <p className="mt-3 truncate font-heading text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function EditPackageModal({
  pkg,
  onCancel,
  onSave,
}: {
  pkg: Package;
  onCancel: () => void;
  onSave: (pkg: Package) => void;
}) {
  const [form, setForm] = useState(pkg);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="font-heading text-lg font-semibold text-slate-900">Edit Paket</h3>
        <div className="mt-4 space-y-3">
          <Field label="Nama Paket" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field
            label="Harga (Rp)"
            type="number"
            value={String(form.price)}
            onChange={(v) => setForm({ ...form, price: Number(v) || 0 })}
          />
          <Field
            label="Durasi (menit)"
            type="number"
            value={String(form.durationMinutes)}
            onChange={(v) => setForm({ ...form, durationMinutes: Number(v) || 0 })}
          />
          <Field
            label="Kuota Sesi"
            type="number"
            value={String(form.sessionQuota)}
            onChange={(v) => setForm({ ...form, sessionQuota: Number(v) || 1 })}
          />
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={async () => {
              setSaving(true);
              await onSave(form);
              setSaving(false);
            }}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Simpan
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

function EditBannerModal({
  banner,
  onCancel,
  onSave,
}: {
  banner: Banner;
  onCancel: () => void;
  onSave: (banner: Banner) => void;
}) {
  const [form, setForm] = useState(banner);
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="font-heading text-lg font-semibold text-slate-900">Edit Banner</h3>
        <div className="mt-4 space-y-3">
          <Field label="Judul" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field
            label="Subjudul"
            value={form.subtitle}
            onChange={(v) => setForm({ ...form, subtitle: v })}
          />
          <Field label="Tautan" value={form.href} onChange={(v) => setForm({ ...form, href: v })} />
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={async () => {
              setSaving(true);
              await onSave(form);
              setSaving(false);
            }}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Simpan
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
    </div>
  );
}
