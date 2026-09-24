import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, payments } from '@/lib/db/schema'
import { duitku } from '@/lib/server/duitku'
import { sendProductionReadyEmail } from '@/lib/server/email'
import { getTenantById } from '@/lib/server/tenant'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib diisi' }, { status: 400 })
    }

    // 1. Fetch order + payments + customer
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

    // 2. Validate order status
    // Final payment only allowed when order is ready (production completed)
    if (order.status !== 'ready' && order.status !== 'shipped' && order.status !== 'delivered') {
      return NextResponse.json(
        {
          error: `Pelunasan 30% hanya dapat dibuat jika status pesanan "Siap Dikirim (ready)". Status saat ini: "${order.status}"`,
        },
        { status: 400 }
      )
    }

    // Check if DP was paid
    const dpPaid = order.payments.some((p) => p.type === 'dp' && p.status === 'paid')
    if (!dpPaid) {
      return NextResponse.json(
        { error: 'Pembayaran DP 70% belum terkonfirmasi lunas.' },
        { status: 400 }
      )
    }

    // Check if final payment is already paid
    const finalPaid = order.payments.some((p) => p.type === 'final' && p.status === 'paid')
    if (finalPaid) {
      return NextResponse.json(
        { error: 'Tagihan pelunasan 30% untuk pesanan ini sudah lunas.' },
        { status: 400 }
      )
    }

    // Check if pending final payment already exists with paymentUrl (Idempotency)
    const pendingFinal = order.payments.find(
      (p) => p.type === 'final' && p.status === 'pending' && p.paymentUrl
    )
    if (pendingFinal) {
      return NextResponse.json({
        success: true,
        paymentId: pendingFinal.id,
        paymentUrl: pendingFinal.paymentUrl,
        reference: pendingFinal.duitkuReference,
        amount: pendingFinal.amount,
        type: 'final',
        isExisting: true,
      })
    }

    const finalAmount = order.finalAmount || Math.round(order.subtotal * 0.3)
    const merchantOrderId = `${order.orderNumber}-FINAL`

    // 3. Request transaction to Duitku
    const duitkuRes = await duitku.createTransaction({
      merchantOrderId,
      paymentAmount: finalAmount,
      productDetails: `Pelunasan 30% Pesanan ${order.orderNumber}`,
      email: order.customer?.email || 'customer@ashirah.com',
      phoneNumber: order.customer?.phone || '',
      customerName: order.customer?.name || 'Customer Ashirah',
      itemDetails: [
        {
          name: `Pelunasan 30% Sisa Produksi (${order.orderNumber})`,
          price: finalAmount,
          quantity: 1,
        },
      ],
    })

    // 4. Record in payments table
    const [paymentRecord] = await db
      .insert(payments)
      .values({
        orderId: order.id,
        tenantId: order.tenantId,
        type: 'final',
        status: 'pending',
        amount: finalAmount,
        duitkuReference: duitkuRes.reference,
        duitkuMerchantCode: duitkuRes.merchantCode,
        paymentUrl: duitkuRes.paymentUrl,
      })
      .returning()

    // Send production ready email to customer
    if (order.customer?.email) {
      const tenant = await getTenantById(order.tenantId).catch(() => null)
      sendProductionReadyEmail({
        customerEmail: order.customer.email,
        customerName: order.customer.name || 'Customer',
        orderNumber: order.orderNumber,
        tenantName: tenant?.name || 'Ashira Studio',
        tenantEmail: tenant?.email,
        finalAmount,
        paymentUrl: duitkuRes.paymentUrl,
      }).catch((e) => console.warn('[Email] Error sending production ready email:', e))
    }

    return NextResponse.json({
      success: true,
      paymentId: paymentRecord.id,
      paymentUrl: duitkuRes.paymentUrl,
      reference: duitkuRes.reference,
      amount: finalAmount,
      type: 'final',
    })
  } catch (error) {
    console.error('[Payment API] create-final error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat tagihan pelunasan 30% Duitku' },
      { status: 500 }
    )
  }
}
