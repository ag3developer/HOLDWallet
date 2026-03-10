/**
 * Gateway Service
 * ================
 *
 * Serviço para comunicacao com a API do WolkPay Gateway.
 * Endpoints publicos para checkout e consulta de status.
 */

import { apiClient } from './api'
import { authStorage } from '@/utils/indexedDBStorage'

// ============================================
// TYPES
// ============================================

export type GatewayPaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'FAILED'

export type GatewayPaymentMethod = 'PIX' | 'CRYPTO'

export interface GatewayMerchant {
  id: string
  business_name: string
  logo_url?: string
  website_url?: string
}

export interface GatewayCheckoutData {
  payment_id: string
  payment_code: string
  merchant: GatewayMerchant
  amount: number
  currency: string
  description?: string
  status: GatewayPaymentStatus
  payment_method?: GatewayPaymentMethod
  expires_at: string
  created_at: string

  // PIX data
  pix_qrcode?: string
  pix_qrcode_image?: string
  pix_txid?: string

  // Crypto data
  crypto_currency?: string
  crypto_network?: string
  crypto_address?: string
  crypto_amount?: string
  crypto_qrcode?: string

  // Payer data (optional)
  payer_name?: string
  payer_email?: string

  // Metadata from merchant
  metadata?: Record<string, unknown>
}

export interface GatewayStatusResponse {
  payment_id: string
  status: GatewayPaymentStatus
  paid_at?: string
  tx_hash?: string
  confirmations?: number
}

export interface GatewaySelectMethodRequest {
  method: GatewayPaymentMethod
  crypto_currency?: string
  crypto_network?: string
}

export interface GatewaySelectMethodResponse {
  payment_id: string
  method: GatewayPaymentMethod

  // PIX
  pix_qrcode?: string
  pix_qrcode_image?: string
  pix_txid?: string

  // Crypto
  crypto_address?: string
  crypto_amount?: string
  crypto_currency?: string
  crypto_network?: string
  crypto_qrcode?: string
  crypto_rate?: number

  expires_at: string
}

// ============================================
// MERCHANT TYPES
// ============================================

export type MerchantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'

export interface MerchantProfile {
  id: string
  user_id: string
  business_name: string
  business_document: string
  business_email: string
  business_phone?: string
  website_url?: string
  logo_url?: string
  webhook_url?: string
  webhook_secret?: string
  settlement_crypto: string
  settlement_network: string
  auto_settlement: boolean
  fee_percentage: number
  status: MerchantStatus
  created_at: string
  approved_at?: string
}

export interface MerchantStats {
  // Counts
  total_payments: number
  completed_payments: number
  pending_payments: number

  // Volume
  total_volume_brl: number
  total_fees_brl: number
  net_volume_brl: number

  // Today
  today_payments: number
  today_volume_brl: number

  // This month
  this_month_payments: number
  this_month_volume_brl: number

  // Optional calculated fields (may or may not be returned by API)
  total_volume?: number
  total_transactions?: number
  volume_change?: number
  transactions_change?: number
  success_rate?: number
  pending_volume?: number
  pix_percentage?: number
  crypto_percentage?: number
  today_transactions?: number
  today_volume?: number
}

export interface RegisterMerchantRequest {
  business_name: string
  business_document: string
  business_email: string
  password: string
  business_phone?: string | undefined
  website_url?: string | undefined
  settlement_crypto?: string | undefined
  settlement_network?: string | undefined
}

export interface RegisterMerchantResponse {
  message: string
  merchant_id: string
  merchant_code: string
  access_token: string
  token_type: string
}

export interface UpdateMerchantRequest {
  business_name?: string | undefined
  business_email?: string | undefined
  business_phone?: string | undefined
  website_url?: string | undefined
  logo_url?: string | undefined
  settlement_crypto?: string | undefined
  settlement_network?: string | undefined
  auto_settlement?: boolean | undefined
}

// ============================================
// API KEY TYPES
// ============================================

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  environment: 'live' | 'test'
  permissions: string[]
  is_active: boolean
  last_used_at?: string
  created_at: string
  expires_at?: string
}

export interface CreateApiKeyRequest {
  name: string
  environment: 'live' | 'test'
  permissions?: string[]
}

export interface CreateApiKeyResponse {
  api_key: ApiKey
  api_key_full: string // Mostrado apenas uma vez (campo retornado como "api_key" pelo backend)
}

// ============================================
// PAYMENT TYPES (Dashboard)
// ============================================

export interface PaymentListItem {
  id: string
  payment_code: string
  external_id?: string
  amount: number
  currency: string
  fee_amount: number
  net_amount: number
  payment_method?: GatewayPaymentMethod
  status: GatewayPaymentStatus
  description?: string
  payer_name?: string
  payer_email?: string
  created_at: string
  expires_at: string
  paid_at?: string
}

export interface PaymentListResponse {
  payments: PaymentListItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface PaymentFilters {
  status?: GatewayPaymentStatus
  payment_method?: GatewayPaymentMethod
  from_date?: string
  to_date?: string
  search?: string
  page?: number
  per_page?: number
}

// ============================================
// WEBHOOK TYPES
// ============================================

export interface WebhookConfig {
  webhook_url?: string
  webhook_secret?: string
  events_enabled: string[]
}

export interface WebhookEvent {
  id: string
  event_type: string
  payment_id: string
  status: 'pending' | 'sent' | 'failed'
  attempts: number
  last_attempt_at?: string
  next_retry_at?: string
  response_code?: number
  created_at: string
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Busca dados publicos do checkout
 */
export const getCheckoutData = async (token: string): Promise<GatewayCheckoutData> => {
  const response = await apiClient.get(`/gateway/checkout/${token}`)
  return response.data
}

/**
 * Verifica status do pagamento
 */
export const getPaymentStatus = async (token: string): Promise<GatewayStatusResponse> => {
  const response = await apiClient.get(`/gateway/checkout/${token}/status`)
  return response.data
}

/**
 * Seleciona metodo de pagamento (PIX ou Crypto)
 */
export const selectPaymentMethod = async (
  token: string,
  data: GatewaySelectMethodRequest
): Promise<GatewaySelectMethodResponse> => {
  const response = await apiClient.post(`/gateway/checkout/${token}/select-method`, data)
  return response.data
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calcula tempo restante ate expiracao
 */
export const getTimeRemaining = (
  expiresAt: string
): {
  minutes: number
  seconds: number
  expired: boolean
  total: number
} => {
  const now = Date.now()
  const expires = new Date(expiresAt).getTime()
  const diff = expires - now

  if (diff <= 0) {
    return { minutes: 0, seconds: 0, expired: true, total: 0 }
  }

  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  return { minutes, seconds, expired: false, total: diff }
}

/**
 * Formata valor em BRL
 */
export const formatBRL = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

/**
 * Formata valor crypto
 */
export const formatCrypto = (amount: string | number, symbol: string): string => {
  const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount

  // Stablecoins: 2 decimais
  if (['USDT', 'USDC', 'DAI', 'BUSD'].includes(symbol.toUpperCase())) {
    return num.toFixed(2)
  }

  // BTC: ate 8 decimais
  if (symbol.toUpperCase() === 'BTC') {
    return Number.parseFloat(num.toFixed(8)).toString()
  }

  // Outros: ate 6 decimais
  return Number.parseFloat(num.toFixed(6)).toString()
}

/**
 * Retorna cor do status
 */
export const getStatusColor = (status: GatewayPaymentStatus): string => {
  const colors: Record<GatewayPaymentStatus, string> = {
    PENDING: 'text-amber-500',
    PROCESSING: 'text-blue-500',
    CONFIRMED: 'text-emerald-500',
    COMPLETED: 'text-emerald-600',
    EXPIRED: 'text-gray-500',
    CANCELLED: 'text-gray-500',
    REFUNDED: 'text-purple-500',
    FAILED: 'text-red-500',
  }
  return colors[status] || 'text-gray-500'
}

/**
 * Retorna label do status
 */
export const getStatusLabel = (status: GatewayPaymentStatus): string => {
  const labels: Record<GatewayPaymentStatus, string> = {
    PENDING: 'Aguardando pagamento',
    PROCESSING: 'Processando',
    CONFIRMED: 'Confirmado',
    COMPLETED: 'Concluido',
    EXPIRED: 'Expirado',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado',
    FAILED: 'Falhou',
  }
  return labels[status] || status
}

/**
 * Retorna classe de cor do badge
 */
export const getStatusBadgeColor = (status: GatewayPaymentStatus): string => {
  const colors: Record<GatewayPaymentStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    EXPIRED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    CANCELLED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    REFUNDED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[status] || 'bg-slate-100 text-slate-700'
}

// ============================================
// MERCHANT API FUNCTIONS
// ============================================

/**
 * Busca perfil do merchant autenticado
 */
export const getMerchantProfile = async (): Promise<MerchantProfile> => {
  const response = await apiClient.get('/gateway/merchants/me')
  return response.data
}

/**
 * Registra novo merchant (endpoint público)
 */
export const registerMerchant = async (
  data: RegisterMerchantRequest
): Promise<RegisterMerchantResponse> => {
  const response = await apiClient.post('/gateway/merchants/register', data)

  // Salvar token no localStorage E IndexedDB para auto-login
  if (response.data.access_token) {
    const token = response.data.access_token

    // Salvar em localStorage
    localStorage.setItem('token', token)

    // Salvar em IndexedDB (para Safari iOS e consistência)
    authStorage.setToken(token)

    console.log('[Gateway] ✅ Token salvo após registro')
  }

  return response.data
}

/**
 * Atualiza perfil do merchant
 */
export const updateMerchantProfile = async (
  data: UpdateMerchantRequest
): Promise<MerchantProfile> => {
  const response = await apiClient.put('/gateway/merchants/me', data)
  return response.data
}

/**
 * Busca estatisticas do merchant
 */
export const getMerchantStats = async (): Promise<MerchantStats> => {
  const response = await apiClient.get('/gateway/merchants/me/stats')
  return response.data
}

// ============================================
// API KEY FUNCTIONS
// ============================================

/**
 * Lista API Keys do merchant
 */
export const getApiKeys = async (): Promise<ApiKey[]> => {
  const response = await apiClient.get('/gateway/api-keys')
  return response.data
}

/**
 * Cria nova API Key
 */
export const createApiKey = async (data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> => {
  const response = await apiClient.post('/gateway/api-keys', data)
  // O backend retorna um objeto flat com todos os campos + api_key (a chave completa)
  const apiKeyData = response.data
  return {
    api_key: {
      id: apiKeyData.id,
      name: apiKeyData.name,
      key_prefix: apiKeyData.key_prefix,
      environment: apiKeyData.is_test ? 'test' : 'live',
      permissions: apiKeyData.permissions || [],
      is_active: apiKeyData.is_active,
      last_used_at: apiKeyData.last_used_at,
      created_at: apiKeyData.created_at,
    },
    api_key_full: apiKeyData.api_key, // A chave completa
  }
}

/**
 * Revoga API Key
 */
export const revokeApiKey = async (keyId: string): Promise<void> => {
  await apiClient.delete(`/gateway/api-keys/${keyId}`)
}

// ============================================
// PAYMENT FUNCTIONS (Dashboard)
// ============================================

/**
 * Lista pagamentos do merchant (dashboard)
 */
export const getPayments = async (filters?: PaymentFilters): Promise<PaymentListResponse> => {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.payment_method) params.append('payment_method', filters.payment_method)
  if (filters?.from_date) params.append('from_date', filters.from_date)
  if (filters?.to_date) params.append('to_date', filters.to_date)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const response = await apiClient.get(`/gateway/merchants/me/payments?${params.toString()}`)
  return response.data
}

/**
 * Busca pagamento por ID (dashboard)
 */
export const getPaymentById = async (paymentId: string): Promise<PaymentListItem> => {
  const response = await apiClient.get(`/gateway/merchants/me/payments/${paymentId}`)
  return response.data
}

/**
 * Cancela pagamento pendente (dashboard)
 */
export const cancelPayment = async (paymentId: string): Promise<void> => {
  await apiClient.post(`/gateway/merchants/me/payments/${paymentId}/cancel`)
}

// ============================================
// WEBHOOK FUNCTIONS
// ============================================

/**
 * Busca configuracao de webhook
 */
export const getWebhookConfig = async (): Promise<WebhookConfig> => {
  const response = await apiClient.get('/gateway/merchants/me')
  const merchant = response.data as MerchantProfile
  return {
    webhook_url: merchant.webhook_url || '',
    webhook_secret: merchant.webhook_secret || '',
    events_enabled: ['payment.created', 'payment.completed', 'payment.failed', 'payment.expired'],
  }
}

/**
 * Atualiza configuracao de webhook
 */
export const updateWebhookConfig = async (webhookUrl: string): Promise<MerchantProfile> => {
  const response = await apiClient.put('/gateway/webhooks/config', { webhook_url: webhookUrl })
  return response.data
}

/**
 * Regenera secret do webhook
 */
export const regenerateWebhookSecret = async (): Promise<{ webhook_secret: string }> => {
  const response = await apiClient.post('/gateway/webhooks/regenerate-secret')
  return response.data
}

/**
 * Lista eventos de webhook
 */
export const getWebhookEvents = async (
  page = 1,
  perPage = 20
): Promise<{ events: WebhookEvent[]; total: number }> => {
  const response = await apiClient.get(`/gateway/webhooks/events?page=${page}&per_page=${perPage}`)
  return response.data
}

// Export default service object
const gatewayService = {
  // Checkout (public)
  getCheckoutData,
  getPaymentStatus,
  selectPaymentMethod,
  // Merchant Dashboard
  getMerchantProfile,
  registerMerchant,
  updateMerchantProfile,
  getMerchantStats,
  // API Keys
  getApiKeys,
  createApiKey,
  revokeApiKey,
  // Payments
  getPayments,
  getPaymentById,
  cancelPayment,
  // Webhooks
  getWebhookConfig,
  updateWebhookConfig,
  regenerateWebhookSecret,
  getWebhookEvents,
  // Helpers
  getTimeRemaining,
  formatBRL,
  formatCrypto,
  getStatusColor,
  getStatusLabel,
  getStatusBadgeColor,
}

export default gatewayService
