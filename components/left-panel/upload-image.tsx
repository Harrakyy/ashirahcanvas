'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, AlertTriangle } from 'lucide-react'
import { addImageToCanvas } from '@/lib/ui/canvas-engine'
import { useDesignStore } from '@/store/design-store'
import { saveImageToLibrary } from './my-images'

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

function createThumbnail(dataUrl: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(size / img.width, size / img.height, 1)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('no ctx')); return }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'medium'
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/png', 0.7))
    }
    img.onerror = reject
    img.src = dataUrl
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
        const dataUrl = reader.result as string
        try {
          await addImageToCanvas(
            dataUrl,
            selectedView,
            selectedCategory,
            selectedColor,
            file.name
          )
          setError('')

          // Save to My Images library (thumbnail 120px, full dataUrl for re-add)
          try {
            const thumb = await createThumbnail(dataUrl, 120)
            saveImageToLibrary({
              thumbnail: thumb,
              dataUrl,
              name: file.name.replace(/\.[^/.]+$/, ''),
            })
            // Notify My Images panel via storage event
            window.dispatchEvent(new StorageEvent('storage', { key: 'canvas_image_library' }))
          } catch {
            // Library save failure is non-critical — swallow silently
          }
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
        className="w-full py-3 px-4 bg-[#1A2B56] hover:bg-[#243B6B] text-white rounded-full font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer"
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
        <div className="p-3.5 bg-[#F0F2F6] border border-[#C4C8D8] rounded-xl space-y-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#4C567A] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#1A2B56] space-y-1">
              <p className="font-bold">Peringatan Kualitas Gambar (&lt; 500px)</p>
              <p className="leading-relaxed text-slate-600">
                Dimensi gambar ini hanya <strong>{pendingLowRes.width} × {pendingLowRes.height} px</strong>. Resolusi di bawah 500px berisiko pecah atau buram saat dicetak di mesin sablon.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelLowRes}
              className="flex-1 py-1.5 px-3 bg-white border border-[#C4C8D8] text-[#1A2B56] rounded-full text-xs font-bold hover:bg-[#EDEDF2] transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleProceedLowRes}
              className="flex-1 py-1.5 px-3 bg-[#1A2B56] hover:bg-[#243B6B] text-white rounded-full text-xs font-bold transition cursor-pointer shadow-xs"
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
