/**
 * 🤖 Bot Service
 * Simula usuários bot para testar chamadas P2P
 */

export interface BotUser {
  id: string
  name: string
  avatar: string
  status: 'online' | 'offline' | 'busy'
  role: 'trader' | 'support'
  responseDelay: number // ms
}

export interface BotCallEvent {
  type: 'incoming_call' | 'call_accepted' | 'call_rejected' | 'call_ended'
  botId: string
  botName: string
  callType: 'audio' | 'video'
  timestamp: number
}

class BotServiceClass {
  private bots: Map<string, BotUser> = new Map()
  private listeners: ((event: BotCallEvent) => void)[] = []
  private activeCallId: string | null = null

  constructor() {
    this.initializeBots()
  }

  private initializeBots() {
    const botsList: BotUser[] = [
      {
        id: 'bot-1',
        name: '🤖 Bot Trader',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot1&scale=80',
        status: 'online',
        role: 'trader',
        responseDelay: 500,
      },
      {
        id: 'bot-2',
        name: '🎧 Bot Support',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot2&scale=80',
        status: 'online',
        role: 'support',
        responseDelay: 800,
      },
      {
        id: 'bot-3',
        name: '💼 Bot Manager',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot3&scale=80',
        status: 'online',
        role: 'trader',
        responseDelay: 600,
      },
    ]

    botsList.forEach(bot => this.bots.set(bot.id, bot))
  }

  /**
   * Obtém lista de todos os bots
   */
  getBots(): BotUser[] {
    return Array.from(this.bots.values())
  }

  /**
   * Obtém um bot específico
   */
  getBot(botId: string): BotUser | undefined {
    return this.bots.get(botId)
  }

  /**
   * Inicia uma chamada com um bot
   * O bot responde após um delay
   */
  async initiateCallWithBot(
    botId: string,
    callType: 'audio' | 'video'
  ): Promise<boolean> {
    const bot = this.bots.get(botId)
    if (!bot) {
      console.error('Bot não encontrado:', botId)
      return false
    }

    if (bot.status === 'offline') {
      console.warn('Bot está offline:', bot.name)
      return false
    }

    this.activeCallId = `call_${Date.now()}_${botId}`

    // Emite evento de chamada recebida
    this.emitEvent({
      type: 'incoming_call',
      botId,
      botName: bot.name,
      callType,
      timestamp: Date.now(),
    })

    // Bot responde após delay
    return new Promise(resolve => {
      setTimeout(() => {
        this.emitEvent({
          type: 'call_accepted',
          botId,
          botName: bot.name,
          callType,
          timestamp: Date.now(),
        })
        resolve(true)
      }, bot.responseDelay)
    })
  }

  /**
   * Simula o bot rejeitando uma chamada
   */
  rejectCall(botId: string): void {
    const bot = this.bots.get(botId)
    if (!bot) return

    this.emitEvent({
      type: 'call_rejected',
      botId,
      botName: bot.name,
      callType: 'audio',
      timestamp: Date.now(),
    })

    this.activeCallId = null
  }

  /**
   * Encerra uma chamada com o bot
   */
  endCall(botId: string): void {
    const bot = this.bots.get(botId)
    if (!bot) return

    this.emitEvent({
      type: 'call_ended',
      botId,
      botName: bot.name,
      callType: 'audio',
      timestamp: Date.now(),
    })

    this.activeCallId = null
  }

  /**
   * Atualiza status do bot
   */
  updateBotStatus(botId: string, status: 'online' | 'offline' | 'busy'): void {
    const bot = this.bots.get(botId)
    if (bot) {
      bot.status = status
    }
  }

  /**
   * Registra listener para eventos do bot
   */
  onBotEvent(callback: (event: BotCallEvent) => void): () => void {
    this.listeners.push(callback)
    // Retorna função para desinscrever
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  /**
   * Emite evento para todos os listeners
   */
  private emitEvent(event: BotCallEvent): void {
    console.log('🤖 Bot Event:', event)
    this.listeners.forEach(callback => callback(event))
  }

  /**
   * Verifica se há uma chamada ativa
   */
  hasActiveCall(): boolean {
    return this.activeCallId !== null
  }

  /**
   * Obtém ID da chamada ativa
   */
  getActiveCallId(): string | null {
    return this.activeCallId
  }
}

// Singleton
export const botService = new BotServiceClass()
