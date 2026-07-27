import { ReactNode } from "react";
import { Star, ShieldCheck, HeartHandshake } from "lucide-react";
import Logo from "./Logo";

export default function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-1/2 lg:px-16">
        <Logo />
        <div className="mx-auto w-full max-w-sm flex-1 pt-10">
          <h1 className="font-heading text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-sky-700 via-sky-600 to-teal-500 lg:flex">
        <div className="relative z-10 flex flex-1 flex-col justify-center px-16 text-white">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <HeartHandshake size={28} />
          </span>
          <h2 className="mt-6 font-heading text-3xl font-bold leading-tight">
            Kesehatan mentalmu, prioritas kami.
          </h2>
          <p className="mt-3 max-w-sm text-white/85">
            Terhubung dengan psikolog berlisensi, kapan saja kamu membutuhkannya.
          </p>

          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <ShieldCheck size={20} />
              <p className="text-sm text-white/90">Data & rekam medis terenkripsi dan rahasia</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <Star size={20} fill="currentColor" strokeWidth={0} />
              <p className="text-sm text-white/90">Rating rata-rata psikolog 4.8/5 dari 12.000+ sesi</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
