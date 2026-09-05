/**
 * OWNERSHIP: Bersama (kontrak)
 * Tipe gaya customer untuk adaptasi personalitas AshirahBot (Task A
 * Take-Home Test Backend). Didefinisikan sekali di sini — jangan inline
 * di route/file lain. Lihat ARCHITECTURE.md section C (golden rule #3).
 */
export interface CustomerStyle {
  messageLength: 'short' | 'medium' | 'long'
  formality: 'casual' | 'formal' | 'neutral'
  language: 'indonesian' | 'mixed' | 'english'
  usesEmoji: boolean
  styleDescription: string
}
