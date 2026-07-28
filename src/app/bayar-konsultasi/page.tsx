"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  QrCode,
  Building2,
  Wallet,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { paymentMethods } from "@/lib/data";
import type { Psychologist } from "@/lib/data";
import { formatIDR, avatarUrl } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
import {
  fetchPsychologistById,
  fetchSiteSettings,
  createDirectCheckout,
  createDirectMidtransTransaction,
  createPendingLynkTransaction,
  fetchTransactionStatus,
  effectiveHourlyRate,
  applyCoupon,
  SiteSettings,
} from "@/lib/queries";
import { setRedirectAfterLogin } from "@/lib/auth";

type Step = "loading" | "payment" | "success" | "notfound";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export default function BayarKonsultasiPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();

  const [psy, setPsy] = useState<Psychologist | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [selectedMethod, setSelectedMethod] = useState(paymentMethods[0]);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paidTransactionId, setPaidTransactionId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [waitingLynk, setWaitingLynk] = useState(false);

  const useMidtrans = settings?.paymentGateway === "midtrans" && !!settings.midtransClientKey;
  const useLynkid = settings?.paymentGateway === "lynkid";

  useEffect(() => {
    const psyId = new URLSearchParams(window.location.search).get("psy");
    if (!psyId) {
      setStep("notfound");
      return;
    }
    Promise.all([fetchPsychologistById(psyId), fetchSiteSettings()]).then(([p, s]) => {
      setSettings(s);
      if (!p || p.category !== "profesional" || !p.hourlyRate) {
        setStep("notfound");
        return;
      }
      setPsy(p);
      setStep("payment");
    });
  }, []);

  useEffect(() => {
    if (!settings?.midtransClientKey || settings.paymentGateway !== "midtrans") return;
    if (document.getElementById("midtrans-snap-script")) return;
    const script = document.createElement("script");
    script.id = "midtrans-snap-script";
    script.src = settings.midtransIsProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", settings.midtransClientKey);
    document.body.appendChild(script);
  }, [settings]);

  const afterDiscountRate = psy ? effectiveHourlyRate(psy) : 0;
  const finalRate = psy ? applyCoupon(afterDiscountRate, appliedCoupon ?? "", psy.couponCode, psy.couponDiscountAmount) : 0;
  const hasDiscount = !!psy && psy.discountPercent > 0;
  const couponApplied = !!appliedCoupon && finalRate < afterDiscountRate;

  function applyCouponCode() {
    if (!psy) return;
    setCouponError(null);
    if (!couponInput.trim()) return;
    const testResult = applyCoupon(afterDiscountRate, couponInput, psy.couponCode, psy.couponDiscountAmount);
    if (testResult === afterDiscountRate) {
      setCouponError("Kode kupon tidak valid.");
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon(couponInput.trim());
  }

  async function pay() {
    if (!psy || !psy.hourlyRate) return;
    if (!profile) {
      setRedirectAfterLogin(`/bayar-konsultasi?psy=${psy.id}`);
      router.push("/login");
      return;
    }
    setPayError(null);
    setProcessing(true);

    if (useLynkid) {
      if (!psy.lynkidUrl) {
        setPayError("Psikolog ini belum mengatur link pembayaran Lynk.id.");
        setProcessing(false);
        return;
      }
      try {
        const txId = await createPendingLynkTransaction(profile.id, {
          psychologistId: psy.id,
          amount: finalRate,
        });
        window.open(psy.lynkidUrl, "_blank", "noopener,noreferrer");
        setWaitingLynk(true);
        setProcessing(false);
        const poll = setInterval(async () => {
          const status = await fetchTransactionStatus(txId);
          if (status === "paid") {
            clearInterval(poll);
            setWaitingLynk(false);
            setPaidTransactionId(txId);
            setStep("success");
          }
        }, 4000);
      } catch {
        setPayError("Gagal menyiapkan pembayaran Lynk.id. Coba lagi.");
        setProcessing(false);
      }
      return;
    }

    if (useMidtrans) {
      try {
        const { token, transactionId } = await createDirectMidtransTransaction(psy.id, appliedCoupon ?? "");
        if (!window.snap) throw new Error("Midtrans belum siap, coba lagi sebentar.");
        window.snap.pay(token, {
          onSuccess: () => {
            setPaidTransactionId(transactionId);
            setStep("success");
          },
          onPending: () => {
            setPaidTransactionId(transactionId);
            setStep("success");
          },
          onError: () => setPayError("Pembayaran gagal. Coba lagi."),
          onClose: () => setProcessing(false),
        });
      } catch (err) {
        setPayError(err instanceof Error ? err.message : "Gagal memulai pembayaran.");
        setProcessing(false);
      }
      return;
    }

    try {
      const transactionId = await createDirectCheckout(
        profile.id,
        psy,
        selectedMethod.name,
        appliedCoupon ?? ""
      );
      setPaidTransactionId(transactionId);
      setStep("success");
    } catch {
      setPayError("Gagal memproses pembayaran. Coba lagi.");
    } finally {
      setProcessing(false);
    }
  }

  if (authLoading || step === "loading") {
    return (
      <div className="flex min-h-full flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center bg-slate-50 py-20">
          <Loader2 className="animate-spin text-teal-600" size={28} />
        </main>
        <Footer />
      </div>
    );
  }

  if (step === "notfound" || !psy) {
    return (
      <div className="flex min-h-full flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50 px-4 py-20 text-center">
          <p className="text-sm font-medium text-slate-600">
            Psikolog tidak ditemukan atau belum menentukan tarif konsultasi.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            Kembali ke Dashboard
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {step === "payment" && (
            <div>
              <button
                onClick={() => router.back()}
                className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft size={15} /> Kembali
              </button>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-6">
                    {useLynkid ? (
                      <>
                        <h2 className="font-heading text-base font-semibold text-slate-900">
                          Pembayaran via Lynk.id
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                          Klik &ldquo;Bayar Sekarang&rdquo; — halaman pembayaran Lynk.id akan
                          terbuka di tab baru. Setelah pembayaran selesai, halaman ini otomatis
                          mendeteksi dan sesi konsultasimu langsung siap dimulai.
                        </p>
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                          Penting: saat mengisi data pembeli di Lynk.id, gunakan email yang sama
                          dengan akun Pulih-mu ({profile?.email ?? "email akunmu"}) supaya
                          pembayaran otomatis terhubung.
                        </div>
                        {waitingLynk && (
                          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-teal-50 p-4 text-sm text-teal-700">
                            <Loader2 size={16} className="animate-spin" />
                            Menunggu konfirmasi pembayaran dari Lynk.id...
                          </div>
                        )}
                      </>
                    ) : useMidtrans ? (
                      <>
                        <h2 className="font-heading text-base font-semibold text-slate-900">
                          Pembayaran Otomatis
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                          Klik &ldquo;Bayar Sekarang&rdquo; — jendela pembayaran Midtrans akan
                          terbuka dengan pilihan QRIS, Virtual Account, dan e-Wallet. Sesi
                          konsultasimu langsung siap dimulai begitu pembayaran selesai.
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="font-heading text-base font-semibold text-slate-900">
                          Pilih Metode Pembayaran
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Gratis tanpa biaya tambahan — pembayaran dikonfirmasi otomatis, sesi
                          langsung siap dimulai.
                        </p>

                        <PaymentGroup
                          icon={<QrCode size={16} />}
                          label="QRIS"
                          methods={paymentMethods.filter((m) => m.category === "qris")}
                          selected={selectedMethod}
                          onSelect={setSelectedMethod}
                        />
                        <PaymentGroup
                          icon={<Building2 size={16} />}
                          label="Virtual Account"
                          methods={paymentMethods.filter((m) => m.category === "va")}
                          selected={selectedMethod}
                          onSelect={setSelectedMethod}
                        />
                        <PaymentGroup
                          icon={<Wallet size={16} />}
                          label="E-Wallet"
                          methods={paymentMethods.filter((m) => m.category === "ewallet")}
                          selected={selectedMethod}
                          onSelect={setSelectedMethod}
                        />

                        {selectedMethod.category === "qris" && (
                          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 p-6">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=PULIH-DUMMY-QR-${psy.id}`}
                              alt="QRIS dummy"
                              className="h-48 w-48"
                            />
                            <p className="mt-3 text-center text-xs text-slate-500">
                              Scan kode QR di atas menggunakan aplikasi mobile banking atau
                              e-wallet favoritmu, lalu klik &ldquo;Bayar Sekarang&rdquo; untuk
                              menyelesaikan.
                            </p>
                          </div>
                        )}

                        {selectedMethod.category === "va" && (
                          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                            <p className="text-xs text-slate-500">Nomor Virtual Account</p>
                            <p className="mt-1 font-heading text-xl font-bold tracking-wider text-slate-900">
                              {settings?.bankAccountNumber || "8808 8812 3456 7890"}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              Transfer melalui {selectedMethod.name}, lalu klik &ldquo;Bayar
                              Sekarang&rdquo; — status akan terkonfirmasi otomatis.
                            </p>
                          </div>
                        )}

                        {selectedMethod.category === "ewallet" && (
                          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                            <p className="text-sm text-slate-600">
                              Klik &ldquo;Bayar Sekarang&rdquo; untuk menyelesaikan pembayaran lewat{" "}
                              {selectedMethod.name} — status terkonfirmasi otomatis, tanpa biaya
                              tambahan.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-6">
                    <h2 className="font-heading text-base font-semibold text-slate-900">
                      Ringkasan Konsultasi
                    </h2>
                    <div className="mt-4 flex items-center gap-3">
                      <img
                        src={avatarUrl(psy.avatarSeed)}
                        alt={psy.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{psy.name}</p>
                        <p className="text-xs text-slate-500">{psy.title}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between text-sm">
                      <span className="text-slate-500">Tarif per jam</span>
                      <span className="font-medium text-slate-800">{formatIDR(psy.hourlyRate ?? 0)}</span>
                    </div>
                    {hasDiscount && (
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-slate-500">Diskon</span>
                        <span className="font-medium text-emerald-600">-{psy.discountPercent}%</span>
                      </div>
                    )}
                    {couponApplied && (
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-slate-500">Kupon {appliedCoupon}</span>
                        <span className="font-medium text-emerald-600">
                          -{formatIDR(afterDiscountRate - finalRate)}
                        </span>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Kode Kupon (opsional)
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          placeholder="PROMO50K"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                        />
                        <button
                          onClick={applyCouponCode}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Terapkan
                        </button>
                      </div>
                      {couponError && <p className="mt-1 text-[11px] text-red-600">{couponError}</p>}
                      {couponApplied && (
                        <p className="mt-1 text-[11px] text-emerald-600">Kupon berhasil diterapkan.</p>
                      )}
                    </div>

                    <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-sm font-semibold">
                      <span className="text-slate-900">Total</span>
                      <span className="text-teal-700">{formatIDR(finalRate)}</span>
                    </div>

                    {payError && <p className="mt-4 text-center text-sm text-red-600">{payError}</p>}
                    <button
                      onClick={pay}
                      disabled={processing || waitingLynk}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-3 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {(processing || waitingLynk) && <Loader2 size={16} className="animate-spin" />}
                      {waitingLynk
                        ? "Menunggu pembayaran Lynk.id..."
                        : processing
                          ? "Memproses pembayaran..."
                          : "Bayar Sekarang"}
                    </button>
                    <p className="mt-3 text-center text-[11px] text-slate-400">
                      {!profile
                        ? "Kamu akan diminta masuk terlebih dahulu sebelum membayar."
                        : "Pembayaran ini langsung mengunci sesi konsultasi 1-on-1 dengan psikolog ini."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={34} />
              </div>
              <h2 className="mt-5 font-heading text-xl font-bold text-slate-900">
                Pembayaran Berhasil!
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Konsultasimu dengan {psy.name} sudah siap dimulai.
              </p>
              <button
                onClick={() =>
                  router.push(
                    `/session?psy=${psy.id}&name=${encodeURIComponent(psy.name)}&tx=${paidTransactionId ?? ""}`
                  )
                }
                disabled={!paidTransactionId}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-3 text-sm font-semibold text-white disabled:opacity-70"
              >
                Mulai Sesi Sekarang
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PaymentGroup({
  icon,
  label,
  methods,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  methods: typeof paymentMethods;
  selected: (typeof paymentMethods)[number];
  onSelect: (m: (typeof paymentMethods)[number]) => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon} {label}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
              selected.id === m.id
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {m.name}
            {selected.id === m.id && <Check size={15} />}
          </button>
        ))}
      </div>
    </div>
  );
}

