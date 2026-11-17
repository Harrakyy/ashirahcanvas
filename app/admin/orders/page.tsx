'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import {
  Package,
  ArrowLeft,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
  items: Array<{
    id: string
    productName: string
    color: string
    size: string
    quantity: number
    unitPrice: number
  }>
  payments: Array<{
    id: string
    type: 'dp' | 'final'
    status: 'pending' | 'paid' | 'expired' | 'failed'
    amount: number
  }>
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer?.name && o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-[#F0F2F6] text-[#1A2B56] border-[#C4C8D8]">Menunggu DP</Badge>
      case 'dp_paid':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">DP Lunas</Badge>
      case 'processing':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Sedang Diproduksi</Badge>
      case 'ready':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Siap Dikirim</Badge>
      case 'shipped':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Dalam Pengiriman</Badge>
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Selesai</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Dibatalkan</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="rounded-full h-9 border-[#C4C8D8] text-[#1A2B56] cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Daftar Semua Pesanan</h1>
              <p className="text-xs text-slate-500">Total {orders.length} pesanan terdaftar</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/products">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 rounded-full border-[#C4C8D8] text-[#1A2B56] gap-1.5 cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-[#1A2B56]" />
                Katalog Produk
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              className="text-xs h-9 rounded-full border-[#C4C8D8] text-[#1A2B56] gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nomor order atau nama pemesan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'pending', label: 'Menunggu DP' },
              { id: 'dp_paid', label: 'DP Lunas' },
              { id: 'processing', label: 'Produksi' },
              { id: 'ready', label: 'Siap Kirim' },
              { id: 'shipped', label: 'Dikirim' },
              { id: 'delivered', label: 'Selesai' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-500">Memuat pesanan...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada pesanan yang sesuai</p>
              <p className="text-xs text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">No. Order</th>
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Item & Warna</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const totalQty = order.items.reduce((s, it) => s + it.quantity, 0)
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">{order.customer?.name}</span>
                          <span className="block text-[11px] text-slate-500">{order.customer?.email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-700">
                            {order.items[0]?.productName || 'Custom'} ({totalQty} pcs)
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            Warna: {order.items[0]?.color} | Ukuran: {order.items[0]?.size}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          Rp {order.totalAmount.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(order.status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-bold h-8 rounded-full border-[#C4C8D8] hover:bg-[#1A2B56] hover:text-white text-[#1A2B56] gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Kelola
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
