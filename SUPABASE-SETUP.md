# Setup Supabase — Aplikasi Absensi PT Malaka Express Line

Panduan sekali setup agar backend (`netlify/functions/api.ts`) bisa jalan.

## 1. Buat project Supabase

1. Buka https://supabase.com → **New project**
2. Isi nama project (mis. `absensi-malaka`), pilih region **Singapore**
3. Simpan **database password** baik-baik
4. Tunggu project selesai dibuat (±2 menit)

## 2. Jalankan migration SQL

1. Di dashboard Supabase → **SQL Editor** → **New query**
2. Buka file `supabase/migrations/001_attendance.sql` di repo ini
3. Copy seluruh isi → paste ke SQL Editor → **Run**
4. Pastikan muncul "Success" (tabel + seed data terbuat)

Cek: menu **Table Editor** → tabel `admins` berisi 1 baris (`admin`),
tabel `employees` berisi 3 baris (`KRY001`, `KRY002`, `KRY003`).

## 3. Ambil API keys

1. Dashboard Supabase → **Project Settings** (ikon gear) → **API**
2. Salin:
   - **Project URL** → `https://xxxx.supabase.co`
   - **service_role key** (klik Reveal) → `eyJhbG...` (RAHASIA, jangan disebar)

## 4. Set environment variables di Netlify

1. Buka https://app.netlify.com → pilih site `stately-hamster-a8160c`
   (atau site baru hasil deploy repo ini)
2. **Site settings** → **Environment variables** → **Add a variable**:
   - Key: `SUPABASE_URL` — Value: Project URL dari langkah 3
   - Key: `SUPABASE_SERVICE_ROLE_KEY` — Value: service_role key dari langkah 3
3. **Deploys** → **Trigger deploy** → **Deploy site** (agar env var aktif)

## 5. Akun default

| Peran    | User ID | Password    |
|----------|---------|-------------|
| Admin    | admin   | admin123    |
| Karyawan | KRY001  | karyawan123 |
| Karyawan | KRY002  | karyawan123 |
| Karyawan | KRY003  | karyawan123 |

> Ganti password default setelah login pertama via menu Panel Admin.

## 6. Verifikasi

Buka `https://<site-anda>.netlify.app/api/health` → harus balas:
```json
{"status":"ok","timestamp":"..."}
```

Lalu login sebagai admin di halaman utama.

## Catatan

- Foto absensi disimpan sebagai data-URL (base64) di kolom `clock_in_photo` /
  `clock_out_photo`. Untuk skala besar, pindahkan ke Supabase Storage.
- Perhitungan "hari ini" memakai zona **WIB (Asia/Jakarta)**.
- Alamat lokasi diisi otomatis oleh backend (reverse-geocode Nominatim)
  saat clock-in mengirim latitude/longitude.
