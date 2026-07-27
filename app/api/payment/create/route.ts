import { NextResponse } from 'next/server'
import { Snap } from 'midtrans-client'
import { getSession } from '@/lib/session-store'
import { getOfferedPrice, getTotalPrice } from '@/lib/negotiation-state'

const snap = new Snap({
  isProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.agreedDiscount === null || session.agreedDiscount === undefined) {
      return NextResponse.json(
        { error: 'Negosiasi belum selesai. Harap selesaikan negosiasi terlebih dahulu.' },
        { status: 400 }
      )
    }

    if (!session.quantity || session.quantity < 1) {
      return NextResponse.json(
        { error: 'Jumlah pesanan tidak valid' },
        { status: 400 }
      )
    }

    const offeredPrice = getOfferedPrice(session)
    const grossAmount = getTotalPrice(session)
    const orderId = `ASH-${sessionId.slice(0, 8)}-${Date.now()}`
    const unitPrice = session.basePrice + session.logoPrice + session.textPrice

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: 'kaos-custom',
          name: `Kaos Custom Ashirah (${session.category || 'Custom'} - ${session.color})`,
          price: offeredPrice,
          quantity: session.quantity,
          brand: 'Ashirah',
          category: session.category || 'Custom',
        },
      ],
      customer_details: {
        first_name: 'Customer',
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success`,
      },
    }

    console.log('[AshirahBot] Creating Midtrans transaction:', {
      orderId,
      grossAmount,
      offeredPrice,
      quantity: session.quantity,
      discount: session.agreedDiscount,
    })

    const transaction = await snap.createTransaction(parameter)

    return NextResponse.json({
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
      orderId,
    })
  } catch (error) {
    console.error('[AshirahBot] Midtrans payment creation failed:', error)
    return NextResponse.json(
      { error: 'Gagal membuat transaksi pembayaran' },
      { status: 500 }
    )
  }
}
