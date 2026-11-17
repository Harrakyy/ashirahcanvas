import { NextResponse } from 'next/server'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, tenants, users } from '@/lib/db/schema'
import { createOrder } from '@/lib/server/order'
import { duitku } from '@/lib/server/duitku'
import { payments } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'
import { sendOrderCreatedEmail } from '@/lib/server/email'
import { getTenantMOQ, getTenantById } from '@/lib/server/tenant'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Harap masuk terlebih dahulu' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')
    const tenantFilter = searchParams.get('tenantId')

    let whereClause = undefined

    if (user.role === 'customer') {
      // Customer only sees their own orders
      whereClause = eq(orders.customerId, user.id)
    } else if (user.role === 'admin') {
      // Admin only sees their tenant orders
      const tenantId = user.tenantId
      if (tenantId) {
        whereClause = eq(orders.tenantId, tenantId)
      }
    } else if (user.role === 'super_admin') {
      // Super admin can filter by tenant or see all
      if (tenantFilter) {
        whereClause = eq(orders.tenantId, tenantFilter)
      }
    }

    const orderList = await db.query.orders.findMany({
      where: whereClause,
      orderBy: [desc(orders.createdAt)],
      with: {
        customer: true,
        tenant: true,
        items: true,
        payments: true,
        shipment: true,
      },
    })

    const filtered = statusFilter
      ? orderList.filter((o) => o.status === statusFilter)
      : orderList

    return NextResponse.json({
      success: true,
      orders: filtered,
      total: filtered.length,
    })
  } catch (error) {
    console.error('[Orders API] GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat daftar pesanan' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()

    const {
      tenantId: rawTenantId,
      tenantSlug,
      items,
      subtotal,
      shippingCost = 0,
      shippingAddress,
      designBlueprint,
      notes,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Pesanan harus memiliki minimal 1 item' }, { status: 400 })
    }

    if (!subtotal || subtotal <= 0) {
      return NextResponse.json({ error: 'Total harga tidak valid' }, { status: 400 })
    }

    // Resolve tenant
    let resolvedTenantId = rawTenantId
    if (!resolvedTenantId && user?.tenantId) {
      resolvedTenantId = user.tenantId
    }
    if (!resolvedTenantId && tenantSlug) {
      const foundTenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, tenantSlug),
      })
      if (foundTenant) {
        resolvedTenantId = foundTenant.id
      }
    }

    if (!resolvedTenantId) {
      const ashiraTenant = await db.query.tenants.findFirst({
        where: eq(tenants.slug, 'ashira-garment'),
      })
      resolvedTenantId = ashiraTenant?.id || (await db.query.tenants.findFirst())?.id || 'demo-tenant-id'
    }

    // Validate MOQ (Minimum Order Quantity konveksi)
    const totalQuantity = items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0)
    const tenantMoq = await getTenantMOQ(resolvedTenantId)
    if (totalQuantity < tenantMoq) {
      return NextResponse.json(
        {
          error: `Minimum pemesanan konveksi adalah ${tenantMoq} pcs. Pesanan Anda saat ini hanya ${totalQuantity} pcs.`,
        },
        { status: 400 }
      )
    }

    // Resolve customer
    let customerId = user?.id
    if (!customerId) {
      const demoCust = await db.query.users.findFirst({
        where: eq(users.email, 'customer@ashirah.com'),
      })
      customerId = demoCust?.id
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan. Silakan daftar atau login terlebih dahulu.' },
        { status: 401 }
      )
    }

    // 1. Create order in PostgreSQL
    const newOrder = await createOrder({
      tenantId: resolvedTenantId,
      customerId,
      items,
      subtotal: Number(subtotal),
      shippingCost: Number(shippingCost),
      designBlueprint: designBlueprint || {},
      notes: notes || '',
      shippingAddress: shippingAddress || {
        name: user?.name || 'Customer',
        phone: user?.phone || '08123456789',
        street: 'Alamat Pengiriman',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40132',
      },
    })

    // 2. Generate Duitku DP payment transaction
    const merchantOrderId = `${newOrder.orderNumber}-DP`
    const dpAmount = newOrder.dpAmount

    let paymentUrl = ''
    try {
      const duitkuRes = await duitku.createTransaction({
        merchantOrderId,
        paymentAmount: dpAmount,
        productDetails: `DP 70% + Ongkir (${newOrder.orderNumber})`,
        email: user?.email || 'customer@ashirah.com',
        customerName: user?.name || 'Customer',
        phoneNumber: user?.phone || '',
      })

      paymentUrl = duitkuRes.paymentUrl

      // Save initial DP payment record
      await db.insert(payments).values({
        orderId: newOrder.id,
        tenantId: resolvedTenantId,
        type: 'dp',
        status: 'pending',
        amount: dpAmount,
        duitkuReference: duitkuRes.reference,
        duitkuMerchantCode: duitkuRes.merchantCode,
        paymentUrl: duitkuRes.paymentUrl,
      })
    } catch (paymentErr) {
      console.warn('[Orders API] Duitku DP creation failed, will allow manual pay later:', paymentErr)
    }

    // Trigger email notification to customer (non-blocking)
    // Fetch tenant email for reply-to — tenant sudah di-resolve di atas
    getTenantById(resolvedTenantId).then((tenant) => {
      if (user?.email) {
        sendOrderCreatedEmail({
          customerEmail: user.email,
          customerName: user.name || shippingAddress?.name || 'Customer',
          orderNumber: newOrder.orderNumber,
          tenantName: tenant?.name || 'Ashira Garment',
          tenantEmail: tenant?.email,
          dpAmount,
          totalAmount: newOrder.totalAmount,
          paymentUrl: paymentUrl || `${process.env.NEXT_PUBLIC_APP_URL || ''}/orders`,
        }).catch((e) => console.warn('[Email] Error sending order created email:', e))
      }
    }).catch((e) => console.warn('[Email] Error fetching tenant for email:', e))

    return NextResponse.json({
      success: true,
      order: newOrder,
      paymentUrl,
      message: 'Pesanan berhasil dibuat. Silakan selesaikan pembayaran DP.',
    })
  } catch (error) {
    console.error('[Orders API] POST error:', error)
    return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 })
  }
}
