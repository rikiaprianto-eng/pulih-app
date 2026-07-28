import { supabase } from "./supabase/client";
import type { Banner, Psychologist, Package, EventItem } from "./data";

const BANNER_GRADIENTS = [
  "from-sky-700 via-sky-600 to-teal-500",
  "from-teal-600 via-teal-500 to-sky-600",
  "from-sky-800 via-teal-600 to-teal-400",
];

// ---------------------------------------------------------------------------
// Public catalog data (readable by anyone, patient or not)
// ---------------------------------------------------------------------------

export async function fetchBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error || !data) return [];
  return data.map((b, i) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle ?? "",
    cta: b.cta_label ?? "Selengkapnya",
    href: b.href ?? "/",
    gradient: BANNER_GRADIENTS[i % BANNER_GRADIENTS.length],
    image: b.image_url ?? `https://picsum.photos/seed/pulih-${b.id}/1200/500`,
  }));
}

type PsychologistRow = {
  id: string;
  full_name: string | null;
  psychologist_profiles: {
    title: string | null;
    is_online: boolean;
    rating_avg: number;
    review_count: number;
    price_30: number;
    price_60: number;
    experience_label: string | null;
    psychologist_specializations: { specializations: { name: string } | null }[];
  } | null;
};

export async function fetchPsychologists(): Promise<Psychologist[]> {
  // Only publicly list psychologists an admin has verified — pending/rejected
  // accounts stay hidden from patients until approved (see Manajemen User in admin).
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `id, full_name,
       psychologist_profiles!inner (
         title, is_online, rating_avg, review_count, price_30, price_60, experience_label, verification_status,
         psychologist_specializations ( specializations ( name ) )
       )`
    )
    .eq("role", "psychologist")
    .eq("psychologist_profiles.verification_status", "verified");

  if (error || !data) return [];

  return (data as unknown as PsychologistRow[]).map((row) => {
    const pp = row.psychologist_profiles;
    const specialties =
      pp?.psychologist_specializations
        ?.map((ps) => ps.specializations?.name)
        .filter((n): n is string => Boolean(n)) ?? [];
    return {
      id: row.id,
      name: row.full_name ?? "Psikolog Pulih",
      title: pp?.title ?? "Psikolog Klinis",
      specialties,
      rating: pp?.rating_avg ?? 5,
      reviewCount: pp?.review_count ?? 0,
      online: pp?.is_online ?? false,
      experience: pp?.experience_label ?? "",
      avatarSeed: row.full_name ?? row.id,
      price30: pp?.price_30 ?? 99000,
      price60: pp?.price_60 ?? 175000,
    };
  });
}

export async function fetchPackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    durationMinutes: p.duration_minutes,
    sessionQuota: p.session_quota,
    price: p.price,
    originalPrice: p.original_price ?? undefined,
    highlight: p.badge === "Paling Populer",
    badge: p.badge ?? undefined,
  }));
}

export async function fetchEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });
  if (error || !data) return [];
  return data.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.event_date
      ? new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(e.event_date)) + " WIB"
      : "Jadwal menyusul",
    speaker: e.speaker_name ?? "Psikolog Pulih",
    type: e.event_type,
    quotaLeft: e.quota,
  }));
}

// ---------------------------------------------------------------------------
// Patient-scoped data
// ---------------------------------------------------------------------------

export type SubscriptionView = {
  packageName: string;
  totalQuota: number;
  usedQuota: number;
  expiresAt: string;
};

export async function fetchActiveSubscription(patientId: string): Promise<SubscriptionView | null> {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    packageName: data.package_name ?? "Paket Konseling",
    totalQuota: data.total_quota,
    usedQuota: data.used_quota,
    expiresAt: data.expires_at
      ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
          new Date(data.expires_at)
        )
      : "-",
  };
}

export type TransactionView = {
  id: string;
  date: string;
  item: string;
  amount: number;
  method: string;
  status: string;
};

export async function fetchTransactions(patientId: string): Promise<TransactionView[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, packages(name)")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string;
    created_at: string;
    amount: number;
    payment_method: string | null;
    status: string;
    packages: { name: string } | null;
  }>).map((t) => ({
    id: t.id,
    date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(t.created_at)
    ),
    item: t.packages?.name ?? "Paket Konseling",
    amount: t.amount,
    method: t.payment_method ?? "-",
    status: t.status === "paid" ? "Berhasil" : t.status === "pending" ? "Menunggu" : "Gagal",
  }));
}

export type SessionHistoryView = {
  id: string;
  psychologistName: string;
  date: string;
  durationMinutes: number;
  status: string;
};

export async function fetchSessionHistory(patientId: string): Promise<SessionHistoryView[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, status, psychologist:profiles!sessions_psychologist_id_fkey(full_name)")
    .eq("patient_id", patientId)
    .order("scheduled_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    psychologist: { full_name: string | null } | null;
  }>).map((s) => ({
    id: s.id,
    psychologistName: s.psychologist?.full_name ?? "Psikolog Pulih",
    date: new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(s.scheduled_at)),
    durationMinutes: s.duration_minutes,
    status: s.status === "completed" ? "Selesai" : s.status === "cancelled" ? "Dibatalkan" : "Terjadwal",
  }));
}

/** Creates a transaction + subscription for the simulated checkout flow in /pricing. */
export async function createCheckout(
  patientId: string,
  pkg: Package,
  paymentMethodName: string
) {
  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      patient_id: patientId,
      package_id: pkg.id,
      amount: pkg.price,
      payment_method: paymentMethodName,
      status: "paid",
    })
    .select()
    .single();
  if (txError || !tx) throw txError;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { error: subError } = await supabase.from("user_subscriptions").insert({
    patient_id: patientId,
    transaction_id: tx.id,
    package_name: pkg.name,
    total_quota: pkg.sessionQuota,
    used_quota: 0,
    expires_at: expiresAt.toISOString(),
  });
  if (subError) throw subError;
}

/** Starts (or reuses) a counseling session between the logged-in patient and a psychologist. */
export async function startSession(patientId: string, psychologistId: string, durationMinutes = 60) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      patient_id: patientId,
      psychologist_id: psychologistId,
      duration_minutes: durationMinutes,
      status: "ongoing",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error || !data) throw error;
  return data;
}

export async function endSession(sessionId: string, status: "completed" | "extended" = "completed") {
  await supabase
    .from("sessions")
    .update({ status, ended_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", sessionId);
}

export async function extendSession(sessionId: string, extraMinutes: number) {
  const { data } = await supabase
    .from("sessions")
    .select("duration_minutes")
    .eq("id", sessionId)
    .single();
  await supabase
    .from("sessions")
    .update({
      status: "extended",
      duration_minutes: (data?.duration_minutes ?? 0) + extraMinutes,
    })
    .eq("id", sessionId);
}

// ---------------------------------------------------------------------------
// Psychologist-scoped data
// ---------------------------------------------------------------------------

export async function setOnlineStatus(psychologistId: string, isOnline: boolean) {
  await supabase.from("psychologist_profiles").update({ is_online: isOnline }).eq("id", psychologistId);
}

/** Admin-only: approve or reject a psychologist so they can (or can't) appear publicly. */
export async function setPsychologistVerification(
  psychologistId: string,
  status: "verified" | "rejected" | "pending"
) {
  await supabase.from("psychologist_profiles").update({ verification_status: status }).eq("id", psychologistId);
}

export async function fetchIsOnline(psychologistId: string): Promise<boolean> {
  const { data } = await supabase
    .from("psychologist_profiles")
    .select("is_online")
    .eq("id", psychologistId)
    .maybeSingle();
  return data?.is_online ?? false;
}

export async function fetchMyVerificationStatus(
  psychologistId: string
): Promise<"pending" | "verified" | "rejected"> {
  const { data } = await supabase
    .from("psychologist_profiles")
    .select("verification_status")
    .eq("id", psychologistId)
    .maybeSingle();
  const status = data?.verification_status;
  return status === "verified" || status === "rejected" ? status : "pending";
}

export type AppointmentView = {
  id: string;
  patientName: string;
  time: string;
  durationMinutes: number;
  status: string;
};

export async function fetchTodaySchedule(psychologistId: string): Promise<AppointmentView[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("sessions")
    .select("id, scheduled_at, duration_minutes, status, patient:profiles!sessions_patient_id_fkey(full_name)")
    .eq("psychologist_id", psychologistId)
    .gte("scheduled_at", startOfDay.toISOString())
    .lte("scheduled_at", endOfDay.toISOString())
    .order("scheduled_at");
  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
    patient: { full_name: string | null } | null;
  }>).map((s) => ({
    id: s.id,
    patientName: s.patient?.full_name ?? "Pasien",
    time: new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(s.scheduled_at)
    ),
    durationMinutes: s.duration_minutes,
    status:
      s.status === "completed"
        ? "Selesai"
        : s.status === "ongoing" || s.status === "extended"
          ? "Berlangsung"
          : "Menunggu",
  }));
}

export type PatientRecordView = {
  patientId: string;
  patientName: string;
  lastSession: string;
  totalSessions: number;
  note: string;
};

export async function fetchMyPatients(psychologistId: string): Promise<PatientRecordView[]> {
  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("patient_id, scheduled_at, patient:profiles!sessions_patient_id_fkey(full_name)")
    .eq("psychologist_id", psychologistId)
    .order("scheduled_at", { ascending: false });

  const { data: recordsData } = await supabase
    .from("medical_records")
    .select("patient_id, notes, created_at")
    .eq("psychologist_id", psychologistId)
    .order("created_at", { ascending: false });

  const patients = new Map<string, PatientRecordView>();
  for (const s of (sessionsData ?? []) as unknown as Array<{
    patient_id: string;
    scheduled_at: string;
    patient: { full_name: string | null } | null;
  }>) {
    const existing = patients.get(s.patient_id);
    if (existing) {
      existing.totalSessions += 1;
    } else {
      patients.set(s.patient_id, {
        patientId: s.patient_id,
        patientName: s.patient?.full_name ?? "Pasien",
        lastSession: new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(s.scheduled_at)),
        totalSessions: 1,
        note: "Belum ada catatan.",
      });
    }
  }

  for (const r of (recordsData ?? []) as unknown as Array<{
    patient_id: string;
    notes: string;
  }>) {
    const existing = patients.get(r.patient_id);
    if (existing && existing.note === "Belum ada catatan.") {
      existing.note = r.notes;
    }
  }

  return Array.from(patients.values());
}

export async function addMedicalRecord(
  psychologistId: string,
  patientId: string,
  notes: string,
  sessionId?: string
) {
  await supabase.from("medical_records").insert({
    psychologist_id: psychologistId,
    patient_id: patientId,
    session_id: sessionId ?? null,
    notes,
  });
}

// ---------------------------------------------------------------------------
// Admin-scoped data
// ---------------------------------------------------------------------------

export type AdminUserView = {
  id: string;
  name: string;
  email: string;
  role: "Pasien" | "Psikolog" | "Admin";
  rawRole: "patient" | "psychologist" | "admin";
  status: string;
  joined: string;
  isOnline: boolean | null;
};

export async function fetchAdminUsers(): Promise<AdminUserView[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, psychologist_profiles(verification_status, is_online)")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: "patient" | "psychologist" | "admin";
    created_at: string;
    psychologist_profiles: { verification_status: string; is_online: boolean } | null;
  }>).map((u) => ({
    id: u.id,
    name: u.full_name ?? "Pengguna",
    email: u.email ?? "-",
    role: u.role === "psychologist" ? "Psikolog" : u.role === "admin" ? "Admin" : "Pasien",
    rawRole: u.role,
    status:
      u.role === "psychologist"
        ? u.psychologist_profiles?.verification_status === "verified"
          ? "Aktif"
          : u.psychologist_profiles?.verification_status === "rejected"
            ? "Ditangguhkan"
            : "Tertunda"
        : "Aktif",
    joined: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(u.created_at)
    ),
    isOnline: u.role === "psychologist" ? (u.psychologist_profiles?.is_online ?? false) : null,
  }));
}

export type PendingPaymentView = {
  id: string;
  user: string;
  item: string;
  amount: number;
  method: string;
  date: string;
};

export async function fetchPendingPayments(): Promise<PendingPaymentView[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, profiles(full_name), packages(name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string;
    amount: number;
    payment_method: string | null;
    created_at: string;
    profiles: { full_name: string | null } | null;
    packages: { name: string } | null;
  }>).map((p) => ({
    id: p.id,
    user: p.profiles?.full_name ?? "Pengguna",
    item: p.packages?.name ?? "Paket Konseling",
    amount: p.amount,
    method: p.payment_method ?? "-",
    date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(p.created_at)
    ),
  }));
}

export async function verifyPayment(transactionId: string, approve: boolean) {
  await supabase
    .from("transactions")
    .update({ status: approve ? "paid" : "failed" })
    .eq("id", transactionId);
}

export type AdminStats = {
  totalUsers: number;
  totalPsychologists: number;
  monthlyRevenue: number;
  activeSessionsToday: number;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ count: totalUsers }, { count: totalPsychologists }, { data: revenueRows }, { count: activeSessionsToday }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("psychologist_profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("transactions")
        .select("amount")
        .eq("status", "paid")
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_at", startOfDay.toISOString()),
    ]);

  const monthlyRevenue = (revenueRows ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return {
    totalUsers: totalUsers ?? 0,
    totalPsychologists: totalPsychologists ?? 0,
    monthlyRevenue,
    activeSessionsToday: activeSessionsToday ?? 0,
  };
}

export async function updatePackage(id: string, fields: Partial<Package>) {
  await supabase
    .from("packages")
    .update({
      name: fields.name,
      description: fields.description,
      duration_minutes: fields.durationMinutes,
      session_quota: fields.sessionQuota,
      price: fields.price,
      original_price: fields.originalPrice ?? null,
      badge: fields.badge ?? null,
    })
    .eq("id", id);
}

export async function createPackage(fields: Omit<Package, "id">) {
  await supabase.from("packages").insert({
    name: fields.name,
    description: fields.description,
    duration_minutes: fields.durationMinutes,
    session_quota: fields.sessionQuota,
    price: fields.price,
    original_price: fields.originalPrice ?? null,
    badge: fields.badge ?? null,
  });
}

export async function deletePackage(id: string) {
  await supabase.from("packages").delete().eq("id", id);
}

export async function updateBanner(id: string, fields: Partial<Banner>) {
  await supabase
    .from("banners")
    .update({
      title: fields.title,
      subtitle: fields.subtitle,
      href: fields.href,
      image_url: fields.image,
    })
    .eq("id", id);
}

export async function deleteBanner(id: string) {
  await supabase.from("banners").delete().eq("id", id);
}

export async function createBanner(fields: Omit<Banner, "id" | "gradient">) {
  const { data: rows } = await supabase.from("banners").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextSortOrder = (rows?.[0]?.sort_order ?? 0) + 1;
  await supabase.from("banners").insert({
    title: fields.title,
    subtitle: fields.subtitle,
    href: fields.href,
    cta_label: fields.cta,
    image_url: fields.image,
    sort_order: nextSortOrder,
  });
}

export async function createEvent(fields: {
  title: string;
  type: "Webinar" | "Support Group";
  speaker: string;
  eventDate: string;
  quota: number;
}) {
  await supabase.from("events").insert({
    title: fields.title,
    event_type: fields.type,
    speaker_name: fields.speaker,
    event_date: fields.eventDate,
    quota: fields.quota,
  });
}

export async function deleteEvent(id: string) {
  await supabase.from("events").delete().eq("id", id);
}

/** Updates a user's role. If promoting to psychologist, ensures a psychologist_profiles row exists. */
export async function updateUserRole(userId: string, role: "patient" | "psychologist" | "admin") {
  await supabase.from("profiles").update({ role }).eq("id", userId);
  if (role === "psychologist") {
    await supabase.from("psychologist_profiles").upsert({ id: userId });
  }
}

/** Admin-initiated account creation. Uses the public signup API (anon key) — the new
 * user will still need to confirm their email unless email confirmations are disabled
 * on the Supabase project. */
export async function createUserAsAdmin(
  email: string,
  password: string,
  fullName: string,
  role: "patient" | "psychologist" | "admin"
) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Site settings (company info, bank display, payment gateway toggle)
// ---------------------------------------------------------------------------

export type SiteSettings = {
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  aboutText: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  paymentGateway: "manual" | "midtrans";
  midtransClientKey: string;
  midtransIsProduction: boolean;
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  logoUrl: "",
  contactEmail: "halo@pulih.id",
  contactPhone: "0800-1-PULIH",
  aboutText: "Platform konseling psikologi online tepercaya untuk kesehatan mentalmu.",
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
  paymentGateway: "manual",
  midtransClientKey: "",
  midtransIsProduction: false,
};

export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return DEFAULT_SITE_SETTINGS;
  return {
    logoUrl: data.logo_url ?? "",
    contactEmail: data.contact_email ?? DEFAULT_SITE_SETTINGS.contactEmail,
    contactPhone: data.contact_phone ?? DEFAULT_SITE_SETTINGS.contactPhone,
    aboutText: data.about_text ?? DEFAULT_SITE_SETTINGS.aboutText,
    bankName: data.bank_name ?? "",
    bankAccountNumber: data.bank_account_number ?? "",
    bankAccountHolder: data.bank_account_holder ?? "",
    paymentGateway: data.payment_gateway === "midtrans" ? "midtrans" : "manual",
    midtransClientKey: data.midtrans_client_key ?? "",
    midtransIsProduction: !!data.midtrans_is_production,
  };
}

export async function updateSiteSettings(fields: SiteSettings) {
  await supabase
    .from("site_settings")
    .update({
      logo_url: fields.logoUrl || null,
      contact_email: fields.contactEmail,
      contact_phone: fields.contactPhone,
      about_text: fields.aboutText,
      bank_name: fields.bankName,
      bank_account_number: fields.bankAccountNumber,
      bank_account_holder: fields.bankAccountHolder,
      payment_gateway: fields.paymentGateway,
      midtrans_client_key: fields.midtransClientKey,
      midtrans_is_production: fields.midtransIsProduction,
    })
    .eq("id", 1);
}

// ---------------------------------------------------------------------------
// Banner image upload (Supabase Storage)
// ---------------------------------------------------------------------------

export async function uploadBannerImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("banners").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("banners").getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Payment gateway (Midtrans) — secure operations routed through Netlify Functions,
// never talking to payment_secrets directly (that table has no client-readable RLS).
// ---------------------------------------------------------------------------

export async function saveMidtransServerKey(serverKey: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Belum login.");

  const res = await fetch("/.netlify/functions/save-payment-secret", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ midtransServerKey: serverKey }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Gagal menyimpan Server Key.");
  }
}

export async function createMidtransTransaction(
  packageId: string
): Promise<{ token: string; transactionId: string; redirectUrl: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Belum login.");

  const res = await fetch("/.netlify/functions/create-midtrans-transaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ packageId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Gagal memulai pembayaran.");
  return body;
}

export async function fetchPaymentSecretStatus(): Promise<{ configured: boolean }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { configured: false };

  const res = await fetch("/.netlify/functions/save-payment-secret", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return { configured: false };
  return res.json();
}

// ---------------------------------------------------------------------------
// Psychologist verification requirements & submissions
// ---------------------------------------------------------------------------

export type VerificationRequirement = {
  id: string;
  label: string;
  description: string;
  inputType: "text" | "photo";
  isRequired: boolean;
  sortOrder: number;
};

export async function fetchVerificationRequirements(): Promise<VerificationRequirement[]> {
  const { data, error } = await supabase
    .from("verification_requirements")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description ?? "",
    inputType: r.input_type === "photo" ? "photo" : "text",
    isRequired: r.is_required,
    sortOrder: r.sort_order,
  }));
}

export async function createRequirement(fields: {
  label: string;
  description: string;
  inputType: "text" | "photo";
  isRequired: boolean;
}) {
  const { data: rows } = await supabase
    .from("verification_requirements")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSortOrder = (rows?.[0]?.sort_order ?? 0) + 1;
  await supabase.from("verification_requirements").insert({
    label: fields.label,
    description: fields.description,
    input_type: fields.inputType,
    is_required: fields.isRequired,
    sort_order: nextSortOrder,
  });
}

export async function deleteRequirement(id: string) {
  await supabase.from("verification_requirements").delete().eq("id", id);
}

export type SubmissionAnswer = {
  requirementId: string;
  textValue: string | null;
  filePath: string | null;
  submittedAt: string | null;
};

/** All of the logged-in psychologist's own submitted answers (used to render their progress). */
export async function fetchMySubmissions(psychologistId: string): Promise<SubmissionAnswer[]> {
  const { data, error } = await supabase
    .from("psychologist_submissions")
    .select("requirement_id, text_value, file_path, submitted_at")
    .eq("psychologist_id", psychologistId);
  if (error || !data) return [];
  return data.map((s) => ({
    requirementId: s.requirement_id,
    textValue: s.text_value,
    filePath: s.file_path,
    submittedAt: s.submitted_at,
  }));
}

export async function submitTextAnswer(psychologistId: string, requirementId: string, text: string) {
  await supabase.from("psychologist_submissions").upsert(
    {
      psychologist_id: psychologistId,
      requirement_id: requirementId,
      text_value: text,
      file_path: null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "psychologist_id,requirement_id" }
  );
}

export async function submitPhotoAnswer(psychologistId: string, requirementId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${psychologistId}/${requirementId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("credentials").upload(path, file, {
    upsert: true,
  });
  if (uploadError) throw uploadError;

  await supabase.from("psychologist_submissions").upsert(
    {
      psychologist_id: psychologistId,
      requirement_id: requirementId,
      text_value: null,
      file_path: path,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "psychologist_id,requirement_id" }
  );
}

export async function fetchSignedCredentialUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("credentials").createSignedUrl(path, 300);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Admin view: every psychologist's submissions, keyed by psychologist id. */
export async function fetchAllSubmissions(): Promise<Record<string, SubmissionAnswer[]>> {
  const { data, error } = await supabase
    .from("psychologist_submissions")
    .select("psychologist_id, requirement_id, text_value, file_path, submitted_at");
  if (error || !data) return {};
  const grouped: Record<string, SubmissionAnswer[]> = {};
  for (const s of data) {
    if (!grouped[s.psychologist_id]) grouped[s.psychologist_id] = [];
    grouped[s.psychologist_id].push({
      requirementId: s.requirement_id,
      textValue: s.text_value,
      filePath: s.file_path,
      submittedAt: s.submitted_at,
    });
  }
  return grouped;
}
