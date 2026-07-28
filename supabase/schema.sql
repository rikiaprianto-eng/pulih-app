-- ============================================================================
-- Pulih — Supabase schema, RLS policies, and seed data
-- Run this whole file once in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: uses "if not exists" / "create or replace" where possible.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'patient' check (role in ('patient', 'psychologist', 'admin')),
  avatar_url text,
  phone_number text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up.
-- Role & name come from the metadata we pass at signUp() time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'patient')
  )
  on conflict (id) do nothing;

  if coalesce(new.raw_user_meta_data ->> 'role', 'patient') = 'psychologist' then
    insert into public.psychologist_profiles (id, category)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'category', 'teman_curhat')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies below.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Security: the "update own profile" policy below lets a user update their own row
-- (needed for editing their name/phone/avatar) — but without this trigger, that would
-- also let them silently promote themselves to admin by PATCHing their own `role`
-- column directly via the REST API. This trigger reverts any change to `role` unless
-- the actor performing the update is already an admin.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null outside of a Supabase Auth session (SQL Editor, migrations,
  -- service_role) — those contexts are already fully trusted, so only block the
  -- change when a specific *non-admin* authenticated client is making the request.
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_role_column on public.profiles;
create trigger protect_role_column
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

-- ----------------------------------------------------------------------------
-- 2. PSYCHOLOGIST PROFILES + SPECIALIZATIONS
-- ----------------------------------------------------------------------------
create table if not exists public.psychologist_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  title text default 'Psikolog Klinis',
  bio text,
  license_number text,
  experience_label text,
  is_online boolean not null default false,
  rating_avg numeric(2, 1) not null default 5.0,
  review_count integer not null default 0,
  price_30 integer not null default 99000,
  price_60 integer not null default 175000,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  -- 'teman_curhat' = peer counselor tier (typically S1), priced via the shared
  -- packages table. 'profesional' = licensed psychologist tier (typically S2), sets
  -- their own hourly_rate and patients pay that rate directly per session.
  category text not null default 'teman_curhat' check (category in ('teman_curhat', 'profesional')),
  hourly_rate integer,
  -- Discount (0-100%) a Psikolog Profesional can offer on their own hourly_rate.
  discount_percent integer not null default 0,
  -- Optional redeemable coupon on top of discount_percent: patient must type
  -- coupon_code at checkout to get coupon_discount_amount (Rp) off.
  coupon_code text,
  coupon_discount_amount integer,
  -- Deprecated/unused: per-psychologist Lynk.id link, superseded by the single
  -- global site_settings.lynkid_product_url (one Rp1.000 product, paid by qty).
  lynkid_url text
);

-- In case psychologist_profiles already existed from an earlier run of this file.
alter table public.psychologist_profiles add column if not exists category text not null default 'teman_curhat';
alter table public.psychologist_profiles add column if not exists hourly_rate integer;
alter table public.psychologist_profiles add column if not exists discount_percent integer not null default 0;
alter table public.psychologist_profiles add column if not exists coupon_code text;
alter table public.psychologist_profiles add column if not exists coupon_discount_amount integer;
alter table public.psychologist_profiles add column if not exists lynkid_url text;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'psychologist_profiles_category_check'
  ) then
    alter table public.psychologist_profiles
      add constraint psychologist_profiles_category_check check (category in ('teman_curhat', 'profesional'));
  end if;
end $$;

-- Blocks a Psikolog Profesional from saving an hourly_rate below the admin-set
-- floor (site_settings.profesional_min_hourly_rate), so psychologists can't
-- undercut each other into a price war. Non-professional rows are unaffected.
create or replace function public.enforce_min_hourly_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_floor integer;
begin
  if new.category = 'profesional' and new.hourly_rate is not null then
    select profesional_min_hourly_rate into v_floor from public.site_settings where id = 1;
    if v_floor is not null and new.hourly_rate < v_floor then
      raise exception 'Tarif per jam tidak boleh di bawah Rp% (batas minimum ditetapkan admin).', v_floor;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists check_min_hourly_rate on public.psychologist_profiles;
create trigger check_min_hourly_rate
  before insert or update on public.psychologist_profiles
  for each row execute function public.enforce_min_hourly_rate();

-- A psychologist can only be marked is_online while verification_status = 'verified'
-- (silently forces it back to false otherwise) — enforced at the DB level so this
-- can't be bypassed via the admin toggle or a direct API call, not just the UI.
create or replace function public.enforce_online_requires_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from 'verified' then
    new.is_online := false;
  end if;
  return new;
end;
$$;

drop trigger if exists check_online_requires_verified on public.psychologist_profiles;
create trigger check_online_requires_verified
  before insert or update on public.psychologist_profiles
  for each row execute function public.enforce_online_requires_verified();

create table if not exists public.specializations (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists public.psychologist_specializations (
  psychologist_id uuid references public.psychologist_profiles (id) on delete cascade,
  specialization_id uuid references public.specializations (id) on delete cascade,
  primary key (psychologist_id, specialization_id)
);

-- Admin-managed checklist of what a psychologist must submit before verification
-- (e.g. "Ijazah S1 Psikologi", "STR/SIPP", "Foto KTP") — configurable, not hardcoded.
create table if not exists public.verification_requirements (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  input_type text not null default 'text' check (input_type in ('text', 'photo')),
  is_required boolean not null default true,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  -- Which tier this requirement applies to. 'both' shows it to every registering
  -- psychologist regardless of category.
  category text not null default 'both' check (category in ('teman_curhat', 'profesional', 'both'))
);

alter table public.verification_requirements add column if not exists category text not null default 'both';
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'verification_requirements_category_check'
  ) then
    alter table public.verification_requirements
      add constraint verification_requirements_category_check check (category in ('teman_curhat', 'profesional', 'both'));
  end if;
end $$;

-- One row per (psychologist, requirement) answer. text_value for input_type='text',
-- file_path (private storage path, not a public URL) for input_type='photo'.
create table if not exists public.psychologist_submissions (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid references public.profiles (id) on delete cascade,
  requirement_id uuid references public.verification_requirements (id) on delete cascade,
  text_value text,
  file_path text,
  submitted_at timestamptz not null default now(),
  unique (psychologist_id, requirement_id)
);

-- ----------------------------------------------------------------------------
-- 3. PACKAGES (pricing) & CMS (banners, events)
-- ----------------------------------------------------------------------------
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes integer not null,
  session_quota integer not null default 1,
  price integer not null,
  original_price integer,
  badge text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  -- Optional redeemable coupon: patient must type coupon_code at checkout to
  -- get coupon_discount_amount (Rp) off, on top of the price/original_price discount.
  coupon_code text,
  coupon_discount_amount integer,
  -- Deprecated/unused: per-package Lynk.id link, superseded by the single global
  -- site_settings.lynkid_product_url (one Rp1.000 product, paid by qty).
  lynkid_url text
);

alter table public.packages add column if not exists coupon_code text;
alter table public.packages add column if not exists coupon_discount_amount integer;
alter table public.packages add column if not exists lynkid_url text;

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_label text default 'Selengkapnya',
  href text default '/',
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'Webinar' check (event_type in ('Webinar', 'Support Group')),
  speaker_name text,
  event_date timestamptz,
  quota integer not null default 0
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete cascade,
  patient_id uuid references public.profiles (id) on delete cascade,
  registered_at timestamptz not null default now(),
  unique (event_id, patient_id)
);

-- Explanatory feature cards on the landing page (e.g. "Teman Curhat" vs
-- "Psikolog Profesional"), managed like Manajemen Event but capped at 10.
create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- ----------------------------------------------------------------------------
-- 4. TRANSACTIONS, SUBSCRIPTIONS, SESSIONS, MEDICAL RECORDS, REVIEWS
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles (id) on delete cascade,
  package_id uuid references public.packages (id),
  -- Set instead of package_id for a direct "Psikolog Profesional" hourly-rate
  -- payment, which isn't tied to any of the shared packages.
  psychologist_id uuid references public.profiles (id),
  amount integer not null,
  payment_method text,
  status text not null default 'paid' check (status in ('pending', 'paid', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  paid_at timestamptz default now(),
  -- Revenue split at the moment of payment: platform cut vs. the psychologist's
  -- share. Teman Curhat uses a flat fee (site_settings.teman_curhat_admin_fee);
  -- Psikolog Profesional uses a percentage (site_settings.profesional_admin_fee_percent).
  admin_fee_amount integer,
  psychologist_share_amount integer,
  -- For a direct Psikolog Profesional payment: whether this transaction has
  -- already been used to start its one paid session (prevents reusing a single
  -- payment to start unlimited sessions).
  session_consumed boolean not null default false
);

alter table public.transactions add column if not exists psychologist_id uuid references public.profiles (id);
alter table public.transactions add column if not exists admin_fee_amount integer;
alter table public.transactions add column if not exists psychologist_share_amount integer;
alter table public.transactions add column if not exists session_consumed boolean not null default false;

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles (id) on delete cascade,
  transaction_id uuid references public.transactions (id),
  package_name text,
  total_quota integer not null default 1,
  used_quota integer not null default 0,
  -- Per-session duration captured from the package at purchase time — a session
  -- consumes exactly one quota slot for up to this many minutes; unused minutes
  -- within a session are not banked for later.
  duration_minutes integer not null default 60,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_subscriptions add column if not exists duration_minutes integer not null default 60;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.profiles (id),
  psychologist_id uuid references public.profiles (id),
  subscription_id uuid references public.user_subscriptions (id),
  -- Set for a Psikolog Profesional session: the specific paid transaction this
  -- session consumed (see transactions.session_consumed).
  transaction_id uuid references public.transactions (id),
  scheduled_at timestamptz not null default now(),
  duration_minutes integer not null default 60,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'ongoing', 'extended', 'completed', 'cancelled')),
  started_at timestamptz,
  ended_at timestamptz
);

alter table public.sessions add column if not exists transaction_id uuid references public.transactions (id);

-- Atomically claims one quota slot from the caller's most recent active Teman
-- Curhat subscription (locks the row to avoid a double-spend from concurrent
-- session starts) and returns that package's per-session duration, or NULL if
-- no quota is left — the session is never granted more or less time than what
-- was actually purchased, and unused minutes are not banked for later.
create or replace function public.consume_subscription_quota(p_patient_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub_id uuid;
  v_duration integer;
begin
  if p_patient_id is distinct from auth.uid() then
    return null;
  end if;

  select id, duration_minutes into v_sub_id, v_duration
  from public.user_subscriptions
  where patient_id = p_patient_id
    and used_quota < total_quota
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1
  for update;

  if v_sub_id is null then
    return null;
  end if;

  update public.user_subscriptions set used_quota = used_quota + 1 where id = v_sub_id;
  return v_duration;
end;
$$;

grant execute on function public.consume_subscription_quota(uuid) to authenticated;

-- Atomically marks a paid direct Psikolog Profesional transaction as consumed
-- so it can only ever be used to start one session. Returns false (without
-- starting anything) if the transaction doesn't belong to the caller, isn't
-- paid, or was already consumed by an earlier session.
create or replace function public.consume_transaction_session(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
begin
  update public.transactions
  set session_consumed = true
  where id = p_transaction_id
    and patient_id = auth.uid()
    and status = 'paid'
    and session_consumed = false
  returning true into v_updated;
  return coalesce(v_updated, false);
end;
$$;

grant execute on function public.consume_transaction_session(uuid) to authenticated;

create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions (id) on delete cascade,
  psychologist_id uuid references public.profiles (id),
  patient_id uuid references public.profiles (id),
  notes text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions (id),
  patient_id uuid references public.profiles (id),
  psychologist_id uuid references public.profiles (id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. SITE SETTINGS (public config: contact info, bank display, gateway toggle)
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id int primary key default 1,
  logo_url text,
  contact_email text not null default 'halo@pulih.id',
  contact_phone text not null default '0800-1-PULIH',
  about_text text not null default 'Platform konseling psikologi online tepercaya untuk kesehatan mentalmu.',
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  payment_gateway text not null default 'manual' check (payment_gateway in ('manual', 'midtrans', 'lynkid')),
  midtrans_client_key text,
  midtrans_is_production boolean not null default false,
  -- Flat platform fee (Rp) taken from every Teman Curhat package transaction; the rest is the psychologist's share.
  teman_curhat_admin_fee integer not null default 14000,
  -- Platform fee percentage (0-100) taken from every Psikolog Profesional hourly-rate transaction.
  profesional_admin_fee_percent integer not null default 10,
  -- Floor (Rp) a Psikolog Profesional's hourly_rate may not go below, so psychologists
  -- can't race each other to the bottom on price. Enforced by enforce_min_hourly_rate().
  profesional_min_hourly_rate integer not null default 0,
  constraint site_settings_single_row check (id = 1)
);

-- In case site_settings already existed from an earlier run of this file (before
-- logo_url was added) — "create table if not exists" above wouldn't add the column.
alter table public.site_settings add column if not exists logo_url text;
alter table public.site_settings add column if not exists teman_curhat_admin_fee integer not null default 14000;
alter table public.site_settings add column if not exists profesional_admin_fee_percent integer not null default 10;
alter table public.site_settings add column if not exists profesional_min_hourly_rate integer not null default 0;
-- Single global Lynk.id product link priced at Rp1 — at checkout the patient sets
-- the quantity equal to the final total in rupiah, so one product covers every
-- package and every professional's rate (no per-item links needed).
alter table public.site_settings add column if not exists lynkid_product_url text;

-- Older databases created the payment_gateway check before 'lynkid' existed —
-- rebuild the constraint so the new option is accepted.
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'site_settings_payment_gateway_check') then
    alter table public.site_settings drop constraint site_settings_payment_gateway_check;
  end if;
  alter table public.site_settings
    add constraint site_settings_payment_gateway_check
    check (payment_gateway in ('manual', 'midtrans', 'lynkid'));
end $$;

-- Server-only secret storage. Deliberately has NO select/insert/update policies for
-- anon or authenticated roles below — only the service_role key (used exclusively
-- inside Netlify Functions, never shipped to the browser) can read or write this.
create table if not exists public.payment_secrets (
  id int primary key default 1,
  midtrans_server_key text,
  -- Lynk.id "Merchant Key" used to verify the X-Signature header on their
  -- transaction-success webhook (see netlify/functions/lynk-webhook.ts).
  lynkid_merchant_key text,
  constraint payment_secrets_single_row check (id = 1)
);

alter table public.payment_secrets add column if not exists lynkid_merchant_key text;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.psychologist_profiles enable row level security;
alter table public.specializations enable row level security;
alter table public.psychologist_specializations enable row level security;
alter table public.verification_requirements enable row level security;
alter table public.psychologist_submissions enable row level security;
alter table public.packages enable row level security;
alter table public.banners enable row level security;
alter table public.events enable row level security;
alter table public.facilities enable row level security;
alter table public.event_registrations enable row level security;
alter table public.transactions enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.sessions enable row level security;
alter table public.medical_records enable row level security;
alter table public.reviews enable row level security;
alter table public.site_settings enable row level security;
-- payment_secrets: RLS enabled, no policies added anywhere in this file on purpose.
-- That means anon/authenticated get zero access; only service_role (Netlify Functions) can touch it.
alter table public.payment_secrets enable row level security;

-- Public catalog data: anyone (incl. anonymous landing-page visitors) can read.
drop policy if exists "public read profiles" on public.profiles;
create policy "public read profiles" on public.profiles for select using (true);

drop policy if exists "public read psychologist_profiles" on public.psychologist_profiles;
create policy "public read psychologist_profiles" on public.psychologist_profiles for select using (true);

drop policy if exists "public read specializations" on public.specializations;
create policy "public read specializations" on public.specializations for select using (true);

drop policy if exists "public read psychologist_specializations" on public.psychologist_specializations;
create policy "public read psychologist_specializations" on public.psychologist_specializations for select using (true);

drop policy if exists "public read packages" on public.packages;
create policy "public read packages" on public.packages for select using (true);

drop policy if exists "public read banners" on public.banners;
create policy "public read banners" on public.banners for select using (true);

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events for select using (true);

drop policy if exists "public read facilities" on public.facilities;
create policy "public read facilities" on public.facilities for select using (true);

-- Profiles: users manage their own row; admins manage all.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- Psychologists manage their own psychologist profile; admins manage all.
drop policy if exists "psychologist manages own row" on public.psychologist_profiles;
create policy "psychologist manages own row" on public.psychologist_profiles
  for update using (auth.uid() = id or public.is_admin());

-- Needed for the Google-OAuth signup path, where the role is applied client-side
-- after the redirect (see /auth/callback) instead of via the handle_new_user trigger.
drop policy if exists "self insert psychologist profile" on public.psychologist_profiles;
create policy "self insert psychologist profile" on public.psychologist_profiles
  for insert with check (auth.uid() = id);

-- Verification requirements: everyone can read the checklist (needed to render the
-- signup/registration form), only admins can define what's on it.
drop policy if exists "public read verification_requirements" on public.verification_requirements;
create policy "public read verification_requirements" on public.verification_requirements
  for select using (true);
drop policy if exists "admin writes verification_requirements" on public.verification_requirements;
create policy "admin writes verification_requirements" on public.verification_requirements
  for insert with check (public.is_admin());
drop policy if exists "admin updates verification_requirements" on public.verification_requirements;
create policy "admin updates verification_requirements" on public.verification_requirements
  for update using (public.is_admin());
drop policy if exists "admin deletes verification_requirements" on public.verification_requirements;
create policy "admin deletes verification_requirements" on public.verification_requirements
  for delete using (public.is_admin());

-- Psychologist submissions: a psychologist manages their own answers; admin can
-- read all of them (to review) but never needs to write on someone else's behalf.
drop policy if exists "psychologist manages own submissions" on public.psychologist_submissions;
create policy "psychologist manages own submissions" on public.psychologist_submissions
  for all using (auth.uid() = psychologist_id or public.is_admin())
  with check (auth.uid() = psychologist_id);

-- Packages / banners / events: only admins can write.
drop policy if exists "admin writes packages" on public.packages;
create policy "admin writes packages" on public.packages for insert with check (public.is_admin());
drop policy if exists "admin updates packages" on public.packages;
create policy "admin updates packages" on public.packages for update using (public.is_admin());
drop policy if exists "admin deletes packages" on public.packages;
create policy "admin deletes packages" on public.packages for delete using (public.is_admin());

drop policy if exists "admin writes banners" on public.banners;
create policy "admin writes banners" on public.banners for insert with check (public.is_admin());
drop policy if exists "admin updates banners" on public.banners;
create policy "admin updates banners" on public.banners for update using (public.is_admin());
drop policy if exists "admin deletes banners" on public.banners;
create policy "admin deletes banners" on public.banners for delete using (public.is_admin());

drop policy if exists "admin writes events" on public.events;
create policy "admin writes events" on public.events for insert with check (public.is_admin());
drop policy if exists "admin updates events" on public.events;
create policy "admin updates events" on public.events for update using (public.is_admin());
drop policy if exists "admin deletes events" on public.events;
create policy "admin deletes events" on public.events for delete using (public.is_admin());

drop policy if exists "admin writes facilities" on public.facilities;
create policy "admin writes facilities" on public.facilities for insert with check (public.is_admin());
drop policy if exists "admin updates facilities" on public.facilities;
create policy "admin updates facilities" on public.facilities for update using (public.is_admin());
drop policy if exists "admin deletes facilities" on public.facilities;
create policy "admin deletes facilities" on public.facilities for delete using (public.is_admin());

-- Site settings: public read (footer/contact info shown to everyone), admin write.
drop policy if exists "public read site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings for select using (true);
drop policy if exists "admin updates site_settings" on public.site_settings;
create policy "admin updates site_settings" on public.site_settings for update using (public.is_admin());

-- Event registrations: a patient can register themselves / see their own.
drop policy if exists "patient manages own registration" on public.event_registrations;
create policy "patient manages own registration" on public.event_registrations
  for all using (auth.uid() = patient_id or public.is_admin())
  with check (auth.uid() = patient_id or public.is_admin());

-- Transactions: patient sees/creates their own; admin sees & verifies all.
drop policy if exists "patient reads own transactions" on public.transactions;
create policy "patient reads own transactions" on public.transactions
  for select using (auth.uid() = patient_id or public.is_admin());
drop policy if exists "patient creates own transactions" on public.transactions;
create policy "patient creates own transactions" on public.transactions
  for insert with check (auth.uid() = patient_id);
drop policy if exists "admin updates transactions" on public.transactions;
create policy "admin updates transactions" on public.transactions
  for update using (public.is_admin());

-- Subscriptions: patient sees/creates their own; admin sees all.
drop policy if exists "patient reads own subscriptions" on public.user_subscriptions;
create policy "patient reads own subscriptions" on public.user_subscriptions
  for select using (auth.uid() = patient_id or public.is_admin());
drop policy if exists "patient creates own subscriptions" on public.user_subscriptions;
create policy "patient creates own subscriptions" on public.user_subscriptions
  for insert with check (auth.uid() = patient_id);
drop policy if exists "patient updates own subscriptions" on public.user_subscriptions;
create policy "patient updates own subscriptions" on public.user_subscriptions
  for update using (auth.uid() = patient_id or public.is_admin());

-- Sessions: visible/editable by the patient or psychologist involved.
drop policy if exists "participants read sessions" on public.sessions;
create policy "participants read sessions" on public.sessions
  for select using (auth.uid() = patient_id or auth.uid() = psychologist_id or public.is_admin());
drop policy if exists "patient creates sessions" on public.sessions;
create policy "patient creates sessions" on public.sessions
  for insert with check (auth.uid() = patient_id);
drop policy if exists "participants update sessions" on public.sessions;
create policy "participants update sessions" on public.sessions
  for update using (auth.uid() = patient_id or auth.uid() = psychologist_id or public.is_admin());

-- Medical records: only the owning psychologist (never the patient) can read/write.
drop policy if exists "psychologist manages own medical records" on public.medical_records;
create policy "psychologist manages own medical records" on public.medical_records
  for all using (auth.uid() = psychologist_id or public.is_admin())
  with check (auth.uid() = psychologist_id or public.is_admin());

-- Reviews: public read (ratings shown publicly), patient can write for their own session.
drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews for select using (true);
drop policy if exists "patient creates own review" on public.reviews;
create policy "patient creates own review" on public.reviews
  for insert with check (auth.uid() = patient_id);

-- ============================================================================
-- SEED DATA (safe to re-run — uses upsert on natural keys where practical)
-- ============================================================================
insert into public.specializations (name) values
  ('Kecemasan'), ('Karir'), ('Keluarga'), ('Pernikahan'),
  ('Remaja'), ('Trauma'), ('Stres Kerja'), ('Depresi'), ('Anak')
on conflict (name) do nothing;

-- Fixed ids below (rather than the table's gen_random_uuid() default) so re-running
-- this file is truly idempotent: "on conflict (id) do nothing" only works when the
-- conflict target is deterministic across runs. Without this, every re-run silently
-- inserted a fresh duplicate row (this bit us once already — see git history).
insert into public.packages (id, name, description, duration_minutes, session_quota, price, original_price, badge, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'Sesi 30 Menit', 'Cocok untuk konsultasi ringan atau follow-up singkat.', 30, 1, 99000, null, null, 1),
  ('00000000-0000-4000-8000-000000000002', 'Sesi 60 Menit', 'Sesi konseling mendalam satu-lawan-satu dengan psikolog.', 60, 1, 175000, null, 'Paling Populer', 2),
  ('00000000-0000-4000-8000-000000000003', 'Bundling 1 Bulan', '4x sesi 60 menit dalam satu bulan, jadwalkan sesuai kebutuhanmu.', 60, 4, 599000, 700000, 'Hemat 30%', 3)
on conflict (id) do nothing;

insert into public.banners (id, title, subtitle, cta_label, href, image_url, sort_order) values
  ('00000000-0000-4000-8000-000000000101', 'Konseling Online Kapan Saja', 'Terhubung dengan psikolog berlisensi dalam hitungan menit, di mana pun kamu berada.', 'Mulai Sekarang', '/signup', 'https://picsum.photos/seed/pulih-banner-1/1200/500', 1),
  ('00000000-0000-4000-8000-000000000102', 'Webinar: Mengelola Kecemasan di Tempat Kerja', 'Gratis untuk pengguna terdaftar — 5 Agustus 2026, pukul 19.00 WIB.', 'Daftar Event', '#events', 'https://picsum.photos/seed/pulih-banner-2/1200/500', 2),
  ('00000000-0000-4000-8000-000000000103', 'Paket Bundling 1 Bulan Hemat 30%', '4x sesi konseling 60 menit dengan psikolog pilihanmu, mulai dari Rp599.000.', 'Lihat Paket', '/pricing', 'https://picsum.photos/seed/pulih-banner-3/1200/500', 3)
on conflict (id) do nothing;

insert into public.events (id, title, event_type, speaker_name, event_date, quota) values
  ('00000000-0000-4000-8000-000000000201', 'Mengelola Kecemasan di Tempat Kerja', 'Webinar', 'Dedi Kurniawan, M.Psi.', '2026-08-05 19:00:00+07', 42),
  ('00000000-0000-4000-8000-000000000202', 'Self Love Journey: Support Group', 'Support Group', 'Eka Putri, M.Psi.', '2026-08-12 16:00:00+07', 15),
  ('00000000-0000-4000-8000-000000000203', 'Parenting untuk Generasi Digital', 'Webinar', 'Fajar Nugraha, M.Psi.', '2026-08-20 19:30:00+07', 60)
on conflict (id) do nothing;

insert into public.facilities (id, title, description, image_url, sort_order) values
  ('00000000-0000-4000-8000-000000000301', 'Teman Curhat', 'Pendamping sebaya (min. S1) untuk ngobrol santai tentang keresahan sehari-hari. Tarif mengikuti paket harga yang berlaku.', 'https://picsum.photos/seed/pulih-fasilitas-teman-curhat/800/600', 1),
  ('00000000-0000-4000-8000-000000000302', 'Psikolog Profesional', 'Psikolog berlisensi (min. S2) yang menentukan tarif konsultasi per jam sendiri. Bayar langsung sesuai tarifnya, mulai sesi seketika.', 'https://picsum.photos/seed/pulih-fasilitas-psikolog-profesional/800/600', 2)
on conflict (id) do nothing;

insert into public.site_settings (id) values (1) on conflict (id) do nothing;
insert into public.payment_secrets (id) values (1) on conflict (id) do nothing;

-- ============================================================================
-- STORAGE — bucket for admin-uploaded banner images
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "public read banner images" on storage.objects;
create policy "public read banner images" on storage.objects
  for select using (bucket_id = 'banners');

drop policy if exists "admin upload banner images" on storage.objects;
create policy "admin upload banner images" on storage.objects
  for insert with check (bucket_id = 'banners' and public.is_admin());

drop policy if exists "admin update banner images" on storage.objects;
create policy "admin update banner images" on storage.objects
  for update using (bucket_id = 'banners' and public.is_admin());

drop policy if exists "admin delete banner images" on storage.objects;
create policy "admin delete banner images" on storage.objects
  for delete using (bucket_id = 'banners' and public.is_admin());

-- ============================================================================
-- STORAGE — private bucket for psychologist verification documents (certificates,
-- diplomas, ID photos). NOT public — files live under `{psychologist_id}/...` and
-- only that psychologist or an admin can read/write them. The app reads these via
-- short-lived signed URLs, never a public getPublicUrl().
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('credentials', 'credentials', false)
on conflict (id) do nothing;

drop policy if exists "own credential upload" on storage.objects;
create policy "own credential upload" on storage.objects
  for insert with check (
    bucket_id = 'credentials' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own or admin credential read" on storage.objects;
create policy "own or admin credential read" on storage.objects
  for select using (
    bucket_id = 'credentials'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

drop policy if exists "own credential update" on storage.objects;
create policy "own credential update" on storage.objects
  for update using (
    bucket_id = 'credentials' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "own or admin credential delete" on storage.objects;
create policy "own or admin credential delete" on storage.objects
  for delete using (
    bucket_id = 'credentials'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

-- Seed a sensible default checklist — admin can edit/add/remove these anytime from
-- Admin → Manajemen Psikolog.
insert into public.verification_requirements (id, label, description, input_type, is_required, sort_order) values
  ('00000000-0000-4000-8000-000000000301', 'Nama Lengkap & Gelar', 'Sesuai ijazah, contoh: Dra. Ani Wijaya, M.Psi., Psikolog', 'text', true, 1),
  ('00000000-0000-4000-8000-000000000302', 'Nomor STR/SIPP', 'Surat Tanda Registrasi / Surat Izin Praktik Psikolog', 'text', true, 2),
  ('00000000-0000-4000-8000-000000000303', 'Foto Ijazah Pendidikan Psikologi', 'Unggah foto/scan ijazah S1/S2 Psikologi', 'photo', true, 3),
  ('00000000-0000-4000-8000-000000000304', 'Foto STR/SIPP', 'Unggah foto/scan dokumen STR atau SIPP', 'photo', true, 4),
  ('00000000-0000-4000-8000-000000000305', 'Foto KTP', 'Untuk verifikasi identitas', 'photo', true, 5)
on conflict (id) do nothing;

-- Note: demo psychologist accounts (with real auth.users rows + login access) are
-- NOT seeded here because Supabase Auth users must be created via the Auth API,
-- not plain SQL. Sign up through the app with role "Saya Psikolog" to create real
-- psychologist accounts — see supabase/README.md for the quick demo-data recipe.
