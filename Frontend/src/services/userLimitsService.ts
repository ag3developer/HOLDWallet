/**
 * Service para consultar limites operacionais do usuário
 */

import { apiClient } from './api'

export interface ServiceLimits {
  daily_limit_brl: number | null
  monthly_limit_brl: number | null
  transaction_limit_brl: number | null
  is_enabled: boolean
  is_unlimited_daily: boolean
  is_unlimited_monthly: boolean
  is_unlimited_per_operation: boolean
}

export interface UserLimitsResponse {
  kyc_level: string
  kyc_level_name: string
  limits: {
    instant_trade: ServiceLimits
    p2p: ServiceLimits
    wolkpay: ServiceLimits
    withdraw_crypto: ServiceLimits
    withdraw_fiat: ServiceLimits
    pix_withdraw: ServiceLimits
    internal_transfer: ServiceLimits
    [key: string]: ServiceLimits
  }
  message: string
}

class UserLimitsService {
  /**
   * Obtém os limites operacionais do usuário logado
   */
  async getMyLimits(): Promise<UserLimitsResponse> {
    const response = await apiClient.get<UserLimitsResponse>('/kyc/my-limits')
    return response.data
  }

  /**
   * Obtém o limite de um serviço específico
   */
  async getServiceLimit(serviceName: string): Promise<ServiceLimits | null> {
    const limits = await this.getMyLimits()
    return limits.limits[serviceName] || null
  }

  /**
   * Verifica se uma operação está dentro do limite
   */
  async checkOperationLimit(
    serviceName: string,
    amountBrl: number
  ): Promise<{ allowed: boolean; message: string; limit: number | null }> {
    const limits = await this.getMyLimits()
    const serviceLimit = limits.limits[serviceName]

    if (!serviceLimit) {
      return {
        allowed: false,
        message: 'Serviço não encontrado',
        limit: null,
      }
    }

    if (!serviceLimit.is_enabled) {
      return {
        allowed: false,
        message: `O serviço ${serviceName} não está disponível para sua conta. Complete seu KYC para acessar.`,
        limit: null,
      }
    }

    // Se é ilimitado por operação
    if (serviceLimit.is_unlimited_per_operation) {
      return {
        allowed: true,
        message: 'Operação permitida (sem limite)',
        limit: null,
      }
    }

    const limit = serviceLimit.transaction_limit_brl
    if (limit !== null && amountBrl > limit) {
      return {
        allowed: false,
        message: `Valor R$ ${amountBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} excede seu limite por operação de R$ ${limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        limit,
      }
    }

    return {
      allowed: true,
      message: 'Operação dentro do limite',
      limit,
    }
  }

  /**
   * Formata o limite para exibição
   */
  formatLimit(value: number | null, isUnlimited: boolean): string {
    if (isUnlimited || value === null) {
      return 'Ilimitado'
    }
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  /**
   * Obtém nome amigável do serviço
   */
  getServiceName(service: string): string {
    const names: Record<string, string> = {
      instant_trade: 'Compra/Venda Instantânea',
      p2p: 'Negociação P2P',
      wolkpay: 'WolkPay (Recebimento PIX)',
      withdraw_crypto: 'Saque Cripto',
      withdraw_fiat: 'Saque Fiat (PIX/TED)',
      pix_withdraw: 'Saque PIX',
      internal_transfer: 'Transferência Interna',
    }
    return names[service] || service
  }
}

export const userLimitsService = new UserLimitsService()
export default userLimitsService
