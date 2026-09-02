'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/header'

interface ProductCategory {
  id: string
  name: string
  productCount: number
  icon: string
  image?: string
}

const categories: ProductCategory[] = [
  { id: 'tshirts', name: 'Kaos / T-Shirt', productCount: 8, icon: '👕', image: '/model product/Kaos T-Shirt.png' },
  { id: 'jackets', name: 'Jacket & Hoodies', productCount: 6, icon: '🧥', image: '/model product/Jacket & Hoodies.png' },
  { id: 'polo', name: 'Polo T-Shirt', productCount: 5, icon: '👔', image: '/model product/Polo T-Shirt.png' },
  { id: 'sport', name: 'Sport T-Shirt', productCount: 7, icon: '⚽', image: '/model product/Sport T-Shirt.png' },
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="group flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-white rounded-lg md:rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-950 hover:shadow-md transition-all h-full"
              >
                {/* Image */}
                <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl md:text-5xl">{category.icon}</span>
                  )}
                </div>

                {/* Name */}
                <div className="text-left space-y-1 flex-1">
                  <h2 className="font-semibold text-xs md:text-sm text-gray-900 line-clamp-2">
                    {category.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {category.productCount} Produk
                  </p>
                </div>

                {/* Select Label */}
                <div className="w-full mt-2 px-3 py-2 bg-blue-950 hover:bg-blue-900 text-white text-xs font-medium rounded text-center transition mt-auto">
                  Lihat Produk
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
