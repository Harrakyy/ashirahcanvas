'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Download, FileText, Loader2, Lock, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { jsPDF } from 'jspdf'

interface InvoiceDownloadButtonProps {
  order: {
    id: string
    orderNumber: string
    createdAt: string
    status: string
    subtotal: number
    shippingCost: number
    totalAmount: number
    dpAmount: number
    finalAmount: number
    tenant?: {
      name: string
      phone?: string
      address?: string
      email?: string
      logoUrl?: string | null
      settings?: {
        bankAccount?: {
          bankName?: string
          accountNumber?: string
          accountHolder?: string
        }
      }
    }
    customer?: {
      name: string
      email: string
      phone?: string
    }
    items?: Array<{
      productName: string
      color: string
      size: string
      quantity: number
      unitPrice: number
    }>
    payments?: Array<{
      type: 'dp' | 'final'
      status: string
      amount: number
      paidAt?: string
    }>
    shipment?: {
      courierName?: string
      trackingNumber?: string
    }
  }
}

/**
 * Loads an image from a URL and converts it to a JPEG data URL for jsPDF.
 * Uses canvas to ensure consistent cross-browser embedding.
 */
async function getBase64Image(url: string): Promise<{ dataUrl: string; format: 'JPEG' } | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width || 300
          canvas.height = img.naturalHeight || img.height || 300
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(null)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
          resolve({ dataUrl, format: 'JPEG' })
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      // 3.5s timeout safety
      setTimeout(() => resolve(null), 3500)
      img.src = url
    } catch {
      resolve(null)
    }
  })
}

export function InvoiceDownloadButton({ order }: InvoiceDownloadButtonProps) {
  const { role } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [showLogoModal, setShowLogoModal] = useState(false)

  const tenantLogo = order.tenant?.logoUrl?.trim()
  const hasLogo = Boolean(tenantLogo && tenantLogo.length > 0)

  const handleGeneratePdf = async () => {
    if (!hasLogo) {
      setShowLogoModal(true)
      return
    }

    setIsGenerating(true)
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const margin = 20
      const pageWidth = 210
      const contentWidth = pageWidth - margin * 2
      let y = margin

      // 1. EMBED LOGO OR MONOGRAM (Black & White)
      let logoLoaded = false
      if (tenantLogo) {
        const logoData = await getBase64Image(tenantLogo)
        if (logoData) {
          try {
            // Draw logo in a clean 30x20mm bounding box on top left
            doc.addImage(logoData.dataUrl, 'JPEG', margin, y, 32, 20)
            logoLoaded = true
          } catch (e) {
            console.warn('[PDF] addImage failed:', e)
          }
        }
      }

      if (!logoLoaded) {
        // Fallback monochrome logo box
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.6)
        doc.rect(margin, y, 32, 20, 'S')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        const initials = (order.tenant?.name || 'AK')
          .split(' ')
          .map((n) => n[0])
          .slice(0, 3)
          .join('')
          .toUpperCase()
        doc.text(initials, margin + 16, y + 12, { align: 'center' })
      }

      // 2. HEADER DETAILS (Top Right) - Strictly Monochrome
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(0, 0, 0)
      doc.text('FAKTUR PENJUALAN', pageWidth - margin, y + 6, { align: 'right' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.text(`No. Faktur: ${order.orderNumber}`, pageWidth - margin, y + 12, { align: 'right' })

      const formattedDate = new Date(order.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      doc.text(`Tanggal: ${formattedDate}`, pageWidth - margin, y + 17, { align: 'right' })

      // Status Tag (Monochrome Badge)
      const isDelivered = order.status === 'delivered'
      const isShipped = order.status === 'shipped' || isDelivered
      const dpPaid = order.payments?.some((p) => p.type === 'dp' && p.status === 'paid') || order.status !== 'pending'
      const finalPaid = order.payments?.some((p) => p.type === 'final' && p.status === 'paid')

      const paymentStatusText = finalPaid
        ? '[STATUS: LUNAS 100%]'
        : dpPaid
        ? '[STATUS: DP 70% DITERIMA]'
        : '[STATUS: MENUNGGU PEMBAYARAN]'

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.text(paymentStatusText, pageWidth - margin, y + 22, { align: 'right' })

      y += 28

      // Divider Line (Solid Black)
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.6)
      doc.line(margin, y, pageWidth - margin, y)

      y += 8

      // 3. SELLER & BUYER COLUMNS (Minimalist B&W)
      const col2X = margin + contentWidth / 2 + 5

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('DITERBITKAN OLEH (PENJUAL):', margin, y)
      doc.text('DITAGIHKAN KEPADA (PEMESAN):', col2X, y)

      y += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(order.tenant?.name || 'Ashira Garment Partner', margin, y)
      doc.text(order.customer?.name || 'Pelanggan', col2X, y)

      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(40, 40, 40)
      doc.text(`Alamat: ${order.tenant?.address || 'Bandung, Jawa Barat'}`, margin, y)
      doc.text(`Email: ${order.customer?.email || '-'}`, col2X, y)

      y += 4.5
      doc.text(`Telepon: ${order.tenant?.phone || '-'}`, margin, y)
      doc.text(`Telepon: ${order.customer?.phone || '-'}`, col2X, y)

      y += 10

      // 4. TABLE HEADER (Solid Black Fill with Crisp White Text)
      doc.setFillColor(0, 0, 0)
      doc.rect(margin, y, contentWidth, 7.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.text('NO', margin + 3, y + 5)
      doc.text('DESKRIPSI ITEM & SPESIFIKASI', margin + 14, y + 5)
      doc.text('VARIAN', margin + 95, y + 5)
      doc.text('QTY', margin + 120, y + 5, { align: 'right' })
      doc.text('HARGA SATUAN', margin + 145, y + 5, { align: 'right' })
      doc.text('TOTAL', pageWidth - margin - 3, y + 5, { align: 'right' })

      y += 7.5

      // 5. TABLE ITEMS (Clean White Rows with Subtle Lines)
      const items =
        order.items && order.items.length > 0
          ? order.items
          : [
              {
                productName: 'Pesanan Pakaian Apparel Custom',
                color: 'Custom',
                size: 'All Size',
                quantity: 1,
                unitPrice: order.subtotal,
              },
            ]

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)

      items.forEach((item, index) => {
        const itemTotal = item.quantity * item.unitPrice
        const rowHeight = 7.5

        // Alternating row background for clean readability
        if (index % 2 === 1) {
          doc.setFillColor(248, 248, 248)
          doc.rect(margin, y, contentWidth, rowHeight, 'F')
        }

        doc.text(String(index + 1), margin + 3, y + 5)
        doc.text(item.productName.substring(0, 42), margin + 14, y + 5)
        doc.text(`${item.color} / ${item.size}`, margin + 95, y + 5)
        doc.text(String(item.quantity), margin + 120, y + 5, { align: 'right' })
        doc.text(`Rp ${item.unitPrice.toLocaleString('id-ID')}`, margin + 145, y + 5, { align: 'right' })
        doc.text(`Rp ${itemTotal.toLocaleString('id-ID')}`, pageWidth - margin - 3, y + 5, { align: 'right' })

        y += rowHeight
        // Row divider
        doc.setDrawColor(230, 230, 230)
        doc.setLineWidth(0.2)
        doc.line(margin, y, pageWidth - margin, y)
      })

      // Bottom line of table
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)

      y += 6

      // 6. BOTTOM SECTION: LEFT (PAYMENT INFO & BANK) / RIGHT (TOTALS & 70:30 BREAKDOWN)
      const summaryBoxX = pageWidth - margin - 80

      // Left Box: Rekening Pembayaran Resmi & Ekspedisi
      const bankInfo = order.tenant?.settings?.bankAccount
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.text('INSTRUKSI REKENING PEMBAYARAN:', margin, y + 3)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(50, 50, 50)
      doc.text(`Bank: ${bankInfo?.bankName || 'BCA'}`, margin, y + 8)
      doc.text(`No. Rekening: ${bankInfo?.accountNumber || '8830129841'}`, margin, y + 13)
      doc.text(`Atas Nama: ${bankInfo?.accountHolder || (order.tenant?.name || 'Ashira Garment')}`, margin, y + 18)

      if (order.shipment?.trackingNumber) {
        doc.setFont('helvetica', 'bold')
        doc.text('EKSPEDISI & PENGIRIMAN:', margin, y + 26)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Kurir: ${order.shipment.courierName || 'JNE'} • No. Resi: ${order.shipment.trackingNumber}`,
          margin,
          y + 31
        )
      }

      // Right Box: Totals & 70:30 Breakdown in Clean Black & White
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.rect(summaryBoxX, y, 80, 48, 'S')

      let sY = y + 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(80, 80, 80)
      doc.text('Subtotal Produk:', summaryBoxX + 4, sY)
      doc.setTextColor(0, 0, 0)
      doc.text(`Rp ${order.subtotal.toLocaleString('id-ID')}`, pageWidth - margin - 4, sY, { align: 'right' })

      sY += 5.5
      doc.setTextColor(80, 80, 80)
      doc.text('Ongkos Kirim:', summaryBoxX + 4, sY)
      doc.setTextColor(0, 0, 0)
      doc.text(`Rp ${order.shippingCost.toLocaleString('id-ID')}`, pageWidth - margin - 4, sY, { align: 'right' })

      sY += 5.5
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.4)
      doc.line(summaryBoxX + 4, sY, pageWidth - margin - 4, sY)

      sY += 5.5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.text('TOTAL TAGIHAN:', summaryBoxX + 4, sY)
      doc.text(`Rp ${order.totalAmount.toLocaleString('id-ID')}`, pageWidth - margin - 4, sY, { align: 'right' })

      // 70:30 Breakdown in B&W
      sY += 6.5
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.line(summaryBoxX + 4, sY, pageWidth - margin - 4, sY)

      sY += 5.5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text('1. DP 70% + Ongkir:', summaryBoxX + 4, sY)
      doc.setFont('helvetica', 'bold')
      doc.text(
        `Rp ${order.dpAmount.toLocaleString('id-ID')} ${dpPaid ? '[LUNAS]' : '[BELUM]'}`,
        pageWidth - margin - 4,
        sY,
        { align: 'right' }
      )

      sY += 5
      doc.setFont('helvetica', 'normal')
      doc.text('2. Pelunasan 30%:', summaryBoxX + 4, sY)
      doc.setFont('helvetica', 'bold')
      doc.text(
        `Rp ${order.finalAmount.toLocaleString('id-ID')} ${finalPaid ? '[LUNAS]' : '[BELUM]'}`,
        pageWidth - margin - 4,
        sY,
        { align: 'right' }
      )

      // 7. FOOTER & STAMP SECTION
      y = 250
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageWidth - margin, y)

      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(90, 90, 90)
      doc.text(
        'Faktur penjualan ini merupakan bukti transaksi sah yang diterbitkan melalui platform AshiraTech SaaS.',
        margin,
        y
      )
      doc.text(
        'Dokumen resmi konveksi terverifikasi • Standar Pembayaran Termin Garment 70:30.',
        margin,
        y + 4
      )

      // Stamp placeholder on bottom right
      doc.text('Tanda Tangan & Cap Resmi Usaha', pageWidth - margin - 35, y, { align: 'center' })
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.2)
      doc.line(pageWidth - margin - 50, y + 18, pageWidth - margin, y + 18)
      doc.text(`(${order.tenant?.name || 'Pihak Konveksi'})`, pageWidth - margin - 35, y + 21, { align: 'center' })

      // Save PDF with clean filename
      doc.save(`Invoice-Resmi-${order.orderNumber}.pdf`)
    } catch (err) {
      console.error('Failed to generate PDF invoice:', err)
      alert('Gagal membuat file PDF invoice. Silakan coba lagi.')
    } finally {
      setIsGenerating(false)
    }
  }

  // If client has NOT set a logo, show the gate state
  if (!hasLogo) {
    const isAdmin = role === 'admin' || role === 'super_admin'

    return (
      <div className="relative inline-block">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLogoModal(true)}
          className="rounded-full border-[#C4C8D8] text-xs font-bold gap-1.5 h-9 px-4 bg-[#F0F2F6] hover:bg-[#EDEDF2] text-[#1A2B56] cursor-pointer shadow-xs"
          title={
            isAdmin
              ? 'Logo konveksi belum diatur. Lengkapi logo usaha di Profil Usaha untuk mengaktifkan cetak invoice.'
              : 'Invoice resmi menunggu registrasi logo konveksi.'
          }
        >
          <Lock className="w-3.5 h-3.5 text-[#4C567A]" />
          <span>{isAdmin ? 'Invoice Terkunci (Perlu Logo)' : 'Faktur Menunggu Logo'}</span>
        </Button>

        {showLogoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0F2F6] text-[#1A2B56] flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5 text-[#1A2B56]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Logo Usaha Konveksi Diperlukan</h3>
                  <p className="text-xs text-slate-500">Standar Penerbitan Faktur Resmi AshiraTech</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-slate-900">Mengapa invoice belum dapat diunduh?</p>
                <p className="text-slate-600 leading-relaxed">
                  {isAdmin ? (
                    <>
                      Agar invoice yang diterbitkan bukan invoice abal-abal, setiap mitra konveksi wajib memiliki{' '}
                      <strong>Logo Resmi Usaha</strong> pada kop surat faktur resmi hitam-putih sebelum dapat dicetak.
                    </>
                  ) : (
                    <>
                      Faktur resmi pesanan sedang dalam proses pengesahan identitas usaha oleh pihak konveksi mitra. Dokumen akan aktif segera setelah logo usaha terdaftar.
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogoModal(false)}
                  className="text-xs rounded-full cursor-pointer text-slate-600"
                >
                  Tutup
                </Button>

                {isAdmin && (
                  <Link href="/admin/profile" onClick={() => setShowLogoModal(false)}>
                    <Button
                      size="sm"
                      className="bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs font-bold rounded-full px-4 h-9 gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Lengkapi Logo di Profil Usaha</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Active State: Logo is present, invoice ready to download
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGeneratePdf}
      disabled={isGenerating}
      className="rounded-full border-transparent text-xs font-bold gap-1.5 h-9 px-4 bg-[#1A2B56] hover:bg-[#243B6B] text-white cursor-pointer shadow-xs transition-all active:scale-95"
      title="Cetak faktur invoice resmi berstandar hitam-putih"
    >
      {isGenerating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileText className="w-3.5 h-3.5 text-white" />
      )}
      <span>{isGenerating ? 'Menyiapkan Faktur PDF...' : 'Cetak Invoice PDF (B&W)'}</span>
    </Button>
  )
}
