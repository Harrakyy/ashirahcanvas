import { NextResponse } from 'next/server'
import { createSession } from '@/lib/server/session-store'
import { generateNegotiationResponse } from '@/lib/server/groq'
import {
  getInitialTier,
  getOfferedPrice,
  validateAIResponse,
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

SITUASI: Customer baru buka chat untuk negosiasi harga ${category.toLowerCase()} custom. Mereka belum order — masih mau diskusi harga.
Buat kalimat sapaan seperti ini: sapa dengan "Hai kak!" + emoji, lalu ucapkan terima kasih sudah tertarik dengan ${category.toLowerCase()} custom Ashirah + emoji, lalu tanya ada yang bisa dibantu + emoji.
Jangan bilang "selamat datang". Jangan sebut syarat diskon dulu. Maksimal 2 kalimat.`
      } else {
        systemPrompt = `${BASE_PERSONA_PROMPT}

SITUASI: Customer baru buka chat untuk negosiasi harga ${category.toLowerCase()} custom. Mereka belum order — masih mau diskusi harga.
Buat kalimat sapaan seperti ini: sapa dengan "Hai kak!" + emoji, lalu ucapkan terima kasih sudah tertarik dengan ${category.toLowerCase()} custom Ashirah + emoji, lalu tanya ada yang bisa dibantu + emoji.
Jangan bilang "selamat datang". Jangan sebut diskon atau harga dulu. Maksimal 2 kalimat.`
      }

      const greeting = await generateNegotiationResponse(systemPrompt, '(sapa customer)', 'init')
      initialMessage = validateAIResponse(greeting, session)
    } catch {
      const unitPrice = quote.unitPrice
      if (totalQty < MINIMUM_ORDER_FOR_DISCOUNT) {
        initialMessage = `Halo kak! 👋 Terima kasih sudah tertarik dengan ${category.toLowerCase()} custom Ashirah. Untuk pesanan ${totalQty} pcs (${color}), harga normalnya Rp ${unitPrice.toLocaleString('id-ID')}/pcs ya kak. Sayangnya minimal ${MINIMUM_ORDER_FOR_DISCOUNT} pcs baru bisa dapat diskon. Kalau mau tambah quantity, nanti saya bantu hitung yang terbaik! 😊`
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
