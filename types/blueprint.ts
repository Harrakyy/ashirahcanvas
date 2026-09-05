/** Data contract for the client-side vendor production blueprint. */
export interface BlueprintAsset {
  zone: string
  src: string
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  name?: string
}

export interface ZoneBlueprint {
  zone: string
  hasDesign: boolean
  assets: BlueprintAsset[]
  canvasWidth?: number
  canvasHeight?: number
}

export interface BlueprintSnapshot {
  zones: ZoneBlueprint[]
  capturedAt: number
}
