/**
 * WolkPay Gateway - Documentação da API
 *
 * Documentação para desenvolvedores, fiel ao contrato real do backend
 * (backend/app/routers/gateway.py, schemas/gateway.py, services/gateway/*).
 * Taxas e limites são carregados ao vivo de GET /gateway/fees.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Info,
  LifeBuoy,
  Lock,
  Menu,
  Search,
  X,
  Zap,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// ============================================================
// Constantes do contrato da API
// ============================================================

const API_BASE = 'https://api.wolknow.com/v1/gateway'
const CHECKOUT_BASE = 'https://gateway.wolknow.com/pay'
const SUPPORT_EMAIL = 'suporte@wolknow.com'

interface GatewayFees {
  pix_fee_percent: string
  crypto_fee_percent: string
  network_fee_percent: string
  min_payment_brl: string
  max_payment_brl: string
  daily_limit_brl: string
}

// ============================================================
// Sumário
// ============================================================

interface TocItem {
  id: string
  title: string
}
interface TocGroup {
  title: string
  items: TocItem[]
}

const TOC: TocGroup[] = [
  {
    title: 'Primeiros passos',
    items: [
      { id: 'visao-geral', title: 'Visão geral' },
      { id: 'inicio-rapido', title: 'Início rápido' },
      { id: 'autenticacao', title: 'Autenticação' },
      { id: 'url-base', title: 'URL base e ambientes' },
      { id: 'taxas-limites', title: 'Taxas e limites' },
    ],
  },
  {
    title: 'Pagamentos',
    items: [
      { id: 'objeto-pagamento', title: 'O objeto Payment' },
      { id: 'criar-pagamento', title: 'Criar pagamento' },
      { id: 'consultar-pagamento', title: 'Consultar pagamento' },
      { id: 'listar-pagamentos', title: 'Listar pagamentos' },
      { id: 'cancelar-pagamento', title: 'Cancelar pagamento' },
      { id: 'status', title: 'Ciclo de vida e status' },
    ],
  },
  {
    title: 'Métodos de pagamento',
    items: [
      { id: 'pix', title: 'Pix' },
      { id: 'crypto', title: 'Criptomoedas' },
      { id: 'checkout', title: 'Checkout hospedado' },
    ],
  },
  {
    title: 'Webhooks',
    items: [
      { id: 'webhooks-config', title: 'Configuração' },
      { id: 'webhooks-eventos', title: 'Eventos e payload' },
      { id: 'webhooks-assinatura', title: 'Verificar assinatura' },
      { id: 'webhooks-retentativas', title: 'Entrega e retentativas' },
    ],
  },
  {
    title: 'Referência',
    items: [
      { id: 'erros', title: 'Erros' },
      { id: 'endpoints', title: 'Todos os endpoints' },
      { id: 'checklist', title: 'Checklist de produção' },
      { id: 'suporte', title: 'Suporte' },
    ],
  },
]

const ALL_IDS = TOC.flatMap(g => g.items.map(i => i.id))

// ============================================================
// Exemplos de código
// ============================================================

type Lang = 'curl' | 'node' | 'python' | 'php'
const LANG_LABEL: Record<Lang, string> = {
  curl: 'cURL',
  node: 'Node.js',
  python: 'Python',
  php: 'PHP',
}

const CREATE_PAYMENT: Record<Lang, string> = {
  curl: `curl -X POST "${API_BASE}/payments" \\
  -H "Authorization: Bearer wkgw_live_SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "payment_method": "pix",
    "amount": 150.00,
    "currency": "BRL",
    "external_id": "pedido-12345",
    "description": "Pedido #12345",
    "customer_email": "cliente@email.com",
    "customer_name": "Maria Silva",
    "expiration_minutes": 30,
    "success_url": "https://sualoja.com/obrigado",
    "cancel_url": "https://sualoja.com/carrinho"
  }'`,
  node: `// Node.js 18+ (fetch nativo)
const response = await fetch('${API_BASE}/payments', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.WOLKPAY_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    payment_method: 'pix',
    amount: 150.0,
    currency: 'BRL',
    external_id: 'pedido-12345',
    description: 'Pedido #12345',
    customer_email: 'cliente@email.com',
    expiration_minutes: 30,
  }),
})

if (!response.ok) {
  throw new Error(\`WolkPay \${response.status}: \${await response.text()}\`)
}

const payment = await response.json()
console.log(payment.payment_id, payment.pix_qrcode, payment.checkout_url)`,
  python: `import os
import requests

response = requests.post(
    "${API_BASE}/payments",
    headers={"Authorization": f"Bearer {os.environ['WOLKPAY_API_KEY']}"},
    json={
        "payment_method": "pix",
        "amount": 150.00,
        "currency": "BRL",
        "external_id": "pedido-12345",
        "description": "Pedido #12345",
        "customer_email": "cliente@email.com",
        "expiration_minutes": 30,
    },
    timeout=60,
)
response.raise_for_status()

payment = response.json()
print(payment["payment_id"], payment["pix_qrcode"], payment["checkout_url"])`,
  php: `<?php
$ch = curl_init('${API_BASE}/payments');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . getenv('WOLKPAY_API_KEY'),
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS     => json_encode([
        'payment_method'     => 'pix',
        'amount'             => 150.00,
        'currency'           => 'BRL',
        'external_id'        => 'pedido-12345',
        'description'        => 'Pedido #12345',
        'customer_email'     => 'cliente@email.com',
        'expiration_minutes' => 30,
    ]),
]);

$body   = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status !== 201) {
    throw new Exception("WolkPay $status: $body");
}

$payment = json_decode($body, true);
echo $payment['checkout_url'];`,
}

const PAYMENT_OBJECT_JSON = `{
  "id": "8b0f4c1e-2a7d-4d8e-9f51-3c6b2e9a1d47",
  "payment_id": "WKPAY-20261106-ABD0E4",
  "external_id": "pedido-12345",
  "merchant_id": "c2d9e7a4-5b3f-4e21-8a6c-7f0d1b2e3a45",
  "payment_method": "PIX",
  "amount_requested": "150.00",
  "currency_requested": "BRL",
  "amount_received": null,
  "fee_percent": "3.50",
  "fee_amount": "5.25",
  "settlement_amount": "144.75",
  "status": "PENDING",
  "expires_at": "2026-11-06T21:26:00Z",
  "pix_qrcode": "00020101021226870014br.gov.bcb.pix...6304A1B2",
  "pix_qrcode_image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "crypto_currency": null,
  "crypto_network": null,
  "crypto_address": null,
  "crypto_amount": null,
  "crypto_tx_hash": null,
  "crypto_confirmations": null,
  "checkout_url": "${CHECKOUT_BASE}/AikrbSd9Xq...",
  "success_url": "https://sualoja.com/obrigado",
  "cancel_url": "https://sualoja.com/carrinho",
  "description": "Pedido #12345",
  "created_at": "2026-11-06T20:56:00Z",
  "confirmed_at": null,
  "completed_at": null
}`

const LIST_RESPONSE_JSON = `{
  "items": [
    {
      "id": "8b0f4c1e-...",
      "payment_id": "WKPAY-20261106-ABD0E4",
      "external_id": "pedido-12345",
      "payment_method": "PIX",
      "status": "COMPLETED",
      "amount_requested": "150.00",
      "currency_requested": "BRL",
      "fee_amount": "5.25",
      "net_amount": "144.75",
      "customer_email": "cliente@email.com",
      "created_at": "2026-11-06T20:56:00Z",
      "paid_at": "2026-11-06T20:58:12Z"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20,
  "pages": 3,
  "has_next": true,
  "has_prev": false
}`

const WEBHOOK_PAYLOAD_JSON = `POST https://sualoja.com/webhooks/wolkpay
Content-Type: application/json
User-Agent: WolkPay-Gateway/1.0
X-WolkPay-Event: payment.completed
X-WolkPay-Delivery: 5e1c9a2b-7d4f-4a3e-b8c1-0f2e6d9a4b17
X-WolkPay-Signature: 3f9a1c...e07b   (HMAC-SHA256 em hex)

{
  "event": "payment.completed",
  "created_at": "2026-11-06T20:58:15.120394+00:00",
  "webhook_id": "5e1c9a2b-7d4f-4a3e-b8c1-0f2e6d9a4b17",
  "data": {
    "payment_id": "WKPAY-20261106-ABD0E4",
    "external_id": "pedido-12345",
    "merchant_code": "WKGW-1B8107",
    "payment_method": "PIX",
    "status": "COMPLETED",
    "amount_requested": "150.00",
    "currency": "BRL",
    "amount_received": "150.00",
    "fee_amount": "5.25",
    "settlement_amount": "144.75",
    "settlement_currency": "BRL",
    "customer_email": "cliente@email.com",
    "customer_name": "Maria Silva",
    "description": "Pedido #12345",
    "created_at": "2026-11-06T20:56:00+00:00",
    "confirmed_at": "2026-11-06T20:58:12+00:00",
    "completed_at": "2026-11-06T20:58:15+00:00",
    "pix_txid": "WKGWWKPAY20261106ABD0E4000",
    "crypto_currency": null,
    "crypto_network": null,
    "crypto_address": null,
    "crypto_tx_hash": null,
    "crypto_amount": null,
    "crypto_confirmations": null
  }
}`

const VERIFY_SIGNATURE: Record<Exclude<Lang, 'curl'>, string> = {
  node: `import crypto from 'node:crypto'
import express from 'express'

const app = express()

// IMPORTANTE: use o corpo BRUTO (bytes exatos recebidos) para validar o HMAC.
app.post('/webhooks/wolkpay', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.header('X-WolkPay-Signature') ?? ''
  const expected = crypto
    .createHmac('sha256', process.env.WOLKPAY_WEBHOOK_SECRET)
    .update(req.body) // Buffer com o corpo bruto
    .digest('hex')

  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  if (!valid) return res.status(401).send('invalid signature')

  const event = JSON.parse(req.body.toString('utf8'))
  const deliveryId = req.header('X-WolkPay-Delivery') // use para idempotência

  if (event.event === 'payment.completed') {
    // marque o pedido event.data.external_id como pago
  }

  res.sendStatus(200) // responda 2xx rápido; processe pesado em background
})`,
  python: `import hashlib
import hmac
import json
import os

from fastapi import FastAPI, HTTPException, Request

app = FastAPI()
WEBHOOK_SECRET = os.environ["WOLKPAY_WEBHOOK_SECRET"]


@app.post("/webhooks/wolkpay")
async def wolkpay_webhook(request: Request):
    raw_body = await request.body()  # bytes exatos recebidos
    signature = request.headers.get("X-WolkPay-Signature", "")

    expected = hmac.new(WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="invalid signature")

    event = json.loads(raw_body)
    delivery_id = request.headers.get("X-WolkPay-Delivery")  # idempotência

    if event["event"] == "payment.completed":
        order_id = event["data"]["external_id"]
        # marque o pedido como pago

    return {"received": True}`,
  php: `<?php
$rawBody   = file_get_contents('php://input');           // corpo bruto
$signature = $_SERVER['HTTP_X_WOLKPAY_SIGNATURE'] ?? '';
$expected  = hash_hmac('sha256', $rawBody, getenv('WOLKPAY_WEBHOOK_SECRET'));

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit('invalid signature');
}

$event      = json_decode($rawBody, true);
$deliveryId = $_SERVER['HTTP_X_WOLKPAY_DELIVERY'] ?? null; // idempotência

if ($event['event'] === 'payment.completed') {
    $orderId = $event['data']['external_id'];
    // marque o pedido como pago
}

http_response_code(200);
echo json_encode(['received' => true]);`,
}

// ============================================================
// Componentes de apresentação
// ============================================================

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type='button'
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => undefined)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
      className='inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white'
      aria-label={label}
    >
      {copied ? <Check className='h-3.5 w-3.5 text-emerald-400' /> : <Copy className='h-3.5 w-3.5' />}
      {copied ? 'Copiado' : label}
    </button>
  )
}

function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className='overflow-hidden rounded-xl border border-slate-800 bg-slate-950'>
      <div className='flex items-center justify-between border-b border-slate-800 px-4 py-2'>
        <span className='font-mono text-xs text-slate-400'>{title ?? ''}</span>
        <CopyButton text={code} />
      </div>
      <pre className='overflow-x-auto p-4 text-[13px] leading-relaxed text-slate-100'>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function CodeTabs<L extends string>({
  examples,
  labels,
}: {
  examples: Record<L, string>
  labels: Record<L, string>
}) {
  const langs = Object.keys(examples) as L[]
  const [active, setActive] = useState<L>(langs[0] as L)
  return (
    <div className='overflow-hidden rounded-xl border border-slate-800 bg-slate-950'>
      <div className='flex items-center justify-between gap-2 border-b border-slate-800 px-2'>
        <div className='flex overflow-x-auto' role='tablist'>
          {langs.map(lang => (
            <button
              key={lang}
              type='button'
              role='tab'
              aria-selected={active === lang}
              onClick={() => setActive(lang)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                active === lang
                  ? 'border-indigo-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {labels[lang]}
            </button>
          ))}
        </div>
        <CopyButton text={examples[active]} />
      </div>
      <pre className='overflow-x-auto p-4 text-[13px] leading-relaxed text-slate-100'>
        <code>{examples[active]}</code>
      </pre>
    </div>
  )
}

const METHOD_STYLE: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
}

function EndpointBadge({
  method,
  path,
  auth = 'api_key',
}: {
  method: string
  path: string
  auth?: 'api_key' | 'painel' | 'publico'
}) {
  const authLabel = {
    api_key: 'API key',
    painel: 'Sessão do painel',
    publico: 'Público',
  }[auth]
  return (
    <div className='flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60'>
      <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${METHOD_STYLE[method]}`}>
        {method}
      </span>
      <code className='break-all font-mono text-sm text-slate-800 dark:text-slate-200'>
        /v1/gateway{path}
      </code>
      <span className='ml-auto inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400'>
        <Lock className='h-3 w-3' />
        {authLabel}
      </span>
    </div>
  )
}

interface Field {
  name: string
  type: string
  required?: boolean
  description: ReactNode
}

function FieldTable({ fields, title }: { fields: Field[]; title?: string }) {
  return (
    <div>
      {title && (
        <h4 className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'>
          {title}
        </h4>
      )}
      <div className='divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800/40'>
        {fields.map(f => (
          <div key={f.name} className='grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-4'>
            <div className='flex flex-wrap items-baseline gap-x-2'>
              <code className='font-mono text-sm font-semibold text-slate-900 dark:text-white'>{f.name}</code>
              <span className='font-mono text-xs text-slate-500 dark:text-slate-400'>{f.type}</span>
              {f.required && (
                <span className='text-[11px] font-semibold uppercase text-rose-600 dark:text-rose-400'>
                  obrigatório
                </span>
              )}
            </div>
            <div className='text-sm text-slate-600 dark:text-slate-300'>{f.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning'
  title?: string
  children: ReactNode
}) {
  const styles =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
      : 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200'
  const Icon = tone === 'warning' ? AlertTriangle : Info
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${styles}`}>
      <Icon className='mt-0.5 h-4 w-4 shrink-0' />
      <div className='space-y-1'>
        {title && <p className='font-semibold'>{title}</p>}
        <div className='leading-relaxed'>{children}</div>
      </div>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className='scroll-mt-24 border-b border-slate-200 py-10 first:pt-0 last:border-0 dark:border-slate-800'>
      <h2 className='group mb-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white'>
        <a href={`#${id}`} className='hover:underline decoration-slate-300 underline-offset-4'>
          {title}
        </a>
      </h2>
      <div className='space-y-5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300'>{children}</div>
    </section>
  )
}

const C = ({ children }: { children: ReactNode }) => (
  <code className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800 dark:bg-slate-800 dark:text-slate-200'>
    {children}
  </code>
)

// ============================================================
// Página
// ============================================================

function formatBRL(value?: string) {
  if (value === undefined || value === null || value === '') return '—'
  const n = Number(value)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
}

function formatPercent(value?: string) {
  if (value === undefined || value === null || value === '') return '—'
  const n = Number(value)
  return Number.isFinite(n) ? `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : '—'
}

export default function GatewayDocsPage() {
  const [activeId, setActiveId] = useState<string>(ALL_IDS[0] ?? '')
  const [mobileTocOpen, setMobileTocOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [fees, setFees] = useState<GatewayFees | null>(null)
  const [feesError, setFeesError] = useState(false)

  // Taxas/limites ao vivo (nada hardcoded)
  useEffect(() => {
    apiClient
      .get<GatewayFees>('/gateway/fees')
      .then(res => setFees(res.data))
      .catch(() => setFeesError(true))
  }, [])

  // Scroll-spy do sumário
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: 0 }
    )
    ALL_IDS.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.title = 'Documentação da API · WolkPay Gateway'
  }, [])

  const filteredToc = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TOC
    return TOC.map(g => ({
      ...g,
      items: g.items.filter(i => i.title.toLowerCase().includes(q) || g.title.toLowerCase().includes(q)),
    })).filter(g => g.items.length > 0)
  }, [query])

  const activeTitle = TOC.flatMap(g => g.items).find(i => i.id === activeId)?.title ?? 'Sumário'

  const tocNav = (
    <nav aria-label='Sumário da documentação' className='space-y-6'>
      <div className='relative'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
        <input
          type='search'
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Buscar no sumário'
          aria-label='Buscar no sumário'
          className='w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
        />
      </div>
      {filteredToc.map(group => (
        <div key={group.title}>
          <p className='mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500'>
            {group.title}
          </p>
          <ul className='space-y-0.5'>
            {group.items.map(item => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setMobileTocOpen(false)}
                  aria-current={activeId === item.id ? 'location' : undefined}
                  className={`block rounded-lg border-l-2 px-3 py-1.5 text-sm transition-colors ${
                    activeId === item.id
                      ? 'border-indigo-500 bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {filteredToc.length === 0 && (
        <p className='px-3 text-sm text-slate-500'>Nenhuma seção encontrada.</p>
      )}
    </nav>
  )

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      {/* Header */}
      <header className='sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90'>
        <div className='mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8'>
          <div className='flex min-w-0 items-center gap-3'>
            <Link to='/' className='flex items-center gap-2'>
              <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600'>
                <Zap className='h-5 w-5 text-white' />
              </span>
              <span className='text-lg font-bold text-slate-900 dark:text-white'>WolkPay</span>
            </Link>
            <span className='text-slate-300 dark:text-slate-700'>/</span>
            <span className='flex items-center gap-1.5 truncate text-sm font-medium text-slate-600 dark:text-slate-300'>
              <BookOpen className='h-4 w-4' />
              Documentação da API
            </span>
          </div>
          <nav className='flex items-center gap-2 sm:gap-3'>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className='hidden text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:inline'
            >
              Suporte
            </a>
            <Link
              to='/dashboard'
              className='rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700'
            >
              Ir para o painel
            </Link>
          </nav>
        </div>

        {/* Sumário mobile */}
        <div className='border-t border-slate-200 dark:border-slate-800 lg:hidden'>
          <button
            type='button'
            onClick={() => setMobileTocOpen(o => !o)}
            aria-expanded={mobileTocOpen}
            className='flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200'
          >
            <span className='flex items-center gap-2'>
              {mobileTocOpen ? <X className='h-4 w-4' /> : <Menu className='h-4 w-4' />}
              {activeTitle}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${mobileTocOpen ? 'rotate-180' : ''}`} />
          </button>
          {mobileTocOpen && (
            <div className='max-h-[70vh] overflow-y-auto border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900'>
              {tocNav}
            </div>
          )}
        </div>
      </header>

      <div className='mx-auto flex max-w-[1400px] gap-10 px-4 sm:px-6 lg:px-8'>
        {/* Sumário desktop */}
        <aside className='hidden w-64 shrink-0 lg:block'>
          <div className='sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-2'>{tocNav}</div>
        </aside>

        {/* Conteúdo */}
        <main className='min-w-0 max-w-4xl flex-1 py-8 lg:py-10'>
          {/* ===================== PRIMEIROS PASSOS ===================== */}
          <Section id='visao-geral' title='Visão geral'>
            <p>
              O <strong>WolkPay Gateway</strong> permite receber pagamentos via <strong>Pix</strong> e{' '}
              <strong>criptomoedas</strong> com uma API REST simples. Você cria um pagamento, mostra o QR Code
              Pix (ou envia o cliente para o checkout hospedado) e recebe a confirmação por webhook.
            </p>
            <ol className='grid gap-3 sm:grid-cols-4'>
              {[
                ['1', 'Criar', 'Seu servidor chama POST /payments'],
                ['2', 'Exibir', 'Mostre o Pix copia e cola ou redirecione ao checkout_url'],
                ['3', 'Pagar', 'O cliente paga no app do banco ou na carteira'],
                ['4', 'Confirmar', 'Você recebe o webhook payment.completed'],
              ].map(([n, t, d]) => (
                <li
                  key={n}
                  className='rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40'
                >
                  <span className='mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'>
                    {n}
                  </span>
                  <p className='font-semibold text-slate-900 dark:text-white'>{t}</p>
                  <p className='text-sm text-slate-500 dark:text-slate-400'>{d}</p>
                </li>
              ))}
            </ol>
            <p>
              Todas as requisições e respostas usam <C>JSON</C> em UTF-8. Valores monetários são retornados como{' '}
              <strong>string decimal</strong> (ex.: <C>"150.00"</C>) para evitar erros de arredondamento. Datas
              seguem ISO 8601 em UTC.
            </p>
          </Section>

          <Section id='inicio-rapido' title='Início rápido'>
            <ol className='list-decimal space-y-2 pl-5'>
              <li>
                Crie sua conta de lojista em <Link to='/register' className='text-indigo-600 hover:underline dark:text-indigo-400'>gateway.wolknow.com/register</Link>{' '}
                e aguarde a aprovação (status <C>ACTIVE</C>).
              </li>
              <li>
                Gere uma API key em{' '}
                <Link to='/api-keys' className='text-indigo-600 hover:underline dark:text-indigo-400'>
                  Painel → API Keys
                </Link>
                . A chave completa é exibida <strong>uma única vez</strong>.
              </li>
              <li>
                Configure a URL de webhook em{' '}
                <Link to='/webhooks' className='text-indigo-600 hover:underline dark:text-indigo-400'>
                  Painel → Webhooks
                </Link>{' '}
                e guarde o <C>webhook_secret</C>.
              </li>
              <li>Crie seu primeiro pagamento:</li>
            </ol>
            <CodeTabs examples={CREATE_PAYMENT} labels={LANG_LABEL} />
            <p>
              A resposta (<C>201 Created</C>) traz o <C>pix_qrcode</C> (Pix copia e cola), o{' '}
              <C>pix_qrcode_image</C> (PNG em base64) e o <C>checkout_url</C>. Veja{' '}
              <a href='#objeto-pagamento' className='text-indigo-600 hover:underline dark:text-indigo-400'>
                O objeto Payment
              </a>
              .
            </p>
          </Section>

          <Section id='autenticacao' title='Autenticação'>
            <p>
              Autentique as chamadas de integração enviando sua API key no header <C>Authorization</C> com o
              esquema <C>Bearer</C>:
            </p>
            <CodeBlock title='Header' code='Authorization: Bearer wkgw_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' />
            <ul className='list-disc space-y-1.5 pl-5'>
              <li>
                As chaves começam com <C>wkgw_live_</C> ou <C>wkgw_test_</C>. Guardamos apenas o hash — se perder a
                chave, revogue-a e gere outra.
              </li>
              <li>
                Opcionalmente, restrinja a chave a uma lista de <strong>IPs permitidos</strong> ao criá-la.
              </li>
              <li>
                Nunca exponha a API key no navegador ou no app mobile. Faça as chamadas sempre do seu servidor.
              </li>
              <li>
                A gestão de API keys e de webhooks é feita pelo <strong>painel</strong> (sessão do lojista), não
                pela API key.
              </li>
            </ul>
            <Callout tone='warning' title='Chave ausente ou inválida'>
              Sem o header <C>Authorization</C> a API responde <C>422</C>. Com chave inválida, revogada, expirada
              ou de IP não permitido, responde <C>401</C>.
            </Callout>
          </Section>

          <Section id='url-base' title='URL base e ambientes'>
            <CodeBlock title='URL base' code={API_BASE} />
            <p>
              Todos os caminhos desta documentação são relativos a essa URL. Exemplo: criar pagamento ={' '}
              <C>POST {API_BASE}/payments</C>.
            </p>
            <Callout tone='warning' title='Não há ambiente sandbox separado'>
              Chaves <C>wkgw_test_</C> servem para identificar integrações de teste, mas usam a mesma
              infraestrutura de produção: <strong>pagamentos Pix criados são cobranças reais</strong> no Banco do
              Brasil. Para homologar, use o valor mínimo e cancele os pagamentos de teste que não forem pagos.
            </Callout>
          </Section>

          <Section id='taxas-limites' title='Taxas e limites'>
            <p>
              Valores vigentes, carregados em tempo real de <C>GET /v1/gateway/fees</C> (endpoint público).
              Lojistas com contrato próprio podem ter taxas e limites diferentes — o valor aplicado a cada
              pagamento vem em <C>fee_percent</C> e <C>fee_amount</C>.
            </p>
            <div className='grid gap-3 sm:grid-cols-3'>
              {[
                ['Taxa Pix', formatPercent(fees?.pix_fee_percent)],
                ['Taxa cripto', formatPercent(fees?.crypto_fee_percent)],
                ['Pagamento mínimo', formatBRL(fees?.min_payment_brl)],
                ['Pagamento máximo', formatBRL(fees?.max_payment_brl)],
                ['Limite diário', formatBRL(fees?.daily_limit_brl)],
                ['Expiração', '5 min a 24 h'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className='rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40'
                >
                  <p className='text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400'>
                    {label}
                  </p>
                  <p className='mt-1 text-xl font-semibold text-slate-900 dark:text-white'>
                    {fees || label === 'Expiração' ? value : feesError ? '—' : '…'}
                  </p>
                </div>
              ))}
            </div>
            {feesError && (
              <p className='text-sm text-slate-500'>
                Não foi possível carregar as taxas agora. Consulte <C>GET /v1/gateway/fees</C> ou o seu painel.
              </p>
            )}
            <p>
              A taxa é descontada do valor recebido: <C>settlement_amount = amount_requested − fee_amount</C>.
            </p>
          </Section>

          {/* ===================== PAGAMENTOS ===================== */}
          <Section id='objeto-pagamento' title='O objeto Payment'>
            <p>Retornado ao criar, consultar e cancelar pagamentos.</p>
            <FieldTable
              fields={[
                { name: 'payment_id', type: 'string', description: <>Identificador público, formato <C>WKPAY-AAAAMMDD-XXXXXX</C>. Use-o nas demais chamadas.</> },
                { name: 'id', type: 'uuid', description: 'Identificador interno.' },
                { name: 'external_id', type: 'string | null', description: 'O ID do pedido no seu sistema, como você enviou.' },
                { name: 'payment_method', type: 'enum', description: <><C>PIX</C> ou <C>CRYPTO</C>.</> },
                { name: 'status', type: 'enum', description: <>Ver <a href='#status' className='text-indigo-600 hover:underline dark:text-indigo-400'>Ciclo de vida</a>.</> },
                { name: 'amount_requested', type: 'decimal', description: 'Valor cobrado do cliente.' },
                { name: 'currency_requested', type: 'string', description: <>Moeda, normalmente <C>BRL</C>.</> },
                { name: 'amount_received', type: 'decimal | null', description: 'Valor efetivamente recebido.' },
                { name: 'fee_percent / fee_amount', type: 'decimal', description: 'Taxa aplicada (percentual e valor).' },
                { name: 'settlement_amount', type: 'decimal', description: 'Valor líquido creditado a você.' },
                { name: 'expires_at', type: 'datetime', description: 'Prazo para pagamento.' },
                { name: 'pix_qrcode', type: 'string | null', description: <>Pix copia e cola (payload EMV, começa com <C>000201</C>).</> },
                { name: 'pix_qrcode_image', type: 'string | null', description: <>PNG do QR Code em base64 <strong>sem</strong> prefixo — use <C>data:image/png;base64,</C> + valor.</> },
                { name: 'crypto_*', type: 'vários', description: <>Moeda, rede, endereço, quantidade, hash e confirmações (pagamentos cripto).</> },
                { name: 'checkout_url', type: 'string', description: 'Página de pagamento hospedada pela WolkPay.' },
                { name: 'success_url / cancel_url', type: 'string | null', description: 'Redirecionamentos do checkout.' },
                { name: 'created_at / confirmed_at / completed_at', type: 'datetime', description: 'Marcos do pagamento.' },
              ]}
            />
            <CodeBlock title='Exemplo' code={PAYMENT_OBJECT_JSON} />
          </Section>

          <Section id='criar-pagamento' title='Criar pagamento'>
            <EndpointBadge method='POST' path='/payments' />
            <p>
              Cria um pagamento e, para Pix, já gera a cobrança no Banco do Brasil. Retorna <C>201</C> com o{' '}
              <a href='#objeto-pagamento' className='text-indigo-600 hover:underline dark:text-indigo-400'>objeto Payment</a>.
            </p>
            <FieldTable
              title='Corpo (JSON)'
              fields={[
                { name: 'payment_method', type: 'string', required: true, description: <><C>pix</C> ou <C>crypto</C>.</> },
                { name: 'amount', type: 'decimal', required: true, description: <>Valor em BRL. Respeita o mínimo/máximo em <a href='#taxas-limites' className='text-indigo-600 hover:underline dark:text-indigo-400'>Taxas e limites</a>.</> },
                { name: 'currency', type: 'string', description: <>Padrão <C>BRL</C>.</> },
                { name: 'crypto_currency', type: 'string', description: <>Obrigatório se <C>payment_method = crypto</C>. Ver <a href='#crypto' className='text-indigo-600 hover:underline dark:text-indigo-400'>Criptomoedas</a>.</> },
                { name: 'crypto_network', type: 'string', description: 'Rede blockchain. Se omitida, usamos a rede padrão da moeda.' },
                { name: 'external_id', type: 'string', description: 'Até 100 caracteres. Recomendado: o ID do pedido, para conciliar no webhook.' },
                { name: 'description', type: 'string', description: 'Até 500 caracteres. Os primeiros 140 aparecem no app do banco do pagador.' },
                { name: 'customer_email', type: 'email', description: 'E-mail do cliente.' },
                { name: 'customer_name', type: 'string', description: 'Nome do cliente.' },
                { name: 'customer_phone', type: 'string', description: 'Telefone do cliente.' },
                { name: 'customer_document', type: 'string', description: 'CPF (11 dígitos) — identifica o pagador na cobrança Pix.' },
                { name: 'expiration_minutes', type: 'integer', description: <>De <C>5</C> a <C>1440</C>. Padrão <C>30</C>.</> },
                { name: 'success_url / cancel_url', type: 'string', description: 'Para onde o checkout hospedado redireciona o cliente.' },
                { name: 'extra_data', type: 'object', description: 'Dados livres seus, devolvidos no pagamento.' },
              ]}
            />
            <CodeTabs examples={CREATE_PAYMENT} labels={LANG_LABEL} />
            <Callout tone='warning' title='Pix indisponível'>
              Se o Banco do Brasil não conseguir gerar a cobrança, a API responde <C>503</C> com{' '}
              <C>{'{"detail": {"code": "pix_unavailable", ...}}'}</C> e <strong>nenhum pagamento é criado</strong>.
              Tente novamente em instantes ou ofereça outro meio de pagamento.
            </Callout>
          </Section>

          <Section id='consultar-pagamento' title='Consultar pagamento'>
            <EndpointBadge method='GET' path='/payments/{payment_id}' />
            <p>
              Retorna o objeto Payment atualizado. Útil como conferência após receber um webhook. Responde{' '}
              <C>404</C> se não existir e <C>403</C> se pertencer a outro lojista.
            </p>
            <CodeBlock
              title='cURL'
              code={`curl "${API_BASE}/payments/WKPAY-20261106-ABD0E4" \\
  -H "Authorization: Bearer wkgw_live_SUA_API_KEY"`}
            />
          </Section>

          <Section id='listar-pagamentos' title='Listar pagamentos'>
            <EndpointBadge method='GET' path='/payments' />
            <FieldTable
              title='Parâmetros de consulta'
              fields={[
                { name: 'status', type: 'enum', description: <>Ex.: <C>PENDING</C>, <C>COMPLETED</C>.</> },
                { name: 'payment_method', type: 'enum', description: <><C>PIX</C> ou <C>CRYPTO</C>.</> },
                { name: 'external_id', type: 'string', description: 'Filtra pelo ID do seu pedido.' },
                { name: 'date_from / date_to', type: 'datetime', description: 'Intervalo de criação (ISO 8601).' },
                { name: 'page', type: 'integer', description: <>Página, a partir de <C>1</C>.</> },
                { name: 'per_page', type: 'integer', description: <>Itens por página, de <C>1</C> a <C>100</C> (padrão <C>20</C>).</> },
              ]}
            />
            <CodeBlock
              title='cURL'
              code={`curl "${API_BASE}/payments?status=COMPLETED&page=1&per_page=20" \\
  -H "Authorization: Bearer wkgw_live_SUA_API_KEY"`}
            />
            <CodeBlock title='Resposta' code={LIST_RESPONSE_JSON} />
          </Section>

          <Section id='cancelar-pagamento' title='Cancelar pagamento'>
            <EndpointBadge method='POST' path='/payments/{payment_id}/cancel' />
            <p>
              Cancela um pagamento com status <C>PENDING</C>. Para qualquer outro status a API responde{' '}
              <C>400</C>. Retorna o objeto Payment com status <C>CANCELLED</C>.
            </p>
            <CodeBlock
              title='cURL'
              code={`curl -X POST "${API_BASE}/payments/WKPAY-20261106-ABD0E4/cancel" \\
  -H "Authorization: Bearer wkgw_live_SUA_API_KEY"`}
            />
          </Section>

          <Section id='status' title='Ciclo de vida e status'>
            <div className='overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400'>
                  <tr>
                    <th className='px-4 py-2.5'>Status</th>
                    <th className='px-4 py-2.5'>Significado</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800/40'>
                  {[
                    ['PENDING', 'Aguardando o pagamento do cliente.'],
                    ['PROCESSING', 'Cripto recebida, aguardando confirmações na blockchain.'],
                    ['CONFIRMED', 'Pagamento confirmado.'],
                    ['COMPLETED', 'Concluído e creditado ao lojista. Status final de sucesso — libere o pedido.'],
                    ['EXPIRED', 'Prazo esgotado sem pagamento.'],
                    ['CANCELLED', 'Cancelado pelo lojista.'],
                    ['REFUNDED', 'Estornado.'],
                    ['FAILED', 'Falhou.'],
                  ].map(([s, d]) => (
                    <tr key={s}>
                      <td className='px-4 py-2.5'>
                        <C>{s}</C>
                      </td>
                      <td className='px-4 py-2.5 text-slate-600 dark:text-slate-300'>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock
              title='Fluxo típico'
              code={`PENDING ──► CONFIRMED ──► COMPLETED      (pago)
PENDING ──► EXPIRED                      (não pago no prazo)
PENDING ──► CANCELLED                    (cancelado por você)`}
            />
          </Section>

          {/* ===================== MÉTODOS ===================== */}
          <Section id='pix' title='Pix'>
            <ul className='list-disc space-y-1.5 pl-5'>
              <li>
                A cobrança Pix é gerada no Banco do Brasil no momento da criação (Pix dinâmico com valor fixo e
                vencimento).
              </li>
              <li>
                Mostre o <C>pix_qrcode</C> com botão “copiar” e o QR Code a partir de{' '}
                <C>pix_qrcode_image</C>.
              </li>
              <li>
                A confirmação é automática: assim que o Banco do Brasil notifica o pagamento (ou na conciliação
                periódica), o status avança e o webhook é enviado.
              </li>
            </ul>
            <CodeBlock
              title='HTML'
              code={`<img src="data:image/png;base64,{{ payment.pix_qrcode_image }}" alt="QR Code Pix" />
<textarea readonly>{{ payment.pix_qrcode }}</textarea>`}
            />
          </Section>

          <Section id='crypto' title='Criptomoedas'>
            <p>
              Envie <C>payment_method: "crypto"</C> e <C>crypto_currency</C>. Um endereço exclusivo é gerado para o
              pagamento, e a quantidade é calculada pela cotação no momento da criação.
            </p>
            <div className='overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400'>
                  <tr>
                    <th className='px-4 py-2.5'>Moeda</th>
                    <th className='px-4 py-2.5'>Rede padrão</th>
                    <th className='px-4 py-2.5'>Confirmações</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800/40'>
                  {[
                    ['BTC', 'bitcoin', '2'],
                    ['ETH', 'ethereum', '12'],
                    ['USDT', 'polygon', '30'],
                    ['USDC', 'polygon', '30'],
                    ['MATIC', 'polygon', '30'],
                    ['BNB', 'bsc', '15'],
                    ['SOL', 'solana', '32'],
                    ['LTC', 'litecoin', '6'],
                  ].map(([c, n, conf]) => (
                    <tr key={c}>
                      <td className='px-4 py-2.5 font-medium text-slate-900 dark:text-white'>{c}</td>
                      <td className='px-4 py-2.5'>
                        <C>{n}</C>
                      </td>
                      <td className='px-4 py-2.5 text-slate-600 dark:text-slate-300'>{conf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Redes aceitas em <C>crypto_network</C>: <C>bitcoin</C>, <C>ethereum</C>, <C>polygon</C>, <C>bsc</C>,{' '}
              <C>solana</C>, <C>litecoin</C>.
            </p>
            <CodeBlock
              title='Exemplo de corpo'
              code={`{
  "payment_method": "crypto",
  "amount": 250.00,
  "crypto_currency": "USDT",
  "crypto_network": "polygon",
  "external_id": "pedido-12346"
}`}
            />
          </Section>

          <Section id='checkout' title='Checkout hospedado'>
            <p>
              Todo pagamento tem um <C>checkout_url</C> ({CHECKOUT_BASE}/…): uma página pronta, responsiva, onde
              o cliente escolhe Pix ou cripto, vê o QR Code e acompanha a confirmação. Ao concluir, ele é
              redirecionado para o seu <C>success_url</C>.
            </p>
            <Callout title='Redirecionamento não é confirmação'>
              Libere o pedido somente após o webhook <C>payment.completed</C> (ou consultando{' '}
              <C>GET /payments/{'{payment_id}'}</C>), nunca apenas porque o cliente voltou ao <C>success_url</C>.
            </Callout>
            <p>Endpoints públicos usados pela página de checkout (não exigem API key):</p>
            <div className='space-y-2'>
              <EndpointBadge method='GET' path='/checkout/{token}' auth='publico' />
              <EndpointBadge method='POST' path='/checkout/{token}/select-method' auth='publico' />
              <EndpointBadge method='GET' path='/checkout/{token}/status' auth='publico' />
            </div>
            <p>
              <C>select-method</C> recebe <C>{'{"method": "PIX"}'}</C> ou{' '}
              <C>{'{"method": "CRYPTO", "crypto_currency": "USDT", "crypto_network": "polygon"}'}</C>.
            </p>
          </Section>

          {/* ===================== WEBHOOKS ===================== */}
          <Section id='webhooks-config' title='Webhooks: configuração'>
            <p>
              Em{' '}
              <Link to='/webhooks' className='text-indigo-600 hover:underline dark:text-indigo-400'>
                Painel → Webhooks
              </Link>{' '}
              informe a URL HTTPS que receberá os eventos e escolha quais eventos deseja. O painel mostra o{' '}
              <C>webhook_secret</C>, usado para assinar cada entrega. Você pode regenerá-lo a qualquer momento —
              atualize seu servidor em seguida.
            </p>
            <Callout tone='warning'>
              Use <strong>HTTPS</strong> e responda com status <C>2xx</C> em até 30 segundos.
            </Callout>
          </Section>

          <Section id='webhooks-eventos' title='Eventos e payload'>
            <div className='overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400'>
                  <tr>
                    <th className='px-4 py-2.5'>Evento</th>
                    <th className='px-4 py-2.5'>Quando é enviado</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800/40'>
                  {[
                    ['payment.confirmed', 'O pagamento foi confirmado (Pix recebido ou cripto com confirmações suficientes).'],
                    ['payment.completed', 'O pagamento foi concluído e creditado. Use este evento para liberar o pedido.'],
                    ['payment.expired', 'O prazo terminou sem pagamento.'],
                  ].map(([e, d]) => (
                    <tr key={e}>
                      <td className='whitespace-nowrap px-4 py-2.5'>
                        <C>{e}</C>
                      </td>
                      <td className='px-4 py-2.5 text-slate-600 dark:text-slate-300'>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Cada entrega é um <C>POST</C> com o corpo JSON abaixo. O campo <C>event</C> indica o tipo e{' '}
              <C>data.external_id</C> traz o ID do seu pedido.
            </p>
            <CodeBlock title='Requisição enviada ao seu servidor' code={WEBHOOK_PAYLOAD_JSON} />
            <FieldTable
              title='Headers'
              fields={[
                { name: 'X-WolkPay-Signature', type: 'hex', description: <>HMAC-SHA256 do corpo bruto com o seu <C>webhook_secret</C>.</> },
                { name: 'X-WolkPay-Event', type: 'string', description: <>Nome do evento (igual a <C>event</C> no corpo).</> },
                { name: 'X-WolkPay-Delivery', type: 'uuid', description: 'ID único da entrega (igual a webhook_id). Use para idempotência.' },
              ]}
            />
          </Section>

          <Section id='webhooks-assinatura' title='Verificar assinatura'>
            <p>
              Calcule <C>HMAC-SHA256(webhook_secret, corpo_bruto)</C> em hexadecimal e compare com{' '}
              <C>X-WolkPay-Signature</C> usando comparação de tempo constante. Use os <strong>bytes exatos</strong>{' '}
              recebidos — reserializar o JSON muda a assinatura.
            </p>
            <CodeTabs
              examples={VERIFY_SIGNATURE}
              labels={{ node: 'Node.js (Express)', python: 'Python (FastAPI)', php: 'PHP' }}
            />
          </Section>

          <Section id='webhooks-retentativas' title='Entrega e retentativas'>
            <ul className='list-disc space-y-1.5 pl-5'>
              <li>
                Consideramos entregue quando seu servidor responde <C>200</C>, <C>201</C>, <C>202</C> ou{' '}
                <C>204</C>. Timeout de 30 segundos.
              </li>
              <li>
                Em caso de falha, reenviamos até <strong>5 tentativas</strong> no total, com intervalos crescentes
                (aprox. 1 min, 5 min, 15 min, 1 h e 4 h).
              </li>
              <li>
                Uma mesma entrega pode chegar mais de uma vez. Trate eventos de forma <strong>idempotente</strong>{' '}
                usando <C>X-WolkPay-Delivery</C> ou <C>payment_id</C> + <C>event</C>.
              </li>
              <li>O histórico de entregas fica disponível no painel, em Webhooks.</li>
            </ul>
          </Section>

          {/* ===================== REFERÊNCIA ===================== */}
          <Section id='erros' title='Erros'>
            <p>
              Erros retornam o status HTTP apropriado e um corpo com <C>detail</C> — texto, objeto ou, em erros de
              validação (<C>422</C>), a lista de campos inválidos.
            </p>
            <div className='overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400'>
                  <tr>
                    <th className='px-4 py-2.5'>HTTP</th>
                    <th className='px-4 py-2.5'>Quando acontece</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800/40'>
                  {[
                    ['400', 'Regra de negócio: valor abaixo do mínimo/acima do máximo, limite diário excedido, lojista inativo, cancelar pagamento que não está pendente.'],
                    ['401', 'API key inválida, revogada, expirada, de IP não permitido ou sem o prefixo Bearer.'],
                    ['403', 'O pagamento pertence a outro lojista.'],
                    ['404', 'Pagamento não encontrado.'],
                    ['422', 'Corpo ou header inválido (ex.: payment_method ausente, crypto_currency ausente para cripto, Authorization ausente).'],
                    ['503', <>Pix temporariamente indisponível (<C>pix_unavailable</C>). Nenhum pagamento foi criado; tente novamente.</>],
                  ].map(([code, d]) => (
                    <tr key={code as string}>
                      <td className='px-4 py-2.5 font-mono font-semibold text-slate-900 dark:text-white'>{code}</td>
                      <td className='px-4 py-2.5 text-slate-600 dark:text-slate-300'>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock
              title='Exemplos'
              code={`// 400
{ "detail": "Valor mínimo: R$ 5.00" }

// 503
{ "detail": { "code": "pix_unavailable", "message": "Pix indisponível no momento. Tente novamente em instantes." } }

// 422
{ "detail": [ { "type": "missing", "loc": ["body", "payment_method"], "msg": "Field required" } ] }`}
            />
          </Section>

          <Section id='endpoints' title='Todos os endpoints'>
            <p className='text-sm'>Integração (servidor a servidor, com API key):</p>
            <div className='space-y-2'>
              <EndpointBadge method='POST' path='/payments' />
              <EndpointBadge method='GET' path='/payments' />
              <EndpointBadge method='GET' path='/payments/{payment_id}' />
              <EndpointBadge method='POST' path='/payments/{payment_id}/cancel' />
            </div>
            <p className='pt-2 text-sm'>Públicos:</p>
            <div className='space-y-2'>
              <EndpointBadge method='GET' path='/fees' auth='publico' />
              <EndpointBadge method='GET' path='/checkout/{token}' auth='publico' />
              <EndpointBadge method='POST' path='/checkout/{token}/select-method' auth='publico' />
              <EndpointBadge method='GET' path='/checkout/{token}/status' auth='publico' />
            </div>
            <p className='pt-2 text-sm'>Gerenciados pelo painel (sessão do lojista):</p>
            <div className='space-y-2'>
              <EndpointBadge method='GET' path='/api-keys' auth='painel' />
              <EndpointBadge method='POST' path='/api-keys' auth='painel' />
              <EndpointBadge method='DELETE' path='/api-keys/{api_key_id}' auth='painel' />
              <EndpointBadge method='GET' path='/webhooks/config' auth='painel' />
              <EndpointBadge method='PUT' path='/webhooks/config' auth='painel' />
              <EndpointBadge method='POST' path='/webhooks/regenerate-secret' auth='painel' />
              <EndpointBadge method='GET' path='/webhooks/events' auth='painel' />
            </div>
          </Section>

          <Section id='checklist' title='Checklist de produção'>
            <ul className='space-y-2'>
              {[
                'API key guardada em variável de ambiente no servidor (nunca no front-end).',
                'external_id preenchido com o ID do pedido em todos os pagamentos.',
                'Webhook em HTTPS validando X-WolkPay-Signature com o corpo bruto.',
                'Processamento idempotente de webhooks (X-WolkPay-Delivery).',
                'Pedido liberado apenas em payment.completed (ou após consultar o pagamento).',
                'Tratamento do 503 pix_unavailable com nova tentativa ou meio alternativo.',
                'Pagamentos expirados tratados (payment.expired) para liberar estoque.',
                'Timeout de requisição de pelo menos 60 s na criação de pagamento Pix.',
              ].map(item => (
                <li key={item} className='flex gap-2.5'>
                  <Check className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500' />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id='suporte' title='Suporte'>
            <div className='flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/40 sm:flex-row sm:items-center'>
              <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15'>
                <LifeBuoy className='h-5 w-5 text-indigo-600 dark:text-indigo-300' />
              </span>
              <div className='flex-1'>
                <p className='font-semibold text-slate-900 dark:text-white'>Precisa de ajuda com a integração?</p>
                <p className='text-sm text-slate-500 dark:text-slate-400'>
                  Envie o <C>payment_id</C> e o horário da requisição para agilizar o atendimento.
                </p>
              </div>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className='rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700'
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </Section>
        </main>
      </div>
    </div>
  )
}
