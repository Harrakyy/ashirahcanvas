/**
 * OWNERSHIP: Backend
 * Gateway model AI (Groq) + retry. Output AI selalu dikuatkan oleh
 * validateAIResponse di negotiation-state sebelum sampai ke user.
 * Lihat ARCHITECTURE.md section C.
 */
import Groq from 'groq-sdk'
import type { TokenLog } from '@/types/negotiation'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const GROQ_PRIMARY_MODEL = 'openai/gpt-oss-120b'
const GROQ_FALLBACK_MODEL = 'openai/gpt-oss-20b'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getErrorStatus(error: unknown): number | undefined {
  return (error as { status?: number })?.status
}

/**
 * Estimator fallback: ~4 karakter per token untuk teks Indonesia/Inggris campuran.
 * Dipakai hanya ketika completion.usage tidak tersedia.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function logTokenUsage(log: TokenLog): void {
  console.log(
    `[AshirahBot] TOKEN | model: ${log.model} | branch: ${log.branch} | ` +
    `prompt: ${log.promptTokens} | completion: ${log.completionTokens} | ` +
    `total: ${log.totalTokens} | source: ${log.source} | ` +
    `latency: ${log.latencyMs}ms | ts: ${log.timestamp}`
  )
}

async function callGroq(
  modelName: string,
  systemPrompt: string,
  userMessage: string,
  branch: TokenLog['branch']
): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startMs = Date.now()
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        model: modelName,
        temperature: 0.7,
        max_tokens: 400,
      })
      const latencyMs = Date.now() - startMs
      const text = completion.choices[0]?.message?.content || ''

      const usage = completion.usage
      const hasUsage = usage != null
      const tokenLog: TokenLog = {
        timestamp: new Date().toISOString(),
        model: modelName,
        branch,
        promptTokens: hasUsage ? usage.prompt_tokens : estimateTokens(systemPrompt + userMessage),
        completionTokens: hasUsage ? usage.completion_tokens : estimateTokens(text),
        totalTokens: hasUsage ? usage.total_tokens : estimateTokens(systemPrompt + userMessage + text),
        source: hasUsage ? 'api_usage' : 'estimated',
        latencyMs,
      }
      logTokenUsage(tokenLog)

      console.log('[AshirahBot] Groq OK | model:', modelName, '| attempt:', attempt, '| length:', text.length)
      return text
    } catch (error) {
      lastError = error
      const status = getErrorStatus(error)

      if (status === 404) {
        console.error(`[AshirahBot] MODEL UNAVAILABLE (404) | model: ${modelName} — skipping retries, will try fallback`)
        throw error
      }

      if (status === 429) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
        console.warn(`[AshirahBot] RATE LIMITED (429) | model: ${modelName} | attempt ${attempt}/${MAX_RETRIES} | retry in ${delay}ms`)
        if (attempt < MAX_RETRIES) await sleep(delay)
      } else {
        console.warn(`[AshirahBot] GROQ ERROR (${status ?? 'unknown'}) | model: ${modelName} | attempt ${attempt}/${MAX_RETRIES}`)
        if (attempt < MAX_RETRIES) await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1))
      }
    }
  }

  throw lastError
}

export async function generateNegotiationResponse(
  systemPrompt: string,
  userMessage: string,
  branch: TokenLog['branch'] = 'unknown'
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  console.log('[AshirahBot] Groq call | primary:', GROQ_PRIMARY_MODEL, '| fallback:', GROQ_FALLBACK_MODEL, '| key present:', !!apiKey)

  try {
    return await callGroq(GROQ_PRIMARY_MODEL, systemPrompt, userMessage, branch)
  } catch (primaryError) {
    const status = getErrorStatus(primaryError)
    if (status === 404) {
      console.warn(`[AshirahBot] Primary model ${GROQ_PRIMARY_MODEL} unavailable (404), trying fallback: ${GROQ_FALLBACK_MODEL}`)
      try {
        return await callGroq(GROQ_FALLBACK_MODEL, systemPrompt, userMessage, branch)
      } catch (fallbackError) {
        console.error(`[AshirahBot] Fallback model ${GROQ_FALLBACK_MODEL} also failed:`, fallbackError)
        throw fallbackError
      }
    }
    throw primaryError
  }
}
