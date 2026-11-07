import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronDown, ShieldCheck, Timer, Zap } from 'lucide-react'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import { currencyManager } from '@/services/currency'
import { usePrices } from '@/hooks/usePrices'
import { useWallets, useMultipleWalletBalances } from '@/hooks/useWallet'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useHoldings } from '@/pages/dashboard/home/usePortfolio'
import { PortfolioChart } from '@/pages/dashboard/home/PortfolioChart'
import { ConfirmationPanel, TradeData } from './components/ConfirmationPanel'
import { TradeHistoryPanel } from './components/TradeHistoryPanel'
import { TradeDetailsPage } from './components/TradeDetailsPage'
import { OrderTicket, type AssetRow, type OtcQuote } from './components/otc/OrderTicket'
import { BINANCE_PAIRS, type ChartRange, chartPairFor, useBinanceCloses, useBinanceTickers } from './hooks/useBinanceMarket'

const SUPPORTED = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether USD' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'TRX', name: 'TRON' },
  { symbol: 'MATIC', name: 'Polygon (POL)' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
  { symbol: 'DAI', name: 'Dai' },
  { symbol: 'TRAY', name: 'Trayon' },
]
const RANGES: ChartRange[] = ['24h', '7D', '30D', '1A']

const card = 'bg-white border border-gray-200 dark:bg-[#111724] dark:border-[#1E2738] rounded-2xl'
const muted = 'text-gray-500 dark:text-[#8590A6]'
const soft = 'text-gray-600 dark:text-[#A3ADC2]'
const upText = 'text-emerald-600 dark:text-[#34C77B]'
const downText = 'text-red-600 dark:text-[#FF7A7A]'

const pct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2).replace('.', ',')}%`

type Step = 'order' | 'confirm' | 'track'

export function InstantTradePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language || 'pt-BR'
  const [params] = useSearchParams()
  const { currency, formatCurrency } = useCurrencyStore()

  const [side, setSide] = useState<'buy' | 'sell'>(params.get('side') === 'sell' ? 'sell' : 'buy')
  const [symbol, setSymbol] = useState(() => {
    const s = (params.get('symbol') || 'BTC').toUpperCase()
    return SUPPORTED.some(c => c.symbol === s) ? s : 'BTC'
  })
  const initialAmount = useMemo(() => {
    const a = Number(params.get('amount'))
    return a > 0 ? a.toLocaleString('pt-BR', { maximumFractionDigits: 8 }) : undefined
  }, [params])
  const [range, setRange] = useState<ChartRange>('24h')
  const [step, setStep] = useState<Step>('order')
  const [quote, setQuote] = useState<OtcQuote | null>(null)
  const [tradeId, setTradeId] = useState<string | null>(null)
  const [tradeData, setTradeData] = useState<TradeData | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Preço spot em tempo real (Binance) + reserva do backend para ativos fora da Binance
  const { ticks, usdtBrl, connected } = useBinanceTickers()
  const { prices: backendPrices } = usePrices(SUPPORTED.map(c => c.symbol), 'USD')

  /** Preço (em USD/USDT) e variação 24h do ativo. */
  const spot = (s: string): { usd: number; change: number } | null => {
    const tk = ticks[s]
    if (tk) return { usd: tk.last, change: tk.change }
    if (s === 'USDT') return { usd: 1, change: currency === 'BRL' && usdtBrl ? usdtBrl.change : 0 }
    const b = backendPrices[s]
    return b?.price ? { usd: b.price, change: b.change_24h || 0 } : null
  }
  /** USD → moeda do usuário; em reais usa o USDT/BRL ao vivo. */
  const fmt = (usd: number) => {
    if (currency === 'BRL' && usdtBrl) {
      const v = usd * usdtBrl.last
      return v.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: v < 1 ? 6 : 2,
      })
    }
    return formatCurrency(usd)
  }

  const assets: AssetRow[] = SUPPORTED.map(c => {
    const p = spot(c.symbol)
    return { symbol: c.symbol, name: c.name, price: p ? fmt(p.usd) : '—', change: p?.change ?? 0 }
  })
  const current = spot(symbol)
  const tick = ticks[symbol]
  const selectedName = SUPPORTED.find(c => c.symbol === symbol)?.name || symbol

  // Gráfico de linha do ativo
  const pair = chartPairFor(symbol)
  const pairInBrl = pair === 'USDTBRL'
  const { data: closes = [], isLoading: chartLoading } = useBinanceCloses(pair, range)
  const chartFormat = (v: number) => {
    if (!pairInBrl) return fmt(v)
    const local = currencyManager.convert(v, 'BRL', currency).convertedValue
    return local.toLocaleString(currency === 'BRL' ? 'pt-BR' : currency === 'EUR' ? 'de-DE' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 4,
    })
  }
  const rangeChange = closes.length > 1 && closes[0]!.v ? ((closes[closes.length - 1]!.v - closes[0]!.v) / closes[0]!.v) * 100 : null

  // Saldo disponível para venda (todas as carteiras e redes)
  const { data: wallets } = useWallets()
  const walletIds = useMemo(() => wallets?.map((w: any) => String(w.id)) || [], [wallets])
  const balanceQueries = useMultipleWalletBalances(walletIds)
  const balancesKey = balanceQueries.map(q => q.dataUpdatedAt).join('|')
  const balanceData = useMemo(() => balanceQueries.map(q => q.data as Record<string, any> | undefined), [balancesKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const noPrices = useMemo(() => ({}), [])
  const { holdings } = useHoldings(balanceData, noPrices)
  const balance = holdings.find(h => h.symbol === symbol)?.quantity ?? 0

  const steps: Array<{ id: Step; label: string }> = [
    { id: 'order', label: t('otc.steps.order') },
    { id: 'confirm', label: t('otc.steps.confirm') },
    { id: 'track', label: t('otc.steps.track') },
  ]
  const stepIndex = steps.findIndex(s => s.id === step)

  const header = (
    <div className='flex flex-wrap items-center justify-between gap-4 mb-6'>
      <div className='min-w-0'>
        <h1 className='text-xl sm:text-2xl font-semibold text-gray-900 dark:text-[#EEF1F7]'>{t('otc.title')}</h1>
        <p className={`text-sm ${muted} flex items-center gap-2`}>
          <span
            aria-hidden='true'
            className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 dark:bg-[#34C77B]' : 'bg-amber-500'}`}
          />
          {connected ? t('otc.live') : t('otc.connecting')}
        </p>
      </div>
      <ol aria-label={t('otc.steps.label')} className='flex items-center gap-2 text-sm'>
        {steps.map((s, i) => (
          <li key={s.id} className='flex items-center gap-2'>
            <span
              aria-current={i === stepIndex ? 'step' : undefined}
              className={`inline-flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border ${
                i === stepIndex
                  ? 'border-blue-600 text-gray-900 dark:border-[#5B8CFF] dark:text-[#EEF1F7] font-semibold'
                  : i < stepIndex
                    ? `border-gray-200 dark:border-[#222B3D] ${soft}`
                    : `border-gray-200 dark:border-[#222B3D] ${muted}`
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                  i <= stepIndex ? 'bg-blue-600 text-white dark:bg-[#5B8CFF] dark:text-[#0A0E15]' : 'bg-gray-100 dark:bg-[#172033]'
                }`}
              >
                {i + 1}
              </span>
              <span className={i === stepIndex ? '' : 'hidden sm:inline'}>{s.label}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )

  // Etapa 3: ordem criada → instruções de pagamento e acompanhamento
  if (step === 'track' && tradeId) {
    return (
      <div className='max-w-[1600px] mx-auto' key={i18n.language}>
        {header}
        <TradeDetailsPage
          tradeId={tradeId}
          onBack={() => {
            setTradeId(null)
            setTradeData(null)
            setStep('order')
          }}
          initialData={tradeData as unknown as Record<string, unknown> | undefined}
        />
      </div>
    )
  }

  // Etapa 2: forma de pagamento e confirmação
  if (step === 'confirm' && quote) {
    return (
      <div className='max-w-[1600px] mx-auto' key={i18n.language}>
        {header}
        <button
          type='button'
          onClick={() => setStep('order')}
          className={`mb-4 inline-flex items-center gap-2 h-10 text-sm font-medium ${soft} hover:text-gray-900 dark:hover:text-white`}
        >
          <ArrowLeft className='w-4 h-4' aria-hidden='true' />
          {t('otc.backToOrder')}
        </button>
        <ConfirmationPanel
          quote={quote}
          onBack={() => setStep('order')}
          onRefreshQuote={() => {
            setQuote(null)
            setStep('order')
          }}
          onSuccess={(id, data) => {
            setTradeId(id)
            if (data) setTradeData(data)
            setQuote(null)
            setStep('track')
          }}
        />
      </div>
    )
  }

  // Etapa 1: mercado + boleta
  return (
    <div className='max-w-[1600px] mx-auto text-gray-900 dark:text-[#EEF1F7] tabular-nums' key={i18n.language}>
      {header}

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] items-start'>
        {/* Boleta: primeiro no celular, à direita (fixa ao rolar) no desktop */}
        <div className='lg:col-start-2 lg:row-start-1 lg:sticky lg:top-4'>
          <OrderTicket
            side={side}
            onSideChange={setSide}
            symbol={symbol}
            onSymbolChange={setSymbol}
            assets={assets}
            balance={balance}
            initialAmount={initialAmount}
            onContinue={q => {
              setQuote(q)
              setStep('confirm')
            }}
          />
          <ul className={`mt-4 grid grid-cols-3 gap-2 text-xs ${muted}`}>
            <li className='flex flex-col items-center gap-1 text-center'>
              <Zap className='w-4 h-4' aria-hidden='true' />
              {t('otc.trust.instant')}
            </li>
            <li className='flex flex-col items-center gap-1 text-center'>
              <Timer className='w-4 h-4' aria-hidden='true' />
              {t('otc.trust.locked')}
            </li>
            <li className='flex flex-col items-center gap-1 text-center'>
              <ShieldCheck className='w-4 h-4' aria-hidden='true' />
              {t('otc.trust.noHidden')}
            </li>
          </ul>
        </div>

        {/* Mercado */}
        <div className='lg:col-start-1 lg:row-start-1 flex flex-col gap-6 min-w-0'>
          <section aria-labelledby='otc-market' className={`${card} p-5 sm:p-6`}>
            <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4'>
              <div className='flex items-center gap-4 min-w-0'>
                <CryptoIcon symbol={symbol} size={44} className='rounded-full shrink-0' />
                <div className='min-w-0'>
                  <h2 id='otc-market' className={`text-sm ${soft}`}>
                    {selectedName} · {t('otc.spotRef')}
                  </h2>
                  <p className='font-["Space_Grotesk",Inter,sans-serif] text-3xl sm:text-4xl font-semibold tracking-tight'>
                    {current ? fmt(current.usd) : '—'}
                  </p>
                  {current && (
                    <p className='text-sm flex flex-wrap gap-x-2'>
                      <span className={`font-semibold ${current.change >= 0 ? upText : downText}`}>{pct(current.change)}</span>
                      <span className={muted}>{t('otc.in24h')}</span>
                    </p>
                  )}
                </div>
              </div>
              <div role='tablist' aria-label={t('otc.range')} className='grid grid-cols-4 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#0D121C] dark:border dark:border-[#1E2738]'>
                {RANGES.map(r => (
                  <button
                    key={r}
                    type='button'
                    role='tab'
                    aria-selected={r === range}
                    onClick={() => setRange(r)}
                    className={`h-9 sm:min-w-[52px] px-3 rounded-lg text-sm ${
                      r === range
                        ? 'bg-white shadow-sm font-semibold dark:bg-[#172033] dark:shadow-none'
                        : `font-medium ${muted} hover:text-gray-900 dark:hover:text-[#EEF1F7]`
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className='-mx-5 sm:mx-0 mt-5'>
              <PortfolioChart
                points={closes}
                period={range}
                loading={chartLoading}
                hidden={false}
                format={chartFormat}
                locale={locale}
                emptyLabel={BINANCE_PAIRS[symbol] || pairInBrl ? t('otc.chartUnavailable') : t('otc.chartNoSpot')}
                ariaLabel={t('otc.chartAria', { symbol })}
              />
            </div>

            <dl className='mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm'>
              <div>
                <dt className={muted}>{t('otc.high24h')}</dt>
                <dd className='font-semibold'>{tick ? fmt(tick.high) : '—'}</dd>
              </div>
              <div>
                <dt className={muted}>{t('otc.low24h')}</dt>
                <dd className='font-semibold'>{tick ? fmt(tick.low) : '—'}</dd>
              </div>
              <div>
                <dt className={muted}>{t('otc.rangeChange', { range })}</dt>
                <dd className={`font-semibold ${rangeChange == null ? '' : rangeChange >= 0 ? upText : downText}`}>
                  {rangeChange == null ? '—' : pct(rangeChange)}
                </dd>
              </div>
              <div>
                <dt className={muted}>USDT/BRL</dt>
                <dd className='font-semibold'>
                  {usdtBrl ? usdtBrl.last.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 }) : '—'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Lista de ativos com preço ao vivo */}
          <section aria-labelledby='otc-assets' className={`${card} p-5 sm:p-6`}>
            <h2 id='otc-assets' className='text-lg font-semibold mb-2'>
              {t('otc.assets')}
            </h2>
            <ul className='grid sm:grid-cols-2 2xl:grid-cols-3 gap-x-6'>
              {assets.map(a => (
                <li key={a.symbol} className='border-b border-gray-100 dark:border-[#1A2232]'>
                  <button
                    type='button'
                    aria-pressed={a.symbol === symbol}
                    onClick={() => {
                      setSymbol(a.symbol)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className={`w-full flex items-center gap-3 py-3 px-2 -mx-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                      a.symbol === symbol ? 'bg-blue-50/60 dark:bg-[#172033]' : ''
                    }`}
                  >
                    <CryptoIcon symbol={a.symbol} size={32} className='rounded-full shrink-0' />
                    <span className='flex-1 min-w-0'>
                      <span className='block text-sm font-semibold'>{a.symbol}</span>
                      <span className={`block text-xs ${muted} truncate`}>{a.name}</span>
                    </span>
                    <span className='text-right'>
                      <span className='block text-sm font-semibold'>{a.price}</span>
                      <span className={`block text-xs ${a.change >= 0 ? upText : downText}`}>{pct(a.change)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className={`mt-4 text-xs ${muted}`}>{t('otc.spotNote')}</p>
          </section>

          {/* Suas ordens */}
          <section className={`${card} overflow-hidden`}>
            <button
              type='button'
              aria-expanded={showHistory}
              onClick={() => setShowHistory(s => !s)}
              className='w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02]'
            >
              <span className='text-lg font-semibold'>{t('otc.myOrders')}</span>
              <ChevronDown className={`w-5 h-5 ${muted} transition-transform ${showHistory ? 'rotate-180' : ''}`} aria-hidden='true' />
            </button>
            {showHistory && (
              <div className='border-t border-gray-100 dark:border-[#1E2738]'>
                <TradeHistoryPanel
                  currencySymbol={currency === 'BRL' ? 'R$' : currency === 'EUR' ? '€' : '$'}
                  currencyLocale={currency === 'BRL' ? 'pt-BR' : currency === 'EUR' ? 'de-DE' : 'en-US'}
                  isVisible={showHistory}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
