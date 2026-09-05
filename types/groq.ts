/**
 * OWNERSHIP: Bersama (kontrak)
 * Kontrak log pengukuran token per panggilan AI (Task B Take-Home Test
 * Backend). Didefinisikan sekali di sini — jangan inline di route/file lain.
 * Lihat ARCHITECTURE.md section C (golden rule #3).
 */
export type NegotiationBranch = 'init' | 'accept' | 'reject' | 'unknown'

export interface TokenUsageLog {
  timestamp: string
  model: string
  branch: NegotiationBranch
  promptTokens: number
  completionTokens: number
  totalTokens: number
  source: 'api_usage' | 'estimated'
  latencyMs: number
}
