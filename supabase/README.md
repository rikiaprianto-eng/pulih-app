# Setup Database Supabase — Pulih

## 1. Jalankan schema

Buka project Supabase kamu → **SQL Editor** → **New query** → tempel seluruh isi
[`schema.sql`](./schema.sql) → **Run**.

Ini akan membuat semua tabel, Row Level Security policy, dan mengisi data awal untuk
`specializations`, `packages`, `banners`, dan `events`.

## 2. Ambil kredensial untuk aplikasi

Buka **Settings → API**, salin:

- **Project URL** → jadi `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → jadi `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Jangan pernah memakai/membagikan **`service_role` key** di aplikasi frontend — key itu
melewati semua Row Level Security dan harus tetap rahasia di server saja.

## 3. Buat akun psikolog contoh (opsional, untuk demo)

Tabel `psychologist_profiles` butuh baris di `auth.users` (dibuat via Supabase Auth, bukan
SQL biasa). Cara tercepat membuat beberapa psikolog contoh yang bisa login:

1. Buka aplikasi Pulih → `/signup` → pilih **"Saya Psikolog"** → daftar dengan email
   contoh (mis. `ani.psikolog@pulih.id`).
2. Trigger otomatis akan membuat baris di `profiles` (role `psychologist`) dan
   `psychologist_profiles`.
3. Di Supabase **Table Editor → psychologist_profiles**, edit baris tersebut: isi `title`,
   `bio`, set `is_online = true`, `verification_status = verified`, dan tambahkan
   spesialisasi lewat tabel `psychologist_specializations`.

## 4. Menjadikan seseorang Admin

Tidak ada opsi "Admin" di form signup (sengaja, demi keamanan). Untuk membuat akun admin:

1. Daftar biasa lewat `/signup` sebagai Pasien atau Psikolog.
2. Buka **Table Editor → profiles** di Supabase, cari baris user tersebut, ubah kolom
   `role` menjadi `admin`.
3. Login ulang di aplikasi — akan otomatis diarahkan ke `/admin`.

## 5. (Opsional) Aktifkan Login Google

Tombol "Lanjutkan dengan Google" di app memanggil `supabase.auth.signInWithOAuth`. Supaya
benar-benar berfungsi:

1. Di Google Cloud Console, buat OAuth Client ID (tipe Web application), tambahkan
   Authorized redirect URI dari Supabase (**Authentication → Providers → Google** akan
   menampilkan URL callback yang harus ditempel).
2. Di Supabase **Authentication → Providers → Google**, aktifkan dan masukkan Client ID +
   Client Secret dari langkah di atas.

Jika langkah ini dilewati, tombol Google akan menampilkan pesan error dari Supabase — form
email/password tetap berfungsi normal sebagai jalur utama.
