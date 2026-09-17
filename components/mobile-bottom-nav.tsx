'use client'

import { ShoppingCart } from 'lucide-react'
import BottomTools from '@/features/canvas/components/BottomTools'

interface MobileBottomNavProps {
  activeMenu: string
  onMenuChange: (menu: string) => void
  onTogglePricing: () => void
  zoomLevel?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
}

export default function MobileBottomNav({
  activeMenu,
  onMenuChange,
  onTogglePricing,
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
}: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-between px-2 py-3 gap-1 overflow-x-auto md:hidden z-30">
      <BottomTools
        activeMenu={activeMenu}
        onMenuChange={onMenuChange}
        zoomLevel={zoomLevel}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />

      {/* Pricing/Cart Button */}
      <button
        type="button"
        onClick={onTogglePricing}
        className="flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all whitespace-nowrap text-xs min-h-[44px] min-w-[44px] bg-blue-950 text-white hover:bg-blue-900 ml-1"
        title="Lihat Harga"
      >
        <ShoppingCart className="w-5 h-5" />
        <span className="text-xs">Harga</span>
      </button>
    </div>
  )
}
