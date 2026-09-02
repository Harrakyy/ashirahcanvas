import { NextResponse } from 'next/server'
import { getSession, updateSession } from '@/lib/server/session-store'
import { getOfferedPrice, getDiscountPercent } from '@/lib/server/negotiation-state'

export async function GET(request: Request) {
  try {
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    await updateSession(session)

    const messages = session.messages.map((msg, index) => ({
      id: index + 1,
      type: msg.role === 'assistant' ? 'ai' as const : 'user' as const,
      message: msg.content,
    }))

    return NextResponse.json({
      sessionId: session.sessionId,
      currentPrice: getOfferedPrice(session),
      tier: session.currentTier,
      agreedDiscount: session.agreedDiscount,
      totalQty: session.quantity,
      quantity: session.quantity,
      messages,
      basePrice: session.basePrice,
      logoPrice: session.logoPrice,
      textPrice: session.textPrice,
    })
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil status sesi' }, { status: 500 })
  }
}
