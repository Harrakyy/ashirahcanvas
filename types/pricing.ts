/**
 * OWNERSHIP: Bersama (kontrak)
 * Bentuk PriceQuote yang dikirim server ke client untuk harga.
 * Jangan redefinisi di file lain — import dari sini. Lihat ARCHITECTURE.md section C.
 */
export interface PriceQuote {
  productId: string
  category: string
  basePrice: number
  logoPrice: number
  textPrice: number
  unitPrice: number
}
