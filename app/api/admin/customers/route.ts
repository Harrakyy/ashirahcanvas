import { NextResponse } from 'next/server'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, users, tenants } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const tenantFilter = searchParams.get('tenantId')

    let tenantId = user.tenantId
    if (user.role === 'super_admin' && tenantFilter) {
      tenantId = tenantFilter
    }

    // Fetch all orders for this tenant
    const orderList = await db.query.orders.findMany({
      where: tenantId ? eq(orders.tenantId, tenantId) : undefined,
      orderBy: [desc(orders.createdAt)],
      with: {
        customer: true,
        items: true,
        payments: true,
      },
    })

    // Group by customer
    const customerMap = new Map<
      string,
      {
        id: string
        name: string
        email: string
        phone: string | null
        createdAt: string
        totalOrders: number
        totalSpent: number
        lastOrderDate: string
        lastOrderStatus: string
        orders: Array<{
          id: string
          orderNumber: string
          status: string
          totalAmount: number
          createdAt: string
          itemCount: number
        }>
      }
    >()

    for (const order of orderList) {
      const cust = order.customer
      if (!cust) continue

      const paidPayments =
        order.payments
          ?.filter((p) => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0) || 0

      if (!customerMap.has(cust.id)) {
        customerMap.set(cust.id, {
          id: cust.id,
          name: cust.name,
          email: cust.email,
          phone: cust.phone || null,
          createdAt: cust.createdAt.toISOString(),
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt.toISOString(),
          lastOrderStatus: order.status,
          orders: [],
        })
      }

      const existing = customerMap.get(cust.id)!
      existing.totalOrders += 1
      existing.totalSpent += paidPayments
      existing.orders.push({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt.toISOString(),
        itemCount: order.items?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0,
      })
    }

    // Also fetch direct customer users who registered under this tenant
    const directCustomers = await db.query.users.findMany({
      where: and(
        eq(users.role, 'customer'),
        tenantId ? eq(users.tenantId, tenantId) : undefined
      ),
    })

    for (const cust of directCustomers) {
      if (!customerMap.has(cust.id)) {
        customerMap.set(cust.id, {
          id: cust.id,
          name: cust.name,
          email: cust.email,
          phone: cust.phone || null,
          createdAt: cust.createdAt.toISOString(),
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: '-',
          lastOrderStatus: 'Belum ada pesanan',
          orders: [],
        })
      }
    }

    const customers = Array.from(customerMap.values())

    return NextResponse.json({
      success: true,
      customers,
      total: customers.length,
    })
  } catch (error) {
    console.error('[Admin Customers API] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat data pelanggan' }, { status: 500 })
  }
}
