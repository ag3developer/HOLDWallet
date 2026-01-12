import { useState, useEffect, useCallback } from 'react'
import {
  userLimitsService,
  type UserLimitsResponse,
  type ServiceLimits,
} from '../services/userLimitsService'

interface UseUserLimitsResult {
  limits: UserLimitsResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  getServiceLimit: (serviceName: string) => ServiceLimits | null
  getDailyLimit: (serviceName?: string) => number
  getMinLimit: (serviceName?: string) => number
  getMaxLimit: (serviceName?: string) => number
}

/**
 * Hook para obter e gerenciar os limites operacionais do usuário
 * Os limites vêm do backend e são baseados no nível KYC do usuário
 */
export function useUserLimits(): UseUserLimitsResult {
  const [limits, setLimits] = useState<UserLimitsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLimits = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await userLimitsService.getMyLimits()
      setLimits(data)
    } catch (err) {
      console.error('Erro ao buscar limites:', err)
      setError('Não foi possível carregar seus limites operacionais')
      // Define limites padrão em caso de erro
      setLimits(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLimits()
  }, [fetchLimits])

  /**
   * Obtém o limite de um serviço específico
   */
  const getServiceLimit = useCallback(
    (serviceName: string): ServiceLimits | null => {
      if (!limits?.limits) return null
      return limits.limits[serviceName] || null
    },
    [limits]
  )

  /**
   * Obtém o limite diário para um serviço
   * Se não especificado, retorna o maior limite disponível
   */
  const getDailyLimit = useCallback(
    (serviceName?: string): number => {
      if (!limits?.limits) {
        // Fallback para limites padrão se não conseguir carregar
        return 500000 // $500k USD default
      }

      if (serviceName) {
        const serviceLimit = limits.limits[serviceName]
        if (serviceLimit?.daily_limit_brl !== null && serviceLimit?.daily_limit_brl !== undefined) {
          return serviceLimit.daily_limit_brl
        }
        // Se null/undefined = ilimitado, retorna um valor alto
        return Number.MAX_SAFE_INTEGER
      }

      // Retorna o maior limite diário entre todos os serviços
      let maxLimit = 0
      Object.values(limits.limits).forEach(limit => {
        if (limit.daily_limit_brl === null) {
          maxLimit = Number.MAX_SAFE_INTEGER
        } else if (limit.daily_limit_brl !== null && limit.daily_limit_brl > maxLimit) {
          maxLimit = limit.daily_limit_brl
        }
      })
      return maxLimit || 500000
    },
    [limits]
  )

  /**
   * Obtém o limite mínimo por transação para um serviço
   * Nota: O backend não retorna min_amount, usamos um valor padrão
   */
  const getMinLimit = useCallback((serviceName?: string): number => {
    // Por padrão, mínimo é 1
    return 1
  }, [])

  /**
   * Obtém o limite máximo por transação para um serviço
   */
  const getMaxLimit = useCallback(
    (serviceName?: string): number => {
      if (!limits?.limits) {
        return 100000 // $100k default
      }

      if (serviceName) {
        const serviceLimit = limits.limits[serviceName]
        if (
          serviceLimit?.transaction_limit_brl !== null &&
          serviceLimit?.transaction_limit_brl !== undefined
        ) {
          return serviceLimit.transaction_limit_brl
        }
        return Number.MAX_SAFE_INTEGER
      }

      // Retorna o maior máximo entre todos os serviços
      let maxAmount = 0
      Object.values(limits.limits).forEach(limit => {
        if (limit.transaction_limit_brl === null) {
          maxAmount = Number.MAX_SAFE_INTEGER
        } else if (
          limit.transaction_limit_brl !== null &&
          limit.transaction_limit_brl > maxAmount
        ) {
          maxAmount = limit.transaction_limit_brl
        }
      })
      return maxAmount || 100000
    },
    [limits]
  )

  return {
    limits,
    isLoading,
    error,
    refetch: fetchLimits,
    getServiceLimit,
    getDailyLimit,
    getMinLimit,
    getMaxLimit,
  }
}

/**
 * Mapeia o nome do serviço para o formato esperado pelo backend
 */
export const SERVICE_NAME_MAP = {
  wolkpay: 'wolkpay',
  instant_trade: 'instant_trade',
  p2p: 'p2p',
  withdraw_crypto: 'withdraw_crypto',
  withdraw_fiat: 'withdraw_fiat',
  deposit_crypto: 'deposit_crypto',
  deposit_fiat: 'deposit_fiat',
} as const

export type ServiceName = keyof typeof SERVICE_NAME_MAP
