// Trading Limits Configuration (in USD)
// Esses são os limites PADRÃO - os limites reais vêm do backend baseado no KYC
export const TRADING_LIMITS = {
  MIN_AMOUNT: 1, // Mínimo $1.00 USD
  PF_DAILY_LIMIT: 500000, // Pessoa Física: $500.000 USD/dia
  PJ_DAILY_LIMIT: 1000000, // PJ: $1.000.000 USD/dia
}

export type AccountType = 'PF' | 'PJ'
export type CurrencyType = 'BRL' | 'USD' | 'EUR'

interface LimitStatus {
  isValid: boolean
  message: string
  remaining: number
  percentUsed: number
}

// Interface para limites dinâmicos do backend
export interface DynamicLimits {
  min_amount: number
  max_amount: number | null
  daily_limit: number | null
}

/**
 * Converte valor de qualquer moeda para USD
 */
function convertToUSD(
  amount: number,
  currency: CurrencyType,
  convertFromBRL: (value: number) => number
): number {
  if (currency === 'USD') {
    return amount
  }
  if (currency === 'BRL') {
    // convertFromBRL converte de BRL para USD
    return convertFromBRL(amount)
  }
  // Para EUR, assumir taxa aproximada (pode ser melhorado)
  if (currency === 'EUR') {
    return amount * 1.1 // 1 EUR ≈ 1.1 USD (aproximado)
  }
  return amount
}

/**
 * Valida se o valor está dentro dos limites (considerando conversão para USD)
 * Agora suporta limites dinâmicos do backend
 */
export function validateTradingLimit(
  amount: number,
  accountType: AccountType,
  currency: CurrencyType,
  convertFromBRL: (value: number) => number,
  dailySpent: number = 0,
  dynamicLimits?: DynamicLimits
): LimitStatus {
  // Converter para USD
  const amountInUSD = convertToUSD(amount, currency, convertFromBRL)
  const dailySpentInUSD = convertToUSD(dailySpent, currency, convertFromBRL)

  // Usar limites dinâmicos se disponíveis, senão usar padrão
  const minAmount = dynamicLimits?.min_amount ?? TRADING_LIMITS.MIN_AMOUNT
  const dailyLimit =
    dynamicLimits?.daily_limit ??
    (accountType === 'PJ' ? TRADING_LIMITS.PJ_DAILY_LIMIT : TRADING_LIMITS.PF_DAILY_LIMIT)

  // Validar mínimo
  if (amountInUSD < minAmount) {
    return {
      isValid: false,
      message: `Mínimo de $${minAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD necessário`,
      remaining: 0,
      percentUsed: 0,
    }
  }

  // Se daily_limit é null = ilimitado
  if (dailyLimit === null) {
    return {
      isValid: true,
      message: 'Operação válida. Sem limite diário configurado.',
      remaining: Number.MAX_SAFE_INTEGER,
      percentUsed: 0,
    }
  }

  const totalAmountInUSD = dailySpentInUSD + amountInUSD
  const remainingInUSD = Math.max(0, dailyLimit - totalAmountInUSD)
  const percentUsed = (totalAmountInUSD / dailyLimit) * 100

  // Validar máximo diário
  if (totalAmountInUSD > dailyLimit) {
    return {
      isValid: false,
      message: `Você atingiu o limite diário de $${dailyLimit.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD para ${accountType === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}. Restante: $${remainingInUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD`,
      remaining: remainingInUSD,
      percentUsed,
    }
  }

  return {
    isValid: true,
    message: `Operação válida. Restante do limite: $${remainingInUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD`,
    remaining: remainingInUSD,
    percentUsed,
  }
}

/**
 * Retorna as informações de limite para a conta
 * Agora suporta limites dinâmicos do backend
 */
export function getLimitInfo(accountType: AccountType, dynamicLimits?: DynamicLimits) {
  const minAmount = dynamicLimits?.min_amount ?? TRADING_LIMITS.MIN_AMOUNT
  const dailyLimit =
    dynamicLimits?.daily_limit ??
    (accountType === 'PJ' ? TRADING_LIMITS.PJ_DAILY_LIMIT : TRADING_LIMITS.PF_DAILY_LIMIT)

  return {
    min: minAmount,
    max: dailyLimit ?? Number.MAX_SAFE_INTEGER,
    type: accountType === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física',
    currency: 'USD',
    isUnlimited: dailyLimit === null,
  }
}
