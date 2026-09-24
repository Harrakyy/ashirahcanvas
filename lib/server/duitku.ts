/**
 * lib/server/duitku.ts
 *
 * Duitku Payment Gateway Client (v2 API).
 * Zero external dependencies: uses native Node.js crypto (MD5).
 * Supports both DP (70% + shipping) and Final (30%) payment transactions.
 */

import crypto from 'crypto'

export interface DuitkuItemDetail {
  name: string
  price: number
  quantity: number
}

export interface CreateDuitkuPaymentParams {
  merchantOrderId: string
  paymentAmount: number
  productDetails: string
  email: string
  phoneNumber?: string
  customerName: string
  itemDetails?: DuitkuItemDetail[]
  callbackUrl?: string
  returnUrl?: string
  expiryMinutes?: number
}

export interface DuitkuPaymentResponse {
  statusCode: string
  statusMessage: string
  paymentUrl: string
  reference: string
  merchantCode: string
}

export interface DuitkuCallbackBody {
  merchantCode?: string
  amount?: string | number
  merchantOrderId?: string
  signature?: string
  resultCode?: string
  reference?: string
  additionalParam?: string
}

export class DuitkuClient {
  private merchantCode: string
  private apiKey: string
  private isProduction: boolean
  private baseUrl: string

  constructor() {
    this.merchantCode = process.env.DUITKU_MERCHANT_CODE || 'D12345'
    this.apiKey = process.env.DUITKU_API_KEY || 'duitku_sandbox_api_key'
    this.isProduction = process.env.DUITKU_ENV === 'production'
    this.baseUrl = this.isProduction
      ? 'https://passport.duitku.com/webapi'
      : 'https://sandbox.duitku.com/webapi'
  }

  /**
   * Generates MD5 signature for transaction creation:
   * MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
   */
  public generateRequestSignature(merchantOrderId: string, paymentAmount: number): string {
    const raw = `${this.merchantCode}${merchantOrderId}${paymentAmount}${this.apiKey}`
    return crypto.createHash('md5').update(raw).digest('hex')
  }

  /**
   * Verifies MD5 signature on incoming webhook notification:
   * MD5(merchantCode + amount + merchantOrderId + apiKey)
   */
  public verifyCallbackSignature(params: {
    merchantCode: string
    amount: string | number
    merchantOrderId: string
    signature: string
  }): boolean {
    const raw = `${params.merchantCode}${params.amount}${params.merchantOrderId}${this.apiKey}`
    const expected = crypto.createHash('md5').update(raw).digest('hex')
    return expected.toLowerCase() === params.signature.toLowerCase()
  }

  /**
   * Creates a transaction invoice on Duitku.
   */
  public async createTransaction(params: CreateDuitkuPaymentParams): Promise<DuitkuPaymentResponse> {
    const signature = this.generateRequestSignature(params.merchantOrderId, params.paymentAmount)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const callbackUrl = params.callbackUrl || `${appUrl}/api/webhook/duitku`
    const returnUrl = params.returnUrl || `${appUrl}/payment/success?order_id=${encodeURIComponent(params.merchantOrderId)}`

    const payload = {
      merchantCode: this.merchantCode,
      paymentAmount: params.paymentAmount,
      paymentMethod: '', // Empty shows all available payment methods in Duitku portal
      merchantOrderId: params.merchantOrderId,
      productDetails: params.productDetails,
      additionalParam: '',
      merchantUserInfo: '',
      customerVaName: params.customerName,
      email: params.email,
      phoneNumber: params.phoneNumber || '',
      itemDetails: params.itemDetails || [
        {
          name: params.productDetails,
          price: params.paymentAmount,
          quantity: 1,
        },
      ],
      callbackUrl,
      returnUrl,
      signature,
      expiryPeriod: params.expiryMinutes || 1440, // 24 hours
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/merchant/v2/inquiry.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const textErr = await response.text()
        console.warn('[Duitku] HTTP Error response:', textErr)
        throw new Error(`Duitku HTTP Error ${response.status}: ${textErr}`)
      }

      const data = await response.json()

      if (data.statusCode === '00' && data.paymentUrl) {
        return {
          statusCode: data.statusCode,
          statusMessage: data.statusMessage || 'SUCCESS',
          paymentUrl: data.paymentUrl,
          reference: data.reference,
          merchantCode: this.merchantCode,
        }
      }

      console.warn('[Duitku] Unsuccessful status code:', data)
      throw new Error(data.statusMessage || 'Gagal membuat invoice Duitku')
    } catch (networkError) {
      // In production or when mock is disabled, throw the error directly!
      if (this.isProduction || process.env.DUITKU_MOCK !== 'true') {
        console.error('[Duitku] API transaction creation failed:', networkError)
        throw new Error(
          networkError instanceof Error
            ? networkError.message
            : 'Gagal terhubung ke gateway pembayaran Duitku'
        )
      }

      console.warn('[Duitku] Sandbox API error, DUITKU_MOCK is enabled, activating mock fallback:', networkError)

      // Fallback sandbox simulation for local offline dev or testing without valid keys
      const mockReference = `MOCK-DUITKU-${Date.now()}`
      const mockPaymentUrl = `${appUrl}/payment/mock?orderId=${encodeURIComponent(params.merchantOrderId)}&amount=${params.paymentAmount}&reference=${mockReference}`

      return {
        statusCode: '00',
        statusMessage: 'MOCK_SANDBOX_SUCCESS',
        paymentUrl: mockPaymentUrl,
        reference: mockReference,
        merchantCode: this.merchantCode,
      }
    }
  }

  /**
   * Check status of a transaction with Duitku
   */
  public async checkTransactionStatus(merchantOrderId: string): Promise<{
    statusCode: string
    statusMessage: string
    amount?: number
    reference?: string
  }> {
    const raw = `${this.merchantCode}${merchantOrderId}${this.apiKey}`
    const signature = crypto.createHash('md5').update(raw).digest('hex')

    try {
      const response = await fetch(`${this.baseUrl}/api/merchant/transactionStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode: this.merchantCode,
          merchantOrderId,
          signature,
        }),
      })

      if (!response.ok) {
        return { statusCode: '01', statusMessage: 'Check status failed' }
      }

      return await response.json()
    } catch (err) {
      console.error('[Duitku] Check status error:', err)
      return { statusCode: '99', statusMessage: 'Network error' }
    }
  }
}

export const duitku = new DuitkuClient()
