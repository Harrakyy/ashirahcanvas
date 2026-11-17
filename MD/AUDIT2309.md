# AUDIT2309 - Ashirah Custom Apparel Designer
> Tanggal Audit: 24 September 2026
> Tujuan: Mengetahui kondisi nyata aplikasi sebelum production

---

## RINGKASAN EKSEKUTIF

| Dimensi | Skor | Catatan |
|---|---|---|
| Backend Logic | 8/10 | Solid, ada edge case payment |
| Frontend UX | 7/10 | Canvas editor bagus, beberapa flow kasar |
| Security | 6/10 | Auth OK, AUTH_SECRET lemah di .env.example |
| Data Integrity | 7/10 | Schema baik, ada gap di negotiation state |
| External Integrations | 6/10 | Duitku mock fallback berbahaya |
| Observability | 4/10 | Hanya console.log, tanpa centralized logging |
| Test Coverage | 1/10 | Hanya 1 file e2e, tidak ada unit test |
| DevOps / Deploy | 4/10 | Tidak ada CI/CD, tidak ada health check |
| **OVERALL** | **5.4/10** | **Staging-ready. BELUM production-ready.** |

---

## P0 BLOCKER - Wajib Fix Sebelum Production

### P0-1: Negotiation Session Tidak Ter-isolasi Per Order (BUG DIKONFIRMASI)

Root Cause ditemukan di app/hooks/useNegotiation.ts:

```typescript
// L64: Saat init session baru, ID disimpan ke localStorage
localStorage.setItem("negotiationSessionId", data.sessionId)

// L106-108: Saat mount, session lama langsung di-restore TANPA validasi fingerprint
const savedSessionId = localStorage.getItem("negotiationSessionId")
if (savedSessionId) {
  restoreSession(savedSessionId)  // langsung restore tanpa cek apakah masih relevan
}
```

Alur Bug - Pesanan Kedua Pakai Session Chat yang Sama:

1. Customer desain pertama -> negosiasi -> deal -> klik Bayar
2. handlePayment() berhasil -> window.location.href = paymentUrl
3. localStorage["negotiationSessionId"] TIDAK dihapus setelah redirect
4. Customer kembali ke /design/[productId] untuk pesanan baru
5. useEffect (mount) langsung panggil restoreSession(sessionIdLama)
6. Session lama masih hidup di Redis (TTL 1 jam)
7. Bot restore: riwayat chat lama, harga lama, tier lama dari pesanan sebelumnya
8. Fingerprint check HANYA berjalan saat user klik tombol "Negosiasi", bukan saat mount
9. Jika qty/produk/warna SAMA -> session lama terus dipakai - user bisa bypass negosiasi ulang

Fix yang Diperlukan:
- Di handlePayment() setelah sukses: hapus negotiationSessionId dan fingerprint dari localStorage SEBELUM redirect
- Di useEffect restore: validasi fingerprint SEBELUM memanggil restoreSession
- Jika session yang di-restore sudah agreedDiscount !== null -> wajib init session baru

---

### P0-2: Duitku Mock Fallback Aktif Tanpa Control di Production

Root Cause ditemukan di lib/server/duitku.ts L151-165:

```typescript
} catch (networkError) {
  // Fallback ini menangkap SEMUA error: wrong API key, timeout, rate limit, dll
  const mockReference = `MOCK-DUITKU-${Date.now()}`
  const mockPaymentUrl = `${appUrl}/payment/mock?orderId=...`

  return {
    statusCode: "00",
    statusMessage: "MOCK_SANDBOX_SUCCESS",
    paymentUrl: mockPaymentUrl,  // URL yang langsung mark order sebagai bayar
  }
}
```

Kondisi Berbahaya:
- Catch ini aktif di production jika koneksi Duitku putus bahkan 1 detik
- User mendapat order terkonfirmasi TANPA benar-benar membayar
- DUITKU_ENV=production TIDAK mencegah fallback - tidak ada pengecekan env di catch block
- /payment/mock page juga tidak diproteksi di production env

Fix yang Diperlukan:
- Hapus mock fallback dari catch block createTransaction
- Buat flag DUITKU_MOCK=true yang hanya aktif jika DUITKU_ENV !== production
- Di production: network error -> throw error -> HTTP 502 ke user
- /payment/mock page: return 404 jika DUITKU_ENV === production

---

### P0-3: AUTH_SECRET Default Lemah

```
# .env.example L9:
AUTH_SECRET="your-super-secret-auth-key-change-this-in-production-2026"
```

- String ini mudah ditebak / bisa ditemukan di repo history
- Jika developer tidak mengubahnya saat deploy -> semua JWT token bisa diforge
- Tidak ada startup validation yang mencegah server jalan dengan value default

Fix: Tambahkan startup check di lib/server/auth.ts - jika AUTH_SECRET sama dengan nilai default, throw error dan refuse to start.

---

## P1 PENTING - Fix Sebelum First Real User

### P1-1: Tidak Ada Rate Limiting di Login Endpoint
- app/api/auth/login/route.ts bisa di-brute force tanpa batas
- Gunakan Upstash Redis (sudah ada) untuk throttle: max 5 percobaan per IP per 15 menit

### P1-2: Duplicate Payment Records
- app/api/payment/create-dp/route.ts tidak cek apakah payment dengan merchantOrderId yang sama sudah pending
- User klik bayar DP dua kali cepat -> dua record di DB, dua request ke Duitku

### P1-3: Shipping Address Tidak Tersimpan di Orders
- Tabel orders di lib/db/schema.ts tidak punya kolom shipping_address
- Alamat diisi manual oleh admin, tidak ada jejak audit per order

### P1-4: Backside Canvas Dimensi Salah
- lib/ui/canvas-engine.ts - GARMENT_TARGET_BOX_BY_ZONE.back kotak terlalu kecil vs front
- Dilaporkan dan dikonfirmasi oleh user di session audit ini

### P1-5: Tidak Ada Error Boundary di Canvas Editor
- app/(customer)/design/[productId]/page.tsx - jika canvas crash -> halaman blank putih
- Tidak ada fallback UI atau error recovery

---

## P2 NICE TO HAVE

### P2-1: 0% Unit Test Coverage
- Tidak ada test untuk classifyUserIntent, validateAIResponse, getDiscountPercent
- Fungsi-fungsi ini mengontrol logika bisnis dan harga - sangat berisiko tanpa test

### P2-2: Tidak Ada Health Check Endpoint
- Tidak ada /api/health - tidak bisa diintegrasikan ke load balancer atau uptime monitoring

### P2-3: Tidak Ada Centralized Logging
- Semua observability adalah console.log / console.warn
- Di production Vercel, log ini menghilang dalam 1-2 hari. Tidak ada Sentry / Datadog.

### P2-4: Groq API Tidak Ada Retry Logic
- lib/server/groq.ts - timeout sekali -> langsung ke fallback hardcoded
- Seharusnya retry 1-2x dengan exponential backoff

### P2-5: WhatsApp Env Var Tidak Terdokumentasi
- lib/server/whatsapp.ts ada dan dipakai, tapi env var tidak ada di .env.example

---

## DATABASE SCHEMA AUDIT

| Tabel | Status | Catatan |
|---|---|---|
| tenants | OK | Multi-tenant support, slug unique |
| users | OK | Role: customer/admin/super_admin |
| products | OK | Linked ke tenant |
| orders | GAP | Tidak ada kolom shipping_address |
| order_items | OK | Size/qty breakdown |
| payments | GAP | Tidak ada idempotency key |
| shipments | OK | Tracking number, status |
| order_status_logs | OK | Audit trail per order |

Gap Kritis:
- Tidak ada tabel negotiation_sessions - tersimpan di Redis TTL 1 jam saja (tidak bisa audit harga final)
- Tidak ada tabel shipping_addresses

---

## API ROUTES - AUDIT LENGKAP

### Auth
| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/auth/login | POST | PASS | Tidak ada rate limit (P1-1) |
| /api/auth/logout | POST | PASS | |
| /api/auth/register | POST | PASS | |
| /api/auth/me | GET | PASS | |

### Orders
| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/orders | GET | PASS | Pagination, filter status |
| /api/orders | POST | PASS | Validasi blueprint |
| /api/orders/[id] | GET | PASS | RBAC per role |
| /api/orders/[id] | PATCH | PASS | Status update + log |
| /api/orders/[id]/blueprint | GET | PASS | Render blueprint view |
| /api/orders/[id]/sample | POST | PASS | Sample approval |
| /api/orders/[id]/notes | GET/POST | NOT AUDITED | |

### Payment
| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/payment/create | POST | PASS | Buat order + invoice |
| /api/payment/create-dp | POST | WARN | Duplikat payment risk (P1-2) |
| /api/payment/create-final | POST | PASS | Final payment 30% |
| /api/payment/confirm-manual | POST | PASS | Manual confirm by admin |

### Webhook
| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/webhook/duitku | POST | PASS | Signature verify ada |
| /api/webhook/biteship | POST | PASS | |

### Negosiasi & Session
| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/negotiate | POST | BUG | Logic OK, session tidak clear setelah payment (P0-1) |
| /api/session/init | POST | PASS | Buat session Redis baru |
| /api/session/status | GET | PASS | Restore session |

### Shipping
| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/shipping/rates | POST | PASS | Stub mode tersedia |
| /api/shipping/create | POST | NOT AUDITED | |

### Admin & Super Admin
| Endpoint | Method | Status | Catatan |
|---|---|---|---|
| /api/admin/profile | GET/PATCH | PASS | |
| /api/admin/customers | GET | NOT AUDITED | |
| /api/super-admin/stats | GET | PASS | |
| /api/super-admin/clients | GET/POST | PASS | |
| /api/super-admin/transactions | GET | PASS | |
| /api/products | GET | PASS | |
| /api/products/[id] | GET | PASS | |
| /api/quote | POST | NOT AUDITED | |
| /api/user | GET | NOT AUDITED | |

---

## FRONTEND PAGES - AUDIT LENGKAP

### Customer Flow
| Halaman | Route | Status | Catatan |
|---|---|---|---|
| Landing Page | / | Exists | |
| Pilih Produk | /products | Exists | |
| Canvas Editor | /design/[productId] | Exists | Bug backside (P1-4) |
| Negosiasi Panel | dalam /design/[productId] | BUG | Session tidak clear post-payment (P0-1) |
| Payment Success | /payment/success | Exists | |
| Payment Mock | /payment/mock | DANGER | Harus disabled di production env |

### Admin Flow
| Halaman | Route | Status | Catatan |
|---|---|---|---|
| Login Admin | /admin/login | Exists | |
| Dashboard Admin | /admin | Exists | |
| Daftar Order | /admin/orders | Exists | |
| Detail Order | /admin/orders/[id] | Exists | |
| Blueprint View | /admin/orders/[id]/blueprint | Exists | Multi-zone verified |
| Profil Admin | /admin/profile | Exists | |

### Super Admin Flow
| Halaman | Route | Status | Catatan |
|---|---|---|---|
| Dashboard SA | /super-admin | Exists | |
| Kelola Klien | /super-admin/clients | Exists | |
| Semua Transaksi | /super-admin/transactions | Exists | |

---

## EXTERNAL SERVICES AUDIT

| Service | Provider | Status | Catatan |
|---|---|---|---|
| Database | PostgreSQL Drizzle | Configured | |
| Auth | Custom JWT | WARN | DEFAULT AUTH_SECRET lemah (P0-3) |
| AI Negotiation | Groq LLaMA 3.3 | Configured | Tidak ada retry (P2-4) |
| AI Vision | Google Gemini | Configured | |
| Payment | Duitku | DANGER | Mock fallback tak terkontrol (P0-2) |
| Shipping | Biteship | OK stub mode | |
| Email | Resend | Configured | |
| Session Store | Upstash Redis | Configured | TTL 1 jam per session |
| WhatsApp | (tidak diketahui) | GAP | Env var tidak terdokumentasi (P2-5) |

---

## SECURITY AUDIT

| Check | Status | Detail |
|---|---|---|
| SQL Injection | Safe | Drizzle ORM parameterized queries |
| XSS | Safe | Next.js auto-escape |
| JWT Forgeable | RISK | AUTH_SECRET default value lemah |
| CSRF | Mitigated | JWT di header bukan cookie |
| Rate Limiting | MISSING | Tidak ada di endpoint manapun |
| Webhook Signature | OK | Duitku & Biteship verifikasi signature |
| RBAC | OK | Role check di setiap endpoint admin/super-admin |
| Secrets in Code | OK | Semua via env var |

---

## PLAN 2309 - RENCANA PERBAIKAN

### Fase 1: Critical Bug Fix (Estimasi 2-3 jam)

#### 1.1 Fix Session Isolation (P0-1)
File: app/hooks/useNegotiation.ts
1. handlePayment() setelah sukses redirect: hapus negotiationSessionId + fingerprint dari localStorage
2. useEffect restore: validasi fingerprint DULU sebelum panggil restoreSession
3. Jika session yang di-restore sudah agreedDiscount !== null: clear dan init baru

#### 1.2 Fix Duitku Mock Fallback (P0-2)
File: lib/server/duitku.ts
1. Hapus mock fallback dari catch block
2. Buat isMockMode(): return true HANYA jika DUITKU_ENV !== production DAN DUITKU_MOCK === true
3. Mock return dilakukan SEBELUM fetch (bukan sebagai fallback)
4. Di production: network error -> throw error -> HTTP 502 ke user
5. Update .env.example: tambahkan DUITKU_MOCK="true" # set "false" di production

#### 1.3 AUTH_SECRET Startup Validation (P0-3)
File: lib/server/auth.ts
1. Tambahkan check: jika AUTH_SECRET === nilai default .env.example -> throw error saat startup

### Fase 2: P1 Fixes (Estimasi 3-4 jam)

| Task | File | Tindakan |
|---|---|---|
| 2.1 Idempotency DP | app/api/payment/create-dp/route.ts | Cek pending payment sebelum buat baru |
| 2.2 Rate Limit Login | app/api/auth/login/route.ts | Upstash Redis, max 5x/IP/15 menit |
| 2.3 /payment/mock disabled | Mock page | Return 404 jika DUITKU_ENV === production |
| 2.4 WhatsApp env docs | .env.example | Dokumentasikan env var yang diperlukan |

---

## CHECKLIST PRODUCTION READINESS

### Wajib (BLOCKER)
- [x] P0-1: Session isolation fix di useNegotiation.ts & session-store.ts (FIXED: session fingerprint check on mount & session consumed on payment)
- [x] P0-2: Duitku mock fallback dikontrol ketat via env flag DUITKU_MOCK & diblokir di production (FIXED)
- [x] P0-3: AUTH_SECRET startup validation di session-token.ts (FIXED)
- [ ] Ganti AUTH_SECRET dengan random 64-char string di production
- [ ] Set DUITKU_ENV=production
- [ ] Set DUITKU_MOCK=false
- [ ] Set BITESHIP_ENV=production
- [ ] KV_REST_API_URL dan KV_REST_API_TOKEN diisi (Upstash)
- [x] /payment/mock disabled di production (FIXED: return notFound() 404 in production)

### Sangat Direkomendasikan
- [x] P1-1: Rate limiting login di app/api/auth/login/route.ts (FIXED: max 5x/15 min via Redis/in-memory)
- [x] P1-2: Idempotency check create-dp & create-final (FIXED: reuse existing pending payment)
- [ ] P1-4: Backside canvas proportional fix
- [ ] WhatsApp env var terdokumentasi

### Nice to Have
- [ ] Unit test untuk negotiation-state.ts
- [ ] /api/health endpoint
- [ ] Sentry atau structured logging
- [ ] Retry logic di Groq API
- [ ] Shipping address di orders table

---

File ini dibuat dari hasil audit sesi 24 September 2026.
Update setiap ada perubahan arsitektur signifikan atau bug baru ditemukan.
