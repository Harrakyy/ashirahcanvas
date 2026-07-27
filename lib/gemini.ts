import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const GEMINI_PRIMARY_MODEL = 'gemini-flash-latest'
const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash-lite'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

function parseRetryDelay(error: unknown): number | null {
  const err = error as { status?: number; errorDetails?: Array<{ '@type'?: string; retryDelay?: string }> }
  if (err.status !== 429 || !err.errorDetails) return null
  for (const detail of err.errorDetails) {
    if (detail['@type']?.includes('RetryInfo') && detail.retryDelay) {
      const match = detail.retryDelay.match(/(\d+(?:\.\d+)?)\s*s/)
      if (match) return Math.ceil(parseFloat(match[1]) * 1000)
    }
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getErrorStatus(error: unknown): number | undefined {
  return (error as { status?: number })?.status
}

async function callGemini(
  modelName: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: 300,
      temperature: 0.7,
    },
  })

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(userMessage)
      const text = result.response.text()
      console.log('[AshirahBot] Gemini OK | model:', modelName, '| attempt:', attempt, '| length:', text.length)
      return text
    } catch (error) {
      lastError = error
      const status = getErrorStatus(error)

      if (status === 404) {
        console.error(`[AshirahBot] MODEL UNAVAILABLE (404) | model: ${modelName} — skipping retries, will try fallback`)
        throw error
      }

      if (status === 429) {
        const retryDelay = parseRetryDelay(error)
        const delay = retryDelay ?? BASE_DELAY_MS * Math.pow(2, attempt - 1)
        console.warn(`[AshirahBot] RATE LIMITED (429) | model: ${modelName} | attempt ${attempt}/${MAX_RETRIES} | retry in ${delay}ms`)
        if (attempt < MAX_RETRIES) await sleep(delay)
      } else {
        console.warn(`[AshirahBot] GEMINI ERROR (${status ?? 'unknown'}) | model: ${modelName} | attempt ${attempt}/${MAX_RETRIES}`)
        if (attempt < MAX_RETRIES) await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1))
      }
    }
  }

  throw lastError
}

export async function generateNegotiationResponse(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  console.log('[AshirahBot] Gemini call | primary:', GEMINI_PRIMARY_MODEL, '| fallback:', GEMINI_FALLBACK_MODEL, '| key present:', !!apiKey)

  try {
    return await callGemini(GEMINI_PRIMARY_MODEL, systemPrompt, userMessage)
  } catch (primaryError) {
    const status = getErrorStatus(primaryError)
    if (status === 404) {
      console.warn(`[AshirahBot] Primary model ${GEMINI_PRIMARY_MODEL} unavailable (404), trying fallback: ${GEMINI_FALLBACK_MODEL}`)
      try {
        return await callGemini(GEMINI_FALLBACK_MODEL, systemPrompt, userMessage)
      } catch (fallbackError) {
        console.error(`[AshirahBot] Fallback model ${GEMINI_FALLBACK_MODEL} also failed:`, fallbackError)
        throw fallbackError
      }
    }
    throw primaryError
  }
}
