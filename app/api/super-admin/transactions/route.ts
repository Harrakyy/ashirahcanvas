import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { payments, orders, tenants } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Akses khusus Super Admin' }, { status: 403 })
    }

    const allPayments = await db.query.payments.findMany({
      orderBy: [desc(payments.createdAt)],
      with: {
        order: {
          with: {
            customer: true,
          },
        },
        tenant: true,
      },
    })

    const transactions = allPayments.map((p) => ({
      id: p.id,
      orderNumber: p.order?.orderNumber || 'N/A',
      tenantName: p.tenant?.name || 'Unknown',
      customerName: p.order?.customer?.name || 'Customer',
      type: p.type, // 'dp' or 'final'
      amount: p.amount,
      status: p.status,
      duitkuReference: p.duitkuReference,
      platformFee: p.order?.platformFee || 5000,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }))

    return NextResponse.json({ success: true, transactions })
  } catch (error) {
    console.error('[Super Admin Transactions API] Error:', error)
    return NextResponse.json({ error: 'Gagal memuat daftar transaksi' }, { status: 500 })
  }
}
