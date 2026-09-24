/**
 * lib/server/whatsapp.ts
 *
 * Indonesian Konveksi WhatsApp Notification Service.
 * Formats Indonesian phone numbers (08xx -> 628xx) and sends notifications
 * for Order Lifecycle events (DP 70%, Produksi, Pelunasan 30%, Pengiriman & Resi).
 *
 * Supports Fonnte, Wablas, or mock console logging when WA gateway keys are not provided.
 */

export interface WhatsAppMessagePayload {
  to: string
  message: string
}

export function formatIndonesianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1)
  } else if (!cleaned.startsWith('62') && cleaned.length > 8) {
    cleaned = '62' + cleaned
  }
  return cleaned
}

/**
 * Sends a WhatsApp message via Fonnte or Wablas if configured,
 * otherwise logs cleanly to the console for testing.
 */
export async function sendWhatsAppMessage({ to, message }: WhatsAppMessagePayload): Promise<{ success: boolean; provider?: string }> {
  const targetPhone = formatIndonesianPhone(to)
  const fonnteToken = process.env.FONNTE_TOKEN
  const wablasToken = process.env.WABLAS_TOKEN

  if (fonnteToken) {
    try {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: fonnteToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: targetPhone,
          message,
        }),
      })
      const data = await res.json()
      console.log(`[WhatsApp Fonnte] Sent to ${targetPhone}:`, data)
      return { success: true, provider: 'fonnte' }
    } catch (err) {
      console.warn(`[WhatsApp Fonnte] Failed to send to ${targetPhone}:`, err)
    }
  }

  if (wablasToken) {
    try {
      const res = await fetch('https://kudus.wablas.com/api/send-message', {
        method: 'POST',
        headers: {
          Authorization: wablasToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: targetPhone,
          message,
        }),
      })
      const data = await res.json()
      console.log(`[WhatsApp Wablas] Sent to ${targetPhone}:`, data)
      return { success: true, provider: 'wablas' }
    } catch (err) {
      console.warn(`[WhatsApp Wablas] Failed to send to ${targetPhone}:`, err)
    }
  }

  // Fallback for local testing / development
  console.log(`[WhatsApp Sandbox/Mock] Message to ${targetPhone}:\n${message}\n---`)
  return { success: true, provider: 'mock' }
}

/**
 * 1. Notifikasi Saat Order Dibuat (Menunggu DP 70%)
 */
export async function sendOrderCreatedWa(params: {
  customerPhone: string
  customerName: string
  orderNumber: string
  tenantName: string
  dpAmount: number
  paymentUrl?: string
}) {
  const message = `Halo Kak *${params.customerName}*,\n\nPesanan konveksi Anda di *${params.tenantName}* telah kami terima!\n\n📋 *No. Pesanan:* ${params.orderNumber}\n💰 *Tagihan DP 70% + Ongkir:* Rp ${params.dpAmount.toLocaleString('id-ID')}\n\nSilakan selesaikan pembayaran DP agar tim produksi kami dapat segera memproses bahan dan sablon:\n${params.paymentUrl || 'Silakan cek menu Pesanan Saya di website.'}\n\nTerima kasih atas kepercayaan Anda pada AshiraTech Garment Network! 🙏`

  return sendWhatsAppMessage({ to: params.customerPhone, message })
}

/**
 * 2. Notifikasi Saat DP Lunas & Masuk Antrian Produksi
 */
export async function sendDpPaidWa(params: {
  customerPhone: string
  customerName: string
  orderNumber: string
  tenantName: string
  amountPaid: number
}) {
  const message = `Halo Kak *${params.customerName}*,\n\nPembayaran DP 70% sebesar *Rp ${params.amountPaid.toLocaleString('id-ID')}* untuk pesanan *${params.orderNumber}* telah kami verifikasi! ✅\n\nDesain dan blueprint Anda telah diteruskan ke tim produksi *${params.tenantName}* untuk proses cutting dan sablon. Kami akan mengabari kembali saat pesanan siap dikirim.\n\nSalam hangat,\n*${params.tenantName}*`

  return sendWhatsAppMessage({ to: params.customerPhone, message })
}

/**
 * 3. Notifikasi Saat Produksi Selesai (Tagihan Pelunasan 30%)
 */
export async function sendOrderReadyWa(params: {
  customerPhone: string
  customerName: string
  orderNumber: string
  tenantName: string
  finalAmount: number
  paymentUrl?: string
}) {
  const message = `Kabar Gembira Kak *${params.customerName}*! 🎉\n\nPesanan Anda (*${params.orderNumber}*) di *${params.tenantName}* telah *SELESAI DIPRODUKSI* dan lolos Quality Control (QC).\n\n💰 *Tagihan Pelunasan 30%:* Rp ${params.finalAmount.toLocaleString('id-ID')}\n\nSilakan lakukan pelunasan agar paket dapat segera diserahkan ke kurir ekspedisi:\n${params.paymentUrl || 'Silakan cek menu Pesanan Saya di website.'}\n\nTerima kasih! 🙏`

  return sendWhatsAppMessage({ to: params.customerPhone, message })
}

/**
 * 4. Notifikasi Saat Pesanan Dikirim (Nomor Resi Ekspedisi)
 */
export async function sendOrderShippedWa(params: {
  customerPhone: string
  customerName: string
  orderNumber: string
  tenantName: string
  courierName: string
  trackingNumber: string
}) {
  const message = `Halo Kak *${params.customerName}*,\n\nPesanan Anda (*${params.orderNumber}*) dari *${params.tenantName}* telah dikirim! 🚚💨\n\n📦 *Ekspedisi:* ${params.courierName}\n🧾 *Nomor Resi:* ${params.trackingNumber}\n\nAnda dapat melacak status perjalanan paket langsung melalui website kurir atau halaman tracker pesanan kami.\n\nTerima kasih telah mempercayakan produksi Anda kepada kami! 😊`

  return sendWhatsAppMessage({ to: params.customerPhone, message })
}
