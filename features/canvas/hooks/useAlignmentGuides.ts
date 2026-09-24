'use client'

/**
 * useAlignmentGuides — Smart snapping & alignment guide lines untuk canvas.
 *
 * Menggambar garis bantu biru saat objek digeser mendekati:
 *   1. Tengah horizontal / vertikal canvas
 *   2. Sisi atas/bawah/kiri/kanan safe zone
 *   3. Tengah horizontal / vertikal safe zone
 *
 * Auto-snap: Jika delta ke garis panduan < SNAP_THRESHOLD px,
 * posisi objek di-set tepat ke koordinat guide.
 *
 * Semua gambar guide dilakukan langsung ke upperCanvas (Fabric overlay) via
 * canvas.contextTop dan dibersihkan setiap object:moving event.
 */

import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { Canvas, FabricObject } from 'fabric'
import { getPrintAreaForZone } from '@/lib/config/print-areas'
import { getActiveZone } from '@/lib/ui/design-state'

type CanvasRef = MutableRefObject<Canvas | null>

interface GuideLine {
  type: 'h' | 'v'
  pos: number
  label?: string
}

const SNAP_THRESHOLD = 7

function getGuideLines(canvas: Canvas): GuideLine[] {
  const W = canvas.getWidth()
  const H = canvas.getHeight()
  const guides: GuideLine[] = [
    { type: 'v', pos: W / 2, label: 'center-v' },
    { type: 'h', pos: H / 2, label: 'center-h' },
  ]

  const zone = getActiveZone()
  const area = getPrintAreaForZone(zone)
  if (area) {
    guides.push(
      { type: 'v', pos: area.x, label: 'safe-left' },
      { type: 'v', pos: area.x + area.width, label: 'safe-right' },
      { type: 'v', pos: area.x + area.width / 2, label: 'safe-center-v' },
      { type: 'h', pos: area.y, label: 'safe-top' },
      { type: 'h', pos: area.y + area.height, label: 'safe-bottom' },
      { type: 'h', pos: area.y + area.height / 2, label: 'safe-center-h' },
    )
  }
  return guides
}

function drawGuides(canvas: Canvas, activeGuides: GuideLine[]) {
  const ctx = (canvas as any).contextTop as CanvasRenderingContext2D | undefined
  if (!ctx) return

  ctx.save()
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 4])
  ctx.globalAlpha = 0.85

  const W = canvas.getWidth()
  const H = canvas.getHeight()

  for (const g of activeGuides) {
    ctx.beginPath()
    if (g.type === 'v') {
      ctx.moveTo(g.pos, 0)
      ctx.lineTo(g.pos, H)
    } else {
      ctx.moveTo(0, g.pos)
      ctx.lineTo(W, g.pos)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function clearGuides(canvas: Canvas) {
  const ctx = (canvas as any).contextTop as CanvasRenderingContext2D | undefined
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.getWidth(), canvas.getHeight())
}

export function useAlignmentGuides(canvasRef: CanvasRef) {
  const activeGuidesRef = useRef<GuideLine[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMoving = (e: any) => {
      const obj: FabricObject = e.target
      if (!obj || (obj as any).isBackground) return

      const bounds = obj.getBoundingRect()
      const objLeft = bounds.left
      const objRight = bounds.left + bounds.width
      const objTop = bounds.top
      const objBottom = bounds.top + bounds.height
      const objCenterX = objLeft + bounds.width / 2
      const objCenterY = objTop + bounds.height / 2

      const allGuides = getGuideLines(canvas)
      const snapped: GuideLine[] = []
      let snapLeft: number | null = null
      let snapTop: number | null = null

      for (const g of allGuides) {
        if (g.type === 'v') {
          // Check left edge, right edge, center of object vs vertical guide
          const dLeft = Math.abs(objLeft - g.pos)
          const dRight = Math.abs(objRight - g.pos)
          const dCenter = Math.abs(objCenterX - g.pos)
          const minD = Math.min(dLeft, dRight, dCenter)

          if (minD < SNAP_THRESHOLD) {
            snapped.push(g)
            if (dLeft <= dRight && dLeft <= dCenter) {
              snapLeft = g.pos
            } else if (dRight < dLeft && dRight <= dCenter) {
              snapLeft = g.pos - bounds.width
            } else {
              snapLeft = g.pos - bounds.width / 2
            }
          }
        } else {
          const dTop = Math.abs(objTop - g.pos)
          const dBottom = Math.abs(objBottom - g.pos)
          const dCenter = Math.abs(objCenterY - g.pos)
          const minD = Math.min(dTop, dBottom, dCenter)

          if (minD < SNAP_THRESHOLD) {
            snapped.push(g)
            if (dTop <= dBottom && dTop <= dCenter) {
              snapTop = g.pos
            } else if (dBottom < dTop && dBottom <= dCenter) {
              snapTop = g.pos - bounds.height
            } else {
              snapTop = g.pos - bounds.height / 2
            }
          }
        }
      }

      // Apply snap
      if (snapLeft !== null || snapTop !== null) {
        // Convert from bounding-box coords back to object origin
        // obj.left/top with originX='left' correspond to bounding rect left/top
        const currentLeft = obj.left ?? 0
        const currentTop = obj.top ?? 0
        const bRect = obj.getBoundingRect()

        if (snapLeft !== null) {
          const delta = snapLeft - bRect.left
          obj.set('left', currentLeft + delta)
        }
        if (snapTop !== null) {
          const delta = snapTop - bRect.top
          obj.set('top', currentTop + delta)
        }
        obj.setCoords()
      }

      activeGuidesRef.current = snapped

      // Trigger redraw of upper canvas
      canvas.requestRenderAll()
    }

    const onAfterRender = () => {
      if (activeGuidesRef.current.length > 0) {
        drawGuides(canvas, activeGuidesRef.current)
      }
    }

    const onMovingEnd = () => {
      activeGuidesRef.current = []
      clearGuides(canvas)
    }

    canvas.on('object:moving', onMoving)
    canvas.on('after:render', onAfterRender)
    canvas.on('object:modified', onMovingEnd)
    canvas.on('mouse:up', onMovingEnd)

    return () => {
      canvas.off('object:moving', onMoving)
      canvas.off('after:render', onAfterRender)
      canvas.off('object:modified', onMovingEnd)
      canvas.off('mouse:up', onMovingEnd)
    }
  }, [canvasRef])
}
