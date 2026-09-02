/**
 * OWNERSHIP: Bersama (kontrak)
 * Tipe request/response API sesi & negosiasi. Satu-satunya definisi — jangan
 * inline di route/komponen. Lihat ARCHITECTURE.md section C.
 */
import type { ChatMessage } from './chat'
import type { PriceQuote } from './pricing'

export interface SessionInitResponse {
  sessionId: string
  initialMessage: string
  currentPrice: number
  tier: 0 | 1 | 2 | 3
  totalQty: number
  quote: PriceQuote
}

export interface SessionStatusResponse {
  sessionId: string
  currentPrice: number
  tier: number
  agreedDiscount: number | null
  messages: ChatMessage[]
}

export interface NegotiateResponse extends SessionStatusResponse {
  aiMessage: string
}
