/**
 * lib/server/auth.ts
 *
 * Server-side authentication utilities.
 * Connects to PostgreSQL via Drizzle ORM, with safe fallback to demo accounts.
 */

import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { DEMO_ACCOUNTS, type AuthUser, type UserRole } from '@/types/auth'
import { AUTH_COOKIE_NAME, createSessionToken, verifySessionToken } from './session-token'

export { AUTH_COOKIE_NAME, createSessionToken, verifySessionToken }

/**
 * Retrieves the currently logged-in user from request cookies.
 * Can be called safely from Server Components and Route Handlers.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null

  const session = await verifySessionToken(token)
  return session?.user ?? null
}

/**
 * Validates login credentials against PostgreSQL users table,
 * with fallback to demo accounts if database is unreachable or user not found.
 */
export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase()

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    })

    if (dbUser && dbUser.isActive) {
      const isMatch = await bcrypt.compare(password, dbUser.passwordHash)
      if (isMatch) {
        return {
          id: dbUser.id,
          tenantId: dbUser.tenantId,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role as UserRole,
          avatarUrl: dbUser.avatarUrl || '',
          phone: dbUser.phone || '',
          title: dbUser.title || '',
        }
      }
      return null
    }
  } catch (dbError) {
    console.warn('[Auth] Database lookup failed, falling back to demo accounts:', dbError)
  }

  // Fallback demo accounts check
  const demoAccount = DEMO_ACCOUNTS[normalizedEmail]
  if (demoAccount && demoAccount.passwordHash === password) {
    return demoAccount.user
  }

  return null
}
