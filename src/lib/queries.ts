import { supabase } from "./supabase/client";
import type { Banner, Psychologist, Package, EventItem, Facility } from "./data";

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
    category: "teman_curhat" | "profesional" | null;
    hourly_rate: number | null;
    discount_percent: number | null;
    coupon_code: string | null;
    coupon_discount_amount: number | null;
    lynkid_url: string | null;
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
         title, is_online, rating_avg, review_count, price_30, price_60, experience_label, verification_status, category, hourly_rate, discount_percent, coupon_code, coupon_discount_amount, lynkid_url,
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
      category: pp?.category === "profesional" ? "profesional" : "teman_curhat",
      hourlyRate: pp?.hourly_rate ?? null,
      discountPercent: pp?.discount_percent ?? 0,
      couponCode: pp?.coupon_code ?? null,
      couponDiscountAmount: pp?.coupon_discount_amount ?? 0,
      lynkidUrl: pp?.lynkid_url ?? null,
    };
  });
}

/** Single psychologist lookup for the direct-pay checkout page (Psikolog Profesional). */
export async function fetchPsychologistById(id: string): Promise<Psychologist | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `id, full_name,
       psychologist_profiles!inner (
         title, is_online, rating_avg, review_count, price_30, price_60, experience_label, category, hourly_rate, discount_percent, coupon_code, coupon_discount_amount, lynkid_url,
         psychologist_specializations ( specializations ( name ) )
       )`
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as PsychologistRow;
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
    category: pp?.category === "profesional" ? "profesional" : "teman_curhat",
    hourlyRate: pp?.hourly_rate ?? null,
    discountPercent: pp?.discount_percent ?? 0,
    couponCode: pp?.coupon_code ?? null,
    couponDiscountAmount: pp?.coupon_discount_amount ?? 0,
    lynkidUrl: pp?.lynkid_url ?? null,
  };
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
    couponCode: p.coupon_code ?? undefined,
    couponDiscountAmount: p.coupon_discount_amount ?? undefined,
    lynkidUrl: p.lynkid_url ?? undefined,
  }));
}

export async function fetchFacilities(): Promise<Facility[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error || !data) return [];
  return data.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description ?? "",
    image: f.image_url ?? `https://picsum.photos/seed/pulih-facility-${f.id}/800/600`,
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
  durationMinutes: number;
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
    durationMinutes: data.duration_minutes ?? 60,
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
  paymentMethodName: string,
  couponCode: string = ""
) {
  const { data: settings } = await supabase
    .from("site_settings")
    .select("teman_curhat_admin_fee")
    .eq("id", 1)
    .maybeSingle();
  const amount = applyCoupon(pkg.price, couponCode, pkg.couponCode, pkg.couponDiscountAmount);
  const { adminFeeAmount, psychologistShareAmount } = splitTemanCurhatRevenue(
    amount,
    settings?.teman_curhat_admin_fee ?? DEFAULT_SITE_SETTINGS.temanCurhatAdminFee
  );

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      patient_id: patientId,
      package_id: pkg.id,
      amount,
      payment_method: paymentMethodName,
      status: "paid",
      admin_fee_amount: adminFeeAmount,
      psychologist_share_amount: psychologistShareAmount,
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
    duration_minutes: pkg.durationMinutes,
    expires_at: expiresAt.toISOString(),
  });
  if (subError) throw subError;
}

/** Direct-pay checkout for a Psikolog Profesional's own hourly rate (simulated payment flow). */
export async function createDirectCheckout(
  patientId: string,
  psy: Psychologist,
  paymentMethodName: string,
  couponCode: string = ""
): Promise<string> {
  const { data: settings } = await supabase
    .from("site_settings")
    .select("profesional_admin_fee_percent")
    .eq("id", 1)
    .maybeSingle();
  const baseAmount = effectiveHourlyRate(psy);
  const amount = applyCoupon(baseAmount, couponCode, psy.couponCode, psy.couponDiscountAmount);
  const { adminFeeAmount, psychologistShareAmount } = splitProfesionalRevenue(
    amount,
    settings?.profesional_admin_fee_percent ?? DEFAULT_SITE_SETTINGS.profesionalAdminFeePercent
  );

  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      patient_id: patientId,
      psychologist_id: psy.id,
      amount,
      payment_method: paymentMethodName,
      status: "paid",
      admin_fee_amount: adminFeeAmount,
      psychologist_share_amount: psychologistShareAmount,
    })
    .select()
    .single();
  if (error || !tx) throw error;
  return tx.id;
}

/**
 * Creates the pending half of a Lynk.id checkout. The patient is then sent to the
 * pre-made Lynk.id product page; lynk-webhook.ts flips this transaction to 'paid'
 * (matched by the buyer's email) once Lynk.id reports the payment succeeded.
 */
export async function createPendingLynkTransaction(
  patientId: string,
  fields: { packageId?: string; psychologistId?: string; amount: number }
): Promise<string> {
  const { data: settings } = await supabase
    .from("site_settings")
    .select("teman_curhat_admin_fee, profesional_admin_fee_percent")
    .eq("id", 1)
    .maybeSingle();

  const { adminFeeAmount, psychologistShareAmount } = fields.packageId
    ? splitTemanCurhatRevenue(
        fields.amount,
        settings?.teman_curhat_admin_fee ?? DEFAULT_SITE_SETTINGS.temanCurhatAdminFee
      )
    : splitProfesionalRevenue(
        fields.amount,
        settings?.profesional_admin_fee_percent ?? DEFAULT_SITE_SETTINGS.profesionalAdminFeePercent
      );

  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      patient_id: patientId,
      package_id: fields.packageId ?? null,
      psychologist_id: fields.psychologistId ?? null,
      amount: fields.amount,
      payment_method: "Lynk.id",
      status: "pending",
      admin_fee_amount: adminFeeAmount,
      psychologist_share_amount: psychologistShareAmount,
    })
    .select()
    .single();
  if (error || !tx) throw error;
  return tx.id;
}

export async function fetchTransactionStatus(transactionId: string): Promise<string | null> {
  const { data } = await supabase
    .from("transactions")
    .select("status")
    .eq("id", transactionId)
    .maybeSingle();
  return data?.status ?? null;
}

export type StartSessionResult =
  | { ok: true; sessionId: string; durationMinutes: number }
  | { ok: false; reason: "no_quota" | "invalid_transaction" };

/**
 * Starts a Teman Curhat session by atomically claiming one quota slot from the
 * patient's active package subscription (see consume_subscription_quota).
 * Fails with "no_quota" if they have none left — a session never grants more
 * time than the package actually paid for, and unused minutes aren't banked.
 */
export async function startTemanCurhatSession(
  patientId: string,
  psychologistId: string
): Promise<StartSessionResult> {
  const { data: durationMinutes, error: quotaError } = await supabase.rpc("consume_subscription_quota", {
    p_patient_id: patientId,
  });
  if (quotaError || durationMinutes == null) return { ok: false, reason: "no_quota" };

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
  return { ok: true, sessionId: data.id, durationMinutes };
}

/**
 * Starts a Psikolog Profesional session by atomically marking the patient's
 * paid direct transaction as consumed (see consume_transaction_session), so a
 * single hourly payment can only ever unlock one session. Fixed at 60 minutes
 * to match the "per jam" (hourly) rate they paid.
 */
export async function startProfessionalSession(
  patientId: string,
  psychologistId: string,
  transactionId: string
): Promise<StartSessionResult> {
  const { data: consumed, error: consumeError } = await supabase.rpc("consume_transaction_session", {
    p_transaction_id: transactionId,
  });
  if (consumeError || !consumed) return { ok: false, reason: "invalid_transaction" };

  const durationMinutes = 60;
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      patient_id: patientId,
      psychologist_id: psychologistId,
      transaction_id: transactionId,
      duration_minutes: durationMinutes,
      status: "ongoing",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error || !data) throw error;
  return { ok: true, sessionId: data.id, durationMinutes };
}

/**
 * Polled fallback for the incoming-call broadcast: finds a session a patient
 * already started with this psychologist that hasn't been picked up (or
 * rejected/ended) yet, so the call still surfaces even if the psychologist's
 * dashboard wasn't open at the exact moment the patient started the session.
 */
export async function fetchIncomingSession(
  psychologistId: string
): Promise<{ sessionId: string; patientId: string; patientName: string } | null> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, patient_id, started_at, profiles!sessions_patient_id_fkey(full_name)")
    .eq("psychologist_id", psychologistId)
    .eq("status", "ongoing")
    .is("ended_at", null)
    .gte("started_at", cutoff)
    .order("started_at", { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const row = data[0] as unknown as {
    id: string;
    patient_id: string;
    profiles: { full_name: string | null } | null;
  };
  return {
    sessionId: row.id,
    patientId: row.patient_id,
    patientName: row.profiles?.full_name ?? "Pasien Pulih",
  };
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

/** Psychologist-only: set their own hourly rate + discount (used by the Psikolog Profesional tier). */
export async function updateProfessionalPricing(
  psychologistId: string,
  hourlyRate: number,
  discountPercent: number,
  couponCode: string,
  couponDiscountAmount: number,
  lynkidUrl: string = ""
) {
  const { error } = await supabase
    .from("psychologist_profiles")
    .update({
      hourly_rate: hourlyRate,
      discount_percent: discountPercent,
      coupon_code: couponCode.trim() ? couponCode.trim().toUpperCase() : null,
      coupon_discount_amount: couponDiscountAmount || null,
      lynkid_url: lynkidUrl.trim() || null,
    })
    .eq("id", psychologistId);
  if (error) throw error;
}

export async function fetchProfesionalMinHourlyRate(): Promise<number> {
  const { data } = await supabase
    .from("site_settings")
    .select("profesional_min_hourly_rate")
    .eq("id", 1)
    .maybeSingle();
  return data?.profesional_min_hourly_rate ?? 0;
}

/** Admin-only: change which tier a psychologist belongs to. */
export async function updatePsychologistCategory(
  psychologistId: string,
  category: "teman_curhat" | "profesional"
) {
  await supabase.from("psychologist_profiles").update({ category }).eq("id", psychologistId);
}

export async function fetchMyPricing(psychologistId: string): Promise<{
  hourlyRate: number | null;
  discountPercent: number;
  couponCode: string;
  couponDiscountAmount: number;
  lynkidUrl: string;
}> {
  const { data } = await supabase
    .from("psychologist_profiles")
    .select("hourly_rate, discount_percent, coupon_code, coupon_discount_amount, lynkid_url")
    .eq("id", psychologistId)
    .maybeSingle();
  return {
    hourlyRate: data?.hourly_rate ?? null,
    discountPercent: data?.discount_percent ?? 0,
    couponCode: data?.coupon_code ?? "",
    couponDiscountAmount: data?.coupon_discount_amount ?? 0,
    lynkidUrl: data?.lynkid_url ?? "",
  };
}

export async function fetchMyCategory(
  psychologistId: string
): Promise<"teman_curhat" | "profesional"> {
  const { data } = await supabase
    .from("psychologist_profiles")
    .select("category")
    .eq("id", psychologistId)
    .maybeSingle();
  return data?.category === "profesional" ? "profesional" : "teman_curhat";
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
  category: "teman_curhat" | "profesional" | null;
  hourlyRate: number | null;
};

export async function fetchAdminUsers(): Promise<AdminUserView[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, psychologist_profiles(verification_status, is_online, category, hourly_rate)")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: "patient" | "psychologist" | "admin";
    created_at: string;
    psychologist_profiles: {
      verification_status: string;
      is_online: boolean;
      category: "teman_curhat" | "profesional" | null;
      hourly_rate: number | null;
    } | null;
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
    category:
      u.role === "psychologist"
        ? u.psychologist_profiles?.category === "profesional"
          ? "profesional"
          : "teman_curhat"
        : null,
    hourlyRate: u.role === "psychologist" ? (u.psychologist_profiles?.hourly_rate ?? null) : null,
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
      coupon_code: fields.couponCode?.trim() ? fields.couponCode.trim().toUpperCase() : null,
      coupon_discount_amount: fields.couponDiscountAmount || null,
      lynkid_url: fields.lynkidUrl?.trim() || null,
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
    coupon_code: fields.couponCode?.trim() ? fields.couponCode.trim().toUpperCase() : null,
    coupon_discount_amount: fields.couponDiscountAmount || null,
    lynkid_url: fields.lynkidUrl?.trim() || null,
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

export async function createFacility(fields: { title: string; description: string; image: string }) {
  const { data: rows } = await supabase
    .from("facilities")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSortOrder = (rows?.[0]?.sort_order ?? 0) + 1;
  await supabase.from("facilities").insert({
    title: fields.title,
    description: fields.description,
    image_url: fields.image,
    sort_order: nextSortOrder,
  });
}

export async function updateFacility(id: string, fields: { title: string; description: string; image: string }) {
  await supabase
    .from("facilities")
    .update({ title: fields.title, description: fields.description, image_url: fields.image })
    .eq("id", id);
}

export async function deleteFacility(id: string) {
  await supabase.from("facilities").delete().eq("id", id);
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
  paymentGateway: "manual" | "midtrans" | "lynkid";
  midtransClientKey: string;
  midtransIsProduction: boolean;
  temanCurhatAdminFee: number;
  profesionalAdminFeePercent: number;
  profesionalMinHourlyRate: number;
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
  temanCurhatAdminFee: 14000,
  profesionalAdminFeePercent: 10,
  profesionalMinHourlyRate: 0,
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
    paymentGateway:
      data.payment_gateway === "midtrans"
        ? "midtrans"
        : data.payment_gateway === "lynkid"
          ? "lynkid"
          : "manual",
    midtransClientKey: data.midtrans_client_key ?? "",
    midtransIsProduction: !!data.midtrans_is_production,
    temanCurhatAdminFee: data.teman_curhat_admin_fee ?? DEFAULT_SITE_SETTINGS.temanCurhatAdminFee,
    profesionalAdminFeePercent:
      data.profesional_admin_fee_percent ?? DEFAULT_SITE_SETTINGS.profesionalAdminFeePercent,
    profesionalMinHourlyRate:
      data.profesional_min_hourly_rate ?? DEFAULT_SITE_SETTINGS.profesionalMinHourlyRate,
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
      teman_curhat_admin_fee: fields.temanCurhatAdminFee,
      profesional_admin_fee_percent: fields.profesionalAdminFeePercent,
      profesional_min_hourly_rate: fields.profesionalMinHourlyRate,
    })
    .eq("id", 1);
}

/** Splits a Teman Curhat package payment into the platform's flat fee and the psychologist's share. */
function splitTemanCurhatRevenue(amount: number, adminFee: number) {
  const adminFeeAmount = Math.min(Math.max(adminFee, 0), amount);
  return { adminFeeAmount, psychologistShareAmount: amount - adminFeeAmount };
}

/** Splits a Psikolog Profesional payment into the platform's percentage cut and the psychologist's share. */
function splitProfesionalRevenue(amount: number, adminFeePercent: number) {
  const adminFeeAmount = Math.round((amount * Math.min(Math.max(adminFeePercent, 0), 100)) / 100);
  return { adminFeeAmount, psychologistShareAmount: amount - adminFeeAmount };
}

/** A Psikolog Profesional's hourly rate after their own discount is applied. */
export function effectiveHourlyRate(psy: Pick<Psychologist, "hourlyRate" | "discountPercent">): number {
  if (!psy.hourlyRate) return 0;
  return Math.round(psy.hourlyRate * (1 - Math.min(Math.max(psy.discountPercent, 0), 100) / 100));
}

/** Deducts a coupon's Rupiah value from a price if the entered code matches (case-insensitive). */
export function applyCoupon(
  basePrice: number,
  enteredCode: string,
  matchCode: string | null | undefined,
  discountAmount: number | null | undefined
): number {
  if (!enteredCode.trim() || !matchCode) return basePrice;
  if (enteredCode.trim().toUpperCase() !== matchCode.trim().toUpperCase()) return basePrice;
  return Math.max(0, basePrice - (discountAmount || 0));
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

export async function saveLynkidMerchantKey(merchantKey: string) {
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
    body: JSON.stringify({ lynkidMerchantKey: merchantKey }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Gagal menyimpan Merchant Key.");
  }
}

export async function createMidtransTransaction(
  packageId: string,
  couponCode: string = ""
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
    body: JSON.stringify({ packageId, couponCode }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Gagal memulai pembayaran.");
  return body;
}

/** Direct-pay Midtrans transaction for a specific Psikolog Profesional's hourly rate. */
export async function createDirectMidtransTransaction(
  psychologistId: string,
  couponCode: string = ""
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
    body: JSON.stringify({ psychologistId, couponCode }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Gagal memulai pembayaran.");
  return body;
}

export async function fetchPaymentSecretStatus(): Promise<{
  configured: boolean;
  lynkidConfigured: boolean;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { configured: false, lynkidConfigured: false };

  const res = await fetch("/.netlify/functions/save-payment-secret", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return { configured: false, lynkidConfigured: false };
  const body = await res.json();
  return { configured: !!body.configured, lynkidConfigured: !!body.lynkidConfigured };
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
  category: "teman_curhat" | "profesional" | "both";
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
    category: r.category === "teman_curhat" || r.category === "profesional" ? r.category : "both",
  }));
}

export async function createRequirement(fields: {
  label: string;
  description: string;
  inputType: "text" | "photo";
  isRequired: boolean;
  category: "teman_curhat" | "profesional" | "both";
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
    category: fields.category,
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
