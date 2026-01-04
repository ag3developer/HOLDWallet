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
  Award,
  CheckCircle,
  RefreshCw,
  Wallet,
  CreditCard,
  Banknote,
  Loader2,
} from 'lucide-react'
import { useP2POrders, useMarketStats } from '@/hooks/useP2POrders'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'

export const P2PPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'all'>('all')
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null)
  const [selectedFiat, setSelectedFiat] = useState('BRL')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')

  // Fetch real data from backend
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useP2POrders({
    type: activeTab === 'all' ? undefined : (activeTab as 'buy' | 'sell'),
    coin: selectedCrypto || undefined,
    paymentMethod: selectedPaymentMethod || undefined,
    minAmount: minAmount || undefined,
    maxAmount: maxAmount || undefined,
  })

  const { data: marketStats } = useMarketStats(selectedCrypto || undefined)
  const { data: paymentMethodsData } = usePaymentMethods()

  const cryptoOptions = [
    { symbol: 'BTC', name: 'Bitcoin', price: 251500 },
    { symbol: 'ETH', name: 'Ethereum', price: 15800 },
    { symbol: 'USDT', name: 'Tether', price: 5.85 },
    { symbol: 'BNB', name: 'BNB', price: 1450 },
  ]

  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'PIX':
        return <Zap className='w-4 h-4' />
      case 'TED':
        return <Banknote className='w-4 h-4' />
      case 'Mercado Pago':
        return <CreditCard className='w-4 h-4' />
      default:
        return <Wallet className='w-4 h-4' />
    }
  }

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'pro_trader':
        return <Award className='w-3 h-3' />
      case 'verified':
        return <CheckCircle className='w-3 h-3' />
      case 'fast_response':
        return <Zap className='w-3 h-3' />
      case 'quick_pay':
        return <Clock className='w-3 h-3' />
      default:
        return <Star className='w-3 h-3' />
    }
  }

  // Handler para abrir chat com o trader
  const handleOpenChat = (order: any) => {
    const traderId = order.user?.id || order.user_id
    const orderId = order.id

    console.log('🔍 [P2PPage] handleOpenChat chamado')
    console.log('📦 [P2PPage] Dados da ordem:', order)
    console.log('👤 [P2PPage] traderId:', traderId)
    console.log('🆔 [P2PPage] orderId:', orderId)

    if (!traderId) {
      console.error('❌ ID do trader não encontrado')
      alert('❌ Erro: ID do trader não encontrado. Não é possível abrir o chat.')
      return
    }

    if (!orderId) {
      console.error('❌ ID da ordem não encontrado')
      alert('❌ Erro: ID da ordem não encontrado. Não é possível abrir o chat.')
      return
    }

    // Navegar para a página do chat com contexto P2P
    const chatUrl = `/chat?context=p2p&orderId=${orderId}&userId=${traderId}`
    console.log('🔗 [P2PPage] Navegando para:', chatUrl)
    navigate(chatUrl)
  }

  return (
    <div className='space-y-4 md:space-y-6'>
      {/* Header */}
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4'>
        <div>
          <h1 className='text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white'>
            P2P Trading
          </h1>
          <p className='text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1'>
            Negocie criptomoedas diretamente com outros usuários
          </p>
        </div>
        <div className='flex flex-col sm:flex-row gap-2 md:gap-3'>
          <button
            onClick={() => navigate('/p2p/create-order')}
            className='bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2.5 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors inline-flex items-center justify-center gap-2'
          >
            <Plus className='w-4 h-4' />
            Criar Ordem
          </button>
          <button
            onClick={() => navigate('/p2p/my-orders')}
            className='bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors inline-flex items-center justify-center gap-2'
          >
            <Eye className='w-4 h-4' />
            Minhas Ordens
          </button>
        </div>
      </div>

      {/* Trading Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs md:text-sm text-gray-600 dark:text-gray-400'>Volume 24h</p>
              <p className='text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white'>
                {formatCurrency(Number(marketStats?.totalVolume24h || 0))}
              </p>
            </div>
            <div className='w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center'>
              <TrendingUp className='w-4 h-4 md:w-5 md:h-5 text-green-600' />
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs md:text-sm text-gray-600 dark:text-gray-400'>Trades Ativos</p>
              <p className='text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white'>
                {marketStats?.totalTrades24h || 0}
              </p>
            </div>
            <div className='w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center'>
              <Users className='w-4 h-4 md:w-5 md:h-5 text-blue-600' />
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs md:text-sm text-gray-600 dark:text-gray-400'>Ordens Compra</p>
              <p className='text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white'>
                {marketStats?.buyOrders || 0}
              </p>
            </div>
            <div className='w-8 h-8 md:w-10 md:h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center'>
              <Shield className='w-4 h-4 md:w-5 md:h-5 text-yellow-600' />
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-3 md:p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs md:text-sm text-gray-600 dark:text-gray-400'>Ordens Venda</p>
              <p className='text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white'>
                {marketStats?.sellOrders || 0}
              </p>
            </div>
            <div className='w-8 h-8 md:w-10 md:h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center'>
              <CheckCircle className='w-4 h-4 md:w-5 md:h-5 text-purple-600' />
            </div>
          </div>
        </div>
      </div>

      {/* Trading Interface */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
        {/* Tabs and Controls */}
        <div className='p-3 md:p-6 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4'>
            {/* Buy/Sell Tabs */}
            <div className='flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1'>
              <button
                onClick={() => setActiveTab('buy')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-md text-sm md:text-base font-medium transition-colors ${
                  activeTab === 'buy'
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className='w-4 h-4 inline mr-1 sm:mr-2' />
                Comprar
              </button>
              <button
                onClick={() => setActiveTab('sell')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-md text-sm md:text-base font-medium transition-colors ${
                  activeTab === 'sell'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <TrendingDown className='w-4 h-4 inline mr-1 sm:mr-2' />
                Vender
              </button>
            </div>

            {/* Crypto/Fiat Selection */}
            <div className='flex flex-col sm:flex-row gap-2 md:gap-3'>
              <select
                value={selectedCrypto || ''}
                onChange={e => setSelectedCrypto(e.target.value || null)}
                aria-label='Selecionar criptomoeda'
                className='bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 md:px-4 py-2 text-sm md:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value=''>Todas as moedas</option>
                {cryptoOptions.map(crypto => (
                  <option key={crypto.symbol} value={crypto.symbol}>
                    {crypto.symbol} - {crypto.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedFiat}
                onChange={e => setSelectedFiat(e.target.value)}
                aria-label='Selecionar moeda fiat'
                className='bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 md:px-4 py-2 text-sm md:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='BRL'>BRL - Real Brasileiro</option>
                <option value='USD'>USD - Dólar Americano</option>
                <option value='EUR'>EUR - Euro</option>
              </select>
            </div>
          </div>

          {/* Search and Filters */}
          <div className='flex flex-col lg:flex-row gap-2 md:gap-4 mt-3 md:mt-4'>
            <div className='relative flex-1'>
              <Search className='w-4 h-4 md:w-5 md:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por trader, método de pagamento...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Filter className='w-4 h-4' />
              Filtros
            </button>
            <button
              onClick={() => refetchOrders()}
              disabled={ordersLoading}
              className='bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
              <span className='hidden sm:inline'>Atualizar</span>
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className='mt-3 md:mt-4 p-3 md:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4'>
                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Valor Mínimo (BRL)
                  </label>
                  <input
                    type='number'
                    placeholder='0'
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    className='w-full px-3 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Valor Máximo (BRL)
                  </label>
                  <input
                    type='number'
                    placeholder='100000'
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    className='w-full px-3 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  />
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Método de Pagamento
                  </label>
                  <select
                    aria-label='Filtrar por método de pagamento'
                    value={selectedPaymentMethod}
                    onChange={e => setSelectedPaymentMethod(e.target.value)}
                    className='w-full px-3 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  >
                    <option value=''>Todos</option>
                    {paymentMethodsData?.map((method: any) => (
                      <option key={method.id} value={method.type}>
                        {method.type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Status do Trader
                  </label>
                  <select
                    aria-label='Filtrar por status do trader'
                    className='w-full px-3 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  >
                    <option value=''>Todos</option>
                    <option value='online'>Online</option>
                    <option value='verified'>Verificados</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className='overflow-x-auto'>
          {ordersLoading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='w-6 h-6 md:w-8 md:h-8 animate-spin text-blue-600' />
              <span className='ml-3 text-sm md:text-base text-gray-600 dark:text-gray-400'>
                Carregando ordens...
              </span>
            </div>
          ) : ordersError ? (
            <div className='flex items-center justify-center py-12'>
              <div className='text-center px-4'>
                <p className='text-red-600 dark:text-red-400 font-medium text-sm md:text-base'>
                  Erro ao carregar ordens
                </p>
                <p className='text-gray-600 dark:text-gray-400 text-xs md:text-sm mt-2'>
                  {ordersError instanceof Error ? ordersError.message : 'Erro desconhecido'}
                </p>
              </div>
            </div>
          ) : !ordersData?.data || ordersData.data.length === 0 ? (
            <div className='flex items-center justify-center py-12'>
              <p className='text-gray-600 dark:text-gray-400 text-sm md:text-base'>
                Nenhuma ordem encontrada
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className='block lg:hidden space-y-3 p-3'>
                {ordersData.data.map((order: any) => (
                  <div
                    key={order.id}
                    className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3'
                  >
                    {/* Trader Info */}
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-3'>
                        <div className='relative'>
                          <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm'>
                            {(order.user?.display_name || order.user?.username)?.charAt(0) || 'U'}
                          </div>
                          {order.user?.is_online && (
                            <div className='absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-50 dark:border-gray-700 rounded-full'></div>
                          )}
                        </div>
                        <div>
                          <div className='flex items-center gap-2'>
                            <p className='font-medium text-sm text-gray-900 dark:text-white'>
                              {order.user?.display_name || order.user?.username || 'Anônimo'}
                            </p>
                            {(order.user?.is_verified || order.user?.verified) && (
                              <CheckCircle className='w-3 h-3 text-blue-500' />
                            )}
                          </div>
                          <div className='flex items-center gap-2 mt-0.5'>
                            <div className='flex items-center gap-1'>
                              <Star className='w-3 h-3 text-yellow-500 fill-current' />
                              <span className='text-xs text-gray-600 dark:text-gray-400'>
                                {order.user?.reputation || order.user?.success_rate || 0}%
                              </span>
                            </div>
                            <span className='text-xs text-gray-500'>•</span>
                            <span className='text-xs text-gray-600 dark:text-gray-400'>
                              {order.user?.completed_trades || order.user?.total_trades || 0} trades
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price and Amount */}
                    <div className='flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-600'>
                      <div>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>Preço</p>
                        <p className='font-bold text-base text-gray-900 dark:text-white'>
                          {formatCurrency(Number(order.price || 0))}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>Quantidade</p>
                        <p className='text-sm text-gray-900 dark:text-white'>
                          {order.amount || order.total_amount || 0}{' '}
                          {order.coin || order.cryptocurrency}
                        </p>
                      </div>
                    </div>

                    {/* Limits */}
                    <div className='flex justify-between items-center py-2 border-t border-gray-200 dark:border-gray-600'>
                      <div>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>Limites</p>
                        <p className='text-sm text-gray-900 dark:text-white'>
                          {formatCurrency(Number(order.minAmount || order.min_order_limit || 0))} -{' '}
                          {formatCurrency(Number(order.maxAmount || order.max_order_limit || 0))}
                        </p>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Clock className='w-3 h-3 text-gray-400' />
                        <span className='text-xs text-gray-600 dark:text-gray-400'>
                          {order.timeLimit || order.time_limit || 30} min
                        </span>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className='py-2 border-t border-gray-200 dark:border-gray-600'>
                      <p className='text-xs text-gray-600 dark:text-gray-400 mb-2'>Pagamento</p>
                      <div className='flex flex-wrap gap-1'>
                        {order.payment_methods?.map((method: string, index: number) => (
                          <div
                            key={index}
                            className='inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs'
                          >
                            {getPaymentMethodIcon(method)}
                            {method}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className='flex items-center gap-2 pt-2'>
                      <button
                        onClick={() => navigate(`/p2p/order/${order.id}`)}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-white text-sm ${
                          activeTab === 'buy'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {activeTab === 'buy' ? 'Comprar' : 'Vender'}
                      </button>
                      <button
                        onClick={() => handleOpenChat(order)}
                        aria-label='Enviar mensagem para o trader'
                        className='p-2.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-100 dark:bg-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg'
                      >
                        <MessageCircle className='w-4 h-4' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <table className='w-full hidden lg:table'>
                <thead className='bg-gray-50 dark:bg-gray-700'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Trader
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Preço/Quantidade
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Limites
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Pagamento
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {ordersData.data.map((order: any) => (
                    <tr
                      key={order.id}
                      className='hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                    >
                      {/* Trader Info */}
                      <td className='px-6 py-4'>
                        <div className='flex items-center space-x-3'>
                          <div className='relative'>
                            <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold'>
                              {(order.user?.display_name || order.user?.username)?.charAt(0) || 'U'}
                            </div>
                            {order.user?.is_online && (
                              <div className='absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full'></div>
                            )}
                          </div>
                          <div>
                            <div className='flex items-center gap-2'>
                              <p className='font-medium text-gray-900 dark:text-white'>
                                {order.user?.display_name || order.user?.username || 'Anônimo'}
                              </p>
                              {(order.user?.is_verified || order.user?.verified) && (
                                <CheckCircle className='w-4 h-4 text-blue-500' />
                              )}
                            </div>
                            <div className='flex items-center gap-2 mt-1'>
                              <div className='flex items-center gap-1'>
                                <Star className='w-3 h-3 text-yellow-500 fill-current' />
                                <span className='text-xs text-gray-600 dark:text-gray-400'>
                                  {order.user?.reputation || order.user?.success_rate || 0}%
                                </span>
                              </div>
                              <span className='text-xs text-gray-500'>•</span>
                              <span className='text-xs text-gray-600 dark:text-gray-400'>
                                {order.user?.completed_trades || order.user?.total_trades || 0}{' '}
                                trades
                              </span>
                            </div>
                            {order.user?.badges && order.user.badges.length > 0 && (
                              <div className='flex items-center gap-1 mt-1'>
                                {order.user.badges
                                  .slice(0, 2)
                                  .map((badge: string, index: number) => (
                                    <div
                                      key={index}
                                      className='inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs'
                                    >
                                      {getBadgeIcon(badge)}
                                      <span className='capitalize'>{badge.replace('_', ' ')}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Price/Quantity */}
                      <td className='px-6 py-4'>
                        <div>
                          <p className='font-bold text-lg text-gray-900 dark:text-white'>
                            {formatCurrency(Number(order.price || 0))}
                          </p>
                          <p className='text-sm text-gray-600 dark:text-gray-400'>
                            {order.amount || order.total_amount || 0}{' '}
                            {order.coin || order.cryptocurrency}
                          </p>
                        </div>
                      </td>

                      {/* Limits */}
                      <td className='px-6 py-4'>
                        <div>
                          <p className='text-sm text-gray-900 dark:text-white'>
                            {formatCurrency(Number(order.minAmount || order.min_order_limit || 0))}{' '}
                            -{' '}
                            {formatCurrency(Number(order.maxAmount || order.max_order_limit || 0))}
                          </p>
                          <div className='flex items-center gap-1 mt-1'>
                            <Clock className='w-3 h-3 text-gray-400' />
                            <span className='text-xs text-gray-600 dark:text-gray-400'>
                              {order.timeLimit || order.time_limit || 30} min
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Payment Methods */}
                      <td className='px-6 py-4'>
                        <div className='flex flex-wrap gap-1'>
                          {order.payment_methods?.map((method: string, index: number) => (
                            <div
                              key={index}
                              className='inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs'
                            >
                              {getPaymentMethodIcon(method)}
                              {method}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className='px-6 py-4'>
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={() => navigate(`/p2p/order/${order.id}`)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors text-white ${
                              activeTab === 'buy'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {activeTab === 'buy' ? 'Comprar' : 'Vender'}
                          </button>
                          <button
                            onClick={() => handleOpenChat(order)}
                            aria-label='Enviar mensagem para o trader'
                            className='p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
                          >
                            <MessageCircle className='w-4 h-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Quick Trade Card */}
      <div className='bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow p-4 md:p-6 text-white'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4'>
          <div>
            <h3 className='text-lg md:text-xl font-bold mb-1 md:mb-2'>Trade Rápido</h3>
            <p className='opacity-90 text-sm md:text-base'>
              Encontre a melhor cotação automaticamente e execute trades em segundos
            </p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 md:gap-3'>
            <button className='bg-white bg-opacity-20 hover:bg-opacity-30 px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm md:text-base font-medium transition-colors'>
              Compra Rápida
            </button>
            <button className='bg-white text-blue-600 hover:bg-gray-100 px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm md:text-base font-medium transition-colors'>
              Venda Rápida
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
