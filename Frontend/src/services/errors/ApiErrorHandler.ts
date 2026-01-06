/**
 * 🛡️ HOLD Wallet - API Error Handler (Enterprise Grade)
 * ======================================================
 *
 * Sistema centralizado de tratamento de erros de API.
 *
 * 📐 PADRÃO ENTERPRISE:
 * ─────────────────────
 * 1. Erros são categorizados por tipo e severidade
 * 2. Mensagens de usuário são separadas de logs técnicos
 * 3. Retry automático para erros transientes
 * 4. Telemetria e métricas de erros
 * 5. Contexto rico para debugging
 *
 * @version 1.0.0
 * @enterprise true
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'validation'
  | 'rate_limit'
  | 'server'
  | 'client'
  | 'timeout'
  | 'unknown'

export interface ApiErrorContext {
  url?: string
  method?: string
  status?: number
  statusText?: string
  requestData?: unknown
  responseData?: unknown
  timestamp: Date
  requestId?: string
  duration?: number | undefined
}

export interface ParsedApiError {
  // Para o usuário
  userMessage: string
  userAction?: string | undefined

  // Para logs/debug
  technicalMessage: string
  category: ErrorCategory
  severity: ErrorSeverity
  code?: string | undefined

  // Contexto
  context: ApiErrorContext

  // Comportamento
  isRetryable: boolean
  retryAfterMs?: number | undefined
  shouldLogout?: boolean
  shouldRefreshToken?: boolean
}

// ============================================================================
// MENSAGENS DE ERRO POR CATEGORIA
// ============================================================================

const USER_MESSAGES: Record<ErrorCategory, { message: string; action?: string }> = {
  network: {
    message: 'Não foi possível conectar ao servidor',
    action: 'Verifique sua conexão de internet e tente novamente',
  },
  authentication: {
    message: 'Sessão expirada ou inválida',
    action: 'Faça login novamente para continuar',
  },
  validation: {
    message: 'Dados inválidos',
    action: 'Verifique os dados informados e tente novamente',
  },
  rate_limit: {
    message: 'Muitas requisições',
    action: 'Aguarde alguns segundos antes de tentar novamente',
  },
  server: {
    message: 'Erro interno do servidor',
    action: 'Tente novamente em alguns instantes',
  },
  client: {
    message: 'Erro na requisição',
    action: 'Verifique os dados e tente novamente',
  },
  timeout: {
    message: 'A requisição demorou muito',
    action: 'Verifique sua conexão e tente novamente',
  },
  unknown: {
    message: 'Ocorreu um erro inesperado',
    action: 'Tente novamente ou entre em contato com o suporte',
  },
}

// Mapeamento de códigos de erro do backend para mensagens amigáveis
const BACKEND_ERROR_MESSAGES: Record<string, string> = {
  // Instant Trade
  QUOTE_EXPIRED: 'A cotação expirou. Por favor, solicite uma nova cotação.',
  QUOTE_NOT_FOUND: 'Cotação não encontrada. Por favor, solicite uma nova cotação.',
  INSUFFICIENT_BALANCE: 'Saldo insuficiente para realizar esta operação.',
  INVALID_AMOUNT: 'O valor informado é inválido.',
  MIN_AMOUNT_NOT_MET: 'O valor mínimo não foi atingido.',
  MAX_AMOUNT_EXCEEDED: 'O valor máximo foi excedido.',
  DAILY_LIMIT_EXCEEDED: 'Limite diário excedido.',
  INVALID_SYMBOL: 'Criptomoeda não suportada.',
  INVALID_OPERATION: 'Operação inválida.',

  // Auth
  INVALID_TOKEN: 'Token inválido ou expirado.',
  TOKEN_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  UNAUTHORIZED: 'Você não tem permissão para esta ação.',

  // Validation
  VALIDATION_ERROR: 'Dados inválidos. Verifique os campos e tente novamente.',
  MISSING_FIELD: 'Campo obrigatório não informado.',

  // Rate Limit
  RATE_LIMIT_EXCEEDED: 'Muitas requisições. Aguarde alguns segundos.',
  TOO_MANY_REQUESTS: 'Muitas requisições. Aguarde alguns segundos.',
}

// ============================================================================
// API ERROR HANDLER CLASS
// ============================================================================

class ApiErrorHandler {
  private static instance: ApiErrorHandler
  private readonly errorCount: Map<string, number> = new Map()
  private lastErrors: ParsedApiError[] = []
  private readonly MAX_STORED_ERRORS = 50

  private constructor() {}

  static getInstance(): ApiErrorHandler {
    if (!ApiErrorHandler.instance) {
      ApiErrorHandler.instance = new ApiErrorHandler()
    }
    return ApiErrorHandler.instance
  }

  /**
   * Parseia erro de API para formato estruturado
   */
  parse(error: any, context?: Partial<ApiErrorContext>): ParsedApiError {
    const timestamp = new Date()
    const errorContext: ApiErrorContext = {
      timestamp,
      url: error.config?.url || context?.url,
      method: error.config?.method?.toUpperCase() || context?.method,
      status: error.response?.status || context?.status,
      statusText: error.response?.statusText || context?.statusText,
      requestData: this.sanitizeData(error.config?.data || context?.requestData),
      responseData: error.response?.data || context?.responseData,
      requestId: error.response?.headers?.['x-request-id'],
      duration: context?.duration,
    }

    // Determinar categoria do erro
    const category = this.categorizeError(error)

    // Extrair mensagem do backend
    const backendMessage = this.extractBackendMessage(error)
    const backendCode = this.extractBackendCode(error)

    // Obter mensagem para o usuário
    const userFriendly = this.getUserMessage(category, backendMessage, backendCode)

    // Determinar severidade
    const severity = this.determineSeverity(category, errorContext.status)

    const parsedError: ParsedApiError = {
      userMessage: userFriendly.message,
      userAction: userFriendly.action,
      technicalMessage: backendMessage || error.message || 'Unknown error',
      category,
      severity,
      code: backendCode,
      context: errorContext,
      isRetryable: this.isRetryable(category, errorContext.status),
      retryAfterMs: this.getRetryDelay(error, category),
      shouldLogout: category === 'authentication' && errorContext.status === 401,
      shouldRefreshToken: errorContext.status === 401,
    }

    // Armazenar para telemetria
    this.storeError(parsedError)

    return parsedError
  }

  /**
   * Categoriza o erro baseado no status e tipo
   */
  private categorizeError(error: any): ErrorCategory {
    // Erro de rede (sem resposta)
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return 'timeout'
      }
      return 'network'
    }

    const status = error.response?.status

    // Baseado no status HTTP
    switch (true) {
      case status === 401:
        return 'authentication'
      case status === 403:
        return 'authentication'
      case status === 422:
        return 'validation'
      case status === 429:
        return 'rate_limit'
      case status === 400:
        return 'validation'
      case status >= 500:
        return 'server'
      case status >= 400:
        return 'client'
      default:
        return 'unknown'
    }
  }

  /**
   * Extrai mensagem do backend
   */
  private extractBackendMessage(error: any): string {
    const data = error.response?.data

    if (!data) return ''

    // Diferentes formatos de erro do backend
    if (typeof data === 'string') return data
    if (data.detail)
      return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
    if (data.message) return data.message
    if (data.error) return data.error
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.map((e: any) => e.message || e.msg || e).join(', ')
    }

    return ''
  }

  /**
   * Extrai código de erro do backend
   */
  private extractBackendCode(error: any): string | undefined {
    const data = error.response?.data

    if (!data) return undefined

    return data.code || data.error_code || data.errorCode
  }

  /**
   * Obtém mensagem amigável para o usuário
   */
  private getUserMessage(
    category: ErrorCategory,
    backendMessage: string,
    backendCode?: string
  ): { message: string; action?: string | undefined } {
    const categoryMessages = USER_MESSAGES[category] || USER_MESSAGES.unknown

    // Primeiro, verificar se temos uma mensagem mapeada para o código
    if (backendCode && BACKEND_ERROR_MESSAGES[backendCode]) {
      return {
        message: BACKEND_ERROR_MESSAGES[backendCode],
        action: categoryMessages.action,
      }
    }

    // Se o backend retornou uma mensagem legível, usar ela
    if (backendMessage && !backendMessage.includes('Exception') && backendMessage.length < 200) {
      // Verificar se a mensagem é técnica demais
      const isTechnical = /error|exception|traceback|stack|null|undefined/i.test(backendMessage)

      if (!isTechnical) {
        return {
          message: backendMessage,
          action: categoryMessages.action,
        }
      }
    }

    // Fallback para mensagem padrão da categoria
    return categoryMessages
  }

  /**
   * Determina a severidade do erro
   */
  private determineSeverity(category: ErrorCategory, status?: number): ErrorSeverity {
    switch (category) {
      case 'authentication':
        return 'high'
      case 'server':
        return status === 503 ? 'critical' : 'high'
      case 'rate_limit':
        return 'medium'
      case 'validation':
        return 'low'
      case 'network':
        return 'medium'
      case 'timeout':
        return 'medium'
      default:
        return 'medium'
    }
  }

  /**
   * Verifica se o erro é retentável
   */
  private isRetryable(category: ErrorCategory, status?: number): boolean {
    // Erros de validação não são retentáveis
    if (category === 'validation') return false

    // Erros de autenticação não são retentáveis automaticamente
    if (category === 'authentication') return false

    // Erros de servidor podem ser retentáveis
    if (category === 'server') return true

    // Erros de rede/timeout são retentáveis
    if (category === 'network' || category === 'timeout') return true

    // Rate limit é retentável após o delay
    if (category === 'rate_limit') return true

    return false
  }

  /**
   * Obtém delay para retry
   */
  private getRetryDelay(error: any, category: ErrorCategory): number | undefined {
    // Verificar header Retry-After
    const retryAfter = error.response?.headers?.['retry-after']
    if (retryAfter) {
      const seconds = Number.parseInt(retryAfter, 10)
      if (!Number.isNaN(seconds)) return seconds * 1000
    }

    // Delays padrão por categoria
    switch (category) {
      case 'rate_limit':
        return 5000 // 5 segundos
      case 'server':
        return 3000 // 3 segundos
      case 'network':
        return 2000 // 2 segundos
      case 'timeout':
        return 5000 // 5 segundos
      default:
        return undefined
    }
  }

  /**
   * Sanitiza dados sensíveis antes de logar
   */
  private sanitizeData(data: any): any {
    if (!data) return data

    const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'apiKey', 'authorization']

    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      const sanitized = { ...parsed }

      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = '***REDACTED***'
        }
      }

      return sanitized
    } catch {
      return data
    }
  }

  /**
   * Armazena erro para telemetria
   */
  private storeError(error: ParsedApiError): void {
    this.lastErrors.unshift(error)

    if (this.lastErrors.length > this.MAX_STORED_ERRORS) {
      this.lastErrors.pop()
    }

    // Incrementar contador por categoria
    const key = `${error.category}:${error.context.url}`
    this.errorCount.set(key, (this.errorCount.get(key) || 0) + 1)
  }

  /**
   * Loga erro de forma estruturada (apenas não-transientes)
   */
  log(error: ParsedApiError): void {
    // Não logar erros de baixa severidade repetidamente
    if (error.severity === 'low' && error.isRetryable) {
      return
    }

    const logData = {
      category: error.category,
      severity: error.severity,
      code: error.code,
      message: error.technicalMessage,
      url: error.context.url,
      status: error.context.status,
      timestamp: error.context.timestamp.toISOString(),
    }

    switch (error.severity) {
      case 'critical':
        console.error('[API Error - CRITICAL]', logData)
        break
      case 'high':
        console.error('[API Error]', logData)
        break
      case 'medium':
        console.warn('[API Warning]', logData)
        break
      case 'low':
        console.log('[API Info]', logData)
        break
    }
  }

  /**
   * Obtém estatísticas de erros
   */
  getStats(): {
    total: number
    byCategory: Record<ErrorCategory, number>
    recent: ParsedApiError[]
  } {
    const byCategory: Record<ErrorCategory, number> = {
      network: 0,
      authentication: 0,
      validation: 0,
      rate_limit: 0,
      server: 0,
      client: 0,
      timeout: 0,
      unknown: 0,
    }

    for (const error of this.lastErrors) {
      byCategory[error.category]++
    }

    return {
      total: this.lastErrors.length,
      byCategory,
      recent: this.lastErrors.slice(0, 10),
    }
  }

  /**
   * Limpa histórico de erros
   */
  clearHistory(): void {
    this.lastErrors = []
    this.errorCount.clear()
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const apiErrorHandler = ApiErrorHandler.getInstance()

// Helper functions
export const parseApiError = (error: any, context?: Partial<ApiErrorContext>) =>
  apiErrorHandler.parse(error, context)

export const logApiError = (error: ParsedApiError) => apiErrorHandler.log(error)

export default apiErrorHandler
