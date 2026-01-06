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
  RefreshCw,
  QrCode,
  Timer,
  FileText,
  Banknote,
} from 'lucide-react'
import { apiClient } from '@/services/api'
import toast from 'react-hot-toast'

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
}: TradeDetailsPageProps) {
  const [trade, setTrade] = useState<TradeDetails | null>(null)
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Buscar detalhes da trade
  useEffect(() => {
    fetchTradeDetails()
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
      <div className='flex items-center justify-center min-h-[400px]'>
        <RefreshCw className='w-8 h-8 animate-spin text-blue-600' />
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
      {/* Header */}
      <div className='bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white'>
        <div className='flex items-center gap-4 mb-4'>
          <button
            onClick={onBack}
            title='Voltar'
            aria-label='Voltar para lista de trades'
            className='p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors'
          >
            <ArrowLeft className='w-5 h-5' />
          </button>
          <div className='flex-1'>
            <h1 className='text-xl font-bold'>Detalhes da Ordem</h1>
            <p className='text-blue-100 text-sm font-mono'>{trade.reference_code}</p>
          </div>
          <div
            className={`px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-2`}
          >
            {statusConfig.icon}
            <span className='text-sm font-medium'>{statusConfig.label}</span>
          </div>
        </div>

        {/* Timer para trades pendentes */}
        {isPending && timeRemaining && (
          <div className='flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 mt-2'>
            <Timer className='w-5 h-5' />
            <span className='text-sm'>
              Expira em: <strong>{timeRemaining}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className='p-6 space-y-6'>
        {/* Resumo da Operação */}
        <div className='bg-gray-50 dark:bg-gray-900 rounded-xl p-5'>
          <div className='flex items-center gap-3 mb-4'>
            {trade.operation === 'buy' ? (
              <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-lg'>
                <ArrowDownLeft className='w-6 h-6 text-green-600 dark:text-green-400' />
              </div>
            ) : (
              <div className='p-2 bg-red-100 dark:bg-red-900/30 rounded-lg'>
                <ArrowUpRight className='w-6 h-6 text-red-600 dark:text-red-400' />
              </div>
            )}
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                {trade.operation === 'buy' ? 'Compra de' : 'Venda de'}
              </p>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                {formatCrypto(trade.crypto_amount)} {trade.symbol}
              </p>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Valor em USD</p>
              <p className='text-lg font-semibold text-gray-900 dark:text-white'>
                {formatUSD(trade.fiat_amount)}
              </p>
            </div>
            <div>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Total com Taxas (USD)</p>
              <p className='text-lg font-semibold text-blue-600 dark:text-blue-400'>
                {formatUSD(trade.total_amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Detalhes Financeiros */}
        <div className='space-y-3'>
          <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
            <FileText className='w-4 h-4' />
            Detalhes Financeiros (USD)
          </h3>
          <div className='bg-gray-50 dark:bg-gray-900 rounded-lg divide-y divide-gray-200 dark:divide-gray-700'>
            {trade.crypto_price && (
              <div className='flex justify-between py-3 px-4'>
                <span className='text-gray-600 dark:text-gray-400'>Preço Unitário</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {formatUSD(trade.crypto_price)}
                </span>
              </div>
            )}
            <div className='flex justify-between py-3 px-4'>
              <span className='text-gray-600 dark:text-gray-400'>
                Spread ({trade.spread_percentage}%)
              </span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {trade.spread_amount ? formatUSD(trade.spread_amount) : '-'}
              </span>
            </div>
            <div className='flex justify-between py-3 px-4'>
              <span className='text-gray-600 dark:text-gray-400'>
                Taxa de Rede ({trade.network_fee_percentage}%)
              </span>
              <span className='font-medium text-gray-900 dark:text-white'>
                {trade.network_fee_amount ? formatUSD(trade.network_fee_amount) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Método de Pagamento */}
        <div className='space-y-3'>
          <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
            <Banknote className='w-4 h-4' />
            Método de Pagamento
          </h3>
          <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center gap-3'>
            <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
              {paymentConfig.icon}
            </div>
            <div>
              <p className='font-medium text-gray-900 dark:text-white'>{paymentConfig.label}</p>
              {isPending && (
                <p className='text-xs text-yellow-600 dark:text-yellow-400'>
                  Aguardando confirmação de pagamento
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dados Bancários (para TED/PIX pendente) */}
        {showBankDetails && (
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
              <Building2 className='w-4 h-4' />
              Dados para Pagamento
            </h3>
            <div className='bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800'>
              {/* PIX Key */}
              {bankDetails.pix_key && trade.payment_method?.toLowerCase() === 'pix' && (
                <div className='mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg'>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Chave PIX</p>
                  <div className='flex items-center justify-between'>
                    <span className='font-mono text-lg font-semibold text-gray-900 dark:text-white'>
                      {bankDetails.pix_key}
                    </span>
                    <button
                      onClick={() => copyToClipboard(bankDetails.pix_key!, 'pix')}
                      className='p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors'
                    >
                      {copiedField === 'pix' ? (
                        <CheckCircle className='w-5 h-5 text-green-600' />
                      ) : (
                        <Copy className='w-5 h-5' />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Bank Details Grid */}
              <div className='grid grid-cols-2 gap-4'>
                <BankDetailItem
                  label='Banco'
                  value={`${bankDetails.bank_name} (${bankDetails.bank_code})`}
                  onCopy={() => copyToClipboard(bankDetails.bank_code, 'bank')}
                  copied={copiedField === 'bank'}
                />
                <BankDetailItem
                  label='Agência'
                  value={bankDetails.agency}
                  onCopy={() => copyToClipboard(bankDetails.agency, 'agency')}
                  copied={copiedField === 'agency'}
                />
                <BankDetailItem
                  label='Conta'
                  value={bankDetails.account}
                  onCopy={() => copyToClipboard(bankDetails.account, 'account')}
                  copied={copiedField === 'account'}
                />
                <BankDetailItem
                  label='Tipo'
                  value={bankDetails.account_type}
                  onCopy={() => copyToClipboard(bankDetails.account_type, 'type')}
                  copied={copiedField === 'type'}
                />
                <div className='col-span-2'>
                  <BankDetailItem
                    label='Titular'
                    value={bankDetails.holder_name}
                    onCopy={() => copyToClipboard(bankDetails.holder_name, 'holder')}
                    copied={copiedField === 'holder'}
                  />
                </div>
                <div className='col-span-2'>
                  <BankDetailItem
                    label='CNPJ'
                    value={bankDetails.holder_document}
                    onCopy={() => copyToClipboard(bankDetails.holder_document, 'doc')}
                    copied={copiedField === 'doc'}
                  />
                </div>
              </div>

              {/* Valor a transferir - usar brl_total_amount se disponível */}
              <div className='mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800'>
                <p className='text-xs text-yellow-700 dark:text-yellow-400 mb-1'>
                  Valor a ser transferido (BRL)
                </p>
                <div className='flex items-center justify-between'>
                  <span className='text-2xl font-bold text-yellow-800 dark:text-yellow-300'>
                    {trade.brl_total_amount
                      ? formatBRL(trade.brl_total_amount)
                      : `${formatUSD(trade.total_amount)} (USD)`}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        (trade.brl_total_amount ?? trade.total_amount).toFixed(2),
                        'amount'
                      )
                    }
                    className='p-2 text-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors'
                  >
                    {copiedField === 'amount' ? (
                      <CheckCircle className='w-5 h-5 text-green-600' />
                    ) : (
                      <Copy className='w-5 h-5' />
                    )}
                  </button>
                </div>
                {trade.usd_to_brl_rate && (
                  <p className='text-xs text-yellow-600 dark:text-yellow-500 mt-1'>
                    Taxa USD/BRL: {trade.usd_to_brl_rate.toFixed(4)}
                  </p>
                )}
                {!trade.brl_total_amount && (
                  <p className='text-xs text-orange-600 dark:text-orange-400 mt-1'>
                    ⚠️ Converta para BRL usando a cotação atual do dólar
                  </p>
                )}
              </div>

              {/* Aviso importante */}
              <div className='mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800'>
                <p className='text-xs text-red-700 dark:text-red-400'>
                  <strong>Importante:</strong> Transfira exatamente o valor indicado. Use o código{' '}
                  <button
                    onClick={() => copyToClipboard(trade.reference_code, 'reference')}
                    className='inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-800/50 rounded font-mono font-bold hover:bg-red-200 dark:hover:bg-red-700 transition-colors'
                    title='Clique para copiar'
                  >
                    {trade.reference_code}
                    {copiedField === 'reference' ? (
                      <CheckCircle className='w-3 h-3 text-green-600' />
                    ) : (
                      <Copy className='w-3 h-3' />
                    )}
                  </button>{' '}
                  na descrição da transferência.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className='space-y-3'>
          <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
            <Clock className='w-4 h-4' />
            Timeline
          </h3>
          <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4'>
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
        </div>

        {/* Informações de Blockchain (se concluído) */}
        {trade.status === 'COMPLETED' && trade.tx_hash && (
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
              <Wallet className='w-4 h-4' />
              Informações de Blockchain
            </h3>
            <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3'>
              {trade.wallet_address && (
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Endereço</p>
                  <p className='font-mono text-sm text-gray-900 dark:text-white break-all'>
                    {trade.wallet_address}
                  </p>
                </div>
              )}
              {trade.network && (
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Rede</p>
                  <p className='text-gray-900 dark:text-white capitalize'>{trade.network}</p>
                </div>
              )}
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Hash da Transação</p>
                <p className='font-mono text-sm text-blue-600 dark:text-blue-400 break-all'>
                  {trade.tx_hash}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ID da Trade */}
        <div className='pt-4 border-t border-gray-200 dark:border-gray-700'>
          <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>ID da Trade</p>
          <div className='flex items-center gap-2'>
            <code className='text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded'>
              {trade.id}
            </code>
            <button
              onClick={() => copyToClipboard(trade.id, 'id')}
              className='p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            >
              {copiedField === 'id' ? (
                <CheckCircle className='w-4 h-4 text-green-600' />
              ) : (
                <Copy className='w-4 h-4' />
              )}
            </button>
          </div>
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
    <div className='flex items-center gap-3'>
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
      <div className='flex-1'>
        <p
          className={`text-sm ${
            completed || pending ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'
          }`}
        >
          {label}
        </p>
        {date && <p className='text-xs text-gray-500 dark:text-gray-400'>{formatDate(date)}</p>}
      </div>
    </div>
  )
}

export default TradeDetailsPage
