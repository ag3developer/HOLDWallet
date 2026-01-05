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
  Timer,
  CreditCard,
  Banknote,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingCart,
  Wallet,
  ArrowLeftRight,
} from 'lucide-react'
import { chatP2PService, ChatMessageP2P } from '@/services/chatP2P'
import { p2pService } from '@/services/p2p'
import { webrtcService } from '@/services/webrtcService'
import { CallModal } from '@/components/chat/CallModal'
import { AudioMessageInput } from '@/components/chat/AudioMessageInput'
import { AudioMessage } from '@/components/chat/AudioMessage'
import { useMediaCapture } from '@/hooks/useMediaCapture'
import { useAuthStore } from '@/stores/useAuthStore'
import { useP2PChat } from '@/hooks/chat/useP2PChat'

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

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

          const newMessage: Message = {
            id: message.id || Date.now().toString(),
            content: message.content || '',
            timestamp: new Date(message.created_at || Date.now()).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isOwn: message.sender_id === localStorage.getItem('userId'),
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

  // ✅ Buscar contatos reais da API (P2P matches)
  // Temporariamente usando bot para testes
  const contacts: Contact[] = [
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
    // Adiciona contato P2P se existir
    ...(p2pContact ? [p2pContact] : []),
  ]

  console.log('📋 [ChatPage] Contacts array:', contacts)
  console.log('🎯 [ChatPage] p2pContact:', p2pContact)
  console.log('🔢 [ChatPage] selectedContact:', selectedContact)

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
    <div className='flex h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative'>
      {/* Backdrop para Mobile */}
      {isSidebarOpen && (
        <div
          className='lg:hidden fixed inset-0 bg-black/50 z-10'
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Lista de Contatos */}
      <div
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarOpen ? 'w-full sm:w-96' : 'w-0 lg:w-20'}
          transition-all duration-300 ease-in-out
          border-r border-gray-200 dark:border-gray-700 
          flex flex-col
          fixed lg:relative inset-y-0 left-0 z-20 lg:z-0
          bg-white dark:bg-gray-900
        `}
      >
        {/* Header da Sidebar - Moderno estilo Messenger/Telegram */}
        <div className='p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-xl font-bold text-white flex items-center gap-2'>
              <MessageCircle className='w-6 h-6' />
              {isSidebarOpen && <span>Mensagens</span>}
            </h2>

            <div className='flex gap-1.5'>
              {/* Botões de ação - só visíveis quando expandido */}
              {isSidebarOpen && (
                <>
                  <button
                    aria-label='Nova conversa'
                    title='Nova conversa'
                    className='p-2 text-white hover:bg-white/10 rounded-lg transition-all hover:scale-105'
                  >
                    <UserPlus className='w-5 h-5' />
                  </button>
                  <button
                    aria-label='Configurações'
                    title='Configurações'
                    className='hidden sm:block p-2 text-white hover:bg-white/10 rounded-lg transition-all hover:scale-105'
                  >
                    <Settings className='w-5 h-5' />
                  </button>
                </>
              )}

              {/* Botão toggle para desktop */}
              <button
                onClick={toggleSidebar}
                aria-label={isSidebarOpen ? 'Recolher sidebar' : 'Expandir sidebar'}
                className='hidden lg:flex p-2 text-white hover:bg-white/10 rounded-lg transition-colors'
              >
                {isSidebarOpen ? (
                  <ChevronLeft className='w-5 h-5' />
                ) : (
                  <ChevronRight className='w-5 h-5' />
                )}
              </button>

              {/* Botão fechar para mobile */}
              <button
                onClick={toggleSidebar}
                aria-label='Fechar menu'
                className='lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
          </div>

          {/* Busca - Moderna com glassmorphism */}
          {isSidebarOpen && (
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60' />
              <input
                type='text'
                placeholder='Buscar...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-sm'
              />
            </div>
          )}
        </div>

        {/* Lista de Contatos */}
        <div className='flex-1 overflow-y-auto'>
          {filteredContacts.length === 0 ? (
            // Mensagem quando não há contatos
            <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
              <MessageCircle className='w-16 h-16 text-gray-300 dark:text-gray-600 mb-4' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                Nenhuma conversa ainda
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
                Comece uma negociação P2P para iniciar uma conversa
              </p>
            </div>
          ) : isSidebarOpen ? (
            // Modo expandido - lista completa com design moderno
            filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact.id)}
                className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  selectedContact === contact.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                    : 'border-l-4 border-transparent'
                } active:scale-[0.98]`}
              >
                <div className='flex items-center gap-3'>
                  {/* Avatar com status online */}
                  <div className='relative flex-shrink-0'>
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-md`}
                    >
                      {getAvatarIcon(contact.avatar)}
                    </div>
                    {contact.isOnline && (
                      <div className='absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse'></div>
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between mb-1'>
                      <div className='flex items-center gap-1.5 flex-1 min-w-0'>
                        <h3 className='font-semibold text-gray-900 dark:text-white truncate text-sm'>
                          {contact.name}
                        </h3>
                        {contact.isSupport && (
                          <Shield className='w-3.5 h-3.5 text-blue-600 flex-shrink-0' />
                        )}
                        {contact.rating && (
                          <div className='flex items-center gap-0.5 flex-shrink-0'>
                            <Star className='w-3 h-3 text-yellow-500 fill-current' />
                            <span className='text-xs text-gray-600 dark:text-gray-400 font-medium'>
                              {contact.rating}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className='text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2'>
                        {contact.timestamp}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <p className='text-sm text-gray-600 dark:text-gray-400 truncate pr-2'>
                        {contact.lastMessage}
                      </p>
                      {contact.unread > 0 && (
                        <span className='bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm flex-shrink-0'>
                          {contact.unread > 99 ? '99+' : contact.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Modo minimizado - só avatares
            <div className='hidden lg:flex flex-col items-center py-2 gap-2'>
              {filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact.id)}
                  aria-label={`Chat com ${contact.name}`}
                  className={`relative group ${
                    selectedContact === contact.id ? 'ring-2 ring-blue-600' : ''
                  } rounded-full transition-all`}
                >
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center`}
                  >
                    {getAvatarIcon(contact.avatar, 'small')}
                  </div>
                  {contact.isOnline && (
                    <div className='absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900'></div>
                  )}
                  {contact.unread > 0 && (
                    <div className='absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center'>
                      {contact.unread}
                    </div>
                  )}
                  {/* Tooltip no hover */}
                  <div className='absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50'>
                    {contact.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área de Chat Principal */}
      <div className='flex-1 flex flex-col'>
        {currentContact ? (
          <>
            {/* Header do Chat - Profissional estilo Messenger */}
            <div className='p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm'>
              <div className='flex items-center justify-between gap-3'>
                {/* Botão toggle mobile - Integrado no header */}
                <button
                  onClick={toggleSidebar}
                  aria-label='Abrir menu de conversas'
                  className='lg:hidden flex-shrink-0 p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all'
                >
                  <Menu className='w-5 h-5' />
                </button>

                <div className='flex items-center gap-3 flex-1 min-w-0'>
                  {/* Avatar com animação de presença */}
                  <div className='relative flex-shrink-0'>
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br ${currentContact.avatarColor} flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-md transition-transform hover:scale-105`}
                    >
                      {getAvatarIcon(currentContact.avatar, 'small')}
                    </div>
                    {currentContact.isOnline && (
                      <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse'></div>
                    )}
                  </div>

                  {/* Informações do contato */}
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-1.5 truncate'>
                      <span className='truncate'>{currentContact.name}</span>
                      {currentContact.isSupport && (
                        <Shield className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0' />
                      )}
                      {/* Status de Conexão WebSocket P2P */}
                      {p2pContext && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${
                            connectionStatus === 'connected'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : connectionStatus === 'connecting'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : connectionStatus === 'error'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              connectionStatus === 'connected'
                                ? 'bg-green-600 animate-pulse'
                                : connectionStatus === 'connecting'
                                  ? 'bg-yellow-600 animate-spin'
                                  : connectionStatus === 'error'
                                    ? 'bg-red-600'
                                    : 'bg-gray-600'
                            }`}
                          ></span>
                          {connectionStatus === 'connected' && 'Chat OK'}
                          {connectionStatus === 'connecting' && 'Conectando...'}
                          {connectionStatus === 'error' && 'Erro'}
                          {connectionStatus === 'disconnected' && 'Desconectado'}
                        </span>
                      )}
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                      {isTyping ? (
                        <span className='flex items-center gap-1 text-blue-600 dark:text-blue-400'>
                          <span className='flex gap-1'>
                            <span
                              className='w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce'
                              style={{ animationDelay: '0ms' }}
                            ></span>
                            <span
                              className='w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce'
                              style={{ animationDelay: '150ms' }}
                            ></span>
                            <span
                              className='w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce'
                              style={{ animationDelay: '300ms' }}
                            ></span>
                          </span>
                          digitando...
                        </span>
                      ) : currentContact.isOnline ? (
                        'Online agora'
                      ) : (
                        'Visto por último às 12:30'
                      )}
                    </p>
                  </div>
                </div>

                {/* Botões de ação - Design moderno */}
                <div className='flex gap-1 sm:gap-1.5'>
                  <button
                    onClick={handleInitiateAudioCall}
                    aria-label='Ligar'
                    title='Chamada de voz'
                    className='p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400 transition-all hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg hover:scale-105'
                  >
                    <Phone className='w-4 h-4 sm:w-5 sm:h-5' />
                  </button>
                  <button
                    onClick={handleInitiateVideoCall}
                    aria-label='Videochamada'
                    title='Chamada de vídeo'
                    className='p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg hover:scale-105'
                  >
                    <Video className='w-4 h-4 sm:w-5 sm:h-5' />
                  </button>
                  <button
                    aria-label='Mais opções'
                    title='Mais opções'
                    className='p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hover:scale-105'
                  >
                    <MoreVertical className='w-4 h-4 sm:w-5 sm:h-5' />
                  </button>
                </div>
              </div>
            </div>

            {/* Card de Contexto P2P - Fixo no topo */}
            {p2pContext &&
              (() => {
                const cryptoInfo = getCryptoIcon(p2pContext.coin)
                return (
                  <div className='bg-gradient-to-r from-blue-500 to-purple-600 p-2 sm:p-4 shadow-lg'>
                    <div className='bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20'>
                      <div className='flex flex-col sm:flex-row items-start gap-3 sm:gap-4'>
                        {/* Header Mobile: Ícone + Título + Status */}
                        <div className='flex items-center gap-3 w-full sm:w-auto'>
                          {/* Ícone da Crypto - Dinâmico baseado na moeda com nome */}
                          <div className='flex-shrink-0 flex flex-col items-center'>
                            <div
                              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl ${cryptoInfo.bgColor} flex items-center justify-center shadow-lg ring-2 ring-white/30`}
                            >
                              {cryptoInfo.icon}
                            </div>
                            <span className='text-white text-xs font-semibold mt-1 opacity-90'>
                              {cryptoInfo.symbol}
                            </span>
                          </div>

                          {/* Título e Status (mobile) */}
                          <div className='flex-1 sm:hidden text-white min-w-0'>
                            <h3 className='font-bold text-sm truncate flex items-center gap-1'>
                              {p2pContext.type === 'buy' ? (
                                <ShoppingCart className='w-4 h-4' />
                              ) : (
                                <Wallet className='w-4 h-4' />
                              )}
                              {p2pContext.type === 'buy' ? 'Comprar' : 'Vender'}{' '}
                              {formatCryptoAmount(p2pContext.amount)} {cryptoInfo.name}
                            </h3>
                            {p2pContext.minAmount && p2pContext.maxAmount && (
                              <div className='text-xs opacity-80 mt-0.5 flex items-center gap-1'>
                                <ArrowLeftRight className='w-3 h-3' />
                                Limites:{' '}
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: p2pContext.fiatCurrency || 'BRL',
                                }).format(parseFloat(p2pContext.minAmount) || 0)}{' '}
                                -{' '}
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: p2pContext.fiatCurrency || 'BRL',
                                }).format(parseFloat(p2pContext.maxAmount) || 0)}
                              </div>
                            )}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 ${
                                p2pContext.status === 'active'
                                  ? 'bg-green-500/30'
                                  : p2pContext.status === 'completed'
                                    ? 'bg-blue-500/30'
                                    : p2pContext.status === 'disputed'
                                      ? 'bg-red-500/30'
                                      : 'bg-yellow-500/30'
                              }`}
                            >
                              {p2pContext.status === 'active' && (
                                <>
                                  <CheckCircle2 className='w-3 h-3' /> Ativo
                                </>
                              )}
                              {p2pContext.status === 'completed' && (
                                <>
                                  <CheckCircle2 className='w-3 h-3' /> Completo
                                </>
                              )}
                              {p2pContext.status === 'disputed' && (
                                <>
                                  <AlertCircle className='w-3 h-3' /> Disputa
                                </>
                              )}
                              {p2pContext.status === 'pending' && (
                                <>
                                  <Clock className='w-3 h-3' /> Pendente
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Detalhes da Ordem */}
                        <div className='flex-1 text-white min-w-0 w-full sm:w-auto'>
                          {/* Título Desktop */}
                          <div className='hidden sm:flex items-center justify-between mb-2 gap-2'>
                            <h3 className='font-bold text-lg truncate flex items-center gap-2'>
                              {p2pContext.type === 'buy' ? (
                                <ShoppingCart className='w-5 h-5' />
                              ) : (
                                <Wallet className='w-5 h-5' />
                              )}
                              {p2pContext.type === 'buy' ? 'Comprar' : 'Vender'}{' '}
                              {formatCryptoAmount(p2pContext.amount)} {cryptoInfo.name}
                            </h3>
                            <span
                              className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap ${
                                p2pContext.status === 'active'
                                  ? 'bg-green-500/30'
                                  : p2pContext.status === 'completed'
                                    ? 'bg-blue-500/30'
                                    : p2pContext.status === 'disputed'
                                      ? 'bg-red-500/30'
                                      : 'bg-yellow-500/30'
                              }`}
                            >
                              {p2pContext.status === 'active' && (
                                <>
                                  <CheckCircle2 className='w-3 h-3' /> Ativo
                                </>
                              )}
                              {p2pContext.status === 'completed' && (
                                <>
                                  <CheckCircle2 className='w-3 h-3' /> Completo
                                </>
                              )}
                              {p2pContext.status === 'disputed' && (
                                <>
                                  <AlertCircle className='w-3 h-3' /> Disputa
                                </>
                              )}
                              {p2pContext.status === 'pending' && (
                                <>
                                  <Clock className='w-3 h-3' /> Pendente
                                </>
                              )}
                            </span>
                          </div>

                          {/* Grid de informações - responsivo */}
                          <div className='grid grid-cols-2 gap-x-3 gap-y-1.5 sm:gap-x-4 sm:gap-y-2 text-xs sm:text-sm mb-2 sm:mb-3'>
                            <div>
                              <span className='opacity-75'>Total:</span>
                              <span className='font-bold ml-1 block sm:inline'>
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: p2pContext.fiatCurrency || 'BRL',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(parseFloat(p2pContext.total) || 0)}
                              </span>
                            </div>
                            <div>
                              <span className='opacity-75'>Preço:</span>
                              <span className='font-bold ml-1 truncate block'>
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: p2pContext.fiatCurrency || 'BRL',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }).format(parseFloat(p2pContext.price) || 0)}
                                /{p2pContext.coin}
                              </span>
                            </div>
                            <div className='col-span-2 sm:col-span-1 flex items-center gap-1'>
                              <ArrowLeftRight className='w-3 h-3 opacity-75' />
                              <span className='opacity-75'>Limites:</span>
                              <span className='ml-1 truncate'>
                                {p2pContext.minAmount &&
                                p2pContext.maxAmount &&
                                !isNaN(parseFloat(p2pContext.minAmount)) &&
                                !isNaN(parseFloat(p2pContext.maxAmount)) ? (
                                  <>
                                    {new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: p2pContext.fiatCurrency || 'BRL',
                                    }).format(parseFloat(p2pContext.minAmount))}
                                    {' - '}
                                    {new Intl.NumberFormat('pt-BR', {
                                      style: 'currency',
                                      currency: p2pContext.fiatCurrency || 'BRL',
                                    }).format(parseFloat(p2pContext.maxAmount))}
                                  </>
                                ) : (
                                  <span className='opacity-60'>Não definido</span>
                                )}
                              </span>
                            </div>
                            <div className='flex items-center gap-1'>
                              <Timer className='w-3 h-3 opacity-75' />
                              <span className='opacity-75'>Prazo:</span>
                              <span className='ml-1'>
                                {p2pContext.timeLimit
                                  ? `${p2pContext.timeLimit} min`
                                  : 'Não definido'}
                              </span>
                            </div>
                          </div>

                          {/* Payment methods - responsivo */}
                          <div className='flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-0'>
                            {p2pContext.paymentMethods.map(
                              (
                                method: string | { id: string; name: string; type: string },
                                idx: number
                              ) => {
                                // Suporte para string ou objeto
                                const methodName =
                                  typeof method === 'string'
                                    ? method
                                    : method.name || method.type || 'Unknown'
                                const methodType =
                                  typeof method === 'string'
                                    ? method.toUpperCase()
                                    : method.type?.toUpperCase() || ''

                                return (
                                  <span
                                    key={idx}
                                    className='text-xs bg-white/20 px-2 py-1 rounded flex items-center gap-1'
                                  >
                                    {methodType === 'PIX' ? (
                                      <CreditCard className='w-3 h-3' />
                                    ) : (
                                      <Banknote className='w-3 h-3' />
                                    )}
                                    {methodName}
                                  </span>
                                )
                              }
                            )}
                          </div>
                        </div>

                        {/* Botão Ver Detalhes - responsivo */}
                        <button
                          onClick={() => navigate(`/p2p/order/${p2pContext.orderId}`)}
                          className='w-full sm:w-auto px-3 sm:px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap'
                        >
                          <ExternalLink className='w-3 h-3 sm:w-4 sm:h-4' />
                          <span className='hidden sm:inline'>Ver Detalhes</span>
                          <span className='sm:hidden'>Detalhes</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}

            {/* Timer de Expiração - Se trade ativo */}
            {p2pContext?.status === 'active' && timeRemaining && (
              <div
                className={`border-b p-2 sm:p-3 ${
                  timeRemaining.startsWith('0:') || timeRemaining === 'Expirado'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200'
                }`}
              >
                <div
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
                    timeRemaining.startsWith('0:') || timeRemaining === 'Expirado'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-orange-600 dark:text-orange-400'
                  }`}
                >
                  <Clock
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${timeRemaining !== 'Expirado' && 'animate-pulse'}`}
                  />
                  <span className='font-bold text-xs sm:text-sm'>
                    {timeRemaining === 'Expirado'
                      ? 'Negociação expirada!'
                      : `Tempo restante: ${timeRemaining}`}
                  </span>
                </div>
              </div>
            )}

            {/* Área de Mensagens - Design Profissional */}
            <div className='flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-900'>
              {currentMessages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === 'system'
                      ? 'justify-center'
                      : message.isOwn
                        ? 'justify-end'
                        : 'justify-start'
                  } animate-fadeIn`}
                >
                  {message.type === 'system' ? (
                    // Mensagem do Sistema - Design Moderno
                    <div className='max-w-[90%] sm:max-w-md px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700/50 text-center backdrop-blur-sm shadow-sm'>
                      <div className='flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300'>
                        <Info className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
                        <p className='text-xs sm:text-sm font-medium'>{message.content}</p>
                      </div>
                      <span className='text-xs text-blue-600/70 dark:text-blue-400/70 mt-1 block'>
                        {message.timestamp}
                      </span>
                    </div>
                  ) : (
                    // Mensagem Normal - Estilo Messenger/Telegram
                    <div
                      className={`group max-w-[80%] sm:max-w-xs lg:max-w-md ${
                        message.isOwn ? 'pr-2' : 'pl-2'
                      }`}
                    >
                      {/* Balão especial para mensagens de áudio */}
                      {message.fileType === 'audio' && message.audioBlob ? (
                        <div
                          className={`${
                            message.isOwn
                              ? 'rounded-2xl rounded-br-md bg-gradient-to-r from-blue-600 to-purple-600'
                              : 'rounded-2xl rounded-bl-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          } shadow-lg hover:shadow-xl transition-all p-3`}
                        >
                          <AudioMessage audioBlob={message.audioBlob} isOwn={message.isOwn} />

                          {/* Footer com timestamp e status - mais discreto */}
                          <div
                            className={`flex items-center justify-end mt-2 gap-1.5 ${
                              message.isOwn ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            <span className='text-[10px]'>{message.timestamp}</span>
                            {message.isOwn && (
                              <div className='flex items-center'>
                                {message.status === 'sending' && (
                                  <Clock className='w-3 h-3 opacity-70' />
                                )}
                                {message.status === 'sent' && (
                                  <Check className='w-3 h-3 opacity-70' />
                                )}
                                {message.status === 'delivered' && (
                                  <CheckCheck className='w-3 h-3 opacity-70' />
                                )}
                                {message.status === 'read' && (
                                  <CheckCheck className='w-3 h-3 text-white' />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Balão normal para mensagens de texto
                        <div
                          className={`px-3 sm:px-4 py-2 shadow-sm ${
                            message.isOwn
                              ? 'rounded-3xl rounded-br-md bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                              : 'rounded-3xl rounded-bl-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                          } transition-all hover:shadow-md`}
                        >
                          <p className='text-sm sm:text-[15px] break-words leading-relaxed'>
                            {message.content}
                          </p>

                          {/* Footer da mensagem com timestamp e status */}
                          <div
                            className={`flex items-center justify-end mt-1 gap-1.5 ${
                              message.isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            <span className='text-[10px] sm:text-xs'>{message.timestamp}</span>
                            {message.isOwn && (
                              <div className='flex items-center'>
                                {message.status === 'sending' && (
                                  <Clock className='w-3 h-3 opacity-70' />
                                )}
                                {message.status === 'sent' && (
                                  <Check className='w-3 h-3 opacity-70' />
                                )}
                                {message.status === 'delivered' && (
                                  <CheckCheck className='w-3 h-3 opacity-70' />
                                )}
                                {message.status === 'read' && (
                                  <CheckCheck className='w-3 h-3 text-blue-200' />
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

            {/* Botões de Ação Rápida P2P */}
            {/* Botões de Ação P2P - Responsivos */}
            {p2pContext && p2pContext.status === 'active' && (
              <div className='px-2 sm:px-4 py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
                {/* Mobile: Grid 2x2 */}
                <div className='grid grid-cols-2 sm:hidden gap-2'>
                  <button
                    onClick={handleConfirmPayment}
                    className='py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 text-xs'
                  >
                    <CheckCircle2 className='w-3.5 h-3.5' />
                    <span className='hidden xs:inline'>Confirmei</span>
                    <span className='xs:hidden'>✓</span>
                  </button>
                  <button
                    onClick={handleSendReceipt}
                    className='py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 text-xs'
                  >
                    <FileText className='w-4 h-4' />
                    <span className='hidden xs:inline'>Comprovante</span>
                  </button>
                  <button
                    onClick={handleReportDispute}
                    className='py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 text-xs'
                  >
                    <AlertCircle className='w-4 h-4' />
                    <span className='hidden xs:inline'>Reportar</span>
                  </button>
                  <button
                    onClick={handleCancelTrade}
                    aria-label='Cancelar negociação'
                    className='py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 text-xs'
                  >
                    <XCircle className='w-4 h-4' />
                    <span className='hidden xs:inline'>Cancelar</span>
                  </button>
                </div>

                {/* Desktop/Tablet: Flex horizontal */}
                <div className='hidden sm:flex gap-2'>
                  <button
                    onClick={handleConfirmPayment}
                    className='flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm'
                  >
                    <CheckCircle2 className='w-4 h-4' />
                    <span className='hidden md:inline'>Confirmei o Pagamento</span>
                    <span className='md:hidden'>Confirmei</span>
                  </button>
                  <button
                    onClick={handleSendReceipt}
                    className='flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm'
                  >
                    <FileText className='w-4 h-4' />
                    <span className='hidden md:inline'>Enviar Comprovante</span>
                    <span className='md:hidden'>Comprovante</span>
                  </button>
                  <button
                    onClick={handleReportDispute}
                    className='flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm'
                  >
                    <AlertCircle className='w-4 h-4' />
                    <span className='hidden md:inline'>Reportar Problema</span>
                    <span className='md:hidden'>Reportar</span>
                  </button>
                  <button
                    onClick={handleCancelTrade}
                    aria-label='Cancelar negociação'
                    className='px-3 md:px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm'
                  >
                    <XCircle className='w-4 h-4' />
                    <span className='hidden md:inline'>Cancelar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input de Mensagem - Design Profissional Messenger/Telegram */}
            <div className='p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg'>
              {/* ✅ Input hidden para upload de arquivos */}
              <input
                type='file'
                id='file-upload'
                accept='image/jpeg,image/jpg,image/png,image/webp,application/pdf'
                onChange={handleFileUpload}
                className='hidden'
              />

              {/* Progress bar de upload */}
              {isUploading && (
                <div className='mb-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-xs text-blue-600 dark:text-blue-400 font-medium'>
                      Enviando arquivo...
                    </span>
                    <span className='text-xs text-blue-600 dark:text-blue-400 font-bold'>
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className='w-full h-2 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300'
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className='flex items-end gap-2'>
                {/* Botão anexar arquivo */}
                <button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isUploading}
                  aria-label='Anexar arquivo'
                  title='Anexar arquivo (imagem ou PDF)'
                  className='hidden sm:flex p-2.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isUploading ? (
                    <Loader2 className='w-5 h-5 animate-spin' />
                  ) : (
                    <Paperclip className='w-5 h-5' />
                  )}
                </button>

                {/* Campo de input moderno */}
                <div className='flex-1 relative'>
                  <input
                    type='text'
                    placeholder='Mensagem...'
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-3xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-24'
                  />

                  {/* Botões dentro do input */}
                  <div className='absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1'>
                    <button
                      aria-label='Adicionar emoji'
                      title='Emoji'
                      className='p-2 text-gray-500 hover:text-yellow-500 transition-all hover:scale-110 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                    >
                      <Smile className='w-5 h-5' />
                    </button>

                    {/* Botão de anexar (mobile) */}
                    <button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploading}
                      aria-label='Anexar'
                      title='Anexar arquivo'
                      className='sm:hidden p-2 text-gray-500 hover:text-blue-600 transition-all hover:scale-110 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      {isUploading ? (
                        <Loader2 className='w-5 h-5 animate-spin' />
                      ) : (
                        <Paperclip className='w-5 h-5' />
                      )}
                    </button>
                  </div>
                </div>

                {/* Botão de Áudio com Gravação */}
                {!newMessage.trim() && (
                  <AudioMessageInput
                    onAudioSend={async audio => {
                      console.log('📤 Áudio para enviar:', audio.size, 'bytes')

                      // Adicionar mensagem temporária
                      const tempId = Date.now().toString()
                      const message: Message = {
                        id: tempId,
                        content: '🎤 Mensagem de áudio',
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
                        // ✅ Enviar áudio via API
                        await chatP2PService.sendAudioMessage(audio)

                        // Atualizar status para 'sent'
                        setMessages(prev =>
                          prev.map(msg =>
                            msg.id === tempId ? { ...msg, status: 'sent' as const } : msg
                          )
                        )

                        console.log('✅ Áudio enviado com sucesso')
                      } catch (error) {
                        console.error('❌ Erro ao enviar áudio:', error)

                        // Marcar mensagem como erro
                        setMessages(prev =>
                          prev.map(msg =>
                            msg.id === tempId
                              ? { ...msg, status: 'sent' as const, content: `❌ ${msg.content}` }
                              : msg
                          )
                        )
                      }
                    }}
                  />
                )}

                {/* Botão de enviar - só aparece quando há texto */}
                {newMessage.trim() && (
                  <button
                    onClick={handleSendMessage}
                    aria-label='Enviar mensagem'
                    title='Enviar'
                    className='p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-110 active:scale-95 shadow-lg'
                  >
                    <Send className='w-5 h-5' />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Estado Inicial */
          <div className='flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50'>
            <div className='text-center'>
              <div className='w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4'>
                <MessageCircle className='w-10 h-10 text-white' />
              </div>
              <h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
                Bem-vindo ao Chat
              </h3>
              <p className='text-gray-600 dark:text-gray-300'>
                Selecione uma conversa para começar a trocar mensagens
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Call Modal */}
      {(() => {
        console.log('📞 CallModal render check:', {
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
    </div>
  )
}

export default ChatPage
