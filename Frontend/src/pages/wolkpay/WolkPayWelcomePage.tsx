/**
 * WolkPayWelcomePage - Página de Boas-Vindas após criação de conta
 * ================================================================
 *
 * Página que apresenta a WolkNow ao novo usuário após criar conta via WolkPay checkout.
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Check,
  Wallet,
  TrendingUp,
  Shield,
  ArrowRight,
  Sparkles,
  Globe,
  CreditCard,
  BadgeCheck,
  Users,
  BarChart3,
} from 'lucide-react'

export function WolkPayWelcomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [showContent, setShowContent] = useState(false)

  // Dados passados do checkout
  const { email } = (location.state as { email?: string }) || {}

  useEffect(() => {
    // Animação de entrada
    setTimeout(() => setShowContent(true), 100)
  }, [])

  const features = [
    {
      icon: Wallet,
      title: 'Carteira Multi-Crypto',
      description: 'Bitcoin, Ethereum, USDT e mais de 15 criptomoedas em um só lugar',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: CreditCard,
      title: 'WolkPay',
      description: 'Receba pagamentos em PIX e converta automaticamente para crypto',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: TrendingUp,
      title: 'P2P Trading',
      description: 'Compre e venda crypto diretamente com outros usuários',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: '2FA, biometria e criptografia de ponta a ponta',
      color: 'from-amber-500 to-orange-500',
    },
  ]

  const handleGoToLogin = () => {
    navigate('/auth/login', {
      state: {
        message: t('wolkpay.welcome.loginMessage'),
        email: email,
      },
    })
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 overflow-x-hidden overflow-y-auto touch-auto'>
      {/* Background Effects */}
      <div className='fixed inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl' />
        <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl' />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl' />
      </div>

      <div className='relative z-10 min-h-screen flex flex-col items-center py-8 px-4'>
        <div
          className={`max-w-2xl w-full transition-all duration-700 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Success Header */}
          <div className='text-center mb-8'>
            <div className='relative inline-block mb-6'>
              <div className='w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/30'>
                <Check className='w-12 h-12 text-white' strokeWidth={3} />
              </div>
              <div className='absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg'>
                <Sparkles className='w-4 h-4 text-white' />
              </div>
            </div>

            <h1 className='text-4xl md:text-5xl font-bold text-white mb-4'>
              {t('wolkpay.welcome.title', 'Bem-vindo à WolkNow!')}
            </h1>

            <p className='text-xl text-blue-200 mb-2'>
              {t('wolkpay.welcome.subtitle', 'Sua conta foi criada com sucesso')}
            </p>

            {email && (
              <div className='inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/80 text-sm'>
                <BadgeCheck className='w-4 h-4 text-green-400' />
                {email}
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-8'>
            {features.map(feature => (
              <div
                key={feature.title}
                className='bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300'
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}
                >
                  <feature.icon className='w-6 h-6 text-white' />
                </div>
                <h3 className='text-lg font-semibold text-white mb-2'>{feature.title}</h3>
                <p className='text-sm text-white/60'>{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className='flex items-center justify-center gap-8 mb-8'>
            <div className='text-center'>
              <div className='flex items-center justify-center gap-1 text-2xl font-bold text-white'>
                <Users className='w-5 h-5 text-blue-400' />
                50K+
              </div>
              <p className='text-xs text-white/50'>Usuários</p>
            </div>
            <div className='w-px h-10 bg-white/20' />
            <div className='text-center'>
              <div className='flex items-center justify-center gap-1 text-2xl font-bold text-white'>
                <Globe className='w-5 h-5 text-green-400' />
                15+
              </div>
              <p className='text-xs text-white/50'>Criptomoedas</p>
            </div>
            <div className='w-px h-10 bg-white/20' />
            <div className='text-center'>
              <div className='flex items-center justify-center gap-1 text-2xl font-bold text-white'>
                <BarChart3 className='w-5 h-5 text-purple-400' />
                R$10M+
              </div>
              <p className='text-xs text-white/50'>Transacionados</p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleGoToLogin}
            className='w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-2xl font-bold text-lg transition-all shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02]'
          >
            {t('wolkpay.welcome.loginButton', 'Acessar minha conta')}
            <ArrowRight className='w-6 h-6' />
          </button>

          {/* Footer Note */}
          <p className='text-center text-white/40 text-sm mt-6'>
            {t(
              'wolkpay.welcome.note',
              'Use o email e senha cadastrados para fazer login. Recomendamos ativar o 2FA para maior segurança.'
            )}
          </p>

          {/* Logo */}
          <div className='flex items-center justify-center gap-2 text-white/30 mt-8 pb-4'>
            <div className='w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center'>
              <span className='text-white font-bold text-sm'>W</span>
            </div>
            <span className='font-semibold'>WolkNow</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WolkPayWelcomePage
