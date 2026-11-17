'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, RotateCcw, ArrowRight, Sparkles, Check, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BLUEPRINT_STORAGE_KEY } from '@/features/canvas/utils/exportHelpers'
import type { Order } from './active-order-hero'

interface QuickReorderModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
}

export default function QuickReorderModal({
  order,
  isOpen,
  onClose,
}: QuickReorderModalProps) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>({
    S: 0,
    M: 6,
    L: 6,
    XL: 0,
    '2XL': 0,
  })

  if (!isOpen || !order) return null

  const firstItem = order.items?.[0]
  const unitPrice = firstItem?.unitPrice || 60000
  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0)
  const estimatedSubtotal = totalQty * unitPrice

  const handleQuantityChange = (size: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[size] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [size]: next }
    })
  }

  const handleConfirmReorder = () => {
    const repeatData = {
      orderNumber: order.orderNumber,
      blueprint: order.designBlueprint,
      items: Object.entries(quantities)
        .filter(([_, q]) => q > 0)
        .map(([size, quantity]) => ({
          productName: firstItem?.productName || 'Custom Apparel',
          color: firstItem?.color || 'White',
          size,
          quantity,
          unitPrice,
        })),
      tenantSlug: 'ashira-garment',
    }

    try {
      localStorage.setItem('repeatOrderData', JSON.stringify(repeatData))
      if (order.designBlueprint && Object.keys(order.designBlueprint).length > 0) {
        localStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(order.designBlueprint))
      }
    } catch (e) {
      console.error('Failed to save repeat order data:', e)
    }

    onClose()
    router.push(`/editor?repeat=true&order=${order.orderNumber}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E2E4E9] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EDEDF2] flex items-center justify-between bg-gradient-to-r from-blue-50/40 via-white to-[#F8F4FA]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#1A2B56]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F152E]">
                Pesan Ulang Desain Ini
              </h3>
              <p className="text-xs text-[#4C567A]">
                Pesanan #{order.orderNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#4C567A] hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Info Badge */}
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-start gap-2.5 text-xs text-[#1A2B56]">
            <Info className="w-4 h-4 text-[#1A2B56] shrink-0 mt-0.5" />
            <p>
              Desain sablon, logo, dan tata letak dari pesanan sebelumnya akan otomatis terpasang. Anda cukup menentukan jumlah dan ukuran baru.
            </p>
          </div>

          {/* Product Summary */}
          <div className="p-3.5 rounded-xl border border-[#EDEDF2] bg-[#F8F9FA] flex items-center justify-between">
            <div>
              <span className="text-xs text-[#4C567A] block">Model Pakaian</span>
              <span className="text-sm font-bold text-[#0F152E]">
                {firstItem?.productName || 'Kaos DTF Sablon'}
              </span>
              {firstItem?.color && (
                <span className="text-xs text-[#4C567A] block mt-0.5">
                  Warna Dasar: {firstItem.color}
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs text-[#4C567A] block">Harga Satuan</span>
              <span className="text-sm font-bold text-[#1A2B56]">
                Rp {unitPrice.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Quantity by Size Stepper */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-[#0F152E] uppercase tracking-wider block">
              Pilih Jumlah per Ukuran:
            </span>

            <div className="grid grid-cols-5 gap-2">
              {['S', 'M', 'L', 'XL', '2XL'].map((size) => (
                <div
                  key={size}
                  className="p-2.5 rounded-xl border border-[#E2E4E9] bg-white flex flex-col items-center justify-between text-center"
                >
                  <span className="text-xs font-bold text-[#0F152E]">{size}</span>
                  <div className="flex items-center gap-1.5 my-2">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(size, -1)}
                      className="w-5 h-5 rounded-full bg-[#EDEDF2] hover:bg-[#E2E4E9] text-[#0F152E] flex items-center justify-center text-xs font-bold transition"
                    >
                      -
                    </button>
                    <span className="text-xs font-semibold w-4">
                      {quantities[size] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(size, 1)}
                      className="w-5 h-5 rounded-full bg-blue-100 hover:bg-blue-200 text-[#1A2B56] flex items-center justify-center text-xs font-bold transition"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[10px] text-[#4C567A]">pcs</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price Calculation Summary */}
          <div className="p-3.5 rounded-xl border border-[#EDEDF2] bg-white flex items-center justify-between">
            <div>
              <span className="text-xs text-[#4C567A] block">Total Kuantitas Baru</span>
              <span className="text-sm font-bold text-[#0F152E]">
                {totalQty} Pcs Baju
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#4C567A] block">Estimasi Subtotal</span>
              <span className="text-base font-bold text-[#1A2B56]">
                Rp {estimatedSubtotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#F8F9FA] border-t border-[#EDEDF2] flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-[#C4C8D8] text-[#1A2B56] hover:bg-white rounded-full text-xs font-bold h-9 px-4 cursor-pointer"
          >
            Batal
          </Button>

          <Button
            size="sm"
            onClick={handleConfirmReorder}
            disabled={totalQty <= 0}
            className="bg-[#1A2B56] hover:bg-[#243B6B] text-white rounded-full text-xs font-bold h-9 px-5 gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Buka di Editor & Checkout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
