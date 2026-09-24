'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import {
  ArrowLeft,
  Building2,
  Plus,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function SuperAdminClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [platformFee, setPlatformFee] = useState('5000')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const fetchClients = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/super-admin/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-'))
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError('')
    setFormSuccess('')

    try {
      const res = await fetch('/api/super-admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          phone,
          email,
          address,
          description,
          platformFeePerTransaction: Number(platformFee),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setFormSuccess(data.message)
        setName('')
        setSlug('')
        setPhone('')
        setEmail('')
        setAddress('')
        setDescription('')
        setTimeout(() => {
          setShowAddModal(false)
          fetchClients()
        }, 1200)
      } else {
        setFormError(data.error || 'Gagal mendaftarkan klien')
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/super-admin">
              <Button variant="outline" size="sm" className="rounded-xl h-9 border-slate-200 cursor-pointer">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Dashboard Super Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Manajemen Klien Konveksi</h1>
              <p className="text-xs text-slate-500">Kelola tenant konveksi/garmen yang terdaftar di AshiraTech</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchClients}
              className="text-xs h-9 rounded-xl border-slate-200 gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs h-9 rounded-full px-4 gap-1.5 cursor-pointer font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Tambah Klien Baru
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau slug konveksi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#1A2B56]"
            />
          </div>
          <span className="text-xs text-slate-500">{filteredClients.length} klien ditemukan</span>
        </div>

        {/* Client Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#1A2B56] transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A2B56] font-bold flex items-center justify-center text-sm border border-blue-200">
                    {client.name.charAt(0)}
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                    Aktif
                  </Badge>
                </div>

                <h3 className="font-bold text-sm text-slate-900">{client.name}</h3>
                <p className="font-mono text-xs text-slate-400">slug: {client.slug}</p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  {client.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {client.phone}
                    </p>
                  )}
                  {client.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {client.email}
                    </p>
                  )}
                  {client.address && (
                    <p className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {client.address}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  Fee: Rp {(client.settings?.platformFeePerTransaction || 5000).toLocaleString('id-ID')}/tx
                </span>
                <Link
                  href={`/store/${client.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  Buka Toko
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Tambah Klien Baru */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-base text-slate-900">Tambah Klien Konveksi Baru</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Brand / Konveksi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bandung Apparel Studio"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-[#1A2B56] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slug URL Toko</label>
                  <div className="flex items-center">
                    <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-2.5 py-2 text-slate-500 font-mono text-xs">
                      /store/
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="bandung-apparel"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-r-xl px-3 py-2 text-xs focus:border-[#1A2B56] focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="08123456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-[#1A2B56] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Klien</label>
                    <input
                      type="email"
                      placeholder="client@konveksi.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-[#1A2B56] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Warehouse / Workshop</label>
                  <input
                    type="text"
                    placeholder="Jl. Industri Garmen No. 12, Bandung"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-[#1A2B56] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tarif Platform Fee per Transaksi (Rp)</label>
                  <input
                    type="number"
                    value={platformFee}
                    onChange={(e) => setPlatformFee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-[#1A2B56] focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Default Rp 5.000 / transaksi order</p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-full h-9 text-xs border-slate-200 cursor-pointer px-4"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#1A2B56] hover:bg-[#243B6B] text-white rounded-full h-9 text-xs font-bold cursor-pointer px-5 shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        Mendaftarkan...
                      </>
                    ) : (
                      'Simpan Klien'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
