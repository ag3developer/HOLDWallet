import { useState, useEffect } from 'react'
import {
  CheckCircle,
  Loader2,
  XCircle,
  MapPin,
  Wallet,
  Fuel,
  Fingerprint,
  Send,
  ExternalLink,
  Copy,
  AlertTriangle,
} from 'lucide-react'

export type TimelineStep =
  | 'idle'
  | 'validating_address'
  | 'checking_balance'
  | 'estimating_gas'
  | 'awaiting_biometric'
  | 'sending'
  | 'success'
  | 'error'

export interface SendTimelineProps {
  currentStep: TimelineStep
  error?: string | null
  txHash?: string
  network?: string
  onBiometricRequest?: () => Promise<void>
  biometricEnabled?: boolean
  validationData?: {
    addressValid?: boolean
    balance?: string
    gasEstimate?: string
    totalRequired?: string
  }
}

interface StepConfig {
  id: TimelineStep
  label: string
  icon: React.ComponentType<any>
  description?: string
}

const steps: StepConfig[] = [
  { id: 'validating_address', label: 'Validando endereço', icon: MapPin },
  { id: 'checking_balance', label: 'Verificando saldo', icon: Wallet },
  { id: 'estimating_gas', label: 'Estimando taxa', icon: Fuel },
  { id: 'awaiting_biometric', label: 'Confirmação', icon: Fingerprint },
  { id: 'sending', label: 'Enviando', icon: Send },
]

const getStepIndex = (step: TimelineStep): number => {
  const index = steps.findIndex(s => s.id === step)
  return index === -1 ? -1 : index
}

const getExplorerUrl = (network: string, hash: string): string => {
  const explorers: Record<string, string> = {
    polygon: `https://polygonscan.com/tx/${hash}`,
    ethereum: `https://etherscan.io/tx/${hash}`,
    bsc: `https://bscscan.com/tx/${hash}`,
    base: `https://basescan.org/tx/${hash}`,
    arbitrum: `https://arbiscan.io/tx/${hash}`,
    optimism: `https://optimistic.etherscan.io/tx/${hash}`,
    avalanche: `https://snowtrace.io/tx/${hash}`,
    tron: `https://tronscan.org/#/transaction/${hash}`,
  }
  return explorers[network?.toLowerCase()] || ''
}

export const SendTimeline = ({
  currentStep,
  error,
  txHash,
  network,
  onBiometricRequest,
  biometricEnabled = false,
  validationData,
}: SendTimelineProps) => {
  const [biometricLoading, setBiometricLoading] = useState(false)
  const currentIndex = getStepIndex(currentStep)

  // Auto-trigger biometric when step reaches awaiting_biometric
  useEffect(() => {
    if (
      currentStep === 'awaiting_biometric' &&
      biometricEnabled &&
      onBiometricRequest &&
      !biometricLoading
    ) {
      handleBiometric()
    }
  }, [currentStep, biometricEnabled])

  const handleBiometric = async () => {
    if (!onBiometricRequest || biometricLoading) return
    setBiometricLoading(true)
    try {
      await onBiometricRequest()
    } finally {
      setBiometricLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Se idle, não mostrar nada
  if (currentStep === 'idle') return null

  // Se sucesso, mostrar tela de sucesso
  if (currentStep === 'success' && txHash) {
    const explorerUrl = getExplorerUrl(network || '', txHash)

    return (
      <div className='mt-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800'>
        <div className='flex flex-col items-center text-center'>
          <div className='w-16 h-16 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center mb-4'>
            <CheckCircle className='w-10 h-10 text-green-600 dark:text-green-400' />
          </div>

          <h3 className='text-xl font-semibold text-green-800 dark:text-green-200 mb-2'>
            Transação Enviada!
          </h3>

          <p className='text-sm text-green-600 dark:text-green-300 mb-4'>
            Sua transação foi enviada para a blockchain
          </p>

          {/* Hash da transação */}
          <div className='w-full bg-white dark:bg-gray-800 rounded-lg p-3 mb-4'>
            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Hash da Transação</p>
            <div className='flex items-center gap-2'>
              <code className='text-xs font-mono text-gray-700 dark:text-gray-300 truncate flex-1'>
                {txHash}
              </code>
              <button
                onClick={() => copyToClipboard(txHash)}
                className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                title='Copiar hash'
                aria-label='Copiar hash da transação'
              >
                <Copy className='w-4 h-4 text-gray-500' />
              </button>
            </div>
          </div>

          {/* Botão para ver no explorer */}
          {explorerUrl && (
            <a
              href={explorerUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors'
            >
              <ExternalLink className='w-4 h-4' />
              Ver no Explorer
            </a>
          )}
        </div>
      </div>
    )
  }

  // Se erro, mostrar mensagem de erro
  if (currentStep === 'error' && error) {
    return (
      <div className='mt-6 p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800'>
        <div className='flex flex-col items-center text-center'>
          <div className='w-16 h-16 rounded-full bg-red-100 dark:bg-red-800/50 flex items-center justify-center mb-4'>
            <XCircle className='w-10 h-10 text-red-600 dark:text-red-400' />
          </div>

          <h3 className='text-xl font-semibold text-red-800 dark:text-red-200 mb-2'>
            Erro na Transação
          </h3>

          <p className='text-sm text-red-600 dark:text-red-300'>{error}</p>
        </div>
      </div>
    )
  }

  // Timeline em progresso
  return (
    <div className='mt-6 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700'>
      <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
        Processando transação...
      </h3>

      <div className='space-y-4'>
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCompleted = currentIndex > index
          const isCurrent = currentIndex === index
          const isPending = currentIndex < index

          // Skip biometric step if not enabled
          if (step.id === 'awaiting_biometric' && !biometricEnabled) {
            return null
          }

          // Determine which icon to render
          const renderStepIcon = () => {
            if (isCompleted) {
              return <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />
            }
            if (isCurrent) {
              return <Loader2 className='w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin' />
            }
            return <Icon className='w-5 h-5 text-gray-400 dark:text-gray-500' />
          }

          return (
            <div key={step.id} className='flex items-center gap-4'>
              {/* Icon/Status */}
              <div
                className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all
                ${isCompleted ? 'bg-green-100 dark:bg-green-800/50' : ''}
                ${isCurrent ? 'bg-blue-100 dark:bg-blue-800/50' : ''}
                ${isPending ? 'bg-gray-100 dark:bg-gray-700' : ''}
              `}
              >
                {renderStepIcon()}
              </div>

              {/* Label */}
              <div className='flex-1'>
                <p
                  className={`
                  text-sm font-medium transition-colors
                  ${isCompleted ? 'text-green-700 dark:text-green-300' : ''}
                  ${isCurrent ? 'text-blue-700 dark:text-blue-300' : ''}
                  ${isPending ? 'text-gray-400 dark:text-gray-500' : ''}
                `}
                >
                  {step.label}
                </p>

                {/* Extra info for current step */}
                {isCurrent && step.id === 'checking_balance' && validationData?.balance && (
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                    Saldo: {validationData.balance}
                  </p>
                )}
                {isCurrent && step.id === 'estimating_gas' && validationData?.gasEstimate && (
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                    Taxa estimada: {validationData.gasEstimate}
                  </p>
                )}
              </div>

              {/* Checkmark for completed */}
              {isCompleted && (
                <span className='text-xs text-green-600 dark:text-green-400'>OK</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Biometric button (only if awaiting and enabled) */}
      {currentStep === 'awaiting_biometric' && biometricEnabled && !biometricLoading && (
        <div className='mt-6 pt-4 border-t border-gray-200 dark:border-gray-600'>
          <button
            onClick={handleBiometric}
            className='w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors'
          >
            <Fingerprint className='w-5 h-5' />
            Confirmar com Biometria
          </button>
        </div>
      )}

      {/* Warning for non-biometric mode */}
      {currentStep === 'awaiting_biometric' && !biometricEnabled && (
        <div className='mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2'>
          <AlertTriangle className='w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5' />
          <p className='text-xs text-yellow-700 dark:text-yellow-300'>
            Transação será enviada usando sua sessão autenticada. Para mais segurança, ative a
            biometria nas configurações.
          </p>
        </div>
      )}
    </div>
  )
}

export default SendTimeline
