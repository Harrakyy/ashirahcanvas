# Take-Home Test — Backend Engineer (Enrich AI Negotiation — AshirahBot)

Selamat datang! Tugasmu adalah **mengembangkan sisi backend dari AI negosiasi harga**
(chatbot **AshirahBot**) pada editor kaos custom Ashirah ini agar balasannya lebih
**manusiawi & adaptif terhadap gaya customer**, serta **pemakaian tokennya terukur &
dievaluasi efisiensinya**.

> **Baca `ARCHITECTURE.md` dulu (wajib).** Dokumen itu menjelaskan ownership folder,
> golden rules (§C), dan diagram alur data. Semua keputusan kode harus konsisten dengan
> konvensi di sana — terutama prinsip **harga server-authoritative** dan **frontend tidak
> boleh import `lib/server/`**.

---

## Scope & Non-Scope

| | |
|---|---|
| **✅ In scope** | Backend AI negosiasi saja: prompt/system, branch logic di route, pengukuran & logging token. |
| **🚫 Out of scope** | **AI Vision** (`lib/server/ai-vision.ts`, `types/vision.ts`) — **jangan disentuh**. |
| **🚫 Out of scope** | Kalkulasi harga (`lib/server/pricing.ts`, `lib/config/products.ts`) — **jangan diubah**. |
| **🚫 Out of scope** | Pembayaran Midtrans (`app/api/payment/create`), blueprint vendor, dan seluruh UI/frontend. |

Backend negosiasi yang berjalan **saat ini sudah aktif dan jangan dipecah** — kamu
menyempurnakan kualitasnya, bukan membangun dari nol.

---

## Ringkasan Tugas

### Task A — Adaptive AI Personality (balasan ramah & manusiawi)

AshirahBot saat ini sudah bisa balas, tapi gaya jawabannya hampir **seragam** untuk semua
customer (prompt statis diperbarui per pesan). Buat balasannya **adaptif**:

- Kenali **gaya/tone customer** dari pesan terakhir & riwayat (misal: singkat vs panjang,
  bahasa Indonesia vs campuran/Inggris, santai vs formal, pakai emoji vs tidak).
- Sesuaikan balasan agar **manusiawi & natural** mengikuti gaya itu — customer yang
  singkat harus diperlakukan beda dari yang bercerita panjang.
- Tetap **hangat & ramah** dalam semua kasus (jangan jadi kaku / robotik / copy-paste).
- Jangan hanya "menebak" berdasar urutan — pertimbangkan inten (ACCEPT/REJECT/UNKNOWN)
  yang sudah diklasifikasi dan tier diskon saat ini.

Jalur yang boleh & wajib kamu gunakan:

- `lib/server/negotiation-state.ts` → `buildSystemPrompt` (+ bantu deteksi gaya bila perlu)
- Branch prompt di `app/api/session/init/route.ts` (greeting) dan
  `app/api/negotiate/route.ts` (ACCEPT / REJECT / UNKNOWN)

#### Contoh kalibrasi & checklist penilaian

Ilustrasi arah (bukan wajib ditiru persis):

- **Customer singkat & santai:** "bisa kurang gak kak" → balasan singkat, hangat, tidak
  bertele-tele. Contoh arah: "Bisa kak! 😊 Untuk qty segini bisa aku kasih diskon 5%..."
- **Customer panjang & formal:** "...selamat siang, apakah ada kemungkinan penyesuaian
  harga mengingat jumlah pesanan yang cukup besar..." → balasan lebih terstruktur, sopan,
  tidak pakai bahasa gaul/emoji berlebihan.

Checklist yang dinilai reviewer:

- [ ] Panjang balasan proporsional dengan gaya pesan customer (bukan template sama panjang)
- [ ] Pemakaian emoji/bahasa gaul menyesuaikan, bukan dipaksakan di semua kasus
- [ ] Tidak ada kalimat template yang terasa copy-paste di 2+ balasan berbeda
- [ ] Tetap patuh golden rules (tidak sebut hex warna, harga tetap dari server)

Tujuan sub-bagian ini: kalibrasi penilaian antar reviewer (bukan berdasar "feel") sekaligus
memberi target konkret untuk kandidat.

#### Aturan wajib yang TIDAK boleh dilanggar

1. **Harga tetap server-authoritative.** Kamu tidak pernah menghitung/menentukan harga di
   client; semua angka harga di prompt bersumber dari variabel sesi yang sudah dihitung
   server. Jangan hardcode harga baru.
2. **Intent diklasifikasi lewat regex** (`classifyUserIntent`) — **bukan** diserahkan ke LLM
   mentah. Jangan ganti mekanisme anti-prompt-injection ini.
3. **Output AI selalu melewati `validateAIResponse`** di server sebelum sampai ke customer.
   Jangan short-circuit validasi ini.
4. **Jangan pernah menyebut kode warna hex** ke customer (sudah menjadi aturan prompt; jaga
   konsistensinya di semua branch).
5. Tipe/kontrak baru kalau diperlukan **didefinisikan sekali di `types/`** (golden rule #3),
   bukan inline di route/komponen.

### Task B — Pengukuran & Logging Token

- Tambahkan **pengukuran perkiraan token** per panggilan AI di gateway (`lib/server/groq.ts`).
- Buat **log terstruktur** yang memuat sekurangnya: `model`, estimasi `promptTokens`,
  estimasi `completionTokens`, `totalTokens` (jika bisa dari respons API, pakai nilai
  resmi `usage`; jika tidak tersedia, gunakan estimator sederhana yang kamu tulis sendiri
  dan jelaskan metodenya), `latencyMs`, dan `timestamp`.
- Tujuan akhir: **tingkat token/biaya tiap pesan negosiasi bisa dites & dibandingkan**
  antar percakapan / antar branch. Jadi log tidak boleh "nyasar" hilang tanpa struktur.
- Jangan merusak perilaku yang sudah ada: retry + fallback model di `groq.ts` harus tetap
  berjalan.

> Di Groq, respons `chat.completions.create` biasanya menyertakan objek `usage`
> (`prompt_tokens`, `completion_tokens`, `total_tokens`). Manfaatkan itu bila tersedia.
> Untuk kasus gagal/gemuk yang tidak punya `usage`, siapkan estimator fallback yang masuk
> akal dan **dokumentasikan** pendekatannya di catatan PR.

**Selain logging, lakukan evaluasi optimasi token:** periksa apakah prompt/branch saat ini
memiliki bagian yang bisa dipersingkat tanpa mengurangi kualitas balasan. Sebutkan
**minimal 1 rekomendasi optimasi** di catatan PR (tidak wajib diimplementasikan, cukup
dianalisis & dijelaskan alasannya).

Contoh shape log minimal (field boleh ditambah):

```ts
// contoh shape log — field boleh ditambah
{
  timestamp: string;        // ISO
  model: string;
  branch: 'init' | 'accept' | 'reject' | 'unknown';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  source: 'api_usage' | 'estimated'; // dari usage resmi atau estimator sendiri
  latencyMs: number;
}
```

---

## File & kontrak yang relevan

| Mau ubah / lihat | Buka |
|---|---|
| Pengukuran & logging token, retry/fallback | `lib/server/groq.ts` |
| `buildSystemPrompt`, intent regex, `validateAIResponse` | `lib/server/negotiation-state.ts` |
| Branch greeting (ACCEPT/REJECT/UNKNOWN) | `app/api/negotiate/route.ts` |
| Sesi awal / greeting pertama | `app/api/session/init/route.ts` |
| Persist sesi (Redis) — hanya dibaca, jangan ubah | `lib/server/session-store.ts` |
| Kontrak request/response API | `types/api.ts`, `types/chat.ts` |
| Aturan & diagram alur | `ARCHITECTURE.md` |

---

## Yang SUDAH ada (jangan diulang atau dipecah)

- Klasifikasi intent via **regex** (`classifyUserIntent`).
- `validateAIResponse` (koreksi harga yang salah disebut AI).
- Sistem **tier diskon** 0/2/5/7% + minimum order 12 pcs.
- Gateway Groq dengan **retry + fallback model** (llama-3.3-70b-versatile →
  llama-3.1-8b-instant).
- Persistensi sesi di **Upstash Redis** (1 jam TTL).
- UI chat sudah terhubung ke `/api/session/init`, `/api/session/status`, `/api/negotiate`.

---

## Stack & environment

| Layer | Versi (repo) |
|---|---|
| Framework | Next.js 16 (App Router) |
| Bahasa | TypeScript 5.7 |
| AI gateway | Groq SDK (`groq-sdk@1.x`) |

Env yang dibutuhkan untuk menguji chat asli:

- `GROQ_API_KEY` — pakai **key free tier** pribadi kamu sendiri (bukan key perusahaan/team),
  self-signup di console.groq.com. Jangan meminta/menyebar key perusahaan.
- `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Upstash Redis) untuk persist sesi.

> Catatan: tanpa key, tombol negosiasi di UI tidak error, hanya `agreedDiscount` tidak
> terisi (fallback offline). Untuk menguji output AI sungguhan, isi key free tier kamu.

> Free tier Groq punya rate limit per menit — kalau tiba-tiba dapat error 429 saat
> testing intens, itu bukan bug kode kamu; tunggu sebentar atau kurangi frekuensi request.

---

## Quality gate (WAJIB lolos sebelum PR)

```bash
npx tsc --noEmit   # 0 error BARU (3 error pre-existing di ARCHITECTURE.md §F dibiarkan)
npm run build      # harus berhasil
```

Catatan: `npm run lint` belum punya config — pakai gate di atas. Kerjakan dengan `npm run dev`
(atau `pnpm dev` bila memakai pnpm).

---

## Kriteria penilaian (CTO)

| Aspek | Bobot | Task | Fokus |
|---|---|---|---|
| **Adaptif & humanistik** | 40% | Task A | Kemampuan mengenali gaya customer & menyesuaikan balasan agar manusiawi, ramah, tidak robotik — sambil tetap patuh golden rules. |
| **Pengukuran & efisiensi token** | 30% | Task B | Kelengkapan & keandalan pengukuran/logging token per pesan (bisa dites & dibandingkan antar percakapan) **serta** kualitas analisis rekomendasi penghematan token. |
| **Kebersihan & konvensi** | 30% | A & B | TypeScript ketat, kontrak di `types/`, kepatuhan golden rules §C, tidak mengubah alur harga / mesin inti. |

> **Catatan — kombinasi Task A+B:** kandidat yang mencapai hasil adaptif setara dengan
> pendekatan yang lebih hemat token (regex/heuristik alih-alih LLM call tambahan) dinilai
> lebih baik pada kombinasi Task A+B.

---

## Panduan teknis & jebakan

1. **Jangan ubah kalkulasi harga.** Semua angka yang dipakai dalam prompt harus berasal dari
   variabel sesi/`buildPriceQuote` yang sudah server-authoritative.
2. **Jangan sentuh AI Vision** (`ai-vision.ts`, `types/vision.ts`) — di luar scope.
3. **Tour / balasan adaptif jangan menambah biaya besar-besaran.** Deteksi gaya boleh ringan
   (regex sederhana di `negotiation-state.ts`), tidak wajib LLM tambahan. Pertimbangkan
   trade-off token-nya (ini terkait Task B).
4. **Log token jangan bocor data sensitif.** Cukup log metrik — jangan log pesan customer
   mentah berlebihan/rahasia. Pasang `console.log` dengan informasi terstruktur ala yang
   sudah ada (lihat pola `[AshirahBot] ...` di `groq.ts`).
5. **Jangan hardcode harga** di mana pun di luar `lib/config/products.ts` + `lib/server/pricing.ts`.

---

## Waktu Pengerjaan

- **Durasi:** 5 hari kerja.
- **Batas akhir pengumpulan PR:** Senin, 7 September 2026, 23:59 WIB.
- Kanal tanya: bisa menghubungi nomor telepon ini 0882006480856.

---

## Pengumpulan

1. Buat branch **`candidate-backend/[nama-kamu]`** dari `main`.
2. Buka **Pull Request ke `main`**.
3. Di deskripsi PR sertakan:
   - **Catatan teknis** (cara deteksi gaya customer, cara menyesuaikan prompt tanpa
     menambah biaya besar, pendekatan pengukuran token: pakai `usage` API Groq atau
     estimator sendiri + alasannya).
   - **Contoh log token** dari 2–3 percakapan uji (potongan output `console.log`)
     supaya sisi pengukuran bisa langsung dites reviewer.
   - Ringkasan langkah uji (chat apa yang dicoba, hasilnya bagaimana).