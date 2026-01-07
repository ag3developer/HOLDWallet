import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  RefreshCw,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { apiClient } from '@/services/api'
import toast from 'react-hot-toast'
import { TradeDetailsPage } from './TradeDetailsPage'
import { tradeHistoryCache } from '@/services/cache/tradeHistoryCache'
import { CryptoIcon } from '@/components/CryptoIcon'

interface Trade {
  id: string
  reference_code: string
  operation: 'buy' | 'sell'
  symbol: string
  name?: string
  crypto_amount: number
  fiat_amount: number
  total_amount: number
  // Valores em BRL (se disponíveis)
  brl_amount?: number
  brl_total_amount?: number
  usd_to_brl_rate?: number
  spread_percentage: number
  network_fee_percentage: number
  payment_method: string
  status: 'PENDING' | 'PAYMENT_CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'
  created_at: string
  updated_at?: string
}

interface TradeHistoryPanelProps {
  readonly currencySymbol: string
  readonly currencyLocale: string
  readonly isVisible?: boolean
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  PENDING: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    icon: Clock,
  },
  PAYMENT_CONFIRMED: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    icon: Loader2,
  },
  COMPLETED: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle,
  },
  CANCELLED: {
    bg: 'bg-gray-50 dark:bg-gray-500/10',
    text: 'text-gray-500 dark:text-gray-400',
    icon: XCircle,
  },
  EXPIRED: {
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    icon: AlertCircle,
  },
  FAILED: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    icon: XCircle,
  },
}

const getStatusConfig = (status: string) => {
  return (
    STATUS_CONFIG[status] || {
      bg: 'bg-gray-50 dark:bg-gray-500/10',
      text: 'text-gray-500 dark:text-gray-400',
      icon: Clock,
    }
  )
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando',
  PAYMENT_CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
  FAILED: 'Falha',
}

export function TradeHistoryPanel({
  currencySymbol,
  currencyLocale,
  isVisible,
}: TradeHistoryPanelProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterOperation, setFilterOperation] = useState<string>('ALL')

  // Carregar trades do cache na inicialização
  useEffect(() => {
    const cached = tradeHistoryCache.getTradeHistory()
    if (cached && cached.trades.length > 0) {
      console.log('[TradeHistoryPanel] Loading from cache:', cached.trades.length, 'trades')
      setTrades(cached.trades)
    }
  }, [])

  // Fetch trades quando visível (com cache)
  useEffect(() => {
    if (isVisible && trades.length === 0) {
      fetchTrades(false) // Não forçar se já tem dados
    }
  }, [isVisible])

  const fetchTrades = useCallback(async (forceRefresh = false) => {
    // Verificar cache primeiro (se não for refresh forçado)
    if (!forceRefresh) {
      const cached = tradeHistoryCache.getTradeHistory()
      if (cached && cached.trades.length > 0) {
        console.log('[TradeHistoryPanel] Using cached data:', cached.trades.length, 'trades')
        setTrades(cached.trades)
        return
      }
    }

    setLoading(true)
    try {
      console.log('[TradeHistoryPanel] Fetching trades from API...')
      const response = await apiClient.get('/instant-trade/history/my-trades')
      const tradesData = response.data.trades || []
      console.log('[TradeHistoryPanel] Received:', tradesData.length, 'trades')

      // Salvar no cache
      tradeHistoryCache.setTradeHistory({
        trades: tradesData,
        total: response.data.total || tradesData.length,
        page: response.data.page || 1,
        per_page: response.data.per_page || 10,
      })

      setTrades(tradesData)
      console.log('[TradeHistoryPanel] Trades loaded and cached at:', new Date().toISOString())
    } catch (error: unknown) {
      console.error('[TradeHistoryPanel] Fetch trades error:', error)
      toast.error('Erro ao carregar histórico de trades')
    } finally {
      setLoading(false)
    }
  }, [])

  const filteredTrades = trades.filter(trade => {
    const statusMatch = filterStatus === 'ALL' || trade.status === filterStatus
    const operationMatch = filterOperation === 'ALL' || trade.operation === filterOperation
    return statusMatch && operationMatch
  })

  // Formata valor - mostra BRL se disponível, senão USD original do backend
  const formatTradeValue = (trade: Trade) => {
    // Se já temos o valor em BRL do backend, mostrar em BRL
    if (trade.brl_total_amount) {
      return trade.brl_total_amount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    }

    // Senão, mostrar valor original em USD (sem conversão fake)
    return trade.total_amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    })
  }

  const formatCrypto = (value: number) => {
    // Formato compacto - máximo 6 casas, remove zeros
    if (value >= 1000) return value.toFixed(2)
    if (value >= 100) return value.toFixed(3)
    if (value >= 1) return value.toFixed(4)
    if (value >= 0.01) return value.toFixed(5)
    return value.toFixed(6)
  }

  // Função para forçar refresh (ignora cache)
  const handleForceRefresh = useCallback(() => {
    tradeHistoryCache.invalidateHistory()
    fetchTrades(true)
  }, [fetchTrades])

  // Se uma trade está selecionada, mostrar a página de detalhes
  if (selectedTradeId) {
    return (
      <TradeDetailsPage
        tradeId={selectedTradeId}
        onBack={() => {
          setSelectedTradeId(null)
          // Não precisa recarregar - cache mantém os dados
        }}
        currencySymbol={currencySymbol}
        currencyLocale={currencyLocale}
      />
    )
  }

  return (
    <div className='p-3 sm:p-4'>
      {/* Filters Row - inline mais moderno */}
      <div className='flex items-center justify-between gap-3 mb-3'>
        <div className='flex items-center gap-2'>
          <Filter className='w-3.5 h-3.5 text-gray-400' />
          <select
            id='status-filter'
            aria-label='Filtrar por status'
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className='px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
          >
            <option value='ALL'>Todos</option>
            <option value='PENDING'>Aguardando</option>
            <option value='PAYMENT_CONFIRMED'>Confirmado</option>
            <option value='COMPLETED'>Concluído</option>
            <option value='CANCELLED'>Cancelado</option>
            <option value='FAILED'>Falha</option>
          </select>
          <select
            id='operation-filter'
            aria-label='Filtrar por operação'
            value={filterOperation}
            onChange={e => setFilterOperation(e.target.value)}
            className='px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
          >
            <option value='ALL'>Todas</option>
            <option value='buy'>Compra</option>
            <option value='sell'>Venda</option>
          </select>
        </div>
        <button
          onClick={handleForceRefresh}
          disabled={loading}
          className='flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors'
          title='Atualizar'
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className='hidden sm:inline'>Atualizar</span>
        </button>
      </div>

      {/* Trades List */}
      <div className='space-y-2 max-h-[400px] overflow-y-auto'>
        {loading && trades.length === 0 ? (
          <div className='py-8 text-center'>
            <Loader2 className='w-6 h-6 text-blue-500 mx-auto mb-2 animate-spin' />
            <p className='text-xs text-gray-500 dark:text-gray-400'>Carregando trades...</p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className='py-8 text-center'>
            <div className='w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3'>
              <Clock className='w-5 h-5 text-gray-400' />
            </div>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              {trades.length === 0 ? 'Nenhuma trade realizada ainda' : 'Nenhuma trade encontrada'}
            </p>
          </div>
        ) : (
          filteredTrades.map(trade => {
            const statusConfig = getStatusConfig(trade.status)
            const StatusIcon = statusConfig.icon

            return (
              <button
                key={trade.id}
                onClick={() => setSelectedTradeId(trade.id)}
                className='w-full p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all group text-left'
              >
                <div className='flex items-center gap-3'>
                  {/* Crypto Icon com indicador de operação */}
                  <div className='relative flex-shrink-0'>
                    <CryptoIcon symbol={trade.symbol} size={36} />
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                        trade.operation === 'buy' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    >
                      {trade.operation === 'buy' ? (
                        <ArrowDownLeft className='w-2.5 h-2.5 text-white' />
                      ) : (
                        <ArrowUpRight className='w-2.5 h-2.5 text-white' />
                      )}
                    </div>
                  </div>

                  {/* Info central */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5 mb-0.5'>
                      <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                        {trade.symbol}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${statusConfig.bg} ${statusConfig.text}`}
                      >
                        <StatusIcon className='w-2 h-2' />
                        {STATUS_LABELS[trade.status]}
                      </span>
                    </div>
                    <p className='text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate'>
                      {trade.reference_code}
                    </p>
                  </div>

                  {/* Valor à direita */}
                  <div className='text-right flex-shrink-0'>
                    <p
                      className={`text-xs font-semibold ${
                        trade.operation === 'buy'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {trade.operation === 'buy' ? '+' : '-'}
                      {formatCrypto(trade.crypto_amount)} {trade.symbol}
                    </p>
                    <p className='text-[10px] text-gray-500 dark:text-gray-400'>
                      {formatTradeValue(trade)}
                    </p>
                  </div>

                  {/* Seta */}
                  <ChevronRight className='w-4 h-4 text-gray-300 dark:text-gray-500 group-hover:text-gray-400 dark:group-hover:text-gray-400 transition-colors flex-shrink-0' />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
