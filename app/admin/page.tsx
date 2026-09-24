'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import { useAuth } from '@/hooks/useAuth'
import {
  Shield,
  Clock,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Truck,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Download,
  Users,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminAnalyticsChart } from '@/components/charts/admin-analytics-chart'

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
  status: 'pending' | 'paid' | 'expired' | 'failed'
  amount: number
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
  customer?: {
    name: string
    email: string
    phone?: string
  }
  items: OrderItem[]
  payments: PaymentItem[]
  shipment?: {
    courierCode?: string
    courierName?: string
    trackingNumber?: string
    status?: string
  }
}

export default function AdminDashboardPage() {
  const { role } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [tenantLogo, setTenantLogo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const [orderRes, profileRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/admin/profile'),
      ])
      if (orderRes.ok) {
        const data = await orderRes.json()
        setOrders(data.orders || [])
      }
      if (profileRes.ok) {
        const pData = await profileRes.json()
        setTenantLogo(pData.tenant?.logoUrl || null)
      }
    } catch (err) {
      console.error('Failed to load orders or profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Calculate metrics
  const totalOrders = orders.length
  const pendingDp = orders.filter((o) => o.status === 'pending').length
  const inProduction = orders.filter((o) => o.status === 'dp_paid' || o.status === 'processing').length
  const readyToShip = orders.filter((o) => o.status === 'ready').length
  const shipped = orders.filter((o) => o.status === 'shipped').length
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => {
      // Sum actual paid payments
      const paid = o.payments
        .filter((p) => p.status === 'paid')
        .reduce((pSum, p) => pSum + p.amount, 0)
      return sum + (paid > 0 ? paid : 0)
    }, 0)

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer?.name && o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const exportToCSV = () => {
    if (orders.length === 0) {
      alert('Tidak ada data pesanan untuk diekspor.')
      return
    }

    const headers = [
      'No. Pesanan',
      'Tanggal',
      'Customer',
      'Email',
      'No. Telepon / WA',
      'Detail Produk',
      'Total Qty (Pcs)',
      'Subtotal (Rp)',
      'Ongkir (Rp)',
      'Total Tagihan (Rp)',
      'DP 70% (Rp)',
      'Pelunasan 30% (Rp)',
      'Status Pesanan',
      'Status DP',
      'Status Pelunasan',
      'Kurir',
      'No. Resi',
    ]

    const listToExport = filteredOrders.length > 0 ? filteredOrders : orders

    const rows = listToExport.map((o) => {
      const dpPayment = o.payments?.find((p) => p.type === 'dp')
      const finalPayment = o.payments?.find((p) => p.type === 'final')
      const totalPcs = o.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0
      const itemsSummary = o.items
        ?.map((it) => `${it.productName} (${it.color}, ${it.size} x${it.quantity})`)
        .join('; ') || '-'

      const dateStr = new Date(o.createdAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

      return [
        `"${o.orderNumber}"`,
        `"${dateStr}"`,
        `"${(o.customer?.name || '-').replace(/"/g, '""')}"`,
        `"${(o.customer?.email || '-').replace(/"/g, '""')}"`,
        `"${(o.customer?.phone || '-').replace(/"/g, '""')}"`,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        totalPcs,
        o.subtotal || 0,
        o.shippingCost || 0,
        o.totalAmount || 0,
        o.dpAmount || 0,
        o.finalAmount || 0,
        `"${o.status}"`,
        `"${dpPayment?.status || 'pending'}"`,
        `"${finalPayment?.status || 'pending'}"`,
        `"${(o.shipment?.courierName || '-').replace(/"/g, '""')}"`,
        `"${(o.shipment?.trackingNumber || '-').replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `pesanan-konveksi-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8]">Menunggu DP (70%)</Badge>
      case 'dp_paid':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">DP Lunas • Antrian</Badge>
      case 'processing':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Sedang Diproduksi</Badge>
      case 'ready':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Siap Dikirim (Tagih 30%)</Badge>
      case 'shipped':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Dalam Pengiriman</Badge>
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Pesanan Selesai</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Dibatalkan</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#0D102A] text-white flex items-center justify-center font-bold text-xl shadow-md">
              <Shield className="w-7 h-7 text-[#C7A9D0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Dashboard Manajemen Konveksi
                </h1>
                <Badge className="bg-[#0D102A] text-white border-none text-xs">
                  {role === 'super_admin' ? 'Super Admin Mode' : 'Admin Konveksi'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kelola pesanan custom sablon, blueprint produksi, konfirmasi pembayaran DP 70:30, dan faktur invoice resmi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              className="text-xs h-9 rounded-xl border-slate-200 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Link href="/admin/profile">
              <Button
                variant="outline"
                size="sm"
                className={`text-xs h-9 rounded-full gap-1.5 cursor-pointer border ${
                  !tenantLogo ? 'border-[#C4C8D8] bg-[#F0F2F6] text-[#1A2B56] hover:bg-slate-100' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${!tenantLogo ? 'text-[#1A2B56]' : 'text-[#1A2B56]'}`} />
                <span>Profil & Logo</span>
                {!tenantLogo && (
                  <span className="w-2 h-2 rounded-full bg-[#1A2B56] animate-pulse" />
                )}
              </Button>
            </Link>
            <Link href="/admin/customers">
              <Button variant="outline" size="sm" className="text-xs h-9 rounded-full border-slate-200 gap-1.5 cursor-pointer font-semibold">
                <Users className="w-3.5 h-3.5 text-[#1A2B56]" />
                Data Pelanggan
              </Button>
            </Link>
            <Link href="/admin/products">
              <Button variant="outline" size="sm" className="text-xs h-9 rounded-full border-slate-200 gap-1.5 cursor-pointer font-semibold">
                <Package className="w-3.5 h-3.5 text-[#1A2B56]" />
                Katalog Produk
              </Button>
            </Link>
            <Link href="/admin/orders">
              <Button size="sm" className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs h-9 rounded-full px-4 gap-1.5 cursor-pointer font-bold shadow-xs">
                Semua Pesanan ({totalOrders})
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Missing Logo Banner (Logo Gate Prompt) */}
        {!tenantLogo && !isLoading && (
          <div className="p-4 rounded-2xl bg-[#F0F2F6] border border-[#C4C8D8] text-[#1A2B56] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-[#4C567A] shrink-0" />
              <div>
                <p className="font-bold text-[#0F152E]">Logo Konveksi Belum Terdaftar</p>
                <p className="text-[#4C567A]">
                  Untuk mengaktifkan fitur cetak invoice resmi hitam-putih untuk pesanan pelanggan, silakan lengkapi logo usaha Anda.
                </p>
              </div>
            </div>
            <Link href="/admin/profile" className="shrink-0">
              <Button size="sm" className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs rounded-full px-5 font-bold gap-1.5 cursor-pointer shadow-xs">
                <Building2 className="w-3.5 h-3.5" />
                Atur Logo Usaha Sekarang
              </Button>
            </Link>
          </div>
        )}

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Menunggu DP</span>
              <Clock className="w-4 h-4 text-[#4C567A]" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{pendingDp}</p>
            <p className="text-[11px] text-[#4C567A] mt-1">Invoice 70% dikirim</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Antrian & Produksi</span>
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{inProduction}</p>
            <p className="text-[11px] text-blue-600 mt-1">DP telah diterima</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Siap Dikirim</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{readyToShip}</p>
            <p className="text-[11px] text-emerald-600 mt-1">Tagih Pelunasan 30%</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Pengiriman Aktif</span>
              <Truck className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{shipped}</p>
            <p className="text-[11px] text-purple-600 mt-1">Kurir dalam rute</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Realisasi Dana Masuk</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-extrabold text-blue-700">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total DP & Pelunasan</p>
          </div>
        </div>

        {/* Interactive Analytics Chart */}
        <AdminAnalyticsChart orders={orders} />

        {/* Live Orders Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Kelola Pesanan Masuk</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau status pesanan, blueprint produksi mesin sablon, dan update proses
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari no. order / nama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 w-44 md:w-56"
                />
              </div>

              {/* Status filter tabs */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-600"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu DP (70%)</option>
                <option value="dp_paid">DP Lunas</option>
                <option value="processing">Sedang Diproduksi</option>
                <option value="ready">Siap Dikirim</option>
                <option value="shipped">Sedang Dikirim</option>
                <option value="delivered">Selesai</option>
              </select>

              {/* Export CSV Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="text-xs h-8 rounded-xl border-slate-200 gap-1.5 cursor-pointer bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-slate-500">
                Memuat data pesanan konveksi...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Belum ada pesanan ditemukan</p>
                <p className="text-xs text-slate-500 mt-1">
                  Pesanan yang dibuat oleh customer di canvas editor akan otomatis muncul di sini.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">No. Order</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Item & Qty</th>
                    <th className="py-3.5 px-4">Total & DP</th>
                    <th className="py-3.5 px-4">Status Pesanan</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const totalQty = order.items.reduce((s, it) => s + it.quantity, 0)
                    const dpPaid = order.payments.some((p) => p.type === 'dp' && p.status === 'paid')
                    const finalPaid = order.payments.some((p) => p.type === 'final' && p.status === 'paid')

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">{order.customer?.name || 'Customer'}</span>
                          <span className="block text-[11px] text-slate-500">{order.customer?.phone || order.customer?.email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-700">{order.items[0]?.productName || 'Custom Apparel'}</span>
                          <span className="block text-[11px] text-slate-500">
                            {totalQty} pcs ({order.items[0]?.color}, {order.items[0]?.size})
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900">
                            Rp {order.totalAmount.toLocaleString('id-ID')}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                dpPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8]'
                              }`}
                            >
                              DP: {dpPaid ? 'Lunas ✅' : 'Belum ⏳'}
                            </span>
                            {order.status === 'ready' && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  finalPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                30%: {finalPaid ? 'Lunas ✅' : 'Tagih'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 rounded-lg border-slate-200 hover:border-blue-600 hover:text-blue-700 gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Kelola & Blueprint
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
