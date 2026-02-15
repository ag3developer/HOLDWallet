import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PiggyBank,
  TrendingUp,
  Users,
  DollarSign,
  Settings,
  Edit2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react'
import { apiClient } from '../../services/api'

// ============================================================================
// TYPES
// ============================================================================

interface EarnPoolTier {
  id: number
  level: number
  name: string
  name_pt: string
  min_usdt: number
  max_usdt: number | null
  pool_share_percentage: number
  benefits_en: string
  benefits_pt: string
  is_active: boolean
}

interface EarnPoolConfig {
  id: number
  min_deposit_usdt: number
  max_deposit_usdt: number | null
  lock_period_days: number
  withdrawal_delay_days: number
  early_withdrawal_admin_fee: number
  early_withdrawal_op_fee: number
  target_weekly_yield_percentage: number
  is_active: boolean
}

interface EarnPoolDeposit {
  id: number
  user_id: number
  user_email?: string
  crypto_symbol: string
  crypto_amount: number
  usdt_amount: number
  exchange_rate: number
  status: string
  deposited_at: string
  lock_ends_at: string
  total_yield_earned: number
  tier_level: number
  tier_name: string
}

interface EarnPoolWithdrawal {
  id: number
  user_id: number
  user_email?: string
  deposit_id: number
  amount_crypto: number
  amount_usdt: number
  crypto_symbol: string
  admin_fee: number
  operational_fee: number
  net_amount: number
  destination_type: string
  status: string
  is_early_withdrawal: boolean
  requested_at: string
  processed_at: string | null
  approved_by: number | null
}

interface Cooperator {
  user_id: number
  email: string
  tier_level: number
  tier_name: string
  total_deposited_usdt: number
  total_yield_earned: number
  active_deposits: number
  pool_share_percentage: number
}

interface Distribution {
  id: number
  distributed_at: string
  total_amount: number
  cooperators_count: number
  period_start: string
  period_end: string
}

interface RevenueSummary {
  total_revenue: number
  pending_distribution: number
  total_distributed: number
  last_distribution: string | null
  total_cooperators: number
  total_deposited_usdt: number
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminEarnPoolPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<
    'overview' | 'tiers' | 'config' | 'deposits' | 'withdrawals' | 'distributions'
  >('overview')

  // Edit states
  const [editingTier, setEditingTier] = useState<number | null>(null)
  const [tierEdit, setTierEdit] = useState<Partial<EarnPoolTier>>({})
  const [editingConfig, setEditingConfig] = useState(false)
  const [configEdit, setConfigEdit] = useState<Partial<EarnPoolConfig>>({})

  // Add Revenue Modal
  const [showAddRevenue, setShowAddRevenue] = useState(false)
  const [revenueAmount, setRevenueAmount] = useState('')
  const [revenueSource, setRevenueSource] = useState('')

  // Distribution Preview Modal
  const [showDistributionPreview, setShowDistributionPreview] = useState(false)
  const [distributionPreview, setDistributionPreview] = useState<any>(null)

  // ============================================================================
  // QUERIES
  // ============================================================================

  const { data: summary, isLoading: loadingSummary } = useQuery<RevenueSummary>({
    queryKey: ['earnpool-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/earnpool/summary')
      return data
    },
    refetchInterval: 30000,
  })

  const { data: tiers, isLoading: loadingTiers } = useQuery<EarnPoolTier[]>({
    queryKey: ['earnpool-tiers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/earnpool/tiers')
      return data
    },
  })

  const { data: config, isLoading: loadingConfig } = useQuery<EarnPoolConfig>({
    queryKey: ['earnpool-config'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/earnpool/config')
      return data
    },
  })

  const { data: deposits, isLoading: loadingDeposits } = useQuery<EarnPoolDeposit[]>({
    queryKey: ['earnpool-deposits'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/earnpool/deposits')
      return data
    },
  })

  const { data: withdrawals, isLoading: loadingWithdrawals } = useQuery<EarnPoolWithdrawal[]>({
    queryKey: ['earnpool-withdrawals'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/earnpool/withdrawals')
      return data
    },
  })

  const { data: cooperators, isLoading: loadingCooperators } = useQuery<Cooperator[]>({
    queryKey: ['earnpool-cooperators'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/earnpool/cooperators')
      return data
    },
  })

  const { data: distributions, isLoading: loadingDistributions } = useQuery<Distribution[]>({
    queryKey: ['earnpool-distributions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/earnpool/distributions')
      return data
    },
  })

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const addRevenueMutation = useMutation({
    mutationFn: async (data: { amount: number; source: string }) => {
      return apiClient.post('/admin/earnpool/revenue/add', data)
    },
    onSuccess: () => {
      toast.success('Receita adicionada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['earnpool-summary'] })
      setShowAddRevenue(false)
      setRevenueAmount('')
      setRevenueSource('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar receita')
    },
  })

  const updateTierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EarnPoolTier> }) => {
      return apiClient.put(`/admin/earnpool/tiers/${id}`, data)
    },
    onSuccess: () => {
      toast.success('Tier atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['earnpool-tiers'] })
      setEditingTier(null)
      setTierEdit({})
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar tier')
    },
  })

  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<EarnPoolConfig>) => {
      return apiClient.put('/admin/earnpool/config', data)
    },
    onSuccess: () => {
      toast.success('Configurações atualizadas com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['earnpool-config'] })
      setEditingConfig(false)
      setConfigEdit({})
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar configurações')
    },
  })

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.put(`/admin/earnpool/withdrawals/${id}/approve`)
    },
    onSuccess: () => {
      toast.success('Saque aprovado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['earnpool-withdrawals'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao aprovar saque')
    },
  })

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiClient.put(`/admin/earnpool/withdrawals/${id}/reject`, { reason })
    },
    onSuccess: () => {
      toast.success('Saque rejeitado!')
      queryClient.invalidateQueries({ queryKey: ['earnpool-withdrawals'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao rejeitar saque')
    },
  })

  const distributeMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/admin/earnpool/distribute')
    },
    onSuccess: response => {
      toast.success(
        `Distribuição realizada! ${response.data.cooperators_paid} cooperadores receberam rendimentos.`
      )
      queryClient.invalidateQueries({ queryKey: ['earnpool-summary'] })
      queryClient.invalidateQueries({ queryKey: ['earnpool-distributions'] })
      queryClient.invalidateQueries({ queryKey: ['earnpool-cooperators'] })
      setShowDistributionPreview(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao executar distribuição')
    },
  })

  const previewDistributionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.get('/admin/earnpool/distribution/preview')
      return data
    },
    onSuccess: data => {
      setDistributionPreview(data)
      setShowDistributionPreview(true)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao carregar preview')
    },
  })

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleEditTier = (tier: EarnPoolTier) => {
    setEditingTier(tier.id)
    setTierEdit({
      pool_share_percentage: tier.pool_share_percentage,
      min_usdt: tier.min_usdt,
      max_usdt: tier.max_usdt,
      is_active: tier.is_active,
    })
  }

  const handleSaveTier = () => {
    if (editingTier) {
      updateTierMutation.mutate({ id: editingTier, data: tierEdit })
    }
  }

  const handleEditConfig = () => {
    if (config) {
      setConfigEdit({
        min_deposit_usdt: config.min_deposit_usdt,
        max_deposit_usdt: config.max_deposit_usdt,
        lock_period_days: config.lock_period_days,
        withdrawal_delay_days: config.withdrawal_delay_days,
        early_withdrawal_admin_fee: config.early_withdrawal_admin_fee,
        early_withdrawal_op_fee: config.early_withdrawal_op_fee,
        target_weekly_yield_percentage: config.target_weekly_yield_percentage,
      })
      setEditingConfig(true)
    }
  }

  const handleSaveConfig = () => {
    updateConfigMutation.mutate(configEdit)
  }

  const handleAddRevenue = () => {
    const amount = parseFloat(revenueAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido')
      return
    }
    addRevenueMutation.mutate({ amount, source: revenueSource || 'Manual' })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      ACTIVE: { color: 'bg-green-100 text-green-800', text: 'Ativo' },
      LOCKED: { color: 'bg-blue-100 text-blue-800', text: 'Bloqueado' },
      WITHDRAWAL_PENDING: { color: 'bg-orange-100 text-orange-800', text: 'Saque Pendente' },
      WITHDRAWN: { color: 'bg-gray-100 text-gray-800', text: 'Sacado' },
      CANCELLED: { color: 'bg-red-100 text-red-800', text: 'Cancelado' },
      APPROVED: { color: 'bg-green-100 text-green-800', text: 'Aprovado' },
      REJECTED: { color: 'bg-red-100 text-red-800', text: 'Rejeitado' },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', text: 'Processando' },
      COMPLETED: { color: 'bg-green-100 text-green-800', text: 'Concluído' },
    }
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', text: status }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  // ============================================================================
  // RENDER TABS
  // ============================================================================

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: PiggyBank },
    { id: 'tiers', label: 'Tiers', icon: TrendingUp },
    { id: 'config', label: 'Configurações', icon: Settings },
    { id: 'deposits', label: 'Depósitos', icon: ArrowDownCircle },
    { id: 'withdrawals', label: 'Saques', icon: ArrowUpCircle },
    { id: 'distributions', label: 'Distribuições', icon: DollarSign },
  ] as const

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
          <PiggyBank className='w-8 h-8 text-amber-500' />
          EarnPool - Painel Administrativo
        </h1>
        <p className='text-gray-600 mt-1'>
          Gerencie o pool cooperativo, tiers, configurações, depósitos e saques.
        </p>
      </div>

      {/* Tabs */}
      <div className='bg-white rounded-lg shadow mb-6'>
        <div className='border-b border-gray-200'>
          <nav className='flex space-x-0 overflow-x-auto'>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className='w-4 h-4' />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          summary={summary}
          cooperators={cooperators}
          loadingSummary={loadingSummary}
          loadingCooperators={loadingCooperators}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onAddRevenue={() => setShowAddRevenue(true)}
          onPreviewDistribution={() => previewDistributionMutation.mutate()}
        />
      )}

      {activeTab === 'tiers' && (
        <TiersTab
          tiers={tiers}
          loadingTiers={loadingTiers}
          editingTier={editingTier}
          tierEdit={tierEdit}
          setTierEdit={setTierEdit}
          onEdit={handleEditTier}
          onSave={handleSaveTier}
          onCancel={() => {
            setEditingTier(null)
            setTierEdit({})
          }}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 'config' && (
        <ConfigTab
          config={config}
          loadingConfig={loadingConfig}
          editingConfig={editingConfig}
          configEdit={configEdit}
          setConfigEdit={setConfigEdit}
          onEdit={handleEditConfig}
          onSave={handleSaveConfig}
          onCancel={() => {
            setEditingConfig(false)
            setConfigEdit({})
          }}
        />
      )}

      {activeTab === 'deposits' && (
        <DepositsTab
          deposits={deposits}
          loadingDeposits={loadingDeposits}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
        />
      )}

      {activeTab === 'withdrawals' && (
        <WithdrawalsTab
          withdrawals={withdrawals}
          loadingWithdrawals={loadingWithdrawals}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
          onApprove={id => approveWithdrawalMutation.mutate(id)}
          onReject={(id, reason) => rejectWithdrawalMutation.mutate({ id, reason })}
        />
      )}

      {activeTab === 'distributions' && (
        <DistributionsTab
          distributions={distributions}
          loadingDistributions={loadingDistributions}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {/* Add Revenue Modal */}
      {showAddRevenue && (
        <Modal onClose={() => setShowAddRevenue(false)} title='Adicionar Receita ao Pool'>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Valor (USDT)</label>
              <input
                type='number'
                step='0.01'
                value={revenueAmount}
                onChange={e => setRevenueAmount(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent'
                placeholder='0.00'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Fonte (opcional)
              </label>
              <input
                type='text'
                value={revenueSource}
                onChange={e => setRevenueSource(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent'
                placeholder='Ex: Trading, OTC, Staking...'
              />
            </div>
            <div className='flex justify-end gap-3 pt-4'>
              <button
                onClick={() => setShowAddRevenue(false)}
                className='px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={handleAddRevenue}
                disabled={addRevenueMutation.isPending}
                className='px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50'
              >
                {addRevenueMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Distribution Preview Modal */}
      {showDistributionPreview && distributionPreview && (
        <Modal onClose={() => setShowDistributionPreview(false)} title='Preview da Distribuição'>
          <div className='space-y-4'>
            <div className='bg-amber-50 p-4 rounded-lg'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-sm text-gray-600'>Valor a Distribuir</p>
                  <p className='text-xl font-bold text-amber-600'>
                    {formatCurrency(distributionPreview.amount_to_distribute)}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-gray-600'>Cooperadores</p>
                  <p className='text-xl font-bold text-gray-900'>
                    {distributionPreview.cooperators_count}
                  </p>
                </div>
              </div>
            </div>

            {distributionPreview.preview && distributionPreview.preview.length > 0 && (
              <div className='max-h-60 overflow-y-auto'>
                <table className='w-full text-sm'>
                  <thead className='bg-gray-50 sticky top-0'>
                    <tr>
                      <th className='px-3 py-2 text-left'>Usuário</th>
                      <th className='px-3 py-2 text-left'>Tier</th>
                      <th className='px-3 py-2 text-right'>Rendimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributionPreview.preview.map((item: any, idx: number) => (
                      <tr key={idx} className='border-t'>
                        <td className='px-3 py-2'>{item.email}</td>
                        <td className='px-3 py-2'>{item.tier_name}</td>
                        <td className='px-3 py-2 text-right font-mono text-green-600'>
                          +{formatCurrency(item.yield_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className='flex justify-end gap-3 pt-4 border-t'>
              <button
                onClick={() => setShowDistributionPreview(false)}
                className='px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={() => distributeMutation.mutate()}
                disabled={distributeMutation.isPending}
                className='px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50'
              >
                {distributeMutation.isPending ? 'Distribuindo...' : 'Confirmar Distribuição'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ============================================================================
// SUB COMPONENTS
// ============================================================================

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode
  onClose: () => void
  title: string
}) {
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between px-6 py-4 border-b'>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <button onClick={onClose} className='p-1 hover:bg-gray-100 rounded-full'>
            <X className='w-5 h-5' />
          </button>
        </div>
        <div className='p-6'>{children}</div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'amber',
}: {
  icon: React.ElementType
  label: string
  value: string
  subValue?: string
  color?: 'amber' | 'green' | 'blue' | 'purple'
}) {
  const colors = {
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className='bg-white rounded-xl p-6 shadow-sm border border-gray-100'>
      <div className='flex items-center gap-4'>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className='w-6 h-6' />
        </div>
        <div>
          <p className='text-sm text-gray-600'>{label}</p>
          <p className='text-xl font-bold text-gray-900'>{value}</p>
          {subValue && <p className='text-xs text-gray-500'>{subValue}</p>}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({
  summary,
  cooperators,
  loadingSummary,
  loadingCooperators,
  formatCurrency,
  formatDate,
  onAddRevenue,
  onPreviewDistribution,
}: {
  summary?: RevenueSummary
  cooperators?: Cooperator[]
  loadingSummary: boolean
  loadingCooperators: boolean
  formatCurrency: (v: number) => string
  formatDate: (d: string | null) => string
  onAddRevenue: () => void
  onPreviewDistribution: () => void
}) {
  return (
    <div className='space-y-6'>
      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard
          icon={DollarSign}
          label='Receita Total'
          value={loadingSummary ? '...' : formatCurrency(summary?.total_revenue || 0)}
          color='amber'
        />
        <StatCard
          icon={Clock}
          label='Pendente Distribuição'
          value={loadingSummary ? '...' : formatCurrency(summary?.pending_distribution || 0)}
          color='blue'
        />
        <StatCard
          icon={TrendingUp}
          label='Total Distribuído'
          value={loadingSummary ? '...' : formatCurrency(summary?.total_distributed || 0)}
          color='green'
        />
        <StatCard
          icon={Users}
          label='Cooperadores'
          value={loadingSummary ? '...' : String(summary?.total_cooperators || 0)}
          subValue={`${formatCurrency(summary?.total_deposited_usdt || 0)} depositados`}
          color='purple'
        />
      </div>

      {/* Actions */}
      <div className='bg-white rounded-xl p-6 shadow-sm border border-gray-100'>
        <h3 className='text-lg font-semibold mb-4'>Ações Rápidas</h3>
        <div className='flex flex-wrap gap-4'>
          <button
            onClick={onAddRevenue}
            className='flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors'
          >
            <DollarSign className='w-4 h-4' />
            Adicionar Receita
          </button>
          <button
            onClick={onPreviewDistribution}
            className='flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors'
          >
            <TrendingUp className='w-4 h-4' />
            Preview Distribuição
          </button>
        </div>
        {summary?.last_distribution && (
          <p className='text-sm text-gray-500 mt-4'>
            Última distribuição: {formatDate(summary.last_distribution)}
          </p>
        )}
      </div>

      {/* Cooperators Table */}
      <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
        <div className='px-6 py-4 border-b'>
          <h3 className='text-lg font-semibold'>Cooperadores Ativos</h3>
        </div>
        {loadingCooperators ? (
          <div className='p-8 text-center text-gray-500'>Carregando...</div>
        ) : !cooperators?.length ? (
          <div className='p-8 text-center text-gray-500'>Nenhum cooperador ativo</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                    Usuário
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                    Tier
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                    Depositado
                  </th>
                  <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                    Rendimentos
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                    % Pool
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {cooperators.map(coop => (
                  <tr key={coop.user_id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div>
                        <p className='text-sm font-medium text-gray-900'>{coop.email}</p>
                        <p className='text-xs text-gray-500'>ID: {coop.user_id}</p>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium'>
                        {coop.tier_name} (Nível {coop.tier_level})
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right'>
                      <span className='font-mono'>{formatCurrency(coop.total_deposited_usdt)}</span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right'>
                      <span className='font-mono text-green-600'>
                        +{formatCurrency(coop.total_yield_earned)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-center'>
                      <span className='font-mono'>{coop.pool_share_percentage.toFixed(2)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TIERS TAB
// ============================================================================

function TiersTab({
  tiers,
  loadingTiers,
  editingTier,
  tierEdit,
  setTierEdit,
  onEdit,
  onSave,
  onCancel,
  formatCurrency,
}: {
  tiers?: EarnPoolTier[]
  loadingTiers: boolean
  editingTier: number | null
  tierEdit: Partial<EarnPoolTier>
  setTierEdit: React.Dispatch<React.SetStateAction<Partial<EarnPoolTier>>>
  onEdit: (tier: EarnPoolTier) => void
  onSave: () => void
  onCancel: () => void
  formatCurrency: (v: number) => string
}) {
  if (loadingTiers) {
    return <div className='p-8 text-center text-gray-500'>Carregando tiers...</div>
  }

  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='px-6 py-4 border-b'>
        <h3 className='text-lg font-semibold'>Configuração de Tiers</h3>
        <p className='text-sm text-gray-500'>
          Defina os percentuais de rendimento semanal para cada nível de tier.
        </p>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                Nível
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                Nome
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                Mín. USDT
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                Máx. USDT
              </th>
              <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                % Semanal
              </th>
              <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                Status
              </th>
              <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                Ações
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200'>
            {tiers?.map(tier => (
              <tr key={tier.id} className='hover:bg-gray-50'>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <span className='w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-800 rounded-full font-bold'>
                    {tier.level}
                  </span>
                </td>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <div>
                    <p className='font-medium'>{tier.name}</p>
                    <p className='text-xs text-gray-500'>{tier.name_pt}</p>
                  </div>
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-right'>
                  {editingTier === tier.id ? (
                    <input
                      type='number'
                      value={tierEdit.min_usdt || ''}
                      onChange={e =>
                        setTierEdit({ ...tierEdit, min_usdt: parseFloat(e.target.value) })
                      }
                      className='w-24 px-2 py-1 border rounded text-right'
                    />
                  ) : (
                    <span className='font-mono'>{formatCurrency(tier.min_usdt)}</span>
                  )}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-right'>
                  {editingTier === tier.id ? (
                    <input
                      type='number'
                      value={tierEdit.max_usdt || ''}
                      onChange={e =>
                        setTierEdit({
                          ...tierEdit,
                          max_usdt: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      className='w-24 px-2 py-1 border rounded text-right'
                      placeholder='∞'
                    />
                  ) : (
                    <span className='font-mono'>
                      {tier.max_usdt ? formatCurrency(tier.max_usdt) : '∞'}
                    </span>
                  )}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-center'>
                  {editingTier === tier.id ? (
                    <input
                      type='number'
                      step='0.01'
                      value={tierEdit.pool_share_percentage || ''}
                      onChange={e =>
                        setTierEdit({
                          ...tierEdit,
                          pool_share_percentage: parseFloat(e.target.value),
                        })
                      }
                      className='w-20 px-2 py-1 border rounded text-center'
                    />
                  ) : (
                    <span className='px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium'>
                      {tier.pool_share_percentage.toFixed(2)}%
                    </span>
                  )}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-center'>
                  {editingTier === tier.id ? (
                    <select
                      value={tierEdit.is_active ? 'true' : 'false'}
                      onChange={e =>
                        setTierEdit({ ...tierEdit, is_active: e.target.value === 'true' })
                      }
                      className='px-2 py-1 border rounded'
                    >
                      <option value='true'>Ativo</option>
                      <option value='false'>Inativo</option>
                    </select>
                  ) : tier.is_active ? (
                    <span className='px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs'>
                      Ativo
                    </span>
                  ) : (
                    <span className='px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs'>
                      Inativo
                    </span>
                  )}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-center'>
                  {editingTier === tier.id ? (
                    <div className='flex items-center justify-center gap-2'>
                      <button
                        onClick={onSave}
                        className='p-1 text-green-600 hover:bg-green-50 rounded'
                      >
                        <Save className='w-4 h-4' />
                      </button>
                      <button
                        onClick={onCancel}
                        className='p-1 text-red-600 hover:bg-red-50 rounded'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onEdit(tier)}
                      className='p-1 text-amber-600 hover:bg-amber-50 rounded'
                    >
                      <Edit2 className='w-4 h-4' />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// CONFIG TAB
// ============================================================================

function ConfigTab({
  config,
  loadingConfig,
  editingConfig,
  configEdit,
  setConfigEdit,
  onEdit,
  onSave,
  onCancel,
}: {
  config?: EarnPoolConfig
  loadingConfig: boolean
  editingConfig: boolean
  configEdit: Partial<EarnPoolConfig>
  setConfigEdit: React.Dispatch<React.SetStateAction<Partial<EarnPoolConfig>>>
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}) {
  if (loadingConfig) {
    return <div className='p-8 text-center text-gray-500'>Carregando configurações...</div>
  }

  if (!config) {
    return <div className='p-8 text-center text-gray-500'>Configuração não encontrada</div>
  }

  const configFields = [
    { key: 'min_deposit_usdt', label: 'Depósito Mínimo (USDT)', type: 'number' },
    { key: 'max_deposit_usdt', label: 'Depósito Máximo (USDT)', type: 'number', nullable: true },
    { key: 'lock_period_days', label: 'Período de Lock (dias)', type: 'number' },
    { key: 'withdrawal_delay_days', label: 'Delay para Saque (dias)', type: 'number' },
    {
      key: 'early_withdrawal_admin_fee',
      label: 'Taxa Admin Saque Antecipado (%)',
      type: 'number',
      step: '0.01',
    },
    {
      key: 'early_withdrawal_op_fee',
      label: 'Taxa Operacional Saque Antecipado (%)',
      type: 'number',
      step: '0.01',
    },
    {
      key: 'target_weekly_yield_percentage',
      label: 'Meta de Rendimento Semanal (%)',
      type: 'number',
      step: '0.01',
    },
  ]

  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='px-6 py-4 border-b flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold'>Configurações Globais</h3>
          <p className='text-sm text-gray-500'>
            Configure os parâmetros do EarnPool que afetam todos os usuários.
          </p>
        </div>
        {!editingConfig && (
          <button
            onClick={onEdit}
            className='flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors'
          >
            <Edit2 className='w-4 h-4' />
            Editar
          </button>
        )}
      </div>
      <div className='p-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {configFields.map(field => (
            <div key={field.key} className='space-y-1'>
              <label className='block text-sm font-medium text-gray-700'>{field.label}</label>
              {editingConfig ? (
                <input
                  type={field.type}
                  step={field.step || '1'}
                  value={(configEdit as any)[field.key] ?? ''}
                  onChange={e =>
                    setConfigEdit({
                      ...configEdit,
                      [field.key]:
                        field.nullable && e.target.value === '' ? null : parseFloat(e.target.value),
                    })
                  }
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent'
                  placeholder={field.nullable ? 'Sem limite' : ''}
                />
              ) : (
                <p className='text-lg font-mono text-gray-900'>
                  {(config as any)[field.key] !== null ? (config as any)[field.key] : 'Sem limite'}
                  {field.key.includes('fee') || field.key.includes('percentage') ? '%' : ''}
                  {field.key.includes('days') ? ' dias' : ''}
                  {field.key.includes('usdt') && (config as any)[field.key] !== null ? ' USDT' : ''}
                </p>
              )}
            </div>
          ))}
        </div>

        {editingConfig && (
          <div className='flex justify-end gap-3 mt-6 pt-6 border-t'>
            <button
              onClick={onCancel}
              className='px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors'
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className='flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors'
            >
              <Save className='w-4 h-4' />
              Salvar Alterações
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// DEPOSITS TAB
// ============================================================================

function DepositsTab({
  deposits,
  loadingDeposits,
  formatCurrency,
  formatDate,
  getStatusBadge,
}: {
  deposits?: EarnPoolDeposit[]
  loadingDeposits: boolean
  formatCurrency: (v: number) => string
  formatDate: (d: string | null) => string
  getStatusBadge: (status: string) => React.ReactNode
}) {
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filteredDeposits = deposits?.filter(
    d => filterStatus === 'all' || d.status === filterStatus
  )

  const statusOptions = [
    'all',
    'PENDING',
    'ACTIVE',
    'LOCKED',
    'WITHDRAWAL_PENDING',
    'WITHDRAWN',
    'CANCELLED',
  ]

  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='px-6 py-4 border-b flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold'>Depósitos</h3>
          <p className='text-sm text-gray-500'>Todos os depósitos realizados no EarnPool</p>
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500'
        >
          <option value='all'>Todos os Status</option>
          <option value='PENDING'>Pendente</option>
          <option value='ACTIVE'>Ativo</option>
          <option value='LOCKED'>Bloqueado</option>
          <option value='WITHDRAWAL_PENDING'>Saque Pendente</option>
          <option value='WITHDRAWN'>Sacado</option>
          <option value='CANCELLED'>Cancelado</option>
        </select>
      </div>

      {loadingDeposits ? (
        <div className='p-8 text-center text-gray-500'>Carregando depósitos...</div>
      ) : !filteredDeposits?.length ? (
        <div className='p-8 text-center text-gray-500'>Nenhum depósito encontrado</div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  ID
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  Usuário
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  Crypto
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                  Valor USDT
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                  Rendimentos
                </th>
                <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                  Tier
                </th>
                <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  Data Depósito
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  Lock Termina
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {filteredDeposits.map(deposit => (
                <tr key={deposit.id} className='hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500'>
                    #{deposit.id}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div>
                      <p className='text-sm font-medium text-gray-900'>
                        {deposit.user_email || '-'}
                      </p>
                      <p className='text-xs text-gray-500'>ID: {deposit.user_id}</p>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div>
                      <p className='text-sm font-medium'>{deposit.crypto_symbol}</p>
                      <p className='text-xs text-gray-500 font-mono'>
                        {deposit.crypto_amount.toFixed(8)}
                      </p>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right'>
                    <span className='font-mono'>{formatCurrency(deposit.usdt_amount)}</span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right'>
                    <span className='font-mono text-green-600'>
                      +{formatCurrency(deposit.total_yield_earned)}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-center'>
                    <span className='px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium'>
                      {deposit.tier_name || `Nível ${deposit.tier_level}`}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-center'>
                    {getStatusBadge(deposit.status)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {formatDate(deposit.deposited_at)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {formatDate(deposit.lock_ends_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// WITHDRAWALS TAB
// ============================================================================

function WithdrawalsTab({
  withdrawals,
  loadingWithdrawals,
  formatCurrency,
  formatDate,
  getStatusBadge,
  onApprove,
  onReject,
}: {
  withdrawals?: EarnPoolWithdrawal[]
  loadingWithdrawals: boolean
  formatCurrency: (v: number) => string
  formatDate: (d: string | null) => string
  getStatusBadge: (status: string) => React.ReactNode
  onApprove: (id: number) => void
  onReject: (id: number, reason: string) => void
}) {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const filteredWithdrawals = withdrawals?.filter(
    w => filterStatus === 'all' || w.status === filterStatus
  )

  const handleReject = (id: number) => {
    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição')
      return
    }
    onReject(id, rejectReason)
    setRejectingId(null)
    setRejectReason('')
  }

  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='px-6 py-4 border-b flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold'>Saques</h3>
          <p className='text-sm text-gray-500'>Gerencie solicitações de saque do EarnPool</p>
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500'
        >
          <option value='all'>Todos os Status</option>
          <option value='PENDING'>Pendente</option>
          <option value='APPROVED'>Aprovado</option>
          <option value='REJECTED'>Rejeitado</option>
          <option value='PROCESSING'>Processando</option>
          <option value='COMPLETED'>Concluído</option>
        </select>
      </div>

      {loadingWithdrawals ? (
        <div className='p-8 text-center text-gray-500'>Carregando saques...</div>
      ) : !filteredWithdrawals?.length ? (
        <div className='p-8 text-center text-gray-500'>Nenhum saque encontrado</div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  ID
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  Usuário
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                  Valor
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                  Taxas
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                  Líquido
                </th>
                <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                  Destino
                </th>
                <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                  Antecipado?
                </th>
                <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                  Status
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  Solicitado
                </th>
                <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {filteredWithdrawals.map(withdrawal => (
                <tr key={withdrawal.id} className='hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500'>
                    #{withdrawal.id}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div>
                      <p className='text-sm font-medium text-gray-900'>
                        {withdrawal.user_email || '-'}
                      </p>
                      <p className='text-xs text-gray-500'>Depósito #{withdrawal.deposit_id}</p>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right'>
                    <div>
                      <p className='font-mono'>{formatCurrency(withdrawal.amount_usdt)}</p>
                      <p className='text-xs text-gray-500'>
                        {withdrawal.amount_crypto.toFixed(8)} {withdrawal.crypto_symbol}
                      </p>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right'>
                    <div className='text-red-600'>
                      <p className='font-mono text-sm'>
                        -{formatCurrency(withdrawal.admin_fee + withdrawal.operational_fee)}
                      </p>
                      {withdrawal.is_early_withdrawal && (
                        <p className='text-xs'>
                          (Admin: {formatCurrency(withdrawal.admin_fee)}, Op:{' '}
                          {formatCurrency(withdrawal.operational_fee)})
                        </p>
                      )}
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right'>
                    <span className='font-mono text-green-600 font-medium'>
                      {formatCurrency(withdrawal.net_amount)}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-center'>
                    <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs uppercase'>
                      {withdrawal.destination_type}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-center'>
                    {withdrawal.is_early_withdrawal ? (
                      <span className='px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs'>
                        <AlertTriangle className='w-3 h-3 inline mr-1' />
                        Sim
                      </span>
                    ) : (
                      <span className='text-gray-400'>Não</span>
                    )}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-center'>
                    {getStatusBadge(withdrawal.status)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {formatDate(withdrawal.requested_at)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-center'>
                    {withdrawal.status === 'PENDING' && (
                      <div className='flex items-center justify-center gap-2'>
                        <button
                          onClick={() => onApprove(withdrawal.id)}
                          className='p-1 text-green-600 hover:bg-green-50 rounded'
                          title='Aprovar'
                        >
                          <CheckCircle className='w-5 h-5' />
                        </button>
                        <button
                          onClick={() => setRejectingId(withdrawal.id)}
                          className='p-1 text-red-600 hover:bg-red-50 rounded'
                          title='Rejeitar'
                        >
                          <XCircle className='w-5 h-5' />
                        </button>
                      </div>
                    )}
                    {withdrawal.status !== 'PENDING' && <span className='text-gray-400'>-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <Modal
          onClose={() => {
            setRejectingId(null)
            setRejectReason('')
          }}
          title='Rejeitar Saque'
        >
          <div className='space-y-4'>
            <p className='text-sm text-gray-600'>
              Informe o motivo da rejeição do saque #{rejectingId}:
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent'
              rows={3}
              placeholder='Motivo da rejeição...'
            />
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => {
                  setRejectingId(null)
                  setRejectReason('')
                }}
                className='px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg'
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600'
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ============================================================================
// DISTRIBUTIONS TAB
// ============================================================================

function DistributionsTab({
  distributions,
  loadingDistributions,
  formatCurrency,
  formatDate,
}: {
  distributions?: Distribution[]
  loadingDistributions: boolean
  formatCurrency: (v: number) => string
  formatDate: (d: string | null) => string
}) {
  if (loadingDistributions) {
    return <div className='p-8 text-center text-gray-500'>Carregando distribuições...</div>
  }

  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='px-6 py-4 border-b'>
        <h3 className='text-lg font-semibold'>Histórico de Distribuições</h3>
        <p className='text-sm text-gray-500'>Todas as distribuições de rendimentos realizadas</p>
      </div>

      {!distributions?.length ? (
        <div className='p-8 text-center text-gray-500'>Nenhuma distribuição realizada ainda</div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  ID
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  Data
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase'>
                  Valor Total
                </th>
                <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase'>
                  Cooperadores
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                  Período
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-200'>
              {distributions.map(dist => (
                <tr key={dist.id} className='hover:bg-gray-50'>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500'>
                    #{dist.id}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm'>
                    {formatDate(dist.distributed_at)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-right'>
                    <span className='font-mono text-green-600 font-medium'>
                      {formatCurrency(dist.total_amount)}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-center'>
                    <span className='px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium'>
                      {dist.cooperators_count}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {formatDate(dist.period_start)} - {formatDate(dist.period_end)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
