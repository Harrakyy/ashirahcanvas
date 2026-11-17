'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import {
  ArrowLeft,
  Settings,
  DollarSign,
  CreditCard,
  Truck,
  CheckCircle2,
  Shield,
  Save,
  Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function SuperAdminSettingsPage() {
  const [platformFee, setPlatformFee] = useState('5000')
  const [duitkuEnv, setDuitkuEnv] = useState('sandbox')
  const [biteshipEnv, setBiteshipEnv] = useState('production')
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-20 px-4 md:px-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/super-admin">
            <Button variant="outline" size="sm" className="rounded-xl h-9 border-slate-200 cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Dashboard Super Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pengaturan Platform AshiraTech</h1>
            <p className="text-xs text-slate-500">Konfigurasi tarif platform fee dan integrasi SaaS</p>
          </div>
        </div>

        {isSaved && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Pengaturan platform berhasil disimpan!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Platform Revenue Fee Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A2B56] flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Tarif Platform Fee AshiraTech</h2>
                <p className="text-xs text-slate-500">
                  Fixed fee yang dikenakan pada setiap pesanan klien yang berhasil lunas
                </p>
              </div>
            </div>

            <div className="max-w-xs space-y-1.5 text-xs">
              <label className="block font-semibold text-slate-700">Fee per Transaksi (IDR)</label>
              <div className="flex items-center">
                <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 py-2 text-slate-600 rounded-l-xl font-semibold">
                  Rp
                </span>
                <input
                  type="number"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-r-xl px-3 py-2 text-xs focus:border-[#1A2B56] focus:outline-hidden font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-400">Default: Rp 5.000 per transaksi pesanan apparel.</p>
            </div>
          </div>

          {/* Duitku Gateway Configuration */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Payment Gateway Duitku</h2>
                <p className="text-xs text-slate-500">Koneksi gateway pembayaran untuk split payment 70:30</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mode Environment</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="duitkuEnv"
                      value="sandbox"
                      checked={duitkuEnv === 'sandbox'}
                      onChange={() => setDuitkuEnv('sandbox')}
                    />
                    <span>Sandbox (Uji Coba)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="duitkuEnv"
                      value="production"
                      checked={duitkuEnv === 'production'}
                      onChange={() => setDuitkuEnv('production')}
                    />
                    <span>Production (Live)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Merchant Code</label>
                  <input
                    type="text"
                    readOnly
                    value="D12345 (Configured via .env)"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">API Key Signature</label>
                  <input
                    type="password"
                    readOnly
                    value="********************************"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Biteship Configuration */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Logistik & Ekspedisi Biteship</h2>
                <p className="text-xs text-slate-500">Kalkulasi ongkir real-time dan dispatch pengiriman</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mode Layanan</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="biteshipEnv"
                      value="stub"
                      checked={biteshipEnv === 'stub'}
                      onChange={() => setBiteshipEnv('stub')}
                    />
                    <span>Stub Simulation (Tanpa Akun)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="biteshipEnv"
                      value="production"
                      checked={biteshipEnv === 'production'}
                      onChange={() => setBiteshipEnv('production')}
                    />
                    <span>Live Biteship API</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-[#1A2B56] hover:bg-[#243B6B] text-white font-bold text-xs px-6 py-2.5 rounded-full gap-2 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              Simpan Pengaturan
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
