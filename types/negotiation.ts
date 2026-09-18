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

export interface CustomerStyle {
  isShort: boolean
  isFormal: boolean
  usesEmoji: boolean
  usesMixedLanguage: boolean
}
