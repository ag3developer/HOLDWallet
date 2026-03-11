import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRegister } from '@/hooks/useAuth'
import { SEOHead } from '@/components/seo/SEOHead'
import {
  Eye,
  EyeOff,
  Mail,
  User,
  Lock,
  CheckCircle,
  AlertTriangle,
  Gift,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { FiShield } from 'react-icons/fi'

interface RegisterForm {
  email: string
  username: string
  password: string
  confirmPassword: string
  referralCode: string
  acceptTerms: boolean
  acceptPrivacy: boolean
  acceptMarketing: boolean
}

export const RegisterPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const registerMutation = useRegister()

  const [formData, setFormData] = useState<RegisterForm>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    acceptTerms: false,
    acceptPrivacy: false,
    acceptMarketing: false,
  })

  // Preencher código de indicação da URL se presente
  useEffect(() => {
    const ref = searchParams.get('ref') || searchParams.get('referral')
    if (ref) {
      // O código de referral agora é o username (em minúsculas)
      setFormData(prev => ({ ...prev, referralCode: ref.toLowerCase() }))
    }
  }, [searchParams])

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

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

    let strength = 0
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++
    if (password.length >= 12) strength++

    setPasswordStrength(strength)

    if (strength < 3) {
      return t(
        'validation.passwordWeak',
        'Senha muito fraca. Use maiúscula, minúscula, número e símbolo'
      )
    }
    return ''
  }

  const validateUsername = (username: string): string => {
    if (!username) return t('validation.usernameRequired', 'Nome de usuário é obrigatório')
    if (username.length < 3)
      return t('validation.usernameTooShort', 'Nome de usuário deve ter pelo menos 3 caracteres')
    if (username.length > 50)
      return t('validation.usernameTooLong', 'Nome de usuário deve ter menos de 50 caracteres')
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return t(
        'validation.usernameInvalid',
        'Nome de usuário pode conter apenas letras, números, hífens e underscores'
      )
    }
    return ''
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    errors.email = validateEmail(formData.email)
    errors.username = validateUsername(formData.username)
    errors.password = validatePassword(formData.password)

    if (!formData.confirmPassword) {
      errors.confirmPassword = t(
        'validation.confirmPasswordRequired',
        'Confirmação de senha é obrigatória'
      )
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('validation.passwordMismatch', 'Senhas não coincidem')
    }

    if (!formData.acceptTerms) {
      errors.acceptTerms = t('validation.termsRequired', 'Você deve aceitar os termos de uso')
    }

    if (!formData.acceptPrivacy) {
      errors.acceptPrivacy = t(
        'validation.privacyRequired',
        'Você deve aceitar a política de privacidade'
      )
    }

    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key]
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      const registerData: any = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
      }

      if (formData.referralCode) {
        registerData.referral_code = formData.referralCode
      }

      await registerMutation.mutateAsync(registerData)

      // Successful registration, redirect to dashboard
      navigate('/dashboard')
    } catch (error: any) {
      // Error is handled by the mutation
      console.error('Registration failed:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    // Clear specific field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Update password strength in real time
    if (name === 'password') {
      validatePassword(value)
    }
  }

  const getPasswordStrengthLabel = (strength: number): { label: string; color: string } => {
    switch (strength) {
      case 0:
      case 1:
        return { label: t('auth.passwordVeryWeak', 'Muito fraca'), color: 'text-red-500' }
      case 2:
        return { label: t('auth.passwordWeakLabel', 'Fraca'), color: 'text-orange-500' }
      case 3:
        return { label: t('auth.passwordMedium', 'Média'), color: 'text-yellow-500' }
      case 4:
        return { label: t('auth.passwordStrong', 'Forte'), color: 'text-green-500' }
      case 5:
        return { label: t('auth.passwordVeryStrong', 'Muito forte'), color: 'text-green-600' }
      default:
        return { label: '', color: '' }
    }
  }

  const isLoading = registerMutation.isPending

  // Password strength visual helpers
  const getStrengthBarColor = (level: number): string => {
    if (level > passwordStrength) return 'bg-white/10'
    if (passwordStrength <= 1) return 'bg-red-500'
    if (passwordStrength <= 2) return 'bg-orange-500'
    if (passwordStrength <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex flex-col'>
      {/* SEO Meta Tags */}
      <SEOHead
        title={t('seo.registerTitle', 'Create Account - WOLK NOW® Smart Wallet')}
        description={t(
          'seo.registerDescription',
          'Create your free WOLK NOW® account. Start trading Bitcoin & cryptocurrencies securely with AI predictions and P2P reputation system.'
        )}
        path='/register'
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
            <pattern id='grid-reg' width='50' height='50' patternUnits='userSpaceOnUse'>
              <path
                d='M 50 0 L 0 0 0 50'
                fill='none'
                stroke='rgba(139, 92, 246, 0.4)'
                strokeWidth='0.5'
              />
            </pattern>
          </defs>
          <rect width='100%' height='100%' fill='url(#grid-reg)' />
        </svg>

        {/* Floating particles */}
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={`p-${i}`}
            className='absolute w-1 h-1 bg-purple-400/40 rounded-full'
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
              animationName: 'twinkle',
              animationDuration: `${2 + (i % 4)}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${(i % 5) * 0.6}s`,
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
      <div className='relative z-10 flex-1 flex items-center justify-center px-4 py-6 md:py-10'>
        <div className='w-full max-w-lg' style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          <div className='bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 md:p-8 relative overflow-hidden group'>
            {/* Background glow on hover */}
            <div className='absolute inset-0 bg-gradient-to-br from-purple-500/0 via-pink-500/0 to-blue-500/0 group-hover:from-purple-500/5 group-hover:via-pink-500/5 group-hover:to-blue-500/5 transition-all duration-500' />
            <div className='absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-15 blur-xl transition-opacity duration-500' />

            <div className='relative'>
              {/* Icon & Title */}
              <div className='text-center mb-6'>
                <div
                  className='mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20'
                  style={{ animation: 'glow 2.5s ease-in-out infinite' }}
                >
                  <UserPlus className='w-8 h-8 md:w-10 md:h-10 text-purple-300' strokeWidth={1.5} />
                </div>
                <h2 className='text-xl md:text-2xl font-bold text-white mb-1.5'>
                  {t('auth.register', 'Criar Conta')}
                </h2>
                <p className='text-sm text-gray-400 leading-relaxed'>
                  {t('auth.registerSubtitle', 'Registre-se na WOLK NOW e comece a negociar')}
                </p>
              </div>

              {/* Error Message */}
              {registerMutation.error && (
                <div className='mb-5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 backdrop-blur-sm'>
                  <div className='flex items-center gap-2'>
                    <AlertTriangle className='w-4 h-4 text-red-400 flex-shrink-0' />
                    <p className='text-sm text-red-400'>
                      {registerMutation.error.message ||
                        t('auth.registerError', 'Erro no registro')}
                    </p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className='space-y-4'>
                {/* Username */}
                <div>
                  <label
                    htmlFor='username'
                    className='block text-sm font-medium text-gray-300 mb-1.5'
                  >
                    {t('auth.username', 'Nome de usuário')}
                  </label>
                  <div className='relative'>
                    <input
                      id='username'
                      name='username'
                      type='text'
                      autoComplete='username'
                      required
                      autoFocus
                      className={`w-full pl-11 pr-4 py-3 text-sm bg-white/5 border ${
                        formErrors.username ? 'border-red-500/50' : 'border-white/10'
                      } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all`}
                      placeholder={t('auth.usernamePlaceholder', 'joaosilva')}
                      value={formData.username}
                      onChange={handleChange}
                    />
                    <User className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                  </div>
                  {formErrors.username && (
                    <p className='mt-1 text-xs text-red-400'>{formErrors.username}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor='email' className='block text-sm font-medium text-gray-300 mb-1.5'>
                    {t('auth.email', 'E-mail')}
                  </label>
                  <div className='relative'>
                    <input
                      id='email'
                      name='email'
                      type='email'
                      autoComplete='email'
                      required
                      className={`w-full pl-11 pr-4 py-3 text-sm bg-white/5 border ${
                        formErrors.email ? 'border-red-500/50' : 'border-white/10'
                      } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all`}
                      placeholder='you@example.com'
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <Mail className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                  </div>
                  {formErrors.email && (
                    <p className='mt-1 text-xs text-red-400'>{formErrors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor='password'
                    className='block text-sm font-medium text-gray-300 mb-1.5'
                  >
                    {t('auth.password', 'Senha')}
                  </label>
                  <div className='relative'>
                    <input
                      id='password'
                      name='password'
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      required
                      className={`w-full pl-11 pr-12 py-3 text-sm bg-white/5 border ${
                        formErrors.password ? 'border-red-500/50' : 'border-white/10'
                      } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all`}
                      placeholder='••••••••'
                      value={formData.password}
                      onChange={handleChange}
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
                      {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>

                  {/* Password Strength */}
                  {formData.password && (
                    <div className='mt-2 space-y-1.5'>
                      <div className='flex items-center gap-2'>
                        <div className='flex gap-1 flex-1'>
                          {[1, 2, 3, 4, 5].map(level => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${getStrengthBarColor(level)}`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-xs font-medium ${getPasswordStrengthLabel(passwordStrength).color}`}
                        >
                          {getPasswordStrengthLabel(passwordStrength).label}
                        </span>
                      </div>
                      <p className='text-xs text-gray-500'>
                        {t(
                          'auth.passwordRequirements',
                          'Use maiúscula, minúscula, número e símbolos'
                        )}
                      </p>
                    </div>
                  )}

                  {formErrors.password && (
                    <p className='mt-1 text-xs text-red-400'>{formErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor='confirmPassword'
                    className='block text-sm font-medium text-gray-300 mb-1.5'
                  >
                    {t('auth.confirmPassword', 'Confirmar Senha')}
                  </label>
                  <div className='relative'>
                    <input
                      id='confirmPassword'
                      name='confirmPassword'
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      required
                      className={`w-full pl-11 pr-12 py-3 text-sm bg-white/5 border ${
                        formErrors.confirmPassword
                          ? 'border-red-500/50'
                          : formData.confirmPassword &&
                              formData.confirmPassword === formData.password
                            ? 'border-green-500/50'
                            : 'border-white/10'
                      } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all`}
                      placeholder='••••••••'
                      value={formData.confirmPassword}
                      onChange={handleChange}
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
                  {formData.confirmPassword && formData.confirmPassword === formData.password && (
                    <p className='mt-1 text-xs text-green-400 flex items-center gap-1'>
                      <CheckCircle className='w-3 h-3' />
                      {t('auth.passwordsMatch', 'Senhas coincidem')}
                    </p>
                  )}
                  {formErrors.confirmPassword && (
                    <p className='mt-1 text-xs text-red-400'>{formErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Referral Code */}
                <div>
                  <label
                    htmlFor='referralCode'
                    className='block text-sm font-medium text-gray-300 mb-1.5'
                  >
                    <span className='flex items-center gap-1.5'>
                      <Gift className='w-3.5 h-3.5 text-purple-400' />
                      {t('auth.referralCode', 'Código de Indicação')}
                      <span className='text-gray-500 text-xs font-normal'>
                        ({t('common.optional', 'opcional')})
                      </span>
                    </span>
                  </label>
                  <div className='relative'>
                    <input
                      id='referralCode'
                      name='referralCode'
                      type='text'
                      className='w-full pl-11 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all uppercase font-mono tracking-wider'
                      placeholder='WOLK-XXXXXX'
                      value={formData.referralCode}
                      onChange={handleChange}
                    />
                    <Gift className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
                  </div>
                  {formData.referralCode && (
                    <p className='mt-1 text-xs text-purple-400 flex items-center gap-1'>
                      <CheckCircle className='w-3 h-3' />
                      {t('auth.referralApplied', 'Você será indicado por alguém!')}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className='relative py-1'>
                  <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t border-white/10' />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className='space-y-3'>
                  {/* Accept Terms */}
                  <label
                    htmlFor='acceptTerms'
                    className='flex items-start gap-3 cursor-pointer group/check'
                  >
                    <input
                      id='acceptTerms'
                      name='acceptTerms'
                      type='checkbox'
                      className='mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0'
                      checked={formData.acceptTerms}
                      onChange={handleChange}
                    />
                    <span className='text-sm text-gray-400 group-hover/check:text-gray-300 transition-colors'>
                      {t('auth.acceptTermsPrefix', 'Eu aceito os')}{' '}
                      <Link
                        to='/terms'
                        className='text-purple-400 hover:text-purple-300 underline underline-offset-2'
                        target='_blank'
                      >
                        {t('auth.termsOfService', 'Termos de Uso')}
                      </Link>{' '}
                      *
                    </span>
                  </label>
                  {formErrors.acceptTerms && (
                    <p className='text-xs text-red-400 ml-7'>{formErrors.acceptTerms}</p>
                  )}

                  {/* Accept Privacy */}
                  <label
                    htmlFor='acceptPrivacy'
                    className='flex items-start gap-3 cursor-pointer group/check'
                  >
                    <input
                      id='acceptPrivacy'
                      name='acceptPrivacy'
                      type='checkbox'
                      className='mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0'
                      checked={formData.acceptPrivacy}
                      onChange={handleChange}
                    />
                    <span className='text-sm text-gray-400 group-hover/check:text-gray-300 transition-colors'>
                      {t('auth.acceptPrivacyPrefix', 'Eu aceito a')}{' '}
                      <Link
                        to='/privacy'
                        className='text-purple-400 hover:text-purple-300 underline underline-offset-2'
                        target='_blank'
                      >
                        {t('auth.privacyPolicy', 'Política de Privacidade')}
                      </Link>{' '}
                      *
                    </span>
                  </label>
                  {formErrors.acceptPrivacy && (
                    <p className='text-xs text-red-400 ml-7'>{formErrors.acceptPrivacy}</p>
                  )}

                  {/* Marketing (optional) */}
                  <label
                    htmlFor='acceptMarketing'
                    className='flex items-start gap-3 cursor-pointer group/check'
                  >
                    <input
                      id='acceptMarketing'
                      name='acceptMarketing'
                      type='checkbox'
                      className='mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0'
                      checked={formData.acceptMarketing}
                      onChange={handleChange}
                    />
                    <span className='text-sm text-gray-400 group-hover/check:text-gray-300 transition-colors'>
                      {t(
                        'auth.acceptMarketing',
                        'Desejo receber e-mails promocionais e newsletters'
                      )}{' '}
                      <span className='text-gray-600'>({t('common.optional', 'opcional')})</span>
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type='submit'
                  disabled={isLoading}
                  className='w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn mt-2'
                >
                  {isLoading ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      <span>{t('auth.registering', 'Criando conta...')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className='w-4 h-4 group-hover/btn:scale-110 transition-transform' />
                      <span>{t('auth.register', 'Criar Conta')}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Security note */}
              <div className='mt-5 flex items-center gap-2 px-3 py-2.5 bg-purple-500/5 border border-purple-500/10 rounded-lg'>
                <FiShield className='w-4 h-4 text-purple-400 flex-shrink-0' />
                <p className='text-xs text-gray-500 leading-relaxed'>
                  {t(
                    'auth.registerSecurityNote',
                    'Seus dados são criptografados e protegidos. Nunca compartilharemos suas informações.'
                  )}
                </p>
              </div>

              {/* Login link */}
              <div className='mt-5 text-center'>
                <p className='text-sm text-gray-400'>
                  {t('auth.alreadyHaveAccount', 'Já tem uma conta?')}{' '}
                  <Link
                    to='/login'
                    className='text-purple-400 hover:text-purple-300 font-medium transition-colors'
                  >
                    {t('auth.login', 'Entrar')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
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
