'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import {
  Users,
  ArrowLeft,
  Search,
  RefreshCw,
  Phone,
  Mail,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Clock,
  TrendingUp,
  X,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface CustomerOrder {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  itemCount: number
}

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  createdAt: string
  totalOrders: number
  totalSpent: number
  lastOrderDate: string
  lastOrderStatus: string
  orders: CustomerOrder[]
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'with_orders' | 'no_orders'>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/customers')
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers || [])
      }
    } catch (err) {
      console.error('Failed to load customers:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm))

    if (!matchesSearch) return false

    if (filterType === 'with_orders') return c.totalOrders > 0
    if (filterType === 'no_orders') return c.totalOrders === 0
    return true
  })

  // Metrics
  const totalCustomers = customers.length
  const activeCustomers = customers.filter((c) => c.totalOrders > 0).length
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-[#F0F2F6] text-[#1A2B56] border-[#C4C8D8] text-[10px]">Menunggu DP</Badge>
      case 'dp_paid':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">DP Lunas</Badge>
      case 'processing':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">Produksi</Badge>
      case 'sample_review':
        return <Badge className="bg-[#F5F0F8] text-[#1A2B56] border-[#B697BD] text-[10px]">Review Sample</Badge>
      case 'ready':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Siap Dikirim</Badge>
      case 'shipped':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">Dikirim</Badge>
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">Selesai</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Batal</Badge>
      default:
        return <Badge className="text-[10px]">{status}</Badge>
    }
  }

  const formatWaLink = (phone: string | null) => {
    if (!phone) return null
    const cleaned = phone.replace(/\D/g, '')
    const formatted = cleaned.startsWith('0') ? '62' + cleaned.slice(1) : cleaned
    return `https://wa.me/${formatted}`
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="rounded-xl h-9 border-slate-200 cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Kembali
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Database Pelanggan</h1>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  CRM Konveksi
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola data pelanggan, kontak WhatsApp, dan riwayat pesanan apparel custom.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchCustomers}
            className="text-xs h-9 rounded-full border-[#C4C8D8] text-[#1A2B56] gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Total Pelanggan</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{totalCustomers}</p>
            <p className="text-[11px] text-slate-500 mt-1">Akun terdaftar di konveksi Anda</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Pelanggan Aktif</span>
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{activeCustomers}</p>
            <p className="text-[11px] text-emerald-600 mt-1">Pernah melakukan order</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Akumulasi Belanja</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-extrabold text-blue-700">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total pembayaran yang telah diterima</p>
          </div>
        </div>

        {/* Filter & Table Container */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Pelanggan ({filteredCustomers.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cari pelanggan untuk follow-up status produksi atau repeat order melalui WhatsApp
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, email, no. WA..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 w-52 md:w-64"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-hidden focus:border-blue-600"
              >
                <option value="all">Semua Pelanggan</option>
                <option value="with_orders">Pernah Order</option>
                <option value="no_orders">Belum Pernah Order</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-slate-500">
                Memuat basis data pelanggan...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Tidak ada pelanggan yang cocok</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Kontak</th>
                    <th className="py-3 px-4 text-center">Total Order</th>
                    <th className="py-3 px-4 text-right">Total Belanja</th>
                    <th className="py-3 px-4">Pesanan Terakhir</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => {
                    const waLink = formatWaLink(c.phone)
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{c.name}</p>
                              <p className="text-[11px] text-slate-400">
                                Gabung {new Date(c.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">{c.email}</span>
                          </div>
                          {c.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="font-mono text-[11px]">{c.phone}</span>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded font-semibold ml-1 inline-flex items-center gap-0.5"
                                >
                                  WA
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No. WA belum ada</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-sm text-slate-900">{c.totalOrders}</span>
                          <span className="text-[10px] text-slate-400 block">pesanan</span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-slate-900">
                            Rp {c.totalSpent.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-emerald-600 block">terverifikasi</span>
                        </td>

                        <td className="py-3.5 px-4">
                          {c.lastOrderDate !== '-' ? (
                            <div>
                              <p className="text-slate-800 font-medium">
                                {new Date(c.lastOrderDate).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <div className="mt-0.5">{getStatusBadge(c.lastOrderStatus)}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Belum pernah</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCustomer(c)}
                            className="h-8 text-xs rounded-xl border-slate-200 hover:bg-blue-50 hover:text-blue-700 gap-1 cursor-pointer"
                          >
                            Riwayat ({c.orders.length})
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Customer Detail Drawer / Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{selectedCustomer.name}</h3>
                    <p className="text-xs text-slate-500">{selectedCustomer.email} • {selectedCustomer.phone || 'Tanpa telepon'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block">Total Orderan:</span>
                    <span className="font-bold text-sm text-slate-800">{selectedCustomer.totalOrders} Transaksi</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Belanja Realisasi:</span>
                    <span className="font-bold text-sm text-emerald-700">Rp {selectedCustomer.totalSpent.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pt-2">
                  Daftar Pesanan ({selectedCustomer.orders.length})
                </h4>

                {selectedCustomer.orders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada riwayat pesanan dari pelanggan ini.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedCustomer.orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-blue-200 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">{ord.orderNumber}</span>
                            {getStatusBadge(ord.status)}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {ord.itemCount} Pcs • {new Date(ord.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-xs text-blue-700">
                            Rp {ord.totalAmount.toLocaleString('id-ID')}
                          </span>
                          <Link href={`/admin/orders/${ord.id}`}>
                            <Button size="sm" className="h-7 px-3 text-[11px] font-bold bg-[#1A2B56] hover:bg-[#243B6B] text-white rounded-full cursor-pointer">
                              Buka
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                {formatWaLink(selectedCustomer.phone) ? (
                  <a
                    href={formatWaLink(selectedCustomer.phone)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-full font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Hubungi via WhatsApp
                  </a>
                ) : (
                  <div />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs h-8 rounded-full border-[#C4C8D8] text-[#1A2B56] cursor-pointer"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
