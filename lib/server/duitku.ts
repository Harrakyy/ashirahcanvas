/**
 * OWNERSHIP: Backend
 * Duitku payment gateway client — pengganti Midtrans.
 * Hanya dipakai di server-side (API routes). Lihat ARCHITECTURE.md.
 *
 * Docs: https://docs.duitku.com/api/en/#request-transaction
 * Signature: HMAC_SHA256(merchantCode + merchantOrderId + paymentAmount, apiKey)
 */
import { createHmac } from 'crypto'

const DUITKU_SANDBOX_URL = 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry'
const DUITKU_PRODUCTION_URL = 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry'

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
  /** Payment method code. Kosong = tampilkan semua channel aktif. */
  paymentMethod?: string
  /** Expiry dalam menit. Default: 1440 (24 jam). */
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

  const body = {
    merchantCode,
    paymentAmount: params.paymentAmount,
    paymentMethod: params.paymentMethod ?? '',
    merchantOrderId: params.merchantOrderId,
    productDetails: params.productDetails,
    additionalParam: '',
    merchantUserInfo: '',
    customerVaName: params.customerVaName,
    email: params.email,
    phoneNumber: '',
    itemDetails: params.itemDetails ?? [],
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
