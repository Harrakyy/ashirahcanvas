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
    })

    return NextResponse.json({
      success: true,
      address: dbUser?.address || {
        receiverName: user.name,
        receiverPhone: user.phone || '',
        street: '',
        subdistrict: '',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40132',
      },
    })
  } catch (error) {
    console.error('[User Address API] GET error:', error)
    return NextResponse.json({ error: 'Gagal mengambil data alamat' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Harap masuk terlebih dahulu' }, { status: 401 })
    }

    const body = await req.json()
    const { receiverName, receiverPhone, street, subdistrict, city, province, postalCode } = body

    if (!street || !city || !province || !postalCode) {
      return NextResponse.json(
        { error: 'Alamat, kota, provinsi, dan kode pos wajib diisi' },
        { status: 400 }
      )
    }

    const newAddress = {
      receiverName: receiverName || user.name,
      receiverPhone: receiverPhone || user.phone || '',
      street,
      subdistrict: subdistrict || '',
      city,
      province,
      postalCode,
    }

    await db
      .update(users)
      .set({
        address: newAddress,
        phone: receiverPhone || user.phone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    return NextResponse.json({
      success: true,
      address: newAddress,
      message: 'Alamat berhasil disimpan',
    })
  } catch (error) {
    console.error('[User Address API] POST error:', error)
    return NextResponse.json({ error: 'Gagal menyimpan alamat' }, { status: 500 })
  }
}
