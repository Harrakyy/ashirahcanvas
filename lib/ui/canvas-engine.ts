/**
 * OWNERSHIP: Frontend
 * Singleton engine Fabric.js: load mockup, print-area clip, layer, view state.
 * State silang dipegang lib/ui/design-state.ts; config dari lib/config/{print-areas,
 * mockup-paths}. Lihat ARCHITECTURE.md section D.
 */
import { Canvas, FabricImage, FabricObject, Rect, Circle, Triangle, Path, Polygon, Textbox, util } from 'fabric'
import { getPrintArea, getPrintAreaForZone } from '@/lib/config/print-areas'
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

const USER_PROPERTIES = [
  'id',
  'name',
  'view',
  'isBackground',
  'sourceFileName',
  'selectable',
  'evented',
  'lockRotation',
] as const

export function generateLayerId(): string {
  layerCounter++
  return `layer-${Date.now()}-${layerCounter}-${Math.random().toString(36).slice(2, 6)}`
}

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
  historyManager.init(fabricCanvas)
  if (typeof window !== 'undefined') {
    ;(window as any).__fabricCanvas = fabricCanvas
  }

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
  return (
    !(obj as any).isBackground &&
    (obj as any).id !== '__debug_overlay__' &&
    (obj as any).id !== '__safe_zone_guide__'
  )
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

  const area = (category && colorHex ? getPrintArea(category, colorHex, view) : null) ?? getPrintAreaForZone(view)
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

export function serializeUserObjects(canvas: Canvas): string {
  const json = canvas.toObject([...USER_PROPERTIES] as any) as {
    objects?: SerializableObject[]
  }
  const objects = (json.objects ?? []).filter(
    (o) =>
      !(o.isBackground === true) &&
      o.id !== '__background__' &&
      o.id !== '__debug_overlay__' &&
      o.id !== '__safe_zone_guide__'
  )
  return JSON.stringify({ version: '1', objects })
}

export function saveViewState(zone: string): void {
  if (!fabricCanvas) return
  setViewState(zone, serializeUserObjects(fabricCanvas))
}

function setupTextboxScalingBehavior(textObj: Textbox): void {
  const syncTextboxScalingToWidth = () => {
    if ((textObj.scaleX && textObj.scaleX !== 1) || (textObj.scaleY && textObj.scaleY !== 1)) {
      const currentScale = textObj.scaleX ?? 1
      const newWidth = Math.max(textObj.dynamicMinWidth || 20, (textObj.width ?? 100) * currentScale)
      textObj.set({
        width: newWidth,
        scaleX: 1,
        scaleY: 1,
      })
      textObj.initDimensions()
      textObj.setCoords()
      fabricCanvas?.requestRenderAll()
    }
  }

  textObj.on('scaling', syncTextboxScalingToWidth)
  textObj.on('resizing', () => {
    textObj.initDimensions()
    textObj.setCoords()
  })
}

export async function loadViewState(zone: string): Promise<void> {
  if (!fabricCanvas) return
  const state = getViewState(zone)
  if (!state) return

  const parsed = JSON.parse(state)
  const objects = parsed.objects ?? []
  const revived = (await util.enlivenObjects(objects)) as FabricObject[]

  for (const obj of revived) {
    if ((obj as any).lockRotation) {
      obj.setControlVisible('mtr', false)
    }
    if (obj instanceof Textbox || (obj as any).type === 'textbox') {
      setupTextboxScalingBehavior(obj as Textbox)
    }
    if (!(obj as any).id) {
      ;(obj as any).id = generateLayerId()
    }
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

  // Clear history for the zone we're leaving — each zone has its own independent history.
  historyManager.clear()

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
  updateSafeZoneGuide(toZone)
}

// ── Safe Zone Guide (Selalu Terlihat) ───────────────────────────

let safeZoneGuide: Rect | null = null

export function updateSafeZoneGuide(zone?: string): void {
  if (!fabricCanvas) return

  if (safeZoneGuide) {
    fabricCanvas.remove(safeZoneGuide)
    safeZoneGuide = null
  }

  const currentZone = zone ?? getActiveZone()
  const area = getPrintAreaForZone(currentZone)
  if (!area) {
    fabricCanvas.requestRenderAll()
    return
  }

  safeZoneGuide = new Rect({
    left: area.x,
    top: area.y,
    width: area.width,
    height: area.height,
    originX: 'left',
    originY: 'top',
    fill: 'transparent',
    stroke: 'rgba(100, 116, 139, 0.5)', // Garis putus-putus tipis abu-abu kontras tapi tenang
    strokeWidth: 1.5,
    strokeDashArray: [6, 4],
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
    id: '__safe_zone_guide__',
    name: 'Safe Zone Guide',
    hoverCursor: 'default',
  })

  fabricCanvas.add(safeZoneGuide)
  // Tempatkan tepat di atas background garment agar tidak menutupi objek user
  const bg = fabricCanvas.getObjects().find((o) => (o as any).isBackground)
  if (bg) {
    const bgIdx = fabricCanvas.getObjects().indexOf(bg)
    fabricCanvas.moveObjectTo(safeZoneGuide, bgIdx + 1)
  }
  fabricCanvas.requestRenderAll()
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
    originX: 'left',
    originY: 'top',
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
export const GARMENT_TARGET_BOX_BY_ZONE: Record<string, { width: number; height: number }> = {
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
  updateSafeZoneGuide(zone)
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
  sourceFileName?: string,
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
  const cleanName = sourceFileName ? sourceFileName.replace(/\.[^/.]+$/, '') : `Image ${layerCounter}`

  const layerId = generateLayerId()
  img.set({
    left: canvasW / 2,
    top: canvasH / 2,
    originX: 'center',
    originY: 'center',
    selectable: true,
    hasControls: true,
    hasBorders: true,
    id: layerId,
    name: cleanName,
    sourceFileName: cleanName,
    view,
    // Rendering solid normal (Photoshop/Figma layer stacking)
    // Lock rotation: hilangkan kontrol putar (lebih presisi + hemat kalkulasi
    // matriks di HP). Jangan terapkan ke background — hanya objek user.
    lockRotation: true,
  })

  // Sembunyikan titik rotasi (handle hijau Fabric='mtr') di kontrol objek.
  img.setControlVisible('mtr', false)

  const area = (category && colorHex ? getPrintArea(category, colorHex, view) : null) ?? getPrintAreaForZone(view)
  if (area) {
    applyPrintAreaClip(img, area)
  }

  fabricCanvas.add(img)
  fabricCanvas.setActiveObject(img)
  fabricCanvas.requestRenderAll()
}

function estimateTextWidth(text: string, fontSize: number, fontFamily: string): number {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.font = `${fontSize}px "${fontFamily}", sans-serif`
      const lines = text.split('\n')
      let maxLineWidth = 0
      for (const line of lines) {
        const w = ctx.measureText(line).width
        if (w > maxLineWidth) maxLineWidth = w
      }
      return maxLineWidth
    }
  }
  const lines = text.split('\n')
  const longest = Math.max(...lines.map(l => l.length), 1)
  return longest * fontSize * 0.6
}

export async function addTextToCanvas(
  text: string,
  fontFamily: string = 'Inter',
  fill: string = '#000000',
  view: string = 'front',
  category?: string,
  colorHex?: string
): Promise<void> {
  if (!fabricCanvas) {
    console.error('[canvas-engine] No canvas instance — add text ignored')
    return
  }

  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.load(`16px "${fontFamily}"`)
    }
  } catch {
    // proceed even if font load API throws
  }

  const canvasW = fabricCanvas.getWidth()
  const canvasH = fabricCanvas.getHeight()

  const area = (category && colorHex ? getPrintArea(category, colorHex, view) : null) ?? getPrintAreaForZone(view)
  const maxSafeWidth = area ? Math.max(area.width - 24, 100) : 180
  const measuredWidth = estimateTextWidth(text || 'Teks Baru', 28, fontFamily)
  // Dynamic initial width: fit text + small padding, capped at safe max width (so long text auto-wraps inside Safe_Zone)
  const initialWidth = Math.min(Math.max(80, Math.ceil(measuredWidth + 16)), maxSafeWidth)
  const layerId = generateLayerId()

  const textObj = new Textbox(text || 'Teks Baru', {
    left: canvasW / 2,
    top: canvasH / 2,
    originX: 'center',
    originY: 'center',
    fontFamily: fontFamily,
    fontSize: 28,
    fill: fill,
    textAlign: 'center',
    width: initialWidth,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    id: layerId,
    name: text || `Teks ${layerCounter}`,
    view,
    lockRotation: true,
    splitByGrapheme: false,
  })

  textObj.setControlVisible('mtr', false)
  setupTextboxScalingBehavior(textObj)

  if (area) {
    applyPrintAreaClip(textObj, area)
  }

  fabricCanvas.add(textObj)
  textObj.setCoords()
  fabricCanvas.setActiveObject(textObj)
  fabricCanvas.requestRenderAll()
}

export function updateSelectedText(updates: {
  text?: string
  fontFamily?: string
  fill?: string
  fontWeight?: string
  fontStyle?: string
  textAlign?: string
  fontSize?: number
}): void {
  if (!fabricCanvas) return
  const active = fabricCanvas.getActiveObject()
  if (!active || !(active instanceof Textbox || (active as any).type === 'textbox')) return

  if (updates.text !== undefined) {
    ;(active as any).set('text', updates.text)
    ;(active as any).set('name', updates.text)
    ;(active as any).initDimensions?.()
  }
  if (updates.fontFamily !== undefined) {
    ;(active as any).set('fontFamily', updates.fontFamily)
    ;(active as any).initDimensions?.()
  }
  if (updates.fill !== undefined) {
    ;(active as any).set('fill', updates.fill)
  }
  if (updates.fontWeight !== undefined) {
    ;(active as any).set('fontWeight', updates.fontWeight)
    ;(active as any).initDimensions?.()
  }
  if (updates.fontStyle !== undefined) {
    ;(active as any).set('fontStyle', updates.fontStyle)
    ;(active as any).initDimensions?.()
  }
  if (updates.textAlign !== undefined) {
    ;(active as any).set('textAlign', updates.textAlign)
  }
  if (updates.fontSize !== undefined) {
    ;(active as any).set('fontSize', Math.max(8, Math.min(200, updates.fontSize)))
    ;(active as any).initDimensions?.()
  }
  active.setCoords()
  fabricCanvas.requestRenderAll()
  fabricCanvas.fire('object:modified', { target: active })
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

export async function duplicateSelectedObject(): Promise<void> {
  if (!fabricCanvas) return
  const active = fabricCanvas.getActiveObject()
  if (!active || (active as any).isBackground) return

  const cloned = await active.clone([...USER_PROPERTIES] as any)
  const OFFSET = 15
  cloned.set({
    left: (active.left ?? 0) + OFFSET,
    top: (active.top ?? 0) + OFFSET,
    id: generateLayerId(),
    name: `${(active as any).name ?? 'Objek'} (copy)`,
  })
  if ((active as any).lockRotation) {
    cloned.setControlVisible('mtr', false)
  }
  if (cloned instanceof Textbox || (cloned as any).type === 'textbox') {
    setupTextboxScalingBehavior(cloned as Textbox)
  }
  fabricCanvas.add(cloned)
  fabricCanvas.setActiveObject(cloned)
  fabricCanvas.requestRenderAll()
  fabricCanvas.fire('object:modified', { target: cloned })
}

export function flipSelectedObject(direction: 'x' | 'y'): void {
  if (!fabricCanvas) return
  const active = fabricCanvas.getActiveObject()
  if (!active || (active as any).isBackground) return
  if (direction === 'x') {
    active.set('flipX', !active.flipX)
  } else {
    active.set('flipY', !active.flipY)
  }
  active.setCoords()
  fabricCanvas.requestRenderAll()
  fabricCanvas.fire('object:modified', { target: active })
}

export function centerSelectedObject(axis: 'h' | 'v' | 'both'): void {
  if (!fabricCanvas) return
  const active = fabricCanvas.getActiveObject()
  if (!active || (active as any).isBackground) return

  const canvasW = fabricCanvas.getWidth()
  const canvasH = fabricCanvas.getHeight()
  const bounds = active.getBoundingRect()
  const objW = bounds.width
  const objH = bounds.height

  const updates: { left?: number; top?: number } = {}
  if (axis === 'h' || axis === 'both') {
    // Center within canvas and switch originX to 'left' for predictable positioning
    updates.left = (canvasW - objW) / 2
    active.set('originX', 'left')
  }
  if (axis === 'v' || axis === 'both') {
    updates.top = (canvasH - objH) / 2
    active.set('originY', 'top')
  }
  active.set(updates)
  active.setCoords()
  fabricCanvas.requestRenderAll()
  fabricCanvas.fire('object:modified', { target: active })
}

export type ShapeType = 'rect' | 'circle' | 'triangle' | 'star' | 'arrow' | 'line'

export function addShapeToCanvas(type: ShapeType, fill = '#000000'): void {
  if (!fabricCanvas) return

  const canvasW = fabricCanvas.getWidth()
  const canvasH = fabricCanvas.getHeight()
  const baseOpts = {
    left: canvasW / 2,
    top: canvasH / 2,
    originX: 'center' as const,
    originY: 'center' as const,
    fill,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    lockRotation: true,
    id: generateLayerId(),
    name: type.charAt(0).toUpperCase() + type.slice(1),
    view: getActiveZone(),
  }

  let shape: FabricObject

  if (type === 'rect') {
    shape = new Rect({ ...baseOpts, width: 120, height: 80, rx: 4, ry: 4 })
  } else if (type === 'circle') {
    shape = new Circle({ ...baseOpts, radius: 60 })
  } else if (type === 'triangle') {
    shape = new Triangle({ ...baseOpts, width: 100, height: 100 })
  } else if (type === 'star') {
    // 5-point star via SVG path
    const starPath = 'M 0 -80 L 18.7 -58 L 47.6 -61.8 L 28.2 -39.3 L 47.6 -18.7 L 19.1 -22.5 L 0 0 L -19.1 -22.5 L -47.6 -18.7 L -28.2 -39.3 L -47.6 -61.8 L -18.7 -58 Z'
    shape = new Path(starPath, { ...baseOpts, fill })
  } else if (type === 'arrow') {
    const arrowPath = 'M -60 -15 L 10 -15 L 10 -35 L 60 0 L 10 35 L 10 15 L -60 15 Z'
    shape = new Path(arrowPath, { ...baseOpts, fill })
  } else {
    // line
    shape = new Rect({ ...baseOpts, width: 120, height: 4, rx: 2, ry: 2 })
  }

  shape.setControlVisible('mtr', false)

  const area = getPrintAreaForZone(getActiveZone())
  if (area) {
    applyPrintAreaClip(shape, area)
  }

  fabricCanvas.add(shape)
  fabricCanvas.setActiveObject(shape)
  fabricCanvas.requestRenderAll()
}

export interface LayerData {
  id: string
  name: string
  type: 'image' | 'text' | 'clipart'
  visible: boolean
  locked: boolean
  sourceFileName?: string
  text?: string
}

function classifyType(obj: FabricObject): 'image' | 'text' | 'clipart' {
  if (obj instanceof FabricImage) return 'image'
  if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') return 'text'
  return 'clipart'
}

export function getLayerObjects(): LayerData[] {
  if (!fabricCanvas) return []
  return fabricCanvas.getObjects()
    .filter(isUserObject)
    // Balik urutan: objek paling atas (z-index tertinggi) tampil pertama di panel
    .reverse()
    .map(obj => {
      const typed = obj as any
      const type = classifyType(obj)
      let displayName = typed.name || 'Objek'

      if (type === 'image') {
        displayName = typed.sourceFileName || typed.name || 'Gambar'
      } else if (type === 'text') {
        // Selalu ambil dari typed.text (isi aktual) bukan typed.name (bisa stale)
        const rawText = typed.text ?? typed.name ?? 'Teks'
        const singleLine = rawText.replace(/\r?\n/g, ' ').trim()
        displayName = singleLine.length > 20 ? `${singleLine.slice(0, 20)}...` : singleLine || 'Teks'
      }

      return {
        id: typed.id ?? '',
        name: displayName,
        type,
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        sourceFileName: typed.sourceFileName,
        text: typed.text,
      }
    })
}

export function setLayerVisibility(id: string, visible: boolean): void {
  if (!fabricCanvas) return
  const obj = fabricCanvas.getObjects().find(o => isUserObject(o) && (o as any).id === id)
  if (!obj) return
  obj.set({
    visible,
    evented: visible && (obj as any).selectable !== false,
  })
  if (!visible && fabricCanvas.getActiveObject() === obj) {
    fabricCanvas.discardActiveObject()
  }
  fabricCanvas.requestRenderAll()
  fabricCanvas.fire('object:modified', { target: obj })
}

export function setLayerLocked(id: string, locked: boolean): void {
  if (!fabricCanvas) return
  const obj = fabricCanvas.getObjects().find(o => isUserObject(o) && (o as any).id === id)
  if (!obj) return
  obj.set({
    selectable: !locked,
    evented: !locked && obj.visible !== false,
  })
  if (locked && fabricCanvas.getActiveObject() === obj) {
    fabricCanvas.discardActiveObject()
  }
  fabricCanvas.requestRenderAll()
  fabricCanvas.fire('object:modified', { target: obj })
}

export function deleteLayerById(id: string): void {
  if (!fabricCanvas) return
  const obj = fabricCanvas.getObjects().find(o => isUserObject(o) && (o as any).id === id)
  if (!obj) return
  if (fabricCanvas.getActiveObject() === obj) {
    fabricCanvas.discardActiveObject()
  }
  fabricCanvas.remove(obj)
  fabricCanvas.requestRenderAll()
}

export function moveLayerUp(id: string): void {
  if (!fabricCanvas) return
  const objects = fabricCanvas.getObjects().filter(isUserObject)
  const index = objects.findIndex(o => (o as any).id === id)
  if (index < 0 || index >= objects.length - 1) return
  const target = objects[index]
  const next = objects[index + 1]
  const canvasObjects = fabricCanvas.getObjects()
  const nextIdx = canvasObjects.indexOf(next)
  fabricCanvas.moveObjectTo(target, nextIdx)
  fabricCanvas.requestRenderAll()
  fabricCanvas.fire('object:modified', { target })
}

export function moveLayerDown(id: string): void {
  if (!fabricCanvas) return
  const objects = fabricCanvas.getObjects().filter(isUserObject)
  const index = objects.findIndex(o => (o as any).id === id)
  if (index <= 0) return
  const target = objects[index]
  const prev = objects[index - 1]
  const canvasObjects = fabricCanvas.getObjects()
  const prevIdx = canvasObjects.indexOf(prev)
  fabricCanvas.moveObjectTo(target, prevIdx)
  fabricCanvas.requestRenderAll()
  fabricCanvas.fire('object:modified', { target })
}

export function reorderLayer(draggedId: string, targetId: string): void {
  if (!fabricCanvas || draggedId === targetId) return
  const objects = fabricCanvas.getObjects().filter(isUserObject)
  const dragged = objects.find(o => (o as any).id === draggedId)
  const target = objects.find(o => (o as any).id === targetId)
  if (!dragged || !target) return

  const canvasObjects = fabricCanvas.getObjects()
  const targetCanvasIdx = canvasObjects.indexOf(target)
  if (targetCanvasIdx < 0) return

  fabricCanvas.moveObjectTo(dragged, targetCanvasIdx)
  fabricCanvas.requestRenderAll()
  fabricCanvas.fire('object:modified', { target: dragged })
}

export function selectLayerById(id: string): void {
  if (!fabricCanvas) return
  const obj = fabricCanvas.getObjects().find(o => isUserObject(o) && (o as any).id === id)
  if (!obj) return
  if (obj.selectable !== false) {
    fabricCanvas.setActiveObject(obj)
  } else {
    fabricCanvas.discardActiveObject()
  }
  fabricCanvas.requestRenderAll()
}

// ── History Manager (Undo / Redo) ────────────────────────────────
//
// Per-zone in-memory history. Each canvas event pushes a serialized snapshot
// of all user objects. Max 30 entries — older entries are dropped from the front.
// Snapshots are produced via serializeUserObjects() (same path used by auto-save)
// so the round-trip revive path is already tested.

const MAX_HISTORY = 30

class HistoryManager {
  private stack: string[] = []
  private cursor = -1 // points to current snapshot in stack
  private canvas: Canvas | null = null
  private ignoreNext = false // prevent push during undo/redo restores

  init(canvas: Canvas): void {
    // Detach from any previous canvas instance
    if (this.canvas) {
      this.canvas.off('object:added', this._onChanged)
      this.canvas.off('object:modified', this._onChanged)
      this.canvas.off('object:removed', this._onChanged)
    }
    this.canvas = canvas
    this.stack = []
    this.cursor = -1
    canvas.on('object:added', this._onChanged)
    canvas.on('object:modified', this._onChanged)
    canvas.on('object:removed', this._onChanged)
  }

  clear(): void {
    this.stack = []
    this.cursor = -1
  }

  private _onChanged = (): void => {
    if (this.ignoreNext) return
    if (!this.canvas) return
    const snapshot = serializeUserObjects(this.canvas)
    // Discard any redo entries ahead of cursor
    this.stack = this.stack.slice(0, this.cursor + 1)
    this.stack.push(snapshot)
    if (this.stack.length > MAX_HISTORY) {
      this.stack.shift()
    }
    this.cursor = this.stack.length - 1
  }

  canUndo(): boolean {
    return this.cursor > 0
  }

  canRedo(): boolean {
    return this.cursor < this.stack.length - 1
  }

  async undo(): Promise<void> {
    if (!this.canvas || !this.canUndo()) return
    this.cursor--
    await this._applySnapshot(this.stack[this.cursor])
  }

  async redo(): Promise<void> {
    if (!this.canvas || !this.canRedo()) return
    this.cursor++
    await this._applySnapshot(this.stack[this.cursor])
  }

  private async _applySnapshot(snapshot: string): Promise<void> {
    if (!this.canvas) return
    this.ignoreNext = true
    try {
      // Remove all user objects without triggering history push
      const toRemove = this.canvas.getObjects().filter(isUserObject)
      for (const obj of toRemove) this.canvas.remove(obj)

      const parsed = JSON.parse(snapshot) as { objects?: any[] }
      const objects = parsed.objects ?? []
      if (objects.length > 0) {
        const revived = (await util.enlivenObjects(objects)) as FabricObject[]
        for (const obj of revived) {
          if ((obj as any).lockRotation) obj.setControlVisible('mtr', false)
          if (obj instanceof Textbox || (obj as any).type === 'textbox') {
            setupTextboxScalingBehavior(obj as Textbox)
          }
          this.canvas.add(obj)
        }
      }
      this.canvas.discardActiveObject()
      this.canvas.requestRenderAll()
      // Sync auto-save state after undo/redo
      setViewState(getActiveZone(), snapshot)
    } finally {
      this.ignoreNext = false
    }
  }
}

export const historyManager = new HistoryManager()

export function undoCanvas(): Promise<void> {
  return historyManager.undo()
}

export function redoCanvas(): Promise<void> {
  return historyManager.redo()
}

export function canUndoCanvas(): boolean {
  return historyManager.canUndo()
}

export function canRedoCanvas(): boolean {
  return historyManager.canRedo()
}
