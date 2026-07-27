import { Canvas, FabricImage, FabricObject, Rect, Polygon } from 'fabric'
import { getPrintArea, type PrintArea } from './print-areas'

let fabricCanvas: Canvas | null = null
let layerCounter = 0

export function createCanvas(
  el: HTMLCanvasElement,
  options?: { width?: number; height?: number; backgroundColor?: string }
): Canvas {
  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
  }

  fabricCanvas = new Canvas(el, {
    width: options?.width ?? 500,
    height: options?.height ?? 650,
    backgroundColor: options?.backgroundColor ?? '#ffffff',
    selection: true,
  })

  layerCounter = 0

  return fabricCanvas
}

export function ensureCanvas(
  el: HTMLCanvasElement,
  options?: { width?: number; height?: number; backgroundColor?: string }
): Canvas {
  if (fabricCanvas) return fabricCanvas
  return createCanvas(el, options)
}

export function getCanvas(): Canvas | null {
  return fabricCanvas
}

export function setZoom(level: number): void {
  if (!fabricCanvas) return
  const clamped = Math.max(0.5, Math.min(2, level))
  fabricCanvas.setZoom(clamped)
  fabricCanvas.renderAll()
}

export function getZoom(): number {
  return fabricCanvas?.getZoom() ?? 1
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

export async function loadMockupImage(url: string): Promise<boolean> {
  if (!fabricCanvas) return false

  const existing = fabricCanvas.getObjects().find(o => (o as any).isBackground === true)
  if (existing) {
    fabricCanvas.remove(existing)
  }

  try {
    const img = await FabricImage.fromURL(url)

    const canvasW = fabricCanvas.getWidth()
    const canvasH = fabricCanvas.getHeight()
    const imgW = img.width ?? 1
    const imgH = img.height ?? 1
    const scale = Math.min(canvasW / imgW, canvasH / imgH)

    img.scale(scale)
    img.set({
      left: canvasW / 2,
      top: canvasH / 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      id: '__background__',
      isBackground: true,
    })

    fabricCanvas.add(img)
    fabricCanvas.sendObjectToBack(img)
    fabricCanvas.backgroundColor = 'transparent'
    fabricCanvas.requestRenderAll()
    return true
  } catch {
    return false
  }
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

export function disposeCanvas(): void {
  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
  }
}
