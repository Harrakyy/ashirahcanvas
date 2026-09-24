# Master Handover Plan: AshiraTech SaaS (Frontend & Backend)

> **Dokumen Panduan Handover & Kerja Kolaboratif untuk 1 Backend Engineer & 1 Frontend Engineer.**  
> Dokumen ini adalah *single source of truth* untuk pembagian tugas, batasan folder (ownership), arsitektur, kontrak API, dan roadmap pengerjaan fitur.

---

## 1. Konteks Proyek & Visi Bisnis

**AshiraTech** adalah platform SaaS *end-to-end* untuk industri konveksi dan garmen di Indonesia. Platform ini melayani 3 level pengguna:
1. **SuperAdmin (AshiraTech):** Pemilik SaaS, memantau GMV platform, tenant klien, dan potongan platform fee.
2. **Admin (Client Konveksi/Garmen):** Memiliki tenant sendiri, mengelola order, melihat blueprint desain, memverifikasi pembayaran DP 70% dan pelunasan 30%, update status produksi, input nomor resi kurir, dan download invoice PDF berlogo.
3. **Customer (Pembeli Akhir):** Menggunakan canvas desain Fabric.js, negosiasi harga dengan AI AshirahBot, checkout DP 70% via Duitku, memantau status pesanan di portal, dan bayar pelunasan 30% setelah selesai produksi.

> 📖 *Untuk cerita bisnis & latar belakang lengkap, baca:* [`MD/PRODUCT_STORY.md`](./PRODUCT_STORY.md)  
> 📖 *Untuk penjelasan arsitektur modul, baca:* [`MD/ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 2. Model Kolaborasi & Pembagian Ownership

Aplikasi ini menggunakan arsitektur **Modular Monolith (Next.js App Router)**. Frontend dan Backend berada dalam satu repository, namun memiliki batas tanggung jawab (*boundaries*) yang sangat tegas.

### 2.1 Batas Kepemilikan Folder (Ownership Matrix)

| Folder | Pemilik Utama | Tanggung Jawab |
|---|---|---|
| `app/api/` | **Backend** | Route handlers, webhook (Duitku, Biteship), validasi payload, auth guard. |
| `lib/server/` | **Backend** | Server-only logic: DB queries, Drizzle schema, pricing engine, Groq AI, Email (Resend), Biteship & Duitku clients. |
| `lib/db/` | **Backend** | Skema database PostgreSQL (Drizzle), migrasi, seeders. |
| `types/` | **Bersama (Kontrak)** | Type request/response, interface data. **Wajib disepakati berdua sebelum koding.** |
| `lib/config/` | **Bersama** | Konstanta produk, zonasi sablon (`zones.ts`, `print-areas.ts`), status pesanan. |
| `components/` | **Frontend** | Komponen UI React (Tailwind v4, Radix/shadcn), canvas toolbar, modal, table, charts. |
| `lib/ui/` | **Frontend** | Fabric.js canvas engine (`canvas-engine.ts`), visual design state, blueprint extractor. |
| `store/` | **Frontend** | Zustand state management client-side. |
| `app/(pages)` | **Frontend** | Halaman UI (`/editor`, `/admin/*`, `/superadmin/*`, `/orders/*`). |

---

## 3. Aturan Emas (Golden Rules) Wajib Dipatuhi

1. **Harga Mutlak Server-Authoritative:**  
   Frontend **TIDAK PERNAH** menghitung harga final sendiri. Semua perhitungan total, diskon negosiasi, DP 70%, dan pelunasan 30% berasal dari `lib/server/pricing.ts` melalui API.
2. **No Import `lib/server/` di Client:**  
   Komponen React bertanda `'use client'` dilarang keras meng-import apapun dari `lib/server/`. Komunikasi frontend ke backend selalu lewat HTTP fetch ke `/app/api/*`.
3. **Multi-Tenant Data Isolation:**  
   Setiap query/mutasi yang dilakukan Admin wajib difilter dengan `tenantId` session aktif. Tidak boleh ada kebocoran data antar konveksi.
4. **Logo Gate pada Invoice:**  
   Invoice PDF formal tidak boleh bisa di-generate/download jika tenant belum mengunggah logo usaha di `/admin/profile`.
5. **Ashira Brand Palette:**  
   Gunakan token warna resmi Ashira di `app/globals.css`: Primary Navy (`#1A2B56`), Black (`#0A0A0F`), dan Lilac accents. Jangan gunakan warna random di luar design system.
6. **Ponytail Philosophy (Lazy Senior Developer):**  
   - **YAGNI:** Jangan buat abstraksi rumit jika belum dibutuhkan.
   - **Reuse:** Gunakan komponen/helper yang sudah ada sebelum membuat baru.
   - **Native:** Prioritaskan native web APIs dan Drizzle/Next.js bawaan.

---

## 4. Panduan Setup Lokal

### 4.1 Prerequisites
- Node.js v20+
- pnpm atau npm
- PostgreSQL database lokal atau Supabase/Neon
- Akun Duitku Sandbox, Biteship Test, dan Resend API Key

### 4.2 Langkah Setup
```bash
# 1. Clone & install
git clone <repo-url>
cd design-editor-dashboard
pnpm install

# 2. Setup Environment Variables
cp .env.example .env.local
# Sesuaikan .env.local (lihat panduan env di bawah)

# 3. Sinkronisasi Database
npx drizzle-kit push

# 4. Jalankan Dev Server
pnpm dev
# Frontend & API aktif di http://localhost:3000
```

### 4.3 Panduan Environment Variables (`.env.local`)

| Variable | Dibutuhkan Oleh | Deskripsi |
|---|---|---|
| `DATABASE_URL` | Backend | URL koneksi PostgreSQL |
| `AUTH_SECRET` | Backend | Secret key session NextAuth |
| `GROQ_API_KEY` | Backend | API Key Groq untuk AI Chat Negosiasi |
| `DUITKU_MERCHANT_CODE` | Backend | Kode merchant Duitku Sandbox/Live |
| `DUITKU_API_KEY` | Backend | API Key Duitku |
| `BITESHIP_API_KEY` | Backend | API Key Biteship ongkir & tracking |
| `BITESHIP_ENV` | Backend | `stub` untuk lokal / `production` untuk live |
| `RESEND_API_KEY` | Backend | API Key email notifikasi transaksional (Resend) |
| `NEXT_PUBLIC_APP_URL` | Frontend & BE | Base URL aplikasi (default `http://localhost:3000`) |

---

## 5. Workflow Kolaborasi Antara FE & BE

```
[Kebutuhan Fitur Baru]
         │
         ▼
1. FE & BE Sepakati Kontrak Tipe di `types/<feature>.ts`
         │
         ├───▶ [BE] Buat Drizzle Schema, Migration & API Handler di `app/api/<feature>`
         │          (Bisa ditest via Postman/cURL/Unit Test)
         │
         └───▶ [FE] Buat Mock Data berdasarkan `types/<feature>.ts` & Rancang UI
         │
         ▼
2. Integrasi: FE ganti mock ke endpoint aktual `/api/<feature>`
         │
         ▼
3. Verification: Jalankan Playwright Test (`pnpm test`) & Type Check (`npx tsc --noEmit`)
         │
         ▼
4. PR & Code Review
```

---

## 6. Pembagian Tugas & Roadmap Eksekusi (Prioritas)

Berikut adalah daftar backlog pekerjaan yang siap dieksekusi oleh Backend dan Frontend:

### 🚀 Sprint 1: Go-Live & Operational Readiness (Prioritas Kritis)

#### 🛠️ Tugas Backend Engineer
1. **Sistem Notifikasi Email Transaksional (Resend):**
   - Integrasikan `RESEND_API_KEY` pada service email di `lib/server/mail.ts`.
   - Kirim email konfirmasi pesanan baru & instruksi bayar DP 70% saat pesanan dibuat.
   - Kirim email tanda terima pembayaran saat DP lunas diverifikasi (webhook Duitku).
   - Kirim email tagihan pelunasan 30% saat pesanan masuk status `ready` (siap kirim).
   - Kirim email konfirmasi pengiriman & nomor resi ekspedisi saat status menjadi `shipped`.
2. **Platform Fee Distribution & Rekonsiliasi:**
   - Buat endpoint `/api/admin/financials` dan `/api/superadmin/financials` untuk kalkulasi pemotongan fee otomatis.
   - Buat query rekapitulasi dana yang harus ditransfer ke rekening admin konveksi (Total Omset - Platform Fee).
3. **Webhook Duitku Idempotency & Error Logging:**
   - Pastikan webhook handler Duitku tahan terhadap duplicate request (idempotent).
   - Simpan audit log status pembayaran ke database.

#### 🎨 Tugas Frontend Engineer
1. **Live Courier Tracking Widget (Biteship):**
   - Buat komponen visual tracker di `/orders/[id]` yang menampilkan status rute pengiriman paket (Manifested, On Transit, Delivered) menggunakan data dari Biteship.
2. **Penyempurnaan Halaman Profil Usaha & Logo Gate UX:**
   - Pastikan notifikasi/banner "Logo Belum Diunggah" di `/admin` tampil elegan jika tenant baru belum memiliki logo.
   - Buat panduan ukuran logo yang ideal (PNG transparan) pada form upload.
3. **SuperAdmin Revenue & Tenant Analytics View:**
   - Hubungkan chart di `/superadmin` ke endpoint revenue platform fee.
   - Tampilkan daftar tenant aktif beserta total pesanan yang diproses.

---

### 📦 Sprint 2: E-Commerce Experience & Pertumbuhan (Prioritas Tinggi)

#### 🛠️ Tugas Backend Engineer
1. **Multi-Item & Multi-Ukuran Support:**
   - Update tabel `order_items` agar bisa menampung rincian variasi ukuran (contoh: 20 pcs S, 50 pcs M, 30 pcs XL) dalam satu nomor invoice.
   - Sesuaikan kalkulator harga `lib/server/pricing.ts` untuk mendukung tiering kuantitas multi-item.
2. **Onboarding Tenant Baru Otomatis:**
   - Buat endpoint pembuatan tenant baru oleh SuperAdmin yang otomatis men-generate credential login sementara dan mengirimkannya via email resmi ke pemilik konveksi.
3. **Discount & Promo Code Engine:**
   - Skema tabel `promo_codes` (kode, tipe potongan %, masa berlaku, tenantId).
   - Validasi promo pada endpoint `/api/quote`.

#### 🎨 Tugas Frontend Engineer
1. **Selector Multi-Ukuran pada Panel Review Editor:**
   - Buat UI input breakdown ukuran baju (S, M, L, XL, XXL) yang dinamis pada saat sebelum checkout.
   - Tampilkan ringkasan total kuantitas secara real-time.
2. **Form Input Kupon / Promo Code:**
   - Tambahkan input promo code di ringkasan checkout sebelum bayar DP 70%.
3. **Customer Review & Testimonial Post-Delivery:**
   - Tambahkan modal/halaman review bintang 1-5 dan feedback setelah status order berubah menjadi `delivered`.

---

## 7. Standar Quality Gate (Sebelum Kirim Pull Request)

Setiap PR dari Backend maupun Frontend wajib lolos checklist berikut:

```bash
# 1. Tidak ada error TypeScript baru
npx tsc --noEmit

# 2. Lolos automated E2E & integration test
pnpm test

# 3. Linter bersih
pnpm lint
```

- [ ] **Data Safety:** Tidak ada logging kredensial rahasia (API key, auth token, password) di console.
- [ ] **Multi-Tenant Check:** Query tidak boleh bocor ke tenant lain.
- [ ] **Mobile Responsiveness:** Komponen baru harus rapi dibuka di layar HP/tablet.

---

## 8. Kontak & Jalur Komunikasi

- **Lead / Product Owner:** AshiraTech
- **Issue Tracking:** GitHub Issues & Project Board
- **Dokumentasi Pendukung:**
  - `MD/ARCHITECTURE.md` — Rincian arsitektur teknis
  - `MD/PRODUCT_STORY.md` — Cerita produk & persona user
  - `lib/db/schema.ts` — Skema database terkini
