/**
 * OWNERSHIP: Bersama (konfigurasi bersama)
 * Area print per zona + resolusi per kategori/warna/view.
 * Kontrak tipe ada di types/print-area.ts. Lihat ARCHITECTURE.md.
 */
import type { PrintArea } from '@/types/print-area'

export type { PrintArea }

// Print areas are defined **per zone** and shared across all garment colors,
// because changing the color only changes the fabric texture, not the shape
// of the t-shirt (see PRD canvas §4.1).
//
// Coordinates are in **canvas space** (canvas is 500 x 650). The mockup image
// is scaled to fit ("contain") and centered on the canvas:
//   - front/back (1024x1024) -> scaled to 500x500, centered vertically at y=75
//   - left/right (1024x1536) -> scaled to 433x650, centered horizontally at x=33.5
//
// Values below are heuristic bounding boxes derived from pixel analysis of the
// mockup assets. They are intentionally simple rects (see PRD out-of-scope:
// precise SVG silhouettes are a later phase). Tune here if the visual result
// doesn't match.
export const PRINT_AREAS_BY_ZONE: Record<string, PrintArea> = {
  front: { x: 140, y: 150, width: 220, height: 280 },
  back: { x: 150, y: 160, width: 200, height: 270 },
  left: { x: 165, y: 180, width: 170, height: 280 },
  right: { x: 150, y: 180, width: 170, height: 280 },
}

export function getPrintAreaForZone(zone: string): PrintArea | null {
  return PRINT_AREAS_BY_ZONE[zone] ?? null
}

export function getPrintArea(category: string, colorHex: string, view: string): PrintArea | null {
  void category
  void colorHex
  return getPrintAreaForZone(view)
}
