import { createHmac } from 'crypto'

const DUITKU_SANDBOX_URL = 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
const DUITKU_PRODUCTION_URL = 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry'

const DUITKU_SANDBOX_METHODS_URL = 'https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod'
const DUITKU_PRODUCTION_METHODS_URL = 'https://passport.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod'

export interface DuitkuPaymentMethod {
  paymentMethod: string
  paymentName: string
  paymentImage: string
  totalFee: string
}

export interface DuitkuGetPaymentMethodsResponse {
  paymentFee: DuitkuPaymentMethod[]
  responseCode: string
  responseMessage: string
}

export interface DuitkuItemDetail {
  name: string
  price: number
  quantity: number
}

export interface DuitkuCreateTransactionParams {
  merchantOrderId: string
  paymentAmount: number
  productDetails: string
  email: string
  customerVaName: string
  itemDetails?: DuitkuItemDetail[]
  returnUrl: string
  callbackUrl: string
  paymentMethod?: string
  expiryPeriod?: number
}

export interface DuitkuTransactionResponse {
  merchantCode: string
  reference: string
  paymentUrl: string
  vaNumber?: string
  qrString?: string
  amount: string
  statusCode: string
  statusMessage: string
}

function generateSignature(
  merchantCode: string,
  merchantOrderId: string,
  paymentAmount: number,
  apiKey: string
): string {
  const stringToSign = `${merchantCode}${merchantOrderId}${paymentAmount}`
  return createHmac('sha256', apiKey).update(stringToSign).digest('hex')
}

export async function createDuitkuTransaction(
  params: DuitkuCreateTransactionParams
): Promise<DuitkuTransactionResponse> {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE!
  const apiKey = process.env.DUITKU_API_KEY!
  const isProduction = process.env.DUITKU_IS_PRODUCTION === 'true'

  if (!merchantCode || !apiKey) {
    throw new Error('[Duitku] DUITKU_MERCHANT_CODE atau DUITKU_API_KEY belum dikonfigurasi.')
  }

  const signature = generateSignature(
    merchantCode,
    params.merchantOrderId,
    params.paymentAmount,
    apiKey
  )

  const body: Record<string, unknown> = {
    merchantCode,
    paymentAmount: params.paymentAmount,
    paymentMethod: params.paymentMethod ?? 'OV',
    merchantOrderId: params.merchantOrderId,
    productDetails: params.productDetails,
    additionalParam: '',
    merchantUserInfo: '',
    customerVaName: params.customerVaName,
    email: params.email,
    phoneNumber: '',
    customerDetail: {
      firstName: params.customerVaName,
      lastName: '',
      email: params.email,
    },
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
    signature,
    expiryPeriod: params.expiryPeriod ?? 1440,
  }

  // itemDetails bersifat opsional — hanya kirim kalau ada,
  // karena Duitku validasi price*qty harus == paymentAmount
  if (params.itemDetails && params.itemDetails.length > 0) {
    body.itemDetails = params.itemDetails
  }

  const url = isProduction ? DUITKU_PRODUCTION_URL : DUITKU_SANDBOX_URL

  console.log('[AshirahBot] Creating Duitku transaction:', {
    merchantOrderId: params.merchantOrderId,
    paymentAmount: params.paymentAmount,
    isProduction,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '(no body)')
    throw new Error(`[Duitku] HTTP ${res.status}: ${errBody}`)
  }

  const data = (await res.json()) as DuitkuTransactionResponse

  if (data.statusCode !== '00') {
    throw new Error(`[Duitku] Transaction failed: ${data.statusMessage} (code: ${data.statusCode})`)
  }

  return data
}

function generateMethodsSignature(
  merchantCode: string,
  amount: number,
  datetime: string,
  apiKey: string
): string {
  const stringToSign = `${merchantCode}${amount}${datetime}`
  return createHmac('sha256', apiKey).update(stringToSign).digest('hex')
}

/**
 * Fetch daftar payment method yang aktif dari project Duitku.
 * @param amount - nominal transaksi, dipakai untuk kalkulasi fee per channel
 */
export async function getDuitkuPaymentMethods(
  amount: number
): Promise<DuitkuPaymentMethod[]> {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE!
  const apiKey = process.env.DUITKU_API_KEY!
  const isProduction = process.env.DUITKU_IS_PRODUCTION === 'true'

  if (!merchantCode || !apiKey) {
    throw new Error('[Duitku] DUITKU_MERCHANT_CODE atau DUITKU_API_KEY belum dikonfigurasi.')
  }

  const datetime = new Date()
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19)

  const signature = generateMethodsSignature(merchantCode, amount, datetime, apiKey)

  const body = {
    merchantcode: merchantCode,
    amount,
    datetime,
    signature,
  }

  const url = isProduction ? DUITKU_PRODUCTION_METHODS_URL : DUITKU_SANDBOX_METHODS_URL

  console.log('[AshirahBot] Fetching Duitku payment methods:', { amount, isProduction })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '(no body)')
    throw new Error(`[Duitku] HTTP ${res.status}: ${errBody}`)
  }

  const data = (await res.json()) as DuitkuGetPaymentMethodsResponse

  if (data.responseCode !== '00') {
    throw new Error(`[Duitku] Get payment methods failed: ${data.responseMessage}`)
  }

  return data.paymentFee
}
