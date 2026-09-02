# Presensi.app

Aplikasi presensi digital berbasis SaaS, multi-tenant, dan Progressive Web App (PWA).
Aplikasi ini ditujukan untuk sekolah atau lembaga pendidikan yang membutuhkan presensi
siswa dan GTK dengan dukungan QR Code, GPS, selfie, RFID, laporan, serta pengaturan
multi-lokasi.

## Teknologi

- React 19 + TypeScript
- Vite + Tailwind CSS
- Supabase (PostgreSQL, Auth, dan sinkronisasi data)
- PWA dengan `public/manifest.webmanifest` dan `public/sw.js`
- Cloudflare Pages untuk hosting frontend
- GitHub sebagai repository dan sumber deployment

## Domain

- `presensi.app`: situs marketing, informasi produk, paket, dan pendaftaran sekolah
- `presensiku.app`: portal aplikasi untuk pengguna yang sudah terdaftar (admin, guru, dan siswa)

Pengaturan domain dilakukan di Cloudflare Pages melalui **Custom domains**. Pastikan
DNS kedua domain dikelola di Cloudflare dan keduanya mengarah ke project Pages yang
sama. Aplikasi otomatis mengarahkan pengguna dari tombol **Masuk Akun** di situs
marketing ke `https://presensiku.app/`. Link presensi dari QR/token tetap dapat dibuka
di kedua domain.

## Menjalankan Secara Lokal

**Prasyarat:** Node.js 20 atau lebih baru dan akun Supabase.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`.

Perintah yang tersedia:

```bash
npm run dev       # server pengembangan
npm run lint      # pemeriksaan TypeScript
npm run build     # build produksi
npm run preview   # melihat hasil build produksi
```

## Environment Variables

Isi `.env.local` untuk pengembangan lokal. **Jangan commit file ini ke GitHub.**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Token WhatsApp disimpan sebagai Supabase secret, bukan di frontend.
```

**Penting:**

- `VITE_SUPABASE_ANON_KEY` memang dikirim ke browser. Keamanan data harus ditegakkan
  oleh **Supabase Auth** dan **Row Level Security (RLS)**, bukan dengan menyembunyikan anon key.
- **Jangan pernah** menaruh `service_role` key di frontend atau di environment variable
  yang berawalan `VITE_`.
- `.env.local` sudah ada di `.gitignore`, jadi aman tidak commit.
- Untuk Cloudflare Pages, set environment variables di **Settings > Environment Variables**.

## Menyiapkan Supabase

### Langkah 1: Buat Project

1. Buka [Supabase Console](https://supabase.com/dashboard)
2. Klik **New Project** dan ikuti wizard
3. Pilih region terdekat (Indonesia: Singapura `ap-southeast-1`)
4. Tunggu project selesai inisialisasi

### Langkah 2: Import Skema Database

1. Buka **SQL Editor** di sidebar
2. Klik **New Query**
3. Copy-paste seluruh isi file `supabase_schema.sql` (di root folder proyek)
4. Klik **Run** dan tunggu semua statement selesai

Skema mencakup:
- **Tenant & Settings**: schools, school_locations, academic_years, academic_calendar_events
- **Master Data**: classes, students, gtk_profiles, weekly_schedules
- **Attendance**: attendance_sessions, attendance_records, lesson_attendances, gtk_attendance_records
- **Management**: student_leave_requests, bk_violations, whatsapp_notifications

### Langkah 3: Amankan dengan RLS (Row Level Security)

1. Buka **SQL Editor** lagi
2. Copy-paste seluruh isi file `supabase_rls_secure.sql` (di root folder proyek)
3. Klik **Run**

Script ini menghapus policy publik yang tidak aman dan mengganti dengan policy berbasis:
- **auth.uid()**: Memverifikasi user yang login
- **school_id**: Filter data berdasarkan tenant
- **role**: Kontrol akses berdasarkan peran (admin, teacher, student)

Detail implementasi RLS ada di [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) bagian "3. Terapkan Row Level Security".

**Catatan:** Setelah RLS aktif, aplikasi frontend HARUS menggunakan Supabase Auth.
Mode demo (login lokal) akan kehilangan akses ke database.

### Langkah 4: Konfigurasi Authentication

1. Di Supabase Console, buka **Authentication > Providers**
2. Aktifkan **Email/Password** (default aktif)
3. (Opsional) Aktifkan **Google** atau **GitHub** untuk single sign-on
4. Di **Auth > URL Configuration**, pastikan redirect URL mencakup:
   - `http://localhost:3000/`
   - `https://presensi.app/`
   - `https://presensiku.app/`

### Langkah 5: Ambil Credentials

1. Buka **Settings > API**
2. Copy `Project URL` (VITE_SUPABASE_URL)
3. Copy `anon public` key (VITE_SUPABASE_ANON_KEY)
4. Masukkan ke `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. Simpan file (jangan commit ke Git)

## Deployment ke Cloudflare Pages

### Setup Repository

1. Push kode ke GitHub:
   ```bash
   git add .
   git commit -m "Initial commit: Presensi SaaS multi-tenant"
   git push origin main
   ```

2. Jangan pernah commit `.env.local` atau `.env*`—pastikan di `.gitignore` (sudah
   dikonfigurasi).

### Deploy ke Cloudflare Pages

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Buka **Pages** > **Create a project** > **Connect to Git**
3. Izinkan akses ke repository GitHub `presensi-v1.7`
4. Pilih:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Tambah environment variables:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   # FONNTE_TOKEN disimpan dengan Supabase CLI sebagai secret server.
   ```
6. Klik **Save and Deploy**

### Konfigurasi Domain

Setelah deployment selesai:

1. Di Cloudflare Pages project, buka **Settings > Domains**
2. Klik **Add a custom domain**
3. Tambahkan kedua domain:
   - `presensi.app` (situs marketing dan pendaftaran)
   - `presensiku.app` (portal aplikasi seluruh pengguna terdaftar)
4. Pastikan DNS kedua domain mengarah ke Cloudflare nameserver

Aplikasi otomatis mendeteksi domain melalui `window.location.hostname` dan menyesuaikan
tampilan/alur (lihat `src/lib/store.tsx` untuk logika `domainMode`).

## Arsitektur Multi-Tenant

Setiap sekolah adalah satu tenant dan data bisnis harus selalu memiliki `school_id`.

### Prinsip Keamanan

- **Auth**: Setiap user harus login via Supabase Auth (email/password atau SSO)
- **RLS**: Semua tabel memiliki policy yang memverifikasi `auth.uid()` dan `school_id`
- **Role-based Access**: Siswa, guru, dan admin memiliki hak berbeda sesuai `gtk_profiles.role`
- **No Public Access**: Policy tidak boleh menggunakan `USING (true)` di produksi
- **Secure Storage**: Token, API key, dan data sensitif TIDAK disimpan di `localStorage`

Lihat file `supabase_rls_secure.sql` (di root) untuk detail policy yang aman, atau [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) untuk panduan implementasi.

## PWA (Progressive Web App)

Aplikasi dapat diinstall di perangkat (Android, iOS, desktop) melalui browser.

### Persiapan

Pastikan file ikon berikut tersedia sebelum deployment:

- `public/icon-192.png` (192x192 PNG untuk home screen)
- `public/icon-512.png` (512x512 PNG untuk splash screen)

Manifest sudah dikonfigurasi di `public/manifest.webmanifest`.
Service worker berada di `public/sw.js`.

Lihat [`docs/PWA_DEPLOYMENT.md`](docs/PWA_DEPLOYMENT.md) untuk checklist PWA lengkap.

### Testing PWA Lokal

1. Build aplikasi: `npm run build`
2. Preview: `npm run preview`
3. Buka DevTools (F12) > **Application > Manifest** untuk cek manifest
4. Buka DevTools > **Application > Service Workers** untuk cek SW
5. Di browser desktop Chrome/Edge, klik icon "+ Install" di address bar

## Checklist Sebelum Go-Live

- [ ] **Supabase Project** dibuat dan skema dijalankan
- [ ] **RLS Secure** diterapkan (bukan policy publik lagi)
- [ ] **Authentication** dikonfigurasi (Email/Password minimal)
- [ ] **Environment Variables** disetel di Cloudflare Pages
- [ ] **Domain & DNS** mengarah ke Cloudflare
- [ ] **PWA Icons** (`icon-192.png`, `icon-512.png`) tersedia
- [ ] **Build lokal** berhasil: `npm run build`
- [ ] **Test login** dengan berbagai role (student, teacher, admin)
- [ ] **Test isolasi data** (siswa tidak bisa lihat data siswa lain)
- [ ] **Test multi-tenant** (guru sekolah A tidak bisa akses sekolah B)
- [ ] **HTTPS** aktif di production domain
- [ ] **CORS** dan **redirect URL** sudah benar di Supabase Auth
- [ ] **WhatsApp Gateway** (opsional) sudah dikonfigurasi jika ingin notifikasi
- [ ] **Backup database** Supabase sudah direncanakan

## Struktur Proyek

```
src/
  ├── App.tsx                 # Entry point dan routing aplikasi
  ├── main.tsx               # React root
  ├── index.css              # Global styles
  ├── types.ts               # TypeScript type definitions
  ├── components/
  │   ├── layout/            # Navbar, AppShell, PageHeader
  │   ├── cards/             # Reusable card components
  │   ├── modals/            # Dialog modals (auth, role switcher)
  │   ├── kiosk/             # QR scanner & kiosk views
  │   ├── payment/           # QRIS checkout modal
  │   └── ui/                # Radix UI + shadcn/ui primitives
  ├── views/                 # Page views (Dashboard, Presensi, Siswa, dll)
  ├── lib/
  │   ├── store.tsx          # Zustand state management + Supabase context
  │   ├── supabase.ts        # Supabase client & auth functions
  │   ├── attendance.ts      # Attendance helper functions
  │   ├── theme.ts           # Theme (light/dark) utilities
  │   ├── utils.ts           # Utility functions
  │   └── sound.ts           # Sound effects for QR scanning
  └── assets/                # Images, fonts, media

public/
  ├── manifest.webmanifest   # PWA manifest
  ├── sw.js                  # Service worker
  ├── icon-192.png           # PWA icon (192x192)
  └── icon-512.png           # PWA icon (512x512)

supabase_schema.sql         # Database schema (import ke Supabase)
supabase_rls_secure.sql     # Secure RLS policies (jalankan setelah schema)
.env.example                # Environment variables template
```

## Development Workflow

### Setup Awal

```bash
# Clone repo
git clone https://github.com/your-org/presensi-v1.7.git
cd presensi-v1.7

# Install dependencies
npm install

# Buat .env.local dari template
cp .env.example .env.local
# Edit .env.local, masukkan Supabase credentials
```

### Development Loop

```bash
# Start dev server (hot reload)
npm run dev
# Buka http://localhost:3000

# Di tab lain, monitor TypeScript errors
npm run lint

# Sebelum push, build untuk cek production build
npm run build
npm run preview
```

### Git Workflow

```bash
# Buat branch untuk fitur baru
git checkout -b feature/attendance-qr-scanner

# Commit dengan pesan deskriptif
git commit -m "feat: add QR code scanning for attendance"

# Push dan buat pull request
git push origin feature/attendance-qr-scanner
```

### Testing Role-based Features

Aplikasi mendukung beberapa role dengan akses berbeda:

| Role       | Akses                                      | Login di          |
|-----------|:-------------------------------------------|:------------------|
| **student** | Absen diri, lihat riwayat, portal mandiri | presensiku.app    |
| **teacher** | Kelola presensi kelas, laporan, jadwal    | presensiku.app    |
| **admin**  | Kelola sekolah, guru, siswa, tenant      | presensiku.app    |
| **superadmin** | Akses semua tenant, konfigurasi platform | presensiku.app/backend |

Untuk testing lokal, gunakan **Role Switcher Modal** (ikon di navbar) untuk berganti role
tanpa logout. **Catatan:** Setelah RLS diterapkan, role switching hanya bekerja dengan
Supabase Auth yang benar dikonfigurasi.

## Support & Issues

- **Bug atau feature request?** Buat issue di GitHub
- **Dokumentasi Supabase:** https://supabase.com/docs
- **Dokumentasi React/Vite:** https://vitejs.dev/ dan https://react.dev/
- **Cloudflare Pages:** https://developers.cloudflare.com/pages/

---

**Dibuat dengan React 19 + TypeScript + Supabase + Tailwind CSS**

Service worker hanya melakukan cache aset GET dan meneruskan request Supabase ke
network. Karena itu, koneksi ke Supabase tetap diperlukan untuk sinkronisasi data.

## Deployment ke Cloudflare Pages

1. Push repository ke GitHub.
2. Di Cloudflare Pages, pilih **Create a project > Connect to Git**.
3. Gunakan konfigurasi berikut:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node.js version: `20` atau lebih baru
4. Tambahkan environment variables yang sama dengan `.env.local` di pengaturan Pages.
5. Deploy branch utama.
6. Tambahkan `presensi.app` dan `presensiku.app` sebagai custom domain.
7. Uji routing, login, PWA install, QR scanner, GPS, dan presensi pada perangkat nyata.

## Checklist Sebelum Produksi

- [ ] RLS Supabase sudah berbasis `auth.uid()` dan `school_id`.
- [ ] Login siswa dan GTK tidak dapat dilewati tanpa autentikasi backend.
- [ ] Data presensi tidak bergantung pada `localStorage` sebagai penyimpanan utama.
- [ ] Token WhatsApp dan secret lainnya dipindahkan ke server-side atau Edge Function.
- [ ] Ikon PWA tersedia dan service worker memakai versi cache yang dinaikkan saat rilis.
- [ ] Backup database dan prosedur pemulihan sudah diuji.
- [ ] Domain, HTTPS, environment variables, dan redirect Auth Supabase sudah diuji.
- [ ] Akun demo dan akses superadmin dinonaktifkan atau dibatasi.

## Alur Kerja GitHub

```bash
git checkout -b fitur/nama-fitur
git add .
git commit -m "feat: deskripsi perubahan"
git push -u origin fitur/nama-fitur
```

Gunakan pull request untuk meninjau perubahan sebelum merge ke branch deployment.
