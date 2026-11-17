import { NextResponse } from 'next/server'
import { getDuitkuPaymentMethods } from '@/lib/server/duitku'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const amountParam = searchParams.get('amount')

    if (!amountParam || isNaN(Number(amountParam))) {
      return NextResponse.json(
        { error: 'Query parameter amount is required and must be a number.' },
        { status: 400 }
      )
    }

    const amount = parseInt(amountParam, 10)

    if (amount < 10000) {
      return NextResponse.json(
        { error: 'Minimum amount is Rp 10,000.' },
        { status: 400 }
      )
    }

    const methods = await getDuitkuPaymentMethods(amount)

    return NextResponse.json({ methods })
  } catch (error) {
    console.error('[AshirahBot] Failed to fetch Duitku payment methods:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve payment methods.' },
      { status: 500 }
    )
  }
}
