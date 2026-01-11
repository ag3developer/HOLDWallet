/**
 * WolkPay Admin Page
 * ==================
 *
 * Pagina principal de administracao do WolkPay.
 * Lista faturas pendentes e permite gestao.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard,
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
  FileText,
  ShieldCheck,
  Ban,
} from 'lucide-react'
import {
  getPendingInvoices,
  getAllInvoices,
  type WolkPayInvoiceListItem,
  type WolkPayPendingResponse,
  type WolkPayAllResponse,
} from '@/services/admin/adminWolkpay'
import { toast } from 'react-hot-toast'

// Crypto logos
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  POL: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
}

const getCryptoLogo = (symbol?: string) => {
  if (!symbol) return null
  return CRYPTO_LOGOS[symbol.toUpperCase()] || null
}

// Status colors and labels
const STATUS_CONFIG: Record<string, { label: string; bgClass: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'Pendente',
    bgClass: 'bg-gray-500/20 text-gray-400',
    icon: <Clock className='w-3 h-3' />,
  },
  AWAITING_PAYMENT: {
    label: 'Aguardando PIX',
    bgClass: 'bg-yellow-500/20 text-yellow-400',
    icon: <Clock className='w-3 h-3' />,
  },
  PAID: {
    label: 'Pago - Aguardando Aprovacao',
    bgClass: 'bg-blue-500/20 text-blue-400',
    icon: <ShieldCheck className='w-3 h-3' />,
  },
  APPROVED: {
    label: 'Aprovado',
    bgClass: 'bg-emerald-500/20 text-emerald-400',
    icon: <CheckCircle className='w-3 h-3' />,
  },
  COMPLETED: {
    label: 'Concluido',
    bgClass: 'bg-green-500/20 text-green-400',
    icon: <CheckCircle className='w-3 h-3' />,
  },
  EXPIRED: {
    label: 'Expirado',
    bgClass: 'bg-gray-500/20 text-gray-400',
    icon: <XCircle className='w-3 h-3' />,
  },
  CANCELLED: {
    label: 'Cancelado',
    bgClass: 'bg-red-500/20 text-red-400',
    icon: <XCircle className='w-3 h-3' />,
  },
  REJECTED: {
    label: 'Rejeitado',
    bgClass: 'bg-red-500/20 text-red-400',
    icon: <Ban className='w-3 h-3' />,
  },
}

const getStatusConfig = (status: string) => {
  return (
    STATUS_CONFIG[status.toUpperCase()] || {
      label: status,
      bgClass: 'bg-gray-500/20 text-gray-400',
      icon: null,
    }
  )
}

// Format currency
const formatBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Format crypto amount
const formatCrypto = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '0.00'
  const numAmount = Number(amount)
  if (Number.isNaN(numAmount)) return '0.00'
  if (numAmount >= 1000) return numAmount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  if (numAmount >= 1) return numAmount.toFixed(4)
  return numAmount.toFixed(8)
}

// Format relative date
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

export const AdminWolkPayPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [pendingData, setPendingData] = useState<WolkPayPendingResponse | null>(null)
  const [allData, setAllData] = useState<WolkPayAllResponse | null>(null)
  const [viewMode, setViewMode] = useState<'pending' | 'all'>('all')

  const perPage = 20

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch data
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      // Sempre buscar estatisticas (do endpoint pending)
      const pendingStats = await getPendingInvoices(1, 1)
      setPendingData(pendingStats)

      if (viewMode === 'pending') {
        // Ja buscou acima, agora busca com paginacao correta
        const data = await getPendingInvoices(page, perPage)
        setPendingData(data)
      } else {
        const params: { status?: string; page: number; per_page: number } = {
          page,
          per_page: perPage,
        }
        if (statusFilter !== 'all') {
          params.status = statusFilter
        }
        const data = await getAllInvoices(params)
        setAllData(data)
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      toast.error(err.response?.data?.detail || 'Erro ao carregar faturas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, viewMode, statusFilter])

  // Stats from pending data
  const stats = useMemo(() => {
    if (pendingData) {
      return {
        total: pendingData.total_count || 0,
        pending: pendingData.pending_count || 0,
        paid: pendingData.paid_count || 0,
        approved: pendingData.approved_count || 0,
      }
    }
    return { total: 0, pending: 0, paid: 0, approved: 0 }
  }, [pendingData])

  // Filter invoices by search (client-side for now)
  const filteredInvoices = useMemo(() => {
    if (viewMode === 'pending') {
      const invoices = pendingData?.invoices || []
      if (!debouncedSearch) return invoices
      const searchLower = debouncedSearch.toLowerCase()
      return invoices.filter(item => {
        const payerName = item.payer?.full_name || item.payer?.company_name || ''
        const invoiceNumber = item.invoice?.invoice_number || ''
        return (
          payerName.toLowerCase().includes(searchLower) ||
          invoiceNumber.toLowerCase().includes(searchLower)
        )
      })
    } else {
      const invoices = allData?.invoices || []
      if (!debouncedSearch) return invoices
      const searchLower = debouncedSearch.toLowerCase()
      return invoices.filter(item => {
        return (
          (item.payer_name || '').toLowerCase().includes(searchLower) ||
          (item.invoice_number || '').toLowerCase().includes(searchLower) ||
          (item.beneficiary_name || '').toLowerCase().includes(searchLower)
        )
      })
    }
  }, [viewMode, pendingData, allData, debouncedSearch])

  const total = viewMode === 'pending' ? pendingData?.total || 0 : allData?.total || 0
  const totalPages = Math.ceil(total / perPage)

  // Stats cards
  const statsCards = [
    {
      id: 'total',
      label: 'Total de Faturas',
      value: stats.total,
      icon: <FileText className='w-5 h-5' />,
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'awaiting',
      label: 'Aguardando Aprovacao',
      value: stats.paid,
      icon: <ShieldCheck className='w-5 h-5' />,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'pending',
      label: 'Em Andamento',
      value: stats.pending,
      icon: <Clock className='w-5 h-5' />,
      color: 'from-yellow-500 to-orange-600',
    },
    {
      id: 'approved',
      label: 'Concluidas',
      value: stats.approved,
      icon: <CheckCircle className='w-5 h-5' />,
      color: 'from-emerald-500 to-green-600',
    },
  ]

  return (
    <div className='space-y-4 p-4'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center'>
            <CreditCard className='w-6 h-6 text-white' />
          </div>
          <div>
            <h1 className='text-xl font-bold text-white'>WolkPay Admin</h1>
            <p className='text-xs text-gray-400'>Gestao de faturas e pagamentos</p>
          </div>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className='flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors'
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {statsCards.map(stat => (
          <div key={stat.id} className='bg-gray-800/50 rounded-xl p-4 border border-gray-700/50'>
            <div className='flex items-center justify-between mb-2'>
              <div
                className={`w-9 h-9 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}
              >
                {stat.icon}
              </div>
              <span className='text-2xl font-bold text-white'>{stat.value}</span>
            </div>
            <p className='text-xs text-gray-400'>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* View Mode Toggle */}
      <div className='flex gap-2'>
        <button
          onClick={() => {
            setViewMode('pending')
            setPage(1)
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'pending'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <span className='flex items-center gap-2'>
            <ShieldCheck className='w-4 h-4' />
            Aguardando Aprovacao ({stats.paid})
          </span>
        </button>
        <button
          onClick={() => {
            setViewMode('all')
            setPage(1)
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <span className='flex items-center gap-2'>
            <FileText className='w-4 h-4' />
            Todas as Faturas
          </span>
        </button>
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row gap-3'>
        {/* Search */}
        <div className='flex-1 relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' />
          <input
            type='text'
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder='Buscar por numero, pagador, beneficiario...'
            className='w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50'
          />
        </div>

        {/* Status Filter (only for "all" view) */}
        {viewMode === 'all' && (
          <div className='flex gap-2'>
            <button
              onClick={() => setShowFilters(!showFilters)}
              title='Filtros'
              className={`px-4 py-2.5 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Filter className='w-4 h-4' />
            </button>

            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              title='Filtrar por status'
              className='px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50'
            >
              <option value='all'>Todos os Status</option>
              <option value='PENDING'>Pendente</option>
              <option value='AWAITING_PAYMENT'>Aguardando PIX</option>
              <option value='PAID'>Pago</option>
              <option value='APPROVED'>Aprovado</option>
              <option value='COMPLETED'>Concluido</option>
              <option value='EXPIRED'>Expirado</option>
              <option value='CANCELLED'>Cancelado</option>
              <option value='REJECTED'>Rejeitado</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className='bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden'>
        {loading ? (
          <div className='p-8 flex justify-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500' />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className='p-8 text-center'>
            <FileText className='w-12 h-12 text-gray-600 mx-auto mb-4' />
            <p className='text-gray-400'>Nenhuma fatura encontrada</p>
            {debouncedSearch && (
              <p className='text-gray-500 text-sm mt-2'>Tente ajustar sua busca</p>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className='hidden md:block overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-700/50'>
                    <th className='text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase'>
                      Fatura
                    </th>
                    <th className='text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase'>
                      Pagador
                    </th>
                    <th className='text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase'>
                      Beneficiario
                    </th>
                    <th className='text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase'>
                      Crypto
                    </th>
                    <th className='text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase'>
                      Valor BRL
                    </th>
                    <th className='text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase'>
                      Status
                    </th>
                    <th className='text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase'>
                      Criado
                    </th>
                    <th className='text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase'>
                      Acao
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-700/30'>
                  {viewMode === 'pending'
                    ? (filteredInvoices as WolkPayInvoiceListItem[]).map(item => {
                        const invoice = item.invoice
                        const payer = item.payer
                        const statusConfig = getStatusConfig(invoice.status)
                        const cryptoLogo = getCryptoLogo(invoice.crypto_currency)

                        return (
                          <tr
                            key={invoice.id}
                            className='hover:bg-gray-700/30 cursor-pointer transition-colors'
                            onClick={() => navigate(`/admin/wolkpay/${invoice.id}`)}
                          >
                            <td className='py-3 px-4'>
                              <div className='flex items-center gap-2'>
                                <FileText className='w-4 h-4 text-gray-500' />
                                <span className='font-mono text-sm text-white'>
                                  {invoice.invoice_number}
                                </span>
                              </div>
                            </td>
                            <td className='py-3 px-4'>
                              <div className='flex items-center gap-2'>
                                {payer?.person_type === 'PJ' ? (
                                  <Building className='w-4 h-4 text-gray-500' />
                                ) : (
                                  <User className='w-4 h-4 text-gray-500' />
                                )}
                                <span className='text-sm text-gray-300'>
                                  {payer?.full_name || payer?.company_name || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className='py-3 px-4'>
                              <span className='text-sm text-gray-300'>
                                {invoice.beneficiary_name}
                              </span>
                            </td>
                            <td className='py-3 px-4 text-right'>
                              <div className='flex items-center justify-end gap-2'>
                                {cryptoLogo && (
                                  <img
                                    src={cryptoLogo}
                                    alt={invoice.crypto_currency}
                                    className='w-4 h-4'
                                  />
                                )}
                                <span className='font-mono text-sm text-white'>
                                  {formatCrypto(invoice.crypto_amount)} {invoice.crypto_currency}
                                </span>
                              </div>
                            </td>
                            <td className='py-3 px-4 text-right'>
                              <span className='font-mono text-sm text-emerald-400'>
                                {formatBRL(invoice.total_amount_brl)}
                              </span>
                            </td>
                            <td className='py-3 px-4'>
                              <div className='flex justify-center'>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass}`}
                                >
                                  {statusConfig.icon}
                                  {statusConfig.label}
                                </span>
                              </div>
                            </td>
                            <td className='py-3 px-4 text-center'>
                              <span className='text-xs text-gray-400'>
                                {formatRelativeDate(invoice.created_at)}
                              </span>
                            </td>
                            <td className='py-3 px-4'>
                              <div className='flex justify-center'>
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    navigate(`/admin/wolkpay/${invoice.id}`)
                                  }}
                                  title='Ver detalhes'
                                  className='p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-purple-400 transition-colors'
                                >
                                  <Eye className='w-4 h-4' />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    : (
                        filteredInvoices as Array<{
                          id: string
                          invoice_number: string
                          status: string
                          beneficiary_name: string
                          payer_name: string
                          crypto_currency: string
                          crypto_amount: number
                          total_amount_brl: number
                          created_at: string
                        }>
                      ).map(invoice => {
                        const statusConfig = getStatusConfig(invoice.status)
                        const cryptoLogo = getCryptoLogo(invoice.crypto_currency)

                        return (
                          <tr
                            key={invoice.id}
                            className='hover:bg-gray-700/30 cursor-pointer transition-colors'
                            onClick={() => navigate(`/admin/wolkpay/${invoice.id}`)}
                          >
                            <td className='py-3 px-4'>
                              <div className='flex items-center gap-2'>
                                <FileText className='w-4 h-4 text-gray-500' />
                                <span className='font-mono text-sm text-white'>
                                  {invoice.invoice_number}
                                </span>
                              </div>
                            </td>
                            <td className='py-3 px-4'>
                              <span className='text-sm text-gray-300'>{invoice.payer_name}</span>
                            </td>
                            <td className='py-3 px-4'>
                              <span className='text-sm text-gray-300'>
                                {invoice.beneficiary_name}
                              </span>
                            </td>
                            <td className='py-3 px-4 text-right'>
                              <div className='flex items-center justify-end gap-2'>
                                {cryptoLogo && (
                                  <img
                                    src={cryptoLogo}
                                    alt={invoice.crypto_currency}
                                    className='w-4 h-4'
                                  />
                                )}
                                <span className='font-mono text-sm text-white'>
                                  {formatCrypto(invoice.crypto_amount)} {invoice.crypto_currency}
                                </span>
                              </div>
                            </td>
                            <td className='py-3 px-4 text-right'>
                              <span className='font-mono text-sm text-emerald-400'>
                                {formatBRL(invoice.total_amount_brl)}
                              </span>
                            </td>
                            <td className='py-3 px-4'>
                              <div className='flex justify-center'>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass}`}
                                >
                                  {statusConfig.icon}
                                  {statusConfig.label}
                                </span>
                              </div>
                            </td>
                            <td className='py-3 px-4 text-center'>
                              <span className='text-xs text-gray-400'>
                                {formatRelativeDate(invoice.created_at)}
                              </span>
                            </td>
                            <td className='py-3 px-4'>
                              <div className='flex justify-center'>
                                <button
                                  onClick={e => {
                                    e.stopPropagation()
                                    navigate(`/admin/wolkpay/${invoice.id}`)
                                  }}
                                  title='Ver detalhes'
                                  className='p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-purple-400 transition-colors'
                                >
                                  <Eye className='w-4 h-4' />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className='md:hidden divide-y divide-gray-700/30'>
              {viewMode === 'pending'
                ? (filteredInvoices as WolkPayInvoiceListItem[]).map(item => {
                    const invoice = item.invoice
                    const payer = item.payer
                    const statusConfig = getStatusConfig(invoice.status)
                    const cryptoLogo = getCryptoLogo(invoice.crypto_currency)

                    return (
                      <button
                        key={invoice.id}
                        type='button'
                        className='w-full p-4 hover:bg-gray-700/30 cursor-pointer transition-colors text-left'
                        onClick={() => navigate(`/admin/wolkpay/${invoice.id}`)}
                      >
                        <div className='flex items-start justify-between mb-3'>
                          <div>
                            <span className='font-mono text-sm text-white'>
                              {invoice.invoice_number}
                            </span>
                            <p className='text-xs text-gray-400 mt-1'>
                              {payer?.full_name || payer?.company_name || 'N/A'}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass}`}
                          >
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            {cryptoLogo && (
                              <img
                                src={cryptoLogo}
                                alt={invoice.crypto_currency}
                                className='w-4 h-4'
                              />
                            )}
                            <span className='font-mono text-sm text-white'>
                              {formatCrypto(invoice.crypto_amount)} {invoice.crypto_currency}
                            </span>
                          </div>
                          <span className='font-mono text-sm text-emerald-400'>
                            {formatBRL(invoice.total_amount_brl)}
                          </span>
                        </div>
                        <div className='flex items-center justify-between mt-2 pt-2 border-t border-gray-700/30'>
                          <span className='text-xs text-gray-500'>
                            Para: {invoice.beneficiary_name}
                          </span>
                          <span className='text-xs text-gray-500'>
                            {formatRelativeDate(invoice.created_at)}
                          </span>
                        </div>
                      </button>
                    )
                  })
                : (
                    filteredInvoices as Array<{
                      id: string
                      invoice_number: string
                      status: string
                      beneficiary_name: string
                      payer_name: string
                      crypto_currency: string
                      crypto_amount: number
                      total_amount_brl: number
                      created_at: string
                    }>
                  ).map(invoice => {
                    const statusConfig = getStatusConfig(invoice.status)
                    const cryptoLogo = getCryptoLogo(invoice.crypto_currency)

                    return (
                      <button
                        key={invoice.id}
                        type='button'
                        className='w-full p-4 hover:bg-gray-700/30 cursor-pointer transition-colors text-left'
                        onClick={() => navigate(`/admin/wolkpay/${invoice.id}`)}
                      >
                        <div className='flex items-start justify-between mb-3'>
                          <div>
                            <span className='font-mono text-sm text-white'>
                              {invoice.invoice_number}
                            </span>
                            <p className='text-xs text-gray-400 mt-1'>{invoice.payer_name}</p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass}`}
                          >
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            {cryptoLogo && (
                              <img
                                src={cryptoLogo}
                                alt={invoice.crypto_currency}
                                className='w-4 h-4'
                              />
                            )}
                            <span className='font-mono text-sm text-white'>
                              {formatCrypto(invoice.crypto_amount)} {invoice.crypto_currency}
                            </span>
                          </div>
                          <span className='font-mono text-sm text-emerald-400'>
                            {formatBRL(invoice.total_amount_brl)}
                          </span>
                        </div>
                        <div className='flex items-center justify-between mt-2 pt-2 border-t border-gray-700/30'>
                          <span className='text-xs text-gray-500'>
                            Para: {invoice.beneficiary_name}
                          </span>
                          <span className='text-xs text-gray-500'>
                            {formatRelativeDate(invoice.created_at)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between px-4 py-3 bg-gray-800/50 rounded-xl border border-gray-700/50'>
          <span className='text-sm text-gray-400'>
            Pagina {page} de {totalPages} ({total} faturas)
          </span>
          <div className='flex gap-2'>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              title='Pagina anterior'
              className='p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors'
            >
              <ChevronLeft className='w-4 h-4 text-white' />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              title='Proxima pagina'
              className='p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors'
            >
              <ChevronRight className='w-4 h-4 text-white' />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
