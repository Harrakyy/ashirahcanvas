import { NextResponse } from 'next/server'
import { authenticateUser, createSessionToken, AUTH_COOKIE_NAME } from '@/lib/server/auth'
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/server/rate-limit'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi' },
        { status: 400 }
      )
    }

    // IP & identifier based rate limit: max 5 attempts per 15 mins
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'client'
    const rateLimitKey = `login:${ip}:${email.toLowerCase().trim()}`

    const limitStatus = await checkRateLimit(rateLimitKey, 5, 900)
    if (!limitStatus.allowed) {
      const waitMinutes = Math.ceil(limitStatus.resetInSeconds / 60)
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan login gagal. Silakan coba lagi dalam ${waitMinutes} menit.`,
        },
        { status: 429 }
      )
    }

    const user = await authenticateUser(email, password)
    if (!user) {
      await recordFailedAttempt(rateLimitKey, 900)
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      )
    }

    // Reset rate limiter on successful authentication
    await clearRateLimit(rateLimitKey)

    const token = await createSessionToken(user)

    // Tentukan default redirect path sesuai role
    let redirectUrl = body.redirect || '/'
    if (!body.redirect) {
      if (user.role === 'admin') {
        redirectUrl = '/admin'
      } else if (user.role === 'super_admin') {
        redirectUrl = '/super-admin'
      }
    }

    const response = NextResponse.json({
      success: true,
      user,
      redirectUrl,
    })

    // Set secure HTTP-Only cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error('[Auth API] Login error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server' },
      { status: 500 }
    )
  }
}
