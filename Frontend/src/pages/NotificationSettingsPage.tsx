/**
 * WOLK NOW - Notification Settings Page
 * ======================================
 *
 * Página para gerenciar preferências de Push Notifications.
 */

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { apiClient } from '@/services/api'
import { useToast } from '@/hooks/useToast'
import {
  Bell,
  BellOff,
  Shield,
  MessageCircle,
  TrendingUp,
  BarChart2,
  Settings,
  Moon,
  Smartphone,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ToastContainer } from '@/components/ui/Toast'

interface NotificationPreferences {
  transactions: boolean
  security: boolean
  p2p_trading: boolean
  chat: boolean
  market: boolean
  reports: boolean
  system: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

interface Subscription {
  id: number
  endpoint: string
  device_info: {
    user_agent?: string
    platform?: string
  } | null
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export function NotificationSettingsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isPWA,
  } = usePushNotifications()

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    transactions: true,
    security: true,
    p2p_trading: true,
    chat: true,
    market: false,
    reports: false,
    system: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
  })
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false)

  // Detectar iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  // Carregar preferências e subscriptions
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [prefsResponse, subsResponse] = await Promise.all([
        apiClient.get('/notifications/preferences'),
        apiClient.get('/notifications/subscriptions'),
      ])

      if (prefsResponse.data?.preferences) {
        const prefs = prefsResponse.data.preferences
        setPreferences(prefs)
        setQuietHoursEnabled(!!prefs.quiet_hours_start && !!prefs.quiet_hours_end)
      }

      if (subsResponse.data?.subscriptions) {
        setSubscriptions(subsResponse.data.subscriptions)
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error)
    }
  }

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const oldPrefs = { ...preferences }
    const newPrefs = { ...preferences, [key]: value }
    setPreferences(newPrefs)

    try {
      setIsSaving(true)
      await apiClient.put('/notifications/preferences', newPrefs)
      toast.success('Preferência atualizada')
    } catch (error) {
      console.error('Erro ao salvar preferência:', error)
      toast.error('Erro ao salvar preferência')
      setPreferences(oldPrefs)
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuietHoursChange = async (start: string | null, end: string | null) => {
    const newPrefs = {
      ...preferences,
      quiet_hours_start: start,
      quiet_hours_end: end,
    }
    setPreferences(newPrefs)

    try {
      await apiClient.put('/notifications/preferences', newPrefs)
      toast.success('Horário de silêncio atualizado')
    } catch (error) {
      console.error('Erro ao salvar horário:', error)
      toast.error('Erro ao salvar horário')
    }
  }

  const handleEnableNotifications = async () => {
    try {
      await subscribe()
      toast.success('Notificações ativadas!')
      loadData()
    } catch (error) {
      console.error('Erro ao ativar notificações:', error)
      toast.error('Erro ao ativar notificações')
    }
  }

  const handleDisableNotifications = async () => {
    try {
      await unsubscribe()
      toast.success('Notificações desativadas')
      loadData()
    } catch (error) {
      console.error('Erro ao desativar:', error)
    }
  }

  const handleTestNotification = async () => {
    try {
      await sendTestNotification()
    } catch (error) {
      console.error('Erro no teste:', error)
    }
  }

  // Categorias de notificação
  const notificationCategories = [
    {
      key: 'transactions' as const,
      icon: TrendingUp,
      title: 'Transações',
      description: 'Recebimentos, confirmações e saques',
      color: 'text-green-500',
    },
    {
      key: 'security' as const,
      icon: Shield,
      title: 'Segurança',
      description: 'Novos logins e atividades suspeitas',
      color: 'text-red-500',
      recommended: true,
    },
    {
      key: 'p2p_trading' as const,
      icon: RefreshCw,
      title: 'P2P Trading',
      description: 'Ordens, pagamentos e escrow',
      color: 'text-blue-500',
    },
    {
      key: 'chat' as const,
      icon: MessageCircle,
      title: 'Mensagens',
      description: 'Novas mensagens no chat P2P',
      color: 'text-purple-500',
    },
    {
      key: 'market' as const,
      icon: BarChart2,
      title: 'Mercado',
      description: 'Alertas de preço e variações',
      color: 'text-yellow-500',
    },
    {
      key: 'reports' as const,
      icon: BarChart2,
      title: 'Relatórios',
      description: 'Resumos semanais e mensais',
      color: 'text-cyan-500',
    },
    {
      key: 'system' as const,
      icon: Settings,
      title: 'Sistema',
      description: 'Manutenções e novidades',
      color: 'text-gray-500',
    },
  ]

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      {/* Header */}
      <div className='sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-2xl mx-auto flex items-center gap-4 py-4 px-4'>
          <button
            onClick={() => navigate(-1)}
            className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
          >
            <ArrowLeft className='h-5 w-5' />
          </button>
          <div>
            <h1 className='text-lg font-semibold'>Notificações</h1>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              Gerencie como você recebe alertas
            </p>
          </div>
        </div>
      </div>

      <div className='max-w-2xl mx-auto py-6 px-4 space-y-6'>
        {/* Status das notificações */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-start gap-4'>
            <div
              className={`p-3 rounded-full ${
                isSubscribed
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
              }`}
            >
              {isSubscribed ? <Bell className='h-6 w-6' /> : <BellOff className='h-6 w-6' />}
            </div>

            <div className='flex-1'>
              <h2 className='font-semibold text-lg'>
                {isSubscribed ? 'Notificações Ativas' : 'Notificações Desativadas'}
              </h2>
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                {isSubscribed
                  ? 'Você receberá alertas mesmo com o app fechado'
                  : 'Ative para receber alertas importantes'}
              </p>

              {/* iOS PWA Warning */}
              {isIOS && !isPWA && (
                <div className='flex items-center gap-2 mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-700 dark:text-yellow-400'>
                  <AlertTriangle className='h-4 w-4 flex-shrink-0' />
                  <span>Para notificações no iPhone, adicione o app à Tela Inicial</span>
                </div>
              )}

              <div className='flex gap-2 mt-4'>
                {isSubscribed ? (
                  <>
                    <button
                      onClick={handleTestNotification}
                      className='px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                    >
                      Testar
                    </button>
                    <button
                      onClick={handleDisableNotifications}
                      className='px-4 py-2 text-sm font-medium rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors'
                    >
                      Desativar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEnableNotifications}
                    disabled={!isSupported || permission === 'denied'}
                    className='flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                  >
                    <Bell className='h-4 w-4' />
                    Ativar Notificações
                  </button>
                )}
              </div>

              {permission === 'denied' && (
                <p className='text-sm text-red-500 mt-2'>
                  Notificações bloqueadas. Permita nas configurações do navegador.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Categorias */}
        {isSubscribed && (
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700'>
            <div className='p-4'>
              <h3 className='font-medium'>Tipos de Notificação</h3>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Escolha quais alertas deseja receber
              </p>
            </div>

            {notificationCategories.map(category => (
              <div key={category.key} className='p-4 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${category.color}`}>
                    <category.icon className='h-5 w-5' />
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{category.title}</span>
                      {category.recommended && (
                        <span className='text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded'>
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                      {category.description}
                    </p>
                  </div>
                </div>
                <label className='relative inline-flex items-center cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={preferences[category.key]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handlePreferenceChange(category.key, e.target.checked)
                    }
                    disabled={isSaving}
                    className='sr-only peer'
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Horário de Silêncio */}
        {isSubscribed && (
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm'>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-3'>
                <div className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-indigo-500'>
                  <Moon className='h-5 w-5' />
                </div>
                <div>
                  <span className='font-medium'>Horário de Silêncio</span>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Pausar notificações em determinado horário
                  </p>
                </div>
              </div>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={quietHoursEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const checked = e.target.checked
                    setQuietHoursEnabled(checked)
                    if (checked) {
                      handleQuietHoursChange('22:00', '08:00')
                    } else {
                      handleQuietHoursChange(null, null)
                    }
                  }}
                  className='sr-only peer'
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {quietHoursEnabled && (
              <div className='flex items-center gap-4 mt-4 pl-12'>
                <div className='space-y-1.5'>
                  <label className='text-xs text-gray-500 dark:text-gray-400'>Início</label>
                  <input
                    type='time'
                    value={preferences.quiet_hours_start || '22:00'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleQuietHoursChange(e.target.value, preferences.quiet_hours_end)
                    }
                    className='w-28 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm'
                  />
                </div>
                <span className='text-gray-400 mt-6'>até</span>
                <div className='space-y-1.5'>
                  <label className='text-xs text-gray-500 dark:text-gray-400'>Fim</label>
                  <input
                    type='time'
                    value={preferences.quiet_hours_end || '08:00'}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleQuietHoursChange(preferences.quiet_hours_start, e.target.value)
                    }
                    className='w-28 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm'
                  />
                </div>
              </div>
            )}

            <p className='text-xs text-gray-500 dark:text-gray-400 mt-4 pl-12'>
              ⚠️ Notificações de segurança sempre serão enviadas
            </p>
          </div>
        )}

        {/* Dispositivos conectados */}
        {isSubscribed && subscriptions.length > 0 && (
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700'>
            <div className='p-4'>
              <h3 className='font-medium'>Dispositivos Conectados</h3>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                {subscriptions.length} dispositivo(s) recebendo notificações
              </p>
            </div>

            {subscriptions.map(sub => (
              <div key={sub.id} className='p-4 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Smartphone className='h-5 w-5 text-gray-400' />
                  <div>
                    <p className='text-sm font-medium'>
                      {sub.device_info?.platform || 'Dispositivo'}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Conectado em{' '}
                      {sub.created_at
                        ? new Date(sub.created_at).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                {sub.is_active && (
                  <span className='flex items-center gap-1 text-xs text-green-500'>
                    <Check className='h-3 w-3' />
                    Ativo
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className='text-center text-sm text-gray-500 dark:text-gray-400 py-4'>
          <p>
            As notificações são entregues pelo navegador.
            <br />
            Você pode desativá-las a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  )
}
