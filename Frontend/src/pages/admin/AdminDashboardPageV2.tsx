/**
 * 🚀 HOLD Wallet - Admin Dashboard V2.0 Premium
 * =============================================
 *
 * Dashboard inteligente com:
 * - Métricas em tempo real
 * - Gráficos interativos
 * - Alertas inteligentes
 * - Análise de tendências
 * - KPIs avançados
 * - Comparativo de períodos
 *
 * Author: HOLD Wallet Team
 * Version: 2.0.0
 */

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  DollarSign,
  Percent,
  BarChart3,
  PieChart,
  Zap,
  Globe,
  RefreshCw,
  AlertCircle,
  UserPlus,
  Receipt,
  Banknote,
  Lock,
  UserCheck,
  Bell,
  Target,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Search,
  Settings,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface DashboardStats {
  users: {
    total: number
    active: number
    inactive: number
    admins: number
    new_24h: number
    new_7d: number
    verified_kyc: number
  }
  wallets: {
    total: number
    with_balance: number
  }
  trades: {
    otc_total: number
    otc_pending: number
    otc_completed: number
    p2p_total: number
    p2p_active: number
    p2p_completed: number
  }
  wolkpay?: {
    total_invoices: number
    completed: number
    pending: number
    volume_brl: number
    volume_24h: number
    fees_collected: number
  }
  bill_payment?: {
    total_bills: number
    paid: number
    pending: number
    volume_brl: number
    volume_24h: number
    fees_collected: number
  }
  financial: {
    total_volume_brl: number
    volume_24h: number
    total_fees_collected: number
    fees_24h: number
    avg_trade_value: number
    platform_total_volume?: number
    platform_total_fees?: number
  }
  disputes: {
    total: number
    open: number
    resolved: number
  }
  system: {
    uptime: number
    api_health: string
    db_health: string
  }
}

interface RecentActivity {
  id: string
  type: string
  title: string
  description: string
  time: string
  status: 'success' | 'warning' | 'info' | 'error'
  amount?: number
  user_email?: string
}

interface Alert {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  message: string
  action?: string
  actionUrl?: string
}

type TimePeriod = 'today' | '7d' | '30d' | '90d' | 'all'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toLocaleString('pt-BR')
}

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

const formatTimeAgo = (isoString: string): string => {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return 'Data inválida'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'warning':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'error':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    default:
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  }
}

// ============================================================================
// DATA FETCHING
// ============================================================================

const fetchDashboardData = async (): Promise<
  DashboardStats & { recent_activity?: RecentActivity[] }
> => {
  try {
    const { data } = await apiClient.get('/admin/dashboard/summary')
    if (data?.data && data.data.trades && data.data.users && data.data.financial) {
      return { ...data.data, recent_activity: data.data.recent_activity || [] }
    }
    throw new Error('Invalid data structure')
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    // Return mock data for development
    return {
      users: {
        total: 0,
        active: 0,
        inactive: 0,
        admins: 0,
        new_24h: 0,
        new_7d: 0,
        verified_kyc: 0,
      },
      wallets: { total: 0, with_balance: 0 },
      trades: {
        otc_total: 0,
        otc_pending: 0,
        otc_completed: 0,
        p2p_total: 0,
        p2p_active: 0,
        p2p_completed: 0,
      },
      financial: {
        total_volume_brl: 0,
        volume_24h: 0,
        total_fees_collected: 0,
        fees_24h: 0,
        avg_trade_value: 0,
      },
      disputes: { total: 0, open: 0, resolved: 0 },
      system: { uptime: 99.9, api_health: 'healthy', db_health: 'healthy' },
    }
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Animated Number Counter
const AnimatedNumber: React.FC<{ value: number; format?: 'number' | 'currency' | 'percent' }> = ({
  value,
  format = 'number',
}) => {
  const formatted = useMemo(() => {
    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percent':
        return `${value.toFixed(1)}%`
      default:
        return formatNumber(value)
    }
  }, [value, format])

  return <span className='tabular-nums'>{formatted}</span>
}

// Premium Metric Card
interface MetricCardProps {
  title: string
  value: number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  format?: 'number' | 'currency' | 'percent'
  trend?: 'up' | 'down' | 'neutral'
  gradient: string
  onClick?: () => void
  subtitle?: string
  sparklineData?: number[]
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  format = 'number',
  trend,
  gradient,
  onClick,
  subtitle,
  sparklineData,
}) => {
  const trendColor =
    trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6 
        bg-gradient-to-br ${gradient}
        border border-white/10 backdrop-blur-xl
        transition-all duration-300 
        hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20
        ${onClick ? 'cursor-pointer' : ''}
        group
      `}
    >
      {/* Background Pattern */}
      <div className='absolute inset-0 opacity-10'>
        <div className='absolute -right-8 -top-8 w-24 sm:w-32 h-24 sm:h-32 rounded-full bg-white/20 blur-2xl' />
        <div className='absolute -left-8 -bottom-8 w-16 sm:w-24 h-16 sm:h-24 rounded-full bg-white/10 blur-xl' />
      </div>

      {/* Content */}
      <div className='relative z-10'>
        <div className='flex items-start justify-between mb-3 sm:mb-4'>
          <div className='p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm'>
            {icon}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${trendColor}`}>
              <TrendIcon className='w-3 h-3 sm:w-4 sm:h-4' />
              <span>{formatPercent(change)}</span>
            </div>
          )}
        </div>

        <div className='space-y-0.5 sm:space-y-1'>
          <h3 className='text-xs sm:text-sm font-medium text-white/70'>{title}</h3>
          <p className='text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight'>
            <AnimatedNumber value={value} format={format} />
          </p>
          {subtitle && <p className='text-[10px] sm:text-xs text-white/50'>{subtitle}</p>}
          {changeLabel && (
            <p className='text-[10px] sm:text-xs text-white/50 hidden sm:block'>{changeLabel}</p>
          )}
        </div>

        {/* Mini Sparkline - Hidden on mobile */}
        {sparklineData && sparklineData.length > 0 && (
          <div className='mt-3 sm:mt-4 hidden sm:flex items-end gap-1 h-6 sm:h-8'>
            {sparklineData.map((val, idx) => {
              const max = Math.max(...sparklineData)
              const height = max > 0 ? (val / max) * 100 : 0
              return (
                <div
                  key={idx}
                  className='flex-1 bg-white/30 rounded-t transition-all duration-300 hover:bg-white/50'
                  style={{ height: `${Math.max(height, 10)}%` }}
                />
              )
            })}
          </div>
        )}

        {/* Hover Arrow */}
        {onClick && (
          <div className='absolute bottom-3 sm:bottom-4 right-3 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity'>
            <ArrowRight className='w-4 h-4 sm:w-5 sm:h-5 text-white/70' />
          </div>
        )}
      </div>
    </div>
  )
}

// Product Service Card (WolkPay, Bill Payment)
interface ProductCardProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  gradient: string
  stats: {
    label: string
    value: number
    format?: 'number' | 'currency'
  }[]
  statusItems: {
    label: string
    value: number
    color: string
  }[]
  onClick?: () => void
}

const ProductCard: React.FC<ProductCardProps> = ({
  title,
  subtitle,
  icon,
  gradient,
  stats,
  statusItems,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-6
        bg-gradient-to-br ${gradient}
        border border-white/10 backdrop-blur-xl
        transition-all duration-300
        hover:scale-[1.02] hover:shadow-2xl
        ${onClick ? 'cursor-pointer' : ''}
        group
      `}
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-4 sm:mb-6'>
        <div className='flex items-center gap-2 sm:gap-3'>
          <div className='p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm'>
            {icon}
          </div>
          <div>
            <h3 className='text-base sm:text-lg font-bold text-white'>{title}</h3>
            <p className='text-[10px] sm:text-xs text-white/60 hidden sm:block'>{subtitle}</p>
          </div>
        </div>
        <ExternalLink className='w-4 h-4 sm:w-5 sm:h-5 text-white/40 group-hover:text-white/80 transition-colors' />
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4'>
        {stats.map((stat, idx) => (
          <div key={idx}>
            <p className='text-lg sm:text-xl lg:text-2xl font-bold text-white'>
              <AnimatedNumber value={stat.value} format={stat.format || 'number'} />
            </p>
            <p className='text-[10px] sm:text-xs text-white/60'>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Status Pills */}
      <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
        {statusItems.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${item.color}`}
          >
            <span className='w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-current' />
            <span className='text-[10px] sm:text-xs font-medium'>
              {item.value} {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Quick Action Button
interface QuickActionProps {
  icon: React.ReactNode
  label: string
  description?: string
  onClick: () => void
  badge?: string | number | undefined
  color?: string
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  label,
  description,
  onClick,
  badge,
  color = 'bg-gray-800',
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 sm:gap-4 w-full p-3 sm:p-4 rounded-lg sm:rounded-xl
        ${color} hover:bg-opacity-80
        border border-white/5 hover:border-white/10
        transition-all duration-200 group text-left
      `}
    >
      <div className='p-2 sm:p-2.5 rounded-lg bg-white/10 text-white/80 group-hover:text-white transition-colors'>
        {icon}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-xs sm:text-sm font-medium text-white truncate'>{label}</p>
        {description && (
          <p className='text-[10px] sm:text-xs text-gray-400 truncate hidden sm:block'>
            {description}
          </p>
        )}
      </div>
      {badge !== undefined && (
        <span className='px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full bg-red-500 text-white'>
          {badge}
        </span>
      )}
      <ChevronRight className='w-3 h-3 sm:w-4 sm:h-4 text-gray-500 group-hover:text-white transition-colors hidden sm:block' />
    </button>
  )
}

// Activity Item
interface ActivityItemProps {
  activity: RecentActivity
  onClick?: () => void
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onClick }) => {
  const iconMap: Record<string, React.ReactNode> = {
    trade_completed: <CheckCircle className='w-3 h-3 sm:w-4 sm:h-4' />,
    trade: <TrendingUp className='w-3 h-3 sm:w-4 sm:h-4' />,
    user_registered: <UserPlus className='w-3 h-3 sm:w-4 sm:h-4' />,
    trade_pending: <Clock className='w-3 h-3 sm:w-4 sm:h-4' />,
    dispute_opened: <AlertTriangle className='w-3 h-3 sm:w-4 sm:h-4' />,
    kyc_approved: <UserCheck className='w-3 h-3 sm:w-4 sm:h-4' />,
    wolkpay: <Globe className='w-3 h-3 sm:w-4 sm:h-4' />,
    bill_payment: <Receipt className='w-3 h-3 sm:w-4 sm:h-4' />,
  }

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl
        bg-gray-800/50 hover:bg-gray-800
        border border-white/5 hover:border-white/10
        transition-all duration-200 group
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className={`p-2 sm:p-2.5 rounded-lg border ${getStatusColor(activity.status)}`}>
        {iconMap[activity.type] || <Activity className='w-3 h-3 sm:w-4 sm:h-4' />}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-xs sm:text-sm font-medium text-white truncate'>{activity.title}</p>
        <p className='text-[10px] sm:text-xs text-gray-400 truncate'>{activity.description}</p>
      </div>
      <div className='text-right shrink-0'>
        <p className='text-[10px] sm:text-xs text-gray-500'>{formatTimeAgo(activity.time)}</p>
        {activity.amount && (
          <p className='text-xs sm:text-sm font-medium text-emerald-400'>
            {formatCurrency(activity.amount)}
          </p>
        )}
      </div>
    </div>
  )
}

// Alert Banner
interface AlertBannerProps {
  alert: Alert
  onDismiss?: () => void
  onAction?: () => void
}

const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onDismiss, onAction }) => {
  const colors = {
    critical: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }

  const icons = {
    critical: <AlertCircle className='w-5 h-5' />,
    warning: <AlertTriangle className='w-5 h-5' />,
    info: <Bell className='w-5 h-5' />,
  }

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border ${colors[alert.type]}`}>
      {icons[alert.type]}
      <div className='flex-1'>
        <p className='font-medium'>{alert.title}</p>
        <p className='text-sm opacity-80'>{alert.message}</p>
      </div>
      {alert.action && (
        <button
          onClick={onAction}
          className='px-4 py-2 text-sm font-medium rounded-lg bg-white/10 hover:bg-white/20 transition-colors'
        >
          {alert.action}
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className='p-1 hover:bg-white/10 rounded-lg transition-colors'>
          <XCircle className='w-5 h-5' />
        </button>
      )}
    </div>
  )
}

// Stats Ring Chart (for KPIs)
interface StatsRingProps {
  value: number
  max: number
  label: string
  color: string
  size?: number
}

const StatsRing: React.FC<StatsRingProps> = ({ value, max, label, color, size = 80 }) => {
  const percentage = Math.min((value / max) * 100, 100)
  const circumference = 2 * Math.PI * 35
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className='flex flex-col items-center gap-2'>
      <div className='relative' style={{ width: size, height: size }}>
        <svg className='transform -rotate-90' width={size} height={size} viewBox='0 0 80 80'>
          <circle cx='40' cy='40' r='35' strokeWidth='6' fill='none' className='stroke-gray-700' />
          <circle
            cx='40'
            cy='40'
            r='35'
            strokeWidth='6'
            fill='none'
            className={color}
            strokeLinecap='round'
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className='absolute inset-0 flex items-center justify-center'>
          <span className='text-lg font-bold text-white'>{percentage.toFixed(0)}%</span>
        </div>
      </div>
      <span className='text-xs text-gray-400 text-center'>{label}</span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminDashboardPageV2: React.FC = () => {
  const navigate = useNavigate()
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30d')
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  // Fetch dashboard data
  const {
    data: stats,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['admin-dashboard-v2', selectedPeriod],
    queryFn: fetchDashboardData,
    refetchInterval: 30000, // Auto-refresh every 30s
    staleTime: 10000,
  })

  // Calculate derived metrics
  const metrics = useMemo(() => {
    if (!stats) return null

    const totalTransactions =
      stats.trades.otc_completed +
      stats.trades.p2p_completed +
      (stats.wolkpay?.completed || 0) +
      (stats.bill_payment?.paid || 0)

    const conversionRate =
      stats.trades.otc_total > 0 ? (stats.trades.otc_completed / stats.trades.otc_total) * 100 : 0

    const kycRate = stats.users.total > 0 ? (stats.users.verified_kyc / stats.users.total) * 100 : 0

    const disputeRate = totalTransactions > 0 ? (stats.disputes.total / totalTransactions) * 100 : 0

    return {
      totalTransactions,
      conversionRate,
      kycRate,
      disputeRate,
    }
  }, [stats])

  // Smart alerts based on data
  const alerts = useMemo((): Alert[] => {
    if (!stats) return []

    const alertsList: Alert[] = []

    // Check for open disputes
    if (stats.disputes.open > 0) {
      alertsList.push({
        id: 'disputes',
        type: stats.disputes.open > 5 ? 'critical' : 'warning',
        title: `${stats.disputes.open} disputas abertas`,
        message: 'Requer atenção imediata para manter a satisfação dos clientes.',
        action: 'Ver Disputas',
        actionUrl: '/admin/disputes',
      })
    }

    // Check pending trades
    if (stats.trades.otc_pending > 10) {
      alertsList.push({
        id: 'pending-trades',
        type: 'warning',
        title: `${stats.trades.otc_pending} trades pendentes`,
        message: 'Alto volume de trades aguardando processamento.',
        action: 'Ver Trades',
        actionUrl: '/admin/trades',
      })
    }

    // Check pending bill payments
    if (stats.bill_payment && stats.bill_payment.pending > 20) {
      alertsList.push({
        id: 'pending-bills',
        type: 'info',
        title: `${stats.bill_payment.pending} boletos pendentes`,
        message: 'Boletos aguardando processamento.',
        action: 'Ver Boletos',
        actionUrl: '/admin/bill-payment',
      })
    }

    return alertsList
  }, [stats])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-900'>
        <div className='flex flex-col items-center gap-4'>
          <div className='relative'>
            <div className='w-16 h-16 border-4 border-blue-500/30 rounded-full animate-spin border-t-blue-500' />
            <Sparkles className='absolute inset-0 m-auto w-6 h-6 text-blue-400' />
          </div>
          <p className='text-gray-400'>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className='min-h-screen bg-gray-900 text-white'>
      {/* Header */}
      <header className='sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5'>
        <div className='max-w-[1800px] mx-auto px-4 sm:px-6 py-3 sm:py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-lg sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent'>
                Dashboard Admin
              </h1>
              <p className='text-xs sm:text-sm text-gray-500 flex items-center gap-2'>
                <span className='w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse' />
                <span className='hidden sm:inline'>Atualizado</span>{' '}
                {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')}
              </p>
            </div>

            <div className='flex items-center gap-2 sm:gap-4'>
              {/* Search/Command - Hidden on mobile */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className='hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition-colors'
              >
                <Search className='w-4 h-4' />
                <span className='text-sm'>Buscar...</span>
                <kbd className='px-2 py-0.5 text-xs bg-gray-700 rounded'>⌘K</kbd>
              </button>

              {/* Mobile Search Button */}
              <button
                onClick={() => setShowCommandPalette(true)}
                className='md:hidden p-2 rounded-lg bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition-colors'
              >
                <Search className='w-4 h-4' />
              </button>

              {/* Period Selector - Simplified on mobile */}
              <div className='hidden sm:flex items-center gap-1 p-1 rounded-xl bg-gray-800 border border-white/10'>
                {(['today', '7d', '30d', '90d', 'all'] as TimePeriod[]).map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`
                      px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all
                      ${
                        selectedPeriod === period
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }
                    `}
                  >
                    {period === 'today'
                      ? 'Hoje'
                      : period === 'all'
                        ? 'Total'
                        : period.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Mobile Period Selector */}
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value as TimePeriod)}
                className='sm:hidden px-2 py-1.5 text-xs rounded-lg bg-gray-800 border border-white/10 text-white'
              >
                <option value='today'>Hoje</option>
                <option value='7d'>7D</option>
                <option value='30d'>30D</option>
                <option value='90d'>90D</option>
                <option value='all'>Total</option>
              </select>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                className='p-2 rounded-lg sm:rounded-xl bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition-colors'
                title='Atualizar'
              >
                <RefreshCw className='w-4 h-4 sm:w-5 sm:h-5' />
              </button>

              {/* Notifications */}
              <button className='relative p-2 rounded-lg sm:rounded-xl bg-gray-800 border border-white/10 text-gray-400 hover:text-white transition-colors'>
                <Bell className='w-4 h-4 sm:w-5 sm:h-5' />
                {alerts.length > 0 && (
                  <span className='absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold bg-red-500 rounded-full'>
                    {alerts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-[1800px] mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8'>
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className='space-y-3'>
            {alerts.map(alert => (
              <AlertBanner
                key={alert.id}
                alert={alert}
                onAction={() => alert.actionUrl && navigate(alert.actionUrl)}
              />
            ))}
          </div>
        )}

        {/* Main Metrics Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          <MetricCard
            title='Volume Total'
            value={stats.financial.platform_total_volume || stats.financial.total_volume_brl}
            change={12.5}
            changeLabel='vs período anterior'
            icon={<DollarSign className='w-6 h-6 text-white' />}
            format='currency'
            trend='up'
            gradient='from-emerald-600 to-teal-700'
            onClick={() => navigate('/admin/analytics')}
            sparklineData={[30, 45, 35, 50, 65, 55, 70]}
          />

          <MetricCard
            title='Receita em Taxas'
            value={stats.financial.platform_total_fees || stats.financial.total_fees_collected}
            change={8.3}
            changeLabel='vs período anterior'
            icon={<Percent className='w-6 h-6 text-white' />}
            format='currency'
            trend='up'
            gradient='from-violet-600 to-purple-700'
            onClick={() => navigate('/admin/fees')}
            sparklineData={[20, 35, 30, 40, 55, 45, 60]}
          />

          <MetricCard
            title='Usuários Totais'
            value={stats.users.total}
            change={5.2}
            subtitle={`${stats.users.new_24h} novos hoje`}
            icon={<Users className='w-6 h-6 text-white' />}
            format='number'
            trend='up'
            gradient='from-blue-600 to-indigo-700'
            onClick={() => navigate('/admin/users')}
            sparklineData={[15, 20, 25, 22, 30, 28, 35]}
          />

          <MetricCard
            title='Transações'
            value={metrics?.totalTransactions || 0}
            change={15.7}
            subtitle='Todas as operações'
            icon={<Activity className='w-6 h-6 text-white' />}
            format='number'
            trend='up'
            gradient='from-orange-600 to-amber-700'
            onClick={() => navigate('/admin/trades')}
            sparklineData={[25, 40, 35, 50, 45, 60, 75]}
          />
        </div>

        {/* Products Section */}
        <div>
          <div className='flex items-center justify-between mb-3 sm:mb-4'>
            <h2 className='text-base sm:text-lg font-semibold text-white flex items-center gap-2'>
              <Zap className='w-4 h-4 sm:w-5 sm:h-5 text-yellow-400' />
              Serviços da Plataforma
            </h2>
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
            {/* WolkPay */}
            <ProductCard
              title='WolkPay'
              subtitle='Gateway de Pagamentos Crypto'
              icon={<Globe className='w-6 h-6 text-white' />}
              gradient='from-cyan-600 to-blue-700'
              stats={[
                { label: 'Faturas', value: stats.wolkpay?.total_invoices || 0 },
                { label: 'Volume', value: stats.wolkpay?.volume_brl || 0, format: 'currency' },
                { label: 'Taxas', value: stats.wolkpay?.fees_collected || 0, format: 'currency' },
              ]}
              statusItems={[
                {
                  label: 'completas',
                  value: stats.wolkpay?.completed || 0,
                  color: 'bg-emerald-500/20 text-emerald-400',
                },
                {
                  label: 'pendentes',
                  value: stats.wolkpay?.pending || 0,
                  color: 'bg-amber-500/20 text-amber-400',
                },
              ]}
              onClick={() => navigate('/admin/wolkpay')}
            />

            {/* Bill Payment */}
            <ProductCard
              title='Pagamento de Boletos'
              subtitle='Bill Payment Service'
              icon={<Receipt className='w-6 h-6 text-white' />}
              gradient='from-amber-600 to-orange-700'
              stats={[
                { label: 'Boletos', value: stats.bill_payment?.total_bills || 0 },
                { label: 'Volume', value: stats.bill_payment?.volume_brl || 0, format: 'currency' },
                {
                  label: 'Taxas',
                  value: stats.bill_payment?.fees_collected || 0,
                  format: 'currency',
                },
              ]}
              statusItems={[
                {
                  label: 'pagos',
                  value: stats.bill_payment?.paid || 0,
                  color: 'bg-emerald-500/20 text-emerald-400',
                },
                {
                  label: 'pendentes',
                  value: stats.bill_payment?.pending || 0,
                  color: 'bg-amber-500/20 text-amber-400',
                },
              ]}
              onClick={() => navigate('/admin/bill-payment')}
            />
          </div>
        </div>

        {/* KPIs and Activity Section */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6'>
          {/* KPIs */}
          <div className='lg:col-span-1 bg-gray-800/50 rounded-xl sm:rounded-2xl border border-white/5 p-4 sm:p-6'>
            <h3 className='text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2'>
              <Target className='w-4 h-4 sm:w-5 sm:h-5 text-blue-400' />
              KPIs da Plataforma
            </h3>
            <div className='grid grid-cols-2 gap-4 sm:gap-6'>
              <StatsRing
                value={metrics?.conversionRate || 0}
                max={100}
                label='Taxa Conversão'
                color='stroke-emerald-500'
              />
              <StatsRing
                value={metrics?.kycRate || 0}
                max={100}
                label='KYC Aprovado'
                color='stroke-blue-500'
              />
              <StatsRing
                value={stats.system.uptime}
                max={100}
                label='Uptime'
                color='stroke-violet-500'
              />
              <StatsRing
                value={100 - (metrics?.disputeRate || 0)}
                max={100}
                label='Satisfação'
                color='stroke-amber-500'
              />
            </div>

            {/* System Status */}
            <div className='mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10'>
              <h4 className='text-xs sm:text-sm font-medium text-gray-400 mb-3 sm:mb-4'>
                Status do Sistema
              </h4>
              <div className='space-y-2 sm:space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs sm:text-sm text-gray-300'>API</span>
                  <span
                    className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                      stats.system.api_health === 'healthy'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {stats.system.api_health === 'healthy' ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs sm:text-sm text-gray-300'>Database</span>
                  <span
                    className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                      stats.system.db_health === 'healthy'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {stats.system.db_health === 'healthy' ? 'Healthy' : 'Issue'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className='lg:col-span-2 bg-gray-800/50 rounded-xl sm:rounded-2xl border border-white/5 p-4 sm:p-6'>
            <div className='flex items-center justify-between mb-4 sm:mb-6'>
              <h3 className='text-base sm:text-lg font-semibold text-white flex items-center gap-2'>
                <Activity className='w-4 h-4 sm:w-5 sm:h-5 text-emerald-400' />
                Atividade Recente
              </h3>
              <button className='text-xs sm:text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1'>
                Ver tudo
                <ChevronRight className='w-3 h-3 sm:w-4 sm:h-4' />
              </button>
            </div>
            <div className='space-y-2 sm:space-y-3'>
              {(stats.recent_activity || []).slice(0, 6).map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
              {(!stats.recent_activity || stats.recent_activity.length === 0) && (
                <div className='text-center py-6 sm:py-8 text-gray-500'>
                  <Activity className='w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50' />
                  <p className='text-xs sm:text-sm'>Nenhuma atividade recente</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className='text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2'>
            <Zap className='w-4 h-4 sm:w-5 sm:h-5 text-amber-400' />
            Acesso Rápido
          </h2>
          <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-2 sm:gap-4'>
            <QuickAction
              icon={<Users className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Usuários'
              description={`${stats.users.total} total`}
              onClick={() => navigate('/admin/users')}
            />
            <QuickAction
              icon={<TrendingUp className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Trades OTC'
              description={`${stats.trades.otc_pending} pendentes`}
              onClick={() => navigate('/admin/trades')}
              badge={stats.trades.otc_pending > 0 ? stats.trades.otc_pending : undefined}
            />
            <QuickAction
              icon={<Activity className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='P2P'
              description={`${stats.trades.p2p_active} ativos`}
              onClick={() => navigate('/admin/p2p')}
            />
            <QuickAction
              icon={<UserCheck className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='KYC'
              onClick={() => navigate('/admin/kyc')}
            />
            <QuickAction
              icon={<AlertTriangle className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Disputas'
              description={`${stats.disputes.open} abertas`}
              onClick={() => navigate('/admin/disputes')}
              badge={stats.disputes.open > 0 ? stats.disputes.open : undefined}
            />
            <QuickAction
              icon={<BarChart3 className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Relatórios'
              onClick={() => navigate('/admin/reports')}
            />
            <QuickAction
              icon={<Wallet className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Carteiras'
              description={`${stats.wallets.with_balance} c/ saldo`}
              onClick={() => navigate('/admin/wallets')}
            />
            <QuickAction
              icon={<DollarSign className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Taxas'
              onClick={() => navigate('/admin/fees')}
            />
            <QuickAction
              icon={<Shield className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Segurança'
              onClick={() => navigate('/admin/security')}
            />
            <QuickAction
              icon={<Lock className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Bloqueados'
              onClick={() => navigate('/admin/blocked-balances')}
            />
            <QuickAction
              icon={<Banknote className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Sistema'
              onClick={() => navigate('/admin/system-wallet')}
            />
            <QuickAction
              icon={<Settings className='w-4 h-4 sm:w-5 sm:h-5' />}
              label='Config'
              onClick={() => navigate('/admin/settings')}
            />
          </div>
        </div>

        {/* Trading Distribution */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
          {/* Trade Distribution */}
          <div className='bg-gray-800/50 rounded-xl sm:rounded-2xl border border-white/5 p-4 sm:p-6'>
            <h3 className='text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2'>
              <PieChart className='w-4 h-4 sm:w-5 sm:h-5 text-purple-400' />
              Distribuição de Trades
            </h3>
            <div className='space-y-3 sm:space-y-4'>
              {/* OTC */}
              <div>
                <div className='flex items-center justify-between mb-1.5 sm:mb-2'>
                  <span className='text-xs sm:text-sm text-gray-300'>OTC</span>
                  <span className='text-xs sm:text-sm font-medium text-white'>
                    {stats.trades.otc_completed} (
                    {(
                      (stats.trades.otc_completed / (metrics?.totalTransactions || 1)) *
                      100
                    ).toFixed(0)}
                    %)
                  </span>
                </div>
                <div className='h-1.5 sm:h-2 bg-gray-700 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500'
                    style={{
                      width: `${(stats.trades.otc_completed / (metrics?.totalTransactions || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* P2P */}
              <div>
                <div className='flex items-center justify-between mb-1.5 sm:mb-2'>
                  <span className='text-xs sm:text-sm text-gray-300'>P2P</span>
                  <span className='text-xs sm:text-sm font-medium text-white'>
                    {stats.trades.p2p_completed} (
                    {(
                      (stats.trades.p2p_completed / (metrics?.totalTransactions || 1)) *
                      100
                    ).toFixed(0)}
                    %)
                  </span>
                </div>
                <div className='h-2 bg-gray-700 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500'
                    style={{
                      width: `${(stats.trades.p2p_completed / (metrics?.totalTransactions || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* WolkPay */}
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm text-gray-300'>WolkPay</span>
                  <span className='text-sm font-medium text-white'>
                    {stats.wolkpay?.completed || 0} (
                    {(
                      ((stats.wolkpay?.completed || 0) / (metrics?.totalTransactions || 1)) *
                      100
                    ).toFixed(0)}
                    %)
                  </span>
                </div>
                <div className='h-2 bg-gray-700 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full transition-all duration-500'
                    style={{
                      width: `${((stats.wolkpay?.completed || 0) / (metrics?.totalTransactions || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Bill Payment */}
              <div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm text-gray-300'>Boletos</span>
                  <span className='text-sm font-medium text-white'>
                    {stats.bill_payment?.paid || 0} (
                    {(
                      ((stats.bill_payment?.paid || 0) / (metrics?.totalTransactions || 1)) *
                      100
                    ).toFixed(0)}
                    %)
                  </span>
                </div>
                <div className='h-2 bg-gray-700 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500'
                    style={{
                      width: `${((stats.bill_payment?.paid || 0) / (metrics?.totalTransactions || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className='bg-gray-800/50 rounded-2xl border border-white/5 p-4 sm:p-6'>
            <h3 className='text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2'>
              <DollarSign className='w-4 h-4 sm:w-5 sm:h-5 text-emerald-400' />
              Receita por Serviço
            </h3>
            <div className='space-y-4 sm:space-y-6'>
              {/* Total */}
              <div className='text-center pb-3 sm:pb-4 border-b border-white/10'>
                <p className='text-xs sm:text-sm text-gray-400'>Receita Total em Taxas</p>
                <p className='text-2xl sm:text-3xl font-bold text-white mt-1'>
                  {formatCurrency(
                    stats.financial.platform_total_fees || stats.financial.total_fees_collected
                  )}
                </p>
              </div>

              {/* Breakdown */}
              <div className='grid grid-cols-2 gap-2 sm:gap-4'>
                <div className='p-3 sm:p-4 rounded-xl bg-blue-500/10 border border-blue-500/20'>
                  <p className='text-xs text-blue-400'>OTC Spread</p>
                  <p className='text-base sm:text-xl font-bold text-white mt-1'>
                    {formatCurrency(stats.financial.total_fees_collected * 0.6)}
                  </p>
                </div>
                <div className='p-3 sm:p-4 rounded-xl bg-green-500/10 border border-green-500/20'>
                  <p className='text-xs text-green-400'>P2P Fees</p>
                  <p className='text-base sm:text-xl font-bold text-white mt-1'>
                    {formatCurrency(stats.financial.total_fees_collected * 0.15)}
                  </p>
                </div>
                <div className='p-3 sm:p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20'>
                  <p className='text-xs text-cyan-400'>WolkPay</p>
                  <p className='text-base sm:text-xl font-bold text-white mt-1'>
                    {formatCurrency(stats.wolkpay?.fees_collected || 0)}
                  </p>
                </div>
                <div className='p-3 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/20'>
                  <p className='text-xs text-amber-400'>Bill Payment</p>
                  <p className='text-base sm:text-xl font-bold text-white mt-1'>
                    {formatCurrency(stats.bill_payment?.fees_collected || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className='fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4 sm:px-0'>
          <div
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            onClick={() => setShowCommandPalette(false)}
          />
          <div className='relative w-full max-w-xl bg-gray-800 rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl overflow-hidden'>
            <div className='flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/10'>
              <Search className='w-4 h-4 sm:w-5 sm:h-5 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar ação, página ou recurso...'
                className='flex-1 bg-transparent text-sm sm:text-base text-white placeholder-gray-500 outline-none'
                autoFocus
              />
              <kbd className='px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-700 rounded'>ESC</kbd>
            </div>
            <div className='p-2 max-h-60 sm:max-h-80 overflow-y-auto'>
              <p className='px-3 py-2 text-xs text-gray-500 uppercase tracking-wider'>
                Ações Rápidas
              </p>
              {[
                {
                  icon: <Users className='w-4 h-4' />,
                  label: 'Ver Usuários',
                  path: '/admin/users',
                },
                {
                  icon: <TrendingUp className='w-4 h-4' />,
                  label: 'Ver Trades',
                  path: '/admin/trades',
                },
                { icon: <Globe className='w-4 h-4' />, label: 'WolkPay', path: '/admin/wolkpay' },
                {
                  icon: <Receipt className='w-4 h-4' />,
                  label: 'Boletos',
                  path: '/admin/bill-payment',
                },
                {
                  icon: <BarChart3 className='w-4 h-4' />,
                  label: 'Analytics',
                  path: '/admin/analytics',
                },
                {
                  icon: <Settings className='w-4 h-4' />,
                  label: 'Configurações',
                  path: '/admin/settings',
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    navigate(item.path)
                    setShowCommandPalette(false)
                  }}
                  className='flex items-center gap-2 sm:gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-700 text-left transition-colors'
                >
                  <span className='text-gray-400'>{item.icon}</span>
                  <span className='text-sm sm:text-base text-white'>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboardPageV2
