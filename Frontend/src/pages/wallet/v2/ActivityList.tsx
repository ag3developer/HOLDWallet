import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Copy, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallet'
import type { Transaction } from '@/services/transactionService'
import { symbolFromKey } from '@/pages/dashboard/home/usePortfolio'
import { generateCSV, generateJSON, generatePDF } from '../TransactionsPage'
import { NETWORKS } from './assets'
import { CARD, DOWN, MUTED, SKELETON, SOFT, SearchBox, qty, shortAddr } from './ui'

const EXPLORER: Record<string, string> = {
  polygon: 'https://polygonscan.com/tx/',
  ethereum: 'https://etherscan.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  base: 'https://basescan.org/tx/',
  avalanche: 'https://snowtrace.io/tx/',
  tron: 'https://tronscan.org/#/transaction/',
  bitcoin: 'https://mempool.space/tx/',
  solana: 'https://solscan.io/tx/',
  litecoin: 'https://blockchair.com/litecoin/transaction/',
  dogecoin: 'https://blockchair.com/dogecoin/transaction/',
  xrp: 'https://livenet.xrpl.org/transactions/',
}
const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmado', cls: 'text-emerald-700 bg-emerald-50 dark:text-[#34C77B] dark:bg-[#34C77B]/10' },
  pending: { label: 'Pendente', cls: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-400/10' },
  failed: { label: 'Falhou', cls: 'text-red-700 bg-red-50 dark:text-[#FF9A9A] dark:bg-[#FF7A7A]/10' },
}
type Dir = 'all' | 'in' | 'out'

/** Atividade da carteira: filtros simples, agrupada por dia, detalhes ao tocar e relatório. */
export const ActivityList = ({ myAddresses, hidden }: { myAddresses: Set<string>; hidden: boolean }) => {
  const { data: wallets } = useWallets()
  const walletId = wallets?.[0] ? String(wallets[0].id) : ''
  const filters = useMemo(() => ({ wallet_id: walletId, limit: 100 }), [walletId])
  const { transactions, isLoading, refreshTransactions, hasMore, loadMore } = useTransactions(filters)
  const [dir, setDir] = useState<Dir>('all')
  const [asset, setAsset] = useState<string>('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    if (!walletId) return
    const i = setInterval(() => refreshTransactions(), 30_000)
    return () => clearInterval(i)
  }, [walletId, refreshTransactions])

  const symbolOf = (t: Transaction) => (t.token_symbol ? t.token_symbol.toUpperCase() : symbolFromKey(t.network || ''))
  const isIn = (t: Transaction) => myAddresses.has(String(t.to_address || '').toLowerCase())

  const assets = useMemo(() => Array.from(new Set(transactions.map(symbolOf))).sort(), [transactions]) // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = transactions.filter(t => {
    if (dir === 'in' && !isIn(t)) return false
    if (dir === 'out' && isIn(t)) return false
    if (asset !== 'all' && symbolOf(t) !== asset) return false
    const s = q.trim().toLowerCase()
    if (s && ![t.hash, t.to_address, t.from_address].some(v => String(v || '').toLowerCase().includes(s))) return false
    return true
  })

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: Transaction[] }> = []
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86_400_000).toDateString()
    for (const t of filtered) {
      const d = new Date(t.created_at)
      const key = d.toDateString()
      const label =
        key === today ? 'Hoje' : key === yesterday ? 'Ontem' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      const g = out[out.length - 1]
      if (g && g.day === label) g.items.push(t)
      else out.push({ day: label, items: [t] })
    }
    return out
  }, [filtered])

  const download = (format: 'csv' | 'json' | 'pdf') => {
    const address = [...myAddresses][0] || ''
    const content =
      format === 'csv'
        ? generateCSV(filtered, walletId, address)
        : format === 'json'
          ? generateJSON(filtered, walletId, address)
          : generatePDF(filtered, walletId, address)
    const ext = format === 'pdf' ? 'html' : format
    const type = format === 'csv' ? 'text/csv' : format === 'json' ? 'application/json' : 'text/html'
    const url = URL.createObjectURL(new Blob([content], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = `transacoes-${new Date().toISOString().split('T')[0]}.${ext}`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    a.remove()
    setReportOpen(false)
    toast.success('Relatório baixado')
  }

  const chip = (active: boolean) =>
    `h-9 px-3.5 rounded-full border text-sm whitespace-nowrap transition-colors ${
      active
        ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700 dark:border-[#5B8CFF] dark:bg-[#172033] dark:text-[#EEF1F7]'
        : `border-gray-200 dark:border-[#222B3D] ${SOFT} hover:border-gray-300 dark:hover:border-[#2F3D5C]`
    }`

  return (
    <section className={`${CARD} p-4 sm:p-6 text-gray-900 dark:text-[#EEF1F7]`} aria-label='Atividade'>
      <div className='flex flex-wrap items-center gap-3'>
        <div className='flex-1 min-w-[220px]'>
          <SearchBox value={q} onChange={setQ} placeholder='Buscar por hash ou endereço' />
        </div>
        <button
          type='button'
          onClick={() => refreshTransactions()}
          aria-label='Atualizar'
          className={`w-11 h-11 rounded-xl border border-gray-200 dark:border-[#222B3D] flex items-center justify-center ${SOFT} hover:text-gray-900 dark:hover:text-white`}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden='true' />
        </button>
        <div className='relative'>
          <button
            type='button'
            aria-expanded={reportOpen}
            onClick={() => setReportOpen(o => !o)}
            className={`h-11 px-4 rounded-xl border border-gray-200 dark:border-[#222B3D] inline-flex items-center gap-2 text-sm font-medium ${SOFT} hover:text-gray-900 dark:hover:text-white`}
          >
            <Download className='w-4 h-4' aria-hidden='true' />
            Relatório
          </button>
          {reportOpen && (
            <div className='absolute right-0 mt-2 w-40 z-20 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-[#2A3449] dark:bg-[#111724] py-1'>
              {(['csv', 'pdf', 'json'] as const).map(f => (
                <button key={f} type='button' onClick={() => download(f)} className='w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-[#172033]'>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className='mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1'>
        {(
          [
            ['all', 'Tudo'],
            ['in', 'Recebidos'],
            ['out', 'Enviados'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type='button' aria-pressed={dir === id} onClick={() => setDir(id)} className={chip(dir === id)}>
            {label}
          </button>
        ))}
        {assets.length > 1 && <span className='w-px bg-gray-200 dark:bg-[#222B3D] mx-1 shrink-0' aria-hidden='true' />}
        {assets.length > 1 &&
          ['all', ...assets].map(a => (
            <button key={a} type='button' aria-pressed={asset === a} onClick={() => setAsset(a)} className={chip(asset === a)}>
              {a === 'all' ? 'Todas as moedas' : a}
            </button>
          ))}
      </div>

      {isLoading && !transactions.length ? (
        <div className='mt-5 space-y-2'>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-14 ${SKELETON}`} />
          ))}
        </div>
      ) : !filtered.length ? (
        <p className={`mt-8 mb-4 text-center ${SOFT}`}>{transactions.length ? 'Nada encontrado com esses filtros.' : 'Nenhuma movimentação ainda.'}</p>
      ) : (
        <div className='mt-4'>
          {groups.map(g => (
            <div key={g.day}>
              <h3 className={`sticky top-0 bg-white dark:bg-[#111724] py-2 text-xs font-semibold uppercase tracking-wide ${MUTED}`}>{g.day}</h3>
              <ul className='divide-y divide-gray-100 dark:divide-[#1A2232]'>
                {g.items.map(t => {
                  const incoming = isIn(t)
                  const sym = symbolOf(t)
                  const Icon = incoming ? ArrowDownLeft : ArrowUpRight
                  const st = STATUS[t.status] || STATUS.pending!
                  const expanded = open === t.id
                  const explorer = EXPLORER[t.network]
                  return (
                    <li key={t.id}>
                      <button type='button' aria-expanded={expanded} onClick={() => setOpen(expanded ? null : t.id)} className='w-full flex items-center gap-3.5 py-3 text-left'>
                        <span className='relative w-10 h-10 shrink-0'>
                          <CryptoIcon symbol={sym} size={40} className='rounded-full' />
                          <span
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#111724] ${
                              incoming ? 'bg-emerald-600 text-white dark:bg-[#34C77B] dark:text-[#0A0E15]' : 'bg-gray-700 text-white dark:bg-[#2A3449]'
                            }`}
                          >
                            <Icon className='w-3 h-3' strokeWidth={2.5} aria-hidden='true' />
                          </span>
                        </span>
                        <span className='flex-1 min-w-0'>
                          <span className='block text-[15px] font-medium'>
                            {incoming ? 'Recebido' : 'Enviado'} {sym}
                          </span>
                          <span className={`block text-[13px] truncate ${MUTED}`}>
                            {NETWORKS[t.network]?.name || t.network} ·{' '}
                            {new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                            {shortAddr(incoming ? t.from_address : t.to_address)}
                          </span>
                        </span>
                        <span className='text-right'>
                          <span className={`block text-sm font-semibold tabular-nums ${incoming ? 'text-emerald-700 dark:text-[#34C77B]' : ''}`}>
                            {hidden ? '••••' : `${incoming ? '+' : '−'}${qty(Number(t.amount) || 0, sym)}`}
                          </span>
                          {t.status !== 'confirmed' && <span className={`inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>}
                        </span>
                        <ChevronDown className={`w-4 h-4 shrink-0 ${MUTED} transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden='true' />
                      </button>
                      {expanded && (
                        <dl className='mb-3 rounded-xl bg-gray-50 dark:bg-[#0D121C] p-4 text-sm space-y-2.5'>
                          <div className='flex justify-between gap-4'>
                            <dt className={MUTED}>Status</dt>
                            <dd>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                            </dd>
                          </div>
                          <div className='flex justify-between gap-4'>
                            <dt className={MUTED}>De</dt>
                            <dd className='font-mono break-all text-right'>{t.from_address}</dd>
                          </div>
                          <div className='flex justify-between gap-4'>
                            <dt className={MUTED}>Para</dt>
                            <dd className='font-mono break-all text-right'>{t.to_address}</dd>
                          </div>
                          {t.fee && (
                            <div className='flex justify-between gap-4'>
                              <dt className={MUTED}>Taxa de rede</dt>
                              <dd className='tabular-nums'>{t.fee}</dd>
                            </div>
                          )}
                          <div className='flex justify-between gap-4'>
                            <dt className={MUTED}>Data</dt>
                            <dd>{new Date(t.created_at).toLocaleString('pt-BR')}</dd>
                          </div>
                          {t.hash && (
                            <div className='flex flex-wrap justify-end gap-2 pt-1'>
                              <button
                                type='button'
                                onClick={() => navigator.clipboard.writeText(t.hash).then(() => toast.success('Hash copiado'))}
                                className={`h-9 px-3 rounded-lg border border-gray-200 dark:border-[#2A3449] inline-flex items-center gap-1.5 text-xs font-medium ${SOFT}`}
                              >
                                <Copy className='w-3.5 h-3.5' aria-hidden='true' />
                                Copiar hash
                              </button>
                              {explorer && (
                                <a
                                  href={`${explorer}${t.hash}`}
                                  target='_blank'
                                  rel='noreferrer'
                                  className={`h-9 px-3 rounded-lg border border-gray-200 dark:border-[#2A3449] inline-flex items-center gap-1.5 text-xs font-medium ${SOFT}`}
                                >
                                  Ver no explorador
                                  <ExternalLink className='w-3.5 h-3.5' aria-hidden='true' />
                                </a>
                              )}
                            </div>
                          )}
                        </dl>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {hasMore && (
            <button type='button' onClick={() => loadMore()} className={`mt-4 w-full h-11 rounded-xl border border-gray-200 dark:border-[#222B3D] text-sm font-medium ${SOFT}`}>
              Carregar mais
            </button>
          )}
        </div>
      )}
      {!isLoading && transactions.some(t => t.status === 'failed') && dir === 'all' && (
        <p className={`mt-3 text-xs ${DOWN}`}>Envios que falharam não saem do seu saldo.</p>
      )}
    </section>
  )
}
