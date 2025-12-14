/**
 * 🤖 ChatBot Service
 * Gerencia conversas com bots de IA simulados
 * Suporta mensagens de texto e áudio
 */

export interface BotResponse {
  message: string
  delay: number // ms antes de enviar resposta
}

class ChatbotServiceClass {
  /**
   * Respostas dos bots baseadas em palavras-chave
   */
  private readonly botResponses = {
    'bot-trader': {
      // Bot Trader - especializado em compra/venda
      'olá|oi|hey|bom dia|boa tarde|boa noite': [
        'Olá! 👋 Sou o Bot Trader. Como posso ajudar com suas negociações hoje?',
        'E aí! Tudo bem? Vou ajudar você a encontrar os melhores preços! 📈',
        'Opa! Bem-vindo! Qual criptomoeda você quer negociar?',
      ],
      'preço|preco|cotação|cotacao|valor|taxa': [
        'Os preços estão atualizados em tempo real! Bitcoin está em alta. Você quer comprar ou vender?',
        'Qual moeda você quer verificar o preço? Bitcoin, Ethereum, USDT?',
        'Os preços mudam constantemente. Qual criptmoeda interessa você?',
      ],
      'bitcoin|btc': [
        'Bitcoin! A rainha das criptomoedas 👑 Atualmente em ótima situação. Quer comprar?',
        'BTC está forte! Qual é sua estratégia?',
        'Bitcoin continua sendo a melhor opção para longo prazo!',
      ],
      'ethereum|eth': [
        'Ethereum! A plataforma de contratos inteligentes mais confiável! 🔗',
        'ETH é uma ótima escolha! Oferece mais aplicações que Bitcoin.',
        'Ethereum tem grande potencial técnico!',
      ],
      'usdt|stablecoin|stable': [
        'USDT é perfeito para manter valor sem volatilidade! Ideal para traders!',
        'Stablecoins são ótimas para gerenciar risco. Quer usar como reserva?',
        'USDT está vinculada ao dólar - segura e previsível!',
      ],
      'comprar|buy': [
        'Ótimo! Qual moeda você quer comprar e por quanto?',
        'Vamos lá! Qual é o valor que você quer investir?',
        'Excelente escolha! Diga a moeda e a quantidade.',
      ],
      'vender|sell': [
        'Vendo! Qual moeda você quer vender? E em que quantidade?',
        'Certo! Vamos processar sua venda. Qual moeda?',
        'Bora vender! Diga qual é a moeda.',
      ],
      'taxa|fee|comissão|comissao': [
        'Nossa taxa é super competitiva! 0,5% para cada operação. Quer saber mais?',
        'Taxa de 0,5% em ambas as operações. É das mais baixas do mercado!',
        'Cobramos apenas 0,5% - muito abaixo da média!',
      ],
      'obrigado|thanks|agradeço|valeu': [
        'De nada! Volte sempre que precisar! 😊',
        'Por nada! Boa negociação! 📈',
        'Estou sempre aqui para ajudar!',
      ],
      'adeus|tchau|até logo|bye': [
        'Até logo! Boas negociações! 👋',
        'Tchau! Volte em breve! 📊',
        'Falou! Sucesso nas suas operações!',
      ],
    },
    'bot-support': {
      // Bot Support - especializado em suporte técnico
      'olá|oi|hey|bom dia|boa tarde|boa noite': [
        'Olá! 🎧 Sou o Bot Support. Como posso ajudar você?',
        'Opa! Bem-vindo ao suporte. Qual é o seu problema?',
        'Oi! Estou aqui para resolver seus problemas. O que aconteceu?',
      ],
      'problema|erro|bug|issue|não funciona|nao funciona': [
        'Desculpa pelo incômodo! 😔 Me conte os detalhes do que não está funcionando.',
        'Ótimo, vamos resolver isso juntos! Qual é o erro exatamente?',
        'Entendo! Deixa eu ajudar. Me descreva o problema.',
      ],
      'carteira|wallet': [
        'Problemas com a carteira? Qual é a questão específica?',
        'Sua carteira está com algum problema? Me diga mais detalhes!',
        'Carteira é essencial! Vamos resolver isso.',
      ],
      'saldo|balance': [
        'Seu saldo não está certo? Vamos verificar sua conta!',
        'Problema com saldo? Deixa eu investigar!',
        'Saldo errado? Isso pode ser sincronização. Tente recarregar!',
      ],
      'transação|transacao|envio|recebimento': [
        'Transação travada? Pode levar até 30 minutos em rede congestionada.',
        'Qual é a transação? ID ou hash? Vou rastrear!',
        'Problemas com envio/recebimento? Me mande o detalhes!',
      ],
      'token|senha|password': [
        'Segurança em primeiro lugar! Nunca compartilhe seu token/senha comigo.',
        'Por segurança, use autenticação de dois fatores!',
        'Seus dados são sagrados! Use senhas fortes sempre.',
      ],
      'obrigado|thanks|agradeço|valeu': [
        'De nada! Qualquer dúvida, é só chamar! 😊',
        'Por nada! Fico feliz em ajudar!',
        'Fico feliz em resolver! Volte anytime!',
      ],
      'adeus|tchau|até logo|bye': [
        'Até logo! Bom uso! 👋',
        'Tchau! Qualquer problema, avisa!',
        'Falou! Boa sorte com sua carteira!',
      ],
    },
    'bot-manager': {
      // Bot Manager - especializado em gerenciamento
      'olá|oi|hey|bom dia|boa tarde|boa noite': [
        'Olá! 💼 Sou o Bot Manager. Vamos gerenciar seu portfólio?',
        'Opa! Bem-vindo! Pronto para gerenciar seus investimentos?',
        'E aí! Sou o gerente aqui. Como posso otimizar seu portfólio?',
      ],
      'portfólio|portfolio|investimento|alocação|alocacao': [
        'Qual é sua estratégia de investimento? Conservadora, moderada ou agressiva?',
        'Vamos balancear seu portfólio! Que tipo de investidor você é?',
        'Bom! Deixa eu ajudar a diversificar seus ativos!',
      ],
      'risco|volatilidade|seguro|hedge': [
        'Risco é importante! Recomendo diversificar entre stablecoins e ativos voláteis.',
        'Para reduzir risco, use stablecoins como base. Concorda?',
        'Volatilidade é normal! Mas podemos hedgear com ativos mais seguros.',
      ],
      'lucro|ganho|rendimento|yield': [
        'Ganhos vêm de estratégia! Você prefere trading ou buy-and-hold?',
        'Rendimento é possível! Mas precisa de disciplina e paciência.',
        'Para bons lucros, estude o mercado antes de investir!',
      ],
      'diversificar|diversificação|diversificacao': [
        'Ótimo pensamento! Recomendo: 40% BTC, 30% ETH, 30% stablecoins.',
        'Diversificação é a chave! Nunca coloque tudo em um ativo.',
        'Excelente! Espalhe seu investimento em múltiplos ativos.',
      ],
      'meta|objetivo|goal|alvo': [
        'Qual é sua meta de retorno? 10%, 50%, 100% ao ano?',
        'Que objetivo você quer atingir com esses investimentos?',
        'Metas claras levam ao sucesso! Qual a sua?',
      ],
      'obrigado|thanks|agradeço|valeu': [
        'De nada! Sucesso em seus investimentos! 📈',
        'Por nada! Venha tirar dúvidas sempre!',
        'Fico feliz em ajudar seu crescimento!',
      ],
      'adeus|tchau|até logo|bye': [
        'Até logo! Que seus investimentos dêem frutos! 👋',
        'Tchau! Volte para mais análises!',
        'Falou! Boa sorte no mercado!',
      ],
    },
  }

  /**
   * Gera resposta de um bot baseado em mensagem do usuário
   */
  async generateBotResponse(botId: string, userMessage: string): Promise<BotResponse> {
    const message = userMessage.toLowerCase()

    // Pegar dicionário de respostas do bot
    const botDict = this.botResponses[botId as keyof typeof this.botResponses] || {}

    // Procurar por padrão que combina com a mensagem
    let selectedResponse = null
    for (const [pattern, responses] of Object.entries(botDict)) {
      const keywords = pattern.split('|')
      if (keywords.some(keyword => message.includes(keyword))) {
        // Escolher resposta aleatória daquele padrão
        selectedResponse = responses[Math.floor(Math.random() * responses.length)]
        break
      }
    }

    // Se nenhum padrão combinou, usar resposta genérica
    if (!selectedResponse) {
      selectedResponse = this.getDefaultResponse(botId)
    }

    // Delay baseado no bot
    const delays: Record<string, number> = {
      'bot-trader': 600,
      'bot-support': 800,
      'bot-manager': 700,
    }

    return {
      message: selectedResponse,
      delay: delays[botId] || 500,
    }
  }

  /**
   * Gera resposta genérica para mensagens não reconhecidas
   */
  private getDefaultResponse(botId: string): string {
    const defaults: Record<string, string[]> = {
      'bot-trader': [
        'Não entendi muito bem... Você quer comprar ou vender algo? 🤔',
        'Desculpa, pode repetir? Sou especialista em negociações!',
        'Hmm, não capturei. Quer falar de criptos ou preços?',
      ],
      'bot-support': [
        'Não entendi... Pode detalhar melhor? 🤔',
        'Desculpa, pode repetir seu problema?',
        'Hmm, explica melhor que vou ajudar!',
      ],
      'bot-manager': [
        'Não capturei... Você fala de investimentos? 🤔',
        'Desculpa, pode detalhar mais?',
        'Explica melhor sua dúvida que vou analisar!',
      ],
    }

    const responses = defaults[botId] || ['Desculpa, não entendi 🤔']
    return responses[Math.floor(Math.random() * responses.length)] || 'Desculpa, não entendi 🤔'
  }

  /**
   * Gera resposta para áudio (transcrição simulada)
   * Em produção, isso seria feito via speech-to-text
   */
  async generateBotResponseFromAudio(botId: string, audioBlob: Blob): Promise<BotResponse> {
    // Em produção: usar Google Speech-to-Text ou similar para transcrever
    // Por enquanto, simular com mensagem genérica

    const genericResponses: Record<string, string[]> = {
      'bot-trader': [
        'Recebi seu áudio! 🎙️ Você quer negociar qual moeda?',
        'Áudio capturado! 📢 Me diga qual é sua oferta!',
      ],
      'bot-support': [
        'Recebi seu áudio! 🎙️ Qual é o problema?',
        'Áudio recebido! 📢 Como posso ajudar?',
      ],
      'bot-manager': [
        'Recebi seu áudio! 🎙️ Vamos analisar seu portfólio?',
        'Áudio capturado! 📢 Qual é sua dúvida?',
      ],
    }

    const responses = genericResponses[botId] || ['Recebi seu áudio! 🎙️']
    const message =
      responses[Math.floor(Math.random() * responses.length)] || 'Recebi seu áudio! 🎙️'

    return {
      message,
      delay: 1000, // Um pouco mais de delay para simular processamento
    }
  }
}

export const chatbotService = new ChatbotServiceClass()
export default chatbotService
