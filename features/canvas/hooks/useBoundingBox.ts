'use client'

/**
 * useBoundingBox — AABB collision guard untuk Safe_Zone Canvas.
 *
 * Prinsip:
 *  - Attach SEKALI saat Canvas.tsx mount (bukan per-render).
 *  - Baca getActiveZone() secara DINAMIS di dalam event handler (bukan
 *    di-capture di closure) supaya ganti view langsung berlaku tanpa
 *    re-attach listener.
 *  - Setiap objek dipantau via obj.getBoundingRect(). Jika keluar dari
 *    Safe_Zone (derive dari getPrintAreaForZone → xMin/xMax/yMin/yMax),
 *    posisi di-revert ke posisi valid terakhir yang tersimpan di Map.
 *  - Baseline entry diinisialisasi saat object:added — jadi objek baru
 *    langsung punya fallback valid dari awal.
 *
 * Catatan perluasan kecil dari spesifikasi: entry Map menyimpan scaleX/
 * scaleY juga, karena saat object:scaling objek bisa melebar melewati
 * batas — revert left/top saja tidak cukup, scale juga harus dipulihkan.
 */

import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { Canvas, FabricObject } from 'fabric'
import { getActiveZone } from '@/lib/ui/design-state'
import { getPrintAreaForZone } from '@/lib/config/print-areas'

interface SafeZone {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

interface LastValidState {
  left: number
  top: number
  scaleX: number
  scaleY: number
  width?: number
}

type CanvasRef = MutableRefObject<Canvas | null>

// Fallback identity untuk objek tanpa `id` (semua user object di app ini
// punya `id`, tapi jaga-jaga kalau ada source lain). Instance WeakMap agar
// identitas stabil antar event tanpa bergantung pada posisi di layering.
const syntheticIdByObject = new WeakMap<FabricObject, number>()
let syntheticIdCounter = 0

function getObjectId(obj: FabricObject): string {
  const typed = obj as any
  const id = typed.id as string | undefined
  if (id) return id
  let synthetic = syntheticIdByObject.get(obj)
  if (synthetic === undefined) {
    synthetic = ++syntheticIdCounter
    syntheticIdByObject.set(obj, synthetic)
  }
  return `synthetic-${synthetic}`
}

function isUserObject(obj: FabricObject): boolean {
  const typed = obj as any
  return !(typed.isBackground === true) && typed.id !== '__debug_overlay__'
}

function getSafeZone(zone: string): SafeZone | null {
  const area = getPrintAreaForZone(zone)
  if (!area) return null
  return {
    xMin: area.x,
    xMax: area.x + area.width,
    yMin: area.y,
    yMax: area.y + area.height,
  }
}

export function useBoundingBox(canvasRef: CanvasRef) {
  // Hard-revert collision guard DINONAKTIFKAN sepenuhnya sesuai Keputusan Terkunci (Opsi B).
  // Objek kini dapat digeser & di-scale secara bebas ke segala arah tanpa tersendat/terkunci.
  // Area di luar Safe_Zone otomatis terpotong secara visual melalui Fabric.js clipPath (applyPrintAreaClip).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Hook dipertahankan sebagai no-op yang aman tanpa listener hard-revert
  }, [canvasRef])
}