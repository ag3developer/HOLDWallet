/**
 * Transaction Validation Modal - Versão Simplificada
 * 
 * Modal que faz validações ANTES de pedir autenticação.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  X,
  CheckCircle,
  ArrowRight,
  Clock,
  DollarSign,
  Shield,
  Fingerprint,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { CryptoIcon } from '../CryptoIcon'
import { BiometricConfirmation } from '../security/BiometricConfirmation'
import { TransactionValidationTimeline } from './TransactionValidationTimeline'
import { webAuthnService } from '@/services/webauthn'
import type { EstimateFeeResponse } from '@/services/sendService'

interface ValidationData {
  addressValid: boolean
  balance: string
  gasEstimate: string
  totalRequired: string
  remainingAfter: string
  errorMessage?: string
  errorCode?: string
}

type FeeLevel = 'slow' | 'standard' | 'fast'
type ModalStep = 'validating' | 'authentication'
type AuthMethod = 'biometric' | '2fa'

interface Props {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onConfirm: (feeLevel: FeeLevel, twoFactorToken?: string | undefined) => void
  readonly walletId: string
  readonly fromAddress: string
  readonly toAddress: string
  readonly amount: string
  readonly symbol: string
  readonly network: string
  readonly tokenSymbol?: string | undefined
  readonly feeEstimates: EstimateFeeResponse | null
  readonly isLoading?: boolean | undefined
  readonly requires2FA?: boolean | undefined
  readonly hasBiometric?: boolean | undefined
}

const FEE_LABELS: Record<FeeLevel, string> = { slow: 'Lento', standard: 'Padrão', fast: 'Rápido' }
const FEE_DESCRIPTIONS: Record<FeeLevel, string> = { slow: 'Mais barato', standard: 'Recomendado', fast: 'Mais caro' }
const FEE_TIMES: Record<FeeLevel, string> = { slow: '10-30 min', standard: '2-10 min', fast: '< 2 min' }
const FEE_TEXT_CLASSES: Record<FeeLevel, string> = {
  slow: 'text-green-600 dark:text-green-400',
  standard: 'text-blue-600 dark:text-blue-400',
  fast: 'text-orange-600 dark:text-orange-400',
}

function formatAddress(addr: string): string {
  if (addr.length <= 13) return addr
  return `\${addr.slice(0, 6)}...\${addr.slice(-4)}`
}

function getHeaderClass(passed: boolean, error: string | null): string {
  if (passed) return 'bg-gradient-to-r from-green-500 to-emerald-600'
  if (error) return 'bg-gradient-to-r from-red-500 to-rose-600'
  return 'bg-gradient-to-r from-blue-500 to-indigo-600'
}

export function TransactionValidationModal(props: Props): React.ReactElement | null {
  const {
    isOpen, onClose, onConfirm, walletId, fromAddress, toAddress,
    amount, symbol, network, tokenSymbol, feeEstimates,
    isLoading = false, requires2FA = false, hasBiometric = false,
  } = props

  const [step, setStep] = useState<ModalStep>('validating')
  const [validationPassed, setValidationPassed] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [selectedFeeLevel, setSelectedFeeLevel] = useState<FeeLevel>('standard')
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [show2FAError, setShow2FAError] = useState(false)
  const [authMethod, setAuthMethod] = useState<AuthMethod>('biometric')
  const [showBiometricModal, setShowBiometricModal] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    const supported = webAuthnService.isSupported()
    setBiometricAvailable(supported && hasBiometric)
    if (!supported && requires2FA) setAuthMethod('2fa')
  }, [hasBiometric, requires2FA])

  useEffect(() => {
    if (isOpen) {
      setStep('validating')
      setValidationPassed(false)
      setValidationError(null)
      setTwoFactorToken('')
      setShow2FAError(false)
    }
  }, [isOpen])

  const handleValidationComplete = useCallback((isValid: boolean, _data: ValidationData | null) => {
    setValidationPassed(isValid)
    if (isValid) setTimeout(() => setStep('authentication'), 1000)
  }, [])

  const handleValidationError = useCallback((message: string) => {
    setValidationError(message)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (requires2FA && authMethod === 'biometric' && biometricAvailable) {
      try {
        setShowBiometricModal(true)
        const token = await webAuthnService.authenticate()
        if (token) { onConfirm(selectedFeeLevel, token); return }
        setAuthMethod('2fa')
      } catch { setAuthMethod('2fa') }
      finally { setShowBiometricModal(false) }
      return
    }
    if (requires2FA && authMethod === '2fa' && twoFactorToken.length !== 6) {
      setShow2FAError(true)
      return
    }
    onConfirm(selectedFeeLevel, requires2FA ? twoFactorToken : undefined)
  }, [requires2FA, authMethod, biometricAvailable, twoFactorToken, onConfirm, selectedFeeLevel])

  if (!isOpen) return null

  const getFee = (level: FeeLevel): string => {
    if (!feeEstimates) return '0'
    const key = `\${level}_fee` as keyof typeof feeEstimates.fee_estimates
    return feeEstimates.fee_estimates[key] || '0'
  }

  const renderHeaderIcon = (): React.ReactElement => {
    if (validationPassed) return <CheckCircle className='w-6 h-6' />
    if (validationError) return <AlertCircle className='w-6 h-6' />
    return <Loader2 className='w-6 h-6 animate-spin' />
  }

  const renderFeeIcon = (level: FeeLevel): React.ReactElement => {
    if (level === 'slow') return <Clock className='w-5 h-5 text-gray-600 dark:text-gray-400' />
    if (level === 'standard') return <CheckCircle className='w-5 h-5 text-blue-600 dark:text-blue-400' />
    return <DollarSign className='w-5 h-5 text-orange-600 dark:text-orange-400' />
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4'>
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto'>
        <div className={`rounded-t-2xl p-6 flex items-center justify-between \${getHeaderClass(validationPassed, validationError)}`}>
          <div className='flex items-center gap-3 text-white'>
            <div className='w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center'>
              {renderHeaderIcon()}
            </div>
            <h2 className='text-xl font-bold'>
              {step === 'validating' ? 'Verificando Transação' : 'Confirmar Envio'}
            </h2>
          </div>
          <button onClick={onClose} className='p-2 hover:bg-white hover:bg-opacity-20 rounded-lg' aria-label='Fechar'>
            <X className='w-5 h-5 text-white' />
          </button>
        </div>

        <div className='p-6 space-y-6'>
          <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>De:</span>
              <span className='font-mono text-sm font-medium text-gray-900 dark:text-white'>{formatAddress(fromAddress)}</span>
            </div>
            <div className='flex items-center justify-center'><ArrowRight className='w-5 h-5 text-gray-400' /></div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-gray-600 dark:text-gray-400'>Para:</span>
              <span className='font-mono text-sm font-medium text-gray-900 dark:text-white'>{formatAddress(toAddress)}</span>
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

          {step === 'validating' && (
            <TransactionValidationTimeline
              walletId={walletId} toAddress={toAddress} amount={amount} network={network}
              tokenSymbol={tokenSymbol} onValidationComplete={handleValidationComplete} onError={handleValidationError}
            />
          )}

          {step === 'authentication' && validationPassed && (
            <>
              <div className='space-y-3'>
                <p className='text-sm font-semibold text-gray-900 dark:text-white'>Velocidade da Transação</p>
                {(['slow', 'standard', 'fast'] as const).map((level) => (
                  <button key={level} type="button" onClick={() => setSelectedFeeLevel(level)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all \${
                      selectedFeeLevel === level ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                    <div className='flex items-center gap-3'>
                      {renderFeeIcon(level)}
                      <div className='text-left'>
                        <p className='font-medium text-gray-900 dark:text-white'>{FEE_LABELS[level]}</p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>{FEE_TIMES[level]}</p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='font-semibold text-gray-900 dark:text-white'>{getFee(level)} {feeEstimates?.currency}</p>
                      <p className={`text-xs \${FEE_TEXT_CLASSES[level]}`}>{FEE_DESCRIPTIONS[level]}</p>
                    </div>
                  </button>
                ))}
              </div>

              {requires2FA && (
                <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
                  <div className='flex items-center gap-2 mb-3'>
                    <Shield className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                    <h3 className='font-semibold text-blue-900 dark:text-blue-100'>Autenticação</h3>
                  </div>
                  {biometricAvailable && (
                    <div className='flex gap-2 mb-4'>
                      <button type='button' onClick={() => setAuthMethod('biometric')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 \${authMethod === 'biometric' ? 'border-blue-500 bg-blue-100' : 'border-gray-300'}`}>
                        <Fingerprint className='w-4 h-4' /><span className='text-sm font-medium'>Biometria</span>
                      </button>
                      <button type='button' onClick={() => setAuthMethod('2fa')}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 \${authMethod === '2fa' ? 'border-blue-500 bg-blue-100' : 'border-gray-300'}`}>
                        <Shield className='w-4 h-4' /><span className='text-sm font-medium'>2FA</span>
                      </button>
                    </div>
                  )}
                  {authMethod === 'biometric' && biometricAvailable ? (
                    <div className='text-center py-4'>
                      <p className='text-sm text-blue-800 dark:text-blue-200 mb-3'>Clique em "Confirmar Envio" para autenticar</p>
                      <div className='flex items-center justify-center gap-2 text-green-600'>
                        <Fingerprint className='w-5 h-5' /><span className='text-sm font-medium'>Face ID / Touch ID</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className='text-sm text-blue-800 dark:text-blue-200 mb-3'>Digite o código de 6 dígitos:</p>
                      <input type='text' value={twoFactorToken}
                        onChange={e => { setTwoFactorToken(e.target.value.replaceAll(/\D/g, '').slice(0, 6)); setShow2FAError(false) }}
                        placeholder='000000' maxLength={6}
                        className={`w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 \${show2FAError ? 'border-red-500' : 'border-blue-300'} rounded-lg bg-white dark:bg-gray-800`}
                      />
                      {show2FAError && <p className='mt-2 text-sm text-red-600'>Digite o código de 6 dígitos</p>}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <div className='flex gap-3'>
            <button onClick={onClose} disabled={isLoading}
              className='flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50'>
              {validationError ? 'Fechar' : 'Cancelar'}
            </button>
            {step === 'authentication' && validationPassed && (
              <button onClick={handleConfirm} disabled={isLoading || showBiometricModal}
                className='flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2'>
                {isLoading || showBiometricModal ? (
                  <><Loader2 className='w-4 h-4 animate-spin' />{showBiometricModal ? 'Autenticando...' : 'Enviando...'}</>
                ) : (
                  <>{authMethod === 'biometric' && biometricAvailable ? <Fingerprint className='w-5 h-5' /> : <CheckCircle className='w-5 h-5' />}Confirmar Envio</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <BiometricConfirmation isOpen={showBiometricModal}
        onClose={() => { setShowBiometricModal(false); setAuthMethod('2fa') }}
        onSuccess={token => { setShowBiometricModal(false); onConfirm(selectedFeeLevel, token || 'biometric_verified') }}
        onFallback={() => { setShowBiometricModal(false); setAuthMethod('2fa') }}
        title='Confirmar Envio' description='Use sua biometria' amount={`\${amount} \${symbol}`} recipient={toAddress}
      />
    </div>
  )
}

export default TransactionValidationModal
