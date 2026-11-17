import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'crypto'

const BASE_URL = 'http://localhost:3000'
const DUITKU_MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || 'DS35533'
const DUITKU_API_KEY = process.env.DUITKU_API_KEY || 'bfa8027d30754803f736d8b4a0533276'

interface AuthSession {
  cookie: string
  user: any
}

async function loginUser(email: string, password: string = 'ashirah123'): Promise<AuthSession> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.success).toBe(true)

  const setCookie = res.headers.get('set-cookie') || ''
  const cookieMatch = setCookie.match(/ashirah_auth_session=([^;]+)/)
  expect(cookieMatch).toBeTruthy()
  const cookie = `ashirah_auth_session=${cookieMatch![1]}`

  return { cookie, user: data.user }
}

describe('🏭 AshiraTech SaaS End-to-End Business Flow Testing', () => {
  let customerSession: AuthSession
  let adminSession: AuthSession
  let superAdminSession: AuthSession

  let testOrderId: string
  let testOrderNumber: string
  let testDpAmount: number
  let testFinalAmount: number
  let testMerchantOrderId: string

  beforeAll(async () => {
    // 1. Authenticate all 3 roles
    customerSession = await loginUser('customer@ashirah.com')
    adminSession = await loginUser('admin@ashirah.com')
    superAdminSession = await loginUser('superadmin@ashirah.com')

    expect(customerSession.user.role).toBe('customer')
    expect(adminSession.user.role).toBe('admin')
    expect(superAdminSession.user.role).toBe('super_admin')
  })

  // --------------------------------------------------------------------------
  // ROLE 1: CUSTOMER JOURNEY
  // --------------------------------------------------------------------------
  describe('👤 Skenario 1: Customer Journey (Order, 70:30 Split & Payment)', () => {
    it('TC-01: Customer can view active product catalog', async () => {
      const res = await fetch(`${BASE_URL}/api/products`, {
        headers: { Cookie: customerSession.cookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.products)).toBe(true)
      expect(data.products.length).toBeGreaterThan(0)
    })

    it('TC-02 & TC-03: Customer creates custom order with Canvas Blueprint & 70:30 pricing scheme', async () => {
      const subtotal = 1000000 // Rp 1.000.000
      const shippingCost = 50000 // Rp 50.000

      // Mock multi-zone blueprint from Canvas Editor
      const mockCanvasBlueprint = {
        front: {
          objects: [
            { type: 'text', text: 'Ashira Tech Squad', fontSize: 32, fill: '#000000', left: 150, top: 200 },
          ],
        },
        back: {
          objects: [
            { type: 'image', src: 'https://ashirah.com/assets/logo.png', width: 200, height: 100 },
          ],
        },
      }

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerSession.cookie,
        },
        body: JSON.stringify({
          tenantSlug: 'ashira-garment',
          items: [
            {
              productName: 'Kaos Cotton Combed 24s Premium Custom',
              color: 'Hitam Jet Black',
              size: 'L',
              quantity: 20,
              unitPrice: 50000,
              blueprintPerZone: mockCanvasBlueprint,
            },
          ],
          subtotal,
          shippingCost,
          designBlueprint: mockCanvasBlueprint,
          notes: 'Tolong sablon discharge rapi ya gan',
          shippingAddress: {
            name: 'Budi Santoso',
            phone: '081234567890',
            street: 'Jl. Riau No. 45',
            city: 'Bandung',
            province: 'Jawa Barat',
            postalCode: '40115',
            courierCode: 'jne',
            courierName: 'JNE Reguler',
          },
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.order).toBeDefined()

      testOrderId = data.order.id
      testOrderNumber = data.order.orderNumber
      testDpAmount = data.order.dpAmount
      testFinalAmount = data.order.finalAmount
      testMerchantOrderId = `${testOrderNumber}-DP`

      // Validate 70:30 calculation formula:
      // DP = 70% of subtotal + 100% shipping = 700.000 + 50.000 = 750.000
      // Final = 30% of subtotal = 300.000
      expect(testDpAmount).toBe(750000)
      expect(testFinalAmount).toBe(300000)
      expect(data.order.totalAmount).toBe(1050000)
      expect(data.order.platformFee).toBe(5000)
      expect(data.order.status).toBe('pending')
    })

    it('TC-04: Customer verifies order exists in their order tracker (/api/orders/[id])', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: customerSession.cookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.order.id).toBe(testOrderId)
      expect(data.order.status).toBe('pending')
      expect(data.order.designBlueprint).toBeDefined()
      expect(data.order.designBlueprint.front).toBeDefined()
    })

    it('TC-05: Duitku Webhook callback simulation processes DP payment with MD5 signature', async () => {
      // MD5(merchantCode + amount + merchantOrderId + apiKey)
      const amountStr = String(testDpAmount)
      const rawSignature = `${DUITKU_MERCHANT_CODE}${amountStr}${testMerchantOrderId}${DUITKU_API_KEY}`
      const signature = crypto.createHash('md5').update(rawSignature).digest('hex')

      const webhookPayload = {
        merchantCode: DUITKU_MERCHANT_CODE,
        amount: amountStr,
        merchantOrderId: testMerchantOrderId,
        signature,
        resultCode: '00', // 00 = SUCCESS
        reference: `DUITKU-REF-${Date.now()}`,
      }

      const res = await fetch(`${BASE_URL}/api/webhook/duitku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      })

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('SUCCESS')

      // Verify that order status automatically transitioned to 'dp_paid'
      const checkRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: customerSession.cookie },
      })
      const checkData = await checkRes.json()
      expect(checkData.order.status).toBe('dp_paid')

      // Verify payment record is marked 'paid'
      const dpPayment = checkData.order.payments.find((p: any) => p.type === 'dp')
      expect(dpPayment).toBeDefined()
      expect(dpPayment.status).toBe('paid')
    })
  })

  // --------------------------------------------------------------------------
  // ROLE 2: ADMIN (KLIEN KONVEKSI) JOURNEY
  // --------------------------------------------------------------------------
  describe('👔 Skenario 2: Admin Klien Konveksi Journey (Dashboard, Blueprint, Production & Dispatch)', () => {
    it('TC-06: Admin views order list and filters by status dp_paid', async () => {
      const res = await fetch(`${BASE_URL}/api/orders?status=dp_paid`, {
        headers: { Cookie: adminSession.cookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      const found = data.orders.find((o: any) => o.id === testOrderId)
      expect(found).toBeDefined()
      expect(found.status).toBe('dp_paid')
      expect(found.customer.name).toBe('Budi Santoso')
    })

    it('TC-07: Admin views Order Detail and verifies Blueprint and Item details', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: adminSession.cookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      const order = data.order
      expect(order.items.length).toBe(1)
      expect(order.items[0].productName).toContain('Cotton Combed')
      expect(order.items[0].quantity).toBe(20)

      // Blueprint check
      expect(order.designBlueprint).toBeDefined()
      expect(order.designBlueprint.front.objects[0].text).toBe('Ashira Tech Squad')
    })

    it('TC-08: Admin advances order status: dp_paid -> processing (Mulai Produksi)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          status: 'processing',
          note: 'Kain sudah dipotong, masuk ke meja sablon',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      // Verify status updated
      const checkRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: adminSession.cookie },
      })
      const checkData = await checkRes.json()
      expect(checkData.order.status).toBe('processing')
    })

    it('TC-09: Admin advances order status: processing -> ready (Produksi Selesai)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          status: 'ready',
          note: 'Quality Control lolos 100%, barang sudah dipacking rapi',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      const checkRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: adminSession.cookie },
      })
      const checkData = await checkRes.json()
      expect(checkData.order.status).toBe('ready')
    })

    it('TC-10: Admin confirms 30% Pelunasan Payment (Manual confirmation fallback)', async () => {
      const res = await fetch(`${BASE_URL}/api/payment/confirm-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          orderId: testOrderId,
          type: 'final',
          note: 'Customer transfer pelunasan 30% via BCA Konveksi',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      // Verify final payment record in DB is marked paid
      const checkRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: adminSession.cookie },
      })
      const checkData = await checkRes.json()
      const finalPayment = checkData.order.payments.find((p: any) => p.type === 'final')
      expect(finalPayment).toBeDefined()
      expect(finalPayment.status).toBe('paid')
      expect(finalPayment.amount).toBe(testFinalAmount)
    })

    it('TC-11: Admin creates shipment and inputs courier tracking resi (ready -> shipped)', async () => {
      const trackingNumber = 'JNE-BDG-202609228888'

      const res = await fetch(`${BASE_URL}/api/shipping/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          orderId: testOrderId,
          courierCode: 'jne',
          courierName: 'JNE Express Reguler',
          customTrackingNumber: trackingNumber,
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.trackingNumber).toBe(trackingNumber)
      expect(data.status).toBe('shipped')

      // Verify order status is shipped
      const checkRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: adminSession.cookie },
      })
      const checkData = await checkRes.json()
      expect(checkData.order.status).toBe('shipped')
      expect(checkData.order.shipment.trackingNumber).toBe(trackingNumber)
    })

    it('TC-12: Customer sees tracking resi and courier name on tracker page', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: customerSession.cookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.order.status).toBe('shipped')
      expect(data.order.shipment.courierName).toBe('JNE Express Reguler')
      expect(data.order.shipment.trackingNumber).toBe('JNE-BDG-202609228888')
    })

    it('TC-13: Admin marks order delivered (shipped -> delivered)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          status: 'delivered',
          note: 'Barang telah diterima oleh penerima di alamat tujuan',
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      const checkRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: customerSession.cookie },
      })
      const checkData = await checkRes.json()
      expect(checkData.order.status).toBe('delivered')
    })
  })

  // --------------------------------------------------------------------------
  // ROLE 3: SUPER ADMIN (ASHIRATECH PLATFORM PROVIDER) JOURNEY
  // --------------------------------------------------------------------------
  describe('👑 Skenario 3: Super Admin AshiraTech Journey (Platform Revenue & Clients)', () => {
    it('TC-14: SuperAdmin views overall platform stats & revenue monitoring', async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/stats`, {
        headers: { Cookie: superAdminSession.cookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      const stats = data.stats
      expect(stats.totalClients).toBeGreaterThanOrEqual(1)
      expect(stats.totalOrders).toBeGreaterThanOrEqual(1)
      expect(stats.totalPlatformFee).toBeGreaterThanOrEqual(5000)
      expect(stats.totalGmv).toBeGreaterThanOrEqual(1050000)

      // Check per-client statistics breakdown
      expect(Array.isArray(data.clientStats)).toBe(true)
      const ashiraClient = data.clientStats.find((c: any) => c.slug === 'ashira-garment')
      expect(ashiraClient).toBeDefined()
      expect(ashiraClient.totalOrders).toBeGreaterThanOrEqual(1)
      expect(ashiraClient.platformFeeEarned).toBeGreaterThanOrEqual(5000)
    })

    it('TC-15: SuperAdmin views all cross-tenant transactions', async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/transactions`, {
        headers: { Cookie: superAdminSession.cookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.transactions)).toBe(true)

      const tx = data.transactions.find((t: any) => t.orderNumber === testOrderNumber)
      expect(tx).toBeDefined()
      expect(tx.tenantName).toBeDefined()
      expect(tx.platformFee).toBe(5000)
    })

    it('TC-16: SuperAdmin can onboard a new client konveksi', async () => {
      const newSlug = `test-client-${Date.now()}`
      const res = await fetch(`${BASE_URL}/api/super-admin/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: superAdminSession.cookie,
        },
        body: JSON.stringify({
          name: 'Konveksi Maju Jaya Apparel',
          slug: newSlug,
          email: 'owner@majujaya.com',
          phone: '081299887711',
          address: 'Jl. Soreang No. 88, Bandung Selatan',
          description: 'Spesialis polo shirt dan jaket varsity',
          platformFeePerTransaction: 7500,
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.client.slug).toBe(newSlug)
      expect(data.client.settings.platformFeePerTransaction).toBe(7500)
    })
  })

  // --------------------------------------------------------------------------
  // SECURITY & STATE MACHINE INTEGRITY
  // --------------------------------------------------------------------------
  describe('🛡️ Skenario 4: RBAC & State Machine Integrity', () => {
    it('TC-17: Customer cannot access SuperAdmin endpoints (RBAC check)', async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/stats`, {
        headers: { Cookie: customerSession.cookie },
      })
      expect(res.status).toBe(403)
    })

    it('TC-18: Admin cannot access SuperAdmin endpoints (RBAC check)', async () => {
      const res = await fetch(`${BASE_URL}/api/super-admin/stats`, {
        headers: { Cookie: adminSession.cookie },
      })
      expect(res.status).toBe(403)
    })

    it('TC-19: State machine prevents illegal order status transition (e.g. delivered -> pending)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          status: 'pending',
          note: 'Illegal revert test',
        }),
      })

      // State machine throws error for illegal transition
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeDefined()
    })
  })

  // --------------------------------------------------------------------------
  // SKENARIO 5: FITUR OPERASIONAL KONVEKSI & SAMPLE APPROVAL (FASE 2 & FASE 3)
  // --------------------------------------------------------------------------
  describe('👕 Skenario 5: Fitur Operasional Konveksi & Sample Approval (Fase 2 & Fase 3)', () => {
    let sampleOrderId: string

    it('TC-20: MOQ Validation rejects order when total quantity < 12', async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerSession.cookie,
        },
        body: JSON.stringify({
          tenantSlug: 'ashira-garment',
          items: [
            {
              productName: 'Kaos Cotton Combed 24s',
              color: 'Hitam',
              size: 'L',
              quantity: 5, // Below MOQ 12
              unitPrice: 50000,
            },
          ],
          subtotal: 250000,
          shippingCost: 20000,
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Minimum pemesanan konveksi')
      expect(data.error).toContain('12')
    })

    it('TC-20b: Canvas Editor allows 1 pcs custom order with normal price (0% discount)', async () => {
      // 1. Init session with 1 pcs
      const initRes = await fetch(`${BASE_URL}/api/session/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: '1',
          category: 'Kaos',
          color: '#000000',
          quantities: 1,
        }),
      })
      expect(initRes.status).toBe(200)
      const initData = await initRes.json()
      expect(initData.tier).toBe(0) // Tier 0: 0% discount for < 12 pcs

      // 2. Customer agrees to proceed
      const negoRes = await fetch(`${BASE_URL}/api/negotiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': initData.sessionId,
        },
        body: JSON.stringify({ message: 'oke saya deal pesan' }),
      })
      expect(negoRes.status).toBe(200)
      const negoData = await negoRes.json()
      expect(negoData.agreedDiscount).toBe(0) // 0% discount

      // 3. Create payment for 1 pcs order
      const payRes = await fetch(`${BASE_URL}/api/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerSession.cookie,
        },
        body: JSON.stringify({
          sessionId: initData.sessionId,
          designBlueprint: { test: true },
        }),
      })
      expect(payRes.status).toBe(200)
      const payData = await payRes.json()
      expect(payData.success).toBe(true)
      expect(payData.orderNumber).toBeDefined()
    })

    it('TC-21: Admin can retrieve customer database with order aggregates (GET /api/admin/customers)', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/customers`, {
        headers: { Cookie: adminSession.cookie },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.customers)).toBe(true)
      expect(data.customers.length).toBeGreaterThan(0)

      const customer = data.customers.find((c: any) => c.email === 'customer@ashirah.com')
      expect(customer).toBeDefined()
      expect(customer.totalOrders).toBeGreaterThan(0)
    })

    it('TC-22: Admin can add internal production notes to order (POST /api/orders/[id]/notes)', async () => {
      // Create a valid order with quantity >= 12
      const createRes = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerSession.cookie,
        },
        body: JSON.stringify({
          tenantSlug: 'ashira-garment',
          items: [
            {
              productName: 'Polo Shirt Custom Sablon & Bordir',
              color: 'Navy Blue',
              size: 'XL',
              quantity: 15,
              unitPrice: 75000,
            },
          ],
          subtotal: 1125000,
          shippingCost: 30000,
        }),
      })

      expect(createRes.status).toBe(200)
      const createData = await createRes.json()
      sampleOrderId = createData.order.id

      // Add internal note
      const noteRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          note: 'Kain combed 24s gramasi 185gsm telah disiapkan di rak potong meja 2.',
        }),
      })

      expect(noteRes.status).toBe(200)
      const noteData = await noteRes.json()
      expect(noteData.success).toBe(true)
      expect(Array.isArray(noteData.internalNotes)).toBe(true)
      expect(noteData.internalNotes[0].note).toContain('rak potong meja 2')

      // Verify notes are hidden from customer
      const custGetRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}`, {
        headers: { Cookie: customerSession.cookie },
      })
      const custGetData = await custGetRes.json()
      expect(custGetData.order.internalNotes).toEqual([])
    })

    it('TC-23 & TC-24: Admin uploads sample photo -> Customer requests revision', async () => {
      // Confirm DP manual first so order can transition
      await fetch(`${BASE_URL}/api/payment/confirm-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({ orderId: sampleOrderId, type: 'dp' }),
      })

      // Move to processing
      await fetch(`${BASE_URL}/api/orders/${sampleOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({ status: 'processing', note: 'Mulai jahit sample' }),
      })

      // Admin uploads sample proof
      const sampleRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}/sample`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          photoUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
          note: 'Sample cetak bordir dada sudah selesai, mohon dicek kerapiannya.',
        }),
      })

      expect(sampleRes.status).toBe(200)
      const sampleData = await sampleRes.json()
      expect(sampleData.success).toBe(true)

      // Verify order status is sample_review
      const orderRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}`, {
        headers: { Cookie: adminSession.cookie },
      })
      const orderData = await orderRes.json()
      expect(orderData.order.status).toBe('sample_review')
      expect(orderData.order.samplePhotoUrl).toBe('https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800')

      // Customer reviews and requests revision (reject)
      const rejectRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}/sample/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerSession.cookie,
        },
        body: JSON.stringify({
          action: 'reject',
          feedback: 'Warna bordir tolong diganti jadi putih bersih ya mas, jangan krem.',
        }),
      })

      expect(rejectRes.status).toBe(200)
      const rejectData = await rejectRes.json()
      expect(rejectData.action).toBe('rejected')

      // Verify order status is now sample_rejected
      const rejectedOrderRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}`, {
        headers: { Cookie: adminSession.cookie },
      })
      const rejectedOrderData = await rejectedOrderRes.json()
      expect(rejectedOrderData.order.status).toBe('sample_rejected')
      expect(rejectedOrderData.order.sampleFeedback).toContain('putih bersih')
    })

    it('TC-25: Admin re-uploads sample -> Customer approves -> Order moves to ready', async () => {
      // Admin moves back to processing for rework
      const reworkRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({ status: 'processing', note: 'Memperbaiki warna bordir' }),
      })
      expect(reworkRes.status).toBe(200)

      // Admin uploads revised sample
      const reuploadRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}/sample`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          photoUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800',
          note: 'Sample revisi dengan benang putih bersih sudah selesai.',
        }),
      })
      expect(reuploadRes.status).toBe(200)

      // Customer approves sample
      const approveRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}/sample/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerSession.cookie,
        },
        body: JSON.stringify({
          action: 'approve',
          feedback: 'Bordir putih sudah sempurna, lanjut produksi masal ya!',
        }),
      })

      expect(approveRes.status).toBe(200)
      const approveData = await approveRes.json()
      expect(approveData.action).toBe('approved')

      // Verify order status is now ready
      const readyOrderRes = await fetch(`${BASE_URL}/api/orders/${sampleOrderId}`, {
        headers: { Cookie: adminSession.cookie },
      })
      const readyOrderData = await readyOrderRes.json()
      expect(readyOrderData.order.status).toBe('ready')
    })
  })

  // --------------------------------------------------------------------------
  // ROLE 6: PROFIL KONVEKSI, LOGO USAHA & GATE INVOICE HITAM-PUTIH
  // --------------------------------------------------------------------------
  describe('🎨 Skenario 6: Profil Konveksi, Logo Usaha & Gate Faktur Resmi B&W', () => {
    it('TC-26: Admin can fetch their tenant profile (GET /api/admin/profile)', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/profile`, {
        headers: { Cookie: adminSession.cookie },
      })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.tenant).toBeDefined()
      expect(data.tenant.name).toBeTruthy()
    })

    it('TC-27: Customer cannot update tenant profile (RBAC check 403)', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerSession.cookie,
        },
        body: JSON.stringify({
          name: 'Hacked Tenant Name',
        }),
      })
      expect(res.status).toBe(403)
    })

    it('TC-28: Admin updates tenant profile and registers official logo and bank account', async () => {
      const testLogoUrl = 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300'
      const updateRes = await fetch(`${BASE_URL}/api/admin/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminSession.cookie,
        },
        body: JSON.stringify({
          logoUrl: testLogoUrl,
          phone: '+62 812-9988-7766',
          email: 'official@ashiragarment.com',
          contactWhatsapp: '+62 812-9988-7766',
          bankAccount: {
            bankName: 'BCA',
            accountNumber: '8830129841',
            accountHolder: 'PT Ashira Garment Indonesia',
          },
        }),
      })

      expect(updateRes.status).toBe(200)
      const updateData = await updateRes.json()
      expect(updateData.success).toBe(true)
      expect(updateData.tenant.logoUrl).toBe(testLogoUrl)

      // Verify updated profile persists on GET
      const verifyRes = await fetch(`${BASE_URL}/api/admin/profile`, {
        headers: { Cookie: adminSession.cookie },
      })
      const verifyData = await verifyRes.json()
      expect(verifyData.tenant.logoUrl).toBe(testLogoUrl)
      expect(verifyData.tenant.settings?.bankAccount?.bankName).toBe('BCA')
    })

    it('TC-29: Order detail includes registered logoUrl for black & white invoice generation', async () => {
      const orderRes = await fetch(`${BASE_URL}/api/orders/${testOrderId}`, {
        headers: { Cookie: adminSession.cookie },
      })
      expect(orderRes.status).toBe(200)
      const orderData = await orderRes.json()
      expect(orderData.order.tenant).toBeDefined()
      expect(orderData.order.tenant.logoUrl).toBeTruthy()
    })

    it('TC-30: Blueprint snapshot is preserved with zone assets for production admin', async () => {
      const mockSnapshot = {
        zones: [
          {
            zone: 'front',
            hasDesign: true,
            mockupUrl: '/mockups/tshirt/white/front.png',
            assets: [
              {
                zone: 'front',
                src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                name: 'Logo Dada Kiri',
                left: 200,
                top: 250,
                width: 100,
                height: 100,
                scaleX: 1,
                scaleY: 1,
                angle: 0,
              },
            ],
          },
        ],
        category: 'tshirt',
        colorHex: '#FFFFFF',
        canvasWidth: 500,
        canvasHeight: 650,
        capturedAt: Date.now(),
      }

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: customerSession.cookie,
        },
        body: JSON.stringify({
          tenantSlug: 'ashira-garment',
          items: [
            {
              productName: 'Kaos DTF Sablon',
              color: 'White',
              size: 'L',
              quantity: 12,
              unitPrice: 60000,
            },
          ],
          subtotal: 720000,
          designBlueprint: mockSnapshot,
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.order.designBlueprint.zones).toBeDefined()
      expect(data.order.designBlueprint.zones[0].assets.length).toBe(1)
      expect(data.order.designBlueprint.zones[0].assets[0].name).toBe('Logo Dada Kiri')

      // Verify admin can fetch blueprint
      const adminGetRes = await fetch(`${BASE_URL}/api/orders/${data.order.id}`, {
        headers: { Cookie: adminSession.cookie },
      })
      expect(adminGetRes.status).toBe(200)
      const adminGetData = await adminGetRes.json()
      expect(adminGetData.order.designBlueprint.zones).toBeDefined()
      expect(adminGetData.order.designBlueprint.zones[0].zone).toBe('front')
    })
  })
})

