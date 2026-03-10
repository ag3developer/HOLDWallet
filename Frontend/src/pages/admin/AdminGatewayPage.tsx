/**
 * WolkPay Gateway Admin Page
 * ===========================
 *
 * Página de administração do Gateway de Pagamentos.
 * Gerenciamento de merchants, API keys, pagamentos e webhooks.
 */

import React, { useState, useEffect } from 'react'
import {
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  RefreshCw,
  Ban,
  AlertTriangle,
  TrendingUp,
  MoreVertical,
  Check,
  Pause,
  Play,
  Settings,
  DollarSign,
  Percent,
  Link2,
  Palette,
  Copy,
  Wallet,
  CreditCard,
  X,
  Save,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  getGatewayStats,
  getMerchants,
  getMerchantDetails,
  updateMerchantSettings,
  getMerchantSummary,
  approveMerchant,
  suspendMerchant,
  blockMerchant,
  reactivateMerchant,
  type GatewayMerchant,
  type GatewayStats,
  type MerchantSettings,
} from '@/services/admin/adminGateway'

// Alias para compatibilidade com código existente
type Merchant = GatewayMerchant

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; bgClass: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pendente',
    bgClass: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    icon: <Clock className='w-3 h-3' />,
  },
  ACTIVE: {
    label: 'Ativo',
    bgClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle className='w-3 h-3' />,
  },
  SUSPENDED: {
    label: 'Suspenso',
    bgClass: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
    icon: <Pause className='w-3 h-3' />,
  },
  BLOCKED: {
    label: 'Bloqueado',
    bgClass: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
    icon: <Ban className='w-3 h-3' />,
  },
}

const getStatusConfig = (status: string) => {
  return (
    STATUS_CONFIG[status?.toUpperCase()] || {
      label: status || 'Desconhecido',
      bgClass: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
      icon: null,
    }
  )
}

// Format currency
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Format relative date
const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// Format date
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const AdminGatewayPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [stats, setStats] = useState<GatewayStats | null>(null)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [totalMerchants, setTotalMerchants] = useState(0)
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showReasonModal, setShowReasonModal] = useState<{
    action: 'suspend' | 'block'
    merchantId: string
  } | null>(null)
  const [actionReason, setActionReason] = useState('')

  // Settings Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<GatewayMerchant | null>(null)
  const [merchantSummary, setMerchantSummary] = useState<{
    total_volume_brl: number
    total_payments: number
    total_fees_brl: number
    pending_settlement_brl: number
    last_payment_date?: string
  } | null>(null)
  const [settingsForm, setSettingsForm] = useState<MerchantSettings>({
    custom_fee_percent: 2.5,
    daily_limit_brl: 50000,
    monthly_limit_brl: 500000,
    settlement_currency: 'BRL',
    settlement_wallet_address: '',
    bank_pix_key: '',
    bank_pix_key_type: '',
    webhook_url: '',
    logo_url: '',
    primary_color: '#6366f1',
    auto_settlement: true,
    min_payment_brl: 10,
    max_payment_brl: 10000,
  })
  const [settingsSaving, setSettingsSaving] = useState(false)

  const [viewMode, setViewMode] = useState<'merchants' | 'payments'>('merchants')
  const perPage = 20

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch stats
  const fetchStats = async () => {
    try {
      const data = await getGatewayStats()
      setStats(data)
    } catch (err: any) {
      console.error('Erro ao carregar estatísticas:', err)
    }
  }

  // Fetch merchants
  const fetchMerchants = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await getMerchants({
        page,
        per_page: perPage,
        status: statusFilter,
        search: debouncedSearch,
      })
      setMerchants(response.merchants || [])
      setTotalMerchants(response.total || 0)
    } catch (err: any) {
      console.error('Erro ao carregar merchants:', err)
      toast.error(err.response?.data?.detail || 'Erro ao carregar merchants')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch data
  const fetchData = async (isRefresh = false) => {
    await Promise.all([fetchStats(), fetchMerchants(isRefresh)])
  }

  useEffect(() => {
    fetchData()
  }, [page, statusFilter, debouncedSearch])

  // Actions
  const handleApproveMerchant = async (merchantId: string) => {
    try {
      setActionLoading(merchantId)
      await approveMerchant(merchantId)
      toast.success('Merchant aprovado com sucesso!')
      fetchData(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao aprovar merchant')
    } finally {
      setActionLoading(null)
      setShowActionMenu(null)
    }
  }

  const handleSuspendMerchant = async () => {
    if (!showReasonModal || !actionReason.trim()) {
      toast.error('Informe o motivo da suspensão')
      return
    }

    try {
      setActionLoading(showReasonModal.merchantId)
      await suspendMerchant(showReasonModal.merchantId, actionReason)
      toast.success('Merchant suspenso com sucesso!')
      fetchData(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao suspender merchant')
    } finally {
      setActionLoading(null)
      setShowReasonModal(null)
      setActionReason('')
    }
  }

  const handleBlockMerchant = async () => {
    if (!showReasonModal || !actionReason.trim()) {
      toast.error('Informe o motivo do bloqueio')
      return
    }

    try {
      setActionLoading(showReasonModal.merchantId)
      await blockMerchant(showReasonModal.merchantId, actionReason)
      toast.success('Merchant bloqueado com sucesso!')
      fetchData(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao bloquear merchant')
    } finally {
      setActionLoading(null)
      setShowReasonModal(null)
      setActionReason('')
    }
  }

  const handleReactivateMerchant = async (merchantId: string) => {
    try {
      setActionLoading(merchantId)
      await reactivateMerchant(merchantId)
      toast.success('Merchant reativado com sucesso!')
      fetchData(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao reativar merchant')
    } finally {
      setActionLoading(null)
      setShowActionMenu(null)
    }
  }

  // Open Settings Modal
  const openSettingsModal = async (merchant: GatewayMerchant) => {
    try {
      setSelectedMerchant(merchant)
      setShowSettingsModal(true)
      setShowActionMenu(null)

      // Load merchant details and summary
      const [detailsResponse, summary] = await Promise.all([
        getMerchantDetails(merchant.id),
        getMerchantSummary(merchant.id).catch(() => null),
      ])

      // O endpoint retorna { merchant: {...} }
      const details = (detailsResponse as any).merchant || detailsResponse

      // Populate form with current values from database
      setSettingsForm({
        custom_fee_percent: details.fee_percentage ?? details.custom_fee_percent ?? 2.5,
        daily_limit_brl: details.daily_limit ?? details.daily_limit_brl ?? 50000,
        monthly_limit_brl: details.monthly_limit ?? details.monthly_limit_brl ?? 500000,
        settlement_currency: details.settlement_currency || 'BRL',
        settlement_wallet_address: details.settlement_wallet_address || '',
        bank_pix_key: details.bank_pix_key || '',
        bank_pix_key_type: details.bank_pix_key_type || '',
        webhook_url: details.webhook_url || '',
        logo_url: details.logo_url || '',
        primary_color: details.primary_color || '#6366f1',
        auto_settlement: details.auto_settlement ?? true,
        min_payment_brl: details.min_payment_brl ?? 10,
        max_payment_brl: details.max_payment_brl ?? 10000,
      })

      if (summary) {
        setMerchantSummary(summary)
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do merchant:', err)
      toast.error('Erro ao carregar configurações')
    }
  }

  // Save Settings
  const handleSaveSettings = async () => {
    if (!selectedMerchant) return

    try {
      setSettingsSaving(true)
      await updateMerchantSettings(selectedMerchant.id, settingsForm)
      toast.success('Configurações salvas com sucesso!')
      setShowSettingsModal(false)
      fetchData(true)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar configurações')
    } finally {
      setSettingsSaving(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  const totalPages = Math.ceil(totalMerchants / perPage)

  // Stats cards
  const statsCards = [
    {
      id: 'total',
      label: 'Total de Merchants',
      value: stats?.merchants?.total || 0,
      icon: <Building2 className='w-5 h-5' />,
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'pending',
      label: 'Aguardando Aprovação',
      value: stats?.merchants?.pending || 0,
      icon: <Clock className='w-5 h-5' />,
      color: 'from-yellow-500 to-orange-600',
      urgent: (stats?.merchants?.pending || 0) > 0,
    },
    {
      id: 'active',
      label: 'Ativos',
      value: stats?.merchants?.active || 0,
      icon: <CheckCircle className='w-5 h-5' />,
      color: 'from-emerald-500 to-green-600',
    },
    {
      id: 'volume',
      label: 'Volume do Mês',
      value: formatBRL(stats?.payments?.this_month?.total || 0),
      icon: <TrendingUp className='w-5 h-5' />,
      color: 'from-blue-500 to-blue-600',
      isText: true,
    },
  ]

  return (
    <div className='space-y-4 p-4'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center'>
            <Building2 className='w-6 h-6 text-white' />
          </div>
          <div>
            <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
              WolkPay Gateway Admin
            </h1>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              Gestão de merchants e pagamentos
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className='flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors'
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {statsCards.map(stat => (
          <div
            key={stat.id}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 border ${
              stat.urgent
                ? 'border-yellow-400 dark:border-yellow-500 ring-2 ring-yellow-400/20'
                : 'border-gray-200 dark:border-gray-700'
            } shadow-sm`}
          >
            <div className='flex items-center justify-between mb-2'>
              <div
                className={`w-9 h-9 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}
              >
                <div className='text-white'>{stat.icon}</div>
              </div>
              {stat.urgent && <AlertTriangle className='w-4 h-4 text-yellow-500 animate-pulse' />}
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400'>{stat.label}</p>
            <p className='text-lg font-bold text-gray-900 dark:text-white mt-1'>
              {stat.isText ? stat.value : stat.value.toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      {/* View Mode Tabs */}
      <div className='flex gap-2 border-b border-gray-200 dark:border-gray-700'>
        <button
          onClick={() => setViewMode('merchants')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'merchants'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <div className='flex items-center gap-2'>
            <Building2 className='w-4 h-4' />
            Merchants
          </div>
        </button>
      </div>

      {/* Search and Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Buscar merchant...'
              className='w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500'
            />
          </div>

          <div className='flex gap-2'>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              title='Filtrar por status'
              aria-label='Filtrar por status'
              className='px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
            >
              <option value='all'>Todos Status</option>
              <option value='PENDING'>Pendentes</option>
              <option value='ACTIVE'>Ativos</option>
              <option value='SUSPENDED'>Suspensos</option>
              <option value='BLOCKED'>Bloqueados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Merchants List */}
      <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <RefreshCw className='w-6 h-6 text-purple-500 animate-spin' />
          </div>
        ) : merchants.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <Building2 className='w-12 h-12 text-gray-300 dark:text-gray-600 mb-3' />
            <p className='text-gray-500 dark:text-gray-400'>Nenhum merchant encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className='hidden md:block overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-900'>
                  <tr>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Merchant
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Taxa
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Volume
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Criado
                    </th>
                    <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {merchants.map(merchant => {
                    const statusConfig = getStatusConfig(merchant.status)
                    return (
                      <tr
                        key={merchant.id}
                        className='hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors'
                      >
                        <td className='px-4 py-3'>
                          <div>
                            <p className='font-medium text-gray-900 dark:text-white'>
                              {merchant.company_name}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              {merchant.merchant_code} • {merchant.cnpj}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              {merchant.email}
                            </p>
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass}`}
                          >
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='text-sm text-gray-900 dark:text-white'>
                            {merchant.fee_percentage?.toFixed(2) || '0.00'}%
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='text-sm text-gray-900 dark:text-white'>
                            {formatBRL(merchant.total_volume || 0)}
                          </span>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {merchant.total_transactions || 0} transações
                          </p>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='text-sm text-gray-500 dark:text-gray-400'>
                            {formatRelativeDate(merchant.created_at)}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-end gap-2 relative'>
                            <button
                              onClick={() =>
                                setShowActionMenu(
                                  showActionMenu === merchant.id ? null : merchant.id
                                )
                              }
                              title='Opções do merchant'
                              aria-label='Opções do merchant'
                              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                            >
                              <MoreVertical className='w-4 h-4 text-gray-500' />
                            </button>

                            {showActionMenu === merchant.id && (
                              <div className='absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10'>
                                <div className='py-1'>
                                  {/* Settings button - always visible */}
                                  <button
                                    onClick={() => openSettingsModal(merchant)}
                                    className='w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                  >
                                    <Settings className='w-4 h-4' />
                                    Configurações
                                  </button>

                                  <div className='border-t border-gray-200 dark:border-gray-700 my-1'></div>

                                  {merchant.status === 'PENDING' && (
                                    <button
                                      onClick={() => handleApproveMerchant(merchant.id)}
                                      disabled={actionLoading === merchant.id}
                                      className='w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                    >
                                      <Check className='w-4 h-4' />
                                      Aprovar
                                    </button>
                                  )}
                                  {merchant.status === 'ACTIVE' && (
                                    <button
                                      onClick={() =>
                                        setShowReasonModal({
                                          action: 'suspend',
                                          merchantId: merchant.id,
                                        })
                                      }
                                      className='w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10'
                                    >
                                      <Pause className='w-4 h-4' />
                                      Suspender
                                    </button>
                                  )}
                                  {(merchant.status === 'SUSPENDED' ||
                                    merchant.status === 'BLOCKED') && (
                                    <button
                                      onClick={() => handleReactivateMerchant(merchant.id)}
                                      disabled={actionLoading === merchant.id}
                                      className='w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                    >
                                      <Play className='w-4 h-4' />
                                      Reativar
                                    </button>
                                  )}
                                  {merchant.status !== 'BLOCKED' && (
                                    <button
                                      onClick={() =>
                                        setShowReasonModal({
                                          action: 'block',
                                          merchantId: merchant.id,
                                        })
                                      }
                                      className='w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                                    >
                                      <Ban className='w-4 h-4' />
                                      Bloquear
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className='md:hidden divide-y divide-gray-200 dark:divide-gray-700'>
              {merchants.map(merchant => {
                const statusConfig = getStatusConfig(merchant.status)
                return (
                  <div key={merchant.id} className='p-4'>
                    <div className='flex items-start justify-between mb-2'>
                      <div>
                        <p className='font-medium text-gray-900 dark:text-white'>
                          {merchant.company_name}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {merchant.merchant_code}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass}`}
                      >
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className='grid grid-cols-2 gap-2 text-sm'>
                      <div>
                        <span className='text-gray-500 dark:text-gray-400'>Taxa:</span>{' '}
                        <span className='text-gray-900 dark:text-white'>
                          {merchant.fee_percentage?.toFixed(2) || '0.00'}%
                        </span>
                      </div>
                      <div>
                        <span className='text-gray-500 dark:text-gray-400'>Volume:</span>{' '}
                        <span className='text-gray-900 dark:text-white'>
                          {formatBRL(merchant.total_volume || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Actions */}
                    <div className='flex gap-2 mt-3'>
                      {/* Settings button always visible */}
                      <button
                        onClick={() => openSettingsModal(merchant)}
                        className='flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium'
                      >
                        <Settings className='w-3 h-3' />
                        Config
                      </button>

                      {merchant.status === 'PENDING' && (
                        <button
                          onClick={() => handleApproveMerchant(merchant.id)}
                          disabled={actionLoading === merchant.id}
                          className='flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium'
                        >
                          <Check className='w-3 h-3' />
                          Aprovar
                        </button>
                      )}
                      {merchant.status === 'ACTIVE' && (
                        <button
                          onClick={() =>
                            setShowReasonModal({ action: 'suspend', merchantId: merchant.id })
                          }
                          className='flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-medium'
                        >
                          <Pause className='w-3 h-3' />
                          Suspender
                        </button>
                      )}
                      {(merchant.status === 'SUSPENDED' || merchant.status === 'BLOCKED') && (
                        <button
                          onClick={() => handleReactivateMerchant(merchant.id)}
                          disabled={actionLoading === merchant.id}
                          className='flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-medium'
                        >
                          <Play className='w-3 h-3' />
                          Reativar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700'>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              Página {page} de {totalPages} ({totalMerchants} merchants)
            </p>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                title='Página anterior'
                aria-label='Página anterior'
                className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <ChevronLeft className='w-4 h-4 text-gray-500' />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                title='Próxima página'
                aria-label='Próxima página'
                className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <ChevronRight className='w-4 h-4 text-gray-500' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full'>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-4'>
              {showReasonModal.action === 'suspend' ? 'Suspender Merchant' : 'Bloquear Merchant'}
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
              {showReasonModal.action === 'suspend'
                ? 'Informe o motivo da suspensão. O merchant poderá ser reativado posteriormente.'
                : 'Informe o motivo do bloqueio. Esta ação é geralmente usada para fraude.'}
            </p>
            <textarea
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              placeholder='Motivo...'
              rows={3}
              className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4'
            />
            <div className='flex gap-2 justify-end'>
              <button
                onClick={() => {
                  setShowReasonModal(null)
                  setActionReason('')
                }}
                className='px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600'
              >
                Cancelar
              </button>
              <button
                onClick={
                  showReasonModal.action === 'suspend' ? handleSuspendMerchant : handleBlockMerchant
                }
                disabled={!actionReason.trim() || actionLoading === showReasonModal.merchantId}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                  showReasonModal.action === 'suspend'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-red-500 hover:bg-red-600'
                } disabled:opacity-50`}
              >
                {actionLoading === showReasonModal.merchantId
                  ? 'Processando...'
                  : showReasonModal.action === 'suspend'
                    ? 'Suspender'
                    : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && selectedMerchant && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto'>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto'>
            {/* Header */}
            <div className='flex items-center justify-between mb-6'>
              <div>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                  Configurações do Merchant
                </h3>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  {selectedMerchant.company_name} • {selectedMerchant.merchant_code}
                </p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
              >
                <X className='w-5 h-5 text-gray-500' />
              </button>
            </div>

            {/* Merchant Summary */}
            {merchantSummary && (
              <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
                <div className='bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 text-white'>
                  <p className='text-xs opacity-80'>Volume Total</p>
                  <p className='text-lg font-bold'>{formatBRL(merchantSummary.total_volume_brl)}</p>
                </div>
                <div className='bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-3 text-white'>
                  <p className='text-xs opacity-80'>Transações</p>
                  <p className='text-lg font-bold'>{merchantSummary.total_payments}</p>
                </div>
                <div className='bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 text-white'>
                  <p className='text-xs opacity-80'>Taxas Coletadas</p>
                  <p className='text-lg font-bold'>{formatBRL(merchantSummary.total_fees_brl)}</p>
                </div>
                <div className='bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 text-white'>
                  <p className='text-xs opacity-80'>Pendente Settlement</p>
                  <p className='text-lg font-bold'>
                    {formatBRL(merchantSummary.pending_settlement_brl)}
                  </p>
                </div>
              </div>
            )}

            {/* Settings Form */}
            <div className='space-y-6'>
              {/* Taxas e Limites */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <Percent className='w-4 h-4' />
                  Taxas e Limites
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Taxa de Processamento (%)
                    </label>
                    <div className='relative'>
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
                        className='w-full px-3 py-2 pr-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                      />
                      <span className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm'>
                        %
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Limite Diário (BRL)
                    </label>
                    <div className='relative'>
                      <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
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
                        className='w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                      />
                    </div>
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Limite Mensal (BRL)
                    </label>
                    <div className='relative'>
                      <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
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
                        className='w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                      />
                    </div>
                  </div>
                </div>

                {/* Valores Min/Max por transação */}
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
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
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
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                    />
                  </div>
                </div>
              </div>

              {/* Settlement */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <Wallet className='w-4 h-4' />
                  Settlement
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Moeda de Settlement
                    </label>
                    <select
                      value={settingsForm.settlement_currency || 'BRL'}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          settlement_currency: e.target.value,
                        }))
                      }
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
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
                    <div className='flex items-center gap-3 h-[42px]'>
                      <button
                        type='button'
                        onClick={() =>
                          setSettingsForm(prev => ({
                            ...prev,
                            auto_settlement: true,
                          }))
                        }
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                          setSettingsForm(prev => ({
                            ...prev,
                            auto_settlement: false,
                          }))
                        }
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                    className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500'
                  />
                </div>
              </div>

              {/* PIX Configuration */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <CreditCard className='w-4 h-4' />
                  Configuração PIX
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Tipo de Chave PIX
                    </label>
                    <select
                      value={settingsForm.bank_pix_key_type || ''}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          bank_pix_key_type: e.target.value,
                        }))
                      }
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                    >
                      <option value=''>Selecione...</option>
                      <option value='CPF'>CPF</option>
                      <option value='CNPJ'>CNPJ</option>
                      <option value='EMAIL'>E-mail</option>
                      <option value='PHONE'>Telefone</option>
                      <option value='EVP'>Chave Aleatória (EVP)</option>
                    </select>
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Chave PIX
                    </label>
                    <div className='relative'>
                      <input
                        type='text'
                        value={settingsForm.bank_pix_key || ''}
                        onChange={e =>
                          setSettingsForm(prev => ({
                            ...prev,
                            bank_pix_key: e.target.value,
                          }))
                        }
                        placeholder='Chave PIX do merchant'
                        className='w-full px-3 py-2 pr-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500'
                      />
                      {settingsForm.bank_pix_key && (
                        <button
                          type='button'
                          onClick={() =>
                            copyToClipboard(settingsForm.bank_pix_key || '', 'Chave PIX')
                          }
                          className='absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                        >
                          <Copy className='w-4 h-4 text-gray-400' />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhook & Integração */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <Link2 className='w-4 h-4' />
                  Webhook & Integração
                </h4>
                <div>
                  <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                    URL de Webhook
                  </label>
                  <input
                    type='url'
                    value={settingsForm.webhook_url || ''}
                    onChange={e =>
                      setSettingsForm(prev => ({
                        ...prev,
                        webhook_url: e.target.value,
                      }))
                    }
                    placeholder='https://api.merchant.com/webhook'
                    className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500'
                  />
                  <p className='text-xs text-gray-400 mt-1'>
                    Será chamada para notificações de status de pagamento
                  </p>
                </div>
              </div>

              {/* Branding */}
              <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-4'>
                <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                  <Palette className='w-4 h-4' />
                  Personalização
                </h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      URL do Logo
                    </label>
                    <input
                      type='url'
                      value={settingsForm.logo_url || ''}
                      onChange={e =>
                        setSettingsForm(prev => ({
                          ...prev,
                          logo_url: e.target.value,
                        }))
                      }
                      placeholder='https://...'
                      className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500'
                    />
                  </div>
                  <div>
                    <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Cor Primária
                    </label>
                    <div className='flex items-center gap-2'>
                      <input
                        type='color'
                        value={settingsForm.primary_color || '#6366f1'}
                        onChange={e =>
                          setSettingsForm(prev => ({
                            ...prev,
                            primary_color: e.target.value,
                          }))
                        }
                        className='w-12 h-10 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer'
                      />
                      <input
                        type='text'
                        value={settingsForm.primary_color || '#6366f1'}
                        onChange={e =>
                          setSettingsForm(prev => ({
                            ...prev,
                            primary_color: e.target.value,
                          }))
                        }
                        placeholder='#6366f1'
                        className='flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500'
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className='flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700'>
              <button
                onClick={() => setShowSettingsModal(false)}
                className='px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className='flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50'
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
        </div>
      )}
    </div>
  )
}

export default AdminGatewayPage
