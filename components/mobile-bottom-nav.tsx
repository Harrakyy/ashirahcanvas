'use client'

import {
  Shirt,
  Upload,
  Type,
  Shapes,
  Layers,
  Image as ImageIcon,
  LayoutTemplate,
  HelpCircle,
  ShoppingCart,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

interface MobileBottomNavProps {
  activeMenu: string
  onMenuChange: (menu: string) => void
  onTogglePricing: () => void
  zoomLevel?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
}

const menuItems = [
  { id: 'product', icon: Shirt, label: 'Produk' },
  { id: 'upload', icon: Upload, label: 'Upload' },
  { id: 'text', icon: Type, label: 'Teks' },
  { id: 'clipart', icon: Shapes, label: 'Klip' },
  { id: 'layer', icon: Layers, label: 'Layer' },
  { id: 'myimages', icon: ImageIcon, label: 'Gambar' },
  { id: 'template', icon: LayoutTemplate, label: 'Template' },
  { id: 'help', icon: HelpCircle, label: 'Bantuan' },
]

export default function MobileBottomNav({
  activeMenu,
  onMenuChange,
  onTogglePricing,
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
}: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-between px-2 py-3 gap-1 overflow-x-auto md:hidden">
      {/* Menu Items */}
      <div className="flex gap-1 flex-1 overflow-x-auto">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = activeMenu === item.id
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all whitespace-nowrap text-xs min-h-[44px] min-w-[44px] ${
                isActive
                  ? 'bg-blue-950 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          )
        })}

        {/* Divider */}
        <div className="w-px bg-gray-300 h-8" />

        {/* Zoom Controls */}
        <button
          onClick={onZoomOut}
          className="flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all whitespace-nowrap text-xs min-h-[44px] min-w-[44px] text-gray-600 hover:bg-gray-100"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        {/* Zoom Percentage Badge */}
        <div className="flex items-center justify-center px-2 py-1 rounded-lg text-xs font-semibold text-gray-900 bg-gray-100 whitespace-nowrap">
          {zoomLevel}%
        </div>

        <button
          onClick={onZoomIn}
          className="flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all whitespace-nowrap text-xs min-h-[44px] min-w-[44px] text-gray-600 hover:bg-gray-100"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>

      {/* Pricing/Cart Button */}
      <button
        onClick={onTogglePricing}
        className="flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all whitespace-nowrap text-xs min-h-[44px] min-w-[44px] bg-blue-950 text-white hover:bg-blue-900"
        title="Lihat Harga"
      >
        <ShoppingCart className="w-5 h-5" />
        <span className="text-xs">Harga</span>
      </button>
    </div>
  )
}
