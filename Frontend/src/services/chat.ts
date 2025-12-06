import { ChatConversation, ChatMessage, User, MessageAttachment, ApiResponse, PaginatedResponse } from '@/types'
import { apiClient } from './api'
import { APP_CONFIG } from '@/config/app'

interface SendMessageRequest {
  conversationId: string
  content: string
  type?: 'text' | 'image' | 'file' | 'payment_proof'
  replyTo?: string
  attachments?: File[]
}

interface CreateConversationRequest {
  type: 'direct' | 'group' | 'trade'
  participantIds: string[]
  name?: string
  tradeId?: string
}

interface ConversationFilters {
  type?: 'direct' | 'group' | 'trade'
  archived?: boolean
  unread?: boolean
}

interface MessageFilters {
  type?: string
  startDate?: string
  endDate?: string
  hasAttachments?: boolean
}

class ChatService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = APP_CONFIG.chat.reconnectAttempts
  private reconnectInterval = APP_CONFIG.chat.reconnectInterval
  private isConnecting = false
  private messageListeners: ((message: ChatMessage) => void)[] = []
  private statusListeners: ((status: 'connected' | 'disconnected' | 'connecting' | 'error') => void)[] = []
  private typingListeners: ((data: { conversationId: string; userId: string; isTyping: boolean }) => void)[] = []

  // WebSocket connection management
  async connect(token: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true
    this.notifyStatus('connecting')

    try {
      const wsUrl = `${APP_CONFIG.api.wsUrl}/ws/chat?token=${encodeURIComponent(token)}`
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('Chat WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.notifyStatus('connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('Chat WebSocket disconnected')
        this.isConnecting = false
        this.notifyStatus('disconnected')
        this.handleReconnect(token)
      }

      this.ws.onerror = (error) => {
        console.error('Chat WebSocket error:', error)
        this.isConnecting = false
        this.notifyStatus('error')
      }
    } catch (error) {
      this.isConnecting = false
      this.notifyStatus('error')
      throw error
    }
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'message':
        this.messageListeners.forEach(listener => listener(data.message))
        break
      case 'typing':
        this.typingListeners.forEach(listener => listener(data))
        break
      case 'status':
        // Handle status updates (user online/offline, etc.)
        break
      default:
        console.log('Unknown WebSocket message type:', data.type)
    }
  }

  private handleReconnect(token: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      
      setTimeout(() => {
        this.connect(token).catch(error => {
          console.error('Reconnection failed:', error)
        })
      }, this.reconnectInterval * this.reconnectAttempts)
    } else {
      console.log('Max reconnection attempts reached')
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private notifyStatus(status: 'connected' | 'disconnected' | 'connecting' | 'error'): void {
    this.statusListeners.forEach(listener => listener(status))
  }

  // Event listeners
  onMessage(callback: (message: ChatMessage) => void): () => void {
    this.messageListeners.push(callback)
    return () => {
      const index = this.messageListeners.indexOf(callback)
      if (index > -1) this.messageListeners.splice(index, 1)
    }
  }

  onStatus(callback: (status: 'connected' | 'disconnected' | 'connecting' | 'error') => void): () => void {
    this.statusListeners.push(callback)
    return () => {
      const index = this.statusListeners.indexOf(callback)
      if (index > -1) this.statusListeners.splice(index, 1)
    }
  }

  onTyping(callback: (data: { conversationId: string; userId: string; isTyping: boolean }) => void): () => void {
    this.typingListeners.push(callback)
    return () => {
      const index = this.typingListeners.indexOf(callback)
      if (index > -1) this.typingListeners.splice(index, 1)
    }
  }

  // Chat API methods
  async getConversations(page = 1, limit = 20, filters?: ConversationFilters): Promise<PaginatedResponse<ChatConversation>> {
    const params = { page: page.toString(), limit: limit.toString(), ...filters }
    const response = await apiClient.get<PaginatedResponse<ChatConversation>>('/chat/conversations', { params })
    return response.data
  }

  async getConversation(conversationId: string): Promise<ChatConversation> {
    const response = await apiClient.get<ApiResponse<ChatConversation>>(`/chat/conversations/${conversationId}`)
    return response.data.data
  }

  async createConversation(conversationData: CreateConversationRequest): Promise<ChatConversation> {
    const response = await apiClient.post<ApiResponse<ChatConversation>>('/chat/conversations', conversationData)
    return response.data.data
  }

  async updateConversation(conversationId: string, updates: { name?: string; isArchived?: boolean; isMuted?: boolean }): Promise<ChatConversation> {
    const response = await apiClient.put<ApiResponse<ChatConversation>>(`/chat/conversations/${conversationId}`, updates)
    return response.data.data
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}`)
  }

  async getMessages(
    conversationId: string,
    page = 1,
    limit = 50,
    filters?: MessageFilters
  ): Promise<PaginatedResponse<ChatMessage>> {
    const params = { page: page.toString(), limit: limit.toString(), ...filters }
    const response = await apiClient.get<PaginatedResponse<ChatMessage>>(`/chat/conversations/${conversationId}/messages`, { params })
    return response.data
  }

  async sendMessage(messageData: SendMessageRequest): Promise<ChatMessage> {
    if (messageData.attachments && messageData.attachments.length > 0) {
      // Send with file attachments
      const formData = new FormData()
      formData.append('content', messageData.content)
      formData.append('type', messageData.type || 'text')
      if (messageData.replyTo) {
        formData.append('replyTo', messageData.replyTo)
      }

      messageData.attachments.forEach((file, index) => {
        formData.append(`attachments_${index}`, file)
      })

      const response = await apiClient.post<ApiResponse<ChatMessage>>(
        `/chat/conversations/${messageData.conversationId}/messages`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      return response.data.data
    } else {
      // Send text message via WebSocket if connected, otherwise via API
      if (this.ws?.readyState === WebSocket.OPEN) {
        const wsMessage = {
          type: 'send_message',
          conversationId: messageData.conversationId,
          content: messageData.content,
          messageType: messageData.type || 'text',
          replyTo: messageData.replyTo
        }
        this.ws.send(JSON.stringify(wsMessage))
        
        // For WebSocket messages, we'll return a placeholder that will be replaced
        // when the actual message comes back via WebSocket
        return {
          id: 'temp_' + Date.now(),
          conversationId: messageData.conversationId,
          senderId: '', // Will be filled by WebSocket response
          content: messageData.content,
          type: messageData.type || 'text',
          replyTo: messageData.replyTo,
          status: 'sending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as ChatMessage
      } else {
        // Fallback to HTTP API
        const response = await apiClient.post<ApiResponse<ChatMessage>>(
          `/chat/conversations/${messageData.conversationId}/messages`,
          {
            content: messageData.content,
            type: messageData.type || 'text',
            replyTo: messageData.replyTo
          }
        )
        return response.data.data
      }
    }
  }

  async markAsRead(conversationId: string, messageId?: string): Promise<void> {
    await apiClient.post(`/chat/conversations/${conversationId}/read`, {
      messageId
    })
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}/messages/${messageId}`)
  }

  async editMessage(conversationId: string, messageId: string, content: string): Promise<ChatMessage> {
    const response = await apiClient.put<ApiResponse<ChatMessage>>(
      `/chat/conversations/${conversationId}/messages/${messageId}`,
      { content }
    )
    return response.data.data
  }

  async addReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    await apiClient.post(`/chat/conversations/${conversationId}/messages/${messageId}/reactions`, {
      emoji
    })
  }

  async removeReaction(conversationId: string, messageId: string, emoji: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${conversationId}/messages/${messageId}/reactions/${emoji}`)
  }

  async sendTyping(conversationId: string, isTyping: boolean): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'typing',
        conversationId,
        isTyping
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  async searchMessages(query: string, conversationId?: string, page = 1, limit = 20): Promise<PaginatedResponse<ChatMessage>> {
    const params: Record<string, string> = {
      q: query,
      page: page.toString(),
      limit: limit.toString()
    }
    if (conversationId) {
      params.conversationId = conversationId
    }

    const response = await apiClient.get<PaginatedResponse<ChatMessage>>('/chat/search', { params })
    return response.data
  }

  async uploadAttachment(file: File, onProgress?: (progress: number) => void): Promise<MessageAttachment> {
    const response = await apiClient.uploadFile<ApiResponse<MessageAttachment>>('/chat/upload', file, onProgress)
    return response.data.data
  }

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/chat/unread-count')
    return response.data.data.count
  }
}

export const chatService = new ChatService()
