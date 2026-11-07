import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/useAuth'
import { useWallets, useMultipleWalletBalances } from '@/hooks/useWallet'
import { useMarketPrices } from '@/hooks/useMarketPrices'
import { useTransactions } from '@/hooks/useTransactions'
import { useKYC } from '@/hooks/useKYC'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import { PERIODS, type Period, useHoldings, usePortfolioSeries, usePriceHistories } from './home/usePortfolio'
import { PortfolioChart, Sparkline } from './home/PortfolioChart'

const PRICE_SYMBOLS = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'BNB', 'MATIC', 'ADA', 'AVAX', 'TRX', 'LTC', 'DOGE', 'DOT', 'LINK', 'SHIB', 'XRP']
const MARKET_SYMBOLS = ['BTC', 'ETH', 'SOL', 'USDT']
const QUOTE_SYMBOLS = ['BTC', 'ETH', 'SOL', 'USDT']
const HIDE_KEY = 'home_hide_values'

const card = 'bg-white border border-gray-200 dark:bg-[#111724] dark:border-[#1E2738] rounded-2xl'
const cardSm =
  'sm:bg-white sm:border sm:border-gray-200 sm:dark:bg-[#111724] sm:dark:border-[#1E2738] sm:rounded-2xl'
const upText = 'text-emerald-600 dark:text-[#34C77B]'
const downText = 'text-red-600 dark:text-[#FF7A7A]'
const muted = 'text-gray-500 dark:text-[#8590A6]'
const soft = 'text-gray-600 dark:text-[#A3ADC2]'
const linkCls = 'text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-[#8FB0FF] dark:hover:text-[#B9CDFF]'

const pct = (n: number, locale: string) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

const qtyFmt = (n: number, locale: string) =>
  n.toLocaleString(locale, { maximumFractionDigits: n >= 100 ? 2 : n >= 1 ? 4 : 8 })

const shortAddr = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a)

export const DashboardPage = () => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const locale = i18n.language || 'pt-BR'
  const { data: user } = useCurrentUser()
  const { data: apiWallets, isLoading: walletsLoading } = useWallets()
  const { formatCurrency, convertToUSD, currency } = useCurrencyStore()
  const { verification, loading: kycLoading } = useKYC()

  const [period, setPeriod] = useState<Period>('30D')
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(HIDE_KEY, hidden ? '1' : '0')
    } catch {
      /* navegação privada: só não lembra a escolha */
    }
  }, [hidden])

  // Preços ao vivo (sempre em USD; formatCurrency converte para a moeda do usuário)
  const { prices: marketPrices, isLoading: pricesLoading } = useMarketPrices(PRICE_SYMBOLS, 'USD')
  const priceInfo = useMemo(() => {
    const out: Record<string, { price: number; change24h: number }> = {}
    for (const [s, p] of Object.entries(marketPrices)) out[s] = { price: p.price, change24h: p.change24h }
    return out
  }, [marketPrices])

  // Saldos de todas as carteiras
  const walletIds = useMemo(() => apiWallets?.map((w: any) => String(w.id)) || [], [apiWallets])
  const balanceQueries = useMultipleWalletBalances(walletIds)
  const balancesKey = balanceQueries.map(q => q.dataUpdatedAt).join('|')
  const balanceData = useMemo(() => balanceQueries.map(q => q.data as Record<string, any> | undefined), [balancesKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const balancesLoading = walletsLoading || balanceQueries.some(q => q.isLoading)

  const { holdings, totalUSD, addresses } = useHoldings(balanceData, priceInfo)
  const { points, isLoading: chartLoading } = usePortfolioSeries(holdings, period)

  const first = points[0]?.v ?? totalUSD
  const delta = points.length > 1 ? totalUSD - first : 0
  const deltaPct = first > 0 ? (delta / first) * 100 : 0
  const values = points.map(p => p.v)
  const max = values.length ? Math.max(...values) : totalUSD
  const min = values.length ? Math.min(...values) : totalUSD

  // Mercado: sparkline de 7 dias
  const { data: marketHistory } = usePriceHistories(MARKET_SYMBOLS.filter(s => s !== 'USDT'), 7)

  // Atividade recente
  const txFilters = useMemo(() => ({ limit: 5 }), [])
  const { transactions, isLoading: txLoading } = useTransactions(txFilters)

  const money = (usd: number) => (hidden ? '••••••' : formatCurrency(usd))
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('home.greeting.morning') : hour < 18 ? t('home.greeting.afternoon') : t('home.greeting.evening')
  const name = user?.firstName || user?.username || ''
  const kycPending = !kycLoading && verification?.status !== 'approved'

  const actions = [
    { key: 'buy', icon: Plus, to: '/instant-trade', primary: true },
    { key: 'receive', icon: ArrowDownLeft, to: '/wallet?action=receive' },
    { key: 'send', icon: ArrowUpRight, to: '/wallet?action=send' },
    { key: 'convert', icon: ArrowLeftRight, to: '/swap' },
  ]

  const kycBanner = (extra: string) => (
    <Link
      to='/kyc'
      className={`${card} ${extra} items-center gap-4 px-4 py-3.5 sm:px-5 sm:py-4 hover:border-blue-300 dark:hover:border-[#2F3D5C] transition-colors`}
    >
      <span className='w-10 h-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 dark:bg-[#172033] dark:text-[#8FB0FF] flex items-center justify-center'>
        <ShieldCheck className='w-5 h-5' aria-hidden='true' />
      </span>
      <span className='flex-1 min-w-0'>
        <span className='block text-sm font-semibold text-gray-900 dark:text-[#EEF1F7]'>{t('home.kyc.title')}</span>
        <span className={`block text-sm ${soft}`}>{t('home.kyc.body')}</span>
      </span>
      <ChevronRight className={`w-5 h-5 shrink-0 ${muted}`} aria-hidden='true' />
    </Link>
  )

  return (
    <div key={i18n.language} className='max-w-[1600px] mx-auto text-gray-900 dark:text-[#EEF1F7] tabular-nums'>
      {/* Cabeçalho */}
      <div className='flex items-center justify-between gap-4 mb-6 lg:mb-8'>
        <div className='min-w-0'>
          <h1 className='text-xl sm:text-2xl font-semibold truncate'>
            {greeting}
            {name ? `, ${name}` : ''}
          </h1>
          <p className={`text-sm ${muted}`}>
            {new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          type='button'
          onClick={() => setHidden(h => !h)}
          aria-pressed={hidden}
          aria-label={hidden ? t('home.show') : t('home.hide')}
          className={`h-11 shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 rounded-xl border border-gray-200 bg-white dark:border-[#222B3D] dark:bg-[#111724] ${soft} hover:text-gray-900 dark:hover:text-white transition-colors`}
        >
          {hidden ? <EyeOff className='w-5 h-5' aria-hidden='true' /> : <Eye className='w-5 h-5' aria-hidden='true' />}
          <span className='hidden sm:inline text-sm'>{hidden ? t('home.show') : t('home.hide')}</span>
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start'>
        {/* Coluna principal (abaixo de xl as seções se intercalam pela ordem) */}
        <div className='contents xl:flex xl:flex-col xl:gap-6 xl:min-w-0'>
          {/* Patrimônio + gráfico + ações */}
          <section
            aria-label={t('home.netWorth')}
            className='order-1 xl:order-none md:col-span-2 xl:col-span-1 sm:bg-white sm:border sm:border-gray-200 sm:dark:bg-[#111724] sm:dark:border-[#1E2738] sm:rounded-2xl sm:p-6 lg:p-7 min-w-0'
          >
            <div className='flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4'>
              <div className='min-w-0'>
                <p className={`text-sm ${soft}`}>
                  {t('home.netWorth')} · {currency}
                </p>
                {balancesLoading && !holdings.length ? (
                  <div className='mt-2 h-11 w-56 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse' />
                ) : (
                  <p className='mt-1 font-["Space_Grotesk",Inter,sans-serif] text-[2.5rem] leading-tight sm:text-5xl font-semibold tracking-tight break-words'>
                    {money(totalUSD)}
                  </p>
                )}
                {points.length > 1 && (
                  <p className='mt-1.5 text-sm flex flex-wrap gap-x-2'>
                    <span className={`font-semibold ${delta >= 0 ? upText : downText}`}>
                      {hidden ? '••••' : `${delta >= 0 ? '+' : '−'}${formatCurrency(Math.abs(delta))}`} ({pct(deltaPct, locale)})
                    </span>
                    <span className={muted}>{t(`home.inPeriod.${period}`)}</span>
                  </p>
                )}
              </div>
              <div
                role='tablist'
                aria-label={t('home.period')}
                className='grid grid-cols-4 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#0D121C] dark:border dark:border-[#1E2738] lg:w-auto'
              >
                {PERIODS.map(p => (
                  <button
                    key={p}
                    type='button'
                    role='tab'
                    aria-selected={p === period}
                    onClick={() => setPeriod(p)}
                    className={`h-9 lg:min-w-[56px] px-3 rounded-lg text-sm transition-colors ${
                      p === period
                        ? 'bg-white shadow-sm font-semibold text-gray-900 dark:bg-[#172033] dark:text-[#EEF1F7] dark:shadow-none'
                        : `font-medium ${muted} hover:text-gray-900 dark:hover:text-[#EEF1F7]`
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className='-mx-6 sm:mx-0 mt-5'>
              <PortfolioChart
                points={points}
                period={period}
                loading={chartLoading || balancesLoading || pricesLoading}
                hidden={hidden}
                format={formatCurrency}
                locale={locale}
                emptyLabel={t('home.chartEmpty')}
                ariaLabel={t('home.chartAria')}
              />
            </div>

            {points.length > 1 && (
              <div className={`mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-xs sm:text-sm ${muted}`}>
                <span>
                  {t('home.high')}: <strong className='font-semibold text-gray-900 dark:text-[#EEF1F7]'>{money(max)}</strong>
                </span>
                <span>
                  {t('home.low')}: <strong className='font-semibold text-gray-900 dark:text-[#EEF1F7]'>{money(min)}</strong>
                </span>
              </div>
            )}

            <nav
              aria-label={t('home.quickActions')}
              className='mt-6 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-3 sm:pt-5 sm:border-t sm:border-gray-100 sm:dark:border-[#1E2738]'
            >
              {actions.map(a => (
                <Link
                  key={a.key}
                  to={a.to}
                  className={`group flex flex-col items-center gap-2 text-[13px] font-medium sm:flex-row sm:h-11 sm:px-4 sm:rounded-xl sm:text-sm transition-colors ${
                    a.primary
                      ? 'sm:bg-blue-600 sm:text-white sm:hover:bg-blue-700 sm:dark:bg-[#5B8CFF] sm:dark:text-[#0A0E15] sm:dark:hover:bg-[#7AA2FF] sm:font-semibold'
                      : 'sm:border sm:border-gray-200 sm:hover:bg-gray-50 sm:dark:border-[#2A3449] sm:dark:hover:bg-[#172033]'
                  }`}
                >
                  <span
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center sm:w-auto sm:h-auto sm:rounded-none sm:bg-transparent sm:border-0 sm:text-current ${
                      a.primary
                        ? 'bg-blue-600 text-white dark:bg-[#5B8CFF] dark:text-[#0A0E15]'
                        : 'bg-white border border-gray-200 dark:bg-[#172033] dark:border-[#222B3D]'
                    }`}
                  >
                    <a.icon className='w-[22px] h-[22px] sm:w-[18px] sm:h-[18px]' aria-hidden='true' />
                  </span>
                  {t(`home.actions.${a.key}`)}
                </Link>
              ))}
            </nav>
          </section>

          {/* Seus ativos */}
          <section aria-labelledby='home-assets' className={`order-3 xl:order-none md:col-span-2 xl:col-span-1 min-w-0 ${cardSm} sm:p-6`}>
            <div className='flex items-baseline justify-between mb-4'>
              <h2 id='home-assets' className='text-lg font-semibold'>
                {t('home.assets.title')}
              </h2>
              <Link to='/wallet' className={linkCls}>
                {t('home.assets.viewWallet')}
              </Link>
            </div>

            {balancesLoading && !holdings.length ? (
              <div className='space-y-3'>
                {[0, 1, 2].map(i => (
                  <div key={i} className='h-14 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse' />
                ))}
              </div>
            ) : !holdings.length ? (
              <div className='py-8 text-center'>
                <p className={`text-sm ${soft}`}>{t('home.assets.empty')}</p>
                <Link to='/wallet?action=receive' className={`inline-block mt-2 ${linkCls}`}>
                  {t('home.assets.emptyCta')}
                </Link>
              </div>
            ) : (
              <>
                {/* Barra de alocação */}
                <div className='flex gap-0.5 h-2 mb-4' aria-hidden='true'>
                  {holdings
                    .filter(h => h.share >= 0.5)
                    .map((h, i) => (
                      <span
                        key={h.symbol}
                        className='rounded-full first:rounded-l-full'
                        style={{ flex: `${h.share} 1 0`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                      />
                    ))}
                </div>

                {/* Celular: lista */}
                <ul className='md:hidden divide-y divide-gray-100 dark:divide-[#172033]'>
                  {holdings.map(h => (
                    <li key={h.symbol}>
                      <Link to='/wallet' className='flex items-center gap-3.5 py-3'>
                        <CryptoIcon symbol={h.symbol} size={40} className='rounded-full shrink-0' />
                        <span className='flex-1 min-w-0'>
                          <span className='block text-[15px] font-semibold'>{marketPrices[h.symbol]?.name || h.symbol}</span>
                          <span className={`block text-[13px] ${muted} truncate`}>
                            {hidden ? '••••' : `${qtyFmt(h.quantity, locale)} ${h.symbol}`} · {h.share.toFixed(0)}%
                          </span>
                        </span>
                        <span className='text-right'>
                          <span className='block text-[15px] font-semibold'>{money(h.valueUSD)}</span>
                          <span className={`block text-[13px] ${h.change24h >= 0 ? upText : downText}`}>{pct(h.change24h, locale)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Tablet e desktop: tabela */}
                <div className='hidden md:block overflow-x-auto -mx-1 px-1'>
                  <table className='w-full min-w-[560px] text-sm'>
                    <thead>
                      <tr className={`text-xs text-left ${muted}`}>
                        <th scope='col' className='py-2 font-medium'>{t('home.assets.col.asset')}</th>
                        <th scope='col' className='py-2 font-medium text-right'>{t('home.assets.col.quantity')}</th>
                        <th scope='col' className='py-2 font-medium text-right'>{t('home.assets.col.price')}</th>
                        <th scope='col' className='py-2 font-medium text-right'>24h</th>
                        <th scope='col' className='py-2 font-medium text-right'>{t('home.assets.col.value')}</th>
                        <th scope='col' className='py-2 font-medium text-right hidden lg:table-cell'>{t('home.assets.col.allocation')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map(h => (
                        <tr
                          key={h.symbol}
                          onClick={() => navigate('/wallet')}
                          className='border-t border-gray-100 dark:border-[#1A2232] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                        >
                          <td className='py-3.5'>
                            <span className='flex items-center gap-3'>
                              <CryptoIcon symbol={h.symbol} size={36} className='rounded-full shrink-0' />
                              <span>
                                <span className='block font-semibold'>{marketPrices[h.symbol]?.name || h.symbol}</span>
                                <span className={`block text-xs ${muted}`}>
                                  {h.symbol}
                                  {h.networks.length > 1 ? ` · ${t('home.assets.networks', { count: h.networks.length })}` : ''}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className={`py-3.5 text-right ${soft}`}>{hidden ? '••••' : qtyFmt(h.quantity, locale)}</td>
                          <td className={`py-3.5 text-right ${soft}`}>{formatCurrency(h.priceUSD)}</td>
                          <td className={`py-3.5 text-right ${h.change24h >= 0 ? upText : downText}`}>{pct(h.change24h, locale)}</td>
                          <td className='py-3.5 text-right font-semibold'>{money(h.valueUSD)}</td>
                          <td className={`py-3.5 text-right hidden lg:table-cell ${soft}`}>
                            {h.share.toLocaleString(locale, { maximumFractionDigits: 1 })}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Atividade */}
          <section aria-labelledby='home-activity' className={`order-6 xl:order-none md:col-span-2 xl:col-span-1 min-w-0 ${cardSm} sm:p-6`}>
            <div className='flex items-baseline justify-between mb-2'>
              <h2 id='home-activity' className='text-lg font-semibold'>
                {t('home.activity.title')}
              </h2>
              <Link to='/wallet?tab=transactions' className={linkCls}>
                {t('home.activity.history')}
              </Link>
            </div>
            {txLoading && !transactions.length ? (
              <div className='space-y-3 pt-2'>
                {[0, 1, 2].map(i => (
                  <div key={i} className='h-12 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse' />
                ))}
              </div>
            ) : !transactions.length ? (
              <p className={`py-6 text-sm ${soft}`}>{t('home.activity.empty')}</p>
            ) : (
              <ul className='divide-y divide-gray-100 dark:divide-[#1A2232]'>
                {transactions.slice(0, 5).map(tx => {
                  const incoming = addresses.has(String(tx.to_address || '').toLowerCase())
                  const symbol = (tx.token_symbol || tx.network || '').toUpperCase()
                  const Icon = incoming ? ArrowDownLeft : ArrowUpRight
                  return (
                    <li key={tx.id} className='flex items-center gap-3.5 py-3'>
                      <span className='relative w-10 h-10 shrink-0'>
                        <CryptoIcon symbol={symbol} size={40} className='rounded-full' />
                        <span
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#111724] ${
                            incoming
                              ? 'bg-emerald-600 text-white dark:bg-[#34C77B] dark:text-[#0A0E15]'
                              : 'bg-gray-700 text-white dark:bg-[#2A3449] dark:text-[#EEF1F7]'
                          }`}
                        >
                          <Icon className='w-3 h-3' strokeWidth={2.5} aria-hidden='true' />
                        </span>
                      </span>
                      <span className='flex-1 min-w-0'>
                        <span className='block text-[15px] font-medium truncate'>
                          {t(incoming ? 'home.activity.received' : 'home.activity.sent', { symbol })}
                        </span>
                        <span className={`block text-[13px] ${muted} truncate`}>
                          {tx.network} · {new Date(tx.created_at).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          <span className='hidden sm:inline'> · {shortAddr(incoming ? tx.from_address : tx.to_address)}</span>
                        </span>
                      </span>
                      <span className={`hidden sm:inline-block text-xs ${soft} border border-gray-200 dark:border-[#2A3449] rounded-full px-2.5 py-0.5`}>
                        {t(`home.activity.status.${tx.status}`, tx.status)}
                      </span>
                      <span className='text-sm font-semibold text-right min-w-[96px]'>
                        {hidden ? '••••' : `${incoming ? '+' : '−'}${qtyFmt(Number(tx.amount) || 0, locale)} ${symbol}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Coluna lateral */}
        <div className='contents xl:flex xl:flex-col xl:gap-6 xl:min-w-0'>
          {kycPending && kycBanner('order-2 xl:order-none md:col-span-2 xl:col-span-1 flex')}

          <InstantQuote
            className='order-5 md:order-4 xl:order-none'
            prices={priceInfo}
            formatCurrency={formatCurrency}
            convertToUSD={convertToUSD}
            currency={currency}
            locale={locale}
          />

          {/* Mercado */}
          <section aria-labelledby='home-market' className={`order-4 md:order-5 xl:order-none min-w-0 ${cardSm} sm:p-6`}>
            <div className='flex items-baseline justify-between mb-2'>
              <h2 id='home-market' className='text-lg font-semibold'>
                {t('home.market.title')}
              </h2>
              <Link to='/instant-trade' className={linkCls}>
                {t('home.market.seeAll')}
              </Link>
            </div>
            <ul className='divide-y divide-gray-100 dark:divide-[#1A2232]'>
              {MARKET_SYMBOLS.map(s => {
                const p = marketPrices[s]
                const change = p?.change24h ?? 0
                const spark = (marketHistory[s] || []).map(x => x[1])
                return (
                  <li key={s}>
                    <Link to='/instant-trade' className='grid grid-cols-[minmax(0,1fr)_72px_auto] items-center gap-3 py-3'>
                      <span className='flex items-center gap-3 min-w-0'>
                        <CryptoIcon symbol={s} size={32} className='rounded-full shrink-0' />
                        <span className='min-w-0'>
                          <span className='block text-sm font-semibold'>{s}</span>
                          <span className={`block text-xs ${muted} truncate`}>{p?.name || s}</span>
                        </span>
                      </span>
                      <Sparkline values={spark.length ? spark : s === 'USDT' ? [1, 1] : []} up={change >= 0} />
                      <span className='text-right'>
                        <span className='block text-sm font-semibold'>{p ? formatCurrency(p.price) : '—'}</span>
                        <span className={`block text-xs ${change >= 0 ? upText : downText}`}>{pct(change, locale)}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

const ALLOC_COLORS = ['#5B8CFF', '#F59E0B', '#14B8A6', '#A78BFA', '#F472B6', '#94A3B8']

/** Cotação instantânea (estimativa com o preço ao vivo; a cotação travada vem no fluxo do OTC). */
const InstantQuote = ({
  className,
  prices,
  formatCurrency,
  convertToUSD,
  currency,
  locale,
}: {
  className: string
  prices: Record<string, { price: number; change24h: number }>
  formatCurrency: (usd: number) => string
  convertToUSD: (amount: number) => number
  currency: string
  locale: string
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [symbol, setSymbol] = useState('BTC')
  const [text, setText] = useState('1000')

  const amount = Number.parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0
  const priceUSD = prices[symbol]?.price || 0
  const receive =
    side === 'buy'
      ? priceUSD > 0
        ? `${(convertToUSD(amount) / priceUSD).toLocaleString(locale, { maximumFractionDigits: symbol === 'USDT' ? 2 : 8 })} ${symbol}`
        : '—'
      : formatCurrency(amount * priceUSD)

  const go = () =>
    navigate(`/instant-trade?side=${side}&symbol=${symbol}&amount=${encodeURIComponent(String(amount))}`)

  return (
    <section aria-labelledby='home-quote' className={`${className} ${card} p-5 sm:p-6 min-w-0 flex flex-col gap-4`}>
      <div className='flex items-baseline justify-between'>
        <h2 id='home-quote' className='text-lg font-semibold'>
          {t('home.quote.title')}
        </h2>
        <span className={`text-xs ${soft}`}>OTC · Pix</span>
      </div>

      <div role='tablist' aria-label={t('home.quote.operation')} className='grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#0D121C] dark:border dark:border-[#1E2738]'>
        {(['buy', 'sell'] as const).map(s => (
          <button
            key={s}
            type='button'
            role='tab'
            aria-selected={side === s}
            onClick={() => {
              setSide(s)
              setText(s === 'buy' ? '1000' : symbol === 'USDT' ? '100' : '0,001')
            }}
            className={`h-10 rounded-lg text-sm transition-colors ${
              side === s
                ? 'bg-white shadow-sm font-semibold dark:bg-[#172033] dark:shadow-none'
                : `font-medium ${muted} hover:text-gray-900 dark:hover:text-[#EEF1F7]`
            }`}
          >
            {t(`home.quote.${s}`)}
          </button>
        ))}
      </div>

      <label className={`flex flex-col gap-2 text-sm ${soft}`}>
        {side === 'buy' ? t('home.quote.youPay') : t('home.quote.youSell')}
        <span className='flex items-center gap-3 h-[52px] px-4 rounded-xl border border-gray-200 bg-white focus-within:border-blue-500 dark:border-[#2A3449] dark:bg-[#0D121C] dark:focus-within:border-[#5B8CFF]'>
          <span className={`text-base ${muted}`}>{side === 'buy' ? currency : symbol}</span>
          <input
            inputMode='decimal'
            value={text}
            onChange={e => setText(e.target.value.replace(/[^\d.,]/g, ''))}
            className='flex-1 min-w-0 bg-transparent outline-none text-xl font-semibold text-gray-900 dark:text-[#EEF1F7]'
          />
        </span>
      </label>

      <div role='group' aria-label={t('home.quote.asset')} className='grid grid-cols-4 gap-1.5'>
        {QUOTE_SYMBOLS.map(s => (
          <button
            key={s}
            type='button'
            aria-pressed={symbol === s}
            onClick={() => setSymbol(s)}
            className={`h-10 rounded-lg border text-sm transition-colors ${
              symbol === s
                ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:border-[#5B8CFF] dark:bg-[#172033] dark:text-[#EEF1F7]'
                : `border-gray-200 dark:border-[#222B3D] ${soft} hover:border-gray-300 dark:hover:border-[#2F3D5C]`
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className='rounded-xl bg-gray-50 dark:bg-[#0D121C] px-4 py-3.5'>
        <p className={`text-sm ${soft}`}>{t('home.quote.youGet')}</p>
        <p className='mt-1 font-["Space_Grotesk",Inter,sans-serif] text-2xl font-semibold break-all'>{receive}</p>
        <p className={`mt-1 text-xs ${muted}`}>
          1 {symbol} = {priceUSD ? formatCurrency(priceUSD) : '—'} · {t('home.quote.note')}
        </p>
      </div>

      <button
        type='button'
        onClick={go}
        disabled={!amount || !priceUSD}
        className='h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#5B8CFF] dark:text-[#0A0E15] dark:hover:bg-[#7AA2FF] font-semibold disabled:opacity-50 transition-colors'
      >
        {t(side === 'buy' ? 'home.quote.ctaBuy' : 'home.quote.ctaSell', { symbol })}
      </button>
    </section>
  )
}

export default DashboardPage
