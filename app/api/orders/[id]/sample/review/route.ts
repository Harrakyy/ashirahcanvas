import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'
import { transitionOrderStatus } from '@/lib/server/order'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Harap masuk terlebih dahulu' }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = await req.json()
    const { action, feedback } = body

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Aksi tidak valid (hanya approve atau reject)' }, { status: 400 })
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    })

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    // Customer ownership check
    if (user.role === 'customer' && order.customerId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    if (order.status !== 'sample_review') {
      return NextResponse.json(
        { error: `Pesanan sedang berstatus "${order.status}", bukan dalam tahap review sample.` },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      await db
        .update(orders)
        .set({
          sampleFeedback: feedback?.trim() || 'Sample disetujui oleh customer tanpa catatan.',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))

      await transitionOrderStatus(
        orderId,
        'ready',
        user.id,
        `Sample disetujui oleh customer (${user.name}). Pesanan siap dikirim, menagih pelunasan 30%.`
      )

      return NextResponse.json({
        success: true,
        action: 'approved',
        message: 'Sample pesanan berhasil disetujui! Pesanan siap dikemas & dikirim.',
      })
    } else {
      if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
        return NextResponse.json(
          { error: 'Harap berikan catatan revisi detail agar konveksi memahami bagian yang perlu diperbaiki.' },
          { status: 400 }
        )
      }

      await db
        .update(orders)
        .set({
          sampleFeedback: feedback.trim(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))

      await transitionOrderStatus(
        orderId,
        'sample_rejected',
        user.id,
        `Sample ditolak oleh customer (${user.name}): "${feedback.trim()}"`
      )

      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: 'Catatan revisi sample telah disampaikan kepada tim konveksi untuk perbaikan.',
      })
    }
  } catch (error: any) {
    console.error('[Sample Review API] Error:', error)
    return NextResponse.json({ error: error.message || 'Gagal memproses review sample' }, { status: 500 })
  }
}
