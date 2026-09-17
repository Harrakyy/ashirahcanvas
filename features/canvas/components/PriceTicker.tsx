'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface PriceTickerProps {
  basePrice: number
  logoPrice?: number
  textPrice?: number
  subtotal?: number
  isQuoteLoading?: boolean
  className?: string
  compact?: boolean
}

export default function PriceTicker({
  basePrice,
  logoPrice = 0,
  textPrice = 0,
  subtotal,
  isQuoteLoading = false,
  className = '',
  compact = false,
}: PriceTickerProps) {
  const calculatedSubtotal = subtotal ?? basePrice + logoPrice + textPrice

  if (compact) {
    return (
      <div className={`p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center justify-between text-xs ${className}`}>
        <span className="text-gray-600 font-medium">Harga Dasar:</span>
        {isQuoteLoading ? (
          <Skeleton className="h-4 w-20" />
        ) : (
          <span className="font-bold text-blue-950">
            Rp {basePrice > 0 ? basePrice.toLocaleString('id-ID') : '0'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900">Rincian Harga</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm items-center">
          <span className="text-gray-700">Harga Dasar:</span>
          {isQuoteLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <span className="font-medium text-gray-900">
              Rp {basePrice.toLocaleString('id-ID')}
            </span>
          )}
        </div>
        <div className="flex justify-between text-sm text-gray-600 items-center">
          <span>+ Logo Sablon:</span>
          {isQuoteLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <span>Rp {logoPrice.toLocaleString('id-ID')}</span>
          )}
        </div>
        <div className="flex justify-between text-sm text-gray-600 items-center">
          <span>+ Teks Tambahan:</span>
          {isQuoteLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <span>Rp {textPrice.toLocaleString('id-ID')}</span>
          )}
        </div>
        <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
          <span className="font-medium text-gray-900">Subtotal per pcs:</span>
          {isQuoteLoading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <span className="font-bold text-blue-950 text-base">
              Rp {calculatedSubtotal.toLocaleString('id-ID')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
