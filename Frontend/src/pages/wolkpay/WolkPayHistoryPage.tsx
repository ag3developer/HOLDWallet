/**
 * WolkPayHistoryPage - Histórico de Faturas
 * ==========================================
 *
 * Lista todas as faturas WolkPay do usuário beneficiário.
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Copy,
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  Plus,
  TrendingUp,
  CircleDollarSign,
  FileText,
  Timer,
  Coins,
} from 'lucide-react'
import wolkPayService, { Invoice, InvoiceStatus } from '@/services/wolkpay'

// Logos das cryptos
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  TRX: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  LTC: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  DAI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
}

// Status config
const STATUS_CONFIG: Record<
  InvoiceStatus,
  { color: string; icon: React.ReactNode; label: string }
> = {
  PENDING: { color: 'yellow', icon: <Clock className='w-4 h-4' />, label: 'Pendente' },
  AWAITING_PAYMENT: { color: 'blue', icon: <Clock className='w-4 h-4' />, label: 'Aguardando' },
  PAID: { color: 'green', icon: <Check className='w-4 h-4' />, label: 'Pago' },
  APPROVED: { color: 'green', icon: <Check className='w-4 h-4' />, label: 'Aprovado' },
  COMPLETED: { color: 'green', icon: <Check className='w-4 h-4' />, label: 'Concluído' },
  EXPIRED: { color: 'gray', icon: <Clock className='w-4 h-4' />, label: 'Expirado' },
  CANCELLED: { color: 'gray', icon: <X className='w-4 h-4' />, label: 'Cancelado' },
  REJECTED: { color: 'red', icon: <X className='w-4 h-4' />, label: 'Rejeitado' },
}

// Skeleton Components
const SkeletonBox = ({ className = '' }: { className?: string }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`} />
)

const InvoiceCardSkeleton = () => (
  <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700'>
    <div className='flex items-center justify-between mb-3'>
      <div className='flex items-center gap-3'>
        <SkeletonBox className='w-10 h-10 rounded-xl' />
        <div>
          <SkeletonBox className='h-4 w-24 mb-1' />
          <SkeletonBox className='h-3 w-32' />
        </div>
      </div>
      <SkeletonBox className='h-6 w-20 rounded-full' />
    </div>
    <div className='flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700'>
      <div>
        <SkeletonBox className='h-3 w-16 mb-1' />
        <SkeletonBox className='h-5 w-24' />
      </div>
      <div className='text-right'>
        <SkeletonBox className='h-3 w-12 mb-1' />
        <SkeletonBox className='h-5 w-20' />
      </div>
    </div>
  </div>
)

const LoadingSkeleton = () => (
  <div className='space-y-3'>
    {[1, 2, 3, 4].map(i => (
      <InvoiceCardSkeleton key={`skeleton-${i}`} />
    ))}
  </div>
)

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCrypto = (amount: number | string | null | undefined, symbol: string) => {
  if (amount === null || amount === undefined) return `0.00 ${symbol}`
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return `0.00 ${symbol}`
  const decimals = ['BTC'].includes(symbol) ? 8 : ['ETH', 'BNB'].includes(symbol) ? 6 : 2
  return `${numAmount.toFixed(decimals)} ${symbol}`
}

export function WolkPayHistoryPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  // Estados
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Carregar faturas
  const loadInvoices = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await wolkPayService.getMyInvoices(page, 10, statusFilter || undefined)
      setInvoices(response.invoices)
      setTotal(response.total)
    } catch (err: any) {
      console.error('Error loading invoices:', err)
      setError(err.response?.data?.detail || t('wolkpay.history.errors.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [page, statusFilter])

  // Copiar link
  const handleCopyLink = async (invoice: Invoice) => {
    const url = `${window.location.origin}/wolkpay/checkout/${invoice.checkout_token}`

    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(invoice.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Cancelar fatura
  const handleCancel = async (invoice: Invoice) => {
    if (!confirm(t('wolkpay.history.confirmCancel'))) return

    try {
      await wolkPayService.cancelInvoice(invoice.id)
      loadInvoices()
    } catch (err: any) {
      console.error('Error cancelling invoice:', err)
      alert(err.response?.data?.detail || t('wolkpay.history.errors.cancelFailed'))
    }
  }

  // Render status badge
  const renderStatusBadge = (status: InvoiceStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
    const colorClasses: Record<string, string> = {
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      gray: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[config.color]}`}
      >
        {config.icon}
        {config.label}
      </span>
    )
  }

  return (
    <div key={i18n.language} className='space-y-5 pb-24'>
      {/* ============================================ */}
      {/* HERO HEADER - Premium Design */}
      {/* ============================================ */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-5'>
        {/* Background decorations */}
        <div className='absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2' />
        <div className='absolute bottom-0 left-0 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2' />

        <div className='relative'>
          {/* Back + Title */}
          <div className='flex items-center gap-3 mb-4'>
            <button
              onClick={() => navigate('/wolkpay')}
              className='p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors'
            >
              <ArrowLeft className='w-5 h-5 text-white' />
            </button>
            <div className='flex-1'>
              <h1 className='text-xl font-bold text-white flex items-center gap-2'>
                <FileText className='w-5 h-5' />
                Minhas Faturas
              </h1>
              <p className='text-white/70 text-xs'>
                {total} {total === 1 ? 'fatura' : 'faturas'} no total
              </p>
            </div>
            <button
              onClick={loadInvoices}
              disabled={isLoading}
              className='p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors'
            >
              <RefreshCw className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Stats */}
          <div className='grid grid-cols-3 gap-2'>
            <div className='bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-white/70 text-[10px] mb-0.5'>
                <Clock className='w-3 h-3' /> PENDENTES
              </div>
              <p className='text-white font-bold text-lg'>
                {invoices.filter(i => ['PENDING', 'AWAITING_PAYMENT'].includes(i.status)).length}
              </p>
            </div>
            <div className='bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-white/70 text-[10px] mb-0.5'>
                <Check className='w-3 h-3' /> CONCLUÍDAS
              </div>
              <p className='text-green-300 font-bold text-lg'>
                {invoices.filter(i => ['PAID', 'APPROVED', 'COMPLETED'].includes(i.status)).length}
              </p>
            </div>
            <div className='bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-white/70 text-[10px] mb-0.5'>
                <TrendingUp className='w-3 h-3' /> VOLUME
              </div>
              <p className='text-white font-bold text-sm'>
                {formatCurrency(
                  invoices
                    .filter(i => ['PAID', 'APPROVED', 'COMPLETED'].includes(i.status))
                    .reduce((acc, i) => acc + i.total_amount_brl, 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Nova Fatura CTA */}
      <button
        onClick={() => navigate('/wolkpay')}
        className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all'
      >
        <Plus className='w-5 h-5' />
        Criar Nova Fatura
      </button>

      {/* Filter Pills */}
      <div className='flex gap-2 overflow-x-auto pb-1 -mx-1 px-1'>
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
            !statusFilter
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Sparkles className='w-4 h-4' />
          Todas
        </button>
        <button
          onClick={() => setStatusFilter('PENDING,AWAITING_PAYMENT')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'PENDING,AWAITING_PAYMENT'
              ? 'bg-yellow-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Timer className='w-4 h-4' />
          Pendentes
        </button>
        <button
          onClick={() => setStatusFilter('PAID,APPROVED,COMPLETED')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'PAID,APPROVED,COMPLETED'
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Check className='w-4 h-4' />
          Concluídas
        </button>
        <button
          onClick={() => setStatusFilter('EXPIRED,CANCELLED,REJECTED')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'EXPIRED,CANCELLED,REJECTED'
              ? 'bg-gray-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <X className='w-4 h-4' />
          Canceladas
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className='flex flex-col items-center justify-center py-16'>
          <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4'>
            <AlertCircle className='w-8 h-8 text-red-500' />
          </div>
          <p className='text-sm font-medium text-gray-900 dark:text-white mb-1'>
            {t('wolkpay.history.error')}
          </p>
          <p className='text-xs text-gray-500 mb-4'>{error}</p>
          <button
            onClick={loadInvoices}
            className='px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg'
          >
            {t('wolkpay.history.retry')}
          </button>
        </div>
      ) : invoices.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-16'>
          <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4'>
            <Search className='w-8 h-8 text-gray-400' />
          </div>
          <p className='text-sm font-medium text-gray-900 dark:text-white mb-1'>
            {t('wolkpay.history.empty')}
          </p>
          <p className='text-xs text-gray-500 mb-4'>{t('wolkpay.history.emptyDesc')}</p>
          <button
            onClick={() => navigate('/wolkpay')}
            className='px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg'
          >
            {t('wolkpay.history.createFirst')}
          </button>
        </div>
      ) : (
        <div className='space-y-3'>
          {invoices.map(invoice => (
            <div
              key={invoice.id}
              className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all'
            >
              {/* Header com Logo da Crypto */}
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-3'>
                  {/* Crypto Logo */}
                  {CRYPTO_LOGOS[invoice.crypto_currency] ? (
                    <img
                      src={CRYPTO_LOGOS[invoice.crypto_currency]}
                      alt={invoice.crypto_currency}
                      className='w-10 h-10 rounded-full'
                    />
                  ) : (
                    <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center'>
                      <Coins className='w-5 h-5 text-white' />
                    </div>
                  )}
                  <div>
                    <p className='font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                      {formatCrypto(invoice.crypto_amount, invoice.crypto_currency)}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      #{invoice.invoice_number} • {formatDate(invoice.created_at)}
                    </p>
                  </div>
                </div>
                {renderStatusBadge(invoice.status)}
              </div>

              {/* Amount Row */}
              <div className='flex items-center justify-between py-3 px-3 mb-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
                <div>
                  <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                    Total em BRL
                  </p>
                  <p className='font-bold text-xl text-blue-600 dark:text-blue-400'>
                    {formatCurrency(invoice.total_amount_brl)}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                    Você recebe
                  </p>
                  <p className='font-semibold text-green-600 dark:text-green-400'>
                    {formatCurrency(invoice.beneficiary_receives_brl || invoice.base_amount_brl)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className='flex gap-2'>
                {['PENDING', 'AWAITING_PAYMENT'].includes(invoice.status) && (
                  <>
                    <button
                      onClick={() => handleCopyLink(invoice)}
                      className='flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors'
                    >
                      {copiedId === invoice.id ? (
                        <Check className='w-4 h-4' />
                      ) : (
                        <Copy className='w-4 h-4' />
                      )}
                      {copiedId === invoice.id
                        ? t('wolkpay.history.copied')
                        : t('wolkpay.history.copyLink')}
                    </button>
                    <button
                      onClick={() =>
                        window.open(`/wolkpay/checkout/${invoice.checkout_token}`, '_blank')
                      }
                      className='p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors'
                    >
                      <ExternalLink className='w-4 h-4 text-gray-600 dark:text-gray-400' />
                    </button>
                    <button
                      onClick={() => handleCancel(invoice)}
                      className='p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors'
                    >
                      <X className='w-4 h-4 text-red-500' />
                    </button>
                  </>
                )}

                {['PAID', 'APPROVED', 'COMPLETED'].includes(invoice.status) && (
                  <div className='flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl text-sm font-medium text-green-700 dark:text-green-400'>
                    <Check className='w-4 h-4' />
                    {t('wolkpay.history.paymentConfirmed')}
                  </div>
                )}

                {['EXPIRED', 'CANCELLED', 'REJECTED'].includes(invoice.status) && (
                  <div className='flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400'>
                    {invoice.status === 'EXPIRED' && t('wolkpay.history.expired')}
                    {invoice.status === 'CANCELLED' && t('wolkpay.history.cancelled')}
                    {invoice.status === 'REJECTED' && t('wolkpay.history.rejected')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 10 && (
        <div className='flex items-center justify-center gap-4'>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className='px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {t('wolkpay.history.previous')}
          </button>
          <span className='text-sm text-gray-500 dark:text-gray-400'>
            {t('wolkpay.history.pageOf', { page, total: Math.ceil(total / 10) })}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * 10 >= total}
            className='px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {t('wolkpay.history.next')}
          </button>
        </div>
      )}
    </div>
  )
}

export default WolkPayHistoryPage
