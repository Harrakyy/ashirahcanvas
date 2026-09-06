/**
 * OWNERSHIP: Bersama (kontrak)
 * Tipe domain untuk sistem negosiasi: token logging dan deteksi gaya customer.
 * Didefinisikan di sini sesuai golden rule #3 — jangan inline di route/komponen.
 * Lihat ARCHITECTURE.md section C.
 */

/**
 * Log terstruktur per panggilan AI.
 * source: 'api_usage' = dari completion.usage resmi Groq
 * source: 'estimated' = dari estimator fallback (~4 karakter per token)
 */
export interface TokenLog {
  timestamp: string
  model: string
  branch: 'init' | 'accept' | 'reject' | 'unknown'
  promptTokens: number
  completionTokens: number
  totalTokens: number
  source: 'api_usage' | 'estimated'
  latencyMs: number
}

/**
 * Hasil deteksi gaya komunikasi customer dari riwayat pesan.
 * Digunakan oleh detectCustomerStyle() di negotiation-state.ts
 * untuk menyesuaikan instruksi gaya di buildSystemPrompt().
 */
export interface CustomerStyle {
  isShort: boolean        // rata-rata pesan < 30 karakter
  isFormal: boolean       // menggunakan kata formal (selamat siang, mohon, dsb)
  usesEmoji: boolean      // pernah menggunakan emoji
  usesMixedLanguage: boolean // menggunakan kata bahasa Inggris
}
