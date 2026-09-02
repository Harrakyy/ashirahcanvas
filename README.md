# Ashirah Canvas — Design Editor

Editor desain kaos custom berbasis web. Menggabungkan kanvas desain interaktif (Fabric.js), negosiasi harga berbasis AI, dan checkout (Midtrans) dalam satu Next.js monolith.

## Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Canvas | Fabric.js 7.4 |
| State | Zustand 5 |
| AI Chat | Groq SDK (llama-3.3-70b-versatile) |
| Session | Upstash Redis |
| Payment | Midtrans |

## Quickstart

### 1. Clone & install

```bash
git clone <repo-url>
cd design-editor-dashboard
npm install
```

### 2. Setup environment variables

```bash
cp .env.example .env.local
# Edit .env.local dan isi nilai yang sesuai (lihat komentar di dalam file)
```

> **Untuk kandidat Take-Home Test:** Fitur **canvas** (upload gambar, mockup, layer management) berjalan **tanpa env vars sama sekali**. Kamu hanya butuh env vars jika ingin mencoba fitur AI Chat & Negosiasi.

### 3. Jalankan dev server

```bash
npm run dev
# Buka http://localhost:3000/editor
```

### Quality gate (wajib lulus sebelum PR)

```bash
npx tsc --noEmit   # harus 0 error baru (ada 3 pre-existing di ARCHITECTURE.md §F)
npm run build      # harus berhasil
```

## Struktur Folder

```
app/
  editor/          ← Halaman editor utama
  api/             ← Route handlers (quote, session, negotiate, payment)
  payment/success  ← Halaman sukses checkout (trigger modal Vendor Blueprint)
components/
  canvas.tsx       ← Komponen canvas (React wrapper untuk Fabric.js)
  vendor-blueprint-modal.tsx ← Cangkang modal blueprint (isi = tugas take-home test)
  left-panel/      ← Panel tools: upload, layer, text, dsb.
  right-panel/     ← Panel review & negosiasi harga
lib/
  ui/
    canvas-engine.ts   ← Singleton Fabric.js engine (IMPERATIF — bukan React)
    design-state.ts    ← State canvas di luar React
    blueprint-extractor.ts ← TUGAS take-home test (belum ada — dibuat kandidat)
  server/          ← Logic server-only (pricing, AI, session)
  config/          ← Konfigurasi bersama (zones, print-areas, mockup-paths)
store/
  design-store.ts  ← Zustand store (selectedView, selectedCategory)
types/             ← Kontrak tipe bersama frontend & backend
public/
  mockups/         ← Gambar mockup kaos per warna & sisi (front/back/left/right)
```

> **Baca [`ARCHITECTURE.md`](./ARCHITECTURE.md) sebelum mulai coding** — dokumen ini menjelaskan ownership folder, golden rules, dan diagram alur data.

## Take-Home Test: Vendor Blueprint Extractor

Jika kamu adalah kandidat, baca **[`TAKE_HOME_TEST.md`](./TAKE_HOME_TEST.md)** sebagai titik awal. Repo ini
sudah menyiapkan jalur untuk tes:

- **"Simulasi Checkout (Blueprint Demo)"** di panel review editor → shortcut menuju
  `/payment/success` TANPA butuh GROQ_API_KEY / Midtrans (zero env vars).
- **`components/vendor-blueprint-modal.tsx`** → cangkang modal yang terbuka otomatis di
  halaman sukses jika `sessionStorage["vendor_blueprint"]` berisi snapshot desain.
- Implementasi ekstraksi (`lib/ui/blueprint-extractor.ts`) dan isi modal adalah **tugas kandidat**.

## Known Limitations (Backlog — jangan difix tanpa instruksi)

3 TypeScript error pre-existing yang sengaja dibiarkan (lihat `ARCHITECTURE.md §F`):

- `app/design/[category]/page.tsx:46` — `onAddToCart` missing
- `components/mobile-right-panel-sheet.tsx:146` — RefObject type mismatch
- `components/right-panel.tsx:99` — RefObject type mismatch

## Fitur yang Sudah Jalan

- ✅ Mockup kaos (depan/belakang/lengan kiri/kanan) dengan color switching
- ✅ Upload gambar (PNG/JPG maks 5MB) ke canvas dengan print-area clipping
- ✅ Layer management (visibility, lock, z-order, delete)
- ✅ Per-zone design state (desain tersimpan per sisi saat switch view)
- ✅ Debug overlay print area (tombol `◻` di toolbar)
- ✅ AI Chat negosiasi harga (butuh `GROQ_API_KEY`)
- ✅ Checkout Midtrans (butuh `MIDTRANS_SERVER_KEY`)

## Fitur yang Belum Diimplementasi (Status: Coming Soon)

- ⬜ Tambah teks ke canvas (`components/left-panel/add-text.tsx`)
- ⬜ Clip art
- ⬜ Template desain
- ⬜ My Images (galeri)
- ⬜ **Vendor Blueprint Extractor** — jalur trigger & cangkang modal sudah ada
  (`vendor-blueprint-modal.tsx` + tombol "Simulasi Checkout"); ekstraksi data
  (`lib/ui/blueprint-extractor.ts`) dan isi modal adalah tugas take-home test
