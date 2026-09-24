import { NextResponse } from 'next/server'
import { shipping } from '@/lib/server/shipping'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { destinationPostalCode, originPostalCode, quantity = 1, category = 'tshirts' } = body

    if (!destinationPostalCode) {
      return NextResponse.json(
        { error: 'Kode pos tujuan pengiriman wajib diisi' },
        { status: 400 }
      )
    }

    // Per-item weight estimate in grams
    const weightMap: Record<string, number> = {
      tshirts: 200,
      polo: 250,
      sport: 180,
      jackets: 550,
    }
    const unitWeight = weightMap[category] || 200
    const totalWeight = Math.max(unitWeight * Number(quantity), 200)

    const origin = originPostalCode || '40132' // Default Bandung warehouse

    const rates = await shipping.getRates({
      originPostalCode: origin,
      destinationPostalCode: String(destinationPostalCode),
      items: [
        {
          name: `Custom Apparel (${category})`,
          quantity: Number(quantity),
          value: 85000 * Number(quantity),
          weight: totalWeight,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      rates,
      totalWeightGrams: totalWeight,
    })
  } catch (error) {
    console.error('[Shipping API] rates error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil tarif pengiriman ekspedisi' },
      { status: 500 }
    )
  }
}
