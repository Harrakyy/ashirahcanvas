import { NextResponse } from 'next/server'
import { buildPriceQuote } from '@/lib/server/pricing'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const category = searchParams.get('category')

    if (!productId || !category) {
      return NextResponse.json(
        { error: 'productId dan category diperlukan' },
        { status: 400 }
      )
    }

    const quote = buildPriceQuote(productId, category)
    return NextResponse.json(quote)
  } catch {
    return NextResponse.json({ error: 'Gagal mengambil harga' }, { status: 500 })
  }
}
