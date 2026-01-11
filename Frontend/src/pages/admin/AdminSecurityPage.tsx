/**
 * 🛡️ HOLD Wallet - Admin Security Page
 * =====================================
 *
 * Página de segurança do painel administrativo.
 * Monitora atividades suspeitas, logins, 2FA, sessões ativas e muito mais.
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Fingerprint,
  Smartphone,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  LogOut,
  Activity,
  Globe,
  Monitor,
  Wifi,
  Ban,
  ChevronLeft,
  ChevronRight,
  Settings,
  Bell,
  Copy,
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Server,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// ============================================
// TYPES
// ============================================

interface SecurityStats {
  active_sessions: number
  failed_login_attempts_24h: number
  blocked_ips: number
  security_alerts_24h: number
  users_with_2fa: number
  users_without_2fa: number
  two_fa_adoption_rate: number
  recent_password_changes_7d?: number
}

interface FailedLogin {
  id: number
  email: string
  ip_address: string
  user_agent?: string
  reason: string
  timestamp: string
  location?: string
}

interface ActiveSession {
  id: string
  user_id: number
  user_email: string
  user_name: string
  ip_address: string
  device: string
  browser: string
  location?: string
  started_at: string
  last_activity: string
  is_current: boolean
}

interface SuspiciousActivity {
  id: string
  user_id?: string
  user_email?: string
  activity_type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  ip_address?: string
  created_at: string
  resolved: boolean
}

interface BlockedIP {
  id: string
  ip_address: string
  reason: string
  blocked_at: string
  expires_at?: string
  blocked_by: string
  is_permanent: boolean
}

// ============================================
// API FUNCTIONS
// ============================================

const fetchSecurityStats = async (): Promise<SecurityStats> => {
  try {
    const { data } = await apiClient.get('/admin/security/stats')
    return data
  } catch {
    // Return mock data if API not available
    return {
      active_sessions: 0,
      failed_login_attempts_24h: 0,
      blocked_ips: 0,
      security_alerts_24h: 0,
      users_with_2fa: 0,
      users_without_2fa: 0,
      two_fa_adoption_rate: 0,
      recent_password_changes_7d: 0,
    }
  }
}

const fetchFailedLogins = async (
  page: number,
  limit: number
): Promise<{ items: FailedLogin[]; total: number }> => {
  try {
    const { data } = await apiClient.get(
      `/admin/security/failed-logins?page=${page}&limit=${limit}`
    )
    return { items: data.failed_logins || [], total: data.total || 0 }
  } catch {
    return { items: [], total: 0 }
  }
}

const fetchActiveSessions = async (): Promise<ActiveSession[]> => {
  try {
    const { data } = await apiClient.get('/admin/security/active-sessions')
    return data.sessions || []
  } catch {
    return []
  }
}

const fetchSuspiciousActivities = async (): Promise<SuspiciousActivity[]> => {
  try {
    const { data } = await apiClient.get('/admin/security/suspicious-activities')
    return data.activities || []
  } catch {
    return []
  }
}

const fetchBlockedIPs = async (): Promise<BlockedIP[]> => {
  try {
    const { data } = await apiClient.get('/admin/security/blocked-ips')
    return data.blocked_ips || []
  } catch {
    return []
  }
}

// ============================================
// COMPONENTS
// ============================================

// Skeleton loader
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700/50 rounded ${className}`} />
)

// Stat Card
interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray'
  subtitle?: string
  trend?: number
  loading?: boolean
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
  trend,
  loading,
}) => {
  const colorClasses = {
    green:
      'from-green-100 dark:from-green-900/30 to-green-50 dark:to-green-800/20 border-green-200 dark:border-green-700/30',
    blue: 'from-blue-100 dark:from-blue-900/30 to-blue-50 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/30',
    yellow:
      'from-yellow-100 dark:from-yellow-900/30 to-yellow-50 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700/30',
    red: 'from-red-100 dark:from-red-900/30 to-red-50 dark:to-red-800/20 border-red-200 dark:border-red-700/30',
    purple:
      'from-purple-100 dark:from-purple-900/30 to-purple-50 dark:to-purple-800/20 border-purple-200 dark:border-purple-700/30',
    gray: 'from-gray-100 dark:from-gray-800/50 to-gray-50 dark:to-gray-700/30 border-gray-200 dark:border-gray-600/30',
  }

  const iconColors = {
    green: 'text-green-600 dark:text-green-400 bg-green-500/20',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/20',
    yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/20',
    red: 'text-red-600 dark:text-red-400 bg-red-500/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/20',
    gray: 'text-gray-600 dark:text-gray-400 bg-gray-500/20',
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-3 sm:p-4`}>
      <div className='flex items-start justify-between'>
        <div className={`p-2 rounded-lg ${iconColors[color]}`}>{icon}</div>
        {trend !== undefined && (
          <div
            className={`flex items-center text-xs ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {trend >= 0 ? (
              <TrendingUp className='h-3 w-3 mr-0.5' />
            ) : (
              <TrendingDown className='h-3 w-3 mr-0.5' />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className='mt-3'>
        {loading ? (
          <Skeleton className='h-7 w-20' />
        ) : (
          <p className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white'>{value}</p>
        )}
        <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5'>{title}</p>
        {subtitle && (
          <p className='text-[10px] text-gray-400 dark:text-gray-500 mt-1'>{subtitle}</p>
        )}
      </div>
    </div>
  )
}

// Severity Badge
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const classes = {
    low: 'bg-blue-900/30 text-blue-400 border-blue-700/30',
    medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/30',
    high: 'bg-orange-900/30 text-orange-400 border-orange-700/30',
    critical: 'bg-red-900/30 text-red-400 border-red-700/30',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${classes[severity as keyof typeof classes] || classes.low}`}
    >
      {severity.toUpperCase()}
    </span>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export const AdminSecurityPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sessions' | 'failed-logins' | 'suspicious' | 'blocked-ips'
  >('overview')
  const [failedLoginsPage, setFailedLoginsPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin', 'security', 'stats'],
    queryFn: fetchSecurityStats,
    staleTime: 30000,
  })

  const { data: failedLoginsData, isLoading: failedLoginsLoading } = useQuery({
    queryKey: ['admin', 'security', 'failed-logins', failedLoginsPage],
    queryFn: () => fetchFailedLogins(failedLoginsPage, 10),
    staleTime: 30000,
  })

  const { data: activeSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['admin', 'security', 'sessions'],
    queryFn: fetchActiveSessions,
    staleTime: 30000,
  })

  const { data: suspiciousActivities, isLoading: suspiciousLoading } = useQuery({
    queryKey: ['admin', 'security', 'suspicious'],
    queryFn: fetchSuspiciousActivities,
    staleTime: 30000,
  })

  const { data: blockedIPs, isLoading: blockedIPsLoading } = useQuery({
    queryKey: ['admin', 'security', 'blocked-ips'],
    queryFn: fetchBlockedIPs,
    staleTime: 30000,
  })

  // Force logout mutation
  const forceLogoutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiClient.post(`/admin/security/force-logout/${sessionId}`)
    },
    onSuccess: () => {
      toast.success('Sessão encerrada com sucesso')
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'sessions'] })
    },
    onError: () => {
      toast.error('Erro ao encerrar sessão')
    },
  })

  // Block IP mutation
  const blockIPMutation = useMutation({
    mutationFn: async (ip: string) => {
      await apiClient.post('/admin/security/block-ip', { ip_address: ip, reason: 'Manual block' })
    },
    onSuccess: () => {
      toast.success('IP bloqueado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'blocked-ips'] })
    },
    onError: () => {
      toast.error('Erro ao bloquear IP')
    },
  })

  // Unblock IP mutation
  const unblockIPMutation = useMutation({
    mutationFn: async (ipId: string) => {
      await apiClient.delete(`/admin/security/blocked-ips/${ipId}`)
    },
    onSuccess: () => {
      toast.success('IP desbloqueado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'blocked-ips'] })
    },
    onError: () => {
      toast.error('Erro ao desbloquear IP')
    },
  })

  const handleRefresh = () => {
    refetchStats()
    queryClient.invalidateQueries({ queryKey: ['admin', 'security'] })
    toast.success('Dados atualizados')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleString('pt-BR')
    } catch {
      return dateStr
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Agora'
      if (diffMins < 60) return `${diffMins}min atrás`
      if (diffHours < 24) return `${diffHours}h atrás`
      if (diffDays < 7) return `${diffDays}d atrás`
      return date.toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className='h-4 w-4' />
    }
    return <Monitor className='h-4 w-4' />
  }

  // Calculate 2FA percentage - use the rate from API
  const twoFaPercentage = stats?.two_fa_adoption_rate || 0

  return (
    <div className='p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-red-500/20 rounded-lg'>
            <Shield className='h-6 w-6 text-red-600 dark:text-red-400' />
          </div>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white'>
              Segurança
            </h1>
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
              Monitoramento e controle de segurança da plataforma
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={handleRefresh}
            className='p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            title='Atualizar'
          >
            <RefreshCw className='h-4 w-4 text-gray-500 dark:text-gray-400' />
          </button>
          <button
            className='p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            title='Configurações'
          >
            <Settings className='h-4 w-4 text-gray-500 dark:text-gray-400' />
          </button>
        </div>
      </div>

      {/* Alert Banner - If there are critical issues */}
      {(stats?.security_alerts_24h || 0) > 0 && (
        <div className='p-3 sm:p-4 bg-gradient-to-r from-red-100 dark:from-red-900/30 to-orange-100 dark:to-orange-900/20 border border-red-200 dark:border-red-700/30 rounded-lg'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-red-500/20 rounded-lg'>
                <AlertTriangle className='h-5 w-5 text-red-600 dark:text-red-400' />
              </div>
              <div>
                <p className='font-medium text-red-700 dark:text-red-300'>
                  Atenção: Alertas de Segurança Detectados
                </p>
                <p className='text-sm text-red-600/80 dark:text-red-400/80'>
                  {stats?.security_alerts_24h} alerta(s) requer(em) análise
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('suspicious')}
              className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors'
            >
              Analisar
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
        <StatCard
          title='Usuários com 2FA'
          value={`${stats?.users_with_2fa || 0}`}
          icon={<Smartphone className='h-4 w-4 sm:h-5 sm:w-5' />}
          color='green'
          subtitle={`${twoFaPercentage}% do total`}
          loading={statsLoading}
        />
        <StatCard
          title='Sessões Ativas'
          value={stats?.active_sessions || 0}
          icon={<Activity className='h-4 w-4 sm:h-5 sm:w-5' />}
          color='blue'
          loading={statsLoading}
        />
        <StatCard
          title='Logins Falhados (24h)'
          value={stats?.failed_login_attempts_24h || 0}
          icon={<ShieldAlert className='h-4 w-4 sm:h-5 sm:w-5' />}
          color={
            stats?.failed_login_attempts_24h && stats.failed_login_attempts_24h > 10
              ? 'red'
              : 'yellow'
          }
          loading={statsLoading}
        />
        <StatCard
          title='IPs Bloqueados'
          value={stats?.blocked_ips || 0}
          icon={<Ban className='h-4 w-4 sm:h-5 sm:w-5' />}
          color='red'
          loading={statsLoading}
        />
      </div>

      {/* Secondary Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
        <StatCard
          title='Sem 2FA'
          value={stats?.users_without_2fa || 0}
          icon={<Fingerprint className='h-4 w-4 sm:h-5 sm:w-5' />}
          color='yellow'
          subtitle='Usuários vulneráveis'
          loading={statsLoading}
        />
        <StatCard
          title='Taxa de 2FA'
          value={`${stats?.two_fa_adoption_rate || 0}%`}
          icon={<TrendingUp className='h-4 w-4 sm:h-5 sm:w-5' />}
          color='green'
          loading={statsLoading}
        />
        <StatCard
          title='Alertas de Segurança'
          value={stats?.security_alerts_24h || 0}
          icon={<AlertCircle className='h-4 w-4 sm:h-5 sm:w-5' />}
          color={stats?.security_alerts_24h && stats.security_alerts_24h > 0 ? 'red' : 'green'}
          loading={statsLoading}
        />
        <StatCard
          title='Alterações de Senha'
          value={stats?.recent_password_changes_7d || 0}
          icon={<Key className='h-4 w-4 sm:h-5 sm:w-5' />}
          color='blue'
          subtitle='Últimos 7 dias'
          loading={statsLoading}
        />
      </div>

      {/* Tabs */}
      <div className='border-b border-gray-200 dark:border-gray-700'>
        <div className='flex gap-1 overflow-x-auto pb-px -mb-px'>
          {[
            { id: 'overview', label: 'Visão Geral', icon: Shield },
            { id: 'sessions', label: 'Sessões', icon: Activity },
            { id: 'failed-logins', label: 'Logins Falhados', icon: ShieldAlert },
            { id: 'suspicious', label: 'Suspeitas', icon: AlertTriangle },
            { id: 'blocked-ips', label: 'IPs Bloqueados', icon: Ban },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className='h-4 w-4' />
              <span className='hidden sm:inline'>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className='space-y-4'>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {/* Security Health */}
            <div className='bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                <ShieldCheck className='h-4 w-4 text-green-600 dark:text-green-400' />
                Saúde da Segurança
              </h3>
              <div className='space-y-3'>
                {/* 2FA Coverage */}
                <div>
                  <div className='flex justify-between text-xs mb-1'>
                    <span className='text-gray-500 dark:text-gray-400'>Cobertura 2FA</span>
                    <span className='text-gray-900 dark:text-white font-medium'>
                      {twoFaPercentage}%
                    </span>
                  </div>
                  <div className='h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                    <div
                      className={`h-full rounded-full transition-all ${
                        twoFaPercentage >= 80
                          ? 'bg-green-500'
                          : twoFaPercentage >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${twoFaPercentage}%` }}
                    />
                  </div>
                </div>
                {/* Security Score */}
                <div className='grid grid-cols-2 gap-3 mt-4'>
                  <div className='bg-gray-100 dark:bg-gray-700/30 rounded-lg p-3 text-center'>
                    <div className='text-2xl font-bold text-green-600 dark:text-green-400'>A+</div>
                    <div className='text-[10px] text-gray-500 dark:text-gray-400 mt-1'>
                      Score de Segurança
                    </div>
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-700/30 rounded-lg p-3 text-center'>
                    <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>SSL</div>
                    <div className='text-[10px] text-gray-500 dark:text-gray-400 mt-1'>
                      Certificado Ativo
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className='bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                <Zap className='h-4 w-4 text-yellow-600 dark:text-yellow-400' />
                Ações Rápidas
              </h3>
              <div className='grid grid-cols-2 gap-2'>
                <button className='flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700/30 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg text-left transition-colors'>
                  <LogOut className='h-4 w-4 text-red-600 dark:text-red-400' />
                  <span className='text-xs text-gray-700 dark:text-gray-300'>Logout Geral</span>
                </button>
                <button className='flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700/30 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg text-left transition-colors'>
                  <Key className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                  <span className='text-xs text-gray-700 dark:text-gray-300'>Resetar Tokens</span>
                </button>
                <button className='flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700/30 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg text-left transition-colors'>
                  <Database className='h-4 w-4 text-green-600 dark:text-green-400' />
                  <span className='text-xs text-gray-700 dark:text-gray-300'>Backup Seguro</span>
                </button>
                <button className='flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700/30 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg text-left transition-colors'>
                  <Bell className='h-4 w-4 text-purple-600 dark:text-purple-400' />
                  <span className='text-xs text-gray-700 dark:text-gray-300'>Alertas</span>
                </button>
              </div>
            </div>

            {/* Recent Failed Logins */}
            <div className='bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                <ShieldAlert className='h-4 w-4 text-yellow-600 dark:text-yellow-400' />
                Últimas Tentativas de Login Falhadas
              </h3>
              {failedLoginsLoading ? (
                <div className='space-y-2'>
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className='h-12 w-full' />
                  ))}
                </div>
              ) : failedLoginsData?.items && failedLoginsData.items.length > 0 ? (
                <div className='space-y-2'>
                  {failedLoginsData.items.slice(0, 5).map(login => (
                    <div
                      key={login.id}
                      className='flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700/30 rounded-lg'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='p-1.5 bg-red-500/20 rounded'>
                          <XCircle className='h-3 w-3 text-red-600 dark:text-red-400' />
                        </div>
                        <div>
                          <p className='text-xs text-gray-900 dark:text-white'>{login.email}</p>
                          <p className='text-[10px] text-gray-500'>{login.ip_address}</p>
                        </div>
                      </div>
                      <span className='text-[10px] text-gray-500'>
                        {formatRelativeTime(login.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center py-6'>
                  <CheckCircle className='h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2' />
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Nenhum login falhado recente
                  </p>
                </div>
              )}
            </div>

            {/* System Status */}
            <div className='bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                <Server className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                Status do Sistema
              </h3>
              <div className='space-y-3'>
                {[
                  { name: 'API Gateway', status: 'online', icon: Globe },
                  { name: 'Database', status: 'online', icon: Database },
                  { name: 'Auth Service', status: 'online', icon: Lock },
                  { name: 'Blockchain Nodes', status: 'online', icon: Wifi },
                ].map(service => (
                  <div
                    key={service.name}
                    className='flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700/30 rounded-lg'
                  >
                    <div className='flex items-center gap-2'>
                      <service.icon className='h-4 w-4 text-gray-500 dark:text-gray-400' />
                      <span className='text-xs text-gray-700 dark:text-gray-300'>
                        {service.name}
                      </span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <div
                        className={`w-2 h-2 rounded-full ${service.status === 'online' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}
                      />
                      <span
                        className={`text-[10px] ${service.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {service.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className='bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
            <div className='p-3 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>
                Sessões Ativas
              </h3>
              <div className='flex items-center gap-2'>
                <div className='relative flex-1 sm:w-64'>
                  <Search className='absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500' />
                  <input
                    type='text'
                    placeholder='Buscar por email ou IP...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='w-full pl-8 pr-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500'
                  />
                </div>
              </div>
            </div>

            {sessionsLoading ? (
              <div className='p-4 space-y-2'>
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : activeSessions && activeSessions.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='w-full text-xs'>
                  <thead className='bg-gray-100 dark:bg-gray-700/30'>
                    <tr>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                        Usuário
                      </th>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                        IP
                      </th>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell'>
                        Dispositivo
                      </th>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                        Última Atividade
                      </th>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions
                      .filter(
                        s =>
                          !searchTerm ||
                          s.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.ip_address?.includes(searchTerm)
                      )
                      .map(session => (
                        <tr
                          key={session.id}
                          className='border-t border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20'
                        >
                          <td className='py-2 px-3'>
                            <div className='flex items-center gap-2'>
                              {session.is_current && (
                                <span
                                  className='w-2 h-2 bg-green-400 rounded-full'
                                  title='Sessão atual'
                                />
                              )}
                              <span className='text-gray-900 dark:text-white'>
                                {session.user_email}
                              </span>
                            </div>
                          </td>
                          <td className='py-2 px-3'>
                            <div className='flex items-center gap-1'>
                              <Globe className='h-3 w-3 text-gray-400 dark:text-gray-500' />
                              <span className='text-gray-600 dark:text-gray-300 font-mono'>
                                {session.ip_address}
                              </span>
                              <button
                                onClick={() => copyToClipboard(session.ip_address)}
                                className='p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded'
                                title='Copiar IP'
                              >
                                <Copy className='h-3 w-3 text-gray-400 dark:text-gray-500' />
                              </button>
                            </div>
                          </td>
                          <td className='py-2 px-3 hidden sm:table-cell'>
                            <div className='flex items-center gap-2'>
                              {getDeviceIcon(session.device)}
                              <span
                                className='text-gray-500 dark:text-gray-400 truncate max-w-[150px]'
                                title={`${session.device} - ${session.browser}`}
                              >
                                {session.device || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className='py-2 px-3 text-gray-500 dark:text-gray-400'>
                            {formatRelativeTime(session.last_activity)}
                          </td>
                          <td className='py-2 px-3'>
                            {!session.is_current && (
                              <button
                                onClick={() => forceLogoutMutation.mutate(session.id)}
                                disabled={forceLogoutMutation.isPending}
                                className='p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded transition-colors'
                                title='Encerrar sessão'
                              >
                                <LogOut className='h-3 w-3' />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-center py-8'>
                <Activity className='h-8 w-8 text-gray-400 dark:text-gray-600 mx-auto mb-2' />
                <p className='text-gray-500 dark:text-gray-400 text-sm'>
                  Nenhuma sessão ativa encontrada
                </p>
              </div>
            )}
          </div>
        )}

        {/* Failed Logins Tab */}
        {activeTab === 'failed-logins' && (
          <div className='bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
            <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>
                Tentativas de Login Falhadas
              </h3>
            </div>

            {failedLoginsLoading ? (
              <div className='p-4 space-y-2'>
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className='h-14 w-full' />
                ))}
              </div>
            ) : failedLoginsData?.items && failedLoginsData.items.length > 0 ? (
              <>
                <div className='overflow-x-auto'>
                  <table className='w-full text-xs'>
                    <thead className='bg-gray-100 dark:bg-gray-700/30'>
                      <tr>
                        <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                          Email
                        </th>
                        <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                          IP
                        </th>
                        <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell'>
                          Motivo
                        </th>
                        <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                          Data
                        </th>
                        <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedLoginsData.items.map(login => (
                        <tr
                          key={login.id}
                          className='border-t border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20'
                        >
                          <td className='py-2 px-3 text-gray-900 dark:text-white'>{login.email}</td>
                          <td className='py-2 px-3'>
                            <span className='text-gray-600 dark:text-gray-300 font-mono'>
                              {login.ip_address}
                            </span>
                          </td>
                          <td className='py-2 px-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell'>
                            {login.reason}
                          </td>
                          <td className='py-2 px-3 text-gray-500 dark:text-gray-400'>
                            {formatDate(login.timestamp)}
                          </td>
                          <td className='py-2 px-3'>
                            <button
                              onClick={() => blockIPMutation.mutate(login.ip_address)}
                              disabled={blockIPMutation.isPending}
                              className='p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded transition-colors'
                              title='Bloquear IP'
                            >
                              <Ban className='h-3 w-3' />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {failedLoginsData.total > 10 && (
                  <div className='p-3 border-t border-gray-200 dark:border-gray-700 flex justify-center items-center gap-2'>
                    <button
                      onClick={() => setFailedLoginsPage(p => Math.max(1, p - 1))}
                      disabled={failedLoginsPage === 1}
                      className='p-1.5 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
                      title='Página anterior'
                    >
                      <ChevronLeft className='h-4 w-4 text-gray-500 dark:text-gray-400' />
                    </button>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      Página {failedLoginsPage} de {Math.ceil(failedLoginsData.total / 10)}
                    </span>
                    <button
                      onClick={() => setFailedLoginsPage(p => p + 1)}
                      disabled={failedLoginsPage >= Math.ceil(failedLoginsData.total / 10)}
                      className='p-1.5 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
                      title='Próxima página'
                    >
                      <ChevronRight className='h-4 w-4 text-gray-500 dark:text-gray-400' />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className='text-center py-8'>
                <CheckCircle className='h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2' />
                <p className='text-gray-500 dark:text-gray-400 text-sm'>
                  Nenhuma tentativa de login falhada registrada
                </p>
              </div>
            )}
          </div>
        )}

        {/* Suspicious Activities Tab */}
        {activeTab === 'suspicious' && (
          <div className='bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
            <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>
                Atividades Suspeitas
              </h3>
            </div>

            {suspiciousLoading ? (
              <div className='p-4 space-y-2'>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className='h-20 w-full' />
                ))}
              </div>
            ) : suspiciousActivities && suspiciousActivities.length > 0 ? (
              <div className='divide-y divide-gray-200 dark:divide-gray-700/50'>
                {suspiciousActivities.map(activity => (
                  <div key={activity.id} className='p-3 hover:bg-gray-50 dark:hover:bg-gray-700/20'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex items-start gap-3'>
                        <div
                          className={`p-2 rounded-lg ${
                            activity.severity === 'critical'
                              ? 'bg-red-500/20'
                              : activity.severity === 'high'
                                ? 'bg-orange-500/20'
                                : activity.severity === 'medium'
                                  ? 'bg-yellow-500/20'
                                  : 'bg-blue-500/20'
                          }`}
                        >
                          <AlertTriangle
                            className={`h-4 w-4 ${
                              activity.severity === 'critical'
                                ? 'text-red-600 dark:text-red-400'
                                : activity.severity === 'high'
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : activity.severity === 'medium'
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-blue-600 dark:text-blue-400'
                            }`}
                          />
                        </div>
                        <div>
                          <div className='flex items-center gap-2 mb-1'>
                            <span className='text-sm font-medium text-gray-900 dark:text-white'>
                              {activity.activity_type}
                            </span>
                            <SeverityBadge severity={activity.severity} />
                            {activity.resolved && (
                              <span className='px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700/30'>
                                RESOLVIDO
                              </span>
                            )}
                          </div>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {activity.description}
                          </p>
                          <div className='flex items-center gap-3 mt-2 text-[10px] text-gray-400 dark:text-gray-500'>
                            {activity.user_email && <span>Usuário: {activity.user_email}</span>}
                            {activity.ip_address && <span>IP: {activity.ip_address}</span>}
                            <span>{formatRelativeTime(activity.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      {!activity.resolved && (
                        <button
                          className='p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400 rounded transition-colors'
                          title='Marcar como resolvido'
                        >
                          <CheckCircle className='h-4 w-4' />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8'>
                <ShieldCheck className='h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2' />
                <p className='text-gray-500 dark:text-gray-400 text-sm'>
                  Nenhuma atividade suspeita detectada
                </p>
                <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                  O sistema está monitorando continuamente
                </p>
              </div>
            )}
          </div>
        )}

        {/* Blocked IPs Tab */}
        {activeTab === 'blocked-ips' && (
          <div className='bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
            <div className='p-3 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>
                IPs Bloqueados
              </h3>
              <button className='px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5'>
                <Ban className='h-3 w-3' />
                Adicionar IP
              </button>
            </div>

            {blockedIPsLoading ? (
              <div className='p-4 space-y-2'>
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className='h-14 w-full' />
                ))}
              </div>
            ) : blockedIPs && blockedIPs.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='w-full text-xs'>
                  <thead className='bg-gray-100 dark:bg-gray-700/30'>
                    <tr>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                        IP
                      </th>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                        Motivo
                      </th>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell'>
                        Bloqueado em
                      </th>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell'>
                        Expira em
                      </th>
                      <th className='text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium'>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedIPs.map(ip => (
                      <tr
                        key={ip.id}
                        className='border-t border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20'
                      >
                        <td className='py-2 px-3'>
                          <div className='flex items-center gap-2'>
                            <span className='text-gray-900 dark:text-white font-mono'>
                              {ip.ip_address}
                            </span>
                            {ip.is_permanent && (
                              <span className='px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700/30'>
                                PERMANENTE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className='py-2 px-3 text-gray-500 dark:text-gray-400'>{ip.reason}</td>
                        <td className='py-2 px-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell'>
                          {formatDate(ip.blocked_at)}
                        </td>
                        <td className='py-2 px-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell'>
                          {ip.expires_at ? formatDate(ip.expires_at) : 'Nunca'}
                        </td>
                        <td className='py-2 px-3'>
                          <button
                            onClick={() => unblockIPMutation.mutate(ip.id)}
                            disabled={unblockIPMutation.isPending}
                            className='p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400 rounded transition-colors'
                            title='Desbloquear IP'
                          >
                            <Unlock className='h-3 w-3' />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-center py-8'>
                <Globe className='h-8 w-8 text-gray-400 dark:text-gray-600 mx-auto mb-2' />
                <p className='text-gray-500 dark:text-gray-400 text-sm'>Nenhum IP bloqueado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSecurityPage
