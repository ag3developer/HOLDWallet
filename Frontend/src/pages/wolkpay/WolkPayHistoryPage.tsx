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
} from 'lucide-react'
import wolkPayService, { Invoice, InvoiceStatus } from '@/services/wolkpay'

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

const formatCrypto = (amount: number | string, symbol: string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
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
    <div key={i18n.language} className='space-y-6 pb-24'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => navigate('/wolkpay')}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-gray-600 dark:text-gray-400' />
          </button>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
              {t('wolkpay.history.title')}
            </h1>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              {t('wolkpay.history.subtitle', { total })}
            </p>
          </div>
        </div>

        <button
          onClick={loadInvoices}
          disabled={isLoading}
          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors'
        >
          <RefreshCw
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Filter */}
      <div className='flex gap-2 overflow-x-auto pb-2'>
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            !statusFilter
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          {t('wolkpay.history.all')}
        </button>
        <button
          onClick={() => setStatusFilter('PENDING,AWAITING_PAYMENT')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'PENDING,AWAITING_PAYMENT'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          {t('wolkpay.history.pending')}
        </button>
        <button
          onClick={() => setStatusFilter('PAID,APPROVED,COMPLETED')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'PAID,APPROVED,COMPLETED'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          {t('wolkpay.history.completed')}
        </button>
        <button
          onClick={() => setStatusFilter('EXPIRED,CANCELLED,REJECTED')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
            statusFilter === 'EXPIRED,CANCELLED,REJECTED'
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}
        >
          {t('wolkpay.history.cancelled')}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className='flex flex-col items-center justify-center py-16'>
          <div className='w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full relative'>
            <div className='w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0' />
          </div>
          <p className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
            {t('wolkpay.history.loading')}
          </p>
        </div>
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
              className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700'
            >
              {/* Header */}
              <div className='flex items-center justify-between mb-3'>
                <div>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>
                    #{invoice.invoice_number}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {formatDate(invoice.created_at)}
                  </p>
                </div>
                {renderStatusBadge(invoice.status)}
              </div>

              {/* Amount */}
              <div className='flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700'>
                <div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {t('wolkpay.history.crypto')}
                  </p>
                  <p className='font-semibold text-gray-900 dark:text-white'>
                    {formatCrypto(invoice.crypto_amount, invoice.crypto_currency)}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {t('wolkpay.history.total')}
                  </p>
                  <p className='font-bold text-lg text-blue-600 dark:text-blue-400'>
                    {formatCurrency(invoice.total_amount_brl)}
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
