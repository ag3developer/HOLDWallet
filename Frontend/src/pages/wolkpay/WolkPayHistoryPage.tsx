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
  Wallet,
  Globe,
  Link,
  Eye,
  CheckCircle,
  QrCode,
  Banknote,
  Send,
  Calendar,
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

const formatCurrency = (amount: number | string | null | undefined) => {
  if (amount === null || amount === undefined) return 'R$ 0,00'
  const numAmount = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  if (Number.isNaN(numAmount)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numAmount)
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
  const numAmount = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  if (Number.isNaN(numAmount)) return `0.00 ${symbol}`
  let decimals = 2
  if (['BTC'].includes(symbol)) decimals = 8
  else if (['ETH', 'BNB'].includes(symbol)) decimals = 6
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
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

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
                    .reduce((acc, i) => {
                      const amount =
                        typeof i.total_amount_brl === 'string'
                          ? Number.parseFloat(i.total_amount_brl)
                          : i.total_amount_brl || 0
                      return acc + (Number.isNaN(amount) ? 0 : amount)
                    }, 0)
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
            statusFilter === ''
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
          onClick={() => setStatusFilter('EXPIRED')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'EXPIRED'
              ? 'bg-orange-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Clock className='w-4 h-4' />
          Expiradas
        </button>
        <button
          onClick={() => setStatusFilter('CANCELLED,REJECTED')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'CANCELLED,REJECTED'
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
                {/* Botão Ver Detalhes - sempre visível */}
                <button
                  onClick={() => {
                    setSelectedInvoice(invoice)
                    setShowDetailModal(true)
                  }}
                  className='p-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition-colors'
                  title='Ver detalhes'
                >
                  <Eye className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
                </button>

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
                      title='Abrir checkout'
                      className='p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors'
                    >
                      <ExternalLink className='w-4 h-4 text-gray-600 dark:text-gray-400' />
                    </button>
                    <button
                      onClick={() => handleCancel(invoice)}
                      title='Cancelar'
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

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto'>
            {/* Modal Header */}
            <div className='sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-t-2xl'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-bold text-white'>Detalhes da Fatura</h3>
                  <p className='text-white/70 text-sm'>#{selectedInvoice.invoice_number}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className='p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors'
                >
                  <X className='w-5 h-5 text-white' />
                </button>
              </div>
            </div>

            <div className='p-4 space-y-4'>
              {/* Status Badge */}
              <div className='flex justify-center'>{renderStatusBadge(selectedInvoice.status)}</div>

              {/* Crypto Amount */}
              <div className='text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
                <div className='flex items-center justify-center gap-3 mb-2'>
                  {CRYPTO_LOGOS[selectedInvoice.crypto_currency] ? (
                    <img
                      src={CRYPTO_LOGOS[selectedInvoice.crypto_currency]}
                      alt={selectedInvoice.crypto_currency}
                      className='w-10 h-10 rounded-full'
                    />
                  ) : (
                    <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center'>
                      <Coins className='w-5 h-5 text-white' />
                    </div>
                  )}
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {formatCrypto(selectedInvoice.crypto_amount, selectedInvoice.crypto_currency)}
                  </p>
                </div>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Rede:{' '}
                  {selectedInvoice.crypto_tx_network?.toUpperCase() ||
                    selectedInvoice.crypto_network?.toUpperCase() ||
                    'Padrão'}
                </p>
              </div>

              {/* Timeline */}
              <div className='bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4'>
                <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2'>
                  <Clock className='w-4 h-4' />
                  Timeline da Fatura
                </h4>
                <div className='relative space-y-3'>
                  {/* Linha vertical */}
                  <div className='absolute left-3 top-3 bottom-3 w-0.5 bg-gray-200 dark:bg-gray-600' />

                  {/* Evento: Criada */}
                  <div className='relative pl-8'>
                    <div className='absolute left-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center'>
                      <FileText className='w-2.5 h-2.5 text-white' />
                    </div>
                    <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                      <p className='text-xs font-medium text-blue-600 dark:text-blue-400'>
                        Fatura Criada
                      </p>
                      <p className='text-[10px] text-gray-500'>
                        {formatDate(selectedInvoice.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Evento: Aguardando Pagamento */}
                  {['AWAITING_PAYMENT', 'PAID', 'APPROVED', 'COMPLETED'].includes(
                    selectedInvoice.status
                  ) && (
                    <div className='relative pl-8'>
                      <div className='absolute left-1.5 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center'>
                        <QrCode className='w-2.5 h-2.5 text-white' />
                      </div>
                      <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                        <p className='text-xs font-medium text-yellow-600 dark:text-yellow-400'>
                          PIX Gerado
                        </p>
                        <p className='text-[10px] text-gray-500'>Aguardando pagamento</p>
                      </div>
                    </div>
                  )}

                  {/* Evento: Pago */}
                  {['PAID', 'APPROVED', 'COMPLETED'].includes(selectedInvoice.status) && (
                    <div className='relative pl-8'>
                      <div className='absolute left-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center'>
                        <Banknote className='w-2.5 h-2.5 text-white' />
                      </div>
                      <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                        <p className='text-xs font-medium text-green-600 dark:text-green-400'>
                          Pagamento PIX Confirmado
                        </p>
                        <p className='text-[10px] text-gray-500'>
                          Valor: {formatCurrency(selectedInvoice.total_amount_brl)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Evento: Crypto Enviada */}
                  {['APPROVED', 'COMPLETED'].includes(selectedInvoice.status) &&
                    selectedInvoice.crypto_tx_hash && (
                      <div className='relative pl-8'>
                        <div className='absolute left-1.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center'>
                          <Send className='w-2.5 h-2.5 text-white' />
                        </div>
                        <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                          <p className='text-xs font-medium text-purple-600 dark:text-purple-400'>
                            Crypto Enviada
                          </p>
                          <p className='text-[10px] text-gray-500'>
                            {selectedInvoice.crypto_sent_at
                              ? formatDate(selectedInvoice.crypto_sent_at)
                              : 'Transação confirmada'}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Evento: Concluído */}
                  {selectedInvoice.status === 'COMPLETED' && (
                    <div className='relative pl-8'>
                      <div className='absolute left-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center'>
                        <CheckCircle className='w-2.5 h-2.5 text-white' />
                      </div>
                      <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                        <p className='text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                          Concluído
                        </p>
                        <p className='text-[10px] text-gray-500'>Operação finalizada com sucesso</p>
                      </div>
                    </div>
                  )}

                  {/* Evento: Expirado */}
                  {selectedInvoice.status === 'EXPIRED' && (
                    <div className='relative pl-8'>
                      <div className='absolute left-1.5 w-4 h-4 rounded-full bg-gray-500 flex items-center justify-center'>
                        <Clock className='w-2.5 h-2.5 text-white' />
                      </div>
                      <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                        <p className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                          Expirada
                        </p>
                        <p className='text-[10px] text-gray-500'>
                          {formatDate(selectedInvoice.expires_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Evento: Cancelado/Rejeitado */}
                  {['CANCELLED', 'REJECTED'].includes(selectedInvoice.status) && (
                    <div className='relative pl-8'>
                      <div className='absolute left-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center'>
                        <X className='w-2.5 h-2.5 text-white' />
                      </div>
                      <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                        <p className='text-xs font-medium text-red-600 dark:text-red-400'>
                          {selectedInvoice.status === 'CANCELLED' ? 'Cancelada' : 'Rejeitada'}
                        </p>
                        <p className='text-[10px] text-gray-500'>Operação não concluída</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Blockchain Transaction Data */}
              {selectedInvoice.crypto_tx_hash && (
                <div className='bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700/50'>
                  <h4 className='text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2'>
                    <Link className='w-4 h-4' />
                    Transação Blockchain
                    <span className='ml-auto text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400'>
                      Crypto Creditada
                    </span>
                  </h4>

                  <div className='space-y-3'>
                    {/* TX Hash */}
                    <div>
                      <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1'>
                        Hash da Transação (TX)
                      </p>
                      <div className='flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                        <code className='text-xs text-gray-900 dark:text-white font-mono flex-1 truncate'>
                          {selectedInvoice.crypto_tx_hash}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedInvoice.crypto_tx_hash || '')
                            setCopiedId('tx-hash')
                            setTimeout(() => setCopiedId(null), 2000)
                          }}
                          className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                          title='Copiar'
                        >
                          {copiedId === 'tx-hash' ? (
                            <Check className='w-4 h-4 text-green-500' />
                          ) : (
                            <Copy className='w-4 h-4 text-gray-400' />
                          )}
                        </button>
                        {selectedInvoice.crypto_explorer_url && (
                          <a
                            href={selectedInvoice.crypto_explorer_url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                            title='Ver no Explorer'
                          >
                            <ExternalLink className='w-4 h-4 text-purple-500' />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Wallet Address */}
                    {selectedInvoice.crypto_wallet_address && (
                      <div>
                        <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1'>
                          Carteira Creditada
                        </p>
                        <div className='flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                          <Wallet className='w-4 h-4 text-gray-400' />
                          <code className='text-xs text-gray-900 dark:text-white font-mono flex-1 truncate'>
                            {selectedInvoice.crypto_wallet_address}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                selectedInvoice.crypto_wallet_address || ''
                              )
                              setCopiedId('wallet')
                              setTimeout(() => setCopiedId(null), 2000)
                            }}
                            className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                            title='Copiar'
                          >
                            {copiedId === 'wallet' ? (
                              <Check className='w-4 h-4 text-green-500' />
                            ) : (
                              <Copy className='w-4 h-4 text-gray-400' />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Network & Sent At */}
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1'>
                          Rede
                        </p>
                        <div className='flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                          <Globe className='w-4 h-4 text-gray-400' />
                          <span className='text-xs font-medium text-gray-900 dark:text-white'>
                            {selectedInvoice.crypto_tx_network?.toUpperCase() ||
                              selectedInvoice.crypto_network?.toUpperCase() ||
                              '-'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1'>
                          Data do Envio
                        </p>
                        <div className='flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600'>
                          <Calendar className='w-4 h-4 text-gray-400' />
                          <span className='text-xs font-medium text-gray-900 dark:text-white'>
                            {selectedInvoice.crypto_sent_at
                              ? formatDate(selectedInvoice.crypto_sent_at)
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Values Summary */}
              <div className='bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4'>
                <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2'>
                  <CircleDollarSign className='w-4 h-4' />
                  Valores
                </h4>
                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-500 dark:text-gray-400'>Valor Base</span>
                    <span className='text-gray-900 dark:text-white'>
                      {formatCurrency(selectedInvoice.base_amount_brl)}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-500 dark:text-gray-400'>
                      Taxa Serviço ({selectedInvoice.service_fee_percent}%)
                    </span>
                    <span className='text-yellow-600 dark:text-yellow-400'>
                      {formatCurrency(selectedInvoice.service_fee_brl)}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-500 dark:text-gray-400'>
                      Taxa Rede ({selectedInvoice.network_fee_percent}%)
                    </span>
                    <span className='text-yellow-600 dark:text-yellow-400'>
                      {formatCurrency(selectedInvoice.network_fee_brl)}
                    </span>
                  </div>
                  <div className='border-t border-gray-200 dark:border-gray-600 pt-2 mt-2'>
                    <div className='flex justify-between text-sm font-bold'>
                      <span className='text-gray-700 dark:text-gray-300'>Total Pago</span>
                      <span className='text-blue-600 dark:text-blue-400'>
                        {formatCurrency(selectedInvoice.total_amount_brl)}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm font-bold mt-1'>
                      <span className='text-gray-700 dark:text-gray-300'>Você Recebeu</span>
                      <span className='text-green-600 dark:text-green-400'>
                        {formatCurrency(
                          selectedInvoice.beneficiary_receives_brl ||
                            selectedInvoice.base_amount_brl
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Crypto Recebida - Destaque */}
              {['PAID', 'APPROVED', 'COMPLETED'].includes(selectedInvoice.status) && (
                <div className='bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700/50'>
                  <h4 className='text-sm font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2'>
                    <Coins className='w-4 h-4' />
                    Crypto Creditada na Sua Carteira
                  </h4>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      {CRYPTO_LOGOS[selectedInvoice.crypto_currency] ? (
                        <img
                          src={CRYPTO_LOGOS[selectedInvoice.crypto_currency]}
                          alt={selectedInvoice.crypto_currency}
                          className='w-12 h-12 rounded-full'
                        />
                      ) : (
                        <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center'>
                          <Coins className='w-6 h-6 text-white' />
                        </div>
                      )}
                      <div>
                        <p className='text-2xl font-bold text-green-700 dark:text-green-300'>
                          {formatCrypto(
                            selectedInvoice.crypto_amount,
                            selectedInvoice.crypto_currency
                          )}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {selectedInvoice.fee_payer === 'PAYER' ? (
                            <span className='text-green-600 dark:text-green-400'>
                              ✓ Valor cheio (pagador pagou as taxas)
                            </span>
                          ) : (
                            <span className='text-yellow-600 dark:text-yellow-400'>
                              Taxas descontadas do valor
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  {selectedInvoice.crypto_wallet_address && (
                    <div className='mt-3 pt-3 border-t border-green-200 dark:border-green-700/50'>
                      <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1'>
                        Carteira Creditada
                      </p>
                      <code className='text-xs text-gray-700 dark:text-gray-300 font-mono bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded block truncate'>
                        {selectedInvoice.crypto_wallet_address}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className='grid grid-cols-2 gap-3 text-center'>
                <div className='bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3'>
                  <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase'>
                    Criada em
                  </p>
                  <p className='text-xs font-medium text-gray-900 dark:text-white'>
                    {formatDate(selectedInvoice.created_at)}
                  </p>
                </div>
                <div className='bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3'>
                  <p className='text-[10px] text-gray-500 dark:text-gray-400 uppercase'>
                    Expira em
                  </p>
                  <p className='text-xs font-medium text-gray-900 dark:text-white'>
                    {formatDate(selectedInvoice.expires_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className='sticky bottom-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl'>
              <button
                onClick={() => setShowDetailModal(false)}
                className='w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors'
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WolkPayHistoryPage
