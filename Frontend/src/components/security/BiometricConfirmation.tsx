/**
 * BiometricConfirmation Component
 * Modal/Dialog para confirmação biométrica de ações sensíveis
 */

import { useState, useEffect } from 'react'
import { Fingerprint, X, Shield, Loader2, AlertCircle, CheckCircle, KeyRound } from 'lucide-react'
import { webAuthnService } from '@/services/webauthn'

interface BiometricConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onFallback?: () => void // Fallback para 2FA
  title?: string
  description?: string
  amount?: string
  recipient?: string
}

export const BiometricConfirmation = ({
  isOpen,
  onClose,
  onSuccess,
  onFallback,
  title = 'Confirmar transação',
  description = 'Use sua biometria para autorizar esta ação',
  amount,
  recipient,
}: BiometricConfirmationProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasBiometric, setHasBiometric] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Verificar se tem biometria configurada
  useEffect(() => {
    const checkBiometric = async () => {
      if (!isOpen) return

      setIsInitializing(true)
      setError(null)
      setSuccess(false)

      try {
        const status = await webAuthnService.getStatus()
        setHasBiometric(status.has_biometric)

        // Se não tem biometria, vai direto para fallback
        if (!status.has_biometric && onFallback) {
          onFallback()
          return
        }
      } catch (err) {
        console.error('Erro ao verificar biometria:', err)
        setHasBiometric(false)
        if (onFallback) {
          onFallback()
          return
        }
      } finally {
        setIsInitializing(false)
      }
    }

    checkBiometric()
  }, [isOpen, onFallback])

  // Iniciar autenticação biométrica
  const handleBiometricAuth = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const success = await webAuthnService.authenticate()

      if (success) {
        setSuccess(true)
        // Pequeno delay para mostrar o sucesso
        setTimeout(() => {
          onSuccess()
        }, 500)
      } else {
        setError('Falha na autenticação')
      }
    } catch (err: any) {
      console.error('Erro na autenticação biométrica:', err)
      if (err.name === 'NotAllowedError') {
        setError('Autenticação cancelada')
      } else {
        setError(err.message || 'Erro na autenticação')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div className='relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in'>
        {/* Header */}
        <div className='relative p-6 pb-4'>
          <button
            onClick={onClose}
            disabled={isLoading}
            className='absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'
          >
            <X className='w-5 h-5' />
          </button>

          <div className='flex flex-col items-center text-center'>
            <div
              className={`p-4 rounded-full mb-4 ${
                success
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-primary-100 dark:bg-primary-900/30'
              }`}
            >
              {success ? (
                <CheckCircle className='w-10 h-10 text-green-500' />
              ) : (
                <Fingerprint className='w-10 h-10 text-primary-500' />
              )}
            </div>

            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
              {success ? 'Autorizado!' : title}
            </h2>
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
              {success ? 'Transação autorizada com sucesso' : description}
            </p>
          </div>
        </div>

        {/* Detalhes da transação */}
        {(amount || recipient) && !success && (
          <div className='mx-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            {amount && (
              <div className='flex justify-between items-center'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Valor</span>
                <span className='font-semibold text-gray-900 dark:text-white'>{amount}</span>
              </div>
            )}
            {recipient && (
              <div className='flex justify-between items-center mt-2'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Para</span>
                <span className='font-mono text-sm text-gray-700 dark:text-gray-300 truncate ml-4 max-w-[200px]'>
                  {recipient}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className='mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex items-center gap-2'>
            <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0' />
            <p className='text-sm text-red-700 dark:text-red-300'>{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className='p-6 space-y-3'>
          {isInitializing ? (
            <div className='flex items-center justify-center py-4'>
              <Loader2 className='w-6 h-6 animate-spin text-primary-500' />
              <span className='ml-3 text-gray-500'>Verificando...</span>
            </div>
          ) : hasBiometric && !success ? (
            <>
              <button
                onClick={handleBiometricAuth}
                disabled={isLoading}
                className='w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium'
              >
                {isLoading ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    Aguardando biometria...
                  </>
                ) : (
                  <>
                    <Fingerprint className='w-5 h-5' />
                    Usar biometria
                  </>
                )}
              </button>

              {onFallback && (
                <button
                  onClick={onFallback}
                  disabled={isLoading}
                  className='w-full flex items-center justify-center gap-2 px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50'
                >
                  <KeyRound className='w-4 h-4' />
                  Usar código 2FA
                </button>
              )}
            </>
          ) : !hasBiometric && !success ? (
            <>
              <div className='text-center py-4'>
                <Shield className='w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3' />
                <p className='text-gray-500 dark:text-gray-400'>Biometria não configurada</p>
              </div>

              {onFallback && (
                <button
                  onClick={onFallback}
                  className='w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium'
                >
                  <KeyRound className='w-5 h-5' />
                  Continuar com 2FA
                </button>
              )}
            </>
          ) : success ? (
            <div className='flex items-center justify-center py-2'>
              <CheckCircle className='w-6 h-6 text-green-500' />
              <span className='ml-2 text-green-600 dark:text-green-400 font-medium'>
                Transação autorizada!
              </span>
            </div>
          ) : null}
        </div>

        {/* Footer - Security info */}
        {!success && (
          <div className='px-6 pb-6'>
            <div className='flex items-center justify-center gap-2 text-xs text-gray-400'>
              <Shield className='w-3.5 h-3.5' />
              <span>Suas informações biométricas nunca saem do dispositivo</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BiometricConfirmation
