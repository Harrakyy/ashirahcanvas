import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { payments, tenants, users } from '@/lib/db/schema'
import { getSession, deleteSession } from '@/lib/server/session-store'
import { getOfferedPrice, getTotalPrice } from '@/lib/server/negotiation-state'
import { duitku } from '@/lib/server/duitku'
import { createOrder } from '@/lib/server/order'
import { getCurrentUser } from '@/lib/server/auth'
import { getTenantMOQ } from '@/lib/server/tenant'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, designBlueprint, shippingAddress: customShippingAddress } = body

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.agreedDiscount === null || session.agreedDiscount === undefined) {
      return NextResponse.json(
        { error: 'Negosiasi belum selesai. Harap selesaikan negosiasi terlebih dahulu.' },
        { status: 400 }
      )
    }

    if (!session.quantity || session.quantity < 1) {
      return NextResponse.json(
        { error: 'Jumlah pesanan tidak valid' },
        { status: 400 }
      )
    }

    // 1. Resolve Customer (current logged-in user or demo fallback)
    let user = await getCurrentUser()
    let customerId = user?.id

    if (!customerId) {
      const demoCust = await db.query.users.findFirst({
        where: eq(users.email, 'customer@ashirah.com'),
      })
      if (demoCust) {
        customerId = demoCust.id
        user = {
          id: demoCust.id,
          tenantId: demoCust.tenantId,
          name: demoCust.name,
          email: demoCust.email,
          role: demoCust.role as any,
          avatarUrl: demoCust.avatarUrl || '',
          phone: demoCust.phone || '',
        }
      }
    }

    // 2. Resolve Tenant
    let tenantId = user?.tenantId
    if (!tenantId) {
      const ashiraTenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, 'ashira-garment'),
      })
      tenantId = ashiraTenant?.id || (await db.query.tenants.findFirst())?.id
    }
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant konveksi belum terkonfigurasi di sistem' },
        { status: 500 }
      )
    }

    // Diskon hanya berlaku untuk pemesanan minimal 12 pcs
    if (session.quantity < 12 && session.agreedDiscount && session.agreedDiscount > 0) {
      return NextResponse.json(
        { error: 'Diskon hanya berlaku untuk pemesanan minimal 12 pcs.' },
        { status: 400 }
      )
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan. Silakan masuk terlebih dahulu.' },
        { status: 401 }
      )
    }

    // Lookup customer profile for shipping address
    const dbCustomer = await db.query.users.findFirst({
      where: eq(users.id, customerId),
    })

    const finalShippingAddress = customShippingAddress || {
      name: dbCustomer?.address?.receiverName || dbCustomer?.name || user?.name || 'Customer Ashirah',
      phone: dbCustomer?.address?.receiverPhone || dbCustomer?.phone || user?.phone || '08123456789',
      street: dbCustomer?.address?.street || 'Jl. Dipatiukur No. 102',
      subdistrict: dbCustomer?.address?.subdistrict || 'Coblong',
      city: dbCustomer?.address?.city || 'Bandung',
      province: dbCustomer?.address?.province || 'Jawa Barat',
      postalCode: dbCustomer?.address?.postalCode || '40132',
    }

    const offeredPrice = getOfferedPrice(session)
    const grossAmount = getTotalPrice(session)

    // 3. Create Order & initial records in DB
    const newOrder = await createOrder({
      tenantId,
      customerId,
      items: [
        {
          productId: session.productId || undefined,
          productName: `Kaos Custom (${session.category || 'Custom'} - ${session.color || 'Custom'})`,
          color: session.color || 'Custom',
          size: 'M',
          quantity: session.quantity,
          unitPrice: offeredPrice,
          discountPercent: session.agreedDiscount || 0,
          blueprintPerZone: (designBlueprint as Record<string, unknown>) || {},
        },
      ],
      subtotal: grossAmount,
      shippingCost: 0,
      designBlueprint: designBlueprint || {},
      notes: `Pesanan via Canvas Studio & AI Negotiation (Diskon: ${session.agreedDiscount}%)`,
      shippingAddress: finalShippingAddress,
    })

    const merchantOrderId = `${newOrder.orderNumber}-DP`

    console.log('[Payment] Creating Duitku transaction for negotiation order:', {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      merchantOrderId,
      grossAmount,
      offeredPrice,
      quantity: session.quantity,
      discount: session.agreedDiscount,
    })

    // 4. Request Duitku transaction
    const transaction = await duitku.createTransaction({
      merchantOrderId,
      paymentAmount: grossAmount,
      productDetails: `Kaos Custom Ashirah (${session.category || 'Custom'} - ${session.color}) - ${newOrder.orderNumber}`,
      email: dbCustomer?.email || user?.email || 'customer@ashirah.com',
      customerName: dbCustomer?.name || user?.name || 'Customer Ashirah',
      phoneNumber: dbCustomer?.phone || user?.phone || '',
      itemDetails: [
        {
          name: `Kaos Custom (${session.category || 'Custom'} - ${session.color || 'Custom'})`,
          price: offeredPrice,
          quantity: session.quantity,
        },
      ],
    })

    // 5. Insert payment record in DB
    const [paymentRecord] = await db
      .insert(payments)
      .values({
        orderId: newOrder.id,
        tenantId,
        type: 'dp',
        status: 'pending',
        amount: grossAmount,
        duitkuReference: transaction.reference,
        duitkuMerchantCode: transaction.merchantCode,
        paymentUrl: transaction.paymentUrl,
      })
      .returning()

    // 6. Delete consumed negotiation session from Redis so it cannot be reused
    await deleteSession(sessionId).catch((err) =>
      console.warn('[Payment API] Non-critical error deleting consumed session:', err)
    )

    return NextResponse.json({
      success: true,
      paymentUrl: transaction.paymentUrl,
      redirectUrl: transaction.paymentUrl,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      paymentId: paymentRecord.id,
      reference: transaction.reference,
    })
  } catch (error) {
    console.error('[Payment API] Duitku payment creation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal membuat transaksi pembayaran Duitku' },
      { status: 500 }
    )
  }
}

// Touched for Turbopack re-evaluation
