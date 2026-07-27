'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import Header from '@/components/header'

interface ProductCategory {
  id: string
  name: string
  productCount: number
  icon: string
}

const categories: ProductCategory[] = [
  { id: 'tshirts', name: 'Kaos / T-Shirt', productCount: 8, icon: '👕' },
  { id: 'jackets', name: 'Jacket & Hoodies', productCount: 6, icon: '🧥' },
  { id: 'polo', name: 'Polo T-Shirt', productCount: 5, icon: '👔' },
  { id: 'sport', name: 'Sport T-Shirt', productCount: 7, icon: '⚽' },
]

export default function HomePage() {
  const router = useRouter()

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/design/${categoryId}`)
  }

  return (
    <div className="min-h-screen bg-white">
      <Header onAddToCart={() => {}} />

      <main className="pt-16 pb-16">
        {/* Header Section */}
        <div className="px-4 md:px-6 max-w-7xl mx-auto mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Mulai Design Custom
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Pilih produk yang ingin kamu custom
          </p>
        </div>

        {/* Grid Container */}
        <div className="px-4 md:px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="group relative overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition-all"
              >
                {/* Card Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-blue-50 group-hover:to-blue-100 transition" />

                {/* Content */}
                <div className="relative p-4 md:p-6 flex flex-col items-center gap-2 md:gap-4 h-48 md:h-64 justify-center">
                  {/* Icon */}
                  <div className="text-4xl md:text-6xl">{category.icon}</div>

                  {/* Name */}
                  <h2 className="text-sm md:text-xl font-semibold text-gray-900 text-center line-clamp-2">
                    {category.name}
                  </h2>

                  {/* Product Count */}
                  <p className="text-xs md:text-sm text-gray-600">
                    {category.productCount} Produk
                  </p>

                  {/* Arrow */}
                  <div className="mt-1 md:mt-2 p-1 md:p-2 bg-white rounded-full group-hover:bg-blue-950 transition">
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-hover:text-white transition" />
                  </div>
                </div>

                {/* Border */}
                <div className="absolute inset-0 rounded-xl border-2 border-gray-200 group-hover:border-blue-950 transition pointer-events-none" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
