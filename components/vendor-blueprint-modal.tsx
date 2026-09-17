'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, ImagePlus, Shirt, FileText, CheckCircle2, Layers, Package } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getZoneLabel, ACTIVE_ZONES } from '@/lib/config/zones'
import { getPrintArea } from '@/lib/config/print-areas'
import { getAssetBox, getMockupBox, type PreviewBox } from '@/lib/ui/blueprint-preview'
import type { BlueprintAsset, BlueprintSnapshot, ZoneBlueprint, CanvasBlueprint } from '@/types/blueprint'

export const BLUEPRINT_STORAGE_KEY = 'vendor_blueprint'
export const CANVAS_STORAGE_KEY = 'canvas_blueprint'

const PREVIEW_WIDTH = 180

function isBlueprintSnapshot(value: unknown): value is BlueprintSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<BlueprintSnapshot>
  return Array.isArray(candidate.zones) && typeof candidate.capturedAt === 'number'
}

function adaptCanvasBlueprintToSnapshot(cb: CanvasBlueprint): BlueprintSnapshot {
  const category = 'tshirt'
  const colorHex = cb.variant?.color || '#FFFFFF'
  const zones: ZoneBlueprint[] = ACTIVE_ZONES.map((zone) => {
    const images: string[] = (cb.design_assets?.uploaded_images as Record<string, string[]>)?.[zone] ?? []
    const assets: BlueprintAsset[] = images.map((src, idx) => ({
      zone,
      src,
      left: 175,
      top: 250 + idx * 20,
      width: 150,
      height: 150,
      scaleX: 1,
      scaleY: 1,
      originX: 'center',
      originY: 'center',
      angle: 0,
      name: `Asset-${zone}-${idx + 1}`,
    }))
    return {
      zone,
      hasDesign: assets.length > 0,
      assets,
      mockupUrl: `/mockups/tshirt/${colorHex === '#000000' ? 'black' : 'white'}/${zone}.png`,
    }
  })

  return {
    zones,
    capturedAt: Date.now(),
    category,
    colorHex,
    canvasWidth: 500,
    canvasHeight: 650,
    assetsOmitted: false,
  }
}

function readSnapshot(): BlueprintSnapshot | null {
  try {
    const rawVendor = sessionStorage.getItem(BLUEPRINT_STORAGE_KEY)
    if (rawVendor) {
      const parsedVendor: unknown = JSON.parse(rawVendor)
      if (isBlueprintSnapshot(parsedVendor)) return parsedVendor
    }

    const rawCanvas = localStorage.getItem(CANVAS_STORAGE_KEY)
    if (rawCanvas) {
      const parsedCanvas = JSON.parse(rawCanvas) as CanvasBlueprint
      if (parsedCanvas?.design_assets) {
        return adaptCanvasBlueprintToSnapshot(parsedCanvas)
      }
    }
    return null
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
  return `asset-${asset.zone}-${index + 1}.${assetExtension(asset.src)}`
}

function formatCapturedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
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

function triggerDownload(url: string, fileName: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function downloadBlueprintJson(snapshot: BlueprintSnapshot, fileName?: string) {
  const jsonStr = JSON.stringify(snapshot, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const name =
    fileName ||
    `blueprint-${snapshot.category || 'tshirt'}-${snapshot.colorHex.replace('#', '')}-${new Date(
      snapshot.capturedAt
    )
      .toISOString()
      .slice(0, 10)}.json`
  triggerDownload(url, name)
  URL.revokeObjectURL(url)
}

/**
 * Render an offscreen high-res composite image of the garment mockup + customer design
 */
async function generateZoneCompositeDataUrl(
  mockupUrl: string | null,
  mockupBox: PreviewBox | null,
  printArea: { x: number; y: number; width: number; height: number } | null,
  assets: BlueprintAsset[],
  canvasWidth: number,
  canvasHeight: number
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // White base background for clear contrast
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // 1. Draw Mockup Garment
  if (mockupUrl && mockupBox) {
    await new Promise<void>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.drawImage(img, mockupBox.left, mockupBox.top, mockupBox.width, mockupBox.height)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = mockupUrl
    })
  }

  // 2. Draw Assets inside Print Area
  if (printArea) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(printArea.x, printArea.y, printArea.width, printArea.height)
    ctx.clip()

    for (const asset of assets) {
      const box = getAssetBox(asset)
      ctx.save()
      if (asset.angle) {
        const cx = box.left + box.width / 2
        const cy = box.top + box.height / 2
        ctx.translate(cx, cy)
        ctx.rotate((asset.angle * Math.PI) / 180)
        ctx.translate(-cx, -cy)
      }

      if (asset.src) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            ctx.drawImage(img, box.left, box.top, box.width, box.height)
            resolve()
          }
          img.onerror = () => resolve()
          img.src = asset.src
        })
      } else if (asset.text) {
        ctx.fillStyle = asset.fill || '#111827'
        const fontSize = (asset.fontSize || 24) * (asset.scaleX || 1)
        ctx.font = `600 ${fontSize}px ${asset.fontFamily || '-apple-system, sans-serif'}`
        ctx.textBaseline = 'top'
        ctx.fillText(asset.text, box.left, box.top)
      }

      ctx.restore()
    }
    ctx.restore()
  }

  return canvas.toDataURL('image/png')
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
  snapshot: BlueprintSnapshot
}

function ZonePreview({ zone, snapshot }: ZonePreviewProps) {
  const [mockupBox, setMockupBox] = useState<PreviewBox | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const mockupUrl = zone.mockupUrl

  const { category, colorHex, canvasWidth, canvasHeight } = snapshot

  useEffect(() => {
    if (!mockupUrl) {
      setMockupBox(null)
      return
    }
    let cancelled = false
    getMockupBox(mockupUrl, zone.zone, canvasWidth, canvasHeight)
      .then((box) => {
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

  const handleDownloadMockup = async () => {
    setIsExporting(true)
    try {
      const dataUrl = await generateZoneCompositeDataUrl(
        mockupUrl,
        mockupBox,
        printArea,
        zone.assets,
        canvasWidth,
        canvasHeight
      )
      if (dataUrl) {
        triggerDownload(dataUrl, `mockup-${category}-${zone.zone}.png`)
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadBoth = async () => {
    setIsExporting(true)
    try {
      // 1. Download image mockup
      const dataUrl = await generateZoneCompositeDataUrl(
        mockupUrl,
        mockupBox,
        printArea,
        zone.assets,
        canvasWidth,
        canvasHeight
      )
      if (dataUrl) {
        triggerDownload(dataUrl, `mockup-${category}-${zone.zone}.png`)
      }
      // 2. Download blueprint JSON
      downloadBlueprintJson(snapshot, `blueprint-${category}-${zone.zone}.json`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleViewMockup = async () => {
    setIsExporting(true)
    try {
      const dataUrl = await generateZoneCompositeDataUrl(
        mockupUrl,
        mockupBox,
        printArea,
        zone.assets,
        canvasWidth,
        canvasHeight
      )
      if (dataUrl) {
        const win = window.open()
        if (win) {
          win.document.write(`<title>Pratinjau ${getZoneLabel(zone.zone)}</title><body style="margin:0;background:#f3f4f6;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${dataUrl}" style="max-height:90vh;max-width:90vw;box-shadow:0 10px 30px rgba(0,0,0,0.1);border-radius:16px;" /></body>`)
        }
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="rounded-3xl border border-black/[0.07] bg-white p-3 space-y-2.5 shadow-sm hover:shadow-md hover:border-black/15 transition-all duration-200">
      {/* Visual Canvas Display */}
      <div
        className="relative overflow-hidden rounded-2xl bg-neutral-50 shadow-inner border border-black/[0.04] mx-auto"
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
            if (asset.src) {
              return (
                <img
                  key={`${zone.zone}-${index}`}
                  src={asset.src}
                  alt={asset.name ?? `Desain ${index + 1}`}
                  className="absolute select-none object-contain"
                  draggable={false}
                  style={style}
                />
              )
            }
            if (asset.text) {
              return (
                <div
                  key={`${zone.zone}-${index}`}
                  className="absolute font-bold overflow-hidden select-none whitespace-nowrap text-neutral-900 leading-tight"
                  style={{
                    ...style,
                    fontSize: Math.max(8, (asset.fontSize || 24) * scale),
                    color: asset.fill || '#111827',
                  }}
                >
                  {asset.text}
                </div>
              )
            }
            return (
              <div
                key={`${zone.zone}-${index}`}
                className="absolute border border-dashed border-blue-400 bg-blue-100/40 rounded"
                style={style}
              />
            )
          })}
        </div>
      </div>

      {/* Label and Asset Badge */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold tracking-tight text-neutral-900">
          {getZoneLabel(zone.zone)}
        </p>
        <span className="text-[10px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full border border-black/[0.04]">
          {zone.assets.length} aset
        </span>
      </div>

      {/* Apple Style Action Buttons */}
      <div className="space-y-1.5 pt-1.5 border-t border-black/[0.05]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleViewMockup}
            disabled={isExporting}
            className="inline-flex items-center justify-center p-2 rounded-xl border border-neutral-200/90 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 shadow-2xs active:scale-95 transition-all disabled:opacity-50"
            title="Lihat Gambar Pratinjau Full Size"
          >
            <Eye className="w-3.5 h-3.5 text-neutral-600" />
          </button>
          <button
            onClick={handleDownloadMockup}
            disabled={isExporting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-medium active:scale-95 transition-all shadow-xs disabled:opacity-50"
            title="Unduh Gambar Mockup Hasil Desain"
          >
            <Download className="w-3 h-3" />
            {isExporting ? 'Memproses...' : 'Unduh Gambar'}
          </button>
        </div>

        <button
          onClick={handleDownloadBoth}
          disabled={isExporting}
          className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-xl border border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-800 text-[10px] font-medium active:scale-95 transition-all shadow-2xs disabled:opacity-50"
          title="Unduh Gambar Sekaligus File Blueprint"
        >
          <Package className="w-3 h-3 text-neutral-500" />
          Unduh Gambar + Blueprint
        </button>
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
    <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-black/[0.06] bg-neutral-50/50 hover:bg-neutral-100/60 transition-all duration-150">
      {/* Thumbnail */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/[0.06] bg-white p-1 flex items-center justify-center shadow-2xs">
        {asset.src ? (
          <img
            src={asset.src}
            alt={asset.name ?? fileName}
            className="h-full w-full object-contain"
            draggable={false}
          />
        ) : asset.text ? (
          <div className="flex flex-col items-center justify-center text-center p-1">
            <span className="text-[9px] font-semibold text-neutral-700 truncate max-w-full">
              {asset.text}
            </span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImagePlus className="h-5 w-5 text-neutral-400" />
          </div>
        )}
      </div>

      {/* Asset Info & Badges */}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-xs font-semibold text-neutral-900">
          {asset.name || fileName}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 font-medium rounded-md border border-black/[0.04]">
            {getZoneLabel(asset.zone)}
          </span>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-medium rounded-md border border-blue-100">
            {width} × {height} px
          </span>
          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 font-mono rounded-md">
            X:{Math.round(asset.left)} Y:{Math.round(asset.top)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {asset.src ? (
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-neutral-200/90 bg-white px-3 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 active:scale-95 transition-all"
          >
            <Eye className="h-3.5 w-3.5 text-neutral-500" />
            Lihat
          </a>
          <a
            href={downloadUrl}
            download={fileName}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 text-xs font-medium text-white shadow-xs hover:bg-neutral-800 active:scale-95 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Unduh
          </a>
        </div>
      ) : asset.text ? (
        <span className="shrink-0 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
          Objek Teks
        </span>
      ) : (
        <span className="shrink-0 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl">
          Tidak tersimpan
        </span>
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
  const designedZones = useMemo(() => zones.filter((zone) => zone.hasDesign), [zones])
  const emptyZones = useMemo(() => zones.filter((zone) => !zone.hasDesign), [zones])
  const rawAssets = useMemo(
    () => designedZones.flatMap((zone) => zone.assets),
    [designedZones]
  )

  const handleDownloadAllPackage = async () => {
    if (!snapshot) return

    // 1. Download blueprint JSON
    downloadBlueprintJson(snapshot)

    // 2. Download all zone mockups
    for (const zone of designedZones) {
      const dataUrl = await generateZoneCompositeDataUrl(
        zone.mockupUrl,
        null, // will calculate if null or use available
        getPrintArea(snapshot.category, snapshot.colorHex, zone.zone),
        zone.assets,
        snapshot.canvasWidth,
        snapshot.canvasHeight
      )
      if (dataUrl) {
        triggerDownload(dataUrl, `mockup-${snapshot.category}-${zone.zone}.png`)
      }
    }

    // 3. Download raw images
    rawAssets.forEach((asset, idx) => {
      if (asset.src) {
        triggerDownload(asset.src, assetFileName(asset, idx))
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto bg-white/95 backdrop-blur-2xl rounded-3xl border border-black/[0.08] shadow-2xl p-6">
        {/* Header */}
        <DialogHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-black/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 border border-black/5">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-neutral-900">
                  Blueprint Vendor Konveksi
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-500 font-normal">
                  Pratinjau visual dan spesifikasi teknis cetak sablon / DTF.
                </DialogDescription>
              </div>
            </div>

            {snapshot && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadBlueprintJson(snapshot)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200/90 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium active:scale-95 transition-all shadow-2xs"
                  title="Unduh Spesifikasi Teknis Blueprint Saja (JSON)"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  Unduh Blueprint (JSON)
                </button>
                <button
                  onClick={handleDownloadAllPackage}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium active:scale-95 transition-all shadow-xs"
                  title="Unduh Paket Lengkap (Semua Gambar + Blueprint)"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Paket Lengkap
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        {snapshot === null ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400 border border-black/5">
              <ImagePlus className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">Belum ada data blueprint.</p>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
              Selesaikan desain di editor kanvas atau gunakan &quot;Simulasi Checkout&quot; agar data
              blueprint siap diunduh di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Apple Style Specification Banner */}
            <div className="bg-neutral-50/80 border border-black/[0.06] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-normal">Kategori:</span>
                <span className="font-semibold text-neutral-900 capitalize">
                  {snapshot.category || 'T-Shirt'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-normal">Warna Kaos:</span>
                <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                    style={{ backgroundColor: snapshot.colorHex }}
                  />
                  {snapshot.colorHex}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-normal">Waktu Capture:</span>
                <span className="font-semibold text-neutral-900">
                  {formatCapturedAt(snapshot.capturedAt)}
                </span>
              </div>
            </div>

            {/* Zone Previews Section with Downloads */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shirt className="h-4 w-4 text-neutral-800" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Pratinjau Kaos per Zona ({designedZones.length} Zona Berdesain)
                  </h3>
                </div>
                <span className="text-[11px] text-neutral-500 font-normal">
                  Pilih unduh gambar mockup saja atau unduh gambar + blueprint
                </span>
              </div>

              {designedZones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {designedZones.map((zone) => (
                    <ZonePreview key={zone.zone} zone={zone} snapshot={snapshot} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 bg-neutral-50 p-3 rounded-xl border border-black/[0.04]">
                  Tidak ada zona dengan desain gambar aktif.
                </p>
              )}

              {emptyZones.length > 0 && (
                <p className="text-[11px] text-neutral-400">
                  Zona tanpa desain: {emptyZones.map((z) => getZoneLabel(z.zone)).join(', ')}
                </p>
              )}
            </section>

            {/* Raw Assets List */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-neutral-800" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Raw Image Asset Customer ({rawAssets.length})
                  </h3>
                </div>
              </div>

              {snapshot.assetsOmitted && (
                <p className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 text-xs text-amber-800 leading-relaxed">
                  File asli tidak ikut tersimpan karena melebihi kapasitas memori browser. Data posisi
                  dan dimensi tetap tersedia untuk tim konveksi.
                </p>
              )}

              {rawAssets.length > 0 ? (
                <div className="space-y-2">
                  {rawAssets.map((asset, index) => (
                    <RawAssetRow key={`${asset.zone}-${index}`} asset={asset} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-neutral-200 rounded-2xl">
                  <p className="text-xs text-neutral-500">
                    Customer belum mengunggah gambar terpisah pada desain ini.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}