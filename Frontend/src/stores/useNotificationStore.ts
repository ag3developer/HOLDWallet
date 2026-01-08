/**
 * WOLK NOW - Notification Store
 * ================================
 *
 * Sistema centralizado de notificações do aplicativo.
 * Gerencia todas as notificações do usuário de forma persistente.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { APP_CONFIG } from '@/config/app'

// Tipos de notificação
export type NotificationType =
  | 'trade' // Ordens P2P
  | 'transaction' // Transações blockchain
  | 'payment' // PIX, pagamentos
  | 'price' // Alertas de preço
  | 'security' // Login, 2FA, segurança
  | 'system' // Sistema, atualizações
  | 'wallet' // Carteiras
  | 'chat' // Mensagens

// Prioridade da notificação
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

// Interface da notificação
export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  read: boolean
  priority: NotificationPriority
  // Dados extras opcionais
  data?:
    | {
        orderId?: string
        txHash?: string
        amount?: number
        symbol?: string
        currency?: string
        percentChange?: number
        ip?: string
        device?: string
        link?: string
      }
    | undefined
}

// Interface do store
interface NotificationStore {
  notifications: AppNotification[]
  unreadCount: number

  // Actions
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  clearOldNotifications: (daysToKeep?: number) => void

  // Helpers
  getUnreadCount: () => number
  getNotificationsByType: (type: NotificationType) => AppNotification[]
}

// Gera ID único
const generateId = (): string => {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: notification => {
        const newNotification: AppNotification = {
          ...notification,
          id: generateId(),
          timestamp: Date.now(),
          read: false,
        }

        set(state => {
          // Limitar a 100 notificações
          const notifications = [newNotification, ...state.notifications].slice(0, 100)
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          }
        })
      },

      markAsRead: id => {
        set(state => {
          const notifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          )
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          }
        })
      },

      markAllAsRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }))
      },

      removeNotification: id => {
        set(state => {
          const notifications = state.notifications.filter(n => n.id !== id)
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          }
        })
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 })
      },

      clearOldNotifications: (daysToKeep = 7) => {
        const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
        set(state => {
          const notifications = state.notifications.filter(n => n.timestamp > cutoff)
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          }
        })
      },

      getUnreadCount: () => {
        return get().notifications.filter(n => !n.read).length
      },

      getNotificationsByType: type => {
        return get().notifications.filter(n => n.type === type)
      },
    }),
    {
      name: `${APP_CONFIG.storage.prefix}notifications`,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
)

// Hook helper para adicionar notificações rapidamente
export const notify = {
  // Notificação de trade/ordem P2P
  trade: (title: string, message: string, data?: AppNotification['data']) => {
    useNotificationStore.getState().addNotification({
      type: 'trade',
      title,
      message,
      priority: 'high',
      data,
    })
  },

  // Notificação de transação blockchain
  transaction: (title: string, message: string, data?: AppNotification['data']) => {
    useNotificationStore.getState().addNotification({
      type: 'transaction',
      title,
      message,
      priority: 'high',
      data,
    })
  },

  // Notificação de pagamento (PIX, etc)
  payment: (title: string, message: string, data?: AppNotification['data']) => {
    useNotificationStore.getState().addNotification({
      type: 'payment',
      title,
      message,
      priority: 'high',
      data,
    })
  },

  // Alerta de preço
  price: (title: string, message: string, data?: AppNotification['data']) => {
    useNotificationStore.getState().addNotification({
      type: 'price',
      title,
      message,
      priority: 'normal',
      data,
    })
  },

  // Notificação de segurança
  security: (title: string, message: string, data?: AppNotification['data']) => {
    useNotificationStore.getState().addNotification({
      type: 'security',
      title,
      message,
      priority: 'urgent',
      data,
    })
  },

  // Notificação do sistema
  system: (title: string, message: string, data?: AppNotification['data']) => {
    useNotificationStore.getState().addNotification({
      type: 'system',
      title,
      message,
      priority: 'normal',
      data,
    })
  },

  // Notificação de carteira
  wallet: (title: string, message: string, data?: AppNotification['data']) => {
    useNotificationStore.getState().addNotification({
      type: 'wallet',
      title,
      message,
      priority: 'normal',
      data,
    })
  },

  // Notificação de chat
  chat: (title: string, message: string, data?: AppNotification['data']) => {
    useNotificationStore.getState().addNotification({
      type: 'chat',
      title,
      message,
      priority: 'normal',
      data,
    })
  },
}

export default useNotificationStore
