import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, payments, users } from '@/lib/db/schema'
import { duitku } from '@/lib/server/duitku'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib diisi' }, { status: 400 })
    }

    // 1. Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        customer: true,
        payments: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Tidak dapat membuat tagihan DP untuk pesanan dengan status "${order.status}"` },
        { status: 400 }
      )
    }

    // Check if DP is already paid
    const dpPaid = order.payments?.some((p) => p.type === 'dp' && p.status === 'paid')
    if (dpPaid) {
      return NextResponse.json(
        { error: 'Pembayaran DP untuk pesanan ini sudah lunas.' },
        { status: 400 }
      )
    }

    // Check if pending DP payment already exists with paymentUrl (Idempotency)
    const pendingPayment = order.payments?.find(
      (p) => p.type === 'dp' && p.status === 'pending' && p.paymentUrl
    )
    if (pendingPayment) {
      return NextResponse.json({
        success: true,
        paymentId: pendingPayment.id,
        paymentUrl: pendingPayment.paymentUrl,
        reference: pendingPayment.duitkuReference,
        amount: pendingPayment.amount,
        type: 'dp',
        isExisting: true,
      })
    }

    const dpAmount = order.dpAmount || Math.round(order.subtotal * 0.7) + order.shippingCost
    const merchantOrderId = `${order.orderNumber}-DP`

    // 2. Request transaction to Duitku
    const duitkuRes = await duitku.createTransaction({
      merchantOrderId,
      paymentAmount: dpAmount,
      productDetails: `DP 70% + Ongkir Pesanan ${order.orderNumber}`,
      email: order.customer?.email || 'customer@ashirah.com',
      phoneNumber: order.customer?.phone || '',
      customerName: order.customer?.name || 'Customer Ashirah',
      itemDetails: [
        {
          name: `DP 70% Produksi (${order.orderNumber})`,
          price: Math.round(order.subtotal * 0.7),
          quantity: 1,
        },
        ...(order.shippingCost > 0
          ? [
              {
                name: 'Biaya Pengiriman Ekspedisi',
                price: order.shippingCost,
                quantity: 1,
              },
            ]
          : []),
      ],
    })

    // 3. Record in payments table
    const [paymentRecord] = await db
      .insert(payments)
      .values({
        orderId: order.id,
        tenantId: order.tenantId,
        type: 'dp',
        status: 'pending',
        amount: dpAmount,
        duitkuReference: duitkuRes.reference,
        duitkuMerchantCode: duitkuRes.merchantCode,
        paymentUrl: duitkuRes.paymentUrl,
      })
      .returning()

    return NextResponse.json({
      success: true,
      paymentId: paymentRecord.id,
      paymentUrl: duitkuRes.paymentUrl,
      reference: duitkuRes.reference,
      amount: dpAmount,
      type: 'dp',
    })
  } catch (error) {
    console.error('[Payment API] create-dp error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat transaksi pembayaran DP Duitku' },
      { status: 500 }
    )
  }
}
