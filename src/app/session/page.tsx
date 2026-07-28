"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MessageCircle,
  PhoneOff,
  Send,
  X,
  FastForward,
  Star,
  Loader2,
  CameraOff,
} from "lucide-react";
import { avatarUrl } from "@/lib/utils";
import { useRequireAuth } from "@/lib/useAuth";
import { startSession, endSession, extendSession } from "@/lib/queries";
import { useCallRoom, notifyIncomingCall } from "@/lib/useCallRoom";

const START_SECONDS = 45 * 60;
const WARNING_THRESHOLD = 10 * 60;

type ChatMessage = { id: number; sender: "me" | "psy"; text: string };

export default function SessionPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useRequireAuth(["patient"]);
  const [psyId, setPsyId] = useState<string | null>(null);
  const [psyName, setPsyName] = useState("Psikolog Pulih");
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(START_SECONDS);
  const [chatOpen, setChatOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extended, setExtended] = useState(false);
  const [rating, setRating] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, sender: "psy", text: "Halo! Terima kasih sudah bergabung. Ceritakan apa yang sedang kamu rasakan hari ini." },
  ]);
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const call = useCallRoom(dbSessionId, true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("psy");
    const name = params.get("name");
    if (id) setPsyId(id);
    if (name) setPsyName(name);
  }, []);

  useEffect(() => {
    if (!profile || !psyId || dbSessionId) return;
    startSession(profile.id, psyId).then((row) => {
      setDbSessionId(row.id);
      notifyIncomingCall(psyId, {
        sessionId: row.id,
        patientId: profile.id,
        patientName: profile.full_name ?? "Pasien Pulih",
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, psyId]);

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
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          setEnded(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [ended]);

  useEffect(() => {
    if (secondsLeft <= WARNING_THRESHOLD && !warningDismissed && !ended) {
      setShowWarning(true);
    }
  }, [secondsLeft, warningDismissed, ended]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  useEffect(() => {
    if (ended && dbSessionId) endSession(dbSessionId, "completed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  function formatTime(total: number) {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function skipToWarning() {
    setSecondsLeft(9 * 60 + 45);
  }

  function confirmExtend() {
    if (dbSessionId) extendSession(dbSessionId, 15);
    setSecondsLeft((s) => s + 15 * 60);
    setExtended(true);
    setShowExtendModal(false);
    setShowWarning(false);
    setWarningDismissed(true);
  }

  function sendMessage() {
    if (!draft.trim()) return;
    setMessages((m) => [...m, { id: Date.now(), sender: "me", text: draft.trim() }]);
    setDraft("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, sender: "psy", text: "Baik, saya dengarkan. Lanjutkan ceritanya ya." },
      ]);
    }, 1200);
  }

  const isWarningTime = secondsLeft <= WARNING_THRESHOLD;

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
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
            Terima kasih telah menggunakan waktu ini untuk dirimu sendiri. Sampai jumpa di sesi
            berikutnya.
          </p>

          <p className="mt-6 text-xs font-medium text-slate-500">Beri rating untuk sesi ini</p>
          <div className="mt-2 flex justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => setRating(i + 1)} aria-label={`Rating ${i + 1}`}>
                <Star
                  size={26}
                  className={i < rating ? "text-amber-400" : "text-slate-200"}
                  fill={i < rating ? "currentColor" : "none"}
                />
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push("/dashboard")}
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
      {/* Main video area */}
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
                src={avatarUrl(psyName)}
                alt={psyName}
                className="h-32 w-32 rounded-full ring-4 ring-white/10"
              />
              <p className="mt-4 font-heading text-lg font-semibold">{psyName}</p>
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
                    : "Menunggu psikolog bergabung..."}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
          <div className="rounded-full bg-black/30 px-4 py-1.5 text-xs font-medium backdrop-blur">
            Sesi Konseling &middot; {extended ? "Diperpanjang" : "Berlangsung"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={skipToWarning}
              className="hidden items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur hover:text-white sm:flex"
              title="Demo: percepat ke sisa 10 menit"
            >
              <FastForward size={12} /> Demo cepat
            </button>
            <div
              className={`rounded-full px-4 py-1.5 text-sm font-bold tabular-nums backdrop-blur transition-colors ${
                isWarningTime ? "bg-orange-500/90 text-white" : "bg-black/30 text-white"
              }`}
            >
              {formatTime(secondsLeft)}
            </div>
          </div>
        </div>

        {/* Self view */}
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
            <VideoOff size={20} className="text-white/40" />
          )}
          <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px]">
            Kamu
          </span>
        </div>

        {/* Warning toast */}
        {showWarning && !extended && (
          <div className="absolute bottom-28 left-1/2 z-20 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-white p-4 text-slate-800 shadow-xl animate-fade-in sm:bottom-24">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">
                Sesi Anda tersisa {Math.ceil(secondsLeft / 60)} menit. Ingin memperpanjang sesi?
              </p>
              <button onClick={() => setShowWarning(false)} aria-label="Tutup">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowExtendModal(true)}
                className="flex-1 rounded-lg bg-gradient-to-r from-sky-600 to-teal-500 py-2 text-xs font-semibold text-white"
              >
                Perpanjang Sesi
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="absolute bottom-24 right-4 top-16 z-20 flex w-80 max-w-[90vw] flex-col rounded-2xl bg-white text-slate-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Chat Sesi</p>
            <button onClick={() => setChatOpen(false)} aria-label="Tutup chat">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.sender === "me"
                    ? "ml-auto bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Tulis pesan..."
              className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
            <button
              onClick={sendMessage}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white"
              aria-label="Kirim"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="z-10 flex items-center justify-center gap-3 bg-slate-900/80 py-4 backdrop-blur">
        <ControlButton active={call.micOn} onClick={call.toggleMic}>
          {call.micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </ControlButton>
        <ControlButton active={call.camOn} onClick={call.toggleCam}>
          {call.camOn ? <VideoIcon size={20} /> : <CameraOff size={20} />}
        </ControlButton>
        <ControlButton active={chatOpen} onClick={() => setChatOpen((v) => !v)}>
          <MessageCircle size={20} />
        </ControlButton>
        <button
          onClick={() => {
            call.hangup();
            setEnded(true);
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
          aria-label="Akhiri Sesi"
        >
          <PhoneOff size={20} />
        </button>
      </div>

      {/* Extend modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-800">
            <h3 className="font-heading text-lg font-semibold">Perpanjang Sesi 15 Menit</h3>
            <p className="mt-1.5 text-sm text-slate-500">
              Pilih metode perpanjangan sesi tanpa memutus koneksi video.
            </p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => confirmExtend()}
                className="w-full rounded-xl border border-teal-500 bg-teal-50 px-4 py-3 text-left text-sm font-semibold text-teal-700"
              >
                Potong dari kuota langganan
                <span className="block text-xs font-normal text-teal-600">
                  Sisa kuota akan berkurang 1 sesi
                </span>
              </button>
              <button
                onClick={() => confirmExtend()}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700"
              >
                Bayar instan Rp49.000
                <span className="block text-xs font-normal text-slate-500">
                  Via metode pembayaran tersimpan
                </span>
              </button>
            </div>
            <button
              onClick={() => setShowExtendModal(false)}
              className="mt-4 w-full rounded-xl py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}
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
