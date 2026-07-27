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
  Plus,
  Trash2,
  CalendarDays,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useRequireAuth } from "@/lib/useAuth";
import {
  fetchAdminUsers,
  fetchPendingPayments,
  fetchAdminStats,
  fetchBanners,
  fetchPackages,
  fetchEvents,
  verifyPayment,
  updatePackage,
  createPackage,
  deletePackage,
  updateBanner,
  createEvent,
  deleteEvent,
  updateUserRole,
  createUserAsAdmin,
  AdminUserView,
  PendingPaymentView,
  AdminStats,
} from "@/lib/queries";
import type { Banner, Package, EventItem } from "@/lib/data";
import { formatIDR } from "@/lib/utils";

const MAX_EVENTS = 5;

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

const roleOptions: { value: "patient" | "psychologist" | "admin"; label: string }[] = [
  { value: "patient", label: "Pasien" },
  { value: "psychologist", label: "Psikolog" },
  { value: "admin", label: "Admin" },
];

export default function AdminPage() {
  const { profile, loading: authLoading } = useRequireAuth(["admin"]);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [payments, setPayments] = useState<PendingPaymentView[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [addingPackage, setAddingPackage] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

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
      fetchEvents(),
    ]).then(([u, p, s, b, pkgs, ev]) => {
      setUsers(u);
      setPayments(p);
      setStats(s);
      setBanners(b);
      setPackages(pkgs);
      setEvents(ev);
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

  async function handleCreatePackage(pkg: Omit<Package, "id">) {
    await createPackage(pkg);
    setAddingPackage(false);
    reload();
  }

  async function handleDeletePackage(id: string) {
    if (!confirm("Hapus paket ini?")) return;
    await deletePackage(id);
    setPackages((prev) => prev.filter((p) => p.id !== id));
  }

  async function saveBanner(banner: Banner) {
    await updateBanner(banner.id, banner);
    setBanners((prev) => prev.map((b) => (b.id === banner.id ? banner : b)));
    setEditingBanner(null);
  }

  async function handleCreateEvent(fields: {
    title: string;
    type: "Webinar" | "Support Group";
    speaker: string;
    eventDate: string;
    quota: number;
  }) {
    await createEvent(fields);
    setAddingEvent(false);
    reload();
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm("Hapus event ini?")) return;
    await deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleRoleChange(userId: string, role: "patient" | "psychologist" | "admin") {
    setUpdatingRoleId(userId);
    await updateUserRole(userId, role);
    await reload();
    setUpdatingRoleId(null);
  }

  async function handleCreateUser(fields: {
    name: string;
    email: string;
    password: string;
    role: "patient" | "psychologist" | "admin";
  }) {
    await createUserAsAdmin(fields.email, fields.password, fields.name, fields.role);
    setAddingUser(false);
    reload();
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h1 className="font-heading text-xl font-bold text-slate-900">Manajemen User</h1>
                      <p className="mt-1 text-sm text-slate-500">Kelola akun pasien, psikolog, dan admin.</p>
                    </div>
                    <button
                      onClick={() => setAddingUser(true)}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Plus size={14} /> Tambah User
                    </button>
                  </div>

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
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <select
                                  value={u.rawRole}
                                  disabled={updatingRoleId === u.id || u.id === profile.id}
                                  onChange={(e) =>
                                    handleRoleChange(
                                      u.id,
                                      e.target.value as "patient" | "psychologist" | "admin"
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-500 disabled:opacity-50"
                                >
                                  {roleOptions.map((r) => (
                                    <option key={r.value} value={r.value}>
                                      {r.label}
                                    </option>
                                  ))}
                                </select>
                                {updatingRoleId === u.id && (
                                  <Loader2 size={13} className="animate-spin text-slate-400" />
                                )}
                              </div>
                            </td>
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
                  <p className="mt-1 text-sm text-slate-500">Kelola banner Hero Section dan event pada halaman utama.</p>

                  <h2 className="mt-6 font-heading text-sm font-semibold text-slate-900">Banner</h2>
                  <div className="mt-3 space-y-3">
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
                        Belum ada banner.
                      </p>
                    )}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-sm font-semibold text-slate-900">
                        Event ({events.length}/{MAX_EVENTS})
                      </h2>
                      <p className="text-xs text-slate-500">Maksimal {MAX_EVENTS} event aktif ditampilkan.</p>
                    </div>
                    <button
                      onClick={() => setAddingEvent(true)}
                      disabled={events.length >= MAX_EVENTS}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus size={14} /> Tambah Event
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {events.map((e) => (
                      <div
                        key={e.id}
                        className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                          <CalendarDays size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{e.title}</p>
                          <p className="truncate text-xs text-slate-500">
                            {e.type} &middot; {e.speaker} &middot; {e.date}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(e.id)}
                          className="flex items-center gap-1 rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>
                    ))}
                    {events.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                        Belum ada event.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {tab === "pricing" && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h1 className="font-heading text-xl font-bold text-slate-900">Manajemen Harga</h1>
                      <p className="mt-1 text-sm text-slate-500">Atur tarif paket langganan konseling.</p>
                    </div>
                    <button
                      onClick={() => setAddingPackage(true)}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Plus size={14} /> Tambah Paket
                    </button>
                  </div>

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
                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingPackage(p)}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  <Pencil size={13} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePackage(p.id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={13} /> Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {packages.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                              Belum ada paket.
                            </td>
                          </tr>
                        )}
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
      {addingUser && (
        <AddUserModal onCancel={() => setAddingUser(false)} onSave={handleCreateUser} />
      )}
      {addingPackage && (
        <AddPackageModal onCancel={() => setAddingPackage(false)} onSave={handleCreatePackage} />
      )}
      {addingEvent && (
        <AddEventModal onCancel={() => setAddingEvent(false)} onSave={handleCreateEvent} />
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

function ModalShell({
  title,
  children,
  onCancel,
  onSubmit,
  saving,
  submitLabel = "Simpan",
}: {
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  saving: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="font-heading text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-4 space-y-3">{children}</div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {submitLabel}
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
    <ModalShell
      title="Edit Paket"
      onCancel={onCancel}
      saving={saving}
      onSubmit={async () => {
        setSaving(true);
        await onSave(form);
        setSaving(false);
      }}
    >
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
    </ModalShell>
  );
}

function AddPackageModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (pkg: Omit<Package, "id">) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    durationMinutes: 60,
    sessionQuota: 1,
    price: 0,
  });
  const [saving, setSaving] = useState(false);

  return (
    <ModalShell
      title="Tambah Paket"
      submitLabel="Tambahkan"
      onCancel={onCancel}
      saving={saving}
      onSubmit={async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        await onSave(form);
        setSaving(false);
      }}
    >
      <Field label="Nama Paket" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Field
        label="Deskripsi"
        value={form.description}
        onChange={(v) => setForm({ ...form, description: v })}
      />
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
    </ModalShell>
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
    <ModalShell
      title="Edit Banner"
      onCancel={onCancel}
      saving={saving}
      onSubmit={async () => {
        setSaving(true);
        await onSave(form);
        setSaving(false);
      }}
    >
      <Field label="Judul" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      <Field
        label="Subjudul"
        value={form.subtitle}
        onChange={(v) => setForm({ ...form, subtitle: v })}
      />
      <Field label="Tautan" value={form.href} onChange={(v) => setForm({ ...form, href: v })} />
      <Field
        label="URL Gambar"
        value={form.image}
        onChange={(v) => setForm({ ...form, image: v })}
      />
      {form.image && (
        <img src={form.image} alt="" className="h-20 w-full rounded-lg object-cover" />
      )}
    </ModalShell>
  );
}

function AddEventModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (fields: {
    title: string;
    type: "Webinar" | "Support Group";
    speaker: string;
    eventDate: string;
    quota: number;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: "",
    type: "Webinar" as "Webinar" | "Support Group",
    speaker: "",
    eventDate: "",
    quota: 30,
  });
  const [saving, setSaving] = useState(false);

  return (
    <ModalShell
      title="Tambah Event"
      submitLabel="Tambahkan"
      onCancel={onCancel}
      saving={saving}
      onSubmit={async () => {
        if (!form.title.trim() || !form.eventDate) return;
        setSaving(true);
        await onSave({ ...form, eventDate: new Date(form.eventDate).toISOString() });
        setSaving(false);
      }}
    >
      <Field label="Judul Event" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Tipe</label>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as "Webinar" | "Support Group" })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        >
          <option value="Webinar">Webinar</option>
          <option value="Support Group">Support Group</option>
        </select>
      </div>
      <Field label="Pembicara" value={form.speaker} onChange={(v) => setForm({ ...form, speaker: v })} />
      <Field
        label="Tanggal & Waktu"
        type="datetime-local"
        value={form.eventDate}
        onChange={(v) => setForm({ ...form, eventDate: v })}
      />
      <Field
        label="Kuota"
        type="number"
        value={String(form.quota)}
        onChange={(v) => setForm({ ...form, quota: Number(v) || 0 })}
      />
    </ModalShell>
  );
}

function AddUserModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (fields: {
    name: string;
    email: string;
    password: string;
    role: "patient" | "psychologist" | "admin";
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient" as "patient" | "psychologist" | "admin",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ModalShell
      title="Tambah User"
      submitLabel="Buat Akun"
      onCancel={onCancel}
      saving={saving}
      onSubmit={async () => {
        if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
          setError("Lengkapi nama, email, dan kata sandi minimal 6 karakter.");
          return;
        }
        setError(null);
        setSaving(true);
        try {
          await onSave(form);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Gagal membuat akun.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <Field label="Nama Lengkap" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <Field
        label="Email"
        type="email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
      />
      <Field
        label="Kata Sandi"
        type="password"
        value={form.password}
        onChange={(v) => setForm({ ...form, password: v })}
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
        <select
          value={form.role}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value as "patient" | "psychologist" | "admin" })
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        >
          {roleOptions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[11px] text-slate-400">
        Akun mungkin perlu konfirmasi email sebelum bisa login, tergantung pengaturan project Supabase.
      </p>
    </ModalShell>
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
