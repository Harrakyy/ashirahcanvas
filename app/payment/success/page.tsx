'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { CheckCircle2, Eye } from 'lucide-react'
import VendorBlueprintModal, {
  BLUEPRINT_STORAGE_KEY,
} from '@/components/vendor-blueprint-modal'

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [blueprintOpen, setBlueprintOpen] = useState(false)

  // Take-Home Test seam: buka modal blueprint otomatis saat checkout selesai
  // — hanya jika snapshotAllZones() sudah menyimpan data ke sessionStorage.
  useEffect(() => {
    try {
      if (
        sessionStorage.getItem(BLUEPRINT_STORAGE_KEY) ||
        sessionStorage.getItem('canvas_blueprint') ||
        localStorage.getItem('canvas_blueprint') ||
        localStorage.getItem(BLUEPRINT_STORAGE_KEY)
      ) {
        setBlueprintOpen(true)
      }
    } catch {
      // storage tidak tersedia — lewati auto-open
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-100/70 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/5 border border-black/[0.06] p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center shadow-2xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Terima kasih!
          </h1>
          <p className="text-xs text-neutral-500 font-normal">
            Pesanan dan spesifikasi desain Anda sedang diproses.
          </p>
        </div>

        {orderId && (
          <div className="bg-neutral-50/80 border border-black/[0.06] rounded-2xl p-3.5 text-left">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-0.5">Order ID</p>
            <p className="text-xs font-mono font-semibold text-neutral-900 break-all">
              {orderId}
            </p>
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => setBlueprintOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white font-medium rounded-xl text-xs transition shadow-xs"
          >
            <Eye className="w-4 h-4" />
            Lihat Blueprint Vendor
          </button>
          <Link
            href="/editor"
            className="block w-full py-2.5 px-4 border border-neutral-200/80 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-xl text-xs transition text-center active:scale-[0.98]"
          >
            Kembali ke Editor
          </Link>
        </div>
      </div>

      <VendorBlueprintModal
        open={blueprintOpen}
        onOpenChange={setBlueprintOpen}
      />
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
