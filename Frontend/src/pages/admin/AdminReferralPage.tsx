/**
 * 🎁 Admin Referral Page - WOLK FRIENDS
 * =====================================
 * Página de administração do programa de indicação
 *
 * @version 1.0.0
 */

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Gift,
  TrendingUp,
  DollarSign,
  Crown,
  Star,
  Award,
  Trophy,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Settings,
  Play,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
} from 'lucide-react'
import { apiClient } from '@/services/api'
import { toast } from 'react-hot-toast'

// ============================================================================
// TIPOS
// ============================================================================

interface ReferralStats {
  total_referral_codes: number
  total_referrals: number
  active_referrals: number
  qualified_referrals: number
  pending_referrals: number
  inactive_referrals: number
  total_commission_generated: number
  total_commission_paid: number
  total_commission_pending: number
  total_volume_generated: number
  tier_distribution: {
    bronze: number
    silver: number
    gold: number
    diamond: number
    ambassador: number
  }
  daily_stats: {
    date: string
    new_referrals: number
    qualified: number
    commission: number
  }[]
}

interface ReferralCode {
  id: string
  user_id: string
  user_email: string
  user_username: string
  code: string
  current_tier: string
  total_referrals: number
  active_referrals: number
  total_earned: number
  is_active: boolean
  created_at: string
}

interface ReferralEarning {
  id: string
  referrer_email: string
  referrer_code: string
  referred_email: string
  transaction_type: string
  transaction_amount: number
  fee_amount: number
  commission_rate: number
  commission_amount: number
  tier_at_earning: string
  is_paid: boolean
  paid_at?: string
  created_at: string
}

interface ReferralConfig {
  id: string
  min_transaction_to_qualify: number
  days_to_consider_active: number
  commission_percentage_swap: number
  commission_percentage_p2p: number
  commission_percentage_withdraw: number
  is_program_active: boolean
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const StatCard = ({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  trend?: number
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'cyan' | 'rose'
}) => {
  const colorClasses = {
    emerald: {
      bg: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/30',
      icon: 'from-emerald-500 to-teal-500',
      text: 'text-emerald-400',
    },
    blue: {
      bg: 'from-blue-500/20 to-indigo-500/20',
      border: 'border-blue-500/30',
      icon: 'from-blue-500 to-indigo-500',
      text: 'text-blue-400',
    },
    purple: {
      bg: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30',
      icon: 'from-purple-500 to-pink-500',
      text: 'text-purple-400',
    },
    amber: {
      bg: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/30',
      icon: 'from-amber-500 to-orange-500',
      text: 'text-amber-400',
    },
    cyan: {
      bg: 'from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-500/30',
      icon: 'from-cyan-500 to-blue-500',
      text: 'text-cyan-400',
    },
    rose: {
      bg: 'from-rose-500/20 to-pink-500/20',
      border: 'border-rose-500/30',
      icon: 'from-rose-500 to-pink-500',
      text: 'text-rose-400',
    },
  }

  const classes = colorClasses[color]

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${classes.bg} border ${classes.border} p-4 backdrop-blur-xl`}
    >
      <div className='flex items-start justify-between'>
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${classes.icon} flex items-center justify-center shadow-lg`}
        >
          <Icon className='w-5 h-5 text-white' />
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {trend >= 0 ? (
              <ArrowUpRight className='w-3 h-3' />
            ) : (
              <ArrowDownRight className='w-3 h-3' />
            )}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className='mt-4'>
        <p className='text-slate-400 text-xs font-medium uppercase tracking-wider'>{label}</p>
        <p className='text-white text-2xl font-bold mt-1'>{value}</p>
        {subValue && <p className={`${classes.text} text-sm font-medium mt-1`}>{subValue}</p>}
      </div>
    </div>
  )
}

const TierBadge = ({ tier }: { tier: string }) => {
  const tierConfig: Record<string, { color: string; icon: React.ElementType }> = {
    BRONZE: { color: 'bg-amber-700/30 text-amber-400 border-amber-600/50', icon: Award },
    SILVER: { color: 'bg-slate-400/30 text-slate-300 border-slate-500/50', icon: Star },
    GOLD: { color: 'bg-yellow-500/30 text-yellow-400 border-yellow-500/50', icon: Crown },
    DIAMOND: { color: 'bg-cyan-500/30 text-cyan-400 border-cyan-500/50', icon: Trophy },
    AMBASSADOR: { color: 'bg-purple-500/30 text-purple-400 border-purple-500/50', icon: Gift },
  }

  const config = tierConfig[tier] || tierConfig.BRONZE
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
    >
      <Icon className='w-3 h-3' />
      {tier}
    </span>
  )
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    QUALIFIED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    INACTIVE: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig[status] || statusConfig.PENDING}`}
    >
      {status}
    </span>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function AdminReferralPage() {
  const { t } = useTranslation()

  // Estados
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([])
  const [earnings, setEarnings] = useState<ReferralEarning[]>([])
  const [config, setConfig] = useState<ReferralConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros e busca
  const [activeTab, setActiveTab] = useState<'overview' | 'codes' | 'earnings' | 'config'>(
    'overview'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // ============================================================================
  // CARREGAMENTO DE DADOS
  // ============================================================================

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, codesRes, earningsRes, configRes] = await Promise.allSettled([
        apiClient.get('/admin/referral/stats'),
        apiClient.get('/admin/referral/codes'),
        apiClient.get('/admin/referral/earnings'),
        apiClient.get('/admin/referral/config'),
      ])

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (codesRes.status === 'fulfilled') setReferralCodes(codesRes.value.data.codes || [])
      if (earningsRes.status === 'fulfilled') setEarnings(earningsRes.value.data.earnings || [])
      if (configRes.status === 'fulfilled') setConfig(configRes.value.data)
    } catch (error) {
      console.error('Error loading referral data:', error)
      toast.error('Erro ao carregar dados do programa de indicação')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast.success('Dados atualizados')
  }

  const handleRunInactiveJob = async () => {
    try {
      const res = await apiClient.post('/admin/referral/jobs/mark-inactive')
      toast.success(`${res.data.count} indicações marcadas como inativas`)
      await loadData()
    } catch (error) {
      toast.error('Erro ao executar job')
    }
  }

  const handleUpdateConfig = async (updates: Partial<ReferralConfig>) => {
    try {
      await apiClient.patch('/admin/referral/config', updates)
      toast.success('Configuração atualizada')
      await loadData()
    } catch (error) {
      toast.error('Erro ao atualizar configuração')
    }
  }

  // ============================================================================
  // DADOS FILTRADOS
  // ============================================================================

  const filteredCodes = useMemo(() => {
    return referralCodes.filter(code => {
      const matchesSearch =
        code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.user_username.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTier = tierFilter === 'all' || code.current_tier === tierFilter

      return matchesSearch && matchesTier
    })
  }, [referralCodes, searchQuery, tierFilter])

  const filteredEarnings = useMemo(() => {
    return earnings.filter(earning => {
      const matchesSearch =
        earning.referrer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        earning.referrer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        earning.referred_email.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch
    })
  }, [earnings, searchQuery])

  // ============================================================================
  // FORMATAÇÃO
  // ============================================================================

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ============================================================================
  // LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6'>
        <div className='max-w-7xl mx-auto'>
          <div className='animate-pulse space-y-6'>
            <div className='h-12 bg-slate-800/50 rounded-xl w-64' />
            <div className='grid grid-cols-4 gap-4'>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className='h-32 bg-slate-800/50 rounded-2xl' />
              ))}
            </div>
            <div className='h-96 bg-slate-800/50 rounded-2xl' />
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6'>
      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg'>
              <Gift className='w-6 h-6 text-white' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-white'>WOLK FRIENDS</h1>
              <p className='text-slate-400 text-sm'>Programa de Indicação</p>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <button
              onClick={handleRunInactiveJob}
              className='flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all'
            >
              <Play className='w-4 h-4' />
              Marcar Inativos
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className='p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all'
            >
              <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status do Programa */}
        {config && (
          <div
            className={`p-4 rounded-2xl border ${config.is_program_active ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                {config.is_program_active ? (
                  <CheckCircle className='w-5 h-5 text-emerald-400' />
                ) : (
                  <AlertCircle className='w-5 h-5 text-red-400' />
                )}
                <span className={config.is_program_active ? 'text-emerald-400' : 'text-red-400'}>
                  Programa {config.is_program_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <button
                onClick={() => handleUpdateConfig({ is_program_active: !config.is_program_active })}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  config.is_program_active
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                }`}
              >
                {config.is_program_active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className='flex gap-2 border-b border-slate-800 pb-4'>
          {[
            { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
            { id: 'codes', label: 'Códigos', icon: Users },
            { id: 'earnings', label: 'Comissões', icon: DollarSign },
            { id: 'config', label: 'Configurações', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className='w-4 h-4' />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && stats && (
          <div className='space-y-6'>
            {/* Stats Grid */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <StatCard
                icon={Users}
                label='Total de Indicações'
                value={stats.total_referrals}
                subValue={`${stats.active_referrals} ativos`}
                color='blue'
              />
              <StatCard
                icon={UserPlus}
                label='Códigos Ativos'
                value={stats.total_referral_codes}
                color='purple'
              />
              <StatCard
                icon={DollarSign}
                label='Comissões Geradas'
                value={formatCurrency(stats.total_commission_generated)}
                subValue={`${formatCurrency(stats.total_commission_pending)} pendente`}
                color='emerald'
              />
              <StatCard
                icon={Activity}
                label='Volume Gerado'
                value={formatCurrency(stats.total_volume_generated)}
                color='amber'
              />
            </div>

            {/* Tier Distribution */}
            <div className='bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6'>
              <h3 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
                <Crown className='w-5 h-5 text-yellow-400' />
                Distribuição por Tier
              </h3>
              <div className='grid grid-cols-5 gap-4'>
                {[
                  {
                    tier: 'BRONZE',
                    count: stats.tier_distribution.bronze,
                    icon: Award,
                    color: 'amber',
                  },
                  {
                    tier: 'SILVER',
                    count: stats.tier_distribution.silver,
                    icon: Star,
                    color: 'slate',
                  },
                  {
                    tier: 'GOLD',
                    count: stats.tier_distribution.gold,
                    icon: Crown,
                    color: 'yellow',
                  },
                  {
                    tier: 'DIAMOND',
                    count: stats.tier_distribution.diamond,
                    icon: Trophy,
                    color: 'cyan',
                  },
                  {
                    tier: 'AMBASSADOR',
                    count: stats.tier_distribution.ambassador,
                    icon: Gift,
                    color: 'purple',
                  },
                ].map(item => (
                  <div key={item.tier} className='text-center p-4 rounded-xl bg-slate-700/30'>
                    <item.icon className={`w-8 h-8 mx-auto mb-2 text-${item.color}-400`} />
                    <p className='text-2xl font-bold text-white'>{item.count}</p>
                    <p className='text-xs text-slate-400'>{item.tier}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Distribution */}
            <div className='grid grid-cols-4 gap-4'>
              <div className='bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30'>
                <div className='flex items-center gap-2 mb-2'>
                  <Clock className='w-4 h-4 text-yellow-400' />
                  <span className='text-yellow-400 text-sm'>Pendentes</span>
                </div>
                <p className='text-2xl font-bold text-white'>{stats.pending_referrals}</p>
              </div>
              <div className='bg-blue-500/10 rounded-xl p-4 border border-blue-500/30'>
                <div className='flex items-center gap-2 mb-2'>
                  <CheckCircle className='w-4 h-4 text-blue-400' />
                  <span className='text-blue-400 text-sm'>Qualificados</span>
                </div>
                <p className='text-2xl font-bold text-white'>{stats.qualified_referrals}</p>
              </div>
              <div className='bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30'>
                <div className='flex items-center gap-2 mb-2'>
                  <Activity className='w-4 h-4 text-emerald-400' />
                  <span className='text-emerald-400 text-sm'>Ativos</span>
                </div>
                <p className='text-2xl font-bold text-white'>{stats.active_referrals}</p>
              </div>
              <div className='bg-slate-500/10 rounded-xl p-4 border border-slate-500/30'>
                <div className='flex items-center gap-2 mb-2'>
                  <AlertCircle className='w-4 h-4 text-slate-400' />
                  <span className='text-slate-400 text-sm'>Inativos</span>
                </div>
                <p className='text-2xl font-bold text-white'>{stats.inactive_referrals}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'codes' && (
          <div className='space-y-4'>
            {/* Filters */}
            <div className='flex gap-4'>
              <div className='flex-1 relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                <input
                  type='text'
                  placeholder='Buscar por código, email ou username...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none'
                />
              </div>
              <select
                value={tierFilter}
                onChange={e => setTierFilter(e.target.value)}
                className='px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-purple-500 focus:outline-none'
              >
                <option value='all'>Todos os Tiers</option>
                <option value='BRONZE'>Bronze</option>
                <option value='SILVER'>Silver</option>
                <option value='GOLD'>Gold</option>
                <option value='DIAMOND'>Diamond</option>
                <option value='AMBASSADOR'>Ambassador</option>
              </select>
            </div>

            {/* Table */}
            <div className='bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden'>
              <table className='w-full'>
                <thead>
                  <tr className='bg-slate-900/50'>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Código
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Usuário
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Tier
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Indicações
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Ganhos
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Status
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Criado em
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-700/50'>
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='p-8 text-center text-slate-400'>
                        Nenhum código de indicação encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map(code => (
                      <tr key={code.id} className='hover:bg-slate-700/30 transition-colors'>
                        <td className='p-4'>
                          <span className='font-mono text-purple-400 font-semibold'>
                            {code.code}
                          </span>
                        </td>
                        <td className='p-4'>
                          <div>
                            <p className='text-white font-medium'>{code.user_username}</p>
                            <p className='text-slate-400 text-sm'>{code.user_email}</p>
                          </div>
                        </td>
                        <td className='p-4'>
                          <TierBadge tier={code.current_tier} />
                        </td>
                        <td className='p-4'>
                          <div>
                            <p className='text-white font-medium'>{code.total_referrals}</p>
                            <p className='text-emerald-400 text-sm'>
                              {code.active_referrals} ativos
                            </p>
                          </div>
                        </td>
                        <td className='p-4'>
                          <span className='text-emerald-400 font-semibold'>
                            {formatCurrency(code.total_earned)}
                          </span>
                        </td>
                        <td className='p-4'>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              code.is_active
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {code.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className='p-4 text-slate-400 text-sm'>
                          {formatDate(code.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className='space-y-4'>
            {/* Search */}
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
              <input
                type='text'
                placeholder='Buscar por email ou código...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className='w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none'
              />
            </div>

            {/* Table */}
            <div className='bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden'>
              <table className='w-full'>
                <thead>
                  <tr className='bg-slate-900/50'>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Indicador
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Indicado
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Tipo
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Valor Trans.
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Taxa
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Comissão
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Status
                    </th>
                    <th className='text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4'>
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-700/50'>
                  {filteredEarnings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className='p-8 text-center text-slate-400'>
                        Nenhuma comissão encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredEarnings.map(earning => (
                      <tr key={earning.id} className='hover:bg-slate-700/30 transition-colors'>
                        <td className='p-4'>
                          <div>
                            <p className='text-white font-medium'>{earning.referrer_email}</p>
                            <p className='text-purple-400 text-xs font-mono'>
                              {earning.referrer_code}
                            </p>
                          </div>
                        </td>
                        <td className='p-4 text-slate-300'>{earning.referred_email}</td>
                        <td className='p-4'>
                          <span className='px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs'>
                            {earning.transaction_type}
                          </span>
                        </td>
                        <td className='p-4 text-white'>
                          {formatCurrency(earning.transaction_amount)}
                        </td>
                        <td className='p-4 text-slate-400'>{formatCurrency(earning.fee_amount)}</td>
                        <td className='p-4'>
                          <div>
                            <p className='text-emerald-400 font-semibold'>
                              {formatCurrency(earning.commission_amount)}
                            </p>
                            <p className='text-slate-500 text-xs'>{earning.commission_rate}%</p>
                          </div>
                        </td>
                        <td className='p-4'>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              earning.is_paid
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {earning.is_paid ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className='p-4 text-slate-400 text-sm'>
                          {formatDate(earning.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'config' && config && (
          <div className='space-y-6'>
            <div className='bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6'>
              <h3 className='text-lg font-semibold text-white mb-6 flex items-center gap-2'>
                <Settings className='w-5 h-5 text-purple-400' />
                Configurações do Programa
              </h3>

              <div className='grid grid-cols-2 gap-6'>
                <div>
                  <label className='block text-sm font-medium text-slate-400 mb-2'>
                    Valor mínimo para qualificar (USD)
                  </label>
                  <input
                    type='number'
                    value={config.min_transaction_to_qualify}
                    onChange={e =>
                      handleUpdateConfig({ min_transaction_to_qualify: Number(e.target.value) })
                    }
                    className='w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-purple-500 focus:outline-none'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-slate-400 mb-2'>
                    Dias para considerar ativo
                  </label>
                  <input
                    type='number'
                    value={config.days_to_consider_active}
                    onChange={e =>
                      handleUpdateConfig({ days_to_consider_active: Number(e.target.value) })
                    }
                    className='w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-purple-500 focus:outline-none'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-slate-400 mb-2'>
                    Comissão base Swap (%)
                  </label>
                  <input
                    type='number'
                    value={config.commission_percentage_swap}
                    onChange={e =>
                      handleUpdateConfig({ commission_percentage_swap: Number(e.target.value) })
                    }
                    className='w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-purple-500 focus:outline-none'
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium text-slate-400 mb-2'>
                    Comissão base P2P (%)
                  </label>
                  <input
                    type='number'
                    value={config.commission_percentage_p2p}
                    onChange={e =>
                      handleUpdateConfig({ commission_percentage_p2p: Number(e.target.value) })
                    }
                    className='w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:border-purple-500 focus:outline-none'
                  />
                </div>
              </div>
            </div>

            {/* Tier Info */}
            <div className='bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6'>
              <h3 className='text-lg font-semibold text-white mb-6 flex items-center gap-2'>
                <Crown className='w-5 h-5 text-yellow-400' />
                Estrutura de Tiers
              </h3>

              <div className='space-y-4'>
                {[
                  { tier: 'BRONZE', min: 0, rate: 20, icon: Award, color: 'amber' },
                  { tier: 'SILVER', min: 6, rate: 25, icon: Star, color: 'slate' },
                  { tier: 'GOLD', min: 21, rate: 30, icon: Crown, color: 'yellow' },
                  { tier: 'DIAMOND', min: 51, rate: 35, icon: Trophy, color: 'cyan' },
                  { tier: 'AMBASSADOR', min: 100, rate: 40, icon: Gift, color: 'purple' },
                ].map(item => (
                  <div
                    key={item.tier}
                    className='flex items-center justify-between p-4 rounded-xl bg-slate-900/50'
                  >
                    <div className='flex items-center gap-3'>
                      <item.icon className={`w-6 h-6 text-${item.color}-400`} />
                      <div>
                        <p className='text-white font-medium'>{item.tier}</p>
                        <p className='text-slate-400 text-sm'>Min. {item.min} indicados ativos</p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-emerald-400 font-bold text-lg'>{item.rate}%</p>
                      <p className='text-slate-500 text-xs'>da taxa cobrada</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminReferralPage
