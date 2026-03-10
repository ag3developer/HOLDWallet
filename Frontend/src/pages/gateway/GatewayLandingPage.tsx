/**
 * WolkPay Gateway - Landing Page
 * Design moderno inspirado em gateways de pagamento premium
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap,
  Shield,
  CreditCard,
  Wallet,
  ArrowRight,
  Check,
  Globe,
  Code,
  BarChart3,
  Clock,
  Building2,
  Headphones,
  Play,
  Star,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Cpu,
  Layers,
  MessageCircle,
  Mail,
  FileCode,
  Hexagon,
  FileJson,
  Gem,
  Box,
  Coffee,
} from 'lucide-react'
import { getCrossAppUrl } from '@/utils/domainDetection'

// Ícones de redes sociais customizados (SVG)
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox='0 0 24 24' fill='currentColor'>
    <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
  </svg>
)

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox='0 0 24 24' fill='currentColor'>
    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
  </svg>
)

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox='0 0 24 24' fill='currentColor'>
    <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
  </svg>
)

// Palavras que alternam no hero
const heroWords = ['PIX', 'Cripto', 'Global', 'Seguro', 'Rápido']

const features = [
  {
    icon: Zap,
    title: 'Integração em Minutos',
    description:
      'API REST simples com SDKs para todas as linguagens populares. Documentação completa.',
    color: 'from-amber-400 to-orange-500',
    iconBg: 'bg-gradient-to-br from-amber-400/20 to-orange-500/20',
  },
  {
    icon: CreditCard,
    title: 'PIX Instantâneo',
    description: 'Receba pagamentos PIX 24/7 com confirmação em segundos via webhook.',
    color: 'from-emerald-400 to-teal-500',
    iconBg: 'bg-gradient-to-br from-emerald-400/20 to-teal-500/20',
  },
  {
    icon: Wallet,
    title: 'Cripto sem Volatilidade',
    description: 'Aceite Bitcoin, Ethereum e receba em stablecoins USDT/USDC automaticamente.',
    color: 'from-purple-400 to-pink-500',
    iconBg: 'bg-gradient-to-br from-purple-400/20 to-pink-500/20',
  },
  {
    icon: Shield,
    title: 'Segurança Enterprise',
    description: 'Criptografia de ponta, 2FA obrigatório e conformidade com regulações.',
    color: 'from-blue-400 to-cyan-500',
    iconBg: 'bg-gradient-to-br from-blue-400/20 to-cyan-500/20',
  },
  {
    icon: Globe,
    title: 'Alcance Global',
    description: 'Receba de qualquer lugar do mundo com conversão automática para BRL.',
    color: 'from-indigo-400 to-violet-500',
    iconBg: 'bg-gradient-to-br from-indigo-400/20 to-violet-500/20',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Completo',
    description: 'Relatórios em tempo real, analytics avançados e exportação de dados.',
    color: 'from-rose-400 to-pink-500',
    iconBg: 'bg-gradient-to-br from-rose-400/20 to-pink-500/20',
  },
]

const benefits = [
  { text: 'Taxa competitiva a partir de 0.99%', icon: TrendingUp },
  { text: 'Liquidação em até 1 dia útil', icon: Clock },
  { text: 'Sem mensalidade ou taxa de setup', icon: Sparkles },
  { text: 'Suporte técnico 24/7', icon: Headphones },
  { text: 'Webhooks em tempo real', icon: Zap },
  { text: 'API RESTful documentada', icon: Code },
]

const pricingPlans = [
  {
    name: 'Starter',
    description: 'Para pequenos negócios',
    price: '0',
    period: '/mês',
    features: [
      'Até R$ 50.000/mês',
      'Taxa: 1.99% PIX / 2.99% Cripto',
      'Dashboard básico',
      'Suporte por email',
      '1 API Key',
    ],
    cta: 'Começar Grátis',
    popular: false,
    gradient: 'from-slate-600 to-slate-700',
  },
  {
    name: 'Business',
    description: 'Para empresas em crescimento',
    price: '299',
    period: '/mês',
    features: [
      'Até R$ 500.000/mês',
      'Taxa: 1.49% PIX / 2.49% Cripto',
      'Dashboard completo',
      'Suporte prioritário',
      'API Keys ilimitadas',
      'Webhooks customizados',
    ],
    cta: 'Começar Agora',
    popular: true,
    gradient: 'from-indigo-600 to-purple-600',
  },
  {
    name: 'Enterprise',
    description: 'Para grandes operações',
    price: 'Custom',
    period: '',
    features: [
      'Volume ilimitado',
      'Taxas negociadas',
      'Gerente dedicado',
      'SLA garantido',
      'White-label disponível',
      'Integração customizada',
    ],
    cta: 'Falar com Vendas',
    popular: false,
    gradient: 'from-slate-600 to-slate-700',
  },
]

const stats = [
  { value: 'R$ 2B+', label: 'Processado', icon: TrendingUp },
  { value: '99.99%', label: 'Uptime', icon: Cpu },
  { value: '< 3s', label: 'Confirmação PIX', icon: Zap },
  { value: '1.500+', label: 'Merchants', icon: Building2 },
]

const testimonials = [
  {
    name: 'Ricardo Santos',
    role: 'CTO, TechStore',
    avatar: 'RS',
    content:
      'Integramos o WolkPay em menos de 2 horas. A documentação é excelente e o suporte respondeu todas as dúvidas rapidamente.',
    rating: 5,
  },
  {
    name: 'Maria Oliveira',
    role: 'CEO, E-commerce Plus',
    avatar: 'MO',
    content:
      'Nosso faturamento aumentou 35% após aceitar cripto. Os clientes adoram a praticidade do PIX instantâneo.',
    rating: 5,
  },
  {
    name: 'Carlos Mendes',
    role: 'Founder, SaaS Brasil',
    avatar: 'CM',
    content:
      'A melhor taxa do mercado e liquidação super rápida. Recomendo para qualquer empresa que quer escalar.',
    rating: 5,
  },
]

const integrations = [
  { name: 'Python', icon: FileCode, color: 'text-yellow-400' },
  { name: 'Node.js', icon: Hexagon, color: 'text-green-400' },
  { name: 'PHP', icon: FileJson, color: 'text-indigo-400' },
  { name: 'Ruby', icon: Gem, color: 'text-red-400' },
  { name: 'Go', icon: Box, color: 'text-cyan-400' },
  { name: 'Java', icon: Coffee, color: 'text-orange-400' },
]

export default function GatewayLandingPage() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [newsletterEmail, setNewsletterEmail] = useState('')

  // Animação do texto rotativo no hero
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentWordIndex(prev => (prev + 1) % heroWords.length)
        setIsAnimating(false)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className='min-h-screen bg-slate-950 overflow-x-hidden'>
      {/* Animated Background */}
      <div className='fixed inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse' />
        <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000' />
        <div className='absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl animate-pulse delay-500' />
      </div>

      {/* Navigation */}
      <nav className='fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-20'>
            {/* Logo */}
            <Link to='/' className='flex items-center gap-3 group'>
              <div className='relative'>
                <div className='absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity' />
                <div className='relative w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg'>
                  <Layers className='w-6 h-6 text-white' />
                </div>
              </div>
              <div>
                <h1 className='text-xl font-bold text-white tracking-tight'>WolkPay</h1>
                <p className='text-[10px] text-indigo-400 font-medium tracking-widest uppercase'>
                  Gateway
                </p>
              </div>
            </Link>

            {/* Nav Links */}
            <div className='hidden md:flex items-center gap-1'>
              {[
                { label: 'Recursos', href: '#features' },
                { label: 'Preços', href: '#pricing' },
                { label: 'Docs', href: '/docs' },
                { label: 'API', href: '#api' },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  className='px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5'
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className='flex items-center gap-3'>
              <Link
                to='/login'
                className='hidden sm:flex px-4 py-2.5 text-sm text-slate-300 hover:text-white transition-colors'
              >
                Entrar
              </Link>
              <Link
                to='/register'
                className='group relative px-5 py-2.5 text-sm font-medium text-white rounded-xl overflow-hidden'
              >
                <div className='absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-transform group-hover:scale-105' />
                <div className='absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity' />
                <span className='relative flex items-center gap-2'>
                  Criar Conta
                  <ArrowRight className='w-4 h-4 group-hover:translate-x-0.5 transition-transform' />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className='relative pt-40 pb-32 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center'>
            {/* Badge */}
            <div className='inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-full mb-8 backdrop-blur-sm'>
              <Sparkles className='w-4 h-4 text-indigo-400' />
              <span className='text-sm text-indigo-300 font-medium'>
                Novo: PIX Copia e Cola + QR Code Dinâmico
              </span>
              <ChevronRight className='w-4 h-4 text-indigo-400' />
            </div>

            {/* Main Title with Animated Word */}
            <h1 className='text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-8 leading-[1.1] tracking-tight'>
              Gateway de Pagamentos
              <br />
              <span className='relative inline-block'>
                <span className='bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'>
                  <span
                    className={`inline-block transition-all duration-300 ${
                      isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                    }`}
                  >
                    {heroWords[currentWordIndex]}
                  </span>
                </span>
                <span className='absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full' />
              </span>
            </h1>

            {/* Subtitle */}
            <p className='text-xl sm:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed'>
              Aceite pagamentos <span className='text-white font-medium'>PIX</span> e{' '}
              <span className='text-white font-medium'>criptomoedas</span> com a API mais simples do
              mercado.
              <br className='hidden sm:block' />
              Integre em minutos, receba em segundos.
            </p>

            {/* CTA Buttons */}
            <div className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-20'>
              <Link
                to='/register'
                className='group relative w-full sm:w-auto px-8 py-4 text-white rounded-2xl font-semibold overflow-hidden shadow-lg shadow-indigo-500/25'
              >
                <div className='absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600' />
                <div className='absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity' />
                <span className='relative flex items-center justify-center gap-2'>
                  Começar Gratuitamente
                  <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
                </span>
              </Link>
              <Link
                to='/docs'
                className='group w-full sm:w-auto px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 text-white rounded-2xl font-semibold hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2'
              >
                <Play className='w-5 h-5 text-indigo-400' />
                Ver Demo
              </Link>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto'>
              {stats.map(stat => {
                const Icon = stat.icon
                return (
                  <div
                    key={stat.label}
                    className='group relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 hover:border-indigo-500/30 transition-all'
                  >
                    <div className='absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity' />
                    <Icon className='w-5 h-5 text-indigo-400 mx-auto mb-2' />
                    <div className='text-3xl font-bold text-white mb-1'>{stat.value}</div>
                    <div className='text-sm text-slate-500'>{stat.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Floating Cards Section - Tech Preview */}
      <section className='relative py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-6xl mx-auto'>
          <div className='grid lg:grid-cols-2 gap-12 items-center'>
            {/* Code Preview */}
            <div className='relative'>
              <div className='absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl' />
              <div className='relative bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl'>
                <div className='flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50'>
                  <div className='flex gap-1.5'>
                    <div className='w-3 h-3 rounded-full bg-red-500/80' />
                    <div className='w-3 h-3 rounded-full bg-yellow-500/80' />
                    <div className='w-3 h-3 rounded-full bg-green-500/80' />
                  </div>
                  <span className='ml-3 text-sm text-slate-400 font-mono'>criar_pagamento.py</span>
                </div>
                <pre className='p-6 text-sm overflow-x-auto'>
                  <code className='language-python'>
                    <span className='text-purple-400'>import</span>
                    <span className='text-slate-300'> wolkpay</span>
                    {'\n\n'}
                    <span className='text-slate-500'># Crie um pagamento em 3 linhas</span>
                    {'\n'}
                    <span className='text-slate-300'>client = wolkpay.</span>
                    <span className='text-amber-400'>Client</span>
                    <span className='text-slate-300'>(api_key=</span>
                    <span className='text-emerald-400'>"sk_live_..."</span>
                    <span className='text-slate-300'>)</span>
                    {'\n\n'}
                    <span className='text-slate-300'>payment = client.payments.</span>
                    <span className='text-amber-400'>create</span>
                    <span className='text-slate-300'>(</span>
                    {'\n'}
                    <span className='text-slate-300'> amount=</span>
                    <span className='text-blue-400'>99.90</span>
                    <span className='text-slate-300'>,</span>
                    {'\n'}
                    <span className='text-slate-300'> currency=</span>
                    <span className='text-emerald-400'>"BRL"</span>
                    <span className='text-slate-300'>,</span>
                    {'\n'}
                    <span className='text-slate-300'> method=</span>
                    <span className='text-emerald-400'>"pix"</span>
                    {'\n'}
                    <span className='text-slate-300'>)</span>
                    {'\n\n'}
                    <span className='text-purple-400'>print</span>
                    <span className='text-slate-300'>(payment.pix_qr_code)</span>
                  </code>
                </pre>
              </div>
            </div>

            {/* SDK Badges */}
            <div className='space-y-8'>
              <div>
                <h2 className='text-3xl font-bold text-white mb-4'>
                  SDKs para todas as linguagens
                </h2>
                <p className='text-lg text-slate-400'>
                  Integre o WolkPay em minutos com nossos SDKs oficiais. Documentação completa e
                  exemplos prontos para usar.
                </p>
              </div>
              <div className='grid grid-cols-3 gap-4'>
                {integrations.map(lang => {
                  const Icon = lang.icon
                  return (
                    <div
                      key={lang.name}
                      className='group p-4 bg-white/5 rounded-xl border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 transition-all cursor-pointer'
                    >
                      <Icon className={`w-8 h-8 mb-2 ${lang.color}`} />
                      <div className='text-sm font-medium text-white'>{lang.name}</div>
                    </div>
                  )
                })}
              </div>
              <Link
                to='/docs'
                className='inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors'
              >
                Ver documentação completa
                <ArrowRight className='w-4 h-4' />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id='features' className='py-32 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-20'>
            <span className='text-indigo-400 font-medium text-sm tracking-widest uppercase mb-4 block'>
              Recursos
            </span>
            <h2 className='text-4xl sm:text-5xl font-bold text-white mb-6'>
              Tudo que você precisa
            </h2>
            <p className='text-xl text-slate-400 max-w-2xl mx-auto'>
              Uma plataforma completa para aceitar PIX e criptomoedas no seu negócio
            </p>
          </div>

          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className='group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-500 hover:transform hover:-translate-y-1'
                >
                  <div className='absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />
                  <div
                    className={`relative w-14 h-14 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-6`}
                  >
                    <Icon className='w-7 h-7 text-white' />
                  </div>
                  <h3 className='relative text-xl font-semibold text-white mb-3'>
                    {feature.title}
                  </h3>
                  <p className='relative text-slate-400 leading-relaxed'>{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section with Video */}
      <section className='relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-purple-950/30 to-slate-950' />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-3xl' />

        <div className='relative max-w-7xl mx-auto'>
          <div className='grid lg:grid-cols-2 gap-16 items-center'>
            <div>
              <span className='text-indigo-400 font-medium text-sm tracking-widest uppercase mb-4 block'>
                Por que WolkPay?
              </span>
              <h2 className='text-4xl sm:text-5xl font-bold text-white mb-8 leading-tight'>
                Focados em{' '}
                <span className='bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent'>
                  simplicidade
                </span>
              </h2>
              <p className='text-xl text-slate-300 mb-10'>
                Para que você possa focar no que importa: seu negócio. Nós cuidamos da complexidade
                dos pagamentos.
              </p>
              <div className='grid sm:grid-cols-2 gap-4'>
                {benefits.map(benefit => {
                  const Icon = benefit.icon
                  return (
                    <div
                      key={benefit.text}
                      className='flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors'
                    >
                      <div className='w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0'>
                        <Icon className='w-5 h-5 text-indigo-400' />
                      </div>
                      <span className='text-sm text-slate-200 font-medium'>{benefit.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Video/Demo Card */}
            <div className='relative'>
              <div className='absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl' />
              <div className='relative aspect-video rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 overflow-hidden shadow-2xl'>
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='text-center'>
                    <button
                      title='Ver demonstração do WolkPay'
                      aria-label='Ver demonstração do WolkPay'
                      className='group relative w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4 hover:bg-white/20 transition-all'
                    >
                      <Play className='w-8 h-8 text-white ml-1' />
                      <div className='absolute inset-0 rounded-full border-2 border-white/30 animate-ping' />
                    </button>
                    <p className='text-slate-400 text-sm'>Ver demonstração</p>
                  </div>
                </div>
                {/* Decorative Elements */}
                <div className='absolute top-4 left-4 w-24 h-4 bg-white/10 rounded-full' />
                <div className='absolute top-4 right-4 flex gap-2'>
                  <div className='w-3 h-3 rounded-full bg-red-500/50' />
                  <div className='w-3 h-3 rounded-full bg-yellow-500/50' />
                  <div className='w-3 h-3 rounded-full bg-green-500/50' />
                </div>
                <div className='absolute bottom-6 left-6 right-6'>
                  <div className='h-2 bg-white/5 rounded-full mb-3' />
                  <div className='h-2 bg-white/5 rounded-full w-2/3' />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className='py-32 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-16'>
            <span className='text-indigo-400 font-medium text-sm tracking-widest uppercase mb-4 block'>
              Depoimentos
            </span>
            <h2 className='text-4xl sm:text-5xl font-bold text-white mb-6'>
              O que dizem nossos clientes
            </h2>
          </div>

          <div className='grid md:grid-cols-3 gap-8'>
            {testimonials.map(testimonial => (
              <div
                key={testimonial.name}
                className='group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all'
              >
                <div className='flex gap-1 mb-6'>
                  {Array.from({ length: testimonial.rating }, (_, i) => (
                    <Star
                      key={`star-${testimonial.name}-${i}`}
                      className='w-5 h-5 fill-amber-400 text-amber-400'
                    />
                  ))}
                </div>
                <p className='text-slate-300 mb-8 leading-relaxed'>"{testimonial.content}"</p>
                <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold'>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className='font-semibold text-white'>{testimonial.name}</div>
                    <div className='text-sm text-slate-500'>{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id='pricing' className='relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950' />

        <div className='relative max-w-7xl mx-auto'>
          <div className='text-center mb-20'>
            <span className='text-indigo-400 font-medium text-sm tracking-widest uppercase mb-4 block'>
              Preços
            </span>
            <h2 className='text-4xl sm:text-5xl font-bold text-white mb-6'>Transparente e justo</h2>
            <p className='text-xl text-slate-400 max-w-2xl mx-auto'>
              Sem surpresas. Pague apenas pelo que usar.
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
            {pricingPlans.map(plan => (
              <div
                key={plan.name}
                className={`relative group rounded-3xl transition-all duration-300 ${
                  plan.popular ? 'scale-105 z-10' : 'hover:scale-[1.02]'
                }`}
              >
                {plan.popular && (
                  <div className='absolute -inset-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-sm' />
                )}
                <div
                  className={`relative h-full p-8 rounded-3xl border ${
                    plan.popular
                      ? 'bg-gradient-to-br from-indigo-950 to-purple-950 border-indigo-500/50'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  {plan.popular && (
                    <div className='absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold rounded-full shadow-lg'>
                      Mais Popular
                    </div>
                  )}
                  <h3 className='text-2xl font-bold text-white mb-2'>{plan.name}</h3>
                  <p className='text-slate-400 text-sm mb-8'>{plan.description}</p>
                  <div className='mb-8'>
                    <span className='text-5xl font-bold text-white'>
                      {plan.price === 'Custom' ? '' : 'R$ '}
                      {plan.price}
                    </span>
                    <span className='text-slate-400 text-lg'>{plan.period}</span>
                  </div>
                  <ul className='space-y-4 mb-10'>
                    {plan.features.map(feature => (
                      <li key={feature} className='flex items-center gap-3 text-slate-300'>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            plan.popular ? 'bg-indigo-500/30' : 'bg-white/10'
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${plan.popular ? 'text-indigo-300' : 'text-emerald-400'}`}
                          />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to='/register'
                    className={`w-full py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400 shadow-lg shadow-indigo-500/25'
                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className='w-4 h-4' />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800' />
        <div className='absolute inset-0 opacity-30'>
          <div className='absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl' />
          <div className='absolute bottom-1/4 right-1/3 w-48 h-48 bg-white/10 rounded-full blur-2xl' />
        </div>

        <div className='relative max-w-4xl mx-auto text-center'>
          <div className='inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-8'>
            <Sparkles className='w-4 h-4 text-white' />
            <span className='text-sm text-white font-medium'>Comece agora, é grátis</span>
          </div>
          <h2 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight'>
            Pronto para começar a<br />
            receber pagamentos?
          </h2>
          <p className='text-xl text-white/80 mb-12 max-w-2xl mx-auto'>
            Crie sua conta em menos de 5 minutos e comece a processar pagamentos imediatamente.
          </p>
          <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
            <Link
              to='/register'
              className='group w-full sm:w-auto px-10 py-5 bg-white text-indigo-700 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-2xl flex items-center justify-center gap-2'
            >
              <Building2 className='w-5 h-5' />
              Criar Conta Grátis
              <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
            </Link>
            <a
              href='mailto:vendas@wolknow.com'
              className='w-full sm:w-auto px-10 py-5 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-bold hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-2'
            >
              <MessageCircle className='w-5 h-5' />
              Falar com Vendas
            </a>
          </div>
        </div>
      </section>

      {/* Newsletter + Footer */}
      <footer className='relative bg-slate-950 border-t border-white/5'>
        {/* Newsletter Section */}
        <div className='border-b border-white/5'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
            <div className='flex flex-col lg:flex-row items-center justify-between gap-8'>
              <div>
                <h3 className='text-2xl font-bold text-white mb-2'>
                  Fique por dentro das novidades
                </h3>
                <p className='text-slate-400'>
                  Receba atualizações sobre novos recursos e dicas de integração.
                </p>
              </div>
              <form className='flex w-full lg:w-auto gap-3'>
                <input
                  type='email'
                  placeholder='seu@email.com'
                  value={newsletterEmail}
                  onChange={e => setNewsletterEmail(e.target.value)}
                  className='flex-1 lg:w-80 px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors'
                />
                <button
                  type='submit'
                  title='Inscrever na newsletter'
                  className='px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:from-indigo-400 hover:to-purple-400 transition-all flex items-center gap-2'
                >
                  <Mail className='w-4 h-4' />
                  <span className='hidden sm:inline'>Inscrever</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Main Footer */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
          <div className='grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16'>
            {/* Brand */}
            <div className='lg:col-span-2'>
              <Link to='/' className='flex items-center gap-3 mb-6'>
                <div className='relative'>
                  <div className='absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-50' />
                  <div className='relative w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center'>
                    <Layers className='w-6 h-6 text-white' />
                  </div>
                </div>
                <div>
                  <h1 className='text-xl font-bold text-white'>WolkPay</h1>
                  <p className='text-[10px] text-indigo-400 font-medium tracking-widest uppercase'>
                    Gateway
                  </p>
                </div>
              </Link>
              <p className='text-slate-400 mb-6 max-w-sm'>
                Gateway de pagamentos PIX e Cripto para empresas modernas. Integre em minutos,
                receba em segundos.
              </p>
              <div className='flex gap-4'>
                {[
                  { label: 'Twitter', href: 'https://twitter.com/wolknow', icon: XIcon },
                  { label: 'GitHub', href: 'https://github.com/wolknow', icon: GitHubIcon },
                  {
                    label: 'LinkedIn',
                    href: 'https://linkedin.com/company/wolknow',
                    icon: LinkedInIcon,
                  },
                ].map(({ label, href, icon: Icon }) => (
                  <a
                    key={href}
                    href={href}
                    target='_blank'
                    rel='noopener noreferrer'
                    title={label}
                    aria-label={label}
                    className='w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all'
                  >
                    <Icon className='w-5 h-5' />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className='font-semibold text-white mb-6'>Produto</h4>
              <ul className='space-y-4 text-slate-400'>
                <li>
                  <a href='#features' className='hover:text-white transition-colors'>
                    Recursos
                  </a>
                </li>
                <li>
                  <a href='#pricing' className='hover:text-white transition-colors'>
                    Preços
                  </a>
                </li>
                <li>
                  <Link to='/docs' className='hover:text-white transition-colors'>
                    Documentação
                  </Link>
                </li>
                <li>
                  <a
                    href='https://status.wolknow.com'
                    className='hover:text-white transition-colors'
                  >
                    Status
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className='font-semibold text-white mb-6'>Empresa</h4>
              <ul className='space-y-4 text-slate-400'>
                <li>
                  <a
                    href={getCrossAppUrl('main', '/institutional')}
                    className='hover:text-white transition-colors'
                  >
                    Sobre
                  </a>
                </li>
                <li>
                  <a
                    href='mailto:contato@wolknow.com'
                    className='hover:text-white transition-colors'
                  >
                    Contato
                  </a>
                </li>
                <li>
                  <Link to='/terms' className='hover:text-white transition-colors'>
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link to='/privacy' className='hover:text-white transition-colors'>
                    Privacidade
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className='font-semibold text-white mb-6'>Suporte</h4>
              <ul className='space-y-4 text-slate-400'>
                <li>
                  <a
                    href='mailto:suporte@wolknow.com'
                    className='hover:text-white transition-colors'
                  >
                    suporte@wolknow.com
                  </a>
                </li>
                <li>
                  <a
                    href='https://wa.me/5511999999999'
                    className='hover:text-white transition-colors'
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <Link to='/docs' className='hover:text-white transition-colors'>
                    Central de Ajuda
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className='pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4'>
            <p className='text-slate-500 text-sm'>
              &copy; {new Date().getFullYear()} WolkNow Tecnologia. Todos os direitos reservados.
            </p>
            <div className='flex items-center gap-6 text-sm text-slate-500'>
              <Link to='/terms' className='hover:text-white transition-colors'>
                Termos
              </Link>
              <Link to='/privacy' className='hover:text-white transition-colors'>
                Privacidade
              </Link>
              <Link to='/cookies' className='hover:text-white transition-colors'>
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
