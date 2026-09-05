import { NextResponse } from 'next/server'
import { createSession } from '@/lib/server/session-store'
import { generateNegotiationResponse } from '@/lib/server/groq'
import {
  getInitialTier,
  getDiscountPercent,
  getOfferedPrice,
  getTotalPrice,
  buildSystemPrompt,
  validateAIResponse,
  MINIMUM_ORDER_FOR_DISCOUNT,
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
      const unitPrice = quote.unitPrice
      const discount = getDiscountPercent(initialTier)
      const offeredPrice = getOfferedPrice(session)
      const totalPrice = getTotalPrice(session)

      let systemPrompt: string
      if (totalQty < MINIMUM_ORDER_FOR_DISCOUNT) {
        systemPrompt = `Kamu adalah AshirahBot, asisten virtual resmi dari Ashirah Group (ashiragroup.id).

GAYA BAHASA & KARAKTER:
- Gunakan bahasa Indonesia yang santai, ramah, komunikatif, dan kasual (seperti customer service distro/brand apparel lokal yang modern, bukan formal kaku seperti bank).
- Gunakan sapaan yang akrab seperti "Kak" atau "Kakak".
- Hindari kalimat teoretis, panjang lebar, atau terlalu formal. Jawab langsung to the point, ramah, dan solutif.
- Gunakan emoji secukupnya (tidak berlebihan).
- JANGAN PERNAH menyebutkan kode warna hex (seperti #FFFFFF, #000000) kepada customer. Selalu terjemahkan dan sebutkan nama warnanya (misal: Putih, Hitam, Merah, Biru, dll).

SITUASI:
Customer memesan ${totalQty} pcs kaos custom (${color}).
Pesan ${totalQty} pcs belum mencapai minimum ${MINIMUM_ORDER_FOR_DISCOUNT} pcs untuk mendapatkan diskon.
Sapa customer dengan hangat, sebutkan jumlah pesanan, dan jelaskan dengan sopan bahwa minimum ${MINIMUM_ORDER_FOR_DISCOUNT} pcs untuk dapat diskon.
Jika customer ingin diskon, sarankan untuk menambah jumlah pesanan.

INFO HARGA:
- Harga normal: Rp ${unitPrice.toLocaleString('id-ID')}/pcs.
- Total: Rp ${(unitPrice * totalQty).toLocaleString('id-ID')}.`
      } else {
        systemPrompt = `Kamu adalah AshirahBot, asisten virtual resmi dari Ashirah Group (ashiragroup.id).

GAYA BAHASA & KARAKTER:
- Gunakan bahasa Indonesia yang santai, ramah, komunikatif, dan kasual (seperti customer service distro/brand apparel lokal yang modern, bukan formal kaku seperti bank).
- Gunakan sapaan yang akrab seperti "Kak" atau "Kakak".
- Hindari kalimat teoretis, panjang lebar, atau terlalu formal. Jawab langsung to the point, ramah, dan solutif.
- Gunakan emoji secukupnya (tidak berlebihan).
- JANGAN PERNAH menyebutkan kode warna hex (seperti #FFFFFF, #000000) kepada customer. Selalu terjemahkan dan sebutkan nama warnanya (misal: Putih, Hitam, Merah, Biru, dll).

SITUASI:
Customer memesan ${totalQty} pcs kaos custom (${color}).
Kamu menawarkan diskon tier ${initialTier} sebesar ${discount}%.
Harga spesial: Rp ${offeredPrice.toLocaleString('id-ID')}/pcs (sebelumnya Rp ${unitPrice.toLocaleString('id-ID')}/pcs).
Total: Rp ${totalPrice.toLocaleString('id-ID')}.

Sapa customer dengan hangat, sebutkan jumlah pesanan, dan langsung tawarkan harga diskon ini.`
      }

      const greeting = await generateNegotiationResponse(systemPrompt, '(sapa customer)', 'init')
      initialMessage = validateAIResponse(greeting, session)
    } catch {
      const unitPrice = quote.unitPrice
      if (totalQty < MINIMUM_ORDER_FOR_DISCOUNT) {
        initialMessage = `Halo kak! 👋 Terima kasih sudah tertarik dengan kaos custom Ashirah. Untuk pesanan ${totalQty} pcs (${color}), harga normalnya Rp ${unitPrice.toLocaleString('id-ID')}/pcs ya kak. Sayangnya minimal ${MINIMUM_ORDER_FOR_DISCOUNT} pcs baru bisa dapat diskon. Kalau mau tambah quantity, nanti saya bantu hitung yang terbaik! 😊`
      } else {
        const offeredPrice = getOfferedPrice(session)
        const totalPrice = getTotalPrice(session)
        const discount = getDiscountPercent(initialTier)
        initialMessage = `Halo kak! 👋 Terima kasih sudah tertarik dengan kaos custom Ashirah. Untuk pesanan ${totalQty} pcs (${color}), saya bisa kasih harga spesial Rp ${offeredPrice.toLocaleString('id-ID')}/pcs (diskon ${discount}%). Totalnya Rp ${totalPrice.toLocaleString('id-ID')}. Gimana kak, berminat? 😊`
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
