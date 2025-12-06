import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Info, AlertCircle } from 'lucide-react'
import { useCreateP2POrder } from '@/hooks/useP2POrders'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { toast } from 'react-hot-toast'

export const CreateOrderPage = () => {
  const navigate = useNavigate()
  const createOrderMutation = useCreateP2POrder()
  const { data: paymentMethodsData } = usePaymentMethods()

  // Form state
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('sell')
  const [coin, setCoin] = useState('BTC')
  const [fiatCurrency, setFiatCurrency] = useState('BRL')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [timeLimit, setTimeLimit] = useState('30')
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
  const [terms, setTerms] = useState('')
  const [autoReply, setAutoReply] = useState('')

  const cryptoOptions = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'USDT', name: 'Tether' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'SOL', name: 'Solana' },
  ]

  const fiatOptions = [
    { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$' },
    { code: 'USD', name: 'Dólar Americano', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
  ]

  const handlePaymentMethodToggle = (methodId: string) => {
    setSelectedPaymentMethods(prev => 
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!price || !amount || !minAmount || !maxAmount) {
      toast.error('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (parseFloat(minAmount) > parseFloat(maxAmount)) {
      toast.error('O valor mínimo não pode ser maior que o máximo')
      return
    }

    if (selectedPaymentMethods.length === 0) {
      toast.error('Selecione pelo menos um método de pagamento')
      return
    }

    try {
      await createOrderMutation.mutateAsync({
        type: orderType,
        coin,
        fiat_currency: fiatCurrency,
        price: parseFloat(price),
        amount: parseFloat(amount),
        min_amount: parseFloat(minAmount),
        max_amount: parseFloat(maxAmount),
        payment_methods: selectedPaymentMethods,
        time_limit: parseInt(timeLimit),
        terms: terms || undefined,
        auto_reply: autoReply || undefined,
      })

      toast.success('Ordem criada com sucesso!')
      navigate('/p2p')
    } catch (error) {
      console.error('Error creating order:', error)
    }
  }

  const totalValue = price && amount ? (parseFloat(price) * parseFloat(amount)).toFixed(2) : '0.00'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/p2p')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Criar Nova Ordem P2P
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure sua ordem de {orderType === 'buy' ? 'compra' : 'venda'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Type */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tipo de Ordem
          </h2>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setOrderType('sell')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                orderType === 'sell'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Vender (Receber {fiatCurrency})
            </button>
            <button
              type="button"
              onClick={() => setOrderType('buy')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                orderType === 'buy'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Comprar (Pagar {fiatCurrency})
            </button>
          </div>
        </div>

        {/* Asset Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Ativo e Moeda
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Criptomoeda *
              </label>
              <select
                value={coin}
                onChange={(e) => setCoin(e.target.value)}
                aria-label="Selecionar criptomoeda"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {cryptoOptions.map(crypto => (
                  <option key={crypto.symbol} value={crypto.symbol}>
                    {crypto.symbol} - {crypto.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Moeda Fiat *
              </label>
              <select
                value={fiatCurrency}
                onChange={(e) => setFiatCurrency(e.target.value)}
                aria-label="Selecionar moeda fiat"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {fiatOptions.map(fiat => (
                  <option key={fiat.code} value={fiat.code}>
                    {fiat.code} - {fiat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Price and Amount */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Preço e Quantidade
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preço Unitário ({fiatCurrency}) *
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantidade ({coin}) *
              </label>
              <input
                type="number"
                step="0.00000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00000000"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Total Value */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor Total:
              </span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {fiatCurrency} {totalValue}
              </span>
            </div>
          </div>
        </div>

        {/* Order Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Limites da Ordem
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valor Mínimo ({fiatCurrency}) *
              </label>
              <input
                type="number"
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valor Máximo ({fiatCurrency}) *
              </label>
              <input
                type="number"
                step="0.01"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tempo Limite (minutos) *
            </label>
            <select
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              aria-label="Selecionar tempo limite"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
            </select>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Tempo que o comprador tem para completar o pagamento
            </p>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Métodos de Pagamento *
          </h2>
          
          {console.log('[CreateOrderPage] paymentMethodsData:', paymentMethodsData)}
          {paymentMethodsData && paymentMethodsData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paymentMethodsData.map((method: any) => {
                // Details is already an object from backend
                const detailsObj = typeof method.details === 'string' 
                  ? JSON.parse(method.details) 
                  : method.details
                
                // Format display text based on payment type
                const getDisplayText = () => {
                  const type = method.type?.toUpperCase() || ''
                  if (type === 'PIX') {
                    return detailsObj.keyValue || detailsObj.key || 'PIX'
                  }
                  if (type.includes('BANC') || type === 'BANK') {
                    return detailsObj.bankName || detailsObj.account || 'Transferência Bancária'
                  }
                  return detailsObj.holderName || method.type
                }

                return (
                  <label
                    key={method.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedPaymentMethods.includes(method.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPaymentMethods.includes(method.id)}
                      onChange={() => handlePaymentMethodToggle(method.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white uppercase">
                        {method.type}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getDisplayText()}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          ) : (
            <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                Você ainda não tem métodos de pagamento cadastrados
              </p>
              <button
                type="button"
                onClick={() => navigate('/settings/payment-methods')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Adicionar Método de Pagamento
              </button>
            </div>
          )}
        </div>

        {/* Terms and Auto Reply */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Termos e Resposta Automática
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Termos da Ordem (opcional)
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                placeholder="Ex: Aceito apenas pagamentos PIX instantâneos, respondo em até 5 minutos..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mensagem Automática (opcional)
              </label>
              <textarea
                value={autoReply}
                onChange={(e) => setAutoReply(e.target.value)}
                rows={3}
                placeholder="Ex: Olá! Obrigado por iniciar um trade comigo. Por favor, realize o pagamento e envie o comprovante..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium mb-2">Informações Importantes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Certifique-se de que tem saldo suficiente para realizar a ordem</li>
                <li>Suas criptomoedas ficarão em escrow até a conclusão do trade</li>
                <li>Responda rapidamente aos compradores para manter sua reputação alta</li>
                <li>Não compartilhe informações pessoais fora da plataforma</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/p2p')}
            className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createOrderMutation.isPending}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2"
          >
            {createOrderMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Ordem'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
