/**
 * Transaction Validation Timeline
 * ================================
 *
 * Componente que mostra o progresso das validações antes de enviar uma transação.
 * Usa apenas lucide-react icons (sem emojis).
 *
 * Fluxo:
 * 1. Validar endereço de destino
 * 2. Consultar saldo REAL na blockchain
 * 3. Verificar gas disponível
 * 4. Tudo OK → Liberar autenticação
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Check,
  X,
  Loader2,
  MapPin,
  Wallet,
  Fuel,
  Shield,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { sendService } from '@/services/sendService'

// Tipos para as etapas de validação
type ValidationStep = 'idle' | 'loading' | 'success' | 'error'

interface ValidationState {
  address: ValidationStep
  balance: ValidationStep
  gas: ValidationStep
  ready: boolean
}

interface ValidationData {
  addressValid: boolean
  balance: string
  gasEstimate: string
  totalRequired: string
  remainingAfter: string
  errorMessage?: string
  errorCode?: string
}

interface TransactionValidationTimelineProps {
  walletId: string
  toAddress: string
  amount: string
  network: string
  tokenSymbol?: string | undefined
  onValidationComplete: (isValid: boolean, data: ValidationData | null) => void
  onError: (message: string) => void
}

// Tipo para os ícones do lucide-react
type LucideIconComponent = React.ForwardRefExoticComponent<
  Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
>

// Componentes auxiliares fora do componente principal
interface StatusIconProps {
  status: ValidationStep
  Icon: LucideIconComponent
}

function StatusIcon({ status, Icon }: Readonly<StatusIconProps>): React.ReactElement {
  const iconClass = 'w-5 h-5'

  if (status === 'loading') {
    return <Loader2 className={`${iconClass} text-blue-500 animate-spin`} />
  }
  if (status === 'success') {
    return <Check className={`${iconClass} text-green-500`} />
  }
  if (status === 'error') {
    return <X className={`${iconClass} text-red-500`} />
  }
  return <Icon className={`${iconClass} text-gray-400`} />
}

interface ConnectorProps {
  active: boolean
}

function Connector({ active }: Readonly<ConnectorProps>): React.ReactElement {
  const bgClass = active ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
  return (
    <div className='flex justify-center py-1'>
      <div className={`w-0.5 h-4 transition-colors duration-300 ${bgClass}`} />
    </div>
  )
}

function getStatusColor(status: ValidationStep): string {
  if (status === 'loading') return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
  if (status === 'success') return 'border-green-500 bg-green-50 dark:bg-green-900/20'
  if (status === 'error') return 'border-red-500 bg-red-50 dark:bg-red-900/20'
  return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
}

function getTextColor(status: ValidationStep): string {
  if (status === 'error') return 'text-red-700 dark:text-red-400'
  if (status === 'success') return 'text-green-700 dark:text-green-400'
  if (status === 'loading') return 'text-blue-700 dark:text-blue-400'
  return 'text-gray-700 dark:text-gray-300'
}

function getDescriptionText(
  status: ValidationStep,
  description: string,
  errorText?: string,
  successText?: string
): string {
  if (status === 'error' && errorText) return errorText
  if (status === 'success' && successText) return successText
  return description
}

interface ValidationLineProps {
  status: ValidationStep
  Icon: LucideIconComponent
  title: string
  description: string
  errorText?: string | undefined
  successText?: string | undefined
}

function ValidationLine({
  status,
  Icon,
  title,
  description,
  errorText,
  successText,
}: Readonly<ValidationLineProps>): React.ReactElement {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg border-2 transition-all duration-300 ${getStatusColor(status)}`}
    >
      <div className='flex-shrink-0'>
        <StatusIcon status={status} Icon={Icon} />
      </div>
      <div className='flex-1 min-w-0'>
        <p className={`font-medium text-sm ${getTextColor(status)}`}>{title}</p>
        <p className='text-xs text-gray-500 dark:text-gray-400'>
          {getDescriptionText(status, description, errorText, successText)}
        </p>
      </div>
      {status === 'loading' && (
        <span className='text-xs text-blue-600 dark:text-blue-400 animate-pulse'>
          Verificando...
        </span>
      )}
    </div>
  )
}

// Função para formatar números de forma segura
function formatNumber(value: string, decimals: number = 4): string {
  const num = Number.parseFloat(value)
  return Number.isNaN(num) ? '0' : num.toFixed(decimals)
}

export const TransactionValidationTimeline: React.FC<TransactionValidationTimelineProps> = ({
  walletId,
  toAddress,
  amount,
  network,
  tokenSymbol,
  onValidationComplete,
  onError,
}) => {
  const [validation, setValidation] = useState<ValidationState>({
    address: 'idle',
    balance: 'idle',
    gas: 'idle',
    ready: false,
  })

  const [validationData, setValidationData] = useState<ValidationData | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Função para executar a validação completa
  const runValidation = useCallback(async () => {
    // Resetar estados
    setValidation({
      address: 'idle',
      balance: 'idle',
      gas: 'idle',
      ready: false,
    })
    setValidationData(null)
    setIsValidating(true)

    try {
      // ETAPA 1: Validar endereço
      setValidation(prev => ({ ...prev, address: 'loading' }))
      await new Promise(resolve => setTimeout(resolve, 500)) // Pequeno delay para UX

      // ETAPA 2 e 3: Chamar API de validação que verifica tudo na blockchain
      setValidation(prev => ({ ...prev, address: 'success', balance: 'loading' }))

      const result = await sendService.validateSend({
        wallet_id: walletId,
        to_address: toAddress,
        amount: amount,
        network: network,
        token_symbol: tokenSymbol,
      })

      // Processar resultado
      if (result.valid) {
        // Tudo OK!
        setValidation({
          address: 'success',
          balance: 'success',
          gas: 'success',
          ready: true,
        })

        const data: ValidationData = {
          addressValid: true,
          balance: result.balance || result.token_balance || '0',
          gasEstimate: result.gas_estimate || '0',
          totalRequired: result.total_required || amount,
          remainingAfter: result.remaining_after || '0',
        }
        setValidationData(data)
        onValidationComplete(true, data)
      } else {
        // Erro na validação - identificar qual etapa falhou
        const errorCode = result.error || 'UNKNOWN_ERROR'
        const errorMessage = result.message || 'Erro na validação'

        // Determinar qual etapa falhou baseado no código de erro
        let newState: ValidationState

        if (errorCode === 'INSUFFICIENT_BALANCE' || errorCode === 'INSUFFICIENT_TOKEN_BALANCE') {
          newState = {
            address: 'success',
            balance: 'error',
            gas: 'idle',
            ready: false,
          }
        } else if (errorCode === 'INSUFFICIENT_GAS') {
          newState = {
            address: 'success',
            balance: 'success',
            gas: 'error',
            ready: false,
          }
        } else {
          // INVALID_TO_ADDRESS ou erro genérico
          newState = {
            address: 'error',
            balance: 'idle',
            gas: 'idle',
            ready: false,
          }
        }

        setValidation(newState)

        const data: ValidationData = {
          addressValid: errorCode !== 'INVALID_TO_ADDRESS',
          balance: result.balance || '0',
          gasEstimate: result.gas_estimate || result.gas_required || '0',
          totalRequired: result.total_required || amount,
          remainingAfter: '0',
          errorMessage: errorMessage,
          errorCode: errorCode,
        }
        setValidationData(data)
        onValidationComplete(false, data)
        onError(errorMessage)
      }
    } catch (error) {
      console.error('Validation error:', error)
      setValidation({
        address: 'error',
        balance: 'idle',
        gas: 'idle',
        ready: false,
      })
      onError('Erro ao validar transação. Tente novamente.')
      onValidationComplete(false, null)
    } finally {
      setIsValidating(false)
    }
  }, [walletId, toAddress, amount, network, tokenSymbol, onValidationComplete, onError])

  // Iniciar validação automaticamente quando os dados mudam
  useEffect(() => {
    if (toAddress && amount && Number.parseFloat(amount) > 0 && network && walletId) {
      const debounce = setTimeout(() => {
        runValidation()
      }, 800) // Debounce de 800ms

      return () => clearTimeout(debounce)
    }
    return undefined
  }, [toAddress, amount, network, walletId, runValidation])

  return (
    <div className='space-y-1'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
          <Shield className='w-4 h-4' />
          Validação da Transação
        </h3>
        {!isValidating && (
          <button
            onClick={runValidation}
            className='text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1'
          >
            <RefreshCw className='w-3 h-3' />
            Verificar novamente
          </button>
        )}
      </div>

      {/* Timeline de validações */}
      <ValidationLine
        status={validation.address}
        Icon={MapPin}
        title='Endereço de destino'
        description='Verificando formato do endereço...'
        successText='Endereço válido'
        errorText={
          validationData?.errorCode === 'INVALID_TO_ADDRESS' ? 'Endereço inválido' : undefined
        }
      />

      <Connector active={validation.address === 'success'} />

      <ValidationLine
        status={validation.balance}
        Icon={Wallet}
        title='Saldo na blockchain'
        description='Consultando saldo real na rede...'
        successText={
          validationData?.balance
            ? `Saldo: ${formatNumber(validationData.balance)}`
            : 'Saldo verificado'
        }
        errorText={
          validationData?.errorCode === 'INSUFFICIENT_BALANCE' ||
          validationData?.errorCode === 'INSUFFICIENT_TOKEN_BALANCE'
            ? `Saldo insuficiente: ${validationData.balance || '0'}`
            : undefined
        }
      />

      <Connector active={validation.balance === 'success'} />

      <ValidationLine
        status={validation.gas}
        Icon={Fuel}
        title='Taxa de rede (Gas)'
        description='Verificando gas disponível...'
        successText={
          validationData?.gasEstimate
            ? `Taxa: ~${formatNumber(validationData.gasEstimate, 6)}`
            : 'Gas disponível'
        }
        errorText={
          validationData?.errorCode === 'INSUFFICIENT_GAS'
            ? `Gas insuficiente: precisa ${validationData.gasEstimate}`
            : undefined
        }
      />

      {/* Status Final */}
      {validation.ready && (
        <div className='mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg'>
          <div className='flex items-center gap-3'>
            <Check className='w-6 h-6 text-green-600 dark:text-green-400' />
            <div>
              <p className='font-semibold text-green-800 dark:text-green-200'>
                Transação pode ser realizada
              </p>
              <p className='text-xs text-green-600 dark:text-green-400'>
                Saldo após envio: {formatNumber(validationData?.remainingAfter || '0')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {validationData?.errorMessage && !validation.ready && (
        <div className='mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
          <div className='flex items-start gap-3'>
            <AlertTriangle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
            <div>
              <p className='font-semibold text-red-800 dark:text-red-200'>
                {validationData.errorMessage}
              </p>
              {validationData.errorCode === 'INSUFFICIENT_BALANCE' && (
                <p className='text-xs text-red-600 dark:text-red-400 mt-1'>
                  Necessário: {validationData.totalRequired} | Disponível: {validationData.balance}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionValidationTimeline
