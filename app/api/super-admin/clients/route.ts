import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tenants, users } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Akses khusus Super Admin' }, { status: 403 })
    }

    const clientList = await db.query.tenants.findMany({
      orderBy: [desc(tenants.createdAt)],
      with: {
        users: true,
        orders: true,
      },
    })

    return NextResponse.json({ success: true, clients: clientList })
  } catch (error) {
    console.error('[Super Admin Clients API] GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat client' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Akses khusus Super Admin' }, { status: 403 })
    }

    const body = await req.json()
    const { name, slug, email, phone, address, description, platformFeePerTransaction = 5000 } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nama dan slug konveksi wajib diisi' }, { status: 400 })
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')

    // Check slug uniqueness
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.slug, cleanSlug),
    })

    if (existing) {
      return NextResponse.json({ error: 'Slug konveksi sudah digunakan' }, { status: 409 })
    }

    const [newTenant] = await db
      .insert(tenants)
      .values({
        name: name.trim(),
        slug: cleanSlug,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        settings: {
          platformFeePerTransaction: Number(platformFeePerTransaction),
          description: description?.trim() || '',
        },
        isActive: true,
      })
      .returning()

    return NextResponse.json({
      success: true,
      client: newTenant,
      message: `Konveksi ${newTenant.name} berhasil didaftarkan!`,
    })
  } catch (error) {
    console.error('[Super Admin Clients API] POST error:', error)
    return NextResponse.json({ error: 'Gagal mendaftarkan client baru' }, { status: 500 })
  }
}
