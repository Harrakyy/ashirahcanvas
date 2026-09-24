/**
 * lib/server/session-token.ts
 *
 * Edge-compatible Web Crypto HMAC signing and verification.
 * Zero external dependencies, runs seamlessly in Node.js and Next.js Middleware Edge runtime.
 */

import type { AuthUser, SessionData } from '@/types/auth'

export const AUTH_COOKIE_NAME = 'ashirah_auth_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const INSECURE_DEFAULT_SECRETS = [
  'your-super-secret-auth-key-change-this-in-production-2026',
  'ashirah-studio-production-auth-secret-key-2026',
]

if (process.env.NODE_ENV === 'production') {
  if (!process.env.AUTH_SECRET || INSECURE_DEFAULT_SECRETS.includes(process.env.AUTH_SECRET)) {
    throw new Error(
      '[FATAL SECURITY] In production, AUTH_SECRET must be explicitly set to a strong, unique secret key and cannot use default/example values.'
    )
  }
}

const SECRET_KEY = process.env.AUTH_SECRET || 'ashirah-studio-production-auth-secret-key-2026'

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  const sessionData: SessionData = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }
  const payloadStr = JSON.stringify(sessionData)
  const encodedPayload = toBase64Url(new TextEncoder().encode(payloadStr))

  const key = await getHmacKey()
  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(encodedPayload)
  )
  const encodedSig = toBase64Url(sigBuffer)

  return `${encodedPayload}.${encodedSig}`
}

export async function verifySessionToken(token: string): Promise<SessionData | null> {
  if (!token || !token.includes('.')) return null
  const [encodedPayload, encodedSig] = token.split('.')
  if (!encodedPayload || !encodedSig) return null

  try {
    const key = await getHmacKey()
    const signature = fromBase64Url(encodedSig)
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(encodedPayload)
    )
    if (!isValid) return null

    const payloadBytes = fromBase64Url(encodedPayload)
    const decodedStr = new TextDecoder().decode(payloadBytes)
    const sessionData: SessionData = JSON.parse(decodedStr)

    if (Date.now() > sessionData.expiresAt) {
      return null
    }

    return sessionData
  } catch {
    return null
  }
}
