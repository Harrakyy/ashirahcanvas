/**
 * Canvas-specific UI & full draft state store — color, size, zoom, viewStates.
 *
 * Menggunakan middleware persist() dari Zustand dengan key 'bms_canvas_draft'.
 * Ini digunakan untuk auto-save / restore draft mid-desain, terpisah dari 'canvas_blueprint'
 * yang digunakan untuk final export checkout.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CanvasZone } from '@/types/design'

interface CanvasStore {
  selectedColor: string
  selectedSize: string
  zoomLevel: number
  viewStates: Record<CanvasZone, string | null>
  hasDraftPrompted: boolean

  setSelectedColor: (color: string) => void
  setSelectedSize: (size: string) => void
  setZoomLevel: (level: number) => void
  zoomIn: () => void
  zoomOut: () => void
  setZoneViewState: (zone: CanvasZone, stateJson: string | null) => void
  setAllViewStates: (states: Partial<Record<CanvasZone, string | null>>) => void
  setHasDraftPrompted: (prompted: boolean) => void
  clearDraft: () => void
}

export const DRAFT_STORAGE_KEY = 'bms_canvas_draft'

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set) => ({
      selectedColor: '#FFFFFF',
      selectedSize: 'M',
      zoomLevel: 100,
      viewStates: {
        front: null,
        back: null,
        left: null,
        right: null,
        label: null,
      },
      hasDraftPrompted: false,

      setSelectedColor: (color) => set({ selectedColor: color }),
      setSelectedSize: (size) => set({ selectedSize: size }),
      setZoomLevel: (level) => set({ zoomLevel: level }),
      zoomIn: () => set((s) => ({ zoomLevel: Math.min(s.zoomLevel + 10, 200) })),
      zoomOut: () => set((s) => ({ zoomLevel: Math.max(s.zoomLevel - 10, 50) })),

      setZoneViewState: (zone, stateJson) =>
        set((s) => ({
          viewStates: { ...s.viewStates, [zone]: stateJson },
        })),

      setAllViewStates: (states) =>
        set((s) => ({
          viewStates: { ...s.viewStates, ...states },
        })),

      setHasDraftPrompted: (prompted) => set({ hasDraftPrompted: prompted }),

      clearDraft: () =>
        set({
          viewStates: { front: null, back: null, left: null, right: null, label: null },
          hasDraftPrompted: false,
        }),
    }),
    {
      name: DRAFT_STORAGE_KEY,
      partialize: (state) => ({
        selectedColor: state.selectedColor,
        selectedSize: state.selectedSize,
        viewStates: state.viewStates,
      }),
    }
  )
)

// Module-level debounced save manager (1000ms)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleDebouncedSave(saveFn: () => void, delayMs = 1000): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    try {
      saveFn()
    } catch (err) {
      console.error('[DebouncedSave] Exception during save:', err)
    } finally {
      debounceTimer = null
    }
  }, delayMs)
}
