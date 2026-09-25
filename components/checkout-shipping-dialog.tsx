'use client'

import React, { useState, useEffect, useCallback, useId } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Truck,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building,
} from 'lucide-react'

export interface CourierRate {
  courierCode: string
  courierName: string
  courierServiceName: string
  courierServiceCode: string
  price: number
  estimatedDays: string
  description?: string
}

export interface ShippingAddressData {
  name: string
  phone: string
  street: string
  city: string
  postalCode: string
  province?: string
}

export interface CheckoutShippingDialogProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  totalQty: number
  category?: string
  subtotal: number
  designBlueprint?: any
  onProceedToPayment: (shippingData: {
    shippingAddress: ShippingAddressData
    courierCode: string
    courierName: string
    shippingCost: number
  }) => Promise<void>
}

export function CheckoutShippingDialog({
  isOpen,
  onClose,
  sessionId,
  totalQty,
  category = 'tshirts',
  subtotal,
  designBlueprint,
  onProceedToPayment,
}: CheckoutShippingDialogProps) {
  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')

  const [rates, setRates] = useState<CourierRate[]>([])
  const [selectedCourier, setSelectedCourier] = useState<CourierRate | null>(null)
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [ratesError, setRatesError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Pre-fill user profile / address if logged in
  useEffect(() => {
    if (isOpen) {
      fetch('/api/user/profile')
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.address) {
            const addr = data.address
            if (addr.receiverName && !receiverName) setReceiverName(addr.receiverName)
            if (addr.receiverPhone && !receiverPhone) setReceiverPhone(addr.receiverPhone)
            if (addr.street && !street) setStreet(addr.street)
            if (addr.city && !city) setCity(addr.city)
            if (addr.postalCode && !postalCode) {
              setPostalCode(addr.postalCode)
            }
          }
        })
        .catch(() => {
          // guest mode or unauthenticated, ignore error
        })
    }
  }, [isOpen])

  // Live fetch kurir when postal code has 5 digits
  const fetchRates = useCallback(
    async (code: string) => {
      if (code.length !== 5) return
      setIsLoadingRates(true)
      setRatesError(null)
      try {
        const res = await fetch('/api/shipping/rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinationPostalCode: code,
            quantity: totalQty,
            category,
          }),
        })

        if (!res.ok) {
          throw new Error('Gagal mengambil data ongkos kirim')
        }

        const data = await res.json()
        if (data.rates && data.rates.length > 0) {
          setRates(data.rates)
          // Default select the first courier
          setSelectedCourier(data.rates[0])
        } else {
          setRates([])
          setSelectedCourier(null)
          setRatesError('Tidak ada layanan kurir yang tersedia untuk kode pos ini.')
        }
      } catch (err) {
        console.error('[CheckoutShipping] Error fetching rates:', err)
        setRatesError('Gagal memuat tarif kurir. Periksa koneksi internet atau kode pos Anda.')
      } finally {
        setIsLoadingRates(false)
      }
    },
    [totalQty, category]
  )

  useEffect(() => {
    if (postalCode.trim().length === 5) {
      fetchRates(postalCode.trim())
    } else {
      setRates([])
      setSelectedCourier(null)
    }
  }, [postalCode, fetchRates])

  // 70:30 DP and Pelunasan Formula
  const dpGoodsAmount = Math.round(subtotal * 0.7)
  const shippingCost = selectedCourier ? selectedCourier.price : 0
  const totalDpAmount = dpGoodsAmount + shippingCost
  const finalAmount = subtotal - dpGoodsAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!receiverName.trim()) {
      setFormError('Nama penerima wajib diisi')
      return
    }
    if (!receiverPhone.trim() || receiverPhone.trim().length < 9) {
      setFormError('Nomor WhatsApp / telepon tidak valid')
      return
    }
    if (!street.trim()) {
      setFormError('Alamat jalan wajib diisi')
      return
    }
    if (!city.trim()) {
      setFormError('Kota tujuan wajib diisi')
      return
    }
    if (postalCode.trim().length !== 5) {
      setFormError('Kode pos harus berupa 5 digit angka')
      return
    }
    if (!selectedCourier) {
      setFormError('Silakan pilih salah satu layanan kurir pengiriman')
      return
    }

    setIsSubmitting(true)
    try {
      await onProceedToPayment({
        shippingAddress: {
          name: receiverName.trim(),
          phone: receiverPhone.trim(),
          street: street.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
        },
        courierCode: selectedCourier.courierCode,
        courierName: `${selectedCourier.courierName} - ${selectedCourier.courierServiceName}`,
        shippingCost,
      })
    } catch (err: any) {
      console.error('[CheckoutShipping] Submit payment failed:', err)
      setFormError(err?.message || 'Terjadi kesalahan saat memulai pembayaran')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 border border-neutral-200 bg-white shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="bg-[#1A2B56] text-white px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold mb-1">
            <Truck className="w-4 h-4" />
            <span>LANGKAH CHECKOUT 1 DARI 2</span>
          </div>
          <DialogTitle className="text-xl font-bold text-white tracking-tight">
            Alamat Pengiriman & Ekspedisi
          </DialogTitle>
          <DialogDescription className="text-blue-100 text-xs mt-1">
            Pesanan Anda diproduksi dengan standar konveksi Ashirah. Lengkapi tujuan kirim untuk kalkulasi DP 70% + Ongkir.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {formError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Form Alamat */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#1A2B56] uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#1A2B56]" />
              Data Penerima & Alamat
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nama Penerima *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A2B56]/20 focus:border-[#1A2B56]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nomor WhatsApp / Telepon *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A2B56]/20 focus:border-[#1A2B56]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Alamat Lengkap (Jalan, RT/RW, No. Rumah) *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Jl. Gatot Subroto No. 45, RT 02 / RW 04, Kel. Kuningan Barat"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A2B56]/20 focus:border-[#1A2B56]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Kota / Kabupaten *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jakarta Selatan"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A2B56]/20 focus:border-[#1A2B56]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Kode Pos (5 Digit) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="12430"
                    value={postalCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 5)
                      setPostalCode(val)
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A2B56]/20 focus:border-[#1A2B56]"
                  />
                  {isLoadingRates && (
                    <Loader2 className="w-4 h-4 absolute right-3 top-2.5 animate-spin text-[#1A2B56]" />
                  )}
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Ketik 5 digit kode pos untuk mengecek tarif kurir real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Opsi Kurir Ekspedisi */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#1A2B56] uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#1A2B56]" />
                Pilihan Kurir (Biteship Live)
              </h4>
              {postalCode.length === 5 && !isLoadingRates && rates.length > 0 && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tarif Tersedia
                </span>
              )}
            </div>

            {postalCode.length < 5 && (
              <div className="p-4 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl text-center text-xs text-neutral-500">
                Masukkan 5 digit kode pos tujuan untuk melihat daftar kurir dan ongkos kirim.
              </div>
            )}

            {isLoadingRates && (
              <div className="p-4 bg-neutral-50 rounded-xl flex items-center justify-center gap-2 text-xs text-[#1A2B56] font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-[#1A2B56]" />
                Menghubungi Biteship untuk mengambil tarif terbaik...
              </div>
            )}

            {ratesError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{ratesError}</span>
              </div>
            )}

            {rates.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {rates.map((rate) => {
                  const isSelected =
                    selectedCourier?.courierCode === rate.courierCode &&
                    selectedCourier?.courierServiceCode === rate.courierServiceCode

                  return (
                    <button
                      type="button"
                      key={`${rate.courierCode}-${rate.courierServiceCode}`}
                      onClick={() => setSelectedCourier(rate)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-[#1A2B56] bg-blue-50/60 ring-2 ring-[#1A2B56]/20'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#1A2B56] uppercase">
                          {rate.courierName}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#1A2B56]" />
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-600 line-clamp-1">
                        {rate.courierServiceName}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1">
                        Est: {rate.estimatedDays || '2-3 hari'}
                      </div>
                      <div className="text-xs font-bold text-[#1A2B56] mt-2">
                        Rp {rate.price.toLocaleString('id-ID')}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Rincian Tagihan 70:30 */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#1A2B56]">
              <span>Rincian Pembayaran (Skema Termin 70:30)</span>
              <Badge variant="outline" className="text-[10px] border-[#1A2B56]/30 text-[#1A2B56]">
                Garansi Sample
              </Badge>
            </div>

            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal Pakaian ({totalQty} pcs)</span>
                <span className="font-semibold text-neutral-900">
                  Rp {subtotal.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ongkos Kirim ({selectedCourier ? selectedCourier.courierName : 'Belum pilih'})</span>
                <span className="font-semibold text-neutral-900">
                  {selectedCourier ? `Rp ${shippingCost.toLocaleString('id-ID')}` : '-'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 space-y-1.5">
              <div className="flex justify-between items-center text-sm font-bold text-[#1A2B56]">
                <div className="flex flex-col">
                  <span>TOTAL DP 70% + ONGKIR</span>
                  <span className="text-[10px] font-normal text-neutral-500">
                    Wajib dibayar sekarang untuk mulai produksi
                  </span>
                </div>
                <span className="text-base text-[#1A2B56]">
                  Rp {totalDpAmount.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-neutral-500 pt-1">
                <span>Sisa Pelunasan 30% (Saat Baju Selesai)</span>
                <span className="font-semibold text-neutral-700">
                  Rp {finalAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Tombol Eksekusi Bayar */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
            >
              Kembali ke Studio
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !selectedCourier}
              className="gap-2 bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs font-bold h-11 px-6 rounded-full cursor-pointer shadow-md transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Menyiapkan Invoice Duitku...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Bayar DP Sekarang via Duitku →</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
