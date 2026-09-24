import { NextResponse } from 'next/server'
import { confirmOrderPaymentManual } from '@/lib/server/order'
import { getCurrentUser } from '@/lib/server/auth'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya admin konveksi yang dapat mengonfirmasi pembayaran.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { orderId, type, note } = body

    if (!orderId || !type || (type !== 'dp' && type !== 'final')) {
      return NextResponse.json(
        { error: 'orderId dan type ("dp" | "final") wajib disertakan' },
        { status: 400 }
      )
    }

    const result = await confirmOrderPaymentManual(
      orderId,
      type,
      user.id,
      note || `Pembayaran ${type === 'dp' ? 'DP 70%' : 'Pelunasan 30%'} dikonfirmasi manual oleh ${user.name}`
    )

    return NextResponse.json({
      success: true,
      message: `Pembayaran ${type === 'dp' ? 'DP 70%' : 'Pelunasan 30%'} berhasil dikonfirmasi lunas.`,
      result,
    })
  } catch (error: any) {
    console.error('[Manual Payment API] error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal mengonfirmasi pembayaran' },
      { status: 500 }
    )
  }
}
