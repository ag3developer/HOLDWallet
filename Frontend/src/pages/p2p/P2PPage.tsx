import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  Star,
  MessageCircle,
  Users,
  Eye,
  Zap,
  RefreshCw,
  Wallet,
  CreditCard,
  Banknote,
  ArrowRight,
  Globe,
  Lock,
  BadgeCheck,
  Sparkles,
  Crown,
  ChevronRight,
} from 'lucide-react'
import { useP2POrders, useMarketStats } from '@/hooks/useP2POrders'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'

export const P2PPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'all'>('all')
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')

  const getApiFilterType = (): 'buy' | 'sell' | undefined => {
    if (activeTab === 'all') return undefined
    return activeTab === 'buy' ? 'sell' : 'buy'
  }

  const filters: {
    type?: 'buy' | 'sell'
    coin?: string
    paymentMethod?: string
    minAmount?: string
    maxAmount?: string
  } = {}

  const filterType = getApiFilterType()
  if (filterType) filters.type = filterType
  if (selectedCrypto) filters.coin = selectedCrypto
  if (selectedPaymentMethod) filters.paymentMethod = selectedPaymentMethod
  if (minAmount) filters.minAmount = minAmount
  if (maxAmount) filters.maxAmount = maxAmount

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useP2POrders(filters)

  const { data: marketStats } = useMarketStats(selectedCrypto || undefined)
  const { data: paymentMethodsData } = usePaymentMethods()

  const cryptoOptions = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      logo: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    {
      symbol: 'BNB',
      name: 'BNB',
      logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    },
  ]

  // Função para obter logo da moeda
  const getCryptoLogo = (symbol: string) => {
    const crypto = cryptoOptions.find(c => c.symbol === symbol)
    return crypto?.logo || 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'
  }

  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`
    return amount.toString()
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'PIX':
        return <Zap className='w-3 h-3' />
      case 'TED':
        return <Banknote className='w-3 h-3' />
      case 'Mercado Pago':
        return <CreditCard className='w-3 h-3' />
      default:
        return <Wallet className='w-3 h-3' />
    }
  }

  const handleOpenChat = (order: any) => {
    const traderId = order.user?.id || order.user_id
    const orderId = order.id
    if (!traderId || !orderId) return
    navigate(`/chat?context=p2p&orderId=${orderId}&userId=${traderId}`)
  }

  const renderContent = () => {
    if (ordersLoading) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <div className='relative'>
            <div className='w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full' />
            <div className='w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0' />
          </div>
          <p className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
            Buscando as melhores ofertas...
          </p>
        </div>
      )
    }

    if (ordersError) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4'>
            <Shield className='w-8 h-8 text-red-500' />
          </div>
          <p className='text-sm font-medium text-gray-900 dark:text-white mb-1'>
            Erro ao carregar ofertas
          </p>
          <p className='text-xs text-gray-500 mb-4'>Tente novamente em alguns segundos</p>
          <button
            onClick={() => refetchOrders()}
            className='px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg'
          >
            Tentar novamente
          </button>
        </div>
      )
    }

    if (!ordersData?.data || ordersData.data.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <div className='w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4'>
            <Search className='w-8 h-8 text-gray-400' />
          </div>
          <p className='text-sm font-medium text-gray-900 dark:text-white mb-1'>
            Nenhuma oferta encontrada
          </p>
          <p className='text-xs text-gray-500'>Tente ajustar seus filtros</p>
        </div>
      )
    }

    return ordersData.data.map((order: any) => (
      <PremiumOrderCard
        key={order.id}
        order={order}
        formatCurrency={formatCurrency}
        getPaymentMethodIcon={getPaymentMethodIcon}
        getCryptoLogo={getCryptoLogo}
        onNavigate={navigate}
        onOpenChat={handleOpenChat}
      />
    ))
  }

  return (
    <div className='space-y-4 pb-24'>
      {/* Hero Header - Identidade do Marketplace */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900'>
        {/* Background Pattern */}
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-0 left-0 w-40 h-40 bg-blue-500 rounded-full blur-3xl' />
          <div className='absolute bottom-0 right-0 w-60 h-60 bg-purple-500 rounded-full blur-3xl' />
          <div className='absolute top-1/2 left-1/2 w-32 h-32 bg-cyan-500 rounded-full blur-2xl' />
        </div>

        <div className='relative p-4'>
          {/* Top Bar */}
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center'>
                <Crown className='w-4 h-4 text-white' />
              </div>
              <div>
                <p className='text-[10px] text-amber-400 font-semibold uppercase tracking-wider'>
                  #1 América Latina
                </p>
                <h1 className='text-lg font-bold text-white leading-tight'>P2P Marketplace</h1>
              </div>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => navigate('/p2p/my-orders')}
                className='p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border border-white/10'
                aria-label='Minhas ordens'
              >
                <Eye className='w-4 h-4 text-white' />
              </button>
              <button
                onClick={() => navigate('/p2p/create-order')}
                className='px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/25 transition-all'
              >
                <Plus className='w-3.5 h-3.5' />
                Anunciar
              </button>
            </div>
          </div>

          {/* Trust Badges */}
          <div className='flex items-center gap-3 mb-4 overflow-x-auto pb-1 scrollbar-hide'>
            <div className='flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-lg border border-emerald-500/30 whitespace-nowrap'>
              <Lock className='w-3 h-3 text-emerald-400' />
              <span className='text-[10px] text-emerald-300 font-medium'>100% Seguro</span>
            </div>
            <div className='flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/20 backdrop-blur-sm rounded-lg border border-blue-500/30 whitespace-nowrap'>
              <MessageCircle className='w-3 h-3 text-blue-400' />
              <span className='text-[10px] text-blue-300 font-medium'>Chat em Tempo Real</span>
            </div>
            <div className='flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-500/20 backdrop-blur-sm rounded-lg border border-purple-500/30 whitespace-nowrap'>
              <Shield className='w-3 h-3 text-purple-400' />
              <span className='text-[10px] text-purple-300 font-medium'>Escrow Protegido</span>
            </div>
          </div>

          {/* Live Stats */}
          <div className='grid grid-cols-4 gap-2'>
            <div className='bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10'>
              <div className='flex items-center gap-1.5 mb-1'>
                <TrendingUp className='w-3 h-3 text-emerald-400' />
                <span className='text-[9px] text-gray-400 uppercase'>Volume 24h</span>
              </div>
              <p className='text-sm font-bold text-white'>
                R$ {formatCompact(Number(marketStats?.totalVolume24h || 0))}
              </p>
            </div>
            <div className='bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10'>
              <div className='flex items-center gap-1.5 mb-1'>
                <Users className='w-3 h-3 text-blue-400' />
                <span className='text-[9px] text-gray-400 uppercase'>Trades</span>
              </div>
              <p className='text-sm font-bold text-white'>{marketStats?.totalTrades24h || 0}</p>
            </div>
            <div className='bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10'>
              <div className='flex items-center gap-1.5 mb-1'>
                <Globe className='w-3 h-3 text-cyan-400' />
                <span className='text-[9px] text-gray-400 uppercase'>Online</span>
              </div>
              <p className='text-sm font-bold text-white'>
                {(marketStats?.buyOrders || 0) + (marketStats?.sellOrders || 0)}
              </p>
            </div>
            <div className='bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10'>
              <div className='flex items-center gap-1.5 mb-1'>
                <Sparkles className='w-3 h-3 text-amber-400' />
                <span className='text-[9px] text-gray-400 uppercase'>Taxa</span>
              </div>
              <p className='text-sm font-bold text-emerald-400'>0%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Crypto Selection */}
      <div className='flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1'>
        <button
          onClick={() => setSelectedCrypto(null)}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-w-fit ${
            selectedCrypto === null
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <Sparkles className='w-3.5 h-3.5 flex-shrink-0' />
          <span>Todas</span>
        </button>
        {cryptoOptions.map(crypto => (
          <button
            key={crypto.symbol}
            onClick={() => setSelectedCrypto(crypto.symbol)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-w-fit ${
              selectedCrypto === crypto.symbol
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <img
              src={crypto.logo}
              alt={crypto.name}
              className='w-5 h-5 rounded-full object-cover flex-shrink-0'
              onError={e => {
                ;(e.target as HTMLImageElement).src =
                  'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'
              }}
            />
            <span className='flex-shrink-0'>{crypto.symbol}</span>
          </button>
        ))}
      </div>

      {/* Trading Interface */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
        {/* Tabs */}
        <div className='flex border-b border-gray-100 dark:border-gray-700'>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-4 text-xs font-semibold transition-all relative ${
              activeTab === 'all'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Todas Ofertas
            {activeTab === 'all' && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600' />
            )}
          </button>
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-3 px-4 text-xs font-semibold transition-all relative flex items-center justify-center gap-1.5 ${
              activeTab === 'buy'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <TrendingUp className='w-3.5 h-3.5' />
            Comprar
            {activeTab === 'buy' && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500' />
            )}
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-3 px-4 text-xs font-semibold transition-all relative flex items-center justify-center gap-1.5 ${
              activeTab === 'sell'
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <TrendingDown className='w-3.5 h-3.5' />
            Vender
            {activeTab === 'sell' && (
              <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-red-500' />
            )}
          </button>
        </div>

        {/* Search & Filters */}
        <div className='p-3 border-b border-gray-100 dark:border-gray-700'>
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <Search className='w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por trader ou método...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-9 pr-3 py-2.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl transition-all ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
              }`}
              aria-label='Filtros'
            >
              <Filter className='w-4 h-4' />
            </button>
            <button
              onClick={() => refetchOrders()}
              disabled={ordersLoading}
              className='p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-600 disabled:opacity-50 transition-all'
              aria-label='Atualizar'
            >
              <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className='mt-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl space-y-3'>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <span className='block text-[10px] text-gray-500 uppercase font-medium mb-1.5'>
                    Valor Mínimo
                  </span>
                  <input
                    type='number'
                    placeholder='R$ 0'
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    aria-label='Valor mínimo'
                    className='w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  />
                </div>
                <div>
                  <span className='block text-[10px] text-gray-500 uppercase font-medium mb-1.5'>
                    Valor Máximo
                  </span>
                  <input
                    type='number'
                    placeholder='R$ 100.000'
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    aria-label='Valor máximo'
                    className='w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  />
                </div>
              </div>
              <div>
                <span className='block text-[10px] text-gray-500 uppercase font-medium mb-1.5'>
                  Método de Pagamento
                </span>
                <select
                  aria-label='Filtrar por método de pagamento'
                  value={selectedPaymentMethod}
                  onChange={e => setSelectedPaymentMethod(e.target.value)}
                  className='w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                >
                  <option value=''>Todos os métodos</option>
                  {paymentMethodsData?.map((method: any) => (
                    <option key={method.id} value={method.type}>
                      {method.type}
                    </option>
                  ))}
                </select>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => {
                    setMinAmount('')
                    setMaxAmount('')
                    setSelectedPaymentMethod('')
                  }}
                  className='flex-1 py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium'
                >
                  Limpar
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className='flex-1 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg'
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className='divide-y divide-gray-100 dark:divide-gray-700'>{renderContent()}</div>
      </div>

      {/* Bottom CTA - Become a Trader */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600'>
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl' />
        </div>
        <div className='relative p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center'>
                <Zap className='w-5 h-5 text-white' />
              </div>
              <div>
                <h3 className='text-sm font-bold text-white'>Seja um Trader Verificado</h3>
                <p className='text-emerald-100 text-xs'>Ganhe até 5% em cada negociação</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/p2p/create-order')}
              className='p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all'
              aria-label='Começar a vender'
            >
              <ChevronRight className='w-5 h-5 text-white' />
            </button>
          </div>
        </div>
      </div>

      {/* Security Footer */}
      <div className='flex items-center justify-center gap-6 py-2'>
        <div className='flex items-center gap-1.5 text-gray-400'>
          <Lock className='w-3.5 h-3.5' />
          <span className='text-[10px] font-medium'>SSL Seguro</span>
        </div>
        <div className='flex items-center gap-1.5 text-gray-400'>
          <Shield className='w-3.5 h-3.5' />
          <span className='text-[10px] font-medium'>Escrow 100%</span>
        </div>
        <div className='flex items-center gap-1.5 text-gray-400'>
          <BadgeCheck className='w-3.5 h-3.5' />
          <span className='text-[10px] font-medium'>KYC Verificado</span>
        </div>
      </div>
    </div>
  )
}

// ============================================
// PREMIUM ORDER CARD COMPONENT
// ============================================
interface PremiumOrderCardProps {
  order: any
  formatCurrency: (amount: number, currency?: string) => string
  getPaymentMethodIcon: (method: string) => React.ReactNode
  getCryptoLogo: (symbol: string) => string
  onNavigate: (path: string) => void
  onOpenChat: (order: any) => void
}

const PremiumOrderCard: React.FC<PremiumOrderCardProps> = ({
  order,
  formatCurrency,
  getPaymentMethodIcon,
  getCryptoLogo,
  onNavigate,
  onOpenChat,
}) => {
  const isSell = order.type === 'sell' || order.order_type === 'sell'
  const username = order.user?.display_name || order.user?.username || 'Anônimo'
  const isVerified = order.user?.is_verified || order.user?.verified
  const isOnline = order.user?.is_online
  const reputation = order.user?.reputation || order.user?.success_rate || 0
  const trades = order.user?.completed_trades || order.user?.total_trades || 0
  const paymentMethods = order.payment_methods || []
  const coin = order.coin || order.cryptocurrency || 'USDT'

  // Format crypto amount with max 4 decimals
  const formatCryptoAmount = (amount: number | string) => {
    const num = Number(amount) || 0
    if (num >= 1000) return num.toFixed(2)
    if (num >= 1) return num.toFixed(4)
    return num.toFixed(6)
  }

  const availableAmount = formatCryptoAmount(order.amount || order.total_amount || 0)
  const minLimit = Number(order.minAmount || order.min_order_limit || 0)
  const maxLimit = Number(order.maxAmount || order.max_order_limit || 0)

  return (
    <div className='p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all'>
      {/* Header: Trader + Price */}
      <div className='flex items-center justify-between mb-3'>
        {/* Trader Info */}
        <div className='flex items-center gap-2.5'>
          <div className='relative'>
            <div className='w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg'>
              {username.charAt(0).toUpperCase()}
            </div>
            {isOnline && (
              <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full' />
            )}
          </div>
          <div>
            <div className='flex items-center gap-1.5'>
              <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                {username}
              </span>
              {isVerified && <BadgeCheck className='w-3.5 h-3.5 text-blue-500' />}
            </div>
            <div className='flex items-center gap-1.5 mt-0.5'>
              <Star className='w-3 h-3 text-amber-500 fill-amber-500' />
              <span className='text-[11px] text-gray-500 dark:text-gray-400'>{reputation}%</span>
              <span className='text-gray-300 dark:text-gray-600'>•</span>
              <span className='text-[11px] text-gray-500 dark:text-gray-400'>{trades} trades</span>
              {isOnline && (
                <>
                  <span className='text-gray-300 dark:text-gray-600'>•</span>
                  <span className='text-[11px] text-emerald-500 font-medium'>Online</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className='text-right'>
          <p className='text-xl font-bold text-gray-900 dark:text-white'>
            {formatCurrency(Number(order.price || 0))}
          </p>
          <div className='flex items-center justify-end gap-1'>
            <img
              src={getCryptoLogo(coin)}
              alt={coin}
              className='w-3.5 h-3.5 rounded-full'
              onError={e => {
                ;(e.target as HTMLImageElement).src =
                  'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'
              }}
            />
            <p className='text-[11px] text-gray-400'>por {coin}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className='flex items-center gap-4 mb-3 py-2.5 px-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
        <div className='flex-1'>
          <p className='text-[10px] text-gray-400 uppercase font-medium mb-0.5'>Disponível</p>
          <div className='flex items-center gap-1'>
            <img
              src={getCryptoLogo(coin)}
              alt={coin}
              className='w-4 h-4 rounded-full'
              onError={e => {
                ;(e.target as HTMLImageElement).src =
                  'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'
              }}
            />
            <p className='text-xs font-semibold text-gray-900 dark:text-white'>
              {availableAmount} {coin}
            </p>
          </div>
        </div>
        <div className='h-8 w-px bg-gray-200 dark:bg-gray-600' />
        <div className='flex-1'>
          <p className='text-[10px] text-gray-400 uppercase font-medium mb-0.5'>Limites</p>
          <p className='text-xs font-semibold text-gray-900 dark:text-white'>
            {formatCurrency(minLimit)} - {formatCurrency(maxLimit)}
          </p>
        </div>
        <div className='h-8 w-px bg-gray-200 dark:bg-gray-600' />
        <div className='flex items-center gap-1.5 text-gray-500'>
          <Clock className='w-3.5 h-3.5' />
          <span className='text-xs font-medium'>
            {order.timeLimit || order.time_limit || 30} min
          </span>
        </div>
      </div>

      {/* Footer: Payment Methods + Actions */}
      <div className='flex items-center justify-between'>
        {/* Payment Methods */}
        <div className='flex items-center gap-1.5 flex-wrap'>
          {paymentMethods.slice(0, 3).map((method: string) => (
            <div
              key={`${order.id}-${method}`}
              className='flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-lg text-[10px] font-medium'
            >
              {getPaymentMethodIcon(method)}
              {method}
            </div>
          ))}
          {paymentMethods.length > 3 && (
            <span className='text-[10px] text-gray-400'>+{paymentMethods.length - 3}</span>
          )}
        </div>

        {/* Actions */}
        <div className='flex items-center gap-2'>
          <button
            onClick={() => onOpenChat(order)}
            className='p-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-500 rounded-xl transition-all'
            aria-label='Chat'
          >
            <MessageCircle className='w-4 h-4' />
          </button>
          <button
            onClick={() => onNavigate(`/p2p/order/${order.id}`)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs text-white transition-all flex items-center gap-1.5 shadow-lg ${
              isSell
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 shadow-emerald-500/25'
                : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 shadow-red-500/25'
            }`}
          >
            {isSell ? 'Comprar' : 'Vender'}
            <ArrowRight className='w-3.5 h-3.5' />
          </button>
        </div>
      </div>
    </div>
  )
}
