# Supabase Setup Checklist

Panduan langkah demi langkah untuk menyiapkan Supabase dan menjalankan aplikasi Presensi.

## 1. Persiapan

- [ ] Buat akun di [Supabase](https://supabase.com/)
- [ ] Buat project baru di Supabase (pilih region: ap-southeast-1 Singapore)
- [ ] Tunggu project selesai inisialisasi (1-5 menit)

## 2. Import Database Schema

1. Di Supabase Console, buka menu kiri dan klik **SQL Editor**
2. Klik **New Query**
3. Copy-paste seluruh isi file `supabase_schema.sql` dari root proyek
4. Klik tombol **Run** (atau Ctrl+Enter)
5. Tunggu semua statement selesai (lihat notification atau check mark)

**Verifikasi:** Di menu kiri, klik **Database** dan lihat tabel-tabel berikut terbuat:
- schools
- classes
- students
- attendance_sessions
- attendance_records
- gtk_profiles
- gtk_attendance_records
- lesson_attendances
- lesson_student_attendances
- bk_violations
- student_leave_requests
- weekly_schedules
- academic_years
- academic_calendar_events
- school_locations
- whatsapp_notifications

## 3. Terapkan Row Level Security (RLS)

1. Di **SQL Editor**, klik **New Query** lagi
2. Copy-paste seluruh isi file `supabase_rls_secure.sql` dari root proyek
3. Klik **Run**
4. Tunggu semua policy selesai dibuat

**Verifikasi:** Di menu kiri, klik **Database > Policies** dan lihat policy untuk setiap tabel.

## 4. Setup Authentication

1. Di Supabase Console, klik **Authentication** (menu kiri)
2. Pilih tab **Providers**
3. Pastikan **Email** sudah aktif (biasanya default)
4. (Opsional) Aktifkan **Google**, **GitHub**, atau provider lain sesuai kebutuhan
5. Klik tab **URL Configuration**
6. Di bagian **Site URL**, pastikan URL sudah benar sesuai domain yang akan dipakai
7. Di bagian **Redirect URLs**, tambahkan:
   - `http://localhost:3000/`
   - `http://localhost:3000/*`
   - `https://presensi.app/` (marketing dan pendaftaran sekolah)
   - `https://presensi.app/*`
   - `https://presensiku.app/` (portal pengguna terdaftar)
   - `https://presensiku.app/*`
8. Klik **Save**

## 5. Ambil Credentials

1. Di Supabase Console, klik **Settings** (roda gigi, menu kiri paling bawah)
2. Pilih tab **API**
3. Di bagian **Project API keys**, copy nilai berikut:
   - **Project URL**: Salin ke `VITE_SUPABASE_URL`
   - **anon public**: Salin ke `VITE_SUPABASE_ANON_KEY`

   Jangan ambil **service_role secret key** — itu hanya untuk backend!

4. Edit file `.env.local` di folder proyek (root):
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. Simpan file (jangan push ke GitHub!)

## 5a. Setup WhatsApp melalui Supabase Edge Function (Opsional)

Untuk pengiriman otomatis, gunakan provider Fonnte melalui Edge Function. Token tidak
boleh disimpan di `.env.local` atau dikirim dari frontend.

1. Instal Supabase CLI dan login:
   ```bash
   supabase login
   supabase link --project-ref PROJECT_REF_ANDA
   ```
2. Deploy function:
   ```bash
   supabase functions deploy send-whatsapp
   ```
3. Simpan token Fonnte sebagai secret server:
   ```bash
   supabase secrets set FONNTE_TOKEN=TOKEN_FONNTE_ANDA
   ```
4. Di Pengaturan WhatsApp aplikasi, pilih provider `fonnte`. Pengiriman akan memakai
   function `send-whatsapp`; provider `direct_wa_me` tetap membuka WhatsApp secara gratis.

## 6. Setup di VS Code

1. Buka terminal di VS Code (Ctrl + `)
2. Pastikan sudah di folder proyek: `e:\Frendi Yazid Mubarok\Project\presensi-v1.7`
3. Jalankan:
   ```
   npm install
   npm run dev
   ```
4. Buka `http://localhost:3000` di browser
5. Login dengan email dan password apapun (Supabase akan auto-create user saat registrasi)

## 7. Verifikasi Login & Data

1. Register akun baru dengan email Anda
2. Setelah login, cek di Supabase Console:
   - **Authentication > Users**: Email Anda harus ada di sana
   - **Database > schools**: Tabel schools harus memiliki data (minimal school default)
3. Di aplikasi, coba buat sekolah baru dan siswa
4. Di Supabase, verifikasi data muncul di tabel yang sesuai

## 8. Deploy ke Cloudflare Pages

1. Push kode ke GitHub:
   ```
   git add .
   git commit -m "Setup: Supabase schema dan RLS"
   git push origin main
   ```

2. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com/)

3. Buka **Pages** di menu kiri

4. Klik **Create a project** > **Connect to Git**

5. Izinkan akses ke GitHub account

6. Pilih repository `presensi-v1.7`

7. Isi build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

8. Tambah environment variables (klik **Environment variables**):
   ```
   VITE_SUPABASE_URL: https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

9. Klik **Save and Deploy**

10. Tunggu deployment selesai (biasanya 2-5 menit)

## 9. Setup Domain & DNS

1. Setelah deployment selesai, catat URL Pages yang diberikan Cloudflare
   (format: `https://project-name.pages.dev`)

2. Di Cloudflare Dashboard, buka **Pages** > project Anda

3. Klik tab **Settings** > **Domains**

4. Klik **Add a custom domain**

5. Tambahkan domain pertama:
   - Input: `presensi.app`
   - Klik **Continue**
   - Aktivasi DNS record di Cloudflare (jika domain terkelola di Cloudflare)

6. Ulangi langkah 4-5 untuk domain kedua: `presensiku.app`

7. Tunggu DNS propagate (bisa 1-48 jam, tapi biasanya langsung)

## 10. Update Supabase URL Configuration

Setelah domain aktif di Cloudflare Pages:

1. Di Supabase Console, klik **Authentication > URL Configuration**

2. Update **Site URL** ke domain produksi (jika berbeda):
   - `https://presensi.app` atau
   - `https://presensiku.app`
   (pilih salah satu sesuai default Anda)

3. Verifikasi **Redirect URLs** sudah termasuk kedua domain

4. Klik **Save**

## 11. Test Production Environment

1. Buka `https://presensi.app` di browser
2. Login dengan email dan password
3. Cek di Supabase apakah data konsisten
4. Test di perangkat mobile: buka `https://presensiku.app`
5. Install aplikasi PWA (tap "Add to Home Screen" di browser mobile)

## Troubleshooting

### Error: "Supabase not configured"

**Penyebab:** `.env.local` tidak terisi atau nama key tidak benar

**Solusi:**
- Pastikan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sudah diisi di `.env.local`
- Restart dev server: `npm run dev`
- Clear cache browser (F12 > Application > Clear storage)

### Error: "Permission denied" saat insert/update data

**Penyebab:** RLS policy belum diterapkan atau login belum valid

**Solusi:**
- Verifikasi `supabase_rls_secure.sql` sudah dijalankan
- Login ulang dengan email yang terdaftar di Supabase Auth
- Di Supabase Console, cek `Authentication > Users` apakah email ada

### Build di Cloudflare Pages gagal

**Penyebab:** Environment variables tidak lengkap atau dependency error

**Solusi:**
- Klik **View build log** di Cloudflare Pages
- Cek apakah `npm install` berhasil
- Verifikasi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sudah diset
- Jalankan `npm run build` lokal untuk cek error

### Login lokal berhasil tapi tidak bisa akses data Supabase

**Penyebab:** Mode demo (login lokal) tidak menggunakan Supabase Auth, RLS akan block

**Solusi:**
- Register akun baru di aplikasi untuk auto-create Supabase Auth user
- Atau, di `src/lib/store.tsx`, ubah `isSupabaseConfigured()` untuk detect Supabase
- Jangan gunakan "Role Switcher" di navbar untuk bypass login, gunakan untuk dev saja

## Referensi

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [React 19 Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)

---

Jika ada pertanyaan, buat issue di GitHub atau hubungi tim development.
