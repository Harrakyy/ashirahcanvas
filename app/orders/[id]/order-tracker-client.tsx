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
  ShieldCheck,
  CreditCard,
  MapPin,
  ExternalLink,
  Copy,
  AlertCircle,
  Loader2,
  Phone,
  HelpCircle,
  RotateCcw,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InvoiceDownloadButton } from '@/components/invoice-download-button'
import { BLUEPRINT_STORAGE_KEY } from '@/features/canvas/utils/exportHelpers'

interface OrderTrackerProps {
  orderId: string
}

export default function OrderTrackerClient({ orderId }: OrderTrackerProps) {
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedResi, setCopiedResi] = useState(false)
  const [isPayingFinal, setIsPayingFinal] = useState(false)
  const [isReviewingSample, setIsReviewingSample] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectFeedback, setRejectFeedback] = useState('')

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data.order)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedResi(true)
    setTimeout(() => setCopiedResi(false), 2000)
  }

  const handlePayFinal = async () => {
    setIsPayingFinal(true)
    try {
      const res = await fetch('/api/payment/create-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        alert(data.error || 'Gagal memproses pembayaran pelunasan')
      }
    } catch (err: any) {
      alert(err.message || 'Koneksi gagal')
    } finally {
      setIsPayingFinal(false)
    }
  }

  const handleRepeatOrder = () => {
    if (!order) return
    const repeatData = {
      orderNumber: order.orderNumber,
      blueprint: order.designBlueprint,
      items: order.items,
      tenantSlug: order.tenant?.slug || 'ashira-garment',
    }
    try {
      localStorage.setItem('repeatOrderData', JSON.stringify(repeatData))
      if (order.designBlueprint && Object.keys(order.designBlueprint).length > 0) {
        localStorage.setItem(BLUEPRINT_STORAGE_KEY, JSON.stringify(order.designBlueprint))
      }
    } catch (e) {
      console.warn('Failed to cache repeat order in localStorage:', e)
    }
    const tenantSlug = order.tenant?.slug || 'ashira-garment'
    window.location.href = `/store/${tenantSlug}/editor?repeat=true`
  }

  const handleReviewSample = async (action: 'approve' | 'reject') => {
    setIsReviewingSample(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/sample/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          feedback: action === 'reject' ? rejectFeedback : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setShowRejectInput(false)
        setRejectFeedback('')
        alert(data.message)
        await fetchOrder()
      } else {
        alert(data.error || 'Gagal memproses review sample')
      }
    } catch (err: any) {
      alert(err.message || 'Koneksi gagal')
    } finally {
      setIsReviewingSample(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Memuat status pesanan...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-4">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-xs max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h2 className="text-sm font-bold text-slate-800">Pesanan Tidak Ditemukan</h2>
          <Link href="/orders">
            <Button size="sm" className="mt-4 bg-blue-700 text-white text-xs">
              Kembali ke Pesanan Saya
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

  // Stepper calculations
  const steps = [
    { id: 'created', label: 'Pesanan Dibuat', done: true },
    { id: 'dp_paid', label: 'DP 70% Diterima', done: dpPaid },
    { id: 'processing', label: 'Proses Produksi', done: ['processing', 'ready', 'shipped', 'delivered'].includes(order.status) },
    { id: 'ready', label: 'Selesai & Pelunasan', done: ['ready', 'shipped', 'delivered'].includes(order.status) },
    { id: 'shipped', label: 'Dikirim Kurir', done: ['shipped', 'delivered'].includes(order.status) },
    { id: 'delivered', label: 'Diterima', done: order.status === 'delivered' },
  ]

  const blueprint = order.designBlueprint || {}
  const previewImg =
    blueprint.design_assets?.preview_base64 ||
    blueprint.preview_base64 ||
    blueprint.previewBase64 ||
    (blueprint.zones?.find((z: any) => z.zone === 'front')?.assets?.find((a: any) => a.src)?.src) ||
    blueprint.zones?.find((z: any) => z.hasDesign)?.mockupUrl ||
    null

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-20 px-4 md:px-8 max-w-4xl mx-auto space-y-6">
        {/* Back and Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/orders">
              <Button variant="outline" size="sm" className="rounded-xl h-9 border-slate-200 cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Kembali
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-slate-900">{order.orderNumber}</h1>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  {order.tenant?.name || 'Ashira Studio'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dibuat pada {new Date(order.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <InvoiceDownloadButton order={order} />
            {order.status === 'delivered' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRepeatOrder}
                className="rounded-xl h-9 border-slate-200 text-xs gap-1.5 cursor-pointer text-blue-700 hover:bg-blue-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Pesan Ulang
              </Button>
            )}
          </div>
        </div>

        {/* Stepper Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-6">Pelacakan Status Pesanan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {steps.map((st, idx) => (
              <div key={st.id} className="flex flex-col items-center text-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                    st.done
                      ? 'bg-blue-700 text-white shadow-md shadow-blue-500/25 ring-4 ring-blue-100'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {st.done ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
                <span className={`text-[11px] font-semibold leading-tight ${st.done ? 'text-slate-900' : 'text-slate-400'}`}>
                  {st.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Prompt Banners (Ashira Deep Navy, NO ORANGE) */}
        {order.status === 'pending' && !dpPaid && (
          <div className="bg-[#1A2B56] text-white p-5 rounded-2xl shadow-md border border-[#243B6B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-white">Menunggu Pembayaran DP 70%</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Selesaikan pembayaran DP sebesar Rp {order.dpAmount?.toLocaleString('id-ID')} agar konveksi dapat segera memulai proses sablon.
              </p>
            </div>
            {dpPayment?.paymentUrl ? (
              <a href={dpPayment.paymentUrl} target="_blank" rel="noreferrer">
                <Button className="bg-white text-[#1A2B56] hover:bg-neutral-100 text-xs font-bold h-9 px-5 rounded-full cursor-pointer shadow-sm">
                  Bayar DP 70% Sekarang &rarr;
                </Button>
              </a>
            ) : (
              <Link href={`/payment/mock?orderId=${order.orderNumber}&amount=${order.dpAmount}`}>
                <Button className="bg-white text-[#1A2B56] hover:bg-neutral-100 text-xs font-bold h-9 px-5 rounded-full cursor-pointer shadow-sm">
                  Bayar DP 70% Sekarang &rarr;
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Sample Review Card for Customer */}
        {order.status === 'sample_review' && (
          <div className="bg-white border-2 border-[#B697BD]/50 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F5F0F8] text-[#1A2B56] flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5 text-[#1A2B56]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Konfirmasi Bukti Cetak / Sample Apparel</h3>
                  <p className="text-xs text-slate-500">Konveksi telah selesai membuat sample awal. Silakan periksa sebelum lanjut jahit masal.</p>
                </div>
              </div>
              <Badge className="bg-[#F5F0F8] text-[#1A2B56] border-[#B697BD]/60 text-xs">Perlu Persetujuan</Badge>
            </div>

            {order.samplePhotoUrl && (
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-2 max-h-80">
                <img
                  src={order.samplePhotoUrl}
                  alt="Sample Produk"
                  className="max-h-72 max-w-full object-contain rounded-lg shadow-2xs"
                />
              </div>
            )}

            {order.sampleNote && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                <span className="font-bold block text-slate-800 mb-0.5">Catatan dari Konveksi:</span>
                {order.sampleNote}
              </div>
            )}

            {showRejectInput ? (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-800">
                  Tuliskan bagian yang ingin direvisi (contoh: sablon dada kurang ke tengah, warna sablon kurang cerah):
                </label>
                <textarea
                  rows={3}
                  value={rejectFeedback}
                  onChange={(e) => setRejectFeedback(e.target.value)}
                  placeholder="Catatan revisi Anda..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-hidden focus:border-red-500"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleReviewSample('reject')}
                    disabled={isReviewingSample || !rejectFeedback.trim()}
                    className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs h-9 rounded-full px-5 font-bold cursor-pointer"
                  >
                    {isReviewingSample ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Kirim Catatan Revisi ke Konveksi
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectInput(false)}
                    className="text-xs h-9 rounded-full px-4 border-slate-200 cursor-pointer"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                <Button
                  onClick={() => handleReviewSample('approve')}
                  disabled={isReviewingSample}
                  className="flex-1 bg-[#1A2B56] hover:bg-[#243B6B] text-white font-bold text-xs h-10 rounded-full px-5 cursor-pointer shadow-xs gap-1.5"
                >
                  {isReviewingSample ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Setujui Sample & Lanjutkan Produksi Masal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectInput(true)}
                  disabled={isReviewingSample}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs h-10 rounded-full px-5 font-semibold cursor-pointer gap-1.5"
                >
                  <AlertCircle className="w-4 h-4" />
                  Minta Revisi Sample
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Sample Rejected Alert (NO ORANGE, Using Ashira Slate Blue) */}
        {order.status === 'sample_rejected' && (
          <div className="bg-[#F0F2F6] border border-[#C4C8D8] rounded-2xl p-5 shadow-xs flex items-start gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-[#4C567A] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-[#1A2B56] text-sm">Permintaan Revisi Sample Sedang Dikerjakan Konveksi</h4>
              <p className="text-[#4C567A] mt-1">
                Anda telah meminta revisi: <span className="font-semibold italic">"{order.sampleFeedback}"</span>.
                Pihak konveksi sedang melakukan perbaikan sample. Anda akan menerima pembaruan begitu foto sample baru diunggah.
              </p>
            </div>
          </div>
        )}

        {order.status === 'ready' && !finalPaid && (
          <div className="bg-[#1A2B56] text-white p-5 rounded-2xl shadow-md border border-[#243B6B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-white">Produksi Selesai! Saatnya Pelunasan 30%</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Barang Anda telah selesai dijahit dan lolos QC. Lunasi sisa 30% (Rp {order.finalAmount?.toLocaleString('id-ID')}) agar kurir segera mengirimkannya.
              </p>
            </div>
            <Button
              onClick={handlePayFinal}
              disabled={isPayingFinal}
              className="bg-white text-[#1A2B56] hover:bg-neutral-100 text-xs font-bold h-9 px-5 rounded-full cursor-pointer shadow-sm"
            >
              {isPayingFinal ? 'Menyiapkan Tagihan...' : `Bayar Pelunasan 30% →`}
            </Button>
          </div>
        )}

        {/* Delivered Repeat Order Banner */}
        {order.status === 'delivered' && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Pesanan Selesai & Diterima</h3>
              </div>
              <p className="text-xs text-emerald-100 mt-1">
                Butuh restok apparel atau seragam untuk batch berikutnya? Pesan ulang dengan blueprint & spesifikasi desain yang sama dalam 1 klik.
              </p>
            </div>
            <Button
              onClick={handleRepeatOrder}
              className="bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold h-9 px-4 rounded-xl cursor-pointer shrink-0 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
              Pesan Ulang (1-Klik)
            </Button>
          </div>
        )}

        {/* Courier Tracking Section */}
        {order.shipment?.trackingNumber && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-900">Informasi Pengiriman Ekspedisi</h3>
              </div>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs uppercase">
                {order.shipment.courierName || order.shipment.courierCode}
              </Badge>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Nomor Resi:</span>
                <span className="font-mono font-bold text-base text-slate-900">
                  {order.shipment.trackingNumber}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(order.shipment.trackingNumber)}
                className="h-8 text-xs rounded-xl border-slate-200 gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                {copiedResi ? 'Tersalin! ✅' : 'Salin Resi'}
              </Button>
            </div>

            <p className="text-[11px] text-slate-500">
              Paket Anda sedang diantar oleh kurir menuju alamat tujuan. Anda juga dapat memeriksa nomor resi di situs resmi ekspedisi.
            </p>
          </div>
        )}

        {/* Order Details & Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Detail Apparel yang Dipesan</h3>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center p-2 overflow-hidden shrink-0">
                {previewImg ? (
                  <img src={previewImg} alt="Preview Desain" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Package className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-slate-800">{order.items[0]?.productName || 'Custom T-Shirt'}</p>
                <p className="text-slate-500">Warna: {order.items[0]?.color}</p>
                <p className="text-slate-500">Ukuran: {order.items[0]?.size}</p>
                <p className="text-slate-500">Jumlah: {order.items[0]?.quantity} pcs</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({order.items.reduce((s: number, i: any) => s + i.quantity, 0)} pcs):</span>
                <span>Rp {order.subtotal?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ongkir Ekspedisi:</span>
                <span>Rp {order.shippingCost?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-100">
                <span>Total:</span>
                <span className="text-blue-700">Rp {order.totalAmount?.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Right Info: Payment Breakdown & Address */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-xs space-y-3">
              <h4 className="font-bold text-slate-900">Skema Pembayaran (70:30)</h4>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span>DP 70% + Ongkir:</span>
                  <span className="font-bold text-slate-800">
                    Rp {order.dpAmount?.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-[10px] text-right">
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${dpPaid ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8]'}`}>
                    {dpPaid ? 'Lunas ✅' : 'Menunggu Bayar'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Pelunasan 30%:</span>
                  <span className="font-bold text-slate-800">
                    Rp {order.finalAmount?.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-[10px] text-right">
                  <span className={`px-1.5 py-0.5 rounded font-semibold ${finalPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {finalPaid ? 'Lunas ✅' : 'Saat Produksi Siap'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Alamat Pengiriman</span>
              </div>
              <p className="text-slate-600">
                {order.shipment?.destinationAddress?.street || 'Bandung, Jawa Barat'}
              </p>
              <p className="text-slate-500 text-[11px]">
                {order.shipment?.destinationAddress?.city}, {order.shipment?.destinationAddress?.postalCode}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
