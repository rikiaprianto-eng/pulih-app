"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Video,
  ShieldCheck,
  CalendarClock,
  Lock,
  Users,
  Wallet,
  Star,
  Calendar,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroCarousel from "@/components/HeroCarousel";
import PsychologistCard from "@/components/PsychologistCard";
import { features, testimonials } from "@/lib/data";
import type { Banner, Psychologist, EventItem } from "@/lib/data";
import { avatarUrl } from "@/lib/utils";
import { fetchBanners, fetchPsychologists, fetchEvents } from "@/lib/queries";

const iconMap = {
  Video,
  ShieldCheck,
  CalendarClock,
  Lock,
  Users,
  Wallet,
} as const;

export default function Home() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBanners(), fetchPsychologists(), fetchEvents()]).then(
      ([b, p, e]) => {
        setBanners(b);
        setPsychologists(p);
        setEvents(e);
        setLoading(false);
      }
    );
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex-1">
        {loading ? (
          <div className="flex h-[380px] items-center justify-center bg-slate-50 sm:h-[440px] lg:h-[500px]">
            <Loader2 className="animate-spin text-teal-600" size={28} />
          </div>
        ) : (
          <HeroCarousel banners={banners} />
        )}

        {/* Trust bar */}
        <section className="border-b border-slate-100 bg-white py-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 text-sm text-slate-500 sm:px-6 lg:px-8">
            <span className="font-semibold text-slate-700">Dipercaya oleh:</span>
            <span>12.000+ Pengguna Aktif</span>
            <span>250+ Psikolog Berlisensi</span>
            <span>★ 4.8/5 Rating Pengguna</span>
          </div>
        </section>

        {/* Features */}
        <section id="fitur" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-teal-600">
              Fitur
            </span>
            <h2 className="mt-2 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
              Semua yang kamu butuhkan untuk pulih
            </h2>
            <p className="mt-3 text-slate-500">
              Layanan konseling psikologi yang aman, profesional, dan mudah diakses.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = iconMap[f.icon as keyof typeof iconMap];
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-100 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 font-heading text-base font-semibold text-slate-900">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Psikolog aktif */}
        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-sm font-semibold uppercase tracking-wide text-teal-600">
                  Psikolog Aktif
                </span>
                <h2 className="mt-2 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
                  Siap membantumu sekarang
                </h2>
              </div>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
              >
                Lihat semua psikolog <ArrowRight size={16} />
              </Link>
            </div>

            {loading ? (
              <div className="mt-8 flex justify-center py-10">
                <Loader2 className="animate-spin text-teal-600" size={24} />
              </div>
            ) : psychologists.length === 0 ? (
              <p className="mt-8 text-sm text-slate-400">
                Belum ada psikolog terdaftar. Daftar sebagai psikolog untuk jadi yang pertama!
              </p>
            ) : (
              <div className="mt-8 flex gap-4 overflow-x-auto pb-4 no-scrollbar sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
                {psychologists.slice(0, 6).map((psy) => (
                  <div key={psy.id} className="w-72 shrink-0 sm:w-auto">
                    <PsychologistCard psy={psy} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Events */}
        <section id="events" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <span className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            Event
          </span>
          <h2 className="mt-2 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
            Webinar & Support Group Terdekat
          </h2>

          {!loading && events.length === 0 ? (
            <p className="mt-8 text-sm text-slate-400">Belum ada event terjadwal.</p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-100"
                >
                  <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {e.type}
                  </span>
                  <h3 className="mt-3 font-heading text-base font-semibold text-slate-900">
                    {e.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Bersama {e.speaker}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={15} className="text-teal-600" />
                    {e.date}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Sisa kuota: {e.quotaLeft}</p>
                  <button className="mt-5 rounded-full border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50">
                    Daftar Event
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Testimonials */}
        <section className="bg-gradient-to-br from-sky-50 to-teal-50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold uppercase tracking-wide text-teal-600">
                Testimoni
              </span>
              <h2 className="mt-2 font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
                Kata mereka tentang Pulih
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.id} className="rounded-2xl bg-white p-6 shadow-sm shadow-slate-100">
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < t.rating ? "currentColor" : "none"}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-sm italic text-slate-600">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    <img
                      src={avatarUrl(t.name)}
                      alt={t.name}
                      className="h-9 w-9 rounded-full"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-700 to-teal-600 px-8 py-14 text-center shadow-lg">
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">
              Mulai langkah pertamamu menuju pulih
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/90">
              Daftar sekarang dan terhubung dengan psikolog berlisensi dalam hitungan menit.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-flex items-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-105"
            >
              Daftar Gratis
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
