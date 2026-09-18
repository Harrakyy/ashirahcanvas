import { NextResponse } from 'next/server'
import { getSession, updateSession } from '@/lib/server/session-store'
import { generateNegotiationResponse } from '@/lib/server/groq'
import {
  getDiscountPercent,
  getOfferedPrice,
  getTotalPrice,
  classifyUserIntent,
  buildSystemPrompt,
  validateAIResponse,
  getNextTier,
  MINIMUM_ORDER_FOR_DISCOUNT,
  BASE_PERSONA_PROMPT,
  detectCustomerStyle,
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

    session.messages.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    })

    const intent = classifyUserIntent(message)
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

      const acceptSystemPrompt = buildSystemPrompt(session) + `\n\nCustomer SETUJU. Konfirmasi harga final Rp${offeredPrice.toLocaleString('id-ID')}/pcs (diskon ${discount}%), total Rp${total.toLocaleString('id-ID')} untuk ${session.quantity}pcs. Terima kasih, ramah.`

      try {
        const response = await generateNegotiationResponse(acceptSystemPrompt, message, 'accept')
        aiMessage = validateAIResponse(response, session)
      } catch (error) {
        console.error('[AshirahBot] ACCEPT branch Groq FAILED:', error)
        aiMessage = `Mantap kak! ✅ Terima kasih sudah deal ya. Untuk ${session.quantity} pcs, harga finalnya Rp ${offeredPrice.toLocaleString('id-ID')}/pcs (diskon ${discount}%), total Rp ${total.toLocaleString('id-ID')}. Pesanan akan segera kami proses! 🎉`
      }

      session.messages.push({
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now(),
      })

      await updateSession(session)

      console.log(`[AshirahBot] RESPONSE | branch: accept | tier: ${session.currentTier} | currentPrice: ${offeredPrice} | qty: ${session.quantity}`)
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
      const style = detectCustomerStyle(session)
      const styleHint = style.isShort ? 'Balas SINGKAT maksimal 2 kalimat.' : 'Boleh balas lebih detail.'

      let rejectSystemPrompt: string
      if (session.quantity < MINIMUM_ORDER_FOR_DISCOUNT) {
        rejectSystemPrompt = `${BASE_PERSONA_PROMPT}
${styleHint} ${style.isFormal ? 'Formal, no emoji.' : '1 emoji di akhir.'}.
SITUASI: ${session.quantity}pcs, minta harga lebih murah. Harga Rp${unitPrice.toLocaleString('id-ID')}/pcs tidak bisa kurang — belum min ${MINIMUM_ORDER_FOR_DISCOUNT}pcs. Sampaikan hangat, arahkan tambah qty. Total: Rp${(unitPrice * session.quantity).toLocaleString('id-ID')}.`
      } else if (session.currentTier < 3) {
        rejectSystemPrompt = `${BASE_PERSONA_PROMPT}
${styleHint} ${style.isFormal ? 'Formal, no emoji.' : '1 emoji di akhir.'} No "Kak," di awal. No "maaf". No "sudah maksimal".
SITUASI: Customer minta lebih murah — BISA kasih diskon! Diskon ${discount}%, harga jadi Rp${offeredPrice.toLocaleString('id-ID')}/pcs, total Rp${total.toLocaleString('id-ID')} untuk ${session.quantity}pcs. Sampaikan antusias.`
      } else {
        rejectSystemPrompt = `${BASE_PERSONA_PROMPT}
${styleHint} ${style.isFormal ? 'Formal, no emoji.' : '1 emoji di akhir.'} No "Kak," di awal. No "maaf".
SITUASI: Diskon sudah naik ke ${discount}% (tertinggi). Harga Rp${offeredPrice.toLocaleString('id-ID')}/pcs, total Rp${total.toLocaleString('id-ID')} untuk ${session.quantity}pcs. Sebutkan ${discount}% adalah penawaran terbaik.`
      }

      try {
        const response = await generateNegotiationResponse(rejectSystemPrompt, message, 'reject')
        aiMessage = validateAIResponse(response, session)
      } catch (error) {
        console.error('[AshirahBot] REJECT branch Groq FAILED:', error)
        if (session.quantity < MINIMUM_ORDER_FOR_DISCOUNT) {
          aiMessage = `Untuk ${session.quantity} pcs, harganya Rp ${unitPrice.toLocaleString('id-ID')}/pcs. Diskon baru bisa didapat mulai ${MINIMUM_ORDER_FOR_DISCOUNT} pcs ya kak.`
        } else if (session.currentTier < 3) {
          aiMessage = `Untuk ${session.quantity} pcs, saya bisa kasih diskon ${discount}% — jadi Rp ${offeredPrice.toLocaleString('id-ID')}/pcs, total Rp ${total.toLocaleString('id-ID')} ya kak.`
        } else {
          aiMessage = `Diskon sudah naik ke ${discount}% ya kak, harga jadi Rp ${offeredPrice.toLocaleString('id-ID')}/pcs, total Rp ${total.toLocaleString('id-ID')}. Ini penawaran terbaik yang bisa kami berikan.`
        }
      }

      session.messages.push({
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now(),
      })

      await updateSession(session)

      console.log(`[AshirahBot] RESPONSE | branch: reject | tier: ${session.currentTier} | currentPrice: ${offeredPrice} | qty: ${session.quantity}`)
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

    const systemPrompt = buildSystemPrompt(session)

    try {
      const response = await generateNegotiationResponse(systemPrompt, message, 'unknown')
      aiMessage = validateAIResponse(response, session)
    } catch (error) {
      console.error('[AshirahBot] UNKNOWN branch Groq FAILED:', error)
      const offeredPrice = getOfferedPrice(session)
      const discount = getDiscountPercent(session.currentTier)
      aiMessage = `Hmm, saya kurang penuh maksud kaknya nih 😅 Bisa diperjelas lagi? Untuk pesanan ${session.quantity} pcs, saya tawarkan harga Rp ${offeredPrice.toLocaleString('id-ID')}/pcs (diskon ${discount}%). Ada yang bisa saya bantu? 😊`
    }

    session.messages.push({
      role: 'assistant',
      content: aiMessage,
      timestamp: Date.now(),
    })

    await updateSession(session)

    const finalPrice = getOfferedPrice(session)
    console.log(`[AshirahBot] RESPONSE | branch: unknown | tier: ${session.currentTier} | currentPrice: ${finalPrice} | qty: ${session.quantity}`)
    return NextResponse.json({
      aiMessage,
      currentPrice: finalPrice,
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
