"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import Logo from "./Logo";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/lib/useAuth";
import { avatarUrl } from "@/lib/utils";

export default function AppHeader({
  navItems,
}: {
  navItems: { label: string; href: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile: user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  pathname === item.href
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-slate-100 py-1 pl-1 pr-3 hover:bg-slate-50"
          >
            <img
              src={avatarUrl(user?.full_name || "Pengguna Pulih")}
              alt="avatar"
              className="h-8 w-8 rounded-full"
            />
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">
              {user?.full_name ?? "Pengguna"}
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="truncate text-sm font-medium text-slate-800">{user?.full_name}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={15} /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 no-scrollbar md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium ${
              pathname === item.href
                ? "bg-teal-50 text-teal-700"
                : "text-slate-600"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
