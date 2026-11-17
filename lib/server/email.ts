/**
 * lib/server/email.ts
 *
 * Email Notification Engine for AshiraTech SaaS.
 *
 * Pertimbangan domain:
 * - Jika EMAIL_FROM_ADDRESS diisi (domain sendiri sudah verified di Resend) → pakai itu.
 * - Jika belum → pakai onboarding@resend.dev (Resend test sender, tanpa perlu domain sendiri).
 *   CATATAN: onboarding@resend.dev hanya bisa kirim ke email yang sama dengan akun Resend kamu.
 *   Ketika domain sudah siap: isi EMAIL_FROM_ADDRESS di .env — zero code change.
 * - Tanpa RESEND_API_KEY → log ke console (dev mode).
 */

export interface EmailOptions {
  to: string
  subject: string
  html: string
  /** Display name pengirim, e.g. "Konveksi XYZ via AshiraTech" */
  fromName?: string
  /**
   * Reply-To header — customer yang balas email masuk ke inbox tenant,
   * bukan inbox Ashira. Isi dengan email tenant jika tersedia.
   */
  replyTo?: string
  /**
   * BCC ke email internal Ashira agar setiap transaksi tercatat.
   * Default: ASHIRA_BCC_EMAIL env var.
   */
  bcc?: string
}

export async function sendEmail({ to, subject, html, fromName, replyTo, bcc }: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'
  const displayName = fromName ?? (process.env.EMAIL_FROM_NAME || 'AshiraTech')
  const from = `${displayName} <${fromAddress}>`

  // BCC ke email internal Ashira untuk setiap transaksi (opsional)
  const ashiraBcc = bcc ?? process.env.ASHIRA_BCC_EMAIL

  if (apiKey) {
    try {
      const payload: Record<string, unknown> = {
        from,
        to: [to],
        subject,
        html,
      }
      if (replyTo) payload.reply_to = replyTo
      if (ashiraBcc) payload.bcc = [ashiraBcc]

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        console.log(`[Email] Sent to ${to} | from="${from}" reply_to="${replyTo ?? '-'}" bcc="${ashiraBcc ?? '-'}"`)
        return true
      }

      const errBody = await res.text().catch(() => '')
      console.warn(`[Email] Resend responded ${res.status}:`, errBody)
    } catch (e) {
      console.warn('[Email] Resend API error:', e)
    }
  }

  // Dev / sandbox logger
  console.log(`\n================== ✉️ EMAIL NOTIFICATION ==================`)
  console.log(`FROM:     ${from}`)
  console.log(`TO:       ${to}`)
  if (replyTo) console.log(`REPLY-TO: ${replyTo}`)
  if (ashiraBcc) console.log(`BCC:      ${ashiraBcc}`)
  console.log(`SUBJECT:  ${subject}`)
  console.log(`TIME:     ${new Date().toISOString()}`)
  console.log(`==========================================================\n`)

  return true
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tenantFrom(tenantName: string): string {
  return `${tenantName} via AshiraTech`
}

function emailFooter(tenantName: string): string {
  return `
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
    <p style="font-size:12px;color:#64748b;">
      Email ini dikirim oleh <strong>${tenantName}</strong> melalui platform
      <strong>AshiraTech</strong> &mdash; Sistem Manajemen Garmen &amp; Konveksi Digital.
    </p>
  `
}

// ---------------------------------------------------------------------------
// 1. Email Konfirmasi Pesanan & Tagihan DP 70%
// ---------------------------------------------------------------------------
export async function sendOrderCreatedEmail(params: {
  customerEmail: string
  customerName: string
  orderNumber: string
  tenantName: string
  tenantEmail?: string | null
  dpAmount: number
  totalAmount: number
  paymentUrl: string
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
      <h2 style="color:#1e3a8a;margin-bottom:8px;">Pesanan Anda Telah Dibuat! 🎉</h2>
      <p>Halo <strong>${params.customerName}</strong>,</p>
      <p>Terima kasih telah memesan apparel custom di <strong>${params.tenantName}</strong>.</p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:4px 0;font-size:14px;"><strong>Nomor Pesanan:</strong> ${params.orderNumber}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Total Biaya Produksi:</strong> Rp ${params.totalAmount.toLocaleString('id-ID')}</p>
        <p style="margin:4px 0;font-size:14px;color:#2563eb;"><strong>Tagihan DP 70% + Ongkir:</strong> Rp ${params.dpAmount.toLocaleString('id-ID')}</p>
      </div>

      <p style="font-size:14px;">Silakan selesaikan pembayaran DP agar tim produksi dapat segera memproses pesanan Anda:</p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${params.paymentUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
          Bayar DP 70% Sekarang
        </a>
      </div>

      ${emailFooter(params.tenantName)}
    </div>
  `

  return sendEmail({
    to: params.customerEmail,
    subject: `[${params.orderNumber}] Konfirmasi Pesanan & DP 70% — ${params.tenantName}`,
    html,
    fromName: tenantFrom(params.tenantName),
    replyTo: params.tenantEmail ?? undefined,
  })
}

// ---------------------------------------------------------------------------
// 2. Email Konfirmasi DP Lunas & Mulai Produksi
// ---------------------------------------------------------------------------
export async function sendDpPaymentConfirmedEmail(params: {
  customerEmail: string
  customerName: string
  orderNumber: string
  tenantName: string
  tenantEmail?: string | null
  amountPaid: number
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
      <h2 style="color:#059669;margin-bottom:8px;">Pembayaran DP 70% Dikonfirmasi! ✅</h2>
      <p>Halo <strong>${params.customerName}</strong>,</p>
      <p>
        Pembayaran DP sebesar <strong>Rp ${params.amountPaid.toLocaleString('id-ID')}</strong>
        untuk pesanan <strong>${params.orderNumber}</strong> telah kami terima dan diverifikasi.
      </p>
      <p>
        Tim produksi <strong>${params.tenantName}</strong> telah menerima blueprint desain Anda
        dan pesanan kini masuk ke dalam antrian pengerjaan. Kami akan mengirimkan email kembali
        saat produksi selesai.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${appUrl}/orders" style="background:#059669;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
          Pantau Progres Pesanan
        </a>
      </div>

      ${emailFooter(params.tenantName)}
    </div>
  `

  return sendEmail({
    to: params.customerEmail,
    subject: `[${params.orderNumber}] DP 70% Lunas — Pesanan Mulai Diproses oleh ${params.tenantName}`,
    html,
    fromName: tenantFrom(params.tenantName),
    replyTo: params.tenantEmail ?? undefined,
  })
}

// ---------------------------------------------------------------------------
// 3. Email Produksi Selesai & Tagihan Pelunasan 30%
// ---------------------------------------------------------------------------
export async function sendProductionReadyEmail(params: {
  customerEmail: string
  customerName: string
  orderNumber: string
  tenantName: string
  tenantEmail?: string | null
  finalAmount: number
  paymentUrl: string
}) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
      <h2 style="color:#2563eb;margin-bottom:8px;">Produksi Selesai! Siap Dikirim 📦</h2>
      <p>Halo <strong>${params.customerName}</strong>,</p>
      <p>
        Kabar gembira! Pesanan apparel custom Anda di <strong>${params.tenantName}</strong>
        telah selesai diproduksi dan lolos quality control (QC).
      </p>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:4px 0;font-size:14px;"><strong>Nomor Pesanan:</strong> ${params.orderNumber}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#2563eb;"><strong>Tagihan Pelunasan 30%:</strong> Rp ${params.finalAmount.toLocaleString('id-ID')}</p>
      </div>

      <p style="font-size:14px;">Silakan selesaikan pelunasan agar paket dapat segera dikirim oleh kurir ekspedisi:</p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${params.paymentUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
          Bayar Pelunasan 30%
        </a>
      </div>

      ${emailFooter(params.tenantName)}
    </div>
  `

  return sendEmail({
    to: params.customerEmail,
    subject: `[${params.orderNumber}] Produksi Selesai — Lunasi 30% untuk Pengiriman`,
    html,
    fromName: tenantFrom(params.tenantName),
    replyTo: params.tenantEmail ?? undefined,
  })
}

// ---------------------------------------------------------------------------
// 4. Email Pengiriman Barang & Nomor Resi
// ---------------------------------------------------------------------------
export async function sendShipmentDispatchedEmail(params: {
  customerEmail: string
  customerName: string
  orderNumber: string
  tenantName: string
  tenantEmail?: string | null
  courierName: string
  trackingNumber: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
      <h2 style="color:#7c3aed;margin-bottom:8px;">Pesanan Anda Sedang Dikirim! 🚚</h2>
      <p>Halo <strong>${params.customerName}</strong>,</p>
      <p>
        Paket pesanan <strong>${params.orderNumber}</strong> dari <strong>${params.tenantName}</strong>
        telah diserahkan kepada kurir dan dalam perjalanan menuju alamat Anda.
      </p>

      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:4px 0;font-size:14px;"><strong>Ekspedisi:</strong> ${params.courierName}</p>
        <p style="margin:4px 0;font-size:14px;font-family:monospace;"><strong>Nomor Resi:</strong> ${params.trackingNumber}</p>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${appUrl}/orders" style="background:#7c3aed;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
          Lacak Paket di Dashboard
        </a>
      </div>

      ${emailFooter(params.tenantName)}
    </div>
  `

  return sendEmail({
    to: params.customerEmail,
    subject: `[${params.orderNumber}] Paket Dikirim via ${params.courierName} — Resi: ${params.trackingNumber}`,
    html,
    fromName: tenantFrom(params.tenantName),
    replyTo: params.tenantEmail ?? undefined,
  })
}
