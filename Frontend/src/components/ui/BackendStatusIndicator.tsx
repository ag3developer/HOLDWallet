import { useState, useEffect } from 'react'
import { FiWifi, FiWifiOff, FiAlertCircle } from 'react-icons/fi'

interface BackendStatusIndicatorProps {
  className?: string
}

/**
 * Indicador visual do status da conexão com o backend
 * Mostra um ícone discreto que muda de cor baseado na conectividade
 */
export const BackendStatusIndicator = ({ className = '' }: BackendStatusIndicatorProps) => {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    // Check backend status periodically
    const checkBackendStatus = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const response = await fetch(`${import.meta.env.VITE_API_URL}/health`, {
          signal: controller.signal,
          method: 'GET',
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          setStatus('online')
        } else {
          setStatus('offline')
        }
      } catch (error: unknown) {
        console.warn(
          '[BackendStatus] Backend health check failed:',
          error instanceof Error ? error.message : 'Unknown error'
        )
        setStatus('offline')
      }
    }

    // Check immediately
    checkBackendStatus()

    // Check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  const statusConfig = {
    online: {
      icon: FiWifi,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      label: 'Backend Online',
      description: 'Todos os serviços estão operacionais',
    },
    offline: {
      icon: FiWifiOff,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      label: 'Backend Offline',
      description: 'Algumas funcionalidades podem estar indisponíveis',
    },
    checking: {
      icon: FiAlertCircle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      label: 'Verificando...',
      description: 'Checando status da conexão',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`relative ${className}`}>
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor} hover:scale-110 transition-all duration-300`}
        aria-label={config.label}
        title={config.label}
      >
        <Icon
          className={`w-4 h-4 ${config.color} ${status === 'checking' ? 'animate-pulse' : ''}`}
        />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className='absolute right-0 top-full mt-2 w-56 p-3 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-50 animate-fadeIn'>
          <div className='flex items-center gap-2 mb-1'>
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className='text-sm font-semibold text-white'>{config.label}</span>
          </div>
          <p className='text-xs text-gray-400'>{config.description}</p>
        </div>
      )}
    </div>
  )
}
