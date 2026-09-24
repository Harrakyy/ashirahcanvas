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
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id: orderId } = await params
    const body = await req.json()
    const { photoUrl, note } = body

    if (!photoUrl || typeof photoUrl !== 'string' || !photoUrl.trim()) {
      return NextResponse.json(
        { error: 'URL foto sample wajib dicantumkan' },
        { status: 400 }
      )
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { customer: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    if (user.role === 'admin' && user.tenantId && order.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Pesanan tidak termasuk dalam tenant Anda' }, { status: 403 })
    }

    // Save sample photo & note
    await db
      .update(orders)
      .set({
        samplePhotoUrl: photoUrl.trim(),
        sampleNote: note?.trim() || 'Silakan tinjau hasil sample cetak apparel sebelum dilanjutkan ke produksi masal.',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))

    // Transition order state to sample_review
    await transitionOrderStatus(
      orderId,
      'sample_review',
      user.id,
      `Admin mengunggah foto sample bukti jahit & sablon: ${photoUrl.trim()}`
    )

    return NextResponse.json({
      success: true,
      message: 'Foto sample berhasil diunggah. Status pesanan kini Menunggu Review Customer.',
    })
  } catch (error: any) {
    console.error('[Sample Upload API] Error:', error)
    return NextResponse.json({ error: error.message || 'Gagal menyimpan data sample' }, { status: 500 })
  }
}
