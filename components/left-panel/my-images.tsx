'use client'

/**
 * MyImages — Panel riwayat gambar yang pernah diunggah.
 *
 * Gambar yang pernah diupload disimpan sebagai thumbnail base64 di localStorage
 * key `canvas_image_library`. Klik thumbnail untuk menambahkannya kembali ke canvas
 * tanpa perlu upload ulang dari device.
 *
 * Data disimpan oleh upload-image.tsx setiap kali berhasil upload.
 * Panel ini hanya membaca dan menampilkan.
 */

import { useState, useEffect, useCallback } from 'react'
import { ImageIcon, Trash2 } from 'lucide-react'
import { addImageToCanvas } from '@/lib/ui/canvas-engine'
import { useDesignStore } from '@/store/design-store'
import { useCanvasStore } from '@/features/canvas/store/useCanvasStore'

export const IMAGE_LIBRARY_KEY = 'canvas_image_library'

interface LibraryItem {
  id: string
  thumbnail: string  // small base64 (max ~120px) for display
  dataUrl: string    // full dataUrl for canvas
  name: string
  addedAt: number
}

export function loadImageLibrary(): LibraryItem[] {
  try {
    const raw = localStorage.getItem(IMAGE_LIBRARY_KEY)
    return raw ? (JSON.parse(raw) as LibraryItem[]) : []
  } catch {
    return []
  }
}

export function saveImageToLibrary(item: Omit<LibraryItem, 'id' | 'addedAt'>): void {
  try {
    const lib = loadImageLibrary()
    // Deduplicate by name — replace if same filename re-uploaded
    const filtered = lib.filter((i) => i.name !== item.name)
    const newItem: LibraryItem = {
      ...item,
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      addedAt: Date.now(),
    }
    // Keep max 20 most recent
    const updated = [newItem, ...filtered].slice(0, 20)
    localStorage.setItem(IMAGE_LIBRARY_KEY, JSON.stringify(updated))
  } catch {
    // localStorage full — silently skip
  }
}

export function removeImageFromLibrary(id: string): void {
  try {
    const lib = loadImageLibrary().filter((i) => i.id !== id)
    localStorage.setItem(IMAGE_LIBRARY_KEY, JSON.stringify(lib))
  } catch {}
}

export default function MyImages() {
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [adding, setAdding] = useState<string | null>(null)

  const selectedView = useDesignStore((s) => s.selectedView)
  const selectedCategory = useDesignStore((s) => s.selectedCategory)
  const selectedColor = useCanvasStore((s) => s.selectedColor)

  const refresh = useCallback(() => {
    setLibrary(loadImageLibrary())
  }, [])

  useEffect(() => {
    refresh()
    // Also refresh on storage events (if upload-image updates library in another hook)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === IMAGE_LIBRARY_KEY) refresh()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [refresh])

  const handleAddToCanvas = async (item: LibraryItem) => {
    setAdding(item.id)
    try {
      await addImageToCanvas(item.dataUrl, selectedView, selectedCategory, selectedColor, item.name)
    } finally {
      setAdding(null)
    }
  }

  const handleRemove = (id: string) => {
    removeImageFromLibrary(id)
    refresh()
  }

  return (
    <div className="p-4 space-y-4 flex flex-col h-full">
      <div>
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-blue-950" />
          Gambar Saya
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Gambar yang pernah diupload. Klik untuk menambahkan ke kanvas lagi tanpa upload ulang.
        </p>
      </div>

      {library.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Belum ada gambar</p>
            <p className="text-xs text-gray-500 mt-1">
              Gambar yang kamu upload akan tersimpan di sini untuk dipakai ulang.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[10px] text-gray-400">{library.length} gambar tersimpan (maks 20)</p>
          <div className="grid grid-cols-3 gap-2 overflow-y-auto pb-2">
            {library.map((item) => (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => handleAddToCanvas(item)}
                  disabled={adding === item.id}
                  className="w-full aspect-square rounded-xl overflow-hidden border border-gray-200 hover:border-blue-950 hover:shadow-sm transition-all bg-gray-50 active:scale-95"
                  title={item.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    className="w-full h-full object-contain p-1"
                    loading="lazy"
                  />
                  {adding === item.id && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl">
                      <span className="text-[10px] text-blue-950 font-medium">Menambahkan...</span>
                    </div>
                  )}
                </button>
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-white border border-gray-200 rounded-full hidden group-hover:flex items-center justify-center shadow-sm hover:bg-red-50 hover:border-red-200 transition z-10"
                  title="Hapus dari perpustakaan"
                >
                  <Trash2 className="w-2.5 h-2.5 text-gray-500 hover:text-red-500" />
                </button>
                <p className="text-[9px] text-gray-500 truncate mt-0.5 px-0.5">{item.name}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
