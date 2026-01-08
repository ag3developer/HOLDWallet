/**
 * 🛡️ HOLD Wallet - Admin Trades Page
 * ===================================
 *
 * Página de gestão de trades OTC.
 * Design moderno, responsivo e compacto para todos os dispositivos.
 * Usa React Query para cache de dados.
 */

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  XCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  AlertTriangle,
  DollarSign,
  Wallet,
  User,
  Hash,
} from 'lucide-react'
import { useTradeStats, useTrades, useCancelTrade } from '@/hooks/admin/useAdminTrades'
import { type Trade } from '@/services/admin/adminService'
import { toast } from 'react-hot-toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { InputModal } from '@/components/ui/InputModal'

// Mapeamento de logos das criptomoedas
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
  ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
  USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  MATIC: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  POL: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
  XRP: 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
  ADA: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
  DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
  DOT: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png',
  AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  LTC: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png',
  LINK: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
  UNI: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
  ATOM: 'https://cryptologos.cc/logos/cosmos-atom-logo.png',
  XLM: 'https://cryptologos.cc/logos/stellar-xlm-logo.png',
}

// Função para obter logo da crypto
const getCryptoLogo = (symbol?: string) => {
  if (!symbol) return null
  return CRYPTO_LOGOS[symbol.toUpperCase()] || null
}

// Função para gerar ID WolkNow do usuário (mesmo formato do Sidebar)
const formatUserWNId = (userId?: string) => {
  if (!userId) return 'WN00000'
  // Remove todos os caracteres não-numéricos e pega os primeiros 5 dígitos
  const numericId = String(userId).replaceAll(/\D/g, '').substring(0, 5) || '00000'
  return `WN${numericId}`
}

export const AdminTradesPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const limit = 20

  // Modal states
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1)
  }, [statusFilter, typeFilter])

  // Parâmetros para query
  const queryParams = useMemo(() => {
    const params: {
      skip: number
      limit: number
      status?: string
      operation_type?: string
      search?: string
    } = {
      skip: (page - 1) * limit,
      limit,
    }

    if (statusFilter !== 'all') {
      params.status = statusFilter
    }

    if (typeFilter !== 'all') {
      params.operation_type = typeFilter
    }

    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim()
    }

    return params
  }, [page, statusFilter, typeFilter, debouncedSearch])

  // Queries com cache
  const { data: stats } = useTradeStats()
  const { data: tradesData, isLoading: loading, refetch, isFetching } = useTrades(queryParams)

  // Mutation
  const cancelTradeMutation = useCancelTrade()

  const trades = tradesData?.items ?? []
  const total = tradesData?.total ?? 0

  const handleCancelTrade = (trade: Trade) => {
    setSelectedTrade(trade)
    setConfirmModalOpen(true)
  }

  const handleConfirmCancel = () => {
    setConfirmModalOpen(false)
    setCancelModalOpen(true)
  }

  const handleCancelWithReason = async (reason: string) => {
    if (!selectedTrade) return

    setCancelModalOpen(false)

    try {
      await cancelTradeMutation.mutateAsync({
        tradeId: selectedTrade.id,
        ...(reason ? { reason } : {}),
      })
      toast.success(`Trade ${selectedTrade.reference_code} cancelado com sucesso`)
    } catch (err: any) {
      console.error('Erro ao cancelar trade:', err)
      toast.error(err.response?.data?.detail || 'Erro ao cancelar trade')
    } finally {
      setSelectedTrade(null)
    }
  }

  const formatCurrency = (value: number, currency: string = 'USD') => {
    if (currency === 'BRL') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='w-3 h-3' />
      case 'pending':
      case 'payment_processing':
        return <Clock className='w-3 h-3' />
      case 'cancelled':
      case 'expired':
        return <XCircle className='w-3 h-3' />
      case 'failed':
        return <AlertTriangle className='w-3 h-3' />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído'
      case 'pending':
        return 'Pendente'
      case 'payment_processing':
        return 'Processando'
      case 'cancelled':
        return 'Cancelado'
      case 'expired':
        return 'Expirado'
      case 'failed':
        return 'Falhou'
      default:
        return status
    }
  }

  const canCancel = (status: string) => {
    return status === 'pending' || status === 'payment_processing'
  }

  // Formatar data relativa
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

  // Formatar quantidade de crypto
  const formatCryptoAmount = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '0.00'
    const numAmount = Number(amount)
    if (Number.isNaN(numAmount)) return '0.00'
    if (numAmount >= 1000) return numAmount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
    if (numAmount >= 1) return numAmount.toFixed(4)
    return numAmount.toFixed(8)
  }

  // Obter classe de cor do status (background)
  const getStatusBgClass = (status: string) => {
    if (status === 'completed')
      return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
    if (status === 'pending' || status === 'payment_processing')
      return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
    if (status === 'cancelled' || status === 'expired')
      return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
    return 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400'
  }

  // Obter classe de cor do status (texto)
  const getStatusTextClass = (status: string) => {
    if (status === 'completed') return 'text-green-600 dark:text-green-400'
    if (status === 'pending' || status === 'payment_processing')
      return 'text-yellow-600 dark:text-yellow-400'
    if (status === 'cancelled' || status === 'expired') return 'text-red-600 dark:text-red-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-3 sm:p-4 lg:p-6 space-y-4'>
      {/* Header Compacto */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-500/20 dark:to-emerald-500/20 border border-green-500/20'>
            <TrendingUp className='h-5 w-5 text-green-600 dark:text-green-400' />
          </div>
          <div>
            <h1 className='text-lg sm:text-xl font-bold text-gray-900 dark:text-white'>
              Trades OTC
            </h1>
            <p className='text-gray-500 dark:text-gray-500 text-xs sm:text-sm'>
              Compra e venda de criptomoedas
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className='flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white border border-gray-200 dark:border-white/10 transition-all text-sm disabled:opacity-50'
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          <span className='hidden sm:inline'>Atualizar</span>
        </button>
      </div>

      {/* Stats Cards - Grid Responsivo */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3'>
        {/* Total */}
        <div className='bg-white dark:bg-gradient-to-br dark:from-[#111] dark:to-[#0d0d0d] border border-gray-200 dark:border-white/5 rounded-xl p-3 sm:p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-2'>
            <TrendingUp className='h-4 w-4 text-gray-400 dark:text-gray-500' />
          </div>
          <div className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white'>
            {stats?.total_trades || 0}
          </div>
          <p className='text-[10px] sm:text-xs text-gray-500 mt-1'>Total</p>
        </div>

        {/* Concluídos */}
        <div className='bg-white dark:bg-gradient-to-br dark:from-[#111] dark:to-[#0d0d0d] border border-green-200 dark:border-green-500/10 rounded-xl p-3 sm:p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-2'>
            <CheckCircle className='h-4 w-4 text-green-500 dark:text-green-500/70' />
          </div>
          <div className='text-xl sm:text-2xl font-bold text-green-600 dark:text-green-500'>
            {stats?.completed || 0}
          </div>
          <p className='text-[10px] sm:text-xs text-gray-500 mt-1'>Concluídos</p>
        </div>

        {/* Pendentes */}
        <div className='bg-white dark:bg-gradient-to-br dark:from-[#111] dark:to-[#0d0d0d] border border-yellow-200 dark:border-yellow-500/10 rounded-xl p-3 sm:p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-2'>
            <Clock className='h-4 w-4 text-yellow-500 dark:text-yellow-500/70' />
            {(stats?.pending || 0) > 0 && (
              <span className='flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-2 w-2 bg-yellow-500'></span>
              </span>
            )}
          </div>
          <div className='text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-500'>
            {stats?.pending || 0}
          </div>
          <p className='text-[10px] sm:text-xs text-gray-500 mt-1'>Pendentes</p>
        </div>

        {/* Cancelados */}
        <div className='bg-white dark:bg-gradient-to-br dark:from-[#111] dark:to-[#0d0d0d] border border-red-200 dark:border-red-500/10 rounded-xl p-3 sm:p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-2'>
            <XCircle className='h-4 w-4 text-red-500 dark:text-red-500/70' />
          </div>
          <div className='text-xl sm:text-2xl font-bold text-red-600 dark:text-red-500'>
            {stats?.cancelled || 0}
          </div>
          <p className='text-[10px] sm:text-xs text-gray-500 mt-1'>Cancelados</p>
        </div>

        {/* Volume */}
        <div className='col-span-2 sm:col-span-1 bg-white dark:bg-gradient-to-br dark:from-[#111] dark:to-[#0d0d0d] border border-purple-200 dark:border-purple-500/10 rounded-xl p-3 sm:p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-2'>
            <DollarSign className='h-4 w-4 text-purple-500 dark:text-purple-500/70' />
          </div>
          <div className='text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-500 truncate'>
            {formatCurrency(stats?.total_volume_brl || 0, 'BRL')}
          </div>
          <p className='text-[10px] sm:text-xs text-gray-500 mt-1'>Volume Total</p>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-xl p-3 shadow-sm'>
        <div className='flex flex-col sm:flex-row gap-2'>
          {/* Search */}
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500' />
            <input
              type='text'
              placeholder='Buscar código, usuário...'
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className='w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500/50'
            />
          </div>

          {/* Filtros Desktop */}
          <div className='hidden sm:flex gap-2'>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              title='Filtrar por status'
              aria-label='Filtrar por status'
              className='px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 cursor-pointer'
            >
              <option value='all'>Status</option>
              <option value='pending'>Pendente</option>
              <option value='payment_processing'>Processando</option>
              <option value='completed'>Concluído</option>
              <option value='cancelled'>Cancelado</option>
              <option value='failed'>Falhou</option>
              <option value='expired'>Expirado</option>
            </select>

            {/* Botões de Tipo */}
            <div className='flex gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-1'>
              <button
                onClick={() => {
                  setTypeFilter('all')
                  setPage(1)
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => {
                  setTypeFilter('buy')
                  setPage(1)
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === 'buy'
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                }`}
              >
                Compra
              </button>
              <button
                onClick={() => {
                  setTypeFilter('sell')
                  setPage(1)
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === 'sell'
                    ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                }`}
              >
                Venda
              </button>
            </div>
          </div>

          {/* Filtros Mobile Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className='sm:hidden flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400'
          >
            <Filter className='h-4 w-4' />
            Filtros
          </button>
        </div>

        {/* Filtros Mobile Expandidos */}
        {showFilters && (
          <div className='flex flex-col gap-2 mt-2 sm:hidden'>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              title='Filtrar por status'
              aria-label='Filtrar por status'
              className='w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm'
            >
              <option value='all'>Todos Status</option>
              <option value='pending'>Pendente</option>
              <option value='payment_processing'>Processando</option>
              <option value='completed'>Concluído</option>
              <option value='cancelled'>Cancelado</option>
              <option value='failed'>Falhou</option>
              <option value='expired'>Expirado</option>
            </select>

            <div className='flex gap-1 bg-gray-100 dark:bg-white/5 rounded-lg p-1'>
              <button
                onClick={() => {
                  setTypeFilter('all')
                  setPage(1)
                }}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => {
                  setTypeFilter('buy')
                  setPage(1)
                }}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === 'buy'
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Compra
              </button>
              <button
                onClick={() => {
                  setTypeFilter('sell')
                  setPage(1)
                }}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === 'sell'
                    ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Venda
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Trades - Cards Mobile / Tabela Desktop */}
      <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden shadow-sm'>
        {loading && (
          <div className='flex flex-col items-center justify-center py-12'>
            <RefreshCw className='h-8 w-8 animate-spin text-green-500 mb-3' />
            <p className='text-gray-500 text-sm'>Carregando trades...</p>
          </div>
        )}

        {!loading && trades.length === 0 && (
          <div className='flex flex-col items-center justify-center py-12'>
            <TrendingUp className='h-10 w-10 text-gray-300 dark:text-gray-700 mb-3' />
            <p className='text-gray-500 text-sm'>Nenhum trade encontrado</p>
            {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                  setTypeFilter('all')
                  setPage(1)
                }}
                className='mt-4 text-green-600 dark:text-green-400 hover:underline text-sm'
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {!loading && trades.length > 0 && (
          <>
            {/* Tabela Desktop */}
            <div className='hidden lg:block overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]'>
                    <th className='text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Moeda
                    </th>
                    <th className='text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Tipo
                    </th>
                    <th className='text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Quantidade
                    </th>
                    <th className='text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Total USD
                    </th>
                    <th className='text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Valor BRL
                    </th>
                    <th className='text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Usuário
                    </th>
                    <th className='text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Data
                    </th>
                    <th className='text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'></th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-white/5'>
                  {trades.map(trade => {
                    const logo = getCryptoLogo(trade.symbol)
                    const isBuy = trade.operation_type === 'buy'

                    return (
                      <tr
                        key={trade.id}
                        className='hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors'
                      >
                        {/* Moeda */}
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-2'>
                            {logo ? (
                              <img src={logo} alt={trade.symbol} className='w-7 h-7 rounded-full' />
                            ) : (
                              <div className='w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center'>
                                <Wallet className='h-3.5 w-3.5 text-gray-500 dark:text-gray-400' />
                              </div>
                            )}
                            <div>
                              <span className='text-gray-900 dark:text-white font-medium text-sm'>
                                {trade.symbol || 'N/A'}
                              </span>
                              <span className='block text-[10px] text-gray-500 font-mono'>
                                {trade.reference_code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className='px-4 py-3'>
                          {isBuy ? (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20'>
                              <ArrowDownRight className='h-3 w-3' />
                              Compra
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'>
                              <ArrowUpRight className='h-3 w-3' />
                              Venda
                            </span>
                          )}
                        </td>

                        {/* Quantidade */}
                        <td className='px-4 py-3 text-right'>
                          <span className='font-mono text-sm text-gray-900 dark:text-white'>
                            {formatCryptoAmount(trade.crypto_amount)}
                          </span>
                        </td>

                        {/* Total USD */}
                        <td className='px-4 py-3 text-right'>
                          <span className='font-mono text-sm text-gray-600 dark:text-gray-300'>
                            {formatCurrency(trade.total_amount || 0)}
                          </span>
                        </td>

                        {/* Valor BRL */}
                        <td className='px-4 py-3 text-right'>
                          {trade.brl_total_amount ? (
                            <div>
                              <span className='font-mono text-sm font-medium text-green-600 dark:text-green-400'>
                                R${' '}
                                {trade.brl_total_amount.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span className='block text-[10px] text-gray-500 uppercase'>
                                {trade.payment_method}
                              </span>
                            </div>
                          ) : (
                            <span className='text-gray-400 dark:text-gray-600'>-</span>
                          )}
                        </td>

                        {/* Usuário */}
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-2'>
                            <div className='w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-500/20 dark:to-cyan-500/20 flex items-center justify-center text-[9px] font-bold text-blue-600 dark:text-blue-300'>
                              WN
                            </div>
                            <span className='text-gray-600 dark:text-gray-300 text-xs font-mono'>
                              {formatUserWNId(trade.user_id)}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className='px-4 py-3 text-center'>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${getStatusBgClass(trade.status)}`}
                          >
                            {getStatusIcon(trade.status)}
                            {getStatusLabel(trade.status)}
                          </span>
                        </td>

                        {/* Data */}
                        <td className='px-4 py-3 text-right'>
                          <span className='text-gray-500 text-xs'>
                            {formatRelativeDate(trade.created_at)}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className='px-4 py-3 text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            <button
                              onClick={() => navigate(`/admin/trades/${trade.id}`)}
                              className='p-1.5 text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors'
                              title='Ver detalhes'
                            >
                              <Eye className='w-4 h-4' />
                            </button>
                            {canCancel(trade.status) && (
                              <button
                                onClick={() => handleCancelTrade(trade)}
                                disabled={cancelTradeMutation.isPending}
                                className='p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50'
                                title='Cancelar trade'
                              >
                                {cancelTradeMutation.isPending ? (
                                  <RefreshCw className='w-4 h-4 animate-spin' />
                                ) : (
                                  <XCircle className='w-4 h-4' />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className='lg:hidden divide-y divide-gray-100 dark:divide-white/5'>
              {trades.map(trade => {
                const logo = getCryptoLogo(trade.symbol)
                const isBuy = trade.operation_type === 'buy'

                return (
                  <div
                    key={trade.id}
                    className='p-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      {/* Left: Coin + Info */}
                      <div className='flex items-center gap-3'>
                        {/* Coin Logo */}
                        <div className='relative'>
                          {logo ? (
                            <img src={logo} alt={trade.symbol} className='w-10 h-10 rounded-full' />
                          ) : (
                            <div className='w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center'>
                              <Wallet className='h-5 w-5 text-gray-500 dark:text-gray-400' />
                            </div>
                          )}
                          {/* Direction indicator */}
                          <div
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                              isBuy ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          >
                            {isBuy ? (
                              <ArrowDownRight className='h-3 w-3 text-white' />
                            ) : (
                              <ArrowUpRight className='h-3 w-3 text-white' />
                            )}
                          </div>
                        </div>

                        {/* Info */}
                        <div>
                          <div className='flex items-center gap-2'>
                            <span className='text-gray-900 dark:text-white font-medium'>
                              {trade.symbol || 'N/A'}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                isBuy
                                  ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                              }`}
                            >
                              {isBuy ? 'Compra' : 'Venda'}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 mt-0.5'>
                            <Hash className='h-3 w-3 text-gray-400 dark:text-gray-600' />
                            <span className='text-gray-500 text-xs font-mono'>
                              {trade.reference_code}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 mt-0.5'>
                            <User className='h-3 w-3 text-blue-500' />
                            <span className='text-blue-600 dark:text-blue-400 text-xs font-mono font-medium'>
                              {formatUserWNId(trade.user_id)}
                            </span>
                            <span className='text-gray-300 dark:text-gray-700'>•</span>
                            <span className='text-gray-500 dark:text-gray-600 text-xs'>
                              {formatRelativeDate(trade.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount + Status */}
                      <div className='text-right'>
                        <div className='font-mono font-medium text-gray-900 dark:text-white'>
                          {formatCryptoAmount(trade.crypto_amount)}
                        </div>
                        {trade.brl_total_amount && (
                          <div className='font-mono text-xs text-green-600 dark:text-green-400'>
                            R${' '}
                            {trade.brl_total_amount.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        )}
                        <div className='mt-1'>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] ${getStatusTextClass(trade.status)}`}
                          >
                            {getStatusIcon(trade.status)}
                            {getStatusLabel(trade.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className='flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-white/5'>
                      <button
                        onClick={() => navigate(`/admin/trades/${trade.id}`)}
                        className='flex items-center gap-1 px-2 py-1 text-green-600 dark:text-green-400 text-xs hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors'
                      >
                        <Eye className='h-3 w-3' />
                        Detalhes
                      </button>
                      {canCancel(trade.status) && (
                        <button
                          onClick={() => handleCancelTrade(trade)}
                          disabled={cancelTradeMutation.isPending}
                          className='flex items-center gap-1 px-2 py-1 text-red-600 dark:text-red-400 text-xs hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50'
                        >
                          {cancelTradeMutation.isPending ? (
                            <RefreshCw className='h-3 w-3 animate-spin' />
                          ) : (
                            <XCircle className='h-3 w-3' />
                          )}
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Paginação */}
        {Math.ceil(total / limit) > 1 && (
          <div className='flex items-center justify-between px-3 sm:px-4 py-3 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01]'>
            <p className='text-xs text-gray-500'>
              <span className='hidden sm:inline'>Mostrando </span>
              {(page - 1) * limit + 1}-{Math.min(page * limit, total)} de {total}
            </p>
            <div className='flex items-center gap-1'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                title='Página anterior'
                aria-label='Ir para página anterior'
                className='p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronLeft className='h-4 w-4' />
              </button>
              <span className='px-3 text-xs text-gray-500 dark:text-gray-400'>
                {page}/{Math.ceil(total / limit) || 1}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                title='Próxima página'
                aria-label='Ir para próxima página'
                className='p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Cancel Modal */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false)
          setSelectedTrade(null)
        }}
        onConfirm={handleConfirmCancel}
        title='Cancelar Trade'
        message={`Tem certeza que deseja cancelar o trade ${selectedTrade?.reference_code}? Esta ação não pode ser desfeita.`}
        confirmText='Sim, cancelar'
        cancelText='Não, manter'
        type='danger'
        icon={<XCircle className='w-6 h-6' />}
      />

      {/* Cancel Reason Modal */}
      <InputModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false)
          setSelectedTrade(null)
        }}
        onConfirm={handleCancelWithReason}
        title='Motivo do Cancelamento'
        message={`Informe o motivo do cancelamento do trade ${selectedTrade?.reference_code}`}
        inputLabel='Motivo (opcional)'
        inputPlaceholder='Ex: Cliente solicitou cancelamento...'
        confirmText='Confirmar Cancelamento'
        cancelText='Voltar'
        type='danger'
        icon={<XCircle className='w-6 h-6' />}
        isLoading={cancelTradeMutation.isPending}
        multiline
      />
    </div>
  )
}
