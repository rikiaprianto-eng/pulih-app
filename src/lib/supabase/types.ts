// Hand-written types matching supabase/schema.sql.
// Regenerate with `npx supabase gen types typescript` once the Supabase CLI is linked
// to your project, if you want fully auto-synced types.

export type Role = "patient" | "psychologist" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
  phone_number: string | null;
  created_at: string;
};

export type PsychologistProfile = {
  id: string;
  title: string | null;
  bio: string | null;
  license_number: string | null;
  experience_label: string | null;
  is_online: boolean;
  rating_avg: number;
  review_count: number;
  price_30: number;
  price_60: number;
  verification_status: "pending" | "verified" | "rejected";
};

export type Specialization = { id: string; name: string };

export type Package = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  session_quota: number;
  price: number;
  original_price: number | null;
  badge: string | null;
  is_active: boolean;
  sort_order: number;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  href: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type EventRow = {
  id: string;
  title: string;
  event_type: "Webinar" | "Support Group";
  speaker_name: string | null;
  event_date: string | null;
  quota: number;
};

export type Transaction = {
  id: string;
  patient_id: string;
  package_id: string | null;
  amount: number;
  payment_method: string | null;
  status: "pending" | "paid" | "failed" | "expired";
  created_at: string;
  paid_at: string | null;
};

export type UserSubscription = {
  id: string;
  patient_id: string;
  transaction_id: string | null;
  package_name: string | null;
  total_quota: number;
  used_quota: number;
  expires_at: string | null;
  created_at: string;
};

export type SessionRow = {
  id: string;
  patient_id: string;
  psychologist_id: string;
  subscription_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: "scheduled" | "ongoing" | "extended" | "completed" | "cancelled";
  started_at: string | null;
  ended_at: string | null;
};

export type MedicalRecord = {
  id: string;
  session_id: string | null;
  psychologist_id: string;
  patient_id: string;
  notes: string;
  created_at: string;
};

// Minimal Database type so `createClient<Database>()` gets basic table typing.
// Not exhaustive (Row/Insert/Update all collapsed) — good enough for this app's needs.
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      psychologist_profiles: {
        Row: PsychologistProfile;
        Insert: Partial<PsychologistProfile>;
        Update: Partial<PsychologistProfile>;
      };
      specializations: { Row: Specialization; Insert: Partial<Specialization>; Update: Partial<Specialization> };
      psychologist_specializations: {
        Row: { psychologist_id: string; specialization_id: string };
        Insert: { psychologist_id: string; specialization_id: string };
        Update: { psychologist_id?: string; specialization_id?: string };
      };
      packages: { Row: Package; Insert: Partial<Package>; Update: Partial<Package> };
      banners: { Row: Banner; Insert: Partial<Banner>; Update: Partial<Banner> };
      events: { Row: EventRow; Insert: Partial<EventRow>; Update: Partial<EventRow> };
      transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction> };
      user_subscriptions: {
        Row: UserSubscription;
        Insert: Partial<UserSubscription>;
        Update: Partial<UserSubscription>;
      };
      sessions: { Row: SessionRow; Insert: Partial<SessionRow>; Update: Partial<SessionRow> };
      medical_records: { Row: MedicalRecord; Insert: Partial<MedicalRecord>; Update: Partial<MedicalRecord> };
    };
  };
};
