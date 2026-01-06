// Trading Limits Configuration (in USD)
export const TRADING_LIMITS = {
  MIN_AMOUNT: 1.0, // Mínimo $1.00 USD
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
 */
export function validateTradingLimit(
  amount: number,
  accountType: AccountType,
  currency: CurrencyType,
  convertFromBRL: (value: number) => number,
  dailySpent: number = 0
): LimitStatus {
  // Converter para USD
  const amountInUSD = convertToUSD(amount, currency, convertFromBRL)
  const dailySpentInUSD = convertToUSD(dailySpent, currency, convertFromBRL)

  // Validar mínimo
  if (amountInUSD < TRADING_LIMITS.MIN_AMOUNT) {
    return {
      isValid: false,
      message: `Mínimo de $${TRADING_LIMITS.MIN_AMOUNT.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD necessário`,
      remaining: 0,
      percentUsed: 0,
    }
  }

  // Definir limite máximo baseado no tipo de conta
  const dailyLimit =
    accountType === 'PJ' ? TRADING_LIMITS.PJ_DAILY_LIMIT : TRADING_LIMITS.PF_DAILY_LIMIT
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
 */
export function getLimitInfo(accountType: AccountType) {
  const dailyLimit =
    accountType === 'PJ' ? TRADING_LIMITS.PJ_DAILY_LIMIT : TRADING_LIMITS.PF_DAILY_LIMIT
  return {
    min: TRADING_LIMITS.MIN_AMOUNT,
    max: dailyLimit,
    type: accountType === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física',
    currency: 'USD',
  }
}
