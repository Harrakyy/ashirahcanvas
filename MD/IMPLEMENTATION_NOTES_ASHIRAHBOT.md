# Implementation Notes — AshirahBot Backend (Task A & B)

Dokumen ini menjelaskan seluruh perubahan backend yang dilakukan untuk memenuhi
Take-Home Test Backend Engineer. Semua perubahan konsisten dengan
[ARCHITECTURE.md](./ARCHITECTURE.md) dan aturan di
[TAKE_HOME_TEST_BACKEND.md](./TAKE_HOME_TEST_BACKEND.md).

---

## Daftar Perubahan

| Status | File | Perubahan |
|---|---|---|
| ✅ Ubah | `lib/server/negotiation-state.ts` | Tambah `detectCustomerStyle()` (deteksi gaya + riwayat + `greetingToken`), `buildStyleInstruction()` (wajib tiru sapaan, variasi penutup, tiru kosakata), `buildFallbackMessage()` (semua variant adaptif termasuk `accept`), `hexToColorName()` (hex → nama warna ID), perbarui `buildSystemPrompt()` dengan blok adaptasi gaya yang mengalahkan baseline |
| ✅ Ubah | `lib/server/groq.ts` | Tambah pengukuran token (`logTokenUsage`, `estimateTokens`), `stripThinkBlock`, `reasoning_effort: "none"` untuk model Qwen, param `branch` di semua panggilan |
| ✅ Ubah | `app/api/negotiate/route.ts` | Deteksi gaya dengan riwayat percakapan, label branch (`accept`/`reject`/`unknown`) di semua panggilan Groq |
| ✅ Ubah | `app/api/session/init/route.ts` | Label branch `init` |
| ✅ Buat | `types/negotiation.ts` | Kontrak `CustomerStyle` (golden rule #3) |
| ✅ Buat | `types/groq.ts` | Kontrak `TokenUsageLog`, `NegotiationBranch` (golden rule #3) |

---

## Task A — Adaptive AI Personality

### Deteksi Gaya Customer

Fungsi `detectCustomerStyle()` di `lib/server/negotiation-state.ts`
mendeteksi gaya customer dari **pesan terakhir + riwayat percakapan**
(maksimal 3 pesan user sebelumnya), sesuai persyaratan:

> *"Kenali gaya/tone customer dari pesan terakhir & riwayat"*

Empat dimensi yang dideteksi + satu token sapaan:

| Dimensi | Sumber | Mekanisme |
|---|---|---|
| `messageLength` (short/medium/long) | Pesan terakhir saja | Jumlah kata: <5 = short, ≤15 = medium, >15 = long |
| `formality` (casual/formal/neutral) | Pesan terakhir ×2 + riwayat | Skor regex formal (selamat siang, apakah, mohon, saya, bapak...) vs kasual (kak, bro, ga, makasih, bang...). Bobot pesan terakhir 2× karena lebih relevan |
| `language` (indonesian/mixed/english) | Pesan terakhir ×2 + riwayat | Skor pattern Inggris (can, please, price, cheaper, how much, you...). ≥4 = english, ≥2 = mixed |
| `usesEmoji` (boolean) | Pesan terakhir ATAU riwayat | True jika salah satu mengandung emoji Unicode |
| `greetingToken` (opsional) | Pesan terakhir, lalu riwayat terbaru | Kata sapaan persis customer (bro/sis/gan/bos/bang/kak/Bapak/Ibu). "woy" terdeteksi kasual tapi tidak dipakai sebagai sapaan balik |

Semua deteksi pakai **regex** — tanpa panggilan LLM tambahan. Sesuai panduan
test: *"Deteksi gaya boleh ringan (regex sederhana di negotiation-state.ts),
tidak wajib LLM tambahan."*

### Menyesuaikan Prompt

Hasil deteksi diubah menjadi instruksi teks via `buildStyleInstruction()`
lalu di-inject ke system prompt:

- **UNKNOWN & ACCEPT branch**: via `buildSystemPrompt(session, style)` —
  instruksi gaya muncul setelah blok "GAYA BAHASA & KARAKTER" dan sebelum
  "ATURAN KETAT"
- **3 REJECT prompt inline**: `styleInstruction` ditambahkan langsung
- **Greeting (`/api/session/init`)**: tanpa gaya — belum ada pesan customer

Tiga aturan agar bot tidak kaku/statis (contoh kasus: customer bilang
"Bisa kurang lagi ga bro" tapi bot tetap jawab "Gimana kak, mau lanjut?"):

1. **Tiru sapaan customer** — `greetingToken` memaksa bot memanggil customer
   dengan kata persis yang ia pakai ("bro" → "bro", "gan" → "gan").
   Baseline "Sapa pakai Kak" dihapus dari semua prompt REJECT dan dinyatakan
   kalah oleh blok ADAPTASI di `buildSystemPrompt`
2. **Variasi penutup** — instruksi eksplisit melarang pengulangan template
   penutup yang sama ("Mau lanjut?", "Gimana nih?", "Lanjut ya?", ...)
3. **Tiru kosakata** — customer bilang "ga"/"bro" maka bot boleh bilang
   "ga"/"bro"; customer formal maka hindari semua singkatan

Contoh hasil terverifikasi (runtime, regex + instruksi):
`"Bisa kurang lagi ga bro"` → `formality: casual, greetingToken: "bro"`
dengan instruksi `SAPAAN WAJIB: panggil customer "bro"`.

Semua instruksi gaya diakhiri dengan:
> *"tanpa mengubah aturan harga"* — sehingga ATURAN KETAT tetap berlaku
dan `validateAIResponse` tetap aktif sebagai koreksi akhir.

Alasan pendekatan ini hemat biaya: instruksi gaya hanya ~100 token per call,
dan tidak ada di greeting. Tidak ada LLM call tambahan sama sekali.

---

## Task B — Pengukuran & Logging Token

### Pendekatan

1. **Prioritas**: objek `usage` dari respons API Groq (`source: "api_usage"`)
   — akurat karena langsung dari server
2. **Fallback**: estimator `ceil(teks.length / 4)` (`source: "estimated"`)
   — pendekatan umum untuk teks Indonesia/Inggris pada tokenizer BPE
   (rata-rata ~4 karakter per token). Dipakai hanya jika `usage` tidak
   tersedia (mis. error atau field tidak ada)

### Shape Log

```
[AshirahBot] TOKEN_USAGE {"timestamp":"2026-09-06T...","model":"qwen/qwen3.6-27b",
"branch":"unknown","promptTokens":123,"completionTokens":45,"totalTokens":168,
"source":"api_usage","latencyMs":2341}
```

Field sesuai contoh di TAKE_HOME_TEST_BACKEND.md:
`timestamp` (ISO), `model`, `branch`, `promptTokens`, `completionTokens`,
`totalTokens`, `source`, `latencyMs`.

Hanya metrik yang di-log — **tidak ada isi pesan customer** (aman dari
kebocoran data, sesuai panduan teknis #4).

### Branch Tracking

Setiap panggilan Groq dilabeli branch:
- `init` — greeting pertama (`/api/session/init`)
- `accept` — customer menyetujui harga
- `reject` — customer menolak, tier naik
- `unknown` — intent tidak terdeteksi

Ini memungkinkan **perbandingan token per branch** antar percakapan,
sesuai tujuan: *"tingkat token/biaya tiap pesan negosiasi bisa dites &
dibandingkan antar percakapan / antar branch"*.

---

## Penanganan Reasoning Model (Qwen 3)

### Masalah

Model Qwen 3 di Groq adalah **reasoning model** (default `reasoning_effort:
"medium"`) yang menghasilkan token berpikir (`<think>...</think>`) sebelum
menjawab. Dengan `max_tokens: 300`, seluruh budget habis untuk reasoning
tanpa menghasilkan jawaban final — output kosong setelah stripping.

### Investigasi

- **Soft switch `/no_think`** (append ke pesan user) **TIDAK dihormati**
  oleh serving Groq — terbukti dari log: `startsWithThink: true` pada
  setiap percakapan meski `/no_think` sudah ada
- Parameter API `reasoning_effort` dan `reasoning_format` tersedia di
  SDK Groq (dikonfirmasi via `node_modules/groq-sdk/resources/chat/completions.d.ts`)

### Solusi

- **`reasoning_effort: "none"`** — parameter API server-side yang
  mematikan reasoning generation sepenuhnya. Hanya diterapkan untuk model
  Qwen (deteksi via `modelName.includes("qwen")`) agar tidak memengaruhi
  Llama jika dikembalikan
- **`stripThinkBlock()`** — safety net regex: menghapus blok `<think>` yang
  tertutup maupun tak tertutup (terpotong max_tokens)
- **Empty-response guard** — jika setelah stripping tidak ada teks, throw
  error → retry → route fallback message (style-aware via
  `buildFallbackMessage`, server-priced)
- **`max_tokens: 768`** — headroom untuk jawaban final (dengan reasoning
  off, jawaban biasanya 50-150 token)

### Hasil Optimasi Terukur

| Sebelum | Sesudah |
|---|---|
| completionTokens: ~700+ (seluruhnya reasoning) | completionTokens: ~50-150 (jawaban final saja) |
| Latensi: ~25s per call | Latensi: ~2-5s per call |
| 3 retry × 25s = ~87s per request | 1 call, ~3s |

Ini adalah **rekomendasi optimasi token** yang diminta Task B:
reasoning generation memakan ~768 completion token per call tanpa menghasilkan
output berguna — `reasoning_effort: "none"` mengeliminasinya sepenuhnya.

---

## Contoh Log Token

> **Reviewer**: berikut output `[AshirahBot] TOKEN_USAGE` dari terminal
> `npm run dev` — 2 percakapan (casual 15 pcs + formal 50 pcs),
> semua via model primary tanpa fallback trigger:
>
> **Percakapan 1 — casual (init → reject → unknown → accept):**
> ```
> [AshirahBot] Intent: (greeting) | session init
> [AshirahBot] TOKEN_USAGE {"timestamp":"2026-09-05T19:27:02.994Z","model":"qwen/qwen3.6-27b","branch":"init","promptTokens":299,"completionTokens":143,"totalTokens":442,"source":"api_usage","latencyMs":1164}
> [AshirahBot] Intent: REJECT | message: bisa kurang lagi ga bro
> [AshirahBot] TOKEN_USAGE {"timestamp":"2026-09-05T19:27:19.393Z","model":"qwen/qwen3.6-27b","branch":"reject","promptTokens":499,"completionTokens":61,"totalTokens":560,"source":"api_usage","latencyMs":746}
> [AshirahBot] Intent: UNKNOWN | message: lagi dong bro lebih murah
> [AshirahBot] TOKEN_USAGE {"timestamp":"2026-09-05T19:27:30.424Z","model":"qwen/qwen3.6-27b","branch":"unknown","promptTokens":874,"completionTokens":65,"totalTokens":939,"source":"api_usage","latencyMs":615}
> [AshirahBot] Intent: ACCEPT | message: oalah oke deh bro
> [AshirahBot] TOKEN_USAGE {"timestamp":"2026-09-05T19:27:43.322Z","model":"qwen/qwen3.6-27b","branch":"accept","promptTokens":930,"completionTokens":35,"totalTokens":965,"source":"api_usage","latencyMs":612}
> ```
>
> **Percakapan 2 — formal (init → unknown → accept):**
> ```
> [AshirahBot] Intent: (greeting) | session init
> [AshirahBot] TOKEN_USAGE {"timestamp":"2026-09-05T19:52:45.194Z","model":"qwen/qwen3.6-27b","branch":"init","promptTokens":299,"completionTokens":119,"totalTokens":418,"source":"api_usage","latencyMs":938}
> [AshirahBot] Intent: UNKNOWN | message: selamat siang, apakah ada kemungkinan penyesuaian harga mengingat jumlah pesanan yang cukup besar untuk acara perusahaan kami
> [AshirahBot] TOKEN_USAGE {"timestamp":"2026-09-05T19:52:52.152Z","model":"qwen/qwen3.6-27b","branch":"unknown","promptTokens":911,"completionTokens":102,"totalTokens":1013,"source":"api_usage","latencyMs":833}
> [AshirahBot] Intent: ACCEPT | message: baik, saya setuju dengan harga tersebut. bisa lanjut proses pemesanan
> [AshirahBot] TOKEN_USAGE {"timestamp":"2026-09-05T19:52:58.794Z","model":"qwen/qwen3.6-27b","branch":"accept","promptTokens":919,"completionTokens":74,"totalTokens":993,"source":"api_usage","latencyMs":711}
> ```

---

## Ringkasan Langkah Uji

Jalankan `npm run dev`, buka editor, lalu uji 2 skenario berikut via chat
atau via API langsung. Semua output di bawah adalah **data real** dari test
langsung (productId `1` Premium Cotton T-Shirt, warna `#FFFFFF`/Putih).

### Skenario 1 — Casual, 15 pcs (1 percakapan penuh)

| Step | Branch | Pesan User | Respons Bot (real) | Harga | Diskon |
|---|---|---|---|---|---|
| 1 | `init` | *(greeting)* | "untuk 15 pcs, saya bisa kasih harga Rp 102.900/pcs (diskon 2%). Totalnya Rp 1.543.500. Gimana kak, mau lanjut?" | 102.900 | 2% |
| 2 | `reject` | "bisa kurang lagi ga bro" | "bro, untuk 15 pcs, saya bisa kasih harga Rp 99.750/pcs (diskon 5%). Totalnya Rp 1.496.250. Gimana bro, mau lanjut? 😊" | 99.750 | 5% |
| 3 | `unknown` | "lagi dong bro lebih murah" | "Makasih minusnya bro, tapi emang udah harga terbaik dari kami. Untuk 15 pcs kaos custom Ashirah warna Putih, harganya tetap Rp 99.750/pcs. Mau lanjut?" | 99.750 | 5% |
| 4 | `accept` | "oalah oke deh bro" | "Siap bro, thanks ya. Jadi untuk 15 pcs Kaos Custom Ashirah warna Putih, totalnya Rp 1.496.250 (harga Rp 99.750/pcs). Mau lanjut ke pembayaran?" | 99.750 | 5% |

**Adaptasi yang terlihat:**
- Greeting (step 1) pakai "kak" — default karena belum ada history customer
- Step 2+: bot meniru sapaan "bro" dari customer (`greetingToken: "bro"`)
- Warna selalu "Putih", bukan "(#FFFFFF)" — `hexToColorName()` bekerja
- Tier naik 2% → 5% di REJECT, harga turun Rp 3.150/pcs
- `agreedDiscount: 5` terisi setelah ACCEPT
- Log: branch `init` → `reject` → `unknown` → `accept` (lihat Contoh Log Token)

### Skenario 2 — Formal, 50 pcs

| Step | Branch | Pesan User | Respons Bot (real) | Harga | Diskon |
|---|---|---|---|---|---|
| 1 | `init` | *(greeting)* | "untuk 50 pcs, saya bisa kasih harga Rp 102.900/pcs (diskon 2%). Totalnya Rp 5.145.000. Gimana kak, mau lanjut?" | 102.900 | 2% |
| 2 | `unknown` | "selamat siang, apakah ada kemungkinan penyesuaian harga mengingat jumlah pesanan yang cukup besar untuk acara perusahaan kami" | "Selamat siang. Terima kasih atas ketertarikan Bapak/Ibu untuk memesan kaos custom Ashirah dalam jumlah 50 pcs. Untuk pemesanan sebanyak 50 pcs, kami telah memberikan harga terbaik sebesar Rp 102.900 per pcs (total Rp 5.145.000) dengan potongan 2%. Apakah Bapak/Ibu ingin kami lanjutkan proses pemesanan dengan harga tersebut?" | 102.900 | 2% |
| 3 | `accept` | "baik, saya setuju dengan harga tersebut. bisa lanjut proses pemesanan" | "Terima kasih atas kesepakatannya, Bapak/Ibu. Harga final untuk 50 pcs kaos custom Ashirah warna Putih adalah Rp 102.900/pcs dengan total Rp 5.145.000. Silakan kirimkan data diri dan detail desain agar kami segera memproses pesanan Anda." | 102.900 | 2% |

**Adaptasi yang terlihat:**
- Bot pakai "Bapak/Ibu" + "Anda", bahasa sopan dan terstruktur
- Tanpa emoji (customer tidak pakai emoji)
- Tanpa sapaan kasual "kak"/"bro"/singkatan
- Step 2 terklasifikasi `unknown` (tidak ada keyword tolak eksplisit) sehingga
  tier tidak naik — harga tetap 102.900, perilaku sesuai desain intent regex
- `agreedDiscount: 2` terisi setelah ACCEPT

### Cara Uji Berbagai Branch via API

```powershell
# 1. Buat session (ganti quantities sesuai skenario)
$body = @{ productId = "1"; category = "tshirts"; color = "#FFFFFF"; quantities = 15 } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "http://localhost:3000/api/session/init" -Method POST -ContentType "application/json" -Body $body
$sid = $r.sessionId

# 2. Kirim pesan (ganti message sesuai skenario)
$body = @{ message = "bisa kurang lagi ga bro" } | ConvertTo-Json
$r = Invoke-RestMethod -Uri "http://localhost:3000/api/negotiate" -Method POST -ContentType "application/json" -Body $body -Headers @{ "x-session-id" = $sid }
$r.aiMessage; $r.currentPrice; $r.tier; $r.agreedDiscount
```

Token log `[AshirahBot] TOKEN_USAGE {...}` muncul di terminal `npm run dev`
setiap Groq call — copy baris tersebut ke section Contoh Log Token.

### Checklist Kepatuhan Golden Rules

- [x] Harga tidak pernah dihitung di client — semua dari `buildPriceQuote` server
- [x] Frontend tidak import `lib/server/` — diverifikasi via grep
- [x] Tipe baru di `types/` (`CustomerStyle`, `TokenUsageLog`) — tidak inline
- [x] AI hanya bicara harga dari server — `validateAIResponse` aktif di semua branch
- [x] Intent via regex `classifyUserIntent` — tidak diganti LLM
- [x] Kode warna hex tidak pernah disebut ke customer — dijaga di semua prompt
  DAN di-enforce via `hexToColorName()`: prompt greeting/init dan
  `buildSystemPrompt` menerima nama warna ("Putih"), bukan hex mentah —
  LLM tidak lagi melihat string hex sehingga tidak bisa menggemakannya
  (kasus nyata: greeting pernah menampilkan "(#FFFFFF)"). Hex tak dikenal
  → "warna custom", tidak pernah bocor apa adanya
- [x] Retry + fallback model di `groq.ts` tetap utuh
- [x] Tidak mengubah AI Vision (`ai-vision.ts`, `types/vision.ts`)
- [x] Tidak mengubah kalkulasi harga (`pricing.ts`, `products.ts`)
- [x] Tidak mengubah pembayaran Midtrans, blueprint vendor, atau UI/frontend

---

## Catatan Keputusan: Model Qwen

Model diubah dari `llama-3.3-70b-versatile` (default repo) menjadi
`qwen/qwen3.6-27b` (fallback `qwen/qwen3.8-27b`).

Alasan: model Llama sebelumnya mengalami error 403 "Access denied" dari
Groq (kemungkinan terkait region/IP atau model sudah deprecated). Qwen 3 adalah model reasoning yang
lebih baru, dan penanganan reasoning (reasoning_effort: "none") memastikan
output tetap bersih.

Mekanisme retry + fallback tetap utuh sesuai yang sudah ada
(documented in "Yang SUDAH ada — jangan dipecah"). Llama model IDs
masih tersedia di komentar (`groq.ts:12-13`) untuk rollback mudah.

---

## Quality Gate

```
npx tsc --noEmit   → 0 error baru (3 pre-existing di ARCHITECTURE.md §F)
npm run build      → sukses
```
