/**
 * lib/server/rate-limit.ts
 *
 * Lightweight rate-limiter using Upstash Redis with in-memory fallback.
 * Adheres to Ponytail philosophy: minimal safe code, no heavy external libraries.
 */

import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null

function getRedis(): Redis | null {
  if (redisClient) return redisClient
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      redisClient = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      })
      return redisClient
    } catch {
      return null
    }
  }
  return null
}

// In-memory fallback if Redis is unconfigured or unavailable
interface MemoryLimitEntry {
  count: number
  expiresAt: number
}
const memoryStore = new Map<string, MemoryLimitEntry>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

/**
 * Checks if a key has exceeded the maximum allowed attempts.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowSeconds: number = 900
): Promise<RateLimitResult> {
  const fullKey = `ratelimit:${key}`
  const now = Date.now()
  const redis = getRedis()

  if (redis) {
    try {
      const current = await redis.get<number>(fullKey)
      const count = typeof current === 'number' ? current : parseInt(String(current || '0'), 10) || 0
      const ttl = await redis.ttl(fullKey)
      const resetInSeconds = ttl > 0 ? ttl : windowSeconds

      if (count >= maxAttempts) {
        return {
          allowed: false,
          remaining: 0,
          resetInSeconds,
        }
      }

      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - count),
        resetInSeconds,
      }
    } catch (e) {
      console.warn('[RateLimit] Redis error, falling back to in-memory store:', e)
    }
  }

  // Fallback: in-memory store
  const entry = memoryStore.get(fullKey)
  if (!entry || entry.expiresAt <= now) {
    return {
      allowed: true,
      remaining: maxAttempts,
      resetInSeconds: windowSeconds,
    }
  }

  const remainingSeconds = Math.max(1, Math.round((entry.expiresAt - now) / 1000))
  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: remainingSeconds,
    }
  }

  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    resetInSeconds: remainingSeconds,
  }
}

/**
 * Increments the failure count for a key.
 */
export async function recordFailedAttempt(
  key: string,
  windowSeconds: number = 900
): Promise<void> {
  const fullKey = `ratelimit:${key}`
  const redis = getRedis()

  if (redis) {
    try {
      const count = await redis.incr(fullKey)
      if (count === 1) {
        await redis.expire(fullKey, windowSeconds)
      }
      return
    } catch (e) {
      console.warn('[RateLimit] Redis incr failed, fallback to in-memory store:', e)
    }
  }

  // Fallback: in-memory store
  const now = Date.now()
  const entry = memoryStore.get(fullKey)
  if (!entry || entry.expiresAt <= now) {
    memoryStore.set(fullKey, {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    })
  } else {
    entry.count += 1
  }
}

/**
 * Clears the rate limit count on successful action (e.g. valid login).
 */
export async function clearRateLimit(key: string): Promise<void> {
  const fullKey = `ratelimit:${key}`
  const redis = getRedis()

  if (redis) {
    try {
      await redis.del(fullKey)
    } catch {
      // Ignore
    }
  }

  memoryStore.delete(fullKey)
}
