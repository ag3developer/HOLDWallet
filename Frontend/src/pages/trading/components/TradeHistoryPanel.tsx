import React, { useState, useEffect } from 'react'
import { Eye, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'
import { apiClient } from '@/services/api'
import toast from 'react-hot-toast'

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
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterOperation, setFilterOperation] = useState<string>('ALL')

  // Fetch trades on mount and when isVisible changes
  useEffect(() => {
    if (isVisible) {
      fetchTrades()
    }
  }, [isVisible])

  const fetchTrades = async () => {
    setLoading(true)
    try {
      console.log('[TradeHistoryPanel] Fetching trades...')
      const response = await apiClient.get('/instant-trade/history/my-trades')
      console.log('[TradeHistoryPanel] Response:', response.data)
      const tradesData = response.data.trades || []
      console.log('[TradeHistoryPanel] Trades count:', tradesData.length)
      if (tradesData.length > 0) {
        console.log('[TradeHistoryPanel] First trade:', tradesData[0])
      }
      setTrades(tradesData)
    } catch (error: any) {
      console.error('[TradeHistoryPanel] Fetch trades error:', error)
      toast.error('Erro ao carregar histórico de trades')
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
      {/* Header */}
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-bold text-gray-900 dark:text-white'>Histórico de Trades</h2>
          <button
            onClick={fetchTrades}
            disabled={loading}
            className='px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:bg-gray-400 transition-colors'
          >
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
            <div
              key={trade.id}
              className='p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            >
              <div className='flex items-start justify-between gap-2'>
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
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        STATUS_COLORS[trade.status]
                      }`}
                    >
                      {STATUS_LABELS[trade.status]}
                    </span>
                  </div>{' '}
                  <p className='text-xs text-gray-600 dark:text-gray-400'>
                    {formatDate(trade.created_at)}
                  </p>
                </div>

                {/* Right Value */}
                <div className='text-right'>
                  <p className='text-sm font-bold text-gray-900 dark:text-white'>
                    {trade.operation === 'buy'
                      ? `+${formatCrypto(trade.crypto_amount)} ${trade.symbol}`
                      : `-${formatCrypto(trade.crypto_amount)} ${trade.symbol}`}
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>
                    {currencySymbol} {formatValue(trade.total_amount)}
                  </p>
                </div>

                {/* Detail Button */}
                <button
                  onClick={() => setSelectedTrade(trade)}
                  className='p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors ml-2'
                  title='Ver detalhes'
                >
                  <Eye className='w-4 h-4 text-gray-600 dark:text-gray-400' />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedTrade && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto'>
            {/* Modal Header */}
            <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white'>Detalhes da Trade</h3>
              <button
                onClick={() => setSelectedTrade(null)}
                className='text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                title='Fechar'
                aria-label='Fechar'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Modal Content */}
            <div className='p-4 space-y-3'>
              <div className='bg-gray-50 dark:bg-gray-700 p-3 rounded'>
                <p className='text-xs text-gray-600 dark:text-gray-400'>ID da Trade</p>
                <p className='text-sm font-mono text-gray-900 dark:text-white break-all'>
                  {selectedTrade.id}
                </p>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Operação</p>
                  <p className='text-sm font-bold text-gray-900 dark:text-white capitalize'>
                    {selectedTrade.operation === 'buy' ? 'Compra' : 'Venda'}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Criptomoeda</p>
                  <p className='text-sm font-bold text-gray-900 dark:text-white'>
                    {selectedTrade.symbol}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Quantidade</p>
                  <p className='text-sm font-bold text-gray-900 dark:text-white'>
                    {formatCrypto(selectedTrade.crypto_amount)} {selectedTrade.symbol}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Valor Pago</p>
                  <p className='text-sm font-bold text-gray-900 dark:text-white'>
                    {currencySymbol} {formatValue(selectedTrade.fiat_amount)}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Spread</p>
                  <p className='text-sm font-bold text-gray-900 dark:text-white'>
                    {selectedTrade.spread_percentage.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Taxa Rede</p>
                  <p className='text-sm font-bold text-gray-900 dark:text-white'>
                    {selectedTrade.network_fee_percentage.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className='border-t border-gray-200 dark:border-gray-700 pt-3'>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Total com Fees</p>
                <p className='text-lg font-bold text-gray-900 dark:text-white'>
                  {currencySymbol} {formatValue(selectedTrade.total_amount)}
                </p>
              </div>

              <div>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Método Pagamento</p>
                <p className='text-sm font-bold text-gray-900 dark:text-white capitalize'>
                  {selectedTrade.payment_method.replace('_', ' ')}
                </p>
              </div>

              <div>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                    STATUS_COLORS[selectedTrade.status]
                  }`}
                >
                  {STATUS_LABELS[selectedTrade.status]}
                </span>
              </div>

              <div className='grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400'>
                <div>
                  <p>Criada em:</p>
                  <p className='font-mono'>{formatDate(selectedTrade.created_at)}</p>
                </div>
                <div>
                  <p>Atualizada em:</p>
                  <p className='font-mono'>
                    {selectedTrade.updated_at ? formatDate(selectedTrade.updated_at) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
