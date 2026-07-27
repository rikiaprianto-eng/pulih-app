"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { Psychologist } from "@/lib/data";
import { avatarUrl } from "@/lib/utils";

export default function PsychologistCard({ psy }: { psy: Psychologist }) {
  return (
    <div className="flex w-full flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100 transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <img
            src={avatarUrl(psy.avatarSeed)}
            alt={psy.name}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-white"
          />
          <span
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
              psy.online ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold text-slate-900">{psy.name}</p>
          <p className="text-xs text-slate-500">{psy.title}</p>
          <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-500">
            <Star size={13} fill="currentColor" strokeWidth={0} />
            {psy.rating.toFixed(1)}
            <span className="text-slate-400">({psy.reviewCount})</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {psy.specialties.map((s) => (
          <span
            key={s}
            className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <span
          className={`h-2 w-2 rounded-full ${psy.online ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`}
        />
        <span className={psy.online ? "font-medium text-emerald-600" : "text-slate-400"}>
          {psy.online ? "Online & Siap Konseling" : "Sedang Offline"}
        </span>
      </div>

      <Link
        href={psy.online ? `/session?psy=${psy.id}&name=${encodeURIComponent(psy.name)}` : "#"}
        aria-disabled={!psy.online}
        className={`mt-4 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
          psy.online
            ? "bg-gradient-to-r from-sky-600 to-teal-500 text-white shadow-sm hover:brightness-105"
            : "cursor-not-allowed bg-slate-100 text-slate-400"
        }`}
      >
        {psy.online ? "Mulai Sesi Sekarang" : "Jadwalkan Sesi"}
      </Link>
    </div>
  );
}
