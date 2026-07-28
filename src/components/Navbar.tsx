"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "@/lib/useAuth";
import { signOut, roleHome } from "@/lib/auth";

const navLinks = [
  { label: "Fitur", href: "/#fitur" },
  { label: "Event", href: "/#events" },
  { label: "Harga", href: "/pricing" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { profile, loading } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    setOpen(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Logo />

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition hover:text-teal-600"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {loading ? null : profile ? (
            <>
              <Link
                href={roleHome(profile.role)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Beranda
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition hover:brightness-105"
              >
                <LogOut size={14} /> Keluar
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Masuk
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition hover:brightness-105"
              >
                Daftar
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 md:hidden"
          aria-label="Buka menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {profile ? (
                <>
                  <Link
                    href={roleHome(profile.role)}
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700"
                  >
                    Beranda
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-center text-sm font-semibold text-white"
                  >
                    <LogOut size={14} /> Keluar
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-gradient-to-r from-sky-600 to-teal-500 px-4 py-2 text-center text-sm font-semibold text-white"
                  >
                    Daftar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
