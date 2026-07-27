"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Users, Star, Wallet2, FileText, Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useRequireAuth } from "@/lib/useAuth";
import {
  fetchTodaySchedule,
  fetchMyPatients,
  setOnlineStatus,
  fetchIsOnline,
  addMedicalRecord,
  AppointmentView,
  PatientRecordView,
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

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      fetchTodaySchedule(profile.id),
      fetchMyPatients(profile.id),
      fetchIsOnline(profile.id),
    ]).then(([sched, pts, isOnline]) => {
      setSchedule(sched);
      setPatients(pts);
      setOnline(isOnline);
      setLoading(false);
    });
  }, [profile]);

  async function toggleOnline() {
    if (!profile) return;
    const next = !online;
    setOnline(next);
    await setOnlineStatus(profile.id, next);
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
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${online ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`}
            />
            {online ? "Online & Siap Konseling" : "Sedang Offline"}
          </button>
        </div>

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
