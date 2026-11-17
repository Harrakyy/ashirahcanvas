'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import {
  ArrowLeft,
  Building2,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const LOGO_PRESETS = [
  {
    name: 'Ashira Minimalist Monogram',
    url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Apparel Studio Vector',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Garment Badge Modern',
    url: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?w=300&auto=format&fit=crop&q=80',
  },
]

export default function AdminProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [bankName, setBankName] = useState('BCA')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')

  // Logo image test preview status
  const [previewError, setPreviewError] = useState(false)

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/profile')
      if (res.ok) {
        const data = await res.json()
        const t = data.tenant
        if (t) {
          setName(t.name || '')
          setSlug(t.slug || '')
          setLogoUrl(t.logoUrl || '')
          setAddress(t.address || '')
          setPhone(t.phone || '')
          setEmail(t.email || '')
          setDescription(t.settings?.description || '')
          setContactWhatsapp(t.settings?.contactWhatsapp || '')
          if (t.settings?.bankAccount) {
            setBankName(t.settings.bankAccount.bankName || 'BCA')
            setAccountNumber(t.settings.bankAccount.accountNumber || '')
            setAccountHolder(t.settings.bankAccount.accountHolder || '')
          }
        }
      } else {
        setFeedback({ type: 'error', message: 'Gagal memuat profil konveksi' })
      }
    } catch (err) {
      console.error(err)
      setFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          logoUrl,
          address,
          phone,
          email,
          contactWhatsapp,
          description,
          bankAccount: {
            bankName,
            accountNumber,
            accountHolder,
          },
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: 'Profil usaha dan logo berhasil disimpan. Fitur cetak invoice resmi sekarang aktif!',
        })
      } else {
        setFeedback({ type: 'error', message: data.error || 'Gagal menyimpan profil' })
      }
    } catch (err) {
      console.error(err)
      setFeedback({ type: 'error', message: 'Gagal menghubungi server' })
    } finally {
      setIsSaving(false)
    }
  }

  const hasValidLogo = Boolean(logoUrl && logoUrl.trim().length > 0 && !previewError)

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-20 px-4 md:px-8 max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 border-slate-200 cursor-pointer bg-white hover:bg-slate-100 text-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Kembali ke Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>Profil Usaha & Identitas Invoice</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#1A2B56] text-white">
                  Ashira Client
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Atur logo resmi, kontak, dan rekening bank konveksi untuk kop surat dokumen invoice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasValidLogo ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1.5 py-1 px-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Invoice Resmi Siap Dicetak
              </Badge>
            ) : (
              <Badge className="bg-[#F0F2F6] text-[#1A2B56] border border-[#C4C8D8] gap-1.5 py-1 px-3">
                <AlertTriangle className="w-3.5 h-3.5 text-[#4C567A]" />
                Wajib Isi Logo Usaha
              </Badge>
            )}
          </div>
        </div>

        {/* Gate Requirement Alert Banner */}
        {!hasValidLogo && (
          <div className="p-4 rounded-2xl bg-[#F0F2F6] border border-[#C4C8D8] text-[#1A2B56] text-xs flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-[#4C567A] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-[#0F152E]">Persyaratan Cetak Invoice Resmi (Logo Gate)</p>
              <p className="text-[#4C567A] leading-relaxed">
                Untuk menjaga profesionalisme dan standar mutu konveksi, sistem mewajibkan setiap mitra konveksi
                mendaftarkan <strong>Logo Usaha</strong> sebelum dokumen tagihan invoice PDF dapat dicetak. Invoice yang
                diterbitkan akan menggunakan format hitam-putih formal dengan logo resmi usaha Anda.
              </p>
            </div>
          </div>
        )}

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center gap-2.5 shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-[#1A2B56] mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Memuat profil konveksi...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* 1. SEKSI LOGO USAHA (FOKUS UTAMA) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D102A] text-white flex items-center justify-center font-bold shadow-xs">
                    <ImageIcon className="w-5 h-5 text-[#C7A9D0]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Logo Usaha Konveksi</span>
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                        Wajib untuk Invoice
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Logo ini akan tercetak pada kop surat invoice resmi hitam-putih pesanan customer
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Form Input Logo URL */}
                <div className="lg:col-span-8 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      URL Gambar Logo (Direct PNG / JPG / SVG)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://example.com/logo-konveksi.png"
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value)
                        setPreviewError(false)
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:border-[#1A2B56] focus:bg-white focus:outline-hidden transition-all"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Gunakan tautan gambar langsung dari Imgur, Unsplash, Google Drive, atau hosting publik lainnya.
                    </p>
                  </div>

                  {/* Preset Quick Chooser */}
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                      Pilihan Cepat Sample Logo (Untuk Uji Coba Langsung):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {LOGO_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setLogoUrl(preset.url)
                            setPreviewError(false)
                          }}
                          className="text-[11px] px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-[#1A2B56] text-slate-700 font-medium transition-all cursor-pointer"
                        >
                          + {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Logo Preview Box */}
                <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Preview Kop Invoice
                  </span>
                  <div className="w-36 h-28 bg-white border border-slate-200 rounded-lg flex items-center justify-center overflow-hidden shadow-xs relative p-2">
                    {logoUrl && !previewError ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logoUrl}
                        alt="Logo Usaha"
                        className="max-h-full max-w-full object-contain filter grayscale contrast-125"
                        onError={() => setPreviewError(true)}
                      />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400 block">
                          {previewError ? 'Gambar gagal dimuat' : 'Belum ada logo'}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2">
                    (Ditampilkan dalam kontras hitam-putih formal pada invoice)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. IDENTITAS RESMI USAHA */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5 text-[#1A2B56]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Informasi Perusahaan / Konveksi</h2>
                  <p className="text-xs text-slate-500">Nama resmi dan alamat workshop yang tercantum pada invoice</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Usaha / Konveksi</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium focus:border-[#1A2B56] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slug Domain Toko (/store/slug)</label>
                  <input
                    type="text"
                    disabled
                    value={slug}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alamat Workshop / Pengiriman Pesanan
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jl. Raya Konveksi No. 12, Kel. Pasir Kaliki, Bandung..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#1A2B56] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon Kantor</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="022-7788990 atau 0812-xxx"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#1A2B56] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp Customer Service</label>
                  <input
                    type="text"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    placeholder="+62 812-xxxx-xxxx"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#1A2B56] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Email Resmi Usaha</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@konveksianda.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#1A2B56] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 3. REKENING BANK PEMBAYARAN */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5 text-[#1A2B56]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Rekening Penerimaan Pelunasan</h2>
                  <p className="text-xs text-slate-500">
                    Instruksi nomor rekening bank yang dicantumkan pada invoice untuk pembayaran transfer manual
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="BCA / Mandiri / BRI / BNI"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold focus:border-[#1A2B56] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-mono font-bold focus:border-[#1A2B56] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Atas Nama Pemilik</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="PT / Nama Konveksi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-medium focus:border-[#1A2B56] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="flex items-center justify-between pt-2">
              <Link href="/admin">
                <Button variant="ghost" type="button" className="text-xs text-slate-500 cursor-pointer">
                  Batal
                </Button>
              </Link>

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#0D102A] hover:bg-[#1A2B56] text-white font-semibold text-xs px-6 py-2.5 rounded-xl gap-2 cursor-pointer shadow-md transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Menyimpan Profil...' : 'Simpan Profil & Aktifkan Invoice'}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
