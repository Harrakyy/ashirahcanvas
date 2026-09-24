'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Header from '@/components/header'
import { Badge } from '@/components/ui/badge'
import { productsByCategory, Product } from '@/lib/config/products'
import { useDesignStore } from '@/store/design-store'
import { useCanvasStore } from '@/features/canvas/store/useCanvasStore'

export default function CategoryPage() {
  const router = useRouter()
  const params = useParams()
  const category = (params.category as string) || 'tshirts'
  const { setSelectedProduct } = useDesignStore()

  const [dbProducts, setDbProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/products?category=${category}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.products && Array.isArray(data.products)) {
          setDbProducts(data.products)
        }
      })
      .catch((err) => console.error('Failed to load category products:', err))
      .finally(() => setIsLoading(false))
  }, [category])

  // Prefer database products if available, fallback to static presets
  const displayProducts =
    dbProducts.length > 0
      ? dbProducts.filter((p) => p.isActive !== false)
      : productsByCategory[category] || []

  const categoryLabels: Record<string, string> = {
    tshirts: 'Kaos (T-Shirts) Produk',
    jackets: 'Jacket & Hoodies Produk',
    polo: 'Polo T-Shirt Produk',
    sport: 'Sport T-Shirts Produk',
  }

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product.id, category, {
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

    router.push('/editor')
  }

  const getBadgeColor = (badge?: string) => {
    if (badge === 'Best Seller') return 'bg-blue-950 text-white border-blue-950'
    return 'bg-blue-950/10 text-blue-950 border-blue-950/20'
  }

  const getProductIcon = () => {
    if (category === 'tshirts') return '🎽'
    if (category === 'jackets') return '🧥'
    if (category === 'polo') return '👔'
    if (category === 'sport') return '⛹️'
    return '📦'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onAddToCart={() => {}} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
          {/* Header Section */}
          <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 md:gap-2 text-blue-950 hover:text-blue-900 font-medium transition text-sm md:text-base cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden md:inline">Kembali</span>
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">
              {categoryLabels[category] || 'Katalog Produk'}
            </h1>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-950" />
              <p className="text-xs">Memuat katalog pakaian...</p>
            </div>
          ) : (
            /* Products Grid */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {displayProducts.map((product) => {
                const thumbnail =
                  product.thumbnailUrl ||
                  product.colorVariants?.[0]?.mockups?.front ||
                  product.image

                const colorCount =
                  product.colorVariants?.length ||
                  (Array.isArray(product.availableColors) ? product.availableColors.length : undefined) ||
                  product.colors ||
                  0

                const sizesFormatted = Array.isArray(product.availableSizes)
                  ? product.availableSizes.join(', ')
                  : product.sizes || 'S-5XL'

                const materialFormatted = product.material || 'Katun Berkualitas Tinggi'

                return (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="group flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-white rounded-xl shadow-xs border-2 border-gray-200 hover:border-blue-950 hover:shadow-md transition-all h-full text-left cursor-pointer"
                  >
                    {/* Image Thumbnail */}
                    <div className="w-full aspect-square bg-[#F8F9FA] rounded-xl flex items-center justify-center overflow-hidden border border-[#EDEDF2] relative">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={product.name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-3xl md:text-5xl">{getProductIcon()}</span>
                      )}
                    </div>

                    {/* Badge / Color Count */}
                    <div className="flex items-center justify-between gap-1">
                      {product.badge ? (
                        <Badge
                          variant="outline"
                          className={`text-xs ${getBadgeColor(product.badge)}`}
                        >
                          {product.badge}
                        </Badge>
                      ) : product.colorVariants && product.colorVariants.length > 0 ? (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {product.colorVariants.length} Varian Warna
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Standar</span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="text-left space-y-1 md:space-y-1.5 flex-1">
                      <h3 className="font-semibold text-xs md:text-sm text-gray-900 line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 hidden md:block">
                        {product.description}
                      </p>

                      {/* Specs */}
                      <div className="space-y-0.5 md:space-y-1 text-xs text-gray-600">
                        <p>
                          <span className="font-medium text-slate-700">Warna:</span> {colorCount} pilihan
                        </p>
                        <p>
                          <span className="font-medium text-slate-700">Ukuran:</span> {sizesFormatted}
                        </p>
                        <p className="line-clamp-1">
                          <span className="font-medium text-slate-700">Material:</span> {materialFormatted}
                        </p>
                      </div>

                      {/* Color Preview Dots */}
                      {product.colorVariants && product.colorVariants.length > 0 && (
                        <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                          {product.colorVariants.slice(0, 5).map((v: any, idx: number) => (
                            <span
                              key={idx}
                              style={{ backgroundColor: v.hex }}
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs inline-block shrink-0"
                              title={v.name}
                            />
                          ))}
                          {product.colorVariants.length > 5 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              +{product.colorVariants.length - 5}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Price */}
                      {product.basePrice && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="font-bold text-[#1A2B56] text-sm">
                            Rp {Number(product.basePrice).toLocaleString('id-ID')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="w-full mt-2 px-3 py-2 bg-blue-950 group-hover:bg-blue-900 text-white text-xs font-semibold rounded-lg text-center transition mt-auto shadow-xs">
                      Pilih Produk
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
