import { ACTIVE_ZONES } from '@/lib/config/zones'
import { getMockupUrl } from '@/lib/config/mockup-paths'
import { getCanvas, serializeUserObjects } from '@/lib/ui/canvas-engine'
import { getActiveColor, getActiveZone, getViewState } from '@/lib/ui/design-state'
import { useDesignStore } from '@/store/design-store'
import type {
  BlueprintAsset,
  BlueprintSnapshot,
  ZoneBlueprint,
} from '@/types/blueprint'

const DEFAULT_CANVAS_WIDTH = 500
const DEFAULT_CANVAS_HEIGHT = 650

const ORIGIN_X_VALUES = ['left', 'center', 'right'] as const
const ORIGIN_Y_VALUES = ['top', 'center', 'bottom'] as const

type SerializedObject = Record<string, unknown>

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toOriginX(value: unknown): BlueprintAsset['originX'] {
  return ORIGIN_X_VALUES.find(o => o === value) ?? 'center'
}

function toOriginY(value: unknown): BlueprintAsset['originY'] {
  return ORIGIN_Y_VALUES.find(o => o === value) ?? 'center'
}

function parseObjects(state: string | null): SerializedObject[] {
  if (!state) return []
  try {
    const parsed = JSON.parse(state) as { objects?: unknown }
    return Array.isArray(parsed.objects)
      ? (parsed.objects.filter(o => typeof o === 'object' && o !== null) as SerializedObject[])
      : []
  } catch {
    return []
  }
}

function readZoneObjects(zone: string): SerializedObject[] {
  const canvas = getCanvas()
  if (canvas && getActiveZone() === zone) {
    return parseObjects(serializeUserObjects(canvas))
  }
  return parseObjects(getViewState(zone))
}

function isImageObject(obj: SerializedObject): boolean {
  if (typeof obj.src !== 'string' || obj.src.length === 0) return false
  const type = typeof obj.type === 'string' ? obj.type.toLowerCase() : ''
  return type === '' || type === 'image'
}

export function extractZoneAssets(
  zone: string,
  objects: SerializedObject[] = readZoneObjects(zone)
): BlueprintAsset[] {
  return objects.filter(isImageObject).map(obj => ({
    zone,
    src: obj.src as string,
    left: toNumber(obj.left, 0),
    top: toNumber(obj.top, 0),
    width: toNumber(obj.width, 0),
    height: toNumber(obj.height, 0),
    scaleX: toNumber(obj.scaleX, 1),
    scaleY: toNumber(obj.scaleY, 1),
    originX: toOriginX(obj.originX),
    originY: toOriginY(obj.originY),
    angle: toNumber(obj.angle, 0),
    name: typeof obj.name === 'string' ? obj.name : undefined,
  }))
}

export function snapshotAllZones(): BlueprintSnapshot {
  const canvas = getCanvas()
  const category = useDesignStore.getState().selectedCategory
  const colorHex = getActiveColor()

  const zones: ZoneBlueprint[] = ACTIVE_ZONES.map(zone => {
    const assets = extractZoneAssets(zone, readZoneObjects(zone))
    return {
      zone,
      hasDesign: assets.length > 0,
      assets,
      mockupUrl: getMockupUrl(category, colorHex, zone),
    }
  })

  return {
    zones,
    capturedAt: Date.now(),
    category,
    colorHex,
    canvasWidth: canvas?.getWidth() ?? DEFAULT_CANVAS_WIDTH,
    canvasHeight: canvas?.getHeight() ?? DEFAULT_CANVAS_HEIGHT,
    assetsOmitted: false,
  }
}

export function stripAssetSources(snapshot: BlueprintSnapshot): BlueprintSnapshot {
  return {
    ...snapshot,
    assetsOmitted: true,
    zones: snapshot.zones.map(zone => ({
      ...zone,
      assets: zone.assets.map(asset => ({ ...asset, src: '' })),
    })),
  }
}
