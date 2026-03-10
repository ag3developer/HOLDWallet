/**
 * WolkPay Gateway - Landing Page
 * Página de marketing para o gateway de pagamentos B2B
 */

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
  Lock,
  RefreshCw,
  Building2,
  Users,
  Headphones,
} from 'lucide-react'
import { getCrossAppUrl } from '@/utils/domainDetection'

const features = [
  {
    icon: Zap,
    title: 'Integração em Minutos',
    description:
      'API REST simples com SDKs para todas as linguagens populares. Documentação completa.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: CreditCard,
    title: 'PIX Instantâneo',
    description: 'Receba pagamentos PIX 24/7 com confirmação em segundos via webhook.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Wallet,
    title: 'Cripto sem Volatilidade',
    description: 'Aceite Bitcoin, Ethereum e receba em stablecoins USDT/USDC automaticamente.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Shield,
    title: 'Segurança Enterprise',
    description: 'Criptografia de ponta, 2FA obrigatório e conformidade com regulações.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Globe,
    title: 'Alcance Global',
    description: 'Receba de qualquer lugar do mundo com conversão automática para BRL.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Completo',
    description: 'Relatórios em tempo real, analytics avançados e exportação de dados.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
]

const benefits = [
  'Taxa competitiva a partir de 0.99%',
  'Liquidação em até 1 dia útil',
  'Sem mensalidade ou taxa de setup',
  'Suporte técnico 24/7',
  'Webhooks em tempo real',
  'API RESTful documentada',
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
  },
]

const stats = [
  { value: 'R$ 2B+', label: 'Processado' },
  { value: '99.99%', label: 'Uptime' },
  { value: '< 3s', label: 'Confirmação PIX' },
  { value: '1.500+', label: 'Merchants' },
]

export default function GatewayLandingPage() {
  return (
    <div className='min-h-screen bg-slate-900'>
      {/* Navigation */}
      <nav className='fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            {/* Logo */}
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center'>
                <CreditCard className='w-6 h-6 text-white' />
              </div>
              <div>
                <h1 className='text-xl font-bold text-white'>WolkPay</h1>
                <p className='text-xs text-slate-400'>Gateway</p>
              </div>
            </div>

            {/* Nav Links */}
            <div className='hidden md:flex items-center gap-8'>
              <a href='#features' className='text-slate-400 hover:text-white transition-colors'>
                Recursos
              </a>
              <a href='#pricing' className='text-slate-400 hover:text-white transition-colors'>
                Preços
              </a>
              <a
                href='https://docs.wolknow.com'
                target='_blank'
                rel='noopener noreferrer'
                className='text-slate-400 hover:text-white transition-colors'
              >
                Docs
              </a>
            </div>

            {/* CTA Buttons */}
            <div className='flex items-center gap-3'>
              <Link
                to='/login'
                className='px-4 py-2 text-slate-300 hover:text-white transition-colors'
              >
                Entrar
              </Link>
              <Link
                to='/register'
                className='px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors'
              >
                Criar Conta
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className='pt-32 pb-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center'>
            <div className='inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6'>
              <Zap className='w-4 h-4 text-indigo-400' />
              <span className='text-sm text-indigo-300'>Novo: Integração com PIX Copia e Cola</span>
            </div>

            <h1 className='text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight'>
              Gateway de Pagamentos
              <br />
              <span className='bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent'>
                PIX + Cripto
              </span>
            </h1>

            <p className='text-xl text-slate-400 mb-10 max-w-2xl mx-auto'>
              Aceite pagamentos PIX e criptomoedas na sua empresa com a API mais simples do mercado.
              Integre em minutos, receba em segundos.
            </p>

            <div className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-16'>
              <Link
                to='/register'
                className='w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group'
              >
                Começar Gratuitamente
                <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
              </Link>
              <a
                href='https://docs.wolknow.com'
                target='_blank'
                rel='noopener noreferrer'
                className='w-full sm:w-auto px-8 py-4 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2'
              >
                <Code className='w-5 h-5' />
                Ver Documentação
              </a>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto'>
              {stats.map(stat => (
                <div key={stat.label} className='text-center'>
                  <div className='text-3xl font-bold text-white mb-1'>{stat.value}</div>
                  <div className='text-sm text-slate-500'>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Code Preview */}
      <section className='py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50'>
        <div className='max-w-5xl mx-auto'>
          <div className='bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl'>
            <div className='flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700'>
              <div className='w-3 h-3 rounded-full bg-red-500' />
              <div className='w-3 h-3 rounded-full bg-yellow-500' />
              <div className='w-3 h-3 rounded-full bg-green-500' />
              <span className='ml-4 text-sm text-slate-400'>criar_pagamento.py</span>
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
                <span className='text-slate-300'>,</span>
                {'\n'}
                <span className='text-slate-300'> description=</span>
                <span className='text-emerald-400'>"Pedido #1234"</span>
                {'\n'}
                <span className='text-slate-300'>)</span>
                {'\n\n'}
                <span className='text-purple-400'>print</span>
                <span className='text-slate-300'>(payment.pix_qr_code)</span>
                <span className='text-slate-500'> # QR Code para pagamento</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id='features' className='py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl sm:text-4xl font-bold text-white mb-4'>
              Tudo que você precisa para receber pagamentos
            </h2>
            <p className='text-xl text-slate-400 max-w-2xl mx-auto'>
              Uma plataforma completa para aceitar PIX e criptomoedas no seu negócio
            </p>
          </div>

          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {features.map(feature => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className='p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-slate-600 transition-colors'
                >
                  <div
                    className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className='text-lg font-semibold text-white mb-2'>{feature.title}</h3>
                  <p className='text-slate-400'>{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className='py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-900/50 to-purple-900/50'>
        <div className='max-w-7xl mx-auto'>
          <div className='grid lg:grid-cols-2 gap-12 items-center'>
            <div>
              <h2 className='text-3xl sm:text-4xl font-bold text-white mb-6'>
                Por que escolher o WolkPay Gateway?
              </h2>
              <p className='text-xl text-slate-300 mb-8'>
                Focamos em simplicidade e confiabilidade para que você possa focar no que importa:
                seu negócio.
              </p>
              <ul className='space-y-4'>
                {benefits.map(benefit => (
                  <li key={benefit} className='flex items-center gap-3'>
                    <div className='w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0'>
                      <Check className='w-4 h-4 text-emerald-400' />
                    </div>
                    <span className='text-slate-200'>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='p-6 bg-slate-800/80 rounded-2xl border border-slate-700'>
                <Clock className='w-8 h-8 text-indigo-400 mb-3' />
                <h3 className='font-semibold text-white mb-1'>Rápido</h3>
                <p className='text-sm text-slate-400'>Confirmação PIX em segundos</p>
              </div>
              <div className='p-6 bg-slate-800/80 rounded-2xl border border-slate-700'>
                <Lock className='w-8 h-8 text-emerald-400 mb-3' />
                <h3 className='font-semibold text-white mb-1'>Seguro</h3>
                <p className='text-sm text-slate-400'>Criptografia enterprise</p>
              </div>
              <div className='p-6 bg-slate-800/80 rounded-2xl border border-slate-700'>
                <RefreshCw className='w-8 h-8 text-purple-400 mb-3' />
                <h3 className='font-semibold text-white mb-1'>Confiável</h3>
                <p className='text-sm text-slate-400'>99.99% de uptime</p>
              </div>
              <div className='p-6 bg-slate-800/80 rounded-2xl border border-slate-700'>
                <Headphones className='w-8 h-8 text-amber-400 mb-3' />
                <h3 className='font-semibold text-white mb-1'>Suporte</h3>
                <p className='text-sm text-slate-400'>Equipe técnica 24/7</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id='pricing' className='py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl sm:text-4xl font-bold text-white mb-4'>Preços transparentes</h2>
            <p className='text-xl text-slate-400 max-w-2xl mx-auto'>
              Sem surpresas. Pague apenas pelo que usar.
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-8 max-w-5xl mx-auto'>
            {pricingPlans.map(plan => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border ${
                  plan.popular
                    ? 'bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border-indigo-500'
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                {plan.popular && (
                  <div className='absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-sm font-medium rounded-full'>
                    Mais Popular
                  </div>
                )}
                <h3 className='text-xl font-bold text-white mb-2'>{plan.name}</h3>
                <p className='text-slate-400 text-sm mb-6'>{plan.description}</p>
                <div className='mb-6'>
                  <span className='text-4xl font-bold text-white'>
                    {plan.price === 'Custom' ? '' : 'R$ '}
                    {plan.price}
                  </span>
                  <span className='text-slate-400'>{plan.period}</span>
                </div>
                <ul className='space-y-3 mb-8'>
                  {plan.features.map(feature => (
                    <li key={feature} className='flex items-center gap-2 text-sm text-slate-300'>
                      <Check className='w-4 h-4 text-emerald-400 flex-shrink-0' />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to='/register'
                  className={`w-full py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className='w-4 h-4' />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 to-purple-700'>
        <div className='max-w-4xl mx-auto text-center'>
          <h2 className='text-3xl sm:text-4xl font-bold text-white mb-6'>
            Comece a receber pagamentos hoje
          </h2>
          <p className='text-xl text-indigo-100 mb-10'>
            Crie sua conta em menos de 5 minutos e comece a processar pagamentos imediatamente.
          </p>
          <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
            <Link
              to='/register'
              className='w-full sm:w-auto px-8 py-4 bg-white text-indigo-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2'
            >
              <Building2 className='w-5 h-5' />
              Criar Conta Grátis
            </Link>
            <a
              href='mailto:vendas@wolknow.com'
              className='w-full sm:w-auto px-8 py-4 bg-indigo-700 text-white rounded-xl font-semibold hover:bg-indigo-800 transition-colors flex items-center justify-center gap-2 border border-indigo-500'
            >
              <Users className='w-5 h-5' />
              Falar com Vendas
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 border-t border-slate-800'>
        <div className='max-w-7xl mx-auto'>
          <div className='grid md:grid-cols-4 gap-8 mb-12'>
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center'>
                  <CreditCard className='w-6 h-6 text-white' />
                </div>
                <div>
                  <h1 className='text-xl font-bold text-white'>WolkPay</h1>
                  <p className='text-xs text-slate-400'>Gateway</p>
                </div>
              </div>
              <p className='text-slate-400 text-sm'>
                Gateway de pagamentos PIX e Cripto para empresas modernas.
              </p>
            </div>
            <div>
              <h4 className='font-semibold text-white mb-4'>Produto</h4>
              <ul className='space-y-2 text-slate-400 text-sm'>
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
                  <a href='https://docs.wolknow.com' className='hover:text-white transition-colors'>
                    Documentação
                  </a>
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
              <h4 className='font-semibold text-white mb-4'>Empresa</h4>
              <ul className='space-y-2 text-slate-400 text-sm'>
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
                  <a href='/terms' className='hover:text-white transition-colors'>
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href='/privacy' className='hover:text-white transition-colors'>
                    Privacidade
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className='font-semibold text-white mb-4'>Suporte</h4>
              <ul className='space-y-2 text-slate-400 text-sm'>
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
              </ul>
            </div>
          </div>
          <div className='pt-8 border-t border-slate-800 text-center text-slate-500 text-sm'>
            <p>
              &copy; {new Date().getFullYear()} WolkNow Tecnologia. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
