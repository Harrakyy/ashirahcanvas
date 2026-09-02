/**
 * OWNERSHIP: Bersama (kontrak)
 * Kontrak AI Vision — analisis kerumitan desain dari gambar mockup/canvas.
 * STATUS: STUB — belum aktif/dipakai. Kontrak dibuat lebih dulu supaya saat provider
 * (OpenRouter/Gemini/Claude) diaktifkan nanti, tinggal isi implementasinya saja.
 * Lihat ARCHITECTURE.md section B & E (lib/server/ai-vision.ts).
 */

export interface ElementPosition {
  x: number
  y: number
  width: number
  height: number
}

export interface DesignComplexityResult {
  /** Skor kerumitan desain (di bawah ini: 1 = minimum/default). */
  complexityScore: number
  /** Perkiraan jumlah warna unik pada desain. */
  colorCount: number
  /** Posisi/ukuran elemen grafis yang terdeteksi. */
  elementPositions: ElementPosition[]
  /** Penanda hasil dari stub (belum output provider sungguhan). */
  isStub: boolean
}
