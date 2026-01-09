/**
 * 💬 WOLK NOW - Chat Rooms Service
 * ==================================
 * Serviço para gerenciar salas de chat via API REST
 * - Listar conversas do usuário
 * - Marcar mensagens como lidas
 * - Obter contagem de não lidas
 */

import { apiClient } from './api'

// ==================== INTERFACES ====================

export interface ChatRoomUser {
  id: string
  name: string
  avatar?: string | null
}

export interface LastMessage {
  content: string
  sender_id: string
  created_at: string
  is_own: boolean
  message_type: string
}

export interface ChatRoomSummary {
  room_id: string
  match_id: string | null
  is_active: boolean
  created_at: string
  closed_at: string | null
  other_user: ChatRoomUser
  last_message: LastMessage | null
  unread_count: number
}

export interface GetRoomsResponse {
  success: boolean
  rooms: ChatRoomSummary[]
  total: number
  has_more: boolean
}

export interface MarkAsReadResponse {
  success: boolean
  messages_marked: number
  room_id: string
}

export interface UnreadCountResponse {
  success: boolean
  unread_count: number
  room_id: string
}

export interface TotalUnreadResponse {
  success: boolean
  total_unread: number
  rooms_with_unread: Array<{
    room_id: string
    unread_count: number
  }>
}

// ==================== CHAT ROOMS SERVICE ====================

class ChatRoomsService {
  private baseUrl = '/chat'

  /**
   * Listar todas as conversas do usuário
   */
  async getRooms(options?: {
    limit?: number
    offset?: number
    activeOnly?: boolean
  }): Promise<GetRoomsResponse> {
    try {
      const params = new URLSearchParams()
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset.toString())
      if (options?.activeOnly !== undefined)
        params.append('active_only', options.activeOnly.toString())

      const url = `${this.baseUrl}/rooms${params.toString() ? `?${params.toString()}` : ''}`
      const response = await apiClient.get<GetRoomsResponse>(url)

      console.log('📋 [ChatRooms] Rooms loaded:', response.data.rooms?.length || 0)
      return response.data
    } catch (error) {
      console.error('❌ [ChatRooms] Error fetching rooms:', error)
      throw error
    }
  }

  /**
   * Marcar todas as mensagens de uma sala como lidas
   */
  async markAsRead(roomId: string): Promise<MarkAsReadResponse> {
    try {
      const response = await apiClient.put<MarkAsReadResponse>(
        `${this.baseUrl}/rooms/${roomId}/read`
      )
      console.log('✅ [ChatRooms] Marked as read:', response.data.messages_marked, 'messages')
      return response.data
    } catch (error) {
      console.error('❌ [ChatRooms] Error marking as read:', error)
      throw error
    }
  }

  /**
   * Obter contagem de mensagens não lidas em uma sala
   */
  async getUnreadCount(roomId: string): Promise<UnreadCountResponse> {
    try {
      const response = await apiClient.get<UnreadCountResponse>(
        `${this.baseUrl}/rooms/${roomId}/unread-count`
      )
      return response.data
    } catch (error) {
      console.error('❌ [ChatRooms] Error fetching unread count:', error)
      throw error
    }
  }

  /**
   * Obter total de mensagens não lidas em todas as salas
   * Útil para badge no ícone de chat
   */
  async getTotalUnread(): Promise<TotalUnreadResponse> {
    try {
      const response = await apiClient.get<TotalUnreadResponse>(`${this.baseUrl}/unread-total`)
      console.log('🔔 [ChatRooms] Total unread:', response.data.total_unread)
      return response.data
    } catch (error) {
      console.error('❌ [ChatRooms] Error fetching total unread:', error)
      throw error
    }
  }

  /**
   * Converter ChatRoomSummary para formato de Contact usado no ChatPage
   */
  roomToContact(
    room: ChatRoomSummary,
    index: number
  ): {
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
    roomId: string
  } {
    // Formatar timestamp da última mensagem
    let timestamp = ''
    if (room.last_message?.created_at) {
      const date = new Date(room.last_message.created_at)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()

      if (isToday) {
        timestamp = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      } else {
        timestamp = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }
    }

    // Formatar última mensagem
    let lastMessage = 'Iniciar conversa...'
    if (room.last_message?.content) {
      const content = room.last_message.content
      lastMessage = content.length > 40 ? content.substring(0, 40) + '...' : content

      // Adicionar indicador se é própria mensagem
      if (room.last_message.is_own) {
        lastMessage = `Você: ${lastMessage}`
      }
    }

    // Gerar cor do avatar baseado no ID
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
      'from-indigo-500 to-blue-600',
      'from-yellow-500 to-orange-600',
    ]
    const colorIndex = room.room_id.charCodeAt(0) % colors.length

    return {
      id: 1000 + index, // IDs começam em 1000 para não conflitar com outros
      name: room.other_user.name || `Usuário ${room.other_user.id.substring(0, 8)}`,
      avatar: room.other_user.avatar || 'user',
      avatarColor: colors[colorIndex] || 'from-blue-500 to-purple-600',
      lastMessage,
      timestamp,
      unread: room.unread_count,
      isOnline: room.is_active, // Podemos melhorar isso com presença real
      isSupport: false,
      rating: 0, // Podemos buscar do perfil do usuário
      roomId: room.room_id, // ID real da sala para conexão WebSocket
    }
  }
}

// Singleton
export const chatRoomsService = new ChatRoomsService()
export default chatRoomsService
