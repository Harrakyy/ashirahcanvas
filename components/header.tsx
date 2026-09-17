import { Save, ShoppingCart, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

interface HeaderProps {
  onAddToCart?: () => void
}

export default function Header({ onAddToCart }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const showCartActions = pathname === '/editor'

  return (
    <header className="h-16 glass-header flex items-center justify-between px-4 md:px-6 fixed top-0 left-0 right-0 z-50">
      {/* Logo & macOS accent */}
      <div className="flex items-center gap-3">
        {/* macOS Traffic Lights */}
        <div className="hidden sm:flex items-center gap-1.5 mr-1" aria-hidden="true">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 inline-block shadow-xs" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10 inline-block shadow-xs" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10 inline-block shadow-xs" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg md:text-xl font-semibold tracking-tight text-neutral-900">Ashirah</span>
          <span className="hidden md:inline px-2.5 py-0.5 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full border border-neutral-200/60">
            Studio
          </span>
        </div>
      </div>

      {/* Desktop Buttons */}
      {showCartActions && (
        <div className="hidden md:flex items-center gap-2.5">
          <Button
            variant="outline"
            className="gap-2 bg-neutral-50/80 hover:bg-neutral-100 text-neutral-600 border-neutral-200/80 rounded-lg text-xs font-medium h-9"
            disabled
            title="Fitur ini segera hadir"
          >
            <Save className="w-3.5 h-3.5 text-neutral-500" />
            Simpan Template
            <span className="ml-0.5 rounded-full bg-neutral-200/70 text-neutral-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
              Soon
            </span>
          </Button>
          <Button
            className="gap-2 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white rounded-lg text-xs font-medium h-9 shadow-xs transition-all"
            onClick={onAddToCart}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Masukkan ke Keranjang
          </Button>
        </div>
      )}

      {/* Mobile Icon Buttons */}
      {showCartActions && (
        <div className="md:hidden flex items-center gap-1.5">
          <button
            className="p-2 hover:bg-neutral-100 rounded-lg transition text-neutral-500 disabled:opacity-40 disabled:pointer-events-none"
            title="Simpan Template (Segera Hadir)"
            disabled
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            className="p-2 hover:bg-neutral-100 rounded-lg transition text-neutral-900"
            title="Masukkan ke Keranjang"
            onClick={onAddToCart}
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  )
}
