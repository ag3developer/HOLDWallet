import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Wallet,
  ArrowLeftRight,
  Zap,
  MessageSquare,
  Shield,
  Users,
  Globe,
  CreditCard,
  Building2,
  GraduationCap,
  HeadphonesIcon,
  Lock,
  ChevronRight,
  Star,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Target,
  Award,
  Smartphone,
  LucideIcon,
  Brain,
  Coins,
  Receipt,
  UserPlus,
  RefreshCw,
} from 'lucide-react'

interface Service {
  id: string
  title: string
  description: string
  icon: LucideIcon
  features: string[]
  comingSoon?: boolean
  href: string
  category: 'trading' | 'financial' | 'support' | 'education'
}

interface Testimonial {
  name: string
  role: string
  company: string
  content: string
  rating: number
  avatar?: string
}

const services: Service[] = [
  {
    id: 'instant-trade',
    title: 'Negociação Instantânea (OTC)',
    description:
      'Compre e venda criptomoedas diretamente com a HOLD com cotação em tempo real e execução imediata',
    icon: Zap,
    features: [
      'Cotação em tempo real',
      'Execução instantânea',
      'Sem slippage',
      'PIX e transferência bancária',
    ],
    href: '/instant-trade',
    category: 'trading',
  },
  {
    id: 'p2p-trading',
    title: 'Trading P2P',
    description: 'Negocie diretamente com outros usuários com sistema de escrow e reputação',
    icon: ArrowLeftRight,
    features: [
      'Sistema de reputação',
      'Escrow automático',
      'Chat P2P integrado',
      'Múltiplos métodos de pagamento',
    ],
    href: '/p2p',
    category: 'trading',
  },
  {
    id: 'swap',
    title: 'Swap de Criptomoedas',
    description: 'Troque suas criptomoedas por outras de forma rápida e segura',
    icon: RefreshCw,
    features: ['Troca instantânea', 'Melhores taxas', 'Múltiplas moedas', 'Sem burocracia'],
    href: '/swap',
    category: 'trading',
  },
  {
    id: 'wolkpay',
    title: 'WolkPay - Gateway de Pagamento',
    description: 'Receba pagamentos em cripto via PIX. Gere links de pagamento para seus clientes',
    icon: CreditCard,
    features: [
      'Pagamentos via PIX',
      'Links de pagamento',
      'QR Code dinâmico',
      'Conversão automática',
    ],
    href: '/wolkpay',
    category: 'financial',
  },
  {
    id: 'earnpool',
    title: 'EarnPool - Renda Passiva',
    description: 'Forneça liquidez e ganhe recompensas diárias em USDT com seus ativos',
    icon: Coins,
    features: ['APY atrativo', 'Recompensas diárias', 'Pools diversificados', 'Saque flexível'],
    href: '/earnpool',
    category: 'financial',
  },
  {
    id: 'bill-payment',
    title: 'Pagamento de Contas',
    description: 'Pague suas contas e boletos usando suas criptomoedas',
    icon: Receipt,
    features: [
      'Pague boletos com cripto',
      'Contas de serviços',
      'Cashback em recompensas',
      'Histórico completo',
    ],
    href: '/bill-payment',
    category: 'financial',
  },
  {
    id: 'digital-wallet',
    title: 'Carteira Digital',
    description: 'Armazene, envie e receba múltiplas criptomoedas com segurança',
    icon: Wallet,
    features: ['Suporte a 50+ moedas', 'Envio e recebimento', 'Autenticação 2FA', 'Backup seguro'],
    href: '/wallet',
    category: 'financial',
  },
  {
    id: 'portfolio',
    title: 'Gestão de Portfólio',
    description: 'Monitore e analise todos os seus investimentos em um único lugar',
    icon: BarChart3,
    features: [
      'Dashboard completo',
      'Gráficos em tempo real',
      'Histórico de transações',
      'Relatórios detalhados',
    ],
    href: '/portfolio',
    category: 'financial',
  },
  {
    id: 'ai-intelligence',
    title: 'AI Intelligence',
    description: 'Análises avançadas com inteligência artificial para otimizar seus investimentos',
    icon: Brain,
    features: [
      'Análise de mercado IA',
      'Previsões de tendência',
      'Alertas inteligentes',
      'Recomendações personalizadas',
    ],
    href: '/ai-intelligence',
    category: 'financial',
  },
  {
    id: 'referral',
    title: 'Wolk Friends - Indicação',
    description: 'Indique amigos e ganhe recompensas em cripto a cada transação deles',
    icon: UserPlus,
    features: [
      'Bônus por indicação',
      'Comissões recorrentes',
      'Link personalizado',
      'Dashboard de ganhos',
    ],
    href: '/referral',
    category: 'financial',
  },
  {
    id: 'kyc-verification',
    title: 'Verificação KYC',
    description: 'Processo de verificação rápido e seguro para liberar todos os recursos',
    icon: Shield,
    features: [
      'Verificação em 24h',
      'Dados criptografados',
      'Conformidade regulatória',
      'Limites aumentados',
    ],
    href: '/kyc',
    category: 'support',
  },
  {
    id: 'chat',
    title: 'Chat P2P',
    description: 'Comunicação segura e direta com outros traders da plataforma',
    icon: MessageSquare,
    features: [
      'Mensagens criptografadas',
      'Envio de arquivos',
      'Histórico preservado',
      'Notificações em tempo real',
    ],
    href: '/chat',
    category: 'support',
  },
  {
    id: 'institutional',
    title: 'Soluções Institucionais',
    description: 'Serviços especializados para empresas e investidores institucionais',
    icon: Building2,
    features: [
      'API dedicada',
      'Liquidez premium',
      'Suporte prioritário',
      'Relatórios customizados',
    ],
    href: '/institutional',
    category: 'financial',
    comingSoon: true,
  },
  {
    id: 'education',
    title: 'Academia HOLD',
    description: 'Aprenda sobre criptomoedas e trading com nossos cursos e materiais',
    icon: GraduationCap,
    features: ['Cursos gratuitos', 'Guias práticos', 'Webinars', 'Comunidade ativa'],
    href: '/education',
    category: 'education',
    comingSoon: true,
  },
  {
    id: 'support',
    title: 'Suporte 24/7',
    description: 'Atendimento especializado disponível 24 horas por dia',
    icon: HeadphonesIcon,
    features: ['Chat ao vivo', 'Suporte por email', 'Central de ajuda', 'Tempo de resposta < 1h'],
    href: '/support',
    category: 'support',
  },
]

const testimonials: Testimonial[] = [
  {
    name: 'Maria Silva',
    role: 'Investidora',
    company: 'Freelancer',
    content:
      'A HOLD revolucionou minha experiência com criptomoedas. A execução instantânea é incrível!',
    rating: 5,
  },
  {
    name: 'João Santos',
    role: 'Trader',
    company: 'Crypto Investments',
    content: 'O sistema P2P é muito seguro e confiável. Já fiz centenas de trades sem problemas.',
    rating: 5,
  },
  {
    name: 'Ana Costa',
    role: 'CFO',
    company: 'TechStart',
    content:
      'As soluções institucionais da HOLD atendem perfeitamente nossas necessidades corporativas.',
    rating: 5,
  },
]

const stats = [
  { label: 'Usuários Ativos', value: '50K+', icon: Users },
  { label: 'Volume Negociado', value: 'R$ 500M+', icon: DollarSign },
  { label: 'Serviços Ativos', value: '12+', icon: Target },
  { label: 'Uptime', value: '99.9%', icon: CheckCircle },
]

export const ServicesPage = () => {
  const { t } = useTranslation()
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'trading' | 'financial' | 'support' | 'education'
  >('all')

  const filteredServices =
    activeCategory === 'all'
      ? services
      : services.filter(service => service.category === activeCategory)

  const categories = [
    { id: 'all' as const, name: 'Todos os Serviços', count: services.length },
    {
      id: 'trading' as const,
      name: 'Trading',
      count: services.filter(s => s.category === 'trading').length,
    },
    {
      id: 'financial' as const,
      name: 'Financeiro',
      count: services.filter(s => s.category === 'financial').length,
    },
    {
      id: 'education' as const,
      name: 'Educação',
      count: services.filter(s => s.category === 'education').length,
    },
    {
      id: 'support' as const,
      name: 'Suporte',
      count: services.filter(s => s.category === 'support').length,
    },
  ]

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Hero Section */}
      <div className='bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center'>
            <h1 className='text-4xl md:text-6xl font-bold mb-6'>Nossos Serviços</h1>
            <p className='text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto'>
              Soluções completas em criptomoedas para pessoas físicas e empresas
            </p>
            <div className='flex flex-wrap justify-center gap-4'>
              <div className='bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3'>
                <div className='flex items-center'>
                  <CheckCircle className='w-5 h-5 mr-2' />
                  <span>100% Seguro</span>
                </div>
              </div>
              <div className='bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3'>
                <div className='flex items-center'>
                  <Clock className='w-5 h-5 mr-2' />
                  <span>24/7 Disponível</span>
                </div>
              </div>
              <div className='bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3'>
                <div className='flex items-center'>
                  <Award className='w-5 h-5 mr-2' />
                  <span>Premiado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className='bg-white dark:bg-gray-800 py-16'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
            {stats.map((stat, index) => (
              <div key={index} className='text-center'>
                <div className='flex justify-center mb-4'>
                  <div className='h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center'>
                    <stat.icon className='w-8 h-8 text-blue-600 dark:text-blue-400' />
                  </div>
                </div>
                <div className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>
                  {stat.value}
                </div>
                <div className='text-gray-600 dark:text-gray-400'>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className='py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4'>
              Explore Nossos Serviços
            </h2>
            <p className='text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto'>
              Descubra todas as soluções que oferecemos para suas necessidades em criptomoedas
            </p>
          </div>

          {/* Category Filter */}
          <div className='flex flex-wrap justify-center gap-4 mb-12'>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700'
                } border border-gray-200 dark:border-gray-700`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* Services Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {filteredServices.map(service => (
              <div
                key={service.id}
                className='bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group'
              >
                <div className='p-8'>
                  {/* Service Header */}
                  <div className='flex items-start justify-between mb-6'>
                    <div className='h-14 w-14 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform'>
                      <service.icon className='w-7 h-7 text-blue-600 dark:text-blue-400' />
                    </div>
                    {service.comingSoon && (
                      <span className='bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-medium'>
                        Em Breve
                      </span>
                    )}
                  </div>

                  {/* Service Content */}
                  <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-3'>
                    {service.title}
                  </h3>
                  <p className='text-gray-600 dark:text-gray-400 mb-6'>{service.description}</p>

                  {/* Features */}
                  <ul className='space-y-2 mb-8'>
                    {service.features.map((feature, index) => (
                      <li key={index} className='flex items-center text-sm'>
                        <CheckCircle className='w-4 h-4 text-green-500 mr-3 flex-shrink-0' />
                        <span className='text-gray-600 dark:text-gray-400'>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  {service.comingSoon ? (
                    <button
                      disabled
                      className='w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-lg font-medium cursor-not-allowed'
                    >
                      Em Breve
                    </button>
                  ) : (
                    <Link
                      to={service.href}
                      className='w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center group'
                    >
                      Acessar Serviço
                      <ChevronRight className='w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform' />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className='bg-gray-100 dark:bg-gray-800 py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4'>
              Por que Escolher a HOLD?
            </h2>
            <p className='text-xl text-gray-600 dark:text-gray-400'>
              Tecnologia de ponta, segurança máxima e atendimento excepcional
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            <div className='text-center'>
              <div className='h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-6'>
                <Lock className='w-8 h-8 text-blue-600 dark:text-blue-400' />
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-3'>
                Segurança Militar
              </h3>
              <p className='text-gray-600 dark:text-gray-400'>
                Criptografia de nível militar e cold storage para máxima proteção dos seus ativos
              </p>
            </div>

            <div className='text-center'>
              <div className='h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6'>
                <Zap className='w-8 h-8 text-green-600 dark:text-green-400' />
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-3'>
                Execução Ultrarrápida
              </h3>
              <p className='text-gray-600 dark:text-gray-400'>
                Tecnologia de baixa latência para execução de trades em menos de 0.3 segundos
              </p>
            </div>

            <div className='text-center'>
              <div className='h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-6'>
                <HeadphonesIcon className='w-8 h-8 text-purple-600 dark:text-purple-400' />
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-3'>Suporte 24/7</h3>
              <p className='text-gray-600 dark:text-gray-400'>
                Equipe especializada disponível 24 horas por dia em múltiplos canais
              </p>
            </div>

            <div className='text-center'>
              <div className='h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-6'>
                <Globe className='w-8 h-8 text-orange-600 dark:text-orange-400' />
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-3'>
                Cobertura Global
              </h3>
              <p className='text-gray-600 dark:text-gray-400'>
                Atendemos 45+ países com conformidade regulatória local
              </p>
            </div>

            <div className='text-center'>
              <div className='h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6'>
                <Target className='w-8 h-8 text-red-600 dark:text-red-400' />
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-3'>
                Taxas Competitivas
              </h3>
              <p className='text-gray-600 dark:text-gray-400'>
                As menores taxas do mercado com transparência total nos custos
              </p>
            </div>

            <div className='text-center'>
              <div className='h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-6'>
                <Smartphone className='w-8 h-8 text-indigo-600 dark:text-indigo-400' />
              </div>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-3'>
                Multi-Plataforma
              </h3>
              <p className='text-gray-600 dark:text-gray-400'>
                Acesse seus investimentos em qualquer dispositivo, a qualquer momento
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className='py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4'>
              O que Nossos Clientes Dizem
            </h2>
            <p className='text-xl text-gray-600 dark:text-gray-400'>
              Milhares de usuários confiam na HOLD para suas transações
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700'
              >
                <div className='flex items-center mb-4'>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className='w-5 h-5 text-yellow-400 fill-current' />
                  ))}
                </div>
                <p className='text-gray-600 dark:text-gray-400 mb-6 italic'>
                  "{testimonial.content}"
                </p>
                <div className='flex items-center'>
                  <div className='h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center'>
                    <span className='text-white font-bold text-lg'>
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div className='ml-4'>
                    <div className='font-semibold text-gray-900 dark:text-white'>
                      {testimonial.name}
                    </div>
                    <div className='text-sm text-gray-600 dark:text-gray-400'>
                      {testimonial.role} • {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className='bg-gradient-to-r from-blue-600 to-purple-600 py-20'>
        <div className='max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8'>
          <h2 className='text-3xl md:text-4xl font-bold text-white mb-6'>Pronto para Começar?</h2>
          <p className='text-xl text-blue-100 mb-8'>
            Junte-se a mais de 50.000 usuários que confiam na HOLD para suas transações em
            criptomoedas
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              to='/register'
              className='bg-white text-blue-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors'
            >
              Criar Conta Gratuita
            </Link>
            <Link
              to='/contact'
              className='border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-blue-600 transition-colors'
            >
              Falar com Especialista
            </Link>
          </div>
          <p className='text-blue-100 text-sm mt-6'>
            ✓ Conta gratuita ✓ Sem taxas de setup ✓ Suporte 24/7
          </p>
        </div>
      </div>
    </div>
  )
}
