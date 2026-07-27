import { HeartHandshake } from "lucide-react";
import Link from "next/link";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 font-heading font-bold text-xl text-slate-900 ${className}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 text-white shadow-sm">
        <HeartHandshake size={20} strokeWidth={2.2} />
      </span>
      Pulih
    </Link>
  );
}
