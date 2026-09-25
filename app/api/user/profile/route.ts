import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Harap masuk terlebih dahulu' }, { status: 401 })
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        address: true,
        avatarUrl: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: dbUser,
      address: dbUser.address || {
        receiverName: dbUser.name,
        receiverPhone: dbUser.phone || '',
        street: '',
        city: '',
        province: '',
        postalCode: '',
      },
    })
  } catch (error) {
    console.error('[User Profile API] GET error:', error)
    return NextResponse.json({ error: 'Gagal mengambil data profil' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Harap masuk terlebih dahulu' }, { status: 401 })
    }

    const body = await req.json()
    const { name, phone, address } = body

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (name) updateData.name = name
    if (phone !== undefined) updateData.phone = phone

    if (address && typeof address === 'object') {
      updateData.address = {
        receiverName: address.receiverName || name || user.name,
        receiverPhone: address.receiverPhone || phone || user.phone || '',
        street: address.street || '',
        subdistrict: address.subdistrict || '',
        city: address.city || '',
        province: address.province || '',
        postalCode: address.postalCode || '',
      }
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))

    return NextResponse.json({
      success: true,
      message: 'Profil berhasil diperbarui',
    })
  } catch (error) {
    console.error('[User Profile API] PATCH error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui profil' }, { status: 500 })
  }
}
