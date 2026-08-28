import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const GROQ_PRIMARY_MODEL = 'llama-3.3-70b-versatile'
const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getErrorStatus(error: unknown): number | undefined {
  return (error as { status?: number })?.status
}

async function callGroq(
  modelName: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        model: modelName,
        temperature: 0.7,
        max_tokens: 300,
      })
      const text = completion.choices[0]?.message?.content || ''
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
  userMessage: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  console.log('[AshirahBot] Groq call | primary:', GROQ_PRIMARY_MODEL, '| fallback:', GROQ_FALLBACK_MODEL, '| key present:', !!apiKey)

  try {
    return await callGroq(GROQ_PRIMARY_MODEL, systemPrompt, userMessage)
  } catch (primaryError) {
    const status = getErrorStatus(primaryError)
    if (status === 404) {
      console.warn(`[AshirahBot] Primary model ${GROQ_PRIMARY_MODEL} unavailable (404), trying fallback: ${GROQ_FALLBACK_MODEL}`)
      try {
        return await callGroq(GROQ_FALLBACK_MODEL, systemPrompt, userMessage)
      } catch (fallbackError) {
        console.error(`[AshirahBot] Fallback model ${GROQ_FALLBACK_MODEL} also failed:`, fallbackError)
        throw fallbackError
      }
    }
    throw primaryError
  }
}
