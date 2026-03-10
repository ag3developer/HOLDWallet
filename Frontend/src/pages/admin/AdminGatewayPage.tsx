/**
 * WolkPay Gateway Admin Page
 * ===========================
 *
 * Página de administração do Gateway de Pagamentos.
 * Lista merchants com ações rápidas e link para página de detalhes.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Eye,
  XCircle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  getGatewayStats,
  getMerchants,
  approveMerchant,
  suspendMerchant,
  blockMerchant,
  reactivateMerchant,
  type GatewayMerchant,
  type GatewayStats,
} from '@/services/admin/adminGateway'

// Alias para compatibilidade
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
    icon: <AlertTriangle className='w-3 h-3' />,
  },
  BLOCKED: {
    label: 'Bloqueado',
    bgClass: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
    icon: <XCircle className='w-3 h-3' />,
  },
}

const DEFAULT_STATUS = {
  label: 'Pendente',
  bgClass: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
  icon: <Clock className='w-3 h-3' />,
}

const getStatusConfig = (
  status: string
): { label: string; bgClass: string; icon: React.ReactNode } => {
  const config = STATUS_CONFIG[status]
  if (config) return config
  return DEFAULT_STATUS
}

// Format BRL
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

// Format relative date
const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `\${diffDays} dias atrás`
  if (diffDays < 30) return `\${Math.floor(diffDays / 7)} sem. atrás`
  return date.toLocaleDateString('pt-BR')
}

export const AdminGatewayPage: React.FC = () => {
  const navigate = useNavigate()
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

  // Reason modal for suspend/block
  const [showReasonModal, setShowReasonModal] = useState<{
    action: 'suspend' | 'block'
    merchantId: string
  } | null>(null)
  const [actionReason, setActionReason] = useState('')

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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      console.error('Erro ao carregar merchants:', err)
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Erro ao carregar merchants')
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Erro ao aprovar merchant')
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Erro ao suspender merchant')
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Erro ao bloquear merchant')
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error.response?.data?.detail || 'Erro ao reativar merchant')
    } finally {
      setActionLoading(null)
      setShowActionMenu(null)
    }
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
          <RefreshCw className={`w-4 h-4 \${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {statsCards.map(stat => (
          <div
            key={stat.id}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 border \${
              stat.urgent
                ? 'border-yellow-400 dark:border-yellow-500 ring-2 ring-yellow-400/20'
                : 'border-gray-200 dark:border-gray-700'
            } shadow-sm`}
          >
            <div className='flex items-center justify-between mb-2'>
              <div
                className={`w-9 h-9 bg-gradient-to-br \${stat.color} rounded-lg flex items-center justify-center`}
              >
                <div className='text-white'>{stat.icon}</div>
              </div>
              {stat.urgent && <AlertTriangle className='w-4 h-4 text-yellow-500 animate-pulse' />}
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400'>{stat.label}</p>
            <p className='text-lg font-bold text-gray-900 dark:text-white mt-1'>
              {stat.isText ? stat.value : (stat.value as number).toLocaleString('pt-BR')}
            </p>
          </div>
        ))}
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
                        className='hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer'
                        onClick={() => navigate(`/admin/gateway/merchant/${merchant.id}`)}
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
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium \${statusConfig.bgClass}`}
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
                        <td className='px-4 py-3' onClick={e => e.stopPropagation()}>
                          <div className='flex items-center justify-end gap-2 relative'>
                            <button
                              onClick={() => navigate(`/admin/gateway/merchant/${merchant.id}`)}
                              title='Ver detalhes'
                              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                            >
                              <Eye className='w-4 h-4 text-gray-500' />
                            </button>

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
                  <div
                    key={merchant.id}
                    className='p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50'
                    onClick={() => navigate(`/admin/gateway/merchant/${merchant.id}`)}
                  >
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
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium \${statusConfig.bgClass}`}
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

                    <div className='flex gap-2 mt-3' onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/admin/gateway/merchant/${merchant.id}`)}
                        className='flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-medium'
                      >
                        <Eye className='w-3 h-3' />
                        Ver Detalhes
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
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white \${
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
    </div>
  )
}

export default AdminGatewayPage
