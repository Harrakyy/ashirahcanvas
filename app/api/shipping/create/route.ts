import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, shipments, orderStatusLogs, tenants, users } from '@/lib/db/schema'
import { shipping } from '@/lib/server/shipping'
import { getCurrentUser } from '@/lib/server/auth'
import { sendShipmentDispatchedEmail } from '@/lib/server/email'

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya admin konveksi yang dapat memproses pengiriman.' }, { status: 403 })
    }

    const body = await req.json()
    const { orderId, courierCode = 'jne', courierServiceCode = 'reg', courierName = 'JNE', customTrackingNumber } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID wajib diisi' }, { status: 400 })
    }

    // 1. Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        customer: true,
        tenant: true,
        items: true,
        shipment: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    const now = new Date()
    let trackingNumber = customTrackingNumber?.trim()
    let shipmentId = ''
    let biteshipOrderId = ''

    // 2. If no manual tracking number provided, generate via Biteship provider
    if (!trackingNumber) {
      const destination = order.shipment?.destinationAddress || {
        name: order.customer.name,
        phone: order.customer.phone || '08123456789',
        street: 'Jl. Pemesan No. 1',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40132',
      }

      const shipmentRes = await shipping.createShipment({
        orderId: order.id,
        tenantId: order.tenantId,
        courierCode,
        courierServiceCode,
        origin: {
          contactName: order.tenant.name,
          contactPhone: order.tenant.phone || '081299887766',
          address: order.tenant.address || 'Kawasan Industri Konveksi Bandung',
          postalCode: '40132',
        },
        destination: {
          contactName: destination.name,
          contactPhone: destination.phone,
          address: `${destination.street}, ${destination.city}, ${destination.province}`,
          postalCode: destination.postalCode || '40132',
        },
        items: order.items.map((it) => ({
          name: it.productName,
          value: it.unitPrice,
          quantity: it.quantity,
          weight: 200,
        })),
      })

      trackingNumber = shipmentRes.trackingNumber
      shipmentId = shipmentRes.shipmentId
      biteshipOrderId = shipmentRes.biteshipOrderId || ''
    }

    // 3. Upsert into shipments table
    if (order.shipment) {
      await db
        .update(shipments)
        .set({
          courierCode,
          courierName,
          trackingNumber,
          status: 'in_transit',
          biteshipOrderId: biteshipOrderId || order.shipment.biteshipOrderId,
          shippedAt: now,
          updatedAt: now,
        })
        .where(eq(shipments.id, order.shipment.id))
    } else {
      await db.insert(shipments).values({
        orderId: order.id,
        tenantId: order.tenantId,
        courierCode,
        courierName,
        trackingNumber,
        status: 'in_transit',
        biteshipOrderId: biteshipOrderId || null,
        destinationAddress: {
          name: order.customer.name,
          phone: order.customer.phone || '-',
          street: 'Alamat Pemesan',
          city: 'Bandung',
          province: 'Jawa Barat',
          postalCode: '40132',
        },
        shippedAt: now,
      })
    }

    // 4. Update order status to shipped
    await db
      .update(orders)
      .set({
        status: 'shipped',
        updatedAt: now,
      })
      .where(eq(orders.id, order.id))

    // 5. Log status transition
    await db.insert(orderStatusLogs).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: 'shipped',
      note: `Pesanan telah dikirim menggunakan kurir ${courierName} dengan No. Resi: ${trackingNumber}`,
      changedBy: user.id,
    })

    // Send shipment notification email to customer
    if (order.customer?.email) {
      sendShipmentDispatchedEmail({
        customerEmail: order.customer.email,
        customerName: order.customer.name || 'Customer',
        orderNumber: order.orderNumber,
        tenantName: order.tenant?.name || 'Ashira Garment',
        tenantEmail: order.tenant?.email,
        courierName,
        trackingNumber,
      }).catch((e) => console.warn('[Email] Error sending shipment dispatched email:', e))
    }

    return NextResponse.json({
      success: true,
      trackingNumber,
      courierName,
      status: 'shipped',
      shippedAt: now,
    })
  } catch (error) {
    console.error('[Shipping API] Create shipment error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat pengiriman barang' },
      { status: 500 }
    )
  }
}
