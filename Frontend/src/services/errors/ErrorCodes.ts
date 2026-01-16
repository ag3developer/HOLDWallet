/**
 * 🔴 HOLD Wallet - Standardized Error Codes
 *
 * Arquitetura profissional de códigos de erro para APIs REST.
 *
 * O backend retorna erros no formato:
 * {
 *   "code": "AUTH_2FA_INVALID",
 *   "message": "Código 2FA inválido",
 *   "details": { "attempts_remaining": 2 },
 *   "requires_logout": false,
 *   "requires_reauth": true
 * }
 *
 * O frontend usa esses campos para decidir a ação correta.
 */

/**
 * Códigos de erro padronizados
 */
export enum ErrorCode {
  // ========================================
  // AUTH - Erros de Autenticação (401/403)
  // ========================================

  // 401 - Sessão inválida (DEVE fazer logout)
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_SESSION_INVALID = 'AUTH_SESSION_INVALID',
  AUTH_TOKEN_MALFORMED = 'AUTH_TOKEN_MALFORMED',
  AUTH_NOT_AUTHENTICATED = 'AUTH_NOT_AUTHENTICATED',

  // 403 - Autorização negada (NÃO fazer logout)
  AUTH_2FA_REQUIRED = 'AUTH_2FA_REQUIRED',
  AUTH_2FA_INVALID = 'AUTH_2FA_INVALID',
  AUTH_BIOMETRIC_REQUIRED = 'AUTH_BIOMETRIC_REQUIRED',
  AUTH_BIOMETRIC_EXPIRED = 'AUTH_BIOMETRIC_EXPIRED',
  AUTH_BIOMETRIC_INVALID = 'AUTH_BIOMETRIC_INVALID',
  AUTH_PERMISSION_DENIED = 'AUTH_PERMISSION_DENIED',
  AUTH_IP_BLOCKED = 'AUTH_IP_BLOCKED',
  AUTH_RATE_LIMITED = 'AUTH_RATE_LIMITED',

  // ========================================
  // VALIDATION - Erros de Validação (400)
  // ========================================
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_BALANCE_INSUFFICIENT = 'VALIDATION_BALANCE_INSUFFICIENT',
  VALIDATION_AMOUNT_TOO_LOW = 'VALIDATION_AMOUNT_TOO_LOW',
  VALIDATION_AMOUNT_TOO_HIGH = 'VALIDATION_AMOUNT_TOO_HIGH',
  VALIDATION_ADDRESS_INVALID = 'VALIDATION_ADDRESS_INVALID',
  VALIDATION_NETWORK_INVALID = 'VALIDATION_NETWORK_INVALID',

  // ========================================
  // BLOCKCHAIN - Erros de Blockchain (500)
  // ========================================
  BLOCKCHAIN_TX_FAILED = 'BLOCKCHAIN_TX_FAILED',
  BLOCKCHAIN_GAS_TOO_LOW = 'BLOCKCHAIN_GAS_TOO_LOW',
  BLOCKCHAIN_NONCE_ERROR = 'BLOCKCHAIN_NONCE_ERROR',
  BLOCKCHAIN_RPC_ERROR = 'BLOCKCHAIN_RPC_ERROR',
  BLOCKCHAIN_TIMEOUT = 'BLOCKCHAIN_TIMEOUT',

  // ========================================
  // BUSINESS - Regras de Negócio (400/403)
  // ========================================
  BUSINESS_QUOTE_EXPIRED = 'BUSINESS_QUOTE_EXPIRED',
  BUSINESS_LIMIT_EXCEEDED = 'BUSINESS_LIMIT_EXCEEDED',
  BUSINESS_FEATURE_DISABLED = 'BUSINESS_FEATURE_DISABLED',
  BUSINESS_KYC_REQUIRED = 'BUSINESS_KYC_REQUIRED',

  // ========================================
  // SYSTEM - Erros de Sistema (500)
  // ========================================
  SYSTEM_DATABASE_ERROR = 'SYSTEM_DATABASE_ERROR',
  SYSTEM_EXTERNAL_SERVICE = 'SYSTEM_EXTERNAL_SERVICE',
  SYSTEM_INTERNAL_ERROR = 'SYSTEM_INTERNAL_ERROR',
}

/**
 * Interface para resposta de erro padronizada
 */
export interface StandardErrorResponse {
  code: ErrorCode | string
  message: string
  details?: Record<string, unknown>
  requires_logout: boolean
  requires_reauth: boolean
}

/**
 * Mensagens amigáveis para cada código de erro
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Sua sessão expirou. Por favor, faça login novamente.',
  [ErrorCode.AUTH_SESSION_INVALID]: 'Sessão inválida. Por favor, faça login novamente.',
  [ErrorCode.AUTH_TOKEN_MALFORMED]: 'Token de autenticação inválido.',
  [ErrorCode.AUTH_NOT_AUTHENTICATED]: 'Você precisa estar logado para acessar este recurso.',

  [ErrorCode.AUTH_2FA_REQUIRED]: 'Autenticação de dois fatores necessária.',
  [ErrorCode.AUTH_2FA_INVALID]: 'Código 2FA inválido. Tente novamente.',
  [ErrorCode.AUTH_BIOMETRIC_REQUIRED]: 'Autenticação biométrica necessária.',
  [ErrorCode.AUTH_BIOMETRIC_EXPIRED]: 'Autenticação biométrica expirou. Autentique novamente.',
  [ErrorCode.AUTH_BIOMETRIC_INVALID]: 'Autenticação biométrica inválida.',
  [ErrorCode.AUTH_PERMISSION_DENIED]: 'Você não tem permissão para esta ação.',
  [ErrorCode.AUTH_IP_BLOCKED]: 'Seu IP foi bloqueado. Entre em contato com o suporte.',
  [ErrorCode.AUTH_RATE_LIMITED]: 'Muitas tentativas. Aguarde alguns minutos.',

  [ErrorCode.VALIDATION_REQUIRED_FIELD]: 'Campo obrigatório não preenchido.',
  [ErrorCode.VALIDATION_INVALID_FORMAT]: 'Formato inválido.',
  [ErrorCode.VALIDATION_BALANCE_INSUFFICIENT]: 'Saldo insuficiente para esta operação.',
  [ErrorCode.VALIDATION_AMOUNT_TOO_LOW]: 'Valor muito baixo.',
  [ErrorCode.VALIDATION_AMOUNT_TOO_HIGH]: 'Valor muito alto.',
  [ErrorCode.VALIDATION_ADDRESS_INVALID]: 'Endereço de carteira inválido.',
  [ErrorCode.VALIDATION_NETWORK_INVALID]: 'Rede blockchain inválida.',

  [ErrorCode.BLOCKCHAIN_TX_FAILED]: 'Transação falhou na blockchain. Tente novamente.',
  [ErrorCode.BLOCKCHAIN_GAS_TOO_LOW]: 'Taxa de gas muito baixa. Aumente a taxa.',
  [ErrorCode.BLOCKCHAIN_NONCE_ERROR]: 'Erro de sequência de transação. Tente novamente.',
  [ErrorCode.BLOCKCHAIN_RPC_ERROR]: 'Erro de conexão com a blockchain. Tente novamente.',
  [ErrorCode.BLOCKCHAIN_TIMEOUT]: 'Timeout na blockchain. Verifique o status da transação.',

  [ErrorCode.BUSINESS_QUOTE_EXPIRED]: 'Cotação expirada. Solicite uma nova cotação.',
  [ErrorCode.BUSINESS_LIMIT_EXCEEDED]: 'Limite excedido para esta operação.',
  [ErrorCode.BUSINESS_FEATURE_DISABLED]: 'Esta funcionalidade está temporariamente desabilitada.',
  [ErrorCode.BUSINESS_KYC_REQUIRED]: 'Verificação de identidade necessária para continuar.',

  [ErrorCode.SYSTEM_DATABASE_ERROR]: 'Erro no servidor. Tente novamente em alguns minutos.',
  [ErrorCode.SYSTEM_EXTERNAL_SERVICE]: 'Serviço externo indisponível. Tente novamente.',
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: 'Erro interno. Nossa equipe foi notificada.',
}

/**
 * Ações recomendadas para cada tipo de erro
 */
export const ERROR_ACTIONS: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Faça login novamente para continuar.',
  [ErrorCode.AUTH_2FA_INVALID]: 'Verifique o código no seu app autenticador.',
  [ErrorCode.AUTH_BIOMETRIC_EXPIRED]: 'Toque novamente para autenticar.',
  [ErrorCode.VALIDATION_BALANCE_INSUFFICIENT]: 'Deposite mais fundos ou reduza o valor.',
  [ErrorCode.BLOCKCHAIN_TX_FAILED]: 'Verifique os dados e tente novamente.',
  [ErrorCode.BUSINESS_QUOTE_EXPIRED]: 'Clique em "Atualizar cotação".',
}

/**
 * Verifica se um código de erro requer logout
 */
export function requiresLogout(code: string): boolean {
  return code.startsWith('AUTH_SESSION_')
}

/**
 * Verifica se um código de erro requer reautenticação (2FA/biometria)
 */
export function requiresReauth(code: string): boolean {
  return ['AUTH_2FA_INVALID', 'AUTH_BIOMETRIC_EXPIRED', 'AUTH_BIOMETRIC_INVALID'].includes(code)
}

/**
 * Verifica se o erro é recuperável (pode tentar novamente)
 */
export function isRetryable(code: string): boolean {
  const nonRetryable = ['AUTH_SESSION_', 'AUTH_IP_BLOCKED', 'VALIDATION_', 'BUSINESS_KYC_REQUIRED']

  return !nonRetryable.some(prefix => code.startsWith(prefix))
}

/**
 * Obtém mensagem amigável para um código de erro
 */
export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code as ErrorCode] || fallback || 'Erro desconhecido'
}

/**
 * Obtém ação recomendada para um código de erro
 */
export function getErrorAction(code: string): string | undefined {
  return ERROR_ACTIONS[code as ErrorCode]
}

/**
 * Parseia resposta de erro do backend
 */
export function parseErrorResponse(error: unknown): StandardErrorResponse | null {
  // Axios error
  const axiosError = error as { response?: { data?: unknown } }
  const data = axiosError?.response?.data

  if (data && typeof data === 'object') {
    const errorData = data as Record<string, unknown>

    // Formato padronizado
    if (errorData.code && typeof errorData.code === 'string') {
      return {
        code: errorData.code,
        message: (errorData.message as string) || getErrorMessage(errorData.code),
        details: errorData.details as Record<string, unknown>,
        requires_logout: (errorData.requires_logout as boolean) ?? requiresLogout(errorData.code),
        requires_reauth: (errorData.requires_reauth as boolean) ?? requiresReauth(errorData.code),
      }
    }

    // Formato legacy (detail string)
    if (errorData.detail && typeof errorData.detail === 'string') {
      const legacyCode = errorData.detail
      return {
        code: legacyCode,
        message: getErrorMessage(legacyCode, errorData.detail),
        details: {},
        requires_logout: requiresLogout(legacyCode),
        requires_reauth: requiresReauth(legacyCode),
      }
    }
  }

  return null
}
