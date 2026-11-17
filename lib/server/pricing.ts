/**
 * OWNERSHIP: Backend
 * Logic kalkulasi harga — satu-satunya sumber kebenaran harga di seluruh app.
 * Jangan duplikasi logic ini di client. Lihat ARCHITECTURE.md section C.
 */
import { getProductById } from '@/lib/config/products'
import type { PriceQuote } from '@/types/pricing'

export const LOGO_PRICE = 15000
export const TEXT_PRICE = 5000

export const DEFAULT_BASE_PRICE = 85000
export const DEFAULT_MOQ = 1
export const MIN_ORDER_FOR_DISCOUNT = 12

export function getBasePrice(productId: string, category: string): number {
  const product = getProductById(productId, category)
  return product?.basePrice ?? DEFAULT_BASE_PRICE
}

export function getUnitPrice(productId: string, category: string): number {
  return getBasePrice(productId, category) + LOGO_PRICE + TEXT_PRICE
}

export function buildPriceQuote(productId: string, category: string, moq = DEFAULT_MOQ): PriceQuote {
  const basePrice = getBasePrice(productId, category)
  return {
    productId,
    category,
    basePrice,
    logoPrice: LOGO_PRICE,
    textPrice: TEXT_PRICE,
    unitPrice: basePrice + LOGO_PRICE + TEXT_PRICE,
    moq,
    minOrderForDiscount: MIN_ORDER_FOR_DISCOUNT,
  }
}
