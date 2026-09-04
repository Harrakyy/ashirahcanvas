/**
 * OWNERSHIP: Frontend (kontrak diperluas oleh kandidat — Take-Home Test)
 * Shape dasar (zone/src/left/top/width/height/scaleX/scaleY pada
 * BlueprintAsset; hasDesign/assets pada ZoneBlueprint; zones/capturedAt
 * pada BlueprintSnapshot) mengikuti TAKE_HOME_TEST_FRONTEND.md — nama
 * field wajib ini tidak diubah. Field lain ditambahkan untuk kebutuhan
 * Task 2 (preview per zona, badge area print, indikator kompresi) dan
 * untuk mendukung persistSnapshot() (lib/ui/blueprint-extractor.ts).
 */

/**
 * Rect top-left di ruang kanvas (kanvas 500x650, ruang yang sama dengan
 * PRINT_AREAS_BY_ZONE di lib/config/print-areas.ts) — dinormalisasi dari
 * left/top Fabric yang bergantung origin, supaya konsumen tidak perlu
 * tahu konvensi origin Fabric. Belum dikompensasi rotasi; lihat
 * toPlacement() di blueprint-extractor.ts.
 */
export interface BlueprintPlacement {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Konteks produk yang menyertai snapshot — dikirim pemanggil (app/editor)
 * ke snapshotAllZones() / captureAndPersistBlueprint(), lalu ikut tersimpan
 * di BlueprintSnapshot supaya modal tahu produk & warna apa yang dipesan
 * tanpa perlu membaca store React. Tidak membawa harga: harga tetap
 * server-authoritative (golden rule #1 ARCHITECTURE.md).
 */
export interface SnapshotContext {
  productId: string
  category: string
  colorHex: string
}

export interface BlueprintAsset {
  // ── wajib per TAKE_HOME_TEST_FRONTEND.md — jangan ganti nama ──
  zone: string
  src: string
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  // ── tambahan ──
  id: string
  name: string
  originX: string
  originY: string
  angle: number
  placement: BlueprintPlacement
  withinPrintArea: boolean
  /** 1 = fidelitas asli; <1 = didownscale agar muat sessionStorage. */
  srcScale: number
}

export interface ZoneBlueprint {
  zone: string
  hasDesign: boolean
  assets: BlueprintAsset[]
}

export interface BlueprintSnapshot {
  zones: ZoneBlueprint[]
  capturedAt: number
  productId: string
  category: string
  colorHex: string
}

/** Hasil menulis snapshot ke sessionStorage — typed, bukan silent catch. */
export type PersistResult =
  | { ok: true; bytes: number; degraded: boolean }
  | { ok: false; reason: 'quota' | 'unavailable' | 'serialize'; message: string }
