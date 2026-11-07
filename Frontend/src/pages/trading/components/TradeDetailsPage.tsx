/**
 * 📋 Trade Details Page - HOLD Wallet
 * ====================================
 *
 * Página de detalhes completos de uma trade OTC.
 * Mostra todas as informações incluindo dados bancários para pagamento.
 *
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  CreditCard,
  Building2,
  Wallet,
  QrCode,
  Timer,
  Smartphone,
} from 'lucide-react'
import { apiClient } from '@/services/api'
import { generateHoldPixQRCode, generateHoldPixPayload } from '@/utils/pixQrCode'
import toast from 'react-hot-toast'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useCurrencyStore, type Currency } from '@/stores/useCurrencyStore'
import { currencyManager } from '@/services/currency'

// Crypto logos from CoinGecko (free CDN)
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1696504745',
  BNB: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
  TRX: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png?1696502193',
  BASE: 'https://assets.coingecko.com/coins/images/30617/large/base.jpg?1696519330',
  USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
  SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
  LTC: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png?1696501400',
  DOGE: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501400',
  ADA: 'https://assets.coingecko.com/coins/images/975/large/cardano.png?1696502090',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png?1696512369',
  DOT: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png?1696512008',
  LINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png?1696502009',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png?1622619446',
  XRP: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442',
}

// ============================================================================
// TIPOS
// ============================================================================

interface TradeDetails {
  id: string
  reference_code: string
  operation: 'buy' | 'sell'
  symbol: string
  name?: string
  crypto_amount: number
  fiat_amount: number
  total_amount: number
  // Valores em BRL para TED/PIX
  brl_amount?: number
  brl_total_amount?: number
  usd_to_brl_rate?: number
  crypto_price?: number
  spread_percentage: number
  spread_amount?: number
  network_fee_percentage: number
  network_fee_amount?: number
  payment_method: string
  status:
    | 'PENDING'
    | 'PAYMENT_PROCESSING'
    | 'PAYMENT_CONFIRMED'
    | 'CRYPTO_RECEIVED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'FAILED'
  created_at: string
  updated_at?: string
  expires_at?: string
  payment_confirmed_at?: string
  completed_at?: string
  wallet_address?: string
  tx_hash?: string
  network?: string
  // Campos PIX do Banco do Brasil (BB-AUTO)
  pix_txid?: string
  pix_qrcode?: string
  pix_location?: string
  // Método de recebimento para SELL
  receiving_method_id?: string
  receiving_method?: {
    id: string
    method_type: string
    holder_name?: string
    pix_key?: string
    pix_key_type?: string
    bank_name?: string
    bank_code?: string
    account_number?: string
    account_type?: string
    branch_number?: string
  }
}

interface BankDetails {
  bank_name: string
  bank_code: string
  agency: string
  account: string
  account_type: string
  holder_name: string
  holder_document: string
  pix_key?: string
}

interface TradeDetailsPageProps {
  readonly tradeId: string
  readonly onBack: () => void
  readonly currencySymbol?: string
  readonly currencyLocale?: string
  /** Dados iniciais da trade (evita chamada à API) */
  readonly initialData?: Partial<TradeDetails> | undefined
}

// ============================================================================
// CONSTANTES
// ============================================================================

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  pix: { label: 'PIX Instantâneo', icon: <QrCode className='w-4 h-4' /> },
  bb_auto: { label: 'PIX Instantâneo', icon: <QrCode className='w-4 h-4' /> },
  ted: { label: 'TED Bancário', icon: <Building2 className='w-4 h-4' /> },
  credit_card: { label: 'Cartão de Crédito', icon: <CreditCard className='w-4 h-4' /> },
  debit_card: { label: 'Cartão de Débito', icon: <CreditCard className='w-4 h-4' /> },
  crypto: { label: 'Criptomoeda', icon: <Wallet className='w-4 h-4' /> },
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function TradeDetailsPage({
  tradeId,
  onBack,
  currencySymbol = 'R$',
  currencyLocale = 'pt-BR',
  initialData,
}: TradeDetailsPageProps) {
  // 🏦 Moeda do usuário para formatação multi-currency
  const { currency: userCurrency } = useCurrencyStore()

  // Se tiver dados iniciais, usar diretamente (sem loading)
  const [trade, setTrade] = useState<TradeDetails | null>(initialData as TradeDetails | null)
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [loading, setLoading] = useState(!initialData) // Só mostra loading se não tiver dados iniciais
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // PIX QR Code states
  const [pixQrCode, setPixQrCode] = useState<string | null>(null)
  const [pixPayload, setPixPayload] = useState<string | null>(null)
  const [showPixQr, setShowPixQr] = useState(true) // Default to showing QR Code

  // Buscar detalhes da trade (só se não tiver dados iniciais completos)
  useEffect(() => {
    // Se já temos dados completos, não precisa buscar
    if (initialData?.id && initialData?.status) {
      // Só buscar dados bancários se necessário
      fetchBankDetailsOnly()
    } else {
      fetchTradeDetails()
    }
  }, [tradeId])

  // Atualização automática do status até a ordem terminar (e completa os dados iniciais)
  useEffect(() => {
    if (trade && ['COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(trade.status)) return
    let alive = true
    const refresh = async () => {
      try {
        const response = await apiClient.get(`/instant-trade/${tradeId}`)
        const fresh = response.data.trade || response.data
        if (alive && fresh?.id) setTrade(prev => ({ ...(prev || {}), ...fresh }))
      } catch {
        /* mantém o último estado; tenta de novo no próximo ciclo */
      }
    }
    if (initialData) refresh()
    const interval = setInterval(refresh, 8000)
    return () => {
      alive = false
      clearInterval(interval)
    }
  }, [tradeId, trade?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer para expiração
  useEffect(() => {
    if (!trade?.expires_at || trade.status !== 'PENDING') return

    const updateTimer = () => {
      const now = new Date()
      const expires = new Date(trade.expires_at!)
      const diff = expires.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('Expirado')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [trade?.expires_at, trade?.status])

  // Gerar QR Code PIX quando necessário
  useEffect(() => {
    const generatePixQr = async () => {
      // Só gera para trades TED/PIX pendentes
      if (trade?.status !== 'PENDING') return
      const method = trade.payment_method?.toLowerCase()
      if (!method || !['ted', 'pix'].includes(method)) return

      try {
        // PRIORIDADE 1: Se tiver pix_qrcode do Banco do Brasil (BB-AUTO), usar diretamente
        if (trade.pix_qrcode) {
          console.log('[TradeDetails] Usando PIX do Banco do Brasil (BB-AUTO)')
          // O pix_qrcode do BB já é o payload EMV - gerar QR Code a partir dele
          const QRCode = await import('qrcode')
          const qrCodeImage = await QRCode.toDataURL(trade.pix_qrcode, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 256,
            color: { dark: '#000000', light: '#ffffff' },
          })
          setPixQrCode(qrCodeImage)
          setPixPayload(trade.pix_qrcode)
          return
        }

        // PRIORIDADE 2: Gerar QR Code local (conta estática)
        console.log('[TradeDetails] Gerando PIX local (conta estática)')
        // Usar o valor em BRL se disponível, senão converter de USD
        const amount = trade.brl_total_amount ?? trade.total_amount
        // Usar apenas o reference_code como txId (sem espaços ou caracteres especiais)
        const txId = trade.reference_code

        // Gerar QR Code e payload
        const qrCode = await generateHoldPixQRCode(amount, txId)
        const payload = generateHoldPixPayload(amount, txId)

        setPixQrCode(qrCode)
        setPixPayload(payload)
      } catch (error) {
        console.error('[TradeDetails] Error generating PIX QR:', error)
      }
    }

    generatePixQr()
  }, [trade?.id, trade?.status, trade?.brl_total_amount, trade?.total_amount, trade?.pix_qrcode])

  // Buscar apenas dados bancários (quando já temos dados da trade)
  const fetchBankDetailsOnly = async () => {
    if (!trade) return

    // Só buscar para TED/PIX pendentes
    if (
      trade.status === 'PENDING' &&
      ['ted', 'pix'].includes(trade.payment_method?.toLowerCase())
    ) {
      // Usar dados bancários padrão imediatamente (sem esperar API)
      setBankDetails({
        bank_name: 'Banco do Brasil',
        bank_code: '001',
        agency: '5271-0',
        account: '26689-2',
        account_type: 'Conta Corrente',
        holder_name: 'HOLD DIGITAL ASSETS LTDA',
        holder_document: '24.275.355/0001-51',
        pix_key: '24.275.355/0001-51',
      })

      // Tentar buscar da API em background (não bloqueia UI)
      try {
        const bankResponse = await apiClient.get(`/instant-trade/${tradeId}/bank-details`)
        if (bankResponse.data.bank_details || bankResponse.data) {
          setBankDetails(bankResponse.data.bank_details || bankResponse.data)
        }
      } catch {
        // Manter dados padrão
      }
    }
  }

  const fetchTradeDetails = async () => {
    setLoading(true)
    try {
      // Buscar detalhes da trade
      const response = await apiClient.get(`/instant-trade/${tradeId}`)
      const tradeData = response.data.trade || response.data

      // DEBUG: Log dos dados recebidos
      console.log('[TradeDetails] Raw API response:', response.data)
      console.log('[TradeDetails] Trade data:', tradeData)
      console.log(
        '[TradeDetails] Key amounts - fiat:',
        tradeData.fiat_amount,
        'total:',
        tradeData.total_amount,
        'crypto:',
        tradeData.crypto_amount
      )

      setTrade(tradeData)

      // Se for TED/PIX e estiver pendente, buscar dados bancários
      if (
        tradeData.status === 'PENDING' &&
        ['ted', 'pix'].includes(tradeData.payment_method?.toLowerCase())
      ) {
        try {
          const bankResponse = await apiClient.get(`/instant-trade/${tradeId}/bank-details`)
          setBankDetails(bankResponse.data.bank_details || bankResponse.data)
        } catch (bankError) {
          console.log('[TradeDetails] Bank details not available:', bankError)
          // Usar dados bancários padrão da HOLD Digital Assets
          setBankDetails({
            bank_name: 'Banco do Brasil',
            bank_code: '001',
            agency: '5271-0',
            account: '26689-2',
            account_type: 'Conta Corrente',
            holder_name: 'HOLD DIGITAL ASSETS LTDA',
            holder_document: '24.275.355/0001-51',
            pix_key: '24.275.355/0001-51',
          })
        }
      }
    } catch (error: any) {
      console.error('[TradeDetails] Error fetching trade:', error)
      toast.error('Erro ao carregar detalhes da trade')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast.success('Copiado!')
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  // Locale config para formatação
  const localeConfig: Record<Currency, { locale: string; code: string }> = {
    USD: { locale: 'en-US', code: 'USD' },
    BRL: { locale: 'pt-BR', code: 'BRL' },
    EUR: { locale: 'de-DE', code: 'EUR' },
  }

  /**
   * 🏦 Formata valor OTC na moeda do usuário.
   * Os valores vêm em BRL do backend → converte BRL→userCurrency.
   * Usado para valores informativos (preço, spread, taxas, totais no header).
   */
  const formatOtcValue = (value: number) => {
    const converted = currencyManager.convert(value, 'BRL', userCurrency).convertedValue
    const { locale, code } = localeConfig[userCurrency]
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted)
  }

  /**
   * Formata valor SEMPRE em BRL — usado para PIX/TED (métodos de pagamento brasileiros).
   * Esses valores representam transações reais em Reais no sistema bancário brasileiro.
   */
  const formatBRL = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const formatCrypto = (value: number, decimals = 8) => {
    return value.toFixed(decimals)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(currencyLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ───────────────────────── Apresentação (mesma identidade da Home/OTC) ─────────────────────────
  if (loading) {
    return (
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] items-start' aria-busy='true'>
        <div className={`${CARD} p-6 space-y-4`}>
          <div className='h-12 w-12 rounded-full bg-gray-100 dark:bg-white/5 animate-pulse' />
          <div className='h-6 w-64 rounded bg-gray-100 dark:bg-white/5 animate-pulse' />
          <div className='h-4 w-80 max-w-full rounded bg-gray-100 dark:bg-white/5 animate-pulse' />
          <div className='h-48 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse' />
        </div>
        <div className={`${CARD} p-6 space-y-3`}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className='h-4 rounded bg-gray-100 dark:bg-white/5 animate-pulse' />
          ))}
        </div>
      </div>
    )
  }

  if (!trade) {
    return (
      <div className={`${CARD} p-8 text-center max-w-lg`}>
        <AlertCircle className='w-10 h-10 mx-auto text-red-500 dark:text-[#FF7A7A]' aria-hidden='true' />
        <p className={`mt-3 ${SOFT}`}>Não encontramos essa ordem.</p>
        <button type='button' onClick={onBack} className={`${BTN_PRIMARY} mt-5 px-6`}>
          Voltar
        </button>
      </div>
    )
  }

  const paymentMethod = trade.payment_method?.toLowerCase() || ''
  const paymentConfig = PAYMENT_METHOD_LABELS[paymentMethod] ?? {
    label: trade.payment_method || '—',
    icon: <CreditCard className='w-4 h-4' />,
  }
  const isPending = trade.status === 'PENDING'
  const isBuy = trade.operation === 'buy'
  const isSell = trade.operation === 'sell'
  const isFinal = FINAL_STATUSES.includes(trade.status)
  const failed = trade.status === 'CANCELLED' || trade.status === 'EXPIRED' || trade.status === 'FAILED'
  const showBankDetails = isPending && bankDetails && ['ted', 'pix'].includes(paymentMethod) && isBuy
  const payAmount = trade.brl_total_amount ?? trade.total_amount
  const qty = `${(trade.crypto_amount ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 8 })} ${trade.symbol}`

  const hero = heroFor(trade.status, isBuy, qty)
  const stepLabels = isBuy
    ? ['Ordem criada', 'Pagamento', 'Envio da cripto', 'Concluída']
    : ['Ordem criada', 'Análise OTC', 'Retirada da cripto', 'Pix enviado']
  const current = progressIndex(trade.status, isBuy)

  const CopyBtn = ({ value, field, label }: { value: string; field: string; label: string }) => (
    <button
      type='button'
      onClick={() => copyToClipboard(value, field)}
      aria-label={`Copiar ${label}`}
      className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${MUTED} hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-[#172033] dark:hover:text-white`}
    >
      {copiedField === field ? (
        <CheckCircle className='w-4 h-4 text-emerald-600 dark:text-[#34C77B]' aria-hidden='true' />
      ) : (
        <Copy className='w-4 h-4' aria-hidden='true' />
      )}
    </button>
  )

  const Field = ({ label, value, field, mono }: { label: string; value: string; field?: string; mono?: boolean }) => (
    <div className='flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-[#1A2232] last:border-0'>
      <div className='min-w-0'>
        <p className={`text-xs ${MUTED}`}>{label}</p>
        <p className={`text-sm font-semibold truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      {field && <CopyBtn value={value} field={field} label={label} />}
    </div>
  )

  const Row = ({ k, v, strong }: { k: React.ReactNode; v: React.ReactNode; strong?: boolean }) => (
    <div className='flex justify-between gap-4'>
      <dt className={strong ? 'font-semibold' : MUTED}>{k}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-semibold' : 'font-medium'}`}>{v}</dd>
    </div>
  )

  return (
    <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] items-start text-gray-900 dark:text-[#EEF1F7]'>
      <div className='flex flex-col gap-6 min-w-0'>
        {/* Status atual */}
        <section aria-live='polite' className={`${CARD} p-5 sm:p-7`}>
          <div className='flex items-start gap-4'>
            <span className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${TONES[hero.tone]}`}>
              {hero.tone === 'ok' ? (
                <CheckCircle className='w-6 h-6' aria-hidden='true' />
              ) : hero.tone === 'bad' ? (
                <XCircle className='w-6 h-6' aria-hidden='true' />
              ) : (
                <Clock className='w-6 h-6' aria-hidden='true' />
              )}
            </span>
            <div className='flex-1 min-w-0'>
              <h2 className='text-xl font-semibold'>{hero.title}</h2>
              <p className={`mt-1 ${SOFT}`}>{hero.body}</p>
              <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${MUTED}`}>
                {isPending && isBuy && timeRemaining && (
                  <span className='inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300 tabular-nums'>
                    <Timer className='w-4 h-4' aria-hidden='true' />
                    {timeRemaining === 'Expirado' ? 'Prazo de pagamento encerrado' : `Pague em até ${timeRemaining}`}
                  </span>
                )}
                {!isFinal && (
                  <span className='inline-flex items-center gap-1.5'>
                    <span className='w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#34C77B] animate-pulse' aria-hidden='true' />
                    Atualizando automaticamente
                  </span>
                )}
              </div>
            </div>
          </div>

          {!failed && (
            <ol className='mt-6 grid grid-cols-4 gap-2' aria-label='Andamento da ordem'>
              {stepLabels.map((label, i) => {
                const done = i < current || trade.status === 'COMPLETED'
                const active = i === current && trade.status !== 'COMPLETED'
                return (
                  <li key={label} className='flex flex-col gap-2' aria-current={active ? 'step' : undefined}>
                    <span
                      className={`h-1.5 rounded-full ${
                        done ? 'bg-blue-600 dark:bg-[#5B8CFF]' : active ? 'bg-blue-600/40 dark:bg-[#5B8CFF]/40 animate-pulse' : 'bg-gray-100 dark:bg-[#1E2738]'
                      }`}
                    />
                    <span className={`text-xs leading-tight ${done || active ? 'font-medium text-gray-900 dark:text-[#EEF1F7]' : MUTED}`}>{label}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* Como pagar (compra pendente) */}
        {showBankDetails && bankDetails && (
          <section aria-labelledby='how-to-pay' className={`${CARD} p-5 sm:p-7`}>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h3 id='how-to-pay' className='text-lg font-semibold'>
                Como pagar
              </h3>
              {pixQrCode && (
                <div role='tablist' aria-label='Forma de pagamento' className='grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#0D121C] dark:border dark:border-[#1E2738]'>
                  {[
                    { id: true, label: 'Pix', icon: Smartphone },
                    { id: false, label: 'TED', icon: Building2 },
                  ].map(o => (
                    <button
                      key={o.label}
                      type='button'
                      role='tab'
                      aria-selected={showPixQr === o.id}
                      onClick={() => setShowPixQr(o.id)}
                      className={`h-9 px-4 rounded-lg text-sm inline-flex items-center justify-center gap-1.5 ${
                        showPixQr === o.id
                          ? 'bg-white shadow-sm font-semibold dark:bg-[#172033] dark:shadow-none'
                          : `font-medium ${MUTED} hover:text-gray-900 dark:hover:text-[#EEF1F7]`
                      }`}
                    >
                      <o.icon className='w-4 h-4' aria-hidden='true' />
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className={`mt-4 text-sm ${SOFT}`}>Valor exato a pagar</p>
            <div className='flex items-center gap-2'>
              <p className='font-["Space_Grotesk",Inter,sans-serif] text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums'>
                {formatBRL(payAmount)}
              </p>
              <CopyBtn value={payAmount.toFixed(2)} field='amount' label='valor' />
            </div>

            {showPixQr && pixQrCode ? (
              <div className='mt-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start'>
                <div className='bg-white p-3 rounded-2xl border border-gray-200 dark:border-transparent shrink-0'>
                  <img src={pixQrCode} alt='QR Code do Pix' className='w-52 h-52' />
                </div>
                <div className='flex-1 min-w-0 w-full space-y-4'>
                  <p className={`text-sm ${SOFT}`}>Escaneie o QR Code no app do seu banco ou use o Pix copia e cola.</p>
                  {pixPayload && (
                    <button
                      type='button'
                      onClick={() => copyToClipboard(pixPayload, 'pixPayload')}
                      className={`${BTN_PRIMARY} w-full`}
                    >
                      {copiedField === 'pixPayload' ? <CheckCircle className='w-4 h-4' aria-hidden='true' /> : <Copy className='w-4 h-4' aria-hidden='true' />}
                      {copiedField === 'pixPayload' ? 'Código copiado' : 'Copiar Pix copia e cola'}
                    </button>
                  )}
                  {!trade.pix_qrcode && trade.reference_code && (
                    <div className='rounded-xl bg-amber-50 dark:bg-amber-400/5 border border-amber-200 dark:border-amber-400/20 p-3 flex items-center justify-between gap-3'>
                      <p className='text-sm'>
                        Escreva na descrição do Pix: <strong className='font-mono'>{trade.reference_code}</strong>
                      </p>
                      <CopyBtn value={trade.reference_code} field='reference' label='código' />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className='mt-6'>
                <div className='rounded-xl border border-gray-200 dark:border-[#222B3D] px-4'>
                  {bankDetails.pix_key && paymentMethod === 'pix' && <Field label='Chave Pix (CNPJ)' value={bankDetails.pix_key} field='pix' mono />}
                  <Field label='Banco' value={`${bankDetails.bank_code} · ${bankDetails.bank_name}`} field='bank' />
                  <Field label='Agência' value={bankDetails.agency} field='agency' mono />
                  <Field label={`Conta (${bankDetails.account_type})`} value={bankDetails.account} field='account' mono />
                  <Field label='Titular' value={bankDetails.holder_name} field='holder' />
                  <Field label='CNPJ' value={bankDetails.holder_document} field='doc' mono />
                </div>
                {trade.reference_code && (
                  <div className='mt-4 rounded-xl bg-amber-50 dark:bg-amber-400/5 border border-amber-200 dark:border-amber-400/20 p-3 flex items-center justify-between gap-3'>
                    <p className='text-sm'>
                      Informe o código na descrição: <strong className='font-mono'>{trade.reference_code}</strong>
                    </p>
                    <CopyBtn value={trade.reference_code} field='reference' label='código' />
                  </div>
                )}
              </div>
            )}
            <p className={`mt-5 text-xs ${MUTED}`}>Pague com uma conta no seu nome. Pagamentos de terceiros são devolvidos.</p>
          </section>
        )}

        {/* Venda: para onde vai o dinheiro */}
        {isSell && trade.receiving_method && !failed && (
          <section className={`${CARD} p-5 sm:p-7`}>
            <h3 className='text-lg font-semibold'>Você recebe em</h3>
            <dl className='mt-4 space-y-2.5 text-sm'>
              <Row
                k='Forma'
                v={trade.receiving_method.method_type === 'pix' ? 'Pix' : trade.receiving_method.method_type === 'ted' ? 'TED' : trade.receiving_method.method_type}
              />
              {trade.receiving_method.holder_name && <Row k='Titular' v={trade.receiving_method.holder_name} />}
              {trade.receiving_method.pix_key && (
                <Row k={`Chave Pix (${trade.receiving_method.pix_key_type?.toUpperCase() || 'CPF'})`} v={trade.receiving_method.pix_key} />
              )}
              {trade.receiving_method.bank_name && <Row k='Banco' v={trade.receiving_method.bank_name} />}
              {trade.receiving_method.branch_number && <Row k='Agência' v={trade.receiving_method.branch_number} />}
              {trade.receiving_method.account_number && (
                <Row
                  k='Conta'
                  v={`${trade.receiving_method.account_number}${trade.receiving_method.account_type ? ` (${trade.receiving_method.account_type})` : ''}`}
                />
              )}
              <div className='pt-3 mt-1 border-t border-gray-100 dark:border-[#1E2738]'>
                <Row k='Valor a receber' v={formatBRL(payAmount)} strong />
              </div>
            </dl>
          </section>
        )}

        {/* Blockchain */}
        {trade.tx_hash && (
          <section className={`${CARD} p-5 sm:p-7`}>
            <h3 className='text-lg font-semibold'>Transação na blockchain</h3>
            <div className='mt-3 rounded-xl border border-gray-200 dark:border-[#222B3D] px-4'>
              {trade.network && <Field label='Rede' value={trade.network} />}
              {trade.wallet_address && <Field label='Endereço' value={trade.wallet_address} field='wallet' mono />}
              <Field label='Hash da transação' value={trade.tx_hash} field='txHash' mono />
            </div>
          </section>
        )}
      </div>

      {/* Resumo */}
      <aside className={`${CARD} p-5 sm:p-6 lg:sticky lg:top-4`}>
        <div className='flex items-center gap-3'>
          <span className='relative shrink-0'>
            <CryptoIcon symbol={trade.symbol} size={44} className='rounded-full' />
            <span
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#111724] ${
                isBuy ? 'bg-emerald-600 text-white dark:bg-[#34C77B] dark:text-[#0A0E15]' : 'bg-gray-700 text-white dark:bg-[#2A3449]'
              }`}
            >
              {isBuy ? <ArrowDownLeft className='w-3 h-3' aria-hidden='true' /> : <ArrowUpRight className='w-3 h-3' aria-hidden='true' />}
            </span>
          </span>
          <div className='min-w-0'>
            <p className={`text-sm ${SOFT}`}>{isBuy ? 'Compra de' : 'Venda de'}</p>
            <p className='text-lg font-semibold tabular-nums truncate'>{qty}</p>
          </div>
        </div>

        <dl className='mt-5 pt-5 border-t border-gray-100 dark:border-[#1E2738] space-y-2.5 text-sm'>
          {isSell ? (
            <>
              <Row k='Valor de mercado' v={formatOtcValue(trade.fiat_amount)} />
              <Row k='Você recebe' v={formatOtcValue(trade.brl_total_amount ?? trade.total_amount)} strong />
            </>
          ) : (
            <Row k='Total pago' v={formatOtcValue(trade.total_amount)} strong />
          )}
          {trade.crypto_price ? <Row k={`Preço por ${trade.symbol}`} v={formatOtcValue(trade.crypto_price)} /> : null}
          <Row k={`Spread (${trade.spread_percentage}%)`} v={trade.spread_amount ? formatOtcValue(trade.spread_amount) : '—'} />
          <Row k={`Taxa de rede (${trade.network_fee_percentage}%)`} v={trade.network_fee_amount ? formatOtcValue(trade.network_fee_amount) : '—'} />
          <Row
            k={isBuy ? 'Pagamento' : 'Recebimento'}
            v={
              <span className='inline-flex items-center gap-1.5'>
                {React.cloneElement(paymentConfig.icon as React.ReactElement, { className: 'w-4 h-4', 'aria-hidden': true })}
                {paymentConfig.label}
              </span>
            }
          />
        </dl>

        <ol className='mt-5 pt-5 border-t border-gray-100 dark:border-[#1E2738] space-y-3 text-sm' aria-label='Histórico da ordem'>
          <TimelineItem label='Ordem criada' date={trade.created_at} completed formatDate={formatDate} />
          {trade.payment_confirmed_at && (
            <TimelineItem label={isBuy ? 'Pagamento confirmado' : 'Análise aprovada'} date={trade.payment_confirmed_at} completed formatDate={formatDate} />
          )}
          {trade.completed_at && <TimelineItem label='Ordem concluída' date={trade.completed_at} completed formatDate={formatDate} />}
          {!isFinal && <TimelineItem label={stepLabels[Math.min(current, 3)] ?? ''} pending formatDate={formatDate} />}
        </ol>

        <div className='mt-5 pt-4 border-t border-gray-100 dark:border-[#1E2738]'>
          {trade.reference_code && <Field label='Código da ordem' value={trade.reference_code} field='ref2' mono />}
          <Field label='ID' value={trade.id} field='id' mono />
        </div>

        <button type='button' onClick={onBack} className={`${BTN_SECONDARY} w-full mt-4`}>
          <ArrowLeft className='w-4 h-4' aria-hidden='true' />
          {isFinal ? 'Nova ordem' : 'Voltar para comprar e vender'}
        </button>
      </aside>
    </div>
  )
}

// ============================================================================
// AUXILIARES DE APRESENTAÇÃO
// ============================================================================

const CARD = 'bg-white border border-gray-200 dark:bg-[#111724] dark:border-[#1E2738] rounded-2xl'
const MUTED = 'text-gray-500 dark:text-[#8590A6]'
const SOFT = 'text-gray-600 dark:text-[#A3ADC2]'
const BTN_PRIMARY =
  'h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#5B8CFF] dark:text-[#0A0E15] dark:hover:bg-[#7AA2FF] font-semibold inline-flex items-center justify-center gap-2 transition-colors'
const BTN_SECONDARY =
  'h-12 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-[#2A3449] dark:text-[#EEF1F7] dark:hover:bg-[#172033] font-medium inline-flex items-center justify-center gap-2 transition-colors'
const TONES = {
  wait: 'bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300',
  info: 'bg-blue-50 text-blue-600 dark:bg-[#5B8CFF]/10 dark:text-[#8FB0FF]',
  ok: 'bg-emerald-50 text-emerald-600 dark:bg-[#34C77B]/10 dark:text-[#34C77B]',
  bad: 'bg-red-50 text-red-600 dark:bg-[#FF7A7A]/10 dark:text-[#FF7A7A]',
} as const

function heroFor(status: string, isBuy: boolean, qty: string): { title: string; body: string; tone: keyof typeof TONES } {
  if (status === 'CANCELLED') return { title: 'Ordem cancelada', body: 'Nenhum valor foi movimentado.', tone: 'bad' }
  if (status === 'EXPIRED')
    return { title: 'Ordem expirada', body: 'O prazo de pagamento acabou. Faça uma nova cotação para continuar.', tone: 'bad' }
  if (status === 'FAILED') return { title: 'Falha na ordem', body: 'Fale com o suporte e informe o código da ordem.', tone: 'bad' }
  if (status === 'COMPLETED')
    return isBuy
      ? { title: 'Ordem concluída', body: `${qty} foram creditados na sua carteira.`, tone: 'ok' }
      : { title: 'Venda concluída', body: 'O valor foi enviado para a sua conta.', tone: 'ok' }
  if (isBuy) {
    if (status === 'PENDING')
      return { title: 'Aguardando o seu pagamento', body: 'Assim que o pagamento cair, enviamos a cripto para a sua carteira.', tone: 'wait' }
    if (status === 'PAYMENT_PROCESSING') return { title: 'Confirmando o pagamento', body: 'Estamos conferindo o seu pagamento.', tone: 'info' }
    return { title: 'Pagamento confirmado', body: `Estamos enviando ${qty} para a sua carteira.`, tone: 'info' }
  }
  if (status === 'PENDING') return { title: 'Venda registrada', body: 'A equipe OTC está analisando a sua ordem.', tone: 'wait' }
  if (status === 'PAYMENT_PROCESSING') return { title: 'Retirando a cripto', body: 'O operador está retirando a cripto da sua carteira.', tone: 'info' }
  return { title: 'Cripto recebida', body: 'O Pix para a sua conta será enviado em breve.', tone: 'info' }
}

/** Índice da etapa atual na barra de progresso (0–3). */
function progressIndex(status: string, isBuy: boolean): number {
  if (status === 'COMPLETED') return 3
  if (status === 'PENDING') return 1
  if (isBuy) return 2
  if (status === 'PAYMENT_PROCESSING') return 2
  if (status === 'CRYPTO_RECEIVED') return 3
  return 1
}

const FINAL_STATUSES: string[] = ['COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED']

interface TimelineItemProps {
  readonly label: string
  readonly date?: string
  readonly completed?: boolean
  readonly pending?: boolean
  readonly formatDate: (date: string) => string
}

function TimelineItem({ label, date, completed, pending, formatDate }: TimelineItemProps) {
  return (
    <li className='flex items-start gap-3'>
      <span
        aria-hidden='true'
        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
          completed ? 'bg-blue-600 dark:bg-[#5B8CFF]' : pending ? 'bg-amber-500 animate-pulse' : 'bg-gray-300 dark:bg-[#2A3449]'
        }`}
      />
      <span className='flex-1 flex items-baseline justify-between gap-3'>
        <span className={completed || pending ? 'font-medium' : 'text-gray-500 dark:text-[#8590A6]'}>{label}</span>
        {date && <span className='text-xs text-gray-500 dark:text-[#8590A6] tabular-nums'>{formatDate(date)}</span>}
      </span>
    </li>
  )
}

export default TradeDetailsPage
