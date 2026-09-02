/**
 * OWNERSHIP: Bersama (konfigurasi bersama)
 * Sumber tunggal daftar zona kanvas & labelnya (Depan/Belakang/Lengan Kiri/dst).
 * Dipakai frontend (canvas switcher) & backend (kontrak zona). Lihat ARCHITECTURE.md.
 */
export interface ZoneOption {
  id: string
  label: string
  enabled: boolean
}

// Single source of truth for the garment zones and their display labels.
// The 'label' zone has no background mockup yet, so it is disabled in the
// switcher (switchView already no-ops on unknown zones).
export const ZONE_OPTIONS: ZoneOption[] = [
  { id: 'front', label: 'Depan', enabled: true },
  { id: 'back', label: 'Belakang', enabled: true },
  { id: 'left', label: 'Lengan Kiri', enabled: true },
  { id: 'right', label: 'Lengan Kanan', enabled: true },
  { id: 'label', label: 'Label', enabled: false },
]

export const ACTIVE_ZONES: string[] = ZONE_OPTIONS.filter(z => z.enabled).map(z => z.id)

export function getZoneLabel(id: string): string {
  return ZONE_OPTIONS.find(z => z.id === id)?.label ?? 'Depan'
}
