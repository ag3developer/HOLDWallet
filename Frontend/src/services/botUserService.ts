/**
 * 🤖 Bot User Service
 * Simula um usuário bot para testes de chamadas P2P
 */

export interface BotUser {
  id: string
  name: string
  avatar: string
  status: 'online' | 'offline' | 'in_call'
  isBot: true
  responseDelay: number // ms para simular latência
}

export interface BotCallEvent {
  type: 'incoming_call' | 'call_accepted' | 'call_rejected' | 'call_ended'
  callId: string
  callType: 'audio' | 'video'
  timestamp: number
}

class BotUserService {
  private static instance: BotUserService
  private botUsers: BotUser[] = []
  private activeCallId: string | null = null
  private callEventListeners: ((event: BotCallEvent) => void)[] = []

  private constructor() {
    this.initializeBots()
  }

  static getInstance(): BotUserService {
    if (!BotUserService.instance) {
      BotUserService.instance = new BotUserService()
    }
    return BotUserService.instance
  }

  /**
   * Inicializa os bots disponíveis
   */
  private initializeBots() {
    this.botUsers = [
      {
        id: 'bot_support',
        name: '🤖 Bot Suporte',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot_support',
        status: 'online',
        isBot: true,
        responseDelay: 500,
      },
      {
        id: 'bot_trader',
        name: '💰 Bot Trader',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot_trader',
        status: 'online',
        isBot: true,
        responseDelay: 800,
      },
      {
        id: 'bot_assistant',
        name: '🎯 Bot Assistente',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot_assistant',
        status: 'online',
        isBot: true,
        responseDelay: 600,
      },
    ]
  }

  /**
   * Obtém lista de bots disponíveis
   */
  getBots(): BotUser[] {
    return this.botUsers
  }

  /**
   * Obtém um bot específico
   */
  getBot(botId: string): BotUser | undefined {
    return this.botUsers.find(bot => bot.id === botId)
  }

  /**
   * Simula uma chamada recebida do bot
   */
  async simulateIncomingCall(botId: string, callType: 'audio' | 'video'): Promise<string> {
    const bot = this.getBot(botId)
    if (!bot) {
      throw new Error(`Bot ${botId} não encontrado`)
    }

    const callId = `call_bot_${Date.now()}`
    this.activeCallId = callId

    // Simular chegada de chamada
    console.log(`🤖 [BOT] Chamada recebida de ${bot.name}`)

    // Emitir evento de chamada recebida
    this.emitCallEvent({
      type: 'incoming_call',
      callId,
      callType,
      timestamp: Date.now(),
    })

    // Aguardar resposta com delay
    await this.delay(bot.responseDelay)

    return callId
  }

  /**
   * Simula aceitação de chamada pelo bot
   */
  async acceptCall(callId: string): Promise<void> {
    const delay = Math.random() * 1000 + 500 // 500-1500ms
    await this.delay(delay)

    console.log(`🤖 [BOT] Chamada ${callId} aceita`)

    this.emitCallEvent({
      type: 'call_accepted',
      callId,
      callType: 'audio',
      timestamp: Date.now(),
    })
  }

  /**
   * Simula rejeição de chamada pelo bot
   */
  async rejectCall(callId: string): Promise<void> {
    const delay = Math.random() * 500 + 200 // 200-700ms
    await this.delay(delay)

    console.log(`🤖 [BOT] Chamada ${callId} rejeitada`)

    this.emitCallEvent({
      type: 'call_rejected',
      callId,
      callType: 'audio',
      timestamp: Date.now(),
    })

    this.activeCallId = null
  }

  /**
   * Simula encerramento de chamada pelo bot
   */
  async endCall(callId: string, duration: number): Promise<void> {
    // Bot desliga após duração aleatória
    const botHangupDelay = Math.random() * (duration > 30 ? 5000 : 3000)
    await this.delay(botHangupDelay)

    console.log(`🤖 [BOT] Finalizando chamada ${callId}`)

    this.emitCallEvent({
      type: 'call_ended',
      callId,
      callType: 'audio',
      timestamp: Date.now(),
    })

    this.activeCallId = null
  }

  /**
   * Simula resposta de áudio/vídeo do bot
   */
  async getRemoteMediaStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    // Criar stream vazio com áudio
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 440 // La

    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start()

    // Parar após 2 segundos
    oscillator.stop(audioContext.currentTime + 2)

    // Retornar stream vazio (para simular áudio)
    const stream = new MediaStream()

    if (constraints.audio) {
      try {
        const audioTrack = audioContext.createMediaStreamDestination().stream.getAudioTracks()[0]
        if (audioTrack) {
          stream.addTrack(audioTrack)
        }
      } catch (error) {
        console.error('Erro ao criar track de áudio:', error)
      }
    }

    if (constraints.video) {
      // Canvas para simular vídeo
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 480

      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Background
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        gradient.addColorStop(0, '#0f3460')
        gradient.addColorStop(1, '#16213e')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Texto
        ctx.fillStyle = '#00d4ff'
        ctx.font = 'bold 48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('🤖 BOT', canvas.width / 2, canvas.height / 2 - 30)

        ctx.fillStyle = '#00ff88'
        ctx.font = 'bold 32px Arial'
        ctx.fillText('Simulação de Vídeo', canvas.width / 2, canvas.height / 2 + 40)

        // Animação
        let hue = 0
        const animate = () => {
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
          ctx.fillRect(20, 20, 20, 20)

          hue = (hue + 5) % 360
          requestAnimationFrame(animate)
        }
        animate()
      }

      const videoStream = canvas.captureStream(30)
      videoStream.getTracks().forEach(track => {
        stream.addTrack(track)
      })
    }

    return stream
  }

  /**
   * Registra listener para eventos de chamada
   */
  onCallEvent(callback: (event: BotCallEvent) => void): () => void {
    this.callEventListeners.push(callback)

    // Retorna função para unsubscribe
    return () => {
      this.callEventListeners = this.callEventListeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Emite evento de chamada
   */
  private emitCallEvent(event: BotCallEvent) {
    this.callEventListeners.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Erro ao processar evento de chamada:', error)
      }
    })
  }

  /**
   * Simula atraso
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Atualiza status do bot
   */
  updateBotStatus(botId: string, status: 'online' | 'offline' | 'in_call'): void {
    const bot = this.getBot(botId)
    if (bot) {
      bot.status = status
    }
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.callEventListeners = []
    this.activeCallId = null
  }
}

export const botUserService = BotUserService.getInstance()
