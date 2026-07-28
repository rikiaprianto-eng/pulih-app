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
  Settings,
  Upload,
  ShieldCheck,
  Stethoscope,
  FileText,
  Image as ImageIconOutline,
  ExternalLink,
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
  fetchFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
  fetchSiteSettings,
  updateSiteSettings,
  fetchPaymentSecretStatus,
  saveMidtransServerKey,
  uploadBannerImage,
  verifyPayment,
  updatePackage,
  createPackage,
  deletePackage,
  updateBanner,
  deleteBanner,
  createBanner,
  createEvent,
  deleteEvent,
  updateUserRole,
  createUserAsAdmin,
  setOnlineStatus,
  setPsychologistVerification,
  updatePsychologistCategory,
  fetchVerificationRequirements,
  createRequirement,
  deleteRequirement,
  fetchAllSubmissions,
  fetchSignedCredentialUrl,
  AdminUserView,
  PendingPaymentView,
  AdminStats,
  SiteSettings,
  VerificationRequirement,
  SubmissionAnswer,
} from "@/lib/queries";
import type { Banner, Package, EventItem, Facility } from "@/lib/data";
import { formatIDR } from "@/lib/utils";

const MAX_EVENTS = 5;
const MAX_FACILITIES = 10;

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Profil", href: "/profil" },
];

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Manajemen User", icon: Users },
  { id: "psychologists", label: "Manajemen Psikolog", icon: Stethoscope },
  { id: "payments", label: "Manajemen Pembayaran", icon: CreditCard },
  { id: "content", label: "Manajemen Konten", icon: ImageIcon },
  { id: "pricing", label: "Manajemen Harga", icon: Tag },
  { id: "settings", label: "Setting", icon: Settings },
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
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [addingPackage, setAddingPackage] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [addingBanner, setAddingBanner] = useState(false);
  const [addingFacility, setAddingFacility] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [updatingOnlineId, setUpdatingOnlineId] = useState<string | null>(null);
  const [updatingVerifyId, setUpdatingVerifyId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [requirements, setRequirements] = useState<VerificationRequirement[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionAnswer[]>>({});
  const [addingRequirement, setAddingRequirement] = useState(false);

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
      fetchFacilities(),
      fetchSiteSettings(),
      fetchPaymentSecretStatus(),
      fetchVerificationRequirements(),
      fetchAllSubmissions(),
    ]).then(([u, p, s, b, pkgs, ev, fac, settingsData, secretStatus, reqs, subs]) => {
      setUsers(u);
      setPayments(p);
      setStats(s);
      setBanners(b);
      setPackages(pkgs);
      setEvents(ev);
      setFacilities(fac);
      setSettings(settingsData);
      setSecretConfigured(secretStatus.configured);
      setRequirements(reqs);
      setSubmissions(subs);
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

  async function handleDeleteBanner(id: string) {
    if (!confirm("Hapus banner ini?")) return;
    await deleteBanner(id);
    setBanners((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleCreateBanner(fields: Omit<Banner, "id" | "gradient">) {
    await createBanner(fields);
    setAddingBanner(false);
    reload();
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

  async function handleCreateFacility(fields: { title: string; description: string; image: string }) {
    await createFacility(fields);
    setAddingFacility(false);
    reload();
  }

  async function saveFacility(facility: Facility) {
    await updateFacility(facility.id, facility);
    setFacilities((prev) => prev.map((f) => (f.id === facility.id ? facility : f)));
    setEditingFacility(null);
  }

  async function handleDeleteFacility(id: string) {
    if (!confirm("Hapus frame fasilitas ini?")) return;
    await deleteFacility(id);
    setFacilities((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleRoleChange(
    userId: string,
    role: "patient" | "psychologist" | "admin",
    userName: string
  ) {
    if (!confirm(`Ubah role ${userName} menjadi "${role}"?`)) return;
    setUpdatingRoleId(userId);
    await updateUserRole(userId, role);
    await reload();
    setUpdatingRoleId(null);
  }

  async function handleToggleOnline(userId: string, nextOnline: boolean) {
    setUpdatingOnlineId(userId);
    await setOnlineStatus(userId, nextOnline);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isOnline: nextOnline } : u)));
    setUpdatingOnlineId(null);
  }

  async function handleVerifyPsychologist(userId: string, status: "verified" | "rejected") {
    setUpdatingVerifyId(userId);
    await setPsychologistVerification(userId, status);
    await reload();
    setUpdatingVerifyId(null);
  }

  async function handleChangeCategory(userId: string, category: "teman_curhat" | "profesional") {
    await updatePsychologistCategory(userId, category);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, category } : u)));
  }

  async function handleCreateRequirement(fields: {
    label: string;
    description: string;
    inputType: "text" | "photo";
    isRequired: boolean;
    category: "teman_curhat" | "profesional" | "both";
  }) {
    await createRequirement(fields);
    setAddingRequirement(false);
    reload();
  }

  async function handleDeleteRequirement(id: string) {
    if (!confirm("Hapus syarat ini? Jawaban psikolog untuk syarat ini juga akan hilang.")) return;
    await deleteRequirement(id);
    setRequirements((prev) => prev.filter((r) => r.id !== id));
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

  async function handleSaveSettings(next: SiteSettings) {
    await updateSiteSettings(next);
    setSettings(next);
  }

  async function handleSaveServerKey(key: string) {
    await saveMidtransServerKey(key);
    setSecretConfigured(true);
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

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:gap-6 md:py-8 lg:px-8">
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
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Nama</th>
                          <th className="px-5 py-3 font-medium">Role</th>
                          <th className="px-5 py-3 font-medium">Bergabung</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium">Online</th>
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
                                      e.target.value as "patient" | "psychologist" | "admin",
                                      u.name
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
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${userStatusStyle[u.status]}`}>
                                  {u.status}
                                </span>
                                {u.rawRole === "psychologist" && u.status !== "Aktif" && (
                                  <button
                                    onClick={() => handleVerifyPsychologist(u.id, "verified")}
                                    disabled={updatingVerifyId === u.id}
                                    className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                  >
                                    {updatingVerifyId === u.id ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <Check size={11} />
                                    )}
                                    Verifikasi
                                  </button>
                                )}
                                {u.rawRole === "psychologist" && u.status === "Aktif" && (
                                  <button
                                    onClick={() => handleVerifyPsychologist(u.id, "rejected")}
                                    disabled={updatingVerifyId === u.id}
                                    className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                                  >
                                    <XIcon size={11} /> Tangguhkan
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              {u.rawRole === "psychologist" ? (
                                <button
                                  onClick={() => handleToggleOnline(u.id, !u.isOnline)}
                                  disabled={updatingOnlineId === u.id}
                                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                                    u.isOnline
                                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {updatingOnlineId === u.id ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <span className={`h-1.5 w-1.5 rounded-full ${u.isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                                  )}
                                  {u.isOnline ? "Online" : "Offline"}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                              Belum ada pengguna.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              )}

              {tab === "psychologists" && (
                <PsychologistsTab
                  users={users}
                  requirements={requirements}
                  submissions={submissions}
                  updatingVerifyId={updatingVerifyId}
                  onVerify={handleVerifyPsychologist}
                  onAddRequirement={() => setAddingRequirement(true)}
                  onDeleteRequirement={handleDeleteRequirement}
                  onChangeCategory={handleChangeCategory}
                />
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
                  <p className="mt-1 text-sm text-slate-500">Kelola banner Hero Section, event, dan frame fasilitas pada halaman utama.</p>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-heading text-sm font-semibold text-slate-900">Banner</h2>
                    <button
                      onClick={() => setAddingBanner(true)}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Plus size={14} /> Tambah Banner
                    </button>
                  </div>
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingBanner(b)}
                            className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBanner(b.id)}
                            className="flex items-center gap-1 rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={13} /> Hapus
                          </button>
                        </div>
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

                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-sm font-semibold text-slate-900">
                        Fasilitas ({facilities.length}/{MAX_FACILITIES})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Frame penjelasan fitur (mis. Teman Curhat, Psikolog Profesional) di halaman
                        utama. Maksimal {MAX_FACILITIES} frame.
                      </p>
                    </div>
                    <button
                      onClick={() => setAddingFacility(true)}
                      disabled={facilities.length >= MAX_FACILITIES}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus size={14} /> Tambah Fasilitas
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {facilities.map((f) => (
                      <div
                        key={f.id}
                        className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4"
                      >
                        <img src={f.image} alt={f.title} className="h-16 w-28 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{f.title}</p>
                          <p className="truncate text-xs text-slate-500">{f.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingFacility(f)}
                            className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFacility(f.id)}
                            className="flex items-center gap-1 rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={13} /> Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                    {facilities.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                        Belum ada frame fasilitas.
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
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-sm">
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
                </div>
              )}

              {tab === "settings" && settings && (
                <SettingsTab
                  settings={settings}
                  secretConfigured={secretConfigured}
                  onSaveSettings={handleSaveSettings}
                  onSaveServerKey={handleSaveServerKey}
                />
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
      {addingBanner && (
        <AddBannerModal onCancel={() => setAddingBanner(false)} onSave={handleCreateBanner} />
      )}
      {editingFacility && (
        <EditFacilityModal
          facility={editingFacility}
          onCancel={() => setEditingFacility(null)}
          onSave={saveFacility}
        />
      )}
      {addingFacility && (
        <AddFacilityModal onCancel={() => setAddingFacility(false)} onSave={handleCreateFacility} />
      )}
      {addingRequirement && (
        <AddRequirementModal
          onCancel={() => setAddingRequirement(false)}
          onSave={handleCreateRequirement}
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  }

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

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Gambar Banner</label>
        {form.image && (
          <img src={form.image} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
        )}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-600">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Mengunggah..." : "Unggah gambar dari PC"}
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
        </label>
        {uploadError && <p className="mt-1 text-[11px] text-red-600">{uploadError}</p>}
      </div>
    </ModalShell>
  );
}

function AddBannerModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (banner: Omit<Banner, "id" | "gradient">) => Promise<void>;
}) {
  const [form, setForm] = useState({ title: "", subtitle: "", href: "/", cta: "Selengkapnya", image: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setFormError(null);
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ModalShell
      title="Tambah Banner"
      submitLabel="Tambahkan"
      onCancel={onCancel}
      saving={saving}
      onSubmit={async () => {
        if (!form.title.trim()) {
          setFormError("Judul banner wajib diisi.");
          return;
        }
        if (!form.image) {
          setFormError("Unggah gambar banner terlebih dahulu.");
          return;
        }
        setFormError(null);
        setSaving(true);
        await onSave(form);
        setSaving(false);
      }}
    >
      <Field
        label="Judul"
        value={form.title}
        onChange={(v) => {
          setForm({ ...form, title: v });
          setFormError(null);
        }}
      />
      <Field
        label="Subjudul"
        value={form.subtitle}
        onChange={(v) => setForm({ ...form, subtitle: v })}
      />
      <Field
        label="Label Tombol"
        value={form.cta}
        onChange={(v) => setForm({ ...form, cta: v })}
      />
      <Field label="Tautan" value={form.href} onChange={(v) => setForm({ ...form, href: v })} />

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Gambar Banner</label>
        {form.image && (
          <img src={form.image} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
        )}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-600">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Mengunggah..." : "Unggah gambar dari PC"}
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
        </label>
        {!form.image && (
          <p className="mt-1 text-[11px] text-slate-400">Gambar wajib diunggah sebelum menyimpan.</p>
        )}
        {uploadError && <p className="mt-1 text-[11px] text-red-600">{uploadError}</p>}
      </div>
      {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}
    </ModalShell>
  );
}

function EditFacilityModal({
  facility,
  onCancel,
  onSave,
}: {
  facility: Facility;
  onCancel: () => void;
  onSave: (facility: Facility) => void;
}) {
  const [form, setForm] = useState(facility);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ModalShell
      title="Edit Fasilitas"
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
        label="Deskripsi"
        value={form.description}
        onChange={(v) => setForm({ ...form, description: v })}
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Gambar</label>
        {form.image && (
          <img src={form.image} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
        )}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-600">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Mengunggah..." : "Unggah gambar dari PC"}
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
        </label>
        {uploadError && <p className="mt-1 text-[11px] text-red-600">{uploadError}</p>}
      </div>
    </ModalShell>
  );
}

function AddFacilityModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (fields: { title: string; description: string; image: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ title: "", description: "", image: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setFormError(null);
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ModalShell
      title="Tambah Fasilitas"
      submitLabel="Tambahkan"
      onCancel={onCancel}
      saving={saving}
      onSubmit={async () => {
        if (!form.title.trim()) {
          setFormError("Judul fasilitas wajib diisi.");
          return;
        }
        if (!form.image) {
          setFormError("Unggah gambar terlebih dahulu.");
          return;
        }
        setFormError(null);
        setSaving(true);
        await onSave(form);
        setSaving(false);
      }}
    >
      <Field
        label="Judul"
        value={form.title}
        onChange={(v) => {
          setForm({ ...form, title: v });
          setFormError(null);
        }}
      />
      <Field
        label="Deskripsi"
        value={form.description}
        onChange={(v) => setForm({ ...form, description: v })}
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Gambar</label>
        {form.image && (
          <img src={form.image} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
        )}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-600">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Mengunggah..." : "Unggah gambar dari PC"}
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
        </label>
        {!form.image && (
          <p className="mt-1 text-[11px] text-slate-400">Gambar wajib diunggah sebelum menyimpan.</p>
        )}
        {uploadError && <p className="mt-1 text-[11px] text-red-600">{uploadError}</p>}
      </div>
      {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}
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

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5">
      <h3 className="font-heading text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function SettingsTab({
  settings,
  secretConfigured,
  onSaveSettings,
  onSaveServerKey,
}: {
  settings: SiteSettings;
  secretConfigured: boolean;
  onSaveSettings: (s: SiteSettings) => Promise<void>;
  onSaveServerKey: (key: string) => Promise<void>;
}) {
  const [form, setForm] = useState(settings);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [savedFlag, setSavedFlag] = useState<string | null>(null);
  const [serverKeyInput, setServerKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  function flashSaved(section: string) {
    setSavedFlag(section);
    setTimeout(() => setSavedFlag(null), 2000);
  }

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setUploadingLogo(true);
    try {
      const url = await uploadBannerImage(file);
      const next = { ...form, logoUrl: url };
      setForm(next);
      setSavingLogo(true);
      await onSaveSettings(next);
      setSavingLogo(false);
      flashSaved("logo");
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Gagal mengunggah logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-slate-900">Pengaturan</h1>
      <p className="mt-1 text-sm text-slate-500">
        Kelola informasi umum, rekening tujuan, dan integrasi pembayaran.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SettingsCard title="Logo">
          <div className="flex items-center gap-4">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo" className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-xs font-semibold text-white">
                Pulih
              </span>
            )}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-600">
              {uploadingLogo || savingLogo ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {uploadingLogo ? "Mengunggah..." : savingLogo ? "Menyimpan..." : "Unggah logo dari PC"}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                className="hidden"
                disabled={uploadingLogo || savingLogo}
              />
            </label>
          </div>
          {savedFlag === "logo" && (
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <Check size={13} /> Logo tersimpan &mdash; tampil di seluruh halaman.
            </p>
          )}
          {logoError && <p className="text-xs text-red-600">{logoError}</p>}
          <p className="text-[11px] text-slate-400">
            Kosongkan (jangan unggah apa pun) untuk memakai ikon bawaan Pulih.
          </p>
        </SettingsCard>

        <SettingsCard title="Informasi Umum">
          <Field
            label="Email Kontak"
            value={form.contactEmail}
            onChange={(v) => setForm({ ...form, contactEmail: v })}
          />
          <Field
            label="Telepon Kontak"
            value={form.contactPhone}
            onChange={(v) => setForm({ ...form, contactPhone: v })}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tentang Kami</label>
            <textarea
              value={form.aboutText}
              onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <button
            onClick={async () => {
              setSavingGeneral(true);
              await onSaveSettings(form);
              setSavingGeneral(false);
              flashSaved("general");
            }}
            disabled={savingGeneral}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-70"
          >
            {savingGeneral && <Loader2 size={13} className="animate-spin" />}
            {savedFlag === "general" ? <Check size={13} /> : null}
            Simpan
          </button>
        </SettingsCard>

        <SettingsCard title="Rekening Bank Tujuan">
          <p className="text-xs text-slate-500">
            Ditampilkan ke pasien sebagai instruksi transfer manual (di luar pembayaran otomatis Midtrans).
          </p>
          <Field
            label="Nama Bank"
            value={form.bankName}
            onChange={(v) => setForm({ ...form, bankName: v })}
          />
          <Field
            label="Nomor Rekening"
            value={form.bankAccountNumber}
            onChange={(v) => setForm({ ...form, bankAccountNumber: v })}
          />
          <Field
            label="Nama Pemilik Rekening"
            value={form.bankAccountHolder}
            onChange={(v) => setForm({ ...form, bankAccountHolder: v })}
          />
          <button
            onClick={async () => {
              setSavingBank(true);
              await onSaveSettings(form);
              setSavingBank(false);
              flashSaved("bank");
            }}
            disabled={savingBank}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-70"
          >
            {savingBank && <Loader2 size={13} className="animate-spin" />}
            {savedFlag === "bank" ? <Check size={13} /> : null}
            Simpan
          </button>
        </SettingsCard>

        <SettingsCard title="Payment Gateway (Midtrans)">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Metode Pembayaran</label>
            <select
              value={form.paymentGateway}
              onChange={(e) =>
                setForm({ ...form, paymentGateway: e.target.value as "manual" | "midtrans" })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            >
              <option value="manual">Manual (simulasi / transfer manual)</option>
              <option value="midtrans">Midtrans (otomatis, auto-approve)</option>
            </select>
          </div>
          <Field
            label="Midtrans Client Key"
            value={form.midtransClientKey}
            onChange={(v) => setForm({ ...form, midtransClientKey: v })}
          />
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.midtransIsProduction}
              onChange={(e) => setForm({ ...form, midtransIsProduction: e.target.checked })}
            />
            Mode Production (nonaktifkan untuk pakai Sandbox/testing)
          </label>
          <button
            onClick={async () => {
              setSavingGateway(true);
              await onSaveSettings(form);
              setSavingGateway(false);
              flashSaved("gateway");
            }}
            disabled={savingGateway}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-70"
          >
            {savingGateway && <Loader2 size={13} className="animate-spin" />}
            {savedFlag === "gateway" ? <Check size={13} /> : null}
            Simpan
          </button>
        </SettingsCard>

        <SettingsCard title="Midtrans Server Key (Rahasia)">
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              secretConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <ShieldCheck size={14} />
            {secretConfigured ? "Server Key sudah diatur" : "Server Key belum diatur"}
          </div>
          <p className="text-xs text-slate-500">
            Server Key tidak pernah ditampilkan kembali setelah disimpan — hanya bisa diganti,
            tersimpan aman di server (Netlify Function), tidak bisa diakses dari browser.
          </p>
          <Field
            label="Server Key baru"
            type="password"
            value={serverKeyInput}
            onChange={setServerKeyInput}
          />
          {keyError && <p className="text-xs text-red-600">{keyError}</p>}
          <button
            onClick={async () => {
              if (!serverKeyInput.trim()) {
                setKeyError("Server Key tidak boleh kosong.");
                return;
              }
              setKeyError(null);
              setSavingKey(true);
              try {
                await onSaveServerKey(serverKeyInput.trim());
                setServerKeyInput("");
                flashSaved("key");
              } catch (err) {
                setKeyError(err instanceof Error ? err.message : "Gagal menyimpan.");
              } finally {
                setSavingKey(false);
              }
            }}
            disabled={savingKey}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-70"
          >
            {savingKey && <Loader2 size={13} className="animate-spin" />}
            {savedFlag === "key" ? <Check size={13} /> : null}
            Simpan Server Key
          </button>
        </SettingsCard>
      </div>
    </div>
  );
}

function PsychologistsTab({
  users,
  requirements,
  submissions,
  updatingVerifyId,
  onVerify,
  onAddRequirement,
  onDeleteRequirement,
  onChangeCategory,
}: {
  users: AdminUserView[];
  requirements: VerificationRequirement[];
  submissions: Record<string, SubmissionAnswer[]>;
  updatingVerifyId: string | null;
  onVerify: (userId: string, status: "verified" | "rejected") => Promise<void>;
  onAddRequirement: () => void;
  onDeleteRequirement: (id: string) => Promise<void>;
  onChangeCategory: (userId: string, category: "teman_curhat" | "profesional") => Promise<void>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const psychologists = users.filter((u) => u.rawRole === "psychologist");

  return (
    <div>
      <h1 className="font-heading text-xl font-bold text-slate-900">Manajemen Psikolog</h1>
      <p className="mt-1 text-sm text-slate-500">
        Atur syarat pendaftaran dan tinjau berkas yang dikirim calon psikolog sebelum diverifikasi.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold text-slate-900">
          Syarat Pendaftaran ({requirements.length})
        </h2>
        <button
          onClick={onAddRequirement}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white"
        >
          <Plus size={14} /> Tambah Syarat
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {requirements.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              {r.inputType === "photo" ? <ImageIconOutline size={16} /> : <FileText size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {r.label} {r.isRequired && <span className="text-red-500">*</span>}
              </p>
              {r.description && (
                <p className="truncate text-xs text-slate-500">{r.description}</p>
              )}
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              {r.inputType === "photo" ? "Foto" : "Teks"}
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
              {r.category === "both"
                ? "Semua Kategori"
                : r.category === "profesional"
                  ? "Psikolog Profesional"
                  : "Teman Curhat"}
            </span>
            <button
              onClick={() => onDeleteRequirement(r.id)}
              className="flex items-center gap-1 rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} /> Hapus
            </button>
          </div>
        ))}
        {requirements.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            Belum ada syarat. Tambahkan minimal satu supaya psikolog tahu apa yang perlu dilampirkan.
          </p>
        )}
      </div>

      <h2 className="mt-8 font-heading text-sm font-semibold text-slate-900">
        Peninjauan Pendaftar ({psychologists.length})
      </h2>
      <div className="mt-3 space-y-3">
        {psychologists.map((u) => {
          const answers = submissions[u.id] ?? [];
          const myRequirements = requirements.filter(
            (r) => r.category === "both" || r.category === (u.category ?? "teman_curhat")
          );
          const answeredCount = myRequirements.filter((r) =>
            answers.some((a) => a.requirementId === r.id && (a.textValue || a.filePath))
          ).length;
          const isOpen = expandedId === u.id;
          return (
            <div key={u.id} className="rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => setExpandedId(isOpen ? null : u.id)}
                  className="flex-1 text-left"
                >
                  <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500">
                    {u.email} &middot; {answeredCount}/{myRequirements.length} syarat terisi
                  </p>
                </button>
                <select
                  value={u.category ?? "teman_curhat"}
                  onChange={(e) =>
                    onChangeCategory(u.id, e.target.value as "teman_curhat" | "profesional")
                  }
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 outline-none focus:border-teal-500"
                >
                  <option value="teman_curhat">Teman Curhat</option>
                  <option value="profesional">Psikolog Profesional</option>
                </select>
                <button onClick={() => setExpandedId(isOpen ? null : u.id)}>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${userStatusStyle[u.status]}`}>
                    {u.status}
                  </span>
                </button>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {myRequirements.map((r) => {
                    const answer = answers.find((a) => a.requirementId === r.id);
                    return (
                      <div key={r.id} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-600">
                          {r.label} {r.isRequired && <span className="text-red-500">*</span>}
                        </p>
                        {r.inputType === "photo" ? (
                          answer?.filePath ? (
                            <ViewCredentialButton path={answer.filePath} />
                          ) : (
                            <p className="mt-1 text-xs text-slate-400">Belum diunggah.</p>
                          )
                        ) : (
                          <p className="mt-1 text-sm text-slate-800">
                            {answer?.textValue || (
                              <span className="text-xs text-slate-400">Belum diisi.</span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onVerify(u.id, "verified")}
                      disabled={updatingVerifyId === u.id || u.status === "Aktif"}
                      className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {updatingVerifyId === u.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      Verifikasi Psikolog
                    </button>
                    <button
                      onClick={() => onVerify(u.id, "rejected")}
                      disabled={updatingVerifyId === u.id || u.status !== "Aktif"}
                      className="flex items-center gap-1.5 rounded-full border border-red-100 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                    >
                      <XIcon size={13} /> Tangguhkan
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {psychologists.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            Belum ada psikolog yang mendaftar.
          </p>
        )}
      </div>
    </div>
  );
}

function ViewCredentialButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={async () => {
        setLoading(true);
        const url = await fetchSignedCredentialUrl(path);
        setLoading(false);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else alert("Gagal membuka dokumen.");
      }}
      disabled={loading}
      className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
      Lihat Dokumen
    </button>
  );
}

function AddRequirementModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (fields: {
    label: string;
    description: string;
    inputType: "text" | "photo";
    isRequired: boolean;
    category: "teman_curhat" | "profesional" | "both";
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    label: "",
    description: "",
    inputType: "text" as "text" | "photo",
    isRequired: true,
    category: "both" as "teman_curhat" | "profesional" | "both",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ModalShell
      title="Tambah Syarat Pendaftaran"
      submitLabel="Tambahkan"
      onCancel={onCancel}
      saving={saving}
      onSubmit={async () => {
        if (!form.label.trim()) {
          setError("Nama syarat wajib diisi.");
          return;
        }
        setError(null);
        setSaving(true);
        await onSave(form);
        setSaving(false);
      }}
    >
      <Field
        label="Nama Syarat"
        value={form.label}
        onChange={(v) => setForm({ ...form, label: v })}
      />
      <Field
        label="Deskripsi (opsional)"
        value={form.description}
        onChange={(v) => setForm({ ...form, description: v })}
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Tipe Jawaban</label>
        <select
          value={form.inputType}
          onChange={(e) => setForm({ ...form, inputType: e.target.value as "text" | "photo" })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        >
          <option value="text">Teks</option>
          <option value="photo">Foto / Dokumen</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Berlaku untuk</label>
        <select
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value as "teman_curhat" | "profesional" | "both" })
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        >
          <option value="both">Semua Kategori</option>
          <option value="teman_curhat">Teman Curhat</option>
          <option value="profesional">Psikolog Profesional</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={form.isRequired}
          onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
        />
        Wajib diisi
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </ModalShell>
  );
}
