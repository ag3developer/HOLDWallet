/**
 * 🛡️ HOLD Wallet - Admin API Service
 * ===================================
 *
 * Serviço para comunicação com a API administrativa.
 */

import axios from 'axios'

// Em dev usa proxy do Vite (/api), em produção usa URL direta
const API_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL || 'https://api.wolknow.com/v1'
  : '/api'

// Criar instância do axios com configurações padrão
// Nota: O backend registra as rotas admin em /admin (sem /api/v1)
// Exportamos para uso em outras páginas que precisam de chamadas admin personalizadas
export const adminApi = axios.create({
  baseURL: `${API_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token de autenticação
adminApi.interceptors.request.use(config => {
  // O Zustand persist salva o auth state em hold-wallet-auth como JSON
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
      // ✅ Check grace period before logging out (Safari iOS fix)
      let timeSinceLogin = Infinity
      try {
        const loginTimestamp = sessionStorage.getItem('auth_token_timestamp')
        if (loginTimestamp) {
          timeSinceLogin = Date.now() - Number.parseInt(loginTimestamp, 10)
        }
      } catch {
        // sessionStorage not available
      }

      // If user just logged in (within 15 seconds), don't logout
      if (timeSinceLogin < 15000) {
        console.warn('[AdminAPI] 🛡️ Skipping logout - user just logged in')
        return Promise.reject(error)
      }

      // Token expirado ou inválido
      console.error('❌ Token inválido ou expirado')
      localStorage.removeItem('hold-wallet-auth')
      globalThis.location.href = '/login'
    }
    if (error.response?.status === 403) {
      // Sem permissão de admin - apenas loga, não redireciona
      console.error('❌ Acesso negado: Usuário não é admin ou token inválido')
    }
    return Promise.reject(error)
  }
)

// ============================================
// Dashboard
// ============================================

export interface DashboardStats {
  total_users: number
  active_users: number
  total_trades: number
  pending_trades: number
  total_volume_usdt: number
  open_disputes: number
  total_escrow_usdt: number
}

export interface RecentActivity {
  id: string
  type: string
  user_id: string
  username: string
  description: string
  created_at: string
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await adminApi.get('/dashboard/stats')
  return response.data
}

export const getRecentActivities = async (limit = 10): Promise<RecentActivity[]> => {
  const response = await adminApi.get(`/dashboard/recent-activities?limit=${limit}`)
  return response.data
}

// ============================================
// Users Management
// ============================================

export interface User {
  id: string
  username: string
  email: string
  phone: string | null
  is_active: boolean
  is_admin: boolean
  is_email_verified: boolean
  is_phone_verified: boolean
  has_2fa: boolean
  created_at: string
  last_login: string | null
}

export interface UserListParams {
  skip?: number
  limit?: number
  search?: string
  is_active?: boolean
  is_admin?: boolean
}

export interface UserListResponse {
  success?: boolean
  users?: User[]
  items?: User[]
  total: number
  skip?: number
  limit?: number
}

export const getUsers = async (params: UserListParams = {}): Promise<UserListResponse> => {
  const response = await adminApi.get('/users', { params })
  return response.data
}

export const getUserById = async (
  userId: string
): Promise<{ success?: boolean; data?: User } & User> => {
  const response = await adminApi.get(`/users/${userId}`)
  return response.data
}

export const updateUser = async (userId: string, data: Partial<User>): Promise<User> => {
  const response = await adminApi.put(`/users/${userId}`, data)
  return response.data
}

export const blockUser = async (userId: string, reason: string): Promise<User> => {
  const response = await adminApi.post(`/users/${userId}/block`, { reason })
  return response.data
}

export const unblockUser = async (userId: string): Promise<User> => {
  const response = await adminApi.post(`/users/${userId}/unblock`)
  return response.data
}

export const resetUserPassword = async (userId: string): Promise<{ message: string }> => {
  const response = await adminApi.post(`/users/${userId}/reset-password`)
  return response.data
}

export const disable2FA = async (userId: string): Promise<{ message: string }> => {
  const response = await adminApi.post(`/users/${userId}/disable-2fa`)
  return response.data
}

export const setAdminStatus = async (userId: string, isAdmin: boolean): Promise<User> => {
  // Backend usa PUT /users/{user_id} para atualizar usuário
  const response = await adminApi.put(`/users/${userId}`, { is_admin: isAdmin })
  return response.data
}

// ============================================
// Trades Management
// ============================================

export interface Trade {
  id: string
  reference_code: string
  user_id: string
  username: string
  operation_type: 'buy' | 'sell'
  symbol: string
  fiat_amount: number
  crypto_amount: number
  crypto_price: number
  total_amount: number
  // Campos BRL para pagamentos TED/PIX
  brl_amount?: number | null
  brl_total_amount?: number | null
  usd_to_brl_rate?: number | null
  payment_method: string
  status:
    | 'pending'
    | 'payment_processing'
    | 'payment_confirmed'
    | 'crypto_received'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'expired'
  wallet_address?: string
  network?: string
  tx_hash?: string
  created_at: string
  expires_at?: string
}

export interface TradeDetail extends Trade {
  name: string
  spread_percentage: number
  spread_amount: number
  network_fee_percentage: number
  network_fee_amount: number
  payment_proof_url?: string
  error_message?: string
  payment_confirmed_at?: string
  completed_at?: string
  // Campos PIX - Banco do Brasil
  pix_txid?: string
  pix_location?: string
  pix_qrcode?: string
  pix_valor_recebido?: number
  pix_end_to_end_id?: string
  pix_confirmado_em?: string
  // Método de recebimento (para SELL)
  receiving_method_id?: string
  receiving_method?: {
    id: string
    method_type: string
    holder_name?: string
    pix_key?: string
    pix_key_type?: string
    bank_name?: string
    bank_code?: string
    account_number?: string
    account_type?: string
    branch_number?: string
  }
  history: Array<{
    old_status: string | null
    new_status: string
    reason: string
    created_at: string
  }>
}

export interface TradeStats {
  total_trades: number
  pending: number
  completed: number
  failed: number
  cancelled: number
  total_volume_brl: number
}

export interface TradeListParams {
  skip?: number
  limit?: number
  status?: string
  operation_type?: string
  search?: string
}

export interface TradeListResponse {
  success: boolean
  data: {
    items: Trade[]
    total: number
    skip: number
    limit: number
  }
}

export const getTrades = async (params: TradeListParams = {}): Promise<TradeListResponse> => {
  const response = await adminApi.get('/trades', { params })
  return response.data
}

export const getTradeStats = async (): Promise<{ success: boolean; data: TradeStats }> => {
  const response = await adminApi.get('/trades/stats')
  return response.data
}

export const getTradeById = async (
  tradeId: string
): Promise<{ success: boolean; data: TradeDetail }> => {
  const response = await adminApi.get(`/trades/${tradeId}`)
  return response.data
}

export const cancelTrade = async (
  tradeId: string,
  reason?: string
): Promise<{ success: boolean; message: string; trade_id: string }> => {
  const response = await adminApi.post(`/trades/${tradeId}/cancel`, null, {
    params: { reason },
  })
  return response.data
}

// Trade Actions - Ações administrativas para trades OTC
export interface UpdateTradeStatusRequest {
  status:
    | 'pending'
    | 'payment_processing'
    | 'payment_confirmed'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'expired'
  reason?: string
  notes?: string
}

export interface ConfirmPaymentRequest {
  network?: string
  notes?: string
}

export interface ConfirmPaymentResponse {
  success: boolean
  message: string
  trade_id: string
  tx_hash?: string
  wallet_address?: string
  network: string
  status: string
  error?: string
}

export interface AccountingEntry {
  trade_id: string
  reference_code: string
  type: 'platform_fee' | 'network_fee' | 'spread'
  amount: number
  currency: string
  description: string
  created_at: string
}

export const updateTradeStatus = async (
  tradeId: string,
  data: UpdateTradeStatusRequest
): Promise<{ success: boolean; message: string; trade: TradeDetail }> => {
  const response = await adminApi.patch(`/trades/${tradeId}/status`, data)
  return response.data
}

export const confirmTradePayment = async (
  tradeId: string,
  data: ConfirmPaymentRequest = {}
): Promise<ConfirmPaymentResponse> => {
  const response = await adminApi.post(`/trades/${tradeId}/confirm-payment`, data)
  return response.data
}

export const retryTradeDeposit = async (
  tradeId: string,
  network?: string
): Promise<{ success: boolean; message: string; tx_hash?: string; error?: string }> => {
  const response = await adminApi.post(`/trades/${tradeId}/retry-deposit`, null, {
    params: { network },
  })
  return response.data
}

export interface ManualCompleteRequest {
  tx_hash: string
  notes?: string
}

export const manualCompleteTrade = async (
  tradeId: string,
  data: ManualCompleteRequest
): Promise<{
  success: boolean
  message: string
  trade_id: string
  tx_hash: string
  status: string
}> => {
  const response = await adminApi.post(`/trades/${tradeId}/manual-complete`, data)
  return response.data
}

export const sendToAccounting = async (
  tradeId: string
): Promise<{ success: boolean; message: string; entries: AccountingEntry[] }> => {
  const response = await adminApi.post(`/trades/${tradeId}/send-to-accounting`)
  return response.data
}

export const getTradeAccountingEntries = async (
  tradeId: string
): Promise<{ success: boolean; data: AccountingEntry[] }> => {
  const response = await adminApi.get(`/trades/${tradeId}/accounting`)
  return response.data
}

// ============================================
// SELL Trade Processing (VENDA)
// ============================================

export interface ProcessSellRequest {
  network?: string
  notes?: string
}

export interface ProcessSellResponse {
  success: boolean
  message: string
  trade_id: string
  tx_hash?: string
  from_address?: string
  to_address?: string
  network: string
  status: string
  error?: string
  next_step?: string
}

export const processSellTrade = async (
  tradeId: string,
  data: ProcessSellRequest = {}
): Promise<ProcessSellResponse> => {
  const response = await adminApi.post(`/trades/${tradeId}/process-sell`, data)
  return response.data
}

export const completeSellTrade = async (
  tradeId: string,
  enviarPix: boolean = false
): Promise<{
  success: boolean
  message: string
  trade_id: string
  status: string
  completed_at?: string
  pix_enviado?: boolean
  pix_end_to_end_id?: string
  pix_valor?: string
}> => {
  const response = await adminApi.post(`/trades/${tradeId}/complete-sell`, null, {
    params: { enviar_pix: enviarPix },
  })
  return response.data
}

// ============================================
// P2P Management
// ============================================

export interface P2POrder {
  id: string
  user_id: string
  username: string
  order_type: 'buy' | 'sell'
  cryptocurrency: string
  fiat_currency: string
  price: number
  total_amount: number
  available_amount: number
  min_order_limit: number
  max_order_limit: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  completed_trades: number
  created_at: string
}

export interface P2PDispute {
  id: string
  match_id: string
  reporter_id: string
  reporter_username: string
  reason: string
  description: string
  status: 'open' | 'investigating' | 'resolved'
  created_at: string
  resolved_at: string | null
}

export interface P2PStats {
  total_orders: number
  active_orders: number
  completed_orders: number
  cancelled_orders: number
  paused_orders: number
  buy_orders: number
  sell_orders: number
  total_disputes: number
  open_disputes: number
  resolved_disputes: number
}

export interface P2POrderListParams {
  skip?: number
  limit?: number
  status_filter?: string | undefined
  order_type?: string | undefined
  search?: string | undefined
}

export interface P2PDisputeListParams {
  skip?: number
  limit?: number
  status_filter?: string | undefined
  search?: string | undefined
}

export interface P2POrderListResponse {
  success: boolean
  data: {
    items: P2POrder[]
    total: number
    skip: number
    limit: number
  }
}

export interface P2PDisputeListResponse {
  success: boolean
  data: {
    items: P2PDispute[]
    total: number
    skip: number
    limit: number
  }
}

export const getP2POrders = async (
  params: P2POrderListParams = {}
): Promise<P2POrderListResponse> => {
  const response = await adminApi.get('/p2p/orders', { params })
  return response.data
}

export const getP2PStats = async (): Promise<{ success: boolean; data: P2PStats }> => {
  const response = await adminApi.get('/p2p/stats')
  return response.data
}

export const getP2PDisputes = async (
  params: P2PDisputeListParams = {}
): Promise<P2PDisputeListResponse> => {
  const response = await adminApi.get('/p2p/disputes', { params })
  return response.data
}

export const pauseP2POrder = async (
  orderId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await adminApi.post(`/p2p/orders/${orderId}/pause`)
  return response.data
}

export const activateP2POrder = async (
  orderId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await adminApi.post(`/p2p/orders/${orderId}/activate`)
  return response.data
}

export const resolveP2PDispute = async (
  disputeId: string,
  data: { resolution: 'buyer_wins' | 'seller_wins' | 'split'; notes?: string }
): Promise<{ success: boolean; message: string }> => {
  const response = await adminApi.post(`/p2p/disputes/${disputeId}/resolve`, data)
  return response.data
}

export const releaseEscrow = async (
  escrowId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await adminApi.post(`/p2p/escrow/${escrowId}/release`)
  return response.data
}

export const refundEscrow = async (
  escrowId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await adminApi.post(`/p2p/escrow/${escrowId}/refund`)
  return response.data
}

// ============================================
// Reports
// ============================================

export interface ReportParams {
  period: '7d' | '30d' | '3m' | '12m'
}

export interface VolumeReport {
  date: string
  buy_volume: number
  sell_volume: number
  total_volume: number
  trade_count: number
}

export interface UserReport {
  date: string
  new_users: number
  active_users: number
}

export const getVolumeReport = async (params: ReportParams): Promise<VolumeReport[]> => {
  const response = await adminApi.get('/reports/volume', { params })
  return response.data
}

export const getUsersReport = async (params: ReportParams): Promise<UserReport[]> => {
  const response = await adminApi.get('/reports/users', { params })
  return response.data
}

export const getTopTraders = async (params: ReportParams & { limit?: number }) => {
  const response = await adminApi.get('/reports/top-traders', { params })
  return response.data
}

export const exportReport = async (reportType: string, params: ReportParams): Promise<Blob> => {
  const response = await adminApi.get(`/reports/export/${reportType}`, {
    params,
    responseType: 'blob',
  })
  return response.data
}

// ============================================
// Settings
// ============================================

export interface SystemSettings {
  trading_enabled: boolean
  min_trade_amount: number
  max_trade_amount: number
  trading_fee_percent: number
  p2p_enabled: boolean
  p2p_fee_percent: number
  escrow_timeout_hours: number
  max_open_orders_per_user: number
  require_2fa_for_withdrawals: boolean
  require_email_verification: boolean
  max_login_attempts: number
  session_timeout_minutes: number
  email_notifications_enabled: boolean
  admin_alert_email: string
}

export const getSettings = async (): Promise<SystemSettings> => {
  const response = await adminApi.get('/settings')
  return response.data
}

export const updateSettings = async (
  settings: Partial<SystemSettings>
): Promise<SystemSettings> => {
  const response = await adminApi.put('/settings', settings)
  return response.data
}

// ============================================
// Audit Logs
// ============================================

export interface AuditLog {
  id: string
  admin_id: string
  admin_username: string
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
}

export const getAuditLogs = async (
  params: { skip?: number; limit?: number; action?: string } = {}
) => {
  const response = await adminApi.get('/audit/logs', { params })
  return response.data
}

export default adminApi
