import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  Mic,
  Users,
  UserPlus,
  Settings,
  Check,
  CheckCheck,
  Clock,
  Shield,
  Star,
  Archive,
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
  Upload,
  Loader2,
} from 'lucide-react'
import { chatP2PService, ChatMessageP2P, P2POrder } from '@/services/chatP2P'
import { authService } from '@/services/auth'
import { webrtcService } from '@/services/webrtcService'
import { CallModal } from '@/components/chat/CallModal'
import { IncomingCallModal } from '@/components/chat/IncomingCallModal'
import { BotContactsSection } from '@/components/chat/BotContactsSection'
import { useBotCalls } from '@/hooks/useBotCalls'
import { useMediaCapture } from '@/hooks/useMediaCapture'

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
}

interface Message {
  id: string
  content: string
  timestamp: string
  isOwn: boolean
  status: 'sent' | 'delivered' | 'read'
  type?: 'text' | 'system' | 'file'
  fileType?: 'receipt' | 'image' | 'document'
  sender_id?: string
}

export const ChatPage = () => {
  const [searchParams] = useSearchParams()
  const [selectedContact, setSelectedContact] = useState<number>(1)
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [p2pContext, setP2PContext] = useState<P2POrderLocal | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting' | 'error'
  >('disconnected')
  const [isTyping, setIsTyping] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)

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

  // Bot calls hook
  const { bots, incomingCall, handleInitiateBotCall, handleAcceptIncomingCall, handleRejectIncomingCall } = useBotCalls()

  // Media capture hook
  const { localVideoRef: mediaLocalVideoRef, remoteVideoRef: mediaRemoteVideoRef, startMediaCapture, stopMediaCapture, isMediaReady, mediaError } = useMediaCapture()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Debug: Log bots e sidebar
  useEffect(() => {
    console.log('📱 Debug - Sidebar:', { isSidebarOpen, botsCount: bots.length, shouldRender: isSidebarOpen && bots.length > 0 })
  }, [isSidebarOpen, bots])

  // Monitorar quando aceita chamada do bot
  useEffect(() => {
    // Se incomingCall.isOpen mudou de true para false, significa que foi aceito
    if (!incomingCall.isOpen && incomingCall.botId && incomingCall.callType) {
      console.log(`✅ Chamada aceita do bot ${incomingCall.botName}`)
      
      // Ativar CallModal
      setIsCallActive(true)
      setCallType(incomingCall.callType)
      setCallDuration(0)
      callDurationRef.current = 0
      
      // Capturar mídia
      startMediaCapture(incomingCall.callType).then(() => {
        console.log('🎥 Mídia capturada após aceitar')
      })
    }
  }, [incomingCall.isOpen, incomingCall.botId, incomingCall.callType, incomingCall.botName, startMediaCapture])

  // Detectar contexto P2P dos parâmetros da URL
  const urlUserId = searchParams.get('userId')
  const urlOrderId = searchParams.get('orderId')
  const urlContext = searchParams.get('context')

  // Carregar dados da ordem P2P
  useEffect(() => {
    if (urlContext === 'p2p' && urlOrderId) {
      // TODO: Buscar dados reais da API
      // const orderData = await fetch(`/api/p2p/orders/${urlOrderId}`)

      // Mock de dados para demonstração
      setP2PContext({
        id: urlOrderId,
        orderId: urlOrderId,
        type: 'sell',
        coin: 'BTC',
        amount: '0.05',
        price: '460000',
        total: '23000',
        minAmount: '1000',
        maxAmount: '50000',
        fiatCurrency: 'BRL',
        paymentMethods: ['PIX', 'Transferência Bancária'],
        timeLimit: 30,
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        tradeId: '123',
      })

      // Selecionar o contato automaticamente
      if (urlUserId) {
        setSelectedContact(parseInt(urlUserId))
      }
    }
  }, [urlContext, urlOrderId, urlUserId])

  // Timer countdown
  useEffect(() => {
    if (!p2pContext?.expiresAt) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(p2pContext.expiresAt!).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining('Expirado')
        clearInterval(interval)
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [p2pContext?.expiresAt])

  // Salvar estado da sidebar no localStorage
  useEffect(() => {
    localStorage.setItem('chatSidebarOpen', String(isSidebarOpen))
  }, [isSidebarOpen])

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

  const contacts: Contact[] = [
    {
      id: 1,
      name: 'Suporte HOLD',
      avatar: 'shield',
      avatarColor: 'from-blue-500 to-blue-700',
      lastMessage: 'Como posso ajudar com sua carteira?',
      timestamp: '14:30',
      unread: 0,
      isOnline: true,
      isSupport: true,
      rating: 5,
    },
    {
      id: 2,
      name: 'Carlos Silva',
      avatar: 'user',
      avatarColor: 'from-green-500 to-green-700',
      lastMessage: 'A transação foi confirmada!',
      timestamp: '13:45',
      unread: 2,
      isOnline: true,
    },
    {
      id: 3,
      name: 'Ana Costa',
      avatar: 'userCheck',
      avatarColor: 'from-purple-500 to-purple-700',
      lastMessage: 'Obrigada pela negociação',
      timestamp: '12:20',
      unread: 0,
      isOnline: false,
    },
    {
      id: 4,
      name: 'Trading Group',
      avatar: 'trendingUp',
      avatarColor: 'from-orange-500 to-orange-700',
      lastMessage: 'Bitcoin subindo!',
      timestamp: 'Ontem',
      unread: 5,
      isOnline: true,
    },
    {
      id: 5,
      name: 'Maria Santos',
      avatar: 'building',
      avatarColor: 'from-pink-500 to-pink-700',
      lastMessage: 'Vamos fechar esse negócio?',
      timestamp: 'Ontem',
      unread: 1,
      isOnline: false,
    },
  ]

  const mockMessages: Record<number, Message[]> = {
    1: [
      {
        id: '1',
        content: 'Olá! Bem-vindo ao suporte da HOLD. Como posso ajudar você hoje?',
        timestamp: '14:28',
        isOwn: false,
        status: 'read',
      },
      {
        id: '2',
        content: 'Tenho uma dúvida sobre minha carteira Bitcoin',
        timestamp: '14:29',
        isOwn: true,
        status: 'read',
      },
      {
        id: '3',
        content:
          'Claro! Vou verificar sua conta. Posso ajudar com qualquer questão sobre carteiras, transações ou segurança.',
        timestamp: '14:30',
        isOwn: false,
        status: 'read',
      },
    ],
    2: [
      {
        id: '4',
        content: 'Oi! A transferência de 0.001 BTC foi processada',
        timestamp: '13:40',
        isOwn: false,
        status: 'read',
      },
      {
        id: '5',
        content: 'Perfeito! Muito obrigado pela rapidez',
        timestamp: '13:43',
        isOwn: true,
        status: 'delivered',
      },
      {
        id: '6',
        content: 'A transação foi confirmada!',
        timestamp: '13:45',
        isOwn: false,
        status: 'sent',
      },
    ],
  }

  const currentContact = contacts.find(c => c.id === selectedContact)
  let currentMessages: Message[] = mockMessages[selectedContact] || []

  // Adicionar mensagens do sistema para contexto P2P
  if (p2pContext) {
    const p2pSystemMessages: Message[] = [
      {
        id: '9001',
        content: `Negociação P2P #${p2pContext.orderId} iniciada! ${p2pContext.type === 'buy' ? 'Compra' : 'Venda'} de ${p2pContext.amount} ${p2pContext.coin} por ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: p2pContext.fiatCurrency }).format(parseFloat(p2pContext.total))}`,
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

  // Confirmar pagamento
  const handleConfirmPayment = () => {
    if (!p2pContext || !currentContact) return

    const systemMessage: Message = {
      id: Date.now().toString(),
      content: `${currentContact.name} confirmou que realizou o pagamento.`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isOwn: false,
      status: 'read',
      type: 'system',
    }

    setMessages(prev => [...prev, systemMessage])

    // Enviar evento para API (simular)
    console.log('Pagamento confirmado para ordem:', p2pContext.orderId)

    // Toast/notificação de sucesso
    alert(
      '✅ Pagamento confirmado! Você tem até ' +
        p2pContext.timeLimit +
        ' minutos para liberar a moeda.'
    )
  }

  // Enviar comprovante de pagamento
  const handleSendReceipt = () => {
    if (!p2pContext || !currentContact) return

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*,application/pdf'

    fileInput.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file) {
        const fileName = file.name
        const fileMessage: Message = {
          id: Date.now().toString(),
          content: `📄 ${fileName}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          isOwn: true,
          status: 'delivered',
          type: 'file',
          fileType: file.type.startsWith('image/') ? 'image' : 'document',
        }

        setMessages(prev => [...prev, fileMessage])

        // Simular envio para API
        console.log('Comprovante enviado:', fileName)
        alert('📤 Comprovante enviado com sucesso!')
      }
    }

    fileInput.click()
  }

  // Reportar problema/disputa
  const handleReportDispute = () => {
    if (!p2pContext || !currentContact) return

    const reason = prompt('Descreva o problema encontrado nesta transação:')

    if (reason && reason.trim()) {
      const systemMessage: Message = {
        id: Date.now().toString(),
        content: `⚠️ Disputa reportada: "${reason}"`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
        status: 'read',
        type: 'system',
      }

      setMessages(prev => [...prev, systemMessage])

      // Enviar para API
      console.log('Disputa reportada para ordem:', p2pContext.orderId, 'Motivo:', reason)
      alert('⚠️ Sua disputa foi reportada. A equipe de suporte entrará em contato em breve.')
    }
  }

  // Cancelar transação/trade
  const handleCancelTrade = () => {
    if (!p2pContext || !currentContact) return

    const confirmCancel = confirm(
      'Tem certeza que deseja cancelar esta transação? Esta ação não pode ser desfeita.'
    )

    if (confirmCancel) {
      const reason = prompt('Por que você deseja cancelar?')

      if (reason !== null) {
        const systemMessage: Message = {
          id: Date.now().toString(),
          content: `❌ Transação cancelada${reason ? ': ' + reason : ''}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          isOwn: true,
          status: 'read',
          type: 'system',
        }

        setMessages(prev => [...prev, systemMessage])

        // Atualizar status do contexto P2P
        if (p2pContext) {
          setP2PContext(prev => (prev ? { ...prev, status: 'cancelled' } : null))
        }

        // Enviar para API
        console.log('Transação cancelada para ordem:', p2pContext.orderId)
        alert('❌ Transação cancelada com sucesso.')
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

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Aqui seria implementada a lógica de envio
      console.log('Enviando mensagem:', newMessage)
      setNewMessage('')
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
        {/* Header da Sidebar */}
        <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between mb-4'>
            <h2
              className={`text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 ${!isSidebarOpen && 'lg:hidden'}`}
            >
              <MessageCircle className='w-6 h-6 text-blue-600' />
              {isSidebarOpen && <span>Conversas</span>}
            </h2>

            {/* Botão toggle para desktop - dentro da sidebar */}
            <button
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? 'Recolher sidebar' : 'Expandir sidebar'}
              className='hidden lg:flex p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800'
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
              className='lg:hidden p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors'
            >
              <X className='w-5 h-5' />
            </button>

            {/* Botões de ação - só visíveis quando expandido */}
            {isSidebarOpen && (
              <div className='flex gap-2'>
                <button
                  aria-label='Adicionar contato'
                  className='p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                >
                  <UserPlus className='w-4 h-4' />
                </button>
                <button
                  aria-label='Configurações do chat'
                  className='p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                >
                  <Settings className='w-4 h-4' />
                </button>
              </div>
            )}
          </div>

          {/* Busca - só visível quando expandido */}
          {isSidebarOpen && (
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
              <input
                type='text'
                placeholder='Buscar conversas...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>
          )}
        </div>

        {/* Lista de Contatos */}
        <div className='flex-1 overflow-y-auto'>
          {isSidebarOpen ? (
            // Modo expandido - lista completa
            filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact.id)}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedContact === contact.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600'
                    : ''
                }`}
              >
                <div className='flex items-center gap-3'>
                  <div className='relative'>
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${contact.avatarColor} flex items-center justify-center`}
                    >
                      {getAvatarIcon(contact.avatar)}
                    </div>
                    {contact.isOnline && (
                      <div className='absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900'></div>
                    )}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between mb-1'>
                      <h3 className='font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2'>
                        {contact.name}
                        {contact.isSupport && <Shield className='w-4 h-4 text-blue-600' />}
                        {contact.rating && (
                          <div className='flex items-center gap-1'>
                            <Star className='w-3 h-3 text-yellow-500 fill-current' />
                            <span className='text-xs text-gray-500'>{contact.rating}</span>
                          </div>
                        )}
                      </h3>
                      <span className='text-xs text-gray-500 dark:text-gray-400'>
                        {contact.timestamp}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <p className='text-sm text-gray-600 dark:text-gray-300 truncate'>
                        {contact.lastMessage}
                      </p>
                      {contact.unread > 0 && (
                        <span className='bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2'>
                          {contact.unread}
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

        {/* Bot Contacts Section */}
        {isSidebarOpen && bots.length > 0 && (
          <BotContactsSection bots={bots} onInitiateCall={handleInitiateBotCall} />
        )}
      </div>

      {/* Área de Chat Principal */}
      <div className='flex-1 flex flex-col'>
        {/* Botão toggle mobile - fixo no topo do chat */}
        <button
          onClick={toggleSidebar}
          aria-label='Abrir menu de conversas'
          className='lg:hidden absolute top-4 left-4 z-30 p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors'
        >
          <Menu className='w-5 h-5' />
        </button>

        {currentContact ? (
          <>
            {/* Header do Chat - Responsivo */}
            <div className='p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'>
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 sm:gap-3 flex-1 min-w-0'>
                  <div className='relative'>
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${currentContact.avatarColor} flex items-center justify-center`}
                    >
                      {getAvatarIcon(currentContact.avatar, 'small')}
                    </div>
                    {currentContact.isOnline && (
                      <div className='absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800'></div>
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2 truncate'>
                      <span className='truncate'>{currentContact.name}</span>
                      {currentContact.isSupport && (
                        <Shield className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0' />
                      )}
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                      {currentContact.isOnline ? 'Online' : 'Visto por último às 12:30'}
                    </p>
                  </div>
                </div>

                {/* Botões de ação - responsivos */}
                <div className='flex gap-1 sm:gap-2'>
                  <button
                    onClick={handleInitiateAudioCall}
                    aria-label='Ligar'
                    className='p-1.5 sm:p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors'
                    title='Iniciar chamada de voz'
                  >
                    <Phone className='w-4 h-4 sm:w-5 sm:h-5' />
                  </button>
                  <button
                    onClick={handleInitiateVideoCall}
                    aria-label='Videochamada'
                    className='p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                    title='Iniciar chamada de vídeo'
                  >
                    <Video className='w-4 h-4 sm:w-5 sm:h-5' />
                  </button>
                  <button
                    aria-label='Mais opções'
                    className='p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors'
                  >
                    <MoreVertical className='w-4 h-4 sm:w-5 sm:h-5' />
                  </button>
                </div>
              </div>
            </div>

            {/* Card de Contexto P2P - Fixo no topo */}
            {p2pContext && (
              <div className='bg-gradient-to-r from-blue-500 to-purple-600 p-2 sm:p-4 shadow-lg'>
                <div className='bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20'>
                  <div className='flex flex-col sm:flex-row items-start gap-3 sm:gap-4'>
                    {/* Header Mobile: Ícone + Título + Status */}
                    <div className='flex items-center gap-3 w-full sm:w-auto'>
                      {/* Ícone da Crypto */}
                      <div className='w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg'>
                        <Bitcoin className='w-6 h-6 sm:w-8 sm:h-8 text-white' />
                      </div>

                      {/* Título e Status (mobile) */}
                      <div className='flex-1 sm:hidden text-white min-w-0'>
                        <h3 className='font-bold text-sm truncate'>
                          {p2pContext.type === 'buy' ? 'Comprar' : 'Vender'} {p2pContext.amount}{' '}
                          {p2pContext.coin}
                        </h3>
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
                        <h3 className='font-bold text-lg truncate'>
                          {p2pContext.type === 'buy' ? 'Comprar' : 'Vender'} {p2pContext.amount}{' '}
                          {p2pContext.coin}
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
                              currency: p2pContext.fiatCurrency,
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(parseFloat(p2pContext.total))}
                          </span>
                        </div>
                        <div>
                          <span className='opacity-75'>Preço:</span>
                          <span className='font-bold ml-1 truncate block'>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: p2pContext.fiatCurrency,
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(parseFloat(p2pContext.price))}
                            /{p2pContext.coin}
                          </span>
                        </div>
                        <div className='col-span-2 sm:col-span-1'>
                          <span className='opacity-75'>Limites:</span>
                          <span className='ml-1 truncate block'>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: p2pContext.fiatCurrency,
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(parseFloat(p2pContext.minAmount))}{' '}
                            -{' '}
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: p2pContext.fiatCurrency,
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(parseFloat(p2pContext.maxAmount))}
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <Timer className='w-3 h-3 opacity-75' />
                          <span className='opacity-75'>Prazo:</span>
                          <span className='ml-1'>{p2pContext.timeLimit} min</span>
                        </div>
                      </div>

                      {/* Payment methods - responsivo */}
                      <div className='flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-0'>
                        {p2pContext.paymentMethods.map((method: string, idx: number) => (
                          <span
                            key={idx}
                            className='text-xs bg-white/20 px-2 py-1 rounded flex items-center gap-1'
                          >
                            {method === 'PIX' ? (
                              <CreditCard className='w-3 h-3' />
                            ) : (
                              <Banknote className='w-3 h-3' />
                            )}
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Botão Ver Detalhes - responsivo */}
                    <button
                      onClick={() => window.open(`/p2p/order/${p2pContext.orderId}`, '_blank')}
                      className='w-full sm:w-auto px-3 sm:px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap'
                    >
                      <ExternalLink className='w-3 h-3 sm:w-4 sm:h-4' />
                      <span className='hidden sm:inline'>Ver Detalhes</span>
                      <span className='sm:hidden'>Detalhes</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

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

            {/* Área de Mensagens - Responsiva */}
            <div className='flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50 dark:bg-gray-900/50'>
              {currentMessages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === 'system'
                      ? 'justify-center'
                      : message.isOwn
                        ? 'justify-end'
                        : 'justify-start'
                  }`}
                >
                  {message.type === 'system' ? (
                    // Mensagem do Sistema - Responsiva
                    <div className='max-w-[90%] sm:max-w-md px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-center'>
                      <div className='flex items-center justify-center gap-1.5 sm:gap-2 text-blue-600 dark:text-blue-400'>
                        <Info className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
                        <p className='text-xs sm:text-sm font-medium'>{message.content}</p>
                      </div>
                      <span className='text-xs text-blue-500 dark:text-blue-400 mt-0.5 sm:mt-1 block'>
                        {message.timestamp}
                      </span>
                    </div>
                  ) : (
                    // Mensagem Normal - Responsiva
                    <div
                      className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-2xl ${
                        message.isOwn
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p className='text-xs sm:text-sm break-words'>{message.content}</p>
                      <div
                        className={`flex items-center justify-between mt-1 gap-2 ${
                          message.isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <span className='text-xs'>{message.timestamp}</span>
                        {message.isOwn && (
                          <div className='flex items-center'>
                            {message.status === 'sent' && <Check className='w-3 h-3' />}
                            {message.status === 'delivered' && <CheckCheck className='w-3 h-3' />}
                            {message.status === 'read' && (
                              <CheckCheck className='w-3 h-3 text-blue-300' />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
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

            {/* Input de Mensagem - Responsivo */}
            <div className='p-2 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'>
              <div className='flex items-center gap-1.5 sm:gap-3'>
                {/* Botão anexar - oculto em mobile pequeno */}
                <button
                  aria-label='Anexar arquivo'
                  className='hidden xs:block p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                >
                  <Paperclip className='w-4 h-4 sm:w-5 sm:h-5' />
                </button>

                <div className='flex-1 relative'>
                  <input
                    type='text'
                    placeholder='Digite sua mensagem...'
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    className='w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-2xl text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 sm:pr-12'
                  />
                  <button
                    aria-label='Adicionar emoji'
                    className='absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-500 transition-colors'
                  >
                    <Smile className='w-4 h-4 sm:w-5 sm:h-5' />
                  </button>
                </div>

                {/* Botão mic - oculto em mobile pequeno */}
                <button
                  aria-label='Gravar áudio'
                  className='hidden xs:block p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors'
                >
                  <Mic className='w-4 h-4 sm:w-5 sm:h-5' />
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  aria-label='Enviar mensagem'
                  className='p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105'
                >
                  <Send className='w-4 h-4 sm:w-5 sm:h-5' />
                </button>
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

      {/* Incoming Call Modal - Bot ou outro usuário */}
      <IncomingCallModal
        isOpen={incomingCall.isOpen}
        callerName={incomingCall.botName}
        callType={incomingCall.callType}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
      />

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
