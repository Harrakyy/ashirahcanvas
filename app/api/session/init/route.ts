import { NextResponse } from 'next/server'
import { createSession } from '@/lib/server/session-store'
import { generateNegotiationResponse } from '@/lib/server/groq'
import {
  getInitialTier,
  getOfferedPrice,
  MINIMUM_ORDER_FOR_DISCOUNT,
  BASE_PERSONA_PROMPT,
} from '@/lib/server/negotiation-state'
import { getProductById } from '@/lib/config/products'
import { buildPriceQuote } from '@/lib/server/pricing'

const MAX_ORDER_QTY = 10000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId, category, color, quantities } = body

    const totalQty: number = quantities

    if (
      typeof totalQty !== 'number' ||
      !Number.isInteger(totalQty) ||
      totalQty < 1 ||
      totalQty > MAX_ORDER_QTY
    ) {
      return NextResponse.json(
        { error: `Jumlah pesanan harus bilangan bulat antara 1 dan ${MAX_ORDER_QTY}` },
        { status: 400 }
      )
    }

    if (typeof productId !== 'string' || typeof category !== 'string') {
      return NextResponse.json(
        { error: 'productId dan category diperlukan' },
        { status: 400 }
      )
    }

    const quote = buildPriceQuote(productId, category)
    const initialTier = getInitialTier(totalQty)
    const sessionId = crypto.randomUUID()

    const now = Date.now()
    const session = {
      sessionId,
      productId,
      category,
      color,
      basePrice: quote.basePrice,
      logoPrice: quote.logoPrice,
      textPrice: quote.textPrice,
      quantity: totalQty,
      currentTier: initialTier as 0 | 1 | 2 | 3,
      agreedDiscount: null,
      messages: [] as { role: 'user' | 'assistant'; content: string; timestamp: number }[],
      createdAt: now,
      updatedAt: now,
    }

    let initialMessage: string

    try {
      let systemPrompt: string
      if (totalQty < MINIMUM_ORDER_FOR_DISCOUNT) {
        systemPrompt = `${BASE_PERSONA_PROMPT}
SITUASI: Greeting awal, customer belum order. Sapa "Hai kak!" + 1 emoji, terima kasih tertarik ${category.toLowerCase()} custom Ashirah, tanya ada yang bisa dibantu. No harga/diskon. Maks 2 kalimat.`
      } else {
        systemPrompt = `${BASE_PERSONA_PROMPT}
SITUASI: Greeting awal, customer belum order. Sapa "Hai kak!" + 1 emoji, terima kasih tertarik ${category.toLowerCase()} custom Ashirah, tanya ada yang bisa dibantu. JANGAN sebut harga/diskon/%. Maks 2 kalimat.`
      }

      const greeting = await generateNegotiationResponse(systemPrompt, '(sapa customer)', 'init')
      initialMessage = greeting.trim() || `Hai kak! 😊 Terima kasih sudah tertarik dengan ${category.toLowerCase()} custom Ashirah. Ada yang bisa dibantu?`
    } catch {
      const unitPrice = quote.unitPrice
      if (totalQty < MINIMUM_ORDER_FOR_DISCOUNT) {
        initialMessage = `Halo kak! 👋 Terima kasih sudah tertarik dengan ${category.toLowerCase()} custom Ashirah. Untuk pesanan ${totalQty} pcs (${color}), harga normalnya di Rp ${unitPrice.toLocaleString('id-ID')}/pcs 😊`
      } else {
        initialMessage = `Halo kak! 👋 Terima kasih sudah tertarik dengan ${category.toLowerCase()} custom Ashirah. Ada yang bisa dibantu kak? 😊`
      }
    }

    session.messages.push({
      role: 'assistant',
      content: initialMessage,
      timestamp: Date.now(),
    })

    await createSession(session)

    return NextResponse.json({
      sessionId,
      initialMessage,
      currentPrice: getOfferedPrice(session),
      tier: initialTier,
      totalQty,
      quote,
    })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat sesi negosiasi' }, { status: 500 })
  }
}
