/**
 * 💸 Send Confirmation Modal
 * ===========================
 *
 * Modal for confirming transaction details before sending.
 * Supports biometric authentication (Face ID/Touch ID) and 2FA.
 */

import React from 'react'
import {
  X,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Clock,
  DollarSign,
  Shield,
  Fingerprint,
} from 'lucide-react'
import { CryptoIcon } from '../CryptoIcon'
import { BiometricConfirmation } from '../security/BiometricConfirmation'
import { webAuthnService } from '@/services/webauthn'
import type { EstimateFeeResponse } from '@/services/sendService'

interface SendConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (feeLevel: 'slow' | 'standard' | 'fast', twoFactorToken?: string) => void
  fromAddress: string
  toAddress: string
  amount: string
  symbol: string
  network: string
  feeEstimates: EstimateFeeResponse | null
  isLoading?: boolean
  requires2FA?: boolean
  hasBiometric?: boolean
}

export const SendConfirmationModal: React.FC<SendConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fromAddress,
  toAddress,
  amount,
  symbol,
  network,
  feeEstimates,
  isLoading = false,
  requires2FA = false,
  hasBiometric = false,
}) => {
  const [selectedFeeLevel, setSelectedFeeLevel] = React.useState<'slow' | 'standard' | 'fast'>(
    'standard'
  )
  const [twoFactorToken, setTwoFactorToken] = React.useState('')
  const [show2FAError, setShow2FAError] = React.useState(false)
  const [authMethod, setAuthMethod] = React.useState<'biometric' | '2fa'>('biometric')
  const [showBiometricModal, setShowBiometricModal] = React.useState(false)
  const [biometricAvailable, setBiometricAvailable] = React.useState(false)

  // Check if biometric is available
  React.useEffect(() => {
    const checkBiometric = async () => {
      const available = (await webAuthnService.isSupported()) && hasBiometric
      setBiometricAvailable(available)
      if (!available && requires2FA) {
        setAuthMethod('2fa')
      }
    }
    checkBiometric()
  }, [hasBiometric, requires2FA])

  if (!isOpen) return null

  const formatAddress = (addr: string) => {
    if (addr.length <= 13) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getFeeForLevel = (level: 'slow' | 'standard' | 'fast') => {
    if (!feeEstimates) return '0'
    const feeKey = `${level}_fee` as keyof typeof feeEstimates.fee_estimates
    return feeEstimates.fee_estimates[feeKey] || '0'
  }

  const getTimeEstimate = (level: 'slow' | 'standard' | 'fast') => {
    const times = {
      slow: '10-30 min',
      standard: '2-10 min',
      fast: '< 2 min',
    }
    return times[level]
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200'>
        {/* Header */}
        <div className='bg-gradient-to-r from-orange-500 to-red-600 rounded-t-2xl p-6 flex items-center justify-between'>
          <div className='flex items-center gap-3 text-white'>
            <div className='w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center'>
              <AlertCircle className='w-6 h-6' />
            </div>
            <h2 className='text-xl font-bold'>Confirmar Envio</h2>
          </div>
          <button
            onClick={onClose}
            className='p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors'
            aria-label='Fechar modal'
          >
            <X className='w-5 h-5 text-white' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          {/* Transaction Summary */}
          <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>De:</span>
              <span className='font-mono text-sm font-medium text-gray-900 dark:text-white'>
                {formatAddress(fromAddress)}
              </span>
            </div>

            <div className='flex items-center justify-center'>
              <ArrowRight className='w-5 h-5 text-gray-400' />
            </div>

            <div className='flex items-center justify-between'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>Para:</span>
              <span className='font-mono text-sm font-medium text-gray-900 dark:text-white'>
                {formatAddress(toAddress)}
              </span>
            </div>

            <div className='pt-4 border-t border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Valor:</span>
                <div className='flex items-center gap-2'>
                  <span className='text-2xl font-bold text-gray-900 dark:text-white'>{amount}</span>
                  <CryptoIcon symbol={symbol} size={28} />
                </div>
              </div>
            </div>

            <div className='flex items-center justify-between pt-2'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>Rede:</span>
              <span className='px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-400'>
                {network.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Fee Selection */}
          <div className='space-y-3'>
            <label className='block text-sm font-semibold text-gray-900 dark:text-white'>
              Velocidade da Transação
            </label>

            {/* Slow */}
            <button
              onClick={() => setSelectedFeeLevel('slow')}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                selectedFeeLevel === 'slow'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className='flex items-center gap-3'>
                <Clock className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                <div className='text-left'>
                  <p className='font-medium text-gray-900 dark:text-white'>Lento</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {getTimeEstimate('slow')}
                  </p>
                </div>
              </div>
              <div className='text-right'>
                <p className='font-semibold text-gray-900 dark:text-white'>
                  {getFeeForLevel('slow')} {feeEstimates?.currency}
                </p>
                <p className='text-xs text-green-600 dark:text-green-400'>Mais barato</p>
              </div>
            </button>

            {/* Standard */}
            <button
              onClick={() => setSelectedFeeLevel('standard')}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                selectedFeeLevel === 'standard'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className='flex items-center gap-3'>
                <CheckCircle className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                <div className='text-left'>
                  <p className='font-medium text-gray-900 dark:text-white'>Padrão</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {getTimeEstimate('standard')}
                  </p>
                </div>
              </div>
              <div className='text-right'>
                <p className='font-semibold text-gray-900 dark:text-white'>
                  {getFeeForLevel('standard')} {feeEstimates?.currency}
                </p>
                <p className='text-xs text-blue-600 dark:text-blue-400'>Recomendado ✓</p>
              </div>
            </button>

            {/* Fast */}
            <button
              onClick={() => setSelectedFeeLevel('fast')}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                selectedFeeLevel === 'fast'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className='flex items-center gap-3'>
                <DollarSign className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                <div className='text-left'>
                  <p className='font-medium text-gray-900 dark:text-white'>Rápido</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {getTimeEstimate('fast')}
                  </p>
                </div>
              </div>
              <div className='text-right'>
                <p className='font-semibold text-gray-900 dark:text-white'>
                  {getFeeForLevel('fast')} {feeEstimates?.currency}
                </p>
                <p className='text-xs text-orange-600 dark:text-orange-400'>Mais caro</p>
              </div>
            </button>
          </div>

          {/* Total */}
          <div className='bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm text-gray-700 dark:text-gray-300'>Valor:</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {amount} {symbol}
              </span>
            </div>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm text-gray-700 dark:text-gray-300'>Taxa:</span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {getFeeForLevel(selectedFeeLevel)} {feeEstimates?.currency}
              </span>
            </div>
            <div className='pt-2 border-t border-blue-200 dark:border-blue-800'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-gray-900 dark:text-white'>Total:</span>
                <span className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                  {(
                    parseFloat(amount) + parseFloat(String(getFeeForLevel(selectedFeeLevel)))
                  ).toFixed(6)}{' '}
                  {symbol}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
            <div className='flex items-start gap-3'>
              <AlertCircle className='w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5' />
              <div className='text-sm text-yellow-800 dark:text-yellow-200'>
                <p className='font-semibold mb-1'>Atenção!</p>
                <ul className='space-y-1 text-xs'>
                  <li>
                    • Esta operação é <strong>irreversível</strong>
                  </li>
                  <li>• Verifique o endereço de destino com atenção</li>
                  <li>• Confirme se a rede está correta</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 2FA Input - Only show if required */}
          {requires2FA && (
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
              <div className='flex items-center gap-2 mb-3'>
                <Shield className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                <h3 className='font-semibold text-blue-900 dark:text-blue-100'>
                  Autenticação de Segurança
                </h3>
              </div>

              {/* Auth Method Selection - Show if both options available */}
              {biometricAvailable && (
                <div className='flex gap-2 mb-4'>
                  <button
                    type='button'
                    onClick={() => setAuthMethod('biometric')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      authMethod === 'biometric'
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                    }`}
                  >
                    <Fingerprint className='w-4 h-4' />
                    <span className='text-sm font-medium'>Biometria</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => setAuthMethod('2fa')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      authMethod === '2fa'
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                    }`}
                  >
                    <Shield className='w-4 h-4' />
                    <span className='text-sm font-medium'>Código 2FA</span>
                  </button>
                </div>
              )}

              {/* Biometric Option */}
              {authMethod === 'biometric' && biometricAvailable ? (
                <div className='text-center py-4'>
                  <p className='text-sm text-blue-800 dark:text-blue-200 mb-3'>
                    Clique no botão "Confirmar Envio" para autenticar com biometria
                  </p>
                  <div className='flex items-center justify-center gap-2 text-green-600 dark:text-green-400'>
                    <Fingerprint className='w-5 h-5' />
                    <span className='text-sm font-medium'>Face ID / Touch ID disponível</span>
                  </div>
                </div>
              ) : (
                /* 2FA Code Input */
                <>
                  <p className='text-sm text-blue-800 dark:text-blue-200 mb-3'>
                    Digite o código de 6 dígitos do seu aplicativo autenticador:
                  </p>
                  <input
                    type='text'
                    value={twoFactorToken}
                    onChange={e => {
                      const value = e.target.value.replaceAll(/\D/g, '').slice(0, 6)
                      setTwoFactorToken(value)
                      setShow2FAError(false)
                    }}
                    placeholder='000000'
                    maxLength={6}
                    className={`w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 ${
                      show2FAError
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-blue-300 dark:border-blue-700'
                    } rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    autoFocus
                  />
                  {show2FAError && (
                    <p className='mt-2 text-sm text-red-600 dark:text-red-400'>
                      Por favor, digite o código de 6 dígitos para continuar
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className='flex gap-3'>
            <button
              onClick={onClose}
              disabled={isLoading}
              className='flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                console.log('[SendModal] Confirming with:', {
                  requires2FA,
                  authMethod,
                  biometricAvailable,
                  twoFactorToken,
                  tokenLength: twoFactorToken.length,
                })

                // If biometric is selected and available, use it
                if (requires2FA && authMethod === 'biometric' && biometricAvailable) {
                  try {
                    setShowBiometricModal(true)
                    const success = await webAuthnService.authenticate()
                    if (success) {
                      console.log('[SendModal] Biometric auth success')
                      onConfirm(selectedFeeLevel, 'biometric_verified')
                    } else {
                      console.error('[SendModal] Biometric auth failed')
                      setAuthMethod('2fa')
                    }
                  } catch (error) {
                    console.error('[SendModal] Biometric error:', error)
                    setAuthMethod('2fa')
                  } finally {
                    setShowBiometricModal(false)
                  }
                  return
                }

                // Validate 2FA token if required and using 2FA method
                if (requires2FA && authMethod === '2fa' && twoFactorToken.length !== 6) {
                  setShow2FAError(true)
                  return
                }

                onConfirm(selectedFeeLevel, requires2FA ? twoFactorToken : undefined)
              }}
              disabled={isLoading || showBiometricModal}
              className='flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2'
            >
              {isLoading || showBiometricModal ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  {showBiometricModal ? 'Autenticando...' : 'Enviando...'}
                </>
              ) : (
                <>
                  {authMethod === 'biometric' && biometricAvailable ? (
                    <Fingerprint className='w-5 h-5' />
                  ) : (
                    <CheckCircle className='w-5 h-5' />
                  )}
                  Confirmar Envio
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Biometric Confirmation Modal */}
      <BiometricConfirmation
        isOpen={showBiometricModal}
        onClose={() => {
          setShowBiometricModal(false)
          setAuthMethod('2fa')
        }}
        onSuccess={() => {
          setShowBiometricModal(false)
          onConfirm(selectedFeeLevel, 'biometric_verified')
        }}
        onFallback={() => {
          setShowBiometricModal(false)
          setAuthMethod('2fa')
        }}
        title='Confirmar Envio'
        description='Use sua biometria para autorizar esta transação'
        amount={`${amount} ${symbol}`}
        recipient={toAddress}
      />
    </div>
  )
}

export default SendConfirmationModal
