import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  TrendingUp,
  Star,
  Users,
} from 'lucide-react'
import { traderProfileService, TraderProfile } from '@/services/traderProfileService'
import { TraderProfileCard } from '@/components/trader/TraderProfileCard'

type SortBy = 'success_rate' | 'average_rating' | 'total_trades' | 'created_at'
type Order = 'asc' | 'desc'

export function TradersList() {
  const navigate = useNavigate()
  const [traders, setTraders] = useState<TraderProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('success_rate')
  const [order, setOrder] = useState<Order>('desc')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  // Fetch traders
  useEffect(() => {
    const fetchTraders = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await traderProfileService.listTraders({
          skip: 0,
          limit: 50,
          sort_by: sortBy,
          order: order,
          verified_only: verifiedOnly,
        })
        setTraders(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar traders'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchTraders()
  }, [sortBy, order, verifiedOnly])

  // Filter traders by search query
  const filteredTraders = traders.filter(trader =>
    trader.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleTraderClick = (traderId: string) => {
    navigate(`/p2p/trader/${traderId}`)
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10'>
        <div className='max-w-6xl mx-auto px-4 py-4'>
          <button
            onClick={() => navigate('/p2p')}
            className='flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4'
          >
            <ArrowLeft className='w-4 h-4' />
            Voltar
          </button>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            Encontrar Negociadores
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            Escolha um negociador confiável para suas transações P2P
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-6xl mx-auto px-4 py-8'>
        {/* Search and Filters */}
        <div className='bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6'>
          {/* Search */}
          <div className='mb-6'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
              <input
                type='text'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder='Buscar por nome do negociador...'
                className='w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>

          {/* Filter and Sort Controls */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {/* Sort By */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Ordenar Por
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value='success_rate'>Taxa de Sucesso</option>
                <option value='average_rating'>Avaliação</option>
                <option value='total_trades'>Total de Negociações</option>
                <option value='created_at'>Mais Novo</option>
              </select>
            </div>

            {/* Order */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Ordem
              </label>
              <select
                value={order}
                onChange={e => setOrder(e.target.value as Order)}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value='desc'>Decrescente</option>
                <option value='asc'>Crescente</option>
              </select>
            </div>

            {/* Verified Only */}
            <div className='flex items-end'>
              <label className='flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg w-full cursor-pointer'>
                <input
                  type='checkbox'
                  checked={verifiedOnly}
                  onChange={e => setVerifiedOnly(e.target.checked)}
                  className='w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500'
                />
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Apenas Verificados
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 mb-6'>
            <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0' />
            <div>
              <p className='font-medium text-red-700 dark:text-red-300'>Erro</p>
              <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className='flex flex-col items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-blue-600 mb-4' />
            <p className='text-gray-600 dark:text-gray-400'>Carregando negociadores...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredTraders.length === 0 && (
          <div className='bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center'>
            <Filter className='w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4' />
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
              Nenhum negociador encontrado
            </h3>
            <p className='text-gray-600 dark:text-gray-400'>
              {searchQuery
                ? 'Tente ajustar seus critérios de busca'
                : 'Nenhum negociador disponível no momento'}
            </p>
          </div>
        )}

        {/* Traders Grid */}
        {!loading && filteredTraders.length > 0 && (
          <>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
                {filteredTraders.length} negociador{filteredTraders.length !== 1 ? 'es' : ''}
              </h2>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {filteredTraders.map(trader => (
                <div key={trader.id} onClick={() => handleTraderClick(trader.id)}>
                  <TraderProfileCard
                    profile={trader}
                    onClick={() => handleTraderClick(trader.id)}
                    showContact={true}
                  />
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-8'>
              <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800'>
                <div className='flex items-center gap-3 mb-2'>
                  <Users className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                  <p className='text-sm text-blue-700 dark:text-blue-300'>Total de Negociadores</p>
                </div>
                <p className='text-2xl font-bold text-blue-900 dark:text-blue-100'>
                  {filteredTraders.length}
                </p>
              </div>

              <div className='bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800'>
                <div className='flex items-center gap-3 mb-2'>
                  <TrendingUp className='w-5 h-5 text-green-600 dark:text-green-400' />
                  <p className='text-sm text-green-700 dark:text-green-300'>
                    Taxa Média de Sucesso
                  </p>
                </div>
                <p className='text-2xl font-bold text-green-900 dark:text-green-100'>
                  {(
                    filteredTraders.reduce((sum, t) => sum + t.success_rate, 0) /
                    filteredTraders.length
                  ).toFixed(1)}
                  %
                </p>
              </div>

              <div className='bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800'>
                <div className='flex items-center gap-3 mb-2'>
                  <Star className='w-5 h-5 text-yellow-600 dark:text-yellow-400' />
                  <p className='text-sm text-yellow-700 dark:text-yellow-300'>Avaliação Média</p>
                </div>
                <p className='text-2xl font-bold text-yellow-900 dark:text-yellow-100'>
                  {(
                    filteredTraders.reduce((sum, t) => sum + t.average_rating, 0) /
                    filteredTraders.length
                  ).toFixed(1)}
                  /5
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
