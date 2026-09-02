---

tags:

- prd
- saas
- konveksi
- ashiratech
- canvas
- analisis date: 2026-08-28 status: 🟡 draft — analisis awal sebelum PRD lengkap related:
- "[[PRD ASHIRATECH]]"
- "[[Tech Stack ASHIRATECH]]"
- "[[fitur canvas]]"

---

# Analisis: Smart Canvas Configurator — Constraint & Recoloring

## 1. Konteks

Scope disempitkan dulu ke fitur canvas saja, keluar dari gap analysis besar sebelumnya. Status codebase saat ini: upload gambar sudah bisa, checkout sampai payment sudah bisa. Tapi canvas masih berperilaku **free-canvas** — belum sesuai konsep _constraint-based configurator_ yang sudah ditetapkan sejak awal (lihat `[[fitur canvas]]`).

Ada 3 masalah konkret yang dilaporkan, dan penting untuk dipisah karena **root cause dan solusi teknisnya berbeda-beda**:

|#|Masalah yang Dilaporkan|Kategori Teknis|
|---|---|---|
|1|Gambar yang di-drop bisa keluar dari area baju|**Clipping / Bounding constraint**|
|2|Ganti tampilan depan/belakang/lengan kiri/lengan kanan → error|**State management per zona**|
|3|Ganti warna dari palet → yang berubah harusnya warna dasar kaos (putih→hitam dst), bukan elemen lain|**Base-garment recoloring**|

Ketiganya sering disatukan sebagai "canvas belum jadi" — padahal ini 3 sistem terpisah yang kalau digabung tanpa dipetakan dulu, gampang menghasilkan solusi tambal-sulam.

## 2. Breakdown Masalah #1 — Clipping (Gambar Keluar dari Baju)

**Definisi kebutuhan:** Baju = _kanvas_. Area yang bisa diisi desain harus dibatasi ke bentuk siluet baju (atau ke zona tertentu di dalamnya), bukan ke seluruh bidang canvas.

**Pendekatan teknis (Fabric.js):**

- Setiap zona (depan/belakang/lengan kiri/lengan kanan) punya sebuah **`clipPath`** — sebuah shape/path yang mendefinisikan area sah untuk elemen desain di zona tersebut.
- Saat customer drop/resize/geser gambar, Fabric.js akan otomatis memotong (crop) bagian gambar yang keluar dari `clipPath`, secara visual maupun secara data — gambar tidak akan pernah "keluar baju" walau di-resize besar atau digeser ke pinggir.
- Ini beda dengan sekadar membatasi pergerakan objek (`object.setCoords` + bounding box check) — kalau cuma dibatasi pergerakan, gambar besar tetap bisa "nongol" keluar siluet. Clipping adalah solusi yang benar untuk kasus ini.

**Yang perlu dipastikan sebelum implementasi:**

- Apakah bentuk siluet/zona per baju sudah ada dalam bentuk data path (SVG path/koordinat), atau baru berupa gambar mockup polos tanpa data shape terpisah? Ini menentukan apakah `clipPath` bisa langsung dibuat atau harus digambar manual dulu per produk.
- Apakah semua produk (kaos, jersey, kemeja) akan punya shape yang berbeda-beda per SKU, atau ada standar ukuran/posisi zona yang sama untuk semua produk sejenis?

## 3. Breakdown Masalah #2 — Error Saat Ganti Zona

**Definisi kebutuhan:** Customer bisa pindah antar 4 tampilan (depan, belakang, lengan kiri, lengan kanan) tanpa error, dan desain yang sudah dibuat di satu zona **tidak hilang/rusak** saat pindah ke zona lain lalu kembali lagi.

**Kemungkinan root cause (perlu dikonfirmasi, jangan diasumsikan):**

- Kemungkinan besar saat ini hanya ada **1 instance canvas** yang dipakai bergantian untuk ke-4 zona, dan saat berpindah, state canvas (objek, posisi, `clipPath`) di-_overwrite_ atau di-reset tanpa disimpan dulu — sehingga transisi antar zona menyebabkan konflik/error.
- Arsitektur yang benar: setiap zona punya **state desain sendiri-sendiri** (disimpan terpisah di memori/JSON, bukan di canvas yang sama), dan "ganti zona" artinya _save state zona lama → load state zona baru ke canvas_, bukan memanipulasi canvas yang sama secara langsung.

**Yang perlu dipastikan:**

- Detail error yang muncul saat ini seperti apa persis — canvas jadi kosong, desain di zona sebelumnya hilang, aplikasi crash, atau overlap desain antar zona? Ini penting supaya solusi yang dirancang benar-benar menutup akar masalahnya, bukan menebak.
- Apakah 4 zona ini benar-benar independen (desain depan boleh beda total dari belakang), atau ada aturan bisnis tertentu (misal nomor punggung otomatis muncul juga di preview belakang)?

## 4. Breakdown Masalah #3 — Recoloring Warna Dasar Kaos

**Definisi kebutuhan (penting, ini beda dari yang ada di draf awal PRD):** Saat customer pilih warna dari palet (misal hitam), yang berubah adalah **warna kain/bahan kaos itu sendiri** (dari putih jadi hitam), bukan mengganti elemen desain atau overlay lain. Semua warna di palet harus bisa merepresentasikan hasil akhir kaos dengan warna itu.

Catatan: draf `template_config.json` sebelumnya (`nomor_punggung`, `color_options`) itu untuk warna **elemen teks/cetakan**, bukan untuk warna dasar kain. Ini kebutuhan baru yang belum tercakup di spesifikasi awal — perlu ditambahkan sebagai bagian terpisah di PRD canvas.

Ada 2 pendekatan teknis yang punya trade-off berbeda, dan ini **keputusan yang perlu diambil sebelum PRD ditulis final**, karena berdampak ke cara aset gambar disiapkan:

|Pendekatan|Cara Kerja|Kelebihan|Kekurangan|
|---|---|---|---|
|**A. Dynamic Tinting** (rekomendasi untuk fleksibilitas)|Base garment disiapkan sebagai gambar grayscale/netral, lalu warna di-_apply_ secara programatis lewat blend mode (mis. `multiply`/`overlay` di canvas) saat customer pilih warna|Palet warna bisa sangat banyak/bebas (color picker), tidak perlu bikin aset baru tiap tambah warna, 1 aset per zona cukup|Butuh persiapan aset base yang benar (grayscale dengan shading/lipatan kain tetap kelihatan), butuh testing blend mode di Fabric.js agar hasil akurat secara visual|
|**B. Pre-rendered per Warna**|Admin/vendor upload gambar terpisah untuk tiap kombinasi produk × warna × zona (misal `kaos_depan_putih.png`, `kaos_depan_hitam.png`, dst)|Hasil visual paling akurat & terkontrol, tidak perlu pemrosesan gambar realtime|Jumlah aset membengkak cepat (4 zona × N warna × M produk), repot untuk vendor mengelola tiap tambah SKU/warna baru|

**Yang perlu diputuskan:**

- Berapa banyak pilihan warna yang direncanakan? Kalau terbatas (misal 6–10 warna preset), Pendekatan B lebih realistis untuk MVP. Kalau ingin bebas/luas, Pendekatan A lebih tepat jangka panjang meski butuh usaha awal lebih besar.
- Apakah warna dasar kaos sama untuk 4 zona sekaligus (ganti 1 warna → semua zona ikut berubah), atau bisa berbeda per zona (jarang di dunia nyata, tapi perlu dikonfirmasi)?

## 5. Pertanyaan Klarifikasi Sebelum PRD Lengkap Ditulis

|#|Pertanyaan|Kenapa Penting|
|---|---|---|
|Q1|Bentuk siluet/zona baju sudah ada sebagai data path/SVG, atau masih gambar mockup polos biasa?|Menentukan effort pembuatan `clipPath`|
|Q2|Detail persis error saat ganti zona (kosong/hilang/crash/overlap)?|Supaya solusi menutup akar masalah, bukan gejala|
|Q3|4 zona ini independen penuh, atau ada aturan sinkronisasi (misal elemen tertentu wajib sama di semua zona)?|Menentukan model data per-zona|
|Q4|Recoloring: pilih Pendekatan A (dynamic tint) atau B (pre-rendered per warna)?|Menentukan cara aset disiapkan & effort dev|
|Q5|Berapa banyak warna di palet, dan apakah akan terus bertambah?|Mempengaruhi pilihan Q4|
|Q6|Warna dasar berlaku untuk seluruh 4 zona sekaligus, atau bisa beda per zona?|Menentukan struktur state warna|
|Q7|Produk yang didukung saat ini cuma 1 jenis (kaos), atau akan ada beberapa jenis produk dengan siluet berbeda?|Menentukan apakah `clipPath`/base image perlu sistem template per-produk atau cukup hardcode dulu|

## 6. Langkah Selanjutnya

1. Jawab pertanyaan klarifikasi di atas (bisa langsung di chat).
2. Berdasarkan jawaban, kita tulis PRD fitur canvas yang lengkap: struktur data per zona, struktur state warna, definisi `clipPath` per zona, dan acceptance criteria untuk ketiga masalah di atas.
3. PRD itu yang nanti dipakai sebagai prompt/briefing ke Claude Code untuk implementasi, supaya scope-nya jelas dan tidak tumpang tindih dengan area lain (payment, WA, dsb) yang sudah sengaja dikesampingkan dulu di fase ini.