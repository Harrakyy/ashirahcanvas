'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, AlertTriangle } from 'lucide-react'
import { addImageToCanvas } from '@/lib/ui/canvas-engine'
import { useDesignStore } from '@/store/design-store'

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED = 'image/png,image/jpeg,image/jpg'

interface UploadImageProps {
  selectedColor?: string
}

interface PendingLowRes {
  file: File
  width: number
  height: number
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ width: 0, height: 0 })
    }
    img.src = url
  })
}

export default function UploadImage({ selectedColor = '#FFFFFF' }: UploadImageProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [pendingLowRes, setPendingLowRes] = useState<PendingLowRes | null>(null)

  const selectedView = useDesignStore((s) => s.selectedView)
  const selectedCategory = useDesignStore((s) => s.selectedCategory)

  const processAndUpload = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const { compressImage } = await import('@/features/canvas/utils/compression')
      const compressedFile = await compressImage(file)

      const reader = new FileReader()
      reader.onload = async () => {
        try {
          await addImageToCanvas(
            reader.result as string,
            selectedView,
            selectedCategory,
            selectedColor,
            file.name
          )
          setError('')
        } catch {
          setError('Gagal menambahkan gambar ke canvas')
        }
        setUploading(false)
      }
      reader.readAsDataURL(compressedFile)
    } catch {
      setError('Gagal membaca file')
      setUploading(false)
    }
  }

  const handleFile = useCallback(
    async (file: File) => {
      setError('')
      setPendingLowRes(null)

      if (!file.type.match(/^image\/(png|jpe?g)$/)) {
        setError('Hanya PNG dan JPG yang didukung')
        return
      }
      if (file.size > MAX_SIZE) {
        setError('Ukuran maksimal 5MB')
        return
      }

      // Check Quality Gate (<500px width or height)
      const dims = await getImageDimensions(file)
      if (dims.width > 0 && dims.height > 0 && (dims.width < 500 || dims.height < 500)) {
        setPendingLowRes({ file, width: dims.width, height: dims.height })
        return
      }

      await processAndUpload(file)
    },
    [selectedView, selectedCategory, selectedColor]
  )

  const handleProceedLowRes = async () => {
    if (!pendingLowRes) return
    const file = pendingLowRes.file
    setPendingLowRes(null)
    await processAndUpload(file)
  }

  const handleCancelLowRes = () => {
    setPendingLowRes(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-950" />
          Upload Logo / Gambar
        </h3>
        <p className="text-xs text-gray-500">
          Unggah gambar PNG/JPG beresolusi tinggi (min 500px) untuk hasil cetak sablon optimal.
        </p>
      </div>

      <button
        className="w-full py-3 px-4 bg-blue-950 text-white rounded-lg font-medium hover:bg-blue-900 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-md"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || pendingLowRes !== null}
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Mengunggah...' : 'Pilih Gambar dari Perangkat'}
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

      {/* Quality Gate Warning Card */}
      {pendingLowRes && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">Peringatan Kualitas Gambar (&lt; 500px)</p>
              <p className="leading-relaxed">
                Dimensi gambar ini hanya <strong>{pendingLowRes.width} × {pendingLowRes.height} px</strong>. Resolusi di bawah 500px berisiko pecah atau buram saat dicetak di mesin sablon.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelLowRes}
              className="flex-1 py-1.5 px-3 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleProceedLowRes}
              className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Tetap Upload
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}
    </div>
  )
}
