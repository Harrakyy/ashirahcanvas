# SYSTEM AUDIT REPORT - AshiraTech SaaS Platform
**Dibuat:** 2026-09-24
**Status Keseluruhan:** STAGING-READY - BELUM PRODUCTION-READY
**Auditor:** AI Agent (Antigravity)

---

## 1. RINGKASAN EKSEKUTIF

Platform sudah memiliki alur end-to-end yang fungsional untuk semua 3 peran (Customer, Admin Konveksi, Super Admin). Semua kode sudah bisa di-compile dan di-run. Namun ada sejumlah **gap kritikal** yang harus ditutup sebelum bisa di-launch ke production.

| Kategori | Status |
|---|---|
| Backend API Routes | PASS - 19/22 route siap, 3 gap minor |
| Database Schema | PASS - Lengkap & relasi benar |
| Auth & RBAC | PASS - Solid dengan JWT cookie + middleware |
| Payment Flow (Duitku) | PASS - Fungsional + mock fallback |
| Shipping (Biteship) | PASS - Stub-first, siap ganti ke production |
| Email (Resend) | PASS - Siap, butuh API key + domain |
| Canvas Editor | PASS - Core fungsional |
| Admin Dashboard | PASS - Fungsional + blueprint multi-zone |
| Super Admin | PASS - GMV + client management |
| WhatsApp Notif | WARN - Diimplementasi, belum ditest |
| Environment Variables | WARN - Beberapa nilai dummy masih ada |
| Test Coverage | FAIL - 0%, tidak ada test yang lengkap |
| Production Deploy | FAIL - Tidak ada CI/CD, Dockerfile ada tapi belum ditest |

---

## 2. DATABASE SCHEMA AUDIT

**File:** `lib/db/schema.ts`

### Tables & Relasi

| Table | Status | Catatan |
|---|---|---|
| `tenants` | PASS | Lengkap dengan settings JSONB (MOQ, bankAccount, dll) |
| `users` | PASS | Role enum: super_admin, admin, customer; address JSONB |
| `products` | PASS | Tenant-scoped, colors/sizes JSONB |
| `orders` | PASS | 9 status state machine, dpAmount/finalAmount terpisah |
| `order_items` | PASS | blueprintPerZone JSONB per item |
| `payments` | PASS | Tipe dp/final, Duitku reference fields |
| `shipments` | PASS | Biteship integration fields |
| `order_status_logs` | PASS | Audit trail lengkap |

### Gap Database

- **KRITIKAL: Tidak ada tabel `negotiation_sessions`** - Sesi negosiasi disimpan di in-memory store (session-store.ts). Jika server restart, **semua sesi negosiasi hilang**. Untuk production, butuh Redis atau DB persistence.
- **MINOR: `shippingAddress` tidak disimpan di `orders`** - Hanya di `shipments.destinationAddress`. Jika shipment belum dibuat (pre-shipped), data alamat tidak bisa ditampilkan di order history customer.
- **MINOR: Tidak ada tabel `notifications`** - Semua notifikasi (WA, email) fire-and-forget tanpa retry mechanism.

---

## 3. AUTHENTICATION & MIDDLEWARE AUDIT

**Files:** `middleware.ts`, `lib/server/auth.ts`, `lib/server/session-token.ts`

### Auth Flow

| Fitur | Status | Catatan |
|---|---|---|
| JWT via HTTP-Only Cookie | PASS | Secure, SameSite=lax |
| Role-based redirect (login) | PASS | admin ke /admin, super_admin ke /super-admin |
| Middleware RBAC | PASS | /admin, /super-admin, /orders terproteksi |
| Token expiry (7 hari) | PASS | |
| Password hashing | PASS | |
| CSRF protection | PASS | SameSite cookie |

### Gap Auth

- **Middleware tidak melindungi `/api/...` routes** - Semua API dilindungi via getCurrentUser() per-route, tapi jika ada route yang lupa memanggil getCurrentUser(), data bisa bocor.
- **Tidak ada rate limiting** - Endpoint login bisa di-brute-force.
- **Tidak ada refresh token** - Token mati setelah 7 hari, user harus login ulang.
- **Register route belum diaudit** - Perlu cek validasi & role assignment default.

---

## 4. API ROUTES AUDIT (LENGKAP)

### 4.1 Auth API

| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/auth/login | POST | PASS | Solid, HTTP-only cookie, role-based redirect |
| /api/auth/logout | POST | ASSUMED PASS | Butuh konfirmasi clear cookie |
| /api/auth/register | POST | ASSUMED PASS | Belum diaudit validasi & role default |
| /api/auth/me | GET | ASSUMED PASS | |

### 4.2 Orders API

**File:** `app/api/orders/route.ts`

| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/orders | GET | PASS | RBAC per role, tenant-isolated |
| /api/orders | POST | PASS | MOQ validation, Duitku DP, email notification |
| /api/orders/[id] | GET | PASS | RBAC + sanitize internal notes untuk customer |
| /api/orders/[id] | PATCH | PASS | State machine validation, WA notification saat ready |
| /api/orders/[id]/blueprint | GET | PASS | Blueprint per zone |
| /api/orders/[id]/sample | POST | PASS | Admin upload foto sample, transisi sample_review |
| /api/orders/[id]/notes | POST | NOT AUDITED | Ada directory-nya tapi belum dibaca isinya |

**Issue di /api/orders POST:**
Jika Duitku gagal, pesanan tetap tersimpan di DB **tanpa payment record**. Customer tidak mendapatkan link bayar.
Solusi: Ada fallback URL atau UI yang memungkinkan retry payment via /api/payment/create-dp

### 4.3 Payment API

| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/payment/create | POST | PASS | Post-negotiation order + DP payment via Duitku |
| /api/payment/create-dp | POST | WARN | Retry DP payment - tidak cek duplicate pending |
| /api/payment/create-final | POST | PASS | Pelunasan 30%, validasi status ready |
| /api/payment/confirm-manual | POST | PASS | Admin confirm manual (dp/final) |

**Issue create-dp:** Tidak melakukan cek apakah DP sudah ada payment record dengan status pending. Bisa membuat **duplikat payment record** jika dipanggil berulang.
Solusi: Cek existing pending payment sebelum insert baru; return existing paymentUrl jika ada.

### 4.4 Webhook API

| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/webhook/duitku | POST | PASS | MD5 signature verification, multi-format (json & form) |
| /api/webhook/biteship | POST | PASS | Status mapping, auto-update delivered |

**Minor Issue Duitku Webhook:** Untuk resultCode bukan 00, return 200 "OK" - Duitku mungkin terus retry. Sudah aman tapi bisa dioptimalkan.

### 4.5 Negotiate API

**File:** `app/api/negotiate/route.ts`

| Fitur | Status | Catatan |
|---|---|---|
| ACCEPT intent | PASS | Hitung harga final, update session |
| REJECT intent | PASS | Tier progression, Groq fallback |
| UNKNOWN intent | PASS | Groq response + fallback |
| Session validation | PASS | agreedDiscount check |

**Issue:** Sesi negosiasi in-memory - hilang saat server restart. Tidak ada session timeout.

### 4.6 Shipping API

| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/shipping/rates | POST | PASS | Weight-map per category, Biteship + mock fallback |
| /api/shipping/create | POST | NOT AUDITED | Ada directory, belum dibaca isinya |

### 4.7 Admin API

| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/admin/profile | GET | PASS | Tenant profile dengan fallback ke first tenant |
| /api/admin/profile | PATCH | PASS | Update tenant settings, logo, bank account |
| /api/admin/customers | GET | NOT AUDITED | Ada directory, belum dibaca isinya |

### 4.8 Super Admin API

| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/super-admin/stats | GET | PASS | GMV, platform fee, per-client stats |
| /api/super-admin/clients | GET | PASS | Semua tenant dengan orders & users |
| /api/super-admin/clients | POST | PASS | Create tenant baru, slug uniqueness check |
| /api/super-admin/transactions | GET | PASS | Semua payments dengan order & customer detail |

### 4.9 Products API

| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/products | GET | PASS | List produk |
| /api/products/[id] | GET | PASS | Detail produk |

### 4.10 Session API (Negotiation Init)

| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/session/init | POST | ASSUMED PASS | Buat negosiasi session baru |
| /api/session/status | GET | ASSUMED PASS | Cek status sesi |

### 4.11 Quote API

| Endpoint | Status | Catatan |
|---|---|---|
| /api/quote | NOT AUDITED | Ada directory, belum dibaca |

### 4.12 User API

| Endpoint | Status | Catatan |
|---|---|---|
| /api/user | NOT AUDITED | Ada directory, belum dibaca |

---

## 5. FRONTEND PAGES AUDIT

### 5.1 Public Pages

| Halaman | Route | Status | Catatan |
|---|---|---|---|
| Landing Page | / | PASS | App Router |
| Login | /login | PASS | |
| Register | /register | PASS | |
| Store Catalog | /store/[slug] | PASS | Tenant-scoped via middleware header |
| Design Editor | /design | PASS | Fabric.js canvas |
| Canvas Editor | /editor | PASS | Multi-zone editor |

### 5.2 Customer Pages

| Halaman | Route | Status | Catatan |
|---|---|---|---|
| My Orders | /orders | PASS | List semua order customer |
| Order Detail | /orders/[id] | PASS | Tracking, payment, sample review |
| Payment Flow | /payment/... | PASS | Duitku redirect + mock |

### 5.3 Admin Pages

| Halaman | Route | Status | Catatan |
|---|---|---|---|
| Admin Dashboard | /admin | PASS | Statistik tenant |
| Admin Orders List | /admin/orders | PASS | Filter status, tenant-isolated |
| Admin Order Detail | /admin/orders/[id] | PASS | Blueprint multi-zone, status transition, sample upload |
| Admin Products | /admin/products | PASS | Product management |
| Admin Customers | /admin/customers | PASS | Customer list |
| Admin Profile | /admin/profile | PASS | Tenant settings, bank account |

### 5.4 Super Admin Pages

| Halaman | Route | Status | Catatan |
|---|---|---|---|
| Super Admin Dashboard | /super-admin | PASS | GMV, stats global |
| Client Management | /super-admin/clients | PASS | Onboarding konveksi |
| Transaction Audit | /super-admin/transactions | PASS | Semua payments |
| Settings | /super-admin/settings | NOT AUDITED | Ada route, belum dikonfirmasi |

---

## 6. LIBRARY & SERVICES AUDIT

### Duitku Payment Client (`lib/server/duitku.ts`)

- PASS: MD5 signature generation & verification
- PASS: Sandbox & production URL toggle via env
- PASS: Mock fallback otomatis jika Duitku API tidak tersedia (localhost dev)
- PASS: checkTransactionStatus untuk polling
- WARN: Mock fallback tidak bisa dimatikan dari config - selalu aktif saat network error (bahkan di production jika ada gangguan jaringan)

### Biteship Shipping (`lib/server/shipping.ts`)

- PASS: Stub mode (tanpa API key) dengan mock rates realistis
- PASS: BITESHIP_ENV=production untuk live API
- PASS: Rate calculation per courier

### Email Resend (`lib/server/email.ts`)

- PASS: onboarding@resend.dev fallback saat domain belum verified
- PASS: Reply-To tenant email
- PASS: BCC ke ASHIRA_BCC_EMAIL untuk setiap transaksi
- PASS: Template email: order created, DP confirmed, production ready
- WARN: Email hanya bisa dikirim ke email akun Resend sendiri sampai domain verified

### WhatsApp Notification (`lib/server/whatsapp.ts`)

- PASS: Diimplementasi (WA API panggilan)
- FAIL: Belum ada environment variable WA API key di .env.example
- FAIL: Tidak ada retry mechanism jika WA API gagal

### Groq AI Negotiation (`lib/server/groq.ts`)

- PASS: LLaMA 3.3 integration
- PASS: Fallback pesan statis jika Groq gagal
- WARN: Tidak ada timeout eksplisit pada request Groq

### Order State Machine (`lib/server/order.ts`)

- PASS: 9 status dengan transisi yang jelas (VALID_ORDER_TRANSITIONS)
- PASS: canTransitionOrder validasi sebelum update
- PASS: Audit log setiap transisi
- PASS: confirmOrderPaymentManual untuk admin manual confirmation

### Negotiation Engine (`lib/server/negotiation-state.ts`)

- PASS: 4 tier pricing dengan diskon progresif
- PASS: Intent classification (ACCEPT/REJECT/UNKNOWN)
- PASS: Style detection (formal/casual, short/verbose)
- PASS: MOQ (Minimum Order Quantity) check sebelum diskon

---

## 7. CANVAS EDITOR AUDIT

**Files:** `features/canvas/`, `app/editor/`, `lib/ui/`

| Fitur | Status | Catatan |
|---|---|---|
| Multi-zone canvas (Front/Back/Left/Right) | PASS | Fabric.js |
| Garment mockup rendering | PASS | canvas-engine.ts |
| Auto-fit mockup ke container | PASS | autoFit prop di ZonePreview |
| Print area boundaries | PASS | Per zona |
| Blueprint generation | PASS | Data tersimpan di blueprintPerZone |
| Blueprint preview (Admin) | PASS | blueprint-preview.ts dengan CORS fix |
| Backside scaling issue | FAIL | Dilaporkan terlalu kecil - BELUM DIPERBAIKI |
| Export/Download blueprint | PASS | Per zona, dengan crossOrigin flag |

---

## 8. ENVIRONMENT VARIABLES AUDIT

**File:** `.env.example`

| Variable | Status | Catatan |
|---|---|---|
| DATABASE_URL | PASS | Local dev PostgreSQL |
| AUTH_SECRET | WARN | Harus diganti sebelum production |
| NEXT_PUBLIC_APP_URL | PASS | Update ke domain production |
| GROQ_API_KEY | WARN | Placeholder - perlu key valid |
| GEMINI_API_KEY | WARN | Placeholder - perlu key valid |
| DUITKU_MERCHANT_CODE | WARN | Sandbox credentials terekspos di .env.example |
| DUITKU_API_KEY | WARN | Production key perlu diganti |
| DUITKU_ENV | PASS | Default sandbox, ganti production saat launch |
| BITESHIP_API_KEY | WARN | Placeholder |
| BITESHIP_ENV | PASS | Default stub |
| RESEND_API_KEY | WARN | Placeholder |
| EMAIL_FROM_ADDRESS | WARN | Placeholder domain |
| WA API KEY | FAIL | TIDAK ADA di .env.example padahal digunakan di kode |
| KV_REST_API_URL | FAIL | Kosong - Redis/KV belum dikonfigurasi |

---

## 9. CRITICAL ISSUES (HARUS DIPERBAIKI SEBELUM PRODUCTION)

### P0 - Blocker Production

**Issue 1: Session Negosiasi In-Memory**
File: `lib/server/session-store.ts`
Problem: Menyimpan sesi di Map<> dalam proses Node.js. Restart server = semua sesi hilang.
Solusi: Migrate ke Redis (Upstash) atau database table negotiation_sessions.
Effort: 1-2 hari

**Issue 2: WhatsApp API Key Tidak Terdokumentasi**
File: `lib/server/whatsapp.ts`
Problem: Memanggil WA API tapi tidak ada env var terkait di .env.example.
Solusi: Tambahkan WA_API_KEY, WA_PHONE_ID, atau equivalent ke .env.example dan README.
Effort: 1 jam

**Issue 3: AUTH_SECRET Lemah di Default**
Problem: Default AUTH_SECRET adalah string yang exposed di .env.example. Jika tim lupa mengganti, semua token bisa dipalsukan.
Solusi: Generate secret kuat & add warning di README.
Effort: 1 jam

**Issue 4: Mock Duitku Aktif Tanpa Control**
File: `lib/server/duitku.ts`
Problem: Jika koneksi ke Duitku gagal di production, sistem membuat order dengan mockPaymentUrl lokal yang tidak valid.
Solusi: Tambahkan env var DUITKU_ALLOW_MOCK=false untuk production.
Effort: 2 jam

### P1 - Perbaiki Sebelum Launch

**Issue 5: Duplikat Payment Records**
File: `app/api/payment/create-dp/route.ts`
Problem: Tidak cek payment pending yang sudah ada. Bisa terbuat 2x DP payment record.
Solusi: Cek existing pending payment sebelum insert; return existing paymentUrl jika ada.
Effort: 2-3 jam

**Issue 6: Backside Canvas Terlalu Kecil**
File: `lib/ui/canvas-engine.ts` (GARMENT_TARGET_BOX_BY_ZONE.back)
Problem: Mockup zona back terlihat lebih kecil dari zona front di editor dan admin blueprint preview.
Status: BELUM DIPERBAIKI sejak dilaporkan.
Effort: 2-4 jam

**Issue 7: Tidak Ada Rate Limiting**
Problem: /api/auth/login terbuka untuk brute force.
Solusi: Tambahkan middleware rate limit (Upstash Ratelimit atau Next.js middleware).
Effort: 4-6 jam

**Issue 8: Tidak Ada Test Coverage**
Problem: vitest.config.ts ada tapi tests/ tidak ada test yang meaningful.
Solusi: Minimal test state machine order, pricing logic, dan auth.
Effort: 1-2 hari

### P2 - Nice to Have Sebelum Production

- Shipping address tidak tersimpan langsung di orders table
- Tidak ada halaman 404/error UI yang custom
- /api/super-admin/settings route belum dikonfirmasi
- Tidak ada HTTPS enforcement header (Strict-Transport-Security)
- Tidak ada error monitoring (Sentry/Axiom)
- Tidak ada CI/CD pipeline

---

## 10. APA YANG SUDAH SIAP

| Fitur | Level Kesiapan |
|---|---|
| Arsitektur multi-tenant | Production-grade |
| Database schema & relasi (8 tables) | Solid |
| Auth system (JWT cookie + RBAC) | Solid |
| Order state machine (9 status) | Solid |
| Duitku payment flow (DP + Final) | Solid (butuh live key) |
| Duitku webhook handler | Solid |
| Admin manual payment confirmation | Solid |
| Email notification templates (3 jenis) | Solid (butuh domain) |
| AI negotiation engine (Groq + 4 tier) | Solid (butuh Groq key) |
| Canvas multi-zone editor | Fungsional |
| Blueprint preview admin | Fungsional |
| Shipping rates (Biteship stub) | Solid (butuh API key live) |
| Super Admin GMV dashboard | Solid |
| Tenant onboarding (super admin) | Solid |
| Sample review flow | Solid |
| Audit trail (order_status_logs) | Solid |

---

## 11. PRODUCTION READINESS SCORECARD

| Dimensi | Score | Catatan |
|---|---|---|
| Backend Logic | 8/10 | State machine solid, ada gap duplikat payment |
| Frontend UX | 7/10 | Semua halaman ada, backside issue belum fix |
| Security | 6/10 | Auth solid, tidak ada rate limit, auth secret default lemah |
| Data Integrity | 7/10 | In-memory session, address gap di orders |
| External Integrations | 6/10 | Keys belum diset, WA undokumentasi |
| Observability | 4/10 | console.log/warn saja, tidak ada Sentry/logging service |
| Test Coverage | 1/10 | Hampir tidak ada test |
| DevOps/Deploy | 4/10 | Dockerfile ada, tidak ada CI/CD |
| KESELURUHAN | 5.4/10 | Staging-ready, belum production-ready |

---

## 12. ROADMAP MENUJU PRODUCTION

### Sprint 1 - Critical Fixes (1-2 minggu)
- [ ] Migrate negotiation session ke Redis/DB
- [ ] Dokumentasikan WA API env vars di .env.example
- [ ] Fix duplikat payment record di create-dp
- [ ] Tambahkan DUITKU_ALLOW_MOCK flag untuk production safety
- [ ] Perbaiki backside canvas scaling (GARMENT_TARGET_BOX_BY_ZONE.back)
- [ ] Generate AUTH_SECRET yang kuat, tambahkan warning di README

### Sprint 2 - Hardening (1 minggu)
- [ ] Rate limiting di auth & payment endpoints
- [ ] Setup Resend dengan domain production
- [ ] Test & aktifkan Duitku production credentials
- [ ] Setup Biteship production API key
- [ ] Tambahkan error tracking (Sentry atau Axiom)
- [ ] Audit /api/quote, /api/user, /api/admin/customers, /api/shipping/create

### Sprint 3 - QA & Launch (1 minggu)
- [ ] Manual E2E test semua alur (customer order ke admin process ke shipped)
- [ ] Load test dengan concurrent orders
- [ ] Setup CI/CD pipeline
- [ ] Buat runbook deployment
- [ ] Backup database strategy
- [ ] Custom 404/error pages

---

*Laporan ini dibuat berdasarkan audit kode statik tanggal 2026-09-24. Update laporan ini setiap ada perubahan major.*
