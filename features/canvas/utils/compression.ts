/**
 * Image compression utility for canvas upload assets.
 * Scales down large user images to max 800x800px while maintaining high visual quality
 * and preserving alpha transparency (PNG/WebP), keeping localStorage auto-save payload light.
 */

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const { maxWidth = 800, maxHeight = 800, quality = 0.92 } = options

  // If not image, return as is
  if (!file.type.startsWith('image/')) return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Check if image needs scaling or size re-encoding (if size > 300KB)
      if (width <= maxWidth && height <= maxHeight && file.size <= 300 * 1024) {
        // Image is already small in both dimensions and bytes, return original file
        resolve(file)
        return
      }

      // Calculate aspect ratio scale
      const scale = Math.min(maxWidth / width, maxHeight / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)

      // Create offscreen canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      // High quality scaling
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      // Determine output format (preserve PNG for transparency, otherwise WebP/PNG)
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp'

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const compressedFile = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        },
        outputType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
