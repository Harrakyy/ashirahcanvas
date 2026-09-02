/**
 * OWNERSHIP: Bersama (kontrak)
 * Tipe domain editor desain: zona kanvas & state view. Lihat ARCHITECTURE.md.
 */
export type CanvasZone = 'front' | 'back' | 'left' | 'right' | 'label'

export interface ViewStateRecord {
  [zone: string]: string | null
}

export interface DesignState {
  activeZone: CanvasZone
  activeColor: string
  viewStates: ViewStateRecord
}
