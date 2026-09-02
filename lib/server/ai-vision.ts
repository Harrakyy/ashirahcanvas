/**
 * OWNERSHIP: Backend
 * STATUS: STUB — belum terhubung ke provider AI Vision sungguhan.
 *
 * Saat diaktifkan nanti, tetap wajib ikuti prinsip anti-prompt-injection:
 * fungsi ini HANYA boleh mengembalikan structured output (skor kerumitan, dst),
 * TIDAK PERNAH mengembalikan/menentukan harga. Harga tetap dihitung di
 * lib/server/pricing.ts.
 *
 * Catatan integrasi: buildPriceQuote(productId, category) saat ini TIDAK menerima
 * input kerumitan desain, jadi stub ini sengaja berdiri sendiri (belum di-wire).
 * Lihat ARCHITECTURE.md section B & E.
 */
import type { DesignComplexityResult, ElementPosition } from '@/types/vision'

export async function analyzeDesignComplexity(imageUrl: string): Promise<DesignComplexityResult> {
  // TODO: belum terhubung ke provider AI Vision sungguhan (OpenRouter/Gemini/Claude).
  // Parameter imageUrl dipakai sebagai kontrak input untuk implementasi nanti.
  // Untuk sementara kembalikan nilai default/mock yang aman dipakai downstream.
  void imageUrl

  const elementPositions: ElementPosition[] = []

  return {
    complexityScore: 1, // default/minimum
    colorCount: 1,
    elementPositions,
    isStub: true,
  }
}
