/**
 * WOLK NOW - Notification Settings Page
 * ======================================
 *
 * Página para gerenciar preferências de Push Notifications.
 * Design profissional com explicações detalhadas.
 */

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { apiClient } from '@/services/api'
import { useToast } from '@/hooks/useToast'
import {
  Bell,
  BellOff,
  BellRing,
  ShieldCheck,
  MessageCircle,
  TrendingUp,
  Settings,
  Moon,
  Smartphone,
  ArrowLeft,
  AlertTriangle,
  Check,
  CheckCircle,
  Info,
  Clock,
  Zap,
  Globe,
  Lock,
  Send,
  Volume2,
  VolumeX,
  Wallet,
  ArrowRightLeft,
  FileText,
  ChevronRight,
  HelpCircle,
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

  // Categorias de notificação com explicações detalhadas
  const notificationCategories = [
    {
      key: 'transactions' as const,
      icon: Wallet,
      title: 'Transações',
      description: 'Depósitos, saques e confirmações de blockchain',
      details:
        'Receba alertas quando suas transações forem confirmadas, quando receber depósitos ou quando saques forem processados.',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      priority: 'Alta',
    },
    {
      key: 'security' as const,
      icon: ShieldCheck,
      title: 'Segurança',
      description: 'Logins, atividades suspeitas e alterações de conta',
      details:
        'Alertas críticos sobre novos acessos à sua conta, tentativas de login suspeitas, alterações de senha e atividades incomuns.',
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      recommended: true,
      priority: 'Crítica',
    },
    {
      key: 'p2p_trading' as const,
      icon: ArrowRightLeft,
      title: 'Trading P2P',
      description: 'Ordens, pagamentos e liberação de escrow',
      details:
        'Notificações sobre novas ordens P2P, confirmações de pagamento, liberação de fundos do escrow e disputas.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      priority: 'Alta',
    },
    {
      key: 'chat' as const,
      icon: MessageCircle,
      title: 'Mensagens',
      description: 'Chat com traders e suporte',
      details:
        'Receba notificações de novas mensagens nas suas negociações P2P e conversas com o suporte.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      priority: 'Média',
    },
    {
      key: 'market' as const,
      icon: TrendingUp,
      title: 'Alertas de Mercado',
      description: 'Variações de preço e oportunidades',
      details:
        'Alertas sobre variações significativas de preço das suas criptomoedas e oportunidades de trading.',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      priority: 'Baixa',
    },
    {
      key: 'reports' as const,
      icon: FileText,
      title: 'Relatórios',
      description: 'Resumos semanais e extratos',
      details:
        'Receba resumos periódicos das suas atividades, balanço da carteira e relatórios de performance.',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
      priority: 'Baixa',
    },
    {
      key: 'system' as const,
      icon: Settings,
      title: 'Sistema',
      description: 'Manutenções, atualizações e novidades',
      details:
        'Informações sobre manutenções programadas, novas funcionalidades e atualizações importantes da plataforma.',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      priority: 'Baixa',
    },
  ]

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      {/* Header */}
      <div className='sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-2xl mx-auto flex items-center gap-2 sm:gap-4 py-3 sm:py-4 px-3 sm:px-4'>
          <button
            onClick={() => navigate(-1)}
            className='p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
            title='Voltar'
            aria-label='Voltar'
          >
            <ArrowLeft className='h-4 w-4 sm:h-5 sm:w-5' />
          </button>
          <div>
            <h1 className='text-sm sm:text-base md:text-lg font-semibold flex items-center gap-1.5 sm:gap-2'>
              <Bell className='h-4 w-4 sm:h-5 sm:w-5 text-purple-600' />
              Notificações Push
            </h1>
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
              Configure alertas em tempo real
            </p>
          </div>
        </div>
      </div>

      <div className='max-w-2xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-6'>
        {/* Explicação inicial */}
        <div className='bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-3 sm:p-4 border border-purple-100 dark:border-purple-800'>
          <div className='flex gap-2 sm:gap-3'>
            <div className='p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg h-fit'>
              <Info className='h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400' />
            </div>
            <div>
              <h3 className='text-xs sm:text-sm font-medium text-purple-900 dark:text-purple-100'>
                O que são Push Notifications?
              </h3>
              <p className='text-[10px] sm:text-xs md:text-sm text-purple-700 dark:text-purple-300 mt-1'>
                São alertas que aparecem no seu dispositivo mesmo quando o app está fechado. Você
                será notificado instantaneamente sobre transações, segurança e negociações P2P.
              </p>
              <div className='flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3'>
                <div className='flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-xs text-purple-600 dark:text-purple-400'>
                  <Zap className='h-3 w-3 sm:h-3.5 sm:w-3.5' />
                  <span>Instantâneo</span>
                </div>
                <div className='flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-xs text-purple-600 dark:text-purple-400'>
                  <Lock className='h-3 w-3 sm:h-3.5 sm:w-3.5' />
                  <span>Seguro</span>
                </div>
                <div className='flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-xs text-purple-600 dark:text-purple-400'>
                  <Globe className='h-3 w-3 sm:h-3.5 sm:w-3.5' />
                  <span>Funciona offline</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status das notificações */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700'>
          <div className='flex items-start gap-3 sm:gap-4'>
            <div
              className={`p-2 sm:p-3 rounded-full ${
                isSubscribed
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
              }`}
            >
              {isSubscribed ? (
                <BellRing className='h-5 w-5 sm:h-6 sm:w-6' />
              ) : (
                <BellOff className='h-5 w-5 sm:h-6 sm:w-6' />
              )}
            </div>

            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h2 className='font-semibold text-sm sm:text-base md:text-lg'>
                  {isSubscribed ? 'Notificações Ativas' : 'Notificações Desativadas'}
                </h2>
                {isSubscribed && (
                  <span className='flex items-center gap-1 text-[10px] sm:text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full'>
                    <CheckCircle className='h-2.5 w-2.5 sm:h-3 sm:w-3' />
                    Ativo
                  </span>
                )}
              </div>
              <p className='text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1'>
                {isSubscribed
                  ? 'Você receberá alertas importantes mesmo com o aplicativo fechado. As notificações são processadas em segundo plano.'
                  : 'Ative para receber alertas em tempo real sobre suas transações, segurança e negociações P2P.'}
              </p>

              {/* iOS PWA Warning */}
              {isIOS && !isPWA && (
                <div className='flex items-start gap-2 mt-3 sm:mt-4 p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800'>
                  <AlertTriangle className='h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400'>
                      Atenção - Usuário iOS
                    </p>
                    <p className='text-[10px] sm:text-xs text-amber-600 dark:text-amber-500 mt-0.5'>
                      Para receber notificações no iPhone/iPad, adicione o app à Tela Inicial: toque
                      no ícone de compartilhar e selecione "Adicionar à Tela de Início".
                    </p>
                  </div>
                </div>
              )}

              {/* Botões de ação */}
              <div className='flex flex-wrap gap-2 mt-3 sm:mt-4'>
                {isSubscribed ? (
                  <>
                    <button
                      onClick={handleTestNotification}
                      className='flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                    >
                      <Send className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                      Enviar Teste
                    </button>
                    <button
                      onClick={handleDisableNotifications}
                      className='flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors'
                    >
                      <VolumeX className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                      Desativar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEnableNotifications}
                    disabled={!isSupported || permission === 'denied'}
                    className='flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg'
                  >
                    <Volume2 className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                    Ativar Notificações Push
                  </button>
                )}
              </div>

              {/* Mensagem de permissão bloqueada */}
              {permission === 'denied' && (
                <div className='flex items-start gap-2 mt-3 sm:mt-4 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800'>
                  <Lock className='h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='text-xs sm:text-sm font-medium text-red-700 dark:text-red-400'>
                      Permissão Bloqueada
                    </p>
                    <p className='text-[10px] sm:text-xs text-red-600 dark:text-red-500 mt-0.5'>
                      As notificações estão bloqueadas no seu navegador. Acesse as configurações do
                      site para permitir notificações.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categorias de notificação */}
        {isSubscribed && (
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
            <div className='p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700'>
              <div className='flex items-center gap-1.5 sm:gap-2'>
                <Settings className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400' />
                <h3 className='text-sm sm:text-base font-semibold'>Tipos de Notificação</h3>
              </div>
              <p className='text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1'>
                Personalize quais alertas você deseja receber. Recomendamos manter segurança sempre
                ativa.
              </p>
            </div>

            <div className='divide-y divide-gray-100 dark:divide-gray-700'>
              {notificationCategories.map(category => (
                <div
                  key={category.key}
                  className='p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                >
                  <div className='flex items-start justify-between gap-3 sm:gap-4'>
                    <div className='flex items-start gap-2 sm:gap-3 flex-1 min-w-0'>
                      <div
                        className={`p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl ${category.bgColor} flex-shrink-0`}
                      >
                        <category.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${category.color}`} />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-1.5 sm:gap-2 flex-wrap'>
                          <span className='text-xs sm:text-sm font-medium'>{category.title}</span>
                          {category.recommended && (
                            <span className='flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 sm:px-2 py-0.5 rounded-full'>
                              <ShieldCheck className='h-2.5 w-2.5 sm:h-3 sm:w-3' />
                              <span className='hidden sm:inline'>Recomendado</span>
                              <span className='sm:hidden'>Rec.</span>
                            </span>
                          )}
                          <span
                            className={`text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                              category.priority === 'Crítica'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                : category.priority === 'Alta'
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                  : category.priority === 'Média'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {category.priority}
                          </span>
                        </div>
                        <p className='text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-0.5'>
                          {category.description}
                        </p>
                        <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block'>
                          {category.details}
                        </p>
                      </div>
                    </div>
                    <label className='relative inline-flex items-center cursor-pointer flex-shrink-0'>
                      <span className='sr-only'>Ativar {category.title}</span>
                      <input
                        type='checkbox'
                        checked={preferences[category.key]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handlePreferenceChange(category.key, e.target.checked)
                        }
                        disabled={isSaving}
                        className='sr-only peer'
                        title={`Ativar notificações de ${category.title}`}
                      />
                      <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Horário de Silêncio */}
        {isSubscribed && (
          <div className='bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700'>
            <div className='flex items-start justify-between gap-3 sm:gap-4'>
              <div className='flex items-start gap-2 sm:gap-3'>
                <div className='p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex-shrink-0'>
                  <Moon className='h-4 w-4 sm:h-5 sm:w-5 text-indigo-500' />
                </div>
                <div>
                  <h3 className='text-xs sm:text-sm font-medium'>Horário de Silêncio</h3>
                  <p className='text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                    Pause notificações durante a noite ou em horários específicos. Ideal para não
                    ser incomodado enquanto descansa.
                  </p>
                </div>
              </div>
              <label className='relative inline-flex items-center cursor-pointer flex-shrink-0'>
                <span className='sr-only'>Ativar horário de silêncio</span>
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
                  title='Ativar horário de silêncio'
                />
                <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {quietHoursEnabled && (
              <div className='mt-3 sm:mt-4 ml-0 sm:ml-12 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'>
                  <div className='space-y-1 sm:space-y-1.5 w-full sm:w-auto'>
                    <label
                      htmlFor='quiet-start'
                      className='text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400'
                    >
                      Início do silêncio
                    </label>
                    <div className='flex items-center gap-1.5 sm:gap-2'>
                      <Clock className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400' />
                      <input
                        id='quiet-start'
                        type='time'
                        value={preferences.quiet_hours_start || '22:00'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleQuietHoursChange(e.target.value, preferences.quiet_hours_end)
                        }
                        title='Horário de início do silêncio'
                        className='w-24 sm:w-28 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                      />
                    </div>
                  </div>
                  <ChevronRight className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hidden sm:block mt-6' />
                  <div className='space-y-1 sm:space-y-1.5 w-full sm:w-auto'>
                    <label
                      htmlFor='quiet-end'
                      className='text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400'
                    >
                      Fim do silêncio
                    </label>
                    <div className='flex items-center gap-1.5 sm:gap-2'>
                      <Clock className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400' />
                      <input
                        id='quiet-end'
                        type='time'
                        value={preferences.quiet_hours_end || '08:00'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleQuietHoursChange(preferences.quiet_hours_start, e.target.value)
                        }
                        title='Horário de fim do silêncio'
                        className='w-24 sm:w-28 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                      />
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 text-[9px] sm:text-xs text-amber-600 dark:text-amber-400'>
                  <AlertTriangle className='h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0' />
                  <span>Notificações de segurança críticas sempre serão enviadas</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dispositivos conectados */}
        {isSubscribed && subscriptions.length > 0 && (
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
            <div className='p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700'>
              <div className='flex items-center gap-1.5 sm:gap-2'>
                <Smartphone className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400' />
                <h3 className='text-sm sm:text-base font-semibold'>Dispositivos Conectados</h3>
              </div>
              <p className='text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1'>
                {subscriptions.length} dispositivo(s) configurado(s) para receber notificações push.
              </p>
            </div>

            <div className='divide-y divide-gray-100 dark:divide-gray-700'>
              {subscriptions.map(sub => (
                <div key={sub.id} className='p-3 sm:p-4 flex items-center justify-between'>
                  <div className='flex items-center gap-2 sm:gap-3'>
                    <div className='p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-700 rounded-lg'>
                      <Smartphone className='h-4 w-4 sm:h-5 sm:w-5 text-gray-500' />
                    </div>
                    <div>
                      <p className='text-xs sm:text-sm font-medium'>
                        {sub.device_info?.platform || 'Dispositivo Desconhecido'}
                      </p>
                      <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
                        Conectado em{' '}
                        {sub.created_at
                          ? new Date(sub.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Data desconhecida'}
                      </p>
                    </div>
                  </div>
                  {sub.is_active && (
                    <span className='flex items-center gap-1 text-[10px] sm:text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full'>
                      <Check className='h-2.5 w-2.5 sm:h-3 sm:w-3' />
                      Ativo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dúvidas frequentes */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700'>
          <div className='flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4'>
            <HelpCircle className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400' />
            <h3 className='text-sm sm:text-base font-semibold'>Dúvidas Frequentes</h3>
          </div>

          <div className='space-y-3 sm:space-y-4'>
            <div>
              <p className='text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300'>
                Por que não recebo notificações?
              </p>
              <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1'>
                Verifique se as notificações estão permitidas nas configurações do navegador e se o
                dispositivo não está no modo "Não Perturbe".
              </p>
            </div>
            <div>
              <p className='text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300'>
                As notificações consomem bateria?
              </p>
              <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1'>
                O impacto na bateria é mínimo. As notificações push são otimizadas para consumir
                poucos recursos do dispositivo.
              </p>
            </div>
            <div>
              <p className='text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300'>
                Posso usar em vários dispositivos?
              </p>
              <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1'>
                Sim! Você pode ativar notificações em quantos dispositivos quiser. Cada um receberá
                os alertas independentemente.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className='text-center py-3 sm:py-4'>
          <p className='text-[9px] sm:text-xs text-gray-500 dark:text-gray-400'>
            As notificações são entregues de forma segura pelo seu navegador.
            <br />
            Seus dados são criptografados e protegidos.
          </p>
        </div>
      </div>
    </div>
  )
}
