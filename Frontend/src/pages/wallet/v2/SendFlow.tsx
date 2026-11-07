import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  BookUser,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Fingerprint,
  Loader2,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react'
import { CryptoIcon } from '@/components/CryptoIcon'
import { QRCodeScanner } from '@/components/QRCodeScanner'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import { use2FAStatus } from '@/hooks/use2FAStatus'
import { apiClient } from '@/services/api'
import { sendService } from '@/services/sendService'
import { transactionService } from '@/services/transactionService'
import { walletService } from '@/services/walletService'
import { webAuthnService } from '@/services/webauthn'
import notificationService from '@/services/notificationService'
import { appNotifications } from '@/services/appNotifications'
import { NETWORKS, type Position, type WalletAsset } from './assets'
import { AssetButton, BTN_PRIMARY, BTN_SECONDARY, CARD, FlowHeader, LINK, MUTED, SOFT, SearchBox, qty, shortAddr } from './ui'

const STEPS = ['Moeda', 'Rede', 'Destino e valor', 'Revisão']
const ERC20 = ['USDT', 'USDC', 'TRAY', 'DAI', 'SHIB', 'LINK', 'UNI', 'PEPE', 'WBTC']
const NATIVE: Record<string, string> = {
  polygon: 'MATIC',
  tron: 'TRX',
  base: 'ETH',
  bsc: 'BNB',
  ethereum: 'ETH',
  bitcoin: 'BTC',
  solana: 'SOL',
  litecoin: 'LTC',
  dogecoin: 'DOGE',
  cardano: 'ADA',
  avalanche: 'AVAX',
  polkadot: 'DOT',
  xrp: 'XRP',
}
const EXPLORERS: Record<string, string> = {
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
  cardano: 'https://cardanoscan.io/transaction/',
  polkadot: 'https://polkadot.subscan.io/extrinsic/',
}
/** Taxa conservadora por rede (moeda nativa) usada no MÁX de moedas nativas. */
const NETWORK_FEES: Record<string, { base: number; margin: number; decimals: number }> = {
  tron: { base: 1.5, margin: 1.5, decimals: 6 },
  solana: { base: 0.001, margin: 2, decimals: 9 },
  bitcoin: { base: 0.0003, margin: 1.5, decimals: 8 },
  ethereum: { base: 0.003, margin: 2, decimals: 18 },
  polygon: { base: 0.02, margin: 2, decimals: 18 },
  bsc: { base: 0.001, margin: 1.5, decimals: 18 },
  base: { base: 0.0002, margin: 2, decimals: 18 },
  litecoin: { base: 0.002, margin: 1.5, decimals: 8 },
  dogecoin: { base: 2, margin: 1.5, decimals: 8 },
  cardano: { base: 0.3, margin: 1.5, decimals: 6 },
  avalanche: { base: 0.02, margin: 1.5, decimals: 18 },
  polkadot: { base: 0.02, margin: 1.5, decimals: 10 },
  xrp: { base: 0.00002, margin: 2, decimals: 6 },
}

/** Saldo decimal exato como string (sem notação científica / perda de precisão). */
const toPlainDecimal = (value: unknown): string | null => {
  const str = String(value ?? '').trim()
  if (!/^\d+(\.\d+)?$/.test(str)) return null
  const [i = '0', f = ''] = str.split('.')
  const frac = f.replace(/0+$/, '')
  return frac ? `${i}.${frac}` : i
}

const isValidAddress = (address: string, network: string): boolean => {
  const a = address.trim()
  if (!a) return false
  switch (network) {
    case 'bitcoin':
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a) || /^bc1[a-z0-9]{39,59}$/.test(a) || /^bc1p[a-z0-9]{58}$/.test(a)
    case 'tron':
      return /^T[a-zA-Z0-9]{33}$/.test(a)
    case 'solana':
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)
    case 'xrp':
      return /^r[0-9a-zA-Z]{24,34}$/.test(a)
    case 'litecoin':
      return /^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(a) || /^ltc1[a-z0-9]{39,59}$/.test(a)
    case 'dogecoin':
      return /^D[5-9A-HJ-NP-U][a-km-zA-HJ-NP-Z1-9]{32}$/.test(a)
    case 'cardano':
      return /^addr1[a-z0-9]{98,}$/.test(a)
    case 'polkadot':
      return /^1[a-zA-Z0-9]{47}$/.test(a)
    default:
      return /^0x[a-fA-F0-9]{40}$/.test(a)
  }
}
const ADDRESS_HINT: Record<string, string> = {
  bitcoin: '1…, 3… ou bc1…',
  tron: 'T…',
  solana: 'endereço Solana',
  xrp: 'r…',
  litecoin: 'L…, M… ou ltc1…',
  dogecoin: 'D…',
  cardano: 'addr1…',
  polkadot: '1…',
}
const hintFor = (network: string) => ADDRESS_HINT[network] || '0x…'

type Phase = 'idle' | 'checking' | 'auth' | 'sending' | 'error'

interface Props {
  held: WalletAsset[]
  prices: Record<string, { price: number }>
  initialAsset?: string
  initialNetwork?: string
  onClose: () => void
}

interface AddressBookEntry {
  id: number
  name: string
  address: string
  network: string
}

/** Enviar em passos: moeda → rede → destino e valor → revisão (taxa + confirmação) → recibo. */
export const SendFlow = ({ held, prices, initialAsset, initialNetwork, onClose }: Props) => {
  const { formatCurrency } = useCurrencyStore()
  const { data: twoFA } = use2FAStatus()

  const start = held.find(a => a.symbol === initialAsset)
  const startPos = start
    ? start.positions.find(p => p.network === initialNetwork) || (start.positions.length === 1 ? start.positions[0] : undefined)
    : undefined
  const [assetSym, setAssetSym] = useState<string | null>(start?.symbol ?? null)
  const [network, setNetwork] = useState<string | null>(startPos?.network ?? null)
  const [details, setDetails] = useState(false) // passou do passo 3 para a revisão
  const [search, setSearch] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [maxInfo, setMaxInfo] = useState<{ loading: boolean; note?: string } | null>(null)
  const [speed, setSpeed] = useState<'slow' | 'standard' | 'fast'>('standard')
  const [fees, setFees] = useState<{ slow_fee: string; standard_fee: string; fast_fee: string } | null>(null)
  const [feesLoading, setFeesLoading] = useState(false)
  const [code, setCode] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [scanner, setScanner] = useState(false)
  const [book, setBook] = useState<AddressBookEntry[] | null>(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [biometric, setBiometric] = useState(false)
  const [sent, setSent] = useState<{ hash: string; amount: string; to: string; at: Date } | null>(null)
  const submitting = useRef(false)

  const asset = held.find(a => a.symbol === assetSym) || null
  const position: Position | null = asset && network ? asset.positions.find(p => p.network === network) || null : null
  const isToken = !!assetSym && ERC20.includes(assetSym)
  const tokenSymbol = assetSym === 'ETH' && network === 'base' ? 'BASE' : assetSym || ''
  const amountNum = Number.parseFloat(amount.replace(',', '.')) || 0
  const addressOk = !!network && isValidAddress(to, network)
  const overBalance = !!position && amountNum > position.quantity
  const step = !asset ? 0 : !position ? 1 : !details ? 2 : 3
  const nativeSym = network ? NATIVE[network] || '' : ''
  const feeValue = fees ? Number.parseFloat((speed === 'slow' ? fees.slow_fee : speed === 'fast' ? fees.fast_fee : fees.standard_fee) || '0') : 0
  const authMode: 'bio' | 'totp' | 'none' = biometric ? 'bio' : twoFA?.enabled ? 'totp' : 'none'

  useEffect(() => {
    ;(async () => {
      try {
        if (webAuthnService.isSupported()) {
          const st = await webAuthnService.getStatus()
          setBiometric(st.has_biometric && st.credentials.length > 0)
        }
      } catch {
        setBiometric(false)
      }
    })()
  }, [])

  // Taxa estimada ao entrar na revisão
  useEffect(() => {
    if (step !== 3 || !position) return
    let alive = true
    setFeesLoading(true)
    transactionService
      .estimateFee({ wallet_id: position.walletId, to_address: to, amount: amount.replace(',', '.'), network: position.network })
      .then(r => alive && setFees(r?.fee_estimates || null))
      .catch(() => alive && setFees(null))
      .finally(() => alive && setFeesLoading(false))
    return () => {
      alive = false
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return held.filter(a => !q || `${a.symbol} ${a.name}`.toLowerCase().includes(q))
  }, [held, search])

  const back = () => {
    setError(null)
    if (step === 3) setDetails(false)
    else if (step === 2 && asset && asset.positions.length > 1) setNetwork(null)
    else if (step >= 1) {
      setNetwork(null)
      setAssetSym(null)
    } else onClose()
  }

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text) setTo(text)
    } catch {
      toast.error('Não foi possível colar. Cole manualmente no campo.')
    }
  }

  const openBook = async () => {
    setBookOpen(o => !o)
    if (book) return
    try {
      const r = await apiClient.get('/address-book/')
      setBook(r.data?.addresses || [])
    } catch {
      setBook([])
      toast.error('Não foi possível carregar a agenda')
    }
  }

  /** MÁX: tokens usam o saldo exato (a taxa sai da moeda nativa); moedas nativas descontam a taxa com margem. */
  const setMax = async () => {
    if (!position) return
    if (isToken) {
      setAmount(toPlainDecimal(position.raw) ?? String(position.quantity))
      setMaxInfo({ loading: false, note: `A taxa de rede é paga em ${nativeSym}.` })
      return
    }
    const cfg = NETWORK_FEES[position.network] || { base: 0.01, margin: 2, decimals: 8 }
    setMaxInfo({ loading: true })
    let fee = cfg.base
    try {
      const est = await transactionService.estimateFee({
        wallet_id: position.walletId,
        to_address: addressOk ? to : '0x0000000000000000000000000000000000000000',
        amount: String(position.quantity),
        network: position.network,
      })
      const f = Number.parseFloat(est?.fee_estimates?.[speed === 'slow' ? 'slow_fee' : speed === 'fast' ? 'fast_fee' : 'standard_fee'] || '0')
      if (f > 0) fee = Math.max(f, cfg.base)
    } catch {
      /* usa a taxa conservadora */
    }
    const withMargin = fee * cfg.margin
    const mult = Math.pow(10, Math.min(cfg.decimals, 8))
    const max = Math.floor((position.quantity - withMargin) * mult) / mult
    if (max <= 0) {
      setAmount('')
      setMaxInfo({ loading: false, note: `Saldo insuficiente para cobrir a taxa (~${withMargin.toFixed(6)} ${nativeSym}).` })
      return
    }
    setAmount(String(max))
    setMaxInfo({ loading: false, note: `Reservamos ~${withMargin.toFixed(6)} ${nativeSym} para a taxa de rede.` })
  }

  const send = async () => {
    if (!position || submitting.current) return
    submitting.current = true
    setError(null)
    try {
      setPhase('checking')
      let fromAddress = position.address
      if (!fromAddress) {
        try {
          fromAddress = await walletService.getNetworkAddress(position.walletId, position.network)
        } catch {
          /* tratado abaixo */
        }
      }
      if (!fromAddress) throw new Error('Endereço da sua carteira nesta rede ainda não carregou. Tente de novo em alguns segundos.')

      const value = amount.replace(',', '.')
      const validation = await sendService.validateSend({
        wallet_id: position.walletId,
        to_address: to.trim(),
        amount: value,
        network: position.network,
        token_symbol: isToken ? assetSym! : undefined,
      })
      if (!validation.valid) {
        const map: Record<string, string> = {
          INSUFFICIENT_BALANCE: `Saldo insuficiente. Disponível: ${validation.balance || '0'}`,
          INSUFFICIENT_TOKEN_BALANCE: `Saldo de ${assetSym} insuficiente. Disponível: ${validation.balance || '0'}`,
          INSUFFICIENT_GAS: `Falta ${nativeSym} para pagar a taxa de rede.`,
          INVALID_TO_ADDRESS: 'Endereço de destino inválido.',
        }
        throw new Error(map[validation.error || ''] || validation.message || 'Esse envio não pode ser feito.')
      }

      let authToken: string | undefined
      if (authMode === 'bio') {
        setPhase('auth')
        try {
          authToken = (await webAuthnService.authenticate()) || undefined
        } catch {
          throw new Error('Confirmação biométrica cancelada.')
        }
        if (!authToken) throw new Error('Confirmação biométrica cancelada.')
      } else if (authMode === 'totp') {
        authToken = code.trim()
      }

      setPhase('sending')
      const result = await transactionService.sendTransaction(
        {
          wallet_id: position.walletId,
          to_address: to.trim(),
          amount: value,
          network: position.network,
          fee_preference: speed === 'slow' ? 'safe' : speed,
          token_symbol: tokenSymbol,
        },
        undefined,
        authToken
      )
      setSent({ hash: result.txHash, amount: value, to: to.trim(), at: new Date() })
      setPhase('idle')
      notificationService.showSuccess('Envio realizado!')
      appNotifications.transactionSent(result.txHash, Number.parseFloat(value), assetSym!, to.trim())
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      const msg =
        detail === 'INVALID_2FA_TOKEN'
          ? 'Código de verificação incorreto.'
          : detail === 'BIOMETRIC_TOKEN_EXPIRED'
            ? 'A confirmação biométrica expirou. Tente de novo.'
            : typeof detail === 'string'
              ? detail
              : e?.message || 'Não foi possível enviar.'
      setError(msg)
      setPhase('error')
    } finally {
      submitting.current = false
    }
  }

  // ── Recibo ──
  if (sent && asset && position) {
    const explorer = EXPLORERS[position.network]
    return (
      <div className='max-w-2xl mx-auto text-gray-900 dark:text-[#EEF1F7]'>
        <section className={`${CARD} p-6 sm:p-8 text-center`}>
          <span className='mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 dark:bg-[#34C77B]/10 dark:text-[#34C77B] flex items-center justify-center'>
            <CheckCircle2 className='w-8 h-8' aria-hidden='true' />
          </span>
          <h2 className='mt-4 text-2xl font-semibold'>Envio realizado</h2>
          <p className={`mt-1 ${SOFT}`}>A transação foi transmitida para a rede {NETWORKS[position.network]?.name}.</p>
          <p className='mt-6 font-["Space_Grotesk",Inter,sans-serif] text-4xl font-semibold tabular-nums'>{qty(Number(sent.amount), asset.symbol)}</p>
          <p className={`text-sm ${MUTED}`}>≈ {formatCurrency(Number(sent.amount) * asset.priceUSD)}</p>
          <dl className='mt-6 text-left text-sm space-y-2.5 rounded-xl bg-gray-50 dark:bg-[#0D121C] p-4'>
            <div className='flex justify-between gap-4'>
              <dt className={MUTED}>Para</dt>
              <dd className='font-mono'>{shortAddr(sent.to)}</dd>
            </div>
            <div className='flex justify-between gap-4'>
              <dt className={MUTED}>Rede</dt>
              <dd>{NETWORKS[position.network]?.name}</dd>
            </div>
            <div className='flex justify-between gap-4'>
              <dt className={MUTED}>Data</dt>
              <dd>{sent.at.toLocaleString('pt-BR')}</dd>
            </div>
            <div className='flex justify-between gap-4 items-center'>
              <dt className={MUTED}>Hash</dt>
              <dd className='flex items-center gap-1'>
                <span className='font-mono'>{shortAddr(sent.hash)}</span>
                <button
                  type='button'
                  aria-label='Copiar hash'
                  onClick={() => navigator.clipboard.writeText(sent.hash).then(() => toast.success('Hash copiado'))}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${MUTED} hover:bg-gray-100 dark:hover:bg-[#172033]`}
                >
                  <Copy className='w-4 h-4' aria-hidden='true' />
                </button>
              </dd>
            </div>
          </dl>
          <div className='mt-6 grid gap-2 sm:grid-cols-2'>
            {explorer ? (
              <a href={`${explorer}${sent.hash}`} target='_blank' rel='noreferrer' className={BTN_SECONDARY}>
                Ver no explorador
                <ExternalLink className='w-4 h-4' aria-hidden='true' />
              </a>
            ) : (
              <span />
            )}
            <button type='button' onClick={onClose} className={BTN_PRIMARY}>
              Voltar para a carteira
            </button>
          </div>
        </section>
      </div>
    )
  }

  const busy = phase === 'checking' || phase === 'auth' || phase === 'sending'

  return (
    <div className='max-w-2xl mx-auto text-gray-900 dark:text-[#EEF1F7]'>
      <FlowHeader
        title={assetSym ? `Enviar ${assetSym}` : 'Enviar'}
        backLabel={step === 0 ? 'Voltar para a carteira' : 'Voltar'}
        onBack={busy ? () => undefined : back}
        step={step}
        steps={STEPS}
      />

      {/* 1. Moeda */}
      {step === 0 && (
        <section className={`${CARD} p-4 sm:p-5`} aria-label='Escolha a moeda'>
          {held.length === 0 ? (
            <div className='p-6 text-center'>
              <p className={SOFT}>Você ainda não tem saldo para enviar.</p>
              <Link to='/instant-trade' className={`${BTN_PRIMARY} mt-4 px-6`}>
                Comprar com Pix
              </Link>
            </div>
          ) : (
            <>
              <p className={`text-sm mb-3 ${SOFT}`}>Qual moeda você vai enviar?</p>
              {held.length > 6 && <SearchBox value={search} onChange={setSearch} placeholder='Buscar moeda' />}
              <div className='mt-2'>
                {list.map(a => (
                  <AssetButton
                    key={a.symbol}
                    symbol={a.symbol}
                    name={a.name}
                    sub={qty(a.quantity, a.symbol)}
                    right={
                      <span className='inline-flex items-center gap-2'>
                        <span className={`text-sm ${SOFT}`}>{formatCurrency(a.valueUSD)}</span>
                        <ChevronRight className={`w-4 h-4 ${MUTED}`} aria-hidden='true' />
                      </span>
                    }
                    onClick={() => {
                      setAssetSym(a.symbol)
                      setNetwork(a.positions.length === 1 ? a.positions[0]!.network : null)
                      setAmount('')
                      setMaxInfo(null)
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* 2. Rede (só onde há saldo) */}
      {step === 1 && asset && (
        <section className={`${CARD} p-4 sm:p-5`} aria-label='Escolha a rede'>
          <p className={`text-sm mb-4 ${SOFT}`}>
            De qual rede sai o envio? Use a mesma rede que o destinatário aceita.
          </p>
          <div className='space-y-2'>
            {asset.positions.map(p => (
              <button
                key={p.network}
                type='button'
                onClick={() => {
                  setNetwork(p.network)
                  setAmount('')
                  setMaxInfo(null)
                }}
                className='w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 dark:border-[#222B3D] dark:hover:border-[#2F3D5C] text-left'
              >
                <span className='flex-1 min-w-0'>
                  <span className='block font-semibold'>
                    {NETWORKS[p.network]?.name || p.network}
                    {NETWORKS[p.network]?.standard && <span className={`ml-2 text-xs font-medium ${MUTED}`}>{NETWORKS[p.network]?.standard}</span>}
                  </span>
                  <span className={`block text-sm ${MUTED}`}>Taxa paga em {NATIVE[p.network]}</span>
                </span>
                <span className='text-right text-sm font-semibold tabular-nums'>{qty(p.quantity, asset.symbol)}</span>
                <ChevronRight className={`w-4 h-4 ${MUTED}`} aria-hidden='true' />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. Destino e valor */}
      {step === 2 && asset && position && (
        <section className={`${CARD} p-5 sm:p-6 space-y-6`} aria-label='Destino e valor'>
          <div className='flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-[#0D121C] px-4 py-3'>
            <CryptoIcon symbol={asset.symbol} size={32} className='rounded-full' />
            <span className='flex-1 text-sm'>
              <strong>{asset.symbol}</strong> pela rede <strong>{NETWORKS[position.network]?.name}</strong>
            </span>
            <span className={`text-sm tabular-nums ${SOFT}`}>{qty(position.quantity, asset.symbol)}</span>
          </div>

          <div>
            <label htmlFor='send-to' className={`block text-sm mb-2 ${SOFT}`}>
              Endereço de destino
            </label>
            <div
              className={`flex items-center gap-2 rounded-xl border bg-white dark:bg-[#0D121C] px-3 focus-within:border-blue-500 dark:focus-within:border-[#5B8CFF] ${
                to && !addressOk ? 'border-red-400 dark:border-[#FF7A7A]' : 'border-gray-200 dark:border-[#2A3449]'
              }`}
            >
              <input
                id='send-to'
                value={to}
                onChange={e => setTo(e.target.value.trim())}
                placeholder={`Cole o endereço (${hintFor(position.network)})`}
                autoComplete='off'
                spellCheck={false}
                className='flex-1 min-w-0 h-14 bg-transparent outline-none font-mono text-sm'
              />
              {to ? (
                <button type='button' aria-label='Limpar endereço' onClick={() => setTo('')} className={`w-9 h-9 rounded-lg flex items-center justify-center ${MUTED}`}>
                  <X className='w-4 h-4' aria-hidden='true' />
                </button>
              ) : (
                <button type='button' aria-label='Colar endereço' onClick={paste} className={`w-9 h-9 rounded-lg flex items-center justify-center ${MUTED} hover:text-gray-900 dark:hover:text-white`}>
                  <ClipboardPaste className='w-4 h-4' aria-hidden='true' />
                </button>
              )}
              <button type='button' aria-label='Ler QR Code' onClick={() => setScanner(true)} className={`w-9 h-9 rounded-lg flex items-center justify-center ${MUTED} hover:text-gray-900 dark:hover:text-white`}>
                <QrCode className='w-4 h-4' aria-hidden='true' />
              </button>
              <button type='button' aria-label='Agenda de endereços' aria-expanded={bookOpen} onClick={openBook} className={`w-9 h-9 rounded-lg flex items-center justify-center ${MUTED} hover:text-gray-900 dark:hover:text-white`}>
                <BookUser className='w-4 h-4' aria-hidden='true' />
              </button>
            </div>
            {to && !addressOk && (
              <p className='mt-2 text-sm text-red-600 dark:text-[#FF7A7A]'>
                Esse não parece um endereço da rede {NETWORKS[position.network]?.name} ({hintFor(position.network)}).
              </p>
            )}
            {addressOk && (
              <p className='mt-2 text-sm text-emerald-700 dark:text-[#34C77B] inline-flex items-center gap-1.5'>
                <Check className='w-4 h-4' aria-hidden='true' />
                Endereço válido para {NETWORKS[position.network]?.name}
              </p>
            )}
            {bookOpen && (
              <div className='mt-3 rounded-xl border border-gray-200 dark:border-[#222B3D] max-h-60 overflow-y-auto'>
                {!book ? (
                  <p className={`p-4 text-sm ${MUTED}`}>Carregando…</p>
                ) : book.length === 0 ? (
                  <p className={`p-4 text-sm ${MUTED}`}>
                    Agenda vazia.{' '}
                    <Link to='/wallet/address-book' className={LINK}>
                      Adicionar endereços
                    </Link>
                  </p>
                ) : (
                  <ul>
                    {book
                      .filter(e => !e.network || e.network.toLowerCase() === position.network)
                      .map(e => (
                        <li key={e.id}>
                          <button
                            type='button'
                            onClick={() => {
                              setTo(e.address)
                              setBookOpen(false)
                            }}
                            className='w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#172033]'
                          >
                            <span className='block text-sm font-semibold'>{e.name}</span>
                            <span className={`block font-mono text-xs ${MUTED}`}>{shortAddr(e.address)}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div>
            <div className='flex items-baseline justify-between mb-2'>
              <label htmlFor='send-amount' className={`text-sm ${SOFT}`}>
                Valor
              </label>
              <span className={`text-xs ${MUTED} tabular-nums`}>Disponível: {qty(position.quantity, asset.symbol)}</span>
            </div>
            <div
              className={`flex items-center gap-3 h-16 px-4 rounded-xl border bg-white dark:bg-[#0D121C] focus-within:border-blue-500 dark:focus-within:border-[#5B8CFF] ${
                overBalance ? 'border-red-400 dark:border-[#FF7A7A]' : 'border-gray-200 dark:border-[#2A3449]'
              }`}
            >
              <input
                id='send-amount'
                inputMode='decimal'
                autoComplete='off'
                value={amount}
                onChange={e => {
                  setAmount(e.target.value.replace(/[^\d.,]/g, ''))
                  setMaxInfo(null)
                }}
                placeholder='0'
                className='flex-1 min-w-0 bg-transparent outline-none text-2xl font-semibold tabular-nums'
              />
              <span className={`text-base ${MUTED}`}>{asset.symbol}</span>
              <button
                type='button'
                onClick={setMax}
                disabled={maxInfo?.loading}
                className='h-9 px-3 rounded-lg text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-[#8FB0FF] dark:bg-[#172033] dark:hover:bg-[#1E2A42] disabled:opacity-50'
              >
                {maxInfo?.loading ? <Loader2 className='w-4 h-4 animate-spin' aria-hidden='true' /> : 'Máx'}
              </button>
            </div>
            <p className={`mt-2 text-sm ${overBalance ? 'text-red-600 dark:text-[#FF7A7A]' : MUTED}`}>
              {overBalance ? 'Valor maior que o saldo disponível.' : `≈ ${formatCurrency(amountNum * asset.priceUSD)}`}
            </p>
            {maxInfo?.note && <p className={`mt-1 text-xs ${MUTED}`}>{maxInfo.note}</p>}
          </div>

          <button
            type='button'
            disabled={!addressOk || amountNum <= 0 || overBalance}
            onClick={() => {
              setDetails(true)
              setPhase('idle')
              setError(null)
              setCode('')
            }}
            className={`${BTN_PRIMARY} w-full`}
          >
            Revisar envio
          </button>
        </section>
      )}

      {/* 4. Revisão e confirmação */}
      {step === 3 && asset && position && (
        <section className={`${CARD} p-5 sm:p-6`} aria-label='Revisão'>
          <p className={`text-sm ${SOFT}`}>Você está enviando</p>
          <p className='font-["Space_Grotesk",Inter,sans-serif] text-4xl font-semibold tracking-tight tabular-nums'>{qty(amountNum, asset.symbol)}</p>
          <p className={`text-sm ${MUTED}`}>≈ {formatCurrency(amountNum * asset.priceUSD)}</p>

          <dl className='mt-6 space-y-3 text-sm'>
            <div className='flex justify-between gap-4'>
              <dt className={MUTED}>Para</dt>
              <dd className='font-mono text-right break-all max-w-[70%]'>{to}</dd>
            </div>
            <div className='flex justify-between gap-4'>
              <dt className={MUTED}>Rede</dt>
              <dd>
                {NETWORKS[position.network]?.name} {NETWORKS[position.network]?.standard && <span className={MUTED}>{NETWORKS[position.network]?.standard}</span>}
              </dd>
            </div>
          </dl>

          <fieldset className='mt-6'>
            <legend className={`text-sm mb-2 ${SOFT}`}>Velocidade e taxa de rede</legend>
            <div className='grid grid-cols-3 gap-2'>
              {(['slow', 'standard', 'fast'] as const).map(s => {
                const f = fees ? Number.parseFloat((s === 'slow' ? fees.slow_fee : s === 'fast' ? fees.fast_fee : fees.standard_fee) || '0') : 0
                return (
                  <button
                    key={s}
                    type='button'
                    aria-pressed={speed === s}
                    disabled={busy}
                    onClick={() => setSpeed(s)}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                      speed === s
                        ? 'border-blue-600 bg-blue-50/60 dark:border-[#5B8CFF] dark:bg-[#172033]'
                        : 'border-gray-200 hover:border-gray-300 dark:border-[#222B3D] dark:hover:border-[#2F3D5C]'
                    }`}
                  >
                    <span className='block text-sm font-semibold'>{s === 'slow' ? 'Econômica' : s === 'fast' ? 'Rápida' : 'Normal'}</span>
                    <span className={`block text-xs tabular-nums ${MUTED}`}>
                      {feesLoading ? '…' : f > 0 ? `${f.toLocaleString('pt-BR', { maximumFractionDigits: 8 })} ${nativeSym}` : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
            {feeValue > 0 && prices[nativeSym]?.price ? (
              <p className={`mt-2 text-xs ${MUTED}`}>≈ {formatCurrency(feeValue * prices[nativeSym]!.price)} de taxa, paga em {nativeSym}.</p>
            ) : (
              <p className={`mt-2 text-xs ${MUTED}`}>A taxa é paga em {nativeSym} e vai para a rede, não para a Wolknow.</p>
            )}
          </fieldset>

          {authMode === 'totp' && (
            <div className='mt-6'>
              <label htmlFor='send-2fa' className={`block text-sm mb-2 ${SOFT}`}>
                Código do autenticador (2FA)
              </label>
              <input
                id='send-2fa'
                inputMode='numeric'
                autoComplete='one-time-code'
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder='000000'
                className='w-full h-14 px-4 rounded-xl border border-gray-200 dark:border-[#2A3449] bg-white dark:bg-[#0D121C] outline-none focus:border-blue-500 dark:focus:border-[#5B8CFF] text-2xl tracking-[0.4em] font-semibold tabular-nums text-center'
              />
            </div>
          )}
          {authMode === 'none' && (
            <p className='mt-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/5 p-3 text-sm flex gap-2'>
              <ShieldCheck className='w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-300' aria-hidden='true' />
              <span>
                Proteja seus envios: ative o 2FA ou a biometria em{' '}
                <Link to='/settings' className={LINK}>
                  Configurações
                </Link>
                .
              </span>
            </p>
          )}

          <div className='mt-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/5 p-3 text-sm flex gap-2'>
            <AlertTriangle className='w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-300' aria-hidden='true' />
            Envios na blockchain não podem ser desfeitos. Confira o endereço e a rede.
          </div>

          {error && (
            <p role='alert' className='mt-4 rounded-xl bg-red-50 dark:bg-[#FF7A7A]/10 p-3 text-sm text-red-700 dark:text-[#FF9A9A]'>
              {error}
            </p>
          )}

          <button
            type='button'
            onClick={send}
            disabled={busy || (authMode === 'totp' && code.length !== 6)}
            className={`${BTN_PRIMARY} w-full mt-6 h-[52px] text-[15px]`}
          >
            {busy ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' aria-hidden='true' />
                {phase === 'checking' ? 'Conferindo saldo e endereço…' : phase === 'auth' ? 'Confirme com a biometria…' : 'Enviando…'}
              </>
            ) : authMode === 'bio' ? (
              <>
                <Fingerprint className='w-5 h-5' aria-hidden='true' />
                Confirmar com biometria e enviar
              </>
            ) : (
              `Enviar ${qty(amountNum, asset.symbol)}`
            )}
          </button>
          <button type='button' onClick={back} disabled={busy} className={`${BTN_SECONDARY} w-full mt-2`}>
            Alterar
          </button>
        </section>
      )}

      <QRCodeScanner
        isOpen={scanner}
        onClose={() => setScanner(false)}
        onScan={addr => {
          setTo(addr.replace(/^[a-z]+:/i, '').split('?')[0]!.trim())
          setScanner(false)
          toast.success('Endereço lido')
        }}
      />
    </div>
  )
}
