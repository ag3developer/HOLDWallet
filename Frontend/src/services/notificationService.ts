/**
 * Serviço de Notificações Centralizado
 * Traduz erros técnicos para mensagens amigáveis ao usuário
 */

import toast from 'react-hot-toast'

// Tipos de erro conhecidos
export type ErrorType =
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_GAS'
  | 'NONCE_TOO_LOW'
  | 'INVALID_ADDRESS'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILED'
  | 'BIOMETRIC_EXPIRED'
  | 'INVALID_2FA'
  | 'TRANSACTION_FAILED'
  | 'RATE_LIMIT'
  | 'SERVER_ERROR'
  | 'UNKNOWN'

// Interface para mensagens de erro estruturadas
export interface ErrorMessage {
  type: ErrorType
  title: string
  description: string
  suggestion?: string
  action?: {
    label: string
    onClick: () => void
  }
}

// Mapa de mensagens de erro amigáveis
const ERROR_MESSAGES: Record<ErrorType, Omit<ErrorMessage, 'type'>> = {
  INSUFFICIENT_FUNDS: {
    title: '💰 Saldo Insuficiente',
    description: 'O saldo disponível não é suficiente para esta transação.',
    suggestion: 'Reduza o valor ou adicione mais fundos à sua carteira.',
  },
  INSUFFICIENT_GAS: {
    title: '⛽ Taxa de Rede Insuficiente',
    description: 'Você não tem saldo suficiente para pagar a taxa de rede (gas).',
    suggestion:
      'Na rede Polygon, mantenha pelo menos 0.01 MATIC para taxas. Reduza o valor da transação ou adicione MATIC.',
  },
  NONCE_TOO_LOW: {
    title: '⏳ Transação Pendente',
    description: 'Existe uma transação anterior ainda processando.',
    suggestion: 'Aguarde alguns minutos e tente novamente.',
  },
  INVALID_ADDRESS: {
    title: '📍 Endereço Inválido',
    description: 'O endereço de destino não é válido para esta rede.',
    suggestion: 'Verifique se o endereço está correto e corresponde à rede selecionada.',
  },
  NETWORK_ERROR: {
    title: '🌐 Erro de Conexão',
    description: 'Não foi possível conectar ao servidor.',
    suggestion: 'Verifique sua conexão com a internet e tente novamente.',
  },
  TIMEOUT: {
    title: '⏱️ Tempo Esgotado',
    description: 'A operação demorou mais que o esperado.',
    suggestion: 'Tente novamente em alguns segundos.',
  },
  AUTH_REQUIRED: {
    title: '🔐 Autenticação Necessária',
    description: 'Você precisa fazer login para continuar.',
    suggestion: 'Faça login novamente.',
  },
  AUTH_FAILED: {
    title: '🔒 Autenticação Falhou',
    description: 'Credenciais inválidas ou sessão expirada.',
    suggestion: 'Verifique suas credenciais e tente novamente.',
  },
  BIOMETRIC_EXPIRED: {
    title: '👆 Token Biométrico Expirado',
    description: 'A autenticação biométrica expirou.',
    suggestion: 'Autentique novamente usando a biometria ou o código 2FA.',
  },
  INVALID_2FA: {
    title: '🔢 Código 2FA Inválido',
    description: 'O código de verificação está incorreto ou expirou.',
    suggestion: 'Verifique o código no seu autenticador e tente novamente.',
  },
  TRANSACTION_FAILED: {
    title: '❌ Transação Falhou',
    description: 'A transação não pôde ser processada.',
    suggestion: 'Verifique os detalhes e tente novamente.',
  },
  RATE_LIMIT: {
    title: '🚫 Muitas Tentativas',
    description: 'Você fez muitas requisições em pouco tempo.',
    suggestion: 'Aguarde alguns minutos antes de tentar novamente.',
  },
  SERVER_ERROR: {
    title: '⚠️ Erro no Servidor',
    description: 'Ocorreu um erro interno no servidor.',
    suggestion:
      'Tente novamente mais tarde. Se o problema persistir, entre em contato com o suporte.',
  },
  UNKNOWN: {
    title: '❓ Erro Desconhecido',
    description: 'Ocorreu um erro inesperado.',
    suggestion: 'Tente novamente. Se o problema persistir, entre em contato com o suporte.',
  },
}

// Detecta o tipo de erro baseado na mensagem
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectErrorType(error: any): ErrorType {
  const message =
    typeof error === 'string'
      ? error.toLowerCase()
      : error?.message?.toLowerCase() || error?.response?.data?.detail?.toLowerCase() || ''

  // Erros de saldo
  if (
    message.includes('insufficient funds') ||
    message.includes('saldo insuficiente') ||
    message.includes('insufficient balance')
  ) {
    // Diferencia entre saldo insuficiente e gas insuficiente
    if (message.includes('gas') || message.includes('taxa') || message.includes('fee')) {
      return 'INSUFFICIENT_GAS'
    }
    return 'INSUFFICIENT_FUNDS'
  }

  // Erro de nonce
  if (message.includes('nonce too low') || message.includes('transação pendente')) {
    return 'NONCE_TOO_LOW'
  }

  // Endereço inválido
  if (
    message.includes('invalid address') ||
    message.includes('endereço inválido') ||
    message.includes('checksum')
  ) {
    return 'INVALID_ADDRESS'
  }

  // Erros de rede
  if (
    message.includes('network error') ||
    message.includes('fetch') ||
    message.includes('enotfound') ||
    message.includes('conexão')
  ) {
    return 'NETWORK_ERROR'
  }

  // Timeout
  if (message.includes('timeout') || message.includes('tempo')) {
    return 'TIMEOUT'
  }

  // Autenticação
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'AUTH_REQUIRED'
  }

  if (message.includes('forbidden') || message.includes('403')) {
    return 'AUTH_FAILED'
  }

  // Biometria
  if (
    message.includes('biometric') ||
    message.includes('biométric') ||
    message.includes('token expirado')
  ) {
    return 'BIOMETRIC_EXPIRED'
  }

  // 2FA
  if (message.includes('2fa') || message.includes('invalid_2fa') || message.includes('código')) {
    return 'INVALID_2FA'
  }

  // Rate limit
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'RATE_LIMIT'
  }

  // Erro do servidor
  if (message.includes('500') || message.includes('internal server')) {
    return 'SERVER_ERROR'
  }

  return 'UNKNOWN'
}

// Formata a mensagem de erro completa
export function formatErrorMessage(error: unknown): ErrorMessage {
  const type = detectErrorType(error)
  const config = ERROR_MESSAGES[type]

  return {
    type,
    ...config,
  }
}

// Exibe um toast de erro formatado
export function showError(error: unknown, customMessage?: string): void {
  const formatted = formatErrorMessage(error)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errorObj = error as any

  // Se tem uma mensagem customizada do backend, usa ela
  const backendMessage =
    typeof error === 'string' ? error : errorObj?.response?.data?.detail || errorObj?.message

  // Constrói a mensagem final
  let message = customMessage || formatted.description

  // Se o backend enviou uma mensagem específica, usa ela
  if (backendMessage && !backendMessage.toLowerCase().includes('erro')) {
    message = backendMessage
  }

  // Adiciona a sugestão se houver
  if (formatted.suggestion) {
    message = `${message}\n\n💡 ${formatted.suggestion}`
  }

  toast.error(message, {
    duration: 6000, // Mais tempo para ler a mensagem
    style: {
      maxWidth: '400px',
      whiteSpace: 'pre-line',
      textAlign: 'left',
    },
  })
}

// Exibe toast de sucesso
export function showSuccess(message: string, options?: { duration?: number }): void {
  toast.success(message, {
    duration: options?.duration || 4000,
    style: {
      maxWidth: '400px',
    },
  })
}

// Exibe toast de aviso (warning)
export function showWarning(message: string): void {
  toast(message, {
    icon: '⚠️',
    duration: 5000,
    style: {
      background: '#f59e0b',
      color: '#fff',
      maxWidth: '400px',
    },
  })
}

// Exibe toast informativo
export function showInfo(message: string): void {
  toast(message, {
    icon: 'ℹ️',
    duration: 4000,
    style: {
      background: '#3b82f6',
      color: '#fff',
      maxWidth: '400px',
    },
  })
}

// Exibe toast de loading
export function showLoading(message: string): string {
  return toast.loading(message, {
    style: {
      maxWidth: '400px',
    },
  })
}

// Remove toast de loading
export function dismissLoading(toastId: string): void {
  toast.dismiss(toastId)
}

// Exibe toast de loading que se transforma em sucesso ou erro
export async function showLoadingPromise<T>(
  promise: Promise<T>,
  options: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((err: any) => string)
  }
): Promise<T> {
  return toast.promise(promise, {
    loading: options.loading,
    success: options.success,
    error: err => {
      if (typeof options.error === 'function') {
        return options.error(err)
      }
      // Tenta usar mensagem do backend
      const backendMsg = err?.response?.data?.detail || err?.message
      return backendMsg || options.error
    },
  })
}

// Export default
const notificationService = {
  showError,
  showSuccess,
  showWarning,
  showInfo,
  showLoading,
  dismissLoading,
  showLoadingPromise,
  detectErrorType,
  formatErrorMessage,
}

export default notificationService
