// Types shared with src/lib/queries.ts (real Supabase data), plus static marketing
// copy that isn't backed by the database (testimonials, feature highlights).

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  gradient: string;
  image: string;
};

export type PsychologistCategory = "teman_curhat" | "profesional";

export type Psychologist = {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  online: boolean;
  experience: string;
  avatarSeed: string;
  price30: number;
  price60: number;
  category: PsychologistCategory;
  hourlyRate: number | null;
};

export type Package = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  sessionQuota: number;
  price: number;
  originalPrice?: number;
  highlight?: boolean;
  badge?: string;
};

export type PaymentMethod = {
  id: string;
  category: "qris" | "va" | "ewallet";
  name: string;
};

export const paymentMethods: PaymentMethod[] = [
  { id: "qris", category: "qris", name: "QRIS" },
  { id: "va-bca", category: "va", name: "Virtual Account BCA" },
  { id: "va-mandiri", category: "va", name: "Virtual Account Mandiri" },
  { id: "va-bni", category: "va", name: "Virtual Account BNI" },
  { id: "gopay", category: "ewallet", name: "GoPay" },
  { id: "ovo", category: "ewallet", name: "OVO" },
  { id: "dana", category: "ewallet", name: "DANA" },
];

export type EventItem = {
  id: string;
  title: string;
  date: string;
  speaker: string;
  type: "Webinar" | "Support Group";
  quotaLeft: number;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
};

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Rina, 27",
    role: "Karyawan Swasta",
    quote:
      "Pulih membantu saya mengatasi kecemasan kerja tanpa harus ambil cuti. Psikolognya responsif dan sangat suportif.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Anto, 34",
    role: "Wirausaha",
    quote:
      "Jadwal konseling fleksibel banget, bisa sesi malam hari setelah anak-anak tidur. Sangat membantu untuk keluarga kami.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Sari, 22",
    role: "Mahasiswa",
    quote: "Awalnya ragu coba konseling online, ternyata prosesnya nyaman dan tidak menghakimi sama sekali.",
    rating: 4,
  },
];

export const features = [
  {
    title: "Konseling Video 1-on-1",
    description: "Sesi privat dengan psikolog berlisensi melalui video call berkualitas tinggi.",
    icon: "Video",
  },
  {
    title: "Psikolog Terverifikasi",
    description: "Semua mitra psikolog telah melalui proses verifikasi STR/SIPP dan kompetensi.",
    icon: "ShieldCheck",
  },
  {
    title: "Jadwal Fleksibel",
    description: "Booking sesi kapan saja, termasuk slot malam hari dan akhir pekan.",
    icon: "CalendarClock",
  },
  {
    title: "Privasi Terjamin",
    description: "Rekam medis psikologis terenkripsi dan hanya dapat diakses psikolog terkait.",
    icon: "Lock",
  },
  {
    title: "Webinar & Support Group",
    description: "Ikuti kelas dan grup dukungan seputar kesehatan mental secara berkala.",
    icon: "Users",
  },
  {
    title: "Pembayaran Mudah",
    description: "QRIS, Virtual Account, dan e-Wallet — bayar sesuai kenyamananmu.",
    icon: "Wallet",
  },
];
