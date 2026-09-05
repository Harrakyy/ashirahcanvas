"use client";

import { useEffect, useState } from "react";
import { Download, ImagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ACTIVE_ZONES, getZoneLabel } from "@/lib/config/zones";
import { downloadZoneAssetsZip } from "@/lib/ui/zip-download";
import type { BlueprintAsset, BlueprintSnapshot, ZoneBlueprint } from "@/types/blueprint";

export const BLUEPRINT_STORAGE_KEY = "vendor_blueprint";

/**
 * OWNERSHIP: Frontend
 * Modal ini membaca snapshot blueprint yang telah disimpan sebelum checkout.
 * Snapshot dirender sebagai kartu per posisi kaos, menampilkan preview aset
 * customer tanpa mockup, lalu menyediakan unduhan satu aset atau ZIP per sisi.
 */
const ZONE_ROWS = [ACTIVE_ZONES.slice(0, 2), ACTIVE_ZONES.slice(2, 4)];

function readSnapshot(): BlueprintSnapshot | null {
  try {
    const raw = sessionStorage.getItem(BLUEPRINT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BlueprintSnapshot) : null;
  } catch {
    return null;
  }
}

function downloadAsset(asset: BlueprintAsset, index: number) {
  const type =
    asset.src.match(/^data:image\/([a-zA-Z0-9+.-]+)/)?.[1]?.replace("jpeg", "jpg") ?? "png";
  const link = document.createElement("a");
  link.href = asset.src;
  const zona = getZoneLabel(asset.zone).toLocaleLowerCase('id-ID').replace(/\s+/g, '-');
  link.download = `${zona}-aset-${index + 1}.${type}`;
  link.click();
}

function ZoneCard({
  zoneId,
  zone,
  compact = false,
}: {
  zoneId: string;
  zone?: ZoneBlueprint;
  compact?: boolean;
}) {
  const assets = zone?.assets ?? [];
  const hasDesign = zone?.hasDesign ?? false;
  const canvasWidth = zone?.canvasWidth || 500;
  const canvasHeight = zone?.canvasHeight || 650;

  return (
    <section
      className={`rounded-lg border border-gray-200 bg-card text-card-foreground ${compact ? "p-2" : "p-3 space-y-2"}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-card-foreground">{getZoneLabel(zoneId)}</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
          {assets.length} aset
        </span>
      </div>
      {compact ? (
        <p className="mt-1 text-xs text-muted-foreground">Belum ada desain</p>
      ) : (
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-md border border-dashed border-border bg-transparent"
          aria-label={`Preview ${getZoneLabel(zoneId)} without garment mockup`}
        >
          {hasDesign ? (
            assets.map((asset, index) => (
              <img
                key={`${asset.name ?? "asset"}-${index}`}
                src={asset.src}
                alt={asset.name ?? `Desain ${index + 1}`}
                className="absolute object-contain"
                style={{
                  left: `${(asset.left / canvasWidth) * 100}%`,
                  top: `${(asset.top / canvasHeight) * 100}%`,
                  width: `${((asset.width * asset.scaleX) / canvasWidth) * 100}%`,
                  height: `${((asset.height * asset.scaleY) / canvasHeight) * 100}%`,
                  transform: "translate(-50%, -50%) scale(1.5)",
                  transformOrigin: "center",
                }}
              />
            ))
          ) : (
            <p className="absolute inset-0 flex items-center justify-center text-center text-xs text-muted-foreground">
              Belum ada desain
            </p>
          )}
        </div>
      )}
      {hasDesign && (
        <div className="space-y-1.5">
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              // Satu aset diunduh langsung; beberapa aset dibundle menjadi ZIP
              // supaya vendor hanya menerima satu file unduhan per posisi kaos.
              if (assets.length === 1) downloadAsset(assets[0], 0);
              else downloadZoneAssetsZip(zoneId, assets);
            }}
          >
            <Download /> {assets.length === 1 ? "Unduh aset" : `Unduh ${assets.length} aset (.ZIP)`}
          </Button>
        </div>
      )}
    </section>
  );
}

interface VendorBlueprintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VendorBlueprintModal({ open, onOpenChange }: VendorBlueprintModalProps) {
  const [snapshot, setSnapshot] = useState<BlueprintSnapshot | null>(null);
  useEffect(() => {
    if (open) setSnapshot(readSnapshot());
  }, [open]);

  const zones = snapshot?.zones ?? [];
  const hasSnapshot = snapshot !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Blueprint Vendor</DialogTitle>
          <DialogDescription>
            Preview desain dan asset mentah untuk produksi konveksi.
          </DialogDescription>
        </DialogHeader>
        {!hasSnapshot ? (
          <div className="py-10 text-center space-y-2">
            <ImagePlus className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              Belum ada desain untuk diproduksi.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ZONE_ROWS.map((row, index) => {
              const rowZones = row.map((zoneId) => zones.find((zone) => zone.zone === zoneId));
              const compact = !rowZones.some((zone) => zone?.hasDesign);
              return (
                <div key={index} className="grid grid-cols-2 gap-3">
                  {row.map((zoneId, zoneIndex) => (
                    <ZoneCard
                      key={zoneId}
                      zoneId={zoneId}
                      zone={rowZones[zoneIndex]}
                      compact={compact}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
