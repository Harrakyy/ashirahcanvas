'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import {
  ArrowLeft,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Transaction {
  id: string
  orderNumber: string
  tenantName: string
  customerName: string
  type: 'dp' | 'final'
  amount: number
  status: 'pending' | 'paid' | 'expired' | 'failed'
  duitkuReference: string
  platformFee: number
  paidAt: string | null
  createdAt: string
}

export default function SuperAdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/super-admin/transactions')
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || tx.type === typeFilter
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const totalPlatformFees = filtered
    .filter((tx) => tx.status === 'paid')
    .reduce((sum, tx) => sum + (tx.platformFee || 5000), 0)

  const totalVolume = filtered
    .filter((tx) => tx.status === 'paid')
    .reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/super-admin">
              <Button variant="outline" size="sm" className="rounded-full h-9 border-[#C4C8D8] text-[#1A2B56] cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Dashboard Super Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Buku Kas Transaksi Lintas Klien</h1>
              <p className="text-xs text-slate-500">
                Catatan seluruh tagihan DP & Pelunasan via Duitku serta perolehan platform fee
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactions}
            className="text-xs h-9 rounded-full border-[#C4C8D8] text-[#1A2B56] gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
        </div>

        {/* Summary banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-[#EDEDF2] rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              Total Platform Fee Terverifikasi:
            </span>
            <span className="text-2xl font-black text-[#1A2B56]">
              Rp {totalPlatformFees.toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Pendapatan AshiraTech dari transaksi terfilter
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              Total Nilai Transaksi Terverifikasi:
            </span>
            <span className="text-2xl font-black text-blue-700">
              Rp {totalVolume.toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Uang masuk dari customer ke konveksi
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari order, tenant, atau nama customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700"
            >
              <option value="all">Semua Jenis Tagihan</option>
              <option value="dp">Invoice DP (70%)</option>
              <option value="final">Invoice Pelunasan (30%)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700"
            >
              <option value="all">Semua Status</option>
              <option value="paid">Lunas (Paid)</option>
              <option value="pending">Menunggu (Pending)</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">No. Order</th>
                  <th className="py-3.5 px-4">Klien Konveksi</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Jenis Tagihan</th>
                  <th className="py-3.5 px-4">Nominal</th>
                  <th className="py-3.5 px-4">Fee Platform</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      Memuat transaksi...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      Tidak ada transaksi yang cocok.
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {tx.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {tx.tenantName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{tx.customerName}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold uppercase text-[11px]">
                          {tx.type === 'dp' ? 'DP (70%)' : 'Pelunasan (30%)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        Rp {tx.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1A2B56]">
                        Rp {(tx.platformFee || 5000).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            tx.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8]'
                          }`}
                        >
                          {tx.status === 'paid' ? 'LUNAS' : 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
