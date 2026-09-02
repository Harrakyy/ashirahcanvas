/**
 * OWNERSHIP: Bersama (kontrak)
 * Bentuk pesan chat negosiasi yang dipakai frontend & API. Lihat ARCHITECTURE.md.
 */
export interface ChatMessage {
  id: number
  type: 'user' | 'ai'
  message: string
  isLoading?: boolean
}
