'use client'

import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { productsByCategory } from '@/lib/config/products'
import { useDesignStore } from '@/store/design-store'

export default function CategoryPage() {
  const router = useRouter()
  const params = useParams()
  const category = (params.category as string) || 'tshirts'
  const { setSelectedProduct } = useDesignStore()

  const products = productsByCategory[category] || []

  const categoryLabels: Record<string, string> = {
    tshirts: 'T-Shirts Produk',
    jackets: 'Jacket & Hoodies Produk',
    polo: 'Polo T-Shirt Produk',
    sport: 'Sport T-Shirts Produk',
  }

  const handleSelectProduct = (productId: string) => {
    setSelectedProduct(productId, category)
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
      <Header />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
          {/* Header Section */}
          <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 md:gap-2 text-blue-950 hover:text-blue-900 font-medium transition text-sm md:text-base"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden md:inline">Kembali</span>
            </button>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">
              {categoryLabels[category] || 'Produk'}
            </h1>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product.id)}
                className="group flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-white rounded-lg md:rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-950 hover:shadow-md transition-all h-full"
              >
                {/* Image */}
                <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl md:text-5xl">{getProductIcon()}</span>
                  )}
                </div>

                {/* Badge */}
                {product.badge && category !== 'tshirts' && (
                  <div className="flex gap-1 justify-center">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getBadgeColor(product.badge)}`}
                    >
                      {product.badge}
                    </Badge>
                  </div>
                )}

                {/* Product Info */}
                <div className="text-left space-y-1 md:space-y-2 flex-1">
                  <h3 className="font-semibold text-xs md:text-sm text-gray-900 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 hidden md:block">
                    {product.description}
                  </p>

                  {/* Specs */}
                  <div className="space-y-0.5 md:space-y-1 text-xs text-gray-600">
                    <p>
                      <span className="font-medium">Warna:</span> {product.colors} pilihan
                    </p>
                    <p>
                      <span className="font-medium">Ukuran:</span> {product.sizes}
                    </p>
                    <p>
                      <span className="font-medium">Material:</span> {product.material}
                    </p>
                  </div>

                  {/* Price */}
                  {product.basePrice && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="font-semibold text-blue-950">
                        Rp {product.basePrice.toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Select Label - shows "Pilih Produk" without nested button */}
                <div className="w-full mt-2 px-3 py-2 bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium rounded text-center transition mt-auto">
                  Pilih Produk
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
