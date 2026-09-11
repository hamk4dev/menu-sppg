# SPPG Kolaka Pomalaa Dawi-Dawi — Website Makan Bergizi Gratis

Website informasi harian SPPG: menu harian + foto (resolusi asli), nilai gizi per porsi,
jam batas konsumsi, dan arsip menu yang dapat dilacak kembali per tanggal.

## Arsitektur

| Lapisan | Layanan | Peran |
|---|---|---|
| Hosting | **Vercel** | Sajikan situs + API serverless (`/api/*`) |
| Database | **Supabase** (Postgres) | Tabel `menus` (per tanggal) & `schedules` |
| Storage foto | **Cloudinary** | Foto diupload *signed* dari browser, tersimpan **apa adanya (HD)** |

Alur data:
- Publik: `GET /api/get-menu?date=YYYY-MM-DD` → tampil (dibaca semua orang, data sama).
- Admin login → dapat token (12 jam) → semua tulis (`save-menu`, `save-gizi`, `save-jadwal`, `upload-sign`) wajib membawa token.
- Foto: browser minta signature ke `/api/upload-sign` → upload langsung ke Cloudinary → URL disimpan ke Supabase.

## Struktur Direktori

```
sppg-website/
├── index.html              # Satu-satunya halaman (publik + login + admin)
├── vercel.json             # Security headers + no-cache untuk /api
├── package.json            # Dependency @supabase/supabase-js (untuk API)
├── .env.example            # Contoh variabel environment (jangan commit .env!)
├── assets/
│   ├── logo-sppg.png       # Letakkan logo SPPG di sini
│   └── logo-bgn.svg        # Letakkan logo BGN di sini
├── css/style.css
├── js/
│   ├── config.js           # CLOUDINARY_CLOUD_NAME (aman dipublikasi) & batas ukuran foto
│   ├── main.js             # Tampilan publik + login
│   └── admin.js            # Dashboard admin
├── api/
│   ├── _lib/
│   │   ├── supabase.js     # Koneksi service-role (server-side saja)
│   │   └── auth.js         # Token HMAC-SHA256, cek kredensial, rate-limit login
│   ├── login.js            # POST → token (rate-limit 5x/5menit per IP)
│   ├── get-menu.js         # GET  → menu + jadwal per tanggal (publik)
│   ├── list-dates.js       # GET  → daftar tanggal terarsip (publik)
│   ├── save-menu.js        # POST (admin) → upsert menu + URL foto
│   ├── save-gizi.js        # POST (admin) → upsert nilai gizi
│   ├── save-jadwal.js      # POST (admin) → ganti daftar jadwal
│   └── upload-sign.js      # POST (admin) → signature upload Cloudinary
└── supabase/schema.sql     # Skema tabel + RLS + data awal jadwal
```

## Panduan Setup (sekali saja, ±45 menit)

### 1. Supabase (database)
1. Buat project baru di https://supabase.com (region **Singapore** lebih dekat ke Indonesia).
2. Buka **SQL Editor** → salin seluruh isi `supabase/schema.sql` → **Run**.
3. Buka **Project Settings → API** → salin `Project URL` dan **`service_role` key** (BUKAN `anon`).

### 2. Cloudinary (foto HD)
1. Daftar di https://cloudinary.com → dashboard → catat **Cloud name**.
2. Buka **Settings → Access Keys** → catat `API Key` dan `API Secret`.
3. Tidak perlu upload preset — upload memakai **signed** dari server.

### 3. Deploy ke Vercel
1. Push folder ini ke GitHub/GitLab **atau** install Vercel CLI.
2. Import project di https://vercel.com → **Environment Variables**, isi sesuai `.env.example`:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_USER` (mis. `admin`)
   - `ADMIN_PASS_SALT` → string acak panjang (ketik bebas, mis. 40+ karakter)
   - `ADMIN_PASS_SHA256` → hasil perintah ini di terminal (ganti `SandiAnda` dan salt):
     ```
     node -e "const c=require('crypto');const s='SALT_YANG_SAMA_DENGAN_DI_ATAS';console.log(c.createHash('sha256').update('SandiAnda'+s).digest('hex'))"
     ```
   - `AUTH_SECRET` → string acak lain (minimal 32 karakter)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
3. Deploy. Situs live di `https://<nama>.vercel.app`.
4. Salin **Cloud name** juga ke `js/config.js` (`CLOUDINARY_CLOUD_NAME`) lalu commit ulang.

### 4. Logo & domain (opsional)
- Taruh logo di `assets/logo-sppg.png` dan `assets/logo-bgn.svg`.
- Domain sendiri: Vercel → **Settings → Domains** → ikuti instruksi DNS (SSL otomatis gratis).

## Catatan Keamanan

- Kredensial admin ada sebagai **hash SHA-256 bersalt** di environment server — tidak ada di kode.
- Token sesi **HMAC-SHA256**, berlaku 12 jam, disimpan di `sessionStorage` (hilang saat tab ditutup).
- **RLS Supabase**: anon hanya bisa `SELECT`. Semua tulis hanya lewat API dengan service-role key.
- Upload foto **signed**: tidak ada yang bisa upload ke Cloudinary tanpa login admin.
- Validasi input di server (format tanggal, batas item, whitelist URL foto Cloudinary, validasi jam).
- Rate-limit login 5 percobaan / 5 menit per IP. Security headers (CSP, X-Frame-Options, nosniff) via `vercel.json`.
- Semua render teks memakai `textContent` (cegah XSS); tidak ada `innerHTML` dengan data pengguna.

## Operasional Harian

1. Buka situs → **Login Admin**.
2. Panel **Menu Harian**: pilih tanggal, klik area foto untuk unggah (JPG/PNG/WebP, maks. 10 MB, tersimpan asli), isi daftar menu → **Simpan & Terbitkan**.
3. Panel **Nilai Gizi**: isi angka → terbitkan (terikat pada tanggal menu aktif).
4. Panel **Jam Konsumsi**: ubah satuan/jam bila perlu.
5. Publik otomatis melihat perubahan; arsip tanggal tersimpan permanen untuk fitur **Lacak Menu Sebelumnya**.

## Pemakaian Kuota Gratis

- Cloudinary: 25 GB (~5.000–8.000 foto asli) • Supabase: 500 MB DB (cukup puluhan tahun data teks) • Vercel: Hobby cukup untuk trafik SPPG.
