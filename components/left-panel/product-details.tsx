'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProductSwitcherDialog } from '@/components/product-switcher-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import PriceTicker from '@/features/canvas/components/PriceTicker'
import { useDesignStore } from '@/store/design-store'
import { getProductById } from '@/lib/config/products'
import { Info, Ruler } from 'lucide-react'

interface ProductDetailsProps {
  selectedColor: string
  onColorChange: (color: string) => void
  colors: string[]
  disabledColors?: string[]
  selectedSize: string
  onSizeChange: (size: string) => void
  sizes: string[]
  basePrice: number
  logoPrice: number
  textPrice: number
  subtotal: number
  isQuoteLoading?: boolean
}

/* PLACEHOLDER MEASUREMENT - perlu diganti data asli dari admin/vendor sebelum production */
const SIZE_CHART = [
  { size: 'S', chest: '48 cm', length: '68 cm' },
  { size: 'M', chest: '50 cm', length: '70 cm' },
  { size: 'L', chest: '52 cm', length: '72 cm' },
  { size: 'XL', chest: '54 cm', length: '74 cm' },
  { size: '2XL', chest: '56 cm', length: '76 cm' },
  { size: '3XL', chest: '58 cm', length: '78 cm' },
  { size: '4XL', chest: '60 cm', length: '80 cm' },
  { size: '5XL', chest: '62 cm', length: '82 cm' },
]

export default function ProductDetails({
  selectedColor,
  onColorChange,
  colors,
  disabledColors = [],
  selectedSize,
  onSizeChange,
  sizes,
  basePrice,
  logoPrice,
  textPrice,
  subtotal,
  isQuoteLoading = false,
}: ProductDetailsProps) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false)

  const { selectedProductId, selectedCategory } = useDesignStore()

  const currentProduct = getProductById(selectedProductId, selectedCategory)
  const productName = currentProduct?.name || 'Premium Cotton T-shirt'
  const productDescription =
    currentProduct?.description ||
    'Premium cotton t-shirt dengan material berkualitas tinggi, nyaman dipakai sepanjang hari. Cocok untuk kebutuhan personal atau corporate branding dengan hasil cetak yang sempurna.'
  const productSpecs = currentProduct?.material || '100% cotton ring spun preshrunk jersey knit'

  return (
    <div className="p-4 space-y-6">
      {/* Product Card */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">{productName}</h3>
        <p className="text-sm text-gray-500">{productDescription}</p>

        {/* Pricing Summary Badge / Skeleton */}
        <PriceTicker basePrice={basePrice} isQuoteLoading={isQuoteLoading} compact />

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setIsDetailsOpen(true)}
            className="flex-1 text-xs bg-blue-950 hover:bg-blue-900 text-white font-medium"
          >
            Product Details
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs bg-blue-950 hover:bg-blue-900 text-white font-medium"
            onClick={() => setIsSwitcherOpen(true)}
          >
            Ganti Produk
          </Button>
        </div>
      </div>

      <ProductSwitcherDialog isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />

      {/* Product Details Modal (2.2) */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Info className="w-5 h-5 text-blue-950" />
              Spesifikasi Detail Produk
            </DialogTitle>
            <DialogDescription>Rincian bahan & spesifikasi teknis dari produk aktif.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Nama Produk</p>
              <p className="font-bold text-gray-900">{productName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Bahan / Material</p>
              <p className="text-gray-700">{productSpecs}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Deskripsi</p>
              <p className="text-gray-600 text-xs leading-relaxed">{productDescription}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center text-xs">
              <span className="text-gray-600">Estimasi Harga Dasar:</span>
              <span className="font-bold text-blue-950 text-sm">
                Rp {basePrice > 0 ? basePrice.toLocaleString('id-ID') : '100.000'} / pcs
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Size Guide Modal (2.4) */}
      <Dialog open={isSizeGuideOpen} onOpenChange={setIsSizeGuideOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Ruler className="w-5 h-5 text-blue-950" />
              Panduan Ukuran (Size Chart)
            </DialogTitle>
            <DialogDescription>Tabel estimasi ukuran pakaian (dalam cm).</DialogDescription>
          </DialogHeader>

          {/* PLACEHOLDER MEASUREMENT COMMENT */}
          <div className="space-y-3 py-2">
            <div className="border rounded-lg overflow-hidden border-gray-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 font-bold text-gray-700 border-b">
                  <tr>
                    <th className="p-2.5">Ukuran</th>
                    <th className="p-2.5">Lebar Dada</th>
                    <th className="p-2.5">Panjang Badan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {SIZE_CHART.map((row) => (
                    <tr key={row.size} className="hover:bg-gray-50">
                      <td className="p-2.5 font-bold text-blue-950">{row.size}</td>
                      <td className="p-2.5 text-gray-600">{row.chest}</td>
                      <td className="p-2.5 text-gray-600">{row.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 italic text-center">
              * Ukuran dapat bervariasi ±1-2 cm tergantung toleransi jahit pabrik.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sizes */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">Ukuran Target</span>
          <button
            type="button"
            onClick={() => setIsSizeGuideOpen(true)}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Panduan Ukuran
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() => onSizeChange(size)}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                selectedSize === size ? 'bg-blue-950 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">
          Warna:{' '}
          <span className="font-semibold">
            {selectedColor === '#000000'
              ? 'Hitam'
              : selectedColor === '#FFFFFF'
                ? 'Putih'
                : selectedColor === '#FF0000'
                  ? 'Merah'
                  : selectedColor === '#0000FF'
                    ? 'Biru'
                    : 'Custom'}
          </span>
        </h4>
        <div className="grid grid-cols-8 gap-2">
          {colors.map((color) => {
            const isDisabled = disabledColors.includes(color)
            return (
              <button
                key={color}
                onClick={() => {
                  if (isDisabled) return
                  onColorChange(color)
                }}
                disabled={isDisabled}
                className={`w-8 h-8 rounded-full transition-all ring-offset-2 ${
                  isDisabled
                    ? 'opacity-25 cursor-not-allowed'
                    : selectedColor === color
                      ? 'ring-2 ring-blue-950 ring-offset-2'
                      : 'hover:ring-2 hover:ring-gray-400 hover:ring-offset-1'
                }`}
                style={{
                  backgroundColor: color,
                  border: isDisabled ? '1px solid #e5e7eb' : selectedColor === color ? '2px solid #1a1a4d' : '1px solid #d1d5db',
                }}
                title={isDisabled ? `${color} (segera hadir)` : color}
              />
            )
          })}
        </div>
      </div>

      {/* Specifications */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Spesifikasi</h4>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex gap-2">
            <span>•</span>
            <span>{productSpecs}</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Comfortable fit dengan breathable fabric</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Tahan lama hingga 50+ kali pencucian</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Tersedia dalam 8 pilihan ukuran (S hingga 5XL)</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
