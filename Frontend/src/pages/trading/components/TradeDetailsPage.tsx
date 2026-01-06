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
  FileText,
  Smartphone,
} from 'lucide-react'
import { apiClient } from '@/services/api'
import { generateHoldPixQRCode, generateHoldPixPayload } from '@/utils/pixQrCode'
import toast from 'react-hot-toast'

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
  status: 'PENDING' | 'PAYMENT_CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'
  created_at: string
  updated_at?: string
  expires_at?: string
  payment_confirmed_at?: string
  completed_at?: string
  wallet_address?: string
  tx_hash?: string
  network?: string
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

const STATUS_CONFIG: Record<
  string,
  {
    label: string
    color: string
    bgColor: string
    icon: React.ReactNode
  }
> = {
  PENDING: {
    label: 'Aguardando Pagamento',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className='w-5 h-5' />,
  },
  PAYMENT_CONFIRMED: {
    label: 'Pagamento Confirmado',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <CheckCircle className='w-5 h-5' />,
  },
  COMPLETED: {
    label: 'Concluído',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className='w-5 h-5' />,
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    icon: <XCircle className='w-5 h-5' />,
  },
  EXPIRED: {
    label: 'Expirado',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className='w-5 h-5' />,
  },
  FAILED: {
    label: 'Falha',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <XCircle className='w-5 h-5' />,
  },
}

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  pix: { label: 'PIX', icon: <QrCode className='w-4 h-4' /> },
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
  }, [trade?.id, trade?.status, trade?.brl_total_amount, trade?.total_amount])

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

  // Formata valor em USD (valores do backend)
  const formatUSD = (value: number) => {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    })
  }

  // Formata valor em BRL (para depósito TED/PIX)
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

  if (loading) {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden'>
        {/* Header - estrutura real, conteúdo shimmer */}
        <div className='bg-gradient-to-r from-blue-600 to-purple-600 p-4'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 bg-white/20 rounded-lg' />
            <div className='flex-1'>
              <div className='h-4 bg-white/20 rounded w-32 mb-2 overflow-hidden relative'>
                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer' />
              </div>
              <div className='h-3 bg-white/20 rounded w-24 overflow-hidden relative'>
                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer' />
              </div>
            </div>
            <div className='h-6 bg-white/20 rounded-full w-20 overflow-hidden relative'>
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer' />
            </div>
          </div>
        </div>

        {/* Content - estrutura real com shimmer interno */}
        <div className='p-4 space-y-4'>
          {/* Resumo da Operação */}
          <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative'>
                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
              </div>
              <div>
                <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1 overflow-hidden relative'>
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
                </div>
                <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded w-28 overflow-hidden relative'>
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
                </div>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700'>
              <div>
                <div className='h-2 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-1 overflow-hidden relative'>
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
                </div>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 overflow-hidden relative'>
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
                </div>
              </div>
              <div>
                <div className='h-2 bg-gray-200 dark:bg-gray-700 rounded w-14 mb-1 overflow-hidden relative'>
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
                </div>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 overflow-hidden relative'>
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
                </div>
              </div>
            </div>
          </div>

          {/* Método de Pagamento skeleton */}
          <div className='flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5'>
            <div className='p-1.5 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative'>
              <div className='w-4 h-4' />
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
            </div>
            <div className='flex-1'>
              <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1 overflow-hidden relative'>
                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
              </div>
              <div className='h-2 bg-gray-200 dark:bg-gray-700 rounded w-28 overflow-hidden relative'>
                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
              </div>
            </div>
          </div>

          {/* Dados Bancários skeleton */}
          <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3'>
            <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-3 overflow-hidden relative'>
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className='bg-white dark:bg-gray-800 rounded p-2'>
                  <div className='h-2 bg-gray-200 dark:bg-gray-700 rounded w-10 mb-1 overflow-hidden relative'>
                    <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
                  </div>
                  <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 overflow-hidden relative'>
                    <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent animate-shimmer' />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!trade) {
    return (
      <div className='p-6 text-center'>
        <AlertCircle className='w-12 h-12 mx-auto text-red-500 mb-4' />
        <p className='text-gray-600 dark:text-gray-400'>Trade não encontrada</p>
        <button
          onClick={onBack}
          className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
        >
          Voltar
        </button>
      </div>
    )
  }

  // Default values for status config
  const defaultStatusConfig = {
    label: 'Aguardando',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className='w-5 h-5' />,
  }

  // Default values for payment config
  const defaultPaymentConfig = {
    label: trade.payment_method || 'Desconhecido',
    icon: <CreditCard className='w-4 h-4' />,
  }

  // Use explicit fallback to avoid undefined
  const statusKey = trade.status as keyof typeof STATUS_CONFIG
  const statusConfig = STATUS_CONFIG[statusKey] ?? defaultStatusConfig

  const paymentMethod = trade.payment_method?.toLowerCase() || ''
  const paymentConfig =
    PAYMENT_METHOD_LABELS[
      paymentMethod as 'pix' | 'ted' | 'credit_card' | 'debit_card' | 'crypto'
    ] ?? defaultPaymentConfig

  const isPending = trade.status === 'PENDING'
  const showBankDetails = isPending && bankDetails && ['ted', 'pix'].includes(paymentMethod)

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden'>
      {/* Header - mais compacto */}
      <div className='bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white'>
        <div className='flex items-center gap-3'>
          <button
            onClick={onBack}
            title='Voltar'
            aria-label='Voltar para lista de trades'
            className='p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>
          <div className='flex-1 min-w-0'>
            <h1 className='text-base font-bold'>Detalhes da Ordem</h1>
            <p className='text-blue-100 text-xs font-mono truncate'>{trade.reference_code}</p>
          </div>
          <div
            className={`px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-1 text-xs`}
          >
            {React.cloneElement(statusConfig.icon as React.ReactElement, {
              className: 'w-3.5 h-3.5',
            })}
            <span className='font-medium hidden sm:inline'>{statusConfig.label}</span>
          </div>
        </div>

        {/* Timer para trades pendentes */}
        {isPending && timeRemaining && (
          <div className='flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5 mt-2 text-xs'>
            <Timer className='w-4 h-4' />
            <span>
              Expira em: <strong>{timeRemaining}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Content - espaçamentos reduzidos */}
      <div className='p-4 space-y-4'>
        {/* Resumo da Operação */}
        <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3'>
          <div className='flex items-center gap-3 mb-2'>
            {/* Logo da crypto com indicador de operação */}
            <div className='relative flex-shrink-0'>
              {CRYPTO_LOGOS[trade.symbol] ? (
                <img
                  src={CRYPTO_LOGOS[trade.symbol]}
                  alt={trade.symbol}
                  className='w-12 h-12 rounded-full'
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className='w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center'>
                  <span className='text-sm font-bold text-gray-600 dark:text-gray-400'>
                    {trade.symbol.slice(0, 2)}
                  </span>
                </div>
              )}
              {/* Indicador de operação */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 p-1 rounded-full ${
                  trade.operation === 'buy' ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {trade.operation === 'buy' ? (
                  <ArrowDownLeft className='w-3 h-3 text-white' />
                ) : (
                  <ArrowUpRight className='w-3 h-3 text-white' />
                )}
              </div>
            </div>

            <div>
              <p className='text-xs text-gray-600 dark:text-gray-400'>
                {trade.operation === 'buy' ? 'Compra de' : 'Venda de'}
              </p>
              <p className='text-lg font-bold text-gray-900 dark:text-white'>
                {formatCrypto(trade.crypto_amount)} {trade.symbol}
              </p>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700'>
            <div>
              <p className='text-[10px] text-gray-500 dark:text-gray-400'>Valor USD</p>
              <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                {formatUSD(trade.fiat_amount)}
              </p>
            </div>
            <div>
              <p className='text-[10px] text-gray-500 dark:text-gray-400'>Total c/ Taxas</p>
              <p className='text-sm font-semibold text-blue-600 dark:text-blue-400'>
                {formatUSD(trade.total_amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Detalhes Financeiros - Colapsável em mobile */}
        <details className='group'>
          <summary className='text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer list-none'>
            <FileText className='w-3.5 h-3.5' />
            Detalhes Financeiros
            <span className='ml-auto text-gray-400 group-open:rotate-180 transition-transform'>
              ▼
            </span>
          </summary>
          <div className='mt-2 bg-gray-50 dark:bg-gray-900 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 text-xs'>
            {trade.crypto_price && (
              <div className='flex justify-between py-2 px-3'>
                <span className='text-gray-600 dark:text-gray-400'>Preço Unit.</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {formatUSD(trade.crypto_price)}
                </span>
              </div>
            )}
            <div className='flex justify-between py-2 px-3'>
              <span className='text-gray-600 dark:text-gray-400'>
                Spread ({trade.spread_percentage}%)
              </span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {trade.spread_amount ? formatUSD(trade.spread_amount) : '-'}
              </span>
            </div>
            <div className='flex justify-between py-2 px-3'>
              <span className='text-gray-600 dark:text-gray-400'>
                Taxa Rede ({trade.network_fee_percentage}%)
              </span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {trade.network_fee_amount ? formatUSD(trade.network_fee_amount) : '-'}
              </span>
            </div>
          </div>
        </details>

        {/* Método de Pagamento - Compacto */}
        <div className='flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5'>
          <div className='p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded'>
            {React.cloneElement(paymentConfig.icon as React.ReactElement, {
              className: 'w-3.5 h-3.5',
            })}
          </div>
          <div className='flex-1'>
            <p className='text-xs font-medium text-gray-900 dark:text-white'>
              {paymentConfig.label}
            </p>
            {isPending && (
              <p className='text-[10px] text-yellow-600 dark:text-yellow-400'>
                Aguardando pagamento
              </p>
            )}
          </div>
        </div>

        {/* Dados Bancários (para TED/PIX pendente) */}
        {showBankDetails && (
          <div className='space-y-2'>
            <h3 className='text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5'>
              <Building2 className='w-3.5 h-3.5' />
              Dados para Pagamento
            </h3>

            {/* Toggle PIX QR / TED */}
            {pixQrCode && (
              <div className='flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 text-xs'>
                <button
                  onClick={() => setShowPixQr(true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
                    showPixQr
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Smartphone className='w-3.5 h-3.5' />
                  PIX QR Code
                </button>
                <button
                  onClick={() => setShowPixQr(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-colors ${
                    showPixQr
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  }`}
                >
                  <Building2 className='w-3.5 h-3.5' />
                  TED
                </button>
              </div>
            )}

            {/* PIX QR Code Section - Compacto */}
            {showPixQr && pixQrCode && (
              <div className='bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800'>
                <div className='flex flex-col sm:flex-row items-center gap-3'>
                  {/* QR Code */}
                  <div className='p-2 bg-white rounded-lg shadow'>
                    <img src={pixQrCode} alt='PIX QR Code' className='w-32 h-32 sm:w-28 sm:h-28' />
                  </div>

                  {/* Info lado direito */}
                  <div className='flex-1 text-center sm:text-left'>
                    {/* Valor */}
                    <div className='mb-2'>
                      <p className='text-[10px] text-green-700 dark:text-green-400'>Valor</p>
                      <p className='text-xl font-bold text-green-800 dark:text-green-300'>
                        {trade?.brl_total_amount
                          ? formatBRL(trade.brl_total_amount)
                          : formatUSD(trade?.total_amount ?? 0)}
                      </p>
                    </div>

                    {/* PIX Copia e Cola */}
                    {pixPayload && (
                      <button
                        onClick={() => copyToClipboard(pixPayload, 'pixPayload')}
                        className='w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors'
                      >
                        {copiedField === 'pixPayload' ? (
                          <>
                            <CheckCircle className='w-4 h-4' />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className='w-4 h-4' />
                            Copia e Cola
                          </>
                        )}
                      </button>
                    )}

                    {/* Chave PIX */}
                    <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-2'>
                      CNPJ: <span className='font-mono'>24.275.355/0001-51</span>
                    </p>
                  </div>
                </div>

                {/* Aviso com código de referência */}
                <div className='mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800'>
                  <p className='text-[10px] text-yellow-700 dark:text-yellow-400'>
                    <strong>Use na descrição:</strong>{' '}
                    <button
                      onClick={() => copyToClipboard(trade?.reference_code ?? '', 'reference')}
                      className='inline-flex items-center gap-0.5 px-1 py-0.5 bg-yellow-100 dark:bg-yellow-800/50 rounded font-mono font-bold text-[11px] hover:bg-yellow-200 transition-colors'
                    >
                      {trade?.reference_code}
                      {copiedField === 'reference' ? (
                        <CheckCircle className='w-3 h-3 text-green-600' />
                      ) : (
                        <Copy className='w-3 h-3' />
                      )}
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Bank Details Section (TED) - Compacto */}
            {(!pixQrCode || !showPixQr) && (
              <div className='bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800'>
                {/* PIX Key */}
                {bankDetails.pix_key && trade.payment_method?.toLowerCase() === 'pix' && (
                  <div className='mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-between'>
                    <div>
                      <p className='text-[10px] text-gray-500 dark:text-gray-400'>Chave PIX</p>
                      <span className='font-mono text-sm font-semibold text-gray-900 dark:text-white'>
                        {bankDetails.pix_key}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(bankDetails.pix_key!, 'pix')}
                      className='p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors'
                    >
                      {copiedField === 'pix' ? (
                        <CheckCircle className='w-4 h-4 text-green-600' />
                      ) : (
                        <Copy className='w-4 h-4' />
                      )}
                    </button>
                  </div>
                )}

                {/* Bank Details Grid - 3 colunas em telas maiores */}
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs'>
                  <BankDetailItemCompact
                    label='Banco'
                    value={`${bankDetails.bank_code}`}
                    subValue={bankDetails.bank_name}
                    onCopy={() => copyToClipboard(bankDetails.bank_code, 'bank')}
                    copied={copiedField === 'bank'}
                  />
                  <BankDetailItemCompact
                    label='Agência'
                    value={bankDetails.agency}
                    onCopy={() => copyToClipboard(bankDetails.agency, 'agency')}
                    copied={copiedField === 'agency'}
                  />
                  <BankDetailItemCompact
                    label='Conta'
                    value={bankDetails.account}
                    subValue={bankDetails.account_type}
                    onCopy={() => copyToClipboard(bankDetails.account, 'account')}
                    copied={copiedField === 'account'}
                  />
                  <div className='col-span-2 sm:col-span-3'>
                    <BankDetailItemCompact
                      label='Titular'
                      value={bankDetails.holder_name}
                      subValue={`CNPJ: ${bankDetails.holder_document}`}
                      onCopy={() => copyToClipboard(bankDetails.holder_name, 'holder')}
                      copied={copiedField === 'holder'}
                    />
                  </div>
                </div>

                {/* Valor a transferir */}
                <div className='mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 flex items-center justify-between'>
                  <div>
                    <p className='text-[10px] text-yellow-700 dark:text-yellow-400'>Valor BRL</p>
                    <span className='text-lg font-bold text-yellow-800 dark:text-yellow-300'>
                      {trade.brl_total_amount
                        ? formatBRL(trade.brl_total_amount)
                        : `${formatUSD(trade.total_amount)} (USD)`}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        (trade.brl_total_amount ?? trade.total_amount).toFixed(2),
                        'amount'
                      )
                    }
                    className='p-1.5 text-yellow-700 hover:bg-yellow-100 rounded transition-colors'
                  >
                    {copiedField === 'amount' ? (
                      <CheckCircle className='w-4 h-4 text-green-600' />
                    ) : (
                      <Copy className='w-4 h-4' />
                    )}
                  </button>
                </div>

                {/* Aviso importante */}
                <div className='mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800'>
                  <p className='text-[10px] text-red-700 dark:text-red-400'>
                    <strong>Código:</strong>{' '}
                    <button
                      onClick={() => copyToClipboard(trade.reference_code, 'reference')}
                      className='inline-flex items-center gap-0.5 px-1 py-0.5 bg-red-100 dark:bg-red-800/50 rounded font-mono font-bold hover:bg-red-200 transition-colors'
                    >
                      {trade.reference_code}
                      {copiedField === 'reference' ? (
                        <CheckCircle className='w-3 h-3 text-green-600' />
                      ) : (
                        <Copy className='w-3 h-3' />
                      )}
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timeline - Compacto */}
        <details className='group' open>
          <summary className='text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer list-none'>
            <Clock className='w-3.5 h-3.5' />
            Timeline
            <span className='ml-auto text-gray-400 group-open:rotate-180 transition-transform'>
              ▼
            </span>
          </summary>
          <div className='mt-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2'>
            <TimelineItem
              label='Ordem Criada'
              date={trade.created_at}
              completed
              formatDate={formatDate}
            />
            {trade.payment_confirmed_at && (
              <TimelineItem
                label='Pagamento Confirmado'
                date={trade.payment_confirmed_at}
                completed
                formatDate={formatDate}
              />
            )}
            {trade.completed_at && (
              <TimelineItem
                label='Ordem Concluída'
                date={trade.completed_at}
                completed
                formatDate={formatDate}
              />
            )}
            {trade.status === 'PENDING' && (
              <TimelineItem label='Aguardando Pagamento' pending formatDate={formatDate} />
            )}
          </div>
        </details>

        {/* Informações de Blockchain (se concluído) - Compacto */}
        {trade.status === 'COMPLETED' && trade.tx_hash && (
          <details className='group'>
            <summary className='text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer list-none'>
              <Wallet className='w-3.5 h-3.5' />
              Blockchain
              <span className='ml-auto text-gray-400 group-open:rotate-180 transition-transform'>
                ▼
              </span>
            </summary>
            <div className='mt-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 text-xs'>
              {trade.wallet_address && (
                <div>
                  <p className='text-[10px] text-gray-500 dark:text-gray-400'>Endereço</p>
                  <p className='font-mono text-gray-900 dark:text-white break-all'>
                    {trade.wallet_address}
                  </p>
                </div>
              )}
              {trade.network && (
                <div>
                  <p className='text-[10px] text-gray-500 dark:text-gray-400'>Rede</p>
                  <p className='text-gray-900 dark:text-white capitalize'>{trade.network}</p>
                </div>
              )}
              <div>
                <p className='text-[10px] text-gray-500 dark:text-gray-400'>TX Hash</p>
                <p className='font-mono text-blue-600 dark:text-blue-400 break-all'>
                  {trade.tx_hash}
                </p>
              </div>
            </div>
          </details>
        )}

        {/* ID da Trade - Compacto */}
        <div className='pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between'>
          <div className='min-w-0 flex-1'>
            <p className='text-[10px] text-gray-500 dark:text-gray-400'>ID</p>
            <code className='text-[10px] font-mono text-gray-600 dark:text-gray-400 truncate block'>
              {trade.id}
            </code>
          </div>
          <button
            onClick={() => copyToClipboard(trade.id, 'id')}
            className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          >
            {copiedField === 'id' ? (
              <CheckCircle className='w-3.5 h-3.5 text-green-600' />
            ) : (
              <Copy className='w-3.5 h-3.5' />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

interface BankDetailItemProps {
  readonly label: string
  readonly value: string
  readonly onCopy: () => void
  readonly copied: boolean
}

function BankDetailItem({ label, value, onCopy, copied }: BankDetailItemProps) {
  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg p-3'>
      <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>{label}</p>
      <div className='flex items-center justify-between'>
        <span className='font-medium text-gray-900 dark:text-white text-sm'>{value}</span>
        <button
          onClick={onCopy}
          className='p-1 text-gray-500 hover:text-blue-600 transition-colors'
        >
          {copied ? (
            <CheckCircle className='w-4 h-4 text-green-600' />
          ) : (
            <Copy className='w-4 h-4' />
          )}
        </button>
      </div>
    </div>
  )
}

interface BankDetailItemCompactProps {
  readonly label: string
  readonly value: string
  readonly subValue?: string
  readonly onCopy: () => void
  readonly copied: boolean
}

function BankDetailItemCompact({
  label,
  value,
  subValue,
  onCopy,
  copied,
}: BankDetailItemCompactProps) {
  return (
    <div className='bg-white dark:bg-gray-800 rounded p-2 flex items-center justify-between'>
      <div className='min-w-0 flex-1'>
        <p className='text-[10px] text-gray-500 dark:text-gray-400'>{label}</p>
        <p className='font-semibold text-gray-900 dark:text-white truncate'>{value}</p>
        {subValue && <p className='text-[10px] text-gray-400 truncate'>{subValue}</p>}
      </div>
      <button
        onClick={onCopy}
        className='p-1 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0'
      >
        {copied ? (
          <CheckCircle className='w-3.5 h-3.5 text-green-600' />
        ) : (
          <Copy className='w-3.5 h-3.5' />
        )}
      </button>
    </div>
  )
}

interface TimelineItemProps {
  readonly label: string
  readonly date?: string
  readonly completed?: boolean
  readonly pending?: boolean
  readonly formatDate: (date: string) => string
}

function TimelineItem({ label, date, completed, pending, formatDate }: TimelineItemProps) {
  const getStatusColor = () => {
    if (completed) return 'bg-green-500'
    if (pending) return 'bg-yellow-500 animate-pulse'
    return 'bg-gray-300 dark:bg-gray-600'
  }

  return (
    <div className='flex items-center gap-2'>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <div className='flex-1 flex items-center justify-between'>
        <p
          className={`text-xs ${
            completed || pending ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'
          }`}
        >
          {label}
        </p>
        {date && <p className='text-[10px] text-gray-500 dark:text-gray-400'>{formatDate(date)}</p>}
      </div>
    </div>
  )
}

export default TradeDetailsPage
