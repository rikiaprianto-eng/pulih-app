"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video as VideoIcon, CameraOff, PhoneOff, Loader2 } from "lucide-react";
import { avatarUrl } from "@/lib/utils";
import { useRequireAuth } from "@/lib/useAuth";
import { endSession } from "@/lib/queries";
import { useCallRoom } from "@/lib/useCallRoom";

export default function PsikologSesiPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useRequireAuth(["psychologist"]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("Pasien Pulih");
  const [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const call = useCallRoom(sessionId, false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("sessionId");
    const name = params.get("patientName");
    if (id) setSessionId(id);
    if (name) setPatientName(name);
  }, []);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = call.localStream;
  }, [call.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  useEffect(() => {
    if (call.status === "ended") setEnded(true);
  }, [call.status]);

  useEffect(() => {
    if (ended) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [ended]);

  function handleEnd() {
    call.hangup();
    if (sessionId) endSession(sessionId, "completed");
    setEnded(true);
  }

  function formatTime(total: number) {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-center text-white">
        <p className="text-sm text-white/60">Sesi tidak ditemukan.</p>
        <button
          onClick={() => router.push("/psikolog")}
          className="text-sm font-semibold text-teal-400 hover:text-teal-300"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <PhoneOff size={24} />
          </div>
          <h2 className="mt-4 font-heading text-lg font-bold text-slate-900">
            Sesi Telah Berakhir
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Sesi konseling dengan {patientName} telah selesai.
          </p>
          <button
            onClick={() => router.push("/psikolog")}
            className="mt-7 w-full rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-3 text-sm font-semibold text-white"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col bg-slate-950 text-white">
      <div className="relative flex-1 overflow-hidden">
        {call.status === "connected" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="flex flex-col items-center px-4 text-center">
              <img
                src={avatarUrl(patientName)}
                alt={patientName}
                className="h-32 w-32 rounded-full ring-4 ring-white/10"
              />
              <p className="mt-4 font-heading text-lg font-semibold">{patientName}</p>
              {call.status === "media-error" ? (
                <p className="mt-2 max-w-xs text-sm text-orange-300">
                  Tidak bisa mengakses kamera/mikrofon. Izinkan akses di pengaturan browser lalu
                  muat ulang halaman.
                </p>
              ) : (
                <p className="mt-2 flex items-center gap-2 text-sm text-white/60">
                  <Loader2 size={14} className="animate-spin" />
                  {call.status === "requesting-media"
                    ? "Menyiapkan kamera & mikrofon..."
                    : "Menyambungkan ke pasien..."}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
          <div className="rounded-full bg-black/30 px-4 py-1.5 text-xs font-medium backdrop-blur">
            Sesi Konseling &middot; {patientName}
          </div>
          <div className="rounded-full bg-black/30 px-4 py-1.5 text-sm font-bold tabular-nums backdrop-blur">
            {formatTime(elapsed)}
          </div>
        </div>

        <div className="absolute bottom-24 right-4 z-10 flex h-32 w-24 items-center justify-center overflow-hidden rounded-xl bg-slate-800 shadow-lg ring-1 ring-white/10 sm:h-40 sm:w-32">
          {call.localStream && call.camOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
          ) : (
            <CameraOff size={20} className="text-white/40" />
          )}
          <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px]">
            Kamu
          </span>
        </div>
      </div>

      <div className="z-10 flex items-center justify-center gap-3 bg-slate-900/80 py-4 backdrop-blur">
        <ControlButton active={call.micOn} onClick={call.toggleMic}>
          {call.micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </ControlButton>
        <ControlButton active={call.camOn} onClick={call.toggleCam}>
          {call.camOn ? <VideoIcon size={20} /> : <CameraOff size={20} />}
        </ControlButton>
        <button
          onClick={handleEnd}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
          aria-label="Akhiri Sesi"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
        active ? "bg-white/15 text-white hover:bg-white/25" : "bg-white/5 text-white/40"
      }`}
    >
      {children}
    </button>
  );
}
