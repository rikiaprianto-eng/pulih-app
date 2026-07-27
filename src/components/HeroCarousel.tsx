"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/data";

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % banners.length);
  }, [banners.length]);

  const prev = () => {
    setIndex((i) => (i - 1 + banners.length) % banners.length);
  };

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(next, 5500);
    return () => clearInterval(timer);
  }, [next, banners.length]);

  if (banners.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-slate-900">
      <div className="relative h-[380px] w-full sm:h-[440px] lg:h-[500px]">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <img
              src={banner.image}
              alt={banner.title}
              className="h-full w-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} opacity-80`} />
            <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-6 sm:px-8 lg:px-12">
              <div className="max-w-xl animate-fade-in">
                <span className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Pulih
                </span>
                <h1 className="font-heading text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
                  {banner.title}
                </h1>
                <p className="mt-3 text-sm text-white/90 sm:text-base">
                  {banner.subtitle}
                </p>
                <Link
                  href={banner.href}
                  className="mt-6 inline-flex w-fit items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-105"
                >
                  {banner.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={prev}
        aria-label="Sebelumnya"
        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-white/30"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Berikutnya"
        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-white/30"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {banners.map((banner, i) => (
          <button
            key={banner.id}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
