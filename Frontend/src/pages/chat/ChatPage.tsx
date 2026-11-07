import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageCircle,
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  Info,
  Smile,
  Paperclip,
  UserPlus,
  Settings,
  Check,
  CheckCheck,
  Clock,
  Shield,
  Star,
  User,
  Building,
  TrendingUp,
  UserCheck,
  Bitcoin,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingCart,
  Wallet,
} from 'lucide-react'
import { chatP2PService, ChatMessageP2P } from '@/services/chatP2P'
import { useChatRooms } from '@/hooks/useChatRooms'
import { p2pService } from '@/services/p2p'
import { webrtcService } from '@/services/webrtcService'
import { CallModal } from '@/components/chat/CallModal'
import { AudioMessageInput } from '@/components/chat/AudioMessageInput'
import { AudioMessage } from '@/components/chat/AudioMessage'
import { EmojiPicker } from '@/components/chat/EmojiPicker'
import { MessageSearch } from '@/components/chat/MessageSearch'
import { MessageContextMenu } from '@/components/chat/MessageContextMenu'
import { useMediaCapture } from '@/hooks/useMediaCapture'
import { useAuthStore } from '@/stores/useAuthStore'
import { useP2PChat } from '@/hooks/chat/useP2PChat'
import { appNotifications } from '@/services/appNotifications'

// Interface local para dados da ordem com camelCase (mapeamento do P2POrder)
interface P2POrderLocal {
  id: string
  orderId: string
  type: 'buy' | 'sell'
  coin: string
  amount: string
  price: string
  total: string
  minAmount: string
  maxAmount: string
  fiatCurrency: string
  paymentMethods: string[]
  timeLimit: number
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed'
  expiresAt?: string
  tradeId?: string
  userId?: string // ✅ NOVO: ID do criador da ordem
  user?: {
    id: string
    name: string
    avatar?: string
    rating?: number
    total_trades?: number
  }
}

interface Contact {
  id: number
  name: string
  avatar: string
  avatarColor: string
  lastMessage: string
  timestamp: string
  unread: number
  isOnline: boolean
  isSupport?: boolean
  rating?: number
  isBot?: boolean
  botId?: string
  roomId?: string // ID real da sala para WebSocket
}

interface Message {
  id: string
  content: string
  timestamp: string
  isOwn: boolean
  status: 'sent' | 'sending' | 'delivered' | 'read'
  type?: 'text' | 'system' | 'file'
  fileType?: 'receipt' | 'image' | 'document' | 'audio' | undefined
  sender_id?: string
  audioBlob?: Blob
}

export const ChatPage = () => {
  // ✅ Hook de navegação
  const navigate = useNavigate()

  // ✅ NOVO: Hook P2P - gerencia toda lógica P2P
  const {
    p2pContext,
    chatRoomId,
    timeRemaining,
    isConnecting: p2pIsConnecting,
    isConnected: p2pIsConnected,
    connectP2PChat,
    disconnectP2PChat,
    updateP2PStatus,
    urlParams,
  } = useP2PChat()

  // ✅ NOVO: Hook para carregar conversas da API
  const {
    contacts: apiContacts,
    totalUnread,
    isLoading: isLoadingRooms,
    markRoomAsRead,
    refresh: refreshRooms,
    getRoomIdByContactId,
  } = useChatRooms({ pollingInterval: 30000, activeOnly: false })

  const [selectedContact, setSelectedContact] = useState<number>(1)
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [p2pContact, setP2pContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting' | 'error'
  >('disconnected')
  const [isTyping, setIsTyping] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)

  // ✅ NOVOS: Estados para Emoji Picker, Busca e Menu de Contexto
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMessageSearch, setShowMessageSearch] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    messageId: string
    content: string
    isOwn: boolean
    isSystem: boolean
    position: { x: number; y: number }
  } | null>(null)

  // ✅ Pegar token do Zustand store (auth state)
  const authToken = useAuthStore(state => state.token)

  // Estados de chamada
  const [isCallActive, setIsCallActive] = useState(false)
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)

  // Refs para vídeo
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const callDurationRef = useRef(0)

  // Estado da sidebar - DEVE vir ANTES de qualquer useEffect que o use
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Carregar estado do localStorage
    const saved = localStorage.getItem('chatSidebarOpen')
    // Desktop: aberto por padrão, Mobile: fechado por padrão
    return saved !== null ? saved === 'true' : window.innerWidth >= 1024
  })

  // Media capture hook
  const {
    localVideoRef: mediaLocalVideoRef,
    remoteVideoRef: mediaRemoteVideoRef,
    startMediaCapture,
    stopMediaCapture,
    isMediaReady,
    mediaError,
  } = useMediaCapture()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ✅ NOVO: Handler para teclado mobile/PWA - garantir scroll suave quando o teclado aparecer
  useEffect(() => {
    const handleResize = () => {
      // Quando o teclado abre, o viewport diminui - fazer scroll para o input
      if (document.activeElement === inputRef.current) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }, 100)
      }
    }

    // Listener para resize (teclado mobile)
    window.visualViewport?.addEventListener('resize', handleResize)

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [])

  // Handler para quando o input recebe foco (teclado vai aparecer)
  const handleInputFocus = () => {
    // Pequeno delay para esperar o teclado abrir
    setTimeout(() => {
      // Scroll para o final das mensagens primeiro
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

      // Depois garantir que o input está visível
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 150)
    }, 100)
  }

  // ✅ NOVO: Usar dados do hook ao invés de URL params
  const { userId: urlUserId, orderId: urlOrderId, context: urlContext } = urlParams

  // DEBUG: Log inicial dos parâmetros
  console.log('🔍 [ChatPage] Parâmetros da URL (do hook):')
  console.log('   - context:', urlContext)
  console.log('   - orderId:', urlOrderId)
  console.log('   - userId:', urlUserId)

  // ✅ REMOVIDO: Lógica de carregar ordem P2P - agora está no hook useP2PChat
  // O hook já gerencia: loadP2POrder, countdown, connectP2PChat

  // Criar contato P2P quando p2pContext carregar
  useEffect(() => {
    if (!p2pContext || !urlUserId) return

    console.log('👤 Criando contato P2P para:', urlUserId)

    const traderName = p2pContext.user?.name || `Trader ${urlUserId.substring(0, 8)}`

    const p2pContactData: Contact = {
      id: 999, // ID fixo para contato P2P
      name: traderName,
      avatar: p2pContext.user?.avatar || 'userCheck',
      avatarColor: 'from-green-500 to-blue-600',
      lastMessage: `Negociação de ${p2pContext.amount} ${p2pContext.coin}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      unread: 0,
      isOnline: true, // Default
      isSupport: false,
      rating: p2pContext.user?.rating || 0,
    }
    console.log('✅ Contato P2P criado:', p2pContactData)
    setP2pContact(p2pContactData)
    setSelectedContact(999) // Seleciona o contato P2P
  }, [p2pContext, urlUserId])

  // Salvar estado da sidebar no localStorage
  useEffect(() => {
    localStorage.setItem('chatSidebarOpen', String(isSidebarOpen))
  }, [isSidebarOpen])

  // ✅ NOVO: Sincronizar connectionStatus com estado do hook P2P E WebSocket real
  useEffect(() => {
    if (!p2pContext?.orderId) {
      return // Sem contexto P2P, não fazer nada
    }

    // Registrar listener para status real do WebSocket
    const unsubscribe = chatP2PService.onStatus(status => {
      console.log('🔄 [ChatPage] Status do WebSocket mudou:', status)
      setConnectionStatus(status)
    })

    // Sincronizar estado inicial
    if (p2pIsConnected && chatP2PService.isConnected()) {
      setConnectionStatus('connected')
      console.log('✅ [ChatPage] connectionStatus sincronizado: connected (WebSocket ativo)')
    } else if (p2pIsConnecting) {
      setConnectionStatus('connecting')
      console.log('⏳ [ChatPage] connectionStatus sincronizado: connecting')
    }

    return () => {
      unsubscribe()
    }
  }, [p2pIsConnected, p2pIsConnecting, p2pContext?.orderId])

  // ✅ NOVO: Conectar automaticamente quando contexto P2P carregar
  useEffect(() => {
    console.log('🔍 [ChatPage] useEffect conexão P2P:', {
      hasP2pContext: !!p2pContext,
      orderId: p2pContext?.orderId,
      hasAuthToken: !!authToken,
      chatRoomId,
    })

    if (!p2pContext || !p2pContext.orderId || !authToken) {
      console.log('⏭️ Aguardando contexto P2P e autenticação...', {
        p2pContext: !!p2pContext,
        orderId: p2pContext?.orderId,
        authToken: authToken ? 'SIM' : 'NÃO',
      })
      return
    }

    if (chatRoomId) {
      console.log('⏭️ Já conectado ao chat room:', chatRoomId)
      return
    }

    console.log('🔌 [ChatPage] Iniciando conexão P2P...')
    setConnectionStatus('connecting') // ✅ Marcar como conectando
    connectP2PChat().catch(error => {
      console.error('❌ [ChatPage] Erro ao conectar P2P:', error)
      setConnectionStatus('error')
    })
  }, [p2pContext, authToken, chatRoomId, connectP2PChat])

  // Conectar ao WebSocket quando selecionado um contato (chat NORMAL, não P2P)
  // Para P2P, a conexão é feita pelo hook useP2PChat
  useEffect(() => {
    // Se tiver contexto P2P, não conectar aqui (já conectou via useP2PChat hook)
    if (p2pContext?.orderId) {
      console.log('⏭️ Contexto P2P detectado, pulando conexão normal')
      return // ✅ Não fazer nada, incluindo NÃO retornar cleanup
    }

    if (!selectedContact) {
      console.warn('⚠️ Nenhum contato selecionado')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('⚠️ Sem token')
      return
    }

    console.log('🔌 useEffect connectChat disparado com selectedContact:', selectedContact)

    let isActive = true
    let unsubscribeMessage: (() => void) | null = null
    let unsubscribeTyping: (() => void) | null = null
    let unsubscribeStatus: (() => void) | null = null

    const connectChat = async () => {
      try {
        const chatRoomIdLocal = `chat_${selectedContact}`
        console.log('📞 Conectando ao chat:', chatRoomIdLocal)
        // Note: chatRoomId é gerenciado pelo hook useP2PChat para P2P
        // Para chat normal, usamos chatRoomIdLocal localmente
        setConnectionStatus('connecting')

        await chatP2PService.connectToRoom(chatRoomIdLocal, token)

        if (!isActive) return // Componente desmontou durante a conexão

        console.log('✅ Conectado ao chat')
        setConnectionStatus('connected')

        // Registrar listener para mensagens recebidas
        unsubscribeMessage = chatP2PService.onMessage((message: ChatMessageP2P) => {
          console.log('📨 Mensagem recebida:', message)

          const isOwnMessage = message.sender_id === localStorage.getItem('userId')

          const newMessage: Message = {
            id: message.id || Date.now().toString(),
            content: message.content || '',
            timestamp: new Date(message.created_at || Date.now()).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isOwn: isOwnMessage,
            status: 'read',
            type:
              message.message_type === 'image' || message.message_type === 'document'
                ? 'file'
                : 'text',
            fileType:
              message.message_type === 'image'
                ? 'image'
                : message.message_type === 'document'
                  ? 'document'
                  : undefined,
            sender_id: message.sender_id,
          }

          // Notificar apenas mensagens de outros usuários
          if (!isOwnMessage) {
            appNotifications.newMessage(
              message.sender_id || 'Usuário',
              message.content?.substring(0, 50) || 'Nova mensagem'
            )
          }

          setMessages(prev => [...prev, newMessage])
        })

        // Registrar listener para typing indicator
        unsubscribeTyping = chatP2PService.onTyping(data => {
          console.log('⌨️ Typing event:', data)
          if (data.user_id !== localStorage.getItem('userId')) {
            setIsTyping(data.is_typing)
          }
        })

        // Registrar listener para status da conexão
        unsubscribeStatus = chatP2PService.onStatus(status => {
          console.log('🔄 Status mudou:', status)
          setConnectionStatus(status)
        })
      } catch (error) {
        console.error('❌ Erro ao conectar ao chat:', error)
        if (isActive) {
          setConnectionStatus('error')
        }
      }
    }

    connectChat()

    // Cleanup: remover listeners e desconectar (só para chat normal)
    return () => {
      isActive = false
      unsubscribeMessage?.()
      unsubscribeTyping?.()
      unsubscribeStatus?.()
      chatP2PService.disconnect()
    }
  }, [selectedContact, p2pContext?.orderId]) // ✅ Usar p2pContext?.orderId ao invés de p2pContext inteiro

  // Fechar sidebar em mobile quando selecionar contato
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }, [selectedContact])

  // Gerenciar duração da chamada
  useEffect(() => {
    if (!isCallActive) {
      callDurationRef.current = 0
      return
    }

    const interval = setInterval(() => {
      callDurationRef.current += 1
      setCallDuration(callDurationRef.current)
    }, 1000)

    return () => clearInterval(interval)
  }, [isCallActive])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // ✅ NOVO: Carregar histórico de mensagens da API
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!chatRoomId) return

      // ✅ Se for o bot, iniciar com mensagem de boas-vindas
      const contact = contacts.find(c => c.id === selectedContact)
      if (contact?.isBot) {
        const welcomeMessages: Message[] = [
          {
            id: 'bot-welcome-1',
            content: '👋 Olá! Bem-vindo ao **Agent Wolk Now**!',
            timestamp: new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isOwn: false,
            status: 'read',
          },
          {
            id: 'bot-welcome-2',
            content: `🤖 Sou seu assistente virtual de testes.

Aqui você pode testar todas as funcionalidades do chat:
• 💬 Mensagens de texto
• 🎤 Mensagens de áudio
• 📎 Upload de arquivos
• ✅ Status de envio/recebimento
• ⌨️ Typing indicator

Digite "ajuda" ou "menu" para começar!`,
            timestamp: new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isOwn: false,
            status: 'read',
          },
        ]

        setMessages(welcomeMessages)
        return
      }

      try {
        console.log('📜 Carregando histórico do chat:', chatRoomId)
        const historyResponse = await chatP2PService.getChatHistory(chatRoomId)

        // ✅ FIX: Acessar o array de mensagens dentro da resposta
        const historyMessages = historyResponse.messages || []

        // Converter mensagens do backend para formato local
        const loadedMessages: Message[] = historyMessages.map((msg: ChatMessageP2P) => ({
          id: msg.id || Date.now().toString(),
          content: msg.content || '',
          timestamp: new Date(msg.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isOwn: msg.sender_id === localStorage.getItem('userId'),
          status: 'read' as const,
          type: msg.message_type === 'text' || msg.message_type === 'system' ? 'text' : 'file',
          fileType:
            msg.message_type === 'image'
              ? 'image'
              : msg.message_type === 'document'
                ? 'document'
                : undefined,
          sender_id: msg.sender_id,
        }))

        setMessages(loadedMessages)
        console.log('✅ Histórico carregado:', loadedMessages.length, 'mensagens')
      } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error)
        // Manter array vazio em caso de erro
        setMessages([])
      }
    }

    loadChatHistory()
  }, [chatRoomId, selectedContact])

  // Plano B: se o WebSocket não estiver conectado, busca mensagens novas a cada 4 s (sem duplicar)
  useEffect(() => {
    if (!chatRoomId || connectionStatus === 'connected') return
    const contact = contacts.find(c => c.id === selectedContact)
    if (contact?.isBot) return
    const poll = async () => {
      try {
        const res = await chatP2PService.getChatHistory(chatRoomId)
        const incoming: Message[] = (res.messages || []).map((msg: ChatMessageP2P) => ({
          id: msg.id || `${msg.created_at}`,
          content: msg.content || '',
          timestamp: new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          isOwn: msg.sender_id === localStorage.getItem('userId'),
          status: 'read' as const,
          type: msg.message_type === 'text' || msg.message_type === 'system' ? 'text' : 'file',
          fileType: msg.message_type === 'image' ? 'image' : msg.message_type === 'document' ? 'document' : undefined,
          sender_id: msg.sender_id,
        }))
        setMessages(prev => {
          const known = new Set(prev.map(m => m.id))
          const fresh = incoming.filter(m => !known.has(m.id))
          return fresh.length ? [...prev, ...fresh] : prev
        })
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }
    const interval = setInterval(poll, 4000)
    return () => clearInterval(interval)
  }, [chatRoomId, connectionStatus, selectedContact]) // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Marcar como lido quando selecionar um contato
  useEffect(() => {
    if (selectedContact > 1000) {
      // É um contato da API (ID >= 1000)
      const roomId = getRoomIdByContactId(selectedContact)
      if (roomId) {
        markRoomAsRead(roomId).catch(err => console.error('❌ Erro ao marcar como lido:', err))
      }
    }
  }, [selectedContact, getRoomIdByContactId, markRoomAsRead])

  // ✅ Buscar contatos reais da API (P2P matches) + Bot + conversas existentes
  const contacts: Contact[] = [
    // Bot de suporte sempre primeiro
    {
      id: 1,
      name: 'Agent Wolk Now',
      avatar: 'shield',
      avatarColor: 'from-purple-500 to-blue-600',
      lastMessage: 'Olá! Como posso ajudar você hoje?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      isOnline: true,
      isSupport: true,
      rating: 5.0,
      isBot: true,
      botId: 'agent-wolk-now',
    },
    // Adiciona contato P2P ativo se existir
    ...(p2pContact ? [p2pContact] : []),
    // Adiciona conversas da API (histórico)
    ...apiContacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      avatar: contact.avatar,
      avatarColor: contact.avatarColor,
      lastMessage: contact.lastMessage,
      timestamp: contact.timestamp,
      unread: contact.unread,
      isOnline: contact.isOnline,
      isSupport: contact.isSupport,
      rating: contact.rating,
      roomId: contact.roomId,
    })),
  ]

  console.log('📋 [ChatPage] Contacts array:', contacts.length, 'contatos')
  console.log('🎯 [ChatPage] p2pContact:', p2pContact)
  console.log('🔢 [ChatPage] selectedContact:', selectedContact)
  console.log('🔔 [ChatPage] totalUnread:', totalUnread)

  const currentContact = contacts.find(c => c.id === selectedContact)
  let currentMessages: Message[] = messages || []

  // Formatar valores de criptomoeda (remove zeros desnecessários)
  const formatCryptoAmount = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return '0'

    // Para valores muito pequenos, usar notação científica
    if (num < 0.00000001) return num.toExponential(2)

    // Para valores normais, mostrar até 8 casas decimais mas remover zeros desnecessários
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    })
  }

  // Adicionar mensagens do sistema para contexto P2P
  if (p2pContext) {
    const p2pSystemMessages: Message[] = [
      {
        id: '9001',
        content: `Negociação P2P #${p2pContext.orderId} iniciada! ${p2pContext.type === 'buy' ? 'Compra' : 'Venda'} de ${formatCryptoAmount(p2pContext.amount)} ${p2pContext.coin} por ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: p2pContext.fiatCurrency }).format(parseFloat(p2pContext.total))}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: false,
        status: 'read',
        type: 'system',
      },
      {
        id: '9002',
        content: 'Aguardando confirmação de pagamento...',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: false,
        status: 'read',
        type: 'system',
      },
    ]

    currentMessages = [...p2pSystemMessages, ...currentMessages]
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getAvatarIcon = (avatarType: string, size: 'small' | 'large' = 'large') => {
    const iconProps = {
      className: size === 'large' ? 'w-6 h-6 text-white' : 'w-5 h-5 text-white',
    }

    switch (avatarType) {
      case 'shield':
        return <Shield {...iconProps} />
      case 'user':
        return <User {...iconProps} />
      case 'userCheck':
        return <UserCheck {...iconProps} />
      case 'trendingUp':
        return <TrendingUp {...iconProps} />
      case 'building':
        return <Building {...iconProps} />
      default:
        return <User {...iconProps} />
    }
  }

  // Obter ícone e cor da criptomoeda
  const getCryptoIcon = (coin: string) => {
    const iconSize = 'w-6 h-6 sm:w-8 sm:h-8'

    switch (coin?.toUpperCase()) {
      case 'BTC':
      case 'BITCOIN':
        return {
          icon: <Bitcoin className={`${iconSize} text-white`} />,
          bgColor: 'bg-gradient-to-br from-orange-400 to-orange-600',
          name: 'Bitcoin',
          symbol: 'BTC',
        }
      case 'USDT':
      case 'TETHER':
        return {
          icon: (
            <svg className={iconSize} viewBox='0 0 339.43 295.27'>
              <path
                fill='#50AF95'
                d='M62.15,1.45l-61.89,130a2.52,2.52,0,0,0,.54,2.94L167.95,294.56a2.55,2.55,0,0,0,3.53,0L338.63,134.4a2.52,2.52,0,0,0,.54-2.94l-61.89-130A2.5,2.5,0,0,0,275,0H64.45a2.5,2.5,0,0,0-2.3,1.45h0Z'
              />
              <path
                fill='#fff'
                d='M191.19,144.8v0c-1.2.09-7.4.46-21.23.46-11,0-18.81-.33-21.55-.46v0c-42.51-1.87-74.24-9.27-74.24-18.13s31.73-16.25,74.24-18.15v28.91c2.78.2,10.74.67,21.74.67,13.2,0,19.81-.55,21-.66v-28.9c42.42,1.89,74.08,9.29,74.08,18.13s-31.65,16.24-74.08,18.12Zm0-39.25V79.68h59.2V40.23H89.21V79.68h59.2v25.86c-48.11,2.21-84.29,11.74-84.29,23.16s36.18,20.94,84.29,23.16v82.9h42v-82.93c48-2.21,84.12-11.73,84.12-23.14s-36.09-20.93-84.12-23.15h0Z'
              />
            </svg>
          ),
          bgColor: 'bg-gradient-to-br from-green-400 to-teal-600',
          name: 'Tether',
          symbol: 'USDT',
        }
      case 'ETH':
      case 'ETHEREUM':
        return {
          icon: (
            <svg className={iconSize} viewBox='0 0 256 417' fill='currentColor'>
              <path
                fill='#fff'
                fillOpacity='.6'
                d='M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z'
              />
              <path fill='#fff' d='M127.962 0L0 212.32l127.962 75.639V0z' />
              <path
                fill='#fff'
                fillOpacity='.6'
                d='M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z'
              />
              <path fill='#fff' d='M127.962 416.905v-104.72L0 236.585z' />
              <path
                fill='#fff'
                fillOpacity='.2'
                d='M127.961 287.958l127.96-75.637-127.96-58.162z'
              />
              <path fill='#fff' fillOpacity='.6' d='M0 212.32l127.96 75.638v-133.8z' />
            </svg>
          ),
          bgColor: 'bg-gradient-to-br from-indigo-400 to-purple-700',
          name: 'Ethereum',
          symbol: 'ETH',
        }
      case 'BNB':
        return {
          icon: (
            <svg className={iconSize} viewBox='0 0 126.61 126.61' fill='#fff'>
              <path d='M38.73,53.2l-6.31-6.31a1.32,1.32,0,0,0-1.87,0l-6.31,6.3a1.32,1.32,0,0,0,0,1.87l6.31,6.3a1.32,1.32,0,0,0,1.87,0l6.31-6.3A1.32,1.32,0,0,0,38.73,53.2Z' />
              <path d='M63.3,28.71l6.31,6.3a1.32,1.32,0,0,0,1.87,0l6.3-6.31a1.32,1.32,0,0,0,0-1.87l-6.3-6.31a1.32,1.32,0,0,0-1.87,0l-6.31,6.32A1.32,1.32,0,0,0,63.3,28.71Z' />
              <path d='M63.3,63.3l6.31,6.31a1.32,1.32,0,0,0,1.87,0l6.3-6.31a1.32,1.32,0,0,0,0-1.87l-6.3-6.3a1.32,1.32,0,0,0-1.87,0l-6.31,6.3A1.32,1.32,0,0,0,63.3,63.3Z' />
              <path d='M63.3,97.88l6.31,6.31a1.32,1.32,0,0,0,1.87,0l6.3-6.31a1.32,1.32,0,0,0,0-1.87l-6.3-6.31a1.32,1.32,0,0,0-1.87,0l-6.31,6.31A1.32,1.32,0,0,0,63.3,97.88Z' />
              <path d='M87.88,53.2l-6.31-6.31a1.32,1.32,0,0,0-1.87,0l-6.31,6.3a1.32,1.32,0,0,0,0,1.87l6.31,6.3a1.32,1.32,0,0,0,1.87,0l6.31-6.3A1.32,1.32,0,0,0,87.88,53.2Z' />
            </svg>
          ),
          bgColor: 'bg-gradient-to-br from-yellow-400 to-orange-500',
          name: 'BNB',
          symbol: 'BNB',
        }
      case 'SOL':
      case 'SOLANA':
        return {
          icon: (
            <svg className={iconSize} viewBox='0 0 397 311' fill='none'>
              <path
                fill='url(#sol1)'
                d='M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z'
              />
              <path
                fill='url(#sol2)'
                d='M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z'
              />
              <path
                fill='url(#sol3)'
                d='M332.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H5.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z'
              />
              <defs>
                <linearGradient
                  id='sol1'
                  x1='360'
                  y1='11'
                  x2='141'
                  y2='311'
                  gradientUnits='userSpaceOnUse'
                >
                  <stop stopColor='#fff' />
                  <stop offset='1' stopColor='#fff' stopOpacity='.7' />
                </linearGradient>
                <linearGradient
                  id='sol2'
                  x1='264'
                  y1='-52'
                  x2='45'
                  y2='248'
                  gradientUnits='userSpaceOnUse'
                >
                  <stop stopColor='#fff' />
                  <stop offset='1' stopColor='#fff' stopOpacity='.7' />
                </linearGradient>
                <linearGradient
                  id='sol3'
                  x1='312'
                  y1='-21'
                  x2='93'
                  y2='279'
                  gradientUnits='userSpaceOnUse'
                >
                  <stop stopColor='#fff' />
                  <stop offset='1' stopColor='#fff' stopOpacity='.7' />
                </linearGradient>
              </defs>
            </svg>
          ),
          bgColor: 'bg-gradient-to-br from-purple-500 to-blue-600',
          name: 'Solana',
          symbol: 'SOL',
        }
      case 'USDC':
        return {
          icon: (
            <svg className={iconSize} viewBox='0 0 32 32' fill='none'>
              <circle cx='16' cy='16' r='16' fill='#2775CA' />
              <path
                fill='#fff'
                d='M20.5 18.2c0-1.8-1.1-2.4-3.2-2.7l-1.5-.2c-1.3-.2-1.6-.6-1.6-1.2 0-.7.5-1.1 1.5-1.1 1.3 0 1.8.4 2 1.3h1.6c-.2-1.5-1.2-2.5-2.8-2.8v-1.5h-1.8v1.4c-1.7.3-2.8 1.4-2.8 2.8 0 1.7 1 2.4 3 2.7l1.6.2c1.2.2 1.6.6 1.6 1.3 0 .9-.7 1.3-1.8 1.3-1.4 0-2-.6-2.1-1.5h-1.6c.2 1.7 1.3 2.6 3 2.9v1.4h1.8v-1.4c1.8-.3 2.9-1.3 2.9-2.9z'
              />
            </svg>
          ),
          bgColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
          name: 'USD Coin',
          symbol: 'USDC',
        }
      case 'XRP':
      case 'RIPPLE':
        return {
          icon: (
            <svg className={iconSize} viewBox='0 0 512 424' fill='#fff'>
              <path d='M437 0h74L357 152.5c-55.8 55.2-146.2 55.2-202 0L1 0h74l108.5 107.3c33.5 33.1 87.5 33.1 121 0L437 0zm74 424h-74l-132.5-107.3c-33.5-33.1-87.5-33.1-121 0L75 424H1l154-152.5c55.8-55.2 146.2-55.2 202 0L511 424z' />
            </svg>
          ),
          bgColor: 'bg-gradient-to-br from-gray-500 to-gray-700',
          name: 'Ripple',
          symbol: 'XRP',
        }
      case 'ADA':
      case 'CARDANO':
        return {
          icon: (
            <svg className={iconSize} viewBox='0 0 256 256' fill='#fff'>
              <circle cx='128' cy='128' r='8' fill='#fff' />
              <circle cx='128' cy='96' r='5' fill='#fff' />
              <circle cx='128' cy='160' r='5' fill='#fff' />
              <circle cx='100' cy='112' r='5' fill='#fff' />
              <circle cx='156' cy='112' r='5' fill='#fff' />
              <circle cx='100' cy='144' r='5' fill='#fff' />
              <circle cx='156' cy='144' r='5' fill='#fff' />
              <circle cx='128' cy='64' r='4' fill='#fff' fillOpacity='.6' />
              <circle cx='128' cy='192' r='4' fill='#fff' fillOpacity='.6' />
              <circle cx='76' cy='96' r='4' fill='#fff' fillOpacity='.6' />
              <circle cx='180' cy='96' r='4' fill='#fff' fillOpacity='.6' />
              <circle cx='76' cy='160' r='4' fill='#fff' fillOpacity='.6' />
              <circle cx='180' cy='160' r='4' fill='#fff' fillOpacity='.6' />
            </svg>
          ),
          bgColor: 'bg-gradient-to-br from-blue-500 to-blue-700',
          name: 'Cardano',
          symbol: 'ADA',
        }
      case 'DOGE':
      case 'DOGECOIN':
        return {
          icon: (
            <span className={`${iconSize} font-bold text-white flex items-center justify-center`}>
              Ð
            </span>
          ),
          bgColor: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
          name: 'Dogecoin',
          symbol: 'DOGE',
        }
      case 'MATIC':
      case 'POLYGON':
        return {
          icon: (
            <svg className={iconSize} viewBox='0 0 38 33' fill='#fff'>
              <path d='M29 10.2c-.7-.4-1.6-.4-2.4 0L21 13.5l-3.8 2.1-5.5 3.3c-.7.4-1.6.4-2.4 0l-4.3-2.6c-.7-.4-1.2-1.2-1.2-2.1v-5c0-.8.4-1.6 1.2-2.1l4.3-2.5c.7-.4 1.6-.4 2.4 0l4.3 2.6c.7.4 1.2 1.2 1.2 2.1v3.3l3.8-2.2V7c0-.8-.4-1.6-1.2-2.1l-8-4.7c-.7-.4-1.6-.4-2.4 0L1.2 5C.4 5.4 0 6.2 0 7v9.4c0 .8.4 1.6 1.2 2.1l8.1 4.7c.7.4 1.6.4 2.4 0l5.5-3.2 3.8-2.2 5.5-3.2c.7-.4 1.6-.4 2.4 0l4.3 2.5c.7.4 1.2 1.2 1.2 2.1v5c0 .8-.4 1.6-1.2 2.1L29 29.9c-.7.4-1.6.4-2.4 0l-4.3-2.5c-.7-.4-1.2-1.2-1.2-2.1v-3.2l-3.8 2.2v3.3c0 .8.4 1.6 1.2 2.1l8.1 4.7c.7.4 1.6.4 2.4 0l8.1-4.7c.7-.4 1.2-1.2 1.2-2.1V18c0-.8-.4-1.6-1.2-2.1L29 10.2z' />
            </svg>
          ),
          bgColor: 'bg-gradient-to-br from-purple-400 to-purple-700',
          name: 'Polygon',
          symbol: 'MATIC',
        }
      default:
        return {
          icon: <Bitcoin className={`${iconSize} text-white`} />,
          bgColor: 'bg-gradient-to-br from-gray-400 to-gray-600',
          name: coin?.toUpperCase() || 'Crypto',
          symbol: coin?.toUpperCase() || '???',
        }
    }
  }

  // Confirmar pagamento
  const handleConfirmPayment = async () => {
    if (!p2pContext || !currentContact) return

    try {
      // ✅ Chamar API para confirmar pagamento
      await chatP2PService.confirmPayment(p2pContext.orderId)

      const systemMessage: Message = {
        id: Date.now().toString(),
        content: `✅ Você confirmou que realizou o pagamento.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
        status: 'read',
        type: 'system',
      }

      setMessages(prev => [...prev, systemMessage])

      console.log('✅ Pagamento confirmado para ordem:', p2pContext.orderId)
      alert(
        '✅ Pagamento confirmado! Aguarde o vendedor liberar a moeda. Tempo limite: ' +
          p2pContext.timeLimit +
          ' minutos.'
      )
    } catch (error) {
      console.error('❌ Erro ao confirmar pagamento:', error)
      alert('❌ Erro ao confirmar pagamento. Tente novamente.')
    }
  }

  // Enviar comprovante de pagamento
  const handleSendReceipt = () => {
    // Reusar a função de upload de arquivos
    document.getElementById('file-upload')?.click()
  }

  // ✅ NOVO: Liberar escrow (vendedor confirma recebimento)
  const handleReleaseEscrow = async () => {
    if (!p2pContext) return

    const confirmRelease = confirm(
      `⚠️ Você confirma que recebeu o pagamento de ${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: p2pContext.fiatCurrency,
      }).format(
        parseFloat(p2pContext.total)
      )}?\n\nAo confirmar, ${formatCryptoAmount(p2pContext.amount)} ${p2pContext.coin} serão liberados para o comprador.`
    )

    if (!confirmRelease) return

    try {
      // ✅ Chamar API para liberar escrow
      const tradeId = p2pContext.tradeId || p2pContext.orderId
      await p2pService.releaseEscrow(tradeId)

      const systemMessage: Message = {
        id: Date.now().toString(),
        content: `✅ Escrow liberado! ${formatCryptoAmount(p2pContext.amount)} ${p2pContext.coin} foram transferidos para o comprador.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
        status: 'read',
        type: 'system',
      }

      setMessages(prev => [...prev, systemMessage])

      // Atualizar status para completed
      updateP2PStatus('completed')

      console.log('✅ Escrow liberado para ordem:', p2pContext.orderId)
      alert('✅ Transação concluída com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao liberar escrow:', error)
      alert('❌ Erro ao liberar escrow. Tente novamente.')
    }
  }

  // Reportar problema/disputa
  const handleReportDispute = async () => {
    if (!p2pContext || !currentContact) return

    const reason = prompt('Descreva o problema encontrado nesta transação:')

    if (reason && reason.trim()) {
      try {
        // ✅ Criar disputa via API
        await chatP2PService.createDispute(
          p2pContext.tradeId || p2pContext.orderId,
          reason,
          [] // Lista de IDs de mensagens como evidência (opcional)
        )

        const systemMessage: Message = {
          id: Date.now().toString(),
          content: `⚠️ Disputa reportada: "${reason}"`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          isOwn: true,
          status: 'read',
          type: 'system',
        }

        setMessages(prev => [...prev, systemMessage])

        console.log('✅ Disputa criada para ordem:', p2pContext.orderId)
        alert('⚠️ Sua disputa foi reportada. A equipe de suporte entrará em contato em breve.')
      } catch (error) {
        console.error('❌ Erro ao criar disputa:', error)
        alert('❌ Erro ao reportar disputa. Tente novamente.')
      }
    }
  }

  // Cancelar transação/trade
  const handleCancelTrade = async () => {
    if (!p2pContext || !currentContact) return

    const confirmCancel = confirm(
      'Tem certeza que deseja cancelar esta transação? Esta ação não pode ser desfeita.'
    )

    if (confirmCancel) {
      const reason = prompt('Por que você deseja cancelar?')

      if (reason !== null) {
        try {
          // ✅ Cancelar trade via API
          await chatP2PService.cancelTrade(
            p2pContext.tradeId || p2pContext.orderId,
            reason || 'Sem motivo especificado'
          )

          const systemMessage: Message = {
            id: Date.now().toString(),
            content: `❌ Transação cancelada${reason ? ': ' + reason : ''}`,
            timestamp: new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isOwn: true,
            status: 'read',
            type: 'system',
          }

          setMessages(prev => [...prev, systemMessage])

          // Atualizar status do contexto P2P
          updateP2PStatus('cancelled')

          console.log('✅ Transação cancelada para ordem:', p2pContext.orderId)
          alert('❌ Transação cancelada com sucesso.')
        } catch (error) {
          console.error('❌ Erro ao cancelar trade:', error)
          alert('❌ Erro ao cancelar transação. Tente novamente.')
        }
      }
    }
  }

  // Iniciar chamada de voz
  const handleInitiateAudioCall = async () => {
    if (!p2pContext || !currentContact) return

    try {
      const callId = `call_${Date.now()}`
      const token = localStorage.getItem('token')

      if (!token) {
        alert('Você precisa estar autenticado para fazer chamadas')
        return
      }

      console.log('📞 Iniciando chamada de voz com:', currentContact.name)

      // Capturar áudio do microfone
      await startMediaCapture('audio')

      // Iniciar chamada de áudio
      await webrtcService.initiateCall(currentContact.id.toString(), 'audio', callId, 'Você')

      // Ativar modal
      console.log('🎯 setCallType(audio), setIsCallActive(true)')
      setCallType('audio')
      setIsCallActive(true)
      setIsAudioEnabled(true)
      setIsVideoEnabled(false)
      callDurationRef.current = 0

      const systemMessage: Message = {
        id: Date.now().toString(),
        content: `☎️ Chamada de voz iniciada...`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
        status: 'delivered',
        type: 'system',
      }

      setMessages(prev => [...prev, systemMessage])
    } catch (error) {
      console.error('Erro ao iniciar chamada de voz:', error)
      alert('❌ Não foi possível iniciar a chamada. Verifique suas permissões de microfone.')
      setIsCallActive(false)
    }
  }

  // Iniciar chamada de vídeo
  const handleInitiateVideoCall = async () => {
    if (!p2pContext || !currentContact) return

    try {
      const callId = `call_${Date.now()}`
      const token = localStorage.getItem('token')

      if (!token) {
        alert('Você precisa estar autenticado para fazer chamadas')
        return
      }

      console.log('📹 Iniciando chamada de vídeo com:', currentContact.name)

      // Capturar vídeo e áudio da câmera
      await startMediaCapture('video')

      // Iniciar chamada de vídeo
      await webrtcService.initiateCall(currentContact.id.toString(), 'video', callId, 'Você')

      // Ativar modal
      setCallType('video')
      setIsCallActive(true)
      setIsAudioEnabled(true)
      setIsVideoEnabled(true)
      callDurationRef.current = 0

      const systemMessage: Message = {
        id: Date.now().toString(),
        content: `📹 Chamada de vídeo iniciada...`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
        status: 'delivered',
        type: 'system',
      }

      setMessages(prev => [...prev, systemMessage])
    } catch (error) {
      console.error('Erro ao iniciar chamada de vídeo:', error)
      alert('❌ Não foi possível iniciar a chamada. Verifique suas permissões de câmera/microfone.')
      setIsCallActive(false)
    }
  }

  // Encerrar chamada ativa
  const handleEndCall = async () => {
    if (!currentContact) return

    try {
      console.log('🛑 Encerrando chamada...')
      await webrtcService.endCall(currentContact.id.toString())

      setIsCallActive(false)
      setCallType(null)
      setIsAudioEnabled(true)
      setIsVideoEnabled(true)

      const systemMessage: Message = {
        id: Date.now().toString(),
        content: `🛑 Chamada encerrada`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
        status: 'read',
        type: 'system',
      }

      setMessages(prev => [...prev, systemMessage])
    } catch (error) {
      console.error('Erro ao encerrar chamada:', error)
    }
  }

  // Alternar áudio durante chamada
  const handleToggleAudio = (enabled: boolean) => {
    webrtcService.toggleAudio(enabled)
    setIsAudioEnabled(enabled)
  }

  // Alternar vídeo durante chamada
  const handleToggleVideo = (enabled: boolean) => {
    webrtcService.toggleVideo(enabled)
    setIsVideoEnabled(enabled)
  }

  // ✅ NOVOS: Handlers para Emoji, Busca e Menu de Contexto

  // Handler para selecionar emoji
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  // Handler para abrir menu de contexto em uma mensagem
  const handleMessageContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault()
    setContextMenu({
      messageId: message.id,
      content: message.content,
      isOwn: message.isOwn,
      isSystem: message.type === 'system',
      position: { x: e.clientX, y: e.clientY },
    })
  }

  // Handler para editar mensagem
  const handleEditMessage = (messageId: string, newContent: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent, status: 'delivered' as const } : msg
      )
    )
  }

  // Handler para deletar mensagem
  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, content: '[Mensagem apagada]' } : msg))
    )
  }

  // Handler para scroll até mensagem (da busca)
  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30')
      setTimeout(() => {
        element.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30')
      }, 2000)
    }
  }

  const handleSendMessage = async () => {
    console.log('═══════════════════════════════════════')
    console.log('📤 [handleSendMessage] INÍCIO')
    console.log('📤 newMessage:', newMessage)
    console.log('📤 currentContact:', currentContact)
    console.log('═══════════════════════════════════════')

    if (!newMessage.trim()) return

    const contact = currentContact
    if (!contact) return

    console.log('✅ [handleSendMessage] Validações passaram')
    console.log('✅ contact.isBot:', contact.isBot)
    console.log('✅ p2pContext:', p2pContext)

    // Adicionar mensagem do usuário com status 'sending'
    const tempId = Date.now().toString()
    const userMessage: Message = {
      id: tempId,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      status: 'sending',
    }

    setMessages(prev => [...prev, userMessage])
    const messageContent = newMessage
    setNewMessage('')

    try {
      // ✅ Se for o bot, simular resposta automática
      if (contact.isBot) {
        // Atualizar status para 'sent'
        setMessages(prev =>
          prev.map(msg => (msg.id === tempId ? { ...msg, status: 'delivered' as const } : msg))
        )

        // Simular typing indicator
        setIsTyping(true)

        // Aguardar 1-2 segundos antes de responder
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

        setIsTyping(false)

        // Gerar resposta do bot
        const botResponse = generateBotResponse(messageContent)

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: botResponse,
          timestamp: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isOwn: false,
          status: 'read',
        }

        setMessages(prev => [...prev, botMessage])

        // Marcar mensagem do usuário como lida
        setMessages(prev =>
          prev.map(msg => (msg.id === tempId ? { ...msg, status: 'read' as const } : msg))
        )
      } else {
        // ✅ Enviar mensagem real via REST P2P
        console.log('📤 [P2P] Tentando enviar mensagem...')
        console.log('   - connectionStatus:', connectionStatus)
        console.log('   - chatRoomId:', chatRoomId)
        console.log('   - p2pContext:', p2pContext)
        console.log('   - chatP2PService.isConnected():', chatP2PService.isConnected())

        // ✅ Se estiver conectando, aguardar até 3 segundos
        if (connectionStatus === 'connecting') {
          console.log('⏳ [P2P] Aguardando conexão...')
          let attempts = 0
          const maxAttempts = 15 // 15 x 200ms = 3 segundos

          while (attempts < maxAttempts && !chatP2PService.isConnected()) {
            await new Promise(resolve => setTimeout(resolve, 200))
            attempts++
            console.log(`⏳ [P2P] Tentativa ${attempts}/${maxAttempts}`)
          }
        }

        // ✅ Verificar se conectou
        if (!chatP2PService.isConnected()) {
          console.error('❌ Chat não conectado!')
          console.error('   - isConnected():', chatP2PService.isConnected())
          console.error('   - connectionStatus:', connectionStatus)
          throw new Error('Chat não conectado. Por favor, aguarde ou recarregue a página.')
        }

        console.log('✅ Verificação passou! Enviando mensagem...')
        await chatP2PService.sendMessage(messageContent)

        // Atualizar status para 'sent'
        setMessages(prev =>
          prev.map(msg => (msg.id === tempId ? { ...msg, status: 'sent' as const } : msg))
        )

        console.log('✅ Mensagem enviada:', messageContent)
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)

      // Marcar mensagem como erro e mostrar mensagem de erro
      const errorMsg = error instanceof Error ? error.message : 'Erro ao enviar mensagem'
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...msg, status: 'sent' as const, content: `❌ ${msg.content} (${errorMsg})` }
            : msg
        )
      )

      // Mostrar alerta ao usuário
      alert(`Erro ao enviar mensagem: ${errorMsg}`)
    }
  }

  // ✅ NOVO: Função para gerar respostas do bot
  const generateBotResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase()

    // Respostas contextuais
    if (msg.includes('oi') || msg.includes('olá') || msg.includes('ola')) {
      return '👋 Olá! Sou o Agent Wolk Now, seu assistente virtual. Como posso ajudar você hoje?'
    }

    if (msg.includes('ajuda') || msg.includes('help')) {
      return `📚 **Menu de Ajuda**

Posso ajudar você com:
• Informações sobre P2P
• Teste de upload de arquivos
• Teste de mensagens de áudio
• Perguntas sobre a plataforma

Digite "menu" para ver as opções ou faça sua pergunta!`
    }

    if (msg.includes('menu')) {
      return `📋 **Menu Principal**

1. 💬 Chat - Testar envio de mensagens
2. 🎤 Áudio - Testar mensagens de voz
3. 📎 Arquivo - Testar upload de comprovantes
4. 💰 P2P - Informações sobre negociações
5. 🆘 Suporte - Falar com suporte humano

Digite o número da opção ou uma palavra-chave!`
    }

    if (msg.includes('p2p') || msg.includes('negociar') || msg.includes('comprar')) {
      return `💰 **Sistema P2P**

Nosso sistema P2P permite:
✅ Compra/venda segura de criptomoedas
✅ Escrow automático
✅ Chat integrado
✅ Múltiplos métodos de pagamento
✅ Suporte 24/7

Acesse /p2p para começar!`
    }

    if (msg.includes('arquivo') || msg.includes('comprovante') || msg.includes('upload')) {
      return `📎 **Upload de Arquivos**

Você pode enviar:
✅ Imagens (JPG, PNG, WEBP)
✅ PDFs
✅ Limite: 10MB

Clique no botão 📎 ao lado do campo de mensagem para testar!`
    }

    if (msg.includes('audio') || msg.includes('áudio') || msg.includes('voz')) {
      return `🎤 **Mensagens de Áudio**

Para enviar áudio:
1. Mantenha pressionado o botão do microfone 🎤
2. Grave sua mensagem
3. Solte para enviar

Teste agora! O botão está ao lado do campo de mensagem.`
    }

    if (msg.includes('teste') || msg.includes('testar')) {
      return `🧪 **Modo de Teste Ativo**

Você está conversando com o Agent Wolk Now, seu bot de testes!

Experimente:
• Enviar mensagens de texto ✅
• Gravar áudios 🎤
• Anexar arquivos 📎
• Ver status de envio
• Typing indicator

Tudo funciona como se fosse um chat real!`
    }

    if (msg.includes('obrigado') || msg.includes('obrigada') || msg.includes('valeu')) {
      return '😊 Por nada! Estou aqui para ajudar. Se precisar de algo, é só chamar!'
    }

    if (msg.includes('tchau') || msg.includes('até')) {
      return '👋 Até logo! Foi um prazer ajudar. Volte sempre que precisar!'
    }

    // Resposta padrão
    const responses: string[] = [
      '🤔 Interessante! Você disse: "' + userMessage + '". Como posso ajudar com isso?',
      '✨ Recebi sua mensagem! Digite "ajuda" para ver o que posso fazer por você.',
      '💬 Mensagem recebida! Estou aqui para ajudar. Precisa de algo específico?',
      '👍 Entendi! Se precisar de ajuda, digite "menu" para ver as opções.',
      '🎯 Sua mensagem foi recebida com sucesso! Digite "ajuda" para mais informações.',
    ] as const

    const randomIndex = Math.floor(Math.random() * responses.length)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return responses[randomIndex]!
  }

  // ✅ NOVO: Handler para upload de arquivos (comprovantes de pagamento)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !chatRoomId) return

    const contact = currentContact

    // Validar tipo de arquivo (apenas imagens e PDFs para comprovantes)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('⚠️ Apenas imagens (JPG, PNG, WEBP) ou PDF são permitidos')
      return
    }

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('⚠️ Arquivo muito grande. Máximo 10MB')
      return
    }

    // Mostrar mensagem temporária com progresso
    const tempId = Date.now().toString()
    const uploadMessage: Message = {
      id: tempId,
      content: `📎 Enviando ${file.name}...`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      status: 'sending',
      type: 'file',
      fileType: file.type.startsWith('image/') ? 'image' : 'document',
    }

    setMessages(prev => [...prev, uploadMessage])
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // ✅ Se for o bot, simular upload
      if (contact?.isBot) {
        // Simular progresso
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setUploadProgress(i)
        }

        // Atualizar mensagem com sucesso
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempId
              ? {
                  ...msg,
                  content: `✅ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
                  status: 'delivered' as const,
                }
              : msg
          )
        )

        // Bot responde ao arquivo
        setIsTyping(true)
        await new Promise(resolve => setTimeout(resolve, 1500))
        setIsTyping(false)

        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: `📄 **Arquivo Recebido!**

Tipo: ${file.type.startsWith('image/') ? '🖼️ Imagem' : '📋 PDF'}
Nome: ${file.name}
Tamanho: ${(file.size / 1024).toFixed(1)} KB

✅ Upload testado com sucesso! Em uma conversa real, este arquivo seria enviado para o backend e o outro usuário poderia baixá-lo.`,
          timestamp: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isOwn: false,
          status: 'read',
        }

        setMessages(prev => [...prev, botResponse])

        // Marcar como lida
        setMessages(prev =>
          prev.map(msg => (msg.id === tempId ? { ...msg, status: 'read' as const } : msg))
        )
      } else {
        // ✅ Upload via API com progresso
        const result = await chatP2PService.uploadFile(
          chatRoomId,
          file,
          `Comprovante: ${file.name}`,
          progress => {
            setUploadProgress(progress)
            console.log(`📤 Upload progress: ${progress}%`)
          }
        )

        // Atualizar mensagem com sucesso
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempId
              ? {
                  ...msg,
                  content: `✅ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
                  status: 'sent' as const,
                }
              : msg
          )
        )

        console.log('✅ Arquivo enviado:', result)
      }
    } catch (error) {
      console.error('❌ Erro ao enviar arquivo:', error)

      // Marcar mensagem como erro
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? {
                ...msg,
                content: `❌ Falha ao enviar ${file.name}`,
                status: 'sent' as const,
              }
            : msg
        )
      )
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      // Limpar input
      event.target.value = ''
    }
  }

  return (
    <div className='flex flex-col lg:flex-row h-[100dvh] lg:h-full w-full bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden'>
      {/* Backdrop para Mobile - z-30 */}
      {isSidebarOpen && (
        <div
          role='button'
          tabIndex={0}
          aria-label='Fechar menu'
          className='lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity cursor-pointer'
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={e => e.key === 'Enter' && setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Lista de Contatos - Premium Design */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0
          ${isSidebarOpen ? 'w-[85vw] sm:w-80 lg:w-80' : 'w-0 lg:w-[72px]'}
          ${isSidebarOpen ? 'translate-x-0 z-40' : '-translate-x-full lg:translate-x-0 z-20'}
          transition-all duration-300 ease-out
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          flex flex-col
          shadow-xl lg:shadow-none
        `}
      >
        {/* Header da Sidebar */}
        <div className={`flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 ${!isSidebarOpen ? 'hidden lg:block' : ''}`}>
          <div className='p-3'>
            <div className='flex items-center justify-between'>
              {isSidebarOpen ? (
                <div className='flex items-center gap-3'>
                  {/* Avatar do usuário atual - só quando expandido */}
                  <div className='w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center'>
                    <MessageCircle className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h2 className='text-sm font-bold text-gray-900 dark:text-white'>Chat</h2>
                    <p className='text-[10px] text-gray-500 dark:text-gray-400'>Suas conversas</p>
                  </div>
                </div>
              ) : (
                /* Modo minimizado - botão para expandir (só desktop) */
                <div className='w-full flex justify-center'>
                  <button
                    onClick={toggleSidebar}
                    aria-label='Abrir lista de contatos'
                    title='Abrir contatos'
                    className='w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors'
                  >
                    <MoreVertical className='w-5 h-5 text-gray-600 dark:text-gray-300' />
                  </button>
                </div>
              )}

              {isSidebarOpen && (
                <div className='flex items-center gap-1'>
                  {/* Botões de ação - só visíveis quando expandido */}
                  <button
                    aria-label='Nova conversa'
                    title='Nova conversa'
                    className='p-1.5 text-gray-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all'
                  >
                    <UserPlus className='w-4 h-4' />
                  </button>

                  {/* Botão toggle para desktop */}
                  <button
                    onClick={toggleSidebar}
                    aria-label='Recolher sidebar'
                    className='hidden lg:flex p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                  >
                    <ChevronLeft className='w-4 h-4' />
                  </button>

                  {/* Botão fechar para mobile */}
                  <button
                    onClick={toggleSidebar}
                    aria-label='Fechar menu'
                    className='lg:hidden p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                  >
                    <X className='w-4 h-4' />
                  </button>
                </div>
              )}
            </div>

            {/* Busca - Compacta */}
            {isSidebarOpen && (
              <div className='relative mt-2'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='Buscar...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm'
                />
              </div>
            )}
          </div>
        </div>

        {/* Lista de Contatos - Premium Design */}
        <div className='flex-1 overflow-y-auto bg-white dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700'>
          {filteredContacts.length === 0 ? (
            // Mensagem quando não há contatos
            <div className='flex flex-col items-center justify-center h-full p-6 text-center'>
              <div className='w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg'>
                <MessageCircle className='w-8 h-8 text-white' />
              </div>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-1'>
                Nenhuma conversa
              </h3>
              <p className='text-xs text-gray-500 dark:text-gray-400'>Inicie uma negociação P2P</p>
            </div>
          ) : isSidebarOpen ? (
            // Modo expandido - Premium Contact Cards
            <div className='py-2'>
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  role='button'
                  tabIndex={0}
                  onClick={() => setSelectedContact(contact.id)}
                  onKeyDown={e => e.key === 'Enter' && setSelectedContact(contact.id)}
                  className={`p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedContact === contact.id
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500 shadow-md'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent'
                  } active:scale-[0.98]`}
                >
                  <div className='flex items-center gap-3'>
                    {/* Avatar Premium com status online */}
                    <div className='relative flex-shrink-0'>
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center shadow-lg`}
                      >
                        {getAvatarIcon(contact.avatar)}
                      </div>
                      {contact.isOnline && (
                        <div className='absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm'></div>
                      )}
                    </div>

                    {/* Info Premium */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between mb-0.5'>
                        <div className='flex items-center gap-1.5 flex-1 min-w-0'>
                          <h3 className='font-semibold text-gray-900 dark:text-white truncate text-sm'>
                            {contact.name}
                          </h3>
                          {contact.isSupport && (
                            <Shield className='w-3.5 h-3.5 text-emerald-500 flex-shrink-0' />
                          )}
                          {contact.rating && (
                            <div className='flex items-center gap-0.5 flex-shrink-0'>
                              <Star className='w-3 h-3 text-yellow-500 fill-current' />
                              <span className='text-[10px] text-gray-500 dark:text-gray-400 font-medium'>
                                {contact.rating}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className='text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2'>
                          {contact.timestamp}
                        </span>
                      </div>
                      <div className='flex items-center justify-between mt-0.5'>
                        <p className='text-xs text-gray-500 dark:text-gray-400 truncate pr-2'>
                          {contact.lastMessage}
                        </p>
                        {contact.unread > 0 && (
                          <span className='bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0 shadow-sm'>
                            {contact.unread > 99 ? '99+' : contact.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Modo minimizado - avatares premium
            <div className='hidden lg:flex flex-col items-center py-3 gap-2'>
              {filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact.id)}
                  aria-label={`Chat com ${contact.name}`}
                  className={`relative group p-1 ${
                    selectedContact === contact.id
                      ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-900'
                      : ''
                  } rounded-xl transition-all hover:scale-105`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center shadow-md`}
                  >
                    {getAvatarIcon(contact.avatar, 'small')}
                  </div>
                  {contact.isOnline && (
                    <div className='absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900'></div>
                  )}
                  {contact.unread > 0 && (
                    <div className='absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm'>
                      {contact.unread}
                    </div>
                  )}
                  {/* Tooltip Premium */}
                  <div className='absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg'>
                    {contact.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Área de Chat Principal - Full Screen Mobile */}
      <main className='flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-[#0d0d0d]'>
        {currentContact ? (
          <>
            {/* Header do Chat - Compacto */}
            <div className='flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-3 py-2'>
              <div className='flex items-center justify-between gap-2'>
                {/* Botão toggle mobile */}
                <button
                  onClick={toggleSidebar}
                  aria-label='Abrir menu de conversas'
                  className='lg:hidden flex-shrink-0 p-1.5 -ml-1 text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all'
                >
                  <Menu className='w-5 h-5' />
                </button>

                <div className='flex items-center gap-2 flex-1 min-w-0'>
                  {/* Avatar Compacto */}
                  <div className='relative flex-shrink-0'>
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentContact.avatarColor} flex items-center justify-center`}
                    >
                      {getAvatarIcon(currentContact.avatar, 'small')}
                    </div>
                    {currentContact.isOnline && (
                      <div className='absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-[1.5px] border-white dark:border-gray-900'></div>
                    )}
                  </div>

                  {/* Informações do contato */}
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 truncate'>
                      <span className='truncate'>{currentContact.name}</span>
                      {currentContact.isSupport && (
                        <Shield className='w-3.5 h-3.5 text-emerald-500 flex-shrink-0' />
                      )}
                      {/* Status de Conexão WebSocket P2P */}
                      {p2pContext && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 font-medium ${
                            connectionStatus === 'connected'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : connectionStatus === 'connecting'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : connectionStatus === 'error'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              connectionStatus === 'connected'
                                ? 'bg-emerald-400'
                                : connectionStatus === 'connecting'
                                  ? 'bg-yellow-400 animate-pulse'
                                  : connectionStatus === 'error'
                                    ? 'bg-red-400'
                                    : 'bg-gray-400'
                            }`}
                          ></span>
                          <span className='hidden xs:inline'>
                            {connectionStatus === 'connected' && 'Conectado'}
                            {connectionStatus === 'connecting' && 'Conectando'}
                            {connectionStatus === 'error' && 'Erro'}
                            {connectionStatus === 'disconnected' && 'Offline'}
                          </span>
                        </span>
                      )}
                    </h3>
                    <p className='text-[11px] text-gray-500 dark:text-gray-400 truncate'>
                      {isTyping ? (
                        <span className='flex items-center gap-1.5 text-emerald-400'>
                          <span className='flex gap-0.5'>
                            <span className='w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]'></span>
                            <span className='w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]'></span>
                            <span className='w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]'></span>
                          </span>
                          digitando...
                        </span>
                      ) : currentContact.isOnline ? (
                        'Online'
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                </div>

                {/* Botões de ação - Compactos */}
                <div className='flex items-center gap-0.5'>
                  {/* Botão de busca */}
                  <button
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    aria-label='Buscar mensagens'
                    title='Buscar mensagens'
                    className={`p-1.5 transition-all rounded-lg
                              ${
                                showMessageSearch
                                  ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                  >
                    <Search className='w-4 h-4' />
                  </button>
                  <button
                    onClick={handleInitiateAudioCall}
                    aria-label='Ligar'
                    title='Chamada de voz'
                    className='p-1.5 text-gray-500 hover:text-emerald-500 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg'
                  >
                    <Phone className='w-4 h-4' />
                  </button>
                  <button
                    onClick={handleInitiateVideoCall}
                    aria-label='Videochamada'
                    title='Chamada de vídeo'
                    className='p-1.5 text-gray-500 hover:text-blue-500 transition-all hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg'
                  >
                    <Video className='w-4 h-4' />
                  </button>
                  <button
                    aria-label='Mais opções'
                    title='Mais opções'
                    className='p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg'
                  >
                    <MoreVertical className='w-4 h-4' />
                  </button>
                </div>
              </div>

              {/* Componente de busca */}
              {showMessageSearch && chatRoomId && (
                <MessageSearch
                  roomId={chatRoomId}
                  onResultClick={handleScrollToMessage}
                  onClose={() => setShowMessageSearch(false)}
                />
              )}
            </div>

            {/* Card de Contexto P2P - Design Compacto */}
            {p2pContext &&
              (() => {
                const cryptoInfo = getCryptoIcon(p2pContext.coin)
                return (
                  <div className='flex-shrink-0 bg-gradient-to-r from-green-500 to-emerald-600 p-2 sm:p-3'>
                    <div className='bg-white/10 backdrop-blur-sm rounded-xl p-2.5 sm:p-3 border border-white/20'>
                      <div className='flex items-center gap-3'>
                        {/* Ícone da Crypto */}
                        <div
                          className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${cryptoInfo.bgColor} flex items-center justify-center shadow-lg`}
                        >
                          {cryptoInfo.icon}
                        </div>

                        {/* Info Principal */}
                        <div className='flex-1 min-w-0 text-white'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <h3 className='font-bold text-sm sm:text-base flex items-center gap-1.5'>
                              {p2pContext.type === 'buy' ? (
                                <>
                                  <ShoppingCart className='w-3.5 h-3.5' />
                                  <span>Compra</span>
                                </>
                              ) : (
                                <>
                                  <Wallet className='w-3.5 h-3.5' />
                                  <span>Venda</span>
                                </>
                              )}
                            </h3>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                p2pContext.status === 'active'
                                  ? 'bg-white/20'
                                  : p2pContext.status === 'completed'
                                    ? 'bg-blue-500/30'
                                    : p2pContext.status === 'disputed'
                                      ? 'bg-red-500/30'
                                      : 'bg-yellow-500/30'
                              }`}
                            >
                              {p2pContext.status === 'active' && 'Ativo'}
                              {p2pContext.status === 'completed' && 'Completo'}
                              {p2pContext.status === 'disputed' && 'Disputa'}
                              {p2pContext.status === 'pending' && 'Pendente'}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 sm:gap-3 text-xs sm:text-sm mt-1 opacity-90'>
                            <span className='font-mono font-bold'>
                              {formatCryptoAmount(p2pContext.amount)} {cryptoInfo.symbol}
                            </span>
                            <span className='text-white/60'>→</span>
                            <span className='font-semibold'>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: p2pContext.fiatCurrency || 'BRL',
                              }).format(parseFloat(p2pContext.total) || 0)}
                            </span>
                          </div>
                          {/* Payment methods */}
                          <div className='flex flex-wrap gap-1 mt-1.5'>
                            {p2pContext.paymentMethods
                              .slice(0, 2)
                              .map(
                                (
                                  method: string | { id: string; name: string; type: string },
                                  idx: number
                                ) => {
                                  const methodName =
                                    typeof method === 'string'
                                      ? method
                                      : method.name || method.type || 'Unknown'
                                  return (
                                    <span
                                      key={idx}
                                      className='text-[10px] bg-white/20 px-1.5 py-0.5 rounded'
                                    >
                                      {methodName}
                                    </span>
                                  )
                                }
                              )}
                            {p2pContext.paymentMethods.length > 2 && (
                              <span className='text-[10px] text-white/60'>
                                +{p2pContext.paymentMethods.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botão Ver Detalhes */}
                        <button
                          onClick={() => navigate(`/p2p/order/${p2pContext.orderId}`)}
                          className='flex-shrink-0 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors'
                          title='Ver detalhes'
                          aria-label='Ver detalhes da ordem'
                        >
                          <ExternalLink className='w-4 h-4 text-white' />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}

            {/* Timer de Expiração - Se trade ativo */}
            {p2pContext?.status === 'active' && timeRemaining && (
              <div
                className={`flex-shrink-0 px-3 py-2 ${
                  timeRemaining.startsWith('0:') || timeRemaining === 'Expirado'
                    ? 'bg-red-50 dark:bg-red-500/10'
                    : 'bg-amber-50 dark:bg-amber-500/10'
                }`}
              >
                <div
                  className={`flex items-center justify-center gap-2 ${
                    timeRemaining.startsWith('0:') || timeRemaining === 'Expirado'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <Clock
                    className={`w-3.5 h-3.5 ${timeRemaining !== 'Expirado' && 'animate-pulse'}`}
                  />
                  <span className='font-semibold text-xs'>
                    {timeRemaining === 'Expirado'
                      ? 'Negociação expirada!'
                      : `Tempo restante: ${timeRemaining}`}
                  </span>
                </div>
              </div>
            )}

            {/* Área de Mensagens - Full Height Mobile */}
            <div
              ref={chatContainerRef}
              className='flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5 overscroll-contain relative bg-[#f8fafc] dark:bg-[#0d1117]'
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.06) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.04) 0%, transparent 40%),
                  radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.04) 0%, transparent 40%),
                  url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2310b981' fill-opacity='0.04'%3E%3Cpath d='M15 8c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2h-1l-2 2v-2h-5c-1.1 0-2-.9-2-2V8z'/%3E%3Cpath d='M40 35c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-2l-2 2v-2h-6c-1.1 0-2-.9-2-2v-6z'/%3E%3Cpath d='M5 40c0-.8.7-1.5 1.5-1.5h6c.8 0 1.5.7 1.5 1.5v4c0 .8-.7 1.5-1.5 1.5h-1l-1.5 1.5V45.5h-3.5c-.8 0-1.5-.7-1.5-1.5v-4z'/%3E%3Ccircle cx='50' cy='12' r='2'/%3E%3Ccircle cx='8' cy='25' r='1.5'/%3E%3Ccircle cx='55' cy='50' r='1'/%3E%3C/g%3E%3C/svg%3E")
                `,
              }}
            >
              {currentMessages.map(message => (
                <div
                  key={message.id}
                  id={`message-${message.id}`}
                  role='article'
                  className={`flex ${
                    message.type === 'system'
                      ? 'justify-center'
                      : message.isOwn
                        ? 'justify-end'
                        : 'justify-start'
                  }`}
                  onContextMenu={e => handleMessageContextMenu(e, message)}
                >
                  {message.type === 'system' ? (
                    // Mensagem do Sistema - Premium Design
                    <div className='max-w-[85%] sm:max-w-sm px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center'>
                      <div className='flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400'>
                        <Info className='w-3.5 h-3.5 flex-shrink-0' />
                        <p className='text-xs font-medium'>{message.content}</p>
                      </div>
                      <span className='text-[10px] text-blue-400 dark:text-blue-500 mt-1 block'>
                        {message.timestamp}
                      </span>
                    </div>
                  ) : (
                    // Mensagem Normal - Premium Bubbles
                    <div className={`group max-w-[80%] sm:max-w-xs lg:max-w-sm`}>
                      {/* Balão especial para mensagens de áudio */}
                      {message.fileType === 'audio' && message.audioBlob ? (
                        <div
                          className={`${
                            message.isOwn
                              ? 'rounded-2xl rounded-br-sm bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20'
                              : 'rounded-2xl rounded-bl-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-md'
                          } p-2.5`}
                        >
                          <AudioMessage audioBlob={message.audioBlob} isOwn={message.isOwn} />

                          {/* Footer */}
                          <div
                            className={`flex items-center justify-end mt-1.5 gap-1 ${
                              message.isOwn ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            <span className='text-[10px]'>{message.timestamp}</span>
                            {message.isOwn && (
                              <div className='flex items-center'>
                                {message.status === 'sending' && <Clock className='w-3 h-3' />}
                                {message.status === 'sent' && <Check className='w-3 h-3' />}
                                {message.status === 'delivered' && (
                                  <CheckCheck className='w-3 h-3' />
                                )}
                                {message.status === 'read' && (
                                  <CheckCheck className='w-3 h-3 text-white' />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Balão Premium para mensagens de texto
                        <div
                          className={`px-4 py-2.5 ${
                            message.isOwn
                              ? 'rounded-2xl rounded-br-sm bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                              : 'rounded-2xl rounded-bl-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 shadow-md'
                          }`}
                        >
                          <p className='text-sm break-words leading-relaxed'>{message.content}</p>

                          {/* Footer Premium */}
                          <div
                            className={`flex items-center justify-end mt-1 gap-1 ${
                              message.isOwn ? 'opacity-70' : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            <span className='text-[10px]'>{message.timestamp}</span>
                            {message.isOwn && (
                              <div className='flex items-center'>
                                {message.status === 'sending' && <Clock className='w-3 h-3' />}
                                {message.status === 'sent' && <Check className='w-3 h-3' />}
                                {message.status === 'delivered' && (
                                  <CheckCheck className='w-3 h-3' />
                                )}
                                {message.status === 'read' && (
                                  <CheckCheck className='w-3.5 h-3.5 text-white' />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {/* Referência para scroll automático */}
              <div ref={messagesEndRef} />
            </div>

            {/* Botões de Ação P2P - Premium Design */}
            {p2pContext && p2pContext.status === 'active' && (
              <div className='flex-shrink-0 px-3 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'>
                <div className='flex gap-2'>
                  <button
                    onClick={handleConfirmPayment}
                    className='flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-emerald-500/25'
                  >
                    <CheckCircle2 className='w-4 h-4' />
                    <span>Confirmar Pagamento</span>
                  </button>
                  <button
                    onClick={handleSendReceipt}
                    className='flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-blue-500/25'
                  >
                    <FileText className='w-4 h-4' />
                    <span>Enviar Comprovante</span>
                  </button>
                  <button
                    onClick={handleReportDispute}
                    className='py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center text-xs'
                    title='Reportar problema'
                    aria-label='Reportar problema'
                  >
                    <AlertCircle className='w-4 h-4' />
                  </button>
                  <button
                    onClick={handleCancelTrade}
                    aria-label='Cancelar negociação'
                    className='py-2 px-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center text-xs'
                    title='Cancelar'
                  >
                    <XCircle className='w-4 h-4' />
                  </button>
                </div>
              </div>
            )}

            {/* Input de Mensagem - Compacto - Sticky no bottom com safe area */}
            <div className='flex-shrink-0 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky bottom-0'>
              {/* Input hidden para upload de arquivos */}
              <input
                type='file'
                id='file-upload'
                title='Upload de arquivo'
                accept='image/jpeg,image/jpg,image/png,image/webp,application/pdf'
                onChange={handleFileUpload}
                className='hidden'
              />

              {/* Progress bar de upload */}
              {isUploading && (
                <div className='mb-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-2'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-xs text-emerald-600 dark:text-emerald-400 font-medium'>
                      Enviando arquivo...
                    </span>
                    <span className='text-xs text-emerald-600 dark:text-emerald-400 font-bold'>
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className='w-full h-1 bg-emerald-100 dark:bg-emerald-900/40 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-emerald-500 transition-all duration-300 rounded-full'
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className='flex items-end gap-1.5'>
                {/* Botão anexar arquivo */}
                <button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isUploading}
                  aria-label='Anexar arquivo'
                  title='Anexar arquivo'
                  className='hidden sm:flex p-2 sm:p-2.5 text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isUploading ? (
                    <Loader2 className='w-5 h-5 animate-spin' />
                  ) : (
                    <Paperclip className='w-5 h-5' />
                  )}
                </button>

                {/* Campo de input - Mobile Optimized */}
                <div className='flex-1 relative'>
                  <input
                    ref={inputRef}
                    type='text'
                    placeholder='Mensagem...'
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onFocus={handleInputFocus}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className='w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-16 sm:pr-20'
                  />

                  {/* Botões dentro do input */}
                  <div className='absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1'>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      aria-label='Adicionar emoji'
                      title='Emoji'
                      className={`p-1.5 transition-colors rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-500/10
                                ${showEmojiPicker ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                    >
                      <Smile className='w-5 h-5' />
                    </button>

                    {/* Botão de anexar (mobile) */}
                    <button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploading}
                      aria-label='Anexar'
                      title='Anexar arquivo'
                      className='sm:hidden p-1.5 text-gray-400 hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      {isUploading ? (
                        <Loader2 className='w-5 h-5 animate-spin' />
                      ) : (
                        <Paperclip className='w-5 h-5' />
                      )}
                    </button>
                  </div>

                  {/* Emoji Picker - z-50 */}
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={handleEmojiSelect}
                      onClose={() => setShowEmojiPicker(false)}
                      position='top'
                    />
                  )}
                </div>

                {/* Botão de Áudio com Gravação */}
                {!newMessage.trim() && (
                  <AudioMessageInput
                    onAudioSend={async audio => {
                      console.log('Áudio para enviar:', audio.size, 'bytes')

                      // Adicionar mensagem temporária
                      const tempId = Date.now().toString()
                      const message: Message = {
                        id: tempId,
                        content: 'Mensagem de áudio',
                        timestamp: new Date().toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                        isOwn: true,
                        status: 'sending',
                        type: 'file',
                        fileType: 'audio',
                        audioBlob: audio,
                      }
                      setMessages(prev => [...prev, message])

                      try {
                        // Enviar áudio via API
                        await chatP2PService.sendAudioMessage(audio)

                        // Atualizar status para 'sent'
                        setMessages(prev =>
                          prev.map(msg =>
                            msg.id === tempId ? { ...msg, status: 'sent' as const } : msg
                          )
                        )

                        console.log('Áudio enviado com sucesso')
                      } catch (error) {
                        console.error('Erro ao enviar áudio:', error)

                        // Marcar mensagem como erro
                        setMessages(prev =>
                          prev.map(msg =>
                            msg.id === tempId
                              ? { ...msg, status: 'sent' as const, content: `Erro: ${msg.content}` }
                              : msg
                          )
                        )
                      }
                    }}
                  />
                )}

                {/* Botão de enviar - Premium */}
                {newMessage.trim() && (
                  <button
                    onClick={handleSendMessage}
                    aria-label='Enviar mensagem'
                    title='Enviar'
                    className='p-2.5 sm:p-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl transition-all transform active:scale-95 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
                  >
                    <Send className='w-4 h-4 sm:w-5 sm:h-5' />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Estado Inicial - Premium Design - Mobile Full Screen */
          <div
            className='flex-1 flex flex-col bg-[#f8fafc] dark:bg-[#0d1117]'
            style={{
              backgroundImage: `
                radial-gradient(circle at 30% 40%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 70% 60%, rgba(6, 182, 212, 0.05) 0%, transparent 40%),
                url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2310b981' fill-opacity='0.05'%3E%3Cpath d='M20 10c0-2.8 2.2-5 5-5h15c2.8 0 5 2.2 5 5v10c0 2.8-2.2 5-5 5h-3l-5 5v-5h-7c-2.8 0-5-2.2-5-5V10z'/%3E%3Cpath d='M50 45c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4h-2l-4 4v-4h-6c-2.2 0-4-1.8-4-4v-8z'/%3E%3Ccircle cx='65' cy='15' r='3'/%3E%3Ccircle cx='15' cy='60' r='2'/%3E%3C/g%3E%3C/svg%3E")
              `,
            }}
          >
            {/* Header Mobile para estado inicial */}
            <div className='lg:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]'>
              <div className='flex items-center gap-3'>
                <button
                  onClick={toggleSidebar}
                  aria-label='Abrir menu de conversas'
                  className='p-2 -ml-1 text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all'
                >
                  <Menu className='w-5 h-5' />
                </button>
                <h1 className='text-lg font-bold text-gray-900 dark:text-white'>Chat</h1>
              </div>
            </div>

            {/* Conteúdo central */}
            <div className='flex-1 flex items-center justify-center p-6'>
              <div className='text-center'>
                <div className='w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20'>
                  <MessageCircle className='w-10 h-10 text-white' />
                </div>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-2'>
                  Chat Premium
                </h3>
                <p className='text-sm text-gray-500 dark:text-gray-400 max-w-xs'>
                  Selecione uma conversa ou inicie uma negociação P2P para começar
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Call Modal - z-50 */}
      {(() => {
        console.log('CallModal render check:', {
          hasContact: !!currentContact,
          isCallActive,
          callType,
          shouldRender: !!(currentContact && isCallActive && callType),
        })
        return (
          currentContact &&
          isCallActive &&
          callType && (
            <CallModal
              isOpen={isCallActive}
              callType={callType}
              contactName={currentContact.name}
              contactAvatar={currentContact.avatar}
              duration={callDuration}
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onEndCall={handleEndCall}
              remoteVideoRef={mediaRemoteVideoRef}
              localVideoRef={mediaLocalVideoRef}
            />
          )
        )
      })()}

      {/* Menu de contexto para mensagens */}
      {contextMenu && chatRoomId && (
        <MessageContextMenu
          messageId={contextMenu.messageId}
          roomId={chatRoomId}
          content={contextMenu.content}
          isOwn={contextMenu.isOwn}
          isSystem={contextMenu.isSystem}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
        />
      )}
    </div>
  )
}

export default ChatPage
