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

      const acceptSystemPrompt = buildSystemPrompt(session) + `\n\nCustomer SETUJU dengan harga yang ditawarkan. Konfirmasi kesepakatan dengan ramah, sebutkan harga final yang sudah disepakati, dan terima kasih customer. Jangan tawarkan harga lebih rendah.`

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

GAYA: ${styleHint} Sapa pakai "Kak". ${style.isFormal ? 'Tanpa emoji.' : 'Boleh 1 emoji di akhir pesan.'}

SITUASI: Customer ${session.quantity} pcs minta harga lebih murah.
Harga Rp ${unitPrice.toLocaleString('id-ID')}/pcs memang tidak bisa dikurangi karena belum mencapai minimum ${MINIMUM_ORDER_FOR_DISCOUNT} pcs untuk diskon.
Sampaikan dengan lembut bahwa kalau mau diskon, bisa tambah quantity sampai ${MINIMUM_ORDER_FOR_DISCOUNT} pcs.
Jangan bertanya balik. Sampaikan informasinya sebagai penjelasan yang hangat, bukan pertanyaan.
Harga normal: Rp ${unitPrice.toLocaleString('id-ID')}/pcs. Total sekarang: Rp ${(unitPrice * session.quantity).toLocaleString('id-ID')}.`
      } else if (session.currentTier < 3) {
        rejectSystemPrompt = `${BASE_PERSONA_PROMPT}

GAYA: ${styleHint} Sapa pakai "Kak". ${style.isFormal ? 'Tanpa emoji.' : 'Boleh 1 emoji di akhir pesan.'}

SITUASI: Customer minta harga lebih murah. KABAR BAIK — kamu bisa kasih tambahan diskon!
Diskon NAIK dari sebelumnya menjadi ${discount}%.
Harga baru: Rp ${offeredPrice.toLocaleString('id-ID')}/pcs. Total ${session.quantity} pcs: Rp ${total.toLocaleString('id-ID')}.
Sampaikan dengan ANTUSIAS bahwa kamu bisa kasih tambahan diskon. Contoh: "Baik kak, khusus untuk kakak saya kasih tambahan diskon jadi ${discount}%!"
JANGAN bilang "tidak bisa kurang" atau "sudah harga terbaik" — karena kamu BISA kasih diskon lebih.`
      } else {
        rejectSystemPrompt = `${BASE_PERSONA_PROMPT}

GAYA: ${styleHint} Sapa pakai "Kak". ${style.isFormal ? 'Tanpa emoji.' : 'Boleh 1 emoji di akhir pesan.'}

SITUASI: Customer keberatan dengan harga, tapi diskon sudah maksimal ${discount}%.
Harga: Rp ${offeredPrice.toLocaleString('id-ID')}/pcs. Total: Rp ${total.toLocaleString('id-ID')}.
Harga normal: Rp ${unitPrice.toLocaleString('id-ID')}/pcs.

Respons harus sesuai dengan pertanyaan/keluhan spesifik customer — jangan copy-paste jawaban sebelumnya.
Kalau customer tanya "kenapa tidak bisa kurang" → jelaskan alasannya (sudah diskon maksimal dari harga normal).
Kalau customer bilang "masih mahal" → akui dengan empati, tunjukkan nilai yang didapat dari harga ini.
Kalau customer minta diskon lebih dari ${discount}% → tolak dengan sopan, jelaskan batas maksimal.
Jangan tawarkan harga lebih rendah dari Rp ${offeredPrice.toLocaleString('id-ID')}/pcs.`
      }

      try {
        const response = await generateNegotiationResponse(rejectSystemPrompt, message, 'reject')
        aiMessage = validateAIResponse(response, session)
      } catch (error) {
        console.error('[AshirahBot] REJECT branch Groq FAILED:', error)
        if (session.quantity < MINIMUM_ORDER_FOR_DISCOUNT) {
          aiMessage = `Maaf kak, untuk ${session.quantity} pcs, harganya Rp ${unitPrice.toLocaleString('id-ID')}/pcs ya. Sayangnya minimal ${MINIMUM_ORDER_FOR_DISCOUNT} pcs baru bisa dapat diskon. Kalau mau tambah quantity, nanti saya bantu hitung yang terbaik! 😊`
        } else if (session.currentTier < 3) {
          aiMessage = `Oke kak, saya kasih penawaran lebih baik nih! 😊 Untuk ${session.quantity} pcs, saya bisa kasih harga Rp ${offeredPrice.toLocaleString('id-ID')}/pcs (diskon ${discount}%). Totalnya Rp ${total.toLocaleString('id-ID')}. Ini lebih murah dari sebelumnya lho. Gimana kak?`
        } else {
          aiMessage = `Maaf kak, untuk ${session.quantity} pcs, harga Rp ${offeredPrice.toLocaleString('id-ID')}/pcs (diskon ${discount}%) memang sudah harga terbaik yang bisa kami berikan. Totalnya Rp ${total.toLocaleString('id-ID')}. Sudah diskon ${discount}% dari harga normal Rp ${unitPrice.toLocaleString('id-ID')}/pcs ya kak 🙏`
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
