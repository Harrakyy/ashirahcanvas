'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProductSwitcherDialog } from '@/components/product-switcher-dialog'
import { useDesignStore } from '@/store/design-store'
import { getProductById, productsByCategory } from '@/lib/config/products'

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
}

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
}: ProductDetailsProps) {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const { selectedProductId, selectedCategory } = useDesignStore()
  
  const currentProduct = getProductById(selectedProductId, selectedCategory)
  const productName = currentProduct?.name || 'Premium Cotton T-shirt'
  const productDescription = currentProduct?.description || 'Premium cotton t-shirt dengan material berkualitas tinggi, nyaman dipakai sepanjang hari. Cocok untuk kebutuhan personal atau corporate branding dengan hasil cetak yang sempurna.'
  const productSpecs = currentProduct?.material || '100% cotton ring spun preshrunk jersey knit'
  return (
    <div className="p-4 space-y-6">
      {/* Product Card */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">
          {productName}
        </h3>
        <p className="text-sm text-gray-500">
          {productDescription}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
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

      <ProductSwitcherDialog 
        isOpen={isSwitcherOpen} 
        onClose={() => setIsSwitcherOpen(false)} 
      />

      {/* Sizes */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">Ukuran</span>
          <a href="#" className="text-xs text-blue-600 hover:underline">
            Panduan Ukuran
          </a>
        </div>
        <div className="flex gap-2 flex-wrap">
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => onSizeChange(size)}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                selectedSize === size
                  ? 'bg-blue-950 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          {colors.map(color => {
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
                style={{ backgroundColor: color, border: isDisabled ? '1px solid #e5e7eb' : selectedColor === color ? '2px solid #1a1a4d' : '1px solid #d1d5db' }}
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
            <span>100% cotton ring spun preshrunk jersey knit</span>
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
            <span>Tersedia dalam 8 pilihan ukuran</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
