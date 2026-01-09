import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  CheckCircle,
  Shield,
  Clock,
  Zap,
  MessageCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  Users,
  Calendar,
  Building,
  Wallet,
  BadgeCheck,
  Lock,
  Sparkles,
} from 'lucide-react'
import { useP2POrder } from '@/hooks/useP2POrders'
import { useStartTrade } from '@/hooks/useP2PTrades'
import { toast } from 'react-hot-toast'

export const OrderDetailsPage = () => {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const [tradeAmount, setTradeAmount] = useState('')

  const { data: orderData, isLoading, error } = useP2POrder(orderId!)
  const startTradeMutation = useStartTrade()
  const isStartingTrade = startTradeMutation.isPending

  const order = orderData

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatCryptoAmount = (amount: string | number): string => {
    const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount
    if (Number.isNaN(num)) return '0'
    if (num < 0.00000001 && num > 0) return num.toExponential(2)
    return num
      .toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })
      .replace(/(\d*?[1-9])0+$/, '$1')
      .replace(/,00$/, '')
  }

  const getTraderDisplayName = (): string => {
    if (!order?.user) return 'Anônimo'
    const orderAny = order as any
    return (
      orderAny.advertiser?.display_name ||
      orderAny.advertiser?.business_name ||
      orderAny.user?.display_name ||
      order.user?.username ||
      'Anônimo'
    )
  }

  const getMemberSinceYear = (): string => {
    if (!order?.user) return new Date().getFullYear().toString()
    const orderAny = order as any
    const createdAtDate =
      orderAny.advertiser?.created_at || orderAny.user?.created_at || order.createdAt
    if (createdAtDate) {
      try {
        return new Date(createdAtDate).getFullYear().toString()
      } catch {
        return new Date().getFullYear().toString()
      }
    }
    return new Date().getFullYear().toString()
  }

  const getTraderOnlineStatus = (): boolean => {
    if (!order?.user) return false
    const orderAny = order as any
    return (
      orderAny.advertiser?.is_online ?? orderAny.user?.is_online ?? order.user?.isOnline ?? false
    )
  }

  const handleStartTrade = async () => {
    if (!tradeAmount || !order) {
      toast.error('Por favor, insira um valor')
      return
    }

    const amount = Number.parseFloat(tradeAmount)
    const minAmount = Number.parseFloat(order.minAmount)
    const maxAmount = Number.parseFloat(order.maxAmount)

    if (amount < minAmount || amount > maxAmount) {
      toast.error(
        `Valor deve estar entre ${formatCurrency(minAmount)} e ${formatCurrency(maxAmount)}`
      )
      return
    }

    // Get first payment method as default
    const paymentMethodId = order.paymentMethods?.[0]?.id || ''

    try {
      const result = await startTradeMutation.mutateAsync({
        orderId: order.id,
        amount: tradeAmount,
        paymentMethodId,
      })
      toast.success('Trade iniciado com sucesso!')
      navigate(`/p2p/trade/${result.id || (result as any).data?.id}`)
    } catch (error) {
      console.error('Error starting trade:', error)
    }
  }

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh]'>
        <div className='relative'>
          <div className='w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full' />
          <div className='w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0' />
        </div>
        <p className='mt-4 text-sm text-gray-500 dark:text-gray-400'>Carregando ordem...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh]'>
        <div className='w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4'>
          <AlertCircle className='w-8 h-8 text-red-500' />
        </div>
        <p className='text-sm font-medium text-gray-900 dark:text-white mb-1'>
          Erro ao carregar ordem
        </p>
        <p className='text-xs text-gray-500 mb-4'>
          {error instanceof Error ? error.message : 'Ordem não encontrada'}
        </p>
        <button
          onClick={() => navigate('/p2p')}
          className='px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg'
        >
          Voltar ao Marketplace
        </button>
      </div>
    )
  }

  const isBuyOrder = order.type === 'buy'
  const traderName = getTraderDisplayName()
  const isOnline = getTraderOnlineStatus()

  return (
    <div className='space-y-4 pb-24'>
      {/* Premium Header */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900'>
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full blur-3xl' />
          <div className='absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-3xl' />
        </div>

        <div className='relative p-4'>
          {/* Top Bar */}
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate('/p2p')}
                className='p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border border-white/10'
                aria-label='Voltar'
              >
                <ArrowLeft className='w-4 h-4 text-white' />
              </button>
              <div>
                <div className='flex items-center gap-2'>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      isBuyOrder
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {isBuyOrder ? 'COMPRA' : 'VENDA'}
                  </span>
                  <h1 className='text-lg font-bold text-white'>{order.coin}</h1>
                </div>
                <p className='text-xs text-gray-400 mt-0.5'>Ordem #{order.id?.slice(0, 8)}</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-lg border border-emerald-500/30'>
                <Shield className='w-3 h-3 text-emerald-400' />
                <span className='text-[10px] text-emerald-300 font-medium'>Escrow</span>
              </div>
            </div>
          </div>

          {/* Price Display */}
          <div className='bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[10px] text-gray-400 uppercase font-medium'>
                  Preço por {order.coin}
                </p>
                <p className='text-2xl font-bold text-white mt-1'>
                  {formatCurrency(Number.parseFloat(order.price))}
                </p>
              </div>
              <div className='text-right'>
                <p className='text-[10px] text-gray-400 uppercase font-medium'>Disponível</p>
                <p className='text-lg font-bold text-blue-400 mt-1'>
                  {formatCryptoAmount(order.amount)} {order.coin}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trader Card */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='relative'>
            <div className='w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg'>
              {traderName.charAt(0).toUpperCase()}
            </div>
            {isOnline && (
              <div className='absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center'>
                <div className='w-2 h-2 bg-white rounded-full animate-pulse' />
              </div>
            )}
          </div>
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <h3 className='text-sm font-bold text-gray-900 dark:text-white'>{traderName}</h3>
              {order.user?.verified && <BadgeCheck className='w-4 h-4 text-blue-500' />}
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              {isOnline ? (
                <span className='text-emerald-500 font-medium'>Online agora</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
          <button
            onClick={() =>
              navigate(`/chat?userId=${order.user?.id}&orderId=${order.id}&context=p2p`)
            }
            className='px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all'
          >
            <MessageCircle className='w-3.5 h-3.5' />
            Chat
          </button>
        </div>

        {/* Trader Stats */}
        <div className='grid grid-cols-4 gap-2'>
          <div className='text-center p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'>
            <Star className='w-3.5 h-3.5 text-amber-500 mx-auto mb-1' />
            <p className='text-sm font-bold text-gray-900 dark:text-white'>
              {order.avgRating || 98}%
            </p>
            <p className='text-[9px] text-gray-500'>Reputação</p>
          </div>
          <div className='text-center p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'>
            <Users className='w-3.5 h-3.5 text-blue-500 mx-auto mb-1' />
            <p className='text-sm font-bold text-gray-900 dark:text-white'>
              {order.completedTrades || 0}
            </p>
            <p className='text-[9px] text-gray-500'>Trades</p>
          </div>
          <div className='text-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'>
            <CheckCircle className='w-3.5 h-3.5 text-emerald-500 mx-auto mb-1' />
            <p className='text-sm font-bold text-gray-900 dark:text-white'>
              {order.successRate || 100}%
            </p>
            <p className='text-[9px] text-gray-500'>Sucesso</p>
          </div>
          <div className='text-center p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'>
            <Calendar className='w-3.5 h-3.5 text-purple-500 mx-auto mb-1' />
            <p className='text-sm font-bold text-gray-900 dark:text-white'>
              {getMemberSinceYear()}
            </p>
            <p className='text-[9px] text-gray-500'>Membro</p>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
        <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
          <Sparkles className='w-4 h-4 text-amber-500' />
          Detalhes da Ordem
        </h3>

        <div className='space-y-3'>
          {/* Limits */}
          <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
            <div>
              <p className='text-[10px] text-gray-400 uppercase font-medium'>Mínimo</p>
              <p className='text-sm font-bold text-gray-900 dark:text-white'>
                {formatCurrency(Number.parseFloat(order.minAmount))}
              </p>
            </div>
            <div className='h-8 w-px bg-gray-200 dark:bg-gray-600' />
            <div className='text-center'>
              <p className='text-[10px] text-gray-400 uppercase font-medium'>Máximo</p>
              <p className='text-sm font-bold text-gray-900 dark:text-white'>
                {formatCurrency(Number.parseFloat(order.maxAmount))}
              </p>
            </div>
            <div className='h-8 w-px bg-gray-200 dark:bg-gray-600' />
            <div className='text-right'>
              <p className='text-[10px] text-gray-400 uppercase font-medium'>Tempo</p>
              <p className='text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1'>
                <Clock className='w-3 h-3 text-amber-500' />
                {order.timeLimit || 30} min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
        <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
          <CreditCard className='w-4 h-4 text-blue-500' />
          Métodos de Pagamento
        </h3>

        <div className='space-y-2'>
          {order.paymentMethods && order.paymentMethods.length > 0 ? (
            order.paymentMethods.map((method: any) => {
              const details =
                typeof method.details === 'string' ? JSON.parse(method.details) : method.details
              const typeUpper = method.type?.toUpperCase()

              return (
                <div
                  key={method.id}
                  className='flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800'
                >
                  <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center'>
                    {typeUpper === 'PIX' && <Zap className='w-4 h-4 text-white' />}
                    {typeUpper === 'BANK_TRANSFER' && <Building className='w-4 h-4 text-white' />}
                    {(typeUpper === 'MERCADO_PAGO' || typeUpper === 'PAYPAL') && (
                      <Wallet className='w-4 h-4 text-white' />
                    )}
                    {!['PIX', 'BANK_TRANSFER', 'MERCADO_PAGO', 'PAYPAL'].includes(typeUpper) && (
                      <CreditCard className='w-4 h-4 text-white' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <p className='text-xs font-bold text-gray-900 dark:text-white uppercase'>
                      {typeUpper}
                    </p>
                    <p className='text-[10px] text-gray-500 dark:text-gray-400 truncate'>
                      {details?.keyValue || details?.account || details?.email || 'N/A'}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className='text-center py-4 text-xs text-gray-500'>Nenhum método configurado</div>
          )}
        </div>
      </div>

      {/* Start Trade Card */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-2xl'>
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl' />
        </div>

        <div className='relative p-4'>
          <h3 className='text-sm font-bold text-white mb-4 flex items-center gap-2'>
            <Zap className='w-4 h-4' />
            Iniciar Trade
          </h3>

          <div className='space-y-4'>
            {/* Input */}
            <div>
              <label className='block text-xs font-medium text-white/80 mb-2'>
                Quanto você quer {isBuyOrder ? 'vender' : 'comprar'}?
              </label>
              <div className='relative'>
                <input
                  type='number'
                  value={tradeAmount}
                  onChange={e => setTradeAmount(e.target.value)}
                  placeholder='0.00'
                  aria-label='Valor do trade'
                  className='w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-white/30'
                  step='0.01'
                  min='0'
                />
                <span className='absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-white/70'>
                  {order.fiatCurrency || 'BRL'}
                </span>
              </div>
              <p className='text-[10px] text-white/60 mt-1.5'>
                Limites: {formatCurrency(Number.parseFloat(order.minAmount))} -{' '}
                {formatCurrency(Number.parseFloat(order.maxAmount))}
              </p>
            </div>

            {/* Preview */}
            {tradeAmount && Number.parseFloat(tradeAmount) > 0 && (
              <div className='space-y-2 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20'>
                <div className='flex justify-between text-xs'>
                  <span className='text-white/70'>Você receberá:</span>
                  <span className='font-bold text-white'>
                    {formatCryptoAmount(Number.parseFloat(tradeAmount) / Number.parseFloat(order.price))}{' '}
                    {order.coin}
                  </span>
                </div>
                <div className='flex justify-between text-xs'>
                  <span className='text-white/70'>Você pagará:</span>
                  <span className='font-bold text-white'>
                    {formatCurrency(Number.parseFloat(tradeAmount))}
                  </span>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className='p-3 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-300/30'>
              <div className='flex gap-2'>
                <AlertCircle className='w-4 h-4 text-amber-300 flex-shrink-0' />
                <div className='text-xs text-white/90'>
                  <p className='font-medium'>Importante:</p>
                  <ul className='list-disc list-inside mt-1 space-y-0.5 text-white/70'>
                    <li>{order.timeLimit || 30} min para completar</li>
                    <li>{order.coin} protegido em escrow</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleStartTrade}
              disabled={
                !tradeAmount ||
                Number.parseFloat(tradeAmount) < Number.parseFloat(order.minAmount) ||
                Number.parseFloat(tradeAmount) > Number.parseFloat(order.maxAmount) ||
                isStartingTrade
              }
              className='w-full py-4 rounded-xl bg-white text-blue-600 font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 flex items-center justify-center gap-2'
            >
              {isStartingTrade ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  Iniciando...
                </>
              ) : (
                <>
                  <Zap className='w-5 h-5' />
                  Iniciar Trade Agora
                </>
              )}
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
