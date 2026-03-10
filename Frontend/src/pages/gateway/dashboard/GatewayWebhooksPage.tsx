/**
 * WolkPay Gateway - Configuração de Webhooks
 * Gerenciar URL e eventos de webhook
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Webhook,
  ChevronLeft,
  RefreshCw,
  Copy,
  Check,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react'
import {
  getWebhookConfig,
  updateWebhookConfig,
  regenerateWebhookSecret,
  getWebhookEvents,
  type WebhookConfig,
  type WebhookEvent,
} from '../../../services/gatewayService'

export default function GatewayWebhooksPage() {
  const [config, setConfig] = useState<WebhookConfig | null>(null)
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Form
  const [webhookUrl, setWebhookUrl] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  // Copy
  const [copied, setCopied] = useState(false)

  // Events pagination
  const [eventsPage, setEventsPage] = useState(1)
  const [totalEvents, setTotalEvents] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadEvents()
  }, [eventsPage])

  const loadData = async () => {
    try {
      setLoading(true)
      const configData = await getWebhookConfig()
      setConfig(configData)
      setWebhookUrl(configData.webhook_url || '')
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async () => {
    try {
      const eventsData = await getWebhookEvents(eventsPage, 10)
      setEvents(eventsData.events)
      setTotalEvents(eventsData.total)
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    }
  }

  const handleSaveUrl = async () => {
    try {
      setSaving(true)
      await updateWebhookConfig(webhookUrl)
      await loadData()
    } catch (error) {
      console.error('Erro ao salvar URL:', error)
      alert('Não foi possível salvar a URL do webhook')
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateSecret = async () => {
    if (!confirm('Tem certeza que deseja regenerar o secret? O secret atual será invalidado.'))
      return

    try {
      setRegenerating(true)
      const result = await regenerateWebhookSecret()
      setConfig(prev => (prev ? { ...prev, webhook_secret: result.webhook_secret } : null))
    } catch (error) {
      console.error('Erro ao regenerar secret:', error)
      alert('Não foi possível regenerar o secret')
    } finally {
      setRegenerating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getEventStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className='w-4 h-4 text-emerald-500' />
      case 'failed':
        return <XCircle className='w-4 h-4 text-red-500' />
      case 'pending':
        return <Clock className='w-4 h-4 text-amber-500' />
      default:
        return <Send className='w-4 h-4 text-slate-400' />
    }
  }

  const getEventBadgeColor = (eventType: string) => {
    if (eventType.includes('completed') || eventType.includes('success')) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    }
    if (eventType.includes('failed') || eventType.includes('error')) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }
    if (eventType.includes('pending') || eventType.includes('created')) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center'>
        <RefreshCw className='w-8 h-8 text-indigo-600 animate-spin' />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      {/* Header */}
      <header className='bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center gap-4'>
            <Link
              to='/gateway/dashboard'
              className='p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors'
            >
              <ChevronLeft className='w-5 h-5' />
            </Link>
            <div>
              <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>Webhooks</h1>
              <p className='text-slate-600 dark:text-slate-400 mt-1'>
                Configure notificações em tempo real
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Configuration */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Webhook URL */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6'>
              <div className='flex items-center gap-3 mb-6'>
                <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl'>
                  <Webhook className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                </div>
                <div>
                  <h2 className='text-lg font-semibold text-slate-900 dark:text-white'>
                    Endpoint URL
                  </h2>
                  <p className='text-sm text-slate-500 dark:text-slate-400'>
                    URL que receberá as notificações de eventos
                  </p>
                </div>
              </div>

              <div className='space-y-4'>
                <div>
                  <label
                    htmlFor='webhook-url'
                    className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
                  >
                    URL do Webhook
                  </label>
                  <input
                    id='webhook-url'
                    type='url'
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    placeholder='https://seu-dominio.com/webhook/wolkpay'
                    className='w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  />
                </div>

                <button
                  onClick={handleSaveUrl}
                  disabled={saving || webhookUrl === config?.webhook_url}
                  className='flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  {saving ? (
                    <>
                      <RefreshCw className='w-4 h-4 animate-spin' />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className='w-4 h-4' />
                      Salvar URL
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Webhook Secret */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div>
                  <h2 className='text-lg font-semibold text-slate-900 dark:text-white'>
                    Secret Key
                  </h2>
                  <p className='text-sm text-slate-500 dark:text-slate-400'>
                    Use para validar a autenticidade das requisições
                  </p>
                </div>
              </div>

              <div className='space-y-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex-1 relative'>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={config?.webhook_secret || ''}
                      readOnly
                      className='w-full px-4 py-3 pr-24 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:outline-none'
                    />
                    <div className='absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1'>
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className='p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                        title={showSecret ? 'Ocultar' : 'Mostrar'}
                      >
                        {showSecret ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(config?.webhook_secret || '')}
                        className='p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
                        title='Copiar'
                      >
                        {copied ? (
                          <Check className='w-4 h-4 text-emerald-500' />
                        ) : (
                          <Copy className='w-4 h-4' />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400'>
                    <Info className='w-4 h-4' />
                    <span>Inclua este secret no header X-Webhook-Signature</span>
                  </div>
                  <button
                    onClick={handleRegenerateSecret}
                    disabled={regenerating}
                    className='text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {regenerating ? 'Regenerando...' : 'Regenerar Secret'}
                  </button>
                </div>
              </div>
            </div>

            {/* Events History */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700'>
              <div className='p-6 border-b border-slate-200 dark:border-slate-700'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h2 className='text-lg font-semibold text-slate-900 dark:text-white'>
                      Histórico de Eventos
                    </h2>
                    <p className='text-sm text-slate-500 dark:text-slate-400'>
                      Últimas notificações enviadas
                    </p>
                  </div>
                  <button
                    onClick={loadEvents}
                    className='p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
                  >
                    <RefreshCw className='w-4 h-4' />
                  </button>
                </div>
              </div>

              {events.length === 0 ? (
                <div className='p-8 text-center'>
                  <Send className='w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3' />
                  <p className='text-slate-500 dark:text-slate-400'>Nenhum evento enviado ainda</p>
                </div>
              ) : (
                <div className='divide-y divide-slate-100 dark:divide-slate-700'>
                  {events.map(event => (
                    <div
                      key={event.id}
                      className='p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors'
                    >
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex items-start gap-3'>
                          {getEventStatusIcon(event.status)}
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getEventBadgeColor(event.event_type)}`}
                            >
                              {event.event_type}
                            </span>
                            <p className='text-sm text-slate-900 dark:text-white mt-1 font-mono'>
                              {event.payment_id}
                            </p>
                            <p className='text-xs text-slate-500 dark:text-slate-400 mt-1'>
                              {formatDate(event.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          {event.response_code !== undefined && event.response_code !== null && (
                            <span
                              className={`text-sm ${
                                event.response_code >= 200 && event.response_code < 300
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              HTTP {event.response_code}
                            </span>
                          )}
                          {event.attempts > 1 && (
                            <p className='text-xs text-slate-500 mt-1'>
                              {event.attempts} tentativas
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {totalEvents > 10 && (
                <div className='p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2'>
                  <button
                    onClick={() => setEventsPage(Math.max(1, eventsPage - 1))}
                    disabled={eventsPage === 1}
                    className='p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronLeft className='w-4 h-4' />
                  </button>
                  <span className='text-sm text-slate-600 dark:text-slate-400'>
                    Página {eventsPage}
                  </span>
                  <button
                    onClick={() => setEventsPage(eventsPage + 1)}
                    disabled={events.length < 10}
                    className='p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronRight className='w-4 h-4' />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Events Info */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6'>
              <h3 className='font-semibold text-slate-900 dark:text-white mb-4'>
                Eventos Disponíveis
              </h3>
              <div className='space-y-3'>
                {[
                  { event: 'payment.created', desc: 'Pagamento criado' },
                  { event: 'payment.pending', desc: 'Aguardando pagamento' },
                  { event: 'payment.completed', desc: 'Pagamento confirmado' },
                  { event: 'payment.failed', desc: 'Pagamento falhou' },
                  { event: 'payment.expired', desc: 'Pagamento expirado' },
                  { event: 'payment.refunded', desc: 'Pagamento reembolsado' },
                ].map(item => (
                  <div
                    key={item.event}
                    className='flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0'
                  >
                    <code className='text-sm text-indigo-600 dark:text-indigo-400'>
                      {item.event}
                    </code>
                    <span className='text-xs text-slate-500'>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payload Example */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6'>
              <h3 className='font-semibold text-slate-900 dark:text-white mb-4'>
                Exemplo de Payload
              </h3>
              <pre className='bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto'>
                {`{
  "event": "payment.completed",
  "payment_id": "pay_abc123",
  "payment_code": "WP-ABC123",
  "amount": 100.00,
  "currency": "BRL",
  "status": "COMPLETED",
  "paid_at": "2024-01-15T10:30:00Z",
  "metadata": {}
}`}
              </pre>
            </div>

            {/* Integration Tips */}
            <div className='bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white'>
              <h3 className='font-semibold mb-3'>Dicas de Integração</h3>
              <ul className='space-y-2 text-sm text-white/90'>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-4 h-4 mt-0.5 flex-shrink-0' />
                  <span>Sempre valide o header X-Webhook-Signature</span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-4 h-4 mt-0.5 flex-shrink-0' />
                  <span>Responda com HTTP 200 em até 5 segundos</span>
                </li>
                <li className='flex items-start gap-2'>
                  <CheckCircle className='w-4 h-4 mt-0.5 flex-shrink-0' />
                  <span>Implemente idempotência para evitar duplicatas</span>
                </li>
              </ul>
              <a
                href='/docs/webhooks'
                className='inline-flex items-center gap-2 mt-4 text-sm font-medium hover:underline'
              >
                Ver documentação completa
                <ExternalLink className='w-4 h-4' />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
