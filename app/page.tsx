'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/header'
import { ArrowRight, Sparkles } from 'lucide-react'

interface ProductCategory {
  id: string
  name: string
  productCount: number
  icon: string
  image?: string
  description?: string
}

const categories: ProductCategory[] = [
  {
    id: 'tshirts',
    name: 'Kaos / T-Shirt',
    productCount: 8,
    icon: '👕',
    image: '/model product/Kaos T-Shirt.png',
    description: 'Cotton Combed 30s & 24s dengan sablon DTF tajam.',
  },
  {
    id: 'jackets',
    name: 'Jacket & Hoodies',
    productCount: 6,
    icon: '🧥',
    image: '/model product/Jacket & Hoodies.png',
    description: 'Fleece tebal & premium, nyaman untuk outdoor & komunitas.',
  },
  {
    id: 'polo',
    name: 'Polo T-Shirt',
    productCount: 5,
    icon: '👔',
    image: '/model product/Polo T-Shirt.png',
    description: 'Lacoste CVC elegan dengan kombinasi bordir komputer.',
  },
  {
    id: 'sport',
    name: 'Sport T-Shirt',
    productCount: 7,
    icon: '⚽',
    image: '/model product/Sport T-Shirt.png',
    description: 'Bahan Dry-Fit berpori, sejuk untuk jersey tim & olahraga.',
  },
]

export default function HomePage() {
  const router = useRouter()

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/design/${categoryId}`)
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-[#0F152E]">
      <Header onAddToCart={() => {}} />

      <main className="pt-24 pb-20 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 md:mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/70 border border-blue-200/60 text-[#1A2B56] text-xs font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A2B56]" />
            Studio Konveksi & Sablon Custom
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0F152E] tracking-tight">
            Mulai Design Custom
          </h1>
          <p className="text-[#4C567A] text-sm md:text-base mt-2">
            Pilih model pakaian di bawah untuk mulai berkreasi langsung di canvas studio kami
          </p>
        </div>

        {/* Categories Grid (Clean White Card Surfaces & Ashira Navy Accents) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className="group flex flex-col p-5 bg-white rounded-2xl shadow-xs border border-[#E2E4E9] hover:border-[#1A2B56]/60 hover:shadow-lg transition-all duration-200 text-left h-full"
            >
              {/* Image Preview Container */}
              <div className="w-full aspect-square bg-[#F8F9FA] rounded-xl flex items-center justify-center overflow-hidden border border-[#EDEDF2] mb-4">
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-5xl">{category.icon}</span>
                )}
              </div>

              {/* Title & Product Count */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base text-[#0F152E] group-hover:text-[#1A2B56] transition-colors">
                    {category.name}
                  </h2>
                  <span className="text-[11px] font-semibold text-[#1A2B56] bg-blue-50 px-2 py-0.5 rounded-full">
                    {category.productCount} Model
                  </span>
                </div>
                {category.description && (
                  <p className="text-xs text-[#4C567A] line-clamp-2">
                    {category.description}
                  </p>
                )}
              </div>

              {/* Action Button: Ashira Deep Navy */}
              <div className="w-full mt-5 py-2.5 px-4 bg-[#1A2B56] hover:bg-[#243B6B] active:scale-[0.99] text-white text-xs font-semibold rounded-xl text-center transition flex items-center justify-center gap-2 shadow-xs">
                <span>Pilih & Mulai Desain</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
