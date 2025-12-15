/**
 * 💬 Wolknow - Chat P2P Service
 * ==================================
 * Serviço específico para chat em transações P2P
 * com WebSocket, upload de comprovantes e gerenciamento de salas
 */

import { apiClient } from './api'
import { APP_CONFIG } from '@/config/app'

// ==================== INTERFACES ====================

export interface ChatRoom {
  id: string
  match_id: string
  buyer_id: string
  seller_id: string
  is_active: boolean
  created_at: string
  closed_at?: string
  auto_delete_at?: string
}

export interface ChatMessageP2P {
  id: string
  chat_room_id: string
  sender_id: string
  message_type: 'text' | 'image' | 'document' | 'payment_proof' | 'system' | 'escrow_notification'
  content?: string
  attachments?: any[]
  created_at: string
  edited_at?: string
  is_read: boolean
  is_system_message: boolean
}

export interface P2POrder {
  id: string
  user_id: string
  type: 'buy' | 'sell'
  cryptocurrency: string
  amount: string
  price: string
  total: string
  min_amount: string
  max_amount: string
  fiat_currency: string
  payment_methods: string[]
  time_limit: number
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed'
  expires_at?: string
  trade_id?: string
  user?: {
    id: string
    name: string
    avatar?: string
    rating?: number
    total_trades?: number
  }
}

export interface FileUploadResult {
  file_id: string
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_at: string
}

export interface ChatHistoryResponse {
  success: boolean
  messages: ChatMessageP2P[]
  total_messages: number
  has_more: boolean
}

export interface CreateChatRoomResponse {
  success: boolean
  chat_room: ChatRoom
  message: string
}

// ==================== CHAT P2P SERVICE ====================

class ChatP2PService {
  private ws: WebSocket | null = null
  private currentRoomId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000
  private isConnecting = false

  // Event listeners
  private messageListeners: ((message: ChatMessageP2P) => void)[] = []
  private statusListeners: ((
    status: 'connected' | 'disconnected' | 'connecting' | 'error'
  ) => void)[] = []
  private typingListeners: ((data: { user_id: string; is_typing: boolean }) => void)[] = []
  private connectionEstablishedListeners: ((data: any) => void)[] = []

  // ==================== WEBSOCKET ====================

  /**
   * Conectar ao WebSocket do chat P2P
   */
  async connectToRoom(chatRoomId: string, token: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.currentRoomId === chatRoomId) {
      return // Já conectado à sala
    }

    // Desconectar da sala anterior se houver
    if (this.ws && this.currentRoomId !== chatRoomId) {
      this.disconnect()
    }

    this.isConnecting = true
    this.currentRoomId = chatRoomId
    this.notifyStatus('connecting')

    try {
      // URL do WebSocket com autenticação JWT
      const wsBaseUrl = APP_CONFIG.api.wsUrl || 'ws://localhost:8000'
      const wsUrl = `${wsBaseUrl}/chat/ws/${chatRoomId}?token=${encodeURIComponent(token)}`

      console.log(`🔌 Connecting to P2P Chat WebSocket: ${chatRoomId}`)
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('✅ P2P Chat WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.notifyStatus('connected')
      }

      this.ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = event => {
        console.log('🔌 P2P Chat WebSocket disconnected', event.code, event.reason)
        this.isConnecting = false
        this.notifyStatus('disconnected')

        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && this.currentRoomId) {
          this.handleReconnect(chatRoomId, token)
        }
      }

      this.ws.onerror = error => {
        console.error('❌ P2P Chat WebSocket error:', error)
        this.isConnecting = false
        this.notifyStatus('error')
      }
    } catch (error) {
      this.isConnecting = false
      this.notifyStatus('error')
      console.error('❌ Failed to connect to WebSocket:', error)
      throw error
    }
  }

  /**
   * Processar mensagens recebidas via WebSocket
   */
  private handleMessage(data: any): void {
    console.log('📨 WebSocket message received:', data.type)

    switch (data.type) {
      case 'connection_established':
        console.log('✅ Connection established:', data)
        this.connectionEstablishedListeners.forEach(listener => listener(data))
        break

      case 'message':
        // Nova mensagem recebida
        if (data.data) {
          this.messageListeners.forEach(listener => listener(data.data))
        }
        break

      case 'message_sent':
        // Confirmação de mensagem enviada
        console.log('✅ Message sent confirmed:', data.message_id)
        break

      case 'typing':
        // Alguém está digitando
        this.typingListeners.forEach(listener =>
          listener({ user_id: data.user_id, is_typing: data.is_typing })
        )
        break

      case 'user_status':
        // Status de usuário (online/offline)
        console.log('👤 User status:', data)
        break

      case 'error':
        console.error('❌ WebSocket error:', data.message)
        break

      case 'pong':
        // Resposta ao ping (keep-alive)
        break

      default:
        console.log('❓ Unknown WebSocket message type:', data.type)
    }
  }

  /**
   * Reconectar ao WebSocket
   */
  private handleReconnect(chatRoomId: string, token: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(
        `🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      )

      setTimeout(() => {
        this.connectToRoom(chatRoomId, token).catch(error => {
          console.error('❌ Reconnection failed:', error)
        })
      }, this.reconnectInterval * this.reconnectAttempts)
    } else {
      console.log('❌ Max reconnection attempts reached')
    }
  }

  /**
   * Desconectar do WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
      this.currentRoomId = null
      this.reconnectAttempts = 0
    }
  }

  /**
   * Notificar listeners sobre mudança de status
   */
  private notifyStatus(status: 'connected' | 'disconnected' | 'connecting' | 'error'): void {
    this.statusListeners.forEach(listener => listener(status))
  }

  // ==================== ENVIAR MENSAGENS ====================

  /**
   * Enviar mensagem de texto
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const message = {
      type: 'message',
      content,
      attachments: [],
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Enviar mensagem de áudio
   */
  async sendAudioMessage(audioBlob: Blob): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    // Converter blob para base64
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const base64Audio = reader.result as string
        const message = {
          type: 'message',
          message_type: 'audio',
          content: 'Mensagem de áudio',
          attachments: [
            {
              type: 'audio',
              data: base64Audio,
              size: audioBlob.size,
              timestamp: new Date().toISOString(),
            },
          ],
        }

        try {
          this.ws!.send(JSON.stringify(message))
          resolve()
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo de áudio'))
      }

      reader.readAsDataURL(audioBlob)
    })
  }

  /**
   * Notificar que está digitando
   */
  async sendTyping(isTyping: boolean): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message = {
      type: 'typing',
      is_typing: isTyping,
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Enviar ping para manter conexão ativa
   */
  async sendPing(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    this.ws.send(JSON.stringify({ type: 'ping' }))
  }

  // ==================== API REST ====================

  /**
   * Criar sala de chat para transação P2P
   */
  async createChatRoom(
    matchId: string,
    buyerId: string,
    sellerId: string
  ): Promise<CreateChatRoomResponse> {
    const formData = new FormData()
    formData.append('buyer_id', buyerId)
    formData.append('seller_id', sellerId)

    const response = await apiClient.post<CreateChatRoomResponse>(
      `/chat/rooms/${matchId}/create`,
      formData
    )
    return response.data
  }

  /**
   * Obter histórico de mensagens
   */
  async getChatHistory(
    chatRoomId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatHistoryResponse> {
    const response = await apiClient.get<ChatHistoryResponse>(
      `/chat/rooms/${chatRoomId}/history`,
      {
        params: { limit, offset },
      }
    )
    return response.data
  }

  /**
   * Upload de arquivo (comprovante de pagamento)
   */
  async uploadFile(
    chatRoomId: string,
    file: File,
    messageContent: string = '',
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('message_content', messageContent)

    const response = await apiClient.post<{ success: boolean; file: FileUploadResult }>(
      `/chat/rooms/${chatRoomId}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(progress)
          }
        },
      }
    )

    return response.data.file
  }

  /**
   * Baixar arquivo
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/chat/files/${fileId}/download`, {
      responseType: 'blob',
    })
    return response.data
  }

  /**
   * Criar disputa
   */
  async createDispute(matchId: string, reason: string, evidenceMessages: string[]): Promise<any> {
    const formData = new FormData()
    formData.append('match_id', matchId)
    formData.append('reason', reason)
    evidenceMessages.forEach(msg => formData.append('evidence_messages', msg))

    const response = await apiClient.post(`/chat/disputes/create`, formData)
    return response.data
  }

  /**
   * Buscar ordem P2P por ID
   */
  async getOrder(orderId: string): Promise<P2POrder> {
    const response = await apiClient.get<{ success: boolean; data: P2POrder }>(
      `/p2p/orders/${orderId}`
    )
    return response.data.data
  }

  /**
   * Confirmar pagamento
   */
  async confirmPayment(tradeId: string): Promise<any> {
    const response = await apiClient.post(`/p2p/trades/${tradeId}/confirm-payment`)
    return response.data
  }

  /**
   * Cancelar trade
   */
  async cancelTrade(tradeId: string, reason: string): Promise<any> {
    const response = await apiClient.post(`/p2p/trades/${tradeId}/cancel`, { reason })
    return response.data
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Registrar listener para novas mensagens
   */
  onMessage(callback: (message: ChatMessageP2P) => void): () => void {
    this.messageListeners.push(callback)
    return () => {
      const index = this.messageListeners.indexOf(callback)
      if (index > -1) this.messageListeners.splice(index, 1)
    }
  }

  /**
   * Registrar listener para status da conexão
   */
  onStatus(
    callback: (status: 'connected' | 'disconnected' | 'connecting' | 'error') => void
  ): () => void {
    this.statusListeners.push(callback)
    return () => {
      const index = this.statusListeners.indexOf(callback)
      if (index > -1) this.statusListeners.splice(index, 1)
    }
  }

  /**
   * Registrar listener para typing indicator
   */
  onTyping(callback: (data: { user_id: string; is_typing: boolean }) => void): () => void {
    this.typingListeners.push(callback)
    return () => {
      const index = this.typingListeners.indexOf(callback)
      if (index > -1) this.typingListeners.splice(index, 1)
    }
  }

  /**
   * Registrar listener para conexão estabelecida
   */
  onConnectionEstablished(callback: (data: any) => void): () => void {
    this.connectionEstablishedListeners.push(callback)
    return () => {
      const index = this.connectionEstablishedListeners.indexOf(callback)
      if (index > -1) this.connectionEstablishedListeners.splice(index, 1)
    }
  }

  /**
   * Verificar se está conectado
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Obter ID da sala atual
   */
  getCurrentRoomId(): string | null {
    return this.currentRoomId
  }
}

// Exportar instância singleton
export const chatP2PService = new ChatP2PService()
