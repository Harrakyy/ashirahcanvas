import type { CanvasZone } from '@/types/design'

/**
 * CanvasBlueprint — kontrak data handoff dari Canvas Configurator ke Checkout / Vendor.
 *
 * Diekspor oleh CanvasEditor via onDesignComplete() callback.
 * Data ini disimpan di localStorage oleh parent (app/editor/page.tsx shell)
 * dan dibaca oleh halaman Checkout & Vendor Blueprint Modal.
 *
 * NOTE DEVIASI SPESIFIKASI:
 * design_assets.fabric_raw_json & uploaded_images diubah dari struktur agregat tunggal
 * menjadi per-zona (Record<CanvasZone, ...>).
 * Alasan: Vendor konveksi & tim produksi membutuhkan breakdown per-zona
 * (front, back, left, right) untuk pratinjau thumbnail visual dan pengunduhan raw asset
 * terpisah di mesin sablon/DTF.
 */

export interface CanvasBlueprint {
  tenant_id?: string
  product_id: string
  variant: {
    size: string
    color: string
  }
  pricing: {
    base_price: number
    extra_charge: number
    total_estimation: number
  }
  design_assets: {
    preview_base64: string
    fabric_raw_json: Record<CanvasZone, object | null>
    uploaded_images: Record<CanvasZone, string[]>
  }
}
