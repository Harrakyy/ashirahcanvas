import type { CanvasZone } from '@/types/design'

export interface BlueprintAsset {
  zone: string
  src: string
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  originX: 'left' | 'center' | 'right'
  originY: 'top' | 'center' | 'bottom'
  angle: number
  name?: string
  text?: string
  fill?: string
  fontSize?: number
  fontFamily?: string
}

export interface ZoneBlueprint {
  zone: string
  hasDesign: boolean
  assets: BlueprintAsset[]
  mockupUrl: string | null
}

export interface BlueprintSnapshot {
  zones: ZoneBlueprint[]
  capturedAt: number
  category: string
  colorHex: string
  colorName?: string
  canvasWidth: number
  canvasHeight: number
  assetsOmitted: boolean
  previewBase64?: string
  preview_base64?: string
  design_assets?: {
    preview_base64?: string
    fabric_raw_json?: Record<string, object | null>
    uploaded_images?: Record<string, string[]>
  }
}

export interface CanvasBlueprint {
  tenant_id?: string
  product_id: string
  variant: {
    size: string
    color: string
  }
  pricing: {
    base_price: number
    extra_charge: number
    total_estimation: number
  }
  design_assets: {
    preview_base64: string
    fabric_raw_json: Record<CanvasZone, object | null>
    uploaded_images: Record<CanvasZone, string[]>
  }
  snapshot?: BlueprintSnapshot
}
