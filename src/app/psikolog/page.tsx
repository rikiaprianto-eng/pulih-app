"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Users,
  Star,
  Wallet2,
  FileText,
  Loader2,
  Image as ImageIconOutline,
  Upload,
  Check,
  Clock,
  ShieldAlert,
  PenLine,
  PhoneCall,
  PhoneOff,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useRequireAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase/client";
import { IncomingCall, rejectIncomingCall } from "@/lib/useCallRoom";
import {
  fetchTodaySchedule,
  fetchMyPatients,
  setOnlineStatus,
  fetchIsOnline,
  fetchMyVerificationStatus,
  fetchVerificationRequirements,
  fetchMySubmissions,
  fetchMyCategory,
  fetchMyPricing,
  updateProfessionalPricing,
  fetchProfesionalMinHourlyRate,
  roundUpTo1000,
  roundToNearest1000,
  fetchIncomingSession,
  endSession,
  submitTextAnswer,
  submitPhotoAnswer,
  addMedicalRecord,
  AppointmentView,
  PatientRecordView,
  VerificationRequirement,
  SubmissionAnswer,
} from "@/lib/queries";
import { formatIDR } from "@/lib/utils";

const navItems = [
  { label: "Beranda", href: "/psikolog" },
  { label: "Profil", href: "/profil" },
];

const scheduleStatusStyle: Record<string, string> = {
  Menunggu: "bg-slate-100 text-slate-500",
  Berlangsung: "bg-teal-50 text-teal-700",
  Selesai: "bg-emerald-50 text-emerald-700",
};

export default function PsikologPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useRequireAuth(["psychologist"]);
  const [online, setOnline] = useState(true);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const dismissedCallsRef = useRef<Set<string>>(new Set());
  const [openRecord, setOpenRecord] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<AppointmentView[]>([]);
  const [patients, setPatients] = useState<PatientRecordView[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "rejected">(
    "pending"
  );
  const [requirements, setRequirements] = useState<VerificationRequirement[]>([]);
  const [mySubmissions, setMySubmissions] = useState<SubmissionAnswer[]>([]);
  const [category, setCategory] = useState<"teman_curhat" | "profesional">("teman_curhat");
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  const [minHourlyRate, setMinHourlyRate] = useState(0);

  useEffect(() => {
    if (!profile) return;
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Incoming calls are surfaced two ways: an instant broadcast ping for when this
  // dashboard is already open, and a DB poll fallback that catches calls started
  // before the psychologist opened the page (broadcasts aren't queued/replayed).
  useEffect(() => {
    if (!profile) return;

    function offer(call: IncomingCall) {
      if (dismissedCallsRef.current.has(call.sessionId)) return;
      setIncomingCall((prev) => (prev?.sessionId === call.sessionId ? prev : call));
    }

    const channel = supabase.channel(`incoming:${profile.id}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "incoming_call" }, ({ payload }: { payload: IncomingCall }) => {
      offer(payload);
    });
    channel.subscribe();

    let cancelled = false;
    async function poll() {
      const found = await fetchIncomingSession(profile!.id);
      if (found && !cancelled) offer(found);
    }
    poll();
    const interval = setInterval(poll, 4000);

    return () => {
      cancelled = true;
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [profile]);

  function handleRejectCall() {
    if (incomingCall) {
      dismissedCallsRef.current.add(incomingCall.sessionId);
      rejectIncomingCall(incomingCall.sessionId);
      endSession(incomingCall.sessionId, "completed");
    }
    setIncomingCall(null);
  }

  function handleAcceptCall() {
    if (!incomingCall) return;
    dismissedCallsRef.current.add(incomingCall.sessionId);
    router.push(
      `/psikolog/sesi?sessionId=${incomingCall.sessionId}&patientId=${incomingCall.patientId}&patientName=${encodeURIComponent(incomingCall.patientName)}`
    );
  }

  function reloadAll() {
    if (!profile) return;
    Promise.all([
      fetchTodaySchedule(profile.id),
      fetchMyPatients(profile.id),
      fetchIsOnline(profile.id),
      fetchMyVerificationStatus(profile.id),
      fetchVerificationRequirements(),
      fetchMySubmissions(profile.id),
      fetchMyCategory(profile.id),
      fetchMyPricing(profile.id),
      fetchProfesionalMinHourlyRate(),
    ]).then(([sched, pts, isOnline, verifStatus, reqs, subs, cat, pricing, minRate]) => {
      setSchedule(sched);
      setPatients(pts);
      setOnline(isOnline);
      setVerificationStatus(verifStatus);
      setRequirements(reqs);
      setMySubmissions(subs);
      setCategory(cat);
      setHourlyRate(pricing.hourlyRate);
      setDiscountPercent(pricing.discountPercent);
      setCouponCode(pricing.couponCode);
      setCouponDiscountAmount(pricing.couponDiscountAmount);
      setMinHourlyRate(minRate);
      setLoading(false);
    });
  }

  async function toggleOnline() {
    if (!profile || verificationStatus !== "verified") return;
    const next = !online;
    setOnline(next);
    await setOnlineStatus(profile.id, next);
  }

  const myRequirements = requirements.filter((r) => r.category === "both" || r.category === category);
  const answeredCount = myRequirements.filter((r) =>
    mySubmissions.some((a) => a.requirementId === r.id && (a.textValue || a.filePath))
  ).length;

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

      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <PhoneCall size={24} />
            </div>
            <h3 className="mt-4 font-heading text-lg font-bold text-slate-900">
              Panggilan Masuk
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">
              {incomingCall.patientName} sedang menunggu untuk memulai sesi konseling denganmu.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleRejectCall}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-100 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <PhoneOff size={16} /> Tolak
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-3 text-sm font-semibold text-white"
              >
                <PhoneCall size={16} /> Terima
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-slate-900">
                Halo, {profile.full_name?.split(" ")[0] ?? "Psikolog"}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  category === "profesional" ? "bg-sky-100 text-sky-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {category === "profesional" ? "Psikolog Profesional" : "Teman Curhat"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Berikut ringkasan aktivitasmu hari ini.</p>
          </div>

          <button
            onClick={toggleOnline}
            disabled={verificationStatus !== "verified"}
            title={
              verificationStatus !== "verified"
                ? "Belum bisa online — menunggu verifikasi admin"
                : undefined
            }
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${online ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`}
            />
            {verificationStatus !== "verified"
              ? "Belum Terverifikasi"
              : online
                ? "Online & Siap Konseling"
                : "Sedang Offline"}
          </button>
        </div>

        {!loading && verificationStatus !== "verified" && (
          <RegistrationPanel
            status={verificationStatus}
            requirements={myRequirements}
            submissions={mySubmissions}
            answeredCount={answeredCount}
            profileId={profile.id}
            onSaved={reloadAll}
          />
        )}

        {!loading && category === "profesional" && (
          <HourlyRateCard
            profileId={profile.id}
            hourlyRate={hourlyRate}
            discountPercent={discountPercent}
            couponCode={couponCode}
            couponDiscountAmount={couponDiscountAmount}
            minHourlyRate={minHourlyRate}
            onSaved={(rate, discount, coupon, couponAmount) => {
              setHourlyRate(rate);
              setDiscountPercent(discount);
              setCouponCode(coupon);
              setCouponDiscountAmount(couponAmount);
            }}
          />
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<CalendarDays size={18} />} label="Sesi Hari Ini" value={String(schedule.length)} />
          <StatCard icon={<Users size={18} />} label="Total Pasien" value={String(patients.length)} />
          <StatCard icon={<Star size={18} />} label="Rating" value="5.0" />
          <StatCard icon={<Wallet2 size={18} />} label="Pendapatan Bulan Ini" value={formatIDR(0)} />
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center py-10">
            <Loader2 className="animate-spin text-teal-600" size={24} />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <h2 className="font-heading text-base font-semibold text-slate-900">Jadwal Hari Ini</h2>
              {schedule.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                  Belum ada jadwal hari ini.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {schedule.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{a.patientName}</p>
                        <p className="text-xs text-slate-500">
                          {a.time} &middot; {a.durationMinutes} menit
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.status === "Berlangsung" && (
                          <button
                            onClick={() => {
                              dismissedCallsRef.current.add(a.id);
                              router.push(
                                `/psikolog/sesi?sessionId=${a.id}&patientName=${encodeURIComponent(a.patientName)}`
                              );
                            }}
                            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            <PhoneCall size={13} /> Gabung Video Call
                          </button>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scheduleStatusStyle[a.status]}`}
                        >
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
              <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-slate-900">
                <FileText size={17} /> Rekam Medis Psikologis
              </h2>
              {patients.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                  Belum ada pasien yang pernah menjalani sesi denganmu.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {patients.map((r) => (
                    <div key={r.patientId} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <button
                        onClick={() => setOpenRecord(openRecord === r.patientId ? null : r.patientId)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{r.patientName}</p>
                          <p className="text-xs text-slate-500">
                            Sesi terakhir {r.lastSession} &middot; {r.totalSessions}x sesi
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-teal-600">
                          {openRecord === r.patientId ? "Tutup" : "Lihat catatan"}
                        </span>
                      </button>
                      {openRecord === r.patientId && (
                        <NoteEditor
                          initialNote={r.note}
                          onSave={async (note) => {
                            if (!profile) return;
                            await addMedicalRecord(profile.id, r.patientId, note);
                            setPatients((prev) =>
                              prev.map((p) => (p.patientId === r.patientId ? { ...p, note } : p))
                            );
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        {icon}
      </div>
      <p className="mt-3 font-heading text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function HourlyRateCard({
  profileId,
  hourlyRate,
  discountPercent,
  couponCode,
  couponDiscountAmount,
  minHourlyRate,
  onSaved,
}: {
  profileId: string;
  hourlyRate: number | null;
  discountPercent: number;
  couponCode: string;
  couponDiscountAmount: number;
  minHourlyRate: number;
  onSaved: (rate: number, discount: number, coupon: string, couponAmount: number) => void;
}) {
  const [value, setValue] = useState(hourlyRate ? String(hourlyRate) : "");
  const [discountValue, setDiscountValue] = useState(String(discountPercent || 0));
  const [couponValue, setCouponValue] = useState(couponCode);
  const [couponAmountValue, setCouponAmountValue] = useState(String(couponDiscountAmount || 0));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rateNum = Number(value) || 0;
  const discountNum = Math.min(Math.max(Number(discountValue) || 0, 0), 100);
  const couponAmountNum = Number(couponAmountValue) || 0;
  const afterDiscount = Math.round(rateNum * (1 - discountNum / 100));
  const finalRate = roundToNearest1000(
    couponValue.trim() ? Math.max(0, afterDiscount - couponAmountNum) : afterDiscount
  );

  async function handleSave() {
    if (!rateNum || rateNum <= 0) return;
    if (minHourlyRate > 0 && rateNum < minHourlyRate) {
      setError(`Tarif tidak boleh di bawah ${formatIDR(minHourlyRate)} (batas minimum dari admin).`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateProfessionalPricing(profileId, rateNum, discountNum, couponValue, couponAmountNum);
      setSaved(true);
      onSaved(
        roundUpTo1000(rateNum),
        discountNum,
        couponValue.trim() ? couponValue.trim().toUpperCase() : "",
        couponAmountNum
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan tarif.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <PenLine size={20} />
        </span>
        <div>
          <h2 className="font-heading text-sm font-semibold text-slate-900">
            Tarif & Diskon Konsultasi per Jam
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Sebagai Psikolog Profesional, pasien membayar langsung sesuai tarif (dikurangi diskon &
            kupon jika ada) yang kamu tentukan di sini.
            {minHourlyRate > 0 && ` Tarif minimum yang ditetapkan admin: ${formatIDR(minHourlyRate)}.`}
          </p>
        </div>
      </div>

      {hourlyRate && (
        <div className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm">
          <span className="text-slate-500">Tarif aktif saat ini: </span>
          <strong className="text-slate-900">{formatIDR(hourlyRate)}/jam</strong>
          {discountPercent > 0 && <span className="text-emerald-600"> (diskon {discountPercent}%)</span>}
          {couponCode && (
            <span className="text-emerald-600">
              {" "}
              &middot; kupon {couponCode} -{formatIDR(couponDiscountAmount)}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tarif per jam</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className="text-sm text-slate-500">Rp</span>
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSaved(false);
                setError(null);
              }}
              placeholder="250000"
              className="w-28 text-sm outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Diskon</label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="number"
              min={0}
              max={100}
              value={discountValue}
              onChange={(e) => {
                setDiscountValue(e.target.value);
                setSaved(false);
              }}
              placeholder="0"
              className="w-16 text-sm outline-none"
            />
            <span className="text-sm text-slate-400">%</span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !value}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saved ? "Tersimpan" : "Simpan"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Kode Kupon Diskon (opsional)
          </label>
          <input
            value={couponValue}
            onChange={(e) => {
              setCouponValue(e.target.value.toUpperCase());
              setSaved(false);
            }}
            placeholder="PROMO50K"
            className="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nilai Kupon (Rp)</label>
          <input
            type="number"
            min={0}
            value={couponAmountValue}
            onChange={(e) => {
              setCouponAmountValue(e.target.value);
              setSaved(false);
            }}
            placeholder="50000"
            className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        Tarif otomatis dibulatkan ke atas ke kelipatan Rp1.000 saat disimpan (untuk gateway
        Lynk.id).
      </p>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {!error && (discountNum > 0 || couponValue.trim()) && rateNum > 0 && (
        <p className="mt-2 text-xs text-slate-600">
          Pasien akan membayar <strong>{formatIDR(finalRate)}</strong> per jam setelah diskon
          {couponValue.trim() ? " + kupon" : ""}.
        </p>
      )}
    </div>
  );
}

function RegistrationPanel({
  status,
  requirements,
  submissions,
  answeredCount,
  profileId,
  onSaved,
}: {
  status: "pending" | "rejected";
  requirements: VerificationRequirement[];
  submissions: SubmissionAnswer[];
  answeredCount: number;
  profileId: string;
  onSaved: () => void;
}) {
  const total = requirements.length;
  const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const allDone = total > 0 && answeredCount === total;

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          {status === "rejected" ? <ShieldAlert size={20} /> : <Clock size={20} />}
        </span>
        <div>
          <h2 className="font-heading text-sm font-semibold text-slate-900">
            {status === "rejected" ? "Pendaftaran Ditangguhkan" : "Lengkapi Pendaftaran"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {status === "rejected"
              ? "Admin menangguhkan akun ini. Perbarui data di bawah lalu hubungi admin untuk ditinjau ulang."
              : "Isi semua syarat berikut supaya akunmu bisa diverifikasi admin dan mulai menerima pasien."}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs font-medium text-slate-600">
          <span>Progres</span>
          <span>
            {answeredCount}/{total} syarat
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white">
          <div
            className={`h-full rounded-full ${allDone ? "bg-emerald-500" : "bg-gradient-to-r from-sky-600 to-teal-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {allDone && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-700">
            <Check size={13} /> Semua syarat terisi — menunggu ditinjau admin.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {requirements.map((r) => {
          const answer = submissions.find((a) => a.requirementId === r.id);
          return (
            <RequirementInput
              key={r.id}
              requirement={r}
              answer={answer}
              profileId={profileId}
              onSaved={onSaved}
            />
          );
        })}
        {requirements.length === 0 && (
          <p className="text-xs text-slate-500">
            Admin belum menambahkan syarat pendaftaran. Silakan tunggu instruksi lebih lanjut.
          </p>
        )}
      </div>
    </div>
  );
}

function RequirementInput({
  requirement,
  answer,
  profileId,
  onSaved,
}: {
  requirement: VerificationRequirement;
  answer: SubmissionAnswer | undefined;
  profileId: string;
  onSaved: () => void;
}) {
  const [text, setText] = useState(answer?.textValue ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDone = !!(answer?.textValue || answer?.filePath);

  async function handleSaveText() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await submitTextAnswer(profileId, requirement.id, text.trim());
      setSaved(true);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      await submitPhotoAnswer(profileId, requirement.id, file);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">
          {requirement.label} {requirement.isRequired && <span className="text-red-500">*</span>}
        </p>
        {isDone && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <Check size={12} /> Terisi
          </span>
        )}
      </div>
      {requirement.description && (
        <p className="mt-0.5 text-[11px] text-slate-400">{requirement.description}</p>
      )}

      {requirement.inputType === "text" ? (
        <div className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            placeholder="Isi jawaban..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-teal-500"
          />
          <button
            onClick={handleSaveText}
            disabled={saving || !text.trim()}
            className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving && <Loader2 size={11} className="animate-spin" />}
            {saved ? "Tersimpan" : "Simpan"}
          </button>
        </div>
      ) : (
        <div className="mt-2">
          {answer?.filePath && (
            <p className="mb-1.5 flex items-center gap-1 text-[11px] text-slate-500">
              <ImageIconOutline size={12} /> Sudah diunggah, unggah lagi untuk mengganti.
            </p>
          )}
          <label className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-400 hover:text-teal-600">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {saving ? "Mengunggah..." : "Unggah foto/dokumen"}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={saving}
            />
          </label>
        </div>
      )}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function NoteEditor({
  initialNote,
  onSave,
}: {
  initialNote: string;
  onSave: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(initialNote === "Belum ada catatan." ? "" : initialNote);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-3">
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        rows={3}
        placeholder="Tulis catatan rekam medis untuk pasien ini..."
        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 outline-none focus:border-teal-500"
      />
      <button
        onClick={async () => {
          setSaving(true);
          await onSave(note);
          setSaving(false);
          setSaved(true);
        }}
        disabled={saving || !note.trim()}
        className="mt-2 flex items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {saving && <Loader2 size={12} className="animate-spin" />}
        {saved ? "Tersimpan" : "Simpan Catatan"}
      </button>
    </div>
  );
}
