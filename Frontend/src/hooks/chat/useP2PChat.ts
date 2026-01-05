import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { chatP2PService } from '@/services/chatP2P'
import { ChatP2PValidator } from '@/services/chatP2PValidator'
import { p2pService } from '@/services/p2p'
import { useAuthStore } from '@/stores/useAuthStore'

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
  expiresAt?: string | undefined
  tradeId?: string | undefined
  userId?: string | undefined
  user?:
    | {
        id: string
        name: string
        avatar?: string | undefined
        rating?: number | undefined
        total_trades?: number | undefined
      }
    | undefined
}

interface UseP2PChatReturn {
  // Estados
  p2pContext: P2POrderLocal | null
  chatRoomId: string | null
  timeRemaining: string
  isConnecting: boolean
  isConnected: boolean

  // Ações
  connectP2PChat: () => Promise<void>
  disconnectP2PChat: () => void
  updateP2PStatus: (newStatus: P2POrderLocal['status']) => void

  // Dados extraídos da URL
  urlParams: {
    userId: string | null
    orderId: string | null
    context: string | null
  }
}

/**
 * Custom Hook para gerenciar chat P2P
 *
 * Responsabilidades:
 * - Extrair parâmetros da URL (userId, orderId, context)
 * - Carregar dados da ordem P2P
 * - Criar/conectar sala de chat
 * - Gerenciar countdown do tempo limite
 * - Fornecer estado de conexão
 *
 * @returns {UseP2PChatReturn} Estado e funções para gerenciar P2P chat
 */
export const useP2PChat = (): UseP2PChatReturn => {
  const [searchParams] = useSearchParams()
  const { user, token } = useAuthStore() // ✅ Obtém usuário logado e token do Zustand

  // Estados (destructured corretamente)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [p2pContext, setP2PContext] = useState<P2POrderLocal | null>(null)
  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Refs
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ✅ FIX CRÍTICO: Extrair userId da URL ao invés de localStorage
  const urlUserId = searchParams.get('userId')
  const urlOrderId = searchParams.get('orderId')
  const context = searchParams.get('context')

  /**
   * Carregar dados da ordem P2P do backend
   */
  const loadP2POrder = useCallback(async () => {
    if (!urlOrderId) {
      console.warn('⚠️ [useP2PChat] Nenhum orderId na URL')
      return
    }

    try {
      console.log('🔄 [useP2PChat] Carregando ordem P2P:', urlOrderId)

      const orderData = await chatP2PService.getOrder(urlOrderId)

      if (!orderData) {
        console.error('❌ [useP2PChat] Ordem não encontrada')
        return
      }

      // ✅ NOVO: Se a ordem não tem dados do usuário, buscar pelo perfil
      // Usar urlUserId como fallback se orderData.user_id não existir
      const counterpartyId = orderData.user_id || urlUserId
      let userData = orderData.user

      console.log('👤 [useP2PChat] Debug user data:')
      console.log('   - orderData.user:', orderData.user)
      console.log('   - orderData.user_id:', orderData.user_id)
      console.log('   - urlUserId:', urlUserId)
      console.log('   - counterpartyId:', counterpartyId)

      // ✅ Se orderData.user existe, mapear display_name para name
      if (userData) {
        // O backend retorna display_name, não name
        const apiUser = userData as {
          id: string
          display_name?: string
          name?: string
          username?: string
          avatar?: string
          avg_rating?: number
          rating?: number
          total_trades?: number
        }

        const displayName =
          apiUser.display_name ||
          apiUser.name ||
          apiUser.username ||
          `Trader ${counterpartyId?.substring(0, 8) || 'Unknown'}`

        // Construir userData com campos opcionais corretamente
        const mappedUserData: {
          id: string
          name: string
          avatar?: string
          rating?: number
          total_trades?: number
        } = {
          id: apiUser.id,
          name: displayName,
        }
        if (apiUser.avatar) mappedUserData.avatar = apiUser.avatar
        if (apiUser.avg_rating !== undefined) mappedUserData.rating = apiUser.avg_rating
        else if (apiUser.rating !== undefined) mappedUserData.rating = apiUser.rating
        if (apiUser.total_trades !== undefined) mappedUserData.total_trades = apiUser.total_trades

        userData = mappedUserData
        console.log('✅ [useP2PChat] Mapeado userData do backend:', userData)
      } else if (counterpartyId) {
        try {
          console.log('👤 [useP2PChat] Buscando perfil do usuário:', counterpartyId)
          const userProfile = await p2pService.getUserProfile(counterpartyId)
          console.log('👤 [useP2PChat] Perfil recebido:', userProfile)

          // Construir nome a partir dos campos disponíveis
          const displayName =
            userProfile.display_name ||
            (userProfile.firstName && userProfile.lastName
              ? `${userProfile.firstName} ${userProfile.lastName}`
              : userProfile.firstName ||
                userProfile.username ||
                `Trader ${counterpartyId.substring(0, 8)}`)

          // Construir userData com campos opcionais corretamente
          const userDataBuild: {
            id: string
            name: string
            avatar?: string
            rating?: number
            total_trades?: number
          } = {
            id: userProfile.id,
            name: displayName,
          }
          if (userProfile.avatar) userDataBuild.avatar = userProfile.avatar
          if (userProfile.avg_rating !== undefined) userDataBuild.rating = userProfile.avg_rating
          if (userProfile.total_trades !== undefined)
            userDataBuild.total_trades = userProfile.total_trades

          userData = userDataBuild
          console.log('✅ [useP2PChat] Perfil do usuário carregado:', userData)
        } catch (userError) {
          console.warn('⚠️ [useP2PChat] Não foi possível carregar perfil do usuário:', userError)
          // Fallback: criar userData básico com o ID
          userData = {
            id: counterpartyId,
            name: `Trader ${counterpartyId.substring(0, 8)}`,
          }
        }
      }

      // Mapear snake_case -> camelCase (backend retorna camelCase)
      const localOrder: P2POrderLocal = {
        id: orderData.id,
        orderId: orderData.id, // usar id diretamente
        type: orderData.type === 'buy' ? 'buy' : 'sell',
        coin: orderData.coin || orderData.cryptocurrency || '',
        amount: orderData.amount,
        price: orderData.price,
        total: orderData.total,
        // Backend retorna minAmount/maxAmount em camelCase
        minAmount: orderData.minAmount || orderData.min_amount || '0',
        maxAmount: orderData.maxAmount || orderData.max_amount || '0',
        fiatCurrency: orderData.fiatCurrency || orderData.fiat_currency || 'BRL',
        paymentMethods: orderData.paymentMethods || orderData.payment_methods || [],
        timeLimit: orderData.timeLimit || orderData.time_limit || 30,
        status: orderData.status,
        expiresAt: orderData.expiresAt || orderData.expires_at,
        tradeId: orderData.tradeId || orderData.trade_id,
        userId: orderData.userId || orderData.user_id,
        user: userData
          ? {
              id: userData.id,
              name: userData.name,
              avatar: userData.avatar,
              rating: userData.rating,
              total_trades: userData.total_trades,
            }
          : undefined,
      }

      console.log('✅ [useP2PChat] Ordem P2P carregada:', localOrder)
      setP2PContext(localOrder)
    } catch (error) {
      console.error('❌ [useP2PChat] Erro ao carregar ordem P2P:', error)
    }
  }, [urlOrderId, urlUserId])

  /**
   * Atualizar o status da ordem P2P
   */
  const updateP2PStatus = useCallback((newStatus: P2POrderLocal['status']) => {
    setP2PContext(prev => (prev ? { ...prev, status: newStatus } : null))
  }, [])

  /**
   * Conectar ao chat P2P - cria sala e inicia polling
   */
  const connectP2PChat = useCallback(async () => {
    if (!p2pContext) {
      console.error('❌ [useP2PChat] Contexto P2P não carregado')
      return
    }

    if (!urlOrderId) {
      console.error('❌ [useP2PChat] OrderId não encontrado na URL')
      return
    }

    // ✅ FIX: Usar userId do Zustand AuthStore (usuário logado), não da URL
    // urlUserId é a CONTRAPARTE, não o usuário atual
    const loggedUserId = user?.id
    if (!loggedUserId) {
      console.error('❌ [useP2PChat] UserId não encontrado no AuthStore - usuário não logado')
      return
    }

    setIsConnecting(true)

    try {
      console.log('🔄 [useP2PChat] Conectando ao chat P2P...')
      console.log('📋 [useP2PChat] Dados:', {
        orderId: urlOrderId,
        orderType: p2pContext.type,
        orderOwnerId: p2pContext.userId || p2pContext.user?.id,
        currentUserId: loggedUserId, // ✅ Usando usuário LOGADO
        counterpartyUserId: urlUserId, // ✅ Contraparte da URL (para referência)
      })

      // Identificar quem é o dono da ordem
      const orderOwnerId = p2pContext.userId || p2pContext.user?.id

      if (!orderOwnerId) {
        console.error('❌ [useP2PChat] ID do criador da ordem não encontrado')
        setIsConnecting(false)
        return
      }

      // ✅ Validação profissional - usar ID do usuário LOGADO
      const validation = ChatP2PValidator.validateChatRoomCreation(
        urlOrderId,
        p2pContext.type,
        orderOwnerId,
        loggedUserId // ✅ Usando usuário LOGADO, não urlUserId
      )

      if (!validation.isValid) {
        console.error('❌ [useP2PChat] Validação falhou:', validation.errorDetails)
        setIsConnecting(false)
        return
      }

      console.log('✅ [useP2PChat] Validação passou:', {
        buyerId: validation.buyerId,
        sellerId: validation.sellerId,
      })

      // Criar sala de chat
      const roomResult = await chatP2PService.createChatRoom(
        urlOrderId,
        validation.buyerId!,
        validation.sellerId!
      )

      console.log('🔍 [useP2PChat] roomResult:', roomResult)

      if (roomResult && roomResult.chat_room) {
        const chatRoomIdCreated = roomResult.chat_room.id
        console.log('✅ [useP2PChat] Sala de chat criada/encontrada:', chatRoomIdCreated)
        setChatRoomId(chatRoomIdCreated)

        // ✅ FIX CRÍTICO: Conectar ao WebSocket após criar a sala!
        // Tentar múltiplas fontes de token
        let authToken = token || localStorage.getItem('token')

        // Se ainda não tem token, tentar buscar do persist storage do Zustand
        if (!authToken) {
          try {
            const authStorage = localStorage.getItem('auth-storage')
            if (authStorage) {
              const parsed = JSON.parse(authStorage)
              authToken = parsed?.state?.token
              console.log(
                '🔑 [useP2PChat] Token recuperado do auth-storage:',
                authToken ? 'SIM' : 'NÃO'
              )
            }
          } catch (e) {
            console.warn('⚠️ [useP2PChat] Erro ao parsear auth-storage:', e)
          }
        }

        console.log(
          '🔑 [useP2PChat] Token final:',
          authToken ? `SIM (${authToken.substring(0, 20)}...)` : 'NÃO'
        )

        if (authToken) {
          try {
            console.log('🔌 [useP2PChat] Conectando ao WebSocket...')
            await chatP2PService.connectToRoom(chatRoomIdCreated, authToken)
            console.log('✅ [useP2PChat] WebSocket conectado!')
            setIsConnected(true)
          } catch (wsError) {
            console.error('❌ [useP2PChat] Erro ao conectar WebSocket:', wsError)
            // Mesmo com erro no WebSocket, a sala foi criada
            setIsConnected(false)
          }
        } else {
          console.warn(
            '⚠️ [useP2PChat] Token não encontrado (Zustand nem localStorage), WebSocket não conectado'
          )
          setIsConnected(false)
        }

        setIsConnecting(false)
      } else {
        console.error(
          '❌ [useP2PChat] Falha ao criar sala de chat - roomResult inválido:',
          roomResult
        )
        setIsConnecting(false)
      }
    } catch (error) {
      console.error('❌ [useP2PChat] Erro ao conectar:', error)
      setIsConnecting(false)
    }
  }, [p2pContext, urlOrderId, urlUserId, user, token])

  /**
   * Desconectar do chat P2P
   */
  const disconnectP2PChat = useCallback(() => {
    console.log('🔌 [useP2PChat] Desconectando...')

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    chatP2PService.disconnect()
    setChatRoomId(null)
    setIsConnected(false)
    setTimeRemaining('')
  }, [])

  /**
   * Calcular tempo restante
   */
  const updateTimeRemaining = useCallback(() => {
    if (!p2pContext?.expiresAt) {
      setTimeRemaining('')
      return
    }

    const now = Date.now()
    const expiresAt = new Date(p2pContext.expiresAt).getTime()
    const diff = expiresAt - now

    if (diff <= 0) {
      setTimeRemaining('Expirado')
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      return
    }

    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
  }, [p2pContext?.expiresAt])

  // ✅ Effect: Carregar ordem P2P quando orderId muda
  useEffect(() => {
    if (context === 'p2p' && urlOrderId) {
      console.log('🎬 [useP2PChat] Carregando ordem P2P...', urlOrderId)
      loadP2POrder()
    }
  }, [context, urlOrderId, loadP2POrder])

  // ✅ Effect: Iniciar countdown quando p2pContext carrega
  useEffect(() => {
    if (!p2pContext?.expiresAt) return

    console.log('⏱️ [useP2PChat] Iniciando countdown...')

    // Atualizar imediatamente
    updateTimeRemaining()

    // Atualizar a cada segundo
    countdownIntervalRef.current = setInterval(updateTimeRemaining, 1000)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [p2pContext?.expiresAt, updateTimeRemaining])

  // ✅ Effect: Cleanup ao desmontar - SEM dependência de disconnectP2PChat
  // para evitar que o cleanup seja chamado em cada re-render
  useEffect(() => {
    return () => {
      console.log('🧹 [useP2PChat] Cleanup - componente desmontado')
      chatP2PService.disconnect()
    }
  }, []) // ✅ Array vazio = só executa cleanup quando desmontar DE VERDADE

  // ✅ Effect: Sincronizar isConnected com o status real do WebSocket
  useEffect(() => {
    const unsubscribe = chatP2PService.onStatus(status => {
      console.log('🔄 [useP2PChat] Status do WebSocket mudou:', status)
      if (status === 'connected') {
        setIsConnected(true)
        setIsConnecting(false)
      } else if (status === 'connecting') {
        setIsConnecting(true)
        setIsConnected(false)
      } else if (status === 'disconnected' || status === 'error') {
        setIsConnected(false)
        setIsConnecting(false)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return {
    // Estados
    p2pContext,
    chatRoomId,
    timeRemaining,
    isConnecting,
    isConnected,

    // Ações
    connectP2PChat,
    disconnectP2PChat,
    updateP2PStatus,

    // URL params
    urlParams: {
      userId: urlUserId,
      orderId: urlOrderId,
      context,
    },
  }
}
