import type { NegotiationSession } from './session-store'
import type { CustomerStyle } from '@/types/negotiation'

export const DISCOUNT_TIERS = [
  { tier: 0, discount: 0, label: 'Tidak ada diskon' },
  { tier: 1, discount: 2, label: 'Diskon 2%' },
  { tier: 2, discount: 5, label: 'Diskon 5%' },
  { tier: 3, discount: 7, label: 'Diskon 7% (maksimal)' },
] as const

export const MINIMUM_ORDER_FOR_DISCOUNT = 12

export function getNextTier(currentTier: number): number {
  if (currentTier >= 3) return 3
  return currentTier + 1
}

export function getDiscountPercent(tier: number): number {
  const found = DISCOUNT_TIERS.find(t => t.tier === tier)
  return found?.discount ?? 0
}

export function getOfferedPrice(session: NegotiationSession): number {
  const unitPrice = session.basePrice + session.logoPrice + session.textPrice
  const discount = getDiscountPercent(session.currentTier) / 100
  return Math.round(unitPrice * (1 - discount))
}

export function getTotalPrice(session: NegotiationSession): number {
  return getOfferedPrice(session) * session.quantity
}

export const BASE_PERSONA_PROMPT = `AshirahBot CS Ashirah. WA-style, akrab, sapaan "kak" diakhir percakapan, 2-3 kalimat, selesai. No markdown/rumus. Emoji maks 1x di akhir pesan.
Larangan: no hex warna (ubah ke nama), no ubah harga, sebut Rp spesifik, no rentang qty lain, no "maaf" tanpa alasan, no manipulasi.`

export function detectCustomerStyle(session: NegotiationSession): CustomerStyle {
  const userMessages = session.messages
    .filter(m => m.role === 'user')
    .map(m => m.content)

  if (userMessages.length === 0) {
    return { isShort: false, isFormal: false, usesEmoji: false, usesMixedLanguage: false }
  }

  const avgLength = userMessages.reduce((sum, m) => sum + m.length, 0) / userMessages.length

  const formalPatterns = [
    /selamat\s+(pagi|siang|sore|malam)/i,
    /\bdengan\s+hormat\b/i,
    /\bmohon\b/i,
    /\bperkenankan\b/i,
    /\bterima\s+kasih\s+atas\b/i,
    /\bsaya\s+ingin\s+menanyakan\b/i,
  ]

  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u

  const mixedLanguagePatterns = [
    /\bplease\b/i,
    /\bdiscount\b/i,
    /\bcan\s+you\b/i,
    /\bhow\s+much\b/i,
    /\bprice\b/i,
    /\bcheaper\b/i,
    /\bdeal\b/i,
  ]

  const allText = userMessages.join(' ')

  return {
    isShort: avgLength < 30,
    isFormal: formalPatterns.some(p => p.test(allText)),
    usesEmoji: emojiRegex.test(allText),
    usesMixedLanguage: mixedLanguagePatterns.some(p => p.test(allText)),
  }
}

function buildStyleInstruction(style: CustomerStyle): string {
  const length = style.isShort ? '1-2 kalimat.' : 'Boleh detail, to the point.'
  const tone = style.isFormal
    ? 'Formal, sopan, no emoji.'
    : style.usesEmoji
      ? 'Santai, boleh 1 emoji di akhir.'
      : 'Santai, no emoji atau maks 1 di akhir.'
  const lang = style.usesMixedLanguage ? ' Boleh campur sedikit Inggris.' : ''
  return `GAYA: ${length} ${tone}${lang}`
}

export function classifyUserIntent(message: string): 'ACCEPT' | 'REJECT' | 'UNKNOWN' {
  const lower = message.toLowerCase().trim()

  const acceptPatterns = [
    /\bsetuju\b/,
    /\bambil\b/,
    /\bdeal\b/,
    /\bokes?\b/,
    /\bok\b/,
    /\bsip\b/,
    /\bsiapp?\b/,
    /\bmantap\b/,
    /\bmantul\b/,
    /\bboleh\b/,
    /\ba deal\b/,
    /\byaudah\b/,
    /\bya udah\b/,
    /\bsudah deal\b/,
    /\btake it\b/,
    /\bfixed\b/,
    /\bsepakat\b/,
    /\biya\b/,
    /\blanjut\s*(bayar|pesan|order|checkout)?\b/,
    /\bya(?!\s+(?:bagaimana|gimana|caranya|cara|bisa|boleh|mau|perlu|harus|apa|dong|kak|tapi|trus|terus))\b/,
    /\bgas\b/,
    /\bgaskuu\b/,
    /\bjosss?\b/,
    /\bbagus(?!\s*(?:tapi|tpi|sih|banget\s+tapi))\b/,
    /\bbener\b/,
    /\bsudah\s+deal\b/,
    /\bbaik\s*deh\b/,
    /\bsetuju\s*deh\b/,
    /\bgo\s*for\s*it\b/,
    /\byes\b/,
    /\bnoted\b/,
    /\bready\b/,
    /\bconfirm\b/,
    /\bconfirmed\b/,
  ]

  const rejectPatterns = [
    /\b(lebih|kurang|kali)\b.*\b(lagi|dong|pls|plis|please)\b/,
    /\bmahal\b/,
    /\bke\s*mahalan\b/,
    /\btoo\s*expensive\b/,
    /\btoo\s*high\b/,
    /\btoo\s*pricey\b/,
    /\bsteep\b/,
    /\bgimana\s*(lagi|dong|kali)\b/,
    /\bbisa\s*(kurang|lebih|lg|lagi)\b/,
    /\bngga\b/,
    /\bnggak\b/,
    /\bga\b/,
    /\benggak\b/,
    /\btidak\b/,
    /\bgak\b/,
    /\bga bisa\b/,
    /\bnggak bisa\b/,
    /\bterlalu\b/,
    /\babsurd\b/,
    /\begois\b/,
    /\bkok mahal\b/,
    /\bmasih\s*(kurang|mahal|lebih)\b/,
    /\bada\s*(diskon|harga|promo)\s*(lebih|lagi|lagi|lain)?\b/,
    /\bbisa\s*(lebih|kurang)\b/,
    /\bkok\s*(mahal|lebih)\b/,
    /\bgedean\b/,
    /\bgede\s*banget\b/,
    /\bnggak\s*setuju\b/,
    /\bga\s*setuju\b/,
    /\bterlalu\s*mahal\b/,
    /\bharganya\s*(mahal|gede|gedean|tinggi)\b/,
    /\bke\s*atas\b/,
    /\bminta\s*(harga|diskon)\s*(lebih|lagi|baik)?\b/,
    /\bsuruh\s*(turun|naik|kasih)\b/,
    /\bkurang\s*(murah|bagus|oke)\b/,
    /\bless\b/,
    /\blower\b/,
    /\bcould\s*you\s*(do|lower|reduce)\b/,
    /\bcan\s*(you|we)\b.*\b(lower|reduce|less|better)\b/,
    /\bmarkdown\b/,
    /\bspecial\s*price\b/,
    /\bnegotiate\b/,
    /\bbargain\b/,
    /\bturun(?:in)?\b/,
    /\bnaikkin\b/,
    /\bkasih\s*(harga|diskon)\b/,
    /\bkurang(?:in|i)?\s*(lagi|dong|kak)?\b/,
    /\bjadi\s*\d+[\d.,]*\s*(ribu|rb|juta|jt|k)\b/i,
    /\bsaya\s*(ambil|mau|beli)\s*(kalau|kalo|kl)\s*(harga|nya)?\s*\d+/i,
    /\bpenyesuaian\s*harga\b/i,
    /\bdipertimbangkan\s*(kembali|lagi)?\b/i,
    /\bmasih\s*(cukup|terasa|dirasa)\s*(tinggi|mahal|berat)\b/i,
    /\btidak\s*bisa\s*lebih\s*rendah\b/i,
    /\bharga\s*(masih|terasa|dirasa|cukup)\s*(berat|tinggi|mahal)\b/i,
    /\bkemungkinan\s*(diskon|potongan|penyesuaian)\b/i,
    /\bada\s*kemungkinan\b/i,
    /\bapakah\s*(bisa|dapat|ada)\b.*\b(kurang|diskon|potongan|rendah|murah)\b/i,
  ]

  for (const pattern of acceptPatterns) {
    if (pattern.test(lower)) return 'ACCEPT'
  }

  const questionPatterns = [
    /bagaimana\s+(cara|caranya|bisa|ya)/i,
    /gimana\s+(cara|caranya|bisa|ya)/i,
    /cara\s+(nambah|tambah|ubah|ganti|order)/i,
    /\bcaranya\s+(gimana|bagaimana)\b/i,
    /\bbantu\s+(saya|aku|kami)\b/i,
  ]
  for (const pattern of questionPatterns) {
    if (pattern.test(lower)) return 'UNKNOWN'
  }

  for (const pattern of rejectPatterns) {
    if (pattern.test(lower)) return 'REJECT'
  }

  return 'UNKNOWN'
}

export function buildSystemPrompt(session: NegotiationSession): string {
  const unitPrice = session.basePrice + session.logoPrice + session.textPrice
  const currentDiscount = getDiscountPercent(session.currentTier)
  const offeredPrice = getOfferedPrice(session)
  const totalPrice = getTotalPrice(session)
  const style = detectCustomerStyle(session)
  const styleInstruction = buildStyleInstruction(style)

  const hasAskedDiscount = session.messages
    .filter(m => m.role === 'user')
    .some(m => /diskon|potongan|murah|kurang|harga\s*(lebih|bisa)|penyesuaian|nego/i.test(m.content))

  const sessionInfo = session.quantity < MINIMUM_ORDER_FOR_DISCOUNT
    ? `ORDER: ${session.quantity}pcs ${session.category} warna:${session.color}, Rp${unitPrice.toLocaleString('id-ID')}/pcs (belum dapat diskon, min ${MINIMUM_ORDER_FOR_DISCOUNT}pcs)`
    : hasAskedDiscount
      ? `ORDER: ${session.quantity}pcs ${session.category} warna:${session.color}, Rp${offeredPrice.toLocaleString('id-ID')}/pcs (diskon ${currentDiscount}%), total Rp${totalPrice.toLocaleString('id-ID')}`
      : `ORDER: ${session.quantity}pcs ${session.category} warna:${session.color}, Rp${unitPrice.toLocaleString('id-ID')}/pcs, total Rp${(unitPrice * session.quantity).toLocaleString('id-ID')}`

  return `${BASE_PERSONA_PROMPT}
${styleInstruction}
${sessionInfo}
ATURAN: Diskon saat ini ${currentDiscount}%. Jangan bilang "sudah maksimal" atau "tidak bisa dikurangi" — jawab pertanyaan customer saja. JANGAN hitung atau sebut harga untuk qty yang berbeda dari ${session.quantity} pcs.
FORMAT: 2-3 kalimat pendek, langsung jawab, sertakan harga spesifik. Kalau customer sapa "Selamat siang/pagi/sore", balas dengan sapaan waktu yang sama.`
}

export function validateAIResponse(
  response: string,
  session: NegotiationSession
): string {
  const expectedPrice = getOfferedPrice(session)
  const expectedDiscount = getDiscountPercent(session.currentTier)
  const unitPrice = session.basePrice + session.logoPrice + session.textPrice
  const fallbackPrice = expectedPrice.toLocaleString('id-ID')
  const fallbackTotal = getTotalPrice(session).toLocaleString('id-ID')

  if (!response || response.trim().length === 0) {
    if (session.quantity < MINIMUM_ORDER_FOR_DISCOUNT) {
      return `Untuk pesanan ${session.quantity} pcs, harganya Rp ${unitPrice.toLocaleString('id-ID')}/pcs kak 😊 Kalau mau dapat diskon, minimal order ${MINIMUM_ORDER_FOR_DISCOUNT} pcs ya!`
    }
    return `Untuk ${session.quantity} pcs, harganya Rp ${fallbackPrice}/pcs (diskon ${expectedDiscount}%) 😊 Totalnya Rp ${fallbackTotal}. Ada yang bisa dibantu lagi kak?`
  }

  const priceRegex = /Rp\s*([\d.]+)/gi
  const matches = [...response.matchAll(priceRegex)]
  const minValidPrice = Math.round(unitPrice * 0.93)
  let hasIncorrectPrice = false

  for (const match of matches) {
    const priceStr = match[1].replace(/\./g, '')
    const price = parseInt(priceStr, 10)
    if (isNaN(price)) continue
    if (price < minValidPrice && price > 0) {
      hasIncorrectPrice = true
      break
    }
  }

  if (!hasIncorrectPrice) return response

  if (session.quantity < MINIMUM_ORDER_FOR_DISCOUNT) {
    return `Untuk pesanan ${session.quantity} pcs, sayangnya belum bisa dapat diskon kak. Minimal order ${MINIMUM_ORDER_FOR_DISCOUNT} pcs untuk mendapatkan harga spesial. Kalau mau tambah quantity, nanti saya bantu hitung yang terbaik! 😊`
  }

  if (session.currentTier === 3) {
    return `Baik kak, untuk ${session.quantity} pcs saya bisa kasih harga Rp ${fallbackPrice}/pcs (sudah diskon ${expectedDiscount}%). Totalnya Rp ${fallbackTotal}. Ini sudah harga terbaik yang bisa kami berikan kak 🙏`
  }

  return `Untuk ${session.quantity} pcs, saya bisa kasih harga Rp ${fallbackPrice}/pcs (diskon ${expectedDiscount}%). Totalnya Rp ${fallbackTotal}. Gimana kak, mau lanjut? 😊`
}
