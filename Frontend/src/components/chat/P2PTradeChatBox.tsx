/**
 * 💬 P2P Trade Chat Box
 * =====================
 * Componente de chat inline para trades P2P
 * Integrado com WebSocket para mensagens em tempo real
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Paperclip, Loader2, CheckCheck, Check, Clock, AlertCircle } from 'lucide-react'
import { apiClient } from '@/services/api'
import { useAuthStore } from '@/stores/useAuthStore'

interface ChatMessage {
  id: string
  content: string
  sender_id: string
  sender_name: string
  is_own: boolean
  created_at: string
  status?: 'sending' | 'sent' | 'delivered' | 'read'
  message_type?: string
}

interface P2PTradeChatBoxProps {
  tradeId: string
  counterpartyName: string
  counterpartyId?: string
  orderId?: string
}

export const P2PTradeChatBox = ({
  tradeId,
  counterpartyName,
  counterpartyId,
  orderId,
}: P2PTradeChatBoxProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const { user, token } = useAuthStore()

  // Scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Criar ou buscar sala de chat
  const initializeChatRoom = useCallback(async () => {
    if (!tradeId || !token) return

    setIsLoading(true)
    setError(null)

    try {
      // Primeiro, buscar salas existentes
      const roomsResponse = await apiClient.get('/chat/rooms')
      const rooms = roomsResponse.data?.rooms || roomsResponse.data?.data || []

      // Procurar sala existente para este trade
      const existingRoom = rooms.find(
        (r: any) => r.match_id === tradeId || r.trade_id === tradeId || r.order_id === orderId
      )

      if (existingRoom) {
        console.log('✅ Found existing chat room:', existingRoom.id)
        setChatRoomId(existingRoom.id)
        await loadMessages(existingRoom.id)
        connectWebSocket(existingRoom.id)
        return
      }

      // Se não existe, criar nova sala
      // Endpoint: POST /rooms/{match_id}/create
      const formData = new FormData()
      formData.append('buyer_id', user?.id || '')
      formData.append('seller_id', counterpartyId || '')

      const createResponse = await apiClient.post(
        `/chat/rooms/${orderId || tradeId}/create`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      if (createResponse.data?.data?.room_id || createResponse.data?.room_id) {
        const roomId = createResponse.data?.data?.room_id || createResponse.data?.room_id
        setChatRoomId(roomId)
        connectWebSocket(roomId)
      }
    } catch (err: any) {
      console.error('Failed to initialize chat:', err)
      setError('Chat não disponível no momento. Recarregue a página.')
    } finally {
      setIsLoading(false)
    }
  }, [tradeId, orderId, counterpartyId, token, user?.id])

  // Carregar mensagens do chat
  const loadMessages = async (roomId: string) => {
    try {
      const response = await apiClient.get(`/chat/rooms/${roomId}/messages`)
      const loadedMessages = (response.data?.messages || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name || 'Usuário',
        is_own: msg.sender_id === user?.id,
        created_at: msg.created_at,
        status: 'delivered',
        message_type: msg.message_type,
      }))

      setMessages(loadedMessages)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  // Conectar WebSocket
  const connectWebSocket = (roomId: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    const ws = new WebSocket(`${wsUrl}/ws/chat/${roomId}?token=${token}`)

    ws.onopen = () => {
      console.log('✅ WebSocket connected')
      setWsConnected(true)
    }

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'message' || data.type === 'new_message') {
          const newMsg: ChatMessage = {
            id: data.id || Date.now().toString(),
            content: data.content,
            sender_id: data.sender_id,
            sender_name: data.sender_name || 'Usuário',
            is_own: data.sender_id === user?.id,
            created_at: data.created_at || new Date().toISOString(),
            status: 'delivered',
          }

          // Evitar duplicatas
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onerror = error => {
      console.error('WebSocket error:', error)
      setWsConnected(false)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setWsConnected(false)

      // Reconectar após 3 segundos
      setTimeout(() => {
        if (chatRoomId) {
          connectWebSocket(chatRoomId)
        }
      }, 3000)
    }

    wsRef.current = ws
  }

  // Enviar mensagem
  const handleSend = async () => {
    if (!newMessage.trim() || !chatRoomId || isSending) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    // Adicionar mensagem temporária (optimistic update)
    const userName = user?.firstName || user?.username || 'Você'
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: user?.id || '',
      sender_name: userName,
      is_own: true,
      created_at: new Date().toISOString(),
      status: 'sending',
    }

    setMessages(prev => [...prev, tempMessage])

    try {
      // Enviar via REST API
      const response = await apiClient.post(`/chat/rooms/${chatRoomId}/messages`, {
        content: messageContent,
        message_type: 'text',
      })

      // Atualizar mensagem com dados reais
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempMessage.id
            ? { ...msg, id: response.data?.id || msg.id, status: 'sent' }
            : msg
        )
      )
    } catch (err) {
      console.error('Failed to send message:', err)
      // Marcar como erro
      setMessages(prev =>
        prev.map(msg => (msg.id === tempMessage.id ? { ...msg, status: 'sending' } : msg))
      )
    } finally {
      setIsSending(false)
    }
  }

  // Inicializar chat
  useEffect(() => {
    initializeChatRoom()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [initializeChatRoom])

  // Formatar horário
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Renderizar status da mensagem
  const renderStatus = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Clock className='w-3 h-3 text-gray-400' />
      case 'sent':
        return <Check className='w-3 h-3 text-gray-400' />
      case 'delivered':
        return <CheckCheck className='w-3 h-3 text-gray-400' />
      case 'read':
        return <CheckCheck className='w-3 h-3 text-blue-500' />
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
        <div className='flex items-center justify-center h-64'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
          <span className='ml-2 text-gray-500'>Carregando chat...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
        <div className='flex items-center justify-center h-64 text-center'>
          <div>
            <AlertCircle className='w-12 h-12 mx-auto text-red-500 mb-2' />
            <p className='text-gray-500 dark:text-gray-400'>{error}</p>
            <button
              onClick={initializeChatRoom}
              className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden'>
      {/* Header */}
      <div className='px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold'>
              {counterpartyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className='font-medium text-gray-900 dark:text-white text-sm'>
                {counterpartyName}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {wsConnected ? '● Online' : '○ Offline'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className='h-64 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900'>
        {messages.length === 0 ? (
          <div className='flex items-center justify-center h-full'>
            <p className='text-gray-400 text-sm'>Nenhuma mensagem ainda. Inicie a conversa!</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.is_own ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                  message.is_own
                    ? 'bg-green-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-600'
                }`}
              >
                <p className='text-sm break-words'>{message.content}</p>
                <div
                  className={`flex items-center justify-end gap-1 mt-1 ${
                    message.is_own ? 'text-white/70' : 'text-gray-400'
                  }`}
                >
                  <span className='text-[10px]'>{formatTime(message.created_at)}</span>
                  {message.is_own && renderStatus(message.status)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className='p-3 border-t border-gray-200 dark:border-gray-600'>
        <div className='flex gap-2'>
          <button
            className='p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
            title='Anexar arquivo'
          >
            <Paperclip className='w-5 h-5' />
          </button>
          <input
            type='text'
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder='Digite sua mensagem...'
            className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className='p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isSending ? (
              <Loader2 className='w-5 h-5 animate-spin' />
            ) : (
              <Send className='w-5 h-5' />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default P2PTradeChatBox
