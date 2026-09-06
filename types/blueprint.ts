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
  canvasWidth: number
  canvasHeight: number
  assetsOmitted: boolean
}
