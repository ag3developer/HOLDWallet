/**
 * WolkPay Gateway - Página de Registro de Merchant
 * Onboarding para novos merchants
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Mail,
  Phone,
  Globe,
  FileText,
  ArrowRight,
  CheckCircle,
  Loader2,
  Shield,
  Zap,
  CreditCard,
  Wallet,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { registerMerchant, type RegisterMerchantRequest } from '../../../services/gatewayService'
import { useAuthStore } from '../../../stores/useAuthStore'

export default function GatewayRegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { initializeAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  // Form fields
  const [businessName, setBusinessName] = useState('')
  const [businessDocument, setBusinessDocument] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 14) {
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }
    return value
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
    }
    return value
  }

  const handleSubmit = async () => {
    if (!acceptTerms) {
      setError(t('gateway.portal.register.termsRequired'))
      return
    }

    if (password.length < 8) {
      setError(t('gateway.portal.register.passwordTooShort'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('gateway.portal.register.passwordMismatch'))
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data: RegisterMerchantRequest = {
        business_name: businessName,
        business_document: businessDocument.replace(/\D/g, ''),
        business_email: businessEmail,
        password: password,
        business_phone: businessPhone.replace(/\D/g, '') || undefined,
        website_url: websiteUrl || undefined,
      }

      await registerMerchant(data)

      // Atualizar estado de autenticação (o token já foi salvo no localStorage pelo service)
      await initializeAuth()

      // Sucesso - redirecionar para dashboard
      navigate('/dashboard')
    } catch (err: unknown) {
      console.error('Erro ao registrar:', err)
      if (err instanceof Error) {
        setError(err.message || t('gateway.portal.register.createError'))
      } else {
        setError(t('gateway.portal.register.createError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const isStep1Valid = businessName.length >= 3 && businessDocument.replace(/\D/g, '').length >= 11
  const isStep2Valid =
    businessEmail.includes('@') &&
    businessEmail.includes('.') &&
    password.length >= 8 &&
    password === confirmPassword

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900'>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

      <div className='relative min-h-screen flex'>
        {/* Left Side - Benefits */}
        <div className='hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20'>
          <div className='max-w-lg'>
            <h1 className='text-4xl xl:text-5xl font-bold text-white mb-6'>WolkPay Gateway</h1>
            <p className='text-xl text-indigo-200 mb-12'>
              {t('gateway.portal.register.heroSubtitle')}
            </p>

            <div className='space-y-6'>
              <div className='flex items-start gap-4'>
                <div className='p-3 bg-indigo-500/20 rounded-xl'>
                  <Zap className='w-6 h-6 text-indigo-400' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold text-white'>{t('gateway.portal.register.benefitIntegrationTitle')}</h3>
                  <p className='text-indigo-200/80'>
                    {t('gateway.portal.register.benefitIntegrationDesc')}
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-4'>
                <div className='p-3 bg-emerald-500/20 rounded-xl'>
                  <CreditCard className='w-6 h-6 text-emerald-400' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold text-white'>{t('gateway.portal.register.benefitPixTitle')}</h3>
                  <p className='text-indigo-200/80'>
                    {t('gateway.portal.register.benefitPixDesc')}
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-4'>
                <div className='p-3 bg-purple-500/20 rounded-xl'>
                  <Wallet className='w-6 h-6 text-purple-400' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold text-white'>{t('gateway.portal.register.benefitCryptoTitle')}</h3>
                  <p className='text-indigo-200/80'>
                    {t('gateway.portal.register.benefitCryptoDesc')}
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-4'>
                <div className='p-3 bg-amber-500/20 rounded-xl'>
                  <Shield className='w-6 h-6 text-amber-400' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold text-white'>{t('gateway.portal.register.benefitSecurityTitle')}</h3>
                  <p className='text-indigo-200/80'>
                    {t('gateway.portal.register.benefitSecurityDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className='w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12'>
          <div className='w-full max-w-md'>
            {/* Mobile Header */}
            <div className='lg:hidden text-center mb-8'>
              <h1 className='text-2xl font-bold text-white mb-2'>WolkPay Gateway</h1>
              <p className='text-indigo-200'>{t('gateway.portal.register.mobileSubtitle')}</p>
            </div>

            {/* Progress Steps */}
            <div className='flex items-center justify-center gap-4 mb-8'>
              {[1, 2, 3].map(s => (
                <div key={s} className='flex items-center gap-2'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step > s
                        ? 'bg-emerald-500 text-white'
                        : step === s
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {step > s ? <CheckCircle className='w-5 h-5' /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-12 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-white/20'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Form Card */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8'>
              {/* Step 1: Business Info */}
              {step === 1 && (
                <div className='space-y-6'>
                  <div className='text-center mb-6'>
                    <Building2 className='w-12 h-12 text-indigo-600 mx-auto mb-3' />
                    <h2 className='text-xl font-semibold text-slate-900 dark:text-white'>
                      {t('gateway.portal.register.step1Title')}
                    </h2>
                    <p className='text-sm text-slate-500 dark:text-slate-400'>
                      {t('gateway.portal.register.step1Desc')}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor='business-name'
                      className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                    >
                      {t('gateway.portal.register.businessName')}
                    </label>
                    <div className='relative'>
                      <Building2 className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                      <input
                        id='business-name'
                        type='text'
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder={t('gateway.portal.register.businessNamePlaceholder')}
                        className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='business-document'
                      className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                    >
                      {t('gateway.portal.register.document')}
                    </label>
                    <div className='relative'>
                      <FileText className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                      <input
                        id='business-document'
                        type='text'
                        value={businessDocument}
                        onChange={e => setBusinessDocument(formatCNPJ(e.target.value))}
                        placeholder='00.000.000/0000-00'
                        maxLength={18}
                        className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className='w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
                  >
                    {t('gateway.portal.register.continue')}
                    <ArrowRight className='w-5 h-5' />
                  </button>
                </div>
              )}

              {/* Step 2: Contact Info */}
              {step === 2 && (
                <div className='space-y-6'>
                  <div className='text-center mb-6'>
                    <Mail className='w-12 h-12 text-indigo-600 mx-auto mb-3' />
                    <h2 className='text-xl font-semibold text-slate-900 dark:text-white'>
                      {t('gateway.portal.register.step2Title')}
                    </h2>
                    <p className='text-sm text-slate-500 dark:text-slate-400'>
                      {t('gateway.portal.register.step2Desc')}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor='business-email'
                      className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                    >
                      {t('gateway.portal.register.businessEmail')}
                    </label>
                    <div className='relative'>
                      <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                      <input
                        id='business-email'
                        type='email'
                        value={businessEmail}
                        onChange={e => setBusinessEmail(e.target.value)}
                        placeholder={t('gateway.portal.register.businessEmailPlaceholder')}
                        className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='business-phone'
                      className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                    >
                      {t('gateway.portal.register.phoneOptional')}
                    </label>
                    <div className='relative'>
                      <Phone className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                      <input
                        id='business-phone'
                        type='tel'
                        value={businessPhone}
                        onChange={e => setBusinessPhone(formatPhone(e.target.value))}
                        placeholder='(11) 99999-9999'
                        maxLength={15}
                        className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='website-url'
                      className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                    >
                      {t('gateway.portal.register.websiteOptional')}
                    </label>
                    <div className='relative'>
                      <Globe className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                      <input
                        id='website-url'
                        type='url'
                        value={websiteUrl}
                        onChange={e => setWebsiteUrl(e.target.value)}
                        placeholder='https://www.empresa.com'
                        className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      />
                    </div>
                  </div>

                  {/* Password Fields */}
                  <div>
                    <label
                      htmlFor='password'
                      className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                    >
                      {t('gateway.portal.register.password')}
                    </label>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                      <input
                        id='password'
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={t('gateway.portal.register.passwordPlaceholder')}
                        className='w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      />
                      <button
                        type='button'
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('gateway.portal.register.hidePassword') : t('gateway.portal.register.showPassword')}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600'
                      >
                        {showPassword ? (
                          <EyeOff className='w-5 h-5' />
                        ) : (
                          <Eye className='w-5 h-5' />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor='confirm-password'
                      className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                    >
                      {t('gateway.portal.register.confirmPassword')}
                    </label>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                      <input
                        id='confirm-password'
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder={t('gateway.portal.register.confirmPasswordPlaceholder')}
                        className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className='mt-1 text-sm text-red-500'>{t('gateway.portal.register.passwordMismatch')}</p>
                    )}
                  </div>

                  <div className='flex gap-3'>
                    <button
                      onClick={() => setStep(1)}
                      className='flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors'
                    >
                      {t('gateway.portal.register.back')}
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!isStep2Valid}
                      className='flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
                    >
                      {t('gateway.portal.register.continue')}
                      <ArrowRight className='w-5 h-5' />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Terms & Submit */}
              {step === 3 && (
                <div className='space-y-6'>
                  <div className='text-center mb-6'>
                    <CheckCircle className='w-12 h-12 text-emerald-600 mx-auto mb-3' />
                    <h2 className='text-xl font-semibold text-slate-900 dark:text-white'>
                      {t('gateway.portal.register.step3Title')}
                    </h2>
                    <p className='text-sm text-slate-500 dark:text-slate-400'>
                      {t('gateway.portal.register.step3Desc')}
                    </p>
                  </div>

                  {/* Summary */}
                  <div className='bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-slate-500 dark:text-slate-400'>{t('gateway.portal.register.summaryCompany')}</span>
                      <span className='text-slate-900 dark:text-white font-medium'>
                        {businessName}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-slate-500 dark:text-slate-400'>{t('gateway.portal.register.summaryDocument')}</span>
                      <span className='text-slate-900 dark:text-white font-mono'>
                        {businessDocument}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-slate-500 dark:text-slate-400'>{t('gateway.portal.register.summaryEmail')}</span>
                      <span className='text-slate-900 dark:text-white'>{businessEmail}</span>
                    </div>
                    {businessPhone && (
                      <div className='flex justify-between text-sm'>
                        <span className='text-slate-500 dark:text-slate-400'>{t('gateway.portal.register.summaryPhone')}</span>
                        <span className='text-slate-900 dark:text-white'>{businessPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Terms */}
                  <label className='flex items-start gap-3 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={acceptTerms}
                      onChange={e => setAcceptTerms(e.target.checked)}
                      className='mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'
                    />
                    <span className='text-sm text-slate-600 dark:text-slate-400'>
                      {t('gateway.portal.register.termsPrefix')}{' '}
                      <a href='/terms' target='_blank' rel='noopener noreferrer' className='text-indigo-600 hover:underline'>
                        {t('gateway.portal.register.termsOfUse')}
                      </a>{' '}
                      {t('gateway.portal.register.termsAnd')}{' '}
                      <a href='/privacy' target='_blank' rel='noopener noreferrer' className='text-indigo-600 hover:underline'>
                        {t('gateway.portal.register.privacyPolicy')}
                      </a>{' '}
                      {t('gateway.portal.register.termsSuffix')}
                    </span>
                  </label>

                  {error && (
                    <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm'>
                      {error}
                    </div>
                  )}

                  <div className='flex gap-3'>
                    <button
                      onClick={() => setStep(2)}
                      disabled={loading}
                      className='flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50'
                    >
                      {t('gateway.portal.register.back')}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading || !acceptTerms}
                      className='flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
                    >
                      {loading ? (
                        <>
                          <Loader2 className='w-5 h-5 animate-spin' />
                          {t('gateway.portal.register.creating')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className='w-5 h-5' />
                          {t('gateway.portal.register.createAccount')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <p className='text-center text-sm text-indigo-200/60 mt-6'>
              {t('gateway.portal.register.haveAccount')}{' '}
              <Link to='/login' className='text-indigo-300 hover:underline'>
                {t('gateway.portal.register.signIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
