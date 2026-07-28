"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useRequireAuth } from "@/lib/useAuth";
import {
  fetchTodaySchedule,
  fetchMyPatients,
  setOnlineStatus,
  fetchIsOnline,
  fetchMyVerificationStatus,
  fetchVerificationRequirements,
  fetchMySubmissions,
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
  const { profile, loading: authLoading } = useRequireAuth(["psychologist"]);
  const [online, setOnline] = useState(true);
  const [openRecord, setOpenRecord] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<AppointmentView[]>([]);
  const [patients, setPatients] = useState<PatientRecordView[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "rejected">(
    "pending"
  );
  const [requirements, setRequirements] = useState<VerificationRequirement[]>([]);
  const [mySubmissions, setMySubmissions] = useState<SubmissionAnswer[]>([]);

  useEffect(() => {
    if (!profile) return;
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  function reloadAll() {
    if (!profile) return;
    Promise.all([
      fetchTodaySchedule(profile.id),
      fetchMyPatients(profile.id),
      fetchIsOnline(profile.id),
      fetchMyVerificationStatus(profile.id),
      fetchVerificationRequirements(),
      fetchMySubmissions(profile.id),
    ]).then(([sched, pts, isOnline, verifStatus, reqs, subs]) => {
      setSchedule(sched);
      setPatients(pts);
      setOnline(isOnline);
      setVerificationStatus(verifStatus);
      setRequirements(reqs);
      setMySubmissions(subs);
      setLoading(false);
    });
  }

  async function toggleOnline() {
    if (!profile || verificationStatus !== "verified") return;
    const next = !online;
    setOnline(next);
    await setOnlineStatus(profile.id, next);
  }

  const answeredCount = requirements.filter((r) =>
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900">
              Halo, {profile.full_name?.split(" ")[0] ?? "Psikolog"}
            </h1>
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
            requirements={requirements}
            submissions={mySubmissions}
            answeredCount={answeredCount}
            profileId={profile.id}
            onSaved={reloadAll}
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
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{a.patientName}</p>
                        <p className="text-xs text-slate-500">
                          {a.time} &middot; {a.durationMinutes} menit
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scheduleStatusStyle[a.status]}`}
                      >
                        {a.status}
                      </span>
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
