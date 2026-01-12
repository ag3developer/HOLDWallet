import React from 'react'
import { Shield, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useUserLimits } from '../hooks/useUserLimits'
import type { ServiceLimits } from '../services/userLimitsService'

interface UserLimitsCardProps {
  readonly serviceName?: string
  readonly showAllServices?: boolean
  readonly compact?: boolean
}

/**
 * Componente que exibe os limites operacionais do usuário
 * baseados no nível KYC
 */
export function UserLimitsCard({
  serviceName,
  showAllServices = false,
  compact = false,
}: UserLimitsCardProps) {
  const { limits, isLoading, error } = useUserLimits()

  if (isLoading) {
    return (
      <div className='animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4'>
        <div className='h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2'></div>
        <div className='h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4'></div>
      </div>
    )
  }

  if (error || !limits) {
    return (
      <div className='bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800'>
        <div className='flex items-center gap-2 text-red-700 dark:text-red-300'>
          <AlertCircle className='w-4 h-4' />
          <span className='text-sm'>Não foi possível carregar seus limites</span>
        </div>
      </div>
    )
  }

  const formatLimit = (value: number | null): string => {
    if (value === null) return 'Ilimitado'
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  }

  const getKycLevelColor = (level: string): string => {
    const defaultColor = 'text-gray-600 bg-gray-100 dark:bg-gray-800'
    const colors: Record<string, string> = {
      none: defaultColor,
      basic: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
      intermediate: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
      advanced: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      premium: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    }
    return colors[level.toLowerCase()] ?? defaultColor
  }

  const serviceLabels: Record<string, string> = {
    instant_trade: 'Compra/Venda Instantânea',
    p2p: 'Negociação P2P',
    wolkpay: 'WolkPay (PIX)',
    withdraw_crypto: 'Saque Cripto',
    withdraw_fiat: 'Saque Fiat (PIX/TED)',
    pix_withdraw: 'Saque PIX',
    internal_transfer: 'Transferência Interna',
  }

  const getServicesToShow = (): Record<string, ServiceLimits> => {
    if (serviceName && limits.limits[serviceName]) {
      return { [serviceName]: limits.limits[serviceName] }
    }
    if (showAllServices) {
      return limits.limits
    }
    return { instant_trade: limits.limits.instant_trade }
  }

  const servicesToShow = getServicesToShow()

  if (compact) {
    return (
      <div className='flex items-center gap-2 text-sm'>
        <Shield className='w-4 h-4 text-blue-600' />
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getKycLevelColor(limits.kyc_level)}`}
        >
          {limits.kyc_level_name}
        </span>
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
      {/* Header com nível KYC */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <Shield className='w-5 h-5 text-blue-600' />
          <span className='font-semibold text-gray-900 dark:text-white'>Seus Limites</span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getKycLevelColor(limits.kyc_level)}`}
        >
          {limits.kyc_level_name}
        </span>
      </div>

      {/* Mensagem */}
      <div className='flex items-start gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400'>
        <Info className='w-4 h-4 mt-0.5 flex-shrink-0' />
        <p>{limits.message}</p>
      </div>

      {/* Limites por serviço */}
      <div className='space-y-3'>
        {Object.entries(servicesToShow).map(([service, serviceLimit]) => {
          if (!serviceLimit) return null

          return (
            <div key={service} className='bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-sm font-medium text-gray-900 dark:text-white'>
                  {serviceLabels[service] || service}
                </span>
                {serviceLimit.is_enabled ? (
                  <CheckCircle className='w-4 h-4 text-green-500' />
                ) : (
                  <AlertCircle className='w-4 h-4 text-red-500' />
                )}
              </div>

              <div className='grid grid-cols-3 gap-2 text-xs'>
                <div>
                  <p className='text-gray-500 dark:text-gray-400'>Por operação</p>
                  <p className='font-semibold text-gray-900 dark:text-white'>
                    {formatLimit(serviceLimit.transaction_limit_brl)}
                  </p>
                </div>
                <div>
                  <p className='text-gray-500 dark:text-gray-400'>Diário</p>
                  <p className='font-semibold text-gray-900 dark:text-white'>
                    {formatLimit(serviceLimit.daily_limit_brl)}
                  </p>
                </div>
                <div>
                  <p className='text-gray-500 dark:text-gray-400'>Mensal</p>
                  <p className='font-semibold text-gray-900 dark:text-white'>
                    {formatLimit(serviceLimit.monthly_limit_brl)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
