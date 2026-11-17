'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import QuickReorderModal from '@/components/home/quick-reorder-modal'
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  RotateCcw,
  Search,
  Filter,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderItem {
  id: string
  productName: string
  color: string
  size: string
  quantity: number
  unitPrice: number
}

interface PaymentItem {
  id: string
  type: 'dp' | 'final'
  status: 'pending' | 'paid'
  amount: number
  paymentUrl?: string
}

interface Order {
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
  tenant?: {
    name: string
    slug: string
  }
  items: OrderItem[]
  payments: PaymentItem[]
  shipment?: {
    courierName: string
    trackingNumber: string
    status: string
  }
}

type FilterTab = 'all' | 'need_action' | 'processing' | 'shipped' | 'delivered'

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [copiedResi, setCopiedResi] = useState<string | null>(null)

  // Reorder modal
  const [reorderModalOpen, setReorderModalOpen] = useState(false)
  const [selectedOrderForReorder, setSelectedOrderForReorder] = useState<any>(null)

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch('/api/orders')
        if (res.ok) {
          const data = await res.json()
          setOrders(data.orders || [])
        }
      } catch (err) {
        console.error('Failed to load customer orders:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadOrders()
  }, [])

  const copyToClipboard = (resi: string) => {
    navigator.clipboard.writeText(resi)
    setCopiedResi(resi)
    setTimeout(() => setCopiedResi(null), 2000)
  }

  const handlePayDP = async (orderId: string) => {
    setProcessingOrderId(orderId)
    try {
      const res = await fetch('/api/payment/create-dp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
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
      setProcessingOrderId(null)
    }
  }

  const handlePayFinal = async (orderId: string) => {
    setProcessingOrderId(orderId)
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
    } catch {
      alert('Terjadi kesalahan koneksi pembayaran')
    } finally {
      setProcessingOrderId(null)
    }
  }

  // Ashira Brand Status Badges (NO ORANGE, Using Deep Navy, Slate Blue, Soft Lilac, Emerald)
  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4C567A] animate-pulse" />
            Menunggu Pembayaran DP
          </span>
        )
      case 'dp_paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1A2B56] border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A2B56]" />
            DP Diterima • Antrean Cetak
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F0F8] text-[#1A2B56] border border-[#B697BD]/60">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B697BD] animate-pulse" />
            Sedang Diproduksi & Sablon
          </span>
        )
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#1A2B56] text-white shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Siap Dikirim (Perlu Pelunasan 30%)
          </span>
        )
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1A2B56] border border-blue-200">
            <Truck className="w-3.5 h-3.5 text-[#1A2B56]" />
            Sedang Dikirim Kurir
          </span>
        )
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Pesanan Selesai
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-300">
            Dibatalkan
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800">
            {status}
          </span>
        )
    }
  }

  // Filter logic
  const filteredOrders = orders.filter((order) => {
    // Filter tab
    if (activeTab === 'need_action' && !(order.status === 'pending' || order.status === 'ready')) {
      return false
    }
    if (activeTab === 'processing' && !(order.status === 'dp_paid' || order.status === 'processing')) {
      return false
    }
    if (activeTab === 'shipped' && order.status !== 'shipped') {
      return false
    }
    if (activeTab === 'delivered' && order.status !== 'delivered') {
      return false
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchNumber = order.orderNumber.toLowerCase().includes(q)
      const matchProduct = order.items.some((it) => it.productName.toLowerCase().includes(q))
      return matchNumber || matchProduct
    }

    return true
  })

  // Statistics
  const needActionCount = orders.filter((o) => o.status === 'pending' || o.status === 'ready').length
  const processingCount = orders.filter((o) => o.status === 'dp_paid' || o.status === 'processing').length
  const shippedCount = orders.filter((o) => o.status === 'shipped').length
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-[#0F152E]">
      <Header />

      <main className="pt-24 pb-20 px-4 md:px-8 max-w-5xl mx-auto space-y-6">
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EDEDF2] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#4C567A] mb-1">
              <Link href="/" className="hover:text-[#1A2B56] transition">Beranda</Link>
              <span>/</span>
              <span className="text-[#0F152E] font-semibold">Pesanan Saya</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F152E] tracking-tight">
              Pusat Pengelolaan Pesanan
            </h1>
            <p className="text-xs sm:text-sm text-[#4C567A] mt-1">
              Pantau tahapan sablon & konveksi, bayar termin (DP / Pelunasan), dan lacak resi kurir.
            </p>
          </div>

          <Link href="/">
            <Button className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs font-bold rounded-full h-10 px-5 gap-2 shadow-sm">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>+ Buat Desain Baru</span>
            </Button>
          </Link>
        </div>

        {/* 4 Summary Stats Cards (Clean White Surfaces & Subtle Borders) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-white rounded-2xl border border-[#E2E4E9] shadow-xs">
            <span className="text-xs text-[#4C567A] block font-medium">Total Pesanan</span>
            <span className="text-xl sm:text-2xl font-bold text-[#0F152E] mt-1 block">
              {orders.length}
            </span>
            <span className="text-[11px] text-[#4C567A] mt-0.5 block">Semua riwayat transaksi</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#C4C8D8] shadow-xs">
            <span className="text-xs text-[#1A2B56] font-semibold block">Perlu Pembayaran</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1A2B56] mt-1 block">
              {needActionCount}
            </span>
            <span className="text-[11px] text-[#4C567A] mt-0.5 block">Menunggu DP / Pelunasan</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#E2E4E9] shadow-xs">
            <span className="text-xs text-[#4C567A] block font-medium">Sedang Diproduksi</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1A2B56] mt-1 block">
              {processingCount}
            </span>
            <span className="text-[11px] text-[#4C567A] mt-0.5 block">Proses sablon & jahit</span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#E2E4E9] shadow-xs">
            <span className="text-xs text-[#4C567A] block font-medium">Dalam Pengiriman</span>
            <span className="text-xl sm:text-2xl font-bold text-[#1A2B56] mt-1 block">
              {shippedCount}
            </span>
            <span className="text-[11px] text-[#4C567A] mt-0.5 block">Kurir Biteship</span>
          </div>
        </div>

        {/* Filter Tabs & Search Controls */}
        <div className="bg-white rounded-2xl border border-[#E2E4E9] p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                activeTab === 'all'
                  ? 'bg-[#1A2B56] text-white shadow-xs'
                  : 'text-[#4C567A] hover:bg-[#F8F9FA]'
              }`}
            >
              Semua ({orders.length})
            </button>

            <button
              onClick={() => setActiveTab('need_action')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTab === 'need_action'
                  ? 'bg-[#1A2B56] text-white shadow-xs'
                  : 'text-[#1A2B56] hover:bg-[#F0F2F6]'
              }`}
            >
              <span>Perlu Bayar</span>
              {needActionCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'need_action' ? 'bg-white text-[#1A2B56]' : 'bg-[#4C567A] text-white'
                }`}>
                  {needActionCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('processing')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                activeTab === 'processing'
                  ? 'bg-[#1A2B56] text-white shadow-xs'
                  : 'text-[#4C567A] hover:bg-[#F8F9FA]'
              }`}
            >
              Diproduksi ({processingCount})
            </button>

            <button
              onClick={() => setActiveTab('shipped')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                activeTab === 'shipped'
                  ? 'bg-[#1A2B56] text-white shadow-xs'
                  : 'text-[#4C567A] hover:bg-[#F8F9FA]'
              }`}
            >
              Dikirim ({shippedCount})
            </button>

            <button
              onClick={() => setActiveTab('delivered')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                activeTab === 'delivered'
                  ? 'bg-[#1A2B56] text-white shadow-xs'
                  : 'text-[#4C567A] hover:bg-[#F8F9FA]'
              }`}
            >
              Selesai ({deliveredCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#4C567A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Order / Produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-full border border-[#E2E4E9] bg-[#FAFBFC] focus:bg-white focus:border-[#1A2B56] text-xs text-[#0F152E] outline-none transition"
            />
          </div>
        </div>

        {/* Orders List View */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-[#E2E4E9] p-12 text-center text-xs text-[#4C567A] shadow-xs">
            Memuat daftar pesanan Anda...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2E4E9] p-12 text-center shadow-xs">
            <ShoppingBag className="w-12 h-12 text-[#EDEDF2] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0F152E]">
              {searchQuery || activeTab !== 'all'
                ? 'Tidak Ada Pesanan yang Sesuai Filter'
                : 'Belum Ada Riwayat Pesanan'}
            </h3>
            <p className="text-xs text-[#4C567A] mt-1 max-w-sm mx-auto mb-6">
              Mulai buat apparel custom Anda menggunakan studio canvas kami dengan desain unik sesuka Anda.
            </p>
            <Link href="/">
              <Button className="bg-[#1A2B56] hover:bg-[#243B6B] text-white font-bold rounded-full text-xs px-6 py-2.5 shadow-sm">
                Mulai Desain di Katalog &rarr;
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const totalPcs = order.items.reduce((s, it) => s + (it.quantity || 0), 0)
              const firstItem = order.items[0]
              const isProcessing = processingOrderId === order.id

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#E2E4E9] shadow-xs hover:border-[#1A2B56]/50 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Card Header Strip */}
                  <div className="px-5 py-3.5 bg-[#F8F9FA] border-b border-[#EDEDF2] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs sm:text-sm text-[#0F152E]">
                        #{order.orderNumber}
                      </span>
                      {order.tenant && (
                        <span className="text-[11px] font-medium bg-blue-50 text-[#1A2B56] px-2.5 py-0.5 rounded-full border border-blue-200/60">
                          {order.tenant.name}
                        </span>
                      )}
                      <span className="text-xs text-[#4C567A] hidden sm:inline">
                        • {new Date(order.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div>{getStatusBadge(order.status)}</div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    {/* Item Information */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-[#F8F9FA] border border-[#EDEDF2] flex items-center justify-center shrink-0 text-2xl">
                        👕
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-sm sm:text-base text-[#0F152E]">
                          {firstItem?.productName || 'Custom Apparel'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#4C567A]">
                          <span className="font-semibold text-[#0F152E]">{totalPcs} pcs total</span>
                          {firstItem?.color && <span>• Warna: {firstItem.color}</span>}
                          {firstItem?.size && <span>• Ukuran: {firstItem.size}</span>}
                          {order.items.length > 1 && (
                            <span className="text-[11px] text-[#1A2B56] font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                              +{order.items.length - 1} variasi lainnya
                            </span>
                          )}
                        </div>

                        {/* Shipment Info (Resi) if Shipped */}
                        {order.shipment?.trackingNumber && (
                          <div className="pt-1 flex items-center gap-2">
                            <span className="text-xs text-[#1A2B56] font-medium flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-[#1A2B56]" />
                              {order.shipment.courierName}:{' '}
                              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#E2E4E9]">
                                {order.shipment.trackingNumber}
                              </span>
                            </span>
                            <button
                              onClick={() => copyToClipboard(order.shipment!.trackingNumber)}
                              className="text-[11px] text-[#1A2B56] hover:text-[#243B6B] transition flex items-center gap-1"
                              title="Salin Resi"
                            >
                              {copiedResi === order.shipment.trackingNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price & Payment Breakdown */}
                    <div className="border-t md:border-t-0 md:border-l border-[#EDEDF2] pt-4 md:pt-0 md:pl-5 md:text-right shrink-0">
                      <span className="text-xs text-[#4C567A] block">Total Biaya Pesanan:</span>
                      <span className="text-base sm:text-lg font-bold text-[#1A2B56] block">
                        Rp {order.totalAmount.toLocaleString('id-ID')}
                      </span>

                      {/* Termin Breakdown */}
                      <div className="mt-1 flex md:justify-end gap-1.5 text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            order.status !== 'pending'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8]'
                          }`}
                        >
                          DP 70%: {order.status !== 'pending' ? 'Lunas' : `Rp ${order.dpAmount.toLocaleString('id-ID')}`}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            order.status === 'ready'
                              ? 'bg-[#1A2B56] text-white shadow-xs font-bold'
                              : order.status === 'shipped' || order.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-neutral-50 text-neutral-500 border border-neutral-200'
                          }`}
                        >
                          Pelunasan 30%: {order.status === 'shipped' || order.status === 'delivered' ? 'Lunas' : `Rp ${order.finalAmount.toLocaleString('id-ID')}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer: ALL BUTTONS IN ASHIRA DEEP NAVY + WHITE TEXT */}
                  <div className="px-5 py-3.5 bg-[#FAFBFC] border-t border-[#EDEDF2] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrderForReorder(order)
                          setReorderModalOpen(true)
                        }}
                        className="text-xs font-bold text-[#1A2B56] hover:bg-blue-50/70 h-9 rounded-full px-4 gap-1.5 border border-[#E2E4E9]"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#1A2B56]" />
                        <span>Pesan Lagi</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Direct Action Button: Bayar DP jika pending (SESUAI GAMBAR USER: Ashira Navy + Teks Putih + Pill) */}
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handlePayDP(order.id)}
                          className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs font-bold h-9 rounded-full px-5 shadow-sm gap-2"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{isProcessing ? 'Memproses...' : 'Bayar DP Sekarang'}</span>
                        </Button>
                      )}

                      {/* Direct Action Button: Bayar Pelunasan jika ready (SESUAI GAMBAR USER: Ashira Navy + Teks Putih + Pill) */}
                      {order.status === 'ready' && (
                        <Button
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handlePayFinal(order.id)}
                          className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs font-bold h-9 rounded-full px-5 shadow-sm gap-2"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{isProcessing ? 'Memproses...' : 'Bayar Pelunasan 30%'}</span>
                        </Button>
                      )}

                      {/* Primary Navigation to Detail Tracker */}
                      <Link href={`/orders/${order.id}`}>
                        <Button
                          size="sm"
                          className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs font-bold h-9 rounded-full px-5 gap-1.5 shadow-sm"
                        >
                          <span>Lacak Status & Detail</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Quick Repeat Order Modal */}
      <QuickReorderModal
        order={selectedOrderForReorder}
        isOpen={reorderModalOpen}
        onClose={() => {
          setReorderModalOpen(false)
          setSelectedOrderForReorder(null)
        }}
      />
    </div>
  )
}
