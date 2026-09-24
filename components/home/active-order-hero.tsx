'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  CreditCard,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface OrderItem {
  id: string
  productName: string
  color: string
  size: string
  quantity: number
  unitPrice: number
}

export interface Order {
  id: string
  orderNumber: string
  status: 'pending' | 'dp_paid' | 'processing' | 'ready' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: number
  shippingCost: number
  totalAmount: number
  dpAmount: number
  finalAmount: number
  createdAt: string
  designBlueprint?: any
  samplePhotoUrl?: string | null
  sampleApproved?: boolean | null
  items: OrderItem[]
  payments?: any[]
  shipment?: {
    courierName: string
    trackingNumber: string
    status: string
  }
}

interface ActiveOrderHeroProps {
  order: Order
  totalActiveOrders: number
  userName: string
  onRepeatOrder?: (order: Order) => void
}

export default function ActiveOrderHero({
  order,
  totalActiveOrders,
  userName,
  onRepeatOrder,
}: ActiveOrderHeroProps) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Status mapping badge
  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A2B56] animate-pulse" />
            Menunggu Pembayaran DP
          </span>
        )
      case 'dp_paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1A2B56] border border-blue-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            DP Diterima • Antrean Cetak
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-900 border border-indigo-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            Sedang Diproduksi & Sablon
          </span>
        )
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F5F0F8] text-[#1A2B56] border border-[#B697BD]/60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B697BD]" />
            Siap Dikirim (Perlu Pelunasan 30%)
          </span>
        )
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-900 border border-purple-200/80">
            <Truck className="w-3.5 h-3.5 text-purple-600" />
            Sedang Dikirim Kurir
          </span>
        )
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Pesanan Selesai
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
            {status}
          </span>
        )
    }
  }

  // Progress Step: 1 (Dibuat), 2 (DP Lunas), 3 (Produksi), 4 (Pelunasan & Siap Kirim), 5 (Pengiriman)
  const getStepProgress = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 1
      case 'dp_paid':
        return 2
      case 'processing':
        return 3
      case 'ready':
        return 4
      case 'shipped':
        return 5
      case 'delivered':
        return 6
      default:
        return 1
    }
  }

  const currentStep = getStepProgress(order.status)
  const firstItem = order.items?.[0]
  const totalQty = order.items?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0

  const handlePayDP = async () => {
    setIsProcessingPayment(true)
    try {
      const res = await fetch('/api/payment/create-dp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = await res.json()
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        alert(data.error || 'Gagal memproses pembayaran DP')
      }
    } catch {
      alert('Terjadi kesalahan koneksi pembayaran')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handlePayFinal = async () => {
    setIsProcessingPayment(true)
    try {
      const res = await fetch('/api/payment/create-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      const data = await res.json()
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        alert(data.error || 'Gagal memproses pembayaran pelunasan')
      }
    } catch {
      alert('Terjadi kesalahan koneksi pembayaran')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  return (
    <section className="mb-10 animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Sapaan Pengguna */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F152E] tracking-tight">
            Halo, {userName.split(' ')[0]}! 👋
          </h2>
          <p className="text-sm text-[#4C567A] mt-0.5">
            {totalActiveOrders > 1
              ? `Anda memiliki ${totalActiveOrders} pesanan aktif yang sedang diproses konveksi.`
              : 'Pantau langsung progres pengerjaan baju pesanan Anda di bawah ini.'}
          </p>
        </div>

        {totalActiveOrders > 1 && (
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A2B56] hover:text-[#243B6B] transition-colors py-1 self-start sm:self-auto"
          >
            <span>Semua Pesanan ({totalActiveOrders})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Main Active Order Card (Clean White Surface & Subtle Border) */}
      <div className="bg-white rounded-2xl border border-[#E2E4E9] shadow-sm hover:shadow-md transition-all overflow-hidden">
        {/* Card Header Strip with Ashira Soft Gradient */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-50/60 via-slate-50/40 to-[#F8F4FA]/60 border-b border-[#E2E4E9]/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1A2B56]" />
            <span className="text-xs font-bold text-[#0F152E] tracking-wider uppercase">
              Pesanan #{order.orderNumber}
            </span>
            <span className="text-xs text-[#4C567A]">
              • {new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div>{getStatusBadge(order.status)}</div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Item Brief & Price */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F8F9FA] border border-[#E2E4E9] flex items-center justify-center shrink-0 text-2xl">
                👕
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#0F152E]">
                  {firstItem?.productName || 'Custom Apparel'}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#4C567A]">
                  <span className="font-medium text-[#0F152E]">{totalQty} pcs total</span>
                  {firstItem?.color && <span>• Warna: {firstItem.color}</span>}
                  {firstItem?.size && <span>• Ukuran: {firstItem.size}</span>}
                  {order.items?.length > 1 && (
                    <span className="text-xs text-[#1A2B56] font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                      +{order.items.length - 1} item lainnya
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#EDEDF2]">
              <span className="text-xs text-[#4C567A] block">Total Biaya Pesanan</span>
              <span className="text-lg sm:text-xl font-bold text-[#1A2B56]">
                Rp {order.totalAmount.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-[#4C567A] block">
                (DP Rp {order.dpAmount.toLocaleString('id-ID')} • Pelunasan Rp {order.finalAmount.toLocaleString('id-ID')})
              </span>
            </div>
          </div>

          {/* Mini Progress Tracker Bar */}
          <div className="pt-2 pb-1">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    currentStep >= 1
                      ? 'bg-[#1A2B56] text-white shadow-xs'
                      : 'bg-[#EDEDF2] text-[#4C567A]'
                  }`}
                >
                  {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                </div>
                <span className={`text-[11px] font-medium ${currentStep >= 1 ? 'text-[#0F152E]' : 'text-neutral-400'}`}>
                  Dipesan
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    currentStep >= 2
                      ? 'bg-[#1A2B56] text-white shadow-xs'
                      : 'bg-[#EDEDF2] text-[#4C567A]'
                  }`}
                >
                  {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
                </div>
                <span className={`text-[11px] font-medium ${currentStep >= 2 ? 'text-[#0F152E]' : 'text-neutral-400'}`}>
                  DP 70% Lunas
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    currentStep >= 3
                      ? 'bg-[#1A2B56] text-white shadow-xs'
                      : 'bg-[#EDEDF2] text-[#4C567A]'
                  }`}
                >
                  {currentStep > 3 ? <CheckCircle2 className="w-4 h-4" /> : '3'}
                </div>
                <span className={`text-[11px] font-medium ${currentStep >= 3 ? 'text-[#0F152E]' : 'text-neutral-400'}`}>
                  Sablon & Jahit
                </span>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    currentStep >= 4
                      ? 'bg-[#1A2B56] text-white shadow-xs'
                      : 'bg-[#EDEDF2] text-[#4C567A]'
                  }`}
                >
                  {currentStep >= 5 ? <CheckCircle2 className="w-4 h-4" /> : '4'}
                </div>
                <span className={`text-[11px] font-medium ${currentStep >= 4 ? 'text-[#0F152E]' : 'text-neutral-400'}`}>
                  Pelunasan & Kirim
                </span>
              </div>
            </div>

            {/* Connecting Bar */}
            <div className="w-full bg-[#EDEDF2] h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#1A2B56] to-[#B697BD] h-full rounded-full transition-all duration-500"
                style={{
                  width:
                    currentStep === 1
                      ? '15%'
                      : currentStep === 2
                      ? '40%'
                      : currentStep === 3
                      ? '65%'
                      : currentStep === 4
                      ? '85%'
                      : '100%',
                }}
              />
            </div>
          </div>

          {/* Contextual Action Banner */}
          {order.status === 'pending' && (
            <div className="p-4 rounded-xl bg-[#F0F2F6] border border-[#C4C8D8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-[#4C567A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#1A2B56]">
                    Pembayaran Uang Muka (DP 70%) Menunggu Konfirmasi
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Harap selesaikan pembayaran DP sebesar{' '}
                    <span className="font-bold text-[#1A2B56]">Rp {order.dpAmount.toLocaleString('id-ID')}</span> agar konveksi dapat segera menjadwalkan produksi baju.
                  </p>
                </div>
              </div>

              <Button
                onClick={handlePayDP}
                disabled={isProcessingPayment}
                className="bg-[#1A2B56] hover:bg-[#243B6B] text-white font-bold text-xs rounded-full px-5 shadow-xs shrink-0 self-stretch sm:self-auto h-9 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                {isProcessingPayment ? 'Memproses...' : 'Bayar DP Sekarang →'}
              </Button>
            </div>
          )}

          {order.status === 'ready' && (
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#1A2B56] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0F152E]">
                    Baju Selesai Diproduksi! Saatnya Pelunasan 30%
                  </p>
                  <p className="text-xs text-[#4C567A] mt-0.5">
                    Total sisa tagihan adalah{' '}
                    <span className="font-bold text-[#1A2B56]">Rp {order.finalAmount.toLocaleString('id-ID')}</span>. Setelah pelunasan, paket akan langsung dijemput kurir.
                  </p>
                </div>
              </div>

              <Button
                onClick={handlePayFinal}
                disabled={isProcessingPayment}
                className="bg-[#1A2B56] hover:bg-[#243B6B] text-white font-medium text-xs rounded-xl shadow-xs shrink-0 self-stretch sm:self-auto h-9"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                {isProcessingPayment ? 'Memproses...' : 'Bayar Pelunasan 30% →'}
              </Button>
            </div>
          )}

          {order.status === 'shipped' && order.shipment && (
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Truck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-purple-950">
                    Paket Sedang Dalam Pengiriman ({order.shipment.courierName})
                  </p>
                  <p className="text-xs text-purple-800 mt-0.5">
                    Nomor Resi:{' '}
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-purple-200">
                      {order.shipment.trackingNumber}
                    </span>
                  </p>
                </div>
              </div>

              <Link href={`/orders/${order.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border-purple-200 text-purple-900 hover:bg-purple-50 text-xs rounded-xl h-9"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Lacak Pengiriman Kurir
                </Button>
              </Link>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#EDEDF2]">
            <div className="flex items-center gap-2">
              <Link href={`/orders/${order.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#E2E4E9] text-[#0F152E] hover:bg-neutral-50 rounded-xl text-xs font-semibold h-9 gap-1.5"
                >
                  Lihat Detail & Invoice
                  <ArrowRight className="w-3.5 h-3.5 text-[#4C567A]" />
                </Button>
              </Link>

              {onRepeatOrder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRepeatOrder(order)}
                  className="text-xs font-semibold text-[#1A2B56] hover:bg-blue-50/60 rounded-xl h-9 gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#1A2B56]" />
                  Pesan Ulang Desain Ini
                </Button>
              )}
            </div>

            <Link
              href="/orders"
              className="text-xs font-medium text-[#4C567A] hover:text-[#1A2B56] transition underline underline-offset-4"
            >
              Buka Semua Riwayat Pesanan
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
