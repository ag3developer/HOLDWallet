import React, { useState, useEffect, useCallback } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, RefreshCw } from 'lucide-react'
import { apiClient } from '@/services/api'
import toast from 'react-hot-toast'
import { TradeDetailsPage } from './TradeDetailsPage'
import { tradeHistoryCache } from '@/services/cache/tradeHistoryCache'

interface Trade {
  id: string
  reference_code: string
  operation: 'buy' | 'sell'
  symbol: string
  name?: string
  crypto_amount: number
  fiat_amount: number
  total_amount: number
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  EXPIRED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando Pagamento',
  PAYMENT_CONFIRMED: 'Pagamento Confirmado',
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(currencyLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const formatValue = (value: number) => {
    try {
      return value.toLocaleString(currencyLocale, { maximumFractionDigits: 2 })
    } catch {
      return value.toFixed(2)
    }
  }

  const formatCrypto = (value: number) => {
    return value.toFixed(8)
  }

  // Função para forçar refresh (ignora cache)
  const handleForceRefresh = useCallback(() => {
    tradeHistoryCache.invalidateHistory()
    fetchTrades()
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
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
      {/* Header */}
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-bold text-gray-900 dark:text-white'>Histórico de Trades</h2>
          <button
            onClick={handleForceRefresh}
            disabled={loading}
            className='flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:bg-gray-400 transition-colors'
            title='Atualizar histórico'
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        {/* Filters */}
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label
              htmlFor='status-filter'
              className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Status
            </label>
            <select
              id='status-filter'
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className='w-full px-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            >
              <option value='ALL'>Todos</option>
              <option value='PENDING'>Aguardando</option>
              <option value='PAYMENT_CONFIRMED'>Confirmado</option>
              <option value='COMPLETED'>Concluído</option>
              <option value='FAILED'>Falha</option>
            </select>
          </div>

          <div>
            <label
              htmlFor='operation-filter'
              className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Operação
            </label>
            <select
              id='operation-filter'
              value={filterOperation}
              onChange={e => setFilterOperation(e.target.value)}
              className='w-full px-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            >
              <option value='ALL'>Todas</option>
              <option value='buy'>Compra</option>
              <option value='sell'>Venda</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trades List */}
      <div className='divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto'>
        {filteredTrades.length === 0 ? (
          <div className='p-8 text-center'>
            <p className='text-gray-600 dark:text-gray-400'>
              {trades.length === 0 ? 'Nenhuma trade realizada' : 'Nenhuma trade encontrada'}
            </p>
          </div>
        ) : (
          filteredTrades.map(trade => (
            <button
              key={trade.id}
              onClick={() => setSelectedTradeId(trade.id)}
              className='w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left'
            >
              <div className='flex items-center justify-between gap-2'>
                {/* Left Info */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <div className='flex items-center gap-1'>
                      {trade.operation === 'buy' ? (
                        <ArrowDownLeft className='w-4 h-4 text-green-600 dark:text-green-400' />
                      ) : (
                        <ArrowUpRight className='w-4 h-4 text-red-600 dark:text-red-400' />
                      )}
                      <span className='text-sm font-bold text-gray-900 dark:text-white'>
                        {trade.symbol}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_COLORS[trade.status]
                      }`}
                    >
                      {STATUS_LABELS[trade.status]}
                    </span>
                  </div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {trade.reference_code} • {formatDate(trade.created_at)}
                  </p>
                </div>

                {/* Right Value */}
                <div className='text-right mr-2'>
                  <p className='text-sm font-bold text-gray-900 dark:text-white'>
                    {trade.operation === 'buy'
                      ? `+${formatCrypto(trade.crypto_amount)} ${trade.symbol}`
                      : `-${formatCrypto(trade.crypto_amount)} ${trade.symbol}`}
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>
                    {currencySymbol} {formatValue(trade.total_amount)}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight className='w-5 h-5 text-gray-400' />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
