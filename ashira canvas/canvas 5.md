---

tags:

- prd
- saas
- konveksi
- ashiratech
- canvas
- refactor
- efisiensi date: 2026-08-29 status: 🟢 siap diserahkan ke Claude Code / Developer related:
- "[[PRD ASHIRATECH]]"
- "[[Tech Stack ASHIRATECH]]"
- "[[PRD-fitur-canvas-ashiratech]]"

---

# PRD Build: Refactor Struktur Folder & Eksekusi Efisiensi (Canvas Module)

**Dokumen ini adalah gabungan** dari hasil audit efisiensi kode + PRD fitur canvas yang sudah ada. Tujuannya supaya Claude Code punya **satu instruksi eksekusi**, tidak ada dua dokumen yang isinya tumpang tindih atau bertentangan urutannya.

**Yang TIDAK diulang di sini:** detail teknis print area (section 4.1) dan mekanisme recoloring via swap mockup (section 4.3) — itu tetap merujuk ke `[[PRD-fitur-canvas-ashiratech]]`, tidak diduplikasi.

**Yang BARU di dokumen ini:** struktur folder target, dan urutan eksekusi gabungan yang menyatukan bug-fix canvas dengan temuan audit efisiensi.

## 1. Keputusan Arsitektur: Struktur Folder

**Dipilih: Opsi A — 1 repo, konvensi tegas.** Konsisten dengan prinsip _"Modular monolith, bukan microservices"_ yang sudah dikunci di `[[Tech Stack ASHIRATECH]]`. Effort rendah-sedang, cocok untuk ukuran tim saat ini, dan tetap jadi fondasi yang mudah dipecah ke struktur lebih fisik (Opsi B) nanti kalau tim berkembang — tanpa perlu menulis ulang arsitektur dari nol.

### 1.1. Prinsip Pemisahan

- **`lib/ui/`** — logic yang murni berkaitan dengan presentasi/interaksi canvas (state view/zona aktif, helper UI, formatting tampilan). Boleh diakses/diubah developer frontend tanpa perlu paham logic server.
- **`lib/config/`** — konstanta & konfigurasi yang dipakai bersama (definisi print area, daftar warna, daftar zona, path mockup). Ini "kontrak" yang dibaca frontend maupun backend — perubahan di sini butuh koordinasi kedua role, tapi lokasinya jelas satu tempat.
- **`lib/server/`** — logic yang **wajib** jalan di server, tidak boleh dipercaya ke client: kalkulasi harga final, validasi input sebelum checkout, apapun yang menyentuh Xendit/DB Supabase secara langsung. Ini area milik developer backend.
- **`types/`** — tipe/interface yang dipakai lintas frontend-backend (mis. bentuk data `PrintArea`, `ViewState`, `DesignOrder`) disatukan di sini sebagai **kontrak tunggal** — bukan didefinisikan ulang terpisah di masing-masing sisi.

### 1.2. Aturan Kontrak Frontend↔Backend

- Frontend **tidak boleh** mengimpor langsung dari `lib/server/`. Semua interaksi ke logic server wajib lewat API route/server action yang sudah didefinisikan tipenya di `types/`.
- Setiap fungsi di `lib/server/` yang menghitung sesuatu yang berdampak ke uang (harga, invoice) **wajib** punya tipe return yang eksplisit di `types/`, supaya frontend tahu persis bentuk data yang akan diterima tanpa perlu baca implementasi server.
- Developer baru (frontend atau backend) yang membuka project, aturan mainnya: _"kalau butuh logic yang menyentuh uang/data sensitif, cari di `lib/server/`. Kalau butuh tipe data bersama, cari di `types/`. Selebihnya (UI, canvas, hooks) ada di `lib/ui/` dan `components/`."_

### 1.3. Migrasi

- Ini **refactor struktur**, bukan rewrite. File pindah lokasi + import path disesuaikan; logic yang sudah benar tidak perlu ditulis ulang.
- Dilakukan **bertahap mengikuti P1→P2→P3** di section 2 — bukan migrasi folder besar-besaran di awal yang berisiko bikin branch sulit di-merge. Pindahkan file seiring modul itu disentuh saat mengerjakan prioritas terkait.

## 2. Urutan Eksekusi Gabungan

Prioritas dari audit efisiensi **digabung** dengan PRD Canvas (section 4.2 & 4.4) yang secara substansi adalah pekerjaan yang sama, supaya tidak dikerjakan dua kali oleh proses/waktu yang berbeda.

### P1 — State Terpusat, Fix Render, Harga Server-Authoritative

**Ini adalah gabungan dari:** PRD Canvas section 4.2 (per-view state) + 4.4 (fix race condition render) + temuan audit (harga hardcoded, banyak kanal state desain).

1. **Satu kanal state desain** — konsolidasi jadi satu struktur state terstruktur (bukan tersebar di beberapa tempat) untuk: zona aktif, warna aktif, dan `viewStates` per zona (lihat detail mekanisme di `[[PRD-fitur-canvas-ashiratech]]` section 4.2). Ditempatkan di `lib/ui/` karena ini murni state interaksi canvas, bukan logic server.
2. **Fix urutan load-then-render** untuk ganti background (detail lengkap ada di `[[PRD-fitur-canvas-ashiratech]]` section 4.4) — pastikan diimplementasi di satu fungsi bersama, dipakai baik oleh alur ganti warna maupun ganti zona, supaya tidak ada dua implementasi berbeda yang salah satunya lupa di-fix.
3. **Harga server-authoritative** — pindahkan semua kalkulasi harga (termasuk yang saat ini mungkin masih hardcoded/client-side) ke `lib/server/`. Frontend hanya menampilkan hasil dari server, tidak pernah menghitung harga final sendiri. Ini konsisten dengan prinsip anti-prompt-injection yang sudah ada di `[[PRD ASHIRATECH]]` section 3.2 — sekarang ditegaskan juga untuk kalkulasi harga non-AI (harga dasar per produk/opsi), bukan cuma estimasi dari AI Vision.

**Acceptance criteria P1:**

- [ ] Tidak ada lagi kalkulasi harga yang dilakukan di sisi client — semua harga yang ditampilkan berasal dari response server.
- [ ] Ganti warna/zona berulang cepat tidak lagi menampilkan frame tertimpa (lihat AC #9 di `[[PRD-fitur-canvas-ashiratech]]`).
- [ ] Desain di tiap zona tetap independen & tersimpan saat pindah-pindah (lihat AC #3-6 di `[[PRD-fitur-canvas-ashiratech]]`).

### P2 — Kontrak Tipe/API & Tool Stub

1. Pindahkan/definisikan tipe bersama (`PrintArea`, `ViewState`, dsb) ke `types/` sesuai section 1.1 — hilangkan definisi tipe yang terduplikasi di beberapa file.
2. Rapikan kontrak API — pastikan tiap endpoint yang dipakai frontend punya tipe request/ response yang jelas di `types/`, bukan `any`.
3. **Tool stub (Add Text, Clip Art, Template, Simpan Template):** untuk fase ini, **tool yang belum berfungsi wajib ditandai nonaktif dengan jelas** (disabled + label "Segera Hadir"), **bukan** dibiarkan terlihat aktif tapi tidak melakukan apa-apa saat diklik. Implementasi penuh tool-tool ini **di luar scope P2** — P2 hanya memastikan UI tidak menyesatkan customer dengan tombol yang terlihat berfungsi padahal stub. _(Asumsi ini perlu dikonfirmasi — kalau ternyata salah satu tool stub itu justru mau diprioritaskan untuk selesai penuh di fase ini, bukan cuma disembunyikan, beri tahu.)_

**Acceptance criteria P2:**

- [ ] Tidak ada tipe `any` di jalur data print area, view state, dan kontrak API terkait canvas.
- [ ] Semua tool yang belum berfungsi penuh menampilkan status nonaktif/"Segera Hadir" yang jelas ke customer, tidak ada tombol aktif yang diam-diam tidak melakukan apapun.

### P3 — Optimasi Ringan

1. **Cache mockup** — gambar warna/zona yang sudah pernah di-load tidak di-fetch/decode ulang saat customer bolak-balik ke kombinasi yang sama.
2. **Konsolidasi logic zoom** — satu fungsi fit-to-view yang dipakai konsisten di semua kombinasi warna×zona. Ini sekaligus **menutup bug zoom tidak konsisten** yang ditemukan sebelumnya di lengan kiri/kanan (lihat catatan di `[[PRD-fitur-canvas-ashiratech]]` section 3.1) — pastikan setelah P3, hasil zoom identik untuk zona yang sama di semua warna, dengan syarat aset mockup sudah pixel-aligned sesuai section 3.1 tersebut.
3. **Hapus kode mati** — komponen/fungsi yang sudah tidak dipakai dari eksperimen sebelumnya (misal sisa logic `backgroundColor` lama yang seharusnya sudah digantikan mekanisme swap mockup di P1/section 4.3 PRD Canvas).
4. **Mapping zona terpusat** — satu sumber kebenaran (`lib/config/`) untuk daftar zona (`front/back/left/right`) dan label tampilannya (`Depan/Belakang/Lengan Kiri/Lengan Kanan`), tidak didefinisikan berulang di beberapa komponen.

**Acceptance criteria P3:**

- [ ] Pindah ke kombinasi warna×zona yang sudah pernah dibuka sebelumnya tidak memicu network request/loading ulang gambar yang sama.
- [ ] Level zoom konsisten untuk zona yang sama di kedua warna (Putih & Hitam).
- [ ] Tidak ada dead code tersisa terkait mekanisme background lama.

## 3. Checkpoint Antar Fase

Setiap fase (P1/P2/P3) **wajib diverifikasi acceptance criteria-nya dulu** sebelum lanjut ke fase berikutnya — bukan dikerjakan paralel tanpa jeda. Ini supaya kalau ada regresi, sumbernya mudah dilacak ke fase mana penyebabnya, dan sesuai catatan awal bahwa ini dieksekusi "berurutan sesuai prioritas, dengan checkpoint tiap fase".

## 5. Rencana Terkonfirmasi (Update dari Claude Code)

Urutan final yang dieksekusi: **P1 → Migrasi Folder (diprioritaskan, digabung dengan P1) → P2 → P3.** Migrasi folder dikerjakan lebih awal (bukan bertahap mengikuti tiap fase seperti draf awal section 1.3) karena developer baru akan segera bergabung — P1 dan P2 langsung dikerjakan di lokasi folder final untuk menghindari kerja dobel.

Quality gate per fase: verifikasi manual di browser + `tsc --noEmit` + `next build` bersih (di luar backlog section 5.1 di bawah). Tidak ada ESLint config saat ini — dicatat sebagai gap terpisah, bukan blocker untuk fase ini.

### 5.1. Backlog — Error Pre-Existing (Di Luar Scope Refactor Ini)

Ditemukan saat migrasi, **sengaja tidak diperbaiki di P1-P3** karena tidak terkait refactor canvas/folder. Dicatat di sini supaya tidak hilang setelah P1-P3 selesai:

- [ ] `app/design/[category]/page.tsx:46` — `HeaderProps.onAddToCart` type error.
- [ ] `components/mobile-right-panel-sheet.tsx:152` — type error.
- [ ] `components/right-panel.tsx:105` — `RefObject` type error.
- [ ] Tidak ada konfigurasi ESLint (`eslint.config.*`) di project — pertimbangkan ditambahkan setelah P1-P3 selesai sebagai quality gate tambahan di luar `tsc --noEmit`.

## 6. Pertanyaan Terbuka (Status)

- ~~Konfirmasi asumsi P2 soal tool stub~~ — **Resolved:** semua dinonaktifkan + label "Segera Hadir", tanpa implementasi penuh di fase ini.
- ~~Migrasi folder timing~~ — **Resolved:** diprioritaskan lebih awal, digabung dengan P1, karena developer baru akan segera bergabung.