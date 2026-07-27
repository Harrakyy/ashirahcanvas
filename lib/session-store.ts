import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export interface NegotiationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface NegotiationSession {
  sessionId: string
  productId: string
  category: string
  color: string
  basePrice: number
  logoPrice: number
  textPrice: number
  quantity: number
  currentTier: 0 | 1 | 2 | 3
  agreedDiscount: number | null
  messages: NegotiationMessage[]
  createdAt: number
  updatedAt: number
}

const SESSION_TTL = 3600

function sessionKey(sessionId: string): string {
  return `negotiation:${sessionId}`
}

export async function createSession(
  session: NegotiationSession
): Promise<void> {
  await redis.set(sessionKey(session.sessionId), JSON.stringify(session), {
    ex: SESSION_TTL,
  })
}

export async function getSession(
  sessionId: string
): Promise<NegotiationSession | null> {
  const data = await redis.get<NegotiationSession | string>(sessionKey(sessionId))
  if (!data) return null
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as NegotiationSession
    } catch {
      return null
    }
  }
  return data as NegotiationSession
}

export async function updateSession(
  session: NegotiationSession
): Promise<void> {
  session.updatedAt = Date.now()
  await redis.set(sessionKey(session.sessionId), JSON.stringify(session), {
    ex: SESSION_TTL,
  })
}
