'use client'

import { Square, Circle, Triangle, Star, ArrowRight, Minus } from 'lucide-react'
import { addShapeToCanvas, type ShapeType } from '@/lib/ui/canvas-engine'

const SHAPES: { id: ShapeType; label: string; icon: React.ElementType; preview: React.ReactNode }[] = [
  {
    id: 'rect',
    label: 'Kotak',
    icon: Square,
    preview: (
      <svg viewBox="0 0 40 28" className="w-full h-full">
        <rect x="2" y="2" width="36" height="24" rx="2" ry="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Lingkaran',
    icon: Circle,
    preview: (
      <svg viewBox="0 0 36 36" className="w-full h-full">
        <circle cx="18" cy="18" r="16" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'triangle',
    label: 'Segitiga',
    icon: Triangle,
    preview: (
      <svg viewBox="0 0 40 36" className="w-full h-full">
        <polygon points="20,2 38,34 2,34" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'star',
    label: 'Bintang',
    icon: Star,
    preview: (
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <polygon
          points="20,2 24.9,14.5 38,14.5 27.6,22.1 31.5,34.6 20,27 8.5,34.6 12.4,22.1 2,14.5 15.1,14.5"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: 'arrow',
    label: 'Panah',
    icon: ArrowRight,
    preview: (
      <svg viewBox="0 0 48 28" className="w-full h-full">
        <polygon points="2,8 30,8 30,2 46,14 30,26 30,20 2,20" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Garis',
    icon: Minus,
    preview: (
      <svg viewBox="0 0 40 12" className="w-full h-full">
        <rect x="2" y="4" width="36" height="4" rx="2" fill="currentColor" />
      </svg>
    ),
  },
]

const FILL_COLORS = [
  { hex: '#000000', label: 'Hitam' },
  { hex: '#FFFFFF', label: 'Putih' },
  { hex: '#1E3A8A', label: 'Navy' },
  { hex: '#DC2626', label: 'Merah' },
  { hex: '#16A34A', label: 'Hijau' },
  { hex: '#D97706', label: 'Kuning' },
  { hex: '#9333EA', label: 'Ungu' },
  { hex: '#6B7280', label: 'Abu' },
]

import { useState } from 'react'

export default function ClipArt() {
  const [fillColor, setFillColor] = useState('#000000')

  return (
    <div className="p-4 space-y-5 flex flex-col">
      <div>
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Square className="w-4 h-4 text-blue-950" />
          Shapes & Elemen
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Klik shape untuk menambahkannya ke kanvas. Warna dapat diubah di panel Layer.
        </p>
      </div>

      {/* Fill Color Picker */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">Warna Shape</label>
        <div className="grid grid-cols-8 gap-1.5">
          {FILL_COLORS.map((c) => (
            <button
              key={c.hex}
              title={c.label}
              onClick={() => setFillColor(c.hex)}
              className={`w-7 h-7 rounded-lg border-2 transition-all flex-shrink-0 ${
                fillColor.toLowerCase() === c.hex.toLowerCase()
                  ? 'border-blue-950 scale-110 shadow-sm'
                  : 'border-transparent hover:border-gray-300'
              }`}
              style={{
                backgroundColor: c.hex,
                outline: c.hex === '#FFFFFF' ? '1px solid #e5e7eb' : undefined,
              }}
            />
          ))}
        </div>
      </div>

      {/* Shape Grid */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">Pilih Shape</label>
        <div className="grid grid-cols-2 gap-2">
          {SHAPES.map((shape) => (
            <button
              key={shape.id}
              onClick={() => addShapeToCanvas(shape.id, fillColor)}
              className="group flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-950 hover:shadow-sm active:scale-95 transition-all"
            >
              <div
                className="w-10 h-8 flex items-center justify-center text-gray-900 group-hover:text-blue-950 transition-colors"
                style={{ color: fillColor !== '#FFFFFF' ? fillColor : '#111827' }}
              >
                {shape.preview}
              </div>
              <span className="text-[11px] font-medium text-gray-700 group-hover:text-blue-950 transition-colors">
                {shape.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        Tip: Setelah ditambahkan, resize dan posisikan shape di kanvas.
      </p>
    </div>
  )
}
