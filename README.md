# 🏦 BRILink Management System — Mobile PWA

Sistem Pembukuan, Pencatatan Transaksi, dan Monitoring Keuangan Agen BRILink Multi-Cabang berbasis **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, dan **Progressive Web App (PWA)**.

Aplikasi dirancang khusus untuk pemilik usaha agen BRILink dengan 2 cabang operasional (Pusat & Pasar) dan dapat diinstal langsung di HP Android layaknya aplikasi native tanpa Google PlayStore.

---

## 🚀 Fitur Utama

- **Multi-Cabang & Multi-Role**: Role Owner (akses gabungan seluruh cabang) dan Kasir (khusus cabangnya).
- **Akuntansi BRILink Riil**: Pemisahan tegas antara **Uang Kas Fisik di Laci** dan **Saldo Rekening Bank/EDC**.
- **Presisi Laba Bersih**: Keuntungan = Biaya Admin Nasabah − Potongan Bank. Nominal transfer tidak dihitung sebagai omzet palsu.
- **Progressive Web App (PWA)**:
  - Layar penuh (*standalone mode*) tanpa address bar browser.
  - Web App Manifest & Service Worker dengan pre-caching aman.
  - Halaman offline fallback (`/offline`).
  - Navigasi bawah (*Bottom Navigation Bar*) ergonomis untuk HP Android.
  - Transformasi tabel menjadi *Card List* mobile banking pada layar smartphone.
  - Form transaksi dengan *numeric keyboard* (`inputMode="numeric"`) dan chip nominal cepat.
- **Manajemen Modal & Saldo**: Tambah modal, penarikan modal, transfer saldo antar-cabang, dan penyesuaian berita acara.
- **Koreksi / Reversal Transaksi**: Reversal otomatis mengembalikan mutasi saldo kas & bank dengan alasan wajib (tanpa *hard delete*).
- **Ekspor Laporan**: Unduh laporan keuangan dalam format **Excel (`.xlsx`)** dan **PDF (`.pdf`)** serta cetak struk termal mini.
- **Audit Log Immutable**: Merekam setiap login, mutasi, transaksi, dan reversal secara kronologis.

---

## 🔐 Kredensial Default Pengujian

| Role | Username | Password | Penugasan Cabang |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner` | `owner123` | **Semua Cabang** (Pusat & Pasar) |
| **Kasir 1** | `kasir1` | `kasir123` | **BRILink Cabang 1 (Pusat)** |
| **Kasir 2** | `kasir2` | `kasir123` | **BRILink Cabang 2 (Pasar)** |

*Tersedia tombol akses cepat 1-klik di halaman `/login` untuk pengujian instan.*

---

## ☁️ Panduan Deploy ke Vercel

### Metode 1: Deploy Otomatis via GitHub (Sangat Direkomendasikan)

1. **Buat Repositori Baru di GitHub**:
   - Buka [github.com/new](https://github.com/new).
   - Beri nama repository, misalnya: `brilink-management`.
   - Pilih *Private* atau *Public*, lalu klik **Create repository**.

2. **Hubungkan & Push dari Komputer Anda**:
   ```bash
   cd /opt/lampp/htdocs/bri
   
   # Hubungkan ke repository GitHub Anda
   git remote add origin https://github.com/USERNAME_ANDA/brilink-management.git
   git branch -M main
   git push -u origin main
   ```

3. **Import ke Vercel**:
   - Buka dashboard [vercel.com/new](https://vercel.com/new).
   - Pilih **Import Git Repository** dan pilih repo `brilink-management`.
   - Vercel akan otomatis mendeteksi framework **Next.js**.

4. **Konfigurasi Environment Variables di Vercel**:
   Di bagian **Environment Variables**, tambahkan:
   - `AUTH_SECRET`: String acak 32+ karakter (contoh: `brilink-super-secret-jwt-key-production-2026`)
   - `NEXT_PUBLIC_APP_NAME`: `BRILink Management`
   - `DATABASE_URL`: URL PostgreSQL dari penyedia database cloud gratis seperti:
     - **Neon.tech** (*Free Serverless Postgres*)
     - **Supabase** (*Free PostgreSQL*)
     - **Vercel Postgres** (*Terintegrasi langsung di tab Storage Vercel*)
   *(Catatan: Jika `DATABASE_URL` belum diisi, aplikasi tetap dapat berjalan menggunakan in-memory/temporary storage dengan data seed awal).*

5. **Klik "Deploy"**:
   - Tunggu proses build selesai (~1-2 menit).
   - Domain HTTPS aktif otomatis (contoh: `https://brilink-management.vercel.app`).

---

### Metode 2: Deploy Langsung via Vercel CLI di Terminal

1. Buka terminal di laptop/komputer Anda:
   ```bash
   cd /opt/lampp/htdocs/bri
   ```

2. Jalankan login Vercel (akan membuka konfirmasi login di browser):
   ```bash
   npx vercel login
   ```

3. Jalankan deployment ke production:
   ```bash
   npx vercel --prod
   ```

4. Ikuti panduan singkat di terminal:
   - *Set up and deploy?* **Y**
   - *Which scope do you want to deploy to?* (Pilih akun Anda)
   - *Link to existing project?* **N**
   - *What's your project's name?* **brilink-management**
   - *In which directory is your code located?* **./**
   - *Want to modify these settings?* **N**

5. Selesai! URL produksi HTTPS Anda akan langsung ditampilkan di terminal.

---

## 🛠️ Menjalankan Secara Lokal (Development)

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Jalankan development server
npm run dev

# Buka http://localhost:3000 di browser
```

---

## 📲 Cara Install di HP Android

1. Buka URL Vercel aplikasi Anda melalui **Google Chrome** di HP Android.
2. Tekan banner hijau **"Install PWA"** di bagian atas layar, ATAU tekan menu titik tiga browser (⋮) $\rightarrow$ pilih **"Install aplikasi"** / **"Tambahkan ke Layar Utama"**.
3. Aplikasi akan terpasang di Home Screen dan dapat dibuka dalam mode layar penuh (*standalone*).
