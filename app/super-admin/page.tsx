'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import { useAuth } from '@/hooks/useAuth'
import {
  Crown,
  Shield,
  Users,
  Settings,
  TrendingUp,
  Building2,
  DollarSign,
  Package,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SuperAdminAnalyticsChart } from '@/components/charts/superadmin-analytics-chart'

interface ClientStat {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  email: string
  isActive: boolean
  totalOrders: number
  gmv: number
  platformFeeEarned: number
  createdAt: string
}

export default function SuperAdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [clientStats, setClientStats] = useState<ClientStat[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/super-admin/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setClientStats(data.clientStats || [])
        setRecentOrders(data.recentOrders || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-white border border-[#E2E4E9] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#1A2B56] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-[#1A2B56]/20">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  AshiraTech Platform Management
                </h1>
                <Badge className="bg-[#F5F0F8] text-[#1A2B56] border-[#B697BD]/60 text-xs">
                  Super Admin
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Executive Overview • Pendapatan Platform Fee & Performa Seluruh Klien Konveksi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              className="text-xs h-9 rounded-full border-slate-200 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Link href="/super-admin/clients">
              <Button size="sm" className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs h-9 rounded-full px-4 gap-1.5 font-bold cursor-pointer shadow-xs">
                <PlusCircle className="w-3.5 h-3.5" />
                Kelola Klien ({clientStats.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Core Platform Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1A2B56] text-white rounded-2xl p-5 shadow-md shadow-[#1A2B56]/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-100">Platform Fee Earned</span>
              <DollarSign className="w-5 h-5 text-blue-200" />
            </div>
            <p className="text-2xl font-black">
              Rp {(stats?.totalPlatformFee || 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-blue-100 mt-1">
              Pendapatan bersih AshiraTech (Rp 5.000 / transaksi)
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Gross Merchandise Value (GMV)</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">
              Rp {(stats?.totalGmv || 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total nilai transaksi seluruh konveksi</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Klien Konveksi Terdaftar</span>
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">
              {stats?.totalClients || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Tenant aktif menggunakan SaaS</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Total Pesanan Diproses</span>
              <Package className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">
              {stats?.totalOrders || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Order dari seluruh customer</p>
          </div>
        </div>

        {/* GMV vs Platform Fee Chart */}
        <SuperAdminAnalyticsChart clientStats={clientStats} />

        {/* Quick Links Menu */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/super-admin/clients"
            className="bg-white border border-slate-200 hover:border-[#1A2B56] p-4 rounded-2xl shadow-xs transition group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A2B56] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#1A2B56]">Manajemen Klien</h3>
                <p className="text-[11px] text-slate-500">Daftarkan & kelola konveksi</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/super-admin/transactions"
            className="bg-white border border-slate-200 hover:border-blue-500 p-4 rounded-2xl shadow-xs transition group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Buku Kas Transaksi</h3>
                <p className="text-[11px] text-slate-500">Rekap pembayaran & fee</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/super-admin/settings"
            className="bg-white border border-slate-200 hover:border-indigo-500 p-4 rounded-2xl shadow-xs transition group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">Pengaturan Platform</h3>
                <p className="text-[11px] text-slate-500">Tarif fixed fee & payment gateway</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Client Performance Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Performa Klien Konveksi AshiraTech</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring transaksi, revenue GMV, dan fee platform yang dihasilkan tiap klien
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Nama Konveksi (Klien)</th>
                  <th className="py-3.5 px-4">Kontak / Kota</th>
                  <th className="py-3.5 px-4 text-center">Jumlah Pesanan</th>
                  <th className="py-3.5 px-4">Gross Merchandise Value (GMV)</th>
                  <th className="py-3.5 px-4">Fee AshiraTech (Rp 5.000/tx)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Tautan Toko</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientStats.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">{client.name}</span>
                      <span className="block text-[11px] font-mono text-slate-400">/{client.slug}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span>{client.phone || client.email || '-'}</span>
                      <span className="block text-[11px] text-slate-400 truncate max-w-xs">{client.address}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {client.totalOrders} order
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      Rp {client.gmv.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#1A2B56]">
                      Rp {client.platformFeeEarned.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          client.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {client.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/store/${client.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 font-semibold"
                      >
                        Buka Toko
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
