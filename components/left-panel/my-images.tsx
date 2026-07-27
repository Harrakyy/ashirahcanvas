'use client'

import { Upload } from 'lucide-react'

interface UploadedImage {
  id: string
  name: string
}

const dummyImages: UploadedImage[] = [
  { id: '1', name: 'Logo Ashirah.png' },
  { id: '2', name: 'Pattern Geometri.jpg' },
  { id: '3', name: 'Icon Set.svg' },
  { id: '4', name: 'Background Texture.png' },
  { id: '5', name: 'Brand Guide.png' },
  { id: '6', name: 'Custom Design.jpg' },
]

export default function MyImages() {
  const handleUseImage = (imageId: string, imageName: string) => {
    alert(`${imageName} digunakan ke canvas!`)
  }

  return (
    <div className="p-4 space-y-4 flex flex-col h-full">
      {/* Upload Button */}
      <button className="w-full px-4 py-2 bg-blue-950 text-white rounded-lg text-sm hover:bg-blue-900 transition font-medium flex items-center justify-center gap-2">
        <Upload className="w-4 h-4" />
        Upload Baru
      </button>

      {/* Images Grid */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
          Gambar Sebelumnya ({dummyImages.length})
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {dummyImages.map(image => (
            <div key={image.id} className="relative group rounded-xl overflow-hidden">
              {/* Image Placeholder */}
              <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                <div className="text-2xl">🖼️</div>
              </div>

              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-xl">
                <button
                  onClick={() => handleUseImage(image.id, image.name)}
                  className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-medium hover:bg-gray-100 transition"
                >
                  Gunakan
                </button>
              </div>

              {/* Image Name */}
              <p className="text-[10px] font-medium text-gray-600 mt-1 truncate">
                {image.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
