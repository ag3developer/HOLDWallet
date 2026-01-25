/**
 * WolkPay Admin API Service
 * =========================
 *
 * Servico para comunicacao com API administrativa do WolkPay.
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Criar instância do axios com configurações padrão
const adminApi = axios.create({
  baseURL: `${API_URL}/admin/wolkpay`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token de autenticação
adminApi.interceptors.request.use(config => {
  const authStorage = localStorage.getItem('hold-wallet-auth')
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage)
      const token = parsed?.state?.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (e) {
      console.error('Erro ao parsear auth storage:', e)
    }
  }
  return config
})

// Interceptor para tratamento de erros
adminApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      let timeSinceLogin = Infinity
      try {
        const loginTimestamp = sessionStorage.getItem('auth_token_timestamp')
        if (loginTimestamp) {
          timeSinceLogin = Date.now() - Number.parseInt(loginTimestamp, 10)
        }
      } catch {
        // sessionStorage not available
      }

      if (timeSinceLogin < 15000) {
        console.warn('[AdminWolkPayAPI] Skipping logout - user just logged in')
        return Promise.reject(error)
      }

      console.error('Token invalido ou expirado')
      localStorage.removeItem('hold-wallet-auth')
      globalThis.location.href = '/login'
    }
    if (error.response?.status === 403) {
      console.error('Acesso negado: Usuario nao e admin')
    }
    return Promise.reject(error)
  }
)

// ============================================
// Types
// ============================================

export interface WolkPayInvoice {
  id: string
  invoice_number: string
  status: string
  beneficiary_id: string
  beneficiary_name: string
  beneficiary_email?: string
  crypto_currency: string
  crypto_amount: number
  crypto_network?: string
  usd_rate?: number
  brl_rate?: number
  base_amount_brl?: number
  service_fee_percent?: number
  service_fee_brl: number
  network_fee_percent?: number
  network_fee_brl: number
  total_amount_brl: number
  fee_payer?: string
  beneficiary_receives_brl?: number
  beneficiary_receives_crypto?: number
  checkout_token?: string
  checkout_url?: string
  created_at: string
  expires_at?: string
  updated_at?: string
  // Dados da transação blockchain
  crypto_tx_hash?: string
  crypto_tx_network?: string
  crypto_wallet_address?: string
  crypto_sent_at?: string
  crypto_explorer_url?: string
}

export interface WolkPayPayer {
  id: string
  person_type: 'PF' | 'PJ'
  // PF
  full_name?: string
  cpf?: string
  birth_date?: string
  phone?: string
  email?: string
  // PJ
  company_name?: string
  cnpj?: string
  trade_name?: string
  state_registration?: string
  business_phone?: string
  business_email?: string
  responsible_name?: string
  responsible_cpf?: string
  // Endereco
  zip_code?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  // Compliance
  ip_address?: string
  user_agent?: string
  terms_accepted_at?: string
  terms_version?: string
  created_at?: string
  // Campos simplificados (retornados em algumas APIs)
  name?: string
  document?: string
}

export interface WolkPayPayment {
  id: string
  pix_key?: string
  pix_txid?: string
  pix_qrcode?: string
  pix_qrcode_image?: string
  amount_brl: number
  status: string
  paid_at?: string
  payer_confirmed_at?: string
  bank_transaction_id?: string
  payer_bank?: string
  payer_name_from_bank?: string
  payer_document_from_bank?: string
  created_at?: string
}

export interface WolkPayApproval {
  id: string
  action: string
  approved_by: string
  approved_by_name?: string
  rejection_reason?: string
  crypto_tx_hash?: string
  crypto_network?: string
  wallet_address?: string
  notes?: string
  created_at?: string
}

export interface WolkPayInvoiceListItem {
  invoice: WolkPayInvoice
  payer: WolkPayPayer | null
  payment: WolkPayPayment | null
}

export interface WolkPayInvoiceDetail {
  invoice: WolkPayInvoice
  payer: WolkPayPayer | null
  payment: WolkPayPayment | null
  approval: WolkPayApproval | null
}

export interface WolkPayPendingResponse {
  invoices: WolkPayInvoiceListItem[]
  total: number
  total_count: number
  pending_count: number
  paid_count: number
  approved_count: number
  awaiting_verification_count?: number
  page: number
  per_page: number
}

export interface WolkPayAwaitingVerificationResponse {
  invoices: WolkPayInvoiceListItem[]
  total: number
  page: number
  per_page: number
  message: string
}

export interface WolkPayAllResponse {
  invoices: Array<{
    id: string
    invoice_number: string
    status: string
    beneficiary_name: string
    payer_name: string
    crypto_currency: string
    crypto_amount: number
    total_amount_brl: number
    created_at: string
  }>
  total: number
  page: number
  per_page: number
}

export interface ApprovalResponse {
  invoice_id: string
  invoice_number: string
  action: string
  message: string
  crypto_tx_hash?: string
}

export interface ReportSummary {
  total_invoices: number
  pending_invoices: number
  completed_invoices: number
  rejected_invoices: number
  total_brl: number
  total_crypto: Record<string, number>
  total_fees_brl: number
}

// ============================================
// API Functions
// ============================================

/**
 * Lista faturas pendentes de aprovacao (status = PAID)
 */
export const getPendingInvoices = async (
  page: number = 1,
  perPage: number = 20
): Promise<WolkPayPendingResponse> => {
  const response = await adminApi.get('/pending', {
    params: { page, per_page: perPage },
  })
  return response.data
}

/**
 * Lista faturas AGUARDANDO VERIFICAÇÃO DO ADMIN
 *
 * Pagador já confirmou que pagou, mas admin ainda não verificou se o PIX foi recebido.
 * 🚨 URGENTE: Estas faturas precisam de ação imediata!
 */
export const getAwaitingVerificationInvoices = async (
  page: number = 1,
  perPage: number = 20
): Promise<WolkPayAwaitingVerificationResponse> => {
  const response = await adminApi.get('/awaiting-verification', {
    params: { page, per_page: perPage },
  })
  return response.data
}

/**
 * Lista todas as faturas com filtros
 */
export const getAllInvoices = async (params: {
  status?: string
  page?: number
  per_page?: number
}): Promise<WolkPayAllResponse> => {
  const response = await adminApi.get('/all', { params })
  return response.data
}

/**
 * Obter detalhes completos de uma fatura
 */
export const getInvoiceDetails = async (invoiceId: string): Promise<WolkPayInvoiceDetail> => {
  const response = await adminApi.get(`/${invoiceId}`)
  return response.data
}

/**
 * Confirmar pagamento manualmente
 */
export const confirmPayment = async (
  invoiceId: string,
  bankTransactionId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await adminApi.post(`/${invoiceId}/confirm-payment`, null, {
    params: { bank_transaction_id: bankTransactionId },
  })
  return response.data
}

/**
 * Aprovar fatura e enviar crypto
 */
export const approveInvoice = async (
  invoiceId: string,
  network?: string,
  notes?: string
): Promise<ApprovalResponse> => {
  const response = await adminApi.post(`/${invoiceId}/approve`, { network, notes })
  return response.data
}

/**
 * Rejeitar fatura
 */
export const rejectInvoice = async (
  invoiceId: string,
  rejectionReason: string,
  notes?: string
): Promise<ApprovalResponse> => {
  const response = await adminApi.post(`/${invoiceId}/reject`, {
    rejection_reason: rejectionReason,
    notes,
  })
  return response.data
}

/**
 * Obter relatorio resumido
 */
export const getReportSummary = async (params?: {
  start_date?: string
  end_date?: string
}): Promise<ReportSummary> => {
  const response = await adminApi.get('/reports/summary', { params })
  return response.data
}

/**
 * Verificar limite de um pagador
 */
export const checkPayerLimit = async (
  documentType: string,
  documentNumber: string
): Promise<{
  has_limit: boolean
  current_usage: number
  limit: number
  remaining: number
}> => {
  const response = await adminApi.post('/check-limit', {
    document_type: documentType,
    document_number: documentNumber,
  })
  return response.data
}

/**
 * Bloquear um pagador
 */
export const blockPayer = async (
  documentType: string,
  documentNumber: string,
  reason: string
): Promise<{ success: boolean; message: string }> => {
  const response = await adminApi.post('/block-payer', {
    document_type: documentType,
    document_number: documentNumber,
    reason,
  })
  return response.data
}

// ============================================
// Timeline / Histórico
// ============================================

export interface TimelineEvent {
  timestamp: string | null
  action: string
  icon: string
  label: string
  color: string
  description: string | null
  actor_type: string
  actor_id: string | null
  crypto_tx_hash?: string
  crypto_network?: string
}

export interface TimelineResponse {
  invoice_id: string
  invoice_number: string
  current_status: string
  timeline: TimelineEvent[]
  total_events: number
}

/**
 * Obter timeline/histórico de uma fatura
 */
export const getInvoiceTimeline = async (invoiceId: string): Promise<TimelineResponse> => {
  const response = await adminApi.get(`/${invoiceId}/timeline`)
  return response.data
}

/**
 * Marcar fatura como concluída (SEM enviar crypto novamente)
 *
 * Use quando a crypto já foi enviada e você só precisa atualizar o status.
 */
export const markInvoiceCompleted = async (
  invoiceId: string,
  cryptoTxHash: string,
  cryptoNetwork: string,
  notes?: string
): Promise<{
  success: boolean
  message: string
  invoice_id: string
  invoice_number: string
  status: string
  crypto_tx_hash: string
  crypto_network: string
  previous_status: string
}> => {
  const params = new URLSearchParams({
    crypto_tx_hash: cryptoTxHash,
    crypto_network: cryptoNetwork,
  })
  if (notes) {
    params.append('notes', notes)
  }
  const response = await adminApi.post(`/${invoiceId}/mark-completed?${params.toString()}`)
  return response.data
}

export default {
  getPendingInvoices,
  getAwaitingVerificationInvoices,
  getAllInvoices,
  getInvoiceDetails,
  getInvoiceTimeline,
  confirmPayment,
  approveInvoice,
  rejectInvoice,
  markInvoiceCompleted,
  getReportSummary,
  checkPayerLimit,
  blockPayer,
}
