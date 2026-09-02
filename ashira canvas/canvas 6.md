# PROMPT SUSULAN: Scaffold Backend AI Vision (Stub — Belum Dipakai)

**Jalankan ini SETELAH `ARCHITECTURE.md` + comment header selesai dan sudah dikonfirmasi.** Jangan digabung dengan task dokumentasi sebelumnya.

## Tujuan

Kita belum mau pakai AI Vision sungguhan (OpenRouter/Gemini/Claude) sekarang. Yang dibutuhkan hanya **scaffold/stub** supaya struktur kode & kontrak tipenya sudah siap — begitu nanti mau diaktifkan beneran, tinggal isi implementasinya, tidak perlu desain ulang kontrak dari nol.

## Yang Perlu Dibuat

1. **`lib/server/ai-vision.ts`** (baru) — satu fungsi stub, contoh signature:
    
    ```ts
    export async function analyzeDesignComplexity(  imageUrl: string): Promise<DesignComplexityResult> {  // TODO: belum terhubung ke provider AI Vision sungguhan (OpenRouter/Gemini/Claude).  // Untuk sementara kembalikan nilai default/mock yang aman dipakai downstream.  return {    complexityScore: 1, // default/minimum    colorCount: 1,    elementPositions: [],    isStub: true,  };}
    ```
    
    Sesuaikan bentuk `DesignComplexityResult` dengan kebutuhan `buildPriceQuote` di `lib/server/pricing.ts` — **cek dulu apakah `buildPriceQuote` butuh input ini atau tidak sama sekali saat ini**; kalau tidak butuh, cukup buat fungsi berdiri sendiri tanpa dipaksa dihubungkan ke pricing dulu.
2. **Tipe kontrak** di `types/vision.ts` (baru) — definisikan `DesignComplexityResult` di sini, bukan di file lib, supaya konsisten dengan aturan "tipe request/response di `types/`" yang sudah ada.
3. **Comment header wajib** di `lib/server/ai-vision.ts`:
    
    ```ts
    /** * OWNERSHIP: Backend * STATUS: STUB — belum terhubung ke provider AI Vision sungguhan. * Saat diaktifkan nanti, tetap wajib ikuti prinsip anti-prompt-injection: * fungsi ini HANYA boleh mengembalikan structured output (skor kerumitan, dst), * TIDAK PERNAH mengembalikan/menentukan harga. Harga tetap dihitung di * lib/server/pricing.ts. */
    ```
    

## Batasan Tegas

- **Jangan** panggil API eksternal apapun (jangan tambah dependency OpenRouter/Gemini SDK sekarang) — ini murni stub lokal.
- **Jangan** buat UI/komponen baru untuk fitur ini — tidak ada tombol/panel customer-facing yang perlu dibuat sekarang.
- **Jangan** paksa mengintegrasikan stub ini ke alur `buildPriceQuote`/`/api/quote` kalau itu akan mengubah behavior harga yang sudah berjalan (server-authoritative pricing yang sudah di-P1 tidak boleh ter-regresi). Kalau integrasinya tidak trivial/aman, cukup buat stub-nya berdiri sendiri dulu, laporkan balik keputusannya.

## Setelah Selesai

- Update `ARCHITECTURE.md`: tambahkan `lib/server/ai-vision.ts` ke Peta Ownership Folder (section B) dan ke Peta "Mau Ubah X → Buka File" (section E), tandai jelas statusnya **STUB/belum aktif** supaya developer baru tidak bingung kenapa fungsinya cuma return nilai default.
- Laporkan balik: apakah `analyzeDesignComplexity` di-wire ke `buildPriceQuote` atau berdiri sendiri, dan bentuk tipe `DesignComplexityResult` final yang dipakai.