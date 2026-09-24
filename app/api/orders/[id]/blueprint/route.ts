import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu' }, { status: 401 })
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: true,
        tenant: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    // RBAC Security
    if (user.role === 'customer' && order.customerId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    if (user.role === 'admin' && user.tenantId && order.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      blueprint: order.designBlueprint,
      items: order.items,
    })
  } catch (error) {
    console.error('[Blueprint API] GET error:', error)
    return NextResponse.json({ error: 'Gagal mengambil blueprint pesanan' }, { status: 500 })
  }
}
