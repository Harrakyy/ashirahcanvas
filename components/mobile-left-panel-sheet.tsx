'use client'

import { X } from 'lucide-react'
import ProductDetails from './left-panel/product-details'
import UploadImage from './left-panel/upload-image'
import AddText from './left-panel/add-text'
import ClipArt from './left-panel/clip-art'
import LayerPanel from './left-panel/layer'
import MyImages from './left-panel/my-images'
import TemplatePanel from './left-panel/template'
import HelpPanel from './left-panel/help'

interface MobileLeftPanelSheetProps {
  isOpen: boolean
  onClose: () => void
  activeMenu: string
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

export default function MobileLeftPanelSheet({
  isOpen,
  onClose,
  activeMenu,
  selectedColor,
  onColorChange,
  colors,
  disabledColors,
  selectedSize,
  onSizeChange,
  sizes,
  basePrice,
  logoPrice,
  textPrice,
  subtotal,
}: MobileLeftPanelSheetProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-30 md:hidden overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between p-4 rounded-t-2xl">
          <h3 className="font-semibold text-gray-900">
            {activeMenu === 'product' && 'Pilihan Produk'}
            {activeMenu === 'upload' && 'Unggah Gambar'}
            {activeMenu === 'text' && 'Tambah Teks'}
            {activeMenu === 'clipart' && 'Klip Art'}
            {activeMenu === 'layer' && 'Layer'}
            {activeMenu === 'myimages' && 'Gambar Saya'}
            {activeMenu === 'template' && 'Template'}
            {activeMenu === 'help' && 'Bantuan'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 pb-8">
          {activeMenu === 'product' && (
            <ProductDetails
              selectedColor={selectedColor}
              onColorChange={onColorChange}
              colors={colors}
              disabledColors={disabledColors}
              selectedSize={selectedSize}
              onSizeChange={onSizeChange}
              sizes={sizes}
              basePrice={basePrice}
              logoPrice={logoPrice}
              textPrice={textPrice}
              subtotal={subtotal}
            />
          )}

          {activeMenu === 'upload' && <UploadImage />}
          {activeMenu === 'text' && <AddText />}
          {activeMenu === 'clipart' && <ClipArt />}
          {activeMenu === 'layer' && <LayerPanel />}
          {activeMenu === 'myimages' && <MyImages />}
          {activeMenu === 'template' && <TemplatePanel />}
          {activeMenu === 'help' && <HelpPanel />}
        </div>
      </div>
    </>
  )
}
