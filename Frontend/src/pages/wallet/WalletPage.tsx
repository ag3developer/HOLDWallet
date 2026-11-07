import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BookUser,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Settings,
  Wallet,
} from 'lucide-react'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import { useTransactions } from '@/hooks/useTransactions'
import { CryptoIcon } from '@/components/CryptoIcon'
import { symbolFromKey } from '@/pages/dashboard/home/usePortfolio'
import { SendFlow } from './v2/SendFlow'
import { ActivityList } from './v2/ActivityList'
import { ReceiveFlow } from './v2/ReceiveFlow'
import { NETWORKS, useWalletAssets, type WalletAsset } from './v2/assets'
import { BTN_PRIMARY, BTN_SECONDARY, CARD, DOWN, LINK, MUTED, SKELETON, SOFT, UP, pct, qty, shortAddr } from './v2/ui'

const HIDE_KEY = 'home_hide_values'

/** true a partir de 1024 px (lista + detalhe lado a lado). */
const useIsDesktop = () => {
  const query = '(min-width: 1024px)'
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setDesktop(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return desktop
}

const iconBtn = `w-10 h-10 rounded-xl border border-gray-200 bg-white dark:border-[#222B3D] dark:bg-[#111724] ${SOFT} flex items-center justify-center hover:text-gray-900 dark:hover:text-white`

/**
 * Carteira organizada por ATIVO.
 * Endereços diretos: /wallet?asset=USDT · ?action=receive|send[&asset=&network=] · ?tab=activity
 */
export const WalletPage = () => {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { formatCurrency } = useCurrencyStore()
  const isDesktop = useIsDesktop()
  const action = params.get('action')
  const tab = params.get('tab') === 'activity' || params.get('tab') === 'transactions' ? 'activity' : 'assets'
  const selected = params.get('asset')?.toUpperCase() || null
  const paramNetwork = params.get('network') || undefined

  const [hidden, setHidden] = useState(() => {
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
      /* ignora */
    }
  }, [hidden])

  const { held, totalUSD, change24h, addresses, prices, loading, hasWallet } = useWalletAssets(paramNetwork)
  const money = (usd: number) => (hidden ? '••••••' : formatCurrency(usd))
  const myAddresses = useMemo(() => new Set(Object.values(addresses).filter(Boolean).map(a => a.toLowerCase())), [addresses])

  const go = (next: Record<string, string | null>, scroll = true) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v == null) p.delete(k)
      else p.set(k, v)
    }
    setParams(p)
    if (scroll) window.scrollTo({ top: 0 })
  }
  const closeFlow = () => go({ action: null, network: null })

  // ── Fluxos ──
  if (action === 'receive') {
    return <ReceiveFlow initialAsset={selected || undefined} initialNetwork={paramNetwork} addresses={addresses} held={held} onClose={closeFlow} />
  }
  if (action === 'send') {
    return (
      <SendFlow
        key={`${selected}-${paramNetwork}`}
        held={held}
        prices={prices}
        initialAsset={selected || undefined}
        initialNetwork={paramNetwork}
        onClose={closeFlow}
      />
    )
  }

  if (!loading && !hasWallet) {
    return (
      <div className={`${CARD} max-w-lg mx-auto p-8 text-center text-gray-900 dark:text-[#EEF1F7]`}>
        <Wallet className={`w-10 h-10 mx-auto ${MUTED}`} aria-hidden='true' />
        <h1 className='mt-3 text-xl font-semibold'>Crie sua carteira</h1>
        <p className={`mt-1 ${SOFT}`}>Uma carteira com endereços em mais de 10 redes, protegida pela sua frase de recuperação.</p>
        <Link to='/wallet/create' className={`${BTN_PRIMARY} mt-6 px-6`}>
          <Plus className='w-4 h-4' aria-hidden='true' />
          Criar carteira
        </Link>
      </div>
    )
  }

  // No desktop o maior ativo já abre selecionado (sem painel vazio); no celular a lista vem primeiro
  const currentSymbol = selected || (isDesktop ? held[0]?.symbol : null)
  const current = currentSymbol ? held.find(a => a.symbol === currentSymbol) : undefined
  const showDetailOnly = !isDesktop && !!current

  const actions = [
    { label: 'Receber', icon: ArrowDownLeft, onClick: () => go({ action: 'receive', asset: selected }), primary: true },
    { label: 'Enviar', icon: ArrowUpRight, onClick: () => go({ action: 'send', asset: selected }) },
    { label: 'Converter', icon: ArrowLeftRight, onClick: () => navigate('/swap') },
    { label: 'Comprar', icon: Plus, onClick: () => navigate(`/instant-trade${selected ? `?symbol=${selected}` : ''}`) },
  ]

  const tabs = (
    <div role='tablist' aria-label='Carteira' className='inline-grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#0D121C] dark:border dark:border-[#1E2738]'>
      {[
        { id: 'assets', label: 'Ativos' },
        { id: 'activity', label: 'Atividade' },
      ].map(t => (
        <button
          key={t.id}
          type='button'
          role='tab'
          aria-selected={tab === t.id}
          onClick={() => go({ tab: t.id === 'assets' ? null : 'activity' }, false)}
          className={`h-9 px-4 rounded-lg text-sm transition-colors ${
            tab === t.id ? 'bg-white shadow-sm font-semibold dark:bg-[#172033] dark:shadow-none' : `font-medium ${MUTED} hover:text-gray-900 dark:hover:text-[#EEF1F7]`
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className='max-w-[1600px] mx-auto text-gray-900 dark:text-[#EEF1F7] tabular-nums'>
      {/* Topo: saldo + ações na mesma faixa */}
      {!showDetailOnly && (
        <div className='flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6'>
          <div className='flex items-start justify-between gap-4'>
            <div className='min-w-0'>
              <p className={`text-sm ${SOFT}`}>Saldo da carteira</p>
              {loading && !held.length ? (
                <div className={`mt-2 h-11 w-56 ${SKELETON}`} />
              ) : (
                <p className='font-["Space_Grotesk",Inter,sans-serif] text-[2.5rem] leading-tight sm:text-5xl font-semibold tracking-tight'>{money(totalUSD)}</p>
              )}
              {held.length > 0 && (
                <p className='mt-1 text-sm'>
                  <span className={`font-semibold ${change24h >= 0 ? UP : DOWN}`}>{pct(change24h)}</span>
                  <span className={MUTED}> em 24 horas</span>
                </p>
              )}
            </div>
            <div className='flex gap-2 lg:hidden'>
              <button type='button' onClick={() => setHidden(h => !h)} aria-pressed={hidden} aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'} className={iconBtn}>
                {hidden ? <EyeOff className='w-5 h-5' aria-hidden='true' /> : <Eye className='w-5 h-5' aria-hidden='true' />}
              </button>
              <Link to='/wallet/settings' aria-label='Configurações da carteira' className={iconBtn}>
                <Settings className='w-5 h-5' aria-hidden='true' />
              </Link>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
            <nav aria-label='Ações da carteira' className='grid grid-cols-4 gap-2 sm:flex sm:gap-2'>
              {actions.map(a => (
                <button
                  key={a.label}
                  type='button'
                  onClick={a.onClick}
                  className={`flex flex-col items-center gap-2 text-[13px] font-medium sm:flex-row sm:h-11 sm:px-4 sm:rounded-xl sm:text-sm transition-colors ${
                    a.primary
                      ? 'sm:bg-blue-600 sm:text-white sm:hover:bg-blue-700 sm:dark:bg-[#5B8CFF] sm:dark:text-[#0A0E15] sm:dark:hover:bg-[#7AA2FF] sm:font-semibold'
                      : 'sm:border sm:border-gray-200 sm:bg-white sm:hover:bg-gray-50 sm:dark:bg-transparent sm:dark:border-[#2A3449] sm:dark:hover:bg-[#172033]'
                  }`}
                >
                  <span
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center sm:w-auto sm:h-auto sm:bg-transparent sm:border-0 sm:text-current ${
                      a.primary ? 'bg-blue-600 text-white dark:bg-[#5B8CFF] dark:text-[#0A0E15]' : 'bg-white border border-gray-200 dark:bg-[#172033] dark:border-[#222B3D]'
                    }`}
                  >
                    <a.icon className='w-[22px] h-[22px] sm:w-[18px] sm:h-[18px]' aria-hidden='true' />
                  </span>
                  {a.label}
                </button>
              ))}
            </nav>
            <div className='hidden lg:flex gap-2 pl-3 border-l border-gray-200 dark:border-[#1E2738]'>
              <button type='button' onClick={() => setHidden(h => !h)} aria-pressed={hidden} aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'} className={iconBtn}>
                {hidden ? <EyeOff className='w-5 h-5' aria-hidden='true' /> : <Eye className='w-5 h-5' aria-hidden='true' />}
              </button>
              <Link to='/wallet/address-book' aria-label='Agenda de endereços' className={iconBtn}>
                <BookUser className='w-5 h-5' aria-hidden='true' />
              </Link>
              <Link to='/wallet/settings' aria-label='Configurações da carteira' className={iconBtn}>
                <Settings className='w-5 h-5' aria-hidden='true' />
              </Link>
            </div>
          </div>
        </div>
      )}

      {tab === 'activity' ? (
        <div className='space-y-4'>
          {tabs}
          <ActivityList myAddresses={myAddresses} hidden={hidden} />
        </div>
      ) : (
        <div className='grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] items-start'>
          {/* Lista de ativos (com as abas no cabeçalho do próprio cartão) */}
          {!showDetailOnly && (
            <section aria-label='Seus ativos' className={`${CARD} p-2 sm:p-3 lg:sticky lg:top-4`}>
              <div className='flex items-center justify-between gap-2 px-1 pb-2'>
                {tabs}
                {held.length > 0 && <span className={`text-xs ${MUTED}`}>{held.length} {held.length === 1 ? 'ativo' : 'ativos'}</span>}
              </div>
              {loading && !held.length ? (
                <div className='p-1 space-y-2'>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`h-14 ${SKELETON}`} />
                  ))}
                </div>
              ) : !held.length ? (
                <div className='p-8 text-center'>
                  <p className={SOFT}>Sua carteira ainda está vazia.</p>
                  <div className='mt-4 flex flex-wrap justify-center gap-2'>
                    <button type='button' onClick={() => go({ action: 'receive' })} className={`${BTN_PRIMARY} px-5`}>
                      Receber cripto
                    </button>
                    <Link to='/instant-trade' className={`${BTN_SECONDARY} px-5`}>
                      Comprar com Pix
                    </Link>
                  </div>
                </div>
              ) : (
                <ul>
                  {held.map(a => {
                    const active = a.symbol === currentSymbol
                    return (
                      <li key={a.symbol}>
                        <button
                          type='button'
                          onClick={() => go({ asset: a.symbol }, !isDesktop)}
                          aria-current={active}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                            active ? 'bg-blue-50/70 dark:bg-[#172033]' : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                          }`}
                        >
                          <CryptoIcon symbol={a.symbol} size={36} className='rounded-full shrink-0' />
                          <span className='flex-1 min-w-0'>
                            <span className='block text-[15px] font-semibold truncate'>{a.name}</span>
                            <span className={`block text-[13px] truncate ${MUTED}`}>{hidden ? '••••' : qty(a.quantity, a.symbol)}</span>
                          </span>
                          <span className='text-right'>
                            <span className='block text-[15px] font-semibold'>{money(a.valueUSD)}</span>
                            <span className={`block text-[13px] ${a.change24h >= 0 ? UP : DOWN}`}>{pct(a.change24h)}</span>
                          </span>
                          <ChevronRight className={`w-4 h-4 shrink-0 lg:hidden ${MUTED}`} aria-hidden='true' />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )}

          {current && <AssetDetail asset={current} hidden={hidden} money={money} showBack={!isDesktop} onBack={() => go({ asset: null })} go={go} />}
        </div>
      )}
    </div>
  )
}

/** Detalhe do ativo em um cartão só: resumo + ações, saldo por rede e últimas movimentações. */
const AssetDetail = ({
  asset,
  hidden,
  money,
  showBack,
  onBack,
  go,
}: {
  asset: WalletAsset
  hidden: boolean
  money: (usd: number) => string
  showBack: boolean
  onBack: () => void
  go: (p: Record<string, string | null>, scroll?: boolean) => void
}) => {
  const { formatCurrency } = useCurrencyStore()
  const [copied, setCopied] = useState<string | null>(null)
  const txFilters = useMemo(() => ({ limit: 50 }), [])
  const { transactions, isLoading } = useTransactions(txFilters)
  const myAddresses = useMemo(() => new Set(asset.positions.map(p => p.address.toLowerCase()).filter(Boolean)), [asset])
  const txs = transactions.filter(t => (t.token_symbol ? t.token_symbol.toUpperCase() : symbolFromKey(t.network || '')) === asset.symbol).slice(0, 5)

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      toast.success('Endereço copiado')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }
  const small = 'h-10 px-4 rounded-xl text-sm inline-flex items-center justify-center gap-2 transition-colors'
  const ghost = `${small} border border-gray-200 hover:bg-gray-50 dark:border-[#2A3449] dark:hover:bg-[#172033] font-medium`

  return (
    <section className={`${CARD} min-w-0`} aria-label={`Detalhes de ${asset.name}`}>
      {/* Resumo + ações */}
      <div className='p-5 sm:p-6'>
        {showBack && (
          <button type='button' onClick={onBack} className={`mb-3 inline-flex items-center gap-2 h-10 -ml-1 px-1 text-sm font-medium ${SOFT}`}>
            <ArrowLeft className='w-4 h-4' aria-hidden='true' />
            Todos os ativos
          </button>
        )}
        <div className='flex flex-col xl:flex-row xl:items-center gap-5'>
          <div className='flex items-center gap-4 flex-1 min-w-0'>
            <CryptoIcon symbol={asset.symbol} size={48} className='rounded-full shrink-0' />
            <div className='min-w-0'>
              <p className={`text-sm ${SOFT}`}>{asset.name}</p>
              <p className='font-["Space_Grotesk",Inter,sans-serif] text-[1.75rem] leading-tight font-semibold tracking-tight truncate'>
                {hidden ? '••••' : qty(asset.quantity, asset.symbol)}
              </p>
              <p className='text-sm'>
                <span className='font-medium'>{money(asset.valueUSD)}</span>
                <span className={MUTED}> · 1 {asset.symbol} = {formatCurrency(asset.priceUSD)} </span>
                <span className={asset.change24h >= 0 ? UP : DOWN}>{pct(asset.change24h)}</span>
              </p>
            </div>
          </div>
          <div className='grid grid-cols-2 sm:flex gap-2'>
            <button
              type='button'
              onClick={() => go({ action: 'receive', asset: asset.symbol })}
              className={`${small} bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#5B8CFF] dark:text-[#0A0E15] dark:hover:bg-[#7AA2FF] font-semibold`}
            >
              <ArrowDownLeft className='w-4 h-4' aria-hidden='true' />
              Receber
            </button>
            <button type='button' onClick={() => go({ action: 'send', asset: asset.symbol })} className={ghost}>
              <ArrowUpRight className='w-4 h-4' aria-hidden='true' />
              Enviar
            </button>
            <Link to={`/instant-trade?side=buy&symbol=${asset.symbol}`} className={ghost}>
              Comprar
            </Link>
            <Link to={`/instant-trade?side=sell&symbol=${asset.symbol}`} className={ghost}>
              Vender
            </Link>
          </div>
        </div>
      </div>

      {/* Redes */}
      <div className='px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-[#1A2232]'>
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${MUTED}`}>{asset.positions.length > 1 ? 'Saldo por rede' : 'Rede'}</h3>
        <ul className='mt-1 divide-y divide-gray-100 dark:divide-[#1A2232]'>
          {asset.positions.map(p => (
            <li key={p.network} className='py-2.5 flex items-center gap-3'>
              <span className='flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3 gap-y-0.5'>
                <span className='font-semibold'>
                  {NETWORKS[p.network]?.name || p.network}
                  {NETWORKS[p.network]?.standard && <span className={`ml-1.5 text-xs font-medium ${MUTED}`}>{NETWORKS[p.network]?.standard}</span>}
                </span>
                {p.address && (
                  <button
                    type='button'
                    onClick={() => copy(p.address, p.network)}
                    className={`inline-flex items-center gap-1.5 font-mono text-xs ${MUTED} hover:text-gray-900 dark:hover:text-white`}
                    aria-label={`Copiar endereço ${NETWORKS[p.network]?.name || p.network}`}
                  >
                    {shortAddr(p.address)}
                    {copied === p.network ? <Check className='w-3.5 h-3.5' aria-hidden='true' /> : <Copy className='w-3.5 h-3.5' aria-hidden='true' />}
                  </button>
                )}
              </span>
              <span className='text-right'>
                <span className='block text-sm font-semibold'>{hidden ? '••••' : qty(p.quantity, asset.symbol)}</span>
                <span className={`block text-xs ${MUTED}`}>{money(p.valueUSD)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Últimas movimentações */}
      <div className='px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-[#1A2232]'>
        <div className='flex items-baseline justify-between'>
          <h3 className={`text-xs font-semibold uppercase tracking-wide ${MUTED}`}>Últimas movimentações</h3>
          <button type='button' onClick={() => go({ tab: 'activity', asset: null })} className={LINK}>
            Ver tudo
          </button>
        </div>
        {isLoading && !transactions.length ? (
          <div className='mt-2 space-y-2'>
            {[0, 1].map(i => (
              <div key={i} className={`h-10 ${SKELETON}`} />
            ))}
          </div>
        ) : !txs.length ? (
          <p className={`mt-2 text-sm ${SOFT}`}>Nenhuma movimentação de {asset.symbol} ainda.</p>
        ) : (
          <ul className='mt-1 divide-y divide-gray-100 dark:divide-[#1A2232]'>
            {txs.map(t => {
              const incoming = myAddresses.has(String(t.to_address || '').toLowerCase())
              const Icon = incoming ? ArrowDownLeft : ArrowUpRight
              return (
                <li key={t.id} className='py-2.5 flex items-center gap-3'>
                  <span
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                      incoming ? 'bg-emerald-50 text-emerald-600 dark:bg-[#34C77B]/10 dark:text-[#34C77B]' : 'bg-gray-100 text-gray-600 dark:bg-[#172033] dark:text-[#A3ADC2]'
                    }`}
                  >
                    <Icon className='w-4 h-4' aria-hidden='true' />
                  </span>
                  <span className='flex-1 min-w-0 text-sm'>
                    <span className='font-medium'>{incoming ? 'Recebido' : 'Enviado'}</span>
                    <span className={MUTED}>
                      {' · '}
                      {NETWORKS[t.network]?.name || t.network} ·{' '}
                      {new Date(t.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className={`text-sm font-semibold ${incoming ? 'text-emerald-700 dark:text-[#34C77B]' : ''}`}>
                    {hidden ? '••••' : `${incoming ? '+' : '−'}${qty(Number(t.amount) || 0, asset.symbol)}`}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
