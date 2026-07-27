'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { addImageToCanvas } from '@/lib/canvas-engine'
import { useDesignStore } from '@/store/design-store'

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED = 'image/png,image/jpeg,image/jpg'

interface UploadImageProps {
  selectedColor?: string
}

export default function UploadImage({ selectedColor = '#FFFFFF' }: UploadImageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const selectedView = useDesignStore(s => s.selectedView)
  const selectedCategory = useDesignStore(s => s.selectedCategory)

  const handleFile = useCallback(async (file: File) => {
    setError('')

    if (!file.type.match(/^image\/(png|jpe?g)$/)) {
      setError('Hanya PNG dan JPG yang didukung')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('Ukuran maksimal 5MB')
      return
    }

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          await addImageToCanvas(reader.result as string, selectedView, selectedCategory, selectedColor)
          setError('')
        } catch {
          setError('Gagal menambahkan gambar ke canvas')
        }
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Gagal membaca file')
      setUploading(false)
    }
  }, [selectedView, selectedCategory, selectedColor])

  return (
    <div className="p-3 space-y-3">
      <p className="text-sm text-gray-600">Unggah gambar untuk ditambahkan ke desain</p>

      <button
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Mengunggah...' : 'Pilih Gambar'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
