import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tenants, orders, payments, users } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Akses khusus Super Admin AshiraTech' }, { status: 403 })
    }

    const allTenants = await db.query.tenants.findMany({
      orderBy: [desc(tenants.createdAt)],
    })

    const allOrders = await db.query.orders.findMany({
      with: {
        tenant: true,
        payments: true,
        customer: true,
      },
      orderBy: [desc(orders.createdAt)],
    })

    const allPayments = await db.query.payments.findMany()

    // Calculations
    const totalClients = allTenants.length
    const totalOrders = allOrders.length

    // Platform fee earned from paid orders
    const paidOrders = allOrders.filter((o) => o.status !== 'pending' && o.status !== 'cancelled')
    const totalPlatformFee = paidOrders.reduce((sum, o) => sum + (o.platformFee || 5000), 0)

    // Gross Merchandise Value (GMV) of all non-cancelled orders
    const totalGmv = allOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0)

    // Realized payment volume
    const totalRealizedPayments = allPayments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0)

    // Per-client statistics
    const clientStats = allTenants.map((t) => {
      const clientOrders = allOrders.filter((o) => o.tenantId === t.id)
      const clientPaidOrders = clientOrders.filter((o) => o.status !== 'pending' && o.status !== 'cancelled')
      const clientGmv = clientOrders.reduce((sum, o) => sum + o.totalAmount, 0)
      const clientFee = clientPaidOrders.reduce((sum, o) => sum + (o.platformFee || 5000), 0)

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        address: t.address,
        phone: t.phone,
        email: t.email,
        isActive: t.isActive,
        totalOrders: clientOrders.length,
        gmv: clientGmv,
        platformFeeEarned: clientFee,
        createdAt: t.createdAt,
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalClients,
        totalOrders,
        totalPlatformFee,
        totalGmv,
        totalRealizedPayments,
      },
      clientStats,
      recentOrders: allOrders.slice(0, 10),
    })
  } catch (error) {
    console.error('[Super Admin Stats API] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat statistik platform' }, { status: 500 })
  }
}
