/**
 * OWNERSHIP: Frontend
 * Take-Home Test Task 1 — Vendor Blueprint Extractor.
 *
 * Murni baca & transformasi data: TIDAK mengimpor Fabric, TIDAK memanggil
 * getCanvas()/renderAll(), dan tidak menyentuh siklus render kanvas.
 * Satu-satunya sentuhan ke canvas-engine adalah saveViewState() di
 * snapshotAllZones() — itu pun hanya membaca (canvas.toObject()) untuk
 * memastikan zona yang sedang aktif ikut ter-flush ke design-state.ts
 * sebelum dibaca (lihat komentar di snapshotAllZones()).
 *
 * Sumber data: viewStates tersimpan di lib/ui/design-state.ts sebagai JSON
 * string (ditulis oleh serializeUserObjects() di canvas-engine.ts), sudah
 * berisi semua field yang dibutuhkan (src, left, top, width, height,
 * scaleX, scaleY, dst.) — extractor ini hanya mem-parse & memfilter ulang.
 */
import { saveViewState } from '@/lib/ui/canvas-engine'
import { getActiveZone, getViewState } from '@/lib/ui/design-state'
import { ACTIVE_ZONES } from '@/lib/config/zones'
import { getPrintAreaForZone } from '@/lib/config/print-areas'
import type { PrintArea } from '@/types/print-area'
import type {
  BlueprintAsset,
  BlueprintPlacement,
  BlueprintSnapshot,
  PersistResult,
  SnapshotContext,
  ZoneBlueprint,
} from '@/types/blueprint'

export const BLUEPRINT_STORAGE_KEY = 'vendor_blueprint'

// ── Task 1a: per-zone parsing ──────────────────────────────────────

interface SerializedUserObject {
  id?: string
  name?: string
  isBackground?: boolean
  src?: string
  left?: number
  top?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  originX?: string
  originY?: string
  angle?: number
}

// Mencerminkan isUserObject() / filter di dalam serializeUserObjects()
// (canvas-engine.ts). Diterapkan ulang di sini (bukan dipercaya mentah)
// karena kontrak input fungsi ini sebenarnya "JSON string dari
// sessionStorage/design-state", bukan "array Fabric live yang terpercaya"
// — dan objek gambar user tambahan wajib punya Base64 src untuk diekstrak.
function isExtractableAsset(o: SerializedUserObject): boolean {
  return (
    o.isBackground !== true &&
    o.id !== '__background__' &&
    o.id !== '__debug_overlay__' &&
    typeof o.src === 'string' &&
    o.src.length > 0
  )
}

// Gambar upload ditambahkan dengan originX/originY: 'center' (lihat
// addImageToCanvas() di canvas-engine.ts), jadi left/top pada objek yang
// diserialisasi adalah TITIK TENGAH objek, bukan sudut kiri-atas — dan
// width/height adalah ukuran piksel ASLI gambar sumber, bukan ukuran
// tampilnya (itu width*scaleX / height*scaleY). Fungsi ini menormalisasi
// ke rect top-left di ruang kanvas supaya konsumen di bawahnya tidak perlu
// tahu konvensi origin Fabric.
//
// Rotasi sengaja TIDAK dikompensasi (box tetap axis-aligned walau `angle`
// bukan 0) — oriented bounding box di luar scope pass ini; `angle` tetap
// dibawa di asset supaya konsumen setidaknya tahu rotasi pernah diterapkan.
function toPlacement(o: {
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  originX: string
  originY: string
}): BlueprintPlacement {
  const width = o.width * o.scaleX
  const height = o.height * o.scaleY
  const x =
    o.originX === 'center' ? o.left - width / 2 : o.originX === 'right' ? o.left - width : o.left
  const y =
    o.originY === 'center' ? o.top - height / 2 : o.originY === 'bottom' ? o.top - height : o.top
  return { x, y, width, height }
}

function isWithinPrintArea(rect: BlueprintPlacement, area: PrintArea): boolean {
  return (
    rect.x >= area.x &&
    rect.y >= area.y &&
    rect.x + rect.width <= area.x + area.width &&
    rect.y + rect.height <= area.y + area.height
  )
}

/**
 * Parse state desain satu zona (hasil saveViewState()/getViewState() di
 * design-state.ts) menjadi blueprint assets. Murni — tanpa canvas, tanpa
 * DOM, tanpa React. State kosong/tidak valid menghasilkan array kosong,
 * bukan throw: zona yang belum pernah dibuka (getViewState() === null)
 * adalah kasus normal, bukan error.
 */
export function extractZoneAssets(zone: string, serialized: string | null): BlueprintAsset[] {
  if (!serialized) return []

  let objects: SerializedUserObject[]
  try {
    const parsed = JSON.parse(serialized) as { objects?: SerializedUserObject[] }
    objects = parsed.objects ?? []
  } catch {
    return []
  }

  const area = getPrintAreaForZone(zone)

  return objects.filter(isExtractableAsset).map((o, index) => {
    const left = o.left ?? 0
    const top = o.top ?? 0
    const width = o.width ?? 0
    const height = o.height ?? 0
    const scaleX = o.scaleX ?? 1
    const scaleY = o.scaleY ?? 1
    const originX = o.originX ?? 'left'
    const originY = o.originY ?? 'top'
    const placement = toPlacement({ left, top, width, height, scaleX, scaleY, originX, originY })

    return {
      zone,
      src: o.src as string,
      left,
      top,
      width,
      height,
      scaleX,
      scaleY,
      id: o.id ?? `${zone}-asset-${index}`,
      name: o.name ?? `Asset ${index + 1}`,
      originX,
      originY,
      angle: o.angle ?? 0,
      placement,
      withinPrintArea: area ? isWithinPrintArea(placement, area) : true,
      srcScale: 1,
    }
  })
}

// ── Task 1b: snapshot semua 4 zona ─────────────────────────────────

/**
 * Snapshot seluruh zona kanvas aktif. Sinkron dan read-only terhadap
 * canvas: satu-satunya sentuhan Fabric adalah men-flush zona yang sedang
 * aktif di layar. Flush ini perlu karena saveViewState() lain hanya jalan
 * saat pindah zona (switchView(), canvas-engine.ts) atau saat canvas
 * unmount (cleanup di components/canvas.tsx) — dua-duanya BELUM terjadi
 * pada momen tombol checkout diklik (unmount baru menyusul router.push).
 * Jadi desain yang dibuat di zona aktif tanpa pernah pindah zona belum ada
 * di design-state.ts, dan akan hilang diam-diam dari snapshot tanpa ini.
 */
export function snapshotAllZones(ctx: SnapshotContext): BlueprintSnapshot {
  saveViewState(getActiveZone())

  const zones: ZoneBlueprint[] = ACTIVE_ZONES.map((zone) => {
    const assets = extractZoneAssets(zone, getViewState(zone))
    return { zone, hasDesign: assets.length > 0, assets }
  })

  return {
    zones,
    capturedAt: Date.now(),
    productId: ctx.productId,
    category: ctx.category,
    colorHex: ctx.colorHex,
  }
}

// ── Task 1c: muat ke batas sessionStorage ──────────────────────────

// sessionStorage umumnya dibatasi ~5-10MB per origin, dan Base64
// memperbesar ukuran file ~33%, jadi beberapa upload di 4 zona bisa
// realistis melebihi kuota. `.length` string JSON dipakai sebagai
// perkiraan jumlah byte (tidak eksak, tapi cukup dekat untuk jadi acuan
// budget) daripada memakai encoder byte-akurat khusus untuk ini.
const DEFAULT_STORAGE_BUDGET_BYTES = 4_000_000
const DOWNSCALE_STEPS_PX = [1600, 1024, 640, 400]

function estimatePayloadBytes(snapshot: BlueprintSnapshot): number {
  return JSON.stringify(snapshot).length
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = src
  })
}

// Downscale gambar sumber satu asset supaya sisi terpanjangnya <= maxEdgePx,
// dengan format sama (PNG tetap PNG) supaya transparansi logo yang
// diupload tetap ada — meratakan PNG transparan ke JPEG akan memberi
// vendor kotak hitam di belakang artwork-nya. Dibandingkan terhadap
// ukuran piksel ASLI gambar sumber (naturalWidth/Height), bukan ukuran
// tampil di kanvas — karena byte yang membebani sessionStorage berasal
// dari file sumbernya, bukan dari seberapa besar ia terlihat di kanvas
// 500x650 (gambar besar yang di-scale kecil secara visual tetap
// menyimpan byte aslinya kalau tidak di-downscale di sini).
async function downscaleAsset(asset: BlueprintAsset, maxEdgePx: number): Promise<BlueprintAsset> {
  try {
    const img = await loadImage(asset.src)
    const longestEdge = Math.max(img.naturalWidth, img.naturalHeight)
    if (longestEdge <= maxEdgePx) return asset

    const scale = maxEdgePx / longestEdge
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return asset
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const isPng = asset.src.startsWith('data:image/png')
    const src = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85)

    return { ...asset, src, srcScale: asset.srcScale * scale }
  } catch {
    // Best-effort: kalau decode/re-encode gagal, pertahankan asset asli
    // daripada menjatuhkan desain customer.
    return asset
  }
}

/**
 * Downscale progresif gambar-gambar sumber sampai seluruh snapshot muat
 * dalam `budgetBytes`, atau sampai langkah downscale habis. persistSnapshot()
 * tetap membungkus penulisan sebenarnya dalam try/catch terlepas dari ini —
 * fungsi ini adalah langkah proaktif, bukan satu-satunya jaring pengaman.
 */
export async function fitSnapshotToStorage(
  snapshot: BlueprintSnapshot,
  budgetBytes: number = DEFAULT_STORAGE_BUDGET_BYTES
): Promise<BlueprintSnapshot> {
  if (typeof document === 'undefined') return snapshot

  let current = snapshot
  for (const maxEdgePx of DOWNSCALE_STEPS_PX) {
    if (estimatePayloadBytes(current) <= budgetBytes) return current

    const zones = await Promise.all(
      current.zones.map(async (z) => ({
        ...z,
        assets: await Promise.all(z.assets.map((a) => downscaleAsset(a, maxEdgePx))),
      }))
    )
    current = { ...current, zones }
  }
  return current
}

// ── Task 1d: persist ────────────────────────────────────────────────

/**
 * Menulis snapshot ke sessionStorage di bawah BLUEPRINT_STORAGE_KEY. Tidak
 * pernah throw: kuota penuh atau storage tidak tersedia dikembalikan
 * sebagai kegagalan typed, bukan gagal diam-diam atau merusak alur
 * checkout (panduan teknis #6 di TAKE_HOME_TEST_FRONTEND.md).
 */
export function persistSnapshot(snapshot: BlueprintSnapshot): PersistResult {
  if (typeof sessionStorage === 'undefined') {
    return {
      ok: false,
      reason: 'unavailable',
      message: 'sessionStorage tidak tersedia di browser ini.',
    }
  }

  let serialized: string
  try {
    serialized = JSON.stringify(snapshot)
  } catch {
    return { ok: false, reason: 'serialize', message: 'Gagal menyusun data blueprint.' }
  }

  try {
    sessionStorage.setItem(BLUEPRINT_STORAGE_KEY, serialized)
    const degraded = snapshot.zones.some((z) => z.assets.some((a) => a.srcScale < 1))
    return { ok: true, bytes: serialized.length, degraded }
  } catch {
    return {
      ok: false,
      reason: 'quota',
      message: 'Penyimpanan browser penuh — coba kurangi jumlah atau ukuran gambar.',
    }
  }
}

/** Wrapper praktis: snapshot -> pas-kan ke budget -> persist. */
export async function captureAndPersistBlueprint(ctx: SnapshotContext): Promise<PersistResult> {
  const snapshot = snapshotAllZones(ctx)
  const fitted = await fitSnapshotToStorage(snapshot)
  return persistSnapshot(fitted)
}
