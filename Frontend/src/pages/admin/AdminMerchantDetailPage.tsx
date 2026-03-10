/**
 * Admin Merchant Detail Page
 * ===========================
 *
 * Página completa para gerenciar um merchant específico.
 * Inclui abas para: Resumo, Configurações, Transações, API Keys, Webhooks, Auditoria
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
  Download,
  Eye,
  Save,
  Percent,
  Wallet,
  Link2,
  Palette,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
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
  type GatewayPayment,
  type MerchantSettings,
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
  bank_pix_key_type?: string
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
type TabType = 'overview' | 'settings' | 'transactions' | 'api-keys' | 'webhooks' | 'audit'

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Resumo', icon: <Building2 className='w-4 h-4' /> },
  { id: 'settings', label: 'Configurações', icon: <Settings className='w-4 h-4' /> },
  { id: 'transactions', label: 'Transações', icon: <CreditCard className='w-4 h-4' /> },
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
        bank_pix_key_type: details.bank_pix_key_type || '',
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
      console.error('Erro ao carregar transações:', err)
      toast.error('Erro ao carregar transações')
    } finally {
      setTransactionsLoading(false)
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
            <div className='flex flex-col items-center justify-center py-12'>
              <Key className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-3' />
              <p className='text-gray-500 dark:text-gray-400 mb-4'>Gerenciamento de API Keys</p>
              <p className='text-sm text-gray-400'>Em breve...</p>
            </div>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <div className='flex flex-col items-center justify-center py-12'>
              <Bell className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-3' />
              <p className='text-gray-500 dark:text-gray-400 mb-4'>Histórico de Webhooks</p>
              <p className='text-sm text-gray-400'>Em breve...</p>
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <div className='flex flex-col items-center justify-center py-12'>
              <FileText className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-3' />
              <p className='text-gray-500 dark:text-gray-400 mb-4'>Log de Auditoria</p>
              <p className='text-sm text-gray-400'>Em breve...</p>
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
                ? 'Informe o motivo da suspensão. O merchant poderá ser reativado posteriormente.'
                : 'Informe o motivo do bloqueio. Esta ação é geralmente usada para fraude.'}
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
    </div>
  )
}

export default AdminMerchantDetailPage
