---

tags:

- prd
- saas
- konveksi
- ashiratech
- canvas date: 2026-08-28 status: 🟢 siap diserahkan ke Claude Code / Developer related:
- "[[PRD ASHIRATECH]]"
- "[[Tech Stack ASHIRATECH]]"
- "[[Analisis Fitur Canvas]]"

---

# PRD: Smart Canvas Configurator — Clipping, Multi-Zona & Recoloring

**Scope PRD ini:** HANYA fitur canvas/design editor. Payment, WA, multi-tenant, dsb sengaja dikesampingkan dulu (lihat gap analysis sebelumnya) — akan digarap terpisah.

**Codebase referensi:** `design-editor-dashboard` — Next.js 16 + React 19 + Fabric.js 7.4 + Zustand 5. File kunci: `lib/print-areas.ts`, `lib/canvas-engine.ts`, `components/canvas.tsx`.

## 1. Tujuan

Mengubah canvas dari **free-canvas** (gambar bisa digeser/resize bebas, bahkan keluar dari kaos) menjadi **constraint-based configurator**:

1. Gambar yang di-drop customer **selalu terkunci di dalam area kaos** — tidak bisa keluar, seberapapun besar di-resize atau digeser.
2. Customer bisa berpindah antar **4 zona** (Depan / Belakang / Lengan Kiri / Lengan Kanan) tanpa error, dan desain di tiap zona **tersimpan independen** satu sama lain.
3. Customer bisa ganti **warna dasar kaos** dari palet (fokus MVP: Putih & Hitam), dan yang berubah adalah kain kaosnya — bukan mengganti/menghapus desain yang sudah di-drop.

## 2. Keputusan yang Sudah Diambil

|Area|Keputusan|
|---|---|
|Recoloring|**Pendekatan B — Pre-rendered per warna.** Tiap warna punya 4 mockup terpisah (bukan tinting programatis). Tidak perlu blend mode.|
|Warna MVP|**Putih & Hitam dulu.** Warna lain di palet sudah ada tapi implementasi menyusul pola yang sama.|
|Produk MVP|**Kaos (tshirt) saja.** Produk lain nanti mengikuti struktur/logic yang sama.|
|Bentuk clip area|**Bounding box/poligon sederhana per zona**, bukan SVG siluet presisi pixel-perfect (karena tidak ada data vector siluet). Bisa ditingkatkan presisinya di fase berikutnya.|
|Orientasi Left/Right|**Dari sudut pandang viewer/canvas**, BUKAN anatomis pemakai baju. File `left.png` = yang tampil di sisi kiri layar, apa adanya.|
|Independensi zona|**Independen penuh.** Depan/Belakang/Lengan Kiri/Lengan Kanan adalah desain terpisah total, tidak ada elemen yang wajib sinkron otomatis antar zona.|
|Warna berlaku ke|**Seluruh 4 zona sekaligus.** Ganti 1 warna → keempat zona ikut ganti mockup ke warna itu.|
|Status "Belakang/Lengan Kiri/Kanan: Soon"|**Asumsi: fitur belum dibangun**, bukan bug dari fitur yang sudah ada. Treatment = membangun, bukan memperbaiki. _(Perlu dikonfirmasi kalau ternyata salah asumsi.)_|

## 3. Konvensi Aset Mockup

```
public/mockups/
└── tshirt/
    ├── white/
    │   ├── front.png
    │   ├── back.png
    │   ├── left.png
    │   └── right.png
    └── black/
        ├── front.png
        ├── back.png
        ├── left.png
        └── right.png
```

**Aturan penamaan (untuk produk & warna baru di masa depan):** `public/mockups/{product}/{color}/{zone}.png`

- `product`: slug produk, mis. `tshirt`, `jersey` (masa depan)
- `color`: slug warna, mis. `white`, `black`, `red` (masa depan)
- `zone`: selalu salah satu dari `front`, `back`, `left`, `right`

Konvensi ini konsisten dengan yang sudah kamu buat — tidak perlu diubah, tinggal ditambah untuk warna/produk baru nanti.

## 4. Functional Requirements

### 4.1. Clipping — Gambar Terkunci di Dalam Kaos

- Setiap kombinasi `{zone}` (untuk MVP: cukup didefinisikan per zona, dipakai untuk kedua warna karena bentuk kaos sama, hanya warnanya beda) punya satu **print area** — sebuah bounding box/poligon yang mendefinisikan area sah untuk elemen desain.
- Print area ini dipasang sebagai **`clipPath`** Fabric.js pada saat gambar di-drop ke canvas.
- Saat customer resize/geser gambar, bagian yang melewati batas `clipPath` **otomatis terpotong secara visual** — tidak pernah tampil keluar siluet kaos, tidak peduli seberapa ekstrem resize/geser-nya.
- **Yang perlu dilakukan di kode:**
    1. Di `lib/print-areas.ts`, tambahkan entri print area untuk kombinasi zona yang belum ada (`back`, `left`, `right`) — saat ini kemungkinan baru ada untuk `front`.
    2. Karena warna tidak mengubah bentuk kaos (cuma tekstur/warna kain), **print area bisa dipakai bersama untuk semua warna di zona yang sama** — tidak perlu duplikasi print area per warna, cukup per zona.
    3. Definisikan koordinat print area (x, y, width, height, atau poligon jika perlu bentuk tidak persegi) berdasarkan mockup `front.png`/`back.png`/`left.png`/`right.png` yang sudah ada — sesuaikan supaya area yang bisa diisi benar-benar berada di badan/lengan kaos, bukan di leher/tepi.

### 4.2. Multi-Zona — Pindah View Tanpa Error, State Independen

- Tiap zona (`front`, `back`, `left`, `right`) punya **state desain sendiri** — daftar objek (gambar, teks, dll) beserta posisi/ukuran/rotasinya, disimpan terpisah per zona.
- **Alur saat customer pindah zona** (mis. dari "Depan" ke "Belakang"):
    1. **Simpan** state zona yang sedang aktif (serialize semua objek user di canvas jadi JSON, simpan ke map/objek `viewStates[zone]`).
    2. **Bersihkan** canvas dari objek-objek user (background mockup tidak dihitung objek user).
    3. **Ganti background** mockup ke `{color}/{zone_baru}.png` dan pasang `clipPath` zona baru.
    4. **Muat kembali** state zona baru dari `viewStates[zone_baru]` kalau sebelumnya sudah pernah ada desain di zona itu; kalau belum pernah, canvas kosong (hanya background).
- Tombol "Belakang / Lengan Kiri / Lengan Kanan" yang saat ini berstatus **"Soon"** diaktifkan penuh mengikuti alur di atas — bukan lagi placeholder.
- **Yang perlu dilakukan di kode (`lib/canvas-engine.ts` & `components/canvas.tsx`):**
    1. Tambahkan struktur `viewStates: Map<string, string>` (key = zona, value = Fabric JSON hasil serialize).
    2. Tambahkan fungsi `saveViewState(zone)` dan `loadViewState(zone)`.
    3. Di handler perubahan `selectedView`: panggil `saveViewState(zonaLama)` → bersihkan canvas → ganti background+clipPath sesuai zona baru → panggil `loadViewState(zonaBaru)`.
    4. Aktifkan keempat zona di konfigurasi `ACTIVE_VIEWS` (hapus status "Soon"/disabled).

### 4.3. Recoloring — Ganti Warna Dasar Kaos

- Warna dasar kaos **BUKAN** properti canvas (`backgroundColor`), melainkan **pemilihan mockup image** sesuai warna yang dipilih.
- Saat customer pilih warna dari palet (mis. klik swatch hitam):
    1. Untuk **setiap** dari 4 zona, ganti background image dari `mockups/tshirt/white/{zone}.png` menjadi `mockups/tshirt/black/{zone}.png`.
    2. **Desain yang sudah ada di tiap zona (`viewStates`) tidak berubah/tidak hilang** — hanya background-nya yang berganti. Objek user (gambar/teks) tetap di posisi yang sama karena posisi print area sama untuk semua warna (lihat 4.1 poin 2).
    3. Zona yang sedang aktif langsung menampilkan mockup warna baru; zona lain cukup diupdate referensi warnanya (tidak perlu re-render sampai user pindah ke zona itu, kalau mau dioptimasi — tapi tidak wajib untuk MVP).
- **Yang perlu dilakukan di kode:**
    1. Simpan `selectedColor` sebagai state terpisah dari `selectedView`.
    2. Fungsi ganti background mockup mengambil path dari kombinasi `mockups/tshirt/{selectedColor}/{selectedView}.png` — bukan hardcode `white`.
    3. Hapus/nonaktifkan logic lama yang mengubah `canvas.backgroundColor` langsung (`components/canvas.tsx`) — diganti sepenuhnya oleh mekanisme swap mockup image.
    4. Untuk MVP, palet warna yang **aktif dan berfungsi** hanya Putih & Hitam — warna lain di UI palet boleh tetap tampil tapi non-aktif/disabled sampai asetnya tersedia, supaya tidak ada state warna yang mockup-nya belum ada (mencegah gambar broken/404).

## 5. Alur Pengujian (untuk Acceptance Criteria)

Skenario uji end-to-end yang harus lolos semua:

1. Buka editor → default warna Putih, default zona Depan.
2. Drop gambar di zona Depan → resize besar sampai melewati batas kaos → **gambar terpotong mengikuti print area**, tidak ada bagian yang tampil di luar siluet kaos.
3. Pindah ke zona Belakang → canvas kosong (belum ada desain), background kaos putih tampil dengan benar, **tidak ada error/crash**, dan desain dari zona Depan **tidak ikut muncul**.
4. Drop gambar berbeda di zona Belakang → kembali ke zona Depan → **desain awal di zona Depan masih ada persis seperti sebelumnya** (tidak hilang, tidak berubah posisi).
5. Ulangi untuk zona Lengan Kiri dan Lengan Kanan — masing-masing independen, tidak saling mempengaruhi.
6. Ganti warna ke Hitam → **keempat zona berubah mockup ke versi hitam**, dan **semua desain yang sudah di-drop di tiap zona tetap ada di posisi yang sama** (tidak hilang, tidak ter-reset).
7. Ganti warna kembali ke Putih → hasil kembali seperti semula, desain tetap utuh.
8. (Regresi) Proses checkout/export desain final tetap berjalan setelah semua perubahan di atas — tidak ada breaking change ke alur payment yang sudah ada.

## 6. Out of Scope (Fase Ini)

- Warna selain Putih & Hitam (aset belum ada — tinggal ikut pola yang sama begitu mockup-nya tersedia).
- Produk selain kaos (jersey, kemeja, dll).
- Clip area presisi mengikuti siluet asli baju (SVG polygon detail) — masih pakai bounding box/poligon sederhana.
- Dynamic tinting/color picker bebas (di luar palet preset).
- Admin UI untuk mengatur print area/koordinat via dashboard (untuk MVP, koordinat print area bisa didefinisikan langsung di kode/`print-areas.ts`).

## 7. Catatan Implementasi untuk Claude Code

- Referensi bug yang sudah ditemukan sebelumnya oleh Claude Code:
    - `reapplyAllClips()` mengembalikan `null` untuk kombinasi zona/warna yang belum punya print area entry → perlu dilengkapi sesuai section 4.1.
    - Tidak ada filtering objek per-view saat `selectedView` berubah → penyebab utama error di section 4.2, perlu `saveViewState`/`loadViewState`.
    - Ada known issue Fabric.js terkait `absolutePositioned clipPath` saat export (fabric.js #8517) — perlu ditangani di tahap export/final render, uji khusus setelah fitur multi-zona aktif.
- Urutan pengerjaan yang disarankan: **4.2 (state per-zona) → 4.1 (print area semua zona) → 4.3 (recoloring via swap mockup) → uji skenario section 5.** Urutan ini dipilih karena 4.2 adalah fondasi yang dipakai ulang oleh 4.1 dan 4.3.

## 8. Pertanyaan Terbuka / Perlu Dikonfirmasi Lagi

- Status "Soon" di 3 zona: dikonfirmasi ini "belum dibangun" bukan "bug fitur lama" — kalau ternyata ada percobaan implementasi sebelumnya yang error, perlu di-cross-check ke Claude Code supaya tidak menimpa kode yang mungkin sebagian sudah benar.
- Koordinat print area per zona (section 4.1) belum final — perlu ditentukan visual (lihat langsung di atas tiap mockup) sebelum dikunci ke `print-areas.ts`.