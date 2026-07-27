"use client";

import { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { fetchSiteSettings } from "@/lib/queries";

export default function Logo({ className = "" }: { className?: string }) {
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    fetchSiteSettings().then((s) => setLogoUrl(s.logoUrl));
  }, []);

  return (
    <Link
      href="/"
      className={`flex items-center gap-2 font-heading font-bold text-xl text-slate-900 ${className}`}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="Pulih" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white shadow-sm">
          <HeartHandshake size={20} strokeWidth={2.2} />
        </span>
      )}
      Pulih
    </Link>
  );
}
