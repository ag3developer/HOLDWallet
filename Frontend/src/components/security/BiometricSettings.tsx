/**
 * BiometricSettings Component
 * Componente para gerenciar configurações de autenticação biométrica
 * Com cache para evitar re-carregamento ao navegar entre páginas
 */

import { useState, useEffect } from 'react'
import {
  Fingerprint,
  Shield,
  Smartphone,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react'
import { webAuthnService } from '@/services/webauthn'
import { useBiometricCache, invalidateBiometricCache } from '@/hooks/useBiometricCache'

interface BiometricSettingsProps {
  onStatusChange?: (hasBiometric: boolean) => void
}

export const BiometricSettings = ({ onStatusChange }: BiometricSettingsProps) => {
  // Usar hook com cache
  const {
    status,
    isSupported,
    isPlatformAvailable,
    isLoading,
    error: cacheError,
    refresh,
  } = useBiometricCache()

  const [isRegistering, setIsRegistering] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Notificar mudança de status
  useEffect(() => {
    if (status) {
      onStatusChange?.(status.has_biometric)
    }
  }, [status, onStatusChange])

  // Mostrar erro do cache
  useEffect(() => {
    if (cacheError) {
      setError(cacheError)
    }
  }, [cacheError])

  // Registrar nova biometria
  const handleRegister = async () => {
    if (!deviceName.trim()) {
      setError('Digite um nome para identificar este dispositivo')
      return
    }

    setIsRegistering(true)
    setError(null)
    setSuccess(null)

    try {
      await webAuthnService.registerCredential(deviceName.trim())
      setSuccess('Biometria configurada com sucesso!')
      setDeviceName('')
      setShowAddForm(false)
      // Invalidar cache e recarregar
      invalidateBiometricCache()
      await refresh()
    } catch (err: any) {
      console.error('Erro ao registrar biometria:', err)
      if (err.name === 'NotAllowedError') {
        setError('Autenticação cancelada pelo usuário')
      } else if (err.name === 'InvalidStateError') {
        setError('Este dispositivo já está registrado')
      } else {
        setError(err.message || 'Erro ao configurar biometria')
      }
    } finally {
      setIsRegistering(false)
    }
  }

  // Remover credencial
  const handleDelete = async (credentialId: string) => {
    setIsDeleting(credentialId)
    setError(null)
    setSuccess(null)

    try {
      await webAuthnService.deleteCredential(credentialId)
      setSuccess('Dispositivo removido com sucesso!')
      // Invalidar cache e recarregar
      invalidateBiometricCache()
      await refresh()
    } catch (err: any) {
      console.error('Erro ao remover credencial:', err)
      setError('Erro ao remover dispositivo')
    } finally {
      setIsDeleting(null)
    }
  }

  // Detectar nome do dispositivo automaticamente
  const getDefaultDeviceName = () => {
    const ua = navigator.userAgent
    if (/iPhone/.test(ua)) return 'iPhone'
    if (/iPad/.test(ua)) return 'iPad'
    if (/Mac/.test(ua)) return 'Mac'
    if (/Android/.test(ua)) return 'Android'
    if (/Windows/.test(ua)) return 'Windows'
    return 'Meu dispositivo'
  }

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700'>
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='w-6 h-6 animate-spin text-primary-500' />
          <span className='ml-3 text-gray-500 dark:text-gray-400'>Carregando...</span>
        </div>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700'>
        <div className='flex items-start gap-4'>
          <div className='p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl'>
            <AlertCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />
          </div>
          <div>
            <h3 className='font-semibold text-gray-900 dark:text-white'>Navegador não suportado</h3>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              Seu navegador não suporta autenticação biométrica. Use Chrome, Safari, Edge ou Firefox
              em versões recentes.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
      {/* Header */}
      <div className='p-6 border-b border-gray-100 dark:border-gray-700'>
        <div className='flex items-start gap-4'>
          <div className='p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl'>
            <Fingerprint className='w-6 h-6 text-primary-600 dark:text-primary-400' />
          </div>
          <div className='flex-1'>
            <h3 className='font-semibold text-gray-900 dark:text-white'>Autenticação Biométrica</h3>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              Use Face ID, Touch ID ou Windows Hello para autorizar transações
            </p>
          </div>
          {status?.has_biometric && (
            <div className='flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full'>
              <CheckCircle className='w-4 h-4 text-green-600 dark:text-green-400' />
              <span className='text-xs font-medium text-green-700 dark:text-green-300'>Ativo</span>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className='mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg flex items-start gap-3'>
          <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
          <div>
            <p className='text-sm font-medium text-red-700 dark:text-red-300'>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className='mx-6 mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg flex items-start gap-3'>
          <CheckCircle className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
          <div>
            <p className='text-sm font-medium text-green-700 dark:text-green-300'>{success}</p>
          </div>
        </div>
      )}

      {/* Info sobre biometria de plataforma */}
      {!isPlatformAvailable && (
        <div className='mx-6 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex items-start gap-3'>
          <Info className='w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5' />
          <div>
            <p className='text-sm text-blue-700 dark:text-blue-300'>
              Seu dispositivo não possui autenticador biométrico nativo. Você pode usar uma chave de
              segurança externa (como YubiKey).
            </p>
          </div>
        </div>
      )}

      {/* Lista de dispositivos registrados */}
      <div className='p-6'>
        <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
          Dispositivos registrados
        </h4>

        {status?.credentials && status.credentials.length > 0 ? (
          <div className='space-y-3'>
            {status.credentials.map(credential => (
              <div
                key={credential.id}
                className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'
              >
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-white dark:bg-gray-600 rounded-lg'>
                    <Smartphone className='w-5 h-5 text-gray-600 dark:text-gray-300' />
                  </div>
                  <div>
                    <p className='font-medium text-gray-900 dark:text-white'>
                      {credential.device_name}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Adicionado em {formatDate(credential.created_at)}
                    </p>
                    {credential.last_used_at && (
                      <p className='text-xs text-gray-400 dark:text-gray-500'>
                        Último uso: {formatDate(credential.last_used_at)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(credential.id)}
                  disabled={isDeleting === credential.id}
                  className='p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50'
                  title='Remover dispositivo'
                >
                  {isDeleting === credential.id ? (
                    <Loader2 className='w-5 h-5 animate-spin' />
                  ) : (
                    <Trash2 className='w-5 h-5' />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className='text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg'>
            <Shield className='w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3' />
            <p className='text-gray-500 dark:text-gray-400'>Nenhum dispositivo configurado</p>
            <p className='text-sm text-gray-400 dark:text-gray-500 mt-1'>
              Adicione um dispositivo para usar biometria
            </p>
          </div>
        )}
      </div>

      {/* Adicionar novo dispositivo */}
      <div className='p-6 border-t border-gray-100 dark:border-gray-700'>
        {showAddForm ? (
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Nome do dispositivo
              </label>
              <input
                type='text'
                value={deviceName}
                onChange={e => setDeviceName(e.target.value)}
                placeholder={getDefaultDeviceName()}
                className='w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400'
                disabled={isRegistering}
              />
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                Ex: iPhone do José, MacBook Trabalho
              </p>
            </div>

            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setDeviceName('')
                  setError(null)
                }}
                disabled={isRegistering}
                className='flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'
              >
                Cancelar
              </button>
              <button
                onClick={handleRegister}
                disabled={isRegistering || !deviceName.trim()}
                className='flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isRegistering ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    Aguardando...
                  </>
                ) : (
                  <>
                    <Fingerprint className='w-5 h-5' />
                    Configurar
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setShowAddForm(true)
              setDeviceName(getDefaultDeviceName())
              setError(null)
              setSuccess(null)
            }}
            className='w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-primary-300 hover:text-primary-600 dark:hover:border-primary-600 dark:hover:text-primary-400 transition-colors'
          >
            <Plus className='w-5 h-5' />
            Adicionar dispositivo
          </button>
        )}
      </div>

      {/* Dica de segurança */}
      <div className='px-6 pb-6'>
        <div className='p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg'>
          <div className='flex items-start gap-3'>
            <Shield className='w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5' />
            <div>
              <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Dica de segurança
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                A biometria adiciona uma camada extra de proteção. Mesmo que alguém descubra sua
                senha, não conseguirá fazer transações sem seu dispositivo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BiometricSettings
