/**
 * 💬 WOLK NOW - useChatRooms Hook
 * ==================================
 * Hook para gerenciar salas de chat
 * - Carrega conversas do usuário
 * - Gerencia estado de não lidas
 * - Atualiza em tempo real
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { chatRoomsService, ChatRoomSummary } from '@/services/chatRooms'
import { useAuthStore } from '@/stores/useAuthStore'

interface UseChatRoomsOptions {
  /** Intervalo de polling para atualizar (ms) - 0 para desabilitar */
  pollingInterval?: number
  /** Carregar apenas salas ativas */
  activeOnly?: boolean
  /** Auto carregar ao montar */
  autoLoad?: boolean
}

interface ChatContact {
  id: number
  name: string
  avatar: string
  avatarColor: string
  lastMessage: string
  timestamp: string
  unread: number
  isOnline: boolean
  isSupport: boolean
  rating: number
  roomId: string // ID real da sala para WebSocket
}

export function useChatRooms(options: UseChatRoomsOptions = {}) {
  const { pollingInterval = 30000, activeOnly = true, autoLoad = true } = options

  const { isAuthenticated, token } = useAuthStore()

  const [rooms, setRooms] = useState<ChatRoomSummary[]>([])
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  /**
   * Carregar salas de chat
   */
  const loadRooms = useCallback(async () => {
    if (!isAuthenticated || !token) {
      console.log('⏭️ [useChatRooms] Not authenticated, skipping load')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await chatRoomsService.getRooms({ activeOnly })

      if (!isMountedRef.current) return

      setRooms(response.rooms)

      // Converter para formato de contatos
      const contactsList = response.rooms.map((room, index) =>
        chatRoomsService.roomToContact(room, index)
      )
      setContacts(contactsList)

      console.log('✅ [useChatRooms] Loaded', response.rooms.length, 'rooms')
    } catch (err: any) {
      if (!isMountedRef.current) return
      console.error('❌ [useChatRooms] Error loading rooms:', err)
      setError(err.message || 'Erro ao carregar conversas')
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [isAuthenticated, token, activeOnly])

  /**
   * Carregar total de não lidas
   */
  const loadTotalUnread = useCallback(async () => {
    if (!isAuthenticated || !token) return

    try {
      const response = await chatRoomsService.getTotalUnread()
      if (isMountedRef.current) {
        setTotalUnread(response.total_unread)
      }
    } catch (err) {
      console.error('❌ [useChatRooms] Error loading total unread:', err)
    }
  }, [isAuthenticated, token])

  /**
   * Marcar sala como lida
   */
  const markRoomAsRead = useCallback(async (roomId: string) => {
    try {
      const response = await chatRoomsService.markAsRead(roomId)

      if (response.messages_marked > 0) {
        // Atualizar estado local
        setRooms(prev =>
          prev.map(room => (room.room_id === roomId ? { ...room, unread_count: 0 } : room))
        )

        setContacts(prev =>
          prev.map(contact => (contact.roomId === roomId ? { ...contact, unread: 0 } : contact))
        )

        // Atualizar total
        setTotalUnread(prev => Math.max(0, prev - response.messages_marked))
      }

      return response
    } catch (err) {
      console.error('❌ [useChatRooms] Error marking as read:', err)
      throw err
    }
  }, [])

  /**
   * Refresh manual
   */
  const refresh = useCallback(async () => {
    await Promise.all([loadRooms(), loadTotalUnread()])
  }, [loadRooms, loadTotalUnread])

  /**
   * Encontrar roomId pelo ID do contato
   */
  const getRoomIdByContactId = useCallback(
    (contactId: number): string | null => {
      const contact = contacts.find(c => c.id === contactId)
      return contact?.roomId || null
    },
    [contacts]
  )

  /**
   * Encontrar contato pelo roomId
   */
  const getContactByRoomId = useCallback(
    (roomId: string): ChatContact | null => {
      return contacts.find(c => c.roomId === roomId) || null
    },
    [contacts]
  )

  // Auto-load na montagem
  useEffect(() => {
    isMountedRef.current = true

    if (autoLoad && isAuthenticated && token) {
      loadRooms()
      loadTotalUnread()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [autoLoad, isAuthenticated, token, loadRooms, loadTotalUnread])

  // Polling para atualizar periodicamente
  useEffect(() => {
    if (!isAuthenticated || !token || pollingInterval <= 0) {
      return
    }

    pollingRef.current = setInterval(() => {
      loadTotalUnread()
    }, pollingInterval)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [isAuthenticated, token, pollingInterval, loadTotalUnread])

  return {
    // Estado
    rooms,
    contacts,
    totalUnread,
    isLoading,
    error,

    // Ações
    loadRooms,
    loadTotalUnread,
    markRoomAsRead,
    refresh,

    // Helpers
    getRoomIdByContactId,
    getContactByRoomId,
  }
}

export default useChatRooms
