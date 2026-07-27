'use client'

import { useState } from 'react'
import { Search, Star, Flag, Zap, Feather, AlertCircle } from 'lucide-react'

interface ClipArtCategory {
  id: string
  name: string
  icon: React.ReactNode
}

interface ClipArtItem {
  id: string
  name: string
  category: string
}

const categories: ClipArtCategory[] = [
  { id: 'star', name: 'Bintang', icon: <Star className="w-6 h-6" /> },
  { id: 'flag', name: 'Bendera', icon: <Flag className="w-6 h-6" /> },
  { id: 'sport', name: 'Olahraga', icon: <Zap className="w-6 h-6" /> },
  { id: 'animal', name: 'Hewan', icon: <Feather className="w-6 h-6" /> },
  { id: 'symbol', name: 'Simbol', icon: <AlertCircle className="w-6 h-6" /> },
]

const clipArtItems: ClipArtItem[] = [
  { id: '1', name: 'Bintang 5 Poin', category: 'star' },
  { id: '2', name: 'Bintang Spiral', category: 'star' },
  { id: '3', name: 'Bintang Ganda', category: 'star' },
  { id: '4', name: 'Bendera Merah Putih', category: 'flag' },
  { id: '5', name: 'Bendera Dunia', category: 'flag' },
  { id: '6', name: 'Bendera Ombak', category: 'flag' },
  { id: '7', name: 'Bola Sepak', category: 'sport' },
  { id: '8', name: 'Raket Tenis', category: 'sport' },
  { id: '9', name: 'Papan Selancar', category: 'sport' },
]

export default function ClipArt() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredItems = selectedCategory
    ? clipArtItems.filter(item => item.category === selectedCategory)
    : clipArtItems

  return (
    <div className="p-4 space-y-4 flex flex-col h-full">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari clipart..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-950 focus:border-blue-950 transition"
        />
      </div>

      {/* Category Selection View */}
      {!selectedCategory ? (
        <div className="space-y-2 flex-1 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
            Kategori
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-950 hover:bg-blue-50 transition flex flex-col items-center gap-2 group"
              >
                <div className="text-gray-600 group-hover:text-blue-950 transition">
                  {category.icon}
                </div>
                <span className="text-[11px] font-medium text-gray-900 text-center">
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ClipArt Items View */
        <div className="space-y-2 flex-1 overflow-y-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-xs font-medium text-blue-950 hover:underline"
          >
            ← Kembali ke Kategori
          </button>

          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
            {categories.find(c => c.id === selectedCategory)?.name}
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  alert(`${item.name} ditambahkan ke canvas!`)
                }}
                className="p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-950 hover:shadow-md transition flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition">
                  <div className="text-xl">🎨</div>
                </div>
                <span className="text-[10px] font-medium text-gray-900 text-center line-clamp-2">
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
