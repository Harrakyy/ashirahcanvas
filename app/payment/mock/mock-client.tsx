'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheck, CreditCard, ArrowRight, XCircle, CheckCircle2, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function DuitkuMockContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const orderId = searchParams.get('orderId') || 'ASH-MOCK-001'
  const amountStr = searchParams.get('amount') || '0'
  const reference = searchParams.get('reference') || 'REF-12345'
  const amount = parseInt(amountStr, 10) || 0

  const [isLoading, setIsLoading] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('bca_va')

  const handleSimulateSuccess = async () => {
    setIsLoading(true)

    try {
      // Trigger local webhook simulation
      await fetch('/api/webhook/duitku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantOrderId: orderId,
          amount: amount,
          resultCode: '00',
          reference: reference,
          merchantCode: 'D12345',
        }),
      })
    } catch (e) {
      console.warn('Webhook simulation ping error:', e)
    } finally {
      setTimeout(() => {
        router.push(`/payment/success?order_id=${encodeURIComponent(orderId)}`)
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
                D
              </div>
              <span className="font-bold text-base tracking-tight">Duitku Payment</span>
            </div>
            <span className="text-[11px] font-semibold bg-white/20 text-white border border-white/30 px-2.5 py-0.5 rounded-full">
              Sandbox Test Mode
            </span>
          </div>
          <p className="text-xs text-blue-100">Simulasi Pembayaran Transaksi Aman</p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5">
              <span>Merchant Order ID:</span>
              <span className="font-mono font-medium text-slate-800">{orderId}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5">
              <span>No. Referensi:</span>
              <span className="font-mono text-slate-600">{reference}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-800">Total Tagihan:</span>
              <span className="text-lg font-extrabold text-blue-700">
                Rp {amount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Pilih Metode Pembayaran (Simulasi)
            </label>
            <div className="space-y-2 text-xs">
              <label
                onClick={() => setSelectedMethod('bca_va')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  selectedMethod === 'bca_va'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>BCA Virtual Account</span>
                </div>
                <input
                  type="radio"
                  name="method"
                  checked={selectedMethod === 'bca_va'}
                  onChange={() => {}}
                  className="text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label
                onClick={() => setSelectedMethod('mandiri_va')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  selectedMethod === 'mandiri_va'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Mandiri Bill Payment</span>
                </div>
                <input
                  type="radio"
                  name="method"
                  checked={selectedMethod === 'mandiri_va'}
                  onChange={() => {}}
                  className="text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label
                onClick={() => setSelectedMethod('qris')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  selectedMethod === 'qris'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>QRIS (ShopeePay/GoPay/OVO)</span>
                </div>
                <input
                  type="radio"
                  name="method"
                  checked={selectedMethod === 'qris'}
                  onChange={() => {}}
                  className="text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={handleSimulateSuccess}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Simulasi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bayar Sekarang (Simulasi Berhasil)</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push(`/orders/${orderId}`)}
              disabled={isLoading}
              className="w-full border-slate-200 hover:bg-slate-50 text-slate-600 font-normal py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Batal / Kembali ke Pesanan</span>
            </Button>
          </div>
        </div>

        {/* Security badge */}
        <div className="bg-slate-50 border-t border-slate-100 p-3 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Enkripsi SSL 256-bit • Duitku Payment Gateway Sandbox
        </div>
      </div>
    </div>
  )
}

export function DuitkuMockClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center">Memuat Duitku Sandbox...</div>}>
      <DuitkuMockContent />
    </Suspense>
  )
}
