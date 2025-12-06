import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { 
  GraduationCap,
  BookOpen,
  PlayCircle,
  Users,
  Award,
  Clock,
  Star,
  CheckCircle,
  Download,
  Calendar,
  Video,
  FileText,
  Headphones,
  TrendingUp,
  BarChart3,
  Shield,
  Zap,
  Globe,
  MessageSquare,
  Search,
  Filter,
  ChevronRight,
  Eye,
  Heart,
  Share,
  Bookmark
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  level: 'Iniciante' | 'Intermediário' | 'Avançado'
  duration: string
  modules: number
  students: number
  rating: number
  price: number
  isFree: boolean
  category: string
  instructor: string
  thumbnail?: string
}

interface Webinar {
  id: string
  title: string
  description: string
  date: string
  duration: string
  speaker: string
  attendees: number
  isLive: boolean
  topics: string[]
}

interface Article {
  id: string
  title: string
  excerpt: string
  category: string
  readTime: string
  author: string
  publishDate: string
  views: number
  likes: number
}

const courses: Course[] = [
  {
    id: '1',
    title: 'Introdução às Criptomoedas',
    description: 'Aprenda os fundamentos das criptomoedas, blockchain e como começar a investir',
    level: 'Iniciante',
    duration: '4 horas',
    modules: 8,
    students: 12543,
    rating: 4.8,
    price: 0,
    isFree: true,
    category: 'Básico',
    instructor: 'Prof. Carlos Silva'
  },
  {
    id: '2',
    title: 'Trading Técnico Avançado',
    description: 'Domine análise técnica, indicadores e estratégias de trading profissional',
    level: 'Avançado',
    duration: '12 horas',
    modules: 15,
    students: 3421,
    rating: 4.9,
    price: 299,
    isFree: false,
    category: 'Trading',
    instructor: 'Ana Rodrigues'
  },
  {
    id: '3',
    title: 'DeFi e Yield Farming',
    description: 'Explore o mundo das finanças descentralizadas e oportunidades de yield',
    level: 'Intermediário',
    duration: '8 horas',
    modules: 12,
    students: 5678,
    rating: 4.7,
    price: 199,
    isFree: false,
    category: 'DeFi',
    instructor: 'João Santos'
  },
  {
    id: '4',
    title: 'Segurança em Crypto',
    description: 'Aprenda a proteger seus investimentos e evitar golpes comuns',
    level: 'Intermediário',
    duration: '6 horas',
    modules: 10,
    students: 8934,
    rating: 4.9,
    price: 0,
    isFree: true,
    category: 'Segurança',
    instructor: 'Maria Oliveira'
  }
]

const webinars: Webinar[] = [
  {
    id: '1',
    title: 'Bitcoin em 2024: Perspectivas e Análises',
    description: 'Discussão sobre o futuro do Bitcoin e tendências de mercado',
    date: '2024-12-01T19:00:00Z',
    duration: '1h 30min',
    speaker: 'Dr. Fernando Costa',
    attendees: 2543,
    isLive: false,
    topics: ['Bitcoin', 'Análise técnica', 'Previsões']
  },
  {
    id: '2',
    title: 'Estratégias de Portfolio Crypto',
    description: 'Como diversificar e gerenciar um portfólio de criptomoedas',
    date: '2024-12-05T18:00:00Z',
    duration: '1h',
    speaker: 'Patricia Mendes',
    attendees: 1876,
    isLive: true,
    topics: ['Portfolio', 'Diversificação', 'Gestão de risco']
  }
]

const articles: Article[] = [
  {
    id: '1',
    title: 'O Que São Smart Contracts e Como Funcionam?',
    excerpt: 'Entenda os contratos inteligentes e seu papel no ecossistema blockchain',
    category: 'Tecnologia',
    readTime: '5 min',
    author: 'Tech Team',
    publishDate: '2024-11-20',
    views: 15420,
    likes: 234
  },
  {
    id: '2',
    title: '5 Erros Comuns no Trading de Criptomoedas',
    excerpt: 'Evite os principais erros que custam caro aos traders iniciantes',
    category: 'Trading',
    readTime: '7 min',
    author: 'Ana Rodrigues',
    publishDate: '2024-11-18',
    views: 9876,
    likes: 187
  },
  {
    id: '3',
    title: 'Guia Completo de Staking: Como Gerar Renda Passiva',
    excerpt: 'Aprenda a fazer staking e gerar rendimentos com suas criptomoedas',
    category: 'Investimento',
    readTime: '10 min',
    author: 'João Santos',
    publishDate: '2024-11-15',
    views: 12340,
    likes: 298
  }
]

const stats = [
  { label: 'Estudantes Ativos', value: '50K+', icon: Users },
  { label: 'Cursos Disponíveis', value: '200+', icon: BookOpen },
  { label: 'Horas de Conteúdo', value: '1.5K+', icon: PlayCircle },
  { label: 'Certificados Emitidos', value: '25K+', icon: Award }
]

export const EducationPage = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'courses' | 'webinars' | 'articles' | 'certificates'>('courses')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const categories = [
    { id: 'all', name: 'Todos', count: courses.length },
    { id: 'Básico', name: 'Básico', count: courses.filter(c => c.category === 'Básico').length },
    { id: 'Trading', name: 'Trading', count: courses.filter(c => c.category === 'Trading').length },
    { id: 'DeFi', name: 'DeFi', count: courses.filter(c => c.category === 'DeFi').length },
    { id: 'Segurança', name: 'Segurança', count: courses.filter(c => c.category === 'Segurança').length }
  ]

  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Academia HOLD
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-3xl mx-auto">
              Aprenda sobre criptomoedas e trading com nossos cursos, webinars e conteúdos exclusivos
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  <span>Cursos Gratuitos</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  <span>Certificados</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  <span>Comunidade Ativa</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors">
                Começar Aprendendo
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-purple-600 transition-colors">
                Ver Cursos
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
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <stat.icon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {stat.label}
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
              { id: 'courses' as const, label: 'Cursos', icon: BookOpen },
              { id: 'webinars' as const, label: 'Webinars', icon: Video },
              { id: 'articles' as const, label: 'Artigos', icon: FileText },
              { id: 'certificates' as const, label: 'Certificados', icon: Award }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-600 dark:text-gray-300 hover:text-purple-600'
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
          {activeTab === 'courses' && (
            <div>
              {/* Search and Filters */}
              <div className="mb-12">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Buscar cursos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <Filter className="w-4 h-4" />
                      Filtros
                    </button>
                  </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-3">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {category.name} ({category.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCourses.map((course) => (
                  <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow group">
                    {/* Course Thumbnail */}
                    <div className="h-48 bg-gradient-to-br from-purple-400 to-blue-500 relative overflow-hidden">
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          course.isFree 
                            ? 'bg-green-500 text-white' 
                            : 'bg-yellow-500 text-black'
                        }`}>
                          {course.isFree ? 'Gratuito' : `R$ ${course.price}`}
                        </span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          course.level === 'Iniciante' ? 'bg-green-100 text-green-800' :
                          course.level === 'Intermediário' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {course.level}
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 text-white">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="w-5 h-5" />
                          <span className="font-medium">{course.modules} módulos</span>
                        </div>
                      </div>
                    </div>

                    {/* Course Content */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          {course.category}
                        </span>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4 mr-1" />
                          {course.duration}
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {course.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        {course.description}
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Users className="w-4 h-4 mr-1" />
                            {course.students.toLocaleString()} alunos
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white ml-1">
                            {course.rating}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Instrutor: {course.instructor}
                      </div>

                      <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center">
                        {course.isFree ? 'Começar Agora' : 'Ver Detalhes'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'webinars' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Webinars e Eventos
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Participe de discussões ao vivo com especialistas do mercado
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {webinars.map((webinar) => (
                  <div key={webinar.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {webinar.isLive ? (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                              <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                              AO VIVO
                            </span>
                          ) : (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              AGENDADO
                            </span>
                          )}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {webinar.duration}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {webinar.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {webinar.description}
                        </p>
                      </div>
                      <Video className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(webinar.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4 mr-2" />
                        {webinar.attendees} participantes
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        Palestrante: {webinar.speaker}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {webinar.topics.map((topic, index) => (
                        <span key={index} className="bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 text-xs px-2 py-1 rounded">
                          {topic}
                        </span>
                      ))}
                    </div>

                    <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                      {webinar.isLive ? 'Participar Agora' : 'Inscrever-se'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'articles' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Artigos e Tutoriais
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Conteúdo atualizado sobre o mercado cripto e estratégias
                </p>
              </div>

              <div className="space-y-6">
                {articles.map((article) => (
                  <div key={article.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 text-sm px-3 py-1 rounded-full font-medium">
                            {article.category}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {article.readTime}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 hover:text-purple-600 cursor-pointer">
                          {article.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {article.excerpt}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <span>Por {article.author}</span>
                            <span className="mx-2">•</span>
                            <span>{new Date(article.publishDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {article.views.toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <Heart className="w-4 h-4 mr-1" />
                              {article.likes}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex items-center gap-2">
                        <button 
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Salvar artigo"
                        >
                          <Bookmark className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button 
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Compartilhar artigo"
                        >
                          <Share className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'certificates' && (
            <div className="text-center py-12">
              <div className="h-24 w-24 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mx-auto mb-6">
                <Award className="w-12 h-12 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Certificados Profissionais
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                Complete nossos cursos e receba certificados reconhecidos no mercado. 
                Comprove seus conhecimentos em blockchain e criptomoedas.
              </p>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm px-4 py-2 rounded-full inline-block mb-6">
                Em Desenvolvimento
              </div>
              <div className="max-w-md mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Funcionalidades Planejadas:
                  </h4>
                  <ul className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Certificados verificáveis blockchain
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Portfolio de certificações
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Integração com LinkedIn
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      Níveis de especialização
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Comece Sua Jornada de Aprendizado
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Junte-se a milhares de estudantes que já transformaram seus conhecimentos em cripto
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors">
              Explorar Cursos Gratuitos
            </button>
            <Link
              to="/register"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-purple-600 transition-colors"
            >
              Criar Conta
            </Link>
          </div>
          <p className="text-purple-100 text-sm mt-6">
            ✓ Cursos gratuitos ✓ Certificados ✓ Comunidade ativa ✓ Suporte especializado
          </p>
        </div>
      </div>
    </div>
  )
}
