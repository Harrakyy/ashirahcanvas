import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, orderStatusLogs } from '@/lib/db/schema'
import { transitionOrderStatus, type OrderStatus } from '@/lib/server/order'
import { getCurrentUser } from '@/lib/server/auth'
import { sendOrderReadyWa } from '@/lib/server/whatsapp'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Harap masuk terlebih dahulu' }, { status: 401 })
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        customer: true,
        tenant: true,
        items: true,
        payments: true,
        shipment: true,
        statusLogs: {
          orderBy: [desc(orderStatusLogs.createdAt)],
          with: {
            changer: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    // RBAC Security Check
    if (user.role === 'customer' && order.customerId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    if (user.role === 'admin' && user.tenantId && order.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Akses ditolak untuk tenant ini' }, { status: 403 })
    }

    // Hide internal notes from customer
    const sanitizedOrder = user.role === 'customer' ? { ...order, internalNotes: [] } : order

    return NextResponse.json({
      success: true,
      order: sanitizedOrder,
    })
  } catch (error) {
    console.error('[Order Detail API] GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat detail pesanan' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Hanya admin konveksi yang dapat mengubah status pesanan' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { status: toStatus, note } = body

    if (!toStatus) {
      return NextResponse.json({ error: 'Status baru wajib disertakan' }, { status: 400 })
    }

    const result = await transitionOrderStatus(
      id,
      toStatus as OrderStatus,
      user.id,
      note || `Status pesanan diubah menjadi ${toStatus} oleh admin ${user.name}`
    )

    // If order is ready, notify customer via WhatsApp to pay final 30%
    if (toStatus === 'ready') {
      db.query.orders.findFirst({
        where: eq(orders.id, id),
        with: { customer: true, tenant: true },
      }).then((fullOrder) => {
        if (fullOrder?.customer?.phone) {
          sendOrderReadyWa({
            customerPhone: fullOrder.customer.phone,
            customerName: fullOrder.customer.name || 'Customer',
            orderNumber: fullOrder.orderNumber,
            tenantName: fullOrder.tenant?.name || 'Ashira Garment Studio',
            finalAmount: fullOrder.finalAmount,
          }).catch((e) => console.warn('[WhatsApp] Error sending ready notification:', e))
        }
      }).catch((e) => console.warn('[WhatsApp] Error fetching order for ready notification:', e))
    }

    return NextResponse.json({
      success: true,
      message: `Status pesanan berhasil diperbarui ke "${toStatus}"`,
      result,
    })
  } catch (error: any) {
    console.error('[Order Detail API] PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal mengubah status pesanan' },
      { status: 400 }
    )
  }
}
