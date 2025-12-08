import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  CheckCircle,
  Shield,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Zap,
  MessageCircle,
  AlertCircle,
  DollarSign,
  Loader2,
  Info,
  CreditCard,
  Users,
  Activity,
  Calendar,
  Building,
  Wallet,
} from 'lucide-react'
import { useP2POrder } from '@/hooks/useP2POrders'
import { useStartTrade } from '@/hooks/useP2PTrades'
import { toast } from 'react-hot-toast'

export const OrderDetailsPage = () => {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const [tradeAmount, setTradeAmount] = useState('')

  // Fetch order details
  const { data: orderData, isLoading, error } = useP2POrder(orderId!)
  const startTradeMutation = useStartTrade()
  const isStartingTrade = startTradeMutation.isPending

  const order = orderData // orderData is already the P2POrder object

  // Debug logs
  console.log('[OrderDetailsPage] orderId:', orderId)
  console.log('[OrderDetailsPage] orderData:', orderData)
  console.log('[OrderDetailsPage] order:', order)
  console.log('[OrderDetailsPage] isLoading:', isLoading)
  console.log('[OrderDetailsPage] error:', error)

  const getBadgeIcon = (badge: string) => {
    const icons: Record<string, any> = {
      pro_trader: Award,
      verified: CheckCircle,
      fast_response: Zap,
      quick_pay: Clock,
    }
    const Icon = icons[badge] || Star
    return <Icon className='w-3 h-3' />
  }

  const getBadgeLabel = (badge: string) => {
    const labels: Record<string, string> = {
      pro_trader: 'Pro Trader',
      verified: 'Verificado',
      fast_response: 'Resposta Rápida',
      quick_pay: 'Pagamento Rápido',
    }
    return labels[badge] || badge
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const calculateTotal = () => {
    if (!tradeAmount || !order) return 0
    return parseFloat(tradeAmount) * parseFloat(order.price)
  }

  const handleStartTrade = async () => {
    if (!tradeAmount || !order) {
      toast.error('Por favor, insira um valor')
      return
    }

    const amount = parseFloat(tradeAmount)
    const minAmount = parseFloat(order.minAmount)
    const maxAmount = parseFloat(order.maxAmount)

    if (amount < minAmount || amount > maxAmount) {
      toast.error(
        `Valor deve estar entre ${formatCurrency(minAmount)} e ${formatCurrency(maxAmount)}`
      )
      return
    }

    try {
      const result = await startTradeMutation.mutateAsync({
        orderId: order.id,
        amount: tradeAmount,
      })

      toast.success('Trade iniciado com sucesso!')
      // result is already the Trade object, not wrapped in data
      navigate(`/p2p/trade/${result.id || (result as any).data?.id}`)
    } catch (error) {
      console.error('Error starting trade:', error)
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
        <span className='ml-3 text-gray-600 dark:text-gray-400'>Carregando ordem...</span>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen'>
        <AlertCircle className='w-16 h-16 text-red-500 mb-4' />
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
          Erro ao carregar ordem
        </h2>
        <p className='text-gray-600 dark:text-gray-400 mb-4'>
          {error instanceof Error ? error.message : 'Ordem não encontrada'}
        </p>
        <button
          onClick={() => navigate('/p2p')}
          className='text-blue-600 hover:text-blue-700 font-medium'
        >
          Voltar ao Marketplace
        </button>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
      {/* Header Responsivo */}
      <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10'>
        <div className='max-w-[1800px] mx-auto px-4 sm:px-6 py-3'>
          <div className='flex items-center justify-between flex-wrap gap-2'>
            <button
              onClick={() => navigate('/p2p')}
              className='flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all text-sm font-medium'
            >
              <ArrowLeft className='w-4 h-4' />
              <span className='hidden sm:inline'>Marketplace</span>
              <span className='sm:hidden'>Voltar</span>
            </button>
            <div className='flex items-center gap-2 sm:gap-4 flex-wrap'>
              <span className='text-xs px-2 sm:px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium whitespace-nowrap'>
                {order.type === 'buy' ? 'Compra' : 'Venda'}
              </span>
              <span className='hidden sm:inline text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Grid Responsivo */}
      <div className='max-w-[1800px] mx-auto px-4 sm:px-6 py-4'>
        <div className='grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-4'>
          {/* Coluna Esquerda - Detalhes */}
          <div className='space-y-4'>
            {/* Card Principal - Responsivo */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700'>
              <div className='p-4 sm:p-6'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
                  {/* Preço */}
                  <div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium'>
                      Preço Unitário
                    </div>
                    <div className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white'>
                      {formatCurrency(parseFloat(order.price))}
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      por {order.coin}
                    </div>
                  </div>

                  {/* Quantidade */}
                  <div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium'>
                      Quantidade Disponível
                    </div>
                    <div className='text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400'>
                      {order.amount} {order.coin}
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      ≈ {formatCurrency(parseFloat(order.amount) * parseFloat(order.price))}
                    </div>
                  </div>
                </div>

                {/* Limites - Grid Responsivo */}
                <div className='grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700'>
                  <div className='text-center'>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Mínimo</div>
                    <div className='text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate'>
                      {formatCurrency(parseFloat(order.minAmount))}
                    </div>
                  </div>
                  <div className='text-center'>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Máximo</div>
                    <div className='text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate'>
                      {formatCurrency(parseFloat(order.maxAmount))}
                    </div>
                  </div>
                  <div className='text-center'>
                    <Clock className='w-3 h-3 sm:w-4 sm:h-4 text-gray-400 mx-auto mb-1' />
                    <div className='text-xs sm:text-sm font-semibold text-gray-900 dark:text-white'>
                      {order.timeLimit || 30} min
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Métodos de Pagamento - Responsivo */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                <CreditCard className='w-4 h-4 text-blue-500' />
                Métodos de Pagamento
              </h3>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {order.paymentMethods && order.paymentMethods.length > 0 ? (
                  order.paymentMethods.map((method: any) => {
                    const details =
                      typeof method.details === 'string'
                        ? JSON.parse(method.details)
                        : method.details
                    const typeUpper = method.type?.toUpperCase()

                    return (
                      <div
                        key={method.id}
                        className='flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700'
                      >
                        <div className='w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0'>
                          {typeUpper === 'PIX' && <CreditCard className='w-4 h-4 text-white' />}
                          {typeUpper === 'BANK_TRANSFER' && (
                            <Building className='w-4 h-4 text-white' />
                          )}
                          {(typeUpper === 'MERCADO_PAGO' || typeUpper === 'PAYPAL') && (
                            <Wallet className='w-4 h-4 text-white' />
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='text-xs font-bold text-blue-900 dark:text-blue-100 uppercase'>
                            {typeUpper}
                          </div>
                          <div className='text-xs text-blue-700 dark:text-blue-300 truncate'>
                            {details?.keyValue ||
                              details?.account ||
                              details?.email ||
                              details?.identifier ||
                              'N/A'}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className='col-span-2 text-center py-4 text-sm text-gray-500'>
                    Nenhum método configurado
                  </div>
                )}
              </div>
            </div>

            {/* Histórico - Oculto em mobile */}
            <div className='hidden sm:block bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                  <Activity className='w-4 h-4 text-green-500' />
                  Histórico de Trades
                </h3>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  {order.completedTrades || 0} trades
                </span>
              </div>
              <div className='text-center py-6'>
                <Activity className='w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2' />
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Ainda não há trades para esta ordem
                </p>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Trader + Trade */}
          <div className='space-y-4'>
            {/* Card do Trader - Compacto em Mobile */}
            <div className='bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6'>
              <div className='flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6'>
                <div className='relative flex-shrink-0'>
                  <div className='w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-lg'>
                    {order.user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  {order.user?.isOnline && (
                    <div className='absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center'>
                      <div className='w-2 h-2 bg-white rounded-full animate-pulse'></div>
                    </div>
                  )}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <h3 className='text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate'>
                      {order.user?.username || 'Anônimo'}
                    </h3>
                    {order.user?.verified && (
                      <Shield className='w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0' />
                    )}
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    {order.user?.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>

              {/* Stats Grid - 2x2 em Mobile */}
              <div className='grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6'>
                <div className='text-center p-2 sm:p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'>
                  <Star className='w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 mx-auto mb-1' />
                  <div className='text-base sm:text-lg font-bold text-gray-900 dark:text-white'>
                    {order.avgRating || 0}%
                  </div>
                  <div className='text-xs text-gray-600 dark:text-gray-400'>Reputação</div>
                </div>
                <div className='text-center p-2 sm:p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'>
                  <Users className='w-3 h-3 sm:w-4 sm:h-4 text-blue-500 mx-auto mb-1' />
                  <div className='text-base sm:text-lg font-bold text-gray-900 dark:text-white'>
                    {order.completedTrades || 0}
                  </div>
                  <div className='text-xs text-gray-600 dark:text-gray-400'>Trades</div>
                </div>
                <div className='text-center p-2 sm:p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'>
                  <CheckCircle className='w-3 h-3 sm:w-4 sm:h-4 text-green-500 mx-auto mb-1' />
                  <div className='text-base sm:text-lg font-bold text-gray-900 dark:text-white'>
                    {order.successRate || 0}%
                  </div>
                  <div className='text-xs text-gray-600 dark:text-gray-400'>Sucesso</div>
                </div>
                <div className='text-center p-2 sm:p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'>
                  <Calendar className='w-3 h-3 sm:w-4 sm:h-4 text-purple-500 mx-auto mb-1' />
                  <div className='text-base sm:text-lg font-bold text-gray-900 dark:text-white'>
                    2024
                  </div>
                  <div className='text-xs text-gray-600 dark:text-gray-400'>Membro</div>
                </div>
              </div>

              {/* Badges - Flex Wrap */}
              {order.badges && order.badges.length > 0 && (
                <div className='mb-4 sm:mb-6'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium'>
                    Badges
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {order.badges.map((badge: string) => (
                      <span
                        key={badge}
                        className='inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-medium shadow-md'
                      >
                        {badge === 'verified' && (
                          <>
                            <Shield className='w-3 h-3' /> Verificado
                          </>
                        )}
                        {badge === 'pro_trader' && (
                          <>
                            <Zap className='w-3 h-3' /> Pro
                          </>
                        )}
                        {badge === 'trusted' && (
                          <>
                            <Award className='w-3 h-3' /> Confiável
                          </>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão Mensagem - Redireciona para Chat */}
              <button
                onClick={() =>
                  navigate(`/chat?userId=${order.user?.id}&orderId=${order.id}&context=p2p`)
                }
                className='w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium transition-all flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
              >
                <MessageCircle className='w-4 h-4' />
                <span className='hidden sm:inline'>Conversar com o Vendedor</span>
                <span className='sm:hidden'>Chat</span>
              </button>
            </div>

            {/* Card Iniciar Trade - Responsivo */}
            <div className='bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-4 sm:p-6 text-white'>
              <h3 className='text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2'>
                <Zap className='w-4 h-4 sm:w-5 sm:h-5' />
                Iniciar Trade
              </h3>

              <div className='space-y-3 sm:space-y-4'>
                {/* Input */}
                <div>
                  <label className='block text-xs font-medium mb-2 opacity-90'>
                    Quanto você quer {order.type === 'buy' ? 'vender' : 'comprar'}?
                  </label>
                  <div className='relative'>
                    <input
                      type='number'
                      value={tradeAmount}
                      onChange={e => setTradeAmount(e.target.value)}
                      placeholder='0.00'
                      className='w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 font-mono text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-white/50'
                      step='0.01'
                      min='0'
                    />
                    <span className='absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-sm font-bold opacity-70'>
                      {order.fiatCurrency || 'BRL'}
                    </span>
                  </div>
                  <div className='text-xs mt-1.5 opacity-75'>
                    Limites: {formatCurrency(parseFloat(order.minAmount))} -{' '}
                    {formatCurrency(parseFloat(order.maxAmount))}
                  </div>
                </div>

                {/* Preview */}
                {tradeAmount && parseFloat(tradeAmount) > 0 && (
                  <div className='space-y-2 p-3 sm:p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20'>
                    <div className='flex justify-between text-xs sm:text-sm'>
                      <span className='opacity-75'>Você receberá:</span>
                      <span className='font-bold'>
                        {(parseFloat(tradeAmount) / parseFloat(order.price)).toFixed(8)}{' '}
                        {order.coin}
                      </span>
                    </div>
                    <div className='flex justify-between text-xs sm:text-sm'>
                      <span className='opacity-75'>Você pagará:</span>
                      <span className='font-bold'>{formatCurrency(parseFloat(tradeAmount))}</span>
                    </div>
                  </div>
                )}

                {/* Avisos - Compacto */}
                <div className='p-2.5 sm:p-3 rounded-xl bg-yellow-500/20 backdrop-blur-sm border border-yellow-300/30'>
                  <div className='flex gap-2'>
                    <AlertCircle className='w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5' />
                    <div className='text-xs space-y-1'>
                      <p className='font-medium'>Importante:</p>
                      <ul className='list-disc list-inside space-y-0.5 opacity-90 text-xs'>
                        <li>{order.timeLimit || 30} min para completar</li>
                        <li className='hidden sm:list-item'>{order.coin} em escrow</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Botão */}
                <button
                  onClick={handleStartTrade}
                  disabled={
                    !tradeAmount ||
                    parseFloat(tradeAmount) < parseFloat(order.minAmount) ||
                    parseFloat(tradeAmount) > parseFloat(order.maxAmount) ||
                    isStartingTrade
                  }
                  className='w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl bg-white text-blue-600 font-bold text-base sm:text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center justify-center gap-2'
                >
                  {isStartingTrade ? (
                    <>
                      <Loader2 className='w-4 h-4 sm:w-5 sm:h-5 animate-spin' />
                      <span className='hidden sm:inline'>Iniciando...</span>
                      <span className='sm:hidden'>...</span>
                    </>
                  ) : (
                    <>
                      <Zap className='w-4 h-4 sm:w-5 sm:h-5' />
                      <span className='hidden sm:inline'>Iniciar Trade Agora</span>
                      <span className='sm:hidden'>Iniciar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
