# 📘 Panduan Handover & Roadmap Pengerjaan Tim Pengembang Ashirah

**Platform:** Ashirah Custom Apparel Platform (Studio Konveksi & Sablon Kustom)  
**Tanggal Rilis:** 24 September 2026  
**Tim Pengembang:**
- **Keisha** — Frontend Developer (FE)
- **Rahmah** — Backend Developer (BE)  
**Metodologi Kerja:** *AI-Assisted Vibecoding* (Menggunakan Cursor, Claude 3.7, Copilot, atau AI IDE lainnya)

---

## 📌 Ringkasan Penting untuk Tim & AI Assistant
> [!IMPORTANT]
> **PANDUAN KHUSUS UNTUK AI AGENT / VIBECODER (Cursor / Claude / Copilot):**
> 1. **JANGAN PERNAH MENULIS ULANG / MEREGENERATE** file yang ditandai **`[SUDAH SELESAI / JANGAN DISENTUH]`**. Modul-modul tersebut sudah berjalan stabil dan teruji.
> 2. Fokus hanya pada file yang ditandai **`[REMAKE / UPDATE]`** (modifikasi terarah) dan **`[BUAT BARU]`** (file baru dari 0).
> 3. Selalu pertahankan tema warna resmi Ashirah: **Deep Navy `#1A2B56`**, latar belakang clean slate/putih, dan **TIDAK MENGGUNAKAN WARNA ORANYE**.
> 4. Selalu jalankan `npx tsc --noEmit` di terminal untuk memastikan 0 error sebelum menyelesaikan tiket.

---

## 📊 Inventori Status Kode: Apa yang Sudah Jadi vs Perlu Dikerjakan

Gunakan tabel ini sebagai acuan utama agar Keisha dan Rahmah tidak membuang waktu mengerjakan hal yang sebenarnya sudah selesai di codebase:

| Kategori | File Path / Modul | Status | Keterangan untuk Developer |
| :--- | :--- | :---: | :--- |
| **Auth BE** | `app/api/auth/register/route.ts` | 🟢 **SUDAH SELESAI** | Validasi email, hash bcrypt, JWT session cookie sudah aktif. |
| **Auth BE** | `app/api/auth/login/route.ts` | 🟢 **SUDAH SELESAI** | Mendukung login password & quick login 3 role. |
| **Auth FE** | `app/register/page.tsx` | 🟢 **SUDAH SELESAI** | Halaman register sudah ada UI-nya & terhubung ke API register. |
| **Auth FE** | `app/login/page.tsx` | 🟢 **SUDAH SELESAI** | Sudah ada kartu quick login & link ke `/register`. |
| **Navbar FE** | `components/header.tsx` | 🟡 **REMAKE / UPDATE** | Tambahkan tombol *"Daftar Akun"* di sebelah *"Masuk"* saat guest. |
| **Ekspedisi BE** | `lib/server/shipping.ts` | 🟢 **SUDAH SELESAI** | Biteship API live (`biteship_live...`) + fallback offline aman. |
| **Ekspedisi BE** | `app/api/shipping/rates/route.ts` | 🟢 **SUDAH SELESAI** | Perhitungan berat otomatis (tshirt 200g, jaket 550g) & tarif kurir. |
| **Ekspedisi BE** | `app/api/shipping/create/route.ts` | 🟢 **SUDAH SELESAI** | Generate resi otomatis Biteship & kirim email status pengiriman. |
| **Checkout FE** | `components/checkout-shipping-dialog.tsx` | 🔵 **BUAT BARU** | Modal checkout alamat + live pilihan kurir Biteship + DP 70:30. |
| **Checkout FE** | `app/hooks/useNegotiation.ts` | 🟡 **REMAKE / UPDATE** | Buka modal checkout pengiriman sebelum menembak payment. |
| **Payment BE** | `app/api/payment/create/route.ts` | 🟡 **REMAKE / UPDATE** | Simpan alamat, kurir, dan tagih **DP 70% + Ongkir** (bukan 100%). |
| **Payment BE** | `app/api/payment/create-dp/route.ts` | 🟢 **SUDAH SELESAI** | Formula DP 70% + Ongkir sudah terpasang. |
| **Payment BE** | `app/api/payment/create-final/route.ts`| 🟢 **SUDAH SELESAI** | Tagihan murni 30% pelunasan (bebas ongkir) sudah terpasang. |
| **Tracking FE** | `app/orders/[id]/order-tracker-client.tsx`| 🟢 **SUDAH SELESAI** | Stepper, review sample approve/reject, & tombol pelunasan 30% sudah aktif! |
| **Landing FE** | `app/page.tsx` | 🟡 **REMAKE / UPDATE** | Tambahkan Hero Section Company Profile, Cara Kerja, & Keunggulan. |
| **Tenant BE** | `app/api/tenants/register/route.ts` | 🔵 **BUAT BARU** | Endpoint pendaftaran mandiri mitra pabrik konveksi. |
| **Tenant BE** | `app/api/super-admin/tenants/[id]/approve` | 🔵 **BUAT BARU** | Endpoint approval vendor konveksi baru oleh Super Admin. |

---

## 💰 Logika Keuangan Wajib: Formula 70:30 & Ongkir Biteship

Semua alur pemesanan di platform Ashirah mengikuti aturan 2 termin pembayaran:

```
[Customer Checkout di Studio]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│  TERMIN 1: INVOICE DP 70% + ONGKIR (Dibayar di Awal)   │
│  DP = Math.round(Subtotal * 0.7) + shippingCost        │
│  Tujuan: Modal kain, film DTF, dan ongkir kurir lunas  │
└────────────────────────────────────────────────────────┘
           │
           ▼ (Konveksi Produksi & Upload Foto Sample)
           ▼ (Customer Approve Sample di /orders/[id])
           ▼ (Produksi Selesai - Status: READY)
           │
┌────────────────────────────────────────────────────────┐
│  TERMIN 2: INVOICE PELUNASAN 30% (Dibayar Saat Selesai)│
│  Pelunasan = Subtotal - Math.round(Subtotal * 0.7)     │
│  (Tanpa ongkir tambahan karena ongkir lunas di awal)   │
└────────────────────────────────────────────────────────┘
           │
           ▼ (Status: SHIPPED - Resi Biteship Terbit Otomatis)
```

---

## 📅 Roadmap Detail 5 Hari Kerja (Vibecoder Edition)

---

### 📆 HARI 1: Sinkronisasi Autentikasi & Entry Point Pengguna
**Fokus Hari 1:** Memastikan alur registrasi dan login customer berjalan 100% mulus dari browser tanpa kendala.

#### 🎨 Tugas Keisha (Frontend) — Hari 1
* **[UPDATE]** `components/header.tsx`:
  - **Lokasi Edit:** Baris 289–298.
  - **Kondisi Saat Ini:** Jika guest/belum login, hanya ada tombol *"Masuk"*.
  - **Tindakan:** Tambahkan tombol *"Daftar Akun"* (`<Link href="/register">`) dengan variant outline/ghost bersebelahan dengan tombol *"Masuk"*.
* **[VERIFIKASI]** `app/register/page.tsx`:
  - Buka halaman `/register` di browser.
  - Coba daftarkan akun baru (nama, email, no hp, password).
  - Pastikan setelah register berhasil langsung diarahkan ke beranda atau `/editor` dengan session tersimpan.
* **[VERIFIKASI]** `app/login/page.tsx`:
  - Pastikan link *"Daftar akun baru"* mengarah ke `/register` dengan benar.

#### 🛠️ Tugas Rahmah (Backend) — Hari 1
* **[VERIFIKASI]** `app/api/auth/register/route.ts`:
  - Sudah lengkap dengan hash `bcryptjs` dan cookie JWT `auth_token`.
  - Pastikan validasi email duplikat mengembalikan kode HTTP 409 dengan pesan yang ramah.
* **[UPDATE]** `app/api/user/profile/route.ts`:
  - Buat handler `GET` dan `PATCH` agar customer yang login bisa membaca dan menyimpan alamat pengiriman default (nama penerima, no hp, alamat, kota, kode pos).

---

### 📆 HARI 2: Modal Checkout Pengiriman di Canvas Studio
**Fokus Hari 2:** Menghubungkan Canvas Editor dengan pemilihan alamat pengiriman dan cek tarif kurir real-time.

#### 🎨 Tugas Keisha (Frontend) — Hari 2
* **[BUAT BARU]** `components/checkout-shipping-dialog.tsx`:
  - Buat komponen modal dialog (shadcn/ui Dialog) dengan props:
    ```ts
    interface CheckoutShippingDialogProps {
      isOpen: boolean
      onClose: () => void
      sessionId: string
      totalQty: number
      category: string
      subtotal: number
      designBlueprint: any
      onProceedToPayment: (shippingData: any) => Promise<void>
    }
    ```
  - **Field Input:** Nama Penerima, Nomor WhatsApp/Telepon, Alamat Jalan, Kota, dan **Kode Pos (Input 5 Angka)**.
  - **Live Fetch Kurir:** Saat kode pos selesai diketik (5 digit), lakukan `fetch('/api/shipping/rates', { method: 'POST', body: JSON.stringify({ destinationPostalCode, quantity: totalQty, category }) })`.
  - **Pilihan Kurir (Radio Card):** Render pilihan kurir yang returned:
    - JNE Reguler (`price`, `estimatedDays`)
    - SiCepat SIUNTUNG (`price`, `estimatedDays`)
    - J&T EZ (`price`, `estimatedDays`)
  - **Ringkasan Tagihan 70:30 (Live Update saat kurir dipilih):**
    - Subtotal Kaos: `Rp Subtotal`
    - Ongkir Ekspedisi: `Rp shippingCost`
    - **Total Tagihan DP 70% + Ongkir (Bayar Sekarang): Rp Math.round(Subtotal * 0.7) + shippingCost**
    - Sisa Pelunasan 30% (Bayar Saat Baju Beres): `Rp Subtotal - Math.round(Subtotal * 0.7)`

#### 🛠️ Tugas Rahmah (Backend) — Hari 2
* **[VERIFIKASI]** `app/api/shipping/rates/route.ts`:
  - Sudah terpasang kalkulasi berat otomatis (`tshirts`: 200g, `polo`: 250g, `jackets`: 550g).
  - Panggil `shipping.getRates()` dari `lib/server/shipping.ts`.
  - Uji via Postman / curl dengan body:
    ```json
    { "destinationPostalCode": "12430", "quantity": 24, "category": "tshirts" }
    ```
  - Pastikan return status 200 dengan daftar `rates` kurir.

---

### 📆 HARI 3: Integrasi Pembayaran DP 70% + Ongkir ke Duitku
**Fokus Hari 3:** Menghubungkan modal pengiriman ke gateway pembayaran Duitku dengan nominal DP 70% + Ongkir yang akurat.

#### 🛠️ Tugas Rahmah (Backend) — Hari 3
* **[REMAKE / UPDATE]** `app/api/payment/create/route.ts`:
  - **Lokasi Edit:** Baris 14–20 & 107–160.
  - **Kondisi Saat Ini:** File ini membuat order dengan `shippingCost: 0` dan menagih 100% nominal order (`grossAmount`) ke Duitku.
  - **Tindakan Modifikasi:**
    1. Ambil data pengiriman dari `request.body`:
       ```ts
       const { sessionId, designBlueprint, shippingAddress, courierCode, courierName, shippingCost = 0 } = body
       ```
    2. Hitung split 70:30:
       ```ts
       const subtotal = getTotalPrice(session)
       const dpAmount = Math.round(subtotal * 0.7) + Number(shippingCost)
       const finalAmount = subtotal - Math.round(subtotal * 0.7)
       ```
    3. Update `createOrder`:
       - `shippingCost: Number(shippingCost)`
       - `dpAmount`
       - `finalAmount`
       - `shippingAddress`
    4. Buat transaksi Duitku dengan nominal `paymentAmount: dpAmount`:
       - Item 1: `DP 70% Produksi Kaos Custom` = `Math.round(subtotal * 0.7)`
       - Item 2: `Ongkos Kirim Ekspedisi (${courierName})` = `Number(shippingCost)`
    5. Simpan record pembayaran di tabel `payments`:
       - `type: 'dp'`
       - `amount: dpAmount`
       - `status: 'pending'`

#### 🎨 Tugas Keisha (Frontend) — Hari 3
* **[REMAKE / UPDATE]** `app/hooks/useNegotiation.ts` & `components/right-panel/negotiate-mode.tsx`:
  - Saat customer menekan tombol **"Lanjut ke Pembayaran"** setelah nego selesai:
    - Buka dialog modal `CheckoutShippingDialog`.
    - Setelah customer memilih kurir dan klik *"Bayar DP Sekarang"*, kirimkan payload lengkap ke `POST /api/payment/create`:
      ```json
      {
        "sessionId": "ses_...",
        "designBlueprint": { ... },
        "shippingAddress": { "name": "...", "phone": "...", "street": "...", "city": "...", "postalCode": "..." },
        "courierCode": "jne",
        "courierName": "JNE Reguler",
        "shippingCost": 36000
      }
      ```
    - Redirect customer ke `paymentUrl` Duitku yang dikembalikan backend.

---

### 📆 HARI 4: Pelacakan Pesanan, Review Sample, & Pelunasan 30%
**Fokus Hari 4:** Memastikan siklus saat baju selesai diproduksi hingga pelunasan 30% dan penerbitan resi kurir.

#### 🎨 Tugas Keisha (Frontend) — Hari 4
* **[VERIFIKASI & REVIEW]** `app/orders/[id]/order-tracker-client.tsx`:
  - Modul ini **sudah memiliki fungsi `handlePayFinal` dan banner pelunasan 30%** di baris 381–397:
    - Banner: *"Produksi Selesai! Saatnya Pelunasan 30%"*.
    - Tombol: *"Bayar Pelunasan 30% →"*.
  - Lakukan uji coba UI:
    1. Buka URL `/orders/[orderId]` dari akun customer.
    2. Pastikan saat status pesanan adalah `ready` (Selesai Produksi), banner pelunasan 30% muncul dengan nominal persis 30% subtotal.
    3. Pastikan saat tombol diklik, browser membuka halaman Duitku untuk pelunasan.

#### 🛠️ Tugas Rahmah (Backend) — Hari 4
* **[VERIFIKASI]** `app/api/payment/create-final/route.ts`:
  - Pastikan hanya menagih `order.finalAmount` (murni 30% sisa subtotal tanpa biaya ongkir lagi).
  - Pastikan pesanan harus berstatus `ready` agar tidak bisa dilunasi sebelum barang selesai.
* **[VERIFIKASI]** `app/api/shipping/create/route.ts`:
  - Pastikan saat Admin mengklik Kirim Barang di `/admin/orders/[id]`:
    - Fungsi `shipping.createShipment` memanggil Biteship untuk men-generate resi otomatis.
    - Status pesanan berubah menjadi `shipped`.
    - Resi otomatis muncul di halaman tracking customer (`/orders/[id]`).

---

### 📆 HARI 5: Onboarding Mitra Konveksi & Polish Company Profile
**Fokus Hari 5:** Pendaftaran vendor konveksi baru dan perapian halaman depan (Landing Page).

#### 🛠️ Tugas Rahmah (Backend) — Hari 5
* **[BUAT BARU]** `app/api/tenants/register/route.ts`:
  - Endpoint publik untuk vendor/pabrik konveksi yang ingin bermitra dengan platform Ashirah.
  - **Request Body:**
    ```json
    {
      "tenantName": "Konveksi Berkah Mandiri",
      "slug": "berkah-mandiri",
      "address": "Jl. Industri Rajawali No. 88, Bandung",
      "postalCode": "40184",
      "phone": "081122334455",
      "adminName": "Haji Slamet",
      "adminEmail": "slamet@berkahmandiri.com",
      "password": "rahasiaVendor123"
    }
    ```
  - **Tindakan:**
    1. Validasi email unik di tabel `users` dan slug unik di tabel `tenants`.
    2. Insert ke tabel `tenants` dengan `isActive: false` (menunggu verifikasi Super Admin).
    3. Insert admin tenant ke tabel `users` dengan `role: 'admin'`, hash password `bcrypt`, dan sambungkan `tenantId`.
* **[BUAT BARU]** `app/api/super-admin/tenants/[id]/approve/route.ts`:
  - Hanya bisa diakses oleh `super_admin`.
  - Update status tenant menjadi `isActive: true` sehingga vendor dapat mulai login di `/login`.

#### 🎨 Tugas Keisha (Frontend) — Hari 5
* **[REMAKE / UPDATE]** `app/page.tsx` (Company Profile):
  - **Kondisi Saat Ini:** Langsung menampilkan grid produk tanpa perkenalan identitas konveksi.
  - **Tindakan Peningkatan:**
    1. **Hero Section:** Banner profesional dengan headline: *"Platform Konveksi & Apparel Custom Terpercaya"*, tombol CTA *"Mulai Desain Kaos (Canvas Studio)"* dan *"Katalog Produk"*.
    2. **Section 3 Langkah Mudah:**
       - ① Desain Pakaian di Studio 4 Sisi (Depan, Belakang, Lengan).
       - ② Negosiasi AI & Bayar DP 70% + Ongkir Aman via Duitku.
       - ③ Produksi Beres, Pelunasan 30%, dan Paket Dikirim Kurir ke Rumah.
    3. **Section Keunggulan Konveksi:** Kualitas kain Combed 100%, sablon DTF anti retak, garansi sample produksi sebelum jahit masal.

---

## 🤖 Cheat-Sheet Vibecoding: Prompt Siap Pakai untuk AI

Berikan prompt ini langsung ke AI assistant Anda (Cursor Composer / Claude / Copilot) agar AI bekerja secara presisi tanpa merusak file lain:

### 💬 Prompt untuk AI Keisha (Frontend Developer):
```markdown
Halo AI, saya mengerjakan tugas Frontend di project Ashirah (Next.js 16 App Router, TypeScript, Tailwind CSS, tema Deep Navy #1A2B56).
Tugas saya saat ini adalah:
1. Buat komponen baru `components/checkout-shipping-dialog.tsx`.
2. Modal ini menerima props subtotal, sessionId, quantity, dan category.
3. Meminta input nama penerima, no HP, alamat jalan, kota, dan kode pos (5 digit).
4. Saat kode pos 5 digit terisi, fetch `POST /api/shipping/rates` untuk menampilkan pilihan radio button kurir (JNE, SiCepat, J&T) beserta harga dan estimasi hari.
5. Tampilkan kalkulasi 70:30 secara transparan:
   - Subtotal Kaos: Rp ...
   - Ongkir Kurir: Rp ...
   - TOTAL DP 70% + ONGKIR (Harus dibayar sekarang): Rp (Subtotal * 0.7) + Ongkir
   - Sisa Pelunasan 30% (Dibayar saat produksi beres): Rp Subtotal * 0.3
6. Saat tombol 'Bayar DP Sekarang via Duitku' diklik, panggil endpoint `POST /api/payment/create` membawa payload alamat + kurir + ongkir, lalu redirect ke paymentUrl Duitku.
PENTING: Gunakan styling clean dengan Tailwind, badge status elegan, dan JANGAN gunakan warna oranye!
```

---

### 💬 Prompt untuk AI Rahmah (Backend Developer):
```markdown
Halo AI, saya mengerjakan tugas Backend di project Ashirah (Next.js 16 App Router, TypeScript, Drizzle ORM, PostgreSQL, Duitku, Biteship).
Tugas saya saat ini adalah memperbarui `app/api/payment/create/route.ts`:
1. Ambil properti tambahan dari request body: `shippingCost`, `courierCode`, `courierName`, dan `shippingAddress`.
2. Hitung skema pembayaran 2 termin (70:30):
   - const subtotal = getTotalPrice(session)
   - const dpAmount = Math.round(subtotal * 0.7) + Number(shippingCost || 0)
   - const finalAmount = subtotal - Math.round(subtotal * 0.7)
3. Simpan nilai `shippingCost`, `dpAmount`, `finalAmount`, dan `shippingAddress` ke tabel `orders` melalui helper `createOrder`.
4. Saat memanggil `duitku.createTransaction`, atur `paymentAmount: dpAmount` (bukan 100% subtotal) dengan rincian item:
   - Item 1: 'DP 70% Produksi Kaos Custom' sebesar Math.round(subtotal * 0.7)
   - Item 2: 'Ongkos Kirim Ekspedisi (' + courierName + ')' sebesar shippingCost
5. Simpan record di tabel `payments` dengan `type: 'dp'`, `amount: dpAmount`, `status: 'pending'`.
PENTING: Jangan ubah logika session token atau helper Drizzle lainnya yang sudah berjalan stabil. Jalankan typecheck tanpa error.
```

---

## 🤝 Kontrak API Lengkap (JSON Request & Response)

### 1. Cek Ongkir Kurir (`POST /api/shipping/rates`)
* **Endpoint:** `POST /api/shipping/rates`
* **Request JSON:**
  ```json
  {
    "destinationPostalCode": "12430",
    "category": "tshirts",
    "quantity": 24
  }
  ```
* **Response JSON (200 OK):**
  ```json
  {
    "success": true,
    "rates": [
      {
        "courierCode": "jne",
        "courierName": "JNE",
        "courierServiceName": "Reguler (REG)",
        "courierServiceCode": "reg",
        "price": 36000,
        "estimatedDays": "2-3 hari"
      },
      {
        "courierCode": "sicepat",
        "courierName": "SiCepat",
        "courierServiceName": "SIUNTUNG",
        "courierServiceCode": "siuntung",
        "price": 34000,
        "estimatedDays": "2-3 hari"
      }
    ],
    "totalWeightGrams": 4800
  }
  ```

---

### 2. Buat Pesanan & Tagihan DP 70% + Ongkir (`POST /api/payment/create`)
* **Endpoint:** `POST /api/payment/create`
* **Request JSON:**
  ```json
  {
    "sessionId": "ses_9a8b7c6d5e",
    "designBlueprint": { "zones": [] },
    "shippingAddress": {
      "name": "Budi Santoso",
      "phone": "081234567890",
      "street": "Jl. Gatot Subroto No. 45",
      "city": "Jakarta Selatan",
      "province": "DKI Jakarta",
      "postalCode": "12430"
    },
    "courierCode": "jne",
    "courierName": "JNE Reguler",
    "shippingCost": 36000
  }
  ```
* **Response JSON (200 OK):**
  ```json
  {
    "success": true,
    "paymentUrl": "https://sandbox.duitku.com/web/checkout/...",
    "orderId": "7f8b9c0d-1234-5678-90ab-cdef12345678",
    "orderNumber": "ASH-20260924-8841",
    "dpAmount": 1436000,
    "finalAmount": 600000
  }
  ```

---

### 3. Pendaftaran Mitra Konveksi Baru (`POST /api/tenants/register`)
* **Endpoint:** `POST /api/tenants/register`
* **Request JSON:**
  ```json
  {
    "tenantName": "Konveksi Bandung Jaya",
    "slug": "bandung-jaya",
    "address": "Jl. Kopo No. 120, Bandung",
    "postalCode": "40234",
    "phone": "081398765432",
    "adminName": "Kang Asep",
    "adminEmail": "asep@bandungjaya.com",
    "password": "PasswordKuat123"
  }
  ```
* **Response JSON (201 Created):**
  ```json
  {
    "success": true,
    "message": "Pendaftaran mitra konveksi berhasil diajukan. Menunggu persetujuan Super Admin Ashirah.",
    "tenantId": "uuid-...",
    "status": "pending_approval"
  }
  ```

---

## 🔍 Checklist Review Pemilik Proyek (Panduan Menguji Hasil Kerja Mereka)

Gunakan daftar ini untuk menguji hasil kerja Keisha dan Rahmah secara langsung di browser:

- [ ] **1. Registrasi Akun:** Buka browser incognito, klik *"Daftar Akun"* di header ➔ Buat akun baru ➔ Pastikan berhasil masuk tanpa reload manual.
- [ ] **2. Canvas Studio & Nego:** Buka `/editor` ➔ Atur jumlah kaos (misal: 24 pcs) ➔ Selesaikan nego harga grosir.
- [ ] **3. Modal Checkout:** Klik *"Lanjut ke Pembayaran"* ➔ Pastikan dialog modal pengiriman terbuka (bukan langsung redirect).
- [ ] **4. Tarif Ekspedisi Biteship:** Masukkan kode pos `12430` ➔ Cek apakah opsi JNE, SiCepat, atau J&T muncul dengan harga ongkir.
- [ ] **5. Verifikasi Nominal 70:30:** Periksa apakah total tagihan yang tertera di modal adalah:
  $$\text{Total DP} = (\text{Subtotal} \times 0.7) + \text{Ongkir}$$
- [ ] **6. Invoice Duitku:** Klik *"Bayar DP Sekarang"* ➔ Pastikan halaman Duitku terbuka dengan rincian DP 70% dan Ongkos Kirim.
- [ ] **7. Pelunasan 30%:** Buka halaman `/orders/[id]` pesanan yang sudah berstatus `ready` ➔ Pastikan muncul tombol *"Bayar Pelunasan 30%"* dengan nominal murni 30% subtotal.
