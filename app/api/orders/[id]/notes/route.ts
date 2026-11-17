import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id: orderId } = await params
    const body = await req.json()
    const { note } = body

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json({ error: 'Catatan tidak boleh kosong' }, { status: 400 })
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    if (user.role === 'admin' && user.tenantId && order.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Pesanan tidak termasuk dalam tenant Anda' }, { status: 403 })
    }

    const currentNotes = (order.internalNotes as Array<{ note: string; createdAt: string; adminName: string }>) || []
    const newEntry = {
      note: note.trim(),
      createdAt: new Date().toISOString(),
      adminName: user.name || 'Admin Konveksi',
    }

    const updatedNotes = [...currentNotes, newEntry]

    await db
      .update(orders)
      .set({
        internalNotes: updatedNotes,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))

    return NextResponse.json({
      success: true,
      internalNotes: updatedNotes,
      message: 'Catatan internal produksi berhasil ditambahkan',
    })
  } catch (error) {
    console.error('[Internal Notes API] Error:', error)
    return NextResponse.json({ error: 'Gagal menambahkan catatan internal' }, { status: 500 })
  }
}
