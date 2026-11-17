import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, tenants } from '@/lib/db/schema'
import { createSessionToken, AUTH_COOKIE_NAME } from '@/lib/server/session-token'
import type { AuthUser } from '@/types/auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, phone, tenantSlug } = body

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nama minimal 2 karakter' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // 2. Check if user already exists
    let existingUser = null
    try {
      existingUser = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      })
    } catch (dbError) {
      console.error('[Register API] Database connection error:', dbError)
      return NextResponse.json(
        { error: 'Gagal terhubung ke database. Pastikan PostgreSQL berjalan.' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Silakan login.' },
        { status: 409 }
      )
    }

    // 3. Resolve tenant if slug provided
    let assignedTenantId: string | null = null
    if (tenantSlug) {
      const foundTenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, tenantSlug),
      })
      if (foundTenant) {
        assignedTenantId = foundTenant.id
      }
    }

    // 4. Hash password and insert
    const passwordHash = await bcrypt.hash(password, 10)

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'customer',
        phone: phone?.trim() || null,
        tenantId: assignedTenantId,
        isActive: true,
      })
      .returning()

    const authUser: AuthUser = {
      id: newUser.id,
      tenantId: newUser.tenantId,
      name: newUser.name,
      email: newUser.email,
      role: 'customer',
      avatarUrl: newUser.avatarUrl || '',
      phone: newUser.phone || '',
      title: newUser.title || 'Customer',
    }

    // 5. Generate session token & set cookie
    const token = await createSessionToken(authUser)

    const response = NextResponse.json({
      success: true,
      user: authUser,
      message: 'Registrasi berhasil',
    })

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
    console.error('[Register API] Error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses registrasi' },
      { status: 500 }
    )
  }
}
