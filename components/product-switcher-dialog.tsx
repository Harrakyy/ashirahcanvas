'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { productsByCategory, Product } from '@/lib/config/products'
import { useDesignStore } from '@/store/design-store'
import { useCanvasStore } from '@/features/canvas/store/useCanvasStore'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface ProductSwitcherDialogProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORIES = [
  { id: 'tshirts', label: 'T-Shirts' },
  { id: 'jackets', label: 'Jacket & Hoodies' },
  { id: 'polo', label: 'Polo T-Shirt' },
  { id: 'sport', label: 'Sport T-Shirts' },
]

export function ProductSwitcherDialog({
  isOpen,
  onClose,
}: ProductSwitcherDialogProps) {
  const { selectedProductId, selectedCategory, setSelectedProduct } =
    useDesignStore()
  const [activeTab, setActiveTab] = useState(selectedCategory)
  const [dbProducts, setDbProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.products && Array.isArray(data.products)) {
          setDbProducts(data.products)
        }
      })
      .catch((err) => console.error('Failed to load products in switcher:', err))
      .finally(() => setIsLoading(false))
  }, [isOpen])

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product.id, product.category, {
      name: product.name,
      description: product.description,
      basePrice: Number(product.basePrice) || undefined,
      material: product.material,
    })

    if (
      product.colorVariants &&
      Array.isArray(product.colorVariants) &&
      product.colorVariants.length > 0
    ) {
      useDesignStore.getState().setColorVariants(product.colorVariants)
      const currentSelectedColor = useCanvasStore.getState().selectedColor
      const hasMatch = product.colorVariants.some(
        (v: any) => v.hex?.trim().toUpperCase() === currentSelectedColor?.trim().toUpperCase()
      )
      if (!hasMatch && product.colorVariants[0]?.hex) {
        useCanvasStore.getState().setSelectedColor(product.colorVariants[0].hex)
      }
    } else {
      useDesignStore.getState().setColorVariants([])
    }

    onClose()
  }

  const getCurrentProducts = () => {
    const fromDb = dbProducts.filter(
      (p) => p.category === activeTab && p.isActive !== false
    )
    if (fromDb.length > 0) return fromDb
    return productsByCategory[activeTab] || []
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white w-full md:w-auto md:rounded-lg rounded-2xl md:border md:border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Ganti Produk
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Pilih produk katalog apparel untuk memuat mockup dan spesifikasi bahan
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex gap-2 bg-transparent p-0 w-full overflow-x-auto border-b border-gray-200 pb-2">
            {CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="px-4 py-2 rounded-full text-sm whitespace-nowrap data-[state=active]:bg-blue-950 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 transition"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="mt-6">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-950" />
                  <p className="text-xs">Memuat daftar produk...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {getCurrentProducts().map((product) => {
                    const isActive =
                      selectedProductId === product.id &&
                      selectedCategory === product.category

                    const thumbnail =
                      product.thumbnailUrl ||
                      product.colorVariants?.[0]?.mockups?.front ||
                      product.image

                    const variantsCount = product.colorVariants?.length || 0

                    return (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className={`group flex flex-col gap-2 p-3 rounded-xl transition-all text-left cursor-pointer ${
                          isActive
                            ? 'border-2 border-blue-950 bg-blue-50/50 shadow-xs'
                            : 'border-2 border-gray-200 bg-white hover:border-blue-950 hover:shadow-md'
                        }`}
                      >
                        {/* Image Thumbnail */}
                        <div className="w-full aspect-square bg-slate-50 rounded-lg flex items-center justify-center p-2 group-hover:bg-slate-100 transition-colors relative overflow-hidden">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={product.name}
                              className="w-full h-full object-contain transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <span className="text-3xl">
                              {product.category === 'tshirts' && '🎽'}
                              {product.category === 'jackets' && '🧥'}
                              {product.category === 'polo' && '👔'}
                              {product.category === 'sport' && '⛹️'}
                            </span>
                          )}
                        </div>

                        {/* Badge / Variant Tag */}
                        <div className="flex items-center justify-between gap-1">
                          {product.badge ? (
                            <Badge
                              className={`text-[10px] ${
                                product.badge === 'Best Seller'
                                  ? 'bg-blue-950 text-white border-blue-950'
                                  : 'bg-blue-950/10 text-blue-950 border-blue-950/20'
                              }`}
                            >
                              {product.badge}
                            </Badge>
                          ) : variantsCount > 0 ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {variantsCount} Warna
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Standar</span>
                          )}

                          {isActive && (
                            <CheckCircle2 className="w-4 h-4 text-blue-950" />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="space-y-1 mt-0.5">
                          <h3 className="font-semibold text-xs text-gray-900 line-clamp-2 leading-tight">
                            {product.name}
                          </h3>
                          <p className="text-[11px] text-gray-500 line-clamp-1">
                            {product.material || product.description || 'Apparel Custom'}
                          </p>
                          {product.basePrice && (
                            <p className="text-xs font-bold text-blue-950">
                              Rp {Number(product.basePrice).toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>

                        {/* Variant Color Swatch Dots */}
                        {product.colorVariants && product.colorVariants.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 pt-1.5 border-t border-slate-100">
                            {product.colorVariants.slice(0, 5).map((v: any, idx: number) => (
                              <span
                                key={idx}
                                style={{ backgroundColor: v.hex }}
                                className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs inline-block shrink-0"
                                title={v.name}
                              />
                            ))}
                            {product.colorVariants.length > 5 && (
                              <span className="text-[9px] text-slate-400 font-medium">
                                +{product.colorVariants.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
