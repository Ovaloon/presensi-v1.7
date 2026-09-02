# Checklist: PWA & Deployment

Panduan persiapan PWA (Progressive Web App) dan deployment ke Cloudflare Pages + domain custom.

## PWA (Progressive Web App)

Aplikasi dapat diinstall di perangkat mobile dan desktop seperti aplikasi native.

### Checklist PWA

- [ ] **Icons**: Buat dan letakkan file ikon berikut:
  - `public/icon-192.png` (192x192 PNG)
  - `public/icon-512.png` (512x512 PNG)
  
  **Rekomendasi:** Gunakan tool online seperti [Favicon Generator](https://www.favicon-generator.org/) atau design sendiri dengan Figma.

- [ ] **Manifest**: File `public/manifest.webmanifest` sudah ada dan terkonfigurasi
  
  Verifikasi:
  ```bash
  cat public/manifest.webmanifest
  ```
  
  Pastikan berisi:
  ```json
  {
    "name": "Presensi.app",
    "short_name": "Presensi",
    "icons": [
      { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ],
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#1e40af",
    "background_color": "#ffffff"
  }
  ```

- [ ] **Service Worker**: File `public/sw.js` sudah ada
  
  Verifikasi:
  ```bash
  cat public/sw.js
  ```

- [ ] **Index.html**: Meta tag `<link rel="manifest">` sudah ada
  
  Verifikasi di `index.html`:
  ```html
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#1e40af">
  ```

### Testing PWA Lokal

1. Build aplikasi:
   ```bash
   npm run build
   ```

2. Preview:
   ```bash
   npm run preview
   ```

3. Di browser (Chrome/Edge), buka DevTools (F12)

4. Tab **Application**:
   - Cek **Manifest** sudah terbaca
   - Cek **Service Workers** sudah registered

5. Di address bar Chrome/Edge, icon "+" harus muncul (Install app)

6. Klik install dan cek aplikasi bisa dibuka dari home screen

### Testing PWA di Mobile

1. Deploy ke Cloudflare Pages terlebih dahulu
2. Buka `https://presensiku.app` di browser mobile (Chrome/Safari)
3. Tap menu (⋮) > **Add to Home screen**
4. Aplikasi akan muncul di home screen seperti aplikasi native

## Deployment Checklist

### Pre-Deployment

- [ ] **Code cleanup**:
  ```bash
  npm run lint
  npm run build
  ```
  Pastikan tidak ada error TypeScript atau build.

- [ ] **Environment Variables (.env.local)**:
  - [ ] `VITE_SUPABASE_URL` terisi
  - [ ] `VITE_SUPABASE_ANON_KEY` terisi
  - [ ] File `.env.local` ada di `.gitignore` (jangan commit!)

- [ ] **Git status clean**:
  ```bash
  git status
  ```
  Pastikan hanya file yang seharusnya di-commit (bukan node_modules, dist, .env.local)

- [ ] **Supabase RLS** sudah diterapkan:
  - [ ] Script `supabase_rls_secure.sql` sudah dijalankan
  - [ ] Verifikasi di Supabase Console > Database > Policies

### Deployment Steps

1. **Push ke GitHub**:
   ```bash
   git add .
   git commit -m "Deploy: PWA + Supabase integration"
   git push origin main
   ```

2. **Cloudflare Pages**:
   - [ ] Create project baru atau connect existing repo
   - [ ] Build command: `npm run build`
   - [ ] Output directory: `dist`
   - [ ] Env vars:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

3. **Domain Setup**:
  - [ ] `presensi.app` → halaman marketing dan pendaftaran
  - [ ] `presensiku.app` → portal aplikasi pengguna terdaftar
   - [ ] DNS sudah propagate (test dengan `nslookup` atau `dig`)

4. **HTTPS**:
   - [ ] Cloudflare Pages otomatis provide SSL/TLS
   - [ ] Verifikasi certificate valid di browser

5. **Redirect URL di Supabase**:
   - [ ] Tambahkan `https://presensi.app/*`
   - [ ] Tambahkan `https://presenciku.app/*`

### Post-Deployment

- [ ] **Test Login**:
  - [ ] Register user baru
  - [ ] Login dengan email/password
  - [ ] Cek data terlihat di Supabase Console

- [ ] **Test Multi-Tenant**:
  - [ ] Login sebagai admin Sekolah A
  - [ ] Buat sekolah baru (jika role memungkinkan)
  - [ ] Logout dan login sebagai admin Sekolah B
  - [ ] Verifikasi admin B tidak bisa lihat data Sekolah A

- [ ] **Test Student Role**:
  - [ ] Login sebagai siswa
  - [ ] Cek hanya bisa akses presensi diri sendiri
  - [ ] Tidak bisa lihat data siswa lain

- [ ] **Test PWA**:
  - [ ] Buka `https://presensiku.app` di mobile
  - [ ] Install ke home screen
  - [ ] Tap aplikasi dan cek bisa berjalan offline (basic)

- [ ] **Performance**:
  - [ ] Load time wajar (< 3s)
  - [ ] Cek DevTools > Network > size bundle
  - [ ] Cek DevTools > Lighthouse PWA score

### Monitoring

- [ ] Setup error tracking (Sentry, Rollbar, atau logging manual)
- [ ] Setup analytics (Google Analytics atau Plausible)
- [ ] Enable Supabase backups & replicas
- [ ] Monitor Cloudflare Pages build logs untuk errors

## Troubleshooting

### PWA tidak bisa install

**Penyebab:** Icon atau manifest tidak valid

**Solusi:**
- Verifikasi icon file ada di `public/` dan size tepat
- Validate manifest JSON di [web.dev Manifest Validator](https://web.dev/manifest-validator/)
- Restart dev server: `npm run dev`
- Clear browser cache

### Build gagal di Cloudflare

**Penyebab:** Environment variables tidak lengkap atau dependency tidak cocok

**Solusi:**
- Klik "View build log" di Cloudflare Pages
- Pastikan `VITE_` vars sudah diset di Cloudflare Pages settings
- Jalankan `npm install` lokal dan `npm run build` untuk debug

### Domain tidak resolve

**Penyebab:** DNS belum propagate atau Cloudflare nameserver belum aktif

**Solusi:**
- Tunggu 1-24 jam untuk DNS propagate
- Di domain registrar, pastikan nameserver sudah ke Cloudflare
- Test: `nslookup presensi.app`

### Login berhasil tapi aplikasi blank

**Penyebab:** Environment variables tidak terpass ke browser atau Supabase not configured

**Solusi:**
- Cek browser DevTools > Application > Environment Variables
- Cek file `.env.local` di local development
- Di Cloudflare Pages settings, verifikasi vars sudah tersimpan
- Rebuild & redeploy

## Referensi

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: Installable Web Apps](https://web.dev/installable-web-apps/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare SSL/TLS](https://developers.cloudflare.com/ssl-tls/)

---

Setelah semuanya selesai, aplikasi Anda akan tersedia di `https://presensi.app` dan `https://presensiku.app` dengan dukungan PWA install!
