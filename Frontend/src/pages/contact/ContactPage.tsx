import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  MessageSquare,
  HeadphonesIcon,
  Globe,
  Shield,
  Star,
  Users,
  Building2,
  Zap
} from 'lucide-react'

interface ContactForm {
  name: string
  email: string
  subject: string
  message: string
  category: 'general' | 'support' | 'sales' | 'partnership'
}

export const ContactPage = () => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setSubmitted(true)
  }

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      value: 'contato@holdwallet.com',
      description: 'Resposta em até 2 horas'
    },
    {
      icon: Phone,
      title: 'Telefone',
      value: '+55 (11) 9999-9999',
      description: 'Seg-Sex, 9h às 18h'
    },
    {
      icon: MessageSquare,
      title: 'Chat ao Vivo',
      value: 'Disponível agora',
      description: '24/7 - Suporte imediato'
    },
    {
      icon: MapPin,
      title: 'Endereço',
      value: 'São Paulo, SP - Brasil',
      description: 'Escritório principal'
    }
  ]

  const departments = [
    {
      id: 'general',
      title: 'Dúvidas Gerais',
      icon: MessageSquare,
      description: 'Informações sobre produtos e serviços'
    },
    {
      id: 'support',
      title: 'Suporte Técnico',
      icon: HeadphonesIcon,
      description: 'Ajuda com problemas técnicos'
    },
    {
      id: 'sales',
      title: 'Vendas',
      icon: Building2,
      description: 'Soluções empresariais e institucionais'
    },
    {
      id: 'partnership',
      title: 'Parcerias',
      icon: Users,
      description: 'Oportunidades de negócios'
    }
  ]

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Mensagem Enviada!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Recebemos sua mensagem e entraremos em contato em breve.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Enviar Nova Mensagem
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Entre em Contato
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Nossa equipe especializada está aqui para ajudar você
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  <span>Resposta Rápida</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>Suporte 24/7</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  <span>100% Seguro</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info Cards */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {contactInfo.map((info, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
                <div className="h-14 w-14 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                  <info.icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {info.title}
                </h3>
                <p className="text-blue-600 dark:text-blue-400 font-medium mb-2">
                  {info.value}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {info.description}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Envie uma Mensagem
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Departamento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {departments.map((dept) => (
                      <label
                        key={dept.id}
                        className={`relative flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          formData.category === dept.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={dept.id}
                          checked={formData.category === dept.id}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <dept.icon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {dept.title}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Seu nome completo"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="seu@email.com"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assunto
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Como podemos ajudar?"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Descreva sua dúvida ou necessidade..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar Mensagem
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* FAQ & Additional Info */}
            <div className="space-y-8">
              {/* FAQ */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Perguntas Frequentes
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Qual é o tempo de resposta?
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Respondemos em até 2 horas durante horário comercial e até 24h nos finais de semana.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Como funciona o suporte técnico?
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Oferecemos suporte 24/7 via chat, email e telefone para resolver qualquer problema.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Posso agendar uma reunião?
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sim! Para soluções empresariais, oferecemos reuniões personalizadas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Why Choose Us */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-8 border border-blue-200 dark:border-blue-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Por que Escolher a HOLD?
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Star className="w-5 h-5 text-yellow-500 mr-3 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Atendimento Premium
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Equipe especializada e dedicada ao seu sucesso
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-green-500 mr-3 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Segurança Total
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Proteção máxima para seus dados e investimentos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Globe className="w-5 h-5 text-blue-500 mr-3 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Presença Global
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Atendemos clientes em mais de 45 países
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
