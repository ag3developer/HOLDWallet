/**
 * Bill Payment Service
 * ====================
 *
 * Serviço para pagamento de boletos usando crypto.
 *
 * Fluxo:
 * 1. Escanear/digitar código de barras
 * 2. Validar boleto
 * 3. Cotar pagamento (valor + taxas 5%)
 * 4. Confirmar e debitar crypto IMEDIATAMENTE
 * 5. Boleto é pago pela operação em até 24h úteis
 */

import { apiClient } from './api'

// ============================================
// TIPOS E INTERFACES
// ============================================

export type BillType = 'BANK_SLIP' | 'UTILITY' | 'TAX' | 'OTHER'
export type BillPaymentStatus =
  | 'PENDING'
  | 'CRYPTO_DEBITED'
  | 'PROCESSING'
  | 'PAYING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'EXPIRED'

export interface BillInfo {
  valid: boolean
  error_message?: string
  barcode: string
  digitable_line?: string
  bill_type: BillType
  amount_brl: number
  due_date: string
  days_until_due: number
  due_date_valid: boolean
  due_date_warning?: string
  beneficiary_name?: string
  beneficiary_document?: string
  bank_code?: string
  bank_name?: string
}

export interface QuoteBillPaymentRequest {
  barcode: string
  crypto_currency: string
  crypto_network?: string
}

export interface BillPaymentQuote {
  quote_id: string
  barcode: string
  bill_amount_brl: number
  due_date: string
  beneficiary_name?: string
  crypto_currency: string
  crypto_network?: string
  crypto_amount: number
  crypto_usd_rate: number
  brl_usd_rate: number
  service_fee_percent: number
  service_fee_brl: number
  network_fee_percent: number
  network_fee_brl: number
  total_fees_brl: number
  total_amount_brl: number
  total_crypto_amount: number
  quote_expires_at: string
  quote_valid_seconds: number
  user_crypto_balance: number
  has_sufficient_balance: boolean
  summary: {
    bill: string
    fees: string
    total_brl: string
    crypto: string
    rate: string
  }
}

export interface ConfirmBillPaymentRequest {
  quote_id: string
  confirm_debit: boolean
}

export interface BillPayment {
  id: string
  payment_number: string
  status: BillPaymentStatus
  barcode: string
  bill_amount_brl: number
  due_date: string
  beneficiary_name?: string
  bank_name?: string
  crypto_currency: string
  crypto_amount: number
  crypto_network?: string
  total_amount_brl: number
  service_fee_brl: number
  network_fee_brl: number
  created_at: string
  crypto_debited_at?: string
  paid_at?: string
  payment_receipt_url?: string
  bank_authentication?: string
  status_message: string
}

export interface BillPaymentListResponse {
  payments: BillPayment[]
  total: number
  page: number
  per_page: number
}

// ============================================
// CONSTANTES
// ============================================

export const BILL_PAYMENT_CONFIG = {
  SERVICE_FEE_PERCENT: 4.75,
  NETWORK_FEE_PERCENT: 0.25,
  TOTAL_FEE_PERCENT: 5,
  QUOTE_VALIDITY_MINUTES: 5,
  MIN_DAYS_BEFORE_DUE: 1,
  MIN_BILL_AMOUNT: 10,
  MAX_BILL_AMOUNT: 50000,
}

export const STATUS_CONFIG: Record<
  BillPaymentStatus,
  {
    label: string
    color: string
    bgColor: string
    icon: string
  }
> = {
  PENDING: {
    label: 'Aguardando confirmação',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-500/20',
    icon: 'Clock',
  },
  CRYPTO_DEBITED: {
    label: 'Crypto debitada',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-500/20',
    icon: 'Check',
  },
  PROCESSING: {
    label: 'Processando',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-500/20',
    icon: 'Loader',
  },
  PAYING: {
    label: 'Pagando boleto',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-500/20',
    icon: 'CreditCard',
  },
  PAID: {
    label: 'Pago',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-500/20',
    icon: 'CheckCircle',
  },
  FAILED: {
    label: 'Falhou',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-500/20',
    icon: 'XCircle',
  },
  REFUNDED: {
    label: 'Reembolsado',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-500/20',
    icon: 'RefreshCw',
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-500/20',
    icon: 'XCircle',
  },
  EXPIRED: {
    label: 'Expirado',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-500/20',
    icon: 'Clock',
  },
}

export const BILL_TYPE_CONFIG: Record<
  BillType,
  {
    label: string
    icon: string
  }
> = {
  BANK_SLIP: { label: 'Boleto Bancário', icon: 'FileText' },
  UTILITY: { label: 'Conta de Consumo', icon: 'Zap' },
  TAX: { label: 'Taxa/Tributo', icon: 'Receipt' },
  OTHER: { label: 'Outro', icon: 'File' },
}

// ============================================
// SERVICE
// ============================================

const billPaymentService = {
  baseUrl: '/wolkpay/bill',

  /**
   * Validar código de barras
   */
  async validateBill(barcode: string): Promise<BillInfo> {
    const response = await apiClient.post<BillInfo>(`${this.baseUrl}/validate`, { barcode })
    return response.data
  },

  /**
   * Gerar cotação para pagamento
   */
  async createQuote(request: QuoteBillPaymentRequest): Promise<BillPaymentQuote> {
    const response = await apiClient.post<BillPaymentQuote>(`${this.baseUrl}/quote`, request)
    return response.data
  },

  /**
   * Confirmar pagamento e debitar crypto
   */
  async confirmPayment(request: ConfirmBillPaymentRequest): Promise<BillPayment> {
    const response = await apiClient.post<BillPayment>(`${this.baseUrl}/confirm`, request)
    return response.data
  },

  /**
   * Listar pagamentos do usuário
   */
  async getPayments(
    page: number = 1,
    perPage: number = 20,
    status?: string
  ): Promise<BillPaymentListResponse> {
    const params: Record<string, string> = {
      page: page.toString(),
      per_page: perPage.toString(),
    }
    if (status) {
      params.status = status
    }
    const response = await apiClient.get<BillPaymentListResponse>(`${this.baseUrl}/payments`, {
      params,
    })
    return response.data
  },

  /**
   * Obter detalhes de um pagamento
   */
  async getPayment(paymentId: string): Promise<BillPayment> {
    const response = await apiClient.get<BillPayment>(`${this.baseUrl}/payment/${paymentId}`)
    return response.data
  },
}

export default billPaymentService
