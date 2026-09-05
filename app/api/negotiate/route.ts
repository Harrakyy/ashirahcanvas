import { NextResponse } from 'next/server'
import { getSession, updateSession } from '@/lib/server/session-store'
import { generateNegotiationResponse } from '@/lib/server/groq'
import {
  getDiscountPercent,
  getOfferedPrice,
  getTotalPrice,
  classifyUserIntent,
  buildSystemPrompt,
  buildStyleInstruction,
  buildFallbackMessage,
  detectCustomerStyle,
  validateAIResponse,
  getNextTier,
  MINIMUM_ORDER_FOR_DISCOUNT,
} from '@/lib/server/negotiation-state'

export async function POST(request: Request) {
  try {
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const history = session.messages
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content)

    session.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    })

    const intent = classifyUserIntent(message)
    const style = detectCustomerStyle(message, history)
    const styleInstruction = buildStyleInstruction(style)
    console.log('[AshirahBot] Intent:', intent, '| message:', message)
    let aiMessage: string

    if (intent === 'ACCEPT') {
      if (!session.quantity || session.quantity < 1) {
        return NextResponse.json(
          { error: 'Pesanan tidak valid: jumlah pesanan harus lebih dari 0' },
          { status: 400 }
        )
      }

      session.agreedDiscount = getDiscountPercent(session.currentTier)

      const unitPrice = session.basePrice + session.logoPrice + session.textPrice
      const offeredPrice = getOfferedPrice(session)
      const discount = getDiscountPercent(session.currentTier)
      const total = getTotalPrice(session)

      const acceptSystemPrompt = buildSystemPrompt(session, style) + `\n\nCustomer SETUJU dengan harga yang ditawarkan. Konfirmasi kesepakatan dengan ramah, sebutkan harga final yang sudah disepakati, dan terima kasih customer. Jangan tawarkan harga lebih rendah.`

      try {
        const response = await generateNegotiationResponse(acceptSystemPrompt, message, 'accept')
        aiMessage = validateAIResponse(response, session, style)
      } catch (error) {
        console.error('[AshirahBot] ACCEPT branch Groq FAILED:', error)
        aiMessage = buildFallbackMessage(session, 'accept', style)
      }

      session.messages.push({
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now(),
      })

      await updateSession(session)

      return NextResponse.json({
        aiMessage,
        currentPrice: offeredPrice,
        tier: session.currentTier,
        agreedDiscount: session.agreedDiscount,
        messages: session.messages.map((msg, index) => ({
          id: index + 1,
          type: msg.role === 'assistant' ? 'ai' as const : 'user' as const,
          message: msg.content,
        })),
      })
    }

    if (intent === 'REJECT') {
      if (session.quantity >= MINIMUM_ORDER_FOR_DISCOUNT && session.currentTier < 3) {
        session.currentTier = getNextTier(session.currentTier) as 0 | 1 | 2 | 3
      }

      const offeredPrice = getOfferedPrice(session)
      const discount = getDiscountPercent(session.currentTier)
      const total = getTotalPrice(session)
      const unitPrice = session.basePrice + session.logoPrice + session.textPrice

      let rejectSystemPrompt: string
      if (session.quantity < MINIMUM_ORDER_FOR_DISCOUNT) {
        rejectSystemPrompt = `Kamu adalah AshirahBot, asisten virtual resmi dari Ashirah Group (ashiragroup.id).
GAYA BAHASA: Ikuti gaya bahasa customer sesuai blok ADAPTASI di bawah (sapaan, formalitas, emoji, panjang balasan). Jangan default ke "Kak" bila customer formal atau memakai sapaan lain.
${styleInstruction}
JANGAN PERNAH menyebutkan kode warna hex kepada customer. Selalu sebut nama warnanya.

Customer ${session.quantity} pcs menolak harga Rp ${unitPrice.toLocaleString('id-ID')}/pcs.
Pesanan ${session.quantity} pcs belum mencapai minimum ${MINIMUM_ORDER_FOR_DISCOUNT} pcs untuk diskon.
Jelaskan dengan sopan bahwa minimum ${MINIMUM_ORDER_FOR_DISCOUNT} pcs untuk diskon. Sarankan untuk menambah jumlah pesanan.
Harga normal: Rp ${unitPrice.toLocaleString('id-ID')}/pcs.
Total: Rp ${(unitPrice * session.quantity).toLocaleString('id-ID')}.`
      } else if (session.currentTier < 3) {
        rejectSystemPrompt = `Kamu adalah AshirahBot, asisten virtual resmi dari Ashirah Group (ashiragroup.id).
GAYA BAHASA: Ikuti gaya bahasa customer sesuai blok ADAPTASI di bawah (sapaan, formalitas, emoji, panjang balasan). Jangan default ke "Kak" bila customer formal atau memakai sapaan lain.
${styleInstruction}
JANGAN PERNAH menyebutkan kode warna hex kepada customer. Selalu sebut nama warnanya.

Customer menolak tawaran sebelumnya. Kamu sekarang menawarkan harga yang lebih baik!
Tier diskon naik ke: ${session.currentTier} (${discount}% diskon).
Harga baru: Rp ${offeredPrice.toLocaleString('id-ID')}/pcs (sebelumnya lebih mahal).
Total untuk ${session.quantity} pcs: Rp ${total.toLocaleString('id-ID')}.
Harga normal: Rp ${unitPrice.toLocaleString('id-ID')}/pcs.

Tawarkan harga baru dengan antusias, jelaskan bahwa ini harga lebih baik. Tunjukkan perbandingan harga sebelum dan sesudah.`
      } else {
        rejectSystemPrompt = `Kamu adalah AshirahBot, asisten virtual resmi dari Ashirah Group (ashiragroup.id).
GAYA BAHASA: Ikuti gaya bahasa customer sesuai blok ADAPTASI di bawah (sapaan, formalitas, emoji, panjang balasan). Jangan default ke "Kak" bila customer formal atau memakai sapaan lain.
${styleInstruction}
JANGAN PERNAH menyebutkan kode warna hex kepada customer. Selalu sebut nama warnanya.

Customer menolak tawaran, tapi kamu sudah di diskon maksimal ${discount}%.
Harga: Rp ${offeredPrice.toLocaleString('id-ID')}/pcs.
Total: Rp ${total.toLocaleString('id-ID')}.
Harga normal: Rp ${unitPrice.toLocaleString('id-ID')}/pcs.

Jelaskan dengan sopan bahwa ini sudah harga terbaik yang bisa diberikan. Tunjukkan nilai yang didapat dari harga ini. Jangan tawarkan harga lebih rendah.`
      }

      try {
        const response = await generateNegotiationResponse(rejectSystemPrompt, message, 'reject')
        aiMessage = validateAIResponse(response, session, style)
      } catch (error) {
        console.error('[AshirahBot] REJECT branch Groq FAILED:', error)
        if (session.quantity < MINIMUM_ORDER_FOR_DISCOUNT) {
          aiMessage = buildFallbackMessage(session, 'belowMinimum', style)
        } else if (session.currentTier < 3) {
          aiMessage = buildFallbackMessage(session, 'normalReject', style)
        } else {
          aiMessage = buildFallbackMessage(session, 'tierMax', style)
        }
      }

      session.messages.push({
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now(),
      })

      await updateSession(session)

      return NextResponse.json({
        aiMessage,
        currentPrice: offeredPrice,
        tier: session.currentTier,
        agreedDiscount: session.agreedDiscount,
        messages: session.messages.map((msg, index) => ({
          id: index + 1,
          type: msg.role === 'assistant' ? 'ai' as const : 'user' as const,
          message: msg.content,
        })),
      })
    }

    const systemPrompt = buildSystemPrompt(session, style)

    try {
      const response = await generateNegotiationResponse(systemPrompt, message, 'unknown')
      aiMessage = validateAIResponse(response, session, style)
    } catch (error) {
      console.error('[AshirahBot] UNKNOWN branch Groq FAILED:', error)
      aiMessage = buildFallbackMessage(session, 'unknown', style)
    }

    session.messages.push({
      role: 'assistant',
      content: aiMessage,
      timestamp: Date.now(),
    })

    await updateSession(session)

    return NextResponse.json({
      aiMessage,
      currentPrice: getOfferedPrice(session),
      tier: session.currentTier,
      agreedDiscount: session.agreedDiscount,
      messages: session.messages.map((msg, index) => ({
        id: index + 1,
        type: msg.role === 'assistant' ? 'ai' as const : 'user' as const,
        message: msg.content,
      })),
    })
  } catch (error) {
    console.error('[AshirahBot] FATAL error in negotiate route:', error)
    return NextResponse.json({ error: 'Gagal memproses negosiasi' }, { status: 500 })
  }
}
