import { Save, ShoppingCart, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface HeaderProps {
  onAddToCart: () => void
}

export default function Header({ onAddToCart }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 fixed top-0 left-0 right-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 md:gap-3">
        <span className="text-xl md:text-2xl font-bold text-gray-900">Ashirah</span>
        <span className="hidden md:inline px-3 py-1 bg-blue-950 text-white text-xs font-semibold rounded-full">
          Custom Apparel
        </span>
      </div>

      {/* Desktop Buttons */}
      <div className="hidden md:flex items-center gap-3">
        <Button
          variant="outline"
          className="gap-2 border-2 border-blue-950 text-blue-950 hover:bg-blue-50 font-medium"
        >
          <Save className="w-4 h-4" />
          Simpan Template
        </Button>
        <Button
          className="gap-2 bg-blue-950 hover:bg-blue-900 text-white"
          onClick={onAddToCart}
        >
          <ShoppingCart className="w-4 h-4" />
          Masukkan ke Keranjang
        </Button>
      </div>

      {/* Mobile Icon Buttons */}
      <div className="md:hidden flex items-center gap-2">
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition text-blue-950"
          title="Simpan Template"
        >
          <Save className="w-5 h-5" />
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition text-blue-950"
          title="Masukkan ke Keranjang"
          onClick={onAddToCart}
        >
          <ShoppingCart className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
