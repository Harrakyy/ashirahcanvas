/**
 * Blueprint export utilities — generate CanvasBlueprint from live Fabric state.
 *
 * Semua kalkulasi harga di sini adalah ESTIMASI CLIENT-SIDE.
 * Verifikasi harga final tetap di Backend Express.
 *
 * pricing.total_estimation = base_price + extra_charge
 * extra_charge = logoPrice + textPrice + sizeUpcharge
 */
import { getCanvas, saveViewState } from '@/lib/ui/canvas-engine'
import { getActiveZone, getViewState } from '@/lib/ui/design-state'
import { ACTIVE_ZONES } from '@/lib/config/zones'
import type { CanvasZone } from '@/types/design'
import type { CanvasBlueprint } from '../types/blueprint'

function getSizeUpcharge(size: string): number {
  const upsizes = ['2XL', '3XL', '4XL', '5XL'] as const
  return upsizes.includes(size as any) ? 5000 : 0
}

export function buildBlueprint(params: {
  productId: string
  size: string
  color: string
  basePrice: number
  logoPrice: number
  textPrice: number
}): CanvasBlueprint | null {
  const canvas = getCanvas()
  if (!canvas) return null

  // Ensure current active zone state is saved into design-state first
  const currentZone = getActiveZone()
  saveViewState(currentZone)

  const { productId, size, color, basePrice, logoPrice, textPrice } = params
  const sizeUpcharge = getSizeUpcharge(size)
  const extraCharge = logoPrice + textPrice + sizeUpcharge

  // Pilihan Implementasi Preview Base64:
  // Menggunakan canvas.toDataURL() pada zona yang sedang aktif saat ini.
  // Alasan: Paling murah secara komputasi (tidak perlu re-render 4 kali canvas offscreen)
  // dan memberikan visual representasi langsung hasil akhir desain.
  const previewBase64 = canvas.toDataURL()

  const fabricRawJsonPerZone: Record<CanvasZone, object | null> = {
    front: null,
    back: null,
    left: null,
    right: null,
    label: null,
  }

  const uploadedImagesPerZone: Record<CanvasZone, string[]> = {
    front: [],
    back: [],
    left: [],
    right: [],
    label: [],
  }

  for (const zoneId of ACTIVE_ZONES) {
    const rawStateStr = getViewState(zoneId)
    if (!rawStateStr) continue

    try {
      const parsed = JSON.parse(rawStateStr) as { objects?: any[] }
      if (parsed.objects && parsed.objects.length > 0) {
        fabricRawJsonPerZone[zoneId as CanvasZone] = parsed

        const images: string[] = []
        for (const obj of parsed.objects) {
          const src = obj.src ?? obj._element?.src ?? ''
          if (typeof src === 'string' && src.length > 0) {
            images.push(src)
          }
        }
        uploadedImagesPerZone[zoneId as CanvasZone] = images
      }
    } catch {
      console.warn(`[exportHelpers] Failed to parse viewState for zone ${zoneId}`)
    }
  }

  return {
    product_id: productId,
    variant: { size, color },
    pricing: {
      base_price: basePrice,
      extra_charge: extraCharge,
      total_estimation: basePrice + extraCharge,
    },
    design_assets: {
      preview_base64: previewBase64,
      fabric_raw_json: fabricRawJsonPerZone,
      uploaded_images: uploadedImagesPerZone,
    },
  }
}

export const BLUEPRINT_STORAGE_KEY = 'canvas_blueprint'
export const VENDOR_BLUEPRINT_STORAGE_KEY = 'vendor_blueprint'

export function persistVendorBlueprint(): void {
  try {
    // Dynamic import avoidance: inline require or direct call
    const { snapshotAllZones, stripAssetSources } = require('@/lib/ui/blueprint-extractor')
    const snapshot = snapshotAllZones()
    try {
      sessionStorage.setItem(VENDOR_BLUEPRINT_STORAGE_KEY, JSON.stringify(snapshot))
      return
    } catch {
      console.warn('[Blueprint] Snapshot penuh di sessionStorage, menyimpan tanpa raw asset')
    }
    try {
      sessionStorage.setItem(
        VENDOR_BLUEPRINT_STORAGE_KEY,
        JSON.stringify(stripAssetSources(snapshot))
      )
    } catch {
      console.warn('[Blueprint] Snapshot gagal disimpan ke sessionStorage')
    }
  } catch (err) {
    console.warn('[Blueprint] Gagal persist snapshot vendor:', err)
  }
}

export function saveBlueprint(blueprint: CanvasBlueprint): void {
  try {
    localStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(blueprint))
  } catch (err) {
    console.error('[CanvasEditor] Failed to save blueprint to localStorage:', err)
  }
  persistVendorBlueprint()
}

export function loadBlueprint(): CanvasBlueprint | null {
  try {
    const raw = localStorage.getItem(BLUEPRINT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CanvasBlueprint) : null
  } catch {
    return null
  }
}
