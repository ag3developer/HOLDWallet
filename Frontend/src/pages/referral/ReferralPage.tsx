/**
 * 🎁 WOLK FRIENDS - Referral Program Page
 * =========================================
 * Dashboard do programa de indicação
 *
 * @version 2.0.0 - Tailwind CSS Version
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Gift,
  TrendingUp,
  Copy,
  Share2,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Crown,
  Star,
  Gem,
  Award,
  Sparkles,
  DollarSign,
  Activity,
  BarChart3,
  ExternalLink,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { apiClient } from '@/services/api'
import toast from 'react-hot-toast'

// ============================================================================
// TYPES
// ============================================================================

interface ReferralDashboard {
  referral_code: string
  share_link: string
  tier: {
    current: string
    commission_rate: number
    next: string | null
    progress: {
      current_active: number
      needed_for_next: number
    }
  }
  stats: {
    total_referrals: number
    active_referrals: number
    pending_referrals: number
    inactive_referrals: number
  }
  earnings: {
    total: number
    pending: number
    recent: RecentEarning[]
  }
  recent_referrals: RecentReferral[]
  program_tiers: TierInfo[]
}

interface RecentEarning {
  id: string
  transaction_type: string
  transaction_amount: number
  commission_rate: number
  commission_amount: number
  tier: string
  created_at: string
}

interface RecentReferral {
  id: string
  referred_username: string
  status: string
  created_at: string
  total_volume: number
  total_commission: number
}

interface TierInfo {
  name: string
  min_referrals: number
  commission_rate: number
}

// ============================================================================
// TIER COLORS & ICONS
// ============================================================================

const tierConfig: Record<string, { gradient: string; icon: typeof Crown; color: string }> = {
  bronze: {
    gradient: 'from-amber-700 to-amber-900',
    icon: Award,
    color: 'text-amber-400',
  },
  silver: {
    gradient: 'from-slate-400 to-slate-600',
    icon: Star,
    color: 'text-slate-300',
  },
  gold: {
    gradient: 'from-yellow-400 to-amber-500',
    icon: Crown,
    color: 'text-yellow-400',
  },
  diamond: {
    gradient: 'from-cyan-400 to-blue-500',
    icon: Gem,
    color: 'text-cyan-400',
  },
  ambassador: {
    gradient: 'from-purple-500 to-pink-500',
    icon: Sparkles,
    color: 'text-purple-400',
  },
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'cyan'
}

const StatCard = ({ icon: Icon, label, value, subValue, color }: StatCardProps) => {
  const colorClasses = {
    emerald: {
      lightBg: 'bg-emerald-50',
      darkBg: 'dark:from-emerald-500/20 dark:to-teal-500/20',
      lightBorder: 'border-emerald-200',
      darkBorder: 'dark:border-emerald-500/30',
      icon: 'from-emerald-500 to-teal-500',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    blue: {
      lightBg: 'bg-blue-50',
      darkBg: 'dark:from-blue-500/20 dark:to-indigo-500/20',
      lightBorder: 'border-blue-200',
      darkBorder: 'dark:border-blue-500/30',
      icon: 'from-blue-500 to-indigo-500',
      text: 'text-blue-600 dark:text-blue-400',
    },
    purple: {
      lightBg: 'bg-purple-50',
      darkBg: 'dark:from-purple-500/20 dark:to-pink-500/20',
      lightBorder: 'border-purple-200',
      darkBorder: 'dark:border-purple-500/30',
      icon: 'from-purple-500 to-pink-500',
      text: 'text-purple-600 dark:text-purple-400',
    },
    amber: {
      lightBg: 'bg-amber-50',
      darkBg: 'dark:from-amber-500/20 dark:to-orange-500/20',
      lightBorder: 'border-amber-200',
      darkBorder: 'dark:border-amber-500/30',
      icon: 'from-amber-500 to-orange-500',
      text: 'text-amber-600 dark:text-amber-400',
    },
    cyan: {
      lightBg: 'bg-cyan-50',
      darkBg: 'dark:from-cyan-500/20 dark:to-blue-500/20',
      lightBorder: 'border-cyan-200',
      darkBorder: 'dark:border-cyan-500/30',
      icon: 'from-cyan-500 to-blue-500',
      text: 'text-cyan-600 dark:text-cyan-400',
    },
  }

  const classes = colorClasses[color]

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${classes.lightBg} dark:bg-gradient-to-br ${classes.darkBg} border ${classes.lightBorder} ${classes.darkBorder} p-4 shadow-sm dark:shadow-none backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
    >
      <div className='flex items-start justify-between'>
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${classes.icon} flex items-center justify-center shadow-lg`}
        >
          <Icon className='w-5 h-5 text-white' />
        </div>
      </div>
      <div className='mt-4'>
        <p className='text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider'>
          {label}
        </p>
        <p className='text-gray-900 dark:text-white text-2xl font-bold mt-1'>{value}</p>
        {subValue && <p className={`${classes.text} text-sm font-medium mt-1`}>{subValue}</p>}
      </div>
    </div>
  )
}

// ============================================================================
// TIER CARD COMPONENT
// ============================================================================

interface TierCardProps {
  tier: TierInfo
  isCurrentTier: boolean
}

const TierCard = ({ tier, isCurrentTier }: TierCardProps) => {
  const config = tierConfig[tier.name] ?? tierConfig.bronze
  const TierIcon = config?.icon ?? Award
  const gradient = config?.gradient ?? 'from-amber-700 to-amber-900'
  const color = config?.color ?? 'text-amber-400'

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 ${
        isCurrentTier
          ? `bg-gradient-to-br ${gradient} scale-105 shadow-xl ring-2 ring-white/30`
          : 'bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 hover:border-gray-300 dark:hover:border-slate-600'
      }`}
    >
      {isCurrentTier && (
        <div className='absolute top-2 right-2'>
          <span className='px-2 py-1 rounded-full bg-white/20 text-white text-xs font-medium'>
            Você
          </span>
        </div>
      )}
      <div className='flex items-center gap-3 mb-3'>
        <div
          className={`w-10 h-10 rounded-xl ${isCurrentTier ? 'bg-white/20' : 'bg-gradient-to-br ' + gradient} flex items-center justify-center`}
        >
          <TierIcon className={`w-5 h-5 ${isCurrentTier ? 'text-white' : color}`} />
        </div>
        <h4 className={`font-bold capitalize ${isCurrentTier ? 'text-white' : color}`}>
          {tier.name}
        </h4>
      </div>
      <div
        className={`text-3xl font-bold ${isCurrentTier ? 'text-white' : 'text-gray-800 dark:text-slate-300'}`}
      >
        {tier.commission_rate}%
      </div>
      <p
        className={`text-sm mt-1 ${isCurrentTier ? 'text-white/80' : 'text-gray-500 dark:text-slate-500'}`}
      >
        {tier.min_referrals === 0 ? 'Nível inicial' : `${tier.min_referrals}+ ativos`}
      </p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReferralPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'referrals' | 'earnings' | 'tiers'>('referrals')
  const [refreshing, setRefreshing] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login')
    }
  }, [isAuthenticated, navigate])

  // Load data
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard()
    }
  }, [isAuthenticated])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/referral/dashboard')
      setDashboard(response.data)
      setError(null)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error?.response?.data?.detail || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboard()
    setRefreshing(false)
    toast.success(t('common.refreshSuccess', 'Dados atualizados!'))
  }

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  // Share functions
  const shareOnWhatsApp = () => {
    if (!dashboard) return
    const text = `🎁 Use meu código ${dashboard.referral_code} na WolkNow e ganhe benefícios! ${dashboard.share_link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareOnTelegram = () => {
    if (!dashboard) return
    const text = `🎁 Use meu código ${dashboard.referral_code} na WolkNow e ganhe benefícios!`
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(dashboard.share_link)}&text=${encodeURIComponent(text)}`,
      '_blank'
    )
  }

  // Format helpers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // Status badge
  const getStatusBadge = (status: string) => {
    const defaultConfig = { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' }
    const configs: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
      active: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
      pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
      inactive: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
      qualified: { icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    }
    const config = configs[status] || defaultConfig
    const StatusIcon = config.icon
    const statusColor = config.color
    const statusBg = config.bg

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${statusBg}`}>
        <StatusIcon className={`w-3 h-3 ${statusColor}`} />
        <span className={`text-xs font-medium ${statusColor}`}>{status}</span>
      </span>
    )
  }

  // Progress percentage
  const getProgressPercentage = () => {
    if (!dashboard?.tier.progress) return 0
    const { current_active, needed_for_next } = dashboard.tier.progress
    if (needed_for_next <= 0) return 100
    const total = current_active + needed_for_next
    return Math.min(100, (current_active / total) * 100)
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'>
        <div className='max-w-6xl mx-auto p-4 md:p-6'>
          <div className='rounded-3xl bg-white dark:bg-slate-800/50 shadow-lg dark:shadow-none p-8 mb-6 animate-pulse'>
            <div className='h-10 bg-gray-200 dark:bg-slate-700/50 rounded-xl w-64 mb-4' />
            <div className='h-6 bg-gray-200 dark:bg-slate-700/50 rounded-lg w-96 mb-8' />
            <div className='h-48 bg-gray-100 dark:bg-slate-700/30 rounded-2xl' />
          </div>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className='h-36 bg-white dark:bg-slate-800/50 shadow-lg dark:shadow-none rounded-2xl animate-pulse'
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center'>
        <div className='text-center p-8'>
          <XCircle className='w-16 h-16 text-red-400 mx-auto mb-4' />
          <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>Erro ao carregar</h2>
          <p className='text-gray-500 dark:text-slate-400 mb-4'>{error}</p>
          <button
            onClick={loadDashboard}
            className='px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-all'
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!dashboard) return null

  const currentTierConfig = tierConfig[dashboard.tier.current]
  const currentGradient = currentTierConfig?.gradient ?? 'from-amber-700 to-amber-900'
  const TierIcon = currentTierConfig?.icon ?? Award

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-24'>
      {/* Gradient Orbs - only visible in dark mode */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none dark:block hidden'>
        <div className='absolute -top-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px]' />
        <div className='absolute -top-20 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px]' />
      </div>

      <div className='relative max-w-6xl mx-auto p-4 md:p-6 pt-6 md:pt-10'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div className='flex items-center gap-4'>
            <div className='relative'>
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentGradient} flex items-center justify-center shadow-lg`}
              >
                <Gift className='w-7 h-7 text-white' />
              </div>
              <div className='absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-gray-50 dark:border-slate-950 flex items-center justify-center'>
                <Activity className='w-3 h-3 text-gray-50 dark:text-slate-950' />
              </div>
            </div>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
                WOLK FRIENDS
              </h1>
              <p className='text-gray-500 dark:text-slate-400 text-sm'>
                {t('referral.subtitle', 'Programa de Indicação')}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className='p-3 rounded-xl bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 transition-all'
            aria-label={t('common.refresh', 'Atualizar')}
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-700 dark:text-white ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Main Card - Referral Code */}
        <div
          className={`rounded-3xl bg-gradient-to-br ${currentGradient} p-6 md:p-8 mb-6 relative overflow-hidden`}
        >
          {/* Decorative elements */}
          <div className='absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2' />

          <div className='relative'>
            <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-6'>
              {/* Left: Code Info */}
              <div>
                <div className='flex items-center gap-2 mb-4'>
                  <TierIcon className='w-5 h-5 text-white/80' />
                  <span className='text-white/80 text-sm font-medium uppercase'>
                    {dashboard.tier.current}
                  </span>
                  <span className='px-2 py-0.5 rounded-full bg-white/20 text-white text-xs'>
                    {dashboard.tier.commission_rate}% {t('referral.commission', 'comissão')}
                  </span>
                </div>

                <p className='text-white/70 text-sm mb-2'>
                  {t('referral.yourCode', 'Seu código de indicação:')}
                </p>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='px-6 py-3 rounded-xl bg-white/20 backdrop-blur-xl'>
                    <span className='text-3xl font-bold text-white tracking-widest'>
                      {dashboard.referral_code}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(dashboard.referral_code, 'Código')}
                    className='p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-all'
                    aria-label={t('referral.copyCode', 'Copiar código')}
                  >
                    <Copy className='w-5 h-5 text-white' />
                  </button>
                </div>

                {/* Share buttons */}
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => copyToClipboard(dashboard.share_link, 'Link')}
                    className='flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all'
                  >
                    <ExternalLink className='w-4 h-4' />
                    {t('referral.copyLink', 'Copiar Link')}
                  </button>
                  <button
                    onClick={shareOnWhatsApp}
                    className='p-2 rounded-xl bg-green-500/80 hover:bg-green-500 transition-all'
                    title='WhatsApp'
                  >
                    <Share2 className='w-4 h-4 text-white' />
                  </button>
                  <button
                    onClick={shareOnTelegram}
                    className='p-2 rounded-xl bg-blue-500/80 hover:bg-blue-500 transition-all'
                    title='Telegram'
                  >
                    <Share2 className='w-4 h-4 text-white' />
                  </button>
                </div>
              </div>

              {/* Right: Progress to next tier */}
              {dashboard.tier.next && (
                <div className='bg-white/10 rounded-2xl p-4 backdrop-blur-xl min-w-[200px]'>
                  <p className='text-white/70 text-xs mb-2'>
                    {t('referral.progressTo', 'Progresso para')} {dashboard.tier.next}
                  </p>
                  <div className='h-2 bg-white/20 rounded-full mb-2 overflow-hidden'>
                    <div
                      className='h-full bg-white rounded-full transition-all duration-500'
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  <p className='text-white text-sm'>
                    <span className='font-bold'>{dashboard.tier.progress.current_active}</span>{' '}
                    {t('referral.active', 'ativos')}
                    <span className='text-white/60'>
                      {' '}
                      /{' '}
                      {dashboard.tier.progress.current_active +
                        dashboard.tier.progress.needed_for_next}{' '}
                      {t('referral.needed', 'necessários')}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
          <StatCard
            icon={Users}
            label={t('referral.totalReferrals', 'Total Indicados')}
            value={dashboard.stats.total_referrals}
            color='purple'
          />
          <StatCard
            icon={CheckCircle}
            label={t('referral.activeReferrals', 'Ativos')}
            value={dashboard.stats.active_referrals}
            subValue={t('referral.last30days', 'Últimos 30 dias')}
            color='emerald'
          />
          <StatCard
            icon={DollarSign}
            label={t('referral.totalEarned', 'Total Ganho')}
            value={formatCurrency(dashboard.earnings.total)}
            color='amber'
          />
          <StatCard
            icon={TrendingUp}
            label={t('referral.pending', 'Pendente')}
            value={formatCurrency(dashboard.earnings.pending)}
            subValue={t('referral.awaitingPayment', 'Aguardando pagamento')}
            color='cyan'
          />
        </div>

        {/* Tabs */}
        <div className='rounded-3xl bg-white dark:bg-slate-800/50 shadow-lg dark:shadow-none backdrop-blur-xl border border-gray-200 dark:border-white/10 overflow-hidden'>
          {/* Tab Headers */}
          <div className='flex border-b border-gray-200 dark:border-white/10'>
            {[
              {
                id: 'referrals' as const,
                label: t('referral.myReferrals', 'Meus Indicados'),
                icon: Users,
              },
              {
                id: 'earnings' as const,
                label: t('referral.earnings', 'Ganhos'),
                icon: DollarSign,
              },
              { id: 'tiers' as const, label: t('referral.levels', 'Níveis'), icon: Crown },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-emerald-600 dark:text-white bg-emerald-50 dark:bg-white/5 border-b-2 border-emerald-500'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <tab.icon className='w-4 h-4' />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className='p-4 md:p-6'>
            {/* Referrals Tab */}
            {activeTab === 'referrals' && (
              <div>
                {dashboard.recent_referrals.length === 0 ? (
                  <div className='text-center py-12'>
                    <Users className='w-16 h-16 text-gray-400 dark:text-slate-600 mx-auto mb-4' />
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                      {t('referral.noReferrals', 'Nenhum indicado ainda')}
                    </h3>
                    <p className='text-gray-500 dark:text-slate-400 text-sm'>
                      {t('referral.shareToEarn', 'Compartilhe seu código e comece a ganhar!')}
                    </p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {dashboard.recent_referrals.map(ref => (
                      <div
                        key={ref.id}
                        className='flex items-center justify-between p-4 rounded-xl bg-gray-100 dark:bg-slate-700/30 hover:bg-gray-200 dark:hover:bg-slate-700/50 transition-all'
                      >
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center'>
                            <span className='text-gray-700 dark:text-white font-medium'>
                              {ref.referred_username.slice(-2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className='text-gray-900 dark:text-white font-medium'>
                              {ref.referred_username}
                            </p>
                            <p className='text-gray-500 dark:text-slate-400 text-xs'>
                              {formatDate(ref.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-4'>
                          <div className='text-right'>
                            <p className='text-gray-900 dark:text-white font-medium'>
                              {formatCurrency(ref.total_volume)}
                            </p>
                            <p className='text-emerald-600 dark:text-emerald-400 text-xs'>
                              +{formatCurrency(ref.total_commission)}
                            </p>
                          </div>
                          {getStatusBadge(ref.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Earnings Tab */}
            {activeTab === 'earnings' && (
              <div>
                {dashboard.earnings.recent.length === 0 ? (
                  <div className='text-center py-12'>
                    <DollarSign className='w-16 h-16 text-gray-400 dark:text-slate-600 mx-auto mb-4' />
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                      {t('referral.noEarnings', 'Nenhum ganho ainda')}
                    </h3>
                    <p className='text-gray-500 dark:text-slate-400 text-sm'>
                      {t(
                        'referral.earnWhenTransact',
                        'Quando seus indicados transacionarem, você ganhará comissões!'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {dashboard.earnings.recent.map(earning => (
                      <div
                        key={earning.id}
                        className='flex items-center justify-between p-4 rounded-xl bg-gray-100 dark:bg-slate-700/30 hover:bg-gray-200 dark:hover:bg-slate-700/50 transition-all'
                      >
                        <div className='flex items-center gap-3'>
                          <div className='w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center'>
                            <TrendingUp className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
                          </div>
                          <div>
                            <p className='text-gray-900 dark:text-white font-medium'>
                              {earning.transaction_type}
                            </p>
                            <p className='text-gray-500 dark:text-slate-400 text-xs'>
                              {formatDate(earning.created_at)} • {earning.commission_rate}%
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='text-emerald-600 dark:text-emerald-400 font-bold'>
                            +{formatCurrency(earning.commission_amount)}
                          </p>
                          <p className='text-gray-400 dark:text-slate-500 text-xs'>
                            {t('referral.of', 'de')} {formatCurrency(earning.transaction_amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tiers Tab */}
            {activeTab === 'tiers' && (
              <div>
                <div className='mb-6'>
                  <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>
                    {t('referral.tierSystem', 'Sistema de Níveis')}
                  </h3>
                  <p className='text-gray-500 dark:text-slate-400 text-sm'>
                    {t(
                      'referral.tierDescription',
                      'Quanto mais indicados ativos, maior sua comissão!'
                    )}
                  </p>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-6'>
                  {dashboard.program_tiers.map(tier => (
                    <TierCard
                      key={tier.name}
                      tier={tier}
                      isCurrentTier={tier.name === dashboard.tier.current}
                    />
                  ))}
                </div>

                <div className='p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30'>
                  <div className='flex items-start gap-3'>
                    <BarChart3 className='w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5' />
                    <div>
                      <p className='text-blue-700 dark:text-blue-300 font-medium'>
                        {t('referral.howItWorks', 'Como funciona?')}
                      </p>
                      <p className='text-blue-600 dark:text-blue-400/80 text-sm mt-1'>
                        {t(
                          'referral.activeExplanation',
                          'Um indicado é considerado "ativo" quando fez pelo menos uma transação nos últimos 30 dias. Continue engajando seus amigos para subir de nível!'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
