/**
 * OWNERSHIP: Frontend
 * Singleton engine Fabric.js: load mockup, print-area clip, layer, view state.
 * State silang dipegang lib/ui/design-state.ts; config dari lib/config/{print-areas,
 * mockup-paths}. Lihat ARCHITECTURE.md section D.
 */
import { Canvas, FabricImage, FabricObject, Rect, Polygon, util } from 'fabric'
import { getPrintArea } from '@/lib/config/print-areas'
import { getMockupUrl } from '@/lib/config/mockup-paths'
import type { PrintArea } from '@/types/print-area'
import {
  getActiveZone,
  setActiveZone,
  getViewState,
  setViewState,
} from '@/lib/ui/design-state'
import type { CanvasZone } from '@/types/design'

let fabricCanvas: Canvas | null = null
let layerCounter = 0
// FIX #1: track which DOM element the singleton is bound to.
// ensureCanvas uses this for element-identity check so that a second <Canvas>
// mounting with a different <canvas> element doesn't silently inherit the wrong
// Fabric instance (the core of the "toxic singleton" race).
let boundElement: HTMLCanvasElement | null = null

// Design state (active zone + per-zone serialized objects) now lives in
// lib/ui/design-state.ts as a single channel.

const USER_PROPERTIES = ['id', 'name', 'view', 'isBackground'] as const

export function createCanvas(
  el: HTMLCanvasElement,
  options?: { width?: number; height?: number; backgroundColor?: string }
): Canvas {
  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
    boundElement = null // FIX #1: clear tracked element on dispose
  }

  fabricCanvas = new Canvas(el, {
    width: options?.width ?? 500,
    height: options?.height ?? 650,
    backgroundColor: options?.backgroundColor ?? '#ffffff',
    selection: true,
  })
  boundElement = el // FIX #1: record which DOM element owns this instance

  layerCounter = 0
  setActiveZone('front')

  return fabricCanvas
}

export function ensureCanvas(
  el: HTMLCanvasElement,
  options?: { width?: number; height?: number; backgroundColor?: string }
): Canvas {
  // FIX #1: require BOTH liveness AND element identity.
  // The old guard (liveness only) silently returned the instance even when a
  // second <Canvas> component mounted with a completely different <canvas> DOM
  // element, causing one Fabric instance to render into the wrong element.
  const stillLive = fabricCanvas?.getElement()?.isConnected ?? false
  if (fabricCanvas && stillLive && boundElement === el) return fabricCanvas
  return createCanvas(el, options)
}

export function getCanvas(): Canvas | null {
  return fabricCanvas
}

// FIX #2: exported dispose so canvas.tsx useEffect cleanup can call it,
// preventing OOM / listener leaks on client-side navigation.
export function disposeCanvas(): void {
  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
    boundElement = null // FIX #1+2: clear both on explicit dispose
  }
}



// ── Print Area Clipping ──────────────────────────────────────────

// TODO: When implementing export (toDataUrl/toSVG), `absolutePositioned`
// clipPaths are known to export incorrectly (fabric.js issue #8517).
// Mitigation: before export, use `sendObjectToPlane(clipPath, undefined,
// obj.calcTransformMatrix())` to convert clipPath coords to object-space,
// then remove `absolutePositioned`. Re-add it after export if needed.

function createPrintAreaClipPath(area: PrintArea): Polygon {
  return new Polygon([
    { x: area.x, y: area.y },
    { x: area.x + area.width, y: area.y },
    { x: area.x + area.width, y: area.y + area.height },
    { x: area.x, y: area.y + area.height },
  ], {
    fill: 'transparent',
    absolutePositioned: true,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
  })
}

function isUserObject(obj: FabricObject): boolean {
  return !(obj as any).isBackground && (obj as any).id !== '__debug_overlay__'
}

export function applyPrintAreaClip(
  obj: FabricObject,
  area: PrintArea
): void {
  obj.clipPath = createPrintAreaClipPath(area)
  obj.dirty = true
}

export function removePrintAreaClip(obj: FabricObject): void {
  obj.clipPath = undefined
  obj.dirty = true
}

export function reapplyAllClips(
  category: string,
  colorHex: string,
  view: string
): void {
  if (!fabricCanvas) return

  const area = getPrintArea(category, colorHex, view)
  const objects = fabricCanvas.getObjects().filter(isUserObject)

  for (const obj of objects) {
    if (area) {
      applyPrintAreaClip(obj, area)
    } else {
      removePrintAreaClip(obj)
    }
  }

  fabricCanvas.requestRenderAll()
}

// ── Per-Zone View State ──────────────────────────────────────────

interface SerializableObject {
  isBackground?: boolean
  id?: string
  [key: string]: unknown
}

function serializeUserObjects(canvas: Canvas): string {
  const json = canvas.toObject([...USER_PROPERTIES] as any) as {
    objects?: SerializableObject[]
  }
  const objects = (json.objects ?? []).filter(
    (o) =>
      !(o.isBackground === true) &&
      o.id !== '__background__' &&
      o.id !== '__debug_overlay__'
  )
  return JSON.stringify({ version: '1', objects })
}

export function saveViewState(zone: string): void {
  if (!fabricCanvas) return
  setViewState(zone, serializeUserObjects(fabricCanvas))
}

export async function loadViewState(zone: string): Promise<void> {
  if (!fabricCanvas) return
  const state = getViewState(zone)
  if (!state) return

  const parsed = JSON.parse(state)
  const objects = parsed.objects ?? []
  const revived = (await util.enlivenObjects(objects)) as FabricObject[]

  for (const obj of revived) {
    fabricCanvas.add(obj)
  }
  fabricCanvas.discardActiveObject()
  fabricCanvas.requestRenderAll()
}

export function clearUserObjects(): void {
  if (!fabricCanvas) return
  const toRemove = fabricCanvas.getObjects().filter(isUserObject)
  for (const obj of toRemove) {
    fabricCanvas.remove(obj)
  }
  fabricCanvas.discardActiveObject()
  fabricCanvas.requestRenderAll()
}

export async function switchView(
  fromZone: string,
  toZone: string,
  category: string,
  colorHex: string,
  signal?: AbortSignal // FIX #3: accept cancellation token from useEffect cleanup
): Promise<void> {
  if (!fabricCanvas) return
  if (getActiveZone() === toZone) return
  if (!getMockupUrl(category, colorHex, toZone)) {
    // Unknown zone (e.g. 'label') — nothing to switch to yet.
    return
  }
  setActiveZone(toZone as CanvasZone)
  fabricCanvas.discardActiveObject()

  saveViewState(fromZone)
  clearUserObjects()

  await setBackground(category, colorHex, toZone)
  // FIX #3: user may have clicked another zone while the image was loading;
  // bail out before touching the canvas state further.
  if (signal?.aborted) return

  await loadViewState(toZone)
  // FIX #3: guard again after the second async boundary.
  if (signal?.aborted) return

  reapplyAllClips(category, colorHex, toZone)
}


// ── Debug Overlay ────────────────────────────────────────────────

let debugOverlay: Rect | null = null
let debugLabel: FabricObject | null = null

export function showDebugOverlay(area: PrintArea): void {
  if (!fabricCanvas) return
  hideDebugOverlay()

  debugOverlay = new Rect({
    left: area.x,
    top: area.y,
    width: area.width,
    height: area.height,
    fill: 'rgba(255, 0, 0, 0.15)',
    stroke: '#ff0000',
    strokeWidth: 2,
    strokeDashArray: [6, 3],
    selectable: true,
    hasControls: true,
    hasBorders: true,
    lockRotation: false,
    id: '__debug_overlay__',
    name: 'Debug Print Area',
  })

  fabricCanvas.add(debugOverlay)
  fabricCanvas.setActiveObject(debugOverlay)
  fabricCanvas.requestRenderAll()
}

export function hideDebugOverlay(): void {
  if (!fabricCanvas) return
  if (debugOverlay) {
    fabricCanvas.remove(debugOverlay)
    debugOverlay = null
  }
  if (debugLabel) {
    fabricCanvas.remove(debugLabel)
    debugLabel = null
  }
  fabricCanvas.discardActiveObject()
  fabricCanvas.requestRenderAll()
}

export function getDebugOverlayCoords(): PrintArea | null {
  if (!debugOverlay) return null
  return {
    x: Math.round(debugOverlay.left ?? 0),
    y: Math.round(debugOverlay.top ?? 0),
    width: Math.round((debugOverlay.width ?? 0) * (debugOverlay.scaleX ?? 1)),
    height: Math.round((debugOverlay.height ?? 0) * (debugOverlay.scaleY ?? 1)),
  }
}

export function isDebugOverlayActive(): boolean {
  return debugOverlay !== null
}

// ── Mockup Loading ───────────────────────────────────────────────

// Per-zone target box (on-canvas px) that the garment should fit within,
// centered. These mirror the black variant's footprint (the "pas" reference)
// so every color & zone renders the garment at a consistent relative size.
const GARMENT_TARGET_BOX_BY_ZONE: Record<string, { width: number; height: number }> = {
  front: { width: 398, height: 513 },
  back: { width: 358, height: 503 },
  left: { width: 196, height: 555 },
  right: { width: 196, height: 555 },
}

const boundsCache = new Map<string, { x: number; y: number; width: number; height: number }>()

function detectContentBounds(cacheKey: string, img: FabricImage): { x: number; y: number; width: number; height: number } {
  const cached = boundsCache.get(cacheKey)
  if (cached) return cached

  const w = img.width ?? 1
  const h = img.height ?? 1
  const el = img.getElement() as HTMLImageElement
  const temp = document.createElement('canvas')
  temp.width = w
  temp.height = h
  const ctx = temp.getContext('2d')
  const bounds = { x: 0, y: 0, width: w, height: h }

  if (ctx) {
    ctx.drawImage(el, 0, 0, w, h)
    try {
      const data = ctx.getImageData(0, 0, w, h).data
      let minX = w, minY = h, maxX = -1, maxY = -1
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 40) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
          }
        }
      }
      if (maxX >= minX && maxY >= minY) {
        bounds.x = minX
        bounds.y = minY
        bounds.width = maxX - minX
        bounds.height = maxY - minY
      }
    } catch {
      // fall back to full-image bounds
    }
  }

  boundsCache.set(cacheKey, bounds)
  return bounds
}

// Cache of decoded mockup image elements keyed by URL (PRD §5.2). Reusing the
// decoded element avoids a network fetch + re-decode on repeated colour/zone
// combinations; the already-cached content bounds also skip the pixel scan.
const imageElementCache = new Map<string, Promise<HTMLImageElement>>()

function getDecodedImage(url: string): Promise<HTMLImageElement> {
  let p = imageElementCache.get(url)
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`image load failed: ${url}`))
      el.src = url
    })
    imageElementCache.set(url, p)
  }
  return p
}

// Shared background-swap routine (PRD §4.4). Guarantees strict ordering to
// avoid a mixed/stacked frame during color/zone changes:
//   1. fully await the new mockup image load,
//   2. only then remove the old background and add the new one,
//   3. render exactly once at the end.
// The old background is intentionally kept visible until the new one is ready,
// so there is never a blank flash or a frame showing two backgrounds at once.
export async function loadMockupImage(url: string, zone: string = 'front'): Promise<boolean> {
  if (!fabricCanvas || !url) return false

  setActiveZone(zone as CanvasZone)

  let img: FabricImage
  try {
    const el = await getDecodedImage(url)
    img = new FabricImage(el)
  } catch {
    return false
  }

  const canvasW = fabricCanvas.getWidth()
  const canvasH = fabricCanvas.getHeight()

  const garment = detectContentBounds(url, img)
  const target = GARMENT_TARGET_BOX_BY_ZONE[zone] ?? GARMENT_TARGET_BOX_BY_ZONE.front
  const scale = Math.min(target.width / garment.width, target.height / garment.height)

  img.scale(scale)
  img.set({
    left: canvasW / 2 - (garment.x + garment.width / 2) * scale,
    top: canvasH / 2 - (garment.y + garment.height / 2) * scale,
    originX: 'left',
    originY: 'top',
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    id: '__background__',
    isBackground: true,
  })

  const existing = fabricCanvas.getObjects().find(o => (o as any).isBackground === true)
  if (existing) {
    fabricCanvas.remove(existing)
  }

  fabricCanvas.add(img)
  fabricCanvas.sendObjectToBack(img)
  fabricCanvas.backgroundColor = 'transparent'
  fabricCanvas.requestRenderAll()
  return true
}

// Single shared entry point for swapping the garment background from a
// {category, color, zone} combo. Routes both color-recalling and view-switching
// through the same load-then-render path (PRD §4.4).
export async function setBackground(
  category: string,
  colorHex: string,
  zone: string
): Promise<boolean> {
  if (!fabricCanvas) return false
  const url = getMockupUrl(category, colorHex, zone)
  if (!url) {
    const existing = fabricCanvas.getObjects().find(o => (o as any).isBackground === true)
    if (existing) {
      fabricCanvas.remove(existing)
    }
    fabricCanvas.backgroundColor = 'transparent'
    fabricCanvas.requestRenderAll()
    return false
  }
  return loadMockupImage(url, zone)
}

export async function addImageToCanvas(
  url: string,
  view: string = 'front',
  category?: string,
  colorHex?: string,
): Promise<void> {
  if (!fabricCanvas) {
    console.error('[canvas-engine] No canvas instance — upload ignored')
    return
  }

  const img = await FabricImage.fromURL(url)

  const maxSize = 200
  const w = img.width ?? 1
  const h = img.height ?? 1
  const scale = Math.min(maxSize / w, maxSize / h, 1)
  img.scale(scale)

  const canvasW = fabricCanvas.getWidth()
  const canvasH = fabricCanvas.getHeight()
  layerCounter++
  img.set({
    left: canvasW / 2,
    top: canvasH / 2,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true,
    id: `layer-${layerCounter}`,
    name: `Image ${layerCounter}`,
    view,
  })

  if (category && colorHex) {
    const area = getPrintArea(category, colorHex, view)
    if (area) {
      applyPrintAreaClip(img, area)
    }
  }

  fabricCanvas.add(img)
  fabricCanvas.setActiveObject(img)
  fabricCanvas.requestRenderAll()
}

export function deleteSelectedObject(): void {
  if (!fabricCanvas) return
  const active = fabricCanvas.getActiveObject()
  if (!active) return
  if ((active as any).isBackground || (active as any).id === '__debug_overlay__') return
  fabricCanvas.remove(active)
  fabricCanvas.discardActiveObject()
  fabricCanvas.requestRenderAll()
}

export interface LayerData {
  id: string
  name: string
  type: 'image' | 'text' | 'clipart'
  visible: boolean
  locked: boolean
}

function classifyType(obj: FabricObject): 'image' | 'text' | 'clipart' {
  if (obj instanceof FabricImage) return 'image'
  if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') return 'text'
  return 'clipart'
}

export function getLayerObjects(): LayerData[] {
  if (!fabricCanvas) return []
  return fabricCanvas.getObjects()
    .filter(obj => !(obj as any).isBackground && (obj as any).id !== '__debug_overlay__')
    .map(obj => ({
      id: (obj as any).id ?? '',
      name: (obj as any).name ?? 'Object',
      type: classifyType(obj),
      visible: obj.visible !== false,
      locked: obj.selectable === false,
    }))
}

export function setLayerVisibility(id: string, visible: boolean): void {
  if (!fabricCanvas) return
  const obj = fabricCanvas.getObjects().find(o => (o as any).id === id)
  if (!obj || (obj as any).isBackground || (obj as any).id === '__debug_overlay__') return
  obj.set('visible', visible)
  fabricCanvas.requestRenderAll()
}

export function setLayerLocked(id: string, locked: boolean): void {
  if (!fabricCanvas) return
  const obj = fabricCanvas.getObjects().find(o => (o as any).id === id)
  if (!obj || (obj as any).isBackground || (obj as any).id === '__debug_overlay__') return
  obj.set({
    selectable: !locked,
    evented: !locked,
  })
  fabricCanvas.requestRenderAll()
}

export function deleteLayerById(id: string): void {
  if (!fabricCanvas) return
  const obj = fabricCanvas.getObjects().find(o => (o as any).id === id)
  if (!obj || (obj as any).isBackground || (obj as any).id === '__debug_overlay__') return
  fabricCanvas.remove(obj)
  if (fabricCanvas.getActiveObject() === obj) {
    fabricCanvas.discardActiveObject()
  }
  fabricCanvas.requestRenderAll()
}

export function moveLayerUp(id: string): void {
  if (!fabricCanvas) return
  const objects = fabricCanvas.getObjects().filter(o => !(o as any).isBackground && (o as any).id !== '__debug_overlay__')
  const index = objects.findIndex(o => (o as any).id === id)
  if (index < 0 || index >= objects.length - 1) return
  const target = objects[index]
  const next = objects[index + 1]
  const canvasObjects = fabricCanvas.getObjects()
  const targetIdx = canvasObjects.indexOf(target)
  const nextIdx = canvasObjects.indexOf(next)
  fabricCanvas.moveObjectTo(target, nextIdx)
  fabricCanvas.requestRenderAll()
}

export function moveLayerDown(id: string): void {
  if (!fabricCanvas) return
  const objects = fabricCanvas.getObjects().filter(o => !(o as any).isBackground && (o as any).id !== '__debug_overlay__')
  const index = objects.findIndex(o => (o as any).id === id)
  if (index <= 0) return
  const target = objects[index]
  const prev = objects[index - 1]
  const canvasObjects = fabricCanvas.getObjects()
  const targetIdx = canvasObjects.indexOf(target)
  const prevIdx = canvasObjects.indexOf(prev)
  fabricCanvas.moveObjectTo(target, prevIdx)
  fabricCanvas.requestRenderAll()
}

export function selectLayerById(id: string): void {
  if (!fabricCanvas) return
  const obj = fabricCanvas.getObjects().find(o => (o as any).id === id)
  if (!obj || (obj as any).isBackground || (obj as any).id === '__debug_overlay__') return
  fabricCanvas.setActiveObject(obj)
  fabricCanvas.requestRenderAll()
}
