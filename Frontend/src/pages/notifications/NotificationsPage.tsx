/**
 * WOLK NOW - Notifications Page
 * ================================
 *
 * Pagina completa para visualizar e gerenciar todas as notificacoes.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ArrowRightLeft,
  Wallet,
  CreditCard,
  TrendingUp,
  Shield,
  Settings,
  MessageSquare,
  Clock,
  ChevronLeft,
  Filter,
  type LucideIcon,
} from 'lucide-react'
import {
  useNotificationStore,
  type AppNotification,
  type NotificationType,
} from '@/stores/useNotificationStore'

// Configuracao de icones por tipo
const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  trade: ArrowRightLeft,
  transaction: Wallet,
  payment: CreditCard,
  price: TrendingUp,
  security: Shield,
  system: Settings,
  wallet: Wallet,
  chat: MessageSquare,
}

// Cores por tipo
const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  trade: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  transaction: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  payment: 'bg-green-500/10 text-green-500 border-green-500/20',
  price: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  security: 'bg-red-500/10 text-red-500 border-red-500/20',
  system: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  wallet: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  chat: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
}

// Labels por tipo
const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  trade: 'Ordem P2P',
  transaction: 'Transacao',
  payment: 'Pagamento',
  price: 'Preco',
  security: 'Seguranca',
  system: 'Sistema',
  wallet: 'Carteira',
  chat: 'Mensagem',
}

// Formatar data completa
const formatFullDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Agrupar por data
const groupByDate = (notifications: AppNotification[]): Map<string, AppNotification[]> => {
  const groups = new Map<string, AppNotification[]>()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  for (const notification of notifications) {
    const date = new Date(notification.timestamp)
    const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    let key: string
    if (notifDate.getTime() === today.getTime()) {
      key = 'Hoje'
    } else if (notifDate.getTime() === yesterday.getTime()) {
      key = 'Ontem'
    } else {
      key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    }

    const existing = groups.get(key) || []
    existing.push(notification)
    groups.set(key, existing)
  }

  return groups
}

export const NotificationsPage = () => {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotificationStore()

  // Filtrar notificacoes
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications
    return notifications.filter(n => n.type === filter)
  }, [notifications, filter])

  // Agrupar por data
  const groupedNotifications = useMemo(() => {
    return groupByDate(filteredNotifications)
  }, [filteredNotifications])

  // Navegar para link da notificacao
  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id)

    if (notification.data?.link) {
      navigate(notification.data.link)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <header className='sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-2xl mx-auto px-4'>
          <div className='flex items-center justify-between h-14'>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate(-1)}
                className='p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
                title='Voltar'
              >
                <ChevronLeft className='w-5 h-5 text-gray-600 dark:text-gray-300' />
              </button>
              <div>
                <h1 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  Notificacoes
                </h1>
                {unreadCount > 0 && (
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {unreadCount} nao lidas
                  </p>
                )}
              </div>
            </div>

            <div className='flex items-center gap-1'>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'}`}
                title='Filtrar'
              >
                <Filter className='w-5 h-5' />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  title='Marcar todas como lidas'
                >
                  <CheckCheck className='w-5 h-5' />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className='p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500'
                  title='Limpar todas'
                >
                  <Trash2 className='w-5 h-5' />
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className='flex items-center gap-2 pb-3 overflow-x-auto scrollbar-hide'>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors
                  ${
                    filter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
              >
                Todas ({notifications.length})
              </button>
              {(Object.keys(NOTIFICATION_LABELS) as NotificationType[]).map(type => {
                const count = notifications.filter(n => n.type === type).length
                if (count === 0) return null
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors
                      ${
                        filter === type
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                  >
                    {NOTIFICATION_LABELS[type]} ({count})
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className='max-w-2xl mx-auto'>
        {filteredNotifications.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-20 px-4'>
            <div className='p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-6'>
              <Bell className='w-12 h-12 text-gray-400' />
            </div>
            <h2 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
              {filter === 'all'
                ? 'Nenhuma notificacao'
                : `Nenhuma notificacao de ${NOTIFICATION_LABELS[filter].toLowerCase()}`}
            </h2>
            <p className='text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs'>
              Suas atividades e alertas importantes aparecerao aqui.
            </p>
          </div>
        ) : (
          Array.from(groupedNotifications.entries()).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              {/* Date Header */}
              <div className='sticky top-14 z-[5] bg-gray-50 dark:bg-gray-900 px-4 py-2'>
                <span className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                  {dateLabel}
                </span>
              </div>

              {/* Notifications */}
              <div className='bg-white dark:bg-gray-800'>
                {items.map(notification => {
                  const Icon = NOTIFICATION_ICONS[notification.type]
                  const colorClass = NOTIFICATION_COLORS[notification.type]
                  const label = NOTIFICATION_LABELS[notification.type]

                  return (
                    <button
                      key={notification.id}
                      type='button'
                      onClick={() => handleNotificationClick(notification)}
                      className={`
                        w-full text-left p-4 border-b border-gray-100 dark:border-gray-700/50
                        ${notification.read ? 'bg-transparent' : 'bg-blue-50/50 dark:bg-blue-900/10'}
                        hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                        group relative
                      `}
                    >
                      {/* Indicador de nao lido */}
                      {!notification.read && (
                        <div className='absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full' />
                      )}

                      <div className='flex items-start gap-3 pl-3'>
                        {/* Icone */}
                        <div className={`p-2.5 rounded-xl border ${colorClass} flex-shrink-0`}>
                          <Icon className='w-5 h-5' />
                        </div>

                        {/* Conteudo */}
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center justify-between gap-2 mb-1'>
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider ${colorClass.split(' ')[1]}`}
                            >
                              {label}
                            </span>
                            <span className='text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1'>
                              <Clock className='w-3 h-3' />
                              {formatFullDate(notification.timestamp)}
                            </span>
                          </div>

                          <h4 className='text-sm font-medium text-gray-900 dark:text-white'>
                            {notification.title}
                          </h4>
                          <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                            {notification.message}
                          </p>

                          {/* Dados extras */}
                          {notification.data?.amount && notification.data?.symbol && (
                            <div className='mt-2 flex items-center gap-2'>
                              <span className='text-sm font-mono font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded'>
                                {notification.data.amount} {notification.data.symbol}
                              </span>
                              {notification.data.percentChange !== undefined && (
                                <span
                                  className={`text-sm font-medium ${notification.data.percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
                                >
                                  {notification.data.percentChange >= 0 ? '+' : ''}
                                  {notification.data.percentChange.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Acoes */}
                        <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                          {!notification.read && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              className='p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                              title='Marcar como lido'
                            >
                              <Check className='w-4 h-4' />
                            </button>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              removeNotification(notification.id)
                            }}
                            className='p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500'
                            title='Remover'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}

export default NotificationsPage
