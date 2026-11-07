import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, ChevronDown, Loader2, Search } from 'lucide-react'
import { apiClient } from '@/services/api'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import { currencyManager } from '@/services/currency'

export interface OtcQuote {
  quote_id: string
  operation: 'buy' | 'sell'
  symbol: string
  crypto_price: number
  otc_price?: number
  fiat_amount: number
  crypto_amount: number
  spread_percentage: number
  spread_amount: number
  network_fee_percentage: number
  network_fee_amount: number
  total_amount: number
  expires_in_seconds: number
}

export interface AssetRow {
  symbol: string
  name: string
  price: string
  change: number
}

interface Props {
  side: 'buy' | 'sell'
  onSideChange: (s: 'buy' | 'sell') => void
  symbol: string
  onSymbolChange: (s: string) => void
  assets: AssetRow[]
  balance: number
  initialAmount?: string
  onContinue: (q: OtcQuote) => void
}

const card = 'bg-white border border-gray-200 dark:bg-[#111724] dark:border-[#1E2738] rounded-2xl'
const muted = 'text-gray-500 dark:text-[#8590A6]'
const soft = 'text-gray-600 dark:text-[#A3ADC2]'
const BUY_CHIPS = [100, 500, 1000, 5000]
const SELL_CHIPS = [25, 50, 75, 100]

const LOCALES: Record<string, string> = { BRL: 'pt-BR', USD: 'en-US', EUR: 'de-DE' }
const SYMBOLS: Record<string, string> = { BRL: 'R$', USD: 'US$', EUR: '€' }
const qty = (v: number, sym: string) =>
  `${v.toLocaleString('pt-BR', { maximumFractionDigits: sym === 'USDT' || sym === 'USDC' ? 2 : 8 })} ${sym}`
const parse = (s: string) => Number.parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
const pctLabel = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

/** Boleta da OTC: lado, ativo, valor e cotação firme do backend com contagem regressiva. */
export const OrderTicket = ({ side, onSideChange, symbol, onSymbolChange, assets, balance, initialAmount, onContinue }: Props) => {
  const { t } = useTranslation()
  const { currency } = useCurrencyStore()
  /** O motor da OTC cota em BRL; a tela mostra na moeda escolhida pelo usuário. */
  const brl = (v: number) =>
    new Intl.NumberFormat(LOCALES[currency] || 'pt-BR', { style: 'currency', currency }).format(
      currencyManager.convert(v, 'BRL', currency).convertedValue
    )
  const toBrl = (v: number) => currencyManager.convert(v, currency, 'BRL').convertedValue
  const [text, setText] = useState(initialAmount || (side === 'buy' ? '1.000' : ''))
  const [quote, setQuote] = useState<OtcQuote | null>(null)
  const [expiresAt, setExpiresAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const reqId = useRef(0)

  const amount = parse(text)
  const overBalance = side === 'sell' && amount > balance
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000))
  const validity = quote ? Math.max(1, quote.expires_in_seconds || 30) : 30

  // Cotação firme (debounce); recotar sozinho quando expira
  const lastKey = useRef('')
  useEffect(() => {
    // Mudou o pedido: descarta a cotação; só renovou (expirou): mantém a antiga na tela até chegar a nova
    const key = `${side}|${symbol}|${amount}`
    if (key !== lastKey.current) {
      lastKey.current = key
      setQuote(null)
    }
    setError(null)
    if (amount <= 0 || overBalance) {
      setQuote(null)
      return
    }
    const id = ++reqId.current
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await apiClient.post('/instant-trade/quote', {
          operation: side,
          symbol,
          [side === 'buy' ? 'fiat_amount' : 'crypto_amount']: side === 'buy' ? Number(toBrl(amount).toFixed(2)) : amount,
        })
        if (id !== reqId.current) return
        const q = r.data?.quote as OtcQuote
        setQuote(q)
        setExpiresAt(Date.now() + Math.max(1, q.expires_in_seconds || 30) * 1000)
      } catch (e: any) {
        if (id !== reqId.current) return
        const detail = e?.response?.data?.detail
        setError(typeof detail === 'string' ? detail : t('otc.ticket.quoteError'))
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [side, symbol, amount, overBalance, nonce, currency]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!quote) return
    const i = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(i)
  }, [quote])

  useEffect(() => {
    if (quote && secondsLeft === 0 && document.visibilityState === 'visible') setNonce(n => n + 1)
  }, [quote, secondsLeft])

  const selected = assets.find(a => a.symbol === symbol)
  const switchSide = (s: 'buy' | 'sell') => {
    if (s === side) return
    onSideChange(s)
    setText(s === 'buy' ? '1.000' : '')
  }

  const rows = useMemo(() => {
    if (!quote) return []
    const price = quote.otc_price || quote.crypto_price
    const base = [
      { k: t('otc.ticket.price', { symbol }), v: brl(price) },
      { k: `${t('otc.ticket.spread')} (${pctLabel(quote.spread_percentage)})`, v: brl(quote.spread_amount) },
      { k: `${t('otc.ticket.networkFee')} (${pctLabel(quote.network_fee_percentage)})`, v: brl(quote.network_fee_amount) },
    ]
    return quote.operation === 'buy'
      ? [{ k: t('otc.ticket.youPay'), v: brl(quote.fiat_amount) }, ...base]
      : [{ k: t('otc.ticket.youSell'), v: qty(quote.crypto_amount, symbol) }, { k: t('otc.ticket.marketValue'), v: brl(quote.fiat_amount) }, ...base]
  }, [quote, symbol, t])

  return (
    <section aria-labelledby='otc-ticket' className={`${card} p-5 sm:p-6 flex flex-col gap-5`}>
      <h2 id='otc-ticket' className='sr-only'>
        {t('otc.ticket.title')}
      </h2>

      {/* Comprar / Vender */}
      <div role='tablist' aria-label={t('otc.ticket.operation')} className='grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#0D121C] dark:border dark:border-[#1E2738]'>
        {(['buy', 'sell'] as const).map(s => (
          <button
            key={s}
            type='button'
            role='tab'
            aria-selected={side === s}
            onClick={() => switchSide(s)}
            className={`h-11 rounded-lg text-[15px] transition-colors ${
              side === s
                ? 'bg-white shadow-sm font-semibold text-gray-900 dark:bg-[#172033] dark:text-[#EEF1F7] dark:shadow-none'
                : `font-medium ${muted} hover:text-gray-900 dark:hover:text-[#EEF1F7]`
            }`}
          >
            {t(`otc.ticket.${s}`)}
          </button>
        ))}
      </div>

      {/* Ativo */}
      <div className='relative'>
        <span className={`block text-sm mb-2 ${soft}`}>{t('otc.ticket.asset')}</span>
        <button
          type='button'
          aria-haspopup='listbox'
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen(o => !o)}
          className='w-full h-14 px-4 rounded-xl border border-gray-200 bg-white dark:border-[#2A3449] dark:bg-[#0D121C] flex items-center gap-3 text-left hover:border-gray-300 dark:hover:border-[#3A4660]'
        >
          <CryptoIcon symbol={symbol} size={30} className='rounded-full shrink-0' />
          <span className='flex-1 min-w-0'>
            <span className='block font-semibold text-gray-900 dark:text-[#EEF1F7]'>{symbol}</span>
            <span className={`block text-xs ${muted} truncate`}>{selected?.name}</span>
          </span>
          <span className='text-right'>
            <span className='block text-sm font-semibold text-gray-900 dark:text-[#EEF1F7] tabular-nums'>{selected?.price}</span>
          </span>
          <ChevronDown className={`w-5 h-5 ${muted} transition-transform ${pickerOpen ? 'rotate-180' : ''}`} aria-hidden='true' />
        </button>
        {pickerOpen && (
          <AssetList
            assets={assets}
            symbol={symbol}
            onPick={s => {
              onSymbolChange(s)
              setPickerOpen(false)
              if (side === 'sell') setText('')
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {/* Valor */}
      <div>
        <div className='flex items-baseline justify-between mb-2'>
          <label htmlFor='otc-amount' className={`text-sm ${soft}`}>
            {side === 'buy' ? t('otc.ticket.amountBuy') : t('otc.ticket.amountSell')}
          </label>
          {side === 'sell' && (
            <span className={`text-xs ${muted} tabular-nums`}>
              {t('otc.ticket.available')}: {qty(balance, symbol)}
            </span>
          )}
        </div>
        <div
          className={`flex items-center gap-3 h-14 px-4 rounded-xl border bg-white dark:bg-[#0D121C] focus-within:border-blue-500 dark:focus-within:border-[#5B8CFF] ${
            overBalance ? 'border-red-400 dark:border-[#FF7A7A]' : 'border-gray-200 dark:border-[#2A3449]'
          }`}
        >
          <span className={`text-base ${muted}`}>{side === 'buy' ? SYMBOLS[currency] || currency : symbol}</span>
          <input
            id='otc-amount'
            inputMode='decimal'
            autoComplete='off'
            value={text}
            onChange={e => setText(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder='0,00'
            className='flex-1 min-w-0 bg-transparent outline-none text-2xl font-semibold text-gray-900 dark:text-[#EEF1F7] tabular-nums placeholder:text-gray-300 dark:placeholder:text-[#3A4660]'
          />
        </div>
        {overBalance && <p className='mt-2 text-sm text-red-600 dark:text-[#FF7A7A]'>{t('otc.ticket.insufficient')}</p>}
        <div className='mt-3 grid grid-cols-4 gap-2'>
          {side === 'buy'
            ? BUY_CHIPS.map(v => (
                <button
                  key={v}
                  type='button'
                  onClick={() => setText(v.toLocaleString('pt-BR'))}
                  className={`h-9 rounded-lg border border-gray-200 dark:border-[#222B3D] text-sm ${soft} hover:border-gray-300 dark:hover:border-[#2F3D5C] tabular-nums`}
                >
                  {v >= 1000 ? `${v / 1000} mil` : v}
                </button>
              ))
            : SELL_CHIPS.map(p => (
                <button
                  key={p}
                  type='button'
                  disabled={balance <= 0}
                  onClick={() => setText(((balance * p) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 8, useGrouping: false }))}
                  className={`h-9 rounded-lg border border-gray-200 dark:border-[#222B3D] text-sm ${soft} hover:border-gray-300 dark:hover:border-[#2F3D5C] disabled:opacity-40`}
                >
                  {p === 100 ? t('otc.ticket.max') : `${p}%`}
                </button>
              ))}
        </div>
      </div>

      {/* Cotação */}
      <div className='rounded-xl bg-gray-50 dark:bg-[#0D121C] p-4' aria-live='polite'>
        <div className='flex items-center justify-between gap-3'>
          <span className={`text-sm ${soft}`}>{t('otc.ticket.youGet')}</span>
          {quote && (
            <span className={`inline-flex items-center gap-2 text-xs ${muted} tabular-nums`}>
              <svg width='16' height='16' viewBox='0 0 16 16' aria-hidden='true' className='-rotate-90'>
                <circle cx='8' cy='8' r='6.5' fill='none' className='stroke-gray-200 dark:stroke-[#222B3D]' strokeWidth='2' />
                <circle
                  cx='8'
                  cy='8'
                  r='6.5'
                  fill='none'
                  className='stroke-blue-600 dark:stroke-[#5B8CFF]'
                  strokeWidth='2'
                  strokeDasharray={`${(secondsLeft / validity) * 40.8} 40.8`}
                />
              </svg>
              {t('otc.ticket.validFor', { seconds: secondsLeft })}
            </span>
          )}
        </div>
        <p className='mt-1 font-["Space_Grotesk",Inter,sans-serif] text-[1.75rem] leading-tight font-semibold text-gray-900 dark:text-[#EEF1F7] break-all tabular-nums min-h-[2.25rem]'>
          {loading && !quote ? (
            <Loader2 className={`w-6 h-6 animate-spin ${muted}`} aria-label={t('otc.ticket.quoting')} />
          ) : quote ? (
            quote.operation === 'buy' ? qty(quote.crypto_amount, symbol) : brl(quote.total_amount)
          ) : (
            <span className={muted}>—</span>
          )}
        </p>
        {error && (
          <p className='mt-2 flex items-start gap-2 text-sm text-red-600 dark:text-[#FF7A7A]'>
            <AlertCircle className='w-4 h-4 mt-0.5 shrink-0' aria-hidden='true' />
            {error}
          </p>
        )}
        {rows.length > 0 && (
          <dl className='mt-4 pt-4 border-t border-gray-200 dark:border-[#1E2738] space-y-2 text-sm'>
            {rows.map(r => (
              <div key={r.k} className='flex justify-between gap-4'>
                <dt className={muted}>{r.k}</dt>
                <dd className='font-medium text-gray-900 dark:text-[#EEF1F7] tabular-nums text-right'>{r.v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <button
        type='button'
        disabled={!quote || loading || secondsLeft === 0}
        onClick={() => quote && onContinue({ ...quote, expires_in_seconds: secondsLeft })}
        className='h-[52px] rounded-xl bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#5B8CFF] dark:text-[#0A0E15] dark:hover:bg-[#7AA2FF] text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
      >
        {t(side === 'buy' ? 'otc.ticket.continueBuy' : 'otc.ticket.continueSell', { symbol })}
      </button>
      <p className={`-mt-2 text-xs text-center ${muted}`}>{t('otc.ticket.lockNote')}</p>
    </section>
  )
}

const AssetList = ({
  assets,
  symbol,
  onPick,
  onClose,
}: {
  assets: AssetRow[]
  symbol: string
  onPick: (s: string) => void
  onClose: () => void
}) => {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  const list = assets.filter(a => `${a.symbol} ${a.name}`.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div
      ref={ref}
      className='absolute z-30 left-0 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-[#2A3449] dark:bg-[#111724] overflow-hidden'
    >
      <div className='p-2 border-b border-gray-100 dark:border-[#1E2738]'>
        <label className='flex items-center gap-2 h-10 px-3 rounded-lg bg-gray-50 dark:bg-[#0D121C]'>
          <Search className={`w-4 h-4 ${muted}`} aria-hidden='true' />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('otc.ticket.search')}
            aria-label={t('otc.ticket.search')}
            className='flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-[#EEF1F7]'
          />
        </label>
      </div>
      <ul role='listbox' aria-label={t('otc.ticket.asset')} className='max-h-72 overflow-y-auto py-1'>
        {list.map(a => (
          <li key={a.symbol} role='option' aria-selected={a.symbol === symbol}>
            <button
              type='button'
              onClick={() => onPick(a.symbol)}
              className='w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#172033] text-left'
            >
              <CryptoIcon symbol={a.symbol} size={28} className='rounded-full shrink-0' />
              <span className='flex-1 min-w-0'>
                <span className='block text-sm font-semibold text-gray-900 dark:text-[#EEF1F7]'>{a.symbol}</span>
                <span className={`block text-xs ${muted} truncate`}>{a.name}</span>
              </span>
              <span className='text-right tabular-nums'>
                <span className='block text-sm text-gray-900 dark:text-[#EEF1F7]'>{a.price}</span>
                <span className={`block text-xs ${a.change >= 0 ? 'text-emerald-600 dark:text-[#34C77B]' : 'text-red-600 dark:text-[#FF7A7A]'}`}>
                  {a.change >= 0 ? '+' : '−'}
                  {Math.abs(a.change).toFixed(2).replace('.', ',')}%
                </span>
              </span>
              {a.symbol === symbol && <Check className='w-4 h-4 text-blue-600 dark:text-[#8FB0FF]' aria-hidden='true' />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
