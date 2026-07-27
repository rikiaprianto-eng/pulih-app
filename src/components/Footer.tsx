"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AtSign, MessageCircle, Rss, Mail, Phone } from "lucide-react";
import Logo from "./Logo";
import { fetchSiteSettings } from "@/lib/queries";

export default function Footer() {
  const [contactEmail, setContactEmail] = useState("halo@pulih.id");
  const [contactPhone, setContactPhone] = useState("0800-1-PULIH");
  const [aboutText, setAboutText] = useState(
    "Platform konseling psikologi online tepercaya untuk kesehatan mentalmu."
  );

  useEffect(() => {
    fetchSiteSettings().then((s) => {
      setContactEmail(s.contactEmail);
      setContactPhone(s.contactPhone);
      setAboutText(s.aboutText);
    });
  }, []);

  return (
    <footer className="mt-auto border-t border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-slate-500">{aboutText}</p>
            <div className="mt-4 flex gap-3 text-slate-400">
              <AtSign size={18} className="cursor-pointer hover:text-teal-600" />
              <MessageCircle size={18} className="cursor-pointer hover:text-teal-600" />
              <Rss size={18} className="cursor-pointer hover:text-teal-600" />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Produk</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/#fitur" className="hover:text-teal-600">Fitur</Link></li>
              <li><Link href="/pricing" className="hover:text-teal-600">Harga</Link></li>
              <li><Link href="/#events" className="hover:text-teal-600">Event</Link></li>
              <li><Link href="/psikolog" className="hover:text-teal-600">Gabung Jadi Psikolog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Perusahaan</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><a href="#" className="hover:text-teal-600">Tentang Kami</a></li>
              <li><a href="#" className="hover:text-teal-600">Karier</a></li>
              <li><a href="#" className="hover:text-teal-600">Syarat & Ketentuan</a></li>
              <li><a href="#" className="hover:text-teal-600">Kebijakan Privasi</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Kontak</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <Mail size={14} /> {contactEmail}
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} /> {contactPhone}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>© 2026 Pulih. Seluruh hak cipta dilindungi.</p>
          <p>Dibuat dengan peduli untuk kesehatan mental Indonesia.</p>
        </div>
      </div>
    </footer>
  );
}
