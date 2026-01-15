/**
 * Admin Bill Payment Page
 * =======================
 *
 * Página de administração de pagamentos de boleto (Bill Payment).
 * Lista pagamentos pendentes e permite gestão completa.
 *
 * Features:
 * - Lista de pagamentos com filtros por status
 * - Detalhes completos do boleto
 * - Processar débito de crypto
 * - Marcar como pago
 * - Rejeitar com reembolso
 * - Dashboard de estatísticas
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Filter,
  User,
  Building,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Calendar,
  Banknote,
  Loader2,
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Copy,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/services/api'

// Types
interface BillPaymentStats {
  total_payments: number
  pending_count: number
  crypto_debited_count: number
  processing_count: number
  paying_count: number
  paid_count: number
  failed_count: number
  refunded_count: number
  cancelled_count: number
  expired_count: number
  total_brl_pending: number
  total_brl_paid: number
  total_crypto_pending: number
  total_crypto_paid: number
  today_count: number
  today_brl: number
  month_count: number
  month_brl: number
}

interface BillPayment {
  id: string
  payment_number: string
  status: string
  status_display: string

  // User
  user_id: string
  user_name: string | null
  user_email: string | null
  user_phone: string | null

  // Bill Data
  bill_type: string
  bill_type_display: string
  barcode: string
  digitable_line: string | null

  // Bill Values
  bill_amount_brl: number
  bill_due_date: string
  is_overdue: boolean
  days_until_due: number

  // Beneficiary
  bill_beneficiary_name: string | null
  bill_beneficiary_document: string | null
  bill_payer_name: string | null
  bill_payer_document: string | null
  bill_bank_code: string | null
  bill_bank_name: string | null

  // Crypto
  crypto_currency: string
  crypto_amount: number
  crypto_network: string | null
  crypto_usd_rate: number
  brl_usd_rate: number

  // Fees
  base_amount_brl: number
  service_fee_percent: number
  service_fee_brl: number
  network_fee_percent: number
  network_fee_brl: number
  total_amount_brl: number

  // Control
  quote_expires_at: string | null
  crypto_debited_at: string | null
  internal_tx_id: string | null
  crypto_tx_hash: string | null

  // Payment
  paid_by_operator_id: string | null
  paid_by_operator_name: string | null
  payment_receipt_url: string | null
  bank_authentication: string | null
  paid_at: string | null

  // Failure
  failure_reason: string | null
  refunded_at: string | null
  refund_tx_id: string | null

  // Timestamps
  created_at: string
  updated_at: string | null
}

interface ListResponse {
  payments: BillPayment[]
  total: number
  page: number
  per_page: number
  total_pages: number
  stats: BillPaymentStats
}

// Crypto logos
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  POL: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
}

// Status colors and config
const STATUS_CONFIG: Record<
  string,
  { label: string; bgClass: string; icon: React.ReactNode; color: string }
> = {
  PENDING: {
    label: 'Aguardando Confirmação',
    bgClass: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
    icon: <Clock className='w-3 h-3' />,
    color: 'gray',
  },
  CRYPTO_DEBITED: {
    label: 'Crypto Debitada',
    bgClass: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    icon: <DollarSign className='w-3 h-3' />,
    color: 'yellow',
  },
  PROCESSING: {
    label: 'Processando',
    bgClass: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    icon: <Loader2 className='w-3 h-3 animate-spin' />,
    color: 'blue',
  },
  PAYING: {
    label: 'Pagando Boleto',
    bgClass: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
    icon: <CreditCard className='w-3 h-3' />,
    color: 'purple',
  },
  PAID: {
    label: 'Pago',
    bgClass: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
    icon: <CheckCircle className='w-3 h-3' />,
    color: 'green',
  },
  FAILED: {
    label: 'Falhou',
    bgClass: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
    icon: <XCircle className='w-3 h-3' />,
    color: 'red',
  },
  REFUNDED: {
    label: 'Reembolsado',
    bgClass: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
    icon: <RotateCcw className='w-3 h-3' />,
    color: 'orange',
  },
  CANCELLED: {
    label: 'Cancelado',
    bgClass: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
    icon: <XCircle className='w-3 h-3' />,
    color: 'gray',
  },
  EXPIRED: {
    label: 'Expirado',
    bgClass: 'bg-gray-100 dark:bg-gray-500/20 text-gray-500 dark:text-gray-500',
    icon: <Clock className='w-3 h-3' />,
    color: 'gray',
  },
}

// Helpers
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatCrypto = (amount: number) => {
  if (amount >= 1000) return amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  if (amount >= 1) return amount.toFixed(4)
  return amount.toFixed(8)
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  toast.success('Copiado!')
}

const getExplorerUrl = (network: string | null, txHash: string | null) => {
  if (!txHash || !network) return null
  const explorers: Record<string, string> = {
    polygon: 'https://polygonscan.com/tx/',
    bsc: 'https://bscscan.com/tx/',
    ethereum: 'https://etherscan.io/tx/',
  }
  const baseUrl = explorers[network.toLowerCase()]
  return baseUrl ? `${baseUrl}${txHash}` : null
}

// ========================================
// Main Component
// ========================================
export const AdminBillPaymentPage: React.FC = () => {
  const navigate = useNavigate()

  // State
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<BillPayment[]>([])
  const [stats, setStats] = useState<BillPaymentStats | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Selected payment for actions
  const [selectedPayment, setSelectedPayment] = useState<BillPayment | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState<
    'mark_paid' | 'reject' | 'process_crypto' | null
  >(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state for actions
  const [bankAuth, setBankAuth] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [refundCrypto, setRefundCrypto] = useState(true)

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = {
        page,
        per_page: 20,
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter.toUpperCase()
      }
      if (search.trim()) {
        params.search = search.trim()
      }

      const response = await api.get<ListResponse>('/admin/wolkpay/bill-payments', { params })
      setPayments(response.data.payments)
      setStats(response.data.stats)
      setTotalPages(response.data.total_pages)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error)
      toast.error('Erro ao carregar pagamentos')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      fetchPayments()
    }, 500)
    return () => clearTimeout(timeout)
  }, [search])

  // Action handlers
  const handleProcessCrypto = async () => {
    if (!selectedPayment) return
    setActionLoading(true)
    try {
      await api.post(`/admin/wolkpay/bill-payments/${selectedPayment.id}/process-crypto`, {
        force_blockchain_transfer: false,
      })
      toast.success('Crypto processada com sucesso!')
      setShowActionModal(null)
      fetchPayments()
    } catch (error: unknown) {
      const errMsg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao processar crypto'
      toast.error(errMsg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!selectedPayment || !bankAuth.trim()) return
    setActionLoading(true)
    try {
      await api.post(`/admin/wolkpay/bill-payments/${selectedPayment.id}/mark-paid`, {
        bank_authentication: bankAuth,
      })
      toast.success('Pagamento marcado como pago!')
      setShowActionModal(null)
      setBankAuth('')
      fetchPayments()
    } catch (error: unknown) {
      const errMsg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao marcar como pago'
      toast.error(errMsg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedPayment || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await api.post(`/admin/wolkpay/bill-payments/${selectedPayment.id}/reject`, {
        reason: rejectReason,
        refund_crypto: refundCrypto,
      })
      toast.success('Pagamento rejeitado!')
      setShowActionModal(null)
      setRejectReason('')
      fetchPayments()
    } catch (error: unknown) {
      const errMsg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao rejeitar'
      toast.error(errMsg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetProcessing = async (payment: BillPayment) => {
    try {
      await api.post(`/admin/wolkpay/bill-payments/${payment.id}/set-processing`)
      toast.success('Status atualizado para Processando')
      fetchPayments()
    } catch (error: unknown) {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleSetPaying = async (payment: BillPayment) => {
    try {
      await api.post(`/admin/wolkpay/bill-payments/${payment.id}/set-paying`)
      toast.success('Status atualizado para Pagando')
      fetchPayments()
    } catch (error: unknown) {
      toast.error('Erro ao atualizar status')
    }
  }

  // Get status config
  const getStatusConfig = (status: string) => {
    return (
      STATUS_CONFIG[status.toUpperCase()] || {
        label: status,
        bgClass: 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400',
        icon: null,
        color: 'gray',
      }
    )
  }

  // Filter tabs
  const statusTabs = [
    { id: 'all', label: 'Todos', count: stats?.total_payments || 0 },
    {
      id: 'CRYPTO_DEBITED',
      label: 'Aguardando Pagamento',
      count: stats?.crypto_debited_count || 0,
    },
    { id: 'PROCESSING', label: 'Processando', count: stats?.processing_count || 0 },
    { id: 'PAYING', label: 'Pagando', count: stats?.paying_count || 0 },
    { id: 'PAID', label: 'Pagos', count: stats?.paid_count || 0 },
    { id: 'FAILED', label: 'Falhos', count: stats?.failed_count || 0 },
    { id: 'REFUNDED', label: 'Reembolsados', count: stats?.refunded_count || 0 },
  ]

  return (
    <div className='flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10'>
        <div className='px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg'>
                <FileText className='w-6 h-6 text-purple-600 dark:text-purple-400' />
              </div>
              <div>
                <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
                  Pagamento de Boletos
                </h1>
                <p className='text-sm text-gray-500'>Gerenciamento de Bill Payments</p>
              </div>
            </div>
            <button
              onClick={fetchPayments}
              className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
              disabled={loading}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className='px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <div className='bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-3'>
              <div className='text-2xl font-bold text-yellow-600'>
                {stats.crypto_debited_count + stats.processing_count + stats.paying_count}
              </div>
              <div className='text-xs text-yellow-600/70'>Pendentes de Pagamento</div>
              <div className='text-xs font-semibold text-yellow-600'>
                {formatBRL(stats.total_brl_pending)}
              </div>
            </div>
            <div className='bg-green-50 dark:bg-green-500/10 rounded-lg p-3'>
              <div className='text-2xl font-bold text-green-600'>{stats.paid_count}</div>
              <div className='text-xs text-green-600/70'>Pagos</div>
              <div className='text-xs font-semibold text-green-600'>
                {formatBRL(stats.total_brl_paid)}
              </div>
            </div>
            <div className='bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3'>
              <div className='text-2xl font-bold text-blue-600'>{stats.today_count}</div>
              <div className='text-xs text-blue-600/70'>Hoje</div>
              <div className='text-xs font-semibold text-blue-600'>
                {formatBRL(stats.today_brl)}
              </div>
            </div>
            <div className='bg-purple-50 dark:bg-purple-500/10 rounded-lg p-3'>
              <div className='text-2xl font-bold text-purple-600'>{stats.month_count}</div>
              <div className='text-xs text-purple-600/70'>Este Mês</div>
              <div className='text-xs font-semibold text-purple-600'>
                {formatBRL(stats.month_brl)}
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className='px-4 pb-3'>
          <div className='flex gap-3'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por número, código de barras, usuário...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-none text-sm'
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border ${showFilters ? 'bg-purple-50 border-purple-300' : 'border-gray-200 dark:border-gray-600'}`}
            >
              <Filter className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className='px-4 pb-3 overflow-x-auto'>
          <div className='flex gap-2'>
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className='ml-1.5 bg-white/20 px-1.5 rounded-full text-xs'>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payment List */}
      <div className='p-4 space-y-3'>
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
          </div>
        ) : payments.length === 0 ? (
          <div className='text-center py-12 text-gray-500'>
            <FileText className='w-12 h-12 mx-auto mb-3 opacity-50' />
            <p>Nenhum pagamento encontrado</p>
          </div>
        ) : (
          payments.map(payment => {
            const statusConfig = getStatusConfig(payment.status)
            const cryptoLogo = CRYPTO_LOGOS[payment.crypto_currency?.toUpperCase()]

            return (
              <div
                key={payment.id}
                className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'
              >
                {/* Header Row */}
                <div className='px-4 py-3 border-b border-gray-100 dark:border-gray-700'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-mono text-purple-600'>
                        #{payment.payment_number}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass}`}
                      >
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>
                    <span className='text-xs text-gray-500'>
                      {formatRelativeDate(payment.created_at)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className='px-4 py-3'>
                  {/* User & Bill Info */}
                  <div className='grid grid-cols-2 gap-4 mb-3'>
                    <div>
                      <div className='text-xs text-gray-500 mb-1'>Usuário</div>
                      <div className='flex items-center gap-2'>
                        <User className='w-4 h-4 text-gray-400' />
                        <span className='text-sm font-medium truncate'>
                          {payment.user_name || payment.user_email || 'Usuário'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className='text-xs text-gray-500 mb-1'>Beneficiário</div>
                      <div className='flex items-center gap-2'>
                        <Building className='w-4 h-4 text-gray-400' />
                        <span className='text-sm font-medium truncate'>
                          {payment.bill_beneficiary_name || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Values */}
                  <div className='grid grid-cols-2 gap-4 mb-3'>
                    <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2'>
                      <div className='text-xs text-gray-500'>Valor do Boleto</div>
                      <div className='text-lg font-bold text-gray-900 dark:text-white'>
                        {formatBRL(payment.bill_amount_brl)}
                      </div>
                      <div
                        className={`text-xs ${payment.is_overdue ? 'text-red-500' : 'text-gray-500'}`}
                      >
                        {payment.is_overdue
                          ? `Vencido há ${Math.abs(payment.days_until_due)} dias`
                          : payment.days_until_due === 0
                            ? 'Vence hoje'
                            : `Vence em ${payment.days_until_due} dias`}
                      </div>
                    </div>
                    <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2'>
                      <div className='text-xs text-gray-500'>Valor em Crypto</div>
                      <div className='flex items-center gap-2'>
                        {cryptoLogo && <img src={cryptoLogo} className='w-5 h-5' alt='' />}
                        <span className='text-lg font-bold text-gray-900 dark:text-white'>
                          {formatCrypto(payment.crypto_amount)}
                        </span>
                        <span className='text-xs text-gray-500'>
                          {payment.crypto_currency}
                          {payment.crypto_network && ` (${payment.crypto_network})`}
                        </span>
                      </div>
                      <div className='text-xs text-gray-500'>
                        Total: {formatBRL(payment.total_amount_brl)}
                      </div>
                    </div>
                  </div>

                  {/* Barcode */}
                  <div className='mb-3'>
                    <div className='text-xs text-gray-500 mb-1'>Código de Barras</div>
                    <div className='flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2'>
                      <code className='text-xs font-mono flex-1 truncate'>{payment.barcode}</code>
                      <button
                        onClick={() => copyToClipboard(payment.barcode)}
                        className='p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded'
                      >
                        <Copy className='w-4 h-4' />
                      </button>
                    </div>
                  </div>

                  {/* TX Hash if exists */}
                  {payment.crypto_tx_hash && (
                    <div className='mb-3'>
                      <div className='text-xs text-gray-500 mb-1'>Transaction Hash</div>
                      <div className='flex items-center gap-2 bg-green-50 dark:bg-green-500/10 rounded-lg p-2'>
                        <code className='text-xs font-mono flex-1 truncate text-green-600'>
                          {payment.crypto_tx_hash}
                        </code>
                        {getExplorerUrl(payment.crypto_network, payment.crypto_tx_hash) && (
                          <a
                            href={getExplorerUrl(payment.crypto_network, payment.crypto_tx_hash)!}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='p-1 hover:bg-green-100 dark:hover:bg-green-500/20 rounded'
                          >
                            <ExternalLink className='w-4 h-4 text-green-600' />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bank Auth if paid */}
                  {payment.bank_authentication && (
                    <div className='mb-3'>
                      <div className='text-xs text-gray-500 mb-1'>Autenticação Bancária</div>
                      <div className='bg-green-50 dark:bg-green-500/10 rounded-lg p-2'>
                        <code className='text-sm font-mono text-green-600'>
                          {payment.bank_authentication}
                        </code>
                      </div>
                    </div>
                  )}

                  {/* Failure reason */}
                  {payment.failure_reason && (
                    <div className='mb-3 bg-red-50 dark:bg-red-500/10 rounded-lg p-2'>
                      <div className='flex items-center gap-2 text-red-600'>
                        <AlertTriangle className='w-4 h-4' />
                        <span className='text-sm'>{payment.failure_reason}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className='px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700'>
                  <div className='flex items-center justify-between gap-2'>
                    <button
                      onClick={() => {
                        setSelectedPayment(payment)
                        setShowDetailModal(true)
                      }}
                      className='flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg'
                    >
                      <Eye className='w-4 h-4' />
                      Detalhes
                    </button>

                    <div className='flex items-center gap-2'>
                      {/* Status-specific actions */}
                      {payment.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setSelectedPayment(payment)
                            setShowActionModal('process_crypto')
                          }}
                          className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600'
                        >
                          <DollarSign className='w-4 h-4' />
                          Debitar Crypto
                        </button>
                      )}

                      {payment.status === 'CRYPTO_DEBITED' && (
                        <>
                          <button
                            onClick={() => handleSetProcessing(payment)}
                            className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600'
                          >
                            <Play className='w-4 h-4' />
                            Processar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPayment(payment)
                              setShowActionModal('reject')
                            }}
                            className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600'
                          >
                            <X className='w-4 h-4' />
                            Rejeitar
                          </button>
                        </>
                      )}

                      {payment.status === 'PROCESSING' && (
                        <>
                          <button
                            onClick={() => handleSetPaying(payment)}
                            className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600'
                          >
                            <CreditCard className='w-4 h-4' />
                            Pagando
                          </button>
                        </>
                      )}

                      {payment.status === 'PAYING' && (
                        <button
                          onClick={() => {
                            setSelectedPayment(payment)
                            setShowActionModal('mark_paid')
                          }}
                          className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600'
                        >
                          <Check className='w-4 h-4' />
                          Marcar Pago
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='p-4 flex items-center justify-between'>
          <span className='text-sm text-gray-500'>
            Página {page} de {totalPages} ({total} pagamentos)
          </span>
          <div className='flex gap-2'>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className='p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50'
            >
              <ChevronLeft className='w-5 h-5' />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className='p-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50'
            >
              <ChevronRight className='w-5 h-5' />
            </button>
          </div>
        </div>
      )}

      {/* Action Modal - Process Crypto */}
      {showActionModal === 'process_crypto' && selectedPayment && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6'>
            <h3 className='text-lg font-bold mb-4'>Debitar Crypto do Usuário</h3>
            <p className='text-sm text-gray-500 mb-4'>
              Isso irá debitar{' '}
              <strong>
                {formatCrypto(selectedPayment.crypto_amount)} {selectedPayment.crypto_currency}
              </strong>{' '}
              da carteira do usuário e transferir para a carteira do sistema.
            </p>
            <div className='bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-3 mb-4'>
              <div className='flex items-start gap-2'>
                <AlertTriangle className='w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5' />
                <div className='text-sm text-yellow-600'>
                  <strong>Atenção:</strong> Esta ação não pode ser desfeita automaticamente.
                  Certifique-se de que o pagamento do boleto será realizado.
                </div>
              </div>
            </div>
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => setShowActionModal(null)}
                className='px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessCrypto}
                disabled={actionLoading}
                className='px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2'
              >
                {actionLoading && <Loader2 className='w-4 h-4 animate-spin' />}
                Confirmar Débito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal - Mark Paid */}
      {showActionModal === 'mark_paid' && selectedPayment && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6'>
            <h3 className='text-lg font-bold mb-4'>Marcar Boleto como Pago</h3>
            <p className='text-sm text-gray-500 mb-4'>
              Informe a autenticação bancária para confirmar o pagamento do boleto.
            </p>
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>Autenticação Bancária *</label>
              <input
                type='text'
                value={bankAuth}
                onChange={e => setBankAuth(e.target.value)}
                placeholder='Ex: 12345678901234567890'
                className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
              />
            </div>
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => {
                  setShowActionModal(null)
                  setBankAuth('')
                }}
                className='px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={actionLoading || !bankAuth.trim()}
                className='px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2'
              >
                {actionLoading && <Loader2 className='w-4 h-4 animate-spin' />}
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal - Reject */}
      {showActionModal === 'reject' && selectedPayment && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6'>
            <h3 className='text-lg font-bold mb-4'>Rejeitar Pagamento</h3>
            <p className='text-sm text-gray-500 mb-4'>Informe o motivo da rejeição.</p>
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>Motivo da Rejeição *</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder='Ex: Boleto vencido, dados incorretos, etc.'
                rows={3}
                className='w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
              />
            </div>
            {selectedPayment.status === 'CRYPTO_DEBITED' && (
              <div className='mb-4'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={refundCrypto}
                    onChange={e => setRefundCrypto(e.target.checked)}
                    className='w-4 h-4 rounded border-gray-300'
                  />
                  <span className='text-sm'>
                    Reembolsar crypto ao usuário ({formatCrypto(selectedPayment.crypto_amount)}{' '}
                    {selectedPayment.crypto_currency})
                  </span>
                </label>
              </div>
            )}
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => {
                  setShowActionModal(null)
                  setRejectReason('')
                }}
                className='px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2'
              >
                {actionLoading && <Loader2 className='w-4 h-4 animate-spin' />}
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto'>
          <div className='bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full my-8'>
            {/* Modal Header */}
            <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-bold'>Detalhes do Pagamento</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className='p-6 space-y-6 max-h-[70vh] overflow-y-auto'>
              {/* Status */}
              <div className='flex items-center justify-between'>
                <div>
                  <span className='text-sm text-gray-500'>Número do Pagamento</span>
                  <div className='font-mono text-lg font-bold text-purple-600'>
                    #{selectedPayment.payment_number}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusConfig(selectedPayment.status).bgClass}`}
                >
                  {getStatusConfig(selectedPayment.status).icon}
                  {getStatusConfig(selectedPayment.status).label}
                </span>
              </div>

              {/* User Info */}
              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4'>
                <h4 className='font-semibold mb-3 flex items-center gap-2'>
                  <User className='w-4 h-4' />
                  Usuário
                </h4>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='text-gray-500'>Nome:</span>
                    <div className='font-medium'>{selectedPayment.user_name || '-'}</div>
                  </div>
                  <div>
                    <span className='text-gray-500'>Email:</span>
                    <div className='font-medium'>{selectedPayment.user_email || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Bill Info */}
              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4'>
                <h4 className='font-semibold mb-3 flex items-center gap-2'>
                  <FileText className='w-4 h-4' />
                  Dados do Boleto
                </h4>
                <div className='space-y-3 text-sm'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <span className='text-gray-500'>Valor:</span>
                      <div className='text-lg font-bold'>
                        {formatBRL(selectedPayment.bill_amount_brl)}
                      </div>
                    </div>
                    <div>
                      <span className='text-gray-500'>Vencimento:</span>
                      <div
                        className={`font-medium ${selectedPayment.is_overdue ? 'text-red-500' : ''}`}
                      >
                        {selectedPayment.bill_due_date}
                        {selectedPayment.is_overdue && ' (Vencido)'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className='text-gray-500'>Beneficiário:</span>
                    <div className='font-medium'>
                      {selectedPayment.bill_beneficiary_name || '-'}
                    </div>
                    {selectedPayment.bill_beneficiary_document && (
                      <div className='text-xs text-gray-500'>
                        Doc: {selectedPayment.bill_beneficiary_document}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className='text-gray-500'>Banco:</span>
                    <div className='font-medium'>
                      {selectedPayment.bill_bank_name || '-'}
                      {selectedPayment.bill_bank_code && ` (${selectedPayment.bill_bank_code})`}
                    </div>
                  </div>
                  <div>
                    <span className='text-gray-500'>Código de Barras:</span>
                    <div className='flex items-center gap-2'>
                      <code className='text-xs font-mono bg-white dark:bg-gray-600 px-2 py-1 rounded flex-1 truncate'>
                        {selectedPayment.barcode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(selectedPayment.barcode)}
                        className='p-1 hover:bg-gray-200 dark:hover:bg-gray-500 rounded'
                      >
                        <Copy className='w-4 h-4' />
                      </button>
                    </div>
                  </div>
                  {selectedPayment.digitable_line && (
                    <div>
                      <span className='text-gray-500'>Linha Digitável:</span>
                      <div className='flex items-center gap-2'>
                        <code className='text-xs font-mono bg-white dark:bg-gray-600 px-2 py-1 rounded flex-1 truncate'>
                          {selectedPayment.digitable_line}
                        </code>
                        <button
                          onClick={() => copyToClipboard(selectedPayment.digitable_line!)}
                          className='p-1 hover:bg-gray-200 dark:hover:bg-gray-500 rounded'
                        >
                          <Copy className='w-4 h-4' />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Crypto Info */}
              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4'>
                <h4 className='font-semibold mb-3 flex items-center gap-2'>
                  <DollarSign className='w-4 h-4' />
                  Crypto
                </h4>
                <div className='space-y-3 text-sm'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <span className='text-gray-500'>Moeda:</span>
                      <div className='flex items-center gap-2'>
                        {CRYPTO_LOGOS[selectedPayment.crypto_currency?.toUpperCase()] && (
                          <img
                            src={CRYPTO_LOGOS[selectedPayment.crypto_currency.toUpperCase()]}
                            className='w-5 h-5'
                            alt=''
                          />
                        )}
                        <span className='font-medium'>
                          {selectedPayment.crypto_currency}
                          {selectedPayment.crypto_network && ` (${selectedPayment.crypto_network})`}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className='text-gray-500'>Valor:</span>
                      <div className='text-lg font-bold'>
                        {formatCrypto(selectedPayment.crypto_amount)}
                      </div>
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <span className='text-gray-500'>Taxa Crypto/USD:</span>
                      <div className='font-medium'>
                        ${selectedPayment.crypto_usd_rate?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className='text-gray-500'>Taxa BRL/USD:</span>
                      <div className='font-medium'>
                        R$ {selectedPayment.brl_usd_rate?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {selectedPayment.crypto_tx_hash && (
                    <div>
                      <span className='text-gray-500'>TX Hash:</span>
                      <div className='flex items-center gap-2'>
                        <code className='text-xs font-mono bg-green-100 dark:bg-green-500/20 text-green-600 px-2 py-1 rounded flex-1 truncate'>
                          {selectedPayment.crypto_tx_hash}
                        </code>
                        {getExplorerUrl(
                          selectedPayment.crypto_network,
                          selectedPayment.crypto_tx_hash
                        ) && (
                          <a
                            href={
                              getExplorerUrl(
                                selectedPayment.crypto_network,
                                selectedPayment.crypto_tx_hash
                              )!
                            }
                            target='_blank'
                            rel='noopener noreferrer'
                            className='p-1 hover:bg-green-100 dark:hover:bg-green-500/20 rounded'
                          >
                            <ExternalLink className='w-4 h-4 text-green-600' />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fees */}
              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4'>
                <h4 className='font-semibold mb-3'>Taxas</h4>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Valor Base:</span>
                    <span>{formatBRL(selectedPayment.base_amount_brl)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>
                      Taxa de Serviço ({selectedPayment.service_fee_percent}%):
                    </span>
                    <span>{formatBRL(selectedPayment.service_fee_brl)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>
                      Taxa de Rede ({selectedPayment.network_fee_percent}%):
                    </span>
                    <span>{formatBRL(selectedPayment.network_fee_brl)}</span>
                  </div>
                  <div className='flex justify-between font-bold border-t pt-2'>
                    <span>Total:</span>
                    <span>{formatBRL(selectedPayment.total_amount_brl)}</span>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4'>
                <h4 className='font-semibold mb-3 flex items-center gap-2'>
                  <Calendar className='w-4 h-4' />
                  Datas
                </h4>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='text-gray-500'>Criado em:</span>
                    <div className='font-medium'>{formatDate(selectedPayment.created_at)}</div>
                  </div>
                  {selectedPayment.crypto_debited_at && (
                    <div>
                      <span className='text-gray-500'>Crypto Debitada:</span>
                      <div className='font-medium'>
                        {formatDate(selectedPayment.crypto_debited_at)}
                      </div>
                    </div>
                  )}
                  {selectedPayment.paid_at && (
                    <div>
                      <span className='text-gray-500'>Pago em:</span>
                      <div className='font-medium text-green-600'>
                        {formatDate(selectedPayment.paid_at)}
                      </div>
                    </div>
                  )}
                  {selectedPayment.refunded_at && (
                    <div>
                      <span className='text-gray-500'>Reembolsado em:</span>
                      <div className='font-medium text-orange-600'>
                        {formatDate(selectedPayment.refunded_at)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              {selectedPayment.bank_authentication && (
                <div className='bg-green-50 dark:bg-green-500/10 rounded-lg p-4'>
                  <h4 className='font-semibold mb-3 text-green-600'>Pagamento Realizado</h4>
                  <div className='space-y-2 text-sm'>
                    <div>
                      <span className='text-gray-500'>Autenticação:</span>
                      <div className='font-mono font-medium'>
                        {selectedPayment.bank_authentication}
                      </div>
                    </div>
                    {selectedPayment.paid_by_operator_name && (
                      <div>
                        <span className='text-gray-500'>Pago por:</span>
                        <div className='font-medium'>{selectedPayment.paid_by_operator_name}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Failure Info */}
              {selectedPayment.failure_reason && (
                <div className='bg-red-50 dark:bg-red-500/10 rounded-lg p-4'>
                  <h4 className='font-semibold mb-2 text-red-600 flex items-center gap-2'>
                    <AlertTriangle className='w-4 h-4' />
                    Motivo da Falha
                  </h4>
                  <p className='text-sm text-red-600'>{selectedPayment.failure_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBillPaymentPage
