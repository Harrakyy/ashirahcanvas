import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tenants, users } from '@/lib/db/schema'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      tenantName,
      slug: rawSlug,
      address,
      postalCode,
      phone,
      adminName,
      adminEmail,
      password,
    } = body

    if (!tenantName || !adminEmail || !password || !adminName) {
      return NextResponse.json(
        { error: 'Nama konveksi, nama admin, email, dan kata sandi wajib diisi' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Kata sandi minimal 6 karakter' },
        { status: 400 }
      )
    }

    const normalizedEmail = adminEmail.trim().toLowerCase()
    const slug = (rawSlug || tenantName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')

    // 1. Cek apakah email sudah terdaftar
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email tersebut sudah terdaftar di sistem' },
        { status: 409 }
      )
    }

    // 2. Cek apakah slug konveksi sudah dipakai
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Slug/nama domain konveksi sudah dipakai oleh mitra lain' },
        { status: 409 }
      )
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // 4. Daftarkan tenant baru (isActive: false menunggu persetujuan Super Admin)
    const [newTenant] = await db
      .insert(tenants)
      .values({
        name: tenantName.trim(),
        slug,
        address: address || '',
        phone: phone || '',
        email: normalizedEmail,
        isActive: false,
        settings: {
          moq: 12,
          description: `Mitra Konveksi ${tenantName}`,
        },
      })
      .returning()

    // 5. Daftarkan admin tenant
    await db.insert(users).values({
      tenantId: newTenant.id,
      name: adminName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'admin',
      phone: phone || '',
      address: {
        street: address || '',
        postalCode: postalCode || '',
        receiverName: adminName.trim(),
        receiverPhone: phone || '',
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Pendaftaran mitra konveksi berhasil diajukan. Menunggu persetujuan Super Admin Ashirah.',
        tenantId: newTenant.id,
        status: 'pending_approval',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Tenant Register API] Error:', error)
    return NextResponse.json(
      { error: 'Gagal memproses pendaftaran mitra konveksi' },
      { status: 500 }
    )
  }
}
