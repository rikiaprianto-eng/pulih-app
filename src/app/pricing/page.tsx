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
import { paymentMethods, Package } from "@/lib/data";
import { formatIDR } from "@/lib/utils";
import { useAuth } from "@/lib/useAuth";
import { fetchPackages, createCheckout, fetchSiteSettings, createMidtransTransaction, SiteSettings } from "@/lib/queries";

type Step = "package" | "payment" | "success";

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

export default function PricingPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [step, setStep] = useState<Step>("package");
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [selectedMethod, setSelectedMethod] = useState(paymentMethods[0]);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const useMidtrans = settings?.paymentGateway === "midtrans" && !!settings.midtransClientKey;

  useEffect(() => {
    Promise.all([fetchPackages(), fetchSiteSettings()]).then(([pkgs, s]) => {
      setPackages(pkgs);
      setSettings(s);
      setLoadingPackages(false);
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

  function choosePackage(pkg: Package) {
    setSelectedPkg(pkg);
    setStep("payment");
  }

  async function pay() {
    if (!selectedPkg) return;
    if (!profile) {
      router.push("/login");
      return;
    }
    setPayError(null);
    setProcessing(true);

    if (useMidtrans) {
      try {
        const { token } = await createMidtransTransaction(selectedPkg.id);
        if (!window.snap) throw new Error("Midtrans belum siap, coba lagi sebentar.");
        window.snap.pay(token, {
          onSuccess: () => setStep("success"),
          onPending: () => setStep("success"),
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
      await createCheckout(profile.id, selectedPkg, selectedMethod.name);
      setStep("success");
    } catch {
      setPayError("Gagal memproses pembayaran. Coba lagi.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex-1 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          {step === "package" && (
            <>
              <div className="mx-auto max-w-2xl text-center">
                <span className="text-sm font-semibold uppercase tracking-wide text-teal-600">
                  Harga
                </span>
                <h1 className="mt-2 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
                  Pilih paket konseling yang sesuai
                </h1>
                <p className="mt-3 text-slate-500">
                  Semua paket termasuk sesi video privat dengan psikolog berlisensi.
                </p>
              </div>

              {loadingPackages ? (
                <div className="mt-10 flex justify-center py-10">
                  <Loader2 className="animate-spin text-teal-600" size={24} />
                </div>
              ) : (
              <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative flex flex-col rounded-3xl border bg-white p-7 ${
                      pkg.highlight
                        ? "border-teal-500 shadow-lg shadow-teal-100"
                        : "border-slate-100 shadow-sm"
                    }`}
                  >
                    {pkg.badge && (
                      <span
                        className={`absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-semibold ${
                          pkg.highlight
                            ? "bg-teal-600 text-white"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {pkg.badge}
                      </span>
                    )}
                    <h3 className="font-heading text-lg font-semibold text-slate-900">
                      {pkg.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{pkg.description}</p>

                    <div className="mt-5">
                      {pkg.originalPrice && (
                        <span className="mr-2 text-sm text-slate-400 line-through">
                          {formatIDR(pkg.originalPrice)}
                        </span>
                      )}
                      <span className="font-heading text-3xl font-bold text-slate-900">
                        {formatIDR(pkg.price)}
                      </span>
                    </div>

                    <ul className="mt-5 space-y-2 text-sm text-slate-600">
                      <li className="flex items-center gap-2">
                        <Check size={15} className="text-teal-600" /> {pkg.sessionQuota}x sesi
                        konseling
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={15} className="text-teal-600" /> {pkg.durationMinutes} menit
                        per sesi
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={15} className="text-teal-600" /> Chat selama sesi berlangsung
                      </li>
                    </ul>

                    <button
                      onClick={() => choosePackage(pkg)}
                      className={`mt-7 rounded-full py-3 text-sm font-semibold transition ${
                        pkg.highlight
                          ? "bg-gradient-to-r from-sky-600 to-teal-500 text-white hover:brightness-105"
                          : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Pilih Paket
                    </button>
                  </div>
                ))}
              </div>
              )}
            </>
          )}

          {step === "payment" && selectedPkg && (
            <div>
              <button
                onClick={() => setStep("package")}
                className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft size={15} /> Kembali pilih paket
              </button>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-6">
                    {useMidtrans ? (
                      <>
                        <h2 className="font-heading text-base font-semibold text-slate-900">
                          Pembayaran Otomatis
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                          Klik &ldquo;Bayar Sekarang&rdquo; — jendela pembayaran Midtrans akan
                          terbuka dengan pilihan QRIS, Virtual Account, dan e-Wallet. Status
                          pembayaranmu akan terverifikasi otomatis begitu selesai.
                        </p>
                        {settings?.bankName && (
                          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                            Transfer manual juga tersedia ke {settings.bankName} a.n.{" "}
                            {settings.bankAccountHolder} ({settings.bankAccountNumber}).
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <h2 className="font-heading text-base font-semibold text-slate-900">
                          Pilih Metode Pembayaran
                        </h2>

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
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=PULIH-DUMMY-QR-${selectedPkg.id}`}
                              alt="QRIS dummy"
                              className="h-48 w-48"
                            />
                            <p className="mt-3 text-center text-xs text-slate-500">
                              Scan kode QR di atas menggunakan aplikasi mobile banking atau
                              e-wallet favoritmu. (QR demo)
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
                              Transfer melalui {selectedMethod.name} sebelum 24 jam. (Nomor demo)
                            </p>
                          </div>
                        )}

                        {selectedMethod.category === "ewallet" && (
                          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                            <p className="text-sm text-slate-600">
                              Kamu akan diarahkan ke aplikasi {selectedMethod.name} untuk
                              menyelesaikan pembayaran. (Simulasi demo)
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
                      Ringkasan Pesanan
                    </h2>
                    <div className="mt-4 flex justify-between text-sm">
                      <span className="text-slate-500">{selectedPkg.name}</span>
                      <span className="font-medium text-slate-800">
                        {formatIDR(selectedPkg.price)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-slate-500">Biaya layanan</span>
                      <span className="font-medium text-slate-800">Rp0</span>
                    </div>
                    <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-sm font-semibold">
                      <span className="text-slate-900">Total</span>
                      <span className="text-teal-700">{formatIDR(selectedPkg.price)}</span>
                    </div>

                    {payError && (
                      <p className="mt-4 text-center text-sm text-red-600">{payError}</p>
                    )}
                    <button
                      onClick={pay}
                      disabled={processing}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-3 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {processing && <Loader2 size={16} className="animate-spin" />}
                      {processing ? "Memproses pembayaran..." : "Bayar Sekarang"}
                    </button>
                    <p className="mt-3 text-center text-[11px] text-slate-400">
                      {profile
                        ? "Simulasi metode pembayaran, tapi transaksi & langgananmu tersimpan sungguhan."
                        : "Kamu akan diminta masuk terlebih dahulu sebelum membayar."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "success" && selectedPkg && (
            <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={34} />
              </div>
              <h2 className="mt-5 font-heading text-xl font-bold text-slate-900">
                Pembayaran Berhasil!
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {selectedPkg.name} telah aktif di akunmu. Kamu sekarang bisa mulai sesi konseling.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 py-3 text-sm font-semibold text-white"
              >
                Ke Dashboard
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
