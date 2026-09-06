'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, ImagePlus, Shirt } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getZoneLabel } from '@/lib/config/zones'
import { getPrintArea } from '@/lib/config/print-areas'
import { getAssetBox, getMockupBox, type PreviewBox } from '@/lib/ui/blueprint-preview'
import type { BlueprintAsset, BlueprintSnapshot, ZoneBlueprint } from '@/types/blueprint'

export const BLUEPRINT_STORAGE_KEY = 'vendor_blueprint'

const PREVIEW_WIDTH = 168

function isBlueprintSnapshot(value: unknown): value is BlueprintSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<BlueprintSnapshot>
  return Array.isArray(candidate.zones) && typeof candidate.capturedAt === 'number'
}

function readSnapshot(): BlueprintSnapshot | null {
  try {
    const raw = sessionStorage.getItem(BLUEPRINT_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isBlueprintSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

function assetExtension(src: string): string {
  const match = /^data:image\/([a-z0-9.+-]+)/i.exec(src)
  if (!match) return 'png'
  const subtype = match[1].toLowerCase()
  return subtype === 'jpeg' ? 'jpg' : subtype
}

function assetFileName(asset: BlueprintAsset, index: number): string {
  return `blueprint-${asset.zone}-${index + 1}.${assetExtension(asset.src)}`
}

function formatCapturedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('id-ID')
}

function dataUrlToBlob(src: string): Blob | null {
  const [meta, encoded] = src.split(',')
  if (!meta || !encoded) return null
  try {
    const mime = /data:([^;]+)/.exec(meta)?.[1] ?? 'image/png'
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
  } catch {
    return null
  }
}

function useAssetObjectUrl(src: string): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    const blob = src ? dataUrlToBlob(src) : null
    if (!blob) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [src])

  return objectUrl
}

interface ZonePreviewProps {
  zone: ZoneBlueprint
  category: string
  colorHex: string
  canvasWidth: number
  canvasHeight: number
}

function ZonePreview({
  zone,
  category,
  colorHex,
  canvasWidth,
  canvasHeight,
}: ZonePreviewProps) {
  const [mockupBox, setMockupBox] = useState<PreviewBox | null>(null)
  const mockupUrl = zone.mockupUrl

  useEffect(() => {
    if (!mockupUrl) {
      setMockupBox(null)
      return
    }
    let cancelled = false
    getMockupBox(mockupUrl, zone.zone, canvasWidth, canvasHeight)
      .then(box => {
        if (!cancelled) setMockupBox(box)
      })
      .catch(() => {
        if (!cancelled) setMockupBox(null)
      })
    return () => {
      cancelled = true
    }
  }, [mockupUrl, zone.zone, canvasWidth, canvasHeight])

  const scale = PREVIEW_WIDTH / canvasWidth
  const printArea = getPrintArea(category, colorHex, zone.zone)

  return (
    <div className="rounded-lg border border-border p-2 space-y-2">
      <div
        className="relative overflow-hidden rounded-md bg-white"
        style={{ width: PREVIEW_WIDTH, height: canvasHeight * scale }}
      >
        {mockupUrl && mockupBox && (
          <img
            src={mockupUrl}
            alt={`Mockup ${getZoneLabel(zone.zone)}`}
            className="absolute select-none"
            draggable={false}
            style={{
              left: mockupBox.left * scale,
              top: mockupBox.top * scale,
              width: mockupBox.width * scale,
              height: mockupBox.height * scale,
            }}
          />
        )}
        <div
          className="absolute overflow-hidden"
          style={{
            left: (printArea?.x ?? 0) * scale,
            top: (printArea?.y ?? 0) * scale,
            width: (printArea?.width ?? canvasWidth) * scale,
            height: (printArea?.height ?? canvasHeight) * scale,
          }}
        >
          {zone.assets.map((asset, index) => {
            const box = getAssetBox(asset)
            const style = {
              left: (box.left - (printArea?.x ?? 0)) * scale,
              top: (box.top - (printArea?.y ?? 0)) * scale,
              width: box.width * scale,
              height: box.height * scale,
              transform: asset.angle ? `rotate(${asset.angle}deg)` : undefined,
            }
            return asset.src ? (
              <img
                key={`${zone.zone}-${index}`}
                src={asset.src}
                alt={asset.name ?? `Desain ${index + 1}`}
                className="absolute select-none"
                draggable={false}
                style={style}
              />
            ) : (
              <div
                key={`${zone.zone}-${index}`}
                className="absolute border border-dashed border-blue-400 bg-blue-100/40"
                style={style}
              />
            )
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {getZoneLabel(zone.zone)}
        </p>
        <span className="text-xs text-muted-foreground">{zone.assets.length} asset</span>
      </div>
    </div>
  )
}

interface RawAssetRowProps {
  asset: BlueprintAsset
  index: number
}

function RawAssetRow({ asset, index }: RawAssetRowProps) {
  const width = Math.round(asset.width * asset.scaleX)
  const height = Math.round(asset.height * asset.scaleY)
  const fileName = assetFileName(asset, index)
  const objectUrl = useAssetObjectUrl(asset.src)
  const downloadUrl = objectUrl ?? asset.src

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-2">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded border border-border bg-muted">
        {asset.src ? (
          <img
            src={asset.src}
            alt={asset.name ?? fileName}
            className="h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {getZoneLabel(asset.zone)} · {width} × {height} px · posisi{' '}
          {Math.round(asset.left)}, {Math.round(asset.top)}
        </p>
      </div>

      {asset.src ? (
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5" />
            Lihat
          </a>
          <a
            href={downloadUrl}
            download={fileName}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-950 px-2.5 text-xs font-medium text-white transition hover:bg-blue-900"
          >
            <Download className="h-3.5 w-3.5" />
            Unduh
          </a>
        </div>
      ) : (
        <span className="shrink-0 text-xs text-amber-600">Tidak tersimpan</span>
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

  const zones = useMemo(() => snapshot?.zones ?? [], [snapshot])
  const designedZones = useMemo(() => zones.filter(zone => zone.hasDesign), [zones])
  const emptyZones = useMemo(() => zones.filter(zone => !zone.hasDesign), [zones])
  const rawAssets = useMemo(
    () => designedZones.flatMap(zone => zone.assets),
    [designedZones]
  )

  const canvasWidth = snapshot?.canvasWidth || 500
  const canvasHeight = snapshot?.canvasHeight || 650

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Blueprint Vendor</DialogTitle>
          <DialogDescription>
            Data desain untuk diproduksi konveksi. Raw asset dipisah dari
            mockup kaos.
          </DialogDescription>
        </DialogHeader>

        {snapshot === null ? (
          <div className="py-10 text-center space-y-2">
            <ImagePlus className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Belum ada data blueprint.
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Lakukan checkout dari editor agar snapshot desain tersimpan dan
              zona berdesain tampil di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Shirt className="h-4 w-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Pratinjau Kaos per Zona
                </h3>
              </div>

              {designedZones.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {designedZones.map(zone => (
                    <ZonePreview
                      key={zone.zone}
                      zone={zone}
                      category={snapshot.category}
                      colorHex={snapshot.colorHex}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tidak ada zona dengan desain aktif.
                </p>
              )}

              {emptyZones.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Tanpa desain: {emptyZones.map(z => getZoneLabel(z.zone)).join(', ')}
                </p>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Raw Image Asset Customer
                </h3>
              </div>

              {snapshot.assetsOmitted && (
                <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700">
                  File asli tidak ikut tersimpan karena melebihi kapasitas
                  sessionStorage browser. Data posisi dan ukuran tetap tersedia.
                </p>
              )}

              {rawAssets.length > 0 ? (
                <div className="space-y-2">
                  {rawAssets.map((asset, index) => (
                    <RawAssetRow
                      key={`${asset.zone}-${index}`}
                      asset={asset}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Customer belum mengunggah gambar apa pun.
                </p>
              )}
            </section>

            <p className="text-xs text-muted-foreground">
              Snapshot diambil {formatCapturedAt(snapshot.capturedAt)}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
