import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Activity,
  RefreshCw,
  Settings,
  AlertTriangle,
  AlertCircle,
  Info,
  Play,
  Pause,
  Zap,
  TrendingUp,
  DollarSign,
  Shield,
  Flame,
  Snowflake,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// Tipos
interface AutomationThresholds {
  hot_max_usd: number
  hot_min_usd: number
  hot_target_usd: number
  fees_sweep_threshold_usd: number
  min_transfer_usd: number
  consolidation_interval_hours: number
  automation_enabled: boolean
  dry_run: boolean
}

interface Alert {
  type: 'critical' | 'warning' | 'info'
  category: string
  wallet: string
  message: string
  threshold?: number
  action?: string
}

interface DashboardData {
  summary: {
    total_wallets: number
    locked_wallets: number
    total_system_usd: number
    by_type: {
      cold: number
      hot: number
      fees: number
    }
  }
  automation: AutomationThresholds
  recommendations_count: number
  actions_pending: number
  recent_transactions: Array<{
    id: string
    tx_hash: string | null
    direction: string
    amount: number
    cryptocurrency: string
    status: string
    created_at: string | null
  }>
  generated_at: string
}

interface AnalysisData {
  wallets: Record<
    string,
    {
      wallet_type: string
      is_locked: boolean
      total_usd: number
      by_network: Record<
        string,
        {
          usdt: number
          usdc: number
          total: number
        }
      >
    }
  >
  total_system_usd: number
  recommendations: Array<{
    type: string
    wallet?: string
    message: string
    priority: string
  }>
  actions_needed: Array<{
    action: string
    from_wallet: string
    to_wallet: string
    amount_usd: number
    reason: string
  }>
}

// API Functions
const fetchDashboard = async (): Promise<DashboardData> => {
  const response = await apiClient.get('/admin/system-blockchain-wallet/monitoring/dashboard')
  return response.data
}

const fetchAlerts = async (): Promise<{ alerts: Alert[]; has_critical: boolean }> => {
  const response = await apiClient.get('/admin/system-blockchain-wallet/alerts/check')
  return response.data
}

const fetchAnalysis = async (): Promise<AnalysisData> => {
  const response = await apiClient.get('/admin/system-blockchain-wallet/automation/analysis')
  return response.data
}

const executeAutomation = async (params: { dry_run: boolean; max_actions: number }) => {
  const response = await apiClient.post(
    `/admin/system-blockchain-wallet/automation/execute?dry_run=${params.dry_run}&max_actions=${params.max_actions}`
  )
  return response.data
}

const toggleAutomation = async (enabled: boolean) => {
  const response = await apiClient.patch(
    `/admin/system-blockchain-wallet/automation/toggle?enabled=${enabled}`
  )
  return response.data
}

const updateThresholds = async (
  params: Partial<{
    hot_max: number
    hot_min: number
    hot_target: number
    fees_sweep: number
  }>
) => {
  const queryParams = new URLSearchParams()
  if (params.hot_max) queryParams.append('hot_max', params.hot_max.toString())
  if (params.hot_min) queryParams.append('hot_min', params.hot_min.toString())
  if (params.hot_target) queryParams.append('hot_target', params.hot_target.toString())
  if (params.fees_sweep) queryParams.append('fees_sweep', params.fees_sweep.toString())

  const response = await apiClient.patch(
    `/admin/system-blockchain-wallet/automation/thresholds?${queryParams.toString()}`
  )
  return response.data
}

// Componente Principal
export default function AdminWalletAutomationPage() {
  const queryClient = useQueryClient()
  const [showSettings, setShowSettings] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [thresholdForm, setThresholdForm] = useState({
    hot_max: '',
    hot_min: '',
    hot_target: '',
    fees_sweep: '',
  })

  // Queries
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['wallet-dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 30000, // Atualiza a cada 30s
  })

  const { data: alertsData } = useQuery({
    queryKey: ['wallet-alerts'],
    queryFn: fetchAlerts,
    refetchInterval: 60000, // Atualiza a cada 60s
  })

  const { data: analysis } = useQuery({
    queryKey: ['wallet-analysis'],
    queryFn: fetchAnalysis,
    enabled: showAnalysis,
  })

  // Mutations
  const executeMutation = useMutation({
    mutationFn: executeAutomation,
    onSuccess: data => {
      if (data.dry_run) {
        toast.success('Simulação concluída!')
      } else {
        toast.success('Ações executadas!')
      }
      queryClient.invalidateQueries({ queryKey: ['wallet-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-alerts'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao executar automação')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: toggleAutomation,
    onSuccess: data => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['wallet-dashboard'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao alternar automação')
    },
  })

  const thresholdsMutation = useMutation({
    mutationFn: updateThresholds,
    onSuccess: () => {
      toast.success('Thresholds atualizados!')
      setShowSettings(false)
      queryClient.invalidateQueries({ queryKey: ['wallet-dashboard'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar thresholds')
    },
  })

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className='w-5 h-5 text-red-500' />
      case 'warning':
        return <AlertTriangle className='w-5 h-5 text-yellow-500' />
      default:
        return <Info className='w-5 h-5 text-blue-500' />
    }
  }

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/30'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30'
      default:
        return 'bg-blue-500/10 border-blue-500/30'
    }
  }

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-gray-600 text-gray-400'
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400'
      default:
        return 'bg-gray-600 text-gray-400'
    }
  }

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'cold':
        return <Snowflake className='w-5 h-5 text-blue-400' />
      case 'hot':
        return <Flame className='w-5 h-5 text-orange-400' />
      default:
        return <DollarSign className='w-5 h-5 text-green-400' />
    }
  }

  if (dashboardLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <RefreshCw className='w-8 h-8 animate-spin text-blue-500' />
      </div>
    )
  }

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-white flex items-center gap-2'>
            <Activity className='w-7 h-7 text-blue-500' />
            Automação de Carteiras
          </h1>
          <p className='text-gray-400 mt-1'>
            Monitoramento e automação de transferências entre carteiras
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => refetchDashboard()}
            className='p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors'
            title='Atualizar'
          >
            <RefreshCw className='w-5 h-5 text-gray-300' />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title='Configurações'
          >
            <Settings className='w-5 h-5 text-gray-300' />
          </button>
        </div>
      </div>

      {/* Status da Automação */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        {/* Total do Sistema */}
        <div className='bg-gray-800 rounded-xl p-5 border border-gray-700'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-sm'>Total Sistema</span>
            <DollarSign className='w-5 h-5 text-green-500' />
          </div>
          <p className='text-2xl font-bold text-white mt-2'>
            $
            {dashboard?.summary?.total_system_usd?.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            }) || '0.00'}
          </p>
          <p className='text-gray-500 text-xs mt-1'>
            {dashboard?.summary?.total_wallets || 0} carteiras
          </p>
        </div>

        {/* Cold */}
        <div className='bg-gray-800 rounded-xl p-5 border border-blue-500/30'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-sm'>COLD</span>
            <Snowflake className='w-5 h-5 text-blue-400' />
          </div>
          <p className='text-2xl font-bold text-blue-400 mt-2'>
            $
            {dashboard?.summary?.by_type?.cold?.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            }) || '0.00'}
          </p>
          <p className='text-gray-500 text-xs mt-1'>Armazenamento seguro</p>
        </div>

        {/* Hot */}
        <div className='bg-gray-800 rounded-xl p-5 border border-orange-500/30'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-sm'>HOT</span>
            <Flame className='w-5 h-5 text-orange-400' />
          </div>
          <p className='text-2xl font-bold text-orange-400 mt-2'>
            $
            {dashboard?.summary?.by_type?.hot?.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            }) || '0.00'}
          </p>
          <p className='text-gray-500 text-xs mt-1'>Operacional</p>
        </div>

        {/* Fees */}
        <div className='bg-gray-800 rounded-xl p-5 border border-green-500/30'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-sm'>FEES</span>
            <DollarSign className='w-5 h-5 text-green-400' />
          </div>
          <p className='text-2xl font-bold text-green-400 mt-2'>
            $
            {dashboard?.summary?.by_type?.fees?.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            }) || '0.00'}
          </p>
          <p className='text-gray-500 text-xs mt-1'>Taxas coletadas</p>
        </div>
      </div>

      {/* Controles de Automação */}
      <div className='bg-gray-800 rounded-xl p-5 border border-gray-700'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <Zap className='w-5 h-5 text-yellow-500' />
            Controle de Automação
          </h2>
          <div className='flex items-center gap-2'>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                dashboard?.automation?.automation_enabled
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {dashboard?.automation?.automation_enabled ? 'Ativa' : 'Inativa'}
            </span>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {/* Toggle Automação */}
          <button
            onClick={() => toggleMutation.mutate(!dashboard?.automation?.automation_enabled)}
            disabled={toggleMutation.isPending}
            className={`p-4 rounded-lg border transition-colors flex items-center gap-3 ${
              dashboard?.automation?.automation_enabled
                ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                : 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
            }`}
          >
            {dashboard?.automation?.automation_enabled ? (
              <>
                <Pause className='w-6 h-6 text-red-400' />
                <div className='text-left'>
                  <p className='text-white font-medium'>Pausar Automação</p>
                  <p className='text-gray-400 text-sm'>Desabilitar ações automáticas</p>
                </div>
              </>
            ) : (
              <>
                <Play className='w-6 h-6 text-green-400' />
                <div className='text-left'>
                  <p className='text-white font-medium'>Ativar Automação</p>
                  <p className='text-gray-400 text-sm'>Habilitar ações automáticas</p>
                </div>
              </>
            )}
          </button>

          {/* Simular */}
          <button
            onClick={() => executeMutation.mutate({ dry_run: true, max_actions: 5 })}
            disabled={executeMutation.isPending}
            className='p-4 rounded-lg border bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 transition-colors flex items-center gap-3'
          >
            <Activity className='w-6 h-6 text-blue-400' />
            <div className='text-left'>
              <p className='text-white font-medium'>Simular Ações</p>
              <p className='text-gray-400 text-sm'>Dry-run (não executa)</p>
            </div>
          </button>

          {/* Executar */}
          <button
            onClick={() => {
              if (confirm('⚠️ Isso executará transferências REAIS. Continuar?')) {
                executeMutation.mutate({ dry_run: false, max_actions: 3 })
              }
            }}
            disabled={executeMutation.isPending || !dashboard?.automation?.automation_enabled}
            className='p-4 rounded-lg border bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 transition-colors flex items-center gap-3 disabled:opacity-50'
          >
            <Zap className='w-6 h-6 text-yellow-400' />
            <div className='text-left'>
              <p className='text-white font-medium'>Executar Agora</p>
              <p className='text-gray-400 text-sm'>
                {dashboard?.actions_pending || 0} ações pendentes
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {alertsData && alertsData.alerts.length > 0 && (
        <div className='bg-gray-800 rounded-xl p-5 border border-gray-700'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2 mb-4'>
            <AlertTriangle className='w-5 h-5 text-yellow-500' />
            Alertas ({alertsData.alerts.length})
          </h2>
          <div className='space-y-3'>
            {alertsData.alerts.map(alert => (
              <div
                key={`alert-${alert.wallet}-${alert.category}`}
                className={`p-4 rounded-lg border ${getAlertBg(alert.type)}`}
              >
                <div className='flex items-start gap-3'>
                  {getAlertIcon(alert.type)}
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='text-white font-medium'>{alert.wallet}</span>
                      <span className='text-gray-400 text-sm'>• {alert.category}</span>
                    </div>
                    <p className='text-gray-300 text-sm mt-1'>{alert.message}</p>
                    {alert.action && (
                      <span className='inline-block mt-2 px-2 py-1 bg-gray-700 rounded text-xs text-gray-300'>
                        Ação sugerida: {alert.action}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Análise Detalhada */}
      <div className='bg-gray-800 rounded-xl border border-gray-700'>
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className='w-full p-5 flex items-center justify-between hover:bg-gray-700/50 transition-colors'
        >
          <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
            <TrendingUp className='w-5 h-5 text-green-500' />
            Análise Detalhada
          </h2>
          {showAnalysis ? (
            <ChevronUp className='w-5 h-5 text-gray-400' />
          ) : (
            <ChevronDown className='w-5 h-5 text-gray-400' />
          )}
        </button>

        {showAnalysis && analysis && (
          <div className='p-5 pt-0 space-y-4'>
            {/* Recomendações */}
            {analysis.recommendations.length > 0 && (
              <div>
                <h3 className='text-sm font-medium text-gray-400 mb-2'>Recomendações</h3>
                <div className='space-y-2'>
                  {analysis.recommendations.map(rec => (
                    <div
                      key={`rec-${rec.type}-${rec.wallet || 'general'}`}
                      className='flex items-center gap-2 p-3 bg-gray-700/50 rounded-lg'
                    >
                      <Info className='w-4 h-4 text-blue-400 flex-shrink-0' />
                      <span className='text-gray-300 text-sm'>{rec.message}</span>
                      <span
                        className={`ml-auto px-2 py-0.5 rounded text-xs ${getPriorityClass(rec.priority)}`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ações Pendentes */}
            {analysis.actions_needed.length > 0 && (
              <div>
                <h3 className='text-sm font-medium text-gray-400 mb-2'>Ações Pendentes</h3>
                <div className='space-y-2'>
                  {analysis.actions_needed.map(action => (
                    <div
                      key={`action-${action.from_wallet}-${action.to_wallet}-${action.reason}`}
                      className='flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg'
                    >
                      <ArrowRight className='w-4 h-4 text-yellow-400 flex-shrink-0' />
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='text-white text-sm font-medium'>
                            {action.from_wallet}
                          </span>
                          <ArrowRight className='w-3 h-3 text-gray-500' />
                          <span className='text-white text-sm font-medium'>{action.to_wallet}</span>
                        </div>
                        <p className='text-gray-400 text-xs'>
                          ${action.amount_usd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                          • {action.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saldos por Carteira */}
            <div>
              <h3 className='text-sm font-medium text-gray-400 mb-2'>Saldos por Carteira</h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {Object.entries(analysis.wallets).map(([name, data]) => (
                  <div key={name} className='p-3 bg-gray-700/50 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      {getWalletIcon(data.wallet_type)}
                      <span className='text-white font-medium'>{name}</span>
                      {data.is_locked && <Shield className='w-4 h-4 text-blue-400' />}
                    </div>
                    <p className='text-xl font-bold text-green-400'>
                      ${data.total_usd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Últimas Transações */}
      {dashboard?.recent_transactions && dashboard.recent_transactions.length > 0 && (
        <div className='bg-gray-800 rounded-xl p-5 border border-gray-700'>
          <h2 className='text-lg font-semibold text-white flex items-center gap-2 mb-4'>
            <Clock className='w-5 h-5 text-gray-400' />
            Últimas Transações
          </h2>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='text-gray-400 text-sm border-b border-gray-700'>
                  <th className='text-left py-2 px-3'>Hash</th>
                  <th className='text-left py-2 px-3'>Direção</th>
                  <th className='text-right py-2 px-3'>Valor</th>
                  <th className='text-left py-2 px-3'>Crypto</th>
                  <th className='text-left py-2 px-3'>Status</th>
                  <th className='text-left py-2 px-3'>Data</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recent_transactions.map(tx => (
                  <tr key={tx.id} className='border-b border-gray-700/50 hover:bg-gray-700/30'>
                    <td className='py-2 px-3'>
                      <span className='text-gray-300 font-mono text-sm'>{tx.tx_hash || '-'}</span>
                    </td>
                    <td className='py-2 px-3'>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          tx.direction === 'in'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        {tx.direction === 'in' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className='py-2 px-3 text-right text-white'>
                      {tx.amount.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}
                    </td>
                    <td className='py-2 px-3 text-gray-300'>{tx.cryptocurrency}</td>
                    <td className='py-2 px-3'>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusClass(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className='py-2 px-3 text-gray-400 text-sm'>
                      {tx.created_at ? new Date(tx.created_at).toLocaleString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Configurações */}
      {showSettings && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700'>
            <h3 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
              <Settings className='w-5 h-5 text-blue-500' />
              Configurar Thresholds
            </h3>

            <div className='space-y-4'>
              <div>
                <label htmlFor='hot_max' className='block text-gray-400 text-sm mb-1'>
                  HOT Máximo (USD)
                </label>
                <input
                  id='hot_max'
                  type='number'
                  value={thresholdForm.hot_max}
                  onChange={e => setThresholdForm(prev => ({ ...prev, hot_max: e.target.value }))}
                  placeholder={dashboard?.automation?.hot_max_usd?.toString() || '10000'}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none'
                />
                <p className='text-gray-500 text-xs mt-1'>
                  Mover para COLD quando HOT ultrapassar este valor
                </p>
              </div>

              <div>
                <label htmlFor='hot_min' className='block text-gray-400 text-sm mb-1'>
                  HOT Mínimo (USD)
                </label>
                <input
                  id='hot_min'
                  type='number'
                  value={thresholdForm.hot_min}
                  onChange={e => setThresholdForm(prev => ({ ...prev, hot_min: e.target.value }))}
                  placeholder={dashboard?.automation?.hot_min_usd?.toString() || '1000'}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none'
                />
                <p className='text-gray-500 text-xs mt-1'>
                  Reabastecer de COLD quando HOT cair abaixo deste valor
                </p>
              </div>

              <div>
                <label htmlFor='hot_target' className='block text-gray-400 text-sm mb-1'>
                  HOT Alvo (USD)
                </label>
                <input
                  id='hot_target'
                  type='number'
                  value={thresholdForm.hot_target}
                  onChange={e =>
                    setThresholdForm(prev => ({ ...prev, hot_target: e.target.value }))
                  }
                  placeholder={dashboard?.automation?.hot_target_usd?.toString() || '5000'}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none'
                />
                <p className='text-gray-500 text-xs mt-1'>Valor alvo após reabastecimento</p>
              </div>

              <div>
                <label htmlFor='fees_sweep' className='block text-gray-400 text-sm mb-1'>
                  FEES Sweep Threshold (USD)
                </label>
                <input
                  id='fees_sweep'
                  type='number'
                  value={thresholdForm.fees_sweep}
                  onChange={e =>
                    setThresholdForm(prev => ({ ...prev, fees_sweep: e.target.value }))
                  }
                  placeholder={dashboard?.automation?.fees_sweep_threshold_usd?.toString() || '500'}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none'
                />
                <p className='text-gray-500 text-xs mt-1'>
                  Consolidar taxas quando FEES ultrapassar este valor
                </p>
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={() => setShowSettings(false)}
                className='flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const params: any = {}
                  if (thresholdForm.hot_max)
                    params.hot_max = Number.parseFloat(thresholdForm.hot_max)
                  if (thresholdForm.hot_min)
                    params.hot_min = Number.parseFloat(thresholdForm.hot_min)
                  if (thresholdForm.hot_target)
                    params.hot_target = Number.parseFloat(thresholdForm.hot_target)
                  if (thresholdForm.fees_sweep)
                    params.fees_sweep = Number.parseFloat(thresholdForm.fees_sweep)

                  if (Object.keys(params).length > 0) {
                    thresholdsMutation.mutate(params)
                  } else {
                    toast.error('Preencha pelo menos um valor')
                  }
                }}
                disabled={thresholdsMutation.isPending}
                className='flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors disabled:opacity-50'
              >
                {thresholdsMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
