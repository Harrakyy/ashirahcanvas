'use client'

import { useEffect, useState } from 'react'
import { Download, ImagePlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ACTIVE_ZONES, getZoneLabel } from '@/lib/config/zones'
import { getPrintAreaForZone } from '@/lib/config/print-areas'
import type { PrintArea } from '@/types/print-area'
import type { BlueprintAsset, BlueprintSnapshot } from '@/types/blueprint'
import { BLUEPRINT_STORAGE_KEY } from '@/lib/ui/blueprint-extractor'

/**
 * OWNERSHIP: Frontend
 * Take-Home Test Task 2 — isi modal Vendor Blueprint.
 *
 * Membaca snapshot MURNI dari sessionStorage (ditulis oleh
 * captureAndPersistBlueprint() di lib/ui/blueprint-extractor.ts saat
 * "Simulasi Checkout"). File ini tidak mengimpor fabric maupun
 * canvas-engine sama sekali — halaman /payment/success tidak punya
 * instance canvas (lihat panduan teknis #2 di TAKE_HOME_TEST_FRONTEND.md),
 * jadi tidak ada mesin kanvas di sini untuk "dirusak" oleh re-render.
 */

// Re-export supaya konsumen lama (app/payment/success/page.tsx) tidak perlu
// diubah — definisi asli sekarang di blueprint-extractor.ts, bersebelahan
// dengan fungsi-fungsi yang menulisnya.
export { BLUEPRINT_STORAGE_KEY }

function readSnapshot(): BlueprintSnapshot | null {
  try {
    const raw = sessionStorage.getItem(BLUEPRINT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BlueprintSnapshot) : null
  } catch {
    return null
  }
}

function downloadFileName(zone: string, asset: BlueprintAsset): string {
  const ext = asset.src.startsWith('data:image/png') ? 'png' : 'jpg'
  return `${zone}-${asset.name.replace(/\s+/g, '_')}.${ext}`
}

interface AssetPreviewProps {
  asset: BlueprintAsset
  area: PrintArea | null
}

// Preview murni CSS: gambar diposisikan sebagai <img> absolute di dalam
// frame proporsional area print, TANPA offscreen canvas / toDataURL().
// Ini sekaligus menghindari bug ekspor clip-path Fabric (issue #8517,
// lihat TODO di canvas-engine.ts) karena tidak pernah menyentuh Fabric.
function AssetPreview({ asset, area }: AssetPreviewProps) {
  if (!area) {
    return (
      <img
        src={asset.src}
        alt={asset.name}
        className="absolute inset-0 m-auto max-w-full max-h-full object-contain"
      />
    )
  }
  return (
    <img
      src={asset.src}
      alt={asset.name}
      className="absolute object-contain"
      style={{
        left: `${((asset.placement.x - area.x) / area.width) * 100}%`,
        top: `${((asset.placement.y - area.y) / area.height) * 100}%`,
        width: `${(asset.placement.width / area.width) * 100}%`,
        height: `${(asset.placement.height / area.height) * 100}%`,
      }}
    />
  )
}

interface ZoneCardProps {
  zoneId: string
  assets: BlueprintAsset[]
}

function ZoneCard({ zoneId, assets }: ZoneCardProps) {
  const area = getPrintAreaForZone(zoneId)

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{getZoneLabel(zoneId)}</p>
        {area && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            area cetak {area.width}×{area.height}
          </span>
        )}
      </div>

      {assets.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tidak ada desain</p>
      ) : (
        <>
          {/* Frame ini MEWAKILI print area zona — bukan seluruh kanvas, bukan
              kaosnya. Border putus-putus = batas cetak. Mockup kaos sengaja
              tidak digambar di sini: loadMockupImage() menempatkannya lewat
              detectContentBounds() (analisis piksel saat runtime), jadi tidak
              bisa direproduksi dari konstanta statis — dan kaos yang posisinya
              meleset justru menyesatkan pembaca blueprint. */}
          <div
            className="relative w-full bg-muted rounded border-2 border-dashed border-border overflow-hidden"
            style={{ aspectRatio: area ? `${area.width} / ${area.height}` : '1 / 1' }}
          >
            {assets.map((asset) => (
              <AssetPreview key={asset.id} asset={asset} area={area} />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">{assets.length} desain aktif</p>

          <ul className="space-y-1.5">
            {assets.map((asset) => (
              <li key={asset.id} className="flex items-center justify-between gap-2">
                {/* Angka posisi cetak dalam ruang kanvas 500x650 — ruang yang
                    sama dengan PRINT_AREAS_BY_ZONE, jadi vendor bisa langsung
                    membandingkannya dengan "area cetak" di header kartu. */}
                <div className="min-w-0">
                  <span className="block truncate text-xs text-foreground">{asset.name}</span>
                  <span className="block text-[10px] text-muted-foreground tabular-nums">
                    x {Math.round(asset.placement.x)} · y {Math.round(asset.placement.y)} ·{' '}
                    {Math.round(asset.placement.width)}×{Math.round(asset.placement.height)} px
                  </span>
                </div>
                <span className="flex items-center gap-1 shrink-0">
                  {!asset.withinPrintArea && (
                    <Badge variant="destructive">Di luar area print</Badge>
                  )}
                  {asset.srcScale < 1 && (
                    <Badge variant="outline">{Math.round(asset.srcScale * 100)}%</Badge>
                  )}
                  <a
                    href={asset.src}
                    download={downloadFileName(zoneId, asset)}
                    aria-label={`Unduh ${asset.name}`}
                    className="inline-flex items-center justify-center size-7 rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  >
                    <Download className="size-3.5" />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

interface VendorBlueprintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function VendorBlueprintModal({
  open,
  onOpenChange,
}: VendorBlueprintModalProps) {
  const [snapshot, setSnapshot] = useState<BlueprintSnapshot | null>(null)

  useEffect(() => {
    if (!open) return
    setSnapshot(readSnapshot())
  }, [open])

  const zones = snapshot?.zones ?? []
  // zones.length > 0 tidak cukup: snapshotAllZones() selalu mengembalikan
  // 4 entri zona meski semuanya kosong. hasDesign per-zona yang menentukan
  // apakah ada sesuatu untuk ditampilkan.
  const hasBlueprint = zones.some((z) => z.hasDesign)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Blueprint Vendor</DialogTitle>
          <DialogDescription>
            Data desain untuk diproduksi konveksi. Raw asset dipisah dari
            mockup kaos.
          </DialogDescription>
        </DialogHeader>

        {!hasBlueprint ? (
          <div className="py-10 text-center space-y-2">
            <ImagePlus className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Belum ada data blueprint.
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Klik &quot;Simulasi Checkout (Blueprint Demo)&quot; di panel
              review editor agar zona berdesain tampil di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            {ACTIVE_ZONES.map((zoneId) => {
              const zoneBlueprint = zones.find((z) => z.zone === zoneId)
              return (
                <ZoneCard key={zoneId} zoneId={zoneId} assets={zoneBlueprint?.assets ?? []} />
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
