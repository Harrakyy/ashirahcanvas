import { Button } from '@/components/ui/button'
import PriceTicker from '@/features/canvas/components/PriceTicker'

interface ReviewModeProps {
  basePrice: number
  logoPrice: number
  textPrice: number
  subtotal: number
  quantities: { [key: string]: number }
  onQuantityChange: (size: string, value: number) => void
  sizes: string[]
  totalQty: number
  total: number
  onCustomNow: () => void
  onSimulateCheckout?: () => void
  isSimulatingCheckout?: boolean
  isQuoteLoading?: boolean
  moq?: number
}

export default function ReviewMode({
  basePrice,
  logoPrice,
  textPrice,
  subtotal,
  quantities,
  onQuantityChange,
  sizes,
  totalQty,
  total,
  onCustomNow,
  onSimulateCheckout,
  isSimulatingCheckout = false,
  isQuoteLoading = false,
  moq = 12,
}: ReviewModeProps) {
  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Ringkasan Pesanan</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Price Breakdown Modularized Component */}
        <PriceTicker
          basePrice={basePrice}
          logoPrice={logoPrice}
          textPrice={textPrice}
          subtotal={subtotal}
          isQuoteLoading={isQuoteLoading}
        />

        {/* Quantity Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Jumlah Pesanan</h3>
            {totalQty >= 12 ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                🎉 Diskon Grosir Aktif (Nego AI)
              </span>
            ) : totalQty > 0 ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Harga Normal
              </span>
            ) : null}
          </div>
          <div className="space-y-2">
            {sizes.map((size) => (
              <div key={size} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700 flex-1">{size}</span>
                <input
                  type="number"
                  min="0"
                  value={quantities[size]}
                  onChange={(e) => onQuantityChange(size, parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 bg-white border-2 border-gray-300 rounded-md text-sm text-center font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-950 focus:border-blue-950 transition"
                />
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total:</span>
            <div className="text-right">
              <span className="text-sm font-bold text-gray-900">
                {totalQty} pcs
              </span>
            </div>
          </div>

          {totalQty > 0 && totalQty < 12 && (
            <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span>💡</span>
                <span>Pesan <strong>{12 - totalQty} pcs</strong> lagi untuk dapat diskon khusus (min. 12 pcs).</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const diff = 12 - totalQty
                  const targetSize = Object.entries(quantities).find(([_, q]) => q > 0)?.[0] || 'L'
                  onQuantityChange(targetSize, (quantities[targetSize] || 0) + diff)
                }}
                className="shrink-0 font-bold text-[11px] text-blue-700 underline hover:text-blue-900 cursor-pointer"
              >
                + Jadi 12 pcs
              </button>
            </div>
          )}
        </div>

        {/* Total Price */}
        <div className="space-y-3 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <span className="text-sm font-medium text-gray-700">Total Pesanan:</span>
          <div className="text-3xl font-bold text-blue-950">
            Rp {total.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Footer - Button */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <Button
          onClick={onCustomNow}
          disabled={totalQty === 0}
          className={`w-full font-bold h-12 text-base rounded-full ${
            totalQty === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#1A2B56] hover:bg-[#243B6B] text-white cursor-pointer shadow-md'
          }`}
        >
          Custom Now
        </Button>
        {onSimulateCheckout && (
          <Button
            onClick={onSimulateCheckout}
            disabled={isSimulatingCheckout || totalQty === 0}
            className={`w-full gap-2 bg-[#1A2B56] hover:bg-[#243B6B] text-white font-bold h-10 rounded-full shadow-xs cursor-pointer ${
              totalQty === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Simulasi Checkout (Blueprint Demo)
          </Button>
        )}
        {totalQty === 0 && (
          <p className="text-xs text-gray-400 text-center">
            Masukkan jumlah pesanan terlebih dahulu (Bisa pesan mulai 1 pcs)
          </p>
        )}
      </div>
    </>
  )
}
