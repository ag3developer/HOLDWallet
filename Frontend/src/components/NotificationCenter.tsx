/**
 * WOLK NOW - Notification Center
 * ================================
 *
 * Centro de notificações do aplicativo.
 * Design profissional, compacto e responsivo.
 */

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Bell,
  X,
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
  ChevronRight,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import {
  useNotificationStore,
  type AppNotification,
  type NotificationType,
} from '@/stores/useNotificationStore'
import { useNavigate } from 'react-router-dom'

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

// Formatar tempo relativo
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Agora'
  if (minutes < 60) return `${minutes}min`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`

  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

// Componente de item de notificacao
interface NotificationItemProps {
  notification: AppNotification
  onMarkRead: (id: string) => void
  onRemove: (id: string) => void
  onClick?: () => void
}

const NotificationItem = ({
  notification,
  onMarkRead,
  onRemove,
  onClick,
}: NotificationItemProps) => {
  const Icon = NOTIFICATION_ICONS[notification.type]
  const colorClass = NOTIFICATION_COLORS[notification.type]
  const label = NOTIFICATION_LABELS[notification.type]

  return (
    <button
      type='button'
      onClick={onClick}
      className={`
        w-full text-left relative p-3 border-b border-gray-100 dark:border-gray-700/50
        ${notification.read ? 'bg-transparent' : 'bg-blue-50/50 dark:bg-blue-900/10'}
        hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors
        group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
      `}
    >
      {/* Indicador de nao lido */}
      {!notification.read && (
        <div className='absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full' />
      )}

      <div className='flex items-start gap-3 pl-2'>
        {/* Icone */}
        <div className={`p-2 rounded-lg border ${colorClass} flex-shrink-0`}>
          <Icon className='w-4 h-4' />
        </div>

        {/* Conteudo */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between gap-2 mb-0.5'>
            <span
              className={`text-[10px] font-medium uppercase tracking-wider ${colorClass.split(' ')[1]}`}
            >
              {label}
            </span>
            <span className='text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1'>
              <Clock className='w-3 h-3' />
              {formatRelativeTime(notification.timestamp)}
            </span>
          </div>

          <h4 className='text-sm font-medium text-gray-900 dark:text-white truncate'>
            {notification.title}
          </h4>
          <p className='text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5'>
            {notification.message}
          </p>

          {/* Dados extras */}
          {notification.data?.amount && notification.data?.symbol && (
            <div className='mt-1.5 flex items-center gap-2'>
              <span className='text-xs font-mono font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded'>
                {notification.data.amount} {notification.data.symbol}
              </span>
              {notification.data.percentChange !== undefined && (
                <span
                  className={`text-xs font-medium ${notification.data.percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
                >
                  {notification.data.percentChange >= 0 ? '+' : ''}
                  {notification.data.percentChange.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Acoes (aparecem no hover) */}
        <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
          {!notification.read && (
            <button
              onClick={e => {
                e.stopPropagation()
                onMarkRead(notification.id)
              }}
              className='p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              title='Marcar como lido'
            >
              <Check className='w-3.5 h-3.5' />
            </button>
          )}
          <button
            onClick={e => {
              e.stopPropagation()
              onRemove(notification.id)
            }}
            className='p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500'
            title='Remover'
          >
            <Trash2 className='w-3.5 h-3.5' />
          </button>
        </div>
      </div>
    </button>
  )
}

// Componente principal
interface NotificationCenterProps {
  className?: string
}

export const NotificationCenter = ({ className }: NotificationCenterProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotificationStore()

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Filtrar notificacoes
  const filteredNotifications =
    filter === 'all' ? notifications : notifications.filter(n => n.type === filter)

  // Navegar para link da notificacao
  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id)

    if (notification.data?.link) {
      navigate(notification.data.link)
      setIsOpen(false)
    }
  }

  const panel = isOpen && (
    <div
      ref={panelRef}
      className='fixed sm:absolute right-0 sm:right-0 top-0 sm:top-full sm:mt-2
                 w-full sm:w-96 h-full sm:h-auto sm:max-h-[70vh]
                 bg-white dark:bg-gray-800 
                 sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
                 z-[9999] flex flex-col overflow-hidden
                 animate-in slide-in-from-right sm:slide-in-from-top-2 sm:zoom-in-95 duration-200'
    >
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
            <Bell className='w-5 h-5 text-blue-600 dark:text-blue-400' />
          </div>
          <div>
            <h3 className='font-semibold text-gray-900 dark:text-white'>Notificacoes</h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {unreadCount > 0 ? `${unreadCount} nao lidas` : 'Todas lidas'}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-1'>
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
          <button
            onClick={() => setIsOpen(false)}
            className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 sm:hidden'
            title='Fechar'
          >
            <X className='w-5 h-5' />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className='flex items-center gap-1 p-2 border-b border-gray-100 dark:border-gray-700/50 overflow-x-auto scrollbar-hide'>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors
            ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
        >
          Todas
        </button>
        {(['trade', 'transaction', 'payment', 'security'] as NotificationType[]).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors
              ${
                filter === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            {NOTIFICATION_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Lista de notificacoes */}
      <div className='flex-1 overflow-y-auto'>
        {filteredNotifications.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 px-4'>
            <div className='p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4'>
              <Bell className='w-8 h-8 text-gray-400' />
            </div>
            <p className='text-gray-500 dark:text-gray-400 text-center'>
              {filter === 'all'
                ? 'Nenhuma notificacao ainda'
                : `Nenhuma notificacao de ${NOTIFICATION_LABELS[filter].toLowerCase()}`}
            </p>
            <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
              Suas atividades aparecerao aqui
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={markAsRead}
              onRemove={removeNotification}
              onClick={() => handleNotificationClick(notification)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 5 && (
        <div className='p-3 border-t border-gray-200 dark:border-gray-700'>
          <button
            onClick={() => {
              navigate('/notifications')
              setIsOpen(false)
            }}
            className='w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
          >
            Ver todas as notificacoes
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className={`relative ${className}`}>
      {/* Botao de notificacoes */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
        title='Notificacoes'
      >
        <Bell className='w-5 h-5' />

        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <span className='absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-in zoom-in duration-200'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Portal para o painel */}
      {typeof document !== 'undefined' && createPortal(panel, document.body)}
    </div>
  )
}

export default NotificationCenter
