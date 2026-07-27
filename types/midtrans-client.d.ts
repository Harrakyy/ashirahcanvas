declare module 'midtrans-client' {
  interface SnapOptions {
    isProduction: boolean
    serverKey: string
    clientKey?: string
  }

  interface TransactionParameter {
    transaction_details: {
      order_id: string
      gross_amount: number
    }
    item_details?: Array<{
      id: string
      name: string
      price: number
      quantity: number
      brand?: string
      category?: string
    }>
    customer_details?: {
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
    }
    callbacks?: {
      finish?: string
      unfinish?: string
      error?: string
    }
  }

  interface TransactionResult {
    token: string
    redirect_url: string
  }

  interface Notification {
    transaction_status: string
    order_id: string
    gross_amount: string
    payment_type: string
    transaction_time: string
    transaction_id: string
    status_code: string
    status_message: string
    fraud_status: string
  }

  class Snap {
    constructor(options: SnapOptions)
    createTransaction(parameter: TransactionParameter): Promise<TransactionResult>
  }

  class CoreApi {
    constructor(options: SnapOptions)
    transaction: {
      notification(notification: Record<string, unknown>): Promise<Notification>
    }
  }

  class MidtransError extends Error {
    message: string
    httpStatusCode: number
    details: Record<string, unknown>
  }
}
