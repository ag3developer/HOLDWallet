import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Shield, 
  Star, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  MessageCircle,
  AlertCircle,
  Award,
  Zap
} from 'lucide-react'
import { useP2POrder } from '@/hooks/useP2POrders'
import { useStartTrade } from '@/hooks/useP2PTrades'
import { Loader2 } from 'lucide-react'

const P2POrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  
  const { data: order, isLoading } = useP2POrder(orderId!)
  const startTrade = useStartTrade()
  
  const [amount, setAmount] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0
    return amountNum * (order?.data?.price || 0)
  }

  const handleStartTrade = () => {
    if (!orderId || !amount || !selectedPaymentMethod) {
      return
    }

    startTrade.mutate({
      orderId,
      amount: parseFloat(amount),
      paymentMethodId: selectedPaymentMethod
    }, {
      onSuccess: (response) => {
        // Navegar para a página de trade ativo
        navigate(`/p2p/trade/${response.data.id}`)
      }
    })
  }

  const getBadgeIcon = (badge: string) => {
    switch(badge) {
      case 'pro_trader': return <Award className="w-3 h-3" />
      case 'verified': return <CheckCircle className="w-3 h-3" />
      case 'fast_response': return <Zap className="w-3 h-3" />
      case 'quick_pay': return <Clock className="w-3 h-3" />
      default: return <Star className="w-3 h-3" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!order?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ordem não encontrada
          </h2>
          <button
            onClick={() => navigate('/p2p')}
            className="text-blue-600 hover:underline"
          >
            Voltar ao marketplace
          </button>
        </div>
      </div>
    )
  }

  const orderData = order.data
  const isValid = amount && selectedPaymentMethod && 
    parseFloat(amount) >= orderData.min_amount && 
    parseFloat(amount) <= orderData.max_amount

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate('/p2p')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar ao Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      orderData.type === 'buy' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {orderData.type === 'buy' ? 'Compra' : 'Venda'}
                    </span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {orderData.coin}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Quantidade disponível: {orderData.amount} {orderData.coin}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(orderData.price)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    por {orderData.coin}
                  </p>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Limite Mínimo</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(orderData.min_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Limite Máximo</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(orderData.max_amount)}
                  </p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Métodos de Pagamento Aceitos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {orderData.payment_methods?.map((method: string, index: number) => (
                    <div key={index} className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg font-medium">
                      {method}
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Limit */}
              <div className="mt-6 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-5 h-5" />
                <span>Tempo limite para pagamento: {orderData.time_limit || 30} minutos</span>
              </div>

              {/* Terms */}
              {orderData.terms && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Termos e Condições
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {orderData.terms}
                  </p>
                </div>
              )}
            </div>

            {/* Trader Profile */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Informações do Trader
              </h3>
              
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {orderData.user?.username?.charAt(0) || 'U'}
                  </div>
                  {orderData.user?.is_online && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      {orderData.user?.username || 'Anônimo'}
                    </h4>
                    {orderData.user?.is_verified && (
                      <CheckCircle className="w-5 h-5 text-blue-500" />
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Reputação</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {orderData.user?.reputation || 0}%
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Trades</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {orderData.user?.completed_trades || 0}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Taxa</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {orderData.user?.success_rate || 0}%
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  {orderData.user?.badges && orderData.user.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {orderData.user.badges.map((badge: string, index: number) => (
                        <div key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                          {getBadgeIcon(badge)}
                          <span className="capitalize">{badge.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
                <MessageCircle className="w-4 h-4" />
                Enviar Mensagem
              </button>
            </div>
          </div>

          {/* Right Column - Trade Form */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {orderData.type === 'buy' ? 'Vender' : 'Comprar'} {orderData.coin}
              </h3>

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantidade ({orderData.coin})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`${orderData.min_amount} - ${orderData.max_amount}`}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Disponível: {orderData.amount} {orderData.coin}
                </p>
              </div>

              {/* Payment Method Select */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Método de Pagamento
                </label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  aria-label="Selecionar método de pagamento"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione um método</option>
                  {orderData.payment_methods?.map((method: string, index: number) => (
                    <option key={index} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              {/* Total Calculation */}
              {amount && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Preço</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(orderData.price)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Quantidade</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {amount} {orderData.coin}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900 dark:text-white">Total</span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(calculateTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Messages */}
              {amount && parseFloat(amount) < orderData.min_amount && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Valor mínimo: {formatCurrency(orderData.min_amount)}
                  </p>
                </div>
              )}

              {amount && parseFloat(amount) > orderData.max_amount && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Valor máximo: {formatCurrency(orderData.max_amount)}
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleStartTrade}
                disabled={!isValid || startTrade.isPending}
                className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                  isValid && !startTrade.isPending
                    ? orderData.type === 'buy'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {startTrade.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </span>
                ) : (
                  `${orderData.type === 'buy' ? 'Vender' : 'Comprar'} ${orderData.coin}`
                )}
              </button>

              {/* Warning */}
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                      Atenção
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      Certifique-se de ter o valor total disponível antes de iniciar o trade.
                      Você terá {orderData.time_limit || 30} minutos para completar o pagamento.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default P2POrderDetails
