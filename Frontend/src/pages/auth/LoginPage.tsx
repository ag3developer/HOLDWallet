import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLogin, useValidate2FA } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Eye, EyeOff } from 'lucide-react'
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

// Language Selector Component
const LanguageSelector = () => {
  const { i18n } = useTranslation()

  const languages = [
    { code: 'en-US', label: 'EN' },
    { code: 'pt-BR', label: 'PT' },
    { code: 'es-ES', label: 'ES' },
  ]

  return (
    <div className='flex gap-2'>
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
            i18n.language === lang.code
              ? 'bg-white/20 text-white border border-white/30 shadow-lg'
              : 'bg-transparent text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/80 hover:border-white/20'
          }`}
        >
          {lang.label}
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

  const [step, setStep] = useState<'login' | '2fa'>('login')
  const [tempToken, setTempToken] = useState<string>('')

  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
    rememberMe: false,
  })

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
    if (!validateForm()) return

    try {
      await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      })
    } catch (error: any) {
      console.error('Login failed:', error)
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

  if (isLoading) {
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
          -webkit-overflow-scrolling: touch;
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
      <header className='relative z-10 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center'>
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
          <LanguageSelector />
          {/* Botão Login - visível apenas no mobile */}
          <button
            onClick={() => {
              document.getElementById('login-form')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className='flex md:hidden items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xs font-medium rounded-full shadow-lg shadow-purple-500/30 transition-all hover:scale-105'
          >
            <FiLogIn className='w-3.5 h-3.5' />
            <span>Login</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className='relative z-10 container mx-auto px-4 md:px-6 py-6 md:py-12'>
        <div className='grid lg:grid-cols-2 gap-6 md:gap-12 items-center lg:items-start'>
          {/* Left Side - Institutional Content - Visível em todas as telas */}
          <div className='space-y-4 md:space-y-8'>
            {/* Hero Section */}
            <div className='space-y-3 md:space-y-4' style={{ animation: 'fadeInUp 0.8s ease-out' }}>
              <div className='inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-purple-500/20 rounded-full border border-purple-500/30 animate-pulse hover:scale-105 transition-transform cursor-default'>
                <FiCheckCircle className='w-3 md:w-4 h-3 md:h-4 text-purple-300' />
                <span className='text-xs md:text-sm text-purple-200'>
                  {t('landing.hero.badge', 'Largest P2P Marketplace in Latin America')}
                </span>
              </div>

              <h2 className='text-2xl md:text-5xl font-bold text-white leading-tight'>
                {t('landing.hero.title', 'Trade Crypto with')}
                <span className='block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text animate-gradient'>
                  {t('landing.hero.subtitle', 'Security & Intelligence')}
                </span>
              </h2>

              <p className='text-sm md:text-xl text-gray-300'>
                {t(
                  'landing.hero.description',
                  'The only platform that combines the security of owning your private keys with AI intelligence that protects your investments.'
                )}
              </p>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4'>
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className='text-center p-3 md:p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:border-purple-500/30 hover:scale-105 transition-all duration-300 cursor-default group relative overflow-hidden'
                  style={{
                    animation: `fadeInUp 0.6s ease-out forwards`,
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0,
                  }}
                >
                  {/* Shimmer effect */}
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000' />

                  <div className='relative'>
                    <div className='text-xl md:text-2xl font-bold text-white group-hover:text-purple-300 transition-colors'>
                      {stat.value}
                    </div>
                    <div className='text-xs md:text-sm text-gray-400 group-hover:text-gray-300 transition-colors'>
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Features Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4'>
              {features.map((feature, index) => (
                <div
                  key={index}
                  className='p-3 md:p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300 group relative overflow-hidden'
                  style={{
                    animation: `fadeInUp 0.6s ease-out forwards`,
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0,
                  }}
                >
                  {/* Hover Effect Background */}
                  <div className='absolute inset-0 bg-gradient-to-br from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/10 group-hover:to-blue-500/10 transition-all duration-300' />

                  <div className='relative flex items-start gap-2 md:gap-3'>
                    <div className='flex-shrink-0 w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg shadow-purple-500/0 group-hover:shadow-purple-500/30'>
                      <feature.icon className='w-4 h-4 md:w-5 md:h-5 text-purple-300 group-hover:text-purple-200 transition-colors' />
                    </div>
                    <div>
                      <h3 className='text-sm md:text-base font-semibold text-white mb-0.5 md:mb-1 group-hover:text-purple-200 transition-colors'>
                        {feature.title}
                      </h3>
                      <p className='text-xs md:text-sm text-gray-400 group-hover:text-gray-300 transition-colors'>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div className='flex items-center gap-3 md:gap-6 p-3 md:p-4 bg-green-500/10 backdrop-blur-sm rounded-lg border border-green-500/20'>
              <FiCheckCircle className='w-5 h-5 md:w-6 md:h-6 text-green-400 flex-shrink-0' />
              <div className='text-xs md:text-sm text-gray-300'>
                {t(
                  'landing.trust',
                  'Audited & Certified • Bank-level Security • 24/7 Support in Portuguese'
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Login Card */}
          <div
            id='login-form'
            className='w-full max-w-md mx-auto lg:ml-auto scroll-mt-4'
            style={{ animation: 'cardSlideIn 0.8s ease-out' }}
          >
            {step === 'login' ? (
              <div className='bg-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/20 shadow-2xl p-5 md:p-8 hover:shadow-purple-500/20 transition-shadow duration-500 relative overflow-hidden group'>
                {/* Animated gradient background on hover */}
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/0 via-pink-500/0 to-blue-500/0 group-hover:from-purple-500/5 group-hover:via-pink-500/5 group-hover:to-blue-500/5 transition-all duration-500' />

                {/* Glowing border effect */}
                <div className='absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500' />

                <div className='relative'>
                  {/* Card Header */}
                  <div className='text-center mb-6 md:mb-8'>
                    <div
                      className='mx-auto w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 p-2 md:p-3 border-2 border-white/20 shadow-2xl shadow-purple-500/30 hover:scale-110 hover:rotate-6 transition-all duration-300 cursor-pointer'
                      style={{ animation: 'glow 2s ease-in-out infinite' }}
                    >
                      <img
                        src='/images/logos/wn-icon.png'
                        alt='WOLK NOW'
                        className='w-full h-full object-contain drop-shadow-2xl'
                      />
                    </div>
                    <h3 className='text-xl md:text-2xl font-bold text-white mb-1 md:mb-2'>
                      {t('auth.login', 'Login')}
                    </h3>
                    <p className='text-sm md:text-base text-gray-400'>
                      {t('auth.loginSubtitle', 'Access your WOLK NOW account')}
                    </p>
                  </div>

                  {/* Error Message */}
                  {loginMutation.error && (
                    <div className='mb-4 md:mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 md:p-4'>
                      <div className='flex items-center gap-2'>
                        <FiShield className='w-3 md:w-4 h-3 md:h-4 text-red-400' />
                        <p className='text-xs md:text-sm text-red-400'>
                          {loginMutation.error.message || t('auth.loginError', 'Login error')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Login Form */}
                  <form onSubmit={handleSubmit} className='space-y-4 md:space-y-5'>
                    {/* Email Field */}
                    <div>
                      <label className='block text-xs md:text-sm font-medium text-gray-300 mb-1.5 md:mb-2'>
                        {t('auth.email', 'Email')}
                      </label>
                      <input
                        type='email'
                        name='email'
                        value={formData.email}
                        onChange={handleChange}
                        placeholder='you@example.com'
                        className={`w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base bg-white/5 border ${
                          formErrors.email ? 'border-red-500/50' : 'border-white/10'
                        } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
                      />
                      {formErrors.email && (
                        <p className='mt-1 text-xs md:text-sm text-red-400'>{formErrors.email}</p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div>
                      <label className='block text-xs md:text-sm font-medium text-gray-300 mb-1.5 md:mb-2'>
                        {t('auth.password', 'Password')}
                      </label>
                      <div className='relative'>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name='password'
                          value={formData.password}
                          onChange={handleChange}
                          placeholder='••••••••'
                          className={`w-full px-3 md:px-4 py-2.5 md:py-3 pr-10 md:pr-12 text-sm md:text-base bg-white/5 border ${
                            formErrors.password ? 'border-red-500/50' : 'border-white/10'
                          } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors'
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p className='mt-1 text-sm text-red-400'>{formErrors.password}</p>
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
                        <span className='text-sm text-gray-300'>
                          {t('auth.rememberMe', 'Remember me')}
                        </span>
                      </label>
                      <Link
                        to='/forgot-password'
                        className='text-sm text-purple-400 hover:text-purple-300'
                      >
                        {t('auth.forgotPassword', 'Forgot password?')}
                      </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                      type='submit'
                      disabled={isLoading}
                      className='w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      {isLoading ? t('auth.loggingIn', 'Logging in...') : t('auth.login', 'Login')}
                    </button>
                  </form>

                  {/* Register Link */}
                  <div className='mt-6 text-center'>
                    <p className='text-gray-400'>
                      {t('auth.noAccount', "Don't have an account?")}{' '}
                      <Link
                        to='/register'
                        className='text-purple-400 hover:text-purple-300 font-semibold'
                      >
                        {t('auth.register', 'Sign up')}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // 2FA Form
              <div className='bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8'>
                <div className='text-center mb-8'>
                  <div className='mx-auto w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 p-3 border-2 border-green-500/30 shadow-2xl shadow-green-500/30 hover:scale-110 transition-all duration-300'>
                    <img
                      src='/images/logos/wn-icon.png'
                      alt='WOLK NOW'
                      className='w-full h-full object-contain drop-shadow-2xl'
                    />
                  </div>
                  <h3 className='text-2xl font-bold text-white mb-2'>
                    {t('auth.2fa', 'Two-Factor Authentication')}
                  </h3>
                  <p className='text-gray-400'>
                    {t('auth.2faSubtitle', 'Enter the 6-digit code from your authenticator app')}
                  </p>
                </div>

                {formErrors.code && (
                  <div className='mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4'>
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
