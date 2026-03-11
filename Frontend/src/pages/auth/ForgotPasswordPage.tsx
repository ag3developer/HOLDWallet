import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForgotPassword, useResetPassword } from '@/hooks/useAuth'
import { SEOHead } from '@/components/seo/SEOHead'
import {
  Eye,
  EyeOff,
  Mail,
  CheckCircle,
  ArrowLeft,
  Lock,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { FiShield } from 'react-icons/fi'

interface ForgotPasswordForm {
  email: string
}

interface ResetPasswordForm {
  token: string
  newPassword: string
  confirmPassword: string
}

export const ForgotPasswordPage = () => {
  const { t } = useTranslation()
  const forgotPasswordMutation = useForgotPassword()
  const resetPasswordMutation = useResetPassword()

  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request')
  const [formData, setFormData] = useState<ForgotPasswordForm>({
    email: '',
  })

  const [resetData, setResetData] = useState<ResetPasswordForm>({
    token: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Get token from URL if present
  const urlParams = new URLSearchParams(window.location.search)
  const tokenFromUrl = urlParams.get('token')

  // If token is in URL, switch to reset step
  useState(() => {
    if (tokenFromUrl) {
      setResetData(prev => ({ ...prev, token: tokenFromUrl }))
      setStep('reset')
    }
  })

  // Validation functions
  const validateEmail = (email: string): string => {
    if (!email) return t('validation.emailRequired', 'E-mail é obrigatório')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return t('validation.emailInvalid', 'E-mail inválido')
    }
    return ''
  }

  const validatePassword = (password: string): string => {
    if (!password) return t('validation.passwordRequired', 'Senha é obrigatória')
    if (password.length < 8) {
      return t('validation.passwordTooShort', 'Senha deve ter pelo menos 8 caracteres')
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return t('validation.passwordWeak', 'Senha deve conter maiúscula, minúscula e número')
    }
    return ''
  }

  const validateForgotPasswordForm = (): boolean => {
    const errors: Record<string, string> = {}

    errors.email = validateEmail(formData.email)

    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key]
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateResetPasswordForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!resetData.token) {
      errors.token = t('validation.tokenRequired', 'Token de recuperação é obrigatório')
    }

    errors.newPassword = validatePassword(resetData.newPassword)

    if (!resetData.confirmPassword) {
      errors.confirmPassword = t(
        'validation.confirmPasswordRequired',
        'Confirmação de senha é obrigatória'
      )
    } else if (resetData.newPassword !== resetData.confirmPassword) {
      errors.confirmPassword = t('validation.passwordMismatch', 'Senhas não coincidem')
    }

    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key]
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForgotPasswordForm()) return

    try {
      await forgotPasswordMutation.mutateAsync(formData.email)
      setStep('success')
    } catch (error: any) {
      setFormErrors({
        email:
          error.message || t('auth.recoveryEmailError', 'Erro ao enviar e-mail de recuperação'),
      })
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateResetPasswordForm()) return

    try {
      await resetPasswordMutation.mutateAsync({
        token: resetData.token,
        newPassword: resetData.newPassword,
      })
      setStep('success')
    } catch (error: any) {
      setFormErrors({
        token: error.message || t('auth.tokenInvalidOrExpired', 'Token inválido ou expirado'),
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setResetData(prev => ({ ...prev, [name]: value }))

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const isLoading = forgotPasswordMutation.isPending || resetPasswordMutation.isPending

  // Password strength calculator
  const getPasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    return strength
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex flex-col'>
      {/* SEO Meta Tags */}
      <SEOHead
        title={t('seo.forgotPasswordTitle', 'Reset Password - WOLK NOW®')}
        description={t(
          'seo.forgotPasswordDescription',
          'Recover access to your WOLK NOW® digital wallet. Fast and secure password reset process.'
        )}
        path='/forgot-password'
      />

      {/* Background Effects */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse' />
        <div
          className='absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse'
          style={{ animationDelay: '1s' }}
        />
        <div className='absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl' />
        <div className='absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl' />

        {/* Grid */}
        <svg className='absolute inset-0 w-full h-full opacity-[0.07]'>
          <defs>
            <pattern id='grid-fp' width='50' height='50' patternUnits='userSpaceOnUse'>
              <path
                d='M 50 0 L 0 0 0 50'
                fill='none'
                stroke='rgba(139, 92, 246, 0.4)'
                strokeWidth='0.5'
              />
            </pattern>
          </defs>
          <rect width='100%' height='100%' fill='url(#grid-fp)' />
        </svg>

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={`p-${i}`}
            className='absolute w-1 h-1 bg-purple-400/40 rounded-full'
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationName: 'twinkle',
              animationDuration: `${2 + Math.random() * 3}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
          50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.2); }
        }
        @keyframes successPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes checkDraw {
          0% { stroke-dashoffset: 50; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>

      {/* Header */}
      <header className='relative z-10 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center'>
        <Link to='/login' className='flex items-center gap-2 md:gap-3 group'>
          <div className='w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center p-2 border border-white/20 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/20'>
            <img
              src='/images/logos/wn-icon.png'
              alt='WOLK NOW Logo'
              className='w-full h-full object-contain'
            />
          </div>
          <div>
            <h1 className='text-lg md:text-2xl font-bold text-white tracking-tight'>
              WOLK NOW<sup className='text-xs ml-0.5 -top-1 relative'>®</sup>
            </h1>
            <p className='text-[10px] md:text-xs text-purple-300 font-medium'>
              {t('landing.slogan', 'Smart & Secure Wallet')}
            </p>
          </div>
        </Link>
        <Link
          to='/login'
          className='flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-400/60 rounded-full transition-all hover:scale-105 hover:bg-white/5'
        >
          <ArrowLeft className='w-4 h-4' />
          <span className='hidden sm:inline'>{t('auth.backToLogin', 'Voltar ao Login')}</span>
          <span className='sm:hidden'>Login</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className='relative z-10 flex-1 flex items-center justify-center px-4 py-8 md:py-12'>
        <div className='w-full max-w-md' style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          {/* ============ STEP: REQUEST ============ */}
          {step === 'request' && (
            <div className='bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 md:p-8 relative overflow-hidden group'>
              {/* Background glow on hover */}
              <div className='absolute inset-0 bg-gradient-to-br from-purple-500/0 via-pink-500/0 to-blue-500/0 group-hover:from-purple-500/5 group-hover:via-pink-500/5 group-hover:to-blue-500/5 transition-all duration-500' />
              <div className='absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-15 blur-xl transition-opacity duration-500' />

              <div className='relative'>
                {/* Icon */}
                <div className='text-center mb-6 md:mb-8'>
                  <div
                    className='mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20'
                    style={{ animation: 'glow 2.5s ease-in-out infinite' }}
                  >
                    <Mail className='w-8 h-8 md:w-10 md:h-10 text-purple-300' strokeWidth={1.5} />
                  </div>
                  <h2 className='text-xl md:text-2xl font-bold text-white mb-1.5'>
                    {t('auth.forgotPassword', 'Recuperar Senha')}
                  </h2>
                  <p className='text-sm text-gray-400 leading-relaxed'>
                    {t(
                      'auth.forgotPasswordDesc',
                      'Digite seu e-mail e enviaremos instruções para redefinir sua senha.'
                    )}
                  </p>
                </div>

                {/* Error */}
                {formErrors.email && (
                  <div className='mb-5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 backdrop-blur-sm'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 text-red-400 flex-shrink-0' />
                      <p className='text-sm text-red-400'>{formErrors.email}</p>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleForgotPasswordSubmit} className='space-y-5'>
                  <div>
                    <label
                      htmlFor='email'
                      className='block text-sm font-medium text-gray-300 mb-1.5'
                    >
                      {t('auth.email', 'E-mail')}
                    </label>
                    <div className='relative'>
                      <input
                        id='email'
                        name='email'
                        type='email'
                        autoComplete='email'
                        required
                        autoFocus
                        className={`w-full pl-11 pr-4 py-3 text-sm bg-white/5 border ${
                          formErrors.email ? 'border-red-500/50' : 'border-white/10'
                        } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all`}
                        placeholder='you@example.com'
                        value={formData.email}
                        onChange={handleChange}
                      />
                      <Mail className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                    </div>
                  </div>

                  <button
                    type='submit'
                    disabled={isLoading}
                    className='w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn'
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className='w-4 h-4 animate-spin' />
                        <span>{t('common.sending', 'Enviando...')}</span>
                      </>
                    ) : (
                      <>
                        <Mail className='w-4 h-4 group-hover/btn:scale-110 transition-transform' />
                        <span>{t('auth.sendRecoveryEmail', 'Enviar E-mail de Recuperação')}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className='relative my-6'>
                  <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t border-white/10' />
                  </div>
                </div>

                {/* Back to login */}
                <div className='text-center'>
                  <Link
                    to='/login'
                    className='inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors group/link'
                  >
                    <ArrowLeft className='w-3.5 h-3.5 group-hover/link:-translate-x-1 transition-transform' />
                    {t('auth.backToLogin', 'Voltar ao login')}
                  </Link>
                </div>

                {/* Security note */}
                <div className='mt-6 flex items-center gap-2 px-3 py-2.5 bg-purple-500/5 border border-purple-500/10 rounded-lg'>
                  <FiShield className='w-4 h-4 text-purple-400 flex-shrink-0' />
                  <p className='text-xs text-gray-500 leading-relaxed'>
                    {t(
                      'auth.recoverySecurityNote',
                      'O link de recuperação expira em 30 minutos. Verifique também a pasta de spam.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============ STEP: RESET ============ */}
          {step === 'reset' && (
            <div className='bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 md:p-8 relative overflow-hidden group'>
              <div className='absolute inset-0 bg-gradient-to-br from-purple-500/0 via-pink-500/0 to-blue-500/0 group-hover:from-purple-500/5 group-hover:via-pink-500/5 group-hover:to-blue-500/5 transition-all duration-500' />
              <div className='absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-15 blur-xl transition-opacity duration-500' />

              <div className='relative'>
                {/* Icon */}
                <div className='text-center mb-6 md:mb-8'>
                  <div
                    className='mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border-2 border-amber-500/30 shadow-2xl shadow-amber-500/20'
                    style={{ animation: 'glow 2.5s ease-in-out infinite' }}
                  >
                    <Lock className='w-8 h-8 md:w-10 md:h-10 text-amber-300' strokeWidth={1.5} />
                  </div>
                  <h2 className='text-xl md:text-2xl font-bold text-white mb-1.5'>
                    {t('auth.resetPassword', 'Redefinir Senha')}
                  </h2>
                  <p className='text-sm text-gray-400 leading-relaxed'>
                    {t('auth.resetPasswordDesc', 'Crie uma nova senha segura para sua conta.')}
                  </p>
                </div>

                {/* Error */}
                {(formErrors.token || formErrors.newPassword || formErrors.confirmPassword) && (
                  <div className='mb-5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 backdrop-blur-sm'>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='w-4 h-4 text-red-400 flex-shrink-0' />
                      <p className='text-sm text-red-400'>
                        {formErrors.token || formErrors.newPassword || formErrors.confirmPassword}
                      </p>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleResetPasswordSubmit} className='space-y-4'>
                  {/* Token Field */}
                  {!tokenFromUrl && (
                    <div>
                      <label
                        htmlFor='token'
                        className='block text-sm font-medium text-gray-300 mb-1.5'
                      >
                        {t('auth.recoveryToken', 'Token de Recuperação')}
                      </label>
                      <div className='relative'>
                        <input
                          id='token'
                          name='token'
                          type='text'
                          required
                          autoFocus
                          className='w-full pl-11 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-mono tracking-wider'
                          placeholder={t('auth.tokenPlaceholder', 'Token do e-mail')}
                          value={resetData.token}
                          onChange={handleResetChange}
                        />
                        <KeyRound className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                      </div>
                      <p className='mt-1.5 text-xs text-gray-500 flex items-center gap-1'>
                        <Mail className='w-3 h-3' />
                        {t(
                          'auth.checkEmailToken',
                          'Verifique seu e-mail pelo token de recuperação'
                        )}
                      </p>
                    </div>
                  )}

                  {/* New Password */}
                  <div>
                    <label
                      htmlFor='newPassword'
                      className='block text-sm font-medium text-gray-300 mb-1.5'
                    >
                      {t('auth.newPassword', 'Nova Senha')}
                    </label>
                    <div className='relative'>
                      <input
                        id='newPassword'
                        name='newPassword'
                        type={showPassword ? 'text' : 'password'}
                        required
                        className='w-full pl-11 pr-12 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all'
                        placeholder='••••••••'
                        value={resetData.newPassword}
                        onChange={handleResetChange}
                      />
                      <Lock className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                      <button
                        type='button'
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors'
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword
                            ? t('auth.hidePassword', 'Ocultar senha')
                            : t('auth.showPassword', 'Mostrar senha')
                        }
                      >
                        {showPassword ? (
                          <EyeOff className='w-4 h-4' />
                        ) : (
                          <Eye className='w-4 h-4' />
                        )}
                      </button>
                    </div>

                    {/* Password strength indicator */}
                    {resetData.newPassword && (
                      <div className='mt-2 space-y-1.5'>
                        <div className='flex gap-1'>
                          {[1, 2, 3, 4].map(level => {
                            const strength = getPasswordStrength(resetData.newPassword)
                            return (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                  level <= strength
                                    ? strength <= 1
                                      ? 'bg-red-500'
                                      : strength <= 2
                                        ? 'bg-orange-500'
                                        : strength <= 3
                                          ? 'bg-yellow-500'
                                          : 'bg-green-500'
                                    : 'bg-white/10'
                                }`}
                              />
                            )
                          })}
                        </div>
                        <p className='text-xs text-gray-500'>
                          {t(
                            'auth.passwordRequirements',
                            'Mínimo 8 caracteres com maiúscula, minúscula e número'
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor='confirmPassword'
                      className='block text-sm font-medium text-gray-300 mb-1.5'
                    >
                      {t('auth.confirmNewPassword', 'Confirmar Nova Senha')}
                    </label>
                    <div className='relative'>
                      <input
                        id='confirmPassword'
                        name='confirmPassword'
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        className={`w-full pl-11 pr-12 py-3 text-sm bg-white/5 border ${
                          resetData.confirmPassword &&
                          resetData.confirmPassword !== resetData.newPassword
                            ? 'border-red-500/50'
                            : resetData.confirmPassword &&
                                resetData.confirmPassword === resetData.newPassword
                              ? 'border-green-500/50'
                              : 'border-white/10'
                        } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all`}
                        placeholder='••••••••'
                        value={resetData.confirmPassword}
                        onChange={handleResetChange}
                      />
                      <ShieldCheck className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                      <button
                        type='button'
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors'
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={
                          showConfirmPassword
                            ? t('auth.hidePassword', 'Ocultar senha')
                            : t('auth.showPassword', 'Mostrar senha')
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className='w-4 h-4' />
                        ) : (
                          <Eye className='w-4 h-4' />
                        )}
                      </button>
                    </div>
                    {resetData.confirmPassword &&
                      resetData.confirmPassword === resetData.newPassword && (
                        <p className='mt-1 text-xs text-green-400 flex items-center gap-1'>
                          <CheckCircle className='w-3 h-3' />
                          {t('auth.passwordsMatch', 'Senhas coincidem')}
                        </p>
                      )}
                  </div>

                  {/* Submit */}
                  <button
                    type='submit'
                    disabled={isLoading}
                    className='w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn mt-2'
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className='w-4 h-4 animate-spin' />
                        <span>{t('auth.resetting', 'Redefinindo...')}</span>
                      </>
                    ) : (
                      <>
                        <Lock className='w-4 h-4 group-hover/btn:scale-110 transition-transform' />
                        <span>{t('auth.resetPasswordBtn', 'Redefinir Senha')}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Back to login */}
                <div className='mt-6 text-center'>
                  <Link
                    to='/login'
                    className='inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors group/link'
                  >
                    <ArrowLeft className='w-3.5 h-3.5 group-hover/link:-translate-x-1 transition-transform' />
                    {t('auth.backToLogin', 'Voltar ao login')}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ============ STEP: SUCCESS ============ */}
          {step === 'success' && (
            <div className='bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 md:p-8 relative overflow-hidden'>
              <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                <div className='absolute -top-20 -right-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl' />
                <div className='absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl' />
              </div>

              <div className='relative text-center space-y-5'>
                {/* Animated success icon */}
                <div
                  className='mx-auto w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center border-2 border-green-500/30 shadow-2xl shadow-green-500/20'
                  style={{ animation: 'successPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                >
                  <CheckCircle
                    className='w-10 h-10 md:w-12 md:h-12 text-green-400'
                    strokeWidth={1.5}
                  />
                </div>

                {forgotPasswordMutation.isSuccess && (
                  <>
                    <div>
                      <h3 className='text-xl md:text-2xl font-bold text-white mb-2'>
                        {t('auth.emailSent', 'E-mail Enviado!')} ✉️
                      </h3>
                      <p className='text-sm text-gray-400 leading-relaxed max-w-sm mx-auto'>
                        {t(
                          'auth.emailSentDesc',
                          'Verifique sua caixa de entrada e clique no link para redefinir sua senha. Pode levar alguns minutos.'
                        )}
                      </p>
                    </div>

                    {/* Info cards */}
                    <div className='space-y-2 text-left'>
                      <div className='flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10'>
                        <Mail className='w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0' />
                        <p className='text-xs text-gray-400'>
                          {t('auth.checkInbox', 'Verifique sua caixa de entrada e pasta de spam')}
                        </p>
                      </div>
                      <div className='flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10'>
                        <AlertTriangle className='w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0' />
                        <p className='text-xs text-gray-400'>
                          {t('auth.linkExpires', 'O link expira em 30 minutos')}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {resetPasswordMutation.isSuccess && (
                  <>
                    <div>
                      <h3 className='text-xl md:text-2xl font-bold text-white mb-2'>
                        {t('auth.passwordReset', 'Senha Redefinida!')} 🎉
                      </h3>
                      <p className='text-sm text-gray-400 leading-relaxed max-w-sm mx-auto'>
                        {t(
                          'auth.passwordResetDesc',
                          'Sua senha foi alterada com sucesso. Você já pode acessar sua conta com a nova senha.'
                        )}
                      </p>
                    </div>

                    <div className='flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20'>
                      <ShieldCheck className='w-4 h-4 text-green-400 mt-0.5 flex-shrink-0' />
                      <p className='text-xs text-green-300/80'>
                        {t('auth.accountSecure', 'Sua conta está segura com a nova senha')}
                      </p>
                    </div>
                  </>
                )}

                {/* Login button */}
                <Link
                  to='/login'
                  className='inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]'
                >
                  <Sparkles className='w-4 h-4' />
                  {t('auth.goToLogin', 'Fazer Login')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className='relative z-10 py-4 px-4 text-center'>
        <p className='text-xs text-gray-600'>
          © {new Date().getFullYear()} WOLK NOW.{' '}
          {t('common.allRightsReserved', 'All rights reserved.')}
        </p>
      </footer>
    </div>
  )
}
