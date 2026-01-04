export interface ChatRoomValidationResult {
  isValid: boolean
  buyerId: string | null
  sellerId: string | null
  error?: string
  errorDetails?: {
    code: string
    message: string
    suggestion: string
  }
}

export class ChatP2PValidator {
  /**
   * Validar se é possível criar uma sala de chat P2P.
   * Esta validação no frontend previne chamadas desnecessárias à API que resultariam em erro 422.
   */
  static validateChatRoomCreation(
    orderId: string,
    orderType: 'buy' | 'sell',
    orderOwnerId: string,
    currentUserId: string
  ): ChatRoomValidationResult {
    console.log('🔍 [Validator] Validando criação de chat room:')
    console.log('   - Order ID:', orderId)
    console.log('   - Order Type:', orderType)
    console.log('   - Order Owner:', orderOwnerId)
    console.log('   - Current User:', currentUserId)

    // Validação 1: IDs não podem estar vazios.
    if (!orderId || !orderOwnerId || !currentUserId) {
      return {
        isValid: false,
        buyerId: null,
        sellerId: null,
        error: 'MISSING_DATA',
        errorDetails: {
          code: 'MISSING_DATA',
          message: 'Dados insuficientes para criar a sala de chat.',
          suggestion: 'Verifique se a ordem foi carregada corretamente e se o usuário está logado.',
        },
      }
    }

    // Validação 2: O usuário não pode iniciar um chat em sua própria ordem.
    if (orderOwnerId === currentUserId) {
      return {
        isValid: false,
        buyerId: null,
        sellerId: null,
        error: 'SAME_USER',
        errorDetails: {
          code: 'SAME_USER',
          message: 'Você não pode abrir um chat para uma ordem que você criou.',
          suggestion: 'Aguarde outro usuário aceitar sua ordem para iniciar o chat.',
        },
      }
    }

    // Determina os papéis de comprador e vendedor corretamente.
    const isBuyOrder = orderType === 'buy'
    const buyerId = isBuyOrder ? orderOwnerId : currentUserId
    const sellerId = isBuyOrder ? currentUserId : orderOwnerId

    console.log('✅ [Validator] Validação passou:')
    console.log('   - Buyer ID:', buyerId)
    console.log('   - Seller ID:', sellerId)

    return {
      isValid: true,
      buyerId,
      sellerId,
    }
  }

  /**
   * Extrai uma mensagem de erro legível da resposta do backend.
   */
  static parseBackendError(error: any): string {
    const detail = error?.response?.data?.detail
    if (typeof detail === 'string') return detail
    return 'Erro desconhecido ao criar a sala de chat. Tente novamente.'
  }
}
