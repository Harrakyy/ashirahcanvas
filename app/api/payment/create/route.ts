import { NextResponse } from 'next/server'
import { getSession } from '@/lib/server/session-store'
import { getOfferedPrice, getTotalPrice } from '@/lib/server/negotiation-state'
import { createDuitkuTransaction } from '@/lib/server/duitku'

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    console.log('[AshirahBot] Creating Duitku transaction:', {
      orderId,
      grossAmount,
      offeredPrice,
      quantity: session.quantity,
      discount: session.agreedDiscount,
    })

    const transaction = await createDuitkuTransaction({
      merchantOrderId: orderId,
      paymentAmount: grossAmount,
      productDetails: `Kaos Custom Ashirah (${session.category || 'Custom'} - ${session.color})`,
      email: 'customer@ashirah.id',
      customerVaName: 'Customer Ashirah',
      itemDetails: [
        {
          name: `Kaos Custom Ashirah (${session.category || 'Custom'} - ${session.color})`,
          price: offeredPrice,
          quantity: session.quantity,
        },
      ],
      returnUrl: `${appUrl}/payment/success`,
      callbackUrl: `${appUrl}/api/payment/callback`,
    })

    return NextResponse.json({
      reference: transaction.reference,
      paymentUrl: transaction.paymentUrl,
      orderId,
    })
  } catch (error) {
    console.error('[AshirahBot] Duitku payment creation failed:', error)
    return NextResponse.json(
      { error: 'Gagal membuat transaksi pembayaran' },
      { status: 500 }
    )
  }
}
