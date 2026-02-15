import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wallet,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Play,
  Eye,
  AlertCircle,
  CheckCircle,
  PiggyBank,
  Crown,
  Layers,
  Calculator,
  Plus,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Helper para obter token
const getAuthToken = () => {
  try {
    const stored = localStorage.getItem('hold-wallet-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.token
    }
  } catch {
    return null
  }
  return null
}

// Fetch helper com auth
const authFetch = async (endpoint: string, options?: RequestInit) => {
  const token = getAuthToken()
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

// API functions
const fetchTiers = async () => {
  return authFetch('/admin/earnpool/tiers')
}

const fetchRevenuePool = async () => {
  return authFetch('/admin/earnpool/revenue/pool')
}

const fetchCooperators = async (page: number) => {
  return authFetch(`/admin/earnpool/cooperators?page=${page}&limit=20`)
}

const fetchDistributions = async (page: number) => {
  return authFetch(`/admin/earnpool/revenue/distributions?page=${page}&limit=10`)
}

const fetchDistributionPreview = async () => {
  return authFetch('/admin/earnpool/revenue/distribution/preview')
}

const addRevenue = async (data: { amount: string; source: string; description: string }) => {
  return authFetch('/admin/earnpool/revenue/add', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

const executeDistribution = async () => {
  return authFetch('/admin/earnpool/revenue/distribute', {
    method: 'POST',
  })
}

// Format helpers
const formatUSD = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num || 0)
}

const formatPercent = (value: number | string) => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${(num || 0).toFixed(2)}%`
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Tier badge colors
const getTierBadgeColor = (level: number) => {
  const colors: Record<number, string> = {
    1: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    2: 'bg-amber-700/20 text-amber-600 border-amber-700/30',
    3: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
    4: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    5: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    6: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    7: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    8: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    9: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    10: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  }
  return colors[level] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

const getTierIcon = (level: number) => {
  if (level >= 8) return <Crown className='w-4 h-4' />
  if (level >= 5) return <Award className='w-4 h-4' />
  return <Layers className='w-4 h-4' />
}

export default function AdminEarnPoolPage() {
  const queryClient = useQueryClient()
  const [cooperatorsPage, setCooperatorsPage] = React.useState(1)
  const [distributionsPage, setDistributionsPage] = React.useState(1)
  const [showAddRevenueModal, setShowAddRevenueModal] = React.useState(false)
  const [showPreviewModal, setShowPreviewModal] = React.useState(false)
  const [addRevenueForm, setAddRevenueForm] = React.useState({
    amount: '',
    source: 'wolkpay',
    description: '',
  })

  // Queries
  const { data: tiersData, isLoading: tiersLoading } = useQuery({
    queryKey: ['admin-earnpool-tiers'],
    queryFn: fetchTiers,
    staleTime: 300000,
  })

  const {
    data: poolData,
    isLoading: poolLoading,
    refetch: refetchPool,
  } = useQuery({
    queryKey: ['admin-earnpool-pool'],
    queryFn: fetchRevenuePool,
    staleTime: 60000,
  })

  const { data: cooperatorsData, isLoading: cooperatorsLoading } = useQuery({
    queryKey: ['admin-earnpool-cooperators', cooperatorsPage],
    queryFn: () => fetchCooperators(cooperatorsPage),
    staleTime: 60000,
  })

  const { data: distributionsData, isLoading: distributionsLoading } = useQuery({
    queryKey: ['admin-earnpool-distributions', distributionsPage],
    queryFn: () => fetchDistributions(distributionsPage),
    staleTime: 60000,
  })

  const {
    data: previewData,
    isLoading: previewLoading,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: ['admin-earnpool-preview'],
    queryFn: fetchDistributionPreview,
    staleTime: 30000,
    enabled: false,
  })

  // Mutations
  const addRevenueMutation = useMutation({
    mutationFn: addRevenue,
    onSuccess: () => {
      toast.success('Receita adicionada ao pool com sucesso!')
      setShowAddRevenueModal(false)
      setAddRevenueForm({ amount: '', source: 'wolkpay', description: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-earnpool-pool'] })
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar receita: ${error.message}`)
    },
  })

  const distributeMutation = useMutation({
    mutationFn: executeDistribution,
    onSuccess: data => {
      toast.success(
        `Distribuição executada! ${data.cooperators_paid} cooperados receberam ${formatUSD(data.total_distributed)}`
      )
      setShowPreviewModal(false)
      queryClient.invalidateQueries({ queryKey: ['admin-earnpool'] })
    },
    onError: (error: Error) => {
      toast.error(`Erro na distribuição: ${error.message}`)
    },
  })

  // Extract data
  const tiers = tiersData?.data || []
  const pool = poolData?.data || {
    available_balance: 0,
    total_accumulated: 0,
    total_distributed: 0,
  }
  const cooperators = cooperatorsData?.data || []
  const cooperatorsPagination = cooperatorsData?.pagination || { page: 1, pages: 1, total: 0 }
  const distributions = distributionsData?.data || []
  const distributionsPagination = distributionsData?.pagination || { page: 1, pages: 1, total: 0 }
  const preview = previewData?.data || null

  // Stats
  const totalDeposited = cooperators.reduce(
    (sum: number, c: any) => sum + parseFloat(c.usdt_amount || 0),
    0
  )
  const activeCooperators = cooperatorsPagination.total

  const handleOpenPreview = async () => {
    await refetchPreview()
    setShowPreviewModal(true)
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-white flex items-center gap-2'>
            <PiggyBank className='w-7 h-7 text-emerald-400' />
            EarnPool - Gestão
          </h1>
          <p className='text-gray-400 mt-1'>Gerencie tiers, pool de receita e distribuições</p>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => refetchPool()}
            className='flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors'
          >
            <RefreshCw className='w-4 h-4' />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Pool Disponível */}
        <div className='bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 rounded-xl p-5 border border-emerald-500/30'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-emerald-400 text-sm font-medium'>Pool Disponível</p>
              <p className='text-2xl font-bold text-white mt-1'>
                {poolLoading ? '...' : formatUSD(pool.available_balance)}
              </p>
              <p className='text-xs text-gray-400 mt-1'>Para próxima distribuição</p>
            </div>
            <div className='w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center'>
              <DollarSign className='w-6 h-6 text-emerald-400' />
            </div>
          </div>
        </div>

        {/* Total Acumulado */}
        <div className='bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-5 border border-blue-500/30'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-blue-400 text-sm font-medium'>Total Acumulado</p>
              <p className='text-2xl font-bold text-white mt-1'>
                {poolLoading ? '...' : formatUSD(pool.total_accumulated)}
              </p>
              <p className='text-xs text-gray-400 mt-1'>Desde o início</p>
            </div>
            <div className='w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center'>
              <TrendingUp className='w-6 h-6 text-blue-400' />
            </div>
          </div>
        </div>

        {/* Total Depositado */}
        <div className='bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-5 border border-purple-500/30'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-purple-400 text-sm font-medium'>Total Depositado</p>
              <p className='text-2xl font-bold text-white mt-1'>{formatUSD(totalDeposited)}</p>
              <p className='text-xs text-gray-400 mt-1'>Pelos cooperados</p>
            </div>
            <div className='w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center'>
              <Wallet className='w-6 h-6 text-purple-400' />
            </div>
          </div>
        </div>

        {/* Cooperados Ativos */}
        <div className='bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-xl p-5 border border-orange-500/30'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-orange-400 text-sm font-medium'>Cooperados Ativos</p>
              <p className='text-2xl font-bold text-white mt-1'>{activeCooperators}</p>
              <p className='text-xs text-gray-400 mt-1'>Com depósitos ativos</p>
            </div>
            <div className='w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center'>
              <Users className='w-6 h-6 text-orange-400' />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='flex gap-3'>
        <button
          onClick={() => setShowAddRevenueModal(true)}
          className='flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors'
        >
          <Plus className='w-4 h-4' />
          Adicionar Receita ao Pool
        </button>
        <button
          onClick={handleOpenPreview}
          disabled={previewLoading}
          className='flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50'
        >
          <Eye className='w-4 h-4' />
          {previewLoading ? 'Carregando...' : 'Preview Distribuição'}
        </button>
      </div>

      {/* Tiers Table */}
      <div className='bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden'>
        <div className='p-4 border-b border-gray-700/50'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Award className='w-5 h-5 text-yellow-400' />
            Tiers do Pool
          </h2>
          <p className='text-sm text-gray-400'>Níveis de cooperados e seus rendimentos</p>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-900/50'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Tier
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Depósito Mín.
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Depósito Máx.
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  % Semanal
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  % Anual Est.
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-700/50'>
              {tiersLoading ? (
                <tr>
                  <td colSpan={5} className='px-4 py-8 text-center text-gray-400'>
                    Carregando tiers...
                  </td>
                </tr>
              ) : tiers.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-4 py-8 text-center text-gray-400'>
                    Nenhum tier encontrado
                  </td>
                </tr>
              ) : (
                tiers.map((tier: any) => (
                  <tr key={tier.id} className='hover:bg-gray-700/30 transition-colors'>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTierBadgeColor(tier.level)}`}
                        >
                          {getTierIcon(tier.level)}
                          {tier.name}
                        </span>
                        <span className='text-xs text-gray-500'>Nível {tier.level}</span>
                      </div>
                    </td>
                    <td className='px-4 py-3 text-white'>{formatUSD(tier.min_deposit_usdt)}</td>
                    <td className='px-4 py-3 text-white'>
                      {tier.max_deposit_usdt ? formatUSD(tier.max_deposit_usdt) : 'Ilimitado'}
                    </td>
                    <td className='px-4 py-3'>
                      <span className='text-emerald-400 font-medium'>
                        {formatPercent(tier.pool_share_percentage)}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <span className='text-blue-400'>
                        {formatPercent(parseFloat(tier.pool_share_percentage) * 52)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cooperators Table */}
      <div className='bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden'>
        <div className='p-4 border-b border-gray-700/50 flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
              <Users className='w-5 h-5 text-blue-400' />
              Cooperados
            </h2>
            <p className='text-sm text-gray-400'>{cooperatorsPagination.total} cooperados ativos</p>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-900/50'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Usuário
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Cripto
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Depositado
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Valor USDT
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Tier
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Criado em
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-700/50'>
              {cooperatorsLoading ? (
                <tr>
                  <td colSpan={6} className='px-4 py-8 text-center text-gray-400'>
                    Carregando cooperados...
                  </td>
                </tr>
              ) : cooperators.length === 0 ? (
                <tr>
                  <td colSpan={6} className='px-4 py-8 text-center text-gray-400'>
                    Nenhum cooperado encontrado
                  </td>
                </tr>
              ) : (
                cooperators.map((coop: any) => (
                  <tr key={coop.id} className='hover:bg-gray-700/30 transition-colors'>
                    <td className='px-4 py-3'>
                      <div className='text-white font-medium'>{coop.user?.full_name || 'N/A'}</div>
                      <div className='text-xs text-gray-400'>{coop.user?.email || ''}</div>
                    </td>
                    <td className='px-4 py-3'>
                      <span className='text-yellow-400 font-medium'>{coop.crypto_symbol}</span>
                    </td>
                    <td className='px-4 py-3 text-white'>
                      {parseFloat(coop.crypto_amount || 0).toFixed(8)} {coop.crypto_symbol}
                    </td>
                    <td className='px-4 py-3'>
                      <span className='text-emerald-400 font-medium'>
                        {formatUSD(coop.usdt_amount)}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      {coop.tier ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTierBadgeColor(coop.tier.level)}`}
                        >
                          {getTierIcon(coop.tier.level)}
                          {coop.tier.name}
                        </span>
                      ) : (
                        <span className='text-gray-500'>-</span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-gray-400 text-sm'>
                      {formatDate(coop.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {cooperatorsPagination.pages > 1 && (
          <div className='p-4 border-t border-gray-700/50 flex items-center justify-between'>
            <p className='text-sm text-gray-400'>
              Página {cooperatorsPagination.page} de {cooperatorsPagination.pages}
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() => setCooperatorsPage(p => Math.max(1, p - 1))}
                disabled={cooperatorsPagination.page <= 1}
                className='p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors'
                title='Página anterior'
              >
                <ChevronLeft className='w-4 h-4' />
              </button>
              <button
                onClick={() => setCooperatorsPage(p => p + 1)}
                disabled={cooperatorsPagination.page >= cooperatorsPagination.pages}
                className='p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors'
                title='Próxima página'
              >
                <ChevronRight className='w-4 h-4' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Distributions History */}
      <div className='bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden'>
        <div className='p-4 border-b border-gray-700/50'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Clock className='w-5 h-5 text-purple-400' />
            Histórico de Distribuições
          </h2>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-900/50'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Período
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Total Distribuído
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Cooperados
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Status
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase'>
                  Data
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-700/50'>
              {distributionsLoading ? (
                <tr>
                  <td colSpan={5} className='px-4 py-8 text-center text-gray-400'>
                    Carregando distribuições...
                  </td>
                </tr>
              ) : distributions.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-4 py-8 text-center text-gray-400'>
                    Nenhuma distribuição realizada ainda
                  </td>
                </tr>
              ) : (
                distributions.map((dist: any) => (
                  <tr key={dist.id} className='hover:bg-gray-700/30 transition-colors'>
                    <td className='px-4 py-3 text-white'>{dist.period_label || '-'}</td>
                    <td className='px-4 py-3'>
                      <span className='text-emerald-400 font-medium'>
                        {formatUSD(dist.total_distributed)}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-white'>{dist.cooperators_count || 0}</td>
                    <td className='px-4 py-3'>
                      {dist.status === 'completed' ? (
                        <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'>
                          <CheckCircle className='w-3 h-3' />
                          Concluída
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'>
                          <Clock className='w-3 h-3' />
                          {dist.status}
                        </span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-gray-400 text-sm'>
                      {formatDate(dist.distributed_at || dist.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {distributionsPagination.pages > 1 && (
          <div className='p-4 border-t border-gray-700/50 flex items-center justify-between'>
            <p className='text-sm text-gray-400'>
              Página {distributionsPagination.page} de {distributionsPagination.pages}
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() => setDistributionsPage(p => Math.max(1, p - 1))}
                disabled={distributionsPagination.page <= 1}
                className='p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors'
                title='Página anterior'
              >
                <ChevronLeft className='w-4 h-4' />
              </button>
              <button
                onClick={() => setDistributionsPage(p => p + 1)}
                disabled={distributionsPagination.page >= distributionsPagination.pages}
                className='p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors'
                title='Próxima página'
              >
                <ChevronRight className='w-4 h-4' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Revenue Modal */}
      {showAddRevenueModal && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
          <div className='bg-gray-800 rounded-xl max-w-md w-full border border-gray-700'>
            <div className='p-4 border-b border-gray-700'>
              <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
                <Plus className='w-5 h-5 text-emerald-400' />
                Adicionar Receita ao Pool
              </h3>
            </div>

            <div className='p-4 space-y-4'>
              <div>
                <label
                  htmlFor='revenue-amount'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Valor (USDT)
                </label>
                <input
                  id='revenue-amount'
                  type='number'
                  step='0.01'
                  value={addRevenueForm.amount}
                  onChange={e => setAddRevenueForm(f => ({ ...f, amount: e.target.value }))}
                  className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                  placeholder='0.00'
                />
              </div>

              <div>
                <label
                  htmlFor='revenue-source'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Fonte
                </label>
                <select
                  id='revenue-source'
                  title='Fonte da receita'
                  value={addRevenueForm.source}
                  onChange={e => setAddRevenueForm(f => ({ ...f, source: e.target.value }))}
                  className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                >
                  <option value='wolkpay'>WolkPay</option>
                  <option value='trade'>Trade Instantâneo</option>
                  <option value='boleto'>Pagamento de Boletos</option>
                  <option value='other'>Outros</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor='revenue-description'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Descrição (opcional)
                </label>
                <textarea
                  id='revenue-description'
                  value={addRevenueForm.description}
                  onChange={e => setAddRevenueForm(f => ({ ...f, description: e.target.value }))}
                  className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                  rows={2}
                  placeholder='Descrição da receita...'
                />
              </div>
            </div>

            <div className='p-4 border-t border-gray-700 flex justify-end gap-2'>
              <button
                onClick={() => setShowAddRevenueModal(false)}
                className='px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={() => addRevenueMutation.mutate(addRevenueForm)}
                disabled={!addRevenueForm.amount || addRevenueMutation.isPending}
                className='px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50'
              >
                {addRevenueMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distribution Preview Modal */}
      {showPreviewModal && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4'>
          <div className='bg-gray-800 rounded-xl max-w-2xl w-full border border-gray-700 max-h-[80vh] overflow-hidden flex flex-col'>
            <div className='p-4 border-b border-gray-700'>
              <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
                <Calculator className='w-5 h-5 text-blue-400' />
                Preview da Distribuição
              </h3>
            </div>

            <div className='p-4 overflow-y-auto flex-1'>
              {preview ? (
                <div className='space-y-4'>
                  {/* Summary */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='bg-gray-700/50 rounded-lg p-3'>
                      <p className='text-sm text-gray-400'>Pool Disponível</p>
                      <p className='text-xl font-bold text-emerald-400'>
                        {formatUSD(preview.pool_available)}
                      </p>
                    </div>
                    <div className='bg-gray-700/50 rounded-lg p-3'>
                      <p className='text-sm text-gray-400'>Total a Distribuir</p>
                      <p className='text-xl font-bold text-blue-400'>
                        {formatUSD(preview.total_to_distribute)}
                      </p>
                    </div>
                    <div className='bg-gray-700/50 rounded-lg p-3'>
                      <p className='text-sm text-gray-400'>Cooperados</p>
                      <p className='text-xl font-bold text-white'>{preview.cooperators_count}</p>
                    </div>
                    <div className='bg-gray-700/50 rounded-lg p-3'>
                      <p className='text-sm text-gray-400'>Fator de Redução</p>
                      <p
                        className={`text-xl font-bold ${preview.reduction_factor < 1 ? 'text-yellow-400' : 'text-emerald-400'}`}
                      >
                        {(preview.reduction_factor * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {preview.reduction_factor < 1 && (
                    <div className='bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2'>
                      <AlertCircle className='w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5' />
                      <div>
                        <p className='text-yellow-400 font-medium'>Pool Insuficiente</p>
                        <p className='text-sm text-yellow-400/80'>
                          O pool disponível é menor que o total ideal. Todos os cooperados receberão
                          proporcionalmente menos.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* By Tier */}
                  {preview.by_tier && (
                    <div>
                      <h4 className='text-sm font-medium text-gray-300 mb-2'>Por Tier</h4>
                      <div className='space-y-2'>
                        {preview.by_tier.map((tier: any) => (
                          <div
                            key={tier.tier_id}
                            className='flex items-center justify-between bg-gray-700/30 rounded-lg p-2'
                          >
                            <div className='flex items-center gap-2'>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTierBadgeColor(tier.tier_level)}`}
                              >
                                {tier.tier_name}
                              </span>
                              <span className='text-sm text-gray-400'>
                                {tier.cooperators_count} cooperados
                              </span>
                            </div>
                            <span className='text-emerald-400 font-medium'>
                              {formatUSD(tier.total_yield)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 text-gray-400'>Carregando preview...</div>
              )}
            </div>

            <div className='p-4 border-t border-gray-700 flex justify-end gap-2'>
              <button
                onClick={() => setShowPreviewModal(false)}
                className='px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={() => distributeMutation.mutate()}
                disabled={
                  !preview || preview.cooperators_count === 0 || distributeMutation.isPending
                }
                className='flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50'
              >
                <Play className='w-4 h-4' />
                {distributeMutation.isPending ? 'Executando...' : 'Executar Distribuição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
