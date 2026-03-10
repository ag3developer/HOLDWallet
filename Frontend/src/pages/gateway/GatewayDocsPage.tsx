/**
 * WolkPay Gateway - Documentação da API
 * Página de documentação completa para desenvolvedores
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Book,
  Code,
  Terminal,
  Webhook,
  Key,
  CreditCard,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Zap,
  Shield,
  FileCode,
  Layers,
  Globe,
} from 'lucide-react'

// Tipos para a documentação
interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  auth: boolean
  params?: { name: string; type: string; required: boolean; description: string }[]
  body?: { name: string; type: string; required: boolean; description: string }[]
  response?: string
}

interface Section {
  id: string
  title: string
  icon: React.ElementType
  description: string
  endpoints: Endpoint[]
}

// Dados da documentação
const apiSections: Section[] = [
  {
    id: 'payments',
    title: 'Pagamentos',
    icon: CreditCard,
    description: 'Criar e gerenciar pagamentos PIX e Crypto',
    endpoints: [
      {
        method: 'POST',
        path: '/gateway/payments',
        description: 'Criar novo pagamento',
        auth: true,
        body: [
          {
            name: 'amount',
            type: 'number',
            required: true,
            description: 'Valor em BRL (mínimo 10.00)',
          },
          { name: 'currency', type: 'string', required: true, description: 'Moeda: "BRL"' },
          {
            name: 'description',
            type: 'string',
            required: false,
            description: 'Descrição do pagamento',
          },
          {
            name: 'customer_email',
            type: 'string',
            required: true,
            description: 'Email do cliente',
          },
          {
            name: 'customer_name',
            type: 'string',
            required: false,
            description: 'Nome do cliente',
          },
          {
            name: 'external_id',
            type: 'string',
            required: false,
            description: 'ID externo para referência',
          },
          {
            name: 'metadata',
            type: 'object',
            required: false,
            description: 'Dados adicionais (JSON)',
          },
        ],
        response: `{
  "id": "pay_abc123",
  "status": "pending",
  "amount": 150.00,
  "checkout_url": "https://gateway.wolknow.com/checkout/TOKEN",
  "expires_at": "2024-01-01T12:00:00Z"
}`,
      },
      {
        method: 'GET',
        path: '/gateway/payments',
        description: 'Listar pagamentos com filtros',
        auth: true,
        params: [
          { name: 'status', type: 'string', required: false, description: 'Filtrar por status' },
          { name: 'method', type: 'string', required: false, description: 'pix ou crypto' },
          { name: 'page', type: 'number', required: false, description: 'Página (default: 1)' },
          {
            name: 'per_page',
            type: 'number',
            required: false,
            description: 'Items por página (default: 20)',
          },
        ],
        response: `{
  "payments": [...],
  "total": 100,
  "page": 1,
  "per_page": 20
}`,
      },
      {
        method: 'GET',
        path: '/gateway/payments/{id}',
        description: 'Obter detalhes de um pagamento',
        auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'ID do pagamento' }],
        response: `{
  "id": "pay_abc123",
  "status": "completed",
  "amount": 150.00,
  "method": "pix",
  "pix_code": "00020126...",
  "paid_at": "2024-01-01T11:30:00Z"
}`,
      },
      {
        method: 'POST',
        path: '/gateway/payments/{id}/cancel',
        description: 'Cancelar pagamento pendente',
        auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'ID do pagamento' }],
      },
    ],
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    icon: Webhook,
    description: 'Configurar notificações em tempo real',
    endpoints: [
      {
        method: 'GET',
        path: '/gateway/webhooks/config',
        description: 'Obter configuração atual',
        auth: true,
        response: `{
  "webhook_url": "https://seu-site.com/webhook",
  "webhook_secret": "whsec_...",
  "events": ["payment.completed", "payment.failed"]
}`,
      },
      {
        method: 'PUT',
        path: '/gateway/webhooks/config',
        description: 'Atualizar URL do webhook',
        auth: true,
        body: [
          {
            name: 'webhook_url',
            type: 'string',
            required: true,
            description: 'URL HTTPS para receber eventos',
          },
          {
            name: 'events',
            type: 'string[]',
            required: false,
            description: 'Eventos para receber',
          },
        ],
      },
      {
        method: 'POST',
        path: '/gateway/webhooks/regenerate-secret',
        description: 'Gerar novo secret',
        auth: true,
        response: `{
  "webhook_secret": "whsec_novo_secret_aqui"
}`,
      },
      {
        method: 'GET',
        path: '/gateway/webhooks/events',
        description: 'Histórico de eventos enviados',
        auth: true,
        params: [
          { name: 'page', type: 'number', required: false, description: 'Página' },
          { name: 'per_page', type: 'number', required: false, description: 'Items por página' },
        ],
      },
    ],
  },
  {
    id: 'api-keys',
    title: 'API Keys',
    icon: Key,
    description: 'Gerenciar chaves de acesso',
    endpoints: [
      {
        method: 'GET',
        path: '/gateway/api-keys',
        description: 'Listar chaves',
        auth: true,
      },
      {
        method: 'POST',
        path: '/gateway/api-keys',
        description: 'Criar nova chave',
        auth: true,
        body: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'Nome identificador da chave',
          },
          {
            name: 'environment',
            type: 'string',
            required: true,
            description: 'test ou production',
          },
          {
            name: 'permissions',
            type: 'string[]',
            required: false,
            description: 'Permissões da chave',
          },
        ],
        response: `{
  "id": "key_123",
  "name": "Minha API Key",
  "key": "sk_test_...",
  "environment": "test"
}`,
      },
      {
        method: 'DELETE',
        path: '/gateway/api-keys/{id}',
        description: 'Revogar chave',
        auth: true,
      },
    ],
  },
  {
    id: 'checkout',
    title: 'Checkout',
    icon: Globe,
    description: 'Endpoints públicos do checkout',
    endpoints: [
      {
        method: 'GET',
        path: '/gateway/checkout/{token}',
        description: 'Obter dados do checkout (público)',
        auth: false,
        params: [
          { name: 'token', type: 'string', required: true, description: 'Token do checkout' },
        ],
      },
      {
        method: 'POST',
        path: '/gateway/checkout/{token}/method',
        description: 'Selecionar método de pagamento',
        auth: false,
        body: [{ name: 'method', type: 'string', required: true, description: 'pix ou crypto' }],
      },
      {
        method: 'GET',
        path: '/gateway/checkout/{token}/status',
        description: 'Verificar status do pagamento',
        auth: false,
      },
    ],
  },
]

// Eventos de webhook disponíveis
const webhookEvents = [
  { event: 'payment.created', description: 'Pagamento criado' },
  { event: 'payment.pending', description: 'Aguardando pagamento' },
  { event: 'payment.processing', description: 'Processando pagamento' },
  { event: 'payment.completed', description: 'Pagamento confirmado' },
  { event: 'payment.failed', description: 'Pagamento falhou' },
  { event: 'payment.cancelled', description: 'Pagamento cancelado' },
  { event: 'payment.expired', description: 'Pagamento expirou' },
  { event: 'payment.refunded', description: 'Pagamento reembolsado' },
]

// Códigos de exemplo
const codeExamples = {
  curl: `curl -X POST "https://api.wolknow.com/gateway/payments" \\
  -H "Authorization: Bearer sk_live_sua_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 150.00,
    "currency": "BRL",
    "customer_email": "cliente@email.com",
    "description": "Pedido #12345"
  }'`,

  python: `import wolkpay

client = wolkpay.Client(api_key="sk_live_sua_api_key")

payment = client.payments.create(
    amount=150.00,
    currency="BRL",
    customer_email="cliente@email.com",
    description="Pedido #12345"
)

print(f"Checkout URL: {payment.checkout_url}")`,

  node: `const WolkPay = require('@wolkpay/sdk');

const client = new WolkPay('sk_live_sua_api_key');

const payment = await client.payments.create({
  amount: 150.00,
  currency: 'BRL',
  customerEmail: 'cliente@email.com',
  description: 'Pedido #12345'
});

console.log('Checkout URL:', payment.checkoutUrl);`,

  php: `<?php
require 'vendor/autoload.php';

$wolkpay = new \\WolkPay\\Client('sk_live_sua_api_key');

$payment = $wolkpay->payments->create([
    'amount' => 150.00,
    'currency' => 'BRL',
    'customer_email' => 'cliente@email.com',
    'description' => 'Pedido #12345'
]);

echo "Checkout URL: " . $payment->checkout_url;`,

  webhook: `import hmac
import hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    """Verifica assinatura do webhook"""
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)

# No seu endpoint de webhook:
@app.post("/webhook")
async def handle_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-Webhook-Signature")
    
    if not verify_webhook(payload, signature, WEBHOOK_SECRET):
        raise HTTPException(401, "Invalid signature")
    
    event = json.loads(payload)
    
    if event["type"] == "payment.completed":
        payment_id = event["data"]["id"]
        # Processar pagamento confirmado
    
    return {"received": True}`,
}

export default function GatewayDocsPage() {
  const [activeSection, setActiveSection] = useState('payments')
  const [activeLanguage, setActiveLanguage] = useState<'curl' | 'python' | 'node' | 'php'>('curl')
  const [expandedEndpoints, setExpandedEndpoints] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const toggleEndpoint = (id: string) => {
    setExpandedEndpoints(prev => (prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]))
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'POST':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'PUT':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'DELETE':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      {/* Header */}
      <header className='bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <div className='flex items-center gap-3'>
              <Link to='/' className='flex items-center gap-2'>
                <div className='w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center'>
                  <Zap className='w-5 h-5 text-white' />
                </div>
                <span className='text-lg font-bold text-slate-900 dark:text-white'>WolkPay</span>
              </Link>
              <span className='text-slate-300 dark:text-slate-600'>|</span>
              <Link
                to='/docs'
                className='text-slate-600 dark:text-slate-400 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors'
              >
                Documentação
              </Link>
            </div>

            <nav className='flex items-center gap-4'>
              <Link
                to='/dashboard'
                className='text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              >
                Dashboard
              </Link>
              <a
                href='https://github.com/wolkpay'
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1'
              >
                GitHub <ExternalLink className='w-3 h-3' />
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Hero */}
        <div className='text-center mb-12'>
          <h1 className='text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4'>
            Documentação da API
          </h1>
          <p className='text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto'>
            Tudo que você precisa para integrar pagamentos PIX e Crypto em sua aplicação. SDKs
            oficiais, exemplos de código e referência completa.
          </p>
        </div>

        {/* Quick Links */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12'>
          <a
            href='#getting-started'
            className='p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group'
          >
            <Zap className='w-6 h-6 text-indigo-500 mb-2' />
            <h3 className='font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'>
              Início Rápido
            </h3>
            <p className='text-sm text-slate-500 dark:text-slate-400'>Comece em 5 minutos</p>
          </a>

          <a
            href='#api-reference'
            className='p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group'
          >
            <Book className='w-6 h-6 text-emerald-500 mb-2' />
            <h3 className='font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'>
              Referência API
            </h3>
            <p className='text-sm text-slate-500 dark:text-slate-400'>Endpoints completos</p>
          </a>

          <a
            href='#webhooks'
            className='p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group'
          >
            <Webhook className='w-6 h-6 text-purple-500 mb-2' />
            <h3 className='font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'>
              Webhooks
            </h3>
            <p className='text-sm text-slate-500 dark:text-slate-400'>Notificações em tempo real</p>
          </a>

          <a
            href='#sdks'
            className='p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group'
          >
            <Code className='w-6 h-6 text-amber-500 mb-2' />
            <h3 className='font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'>
              SDKs
            </h3>
            <p className='text-sm text-slate-500 dark:text-slate-400'>Python, Node.js, PHP</p>
          </a>
        </div>

        {/* Getting Started */}
        <section id='getting-started' className='mb-16'>
          <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2'>
            <Zap className='w-6 h-6 text-indigo-500' />
            Início Rápido
          </h2>

          <div className='bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden'>
            {/* Steps */}
            <div className='p-6 border-b border-slate-200 dark:border-slate-700'>
              <div className='flex items-start gap-4'>
                <div className='w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0'>
                  1
                </div>
                <div>
                  <h3 className='font-semibold text-slate-900 dark:text-white mb-1'>
                    Obtenha sua API Key
                  </h3>
                  <p className='text-sm text-slate-600 dark:text-slate-400 mb-3'>
                    Acesse o{' '}
                    <Link
                      to='/api-keys'
                      className='text-indigo-600 dark:text-indigo-400 hover:underline'
                    >
                      Dashboard → API Keys
                    </Link>{' '}
                    para criar sua chave de produção ou teste.
                  </p>
                </div>
              </div>
            </div>

            <div className='p-6 border-b border-slate-200 dark:border-slate-700'>
              <div className='flex items-start gap-4'>
                <div className='w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0'>
                  2
                </div>
                <div className='flex-1'>
                  <h3 className='font-semibold text-slate-900 dark:text-white mb-1'>
                    Faça sua primeira requisição
                  </h3>
                  <p className='text-sm text-slate-600 dark:text-slate-400 mb-3'>
                    Use o exemplo abaixo para criar um pagamento:
                  </p>

                  {/* Language Tabs */}
                  <div className='flex gap-1 mb-3'>
                    {(['curl', 'python', 'node', 'php'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setActiveLanguage(lang)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          activeLanguage === lang
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {lang === 'curl'
                          ? 'cURL'
                          : lang === 'node'
                            ? 'Node.js'
                            : lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Code Block */}
                  <div className='relative'>
                    <pre className='bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-xl text-sm overflow-x-auto'>
                      <code>{codeExamples[activeLanguage]}</code>
                    </pre>
                    <button
                      onClick={() => copyCode(codeExamples[activeLanguage], 'example')}
                      className='absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors'
                      title='Copiar código'
                    >
                      {copied === 'example' ? (
                        <Check className='w-4 h-4 text-emerald-400' />
                      ) : (
                        <Copy className='w-4 h-4 text-slate-400' />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className='p-6'>
              <div className='flex items-start gap-4'>
                <div className='w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0'>
                  3
                </div>
                <div>
                  <h3 className='font-semibold text-slate-900 dark:text-white mb-1'>
                    Configure Webhooks
                  </h3>
                  <p className='text-sm text-slate-600 dark:text-slate-400'>
                    Configure um endpoint para receber notificações de pagamentos confirmados. Veja
                    a seção{' '}
                    <a
                      href='#webhooks'
                      className='text-indigo-600 dark:text-indigo-400 hover:underline'
                    >
                      Webhooks
                    </a>{' '}
                    abaixo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section id='api-reference' className='mb-16'>
          <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2'>
            <Book className='w-6 h-6 text-emerald-500' />
            Referência da API
          </h2>

          <div className='flex gap-6'>
            {/* Sidebar */}
            <nav className='hidden lg:block w-48 shrink-0'>
              <div className='sticky top-24 space-y-1'>
                {apiSections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <section.icon className='w-4 h-4' />
                    {section.title}
                  </button>
                ))}
              </div>
            </nav>

            {/* Content */}
            <div className='flex-1 space-y-4'>
              {/* Mobile Section Selector */}
              <div className='lg:hidden'>
                <select
                  value={activeSection}
                  onChange={e => setActiveSection(e.target.value)}
                  aria-label='Selecionar seção da API'
                  className='w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white'
                >
                  {apiSections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Endpoints */}
              {apiSections
                .filter(s => s.id === activeSection)
                .map(section => (
                  <div key={section.id} className='space-y-4'>
                    <div className='bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6'>
                      <div className='flex items-center gap-3 mb-2'>
                        <section.icon className='w-6 h-6 text-indigo-500' />
                        <h3 className='text-xl font-bold text-slate-900 dark:text-white'>
                          {section.title}
                        </h3>
                      </div>
                      <p className='text-slate-600 dark:text-slate-400'>{section.description}</p>
                    </div>

                    {section.endpoints.map((endpoint, idx) => {
                      const endpointId = `${section.id}-${idx}`
                      const isExpanded = expandedEndpoints.includes(endpointId)

                      return (
                        <div
                          key={endpointId}
                          className='bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden'
                        >
                          <button
                            onClick={() => toggleEndpoint(endpointId)}
                            className='w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors'
                          >
                            <span
                              className={`px-2 py-1 text-xs font-bold rounded ${getMethodColor(
                                endpoint.method
                              )}`}
                            >
                              {endpoint.method}
                            </span>
                            <code className='text-sm text-slate-700 dark:text-slate-300 font-mono'>
                              {endpoint.path}
                            </code>
                            {endpoint.auth && (
                              <span title='Requer autenticação'>
                                <Shield className='w-4 h-4 text-amber-500' />
                              </span>
                            )}
                            <span className='flex-1 text-left text-sm text-slate-500 dark:text-slate-400 truncate'>
                              {endpoint.description}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className='w-4 h-4 text-slate-400' />
                            ) : (
                              <ChevronRight className='w-4 h-4 text-slate-400' />
                            )}
                          </button>

                          {isExpanded && (
                            <div className='border-t border-slate-200 dark:border-slate-700 p-4 space-y-4'>
                              {endpoint.params && endpoint.params.length > 0 && (
                                <div>
                                  <h4 className='text-sm font-semibold text-slate-900 dark:text-white mb-2'>
                                    Parâmetros
                                  </h4>
                                  <div className='space-y-2'>
                                    {endpoint.params.map(param => (
                                      <div
                                        key={param.name}
                                        className='flex items-start gap-3 text-sm'
                                      >
                                        <code className='px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300'>
                                          {param.name}
                                        </code>
                                        <span className='text-slate-500 dark:text-slate-400'>
                                          {param.type}
                                        </span>
                                        {param.required && (
                                          <span className='text-xs text-red-500'>obrigatório</span>
                                        )}
                                        <span className='text-slate-600 dark:text-slate-400'>
                                          {param.description}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {endpoint.body && endpoint.body.length > 0 && (
                                <div>
                                  <h4 className='text-sm font-semibold text-slate-900 dark:text-white mb-2'>
                                    Body (JSON)
                                  </h4>
                                  <div className='space-y-2'>
                                    {endpoint.body.map(field => (
                                      <div
                                        key={field.name}
                                        className='flex items-start gap-3 text-sm'
                                      >
                                        <code className='px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300'>
                                          {field.name}
                                        </code>
                                        <span className='text-slate-500 dark:text-slate-400'>
                                          {field.type}
                                        </span>
                                        {field.required && (
                                          <span className='text-xs text-red-500'>obrigatório</span>
                                        )}
                                        <span className='text-slate-600 dark:text-slate-400'>
                                          {field.description}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {endpoint.response && (
                                <div>
                                  <h4 className='text-sm font-semibold text-slate-900 dark:text-white mb-2'>
                                    Resposta
                                  </h4>
                                  <pre className='bg-slate-900 dark:bg-slate-950 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto'>
                                    <code>{endpoint.response}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* Webhooks */}
        <section id='webhooks' className='mb-16'>
          <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2'>
            <Webhook className='w-6 h-6 text-purple-500' />
            Webhooks
          </h2>

          <div className='grid gap-6 lg:grid-cols-2'>
            {/* Events */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6'>
              <h3 className='font-semibold text-slate-900 dark:text-white mb-4'>
                Eventos Disponíveis
              </h3>
              <div className='space-y-2'>
                {webhookEvents.map(({ event, description }) => (
                  <div
                    key={event}
                    className='flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0'
                  >
                    <code className='text-sm text-indigo-600 dark:text-indigo-400'>{event}</code>
                    <span className='text-sm text-slate-500 dark:text-slate-400'>
                      {description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification */}
            <div className='bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6'>
              <h3 className='font-semibold text-slate-900 dark:text-white mb-4'>
                Verificação de Assinatura
              </h3>
              <p className='text-sm text-slate-600 dark:text-slate-400 mb-4'>
                Sempre verifique a assinatura HMAC-SHA256 do webhook para garantir autenticidade:
              </p>
              <div className='relative'>
                <pre className='bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto'>
                  <code>{codeExamples.webhook}</code>
                </pre>
                <button
                  onClick={() => copyCode(codeExamples.webhook, 'webhook')}
                  className='absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors'
                  title='Copiar código'
                >
                  {copied === 'webhook' ? (
                    <Check className='w-4 h-4 text-emerald-400' />
                  ) : (
                    <Copy className='w-4 h-4 text-slate-400' />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SDKs */}
        <section id='sdks' className='mb-16'>
          <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2'>
            <Layers className='w-6 h-6 text-amber-500' />
            SDKs Oficiais
          </h2>

          <div className='grid gap-4 sm:grid-cols-3'>
            <div className='bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6'>
              <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4'>
                <FileCode className='w-6 h-6 text-blue-600 dark:text-blue-400' />
              </div>
              <h3 className='font-semibold text-slate-900 dark:text-white mb-1'>Python</h3>
              <p className='text-sm text-slate-500 dark:text-slate-400 mb-4'>pip install wolkpay</p>
              <a
                href='https://pypi.org/project/wolkpay'
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1'
              >
                Ver no PyPI <ExternalLink className='w-3 h-3' />
              </a>
            </div>

            <div className='bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6'>
              <div className='w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4'>
                <Terminal className='w-6 h-6 text-green-600 dark:text-green-400' />
              </div>
              <h3 className='font-semibold text-slate-900 dark:text-white mb-1'>Node.js</h3>
              <p className='text-sm text-slate-500 dark:text-slate-400 mb-4'>
                npm install @wolkpay/sdk
              </p>
              <a
                href='https://www.npmjs.com/package/@wolkpay/sdk'
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1'
              >
                Ver no NPM <ExternalLink className='w-3 h-3' />
              </a>
            </div>

            <div className='bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6'>
              <div className='w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4'>
                <Code className='w-6 h-6 text-purple-600 dark:text-purple-400' />
              </div>
              <h3 className='font-semibold text-slate-900 dark:text-white mb-1'>PHP</h3>
              <p className='text-sm text-slate-500 dark:text-slate-400 mb-4'>
                composer require wolkpay/sdk
              </p>
              <a
                href='https://packagist.org/packages/wolkpay/sdk'
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1'
              >
                Ver no Packagist <ExternalLink className='w-3 h-3' />
              </a>
            </div>
          </div>
        </section>

        {/* Base URL Info */}
        <section className='mb-16'>
          <div className='bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-6'>
            <h3 className='font-semibold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2'>
              <Globe className='w-5 h-5' />
              Base URL
            </h3>
            <div className='flex flex-col sm:flex-row gap-4'>
              <div className='flex-1'>
                <span className='text-sm text-indigo-700 dark:text-indigo-400 block mb-1'>
                  Produção
                </span>
                <code className='text-sm bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-800 dark:text-slate-200'>
                  https://api.wolknow.com/gateway
                </code>
              </div>
              <div className='flex-1'>
                <span className='text-sm text-indigo-700 dark:text-indigo-400 block mb-1'>
                  Teste
                </span>
                <code className='text-sm bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-800 dark:text-slate-200'>
                  https://sandbox.wolknow.com/gateway
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* Help */}
        <section>
          <div className='text-center py-8'>
            <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-2'>
              Precisa de Ajuda?
            </h3>
            <p className='text-slate-600 dark:text-slate-400 mb-4'>
              Nossa equipe está pronta para auxiliar na integração.
            </p>
            <div className='flex justify-center gap-4'>
              <a
                href='mailto:suporte@wolknow.com'
                className='px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors'
              >
                Falar com Suporte
              </a>
              <a
                href='https://github.com/wolkpay/issues'
                target='_blank'
                rel='noopener noreferrer'
                className='px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors'
              >
                Reportar Bug
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
