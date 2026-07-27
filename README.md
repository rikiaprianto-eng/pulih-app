# Pulih — Web App

Platform konseling psikologi online. Dibangun dengan Next.js (App Router, static export) +
TypeScript + Tailwind CSS, dan sudah dibungkus dengan [Capacitor](https://capacitorjs.com) supaya
bisa langsung dikompilasi menjadi aplikasi **Android (.apk)** dan **iOS**.

Seluruh data (banner, psikolog, paket harga, event, riwayat, dsb) di aplikasi ini adalah **dummy/mock**
yang ada di [`src/lib/data.ts`](./src/lib/data.ts) — ganti dengan pemanggilan API asli saat backend
sudah siap.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3010](http://localhost:3010).

## Peta halaman

| Route | Deskripsi |
|---|---|
| `/` | Landing page (hero carousel, fitur, psikolog aktif, event, testimoni) |
| `/login`, `/signup` | Alur autentikasi + pemilihan role (Pasien/Psikolog) + Google SSO (mock) |
| `/dashboard`, `/dashboard/riwayat`, `/dashboard/langganan` | Dashboard Pasien |
| `/pricing` | Pilih paket & checkout (QRIS/VA/e-wallet, semua simulasi) |
| `/session` | Ruang konseling video (UI mock, timer, chat, perpanjangan sesi) |
| `/psikolog` | Dashboard Psikolog (jadwal, rekam medis, toggle online) |
| `/admin` | Dashboard Admin (user, pembayaran, konten/banner, harga) |
| `/profil` | Profil pengguna (berlaku untuk semua role) |

Login/signup memakai `localStorage` sebagai mock auth — cukup untuk demo UI, **bukan** autentikasi
sungguhan. Sambungkan ke backend asli (lihat rancangan database & API sebelumnya) sebelum produksi.

## Build ke Android (.apk) dan iOS

Aplikasi sudah dikonfigurasi sebagai **static export** (`next.config.ts` → `output: "export"`),
sehingga hasil build (folder `out/`) bisa langsung dibungkus Capacitor menjadi WebView native app.
Folder native `android/` dan `ios/` sudah tersedia di repo ini (dibuat lewat `npx cap add`).

### 1. Build web app + sinkronkan ke native project

```bash
npm run sync:mobile
```

Perintah ini menjalankan `next build` (menghasilkan folder `out/`) lalu `npx cap sync` yang menyalin
hasil build ke `android/app/src/main/assets/public` dan `ios/App/App/public`.

Setiap kali ada perubahan kode web, ulangi perintah ini sebelum build native.

### 2. Build Android (.apk)

Prasyarat: [Android Studio](https://developer.android.com/studio) + Android SDK terpasang.

```bash
npm run open:android
```

Ini akan membuka folder `android/` di Android Studio. Dari Android Studio:

1. Tunggu Gradle sync selesai.
2. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. File `.apk` hasil build ada di `android/app/build/outputs/apk/debug/app-debug.apk`.

Untuk APK **rilis** (signed, siap Play Store), gunakan **Build → Generate Signed Bundle / APK**, buat
keystore baru, lalu pilih varian `release`.

Alternatif via terminal (tanpa membuka Android Studio):

```bash
cd android
./gradlew assembleDebug
```

### 3. Build iOS

Prasyarat: **macOS** + [Xcode](https://developer.apple.com/xcode/) + akun Apple Developer (untuk
signing & distribusi ke TestFlight/App Store). Build iOS **tidak bisa** dilakukan dari Windows/Linux.

```bash
npm run open:ios
```

Ini membuka `ios/App/App.xcworkspace` di Xcode. Dari Xcode:

1. Pilih target `App`, atur **Signing & Capabilities** dengan Apple Developer Team-mu.
2. Pilih device/simulator, lalu **Product → Run** untuk testing.
3. Untuk rilis: **Product → Archive**, lalu distribusikan ke TestFlight/App Store via Organizer.

### Mengganti ikon & splash screen

Ikon PWA dummy ada di `public/icons/`. Untuk ikon & splash screen native yang proper, gunakan
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets):

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate
```

Siapkan `resources/icon.png` (1024x1024) dan `resources/splash.png` (2732x2732) terlebih dahulu.

### Menambahkan fitur native (kamera, push notification, dll)

Tambahkan plugin Capacitor sesuai kebutuhan, misalnya:

```bash
npm install @capacitor/camera @capacitor/push-notifications
npx cap sync
```

## Menghubungkan ke Backend Asli

Saat ini seluruh interaksi (login, pembayaran, video call, dsb) adalah simulasi UI. Untuk versi
produksi, sambungkan ke backend sesuai rancangan tech stack & struktur database yang sudah dibuat
sebelumnya:

- Ganti `src/lib/auth.ts` dengan pemanggilan API auth (JWT/OAuth) yang sebenarnya.
- Ganti data di `src/lib/data.ts` dengan fetch ke API (React Query/SWR direkomendasikan).
- Ganti UI video call dummy di `/session` dengan SDK video call sungguhan (Twilio Video/Agora/Daily.co).
- Ganti simulasi pembayaran di `/pricing` dengan integrasi Midtrans/Xendit.
