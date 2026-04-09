/**
 * WolkPay Gateway Admin API Service
 * ==================================
 *
 * Serviço para comunicação com API administrativa do Gateway de Pagamentos.
 * Similar ao adminWolkpay.ts para manter consistência.
 */

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Criar instância do axios com configurações padrão
const gatewayAdminApi = axios.create({
  baseURL: `${API_URL}/admin/gateway`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token de autenticação
gatewayAdminApi.interceptors.request.use(config => {
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
gatewayAdminApi.interceptors.response.use(
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
        console.warn('[GatewayAdminAPI] Skipping logout - user just logged in')
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

export interface GatewayMerchant {
  id: string
  company_name: string
  cnpj: string
  owner_name: string
  email: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'
  merchant_code: string
  fee_percentage: number
  daily_limit: number
  monthly_limit: number
  created_at: string
  total_transactions: number
  total_volume: number
  api_keys_count: number
}

export interface GatewayStats {
  merchants: {
    total: number
    pending: number
    active: number
    suspended: number
    blocked: number
  }
  payments: {
    total: number
    total_volume: number
    today: {
      count: number
      total: number
    }
    this_month: {
      count: number
      total: number
    }
  }
  api_keys: {
    active: number
  }
}

export interface GatewayPayment {
  id: string
  merchant_name: string
  customer_email: string
  amount: number
  currency: string
  status: string
  created_at: string
  payment_method: string
}

export interface MerchantsListResponse {
  merchants: GatewayMerchant[]
  total: number
  page: number
  per_page: number
}

export interface PaymentsListResponse {
  payments: GatewayPayment[]
  total: number
  page: number
  per_page: number
}

// ============================================
// API Functions
// ============================================

/**
 * Buscar estatísticas do gateway
 */
export const getGatewayStats = async (): Promise<GatewayStats> => {
  const response = await gatewayAdminApi.get('/stats')
  return response.data
}

/**
 * Listar merchants com filtros
 */
export const getMerchants = async (params: {
  page?: number
  per_page?: number
  status?: string
  search?: string
}): Promise<MerchantsListResponse> => {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.append('page', params.page.toString())
  if (params.per_page) searchParams.append('per_page', params.per_page.toString())
  if (params.status && params.status !== 'all') searchParams.append('status', params.status)
  if (params.search) searchParams.append('search', params.search)

  const response = await gatewayAdminApi.get(`/merchants?${searchParams.toString()}`)
  return response.data
}

/**
 * Aprovar merchant
 */
export const approveMerchant = async (merchantId: string): Promise<void> => {
  await gatewayAdminApi.put(`/merchants/${merchantId}/approve`)
}

/**
 * Suspender merchant
 */
export const suspendMerchant = async (merchantId: string, reason: string): Promise<void> => {
  await gatewayAdminApi.put(`/merchants/${merchantId}/suspend?reason=${encodeURIComponent(reason)}`)
}

/**
 * Bloquear merchant
 */
export const blockMerchant = async (merchantId: string, reason: string): Promise<void> => {
  await gatewayAdminApi.put(`/merchants/${merchantId}/block?reason=${encodeURIComponent(reason)}`)
}

/**
 * Reativar merchant
 */
export const reactivateMerchant = async (merchantId: string): Promise<void> => {
  await gatewayAdminApi.put(`/merchants/${merchantId}/reactivate`)
}

/**
 * Listar pagamentos com filtros
 */
export const getPayments = async (params: {
  page?: number
  per_page?: number
  status?: string
  merchant_id?: string
  date_from?: string
  date_to?: string
}): Promise<PaymentsListResponse> => {
  const searchParams = new URLSearchParams()

  if (params.page) searchParams.append('page', params.page.toString())
  if (params.per_page) searchParams.append('per_page', params.per_page.toString())
  if (params.status && params.status !== 'all') searchParams.append('status', params.status)
  if (params.merchant_id) searchParams.append('merchant_id', params.merchant_id)
  if (params.date_from) searchParams.append('date_from', params.date_from)
  if (params.date_to) searchParams.append('date_to', params.date_to)

  const response = await gatewayAdminApi.get(`/payments?${searchParams.toString()}`)
  return response.data
}

/**
 * Interface para configurações do merchant
 */
export interface MerchantSettings {
  custom_fee_percent?: number
  daily_limit_brl?: number
  monthly_limit_brl?: number
  settlement_currency?: string
  settlement_wallet_address?: string
  bank_pix_key?: string
  bank_pix_key_type?: string
  webhook_url?: string
  logo_url?: string
  primary_color?: string
  auto_settlement?: boolean
  min_payment_brl?: number
  max_payment_brl?: number
}

/**
 * Obter detalhes completos de um merchant
 */
export const getMerchantDetails = async (merchantId: string): Promise<GatewayMerchant> => {
  const response = await gatewayAdminApi.get(`/merchants/${merchantId}`)
  return response.data
}

/**
 * Atualizar configurações do merchant
 */
export const updateMerchantSettings = async (
  merchantId: string,
  settings: MerchantSettings
): Promise<GatewayMerchant> => {
  const response = await gatewayAdminApi.put(`/merchants/${merchantId}/settings`, settings)
  return response.data
}

/**
 * Regenerar API Key do merchant
 */
export const regenerateApiKey = async (merchantId: string): Promise<{ api_key: string }> => {
  const response = await gatewayAdminApi.post(`/merchants/${merchantId}/regenerate-key`)
  return response.data
}

// ============================================
// API Keys
// ============================================

export interface GatewayApiKeyItem {
  id: string
  name: string
  description?: string
  key_prefix: string
  is_test: boolean
  is_active: boolean
  permissions?: string[]
  allowed_ips?: string[]
  rate_limit_per_minute: number
  rate_limit_per_hour: number
  last_used_at?: string
  last_used_ip?: string
  total_requests: number
  expires_at?: string
  revoked_at?: string
  revoked_reason?: string
  created_at: string
}

export const getMerchantApiKeys = async (
  merchantId: string
): Promise<{ api_keys: GatewayApiKeyItem[]; total: number }> => {
  const response = await gatewayAdminApi.get(`/merchants/${merchantId}/api-keys`)
  return response.data
}

export const createMerchantApiKey = async (
  merchantId: string,
  data: { name: string; description?: string; is_test?: boolean }
): Promise<{
  success: boolean
  api_key: {
    id: string
    name: string
    key_prefix: string
    full_key: string
    is_test: boolean
    created_at: string
  }
}> => {
  const response = await gatewayAdminApi.post(`/merchants/${merchantId}/api-keys`, data)
  return response.data
}

export const revokeMerchantApiKey = async (
  merchantId: string,
  keyId: string,
  reason?: string
): Promise<{ success: boolean }> => {
  const response = await gatewayAdminApi.put(`/merchants/${merchantId}/api-keys/${keyId}/revoke`, {
    reason,
  })
  return response.data
}

// ============================================
// Webhooks
// ============================================

export interface GatewayWebhookItem {
  id: string
  payment_id: string
  payment_code?: string
  event: string
  url: string
  status: string
  attempts: number
  max_attempts: number
  last_response_code?: number
  last_error?: string
  next_attempt_at?: string
  created_at: string
  sent_at?: string
}

export interface WebhookStats {
  total_sent: number
  total_failed: number
  total_pending: number
}

export const getMerchantWebhooks = async (
  merchantId: string,
  params?: { page?: number; per_page?: number; status?: string; event?: string }
): Promise<{
  webhooks: GatewayWebhookItem[]
  stats: WebhookStats
  total: number
  page: number
  total_pages: number
}> => {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.append('page', params.page.toString())
  if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
  if (params?.status) searchParams.append('status', params.status)
  if (params?.event) searchParams.append('event', params.event)
  const response = await gatewayAdminApi.get(
    `/merchants/${merchantId}/webhooks?${searchParams.toString()}`
  )
  return response.data
}

// ============================================
// Audit Logs
// ============================================

export interface GatewayAuditLogItem {
  id: string
  action: string
  actor_type: string
  actor_id?: string
  actor_email?: string
  description?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  ip_address?: string
  payment_id?: string
  api_key_id?: string
  created_at: string
}

export const getMerchantAuditLogs = async (
  merchantId: string,
  params?: { page?: number; per_page?: number; action?: string }
): Promise<{
  audit_logs: GatewayAuditLogItem[]
  total: number
  page: number
  total_pages: number
}> => {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.append('page', params.page.toString())
  if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
  if (params?.action) searchParams.append('action', params.action)
  const response = await gatewayAdminApi.get(
    `/merchants/${merchantId}/audit-logs?${searchParams.toString()}`
  )
  return response.data
}

// ============================================
// Customers / Payers
// ============================================

export interface GatewayCustomer {
  email: string
  name?: string
  phone?: string
  document?: string
  total_payments: number
  completed_payments: number
  total_amount: number
  last_payment_at?: string
  first_payment_at?: string
}

export const getMerchantCustomers = async (
  merchantId: string,
  params?: { page?: number; per_page?: number; search?: string }
): Promise<{
  customers: GatewayCustomer[]
  total: number
  total_unique_customers: number
  page: number
  total_pages: number
}> => {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.append('page', params.page.toString())
  if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
  if (params?.search) searchParams.append('search', params.search)
  const response = await gatewayAdminApi.get(
    `/merchants/${merchantId}/customers?${searchParams.toString()}`
  )
  return response.data
}

/**
 * Obter histórico de transações do merchant
 */
export const getMerchantTransactions = async (
  merchantId: string,
  params: {
    page?: number
    per_page?: number
  }
): Promise<PaymentsListResponse> => {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.append('page', params.page.toString())
  if (params.per_page) searchParams.append('per_page', params.per_page.toString())

  const response = await gatewayAdminApi.get(
    `/merchants/${merchantId}/payments?${searchParams.toString()}`
  )
  return response.data
}

/**
 * Obter resumo financeiro do merchant
 */
export const getMerchantSummary = async (
  merchantId: string
): Promise<{
  total_volume_brl: number
  total_payments: number
  total_fees_brl: number
  pending_settlement_brl: number
  last_payment_date?: string
}> => {
  const response = await gatewayAdminApi.get(`/merchants/${merchantId}/summary`)
  return response.data
}

export default gatewayAdminApi
