'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { CheckCircle2 } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Terima kasih!
          </h1>
          <p className="text-gray-500">
            Pesanan Anda sedang diproses.
          </p>
        </div>

        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Order ID</p>
            <p className="text-sm font-mono font-semibold text-gray-900 break-all">
              {orderId}
            </p>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Link
            href="/"
            className="block w-full py-2.5 px-4 bg-blue-950 hover:bg-blue-900 text-white font-medium rounded-lg text-sm transition text-center"
          >
            Kembali ke Beranda
          </Link>
          <Link
            href="/editor"
            className="block w-full py-2.5 px-4 border-2 border-blue-950 text-blue-950 hover:bg-blue-50 font-medium rounded-lg text-sm transition text-center"
          >
            Buat Desain Baru
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Memuat...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
