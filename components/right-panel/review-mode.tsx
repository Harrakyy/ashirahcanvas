import { Button } from '@/components/ui/button'

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
}: ReviewModeProps) {
  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Ringkasan Pesanan</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Price Breakdown */}
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900">Rincian Harga</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Harga per pcs:</span>
              <span className="font-medium text-gray-900">
                Rp {basePrice.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>+ Logo:</span>
              <span>Rp {logoPrice.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>+ Teks tambahan:</span>
              <span>Rp {textPrice.toLocaleString('id-ID')}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between">
              <span className="font-medium text-gray-900">Subtotal per pcs:</span>
              <span className="font-bold text-gray-900">
                Rp {subtotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Quantity Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Jumlah Pesanan</h3>
          <div className="space-y-2">
            {sizes.map(size => (
              <div key={size} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700 flex-1">{size}</span>
                <input
                  type="number"
                  min="0"
                  value={quantities[size]}
                  onChange={e =>
                    onQuantityChange(size, parseInt(e.target.value) || 0)
                  }
                  className="w-20 px-3 py-2 bg-white border-2 border-gray-300 rounded-md text-sm text-center font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-950 focus:border-blue-950 transition"
                />
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-200 flex justify-between">
            <span className="text-sm font-medium text-gray-700">Total:</span>
            <span className="text-sm font-bold text-gray-900">{totalQty} pcs</span>
          </div>
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
          className={`w-full font-bold py-6 text-lg ${
            totalQty === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-950 hover:bg-blue-900 text-white'
          }`}
        >
          Custom Now
        </Button>
        {totalQty === 0 && (
          <p className="text-xs text-gray-400 text-center">
            Masukkan jumlah pesanan terlebih dahulu
          </p>
        )}
      </div>
    </>
  )
}
