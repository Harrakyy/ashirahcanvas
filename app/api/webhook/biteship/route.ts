import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { shipments, orders, orderStatusLogs } from '@/lib/db/schema'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const { order_id, courier_tracking_id, status } = payload

    console.log('[Biteship Webhook] Received update:', {
      order_id,
      courier_tracking_id,
      status,
    })

    if (!order_id && !courier_tracking_id) {
      return NextResponse.json({ error: 'Missing identifier' }, { status: 400 })
    }

    // Map Biteship status to our Shipment status
    let mappedStatus: 'pending' | 'picked_up' | 'in_transit' | 'delivered' = 'in_transit'
    if (status === 'allocated' || status === 'picking_up') {
      mappedStatus = 'pending'
    } else if (status === 'picked') {
      mappedStatus = 'picked_up'
    } else if (status === 'delivered') {
      mappedStatus = 'delivered'
    }

    // Find shipment
    let shipment = null
    if (order_id) {
      shipment = await db.query.shipments.findFirst({
        where: eq(shipments.biteshipOrderId, order_id),
      })
    }
    if (!shipment && courier_tracking_id) {
      shipment = await db.query.shipments.findFirst({
        where: eq(shipments.trackingNumber, courier_tracking_id),
      })
    }

    if (shipment) {
      const now = new Date()
      await db
        .update(shipments)
        .set({
          status: mappedStatus,
          deliveredAt: mappedStatus === 'delivered' ? now : shipment.deliveredAt,
          updatedAt: now,
        })
        .where(eq(shipments.id, shipment.id))

      if (mappedStatus === 'delivered') {
        await db
          .update(orders)
          .set({
            status: 'delivered',
            updatedAt: now,
          })
          .where(eq(orders.id, shipment.orderId))

        await db.insert(orderStatusLogs).values({
          orderId: shipment.orderId,
          fromStatus: 'shipped',
          toStatus: 'delivered',
          note: 'Paket telah sampai di alamat tujuan dan diterima oleh customer.',
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Biteship Webhook] Handler error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
