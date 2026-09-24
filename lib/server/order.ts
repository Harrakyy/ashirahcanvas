/**
 * lib/server/order.ts
 *
 * Order state machine, number generation, and lifecycle management.
 */

import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, orderItems, orderStatusLogs, payments, shipments, tenants, users } from '@/lib/db/schema'
import type { CanvasBlueprint } from '@/features/canvas/types/blueprint'

export type OrderStatus =
  | 'pending'
  | 'dp_paid'
  | 'processing'
  | 'sample_review'
  | 'sample_rejected'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['dp_paid', 'cancelled'],
  dp_paid: ['processing', 'cancelled'],
  processing: ['sample_review', 'ready', 'cancelled'],
  sample_review: ['sample_rejected', 'ready', 'cancelled'],
  sample_rejected: ['processing', 'cancelled'],
  ready: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export function canTransitionOrder(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  const allowed = VALID_ORDER_TRANSITIONS[fromStatus]
  return allowed ? allowed.includes(toStatus) : false
}

export function generateOrderNumber(): string {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `ASH-${yearMonth}-${randomChars}`
}

export interface CreateOrderItemInput {
  productId?: string
  productName: string
  color: string
  size: string
  quantity: number
  unitPrice: number
  discountPercent?: number
  blueprintPerZone?: Record<string, unknown>
}

export interface CreateOrderInput {
  tenantId: string
  customerId: string
  items: CreateOrderItemInput[]
  subtotal: number
  shippingCost?: number
  platformFee?: number
  designBlueprint?: CanvasBlueprint | Record<string, unknown>
  notes?: string
  shippingAddress: {
    name: string
    phone: string
    street: string
    subdistrict?: string
    city: string
    province: string
    postalCode: string
    courierCode?: string
    courierName?: string
  }
}

export async function createOrder(input: CreateOrderInput) {
  const orderNumber = generateOrderNumber()
  const shippingCost = input.shippingCost || 0
  const platformFee = input.platformFee ?? 5000 // Default fixed platform fee
  const totalAmount = input.subtotal + shippingCost

  // 70% DP + Ongkir, 30% Final pelunasan
  const dpAmount = Math.round(input.subtotal * 0.7) + shippingCost
  const finalAmount = input.subtotal - Math.round(input.subtotal * 0.7) // exactly 30%

  // 1. Create order
  const [newOrder] = await db
    .insert(orders)
    .values({
      orderNumber,
      tenantId: input.tenantId,
      customerId: input.customerId,
      status: 'pending',
      subtotal: input.subtotal,
      shippingCost,
      platformFee,
      totalAmount,
      dpAmount,
      finalAmount,
      designBlueprint: input.designBlueprint as Record<string, unknown>,
      notes: input.notes,
    })
    .returning()

  // 2. Insert order items
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (input.items.length > 0) {
    await db.insert(orderItems).values(
      input.items.map((it) => ({
        orderId: newOrder.id,
        productId: it.productId && uuidRegex.test(it.productId) ? it.productId : undefined,
        productName: it.productName,
        color: it.color,
        size: it.size,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountPercent: it.discountPercent || 0,
        blueprintPerZone: it.blueprintPerZone,
      }))
    )
  }

  // 3. Create initial shipment destination
  await db.insert(shipments).values({
    orderId: newOrder.id,
    tenantId: input.tenantId,
    courierCode: input.shippingAddress.courierCode || 'jne',
    courierName: input.shippingAddress.courierName || 'JNE Reguler',
    status: 'pending',
    destinationAddress: {
      name: input.shippingAddress.name,
      phone: input.shippingAddress.phone,
      street: input.shippingAddress.street,
      subdistrict: input.shippingAddress.subdistrict,
      city: input.shippingAddress.city,
      province: input.shippingAddress.province,
      postalCode: input.shippingAddress.postalCode,
    },
  })

  // 4. Initial status log
  await db.insert(orderStatusLogs).values({
    orderId: newOrder.id,
    fromStatus: null,
    toStatus: 'pending',
    note: `Pesanan dibuat oleh customer. Menunggu pembayaran DP 70% (Rp ${dpAmount.toLocaleString('id-ID')}).`,
    changedBy: input.customerId,
  })

  return newOrder
}

export async function transitionOrderStatus(
  orderId: string,
  toStatus: OrderStatus,
  changedByUserId?: string,
  note?: string
) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  })

  if (!order) {
    throw new Error('Pesanan tidak ditemukan')
  }

  const currentStatus = order.status as OrderStatus

  // Validate state transition
  if (!canTransitionOrder(currentStatus, toStatus)) {
    throw new Error(
      `Transisi status tidak diizinkan dari "${currentStatus}" ke "${toStatus}"`
    )
  }

  const now = new Date()

  // Update order status
  await db
    .update(orders)
    .set({
      status: toStatus,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId))

  // If transitioning to dp_paid, ensure DP payment is marked as paid
  if (toStatus === 'dp_paid') {
    const existingDp = await db.query.payments.findFirst({
      where: and(eq(payments.orderId, orderId), eq(payments.type, 'dp')),
    })
    if (existingDp) {
      await db
        .update(payments)
        .set({
          status: 'paid',
          paidAt: now,
          updatedAt: now,
          paymentMethod: existingDp.paymentMethod || 'manual_transfer',
        })
        .where(eq(payments.id, existingDp.id))
    } else {
      await db.insert(payments).values({
        orderId: order.id,
        tenantId: order.tenantId,
        type: 'dp',
        status: 'paid',
        amount: order.dpAmount,
        paymentMethod: 'manual_transfer',
        paidAt: now,
      })
    }
  }

  // Record audit log
  await db.insert(orderStatusLogs).values({
    orderId,
    fromStatus: currentStatus,
    toStatus,
    note: note || `Status diubah dari ${currentStatus} ke ${toStatus}`,
    changedBy: changedByUserId || null,
  })

  return { success: true, fromStatus: currentStatus, toStatus }
}

export async function confirmOrderPaymentManual(
  orderId: string,
  type: 'dp' | 'final',
  changedByUserId?: string,
  note?: string
) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  })

  if (!order) {
    throw new Error('Pesanan tidak ditemukan')
  }

  const now = new Date()

  if (type === 'dp') {
    // Check or update payment
    const existingDp = await db.query.payments.findFirst({
      where: and(eq(payments.orderId, orderId), eq(payments.type, 'dp')),
    })

    if (existingDp) {
      await db
        .update(payments)
        .set({
          status: 'paid',
          paidAt: now,
          updatedAt: now,
          paymentMethod: existingDp.paymentMethod || 'manual_transfer',
        })
        .where(eq(payments.id, existingDp.id))
    } else {
      await db.insert(payments).values({
        orderId: order.id,
        tenantId: order.tenantId,
        type: 'dp',
        status: 'paid',
        amount: order.dpAmount,
        paymentMethod: 'manual_transfer',
        paidAt: now,
      })
    }

    // Advance order status to dp_paid if pending
    if (order.status === 'pending') {
      await db
        .update(orders)
        .set({ status: 'dp_paid', updatedAt: now })
        .where(eq(orders.id, orderId))

      await db.insert(orderStatusLogs).values({
        orderId,
        fromStatus: 'pending',
        toStatus: 'dp_paid',
        note: note || 'Pembayaran DP 70% dikonfirmasi manual oleh admin',
        changedBy: changedByUserId || null,
      })
    }
  } else if (type === 'final') {
    const existingFinal = await db.query.payments.findFirst({
      where: and(eq(payments.orderId, orderId), eq(payments.type, 'final')),
    })

    if (existingFinal) {
      await db
        .update(payments)
        .set({
          status: 'paid',
          paidAt: now,
          updatedAt: now,
          paymentMethod: existingFinal.paymentMethod || 'manual_transfer',
        })
        .where(eq(payments.id, existingFinal.id))
    } else {
      await db.insert(payments).values({
        orderId: order.id,
        tenantId: order.tenantId,
        type: 'final',
        status: 'paid',
        amount: order.finalAmount,
        paymentMethod: 'manual_transfer',
        paidAt: now,
      })
    }

    await db.insert(orderStatusLogs).values({
      orderId,
      fromStatus: order.status,
      toStatus: order.status,
      note: note || 'Pelunasan 30% dikonfirmasi manual oleh admin',
      changedBy: changedByUserId || null,
    })
  }

  return { success: true, type }
}
