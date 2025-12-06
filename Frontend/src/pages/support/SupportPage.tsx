import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { 
  HeadphonesIcon,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Send,
  FileText,
  Download,
  ExternalLink,
  Users,
  Zap,
  Shield,
  BookOpen,
  Settings,
  CreditCard,
  Smartphone,
  Globe,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Video,
  Calendar
} from 'lucide-react'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  helpful: number
  views: number
}

interface SupportCategory {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  articles: number
}

interface TicketResponse {
  id: string
  status: 'open' | 'pending' | 'resolved'
  priority: 'low' | 'medium' | 'high'
  subject: string
  lastUpdate: string
  category: string
}

const faqs: FAQ[] = [
  {
    id: '1',
    question: 'Como criar uma conta na HOLD?',
    answer: 'Para criar uma conta, clique em "Registrar" no topo da página, preencha suas informações pessoais e siga as instruções de verificação por email.',
    category: 'Conta',
    helpful: 245,
    views: 1520
  },
  {
    id: '2',
    question: 'Quais são as taxas de trading?',
    answer: 'Nossa taxa padrão é de 0.5% por transação. Para trading P2P, não cobramos taxas adicionais além das taxas de rede blockchain.',
    category: 'Trading',
    helpful: 189,
    views: 892
  },
  {
    id: '3',
    question: 'Como funciona a verificação KYC?',
    answer: 'O processo KYC requer um documento de identidade válido e comprovante de residência. A verificação geralmente é concluída em 24 horas.',
    category: 'Verificação',
    helpful: 156,
    views: 743
  },
  {
    id: '4',
    question: 'Minha transação não apareceu na carteira, o que fazer?',
    answer: 'Verifique o hash da transação no blockchain explorer. Transações podem levar alguns minutos para serem confirmadas dependendo da rede.',
    category: 'Carteira',
    helpful: 134,
    views: 456
  },
  {
    id: '5',
    question: 'Como ativar autenticação de dois fatores (2FA)?',
    answer: 'Vá em Configurações > Segurança > Autenticação 2FA. Use um app como Google Authenticator ou Authy para configurar.',
    category: 'Segurança',
    helpful: 298,
    views: 1876
  }
]

const supportCategories: SupportCategory[] = [
  {
    id: 'account',
    title: 'Conta e Registro',
    description: 'Criação de conta, login e configurações pessoais',
    icon: Users,
    articles: 15
  },
  {
    id: 'trading',
    title: 'Trading e Transações',
    description: 'Como fazer trades, P2P e negociação instantânea',
    icon: Zap,
    articles: 23
  },
  {
    id: 'wallet',
    title: 'Carteira Digital',
    description: 'Depósitos, saques e gerenciamento de fundos',
    icon: CreditCard,
    articles: 18
  },
  {
    id: 'security',
    title: 'Segurança',
    description: 'Proteção da conta, 2FA e práticas seguras',
    icon: Shield,
    articles: 12
  },
  {
    id: 'kyc',
    title: 'Verificação KYC',
    description: 'Processo de verificação de identidade',
    icon: CheckCircle,
    articles: 8
  },
  {
    id: 'mobile',
    title: 'App Mobile',
    description: 'Funcionalidades e troubleshooting do app',
    icon: Smartphone,
    articles: 10
  }
]

const mockTickets: TicketResponse[] = [
  {
    id: '#12345',
    status: 'pending',
    priority: 'medium',
    subject: 'Problema com verificação KYC',
    lastUpdate: '2024-11-25',
    category: 'Verificação'
  },
  {
    id: '#12344',
    status: 'resolved',
    priority: 'low',
    subject: 'Dúvida sobre taxas de trading',
    lastUpdate: '2024-11-24',
    category: 'Trading'
  }
]

const contactMethods = [
  {
    icon: MessageSquare,
    title: 'Chat ao Vivo',
    description: 'Resposta imediata para questões urgentes',
    availability: 'Disponível agora',
    responseTime: 'Imediato',
    color: 'blue'
  },
  {
    icon: Mail,
    title: 'Email',
    description: 'Para questões detalhadas e documentação',
    availability: 'suporte@holdwallet.com',
    responseTime: '< 4 horas',
    color: 'green'
  },
  {
    icon: Phone,
    title: 'Telefone',
    description: 'Suporte por voz para casos complexos',
    availability: '+55 (11) 9999-9999',
    responseTime: 'Seg-Sex, 9h-18h',
    color: 'purple'
  },
  {
    icon: Video,
    title: 'Video Call',
    description: 'Demonstração e suporte visual',
    availability: 'Agendamento necessário',
    responseTime: 'Conforme agenda',
    color: 'orange'
  }
]

export const SupportPage = () => {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, 'up' | 'down' | null>>({})
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'tickets' | 'guides'>('faq')
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    description: ''
  })

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const faqCategories = [
    { id: 'all', name: 'Todas', count: faqs.length },
    ...Array.from(new Set(faqs.map(faq => faq.category))).map(category => ({
      id: category,
      name: category,
      count: faqs.filter(faq => faq.category === category).length
    }))
  ]

  const handleFAQVote = (faqId: string, vote: 'up' | 'down') => {
    setHelpfulVotes(prev => ({
      ...prev,
      [faqId]: prev[faqId] === vote ? null : vote
    }))
  }

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate ticket submission
    console.log('Ticket submitted:', ticketForm)
    setTicketForm({ subject: '', category: 'general', priority: 'medium', description: '' })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <HeadphonesIcon className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Central de Ajuda
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Estamos aqui para ajudar você a aproveitar ao máximo a plataforma HOLD
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/70 w-6 h-6" />
                <input
                  type="text"
                  placeholder="Como podemos ajudar você hoje?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent text-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>Suporte 24/7</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  <span>Resposta Rápida</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  <span>98% Satisfação</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Contact Methods */}
      <div className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Formas de Contato
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Escolha o canal que melhor atende sua necessidade
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-600">
                <div className={`h-14 w-14 rounded-lg bg-${method.color}-100 dark:bg-${method.color}-900/20 flex items-center justify-center mx-auto mb-4`}>
                  <method.icon className={`w-7 h-7 text-${method.color}-600 dark:text-${method.color}-400`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {method.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {method.description}
                </p>
                <div className="space-y-1">
                  <div className={`text-${method.color}-600 dark:text-${method.color}-400 font-medium`}>
                    {method.availability}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {method.responseTime}
                  </div>
                </div>
                <button className={`w-full mt-4 bg-${method.color}-600 text-white py-2 px-4 rounded-lg hover:bg-${method.color}-700 transition-colors`}>
                  Iniciar Contato
                </button>
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
              { id: 'faq' as const, label: 'FAQ', icon: HelpCircle },
              { id: 'contact' as const, label: 'Contato', icon: MessageSquare },
              { id: 'tickets' as const, label: 'Tickets', icon: FileText },
              { id: 'guides' as const, label: 'Guias', icon: BookOpen }
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
          {activeTab === 'faq' && (
            <div>
              {/* Category Filters */}
              <div className="flex flex-wrap gap-3 mb-8">
                {faqCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {category.name} ({category.count})
                  </button>
                ))}
              </div>

              {/* FAQ List */}
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <div key={faq.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                      className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {faq.question}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                            {faq.category}
                          </span>
                          <span>{faq.views} visualizações</span>
                          <span>{faq.helpful} acham útil</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        {expandedFAQ === faq.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>
                    
                    {expandedFAQ === faq.id && (
                      <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
                        <div className="pt-4">
                          <p className="text-gray-700 dark:text-gray-300 mb-6">
                            {faq.answer}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Esta resposta foi útil?
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleFAQVote(faq.id, 'up')}
                                  className={`p-2 rounded-lg transition-colors ${
                                    helpfulVotes[faq.id] === 'up'
                                      ? 'bg-green-100 dark:bg-green-900/20 text-green-600'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleFAQVote(faq.id, 'down')}
                                  className={`p-2 rounded-lg transition-colors ${
                                    helpfulVotes[faq.id] === 'down'
                                      ? 'bg-red-100 dark:bg-red-900/20 text-red-600'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm">
                              <Copy className="w-4 h-4" />
                              Copiar link
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div>
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    Abrir Ticket de Suporte
                  </h2>
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    Descreva seu problema e nossa equipe entrará em contato
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                  <form onSubmit={handleTicketSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Categoria
                        </label>
                        <select
                          value={ticketForm.category}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                          title="Selecionar categoria do ticket"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="general">Geral</option>
                          <option value="account">Conta</option>
                          <option value="trading">Trading</option>
                          <option value="wallet">Carteira</option>
                          <option value="security">Segurança</option>
                          <option value="kyc">Verificação KYC</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Prioridade
                        </label>
                        <select
                          value={ticketForm.priority}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                          title="Selecionar prioridade do ticket"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assunto
                      </label>
                      <input
                        type="text"
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Descreva brevemente seu problema"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Descrição Detalhada
                      </label>
                      <textarea
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                        required
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Forneça o máximo de detalhes possível sobre o problema..."
                      />
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Tempo de resposta estimado: 4-6 horas
                      </div>
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Ticket
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Meus Tickets
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Acompanhe o status dos seus chamados
                </p>
              </div>

              <div className="space-y-4">
                {mockTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">
                            {ticket.id}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            ticket.status === 'open' ? 'bg-green-100 text-green-800' :
                            ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status === 'open' ? 'Aberto' :
                             ticket.status === 'pending' ? 'Pendente' : 'Resolvido'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {ticket.priority === 'high' ? 'Alta' :
                             ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {ticket.subject}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Categoria: {ticket.category}</span>
                          <span>Última atualização: {new Date(ticket.lastUpdate).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 font-medium">
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {mockTickets.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Nenhum ticket encontrado
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Você não possui tickets de suporte abertos
                  </p>
                  <button
                    onClick={() => setActiveTab('contact')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Abrir Novo Ticket
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'guides' && (
            <div>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Guias e Tutoriais
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Aprenda a usar todas as funcionalidades da HOLD
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {supportCategories.map((category) => (
                  <div key={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow group">
                    <div className="h-14 w-14 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <category.icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                      {category.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {category.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {category.articles} artigos
                      </span>
                      <button className="flex items-center text-blue-600 hover:text-blue-700 font-medium">
                        Ver guias
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Não Encontrou o que Procurava?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Nossa equipe está disponível 24/7 para ajudar você
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors">
              Falar com Atendente
            </button>
            <Link
              to="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Enviar Email
            </Link>
          </div>
          <p className="text-blue-100 text-sm mt-6">
            ✓ Resposta garantida em 4 horas ✓ Suporte especializado ✓ Satisfação de 98%
          </p>
        </div>
      </div>
    </div>
  )
}
