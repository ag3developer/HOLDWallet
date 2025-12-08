import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Clock, Loader } from 'lucide-react'

interface TradeStatusMonitorProps {
  readonly tradeId: string | undefined
  readonly initialStatus?: string
  readonly onStatusChange?: (newStatus: string) => void
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING: {
    color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
    icon: <Clock className='w-5 h-5 text-yellow-600 dark:text-yellow-400' />,
    label: 'Aguardando Pagamento',
  },
  PAYMENT_CONFIRMED: {
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    icon: <Loader className='w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin' />,
    label: 'Pagamento Confirmado',
  },
  COMPLETED: {
    color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    icon: <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />,
    label: 'Concluído',
  },
  FAILED: {
    color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
    icon: <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400' />,
    label: 'Falha',
  },
  CANCELLED: {
    color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700',
    icon: <AlertCircle className='w-5 h-5 text-gray-600 dark:text-gray-400' />,
    label: 'Cancelado',
  },
  EXPIRED: {
    color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700',
    icon: <AlertCircle className='w-5 h-5 text-orange-600 dark:text-orange-400' />,
    label: 'Expirado',
  },
}

export function TradeStatusMonitor({
  tradeId,
  initialStatus = 'PENDING',
  onStatusChange,
}: TradeStatusMonitorProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [showNotification, setShowNotification] = useState(false)

  // Simular mudanças de status (em produção, seria WebSocket ou polling)
  useEffect(() => {
    if (!tradeId) {
      return
    }

    // Apenas para demonstração - em produção seria integrado com backend
    const statusSequence = ['PENDING', 'PAYMENT_CONFIRMED', 'COMPLETED']
    const currentIndex = statusSequence.indexOf(currentStatus)

    if (currentIndex < statusSequence.length - 1) {
      const timer = setTimeout(() => {
        const newStatus = statusSequence[currentIndex + 1]
        if (newStatus) {
          setCurrentStatus(newStatus)
          setShowNotification(true)
          onStatusChange?.(newStatus)

          // Auto-hide notification after 5 seconds
          setTimeout(() => setShowNotification(false), 5000)
        }
      }, 8000)

      return () => clearTimeout(timer)
    }

    return undefined
  }, [currentStatus, tradeId, onStatusChange])

  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PENDING

  if (!config) {
    return null
  }

  return (
    <div className='space-y-3'>
      {/* Status Card */}
      <div
        className={`border rounded-lg p-4 flex items-center gap-3 transition-all ${config.color}`}
      >
        <div className='flex-shrink-0'>{config.icon}</div>
        <div className='flex-1'>
          <p className='text-sm font-semibold text-gray-900 dark:text-white'>{config.label}</p>
          <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
            {currentStatus === 'PENDING' && 'Aguarde a confirmação do pagamento'}
            {currentStatus === 'PAYMENT_CONFIRMED' &&
              'Seu pagamento foi confirmado. Processando...'}
            {currentStatus === 'COMPLETED' && 'Trade finalizada com sucesso!'}
            {currentStatus === 'FAILED' && 'Houve um problema com sua operação'}
            {currentStatus === 'CANCELLED' && 'Você cancelou esta operação'}
            {currentStatus === 'EXPIRED' && 'Esta operação expirou'}
          </p>
        </div>
      </div>

      {/* Status Timeline */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-4'>
        <p className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>
          Progresso da Operação
        </p>
        <div className='space-y-2'>
          {['PENDING', 'PAYMENT_CONFIRMED', 'COMPLETED'].map((status, index, array) => {
            const isActive = currentStatus === status
            const isCompleted =
              array.indexOf(currentStatus) > index || currentStatus === 'COMPLETED'

            // Compute background color class
            let bgColorClass: string
            if (isActive) {
              bgColorClass = 'bg-blue-600 text-white'
            } else if (isCompleted) {
              bgColorClass = 'bg-green-600 text-white'
            } else {
              bgColorClass = 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }

            // Compute icon content
            let iconContent: React.ReactNode
            if (isCompleted) {
              iconContent = <CheckCircle className='w-4 h-4' />
            } else if (isActive) {
              iconContent = <Loader className='w-4 h-4 animate-spin' />
            } else {
              iconContent = <span className='text-xs font-bold'>{index + 1}</span>
            }

            return (
              <div key={status} className='flex items-center gap-3'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${bgColorClass}`}
                >
                  {iconContent}
                </div>
                <div className='flex-1'>
                  <p
                    className={`text-sm font-medium ${
                      isActive || isCompleted
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {status === 'PENDING' && 'Aguardando Pagamento'}
                    {status === 'PAYMENT_CONFIRMED' && 'Pagamento Confirmado'}
                    {status === 'COMPLETED' && 'Concluído'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 animate-pulse flex items-start gap-2'>
          <CheckCircle className='w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400 mt-0.5' />
          <p className='text-sm font-medium text-green-800 dark:text-green-400'>
            Status atualizado para: {config.label}
          </p>
        </div>
      )}

      {/* Info Message */}
      {tradeId && (
        <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3'>
          <p className='text-xs text-blue-800 dark:text-blue-400'>
            ID da Trade: <span className='font-mono'>{tradeId.substring(0, 12)}...</span>
          </p>
        </div>
      )}
    </div>
  )
}
