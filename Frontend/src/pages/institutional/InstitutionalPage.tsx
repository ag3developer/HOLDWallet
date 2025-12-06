import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { 
  Building2,
  Shield,
  Zap,
  Globe,
  Users,
  BarChart3,
  Lock,
  HeadphonesIcon,
  CheckCircle,
  Star,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  Award,
  Target,
  Briefcase,
  Settings,
  Database,
  Cloud,
  Code,
  Cpu,
  LineChart,
  Activity,
  FileText,
  Download
} from 'lucide-react'

interface Solution {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  benefits: string[]
}

interface CaseStudy {
  company: string
  industry: string
  challenge: string
  solution: string
  results: string[]
  logo?: string
}

const solutions: Solution[] = [
  {
    id: 'api-trading',
    title: 'API de Trading Institucional',
    description: 'Integre nossa infraestrutura de trading diretamente em seus sistemas',
    icon: Code,
    features: [
      'REST e WebSocket APIs',
      'Latência ultra-baixa (<1ms)',
      'Rate limiting personalizado',
      'Sandbox para testes',
      'Documentação completa'
    ],
    benefits: [
      'Integração rápida e fácil',
      'Execução de alta frequência',
      'Controle total sobre trades',
      'Monitoramento em tempo real'
    ]
  },
  {
    id: 'liquidity',
    title: 'Liquidez Premium',
    description: 'Acesso a pools de liquidez exclusivos para grandes volumes',
    icon: Database,
    features: [
      'Ordem mínima $100K',
      'Spread reduzido até 50%',
      'Execução garantida',
      'Market making dedicado',
      'Pricing dinâmico'
    ],
    benefits: [
      'Melhor preço garantido',
      'Execução para grandes volumes',
      'Redução de slippage',
      'Acesso 24/7'
    ]
  },
  {
    id: 'custody',
    title: 'Custódia Institucional',
    description: 'Armazenamento seguro e segurado para grandes volumes',
    icon: Lock,
    features: [
      'Cold storage 95%+',
      'Seguro até $500M',
      'Multi-signature',
      'Auditoria regular',
      'Compliance total'
    ],
    benefits: [
      'Segurança máxima',
      'Conformidade regulatória',
      'Gestão de riscos',
      'Transparência total'
    ]
  },
  {
    id: 'reporting',
    title: 'Relatórios Customizados',
    description: 'Análises e relatórios sob medida para sua organização',
    icon: FileText,
    features: [
      'Dashboards personalizados',
      'APIs de relatórios',
      'Exportação automática',
      'Métricas customizadas',
      'Alertas inteligentes'
    ],
    benefits: [
      'Visibilidade completa',
      'Automação de processos',
      'Compliance facilitado',
      'Tomada de decisão ágil'
    ]
  }
]

const caseStudies: CaseStudy[] = [
  {
    company: 'Global Investment Partners',
    industry: 'Gestão de Ativos',
    challenge: 'Necessidade de executar trades de alto volume com mínimo impacto no mercado',
    solution: 'Implementação da API de Trading + Liquidez Premium',
    results: [
      'Redução de 40% no custo de transação',
      'Melhoria de 60% na velocidade de execução',
      'Zero downtime em 12 meses'
    ]
  },
  {
    company: 'TechCorp Financial',
    industry: 'Tecnologia Financeira',
    challenge: 'Integração de serviços cripto em plataforma existente',
    solution: 'API completa + Custódia Institucional',
    results: [
      'Implementação em 30 dias',
      'Aumento de 200% na base de usuários',
      'Redução de 70% em custos operacionais'
    ]
  },
  {
    company: 'Hedge Fund Alpha',
    industry: 'Hedge Fund',
    challenge: 'Necessidade de relatórios customizados para compliance',
    solution: 'Sistema de Relatórios + Suporte Dedicado',
    results: [
      'Automação de 90% dos relatórios',
      'Redução de 50% no tempo de compliance',
      'Melhoria na transparência para investidores'
    ]
  }
]

const stats = [
  { label: 'Volume Institucional', value: '$50B+', description: 'Volume anual processado' },
  { label: 'Clientes Enterprise', value: '500+', description: 'Empresas confiam na HOLD' },
  { label: 'Uptime SLA', value: '99.99%', description: 'Garantia de disponibilidade' },
  { label: 'Compliance', value: '100%', description: 'Conformidade regulatória' }
]

export const InstitutionalPage = () => {
  const { t } = useTranslation()
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'solutions' | 'features' | 'pricing' | 'contact'>('solutions')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Building2 className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Soluções Institucionais
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Infraestrutura de nível empresarial para grandes volumes e necessidades complexas
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  <span>Conformidade Total</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  <span>Baixa Latência</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <HeadphonesIcon className="w-5 h-5 mr-2" />
                  <span>Suporte Dedicado</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-gray-900 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors">
                Agendar Demo
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-gray-900 transition-colors">
                Falar com Especialista
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white dark:bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </div>
                <div className="font-medium text-gray-900 dark:text-white mb-1">
                  {stat.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex">
            {[
              { id: 'solutions' as const, label: 'Soluções', icon: Briefcase },
              { id: 'features' as const, label: 'Recursos', icon: Settings },
              { id: 'pricing' as const, label: 'Pricing', icon: DollarSign },
              { id: 'contact' as const, label: 'Contato', icon: Phone }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {activeTab === 'solutions' && (
            <div>
              {/* Solutions Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                {solutions.map((solution) => (
                  <div
                    key={solution.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => setSelectedSolution(selectedSolution === solution.id ? null : solution.id)}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <solution.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-medium text-blue-600 cursor-pointer">
                        {selectedSolution === solution.id ? 'Ver menos' : 'Ver mais'}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {solution.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {solution.description}
                    </p>

                    {/* Features Preview */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recursos:</h4>
                      <ul className="space-y-2">
                        {solution.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                        {solution.features.length > 3 && (
                          <li className="text-sm text-blue-600">
                            +{solution.features.length - 3} recursos adicionais
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Expanded Content */}
                    {selectedSolution === solution.id && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Todos os Recursos:</h4>
                            <ul className="space-y-2">
                              {solution.features.map((feature, index) => (
                                <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Benefícios:</h4>
                            <ul className="space-y-2">
                              {solution.benefits.map((benefit, index) => (
                                <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                  <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="mt-6">
                          <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            Solicitar Informações
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Case Studies */}
              <div>
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Casos de Sucesso
                  </h2>
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    Veja como empresas transformaram suas operações com a HOLD
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {caseStudies.map((study, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {study.company}
                        </h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {study.industry}
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Desafio:</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {study.challenge}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Solução:</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {study.solution}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Resultados:</h4>
                          <ul className="space-y-1">
                            {study.results.map((result, idx) => (
                              <li key={idx} className="text-sm text-green-600 dark:text-green-400 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-2" />
                                {result}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: 'Performance Extrema',
                  description: 'Latência ultra-baixa e throughput alto para trading de alta frequência',
                  features: ['<1ms latência', '1M+ TPS', 'Auto-scaling', 'Global CDN']
                },
                {
                  icon: Shield,
                  title: 'Segurança Enterprise',
                  description: 'Proteção de nível militar com compliance total',
                  features: ['ISO 27001', 'SOC 2 Type II', 'PCI DSS', 'Pen testing']
                },
                {
                  icon: Globe,
                  title: 'Cobertura Global',
                  description: 'Presença em múltiplas jurisdições com compliance local',
                  features: ['45+ países', 'Multi-jurisdição', 'Compliance local', '24/7 support']
                },
                {
                  icon: Database,
                  title: 'Liquidez Profunda',
                  description: 'Acesso a pools de liquidez institucionais exclusivos',
                  features: ['$10B+ liquidez', 'Spread tight', 'Market making', 'Dark pools']
                },
                {
                  icon: Code,
                  title: 'API Completa',
                  description: 'Conjunto completo de APIs para integração total',
                  features: ['REST & WebSocket', 'GraphQL', 'Rate limiting', 'Sandbox']
                },
                {
                  icon: HeadphonesIcon,
                  title: 'Suporte Premium',
                  description: 'Equipe dedicada disponível 24/7 para suporte técnico',
                  features: ['Dedicated CSM', 'SLA garantido', 'Phone support', 'Priority queue']
                }
              ].map((feature, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Pricing Personalizado
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Soluções sob medida para suas necessidades específicas
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
                <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Pricing Empresarial
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                  Nosso time comercial trabalhará com você para criar um plano personalizado 
                  baseado no seu volume, necessidades técnicas e requisitos específicos.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Fatores de Pricing:
                    </h4>
                    <ul className="space-y-2">
                      {[
                        'Volume mensal de trading',
                        'Número de conexões API',
                        'Nível de suporte requerido',
                        'Recursos adicionais',
                        'Customizações específicas'
                      ].map((factor, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Incluído em Todos os Planos:
                    </h4>
                    <ul className="space-y-2">
                      {[
                        'Setup e onboarding gratuito',
                        'Suporte técnico dedicado',
                        'SLA de 99.99% uptime',
                        'Compliance e auditoria',
                        'Relatórios customizados'
                      ].map((included, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                          {included}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                    Solicitar Proposta
                  </button>
                  <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Agendar Demo
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Entre em Contato
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Nossa equipe especializada está pronta para ajudar sua empresa
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Telefone
                  </h3>
                  <p className="text-blue-600 dark:text-blue-400 font-medium mb-2">
                    +55 (11) 9999-9999
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Seg-Sex, 8h às 20h
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
                  <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Email
                  </h3>
                  <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                    enterprise@holdwallet.com
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Resposta em 4 horas
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 text-center">
                  <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Agendar Reunião
                  </h3>
                  <button className="text-purple-600 dark:text-purple-400 font-medium mb-2 hover:underline">
                    Calendly
                  </button>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Demo personalizada
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto para Escalar?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Junte-se a centenas de instituições que confiam na HOLD para suas operações
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-gray-900 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors">
              Começar Agora
            </button>
            <Link
              to="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-gray-900 transition-colors"
            >
              Falar com Especialista
            </Link>
          </div>
          <p className="text-blue-100 text-sm mt-6">
            ✓ Setup gratuito ✓ Suporte dedicado ✓ SLA garantido
          </p>
        </div>
      </div>
    </div>
  )
}
