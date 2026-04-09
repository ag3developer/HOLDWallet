/**
 * Admin Merchant Detail Page
 * ===========================
 *
 * Pagina completa para gerenciar um merchant especifico.
 * Inclui abas para: Resumo, Configuracoes, Transacoes, API Keys, Webhooks, Auditoria, Clientes
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Settings,
  CreditCard,
  Key,
  Bell,
  FileText,
  RefreshCw,
  Check,
  Pause,
  Play,
  Ban,
  Copy,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Save,
  Percent,
  Wallet,
  Link2,
  Palette,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  ShieldOff,
  ShieldCheck,
  Globe,
  Hash,
  Send,
  Mail,
  Phone,
  FileDigit,
  UserCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  getMerchantDetails,
  getMerchantSummary,
  getMerchantTransactions,
  updateMerchantSettings,
  approveMerchant,
  suspendMerchant,
  blockMerchant,
  reactivateMerchant,
  getMerchantApiKeys,
  createMerchantApiKey,
  revokeMerchantApiKey,
  getMerchantWebhooks,
  getMerchantAuditLogs,
  getMerchantCustomers,
  type GatewayPayment,
  type MerchantSettings,
  type GatewayApiKeyItem,
  type GatewayWebhookItem,
  type WebhookStats,
  type GatewayAuditLogItem,
  type GatewayCustomer,
} from '@/services/admin/adminGateway'

// Tipos
interface MerchantDetail {
  id: string
  company_name: string
  trade_name?: string
  cnpj: string
  email: string
  phone?: string
  website?: string
  owner_name: string
  owner_email?: string
  owner_phone?: string
  merchant_code: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'
  fee_percentage: number
  custom_fee_percent?: number
  daily_limit_brl?: number
  monthly_limit_brl?: number
  min_payment_brl?: number
  max_payment_brl?: number
  auto_settlement?: boolean
  settlement_currency?: string
  settlement_wallet_address?: string
  bank_pix_key?: string
  bank_pix_key_type?: string | null
  webhook_url?: string
  logo_url?: string
  primary_color?: string
  created_at: string
  activated_at?: string
  suspended_at?: string
  suspended_reason?: string
  zip_code?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
}

interface MerchantSummaryData {
  total_volume_brl: number
  total_payments: number
  total_fees_brl: number
  pending_settlement_brl: number
  last_payment_date?: string
}

// Tabs
type TabType =
  | 'overview'
  | 'settings'
  | 'transactions'
  | 'api-keys'
  | 'webhooks'
  | 'audit'
  | 'customers'

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Resumo', icon: <Building2 className='w-4 h-4' /> },
  { id: 'settings', label: 'Config.', icon: <Settings className='w-4 h-4' /> },
  { id: 'transactions', label: 'Transacoes', icon: <CreditCard className='w-4 h-4' /> },
  { id: 'customers', label: 'Clientes', icon: <Users className='w-4 h-4' /> },
  { id: 'api-keys', label: 'API Keys', icon: <Key className='w-4 h-4' /> },
  { id: 'webhooks', label: 'Webhooks', icon: <Bell className='w-4 h-4' /> },
  { id: 'audit', label: 'Auditoria', icon: <FileText className='w-4 h-4' /> },
]

// Status config
const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendente',
    bgClass: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    icon: <Clock className='w-4 h-4' />,
  },
  ACTIVE: {
    label: 'Ativo',
    bgClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle className='w-4 h-4' />,
  },
  SUSPENDED: {
    label: 'Suspenso',
    bgClass: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
    icon: <AlertTriangle className='w-4 h-4' />,
  },
  BLOCKED: {
    label: 'Bloqueado',
    bgClass: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
    icon: <XCircle className='w-4 h-4' />,
  },
}

// Payment status config
const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  },
  PROCESSING: {
    label: 'Processando',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  },
  COMPLETED: {
    label: 'Concluído',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Falhou',
    color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  },
  EXPIRED: {
    label: 'Expirado',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
  },
  REFUNDED: {
    label: 'Reembolsado',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  },
}

const DEFAULT_PAYMENT_STATUS = {
  label: 'Pendente',
  color: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
}

const getPaymentStatusConfig = (status: string): { label: string; color: string } => {
  const config = PAYMENT_STATUS_CONFIG[status]
  return config || DEFAULT_PAYMENT_STATUS
}

// Format helpers
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDateShort = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

export const AdminMerchantDetailPage: React.FC = () => {
  const { merchantId } = useParams<{ merchantId: string }>()
  const navigate = useNavigate()

  // States
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<MerchantDetail | null>(null)
  const [summary, setSummary] = useState<MerchantSummaryData | null>(null)

  // Transactions state
  const [transactions, setTransactions] = useState<GatewayPayment[]>([])
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [transactionsTotal, setTransactionsTotal] = useState(0)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionSearch, setTransactionSearch] = useState('')

  // Settings state
  const [settingsForm, setSettingsForm] = useState<MerchantSettings>({})
  const [settingsSaving, setSettingsSaving] = useState(false)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<GatewayApiKeyItem[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyIsTest, setNewKeyIsTest] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null)
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  // Webhooks state
  const [webhooks, setWebhooks] = useState<GatewayWebhookItem[]>([])
  const [webhookStats, setWebhookStats] = useState<WebhookStats | null>(null)
  const [webhooksPage, setWebhooksPage] = useState(1)
  const [webhooksTotal, setWebhooksTotal] = useState(0)
  const [webhooksTotalPages, setWebhooksTotalPages] = useState(0)
  const [webhooksLoading, setWebhooksLoading] = useState(false)
  const [webhookStatusFilter, setWebhookStatusFilter] = useState('')

  // Audit state
  const [auditLogs, setAuditLogs] = useState<GatewayAuditLogItem[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditTotalPages, setAuditTotalPages] = useState(0)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditActionFilter, setAuditActionFilter] = useState('')

  // Customers state
  const [customers, setCustomers] = useState<GatewayCustomer[]>([])
  const [customersPage, setCustomersPage] = useState(1)
  const [customersTotal, setCustomersTotal] = useState(0)
  const [customersTotalPages, setCustomersTotalPages] = useState(0)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [totalUniqueCustomers, setTotalUniqueCustomers] = useState(0)

  // Action states
  const [actionLoading, setActionLoading] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState<'suspend' | 'block' | null>(null)
  const [actionReason, setActionReason] = useState('')

  const perPage = 15

  // Load merchant data
  const loadMerchantData = async () => {
    if (!merchantId) return

    try {
      setLoading(true)
      const [detailsResponse, summaryData] = await Promise.all([
        getMerchantDetails(merchantId),
        getMerchantSummary(merchantId).catch(() => null),
      ])

      const details = (detailsResponse as any).merchant || detailsResponse
      setMerchant(details)

      if (summaryData) {
        setSummary(summaryData)
      }

      // Populate settings form
      setSettingsForm({
        custom_fee_percent: details.fee_percentage ?? details.custom_fee_percent ?? 2.5,
        daily_limit_brl: details.daily_limit_brl ?? 50000,
        monthly_limit_brl: details.monthly_limit_brl ?? 500000,
        min_payment_brl: details.min_payment_brl ?? 10,
        max_payment_brl: details.max_payment_brl ?? 10000,
        auto_settlement: details.auto_settlement ?? true,
        settlement_currency: details.settlement_currency || 'BRL',
        settlement_wallet_address: details.settlement_wallet_address || '',
        bank_pix_key: details.bank_pix_key || '',
        bank_pix_key_type: details.bank_pix_key_type || null,
        webhook_url: details.webhook_url || '',
        logo_url: details.logo_url || '',
        primary_color: details.primary_color || '#6366f1',
      })
    } catch (err: any) {
      console.error('Erro ao carregar merchant:', err)
      toast.error('Erro ao carregar dados do merchant')
    } finally {
      setLoading(false)
    }
  }

  // Load transactions
  const loadTransactions = async (page = 1) => {
    if (!merchantId) return

    try {
      setTransactionsLoading(true)
      const response = await getMerchantTransactions(merchantId, {
        page,
        per_page: perPage,
      })
      setTransactions(response.payments || [])
      setTransactionsTotal(response.total || 0)
      setTransactionsPage(page)
    } catch (err: any) {
      console.error('Erro ao carregar transacoes:', err)
      toast.error('Erro ao carregar transacoes')
    } finally {
      setTransactionsLoading(false)
    }
  }

  // Load API Keys
  const loadApiKeys = async () => {
    if (!merchantId) return
    try {
      setApiKeysLoading(true)
      const response = await getMerchantApiKeys(merchantId)
      setApiKeys(response.api_keys || [])
    } catch (err: any) {
      console.error('Erro ao carregar API keys:', err)
      toast.error('Erro ao carregar API keys')
    } finally {
      setApiKeysLoading(false)
    }
  }

  // Load Webhooks
  const loadWebhooks = async (page = 1) => {
    if (!merchantId) return
    try {
      setWebhooksLoading(true)
      const params: { page: number; per_page: number; status?: string } = { page, per_page: 15 }
      if (webhookStatusFilter) params.status = webhookStatusFilter
      const response = await getMerchantWebhooks(merchantId, params)
      setWebhooks(response.webhooks || [])
      setWebhookStats(response.stats || null)
      setWebhooksTotal(response.total || 0)
      setWebhooksTotalPages(response.total_pages || 0)
      setWebhooksPage(page)
    } catch (err: any) {
      console.error('Erro ao carregar webhooks:', err)
      toast.error('Erro ao carregar webhooks')
    } finally {
      setWebhooksLoading(false)
    }
  }

  // Load Audit Logs
  const loadAuditLogs = async (page = 1) => {
    if (!merchantId) return
    try {
      setAuditLoading(true)
      const params: { page: number; per_page: number; action?: string } = { page, per_page: 20 }
      if (auditActionFilter) params.action = auditActionFilter
      const response = await getMerchantAuditLogs(merchantId, params)
      setAuditLogs(response.audit_logs || [])
      setAuditTotal(response.total || 0)
      setAuditTotalPages(response.total_pages || 0)
      setAuditPage(page)
    } catch (err: any) {
      console.error('Erro ao carregar audit logs:', err)
      toast.error('Erro ao carregar auditoria')
    } finally {
      setAuditLoading(false)
    }
  }

  // Load Customers
  const loadCustomers = async (page = 1) => {
    if (!merchantId) return
    try {
      setCustomersLoading(true)
      const params: { page: number; per_page: number; search?: string } = { page, per_page: 15 }
      if (customerSearch) params.search = customerSearch
      const response = await getMerchantCustomers(merchantId, params)
      setCustomers(response.customers || [])
      setCustomersTotal(response.total || 0)
      setCustomersTotalPages(response.total_pages || 0)
      setTotalUniqueCustomers(response.total_unique_customers || 0)
      setCustomersPage(page)
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err)
      toast.error('Erro ao carregar clientes')
    } finally {
      setCustomersLoading(false)
    }
  }

  // Create API Key
  const handleCreateApiKey = async () => {
    if (!merchantId || !newKeyName.trim()) return
    try {
      const response = await createMerchantApiKey(merchantId, {
        name: newKeyName,
        is_test: newKeyIsTest,
      })
      if (response.api_key?.full_key) {
        setNewKeyResult(response.api_key.full_key)
        toast.success('API Key criada com sucesso')
        loadApiKeys()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao criar API key')
    }
  }

  // Revoke API Key
  const handleRevokeApiKey = async () => {
    if (!merchantId || !revokeKeyId) return
    try {
      await revokeMerchantApiKey(merchantId, revokeKeyId, revokeReason)
      toast.success('API Key revogada com sucesso')
      setRevokeKeyId(null)
      setRevokeReason('')
      loadApiKeys()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao revogar API key')
    }
  }

  // Initial load
  useEffect(() => {
    loadMerchantData()
  }, [merchantId])

  // Load transactions when tab changes
  useEffect(() => {
    if (activeTab === 'transactions' && transactions.length === 0) {
      loadTransactions()
    }
    if (activeTab === 'api-keys' && apiKeys.length === 0) {
      loadApiKeys()
    }
    if (activeTab === 'webhooks' && webhooks.length === 0) {
      loadWebhooks()
    }
    if (activeTab === 'audit' && auditLogs.length === 0) {
      loadAuditLogs()
    }
    if (activeTab === 'customers' && customers.length === 0) {
      loadCustomers()
    }
  }, [activeTab])

  // Save settings
  const handleSaveSettings = async () => {
    if (!merchantId) return

    try {
      setSettingsSaving(true)
      await updateMerchantSettings(merchantId, settingsForm)
      toast.success('Configurações salvas com sucesso!')
      loadMerchantData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar configurações')
    } finally {
      setSettingsSaving(false)
    }
  }

  // Actions
  const handleApprove = async () => {
    if (!merchantId) return
    try {
      setActionLoading(true)
      await approveMerchant(merchantId)
      toast.success('Merchant aprovado com sucesso!')
      loadMerchantData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao aprovar merchant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!merchantId || !actionReason.trim()) return
    try {
      setActionLoading(true)
      await suspendMerchant(merchantId, actionReason)
      toast.success('Merchant suspenso com sucesso!')
      setShowReasonModal(null)
      setActionReason('')
      loadMerchantData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao suspender merchant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBlock = async () => {
    if (!merchantId || !actionReason.trim()) return
    try {
      setActionLoading(true)
      await blockMerchant(merchantId, actionReason)
      toast.success('Merchant bloqueado com sucesso!')
      setShowReasonModal(null)
      setActionReason('')
      loadMerchantData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao bloquear merchant')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!merchantId) return
    try {
      setActionLoading(true)
      await reactivateMerchant(merchantId)
      toast.success('Merchant reativado com sucesso!')
      loadMerchantData()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao reativar merchant')
    } finally {
      setActionLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  // Loading state
  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='w-8 h-8 text-purple-500 animate-spin' />
      </div>
    )
  }

  if (!merchant) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px]'>
        <Building2 className='w-16 h-16 text-gray-300 dark:text-gray-600 mb-4' />
        <p className='text-gray-500 dark:text-gray-400'>Merchant não encontrado</p>
        <button
          onClick={() => navigate('/admin/gateway')}
          className='mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700'
        >
          Voltar
        </button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[merchant.status]
  const totalTransactionPages = Math.ceil(transactionsTotal / perPage)

  return (
    <div className='space-y-4 p-4'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
          <div className='flex items-start gap-4'>
            <button
              onClick={() => navigate('/admin/gateway')}
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
            >
              <ArrowLeft className='w-5 h-5 text-gray-500' />
            </button>

            <div className='flex items-center gap-4'>
              {merchant.logo_url ? (
                <img
                  src={merchant.logo_url}
                  alt={merchant.company_name}
                  className='w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-gray-700'
                />
              ) : (
                <div
                  className='w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold'
                  style={{ backgroundColor: merchant.primary_color || '#6366f1' }}
                >
                  {merchant.company_name.charAt(0)}
                </div>
              )}

              <div>
                <div className='flex items-center gap-3'>
                  <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
                    {merchant.company_name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass}`}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>
                <div className='flex items-center gap-2 mt-1'>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>
                    {merchant.merchant_code}
                  </span>
                  <button
                    onClick={() => copyToClipboard(merchant.merchant_code, 'Código')}
                    className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                  >
                    <Copy className='w-3 h-3 text-gray-400' />
                  </button>
                  <span className='text-gray-300 dark:text-gray-600'>•</span>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>{merchant.cnpj}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className='flex items-center gap-2'>
            {merchant.status === 'PENDING' && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className='flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50'
              >
                <Check className='w-4 h-4' />
                Aprovar
              </button>
            )}
            {merchant.status === 'ACTIVE' && (
              <button
                onClick={() => setShowReasonModal('suspend')}
                className='flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors'
              >
                <Pause className='w-4 h-4' />
                Suspender
              </button>
            )}
            {(merchant.status === 'SUSPENDED' || merchant.status === 'BLOCKED') && (
              <button
                onClick={handleReactivate}
                disabled={actionLoading}
                className='flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50'
              >
                <Play className='w-4 h-4' />
                Reativar
              </button>
            )}
            {merchant.status !== 'BLOCKED' && (
              <button
                onClick={() => setShowReasonModal('block')}
                className='flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors'
              >
                <Ban className='w-4 h-4' />
                Bloquear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
        <div className='flex overflow-x-auto border-b border-gray-200 dark:border-gray-700'>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-500/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className='p-4'>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className='space-y-6'>
              {/* Stats Cards */}
              {summary && (
                <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                  <div className='bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white'>
                    <div className='flex items-center gap-2 mb-2'>
                      <TrendingUp className='w-5 h-5 opacity-80' />
                      <span className='text-sm opacity-80'>Volume Total</span>
                    </div>
                    <p className='text-2xl font-bold'>{formatBRL(summary.total_volume_brl)}</p>
                  </div>
                  <div className='bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white'>
                    <div className='flex items-center gap-2 mb-2'>
                      <CreditCard className='w-5 h-5 opacity-80' />
                      <span className='text-sm opacity-80'>Transações</span>
                    </div>
                    <p className='text-2xl font-bold'>{summary.total_payments.toLocaleString()}</p>
                  </div>
                  <div className='bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white'>
                    <div className='flex items-center gap-2 mb-2'>
                      <DollarSign className='w-5 h-5 opacity-80' />
                      <span className='text-sm opacity-80'>Taxas Coletadas</span>
                    </div>
                    <p className='text-2xl font-bold'>{formatBRL(summary.total_fees_brl)}</p>
                  </div>
                  <div className='bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Wallet className='w-5 h-5 opacity-80' />
                      <span className='text-sm opacity-80'>Pendente Settlement</span>
                    </div>
                    <p className='text-2xl font-bold'>
                      {formatBRL(summary.pending_settlement_brl)}
                    </p>
                  </div>
                </div>
              )}

              {/* Merchant Info */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                {/* Company Info */}
                <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                  <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                    <Building2 className='w-4 h-4' />
                    Dados da Empresa
                  </h3>
                  <div className='space-y-3'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-500'>Razão Social</span>
                      <span className='text-sm text-gray-900 dark:text-white font-medium'>
                        {merchant.company_name}
                      </span>
                    </div>
                    {merchant.trade_name && (
                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-500'>Nome Fantasia</span>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {merchant.trade_name}
                        </span>
                      </div>
                    )}
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-500'>CNPJ</span>
                      <span className='text-sm text-gray-900 dark:text-white'>{merchant.cnpj}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-500'>Email</span>
                      <span className='text-sm text-gray-900 dark:text-white'>
                        {merchant.email}
                      </span>
                    </div>
                    {merchant.phone && (
                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-500'>Telefone</span>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {merchant.phone}
                        </span>
                      </div>
                    )}
                    {merchant.website && (
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-gray-500'>Website</span>
                        <a
                          href={merchant.website}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1'
                        >
                          {merchant.website.replace(/^https?:\/\//, '')}
                          <ExternalLink className='w-3 h-3' />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Owner Info */}
                <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                  <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                    <Users className='w-4 h-4' />
                    Responsável
                  </h3>
                  <div className='space-y-3'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-500'>Nome</span>
                      <span className='text-sm text-gray-900 dark:text-white font-medium'>
                        {merchant.owner_name}
                      </span>
                    </div>
                    {merchant.owner_email && (
                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-500'>Email</span>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {merchant.owner_email}
                        </span>
                      </div>
                    )}
                    {merchant.owner_phone && (
                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-500'>Telefone</span>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {merchant.owner_phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                {merchant.street && (
                  <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                    <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4'>
                      Endereço
                    </h3>
                    <p className='text-sm text-gray-900 dark:text-white'>
                      {merchant.street}, {merchant.number}
                      {merchant.complement && ` - ${merchant.complement}`}
                      <br />
                      {merchant.neighborhood} - {merchant.city}/{merchant.state}
                      <br />
                      CEP: {merchant.zip_code}
                    </p>
                  </div>
                )}

                {/* Dates */}
                <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                  <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                    <Calendar className='w-4 h-4' />
                    Datas
                  </h3>
                  <div className='space-y-3'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-500'>Cadastro</span>
                      <span className='text-sm text-gray-900 dark:text-white'>
                        {formatDate(merchant.created_at)}
                      </span>
                    </div>
                    {merchant.activated_at && (
                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-500'>Ativação</span>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {formatDate(merchant.activated_at)}
                        </span>
                      </div>
                    )}
                    {merchant.suspended_at && (
                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-500'>Suspenso em</span>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {formatDate(merchant.suspended_at)}
                        </span>
                      </div>
                    )}
                    {summary?.last_payment_date && (
                      <div className='flex justify-between'>
                        <span className='text-sm text-gray-500'>Última Transação</span>
                        <span className='text-sm text-gray-900 dark:text-white'>
                          {formatDate(summary.last_payment_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className='space-y-6'>
              {/* Fees & Limits */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <Percent className='w-4 h-4' />
                  Taxas e Limites
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Taxa de Processamento (%)
                    </label>
                    <input
                      type='number'
                      value={settingsForm.custom_fee_percent || 0}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          custom_fee_percent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      step='0.1'
                      min='0'
                      max='100'
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Limite Diário (BRL)
                    </label>
                    <input
                      type='number'
                      value={settingsForm.daily_limit_brl || 0}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          daily_limit_brl: parseFloat(e.target.value) || 0,
                        }))
                      }
                      min='0'
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Limite Mensal (BRL)
                    </label>
                    <input
                      type='number'
                      value={settingsForm.monthly_limit_brl || 0}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          monthly_limit_brl: parseFloat(e.target.value) || 0,
                        }))
                      }
                      min='0'
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    />
                  </div>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Valor Mínimo por Transação (BRL)
                    </label>
                    <input
                      type='number'
                      value={settingsForm.min_payment_brl || 0}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          min_payment_brl: parseFloat(e.target.value) || 0,
                        }))
                      }
                      min='0'
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Valor Máximo por Transação (BRL)
                    </label>
                    <input
                      type='number'
                      value={settingsForm.max_payment_brl || 0}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          max_payment_brl: parseFloat(e.target.value) || 0,
                        }))
                      }
                      min='0'
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    />
                  </div>
                </div>
              </div>

              {/* Settlement */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <Wallet className='w-4 h-4' />
                  Settlement
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Moeda de Settlement
                    </label>
                    <select
                      value={settingsForm.settlement_currency || 'BRL'}
                      onChange={e =>
                        setSettingsForm(prev => ({ ...prev, settlement_currency: e.target.value }))
                      }
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    >
                      <option value='BRL'>BRL (Real)</option>
                      <option value='USDT'>USDT (Tether)</option>
                      <option value='BTC'>BTC (Bitcoin)</option>
                      <option value='ETH'>ETH (Ethereum)</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Settlement Automático
                    </label>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() =>
                          setSettingsForm(prev => ({ ...prev, auto_settlement: true }))
                        }
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                          settingsForm.auto_settlement
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Ativo
                      </button>
                      <button
                        type='button'
                        onClick={() =>
                          setSettingsForm(prev => ({ ...prev, auto_settlement: false }))
                        }
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                          !settingsForm.auto_settlement
                            ? 'bg-gray-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>
                </div>
                <div className='mt-4'>
                  <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                    Carteira de Settlement (para cripto)
                  </label>
                  <input
                    type='text'
                    value={settingsForm.settlement_wallet_address || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({
                        ...prev,
                        settlement_wallet_address: e.target.value,
                      }))
                    }
                    placeholder='0x...'
                    className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                  />
                </div>
              </div>

              {/* PIX */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <CreditCard className='w-4 h-4' />
                  Configuração PIX
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Tipo de Chave PIX
                    </label>
                    <select
                      value={settingsForm.bank_pix_key_type || ''}
                      onChange={e =>
                        setSettingsForm(prev => ({ ...prev, bank_pix_key_type: e.target.value }))
                      }
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    >
                      <option value=''>Selecione...</option>
                      <option value='CPF'>CPF</option>
                      <option value='CNPJ'>CNPJ</option>
                      <option value='EMAIL'>E-mail</option>
                      <option value='PHONE'>Telefone</option>
                      <option value='EVP'>Chave Aleatória</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Chave PIX
                    </label>
                    <input
                      type='text'
                      value={settingsForm.bank_pix_key || ''}
                      onChange={e =>
                        setSettingsForm(prev => ({ ...prev, bank_pix_key: e.target.value }))
                      }
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    />
                  </div>
                </div>
              </div>

              {/* Webhook */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <Link2 className='w-4 h-4' />
                  Webhook
                </h3>
                <div>
                  <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                    URL de Webhook
                  </label>
                  <input
                    type='url'
                    value={settingsForm.webhook_url || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({ ...prev, webhook_url: e.target.value }))
                    }
                    placeholder='https://api.merchant.com/webhook'
                    className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                  />
                </div>
              </div>

              {/* Branding */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <Palette className='w-4 h-4' />
                  Personalização
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      URL do Logo
                    </label>
                    <input
                      type='url'
                      value={settingsForm.logo_url || ''}
                      onChange={e =>
                        setSettingsForm(prev => ({ ...prev, logo_url: e.target.value }))
                      }
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Cor Primária
                    </label>
                    <div className='flex gap-2'>
                      <input
                        type='color'
                        value={settingsForm.primary_color || '#6366f1'}
                        onChange={e =>
                          setSettingsForm(prev => ({ ...prev, primary_color: e.target.value }))
                        }
                        className='w-12 h-10 p-1 rounded-lg cursor-pointer'
                      />
                      <input
                        type='text'
                        value={settingsForm.primary_color || '#6366f1'}
                        onChange={e =>
                          setSettingsForm(prev => ({ ...prev, primary_color: e.target.value }))
                        }
                        className='flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className='flex justify-end'>
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className='flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50'
                >
                  {settingsSaving ? (
                    <>
                      <RefreshCw className='w-4 h-4 animate-spin' />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className='w-4 h-4' />
                      Salvar Configurações
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className='space-y-4'>
              {/* Search & Filters */}
              <div className='flex flex-col sm:flex-row gap-3'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <input
                    type='text'
                    value={transactionSearch}
                    onChange={e => setTransactionSearch(e.target.value)}
                    placeholder='Buscar por email, código...'
                    className='w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                  />
                </div>
                <button
                  onClick={() => loadTransactions(1)}
                  disabled={transactionsLoading}
                  className='flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm'
                >
                  <RefreshCw className={`w-4 h-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {/* Transactions Table */}
              {transactionsLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <RefreshCw className='w-6 h-6 text-purple-500 animate-spin' />
                </div>
              ) : transactions.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12'>
                  <CreditCard className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-3' />
                  <p className='text-gray-500 dark:text-gray-400'>Nenhuma transação encontrada</p>
                </div>
              ) : (
                <>
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-gray-50 dark:bg-gray-900'>
                        <tr>
                          <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                            ID
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                            Cliente
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                            Valor
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                            Método
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                            Status
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                            Data
                          </th>
                          <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                        {transactions.map(tx => {
                          const statusCfg = getPaymentStatusConfig(tx.status)
                          return (
                            <tr key={tx.id} className='hover:bg-gray-50 dark:hover:bg-gray-900/50'>
                              <td className='px-4 py-3'>
                                <span className='text-xs font-mono text-gray-500'>
                                  {tx.id.slice(0, 8)}...
                                </span>
                              </td>
                              <td className='px-4 py-3'>
                                <span className='text-sm text-gray-900 dark:text-white'>
                                  {tx.customer_email || 'N/A'}
                                </span>
                              </td>
                              <td className='px-4 py-3'>
                                <span className='text-sm font-medium text-gray-900 dark:text-white'>
                                  {formatBRL(tx.amount)}
                                </span>
                              </td>
                              <td className='px-4 py-3'>
                                <span className='text-sm text-gray-500'>
                                  {tx.payment_method || 'PIX'}
                                </span>
                              </td>
                              <td className='px-4 py-3'>
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}
                                >
                                  {statusCfg.label}
                                </span>
                              </td>
                              <td className='px-4 py-3'>
                                <span className='text-sm text-gray-500'>
                                  {formatDateShort(tx.created_at)}
                                </span>
                              </td>
                              <td className='px-4 py-3 text-right'>
                                <button
                                  onClick={() => copyToClipboard(tx.id, 'ID da transação')}
                                  className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                                  title='Copiar ID'
                                >
                                  <Copy className='w-4 h-4 text-gray-400' />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalTransactionPages > 1 && (
                    <div className='flex items-center justify-between pt-4'>
                      <p className='text-sm text-gray-500'>
                        Página {transactionsPage} de {totalTransactionPages} ({transactionsTotal}{' '}
                        transações)
                      </p>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => loadTransactions(transactionsPage - 1)}
                          disabled={transactionsPage === 1 || transactionsLoading}
                          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50'
                        >
                          <ChevronLeft className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => loadTransactions(transactionsPage + 1)}
                          disabled={
                            transactionsPage === totalTransactionPages || transactionsLoading
                          }
                          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50'
                        >
                          <ChevronRight className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
                  <Key className='w-4 h-4' />
                  API Keys ({apiKeys.length})
                </h3>
                <div className='flex gap-2'>
                  <button
                    onClick={loadApiKeys}
                    disabled={apiKeysLoading}
                    title='Atualizar'
                    className='flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm'
                  >
                    <RefreshCw className={`w-4 h-4 ${apiKeysLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateKeyModal(true)
                      setNewKeyName('')
                      setNewKeyIsTest(false)
                      setNewKeyResult(null)
                    }}
                    title='Criar nova API Key'
                    className='flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium'
                  >
                    <Plus className='w-4 h-4' />
                    Nova Key
                  </button>
                </div>
              </div>

              {apiKeysLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <RefreshCw className='w-6 h-6 text-purple-500 animate-spin' />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12'>
                  <Key className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-3' />
                  <p className='text-gray-500 dark:text-gray-400'>Nenhuma API Key encontrada</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {apiKeys.map(key => (
                    <div
                      key={key.id}
                      className={`bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border ${key.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 dark:border-red-800 opacity-60'}`}
                    >
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-1'>
                            <span className='font-medium text-gray-900 dark:text-white text-sm'>
                              {key.name}
                            </span>
                            {key.is_test ? (
                              <span className='px-2 py-0.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium'>
                                Teste
                              </span>
                            ) : (
                              <span className='px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded text-xs font-medium'>
                                Producao
                              </span>
                            )}
                            {key.is_active ? (
                              <span className='flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400'>
                                <ShieldCheck className='w-3 h-3' /> Ativa
                              </span>
                            ) : (
                              <span className='flex items-center gap-1 text-xs text-red-600 dark:text-red-400'>
                                <ShieldOff className='w-3 h-3' /> Revogada
                              </span>
                            )}
                          </div>
                          <div className='flex items-center gap-2 mb-2'>
                            <code className='text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded font-mono'>
                              {key.key_prefix}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.key_prefix, 'Prefixo')}
                              title='Copiar prefixo'
                              className='p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded'
                            >
                              <Copy className='w-3 h-3 text-gray-400' />
                            </button>
                          </div>
                          {key.description && (
                            <p className='text-xs text-gray-500 mb-2'>{key.description}</p>
                          )}
                          <div className='flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400'>
                            <span className='flex items-center gap-1'>
                              <Globe className='w-3 h-3' />
                              {key.total_requests.toLocaleString()} requisicoes
                            </span>
                            {key.last_used_at && (
                              <span className='flex items-center gap-1'>
                                <Clock className='w-3 h-3' />
                                Ultimo uso: {formatDateShort(key.last_used_at)}
                              </span>
                            )}
                            {key.last_used_ip && (
                              <span className='flex items-center gap-1'>
                                <Hash className='w-3 h-3' />
                                IP: {key.last_used_ip}
                              </span>
                            )}
                            <span className='flex items-center gap-1'>
                              <Calendar className='w-3 h-3' />
                              Criada: {formatDateShort(key.created_at)}
                            </span>
                          </div>
                          {key.revoked_at && (
                            <div className='mt-2 text-xs text-red-500'>
                              Revogada em {formatDate(key.revoked_at)}
                              {key.revoked_reason && ` - ${key.revoked_reason}`}
                            </div>
                          )}
                        </div>
                        {key.is_active && (
                          <button
                            onClick={() => {
                              setRevokeKeyId(key.id)
                              setRevokeReason('')
                            }}
                            title='Revogar API Key'
                            className='flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-xs font-medium'
                          >
                            <ShieldOff className='w-3 h-3' />
                            Revogar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <div className='space-y-4'>
              {/* Webhook Stats */}
              {webhookStats && (
                <div className='grid grid-cols-3 gap-3'>
                  <div className='bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3 text-center'>
                    <p className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                      {webhookStats.total_sent}
                    </p>
                    <p className='text-xs text-gray-500 flex items-center justify-center gap-1'>
                      <Send className='w-3 h-3' /> Enviados
                    </p>
                  </div>
                  <div className='bg-red-50 dark:bg-red-500/10 rounded-lg p-3 text-center'>
                    <p className='text-lg font-bold text-red-600 dark:text-red-400'>
                      {webhookStats.total_failed}
                    </p>
                    <p className='text-xs text-gray-500 flex items-center justify-center gap-1'>
                      <XCircle className='w-3 h-3' /> Falharam
                    </p>
                  </div>
                  <div className='bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-3 text-center'>
                    <p className='text-lg font-bold text-yellow-600 dark:text-yellow-400'>
                      {webhookStats.total_pending}
                    </p>
                    <p className='text-xs text-gray-500 flex items-center justify-center gap-1'>
                      <Clock className='w-3 h-3' /> Pendentes
                    </p>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className='flex items-center gap-3'>
                <select
                  title='Filtrar por status'
                  value={webhookStatusFilter}
                  onChange={e => {
                    setWebhookStatusFilter(e.target.value)
                    setTimeout(() => loadWebhooks(1), 100)
                  }}
                  className='px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                >
                  <option value=''>Todos os status</option>
                  <option value='SENT'>Enviados</option>
                  <option value='PENDING'>Pendentes</option>
                  <option value='FAILED'>Falharam</option>
                  <option value='EXHAUSTED'>Esgotados</option>
                </select>
                <button
                  onClick={() => loadWebhooks(1)}
                  disabled={webhooksLoading}
                  title='Atualizar'
                  className='flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm'
                >
                  <RefreshCw className={`w-4 h-4 ${webhooksLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {/* Webhooks List */}
              {webhooksLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <RefreshCw className='w-6 h-6 text-purple-500 animate-spin' />
                </div>
              ) : webhooks.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12'>
                  <Bell className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-3' />
                  <p className='text-gray-500 dark:text-gray-400'>Nenhum webhook encontrado</p>
                </div>
              ) : (
                <>
                  <div className='space-y-2'>
                    {webhooks.map(w => {
                      const isSuccess = w.status === 'SENT'
                      const isFailed = w.status === 'FAILED' || w.status === 'EXHAUSTED'
                      return (
                        <div
                          key={w.id}
                          className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700'
                        >
                          <div className='flex items-center justify-between mb-2'>
                            <div className='flex items-center gap-2'>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  isSuccess
                                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                    : isFailed
                                      ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                      : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                                }`}
                              >
                                {isSuccess ? (
                                  <CheckCircle className='w-3 h-3' />
                                ) : isFailed ? (
                                  <XCircle className='w-3 h-3' />
                                ) : (
                                  <Clock className='w-3 h-3' />
                                )}
                                {w.status}
                              </span>
                              <code className='text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded'>
                                {w.event}
                              </code>
                            </div>
                            <span className='text-xs text-gray-400'>
                              {formatDate(w.created_at)}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 text-xs text-gray-500 mb-1'>
                            <Globe className='w-3 h-3' />
                            <span className='truncate max-w-xs'>{w.url}</span>
                          </div>
                          <div className='flex flex-wrap gap-3 text-xs text-gray-400'>
                            {w.payment_code && (
                              <span className='flex items-center gap-1'>
                                <CreditCard className='w-3 h-3' />
                                {w.payment_code}
                              </span>
                            )}
                            <span>
                              Tentativas: {w.attempts}/{w.max_attempts}
                            </span>
                            {w.last_response_code && (
                              <span
                                className={
                                  w.last_response_code >= 200 && w.last_response_code < 300
                                    ? 'text-emerald-500'
                                    : 'text-red-500'
                                }
                              >
                                HTTP {w.last_response_code}
                              </span>
                            )}
                            {w.last_error && (
                              <span className='text-red-400 truncate max-w-xs'>{w.last_error}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {webhooksTotalPages > 1 && (
                    <div className='flex items-center justify-between pt-2'>
                      <p className='text-sm text-gray-500'>
                        Pagina {webhooksPage} de {webhooksTotalPages} ({webhooksTotal} webhooks)
                      </p>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => loadWebhooks(webhooksPage - 1)}
                          disabled={webhooksPage === 1}
                          title='Anterior'
                          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50'
                        >
                          <ChevronLeft className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => loadWebhooks(webhooksPage + 1)}
                          disabled={webhooksPage >= webhooksTotalPages}
                          title='Proximo'
                          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50'
                        >
                          <ChevronRight className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <div className='space-y-4'>
              <div className='flex items-center gap-3'>
                <select
                  title='Filtrar por acao'
                  value={auditActionFilter}
                  onChange={e => {
                    setAuditActionFilter(e.target.value)
                    setTimeout(() => loadAuditLogs(1), 100)
                  }}
                  className='px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                >
                  <option value=''>Todas as acoes</option>
                  <option value='MERCHANT_CREATED'>Merchant Criado</option>
                  <option value='MERCHANT_UPDATED'>Merchant Atualizado</option>
                  <option value='MERCHANT_ACTIVATED'>Merchant Ativado</option>
                  <option value='MERCHANT_SUSPENDED'>Merchant Suspenso</option>
                  <option value='MERCHANT_BLOCKED'>Merchant Bloqueado</option>
                  <option value='MERCHANT_SETTINGS_UPDATED'>Config. Atualizadas</option>
                  <option value='API_KEY_CREATED'>API Key Criada</option>
                  <option value='API_KEY_REVOKED'>API Key Revogada</option>
                  <option value='PAYMENT_CREATED'>Pagamento Criado</option>
                  <option value='PAYMENT_CONFIRMED'>Pagamento Confirmado</option>
                  <option value='PAYMENT_COMPLETED'>Pagamento Completo</option>
                </select>
                <button
                  onClick={() => loadAuditLogs(1)}
                  disabled={auditLoading}
                  title='Atualizar'
                  className='flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm'
                >
                  <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {auditLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <RefreshCw className='w-6 h-6 text-purple-500 animate-spin' />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12'>
                  <FileText className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-3' />
                  <p className='text-gray-500 dark:text-gray-400'>Nenhum log de auditoria</p>
                </div>
              ) : (
                <>
                  <div className='space-y-2'>
                    {auditLogs.map(log => {
                      const actionLabels: Record<string, string> = {
                        MERCHANT_CREATED: 'Merchant Criado',
                        MERCHANT_UPDATED: 'Merchant Atualizado',
                        MERCHANT_ACTIVATED: 'Merchant Ativado',
                        MERCHANT_SUSPENDED: 'Merchant Suspenso',
                        MERCHANT_BLOCKED: 'Merchant Bloqueado',
                        MERCHANT_SETTINGS_UPDATED: 'Config. Atualizadas',
                        API_KEY_CREATED: 'API Key Criada',
                        API_KEY_REVOKED: 'API Key Revogada',
                        PAYMENT_CREATED: 'Pagamento Criado',
                        PAYMENT_CONFIRMED: 'Pagamento Confirmado',
                        PAYMENT_COMPLETED: 'Pagamento Completo',
                        PAYMENT_REFUNDED: 'Pagamento Estornado',
                        WEBHOOK_CONFIGURED: 'Webhook Configurado',
                        SETTLEMENT_PROCESSED: 'Settlement Processado',
                      }
                      const actionColors: Record<string, string> = {
                        MERCHANT_CREATED:
                          'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
                        MERCHANT_ACTIVATED:
                          'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
                        MERCHANT_SUSPENDED:
                          'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
                        MERCHANT_BLOCKED:
                          'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
                        API_KEY_REVOKED:
                          'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
                        PAYMENT_COMPLETED:
                          'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
                      }
                      const defaultColor =
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'

                      return (
                        <div
                          key={log.id}
                          className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700'
                        >
                          <div className='flex items-center justify-between mb-2'>
                            <div className='flex items-center gap-2'>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] || defaultColor}`}
                              >
                                {actionLabels[log.action] || log.action}
                              </span>
                              <span className='text-xs text-gray-400'>{log.actor_type}</span>
                            </div>
                            <span className='text-xs text-gray-400'>
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                          {log.description && (
                            <p className='text-xs text-gray-600 dark:text-gray-400 mb-2'>
                              {log.description}
                            </p>
                          )}
                          <div className='flex flex-wrap gap-3 text-xs text-gray-400'>
                            {log.actor_id && (
                              <span className='flex items-center gap-1'>
                                <UserCircle className='w-3 h-3' />
                                {log.actor_email || log.actor_id.slice(0, 8)}
                              </span>
                            )}
                            {log.ip_address && (
                              <span className='flex items-center gap-1'>
                                <Globe className='w-3 h-3' />
                                {log.ip_address}
                              </span>
                            )}
                          </div>
                          {(log.old_data || log.new_data) && (
                            <details className='mt-2'>
                              <summary className='text-xs text-purple-500 cursor-pointer hover:text-purple-600'>
                                Ver detalhes
                              </summary>
                              <div className='mt-1 grid grid-cols-2 gap-2 text-xs'>
                                {log.old_data && (
                                  <div className='bg-red-50 dark:bg-red-900/20 p-2 rounded'>
                                    <p className='font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1'>
                                      <ArrowDownRight className='w-3 h-3' /> Anterior
                                    </p>
                                    <pre className='text-gray-500 whitespace-pre-wrap break-all'>
                                      {JSON.stringify(log.old_data, null, 1)}
                                    </pre>
                                  </div>
                                )}
                                {log.new_data && (
                                  <div className='bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded'>
                                    <p className='font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1'>
                                      <ArrowUpRight className='w-3 h-3' /> Novo
                                    </p>
                                    <pre className='text-gray-500 whitespace-pre-wrap break-all'>
                                      {JSON.stringify(log.new_data, null, 1)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {auditTotalPages > 1 && (
                    <div className='flex items-center justify-between pt-2'>
                      <p className='text-sm text-gray-500'>
                        Pagina {auditPage} de {auditTotalPages} ({auditTotal} registros)
                      </p>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => loadAuditLogs(auditPage - 1)}
                          disabled={auditPage === 1}
                          title='Anterior'
                          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50'
                        >
                          <ChevronLeft className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => loadAuditLogs(auditPage + 1)}
                          disabled={auditPage >= auditTotalPages}
                          title='Proximo'
                          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50'
                        >
                          <ChevronRight className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className='space-y-4'>
              {/* Header stats */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Users className='w-4 h-4 text-gray-500' />
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    {totalUniqueCustomers} clientes unicos
                  </span>
                </div>
              </div>

              {/* Search */}
              <div className='flex flex-col sm:flex-row gap-3'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <input
                    type='text'
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadCustomers(1)}
                    placeholder='Buscar por email, nome, documento...'
                    className='w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                  />
                </div>
                <button
                  onClick={() => loadCustomers(1)}
                  disabled={customersLoading}
                  title='Buscar'
                  className='flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm'
                >
                  <RefreshCw className={`w-4 h-4 ${customersLoading ? 'animate-spin' : ''}`} />
                  Buscar
                </button>
              </div>

              {/* Customers List */}
              {customersLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <RefreshCw className='w-6 h-6 text-purple-500 animate-spin' />
                </div>
              ) : customers.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12'>
                  <Users className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-3' />
                  <p className='text-gray-500 dark:text-gray-400'>Nenhum cliente encontrado</p>
                </div>
              ) : (
                <>
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-gray-50 dark:bg-gray-900'>
                        <tr>
                          <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                            Cliente
                          </th>
                          <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                            Contato
                          </th>
                          <th className='px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                            Pagamentos
                          </th>
                          <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                            Volume
                          </th>
                          <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                            Primeiro / Ultimo
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                        {customers.map((c, i) => (
                          <tr
                            key={c.email || i}
                            className='hover:bg-gray-50 dark:hover:bg-gray-900/50'
                          >
                            <td className='px-4 py-3'>
                              <div>
                                <p className='text-sm font-medium text-gray-900 dark:text-white'>
                                  {c.name || 'Sem nome'}
                                </p>
                                {c.document && (
                                  <p className='text-xs text-gray-400 flex items-center gap-1 mt-0.5'>
                                    <FileDigit className='w-3 h-3' />
                                    {c.document}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className='px-4 py-3'>
                              <div className='space-y-1'>
                                <p className='text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1'>
                                  <Mail className='w-3 h-3' />
                                  {c.email}
                                </p>
                                {c.phone && (
                                  <p className='text-xs text-gray-500 flex items-center gap-1'>
                                    <Phone className='w-3 h-3' />
                                    {c.phone}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className='px-4 py-3 text-center'>
                              <div>
                                <span className='text-sm font-medium text-gray-900 dark:text-white'>
                                  {c.total_payments}
                                </span>
                                <p className='text-xs text-emerald-500'>
                                  {c.completed_payments} concluidos
                                </p>
                              </div>
                            </td>
                            <td className='px-4 py-3 text-right'>
                              <span className='text-sm font-medium text-gray-900 dark:text-white'>
                                {formatBRL(c.total_amount)}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-right'>
                              <div className='text-xs text-gray-500'>
                                {c.first_payment_at && <p>{formatDateShort(c.first_payment_at)}</p>}
                                {c.last_payment_at && (
                                  <p className='text-gray-400'>
                                    {formatDateShort(c.last_payment_at)}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {customersTotalPages > 1 && (
                    <div className='flex items-center justify-between pt-2'>
                      <p className='text-sm text-gray-500'>
                        Pagina {customersPage} de {customersTotalPages} ({customersTotal} clientes)
                      </p>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => loadCustomers(customersPage - 1)}
                          disabled={customersPage === 1}
                          title='Anterior'
                          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50'
                        >
                          <ChevronLeft className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => loadCustomers(customersPage + 1)}
                          disabled={customersPage >= customersTotalPages}
                          title='Proximo'
                          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50'
                        >
                          <ChevronRight className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full'>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-4'>
              {showReasonModal === 'suspend' ? 'Suspender Merchant' : 'Bloquear Merchant'}
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
              {showReasonModal === 'suspend'
                ? 'Informe o motivo da suspensao. O merchant podera ser reativado posteriormente.'
                : 'Informe o motivo do bloqueio. Esta acao e geralmente usada para fraude.'}
            </p>
            <textarea
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              placeholder='Motivo...'
              rows={3}
              className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm mb-4'
            />
            <div className='flex gap-2 justify-end'>
              <button
                onClick={() => {
                  setShowReasonModal(null)
                  setActionReason('')
                }}
                className='px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium'
              >
                Cancelar
              </button>
              <button
                onClick={showReasonModal === 'suspend' ? handleSuspend : handleBlock}
                disabled={!actionReason.trim() || actionLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  showReasonModal === 'suspend'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50`}
              >
                {actionLoading
                  ? 'Processando...'
                  : showReasonModal === 'suspend'
                    ? 'Suspender'
                    : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full'>
            {newKeyResult ? (
              <>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                  <CheckCircle className='w-5 h-5 text-emerald-500' />
                  API Key Criada
                </h3>
                <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
                  Copie a chave abaixo. Ela nao sera exibida novamente.
                </p>
                <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4'>
                  <code className='text-xs break-all text-gray-800 dark:text-gray-200 select-all'>
                    {newKeyResult}
                  </code>
                </div>
                <div className='flex gap-2 justify-end'>
                  <button
                    onClick={() => copyToClipboard(newKeyResult, 'API Key')}
                    className='flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium'
                  >
                    <Copy className='w-4 h-4' />
                    Copiar Key
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateKeyModal(false)
                      setNewKeyResult(null)
                    }}
                    className='px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium'
                  >
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                  <Key className='w-5 h-5' />
                  Criar Nova API Key
                </h3>
                <div className='space-y-4 mb-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Nome da Key
                    </label>
                    <input
                      type='text'
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      placeholder='Ex: Producao, Teste, Staging...'
                      className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Tipo
                    </label>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() => setNewKeyIsTest(false)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${!newKeyIsTest ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                      >
                        Producao
                      </button>
                      <button
                        type='button'
                        onClick={() => setNewKeyIsTest(true)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${newKeyIsTest ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                      >
                        Teste
                      </button>
                    </div>
                  </div>
                </div>
                <div className='flex gap-2 justify-end'>
                  <button
                    onClick={() => setShowCreateKeyModal(false)}
                    className='px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium'
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateApiKey}
                    disabled={!newKeyName.trim()}
                    className='px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50'
                  >
                    Criar Key
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Revoke API Key Modal */}
      {revokeKeyId && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full'>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
              <ShieldOff className='w-5 h-5 text-red-500' />
              Revogar API Key
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
              Esta acao e irreversivel. A API Key sera desativada permanentemente.
            </p>
            <textarea
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              placeholder='Motivo da revogacao (opcional)...'
              rows={2}
              className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm mb-4'
            />
            <div className='flex gap-2 justify-end'>
              <button
                onClick={() => {
                  setRevokeKeyId(null)
                  setRevokeReason('')
                }}
                className='px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium'
              >
                Cancelar
              </button>
              <button
                onClick={handleRevokeApiKey}
                className='px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium'
              >
                Revogar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminMerchantDetailPage
