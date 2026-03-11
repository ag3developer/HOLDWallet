import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLogin, useValidate2FA } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { SEOHead } from '@/components/seo/SEOHead'
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  KeyRound,
  ArrowLeft,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react'
import {
  FiShield,
  FiTrendingUp,
  FiGlobe,
  FiKey,
  FiBarChart2,
  FiDollarSign,
  FiCheckCircle,
  FiLogIn,
} from 'react-icons/fi'

// Import crypto icons
import btcIcon from '@/assets/crypto-icons/btc.svg'
import ethIcon from '@/assets/crypto-icons/eth.svg'
import usdtIcon from '@/assets/crypto-icons/usdt.svg'
import bnbIcon from '@/assets/crypto-icons/bnb.svg'
import solIcon from '@/assets/crypto-icons/sol.svg'
import maticIcon from '@/assets/crypto-icons/matic.svg'
import adaIcon from '@/assets/crypto-icons/ada.svg'
import xrpIcon from '@/assets/crypto-icons/xrp.svg'
import dogeIcon from '@/assets/crypto-icons/doge.svg'
import dotIcon from '@/assets/crypto-icons/dot.svg'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

interface TwoFactorForm {
  code: string
}

// Language Selector Component - Horizontal para Rodapé
const LanguageSelector = () => {
  const { i18n } = useTranslation()

  const languages = [
    { code: 'en-US', label: 'EN', flag: '🇺🇸' },
    { code: 'pt-BR', label: 'PT', flag: '🇧🇷' },
    { code: 'es-ES', label: 'ES', flag: '🇪🇸' },
    { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
    { code: 'ja-JP', label: '日本', flag: '🇯🇵' },
    { code: 'ko-KR', label: '한국', flag: '🇰🇷' },
  ]

  const handleSelectLanguage = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('i18nextLng', code)
  }

  const isCurrentLanguage = (langCode: string) => {
    const currentLang = i18n.language || 'en-US'
    return currentLang === langCode || currentLang.startsWith(langCode.split('-')[0] || '')
  }

  return (
    <div className='flex items-center justify-center gap-2 flex-wrap'>
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => handleSelectLanguage(lang.code)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            isCurrentLanguage(lang.code)
              ? 'bg-purple-500/40 text-white border border-purple-400/50 scale-105'
              : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white hover:scale-105'
          }`}
        >
          <span className='text-sm'>{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  )
}

export const LoginPage = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const validate2FAMutation = useValidate2FA()

  const [step, setStep] = useState<'login' | '2fa' | 'admin-2fa'>('login')
  const [tempToken, setTempToken] = useState<string>('')
  const [adminEmail, setAdminEmail] = useState<string>('')
  const [showLoginPanel, setShowLoginPanel] = useState(false)

  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
    rememberMe: false,
  })

  // Fechar painel com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLoginPanel(false)
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Bloquear scroll do body quando painel estiver aberto
  useEffect(() => {
    if (showLoginPanel) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showLoginPanel])

  const openLoginPanel = useCallback(() => setShowLoginPanel(true), [])
  const closeLoginPanel = useCallback(() => setShowLoginPanel(false), [])

  const [twoFactorData, setTwoFactorData] = useState<TwoFactorForm>({
    code: '',
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  // Validation functions
  const validateEmail = (email: string): string => {
    if (!email) return t('validation.emailRequired', 'Email is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return t('validation.emailInvalid', 'Invalid email')
    }
    return ''
  }

  const validatePassword = (password: string): string => {
    if (!password) return t('validation.passwordRequired', 'Password is required')
    if (password.length < 6) {
      return t('validation.passwordTooShort', 'Password must be at least 6 characters')
    }
    return ''
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    errors.email = validateEmail(formData.email)
    errors.password = validatePassword(formData.password)
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key]
    })
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Se estiver no step admin-2fa, só validar o código
    if (step === 'admin-2fa') {
      if (!twoFactorData.code || twoFactorData.code.length !== 6) {
        setFormErrors({ code: t('validation.2faRequired', 'Código 2FA é obrigatório') })
        return
      }
    } else {
      if (!validateForm()) return
    }

    try {
      const credentials: any = {
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      }

      // Adicionar código 2FA se estiver no step de admin-2fa
      if (step === 'admin-2fa' && twoFactorData.code) {
        credentials.two_factor_code = twoFactorData.code
      }

      const result = await loginMutation.mutateAsync(credentials)

      // 🔐 Verificar se admin precisa de 2FA
      if (result.requires_2fa && result.is_admin) {
        setStep('admin-2fa')
        setAdminEmail(result.user_email || formData.email)
        setTwoFactorData({ code: '' })
        return
      }
    } catch (error: any) {
      console.error('Login failed:', error)

      // Verificar se é erro de 2FA inválido
      if (error?.response?.data?.detail === 'Código 2FA inválido') {
        setFormErrors({ code: t('validation.2faInvalid', 'Código 2FA inválido') })
      }
      // Verificar se admin não tem 2FA configurado
      if (error?.response?.data?.detail?.code === 'ADMIN_2FA_REQUIRED') {
        setFormErrors({
          email:
            error.response.data.detail.message ||
            'Administradores devem configurar 2FA. Entre em contato com o suporte.',
        })
      }
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!twoFactorData.code) {
      setFormErrors({ code: t('validation.2faRequired', '2FA code is required') })
      return
    }

    try {
      await validate2FAMutation.mutateAsync({
        token: tempToken,
        code: twoFactorData.code,
      })
      navigate('/dashboard')
    } catch (error: any) {
      setFormErrors({ code: t('validation.2faInvalid', 'Invalid 2FA code') })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handle2FAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    const sanitizedValue = value.replace(/\D/g, '').slice(0, 6)
    setTwoFactorData({ code: sanitizedValue })
    if (formErrors.code) {
      setFormErrors(prev => ({ ...prev, code: '' }))
    }
  }

  const isLoading = loginMutation.isPending || validate2FAMutation.isPending

  if (isLoading && !showLoginPanel) {
    return (
      <LoadingScreen
        message={
          step === 'login'
            ? t('auth.loggingIn', 'Logging in...')
            : t('auth.validating2FA', 'Validating 2FA code...')
        }
      />
    )
  }

  // ============ RENDER LOGIN FORM CONTENT (shared between drawer and bottom sheet) ============
  const renderLoginContent = () => {
    if (step === 'admin-2fa') {
      return (
        <div className='space-y-6'>
          <div className='text-center'>
            <div className='mx-auto w-20 h-20 relative mb-5'>
              <div className='absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl opacity-20 animate-pulse' />
              <div className='absolute inset-1 bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-xl backdrop-blur-sm' />
              <div className='absolute inset-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg' />
              <div className='absolute inset-0 flex items-center justify-center'>
                <ShieldCheck
                  className='w-10 h-10 text-amber-400 drop-shadow-lg'
                  strokeWidth={1.5}
                />
              </div>
              <div className='absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg'>
                <Lock className='w-3.5 h-3.5 text-white' strokeWidth={2} />
              </div>
            </div>
            <h4 className='text-xl font-bold text-white mb-1'>
              {t('auth.admin2fa', 'Verificação de Administrador')}
            </h4>
            <p className='text-sm text-gray-400'>
              {t('auth.admin2faSubtitle', 'Digite o código 2FA do seu Authy/Authenticator')}
            </p>
            <div className='mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full'>
              <KeyRound className='w-3.5 h-3.5 text-amber-400' />
              <span className='text-amber-400 text-sm font-medium'>{adminEmail}</span>
            </div>
          </div>

          {formErrors.code && (
            <div className='bg-red-500/10 border border-red-500/20 rounded-xl p-3'>
              <p className='text-sm text-red-400 text-center font-medium'>{formErrors.code}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                {t('auth.2faCode', 'Código 2FA (6 dígitos)')}
              </label>
              <input
                type='text'
                inputMode='numeric'
                pattern='[0-9]*'
                maxLength={6}
                value={twoFactorData.code}
                onChange={handle2FAChange}
                placeholder='000000'
                autoFocus
                className='w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] bg-white/5 border-2 border-amber-500/30 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300'
              />
              <p className='text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-1.5'>
                <Lock className='w-3 h-3' />
                Abra o Authy ou Google Authenticator
              </p>
            </div>

            <button
              type='submit'
              disabled={isLoading || twoFactorData.code.length !== 6}
              className='w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group'
            >
              {isLoading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  <span>{t('auth.validating', 'Verificando...')}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className='w-5 h-5 group-hover:scale-110 transition-transform' />
                  <span>{t('auth.verifyAdmin', 'Verificar e Entrar')}</span>
                </>
              )}
            </button>

            <button
              type='button'
              onClick={() => {
                setStep('login')
                setTwoFactorData({ code: '' })
                setFormErrors({})
              }}
              className='w-full py-2 text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 group'
            >
              <ArrowLeft className='w-4 h-4 group-hover:-translate-x-1 transition-transform' />
              {t('auth.backToLogin', 'Voltar ao login')}
            </button>
          </form>
        </div>
      )
    }

    if (step === '2fa') {
      return (
        <div className='space-y-6'>
          <div className='text-center'>
            <div className='mx-auto w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mb-3 p-2.5 border-2 border-green-500/30'>
              <img
                src='/images/logos/wn-icon.png'
                alt='WOLK NOW'
                className='w-full h-full object-contain'
              />
            </div>
            <h4 className='text-xl font-bold text-white mb-1'>
              {t('auth.2fa', 'Two-Factor Authentication')}
            </h4>
            <p className='text-sm text-gray-400'>
              {t('auth.2faSubtitle', 'Enter the 6-digit code from your authenticator app')}
            </p>
          </div>

          {formErrors.code && (
            <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-3'>
              <p className='text-sm text-red-400 text-center'>{formErrors.code}</p>
            </div>
          )}

          <form onSubmit={handle2FASubmit} className='space-y-5'>
            <div>
              <input
                type='text'
                inputMode='numeric'
                pattern='[0-9]*'
                maxLength={6}
                value={twoFactorData.code}
                onChange={handle2FAChange}
                placeholder='000000'
                autoFocus
                className='w-full px-4 py-3 text-center text-2xl font-mono tracking-widest bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50'
              />
            </div>

            <button
              type='submit'
              disabled={isLoading || twoFactorData.code.length !== 6}
              className='w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? t('auth.validating', 'Validating...') : t('auth.verify', 'Verify')}
            </button>

            <button
              type='button'
              onClick={() => setStep('login')}
              className='w-full py-2 text-gray-400 hover:text-white transition-colors'
            >
              {t('auth.backToLogin', 'Back to login')}
            </button>
          </form>
        </div>
      )
    }

    // Default: Login form
    return (
      <div className='space-y-5'>
        {/* Error Message */}
        {loginMutation.error && (
          <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-3'>
            <div className='flex items-center gap-2'>
              <FiShield className='w-4 h-4 text-red-400' />
              <p className='text-sm text-red-400'>
                {loginMutation.error.message || t('auth.loginError', 'Login error')}
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Email Field */}
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-1.5'>
              {t('auth.email', 'Email')}
            </label>
            <input
              type='email'
              name='email'
              value={formData.email}
              onChange={handleChange}
              placeholder='you@example.com'
              autoFocus
              className={`w-full px-4 py-3 text-sm bg-white/5 border ${
                formErrors.email ? 'border-red-500/50' : 'border-white/10'
              } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
            />
            {formErrors.email && <p className='mt-1 text-xs text-red-400'>{formErrors.email}</p>}
          </div>

          {/* Password Field */}
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-1.5'>
              {t('auth.password', 'Password')}
            </label>
            <div className='relative'>
              <input
                type={showPassword ? 'text' : 'password'}
                name='password'
                value={formData.password}
                onChange={handleChange}
                placeholder='••••••••'
                className={`w-full px-4 py-3 pr-12 text-sm bg-white/5 border ${
                  formErrors.password ? 'border-red-500/50' : 'border-white/10'
                } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors'
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formErrors.password && (
              <p className='mt-1 text-xs text-red-400'>{formErrors.password}</p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className='flex items-center justify-between'>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='checkbox'
                name='rememberMe'
                checked={formData.rememberMe}
                onChange={handleChange}
                className='w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50'
              />
              <span className='text-sm text-gray-300'>{t('auth.rememberMe', 'Remember me')}</span>
            </label>
            <Link
              to='/forgot-password'
              className='text-sm text-purple-400 hover:text-purple-300 transition-colors'
            >
              {t('auth.forgotPassword', 'Forgot password?')}
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type='submit'
            disabled={isLoading}
            className='w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                {t('auth.loggingIn', 'Logging in...')}
              </>
            ) : (
              <>
                <FiLogIn className='w-4 h-4' />
                {t('auth.login', 'Login')}
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-white/10' />
          </div>
        </div>

        {/* Register Link */}
        <div className='text-center pt-2'>
          <p className='text-sm text-gray-400'>
            {t('auth.noAccount', "Don't have an account?")}{' '}
            <Link
              to='/register'
              className='text-purple-400 hover:text-purple-300 font-semibold transition-colors'
            >
              {t('auth.register', 'Sign up')}
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // Features data
  const features = [
    {
      icon: FiShield,
      title: t('landing.features.security.title', 'Hybrid Security'),
      description: t(
        'landing.features.security.description',
        'You control your private keys. Your assets, your rules.'
      ),
    },
    {
      icon: FiTrendingUp,
      title: t('landing.features.ai.title', 'Predictive AI'),
      description: t(
        'landing.features.ai.description',
        'Smart alerts and portfolio rebalancing suggestions.'
      ),
    },
    {
      icon: FiGlobe,
      title: t('landing.features.marketplace.title', 'Largest P2P in LATAM'),
      description: t(
        'landing.features.marketplace.description',
        'Thousands of users trading daily with guaranteed liquidity.'
      ),
    },
    {
      icon: FiKey,
      title: t('landing.features.keys.title', 'Your Keys, Your Control'),
      description: t(
        'landing.features.keys.description',
        'Full access to your private keys. Export and import anytime.'
      ),
    },
    {
      icon: FiBarChart2,
      title: t('landing.features.dashboard.title', 'Smart Dashboard'),
      description: t(
        'landing.features.dashboard.description',
        'Real-time portfolio visualization with automatic reports.'
      ),
    },
    {
      icon: FiDollarSign,
      title: t('landing.features.fees.title', 'Transparent Fees'),
      description: t(
        'landing.features.fees.description',
        'No hidden fees. Lowest cost per transaction.'
      ),
    },
  ]

  const stats = [
    { value: '100K+', label: t('landing.stats.users', 'Active Users') },
    { value: '$50M+', label: t('landing.stats.volume', 'Monthly Volume') },
    { value: '99.9%', label: t('landing.stats.uptime', 'Uptime') },
    { value: '24/7', label: t('landing.stats.support', 'Support') },
  ]

  return (
    <div
      key={i18n.language}
      className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-x-hidden overflow-y-auto'
    >
      {/* SEO Meta Tags */}
      <SEOHead
        title={t('seo.loginTitle', 'Login - WOLK NOW® Smart Wallet')}
        description={t(
          'seo.loginDescription',
          'Access your WOLK NOW® digital wallet. Secure P2P trading of Bitcoin, Ethereum & cryptocurrencies with AI predictions and reputation system.'
        )}
        path='/login'
      />

      {/* Background */}
      <div className='absolute inset-0 overflow-hidden'>
        {/* Gradient Orbs */}
        <div className='absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse' />
        <div
          className='absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse'
          style={{ animationDelay: '1s' }}
        />

        {/* Floating Crypto Coins with Real Icons - Star Effect - Ocultar em mobile */}
        <div className='hidden md:block'>
          {[
            {
              icon: btcIcon,
              name: 'BTC',
              gradient: 'from-orange-400 to-orange-600',
              glow: 'rgba(251, 146, 60, 0.8)',
              brightness: 'bright',
            },
            {
              icon: ethIcon,
              name: 'ETH',
              gradient: 'from-blue-400 to-purple-600',
              glow: 'rgba(96, 165, 250, 0.6)',
              brightness: 'medium',
            },
            {
              icon: usdtIcon,
              name: 'USDT',
              gradient: 'from-green-400 to-emerald-600',
              glow: 'rgba(52, 211, 153, 0.7)',
              brightness: 'bright',
            },
            {
              icon: bnbIcon,
              name: 'BNB',
              gradient: 'from-yellow-400 to-yellow-600',
              glow: 'rgba(251, 191, 36, 0.5)',
              brightness: 'dim',
            },
          ].map((coin, i) => {
            const sizeMap = { bright: 18, medium: 14, dim: 10 }
            const size = sizeMap[coin.brightness as keyof typeof sizeMap]
            const opacityMap = { bright: '0.4', medium: '0.25', dim: '0.15' }
            const opacity = opacityMap[coin.brightness as keyof typeof opacityMap]

            return (
              <div
                key={`coin-${i}`}
                className={`absolute rounded-full bg-gradient-to-br ${coin.gradient} backdrop-blur-md border-2 shadow-2xl hover:scale-150 transition-all duration-500 group`}
                style={{
                  width: `${size * 4}px`,
                  height: `${size * 4}px`,
                  left: `${10 + i * 25}%`,
                  top: `${8 + (i % 2) * 15}%`,
                  animationName:
                    coin.brightness === 'bright'
                      ? 'starPulse'
                      : coin.brightness === 'medium'
                        ? 'starBlink'
                        : 'starGlow',
                  animationDuration: `${2 + Math.random() * 3}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${Math.random() * 2}s`,
                  borderColor: coin.glow,
                  boxShadow: `0 0 ${size * 2}px ${coin.glow}, 0 0 ${size * 4}px ${coin.glow}, 0 0 ${size * 6}px ${coin.glow}`,
                  opacity: opacity,
                }}
              >
                <div className='w-full h-full flex items-center justify-center p-3 relative'>
                  <img
                    src={coin.icon}
                    alt={coin.name}
                    className='w-full h-full object-contain drop-shadow-2xl group-hover:rotate-12 transition-transform duration-300'
                    style={{
                      filter: `drop-shadow(0 0 ${size}px ${coin.glow})`,
                    }}
                  />
                  {/* Glow effect around the icon */}
                  <div
                    className='absolute inset-0 rounded-full'
                    style={{
                      background: `radial-gradient(circle, ${coin.glow} 0%, transparent 70%)`,
                      animationName: 'pulse',
                      animationDuration: '2s',
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                    }}
                  />
                </div>
              </div>
            )
          })}

          {/* Additional smaller floating coins for density - Reduzido para 6 */}
          {[...Array(6)].map((_, i) => {
            const coinData = [
              {
                icon: solIcon,
                name: 'SOL',
                gradient: 'from-purple-400/30 to-pink-600/30',
                glow: 'rgba(192, 132, 252, 0.2)',
              },
              {
                icon: maticIcon,
                name: 'MATIC',
                gradient: 'from-purple-500/30 to-indigo-600/30',
                glow: 'rgba(139, 92, 246, 0.2)',
              },
              {
                icon: adaIcon,
                name: 'ADA',
                gradient: 'from-blue-500/30 to-blue-700/30',
                glow: 'rgba(59, 130, 246, 0.2)',
              },
              {
                icon: xrpIcon,
                name: 'XRP',
                gradient: 'from-gray-400/30 to-gray-600/30',
                glow: 'rgba(156, 163, 175, 0.15)',
              },
              {
                icon: dogeIcon,
                name: 'DOGE',
                gradient: 'from-yellow-300/30 to-yellow-500/30',
                glow: 'rgba(253, 224, 71, 0.2)',
              },
              {
                icon: dotIcon,
                name: 'DOT',
                gradient: 'from-pink-400/30 to-pink-600/30',
                glow: 'rgba(244, 114, 182, 0.2)',
              },
            ]
            const coin = coinData[i % coinData.length]!

            return (
              <div
                key={`small-coin-${i}`}
                className={`absolute w-8 h-8 rounded-full bg-gradient-to-br ${coin.gradient} backdrop-blur-md border border-white/10 hover:scale-110 transition-transform duration-300`}
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${70 + (i % 3) * 8}%`,
                  animationName: 'starGlow',
                  animationDuration: `${4 + Math.random() * 4}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${Math.random() * 3}s`,
                  boxShadow: `0 4px 15px ${coin.glow}`,
                  opacity: 0.3,
                }}
              >
                <div className='w-full h-full flex items-center justify-center p-1.5'>
                  <img
                    src={coin.icon}
                    alt={coin.name}
                    className='w-full h-full object-contain drop-shadow-lg'
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Animated Grid Lines */}
        <svg className='absolute inset-0 w-full h-full opacity-10'>
          <defs>
            <pattern id='grid' width='50' height='50' patternUnits='userSpaceOnUse'>
              <path
                d='M 50 0 L 0 0 0 50'
                fill='none'
                stroke='rgba(139, 92, 246, 0.3)'
                strokeWidth='0.5'
              />
            </pattern>
          </defs>
          <rect width='100%' height='100%' fill='url(#grid)' />
        </svg>

        {/* Chart Lines Animation */}
        {[...Array(3)].map((_, i) => (
          <div
            key={`chart-${i}`}
            className='absolute h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent'
            style={{
              width: '200%',
              top: `${20 + i * 30}%`,
              left: '-50%',
              animationName: 'slideRight',
              animationDuration: `${8 + i * 2}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              animationDelay: `${i * 1}s`,
            }}
          />
        ))}

        {/* Floating Particles */}
        {[...Array(30)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className='absolute w-1 h-1 bg-purple-400/50 rounded-full'
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

        {/* Animated Candlestick Chart */}
        <div className='absolute right-0 bottom-0 w-1/3 h-1/3 opacity-10'>
          <div className='relative w-full h-full'>
            {[...Array(8)].map((_, i) => (
              <div
                key={`candle-${i}`}
                className='absolute bottom-0'
                style={{
                  left: `${i * 12}%`,
                  width: '8%',
                  height: `${30 + Math.random() * 70}%`,
                  animationName: 'grow',
                  animationDuration: `${2 + Math.random() * 2}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              >
                <div
                  className={`w-full h-full ${Math.random() > 0.5 ? 'bg-green-500/30' : 'bg-red-500/30'} rounded-t`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Animated Wave Lines */}
        <svg className='absolute bottom-0 left-0 w-full opacity-5' viewBox='0 0 1440 320'>
          <path
            fill='none'
            stroke='rgba(139, 92, 246, 0.5)'
            strokeWidth='3'
            d='M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128'
          >
            <animate
              attributeName='d'
              dur='10s'
              repeatCount='indefinite'
              values='
                M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128;
                M0,128L48,149.3C96,171,192,213,288,208C384,203,480,149,576,138.7C672,128,768,160,864,165.3C960,171,1056,149,1152,133.3C1248,117,1344,107,1392,101.3L1440,96;
                M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128
              '
            />
          </path>
        </svg>

        {/* Large Crypto Icons Floating in Background */}
        {[
          { icon: btcIcon, name: 'BITCOIN', left: 10, top: 8 },
          { icon: ethIcon, name: 'ETHEREUM', left: 30, top: 18 },
          { icon: usdtIcon, name: 'TETHER', left: 50, top: 12 },
          { icon: bnbIcon, name: 'BINANCE', left: 70, top: 22 },
          { icon: solIcon, name: 'SOLANA', left: 85, top: 15 },
        ].map((crypto, i) => (
          <div
            key={`symbol-${i}`}
            className='absolute select-none opacity-5 hover:opacity-20 transition-opacity duration-500'
            style={{
              left: `${crypto.left}%`,
              top: `${crypto.top}%`,
              animation: `floatSlow ${10 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          >
            <div className='relative'>
              <img
                src={crypto.icon}
                alt={crypto.name}
                className='w-32 h-32 object-contain filter grayscale'
              />
              <div className='absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs font-bold text-purple-400/60 whitespace-nowrap tracking-wider'>
                {crypto.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        /* Fix scroll para iOS Safari */
        html, body {
          overflow-x: hidden;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
          height: auto !important;
          min-height: 100vh;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(5deg);
          }
          50% {
            transform: translateY(-40px) translateX(-10px) rotate(-5deg);
          }
          75% {
            transform: translateY(-20px) translateX(10px) rotate(5deg);
          }
        }

        /* Star Effects - Estrelas brilhando */
        @keyframes starPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
            filter: brightness(1);
          }
          50% {
            transform: scale(1.3);
            opacity: 0.8;
            filter: brightness(1.5);
          }
        }

        @keyframes starBlink {
          0%, 100% {
            opacity: 0.7;
            transform: scale(1);
          }
          25% {
            opacity: 0.3;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          75% {
            opacity: 0.5;
            transform: scale(0.95);
          }
        }

        @keyframes starGlow {
          0%, 100% {
            opacity: 0.4;
            filter: brightness(0.8);
          }
          50% {
            opacity: 0.6;
            filter: brightness(1.2);
          }
        }

        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.05;
          }
          50% {
            transform: translateY(-50px) scale(1.1);
            opacity: 0.1;
          }
        }

        @keyframes slideRight {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(50%);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes grow {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(1.2);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        /* Card entrance animations */
        @keyframes cardSlideIn {
          from {
            opacity: 0;
            transform: translateX(50px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        /* Glow effect */
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
          }
          50% {
            box-shadow: 0 0 40px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.2);
          }
        }

        /* Rotate subtle */
        @keyframes rotateSubtle {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(180deg);
          }
        }
      `}</style>

      {/* Header */}
      <header className='relative z-20 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center'>
        <div className='flex items-center gap-2 md:gap-3'>
          <div className='w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center p-2 border border-white/20 hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/20'>
            <img
              src='/images/logos/wn-icon.png'
              alt='WOLK NOW Logo'
              className='w-full h-full object-contain'
            />
          </div>
          <div className='text-center'>
            <h1 className='text-lg md:text-2xl font-bold text-white tracking-tight'>
              WOLK NOW
              <sup className='text-xs md:text-sm ml-0.5 md:ml-1 -top-1 md:-top-2 relative'>®</sup>
            </h1>
            <p className='text-[10px] md:text-xs text-purple-300 font-medium'>
              {t('landing.slogan', 'Smart & Secure Wallet')}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2 md:gap-3'>
          {/* Botão Criar Conta */}
          <Link
            to='/register'
            className='hidden md:flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-400/60 rounded-full transition-all hover:scale-105'
          >
            {t('auth.register', 'Sign up')}
          </Link>
          {/* Botão Login */}
          <button
            onClick={openLoginPanel}
            className='flex items-center gap-1.5 px-4 py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xs md:text-sm font-semibold rounded-full shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95'
          >
            <FiLogIn className='w-3.5 h-3.5 md:w-4 md:h-4' />
            <span>Login</span>
          </button>
        </div>
      </header>

      {/* ============ OVERLAY + LOGIN PANEL ============ */}
      {/* Backdrop overlay */}
      <div
        role='button'
        tabIndex={0}
        aria-label='Close login panel'
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${showLoginPanel ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeLoginPanel}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') closeLoginPanel()
        }}
      />

      {/* Desktop: Side Drawer from right */}
      <div
        className={`hidden md:flex fixed top-0 right-0 z-50 h-full w-full max-w-[440px] flex-col bg-gradient-to-b from-slate-900/98 via-slate-900/99 to-slate-950 border-l border-white/10 shadow-2xl shadow-black/50 transition-transform duration-500 ease-out ${showLoginPanel ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer decorative background */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute -top-32 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl' />
          <div className='absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl' />
        </div>

        {/* Drawer Header */}
        <div className='relative flex items-center justify-between px-6 py-5 border-b border-white/10'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center p-1.5 border border-white/20'>
              <img
                src='/images/logos/wn-icon.png'
                alt='WOLK NOW'
                className='w-full h-full object-contain'
              />
            </div>
            <div>
              <h3 className='text-lg font-bold text-white'>{t('auth.login', 'Login')}</h3>
              <p className='text-xs text-gray-400'>
                {t('auth.loginSubtitle', 'Access your WOLK NOW account')}
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginPanel}
            aria-label='Close login panel'
            className='w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Drawer Body */}
        <div className='relative flex-1 overflow-y-auto px-6 py-6'>{renderLoginContent()}</div>
      </div>

      {/* Mobile: Bottom Sheet */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 transition-transform duration-500 ease-out ${showLoginPanel ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className='bg-gradient-to-b from-slate-900 via-slate-900/99 to-slate-950 rounded-t-3xl border-t border-white/10 shadow-2xl shadow-black/50 max-h-[90vh] overflow-hidden flex flex-col'>
          {/* Decorative background */}
          <div className='absolute inset-0 overflow-hidden pointer-events-none rounded-t-3xl'>
            <div className='absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl' />
          </div>

          {/* Handle bar */}
          <div className='relative flex justify-center pt-3 pb-1'>
            <div className='w-10 h-1 rounded-full bg-white/20' />
          </div>

          {/* Bottom Sheet Header */}
          <div className='relative flex items-center justify-between px-5 py-3 border-b border-white/10'>
            <div className='flex items-center gap-2.5'>
              <div className='w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center p-1.5 border border-white/20'>
                <img
                  src='/images/logos/wn-icon.png'
                  alt='WOLK NOW'
                  className='w-full h-full object-contain'
                />
              </div>
              <div>
                <h3 className='text-base font-bold text-white'>{t('auth.login', 'Login')}</h3>
                <p className='text-[11px] text-gray-400'>
                  {t('auth.loginSubtitle', 'Access your WOLK NOW account')}
                </p>
              </div>
            </div>
            <button
              onClick={closeLoginPanel}
              aria-label='Close login panel'
              className='w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* Bottom Sheet Body */}
          <div className='relative flex-1 overflow-y-auto px-5 py-5 pb-8'>
            {renderLoginContent()}
          </div>
        </div>
      </div>

      {/* ============ MAIN INSTITUTIONAL CONTENT ============ */}
      <div className='relative z-10 container mx-auto px-4 md:px-8 py-6 md:py-16'>
        {/* Hero Section - Centralizado e impactante */}
        <div className='max-w-4xl mx-auto text-center space-y-6 md:space-y-8 mb-16 md:mb-24'>
          <div className='space-y-4 md:space-y-6' style={{ animation: 'fadeInUp 0.8s ease-out' }}>
            <div className='inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30 animate-pulse hover:scale-105 transition-transform cursor-default'>
              <FiCheckCircle className='w-4 h-4 text-purple-300' />
              <span className='text-xs md:text-sm text-purple-200'>
                {t('landing.hero.badge', 'Largest P2P Marketplace in Latin America')}
              </span>
            </div>

            <h2 className='text-3xl md:text-6xl lg:text-7xl font-bold text-white leading-tight'>
              {t('landing.hero.title', 'Trade Crypto with')}
              <span className='block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text animate-gradient'>
                {t('landing.hero.subtitle', 'Security & Intelligence')}
              </span>
            </h2>

            <p className='text-base md:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed'>
              {t(
                'landing.hero.description',
                'The only platform that combines the security of owning your private keys with AI intelligence that protects your investments.'
              )}
            </p>

            {/* CTA Buttons */}
            <div className='flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-4'>
              <button
                onClick={openLoginPanel}
                className='w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base'
              >
                <FiLogIn className='w-4 h-4 md:w-5 md:h-5' />
                {t('auth.loginCTA', 'Access your Account')}
              </button>
              <Link
                to='/register'
                className='w-full sm:w-auto px-8 py-3.5 border border-purple-500/40 hover:border-purple-400/60 text-purple-300 hover:text-white font-semibold rounded-xl transition-all hover:scale-105 hover:bg-white/5 flex items-center justify-center gap-2 text-sm md:text-base'
              >
                <Sparkles className='w-4 h-4 md:w-5 md:h-5' />
                {t('auth.registerCTA', 'Create Free Account')}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className='max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-16 md:mb-24'>
          {stats.map((stat, index) => (
            <div
              key={index}
              className='text-center p-4 md:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-purple-500/30 hover:scale-105 transition-all duration-300 cursor-default group relative overflow-hidden'
              style={{
                animation: `fadeInUp 0.6s ease-out forwards`,
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
              }}
            >
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000' />
              <div className='relative'>
                <div className='text-2xl md:text-4xl font-bold text-white group-hover:text-purple-300 transition-colors'>
                  {stat.value}
                </div>
                <div className='text-xs md:text-sm text-gray-400 group-hover:text-gray-300 transition-colors mt-1'>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Features Grid - 3 columns on desktop */}
        <div className='max-w-6xl mx-auto mb-16 md:mb-24'>
          <div className='text-center mb-8 md:mb-12'>
            <h3 className='text-2xl md:text-4xl font-bold text-white mb-3'>
              {t('landing.whyChoose', 'Why Choose WOLK NOW?')}
            </h3>
            <p className='text-sm md:text-lg text-gray-400 max-w-2xl mx-auto'>
              {t(
                'landing.whyChooseDesc',
                'Technology and security combined for the best crypto experience.'
              )}
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'>
            {features.map((feature, index) => (
              <div
                key={index}
                className='p-5 md:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300 group relative overflow-hidden'
                style={{
                  animation: `fadeInUp 0.6s ease-out forwards`,
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0,
                }}
              >
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/10 group-hover:to-blue-500/10 transition-all duration-300' />
                <div className='relative flex flex-col gap-3'>
                  <div className='flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg shadow-purple-500/0 group-hover:shadow-purple-500/30'>
                    <feature.icon className='w-6 h-6 text-purple-300 group-hover:text-purple-200 transition-colors' />
                  </div>
                  <div>
                    <h4 className='text-base md:text-lg font-semibold text-white mb-1 group-hover:text-purple-200 transition-colors'>
                      {feature.title}
                    </h4>
                    <p className='text-sm text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed'>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className='max-w-4xl mx-auto'>
          <div className='flex items-center gap-4 md:gap-6 p-4 md:p-6 bg-green-500/10 backdrop-blur-sm rounded-xl border border-green-500/20'>
            <FiCheckCircle className='w-6 h-6 md:w-8 md:h-8 text-green-400 flex-shrink-0' />
            <div className='text-sm md:text-base text-gray-300'>
              {t(
                'landing.trust',
                'Audited & Certified • Bank-level Security • 24/7 Support in Portuguese'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer com seletor de idioma */}
      <footer className='relative z-10 py-6 px-4 border-t border-white/10 bg-black/20 backdrop-blur-sm'>
        <div className='container mx-auto'>
          <div className='flex flex-col items-center gap-4'>
            {/* Seletor de Idioma */}
            <div className='text-center'>
              <p className='text-xs text-gray-500 mb-3'>
                {t('common.selectLanguage', 'Select Language')}
              </p>
              <LanguageSelector />
            </div>

            {/* Copyright */}
            <p className='text-xs text-gray-600'>
              © {new Date().getFullYear()} WOLK NOW.{' '}
              {t('common.allRightsReserved', 'All rights reserved.')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
