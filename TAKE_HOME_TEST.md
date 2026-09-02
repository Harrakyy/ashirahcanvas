# Take-Home Test — Frontend Engineer (Vendor Blueprint Extractor)

Selamat datang! Tugasmu adalah membangun modul ekstraksi data desain dari editor kaos ini
(4 sisi: Depan, Belakang, Kiri, Kanan) menjadi **blueprint produksi vendor konveksi** yang
tampil di sisi customer pasca-checkout.

> **Baca `ARCHITECTURE.md` dulu (wajib).** Dokumen itu menjelaskan ownership folder, golden
> rules, dan diagram alur data. Semua keputusan kode harus konsisten dengan konvensi di sana.

---

## Ringkasan Tugas

### Task 1 — Snapshot & Data Extraction Engine (50%)

Buat file utilitas baru **`lib/ui/blueprint-extractor.ts`** (react/UI-pure, imperatif, di luar
siklus hidup React):

1. **`snapshotAllZones()`** — amankan & rangkum data seluruh 4 zona desain sekaligus.
2. **`extractZoneAssets()`** — parse data desain per zona: **pisahkan objek milik user**
   (gambar asli yang di-upload) dari background/mockup kaos, lalu ekstrak **Base64 `src`**
   beserta **koordinat kasarnya** (`left/top`, `width/height`, `scaleX/scaleY`).

### Task 2 — Vendor Blueprint Modal / UI (50%)

Triger & cangkang modal sudah disiapkan di repo (`components/vendor-blueprint-modal.tsx`,
`app/payment/success/page.tsx`). Selesaikan **isi** modal:

- Pratinjau **thumbnail visual per zona** yang memiliki desain aktif.
- Tombol **download / lihat Raw Image Asset** milik customer — terpisah dari mockup kaos.
- Terpicu otomatis saat customer selesai checkout (sudah: auto-open di `/payment/success` jika
  `sessionStorage["vendor_blueprint"]` terisi).

---

## Stack

| Layer | Versi (repo) |
|---|---|
| Framework | **Next.js 16** (App Router) |
| React | React 19 |
| Canvas | **Fabric.js 7** (`fabric@^7.4`) |
| State (React) | Zustand 5 |
| Styling | Tailwind CSS v4 + shadcn/ui (`@base-ui/react`) |

> Versi di atas adalah yang dipakai repo. Dokumentasi guideline versi lama (Next 15 / Fabric v6)
> **tidak berlaku** — ikuti versi repo.

---

## Perlu env vars atau tidak?

**Tidak.** Task 1 & 2 (canvas, ekstraksi blueprint, mock checkout) berjalan 100% tanpa env vars.
Cukup:

```bash
npm install
npm run dev   # buka http://localhost:3000/editor
```

`.env.local` tidak wajib dibuat. Rincian alur mana yang butuh key:

| Alur | Butuh env? | Keterangan |
|---|---|---|
| `/api/quote` (harga dasar), kanvas, mockup, upload, layer | ❌ | Tidak bergantung env |
| **Simulasi Checkout → `/payment/success` → blueprint** | ❌ | Murni client-side (`sessionStorage` + `router.push`) |
| AI negosiasi (chat asli) | ✅ | `GROQ_API_KEY` + `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Upstash Redis) |
| Pembayaran Midtrans sandbox | ✅ | `MIDTRANS_SERVER_KEY` + `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` |

Catatan:

- Kalau tes **tanpa env vars**, tombol Negosiasi tetap tidak bikin error — `initSession` di
  `app/editor/page.tsx` punya fallback offline. Hanya saja `agreedDiscount` tidak akan terisi
  sehingga tombol "Bayar" asli terkunci — tidak masalah, pakai **"Simulasi Checkout (Blueprint Demo)"**.
- AI negosiasi butuh **Upstash Redis** (wiring-nya keras di `lib/server/session-store.ts`, tanpa
  fallback in-memory) **dan** Groq. Keduanya punya free tier dan self-signup
  (console.groq.com, upstash.com) — kalau ingin mencoba, daftar sendiri.
- **Jangan meminta/menyebar `MIDTRANS_SERVER_KEY` milik tim** — key itu secret. Untuk uji
  pembayaran asli, buka akun sandbox Midtrans sendiri (self-service, opsional).

---

## Yang SUDAH ada di repo (jangan diulang)

- **4 zona aktif lengkap** (`lib/config/zones.ts`) + mockup PNG putih/hitam di `public/mockups/`.
- **Per-zone design state otomatis**: setiap switch zona, objek user diserialisasi dan disimpan di
  `lib/ui/design-state.ts` (`viewStates[zone]`, dibaca via `getViewState(zone)`).
  Filter objek user vs background sudah ditulis di `serializeUserObjects()` / `isUserObject()`
  (`lib/ui/canvas-engine.ts`) — pakai logika serupa di extractor.
- **Gambar upload tersimpan sebagai Base64 `data:` URL** (via `FileReader.readAsDataURL` di
  `components/left-panel/upload-image.tsx`), jadi `src` objek image bisa diekstrak langsung.
- **"Simulasi Checkout (Blueprint Demo)"** — tombol dev di panel review editor yang langsung
  menuju `/payment/success` TANPA butuh `GROQ_API_KEY`/Midtrans (zero env vars).
- **Cangkang modal** `components/vendor-blueprint-modal.tsx` + auto-open di halaman sukses.
- AI negosiasi & Midtrans **tetap aktif** dan tidak perlu disentuh.

---

## Panduan teknis (penting)

1. **Snapshot SEBELUM navigasi.** Data desain (`viewStates`) hidup di memori modul — hilang saat
   reload/full-navigation. Panggil `snapshotAllZones()` **di editor saat checkout** (di
   `handleSimulateCheckout` / balik `onSuccess` `snap.pay`), lalu simpan hasilnya ke
   `sessionStorage` dengan key `'vendor_blueprint'` (gunakan konstanta `BLUEPRINT_STORAGE_KEY`
   dari `vendor-blueprint-modal.tsx`). Jangan tulis logic ekstraksi di dalam komponen React.
2. **Jangan merusak performa kanvas.** Extractor hanya MEMBACA state — tidak boleh memanggil
   `renderAll()`, mengubah objek, atau nempel ke event loop canvas. Halaman `/payment/success`
   tidak punya canvas instance (canvas unmount saat keluar `/editor`).
3. **Zona yang belum pernah dibuka** default-nya tidak punya state (`getViewState(...) === null`).
   `snapshotAllZones()` harus menghasilkan data yang konsisten untuk 4 zona (kosong ≠ error).
4. **Waspada bug ekspor Fabric clip-path** (issue #8517, sudah ada TODO di `canvas-engine.ts`):
   `toDataURL()`/ekspor thumbnail zona bisa keliru jika masih ada `clipPath` ber-flag
   `absolutePositioned`. Sesuaikan koordinat sesuai CARA BACA, bukan asumsi.
5. **Harga tetap server-authoritative** — blueprint hanya data desain/asset, tidak boleh
   menghitung atau membawa harga.

---

## Quality gate (WAJIB lolos sebelum PR)

```bash
npx tsc --noEmit   # 0 error BARU (3 error pre-existing di ARCHITECTURE.md §F dibiarkan)
npm run build      # harus berhasil
```

Catatan: `npm run lint` belum punya config — pakai gate di atas. Kerjakan dengan `npm run dev`
(atau `pnpm dev` bila memakai pnpm).

---

## Pengumpulan

1. Buat branch **`candidate/[nama-kamu]`** dari `main`.
2. Buka **Pull Request ke `main`**.
3. Di deskripsi PR sertakan:
   - URL live preview **Vercel** (deploy dari branch kamu),
   - catatan teknis singkat (cara kamu mengekstrak state tanpa re-render, bagaimana memfilter
     objek user dari mockup, keputusan desain UI modal).

Deployment wajib ke akun Vercel pribadimu (repo akan diset sebagai private — gunakan repo fork
pribadi bila perlu akses deploy).

---

## Kriteria penilaian (CTO)

| Aspek | Bobot | Fokus |
|---|---|---|
| **State Management** | 40% | Kemampuan mengekstrak data dari state internal (`design-state.ts` / canvas) tanpa merusak performa kanvas. |
| **Data Parsing** | 30% | Ketepatan memfilter & mengambil objek gambar **user** dari background mockup; ekstraksi Base64 `src` + koordinat. |
| **React Cleanliness** | 30% | Kebersihan kode UI, TypeScript yang ketat, dan tidak ada re-render yang tidak perlu pada mesin kanvas utama. |

Sub-poin yang memberi poin lebih: kontrak tipe di `types/` (bukan inline di komponen), engine
imperatif terisolasi dari React, sadar batasan zone yang belum dibuka, dan konsistensi dengan
`ARCHITECTURE.md`.