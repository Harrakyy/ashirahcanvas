'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Shield,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  User,
  ExternalLink,
  Layers,
  FileText,
  AlertCircle,
  Loader2,
  Send,
  Eye,
  Download,
  RotateCcw,
  MessageSquare,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InvoiceDownloadButton } from '@/components/invoice-download-button'
import VendorBlueprintModal, {
  ZonePreview,
  adaptCanvasBlueprintToSnapshot,
  isBlueprintSnapshot,
} from '@/components/vendor-blueprint-modal'
import type { BlueprintSnapshot, ZoneBlueprint, BlueprintAsset } from '@/types/blueprint'

interface OrderDetailClientProps {
  orderId: string
}

export default function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeZone, setActiveZone] = useState<string>('front')
  const [showRawJson, setShowRawJson] = useState(false)
  const [isVendorBlueprintOpen, setIsVendorBlueprintOpen] = useState(false)

  // Shipping form state
  const [courierCode, setCourierCode] = useState('jne')
  const [courierName, setCourierName] = useState('JNE')
  const [trackingNumberInput, setTrackingNumberInput] = useState('')
  const [isDispatching, setIsDispatching] = useState(false)

  // Internal Notes state
  const [internalNoteInput, setInternalNoteInput] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  // Sample Upload state
  const [sampleUrlInput, setSampleUrlInput] = useState('')
  const [sampleNoteInput, setSampleNoteInput] = useState('')
  const [isSubmittingSample, setIsSubmittingSample] = useState(false)

  // Status update message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchOrderDetail = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data.order)
      } else {
        setFeedback({ type: 'error', message: 'Gagal memuat detail pesanan' })
      }
    } catch (err) {
      console.error(err)
      setFeedback({ type: 'error', message: 'Koneksi bermasalah' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrderDetail()
  }, [orderId])

  const handleUpdateStatus = async (toStatus: string, note?: string) => {
    setIsUpdating(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus, note }),
      })
      const data = await res.json()
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message })
        await fetchOrderDetail()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal mengubah status' })
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Terjadi kesalahan' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConfirmManualPayment = async (type: 'dp' | 'final') => {
    setIsUpdating(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/payment/confirm-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, type }),
      })
      const data = await res.json()
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message })
        await fetchOrderDetail()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal mengonfirmasi pembayaran manual' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Koneksi bermasalah' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateFinalInvoice = async () => {
    setIsUpdating(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/payment/create-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Invoice pelunasan 30% (Rp ${data.amount.toLocaleString('id-ID')}) berhasil dibuat! Link bayar: ${data.paymentUrl}`,
        })
        await fetchOrderDetail()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal membuat invoice pelunasan' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal membuat invoice' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDispatchShipment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDispatching(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/shipping/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          courierCode,
          courierName,
          customTrackingNumber: trackingNumberInput.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Pesanan berhasil dikirim dengan No. Resi ${data.trackingNumber}`,
        })
        setTrackingNumberInput('')
        await fetchOrderDetail()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal memproses pengiriman' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal mengirim barang' })
    } finally {
      setIsDispatching(false)
    }
  }

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!internalNoteInput.trim()) return
    setIsSavingNote(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: internalNoteInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setInternalNoteInput('')
        setFeedback({ type: 'success', message: data.message })
        await fetchOrderDetail()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal menyimpan catatan' })
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Koneksi gagal' })
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleSubmitSample = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sampleUrlInput.trim()) {
      alert('Harap masukkan URL foto sample')
      return
    }
    setIsSubmittingSample(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: sampleUrlInput.trim(),
          note: sampleNoteInput.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSampleUrlInput('')
        setSampleNoteInput('')
        setFeedback({ type: 'success', message: data.message })
        await fetchOrderDetail()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal mengunggah foto sample' })
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Koneksi gagal' })
    } finally {
      setIsSubmittingSample(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Memuat detail pesanan konveksi...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">Pesanan Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Pesanan dengan ID ini tidak tersedia atau Anda tidak memiliki akses.
          </p>
          <Link href="/admin/orders">
            <Button size="sm" className="bg-blue-700 text-white text-xs">
              Kembali ke Daftar Pesanan
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const dpPayment = order.payments?.find((p: any) => p.type === 'dp')
  const finalPayment = order.payments?.find((p: any) => p.type === 'final')
  const dpPaid = dpPayment?.status === 'paid'
  const finalPaid = finalPayment?.status === 'paid'

  const blueprint = order.designBlueprint || {}

  // Normalize blueprint to BlueprintSnapshot
  const snapshot: BlueprintSnapshot | null = (() => {
    if (!blueprint || Object.keys(blueprint).length === 0) return null
    let rawSnapshot: BlueprintSnapshot | null = null
    if (isBlueprintSnapshot(blueprint)) {
      rawSnapshot = blueprint
    } else if (Array.isArray(blueprint.zones)) {
      rawSnapshot = {
        zones: blueprint.zones,
        capturedAt: blueprint.capturedAt || Date.now(),
        category: blueprint.category || 'tshirt',
        colorHex: blueprint.colorHex || '#FFFFFF',
        canvasWidth: blueprint.canvasWidth || 500,
        canvasHeight: blueprint.canvasHeight || 650,
        assetsOmitted: false,
        previewBase64: blueprint.previewBase64 || blueprint.preview_base64,
        preview_base64: blueprint.preview_base64 || blueprint.previewBase64,
      } as BlueprintSnapshot
    } else if (blueprint.design_assets) {
      rawSnapshot = adaptCanvasBlueprintToSnapshot(blueprint as any)
    }

    if (!rawSnapshot) return null

    // Ensure all 4 zones exist with valid mockupUrl
    const category = rawSnapshot.category || 'tshirt'
    const colorHex = rawSnapshot.colorHex || '#FFFFFF'
    const isBlack = colorHex.toLowerCase() === '#000000' || colorHex.toLowerCase() === '#000'
    const zoneKeys = ['front', 'back', 'left', 'right'] as const

    const existingZones = rawSnapshot.zones || []
    const completeZones: ZoneBlueprint[] = zoneKeys.map((zKey) => {
      const found = existingZones.find((z) => z.zone === zKey)
      if (found) {
        return {
          ...found,
          mockupUrl: found.mockupUrl || `/mockups/${category}/${isBlack ? 'black' : 'white'}/${zKey}.png`,
        }
      }
      return {
        zone: zKey,
        hasDesign: false,
        assets: [],
        mockupUrl: `/mockups/${category}/${isBlack ? 'black' : 'white'}/${zKey}.png`,
      }
    })

    return {
      ...rawSnapshot,
      zones: completeZones,
    }
  })()

  const currentSnapshotZone: ZoneBlueprint | null =
    snapshot?.zones.find((z) => z.zone === activeZone) || null

  const rawUploadedImages: string[] = Array.isArray(blueprint.design_assets?.uploaded_images?.[activeZone])
    ? blueprint.design_assets.uploaded_images[activeZone]
    : []

  // Ensure assets have src restored from rawUploadedImages if needed
  const currentZoneAssets: BlueprintAsset[] = (currentSnapshotZone?.assets || []).map((asset, idx) => ({
    ...asset,
    src: asset.src || rawUploadedImages[idx] || '',
  }))

  // Images for this zone
  const currentZoneImages: string[] =
    currentZoneAssets.some((a) => a.src && a.src.length > 0)
      ? currentZoneAssets.filter((a) => a.src && a.src.length > 0).map((a) => a.src)
      : rawUploadedImages

  // Element counts
  const fabricRaw = blueprint.design_assets?.fabric_raw_json || {}
  const currentZoneFabric = fabricRaw[activeZone]
  const totalElementsCount = currentZoneAssets.length > 0
    ? currentZoneAssets.length
    : (currentZoneFabric as any)?.objects?.length || 0

  // Preview image (fallback to direct base64 image if present)
  const previewImg =
    blueprint.preview_base64 ||
    blueprint.previewBase64 ||
    blueprint.design_assets?.preview_base64 ||
    null

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/orders">
              <Button variant="outline" size="sm" className="rounded-xl h-9 border-slate-200 cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Kembali
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-slate-900">{order.orderNumber}</h1>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs uppercase">
                  {order.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dibuat pada {new Date(order.createdAt).toLocaleString('id-ID')} • Tenant: {order.tenant?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InvoiceDownloadButton order={order} />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrderDetail}
              disabled={isUpdating}
              className="text-xs h-9 rounded-full border-[#C4C8D8] text-[#1A2B56] cursor-pointer"
            >
              Muat Ulang
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Missing Logo Warning Banner */}
        {!order.tenant?.logoUrl && (
          <div className="p-3.5 rounded-xl bg-[#F0F2F6] border border-[#C4C8D8] text-[#1A2B56] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#4C567A] shrink-0" />
              <span>
                <strong>Logo usaha belum terdaftar.</strong> Lengkapi logo konveksi Anda di Profil Usaha untuk mengaktifkan cetak invoice resmi berstandar hitam-putih.
              </span>
            </div>
            <Link href="/admin/profile" className="shrink-0">
              <Button size="sm" variant="outline" className="h-7 px-3 text-[11px] font-bold rounded-full border-[#C4C8D8] bg-white hover:bg-[#EDEDF2] text-[#1A2B56] cursor-pointer">
                Atur Logo Usaha →
              </Button>
            </Link>
          </div>
        )}

        {/* Status Action Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                Alur Kerja Produksi & Status
              </span>
              <h2 className="text-lg font-bold mt-1 text-white">
                Tahap Saat Ini:{' '}
                <span className="text-blue-300 capitalize">
                  {order.status.replace('_', ' ')}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {order.status === 'pending' && 'Menunggu pembayaran DP 70% dari customer. Setelah DP lunas, pesanan dapat dimasukkan ke antrian produksi.'}
                {order.status === 'dp_paid' && 'DP 70% telah lunas diverifikasi! Silakan klik "Mulai Produksi" untuk menjadwalkan mesin potong & sablon.'}
                {order.status === 'processing' && 'Pesanan sedang dikerjakan di konveksi. Anda dapat mengunggah foto sample bukti jahit/sablon untuk direview customer, atau langsung menyelesaikan produksi.'}
                {order.status === 'sample_review' && 'Foto sample bukti sablon telah dikirim ke customer. Menunggu konfirmasi persetujuan dari customer.'}
                {order.status === 'sample_rejected' && 'Customer meminta revisi pada sample. Periksa masukan customer di bawah lalu perbaiki sample.'}
                {order.status === 'ready' && 'Produksi selesai & lolos QC! Buat tagihan pelunasan 30% atau kirim barang ke ekspedisi.'}
                {order.status === 'shipped' && 'Pesanan telah diserahkan ke kurir pengiriman. Customer dapat melacak resi secara real-time.'}
                {order.status === 'delivered' && 'Pesanan telah diterima customer. Transaksi selesai sepenuhnya.'}
              </p>
            </div>

            {/* Quick Transition Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {order.status === 'pending' && (
                <Button
                  onClick={() => handleConfirmManualPayment('dp')}
                  disabled={isUpdating}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 rounded-xl font-semibold cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Konfirmasi DP Masuk (70%)
                </Button>
              )}

              {order.status === 'dp_paid' && (
                <Button
                  onClick={() => handleUpdateStatus('processing', 'Admin memasukkan pesanan ke antrian mesin produksi')}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 rounded-xl font-semibold cursor-pointer"
                >
                  Mulai Proses Produksi &rarr;
                </Button>
              )}

              {order.status === 'processing' && (
                <Button
                  onClick={() => handleUpdateStatus('ready', 'Produksi dan QC selesai. Pesanan siap dikirim.')}
                  disabled={isUpdating}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 rounded-xl font-semibold cursor-pointer"
                >
                  Selesai Produksi (Ready) ✅
                </Button>
              )}

              {order.status === 'sample_rejected' && (
                <Button
                  onClick={() => handleUpdateStatus('processing', 'Admin memulai ulang proses revisi sample')}
                  disabled={isUpdating}
                  className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs h-9 px-4 rounded-full font-bold cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Mulai Ulang Revisi Sample &rarr;
                </Button>
              )}

              {order.status === 'ready' && (
                <>
                  {!finalPaid && (
                    <>
                      <Button
                        onClick={() => handleConfirmManualPayment('final')}
                        disabled={isUpdating}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4 rounded-full font-bold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Konfirmasi Pelunasan Manual (30%)
                      </Button>
                      <Button
                        onClick={handleCreateFinalInvoice}
                        disabled={isUpdating}
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10 text-xs h-9 px-4 rounded-full font-bold cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                        Buat Invoice Duitku ({order.finalAmount ? `Rp ${order.finalAmount.toLocaleString('id-ID')}` : ''})
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => {
                      const el = document.getElementById('shipping-card')
                      el?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs h-9 px-4 rounded-full font-bold cursor-pointer shadow-xs"
                  >
                    <Truck className="w-3.5 h-3.5 mr-1.5" />
                    Proses Pengiriman Kurir &rarr;
                  </Button>
                </>
              )}

              {order.status === 'shipped' && (
                <Button
                  onClick={() => handleUpdateStatus('delivered', 'Pesanan telah sampai di tangan customer')}
                  disabled={isUpdating}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 rounded-xl font-semibold cursor-pointer"
                >
                  Tandai Selesai (Delivered)
                </Button>
              )}

              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <Button
                  onClick={() => {
                    if (confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) {
                      handleUpdateStatus('cancelled', 'Pesanan dibatalkan oleh admin')
                    }
                  }}
                  disabled={isUpdating}
                  variant="outline"
                  className="border-red-400/40 text-red-400 hover:bg-red-500/10 text-xs h-9 rounded-xl cursor-pointer"
                >
                  Batalkan
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Main Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Blueprint Viewer (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Blueprint Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Blueprint Desain & Sablon</h2>
                    <p className="text-[11px] text-slate-500">
                      Asset visual dan posisi elemen cetak mesin DTF/sablon
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {snapshot && (
                    <Button
                      size="sm"
                      onClick={() => setIsVendorBlueprintOpen(true)}
                      className="rounded-full bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs h-8 cursor-pointer gap-1.5 shadow-xs font-semibold px-3.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Lihat Blueprint Vendor
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="rounded-full text-xs h-8 border-slate-200 cursor-pointer font-medium px-3.5"
                  >
                    {showRawJson ? 'Lihat Visual' : 'Raw JSON'}
                  </Button>
                </div>
              </div>

              <div className="p-5">
                {showRawJson ? (
                  <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11px] overflow-x-auto max-h-96">
                    {JSON.stringify(blueprint, null, 2)}
                  </pre>
                ) : (
                  <div className="space-y-4">
                    {/* Zone Selector Tabs */}
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 flex-wrap">
                      {(['front', 'back', 'left', 'right'] as const).map((zone) => {
                        const zoneData = snapshot?.zones.find((z) => z.zone === zone)
                        const hasAssets = (zoneData?.assets?.length ?? 0) > 0 || zoneData?.hasDesign
                        const zoneLabels: Record<string, string> = {
                          front: 'Depan (Front)',
                          back: 'Belakang (Back)',
                          left: 'Lengan Kiri (Left)',
                          right: 'Lengan Kanan (Right)',
                        }
                        return (
                          <button
                            key={zone}
                            onClick={() => setActiveZone(zone)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                              activeZone === zone
                                ? 'bg-[#1A2B56] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            <span>{zoneLabels[zone] || zone}</span>
                            {hasAssets && (
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  activeZone === zone ? 'bg-emerald-400' : 'bg-emerald-500'
                                }`}
                                title="Ada desain pada sisi ini"
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Zone Visual Inspection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                      {/* Overall or Zone Canvas Preview */}
                      <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
                        {currentSnapshotZone && snapshot ? (
                          <div className="w-full flex justify-center">
                            <ZonePreview
                              key={activeZone}
                              zone={{ ...currentSnapshotZone, assets: currentZoneAssets }}
                              snapshot={snapshot}
                              autoFit={true}
                              className="w-full shadow-xs"
                            />
                          </div>
                        ) : previewImg ? (
                          <div className="w-full aspect-square flex items-center justify-center p-2">
                            <img
                              src={previewImg}
                              alt="Design Preview"
                              className="max-h-full max-w-full object-contain rounded-xl shadow-xs"
                            />
                          </div>
                        ) : (
                          <div className="text-center text-xs text-slate-400 p-8">
                            <Layers className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                            <p className="font-semibold text-slate-600">Preview visual tidak tersedia</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Belum ada snapshot mockup pada sisi ini.</p>
                          </div>
                        )}
                      </div>

                      {/* Zone Specs & Uploaded Assets */}
                      <div className="space-y-3 text-xs">
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="font-bold text-slate-800">
                              Detail Zona: <span className="capitalize text-blue-700">{activeZone}</span>
                            </h4>
                            {currentSnapshotZone?.hasDesign ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px] border border-emerald-200">
                                Ada Desain
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 text-[10px]">
                                Polos
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            Elemen grafis yang terdaftar pada zona ini siap diekspor ke format cetak DTF.
                          </p>

                          {totalElementsCount > 0 ? (
                            <div className="mt-2.5 space-y-2">
                              <div className="text-[11px] text-slate-600 flex items-center justify-between">
                                <span>Jumlah Elemen Sablon:</span>
                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                  {totalElementsCount} elemen
                                </span>
                              </div>

                              {currentZoneAssets.length > 0 && (
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60 max-h-48 overflow-y-auto pr-1">
                                  {currentZoneAssets.map((asset, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1 shadow-2xs"
                                    >
                                      <div className="flex justify-between items-center font-semibold text-slate-800">
                                        <span className="truncate max-w-[170px]">
                                          {asset.name || (asset.text ? `Teks: "${asset.text.slice(0, 20)}"` : `Asset #${idx + 1}`)}
                                        </span>
                                        <span className="text-blue-700 font-mono text-[10px]">
                                          {Math.round(asset.width * asset.scaleX)} × {Math.round(asset.height * asset.scaleY)} px
                                        </span>
                                      </div>
                                      <div className="text-slate-500 font-mono text-[10px] flex flex-wrap items-center gap-2">
                                        <span>Posisi: X:{Math.round(asset.left)} Y:{Math.round(asset.top)}</span>
                                        {asset.angle ? <span>Rotasi: {asset.angle}°</span> : null}
                                        {asset.fontSize ? <span>Font: {asset.fontSize}px</span> : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 mt-2">Tidak ada objek sablon pada sisi ini.</p>
                          )}
                        </div>

                        {/* Uploaded User Images for this Zone */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-800">
                              Aset Gambar Upload ({currentZoneImages.length})
                            </h4>
                          </div>
                          {currentZoneImages.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {currentZoneImages.map((imgUrl: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={`asset-${activeZone}-${idx + 1}.png`}
                                  className="group aspect-square rounded-lg border border-slate-200 bg-white p-1 overflow-hidden relative block hover:border-blue-400 transition"
                                  title="Klik untuk membuka / unduh gambar"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Asset ${idx}`}
                                    className="w-full h-full object-contain"
                                  />
                                  <span className="absolute inset-0 bg-slate-900/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold gap-1">
                                    <Download className="w-3.5 h-3.5" />
                                    Unduh
                                  </span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400">Tidak ada file upload eksternal pada zona ini.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ordered Items Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-3">Rincian Barang yang Dipesan</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {order.items?.map((it: any) => (
                  <div key={it.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{it.productName}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>Warna: {it.color}</span>
                        <span>•</span>
                        <span>Ukuran: {it.size}</span>
                        <span>•</span>
                        <span>Qty: {it.quantity} pcs</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">
                        Rp {(it.unitPrice * it.quantity).toLocaleString('id-ID')}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        @ Rp {it.unitPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Barang:</span>
                    <span>Rp {order.subtotal?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Ongkos Kirim Ekspedisi:</span>
                    <span>Rp {order.shippingCost?.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-100">
                    <span>Total Pembayaran:</span>
                    <span className="text-blue-700">Rp {order.totalAmount?.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Change Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-4">Riwayat Perjalanan Status</h3>
              <div className="space-y-4">
                {order.statusLogs?.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 capitalize">
                          {log.toStatus?.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{log.note}</p>
                      {log.changer && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Oleh: {log.changer.name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Customer, Payment & Shipping Details */}
          <div className="space-y-6">
            {/* Customer & Shipping Address */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Data Pemesan</h3>
              </div>
              <div className="text-xs space-y-1.5 text-slate-600">
                <p className="font-semibold text-slate-800">{order.customer?.name}</p>
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {order.customer?.email}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {order.customer?.phone || '-'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs text-slate-900">Alamat Pengiriman</h4>
                </div>
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <p className="font-medium text-slate-800">
                    {order.shipment?.destinationAddress?.name || order.customer?.name} (
                    {order.shipment?.destinationAddress?.phone || order.customer?.phone})
                  </p>
                  <p>{order.shipment?.destinationAddress?.street || 'Alamat tidak tercantum'}</p>
                  <p>
                    {order.shipment?.destinationAddress?.city}, {order.shipment?.destinationAddress?.province}{' '}
                    {order.shipment?.destinationAddress?.postalCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Sample Proofing Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#1A2B56]" />
                  <h3 className="font-bold text-sm text-slate-900">Sample Bukti Sablon / Jahit</h3>
                </div>
                {order.status === 'sample_review' && (
                  <Badge className="bg-[#F5F0F8] text-[#1A2B56] border border-[#B697BD] text-[10px]">Menunggu Review</Badge>
                )}
                {order.status === 'sample_rejected' && (
                  <Badge className="bg-red-100 text-red-800 text-[10px]">Revisi Diminta</Badge>
                )}
                {order.samplePhotoUrl && order.status !== 'sample_review' && order.status !== 'sample_rejected' && (
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Sample Disetujui</Badge>
                )}
              </div>

              {/* Existing sample info */}
              {order.samplePhotoUrl ? (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2">
                  <div className="aspect-video w-full rounded-lg bg-slate-200 overflow-hidden relative border border-slate-200">
                    <img
                      src={order.samplePhotoUrl}
                      alt="Sample Proof"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {order.sampleNote && (
                    <p className="text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Catatan Admin:</span> {order.sampleNote}
                    </p>
                  )}
                  {order.sampleFeedback && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px]">
                      <span className="font-bold block">Masukan Revisi Customer:</span>
                      {order.sampleFeedback}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Belum ada foto sample yang diunggah untuk pesanan ini.
                </p>
              )}

              {/* Upload form for admin (when processing or sample_rejected) */}
              {(order.status === 'processing' || order.status === 'sample_rejected') && (
                <form onSubmit={handleSubmitSample} className="space-y-3 pt-2 text-xs border-t border-slate-100">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      URL Foto Sample (Google Drive / Direct Link)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={sampleUrlInput}
                      onChange={(e) => setSampleUrlInput(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Catatan Tambahan untuk Customer
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Sample sablon dada 2 warna sudah selesai..."
                      value={sampleNoteInput}
                      onChange={(e) => setSampleNoteInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-blue-600"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmittingSample}
                    className="w-full bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs h-9 px-4 rounded-full font-bold cursor-pointer shadow-xs"
                  >
                    {isSubmittingSample ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Kirim Foto Sample ke Customer
                  </Button>
                </form>
              )}
            </div>

            {/* Split Payment Tracking Card (70:30) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Status Pembayaran (70:30)</h3>
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 text-[10px]">Duitku Gateway</Badge>
              </div>

              {/* Invoice 1: DP 70% */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Invoice 1: DP 70% + Ongkir</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                      dpPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8]'
                    }`}
                  >
                    {dpPaid ? 'Lunas ✅' : 'Menunggu Bayar ⏳'}
                  </span>
                </div>
                <p className="text-base font-extrabold text-slate-900">
                  Rp {order.dpAmount?.toLocaleString('id-ID')}
                </p>
                {dpPayment?.paidAt && (
                  <p className="text-[10px] text-slate-400">
                    Dibayar pada: {new Date(dpPayment.paidAt).toLocaleString('id-ID')}
                  </p>
                )}
                {dpPayment?.duitkuReference && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    Ref: {dpPayment.duitkuReference}
                  </p>
                )}
                {!dpPaid && (
                  <button
                    onClick={() => handleConfirmManualPayment('dp')}
                    disabled={isUpdating}
                    className="mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer transition"
                  >
                    Konfirmasi DP Manual (Bypass Duitku)
                  </button>
                )}
              </div>

              {/* Invoice 2: Final 30% */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Invoice 2: Pelunasan 30%</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                      finalPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : finalPayment
                        ? 'bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8]'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {finalPaid
                      ? 'Lunas ✅'
                      : finalPayment
                      ? 'Menunggu Bayar ⏳'
                      : 'Belum Ditagihkan'}
                  </span>
                </div>
                <p className="text-base font-extrabold text-slate-900">
                  Rp {order.finalAmount?.toLocaleString('id-ID')}
                </p>
                {finalPayment?.paymentUrl && !finalPaid && (
                  <a
                    href={finalPayment.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold underline mt-1"
                  >
                    Link Tagihan Duitku
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {!finalPaid && (
                  <div>
                    <button
                      onClick={() => handleConfirmManualPayment('final')}
                      disabled={isUpdating}
                      className="mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer transition"
                    >
                      Konfirmasi Pelunasan Manual (Bypass Duitku)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Management Card */}
            <div id="shipping-card" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-sm text-slate-900">Ekspedisi & Pengiriman</h3>
                </div>
                <Badge className="bg-purple-50 text-purple-700 text-[10px]">Biteship</Badge>
              </div>

              {order.shipment?.trackingNumber ? (
                <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Kurir:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {order.shipment.courierName || order.shipment.courierCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Nomor Resi:</span>
                    <span className="font-mono font-bold text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-200">
                      {order.shipment.trackingNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-purple-100">
                    <span>Status Kurir:</span>
                    <span className="font-semibold text-purple-700 capitalize">
                      {order.shipment.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleDispatchShipment} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Ekspedisi</label>
                    <select
                      value={courierCode}
                      onChange={(e) => {
                        setCourierCode(e.target.value)
                        setCourierName(e.target.options[e.target.selectedIndex].text)
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    >
                      <option value="jne">JNE Express</option>
                      <option value="jnt">J&T Express</option>
                      <option value="sicepat">SiCepat Express</option>
                      <option value="anteraja">AnterAja</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nomor Resi Pengiriman
                    </label>
                    <input
                      type="text"
                      placeholder="Kosongkan untuk resi otomatis Biteship"
                      value={trackingNumberInput}
                      onChange={(e) => setTrackingNumberInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Bisa input resi fisik manual atau biarkan kosong untuk di-generate otomatis.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isDispatching || order.status === 'shipped' || order.status === 'delivered'}
                    className="w-full bg-purple-700 hover:bg-purple-600 text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer"
                  >
                    {isDispatching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Memproses Pengiriman...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Kirim Barang & Input Resi
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Internal Production Notes Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-700" />
                  <h3 className="font-bold text-sm text-slate-900">Catatan Internal Produksi</h3>
                </div>
                <Badge className="bg-slate-100 text-slate-600 text-[10px]">Khusus Tim Konveksi</Badge>
              </div>

              {/* Note history */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {(!order.internalNotes || order.internalNotes.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Belum ada catatan internal. Tambahkan memo pengerjaan kain, benang, atau QC di bawah.
                  </p>
                ) : (
                  order.internalNotes.map((n: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-700">{n.adminName}</span>
                        <span>{new Date(n.createdAt).toLocaleString('id-ID')}</span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-wrap">{n.note}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddInternalNote} className="pt-2 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Tambah memo (cth: Kain combed dipotong 23 Sep)..."
                  value={internalNoteInput}
                  onChange={(e) => setInternalNoteInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:border-blue-600"
                />
                <Button
                  type="submit"
                  disabled={isSavingNote || !internalNoteInput.trim()}
                  className="bg-slate-900 hover:bg-blue-600 text-white text-xs h-9 px-3.5 rounded-xl font-semibold cursor-pointer shrink-0"
                >
                  {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {snapshot && (
        <VendorBlueprintModal
          open={isVendorBlueprintOpen}
          onOpenChange={setIsVendorBlueprintOpen}
          snapshot={snapshot}
        />
      )}
    </div>
  )
}
