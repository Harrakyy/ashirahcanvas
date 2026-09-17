import { GARMENT_TARGET_BOX_BY_ZONE } from '@/lib/ui/canvas-engine'
import type { BlueprintAsset } from '@/types/blueprint'

export interface PreviewBox {
  left: number
  top: number
  width: number
  height: number
}

const SCAN_MAX_WIDTH = 192
const ALPHA_THRESHOLD = 40

const imageCache = new Map<string, Promise<HTMLImageElement>>()
const boundsCache = new Map<string, PreviewBox>()

function loadImage(url: string): Promise<HTMLImageElement> {
  let pending = imageCache.get(url)
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`image load failed: ${url}`))
      el.src = url
    })
    imageCache.set(url, pending)
  }
  return pending
}

function detectContentBounds(url: string, img: HTMLImageElement): PreviewBox {
  const cached = boundsCache.get(url)
  if (cached) return cached

  const naturalWidth = img.naturalWidth || 1
  const naturalHeight = img.naturalHeight || 1
  const bounds: PreviewBox = {
    left: 0,
    top: 0,
    width: naturalWidth,
    height: naturalHeight,
  }

  const ratio = Math.min(1, SCAN_MAX_WIDTH / naturalWidth)
  const scanWidth = Math.max(1, Math.round(naturalWidth * ratio))
  const scanHeight = Math.max(1, Math.round(naturalHeight * ratio))
  const scratch = document.createElement('canvas')
  scratch.width = scanWidth
  scratch.height = scanHeight
  const ctx = scratch.getContext('2d')

  if (ctx) {
    ctx.drawImage(img, 0, 0, scanWidth, scanHeight)
    try {
      const data = ctx.getImageData(0, 0, scanWidth, scanHeight).data
      let minX = scanWidth
      let minY = scanHeight
      let maxX = -1
      let maxY = -1
      for (let y = 0; y < scanHeight; y++) {
        for (let x = 0; x < scanWidth; x++) {
          if (data[(y * scanWidth + x) * 4 + 3] > ALPHA_THRESHOLD) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      if (maxX >= minX && maxY >= minY) {
        bounds.left = (minX / scanWidth) * naturalWidth
        bounds.top = (minY / scanHeight) * naturalHeight
        bounds.width = ((maxX - minX) / scanWidth) * naturalWidth
        bounds.height = ((maxY - minY) / scanHeight) * naturalHeight
      }
    } catch {
      boundsCache.set(url, bounds)
      return bounds
    }
  }

  boundsCache.set(url, bounds)
  return bounds
}

export async function getMockupBox(
  url: string,
  zone: string,
  canvasWidth: number,
  canvasHeight: number
): Promise<PreviewBox> {
  const img = await loadImage(url)
  const naturalWidth = img.naturalWidth || 1
  const naturalHeight = img.naturalHeight || 1
  const garment = detectContentBounds(url, img)
  const target = GARMENT_TARGET_BOX_BY_ZONE[zone] ?? GARMENT_TARGET_BOX_BY_ZONE.front
  const scale = Math.min(
    target.width / (garment.width || 1),
    target.height / (garment.height || 1)
  )

  return {
    left: canvasWidth / 2 - (garment.left + garment.width / 2) * scale,
    top: canvasHeight / 2 - (garment.top + garment.height / 2) * scale,
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  }
}

export function getAssetBox(asset: BlueprintAsset): PreviewBox {
  const width = asset.width * asset.scaleX
  const height = asset.height * asset.scaleY
  const offsetX =
    asset.originX === 'center' ? width / 2 : asset.originX === 'right' ? width : 0
  const offsetY =
    asset.originY === 'center' ? height / 2 : asset.originY === 'bottom' ? height : 0

  return {
    left: asset.left - offsetX,
    top: asset.top - offsetY,
    width,
    height,
  }
}
