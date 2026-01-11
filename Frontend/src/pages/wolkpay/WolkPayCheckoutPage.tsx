/**
 * WolkPayCheckoutPage - Checkout Público para Pagador
 * ====================================================
 *
 * Página pública onde o pagador (terceiro) preenche seus dados,
 * aceita os termos e realiza o pagamento via PIX.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import {
  User,
  Building2,
  MapPin,
  FileText,
  CreditCard,
  Clock,
  Shield,
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  QrCode,
  Sparkles,
  Gift,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Wallet,
  TrendingUp,
  Zap,
  BadgeCheck,
} from 'lucide-react'
import wolkPayService, {
  CheckoutData,
  PayerPFData,
  PayerPJData,
  PayerAddressData,
  SavePayerDataRequest,
  PixPaymentResponse,
  ConversionEligibility,
  BenefitsInfo,
} from '@/services/wolkpay'

// Tipos de etapa
type CheckoutStep = 'loading' | 'form' | 'pix' | 'paid' | 'conversion' | 'error' | 'expired'

// Tipo de pessoa
type PersonType = 'PF' | 'PJ'

// Formatadores
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

const formatCpf = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

const formatCnpj = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .slice(0, 18)
}

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15)
}

const formatCep = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9)
}

const formatDate = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .slice(0, 10)
}

// Componente de Input
interface InputFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  icon?: React.ReactNode
  formatter?: (value: string) => string
  maxLength?: number
  required?: boolean
  error?: string
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  formatter,
  maxLength,
  required,
  error,
}) => (
  <div className='space-y-1.5'>
    <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
      {label} {required && <span className='text-red-500'>*</span>}
    </label>
    <div className='relative'>
      {icon && <div className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>{icon}</div>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(formatter ? formatter(e.target.value) : e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border ${
          error ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
        } text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all`}
      />
    </div>
    {error && <p className='text-xs text-red-500'>{error}</p>}
  </div>
)

export function WolkPayCheckoutPage() {
  const { t, i18n } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  // Estados
  const [step, setStep] = useState<CheckoutStep>('loading')
  const [checkout, setCheckout] = useState<CheckoutData | null>(null)
  const [personType, setPersonType] = useState<PersonType>('PF')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Timer
  const [timeLeft, setTimeLeft] = useState(0)

  // PIX
  const [pixData, setPixData] = useState<PixPaymentResponse | null>(null)
  const [copied, setCopied] = useState(false)

  // Conversão
  const [conversionEligibility, setConversionEligibility] = useState<ConversionEligibility | null>(
    null
  )
  const [benefitsInfo, setBenefitsInfo] = useState<BenefitsInfo | null>(null)
  const [showConversion, setShowConversion] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptAccountTerms, setAcceptAccountTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)

  // Dados PF
  const [pfData, setPfData] = useState<PayerPFData>({
    full_name: '',
    cpf: '',
    birth_date: '',
    phone: '',
    email: '',
  })

  // Dados PJ
  const [pjData, setPjData] = useState<PayerPJData>({
    company_name: '',
    cnpj: '',
    trade_name: '',
    state_registration: '',
    business_phone: '',
    business_email: '',
    responsible_name: '',
    responsible_cpf: '',
  })

  // Endereço
  const [address, setAddress] = useState<PayerAddressData>({
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  })

  // Carregar dados do checkout
  useEffect(() => {
    if (!token) {
      setStep('error')
      return
    }

    const loadCheckout = async () => {
      try {
        const data = await wolkPayService.getCheckoutData(token)
        setCheckout(data)

        if (data.is_expired) {
          setStep('expired')
        } else if (
          data.status === 'PAID' ||
          data.status === 'APPROVED' ||
          data.status === 'COMPLETED'
        ) {
          setStep('paid')
        } else if (data.status === 'AWAITING_PAYMENT') {
          // Já tem PIX, ir para passo do PIX
          setStep('pix')
        } else {
          setStep('form')
        }

        setTimeLeft(data.expires_in_seconds)
      } catch (err: any) {
        console.error('Error loading checkout:', err)
        if (err.response?.status === 404) {
          setStep('error')
        } else if (err.response?.data?.detail?.includes('expired')) {
          setStep('expired')
        } else {
          setStep('error')
        }
      }
    }

    loadCheckout()
  }, [token])

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStep('expired')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Polling de status quando aguardando pagamento
  useEffect(() => {
    if (step !== 'pix' || !token) return

    const pollStatus = async () => {
      try {
        const status = await wolkPayService.checkPaymentStatus(token)
        if (status.paid) {
          setStep('paid')
          // Verificar elegibilidade para conversão
          checkConversionEligibility()
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }

    const interval = setInterval(pollStatus, 5000) // Poll a cada 5s
    return () => clearInterval(interval)
  }, [step, token])

  // Verificar elegibilidade para conversão
  const checkConversionEligibility = async () => {
    if (!token) return

    try {
      const eligibility = await wolkPayService.checkConversionEligibility(token)
      setConversionEligibility(eligibility)

      if (eligibility.can_convert) {
        const benefits = await wolkPayService.getBenefitsInfo(token)
        setBenefitsInfo(benefits)
        setShowConversion(true)
      }
    } catch (err) {
      console.error('Error checking conversion:', err)
    }
  }

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Validação básica
  const validatePfData = () => {
    if (!pfData.full_name || pfData.full_name.trim().length < 5) return false
    if (!pfData.cpf || pfData.cpf.replace(/\D/g, '').length !== 11) return false
    if (!pfData.birth_date || pfData.birth_date.length !== 10) return false
    if (!pfData.phone || pfData.phone.replace(/\D/g, '').length < 10) return false
    if (!pfData.email || !pfData.email.includes('@')) return false
    return true
  }

  const validatePjData = () => {
    if (!pjData.company_name || pjData.company_name.trim().length < 5) return false
    if (!pjData.cnpj || pjData.cnpj.replace(/\D/g, '').length !== 14) return false
    if (!pjData.business_phone || pjData.business_phone.replace(/\D/g, '').length < 10) return false
    if (!pjData.business_email || !pjData.business_email.includes('@')) return false
    if (!pjData.responsible_name || pjData.responsible_name.trim().length < 5) return false
    if (!pjData.responsible_cpf || pjData.responsible_cpf.replace(/\D/g, '').length !== 11)
      return false
    return true
  }

  const validateAddress = () => {
    if (!address.zip_code || address.zip_code.replace(/\D/g, '').length !== 8) return false
    if (!address.street || address.street.trim().length < 3) return false
    if (!address.number) return false
    if (!address.neighborhood || address.neighborhood.trim().length < 2) return false
    if (!address.city || address.city.trim().length < 2) return false
    if (!address.state || address.state.length !== 2) return false
    return true
  }

  const canSubmitForm = () => {
    const personValid = personType === 'PF' ? validatePfData() : validatePjData()
    return personValid && validateAddress() && termsAccepted
  }

  // Submeter dados e gerar PIX
  const handleSubmitPayer = async () => {
    if (!token || !canSubmitForm()) return

    setIsLoading(true)
    setError(null)

    try {
      // Converter data de nascimento para formato ISO
      const formatBirthDateToIso = (dateStr: string) => {
        const [day, month, year] = dateStr.split('/')
        return `${year}-${month}-${day}`
      }

      // Build request without undefined values
      const baseRequest = {
        person_type: personType,
        address,
        terms_accepted: termsAccepted,
        terms_version: checkout?.terms_version || '1.0.0',
      }

      const request: SavePayerDataRequest =
        personType === 'PF'
          ? {
              ...baseRequest,
              pf_data: {
                ...pfData,
                birth_date: formatBirthDateToIso(pfData.birth_date),
              },
            }
          : {
              ...baseRequest,
              pj_data: pjData,
            }

      await wolkPayService.savePayerData(token, request)

      // Gerar PIX
      const pix = await wolkPayService.generatePix(token)
      setPixData(pix)
      setStep('pix')
    } catch (err: any) {
      console.error('Error submitting payer:', err)
      setError(err.response?.data?.detail || t('wolkpay.checkout.errors.submitFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  // Copiar PIX
  const handleCopyPix = async () => {
    if (!pixData?.pix_qrcode) return

    try {
      await navigator.clipboard.writeText(pixData.pix_qrcode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Verificar pagamento manualmente (botão "Já paguei")
  const handleCheckPayment = async () => {
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      const status = await wolkPayService.checkPaymentStatus(token)
      if (status.paid) {
        setStep('paid')
        // Verificar elegibilidade para conversão
        checkConversionEligibility()
      } else {
        // Pagamento ainda não detectado
        setError(t('wolkpay.checkout.paymentNotDetected'))
      }
    } catch (err: any) {
      console.error('Error checking payment:', err)
      setError(err.response?.data?.detail || t('wolkpay.checkout.errors.checkFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  // Criar conta
  const handleCreateAccount = async () => {
    if (
      !token ||
      !password ||
      password !== confirmPassword ||
      !acceptAccountTerms ||
      !acceptPrivacy
    ) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await wolkPayService.createAccountFromPayer(
        token,
        password,
        confirmPassword,
        acceptAccountTerms,
        acceptPrivacy,
        false
      )

      // Redirecionar para login
      navigate('/auth/login', {
        state: {
          message: t('wolkpay.checkout.accountCreated'),
          email: response.email,
        },
      })
    } catch (err: any) {
      console.error('Error creating account:', err)
      setError(err.response?.data?.detail || t('wolkpay.checkout.errors.accountFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  // Buscar CEP
  const handleCepSearch = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (!data.erro) {
        setAddress(prev => ({
          ...prev,
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        }))
      }
    } catch (err) {
      console.error('Error fetching CEP:', err)
    }
  }, [])

  // Renderizar estado de loading
  if (step === 'loading') {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4'>
        <div className='text-center'>
          <div className='w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full mx-auto relative'>
            <div className='w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0' />
          </div>
          <p className='mt-4 text-gray-600 dark:text-gray-400'>{t('wolkpay.checkout.loading')}</p>
        </div>
      </div>
    )
  }

  // Renderizar erro
  if (step === 'error') {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4'>
        <div className='bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center'>
          <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
            <AlertCircle className='w-8 h-8 text-red-500' />
          </div>
          <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>
            {t('wolkpay.checkout.error.title')}
          </h2>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            {t('wolkpay.checkout.error.description')}
          </p>
          <button
            onClick={() => navigate('/')}
            className='px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors'
          >
            {t('wolkpay.checkout.goHome')}
          </button>
        </div>
      </div>
    )
  }

  // Renderizar expirado
  if (step === 'expired') {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4'>
        <div className='bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center'>
          <div className='w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
            <Clock className='w-8 h-8 text-amber-500' />
          </div>
          <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>
            {t('wolkpay.checkout.expired.title')}
          </h2>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            {t('wolkpay.checkout.expired.description')}
          </p>
        </div>
      </div>
    )
  }

  // Renderizar pago + conversão
  if (step === 'paid') {
    return (
      <div
        key={i18n.language}
        className='fixed inset-0 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 pb-24'
      >
        <div className='max-w-lg mx-auto'>
          {/* Success */}
          <div className='bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white mb-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center'>
                <Check className='w-6 h-6' />
              </div>
              <div>
                <p className='text-green-100 text-sm'>{checkout?.invoice_number}</p>
                <h2 className='text-xl font-bold'>{t('wolkpay.checkout.paymentReceived')}</h2>
              </div>
            </div>
            <p className='text-green-100 text-sm'>
              {t('wolkpay.checkout.beneficiaryWillReceive', { name: checkout?.beneficiary_name })}
            </p>
          </div>

          {/* Conversion Offer */}
          {showConversion && conversionEligibility?.can_convert && benefitsInfo && (
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700'>
              <div className='text-center mb-6'>
                <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <Gift className='w-8 h-8 text-white' />
                </div>
                <h3 className='text-xl font-bold text-gray-900 dark:text-white'>
                  {benefitsInfo.headline}
                </h3>
                <p className='text-gray-600 dark:text-gray-400 mt-1'>{benefitsInfo.subheadline}</p>
              </div>

              {/* Benefits */}
              <div className='space-y-3 mb-6'>
                {benefitsInfo.benefits.map((benefit, index) => {
                  const IconComponent =
                    {
                      wallet: Wallet,
                      trending_up: TrendingUp,
                      zap: Zap,
                      shield: Shield,
                    }[benefit.icon] || BadgeCheck

                  return (
                    <div
                      key={index}
                      className='flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'
                    >
                      <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0'>
                        <IconComponent className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                      </div>
                      <div>
                        <p className='font-medium text-gray-900 dark:text-white'>{benefit.title}</p>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Create Account Form */}
              <div className='space-y-4'>
                <div className='space-y-3'>
                  <div className='relative'>
                    <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={t('wolkpay.checkout.password')}
                      className='w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'
                    >
                      {showPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
                    </button>
                  </div>
                  <div className='relative'>
                    <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder={t('wolkpay.checkout.confirmPassword')}
                      className='w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <label className='flex items-start gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={acceptAccountTerms}
                      onChange={e => setAcceptAccountTerms(e.target.checked)}
                      className='w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5'
                    />
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      {t('wolkpay.checkout.acceptTerms')}
                    </span>
                  </label>
                  <label className='flex items-start gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={acceptPrivacy}
                      onChange={e => setAcceptPrivacy(e.target.checked)}
                      className='w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5'
                    />
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      {t('wolkpay.checkout.acceptPrivacy')}
                    </span>
                  </label>
                </div>

                {error && (
                  <div className='p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2'>
                    <AlertCircle className='w-4 h-4' />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleCreateAccount}
                  disabled={
                    isLoading ||
                    !password ||
                    password !== confirmPassword ||
                    !acceptAccountTerms ||
                    !acceptPrivacy
                  }
                  className='w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isLoading ? (
                    <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  ) : (
                    <>
                      <UserPlus className='w-5 h-5' />
                      {benefitsInfo.cta_text}
                    </>
                  )}
                </button>

                <p className='text-xs text-center text-gray-500 dark:text-gray-400'>
                  {benefitsInfo.cta_subtitle}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Renderizar PIX
  if (step === 'pix' && pixData) {
    return (
      <div
        key={i18n.language}
        className='fixed inset-0 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 pb-24'
      >
        <div className='max-w-lg mx-auto'>
          {/* Header */}
          <div className='text-center mb-6'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-1'>
              {t('wolkpay.checkout.payWithPix')}
            </h1>
            <p className='text-sm text-gray-500 dark:text-gray-400'>{checkout?.invoice_number}</p>
          </div>

          {/* Timer */}
          <div
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full mb-6 ${
              timeLeft < 300
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
            }`}
          >
            <Clock className='w-4 h-4' />
            <span className='font-mono font-bold'>{formatTime(timeLeft)}</span>
          </div>

          {/* Amount Card */}
          <div className='bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white mb-6'>
            <p className='text-blue-100 text-sm mb-1'>{t('wolkpay.checkout.amountToPay')}</p>
            <p className='text-3xl font-bold'>{formatCurrency(pixData.amount_brl)}</p>
            <div className='mt-4 pt-4 border-t border-white/20'>
              <p className='text-sm text-blue-100'>{t('wolkpay.checkout.recipient')}</p>
              <p className='font-medium'>{pixData.recipient_name}</p>
              <p className='text-sm text-blue-200'>{pixData.recipient_document}</p>
            </div>
          </div>

          {/* QR Code */}
          {pixData.pix_qrcode_image && (
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 text-center'>
              <img
                src={`data:image/png;base64,${pixData.pix_qrcode_image}`}
                alt='QR Code PIX'
                className='w-48 h-48 mx-auto mb-4'
              />
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {t('wolkpay.checkout.scanQrCode')}
              </p>
            </div>
          )}

          {/* Copy Button */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 mb-6'>
            <p className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              {t('wolkpay.checkout.pixCopyPaste')}
            </p>
            <div className='flex gap-2'>
              <div className='flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 truncate font-mono'>
                {pixData.pix_qrcode.slice(0, 40)}...
              </div>
              <button
                onClick={handleCopyPix}
                className='px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-2'
              >
                {copied ? <Check className='w-5 h-5' /> : <Copy className='w-5 h-5' />}
                {copied ? t('wolkpay.checkout.copied') : t('wolkpay.checkout.copy')}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className='bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50 mb-6'>
            <p className='text-sm text-amber-800 dark:text-amber-300'>{pixData.instructions}</p>
          </div>

          {/* Já Paguei Button */}
          <button
            onClick={handleCheckPayment}
            disabled={isLoading}
            className='w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-green-500/25 disabled:opacity-50'
          >
            {isLoading ? (
              <>
                <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                {t('wolkpay.checkout.verifying')}
              </>
            ) : (
              <>
                <Check className='w-5 h-5' />
                {t('wolkpay.checkout.alreadyPaid')}
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className='mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400'>
              <AlertCircle className='w-5 h-5 shrink-0' />
              <span className='text-sm'>{error}</span>
            </div>
          )}

          {/* Info */}
          <p className='mt-4 text-center text-xs text-gray-500 dark:text-gray-400'>
            {t('wolkpay.checkout.paymentAutoDetect')}
          </p>
        </div>
      </div>
    )
  }

  // Renderizar formulário
  return (
    <div
      key={i18n.language}
      className='fixed inset-0 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 pb-24'
    >
      <div className='max-w-lg mx-auto'>
        {/* Header */}
        <div className='text-center mb-6'>
          <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3'>
            <CreditCard className='w-6 h-6 text-blue-600 dark:text-blue-400' />
          </div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-1'>WolkPay</h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{t('wolkpay.checkout.title')}</p>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full mb-6 ${
            timeLeft < 300
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
          }`}
        >
          <Clock className='w-4 h-4' />
          <span className='text-sm'>{t('wolkpay.checkout.expiresIn')}</span>
          <span className='font-mono font-bold'>{formatTime(timeLeft)}</span>
        </div>

        {/* Invoice Summary */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between mb-3'>
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              {t('wolkpay.checkout.invoice')}
            </span>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              {checkout?.invoice_number}
            </span>
          </div>
          <div className='flex items-center justify-between mb-3'>
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              {t('wolkpay.checkout.beneficiary')}
            </span>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium text-gray-900 dark:text-white'>
                {checkout?.beneficiary_name}
              </span>
              {checkout?.beneficiary_verified && <BadgeCheck className='w-4 h-4 text-blue-500' />}
            </div>
          </div>
          <div className='flex items-center justify-between mb-3'>
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              {t('wolkpay.checkout.crypto')}
            </span>
            <span className='text-sm font-medium text-gray-900 dark:text-white'>
              {checkout?.crypto_amount} {checkout?.crypto_currency}
            </span>
          </div>
          <div className='pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between'>
            <span className='font-medium text-gray-900 dark:text-white'>
              {t('wolkpay.checkout.totalToPay')}
            </span>
            <span className='text-xl font-bold text-blue-600 dark:text-blue-400'>
              {formatCurrency(checkout?.total_amount_brl || 0)}
            </span>
          </div>
        </div>

        {/* Person Type Toggle */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-200 dark:border-gray-700'>
          <p className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            {t('wolkpay.checkout.personType')}
          </p>
          <div className='grid grid-cols-2 gap-2'>
            <button
              onClick={() => setPersonType('PF')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                personType === 'PF'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-500'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-2 border-transparent'
              }`}
            >
              <User className='w-5 h-5' />
              {t('wolkpay.checkout.individual')}
            </button>
            <button
              onClick={() => setPersonType('PJ')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                personType === 'PJ'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-500'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-2 border-transparent'
              }`}
            >
              <Building2 className='w-5 h-5' />
              {t('wolkpay.checkout.company')}
            </button>
          </div>
        </div>

        {/* PF Form */}
        {personType === 'PF' && (
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-200 dark:border-gray-700 space-y-4'>
            <h3 className='font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <User className='w-5 h-5 text-blue-500' />
              {t('wolkpay.checkout.personalData')}
            </h3>

            <InputField
              label={t('wolkpay.checkout.fullName')}
              value={pfData.full_name}
              onChange={v => setPfData(p => ({ ...p, full_name: v }))}
              placeholder='Nome completo'
              required
            />

            <InputField
              label='CPF'
              value={pfData.cpf}
              onChange={v => setPfData(p => ({ ...p, cpf: v }))}
              placeholder='000.000.000-00'
              formatter={formatCpf}
              maxLength={14}
              required
            />

            <InputField
              label={t('wolkpay.checkout.birthDate')}
              value={pfData.birth_date}
              onChange={v => setPfData(p => ({ ...p, birth_date: v }))}
              placeholder='DD/MM/AAAA'
              icon={<Calendar className='w-5 h-5' />}
              formatter={formatDate}
              maxLength={10}
              required
            />

            <InputField
              label={t('wolkpay.checkout.phone')}
              value={pfData.phone}
              onChange={v => setPfData(p => ({ ...p, phone: v }))}
              placeholder='(00) 00000-0000'
              icon={<Phone className='w-5 h-5' />}
              formatter={formatPhone}
              maxLength={15}
              required
            />

            <InputField
              label={t('wolkpay.checkout.email')}
              value={pfData.email}
              onChange={v => setPfData(p => ({ ...p, email: v }))}
              placeholder='seu@email.com'
              type='email'
              icon={<Mail className='w-5 h-5' />}
              required
            />
          </div>
        )}

        {/* PJ Form */}
        {personType === 'PJ' && (
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-200 dark:border-gray-700 space-y-4'>
            <h3 className='font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <Building2 className='w-5 h-5 text-blue-500' />
              {t('wolkpay.checkout.companyData')}
            </h3>

            <InputField
              label={t('wolkpay.checkout.companyName')}
              value={pjData.company_name}
              onChange={v => setPjData(p => ({ ...p, company_name: v }))}
              placeholder='Razão Social'
              required
            />

            <InputField
              label='CNPJ'
              value={pjData.cnpj}
              onChange={v => setPjData(p => ({ ...p, cnpj: v }))}
              placeholder='00.000.000/0000-00'
              formatter={formatCnpj}
              maxLength={18}
              required
            />

            <InputField
              label={t('wolkpay.checkout.tradeName')}
              value={pjData.trade_name || ''}
              onChange={v => setPjData(p => ({ ...p, trade_name: v }))}
              placeholder='Nome Fantasia'
            />

            <InputField
              label={t('wolkpay.checkout.businessPhone')}
              value={pjData.business_phone}
              onChange={v => setPjData(p => ({ ...p, business_phone: v }))}
              placeholder='(00) 00000-0000'
              icon={<Phone className='w-5 h-5' />}
              formatter={formatPhone}
              maxLength={15}
              required
            />

            <InputField
              label={t('wolkpay.checkout.businessEmail')}
              value={pjData.business_email}
              onChange={v => setPjData(p => ({ ...p, business_email: v }))}
              placeholder='contato@empresa.com'
              type='email'
              icon={<Mail className='w-5 h-5' />}
              required
            />

            <div className='pt-4 border-t border-gray-200 dark:border-gray-700'>
              <p className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                {t('wolkpay.checkout.responsiblePerson')}
              </p>

              <div className='space-y-4'>
                <InputField
                  label={t('wolkpay.checkout.responsibleName')}
                  value={pjData.responsible_name}
                  onChange={v => setPjData(p => ({ ...p, responsible_name: v }))}
                  placeholder='Nome do responsável'
                  required
                />

                <InputField
                  label={t('wolkpay.checkout.responsibleCpf')}
                  value={pjData.responsible_cpf}
                  onChange={v => setPjData(p => ({ ...p, responsible_cpf: v }))}
                  placeholder='000.000.000-00'
                  formatter={formatCpf}
                  maxLength={14}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Address Form */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-200 dark:border-gray-700 space-y-4'>
          <h3 className='font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
            <MapPin className='w-5 h-5 text-blue-500' />
            {t('wolkpay.checkout.address')}
          </h3>

          <InputField
            label='CEP'
            value={address.zip_code}
            onChange={v => {
              const formatted = formatCep(v)
              setAddress(p => ({ ...p, zip_code: formatted }))
              if (formatted.replace(/\D/g, '').length === 8) {
                handleCepSearch(formatted)
              }
            }}
            placeholder='00000-000'
            formatter={formatCep}
            maxLength={9}
            required
          />

          <InputField
            label={t('wolkpay.checkout.street')}
            value={address.street}
            onChange={v => setAddress(p => ({ ...p, street: v }))}
            placeholder='Rua, Avenida...'
            required
          />

          <div className='grid grid-cols-3 gap-3'>
            <InputField
              label={t('wolkpay.checkout.number')}
              value={address.number}
              onChange={v => setAddress(p => ({ ...p, number: v }))}
              placeholder='Nº'
              required
            />
            <div className='col-span-2'>
              <InputField
                label={t('wolkpay.checkout.complement')}
                value={address.complement || ''}
                onChange={v => setAddress(p => ({ ...p, complement: v }))}
                placeholder='Apto, Sala...'
              />
            </div>
          </div>

          <InputField
            label={t('wolkpay.checkout.neighborhood')}
            value={address.neighborhood}
            onChange={v => setAddress(p => ({ ...p, neighborhood: v }))}
            placeholder='Bairro'
            required
          />

          <div className='grid grid-cols-3 gap-3'>
            <div className='col-span-2'>
              <InputField
                label={t('wolkpay.checkout.city')}
                value={address.city}
                onChange={v => setAddress(p => ({ ...p, city: v }))}
                placeholder='Cidade'
                required
              />
            </div>
            <InputField
              label={t('wolkpay.checkout.state')}
              value={address.state}
              onChange={v => setAddress(p => ({ ...p, state: v.toUpperCase() }))}
              placeholder='UF'
              maxLength={2}
              required
            />
          </div>
        </div>

        {/* Terms */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 mb-6 border border-gray-200 dark:border-gray-700'>
          <label className='flex items-start gap-3 cursor-pointer'>
            <input
              type='checkbox'
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className='w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5'
            />
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {t('wolkpay.checkout.termsText')}{' '}
                <a href='/terms' className='text-blue-600 hover:underline' target='_blank'>
                  {t('wolkpay.checkout.termsLink')}
                </a>{' '}
                {t('wolkpay.checkout.and')}{' '}
                <a href='/privacy' className='text-blue-600 hover:underline' target='_blank'>
                  {t('wolkpay.checkout.privacyLink')}
                </a>
              </p>
              <p className='text-xs text-gray-400 mt-1'>
                {t('wolkpay.checkout.termsVersion', { version: checkout?.terms_version })}
              </p>
            </div>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400'>
            <AlertCircle className='w-5 h-5 shrink-0' />
            <span className='text-sm'>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmitPayer}
          disabled={!canSubmitForm() || isLoading}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg transition-all ${
            canSubmitForm() && !isLoading
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              {t('wolkpay.checkout.processing')}
            </>
          ) : (
            <>
              <ChevronRight className='w-5 h-5' />
              {t('wolkpay.checkout.continue')}
            </>
          )}
        </button>

        {/* Security Badge */}
        <div className='mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
          <Shield className='w-4 h-4' />
          {t('wolkpay.checkout.securePayment')}
        </div>
      </div>
    </div>
  )
}

export default WolkPayCheckoutPage
