/** Client-only, read-only extraction of Fabric's serialized per-zone state. */
import { ACTIVE_ZONES } from '@/lib/config/zones'
import { getActiveZone, getViewState } from '@/lib/ui/design-state'
import { saveViewState } from '@/lib/ui/canvas-engine'
import type { BlueprintAsset, BlueprintSnapshot, ZoneBlueprint } from '@/types/blueprint'

interface SerializedFabricObject {
  type?: string; src?: unknown; left?: unknown; top?: unknown; width?: unknown
  height?: unknown; scaleX?: unknown; scaleY?: unknown; name?: unknown
  isBackground?: unknown; id?: unknown
}
interface SerializedZoneState { objects?: SerializedFabricObject[]; width?: unknown; height?: unknown }

const numberValue = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

/** Parse one zone's serialized Fabric state into customer-uploaded image assets. */
export function extractZoneAssets(zone: string, state = getViewState(zone)): ZoneBlueprint {
  let parsed: SerializedZoneState = {}
  if (state) try { parsed = JSON.parse(state) as SerializedZoneState } catch { /* malformed state is empty */ }

  const assets: BlueprintAsset[] = (parsed.objects ?? []).flatMap(object => {
    const src = typeof object.src === 'string' ? object.src : null
    const userObject = object.isBackground !== true && object.id !== '__background__' && object.id !== '__debug_overlay__'
    if (!userObject || object.type !== 'Image' || !src?.startsWith('data:image/')) return []
    return [{ zone, src, left: numberValue(object.left, 0), top: numberValue(object.top, 0),
      width: numberValue(object.width, 0), height: numberValue(object.height, 0),
      scaleX: numberValue(object.scaleX, 1), scaleY: numberValue(object.scaleY, 1),
      name: typeof object.name === 'string' ? object.name : undefined }]
  })
  return { zone, hasDesign: assets.length > 0, assets,
    canvasWidth: numberValue(parsed.width, 500), canvasHeight: numberValue(parsed.height, 650) }
}

/** Capture all production zones, including the zone currently mounted on Fabric. */
export function snapshotAllZones(): BlueprintSnapshot {
  saveViewState(getActiveZone())
  return { zones: ACTIVE_ZONES.map(zone => extractZoneAssets(zone)), capturedAt: Date.now() }
}
