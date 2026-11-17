# AshiraTech — Product Story

> **Tagline:** *Platform SaaS end-to-end untuk industri konveksi & garmen Indonesia.*

---

## 1. Latar Belakang

Industri konveksi dan garmen lokal di Indonesia mayoritas masih berjalan secara manual — negosiasi harga dilakukan lewat pesan singkat yang tidak terdokumentasi, pembayaran via transfer bank manual tanpa verifikasi otomatis, desain dikirim lewat foto beresolusi rendah, dan tidak ada portal status produksi yang transparan bagi pelanggan.

**AshiraTech** hadir sebagai penyedia jasa SaaS (Software as a Service) yang menjembatani kebutuhan tersebut. AshiraTech menjual *platform* kepada pemilik usaha konveksi/garmen (disebut **Client AshiraTech**), sehingga klien tersebut bisa melayani pelanggannya secara profesional dan terdigitalisasi penuh langsung melalui web portal dan notifikasi email resmi.

---

## 2. Alur Cerita (Business Flow)

```
AshiraTech (Platform Owner)
    │
    │  menyewakan platform SaaS
    ▼
Admin / Client AshiraTech (Konveksi / Garmen)
    │
    │  melayani pelanggan mereka
    ▼
Customer (Pembeli Akhir)
    │
    │  memesan, desain, bayar, terima barang
    ▼
Pesanan Selesai → Revenue tercatat → AshiraTech ambil Platform Fee
```

---

## 3. Pengguna Sistem (3 Roles)

### 👑 Role 1 — SuperAdmin (AshiraTech)

**Siapa:** Tim internal AshiraTech — pemilik platform.

**Kebutuhan:**
- Melihat seluruh tenant (klien) yang terdaftar di platform
- Memantau total revenue / GMV lintas semua tenant
- Melihat grafik pertumbuhan pesanan platform secara keseluruhan
- Menambah / menonaktifkan tenant (klien baru)
- Melihat potongan platform fee dari setiap transaksi

**Akses:** Dashboard SuperAdmin di `/superadmin`

---

### 🏭 Role 2 — Admin (Client AshiraTech / Pemilik Konveksi)

**Siapa:** Pemilik usaha konveksi atau garmen yang berlangganan platform AshiraTech. Setiap admin memiliki *tenant* tersendiri — data mereka terisolasi satu sama lain.

**Kebutuhan:**
- **Profil Usaha:** Upload logo bisnis, isi nama usaha, deskripsi, dan info rekening bank
- **Kelola Pesanan:** Melihat semua pesanan customer, filter berdasarkan status
- **Blueprint Pesanan:** Melihat desain/blueprint yang diunggah customer secara detail
- **Status Pembayaran DP:** Memantau apakah DP 70% dari customer sudah masuk
- **Manajemen Produksi:** Update status pesanan (Antrian → Produksi → Siap Kirim)
- **Input Nomor Resi:** Setelah barang diserahkan ke kurir, admin input no. resi ekspedisi
- **Status Pelunasan:** Memantau apakah pelunasan 30% dari customer sudah dibayar
- **Analitik Bisnis:** Grafik revenue bulanan, distribusi status pesanan, repeat customer
- **Invoice:** Generate invoice PDF formal berlogo bisnis untuk setiap pesanan
- **Export Data:** Download rekap pesanan dalam format CSV
- **CRM:** Database pelanggan beserta riwayat pesanan

**Skema Pembayaran yang Dikelola Admin:**
```
DP 70% (+ Ongkir)   → dibayar saat order dibuat
Pelunasan 30%        → dibayar setelah barang selesai produksi
```

**Akses:** Dashboard Admin di `/admin`

---

### 👤 Role 3 — Customer (Pembeli Akhir)

**Siapa:** Individu atau perusahaan yang memesan kaos/garmen custom melalui platform milik Admin (klien AshiraTech).

**Kebutuhan:**
- **Canvas Desain:** Editor visual interaktif untuk mendesain kaos sendiri (upload logo, gambar, teks)
- **Multi-Zone Design:** Desain bisa ditempatkan di depan, belakang, lengan kiri, dan lengan kanan
- **Negosiasi Harga AI:** Chatbot AI untuk negosiasi harga, MOQ, dan diskon secara otomatis
- **MOQ Validation:** Sistem menegakkan minimum order quantity sesuai ketentuan
- **Blueprint Review:** Bisa melihat ringkasan desain sebelum konfirmasi order
- **Pembayaran DP:** Bayar DP 70% via Duitku (QRIS, VA, transfer)
- **Tracking Status Portal:** Melihat status pesanan di web (Menunggu DP → Produksi → Siap Kirim → Dikirim → Selesai)
- **Tracking Kurir:** Melihat nomor resi dan link lacak ekspedisi (Biteship)
- **Pembayaran Pelunasan:** Bayar sisa 30% saat barang sudah siap kirim
- **Repeat Order:** Pesan ulang dengan 1 klik berdasarkan pesanan sebelumnya
- **Invoice Download:** Download invoice PDF formal berlogo konveksi
- **Email Transaksional:** Menerima invoice dan update status via email resmi

**Akses:** `/`, `/editor`, `/orders`

---

## 4. Tech Stack

| Layer | Teknologi |
|---|---|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **UI** | React 19, Tailwind CSS v4, shadcn/ui |
| **Canvas** | Fabric.js 7.4 |
| **State Management** | Zustand 5 |
| **Database** | PostgreSQL (Drizzle ORM) |
| **Auth** | NextAuth.js (JWT sessions) |
| **AI Chat / Negosiasi** | Groq SDK (llama-3.3-70b-versatile) |
| **Payment Gateway** | Duitku (DP 70% + Pelunasan 30%) |
| **Shipping** | Biteship (kalkulasi ongkir + nomor resi) |
| **Session / Cache** | Upstash Redis |
| **Email Transaksional** | Resend SDK (order, invoice & status) |
| **PDF Invoice** | jsPDF (generate browser-side) |
| **Analytics** | Recharts (grafik revenue & status pesanan) |

---

## 5. Arsitektur Multi-Tenant

Platform ini bersifat **multi-tenant**. Satu database, data setiap klien terisolasi berdasarkan `tenantId`.

```
Database PostgreSQL
├── tenants         → Data klien (admin): nama, logo, pengaturan, rekening
├── users           → Akun user dengan role: superadmin | admin | customer
├── orders          → Pesanan terikat ke tenantId
├── order_items     → Item per pesanan
├── negotiations    → Sesi & riwayat negosiasi harga
└── customers       → CRM: data pelanggan per tenant
```

---

## 6. Status Saat Ini (September 2026)

### ✅ Sudah Live

#### Infrastruktur
- [x] Multi-tenant architecture (isolasi data per klien)
- [x] RBAC (Role-Based Access Control) — 3 role lengkap
- [x] State machine pesanan (7 status: pending → dp_paid → processing → ready → shipped → delivered → cancelled)
- [x] Auth system (login, session, logout)

#### Customer
- [x] Canvas desain interaktif — upload gambar, mockup, layer
- [x] Multi-zone design (depan, belakang, lengan kiri, lengan kanan)
- [x] Negosiasi harga AI (Groq)
- [x] MOQ validation
- [x] Blueprint review sebelum checkout
- [x] Pembayaran DP 70% via Duitku
- [x] Tracking status pesanan di portal web
- [x] Pembayaran pelunasan 30% via Duitku
- [x] Kalkulasi ongkir via Biteship
- [x] Repeat Order (1-klik)
- [x] Download invoice PDF (hitam-putih, berlogo tenant)

#### Admin
- [x] Dashboard pesanan (filter, search, status)
- [x] Lihat blueprint desain customer
- [x] Konfirmasi DP masuk / pelunasan masuk
- [x] Update status produksi
- [x] Input nomor resi ekspedisi
- [x] Export CSV rekap pesanan
- [x] CRM database pelanggan
- [x] Profil usaha & upload logo bisnis
- [x] Invoice gate (logo wajib sebelum invoice bisa digenerate)
- [x] Analitik: grafik revenue bulanan & distribusi status pesanan

#### SuperAdmin
- [x] Dashboard tenant (daftar semua klien)
- [x] Grafik GMV & revenue platform
- [x] Visibilitas platform fee per transaksi

#### Branding & UX
- [x] Ashira Brand Color Palette (Navy #1A2B56, Black #0A0A0F, Lilac accents)
- [x] Invoice PDF formal (hitam-putih, logo tenant, struktur profesional)
- [x] E2E Test 27 test case, 100% pass rate (Playwright)

---

## 7. Gap / Belum Selesai

### 🔴 Kritis
| Gap | Keterangan |
|---|---|
| **Email Transaksional (Resend)** | `RESEND_API_KEY` belum dipasang ke `.env.local` — saat ini notifikasi email masih berupa log lokal. Perlu dihubungkan ke Resend live agar customer otomatis menerima tanda terima & tagihan pelunasan |
| **Platform Fee Distribution** | Fee tercatat di DB tapi belum ada kalkulasi rekapitulasi dana bersih yang harus ditransfer ke rekening klien |

### 🟠 Tinggi
| Gap | Keterangan |
|---|---|
| **Biteship Live Tracking** | Masih mode stub — perlu beralih ke API Biteship production untuk pelacakan kurir real-time |
| **Onboarding Klien Otomatis** | Klien baru yang didaftarkan SuperAdmin belum menerima email kredensial login sementara secara otomatis |

### 🟡 Sedang
| Gap | Keterangan |
|---|---|
| **Cart Multi-Item/Ukuran** | 1 order = 1 jenis item. Belum bisa order 50 pcs L + 30 pcs M sekaligus |
| **Rating & Review** | Customer belum bisa beri bintang & testimoni post-delivery |
| **Kode Promo / Diskon** | Admin belum bisa buat kode diskon khusus |

### 🟢 Nice to Have
- Real-time status (WebSocket / Server-Sent Events)
- Multi alamat pengiriman
- Guest Order (tanpa login)
- PWA / Installable App

---

## 8. Roadmap Kedepan

### Fase 3 — Operasional Live (Q4 2026)
Target: Platform siap digunakan klien nyata dengan notifikasi email dan tracking kurir berjalan otomatis.

| # | Fitur | Prioritas |
|---|---|---|
| 1 | Email Notifikasi Transaksional (Resend) — Order, DP, Pelunasan, & Resi | 🔴 Kritis |
| 2 | Platform Fee Distribution & Rekonsiliasi Dashboard | 🔴 Kritis |
| 3 | Biteship production mode — live tracking kurir | 🟠 Tinggi |
| 4 | Onboarding klien otomatis via email resmi | 🟠 Tinggi |

### Fase 4 — Pertumbuhan Klien (Q1 2027)
Target: Percepat akuisisi klien baru dan tingkatkan retention customer.

| # | Fitur | Prioritas |
|---|---|---|
| 1 | Cart multi-item & multi-ukuran | 🟡 Sedang |
| 2 | Rating & review post-delivery | 🟡 Sedang |
| 3 | Kode promo / diskon | 🟡 Sedang |
| 4 | Laporan finansial PDF bulanan (untuk klien) | 🟡 Sedang |

### Fase 5 — Skala & Monetisasi (Q2 2027)
Target: Platform mulai dimonetisasi dengan subscription tier berbayar.

| # | Fitur |
|---|---|
| 1 | Subscription plan (Basic / Pro / Enterprise) per tenant |
| 2 | Marketplace template desain |
| 3 | Multi-bahasa (EN + ID) |
| 4 | Mobile app (React Native / PWA) |
| 5 | Open API untuk integrasi pihak ketiga (ERP, Tokopedia, Shopee) |
| 6 | Laporan pajak otomatis (PPh Final UMKM) |

---

## 9. Standar Kualitas

| Standar | Target |
|---|---|
| E2E Test Coverage | >= 90% happy path |
| TypeScript strict | 0 new error per PR |
| Invoice | Selalu berlogo, hitam-putih, profesional |
| Harga | Selalu server-authoritative |
| Data isolasi | Setiap tenant tidak bisa akses data tenant lain |
| Logo Gate | Invoice tidak bisa digenerate tanpa logo tenant |

---

## 10. Model Bisnis

| Elemen | Detail |
|---|---|
| **Target Pasar** | Konveksi & garmen lokal Indonesia (UKM) |
| **Model Bisnis** | Subscription fee bulanan + Platform fee % per transaksi |
| **Keunggulan** | End-to-end digital: desain → negosiasi → produksi → bayar → kirim |

---

*Dokumen ini diperbarui terakhir: September 2026.*
*Untuk detail arsitektur teknis, lihat `ARCHITECTURE.md`.*
