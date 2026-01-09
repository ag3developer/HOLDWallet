/**
 * WOLK NOW - Push Notification Prompt
 * =====================================
 *
 * Componente elegante para solicitar permissão de Push Notifications.
 * Aparece de forma não intrusiva e explica os benefícios.
 * SÓ APARECE QUANDO O USUÁRIO ESTÁ AUTENTICADO.
 */

import { useState, useEffect } from 'react'
import { Bell, X, Smartphone, Shield, ArrowRightLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAuthStore } from '@/stores/useAuthStore'

interface PushNotificationPromptProps {
  /** Delay antes de mostrar (ms) */
  delay?: number
  /** Callback quando ativado */
  onSubscribed?: () => void
  /** Callback quando dismissado */
  onDismissed?: () => void
}

export const PushNotificationPrompt = ({
  delay = 3000,
  onSubscribed,
  onDismissed,
}: PushNotificationPromptProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Verificar se usuário está autenticado
  const { isAuthenticated, token } = useAuthStore()

  const { isSupported, permission, isSubscribed, isLoading, subscribe, isPWA, error } =
    usePushNotifications()

  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Verificar se já foi dismissado anteriormente
  useEffect(() => {
    const dismissed = localStorage.getItem('push-prompt-dismissed')
    if (dismissed) {
      const dismissedAt = Number.parseInt(dismissed, 10)
      // Mostrar novamente após 7 dias
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true)
      }
    }
  }, [])

  // Mostrar após delay - APENAS SE AUTENTICADO
  useEffect(() => {
    // NÃO MOSTRAR se não está autenticado
    if (!isAuthenticated || !token) {
      setIsVisible(false)
      return
    }

    if (!isSupported || isSubscribed || permission === 'denied' || isDismissed) {
      return
    }

    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [isSupported, isSubscribed, permission, isDismissed, delay, isAuthenticated, token])

  // Handler para ativar
  const handleSubscribe = async () => {
    setStatus('idle')
    setErrorMessage(null)

    try {
      const success = await subscribe()
      if (success) {
        setStatus('success')
        // Mostrar sucesso por 2 segundos antes de fechar
        setTimeout(() => {
          setIsVisible(false)
          onSubscribed?.()
        }, 2000)
      } else {
        setStatus('error')
        setErrorMessage('Não foi possível ativar. Verifique as permissões do navegador.')
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err.message || 'Erro ao ativar notificações')
    }
  }

  // Handler para dismissar
  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    localStorage.setItem('push-prompt-dismissed', Date.now().toString())
    onDismissed?.()
  }

  // Não mostrar se condições não atendidas
  if (
    !isAuthenticated ||
    !token ||
    !isVisible ||
    !isSupported ||
    isSubscribed ||
    permission === 'denied'
  ) {
    return null
  }

  return (
    <div
      className='fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[400px]
                 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl 
                 border border-gray-200 dark:border-gray-700 
                 overflow-hidden z-50
                 animate-in slide-in-from-bottom-4 duration-300'
    >
      {/* Header com gradiente */}
      <div className='bg-gradient-to-r from-blue-600 to-blue-700 p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-white/20 rounded-xl backdrop-blur'>
              <Bell className='w-6 h-6 text-white' />
            </div>
            <div>
              <h3 className='font-semibold text-white'>Ativar Notificacoes</h3>
              <p className='text-xs text-blue-100'>Fique por dentro em tempo real</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className='p-1.5 hover:bg-white/20 rounded-lg transition-colors'
            title='Fechar'
          >
            <X className='w-5 h-5 text-white' />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className='p-4'>
        <p className='text-sm text-gray-600 dark:text-gray-300 mb-4'>
          Receba alertas importantes mesmo com o app fechado:
        </p>

        {/* Benefícios */}
        <div className='space-y-2.5 mb-5'>
          <div className='flex items-center gap-3'>
            <div className='p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg'>
              <ArrowRightLeft className='w-4 h-4 text-green-600 dark:text-green-400' />
            </div>
            <span className='text-sm text-gray-700 dark:text-gray-300'>
              Trades P2P aceitos e pagamentos confirmados
            </span>
          </div>

          <div className='flex items-center gap-3'>
            <div className='p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg'>
              <Smartphone className='w-4 h-4 text-purple-600 dark:text-purple-400' />
            </div>
            <span className='text-sm text-gray-700 dark:text-gray-300'>
              Transacoes recebidas na sua carteira
            </span>
          </div>

          <div className='flex items-center gap-3'>
            <div className='p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg'>
              <Shield className='w-4 h-4 text-red-600 dark:text-red-400' />
            </div>
            <span className='text-sm text-gray-700 dark:text-gray-300'>
              Alertas de seguranca e novos logins
            </span>
          </div>
        </div>

        {/* Aviso iOS */}
        {!isPWA && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
          <div className='mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800'>
            <p className='text-xs text-amber-700 dark:text-amber-300'>
              <strong>iOS:</strong> Para receber notificacoes, adicione o app na tela inicial (
              Compartilhar {'>'} Adicionar a Tela de Inicio)
            </p>
          </div>
        )}

        {/* Botões */}
        <div className='flex flex-col gap-2'>
          {/* Mensagem de sucesso */}
          {status === 'success' && (
            <div className='flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800'>
              <CheckCircle className='w-5 h-5 text-green-600' />
              <span className='text-sm text-green-700 dark:text-green-300 font-medium'>
                Notificações ativadas com sucesso!
              </span>
            </div>
          )}

          {/* Mensagem de erro */}
          {status === 'error' && errorMessage && (
            <div className='flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800'>
              <AlertCircle className='w-5 h-5 text-red-600' />
              <span className='text-sm text-red-700 dark:text-red-300'>{errorMessage}</span>
            </div>
          )}

          <div className='flex gap-2'>
            <button
              onClick={handleSubscribe}
              disabled={isLoading || status === 'success'}
              className={`flex-1 py-2.5 px-4 text-white text-sm font-medium rounded-xl
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center gap-2
                         ${
                           status === 'success'
                             ? 'bg-green-600'
                             : status === 'error'
                               ? 'bg-red-600 hover:bg-red-700'
                               : 'bg-blue-600 hover:bg-blue-700'
                         }`}
            >
              {isLoading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  Ativando...
                </>
              ) : status === 'success' ? (
                <>
                  <CheckCircle className='w-4 h-4' />
                  Ativado!
                </>
              ) : status === 'error' ? (
                <>
                  <AlertCircle className='w-4 h-4' />
                  Tentar novamente
                </>
              ) : (
                <>
                  <Bell className='w-4 h-4' />
                  Ativar Notificacoes
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className='py-2.5 px-4 text-gray-500 hover:text-gray-700
                         dark:text-gray-400 dark:hover:text-gray-200
                         text-sm font-medium rounded-xl hover:bg-gray-100 
                         dark:hover:bg-gray-700 transition-colors'
            >
              Agora nao
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PushNotificationPrompt
