/**
 * 🤖 useBotCalls Hook
 * Hook para gerenciar chamadas do bot
 */

import { useCallback, useEffect, useState } from 'react'
import { botUserService, BotCallEvent, BotUser } from '@/services/botUserService'

export interface UseBotCallsResult {
  bots: BotUser[]
  incomingCall: {
    isOpen: boolean
    botId: string | null
    botName: string
    callType: 'audio' | 'video'
  }
  handleInitiateBotCall: (botId: string, callType: 'audio' | 'video') => Promise<void>
  handleAcceptIncomingCall: () => Promise<void>
  handleRejectIncomingCall: () => Promise<void>
}

export function useBotCalls(): UseBotCallsResult {
  const [bots, setBots] = useState<BotUser[]>([])
  const [incomingCall, setIncomingCall] = useState({
    isOpen: false,
    botId: null as string | null,
    botName: '',
    callType: 'audio' as 'audio' | 'video',
  })

  // Carregar bots
  useEffect(() => {
    const botsList = botUserService.getBots()
    console.log('🤖 Bots carregados no hook:', botsList)
    setBots(botsList)
  }, [])

  // Escutar eventos de chamada do bot
  useEffect(() => {
    const unsubscribe = botUserService.onCallEvent((event: BotCallEvent) => {
      console.log('📞 Evento de chamada:', event)

      if (event.type === 'incoming_call') {
        // Simulação: mostrar chamada recebida
        const callingBot = bots.find(b => incomingCall.botId === b.id)
        if (callingBot) {
          setIncomingCall(prev => ({
            ...prev,
            isOpen: true,
            callType: event.callType,
          }))
        }
      } else if (event.type === 'call_ended') {
        setIncomingCall(prev => ({
          ...prev,
          isOpen: false,
        }))
      }
    })

    return () => {
      unsubscribe()
    }
  }, [bots, incomingCall.botId])

  // Iniciar chamada com bot (simular chamada recebida)
  const handleInitiateBotCall = useCallback(
    async (botId: string, callType: 'audio' | 'video') => {
      try {
        const bot = botUserService.getBot(botId)
        if (!bot) {
          throw new Error(`Bot ${botId} não encontrado`)
        }

        console.log(`📞 Iniciando chamada com ${bot.name}`)

        // Simular chamada recebida do bot
        await botUserService.simulateIncomingCall(botId, callType)

        setIncomingCall(prev => ({
          ...prev,
          botId,
          botName: bot.name,
          callType,
          isOpen: true,
        }))

        // 50% de chance do bot aceitar automaticamente
        if (Math.random() > 0.5) {
          setTimeout(async () => {
            const callId = `call_bot_${Date.now()}`
            await botUserService.acceptCall(callId)

            // Simular fim da chamada após 10-30 segundos
            setTimeout(() => {
              botUserService.endCall(callId, Math.random() * 20 + 10)
            }, Math.random() * 20000 + 10000)
          }, 2000)
        }
      } catch (error) {
        console.error('Erro ao iniciar chamada com bot:', error)
      }
    },
    [],
  )

  // Aceitar chamada recebida
  const handleAcceptIncomingCall = useCallback(async () => {
    if (!incomingCall.botId) return

    console.log(`✅ Aceitando chamada do bot ${incomingCall.botName}`)

    setIncomingCall(prev => ({
      ...prev,
      isOpen: false,
    }))

    try {
      const callId = `call_${Date.now()}`
      await botUserService.acceptCall(callId)

      // Simular fim da chamada após 10-30 segundos
      setTimeout(() => {
        botUserService.endCall(callId, Math.random() * 20 + 10)
      }, Math.random() * 20000 + 10000)
    } catch (error) {
      console.error('Erro ao aceitar chamada:', error)
    }
  }, [incomingCall.botId, incomingCall.botName])

  // Rejeitar chamada recebida
  const handleRejectIncomingCall = useCallback(async () => {
    if (!incomingCall.botId) return

    console.log(`❌ Rejeitando chamada do bot ${incomingCall.botName}`)

    setIncomingCall(prev => ({
      ...prev,
      isOpen: false,
    }))

    try {
      const callId = `call_${Date.now()}`
      await botUserService.rejectCall(callId)
    } catch (error) {
      console.error('Erro ao rejeitar chamada:', error)
    }
  }, [incomingCall.botId, incomingCall.botName])

  return {
    bots,
    incomingCall,
    handleInitiateBotCall,
    handleAcceptIncomingCall,
    handleRejectIncomingCall,
  }
}
