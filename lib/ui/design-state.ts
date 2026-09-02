/**
 * OWNERSHIP: Frontend
 * Kanal state terpusat (di luar React) untuk design/zone/view/color.
 * Engine Fabric.js imperatif, jadi state dipegang di sini. Komponen panggil lewat
 * import ini (bukan Zustand) untuk bagian web design. Lihat ARCHITECTURE.md section D.
 */
import type { CanvasZone, ViewStateRecord } from '@/types/design'

// Single channel for canvas design/interaction state that lives outside React
// (the Fabric.js engine is imperative, so plain module state is consistent).
// Consolidates what used to be a bare `activeZone` + `Map` inside canvas-engine
// plus a React-held color, per PRD §4.2.

let activeZone: CanvasZone = 'front'
let activeColor = '#FFFFFF'
const viewStates: ViewStateRecord = {}

export function getActiveZone(): CanvasZone {
  return activeZone
}

export function setActiveZone(zone: CanvasZone): void {
  activeZone = zone
}

export function setActiveColor(color: string): void {
  activeColor = color
}

export function getViewState(zone: string): string | null {
  return viewStates[zone] ?? null
}

export function setViewState(zone: string, state: string | null): void {
  if (state == null) {
    delete viewStates[zone]
  } else {
    viewStates[zone] = state
  }
}
