import React, { useState, useEffect, useCallback } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, RefreshCw } from 'lucide-react'
import { apiClient } from '@/services/api'
import toast from 'react-hot-toast'
import { TradeDetailsPage } from './TradeDetailsPage'
import { tradeHistoryCache } from '@/services/cache/tradeHistoryCache'

// Crypto logos from CoinGecko (free CDN)
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1696504745',
  BNB: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
  TRX: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png?1696502193',
  BASE: 'https://assets.coingecko.com/coins/images/30617/large/base.jpg?1696519330',
  USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
  SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
  LTC: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png?1696501400',
  DOGE: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501400',
  ADA: 'https://assets.coingecko.com/coins/images/975/large/cardano.png?1696502090',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png?1696512369',
  DOT: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png?1696512008',
  LINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png?1696502009',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png?1622619446',
  XRP: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442',
}

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
      {/* Header - compacto */}
      <div className='px-3 py-2 sm:p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between mb-2 sm:mb-3'>
          <h2 className='text-sm sm:text-base font-bold text-gray-900 dark:text-white'>
            Histórico de Trades
          </h2>
          <button
            onClick={handleForceRefresh}
            disabled={loading}
            className='flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded disabled:bg-gray-400 transition-colors'
            title='Atualizar histórico'
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className='hidden sm:inline'>{loading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>

        {/* Filters - mais compactos */}
        <div className='grid grid-cols-2 gap-2'>
          <div>
            <label
              htmlFor='status-filter'
              className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5'
            >
              Status
            </label>
            <select
              id='status-filter'
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className='w-full px-2 py-1.5 text-[11px] sm:text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
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
              className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5'
            >
              Operação
            </label>
            <select
              id='operation-filter'
              value={filterOperation}
              onChange={e => setFilterOperation(e.target.value)}
              className='w-full px-2 py-1.5 text-[11px] sm:text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            >
              <option value='ALL'>Todas</option>
              <option value='buy'>Compra</option>
              <option value='sell'>Venda</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trades List - altura ajustada */}
      <div className='divide-y divide-gray-100 dark:divide-gray-700/50 max-h-80 sm:max-h-96 overflow-y-auto'>
        {filteredTrades.length === 0 ? (
          <div className='p-6 text-center'>
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
              {trades.length === 0 ? 'Nenhuma trade realizada' : 'Nenhuma trade encontrada'}
            </p>
          </div>
        ) : (
          filteredTrades.map(trade => (
            <button
              key={trade.id}
              onClick={() => setSelectedTradeId(trade.id)}
              className='w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left'
            >
              <div className='flex items-center gap-2'>
                {/* Logo da crypto - menor no mobile */}
                <div className='relative flex-shrink-0'>
                  {CRYPTO_LOGOS[trade.symbol] ? (
                    <img
                      src={CRYPTO_LOGOS[trade.symbol]}
                      alt={trade.symbol}
                      className='w-8 h-8 sm:w-9 sm:h-9 rounded-full'
                      onError={e => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className='w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center'>
                      <span className='text-[10px] font-bold text-gray-600 dark:text-gray-400'>
                        {trade.symbol.slice(0, 2)}
                      </span>
                    </div>
                  )}
                  {/* Indicador de operação - menor */}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full ${
                      trade.operation === 'buy' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {trade.operation === 'buy' ? (
                      <ArrowDownLeft className='w-2 h-2 text-white' />
                    ) : (
                      <ArrowUpRight className='w-2 h-2 text-white' />
                    )}
                  </div>
                </div>

                {/* Info central - mais compacto */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-xs sm:text-sm font-semibold text-gray-900 dark:text-white'>
                      {trade.symbol}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium leading-none ${
                        STATUS_COLORS[trade.status]
                      }`}
                    >
                      {STATUS_LABELS[trade.status]}
                    </span>
                  </div>
                  <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate'>
                    {trade.reference_code}
                  </p>
                </div>

                {/* Valor à direita - compacto */}
                <div className='text-right flex-shrink-0'>
                  <p className='text-xs sm:text-sm font-semibold text-gray-900 dark:text-white'>
                    {trade.operation === 'buy' ? '+' : '-'}
                    {formatCrypto(trade.crypto_amount)} {trade.symbol}
                  </p>
                  <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
                    {formatTradeValue(trade)}
                  </p>
                </div>

                {/* Seta - menor */}
                <ChevronRight className='w-4 h-4 text-gray-400 flex-shrink-0' />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
