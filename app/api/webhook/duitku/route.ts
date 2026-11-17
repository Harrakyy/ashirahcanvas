import { NextResponse } from 'next/server'
import { eq, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { payments, orders, orderStatusLogs } from '@/lib/db/schema'
import { duitku } from '@/lib/server/duitku'
import { sendDpPaymentConfirmedEmail } from '@/lib/server/email'
import { sendDpPaidWa } from '@/lib/server/whatsapp'

export async function POST(req: Request) {
  try {
    let payload: Record<string, any> = {}
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      formData.forEach((value, key) => {
        payload[key] = value.toString()
      })
    } else {
      payload = await req.json()
    }

    const {
      merchantCode,
      amount,
      merchantOrderId,
      signature,
      resultCode,
      reference,
    } = payload

    console.log('[Duitku Webhook] Received notification:', {
      merchantOrderId,
      amount,
      resultCode,
      reference,
    })

    if (!merchantOrderId) {
      return new Response('BAD REQUEST: Missing merchantOrderId', { status: 400 })
    }

    // Signature verification (if signature provided and not local test mock)
    const isMock =
      merchantOrderId.startsWith('ASH-MOCK') ||
      merchantOrderId.startsWith('SIM-') ||
      (typeof reference === 'string' && reference.startsWith('MOCK-'))

    if (signature && !isMock && process.env.DUITKU_API_KEY) {
      const isValid = duitku.verifyCallbackSignature({
        merchantCode: merchantCode || '',
        amount: amount || '',
        merchantOrderId,
        signature,
      })
      if (!isValid) {
        console.warn('[Duitku Webhook] Invalid MD5 signature for order:', merchantOrderId)
        return new Response('UNAUTHORIZED: Invalid signature', { status: 403 })
      }
    }

    // Process payment status
    if (resultCode === '00') {
      try {
        const cleanOrderNumber = merchantOrderId.replace(/-DP$|-FINAL$/, '')

        // 1. Find existing payment by duitkuReference or find payment belonging to order
        let existingPayment = await db.query.payments.findFirst({
          where: eq(payments.duitkuReference, reference || merchantOrderId),
        })

        // If not found by reference, try to find order by orderNumber
        let associatedOrder = null
        if (!existingPayment) {
          // Check if merchantOrderId is an orderNumber, clean orderNumber, or paymentId
          associatedOrder = await db.query.orders.findFirst({
            where: or(
              eq(orders.orderNumber, merchantOrderId),
              eq(orders.orderNumber, cleanOrderNumber)
            ),
            with: {
              customer: true,
              tenant: true,
            },
          })

          if (associatedOrder) {
            existingPayment = await db.query.payments.findFirst({
              where: eq(payments.orderId, associatedOrder.id),
            })
          }
        } else {
          associatedOrder = await db.query.orders.findFirst({
            where: eq(orders.id, existingPayment.orderId),
            with: {
              customer: true,
              tenant: true,
            },
          })
        }

        const now = new Date()

        if (existingPayment) {
          await db
            .update(payments)
            .set({
              status: 'paid',
              paidAt: now,
              duitkuReference: reference || existingPayment.duitkuReference,
              updatedAt: now,
            })
            .where(eq(payments.id, existingPayment.id))

          console.log(`[Duitku Webhook] Payment ${existingPayment.id} marked as PAID`)

          if (associatedOrder) {
            if (existingPayment.type === 'dp') {
              // Update order to dp_paid
              await db
                .update(orders)
                .set({
                  status: 'dp_paid',
                  updatedAt: now,
                })
                .where(eq(orders.id, associatedOrder.id))

              await db.insert(orderStatusLogs).values({
                orderId: associatedOrder.id,
                fromStatus: associatedOrder.status,
                toStatus: 'dp_paid',
                note: `Pembayaran DP 70% sebesar Rp ${Number(amount || existingPayment.amount).toLocaleString('id-ID')} berhasil diverifikasi via Duitku`,
              })
              console.log(`[Duitku Webhook] Order ${associatedOrder.orderNumber} transitioned to dp_paid`)

              // Send email notification to customer (non-blocking)
              sendDpPaymentConfirmedEmail({
                customerEmail: associatedOrder.customer?.email || 'customer@ashirah.com',
                customerName: associatedOrder.customer?.name || 'Customer Ashirah',
                orderNumber: associatedOrder.orderNumber,
                tenantName: (associatedOrder as any).tenant?.name || 'Ashira Garment Studio',
                tenantEmail: (associatedOrder as any).tenant?.email,
                amountPaid: Number(amount || existingPayment.amount),
              }).catch((e) => console.warn('[Email] Failed to send DP email:', e))
            } else if (existingPayment.type === 'final') {
              await db.insert(orderStatusLogs).values({
                orderId: associatedOrder.id,
                fromStatus: associatedOrder.status,
                toStatus: associatedOrder.status,
                note: `Pelunasan 30% sebesar Rp ${Number(amount || existingPayment.amount).toLocaleString('id-ID')} lunas. Pesanan siap dikirim.`,
              })
              console.log(`[Duitku Webhook] Final payment for Order ${associatedOrder.orderNumber} verified`)
            }
          }
        } else {
          console.warn('[Duitku Webhook] No matching payment/order found in database, skipped DB update')
        }
      } catch (dbErr) {
        console.error('[Duitku Webhook] Database update error:', dbErr)
      }

      return new Response('SUCCESS', { status: 200 })
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('[Duitku Webhook] Handler error:', error)
    return new Response('INTERNAL SERVER ERROR', { status: 500 })
  }
}
