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
import { Button } from '@/components/ui/button'
import { ACTIVE_ZONES, getZoneLabel } from '@/lib/config/zones'

/**
 * OWNERSHIP: Frontend
 * Cangkang (shell) modal Vendor Blueprint untuk Take-Home Test.
 *
 * Yang SUDAH disiapkan di sini:
 *  - kontrak key sessionStorage (BLUEPRINT_STORAGE_KEY) yang harus diisi
 *    snapshotAllZones() (lib/ui/blueprint-extractor.ts, Task 1) sebelum
 *    navigasi checkout,
 *  - jalur trigger: halaman /payment/success membuka modal otomatis jika key
 *    berisi snapshot; tombol "Lihat Blueprint" membukanya manual.
 *
 * Yang MENJADI TUGAS KANDIDAT (Task 2) — gantikan body modal ini:
 *  - pratinjau thumbnail visual per zona yang memiliki desain aktif,
 *  - tombol download / lihat Raw Image Asset user secara terpisah dari mockup.
 * Cangkang ini sengaja TIDAK berisi logika ekstraksi apa pun.
 */
export const BLUEPRINT_STORAGE_KEY = 'vendor_blueprint'

interface RawAsset {
  name: string
  src: string
  x: number
  y: number
  width: number
  height: number
}

interface ZoneBlueprint {
  zone: string
  rawAssets?: RawAsset[]
}

interface BlueprintSnapshot {
  version: string
  productId: string
  category: string
  zones?: ZoneBlueprint[]
}

function readSnapshot(): BlueprintSnapshot | null {
  try {
    const raw = sessionStorage.getItem(BLUEPRINT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BlueprintSnapshot) : null
  } catch {
    return null
  }
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
  const hasBlueprint = snapshot !== null && zones.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Blueprint Vendor</DialogTitle>
          <DialogDescription>
            Data desain untuk diproduksi konveksi. Raw asset dipisah dari
            mockup kaos.
          </DialogDescription>
        </DialogHeader>

        {!hasBlueprint ? (
          <div className="py-10 text-center space-y-2">
            <ImagePlus className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-medium text-gray-700">
              Belum ada data blueprint.
            </p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Implementasikan snapshotAllZones() (Task 1) dan simpan hasilnya
              ke sessionStorage[{`"${BLUEPRINT_STORAGE_KEY}"`}] sebelum
              checkout agar zona berdesain tampil di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {ACTIVE_ZONES.map(zoneId => {
              const zoneBlueprint = zones.find(z => z.zone === zoneId)
              const assetCount = zoneBlueprint?.rawAssets?.length ?? 0
              return (
                <div
                  key={zoneId}
                  className="rounded-lg border border-gray-200 p-3 space-y-2"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {getZoneLabel(zoneId)}
                  </p>
                  {assetCount > 0 ? (
                    <>
                      <p className="text-xs text-gray-500">
                        {assetCount} desain aktif
                      </p>
                      {/* TODO (Task 2): thumbnail visual zona + tombol
                          download raw asset (ganti tombol placeholder ini) */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        <Download />
                        Raw Asset
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Tidak ada desain</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}