import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useCreateP2POrder } from '@/hooks/useP2POrders'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePrices } from '@/hooks/usePrices'
import { useWalletBalances } from '@/hooks/useWalletBalances'
import { CryptoIcon } from '@/components/CryptoIcon'
import { UserProfileSection } from '@/components/trader/UserProfileSection'
import { toast } from 'react-hot-toast'

export const CreateOrderPage = () => {
  const navigate = useNavigate()
  const createOrderMutation = useCreateP2POrder()
  const { data: paymentMethodsData } = usePaymentMethods()
  const { token } = useAuthStore()

  // Form state
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('sell')
  const [coin, setCoin] = useState('')
  const [fiatCurrency, setFiatCurrency] = useState('BRL')
  const [basePrice, setBasePrice] = useState<number>(0)
  const [priceMargin, setPriceMargin] = useState<number>(0) // percentage: -10 to +50
  const [amount, setAmount] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [timeLimit, setTimeLimit] = useState('30')
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
  const [terms, setTerms] = useState('')
  const [autoReply, setAutoReply] = useState('')
  const [allBalances, setAllBalances] = useState<Record<string, number>>({})
  const [walletId, setWalletId] = useState<string | undefined>(undefined)
  const [balancesLoading, setBalancesLoading] = useState(true)

  // Get available cryptos - only those user actually has
  const availableCryptos = Object.keys(allBalances).length > 0 ? Object.keys(allBalances) : []

  // Only fetch prices for cryptos user actually has
  // If coin is selected and available, fetch its price; otherwise fetch all available
  const { prices: cryptoPrices, loading: pricesLoading } = usePrices(
    coin ? [coin] : availableCryptos,
    fiatCurrency
  )

  // Fetch wallet ID first
  useEffect(() => {
    const fetchWalletId = async () => {
      try {
        if (!token) {
          console.error('[CreateOrder] No token found')
          setBalancesLoading(false)
          return
        }

        console.log('[CreateOrder] Fetching wallet list...')
        // Get wallets list
        const response = await fetch(`${API_BASE}/wallets/', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch wallets: ${response.status}`)
        }

        const wallets = await response.json()
        console.log('[CreateOrder] Wallets fetched:', wallets)

        if (!wallets?.length) {
          throw new Error('No wallets found')
        }

        setWalletId(wallets[0].id)
        console.log('[CreateOrder] Wallet ID set:', wallets[0].id)
      } catch (error) {
        console.error('[CreateOrder] Error fetching wallet ID:', error)
        setWalletId(undefined)
        setBalancesLoading(false)
      }
    }

    fetchWalletId()
  }, [token])

  // Use the hook to fetch balances
  const { balances, loading: balancesHookLoading, refreshBalances } = useWalletBalances(walletId)

  // Update balances when they change from hook
  useEffect(() => {
    console.log(
      '[CreateOrder] Balances updated from hook:',
      balances,
      'Loading:',
      balancesHookLoading
    )
    setAllBalances(balances)
    setBalancesLoading(balancesHookLoading)

    // Auto-select first available coin if not selected yet
    if (!coin && Object.keys(balances).length > 0) {
      const firstCoin = Object.keys(balances).sort((a, b) => balances[b] - balances[a])[0]
      if (firstCoin) {
        console.log('[CreateOrder] Auto-selecting first coin:', firstCoin)
        setCoin(firstCoin)
      }
    }
  }, [balances, balancesHookLoading, coin])

  // Update base price from hook when cryptoPrices change
  useEffect(() => {
    if (coin && cryptoPrices?.[coin]?.price) {
      console.log(`[CreateOrder] Price updated for ${coin}:`, cryptoPrices[coin].price)
      setBasePrice(cryptoPrices[coin].price)
    } else {
      setBasePrice(0)
    }
  }, [cryptoPrices, coin])

  // Calculate final price based on basePrice and margin
  const finalPrice = basePrice > 0 ? basePrice * (1 + priceMargin / 100) : 0
  const totalValue =
    finalPrice > 0 && amount ? (finalPrice * Number.parseFloat(amount)).toFixed(2) : '0.00'

  // Smart formatting: shows appropriate decimals based on value
  const formatBalance = (value: number): string => {
    if (value === 0) return '0'
    if (value < 0.0001) return value.toFixed(8).replace(/\.?0+$/, '')
    if (value < 1) return value.toFixed(6).replace(/\.?0+$/, '')
    if (value < 1000) return value.toFixed(4).replace(/\.?0+$/, '')
    return value.toFixed(2).replace(/\.?0+$/, '')
  }

  // Get current coin balance
  const currentBalance = allBalances[coin] || 0

  const fiatOptions = [
    { code: 'BRL', name: 'Real Brasileiro', symbol: 'R$' },
    { code: 'USD', name: 'Dólar Americano', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
  ]

  // Get available cryptos with details for UI display (already defined above, but with more details)
  const availableCryptosWithDetails = Object.entries(allBalances)
    .sort((a, b) => b[1] - a[1])
    .map(([symbol, balance]) => ({ symbol, name: symbol, balance }))

  const handlePaymentMethodToggle = (methodId: string) => {
    setSelectedPaymentMethods(prev =>
      prev.includes(methodId) ? prev.filter(id => id !== methodId) : [...prev, methodId]
    )
  }

  // Helper for currency symbol
  const getCurrencySymbol = () => {
    if (fiatCurrency === 'BRL') return 'R$'
    if (fiatCurrency === 'USD') return '$'
    return '€'
  }

  // Helper for balance validation message
  const getBalanceValidationMessage = () => {
    if (!amount) return null
    if (currentBalance > 0 && Number.parseFloat(amount) <= currentBalance) {
      return <span className='text-green-600 dark:text-green-400'>✓ Você tem saldo suficiente</span>
    }
    if (currentBalance > 0) {
      return (
        <span className='text-red-600 dark:text-red-400'>
          ✗ Saldo insuficiente (Máximo: {formatBalance(currentBalance)})
        </span>
      )
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate raw string inputs first
    if (!amount || amount.trim() === '') {
      toast.error('Por favor, preencha a Quantidade')
      return
    }

    if (!minAmount || minAmount.trim() === '') {
      toast.error('Por favor, preencha o Valor Mínimo')
      return
    }

    if (!maxAmount || maxAmount.trim() === '') {
      toast.error('Por favor, preencha o Valor Máximo')
      return
    }

    console.log('[CreateOrder] handleSubmit called with state:', {
      basePrice,
      finalPrice,
      priceMargin,
      coin,
      fiatCurrency,
      amount,
      minAmount,
      maxAmount,
      currentBalance,
      allBalances,
    })

    // Validate price first
    if (basePrice <= 0) {
      toast.error('Aguarde o carregamento do preço de mercado antes de criar a ordem')
      return
    }

    if (finalPrice <= 0) {
      toast.error('Preço final inválido. Verifique a moeda selecionada')
      return
    }

    // Convert and validate amounts
    const amountNum = Number.parseFloat(amount)
    const minAmountNum = Number.parseFloat(minAmount)
    const maxAmountNum = Number.parseFloat(maxAmount)
    const totalValueNum = Number.parseFloat(totalValue)

    console.log('[CreateOrder] Converted values:', {
      amountNum,
      minAmountNum,
      maxAmountNum,
      totalValueNum,
    })

    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('Quantidade deve ser um número maior que 0')
      return
    }

    if (Number.isNaN(minAmountNum) || minAmountNum <= 0) {
      toast.error('Valor mínimo deve ser um número maior que 0')
      return
    }

    if (Number.isNaN(maxAmountNum) || maxAmountNum <= 0) {
      toast.error('Valor máximo deve ser um número maior que 0')
      return
    }

    if (minAmountNum > maxAmountNum) {
      toast.error('O valor mínimo não pode ser maior que o máximo')
      return
    }

    // Validate balance: amount must be <= currentBalance
    if (amountNum > currentBalance) {
      toast.error(
        `Saldo insuficiente. Você tem ${formatBalance(currentBalance)} ${coin}, mas quer vender ${formatBalance(amountNum)} ${coin}`
      )
      return
    }

    // Validate that total order value is within min/max range
    if (totalValueNum < minAmountNum) {
      toast.error(
        `Valor total (${getCurrencySymbol()} ${totalValue}) é menor que o mínimo (${getCurrencySymbol()} ${minAmount})`
      )
      return
    }

    if (totalValueNum > maxAmountNum) {
      toast.error(
        `Valor total (${getCurrencySymbol()} ${totalValue}) é maior que o máximo (${getCurrencySymbol()} ${maxAmount})`
      )
      return
    }

    if (selectedPaymentMethods.length === 0) {
      toast.error('Selecione pelo menos um método de pagamento')
      return
    }

    try {
      const orderData: Parameters<typeof createOrderMutation.mutateAsync>[0] = {
        type: orderType,
        coin,
        fiat_currency: fiatCurrency,
        price: finalPrice.toString(),
        amount: amountNum.toString(),
        min_amount: minAmountNum.toString(),
        max_amount: maxAmountNum.toString(),
        payment_methods: selectedPaymentMethods,
        time_limit: Number.parseInt(timeLimit),
      }

      if (terms) orderData.terms = terms
      if (autoReply) orderData.auto_reply = autoReply

      console.log('[CreateOrder] Enviando ordem com dados:', {
        finalPrice,
        amountNum,
        minAmountNum,
        maxAmountNum,
        totalValueNum,
        basePrice,
        priceMargin,
        orderData,
      })

      await createOrderMutation.mutateAsync(orderData)

      toast.success('Ordem criada com sucesso!')
      navigate('/p2p')
    } catch (error) {
      console.error('Error creating order:', error)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6'>
      <div className='max-w-6xl mx-auto'>
        {/* Header Compacto */}
        <div className='flex items-center gap-3 mb-4'>
          <button
            onClick={() => navigate('/p2p')}
            title='Voltar'
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
          >
            <ArrowLeft className='w-5 h-5' />
          </button>
          <div>
            <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
              Criar Ordem P2P
            </h1>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              {orderType === 'buy' ? 'Compra' : 'Venda'} de {coin}
            </p>
          </div>
        </div>

        {/* Main Grid: 2 Colunas */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'>
          {/* Coluna Esquerda: Formulário Principal */}
          <div className='lg:col-span-2 space-y-4'>
            <form onSubmit={handleSubmit} className='space-y-4'>
              {/* Card: Tipo de Ordem + Moedas */}
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-3'>
                  Configuração Básica
                </h3>

                {/* Tipo de Ordem */}
                <div className='mb-4'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Tipo de Ordem
                  </label>
                  <div className='grid grid-cols-2 gap-2'>
                    <button
                      type='button'
                      onClick={() => setOrderType('sell')}
                      className={`py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                        orderType === 'sell'
                          ? 'bg-green-600 text-white shadow'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Vender ({fiatCurrency})
                    </button>
                    <button
                      type='button'
                      onClick={() => setOrderType('buy')}
                      className={`py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                        orderType === 'buy'
                          ? 'bg-red-600 text-white shadow'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Comprar ({fiatCurrency})
                    </button>
                  </div>
                </div>

                {/* Moedas em Grid Horizontal */}
                {balancesLoading ? (
                  <div className='mb-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
                    <div className='flex items-center gap-2'>
                      <Loader2 className='w-4 h-4 animate-spin text-blue-600 dark:text-blue-400' />
                      <span className='text-sm text-blue-700 dark:text-blue-300'>
                        Carregando seus saldos da carteira...
                      </span>
                    </div>
                  </div>
                ) : Object.keys(allBalances).length > 0 ? (
                  <div className='mb-3'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      Moeda
                    </label>
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto'>
                      {Object.entries(allBalances)
                        .sort((a, b) => b[1] - a[1])
                        .map(([symbol, balance]) => (
                          <button
                            key={symbol}
                            type='button'
                            onClick={() => setCoin(symbol)}
                            className={`p-2 rounded-lg text-xs font-medium transition-all ${
                              coin === symbol
                                ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            <div className='flex items-center gap-1 justify-center'>
                              <CryptoIcon
                                symbol={symbol}
                                size={16}
                                className='rounded-full flex-shrink-0'
                              />
                              <span>{symbol}</span>
                            </div>
                            <div className='text-xs text-gray-600 dark:text-gray-400'>
                              {formatBalance(balance)}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className='mb-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2'>
                    <AlertCircle className='w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5' />
                    <div>
                      <p className='text-sm font-medium text-yellow-800 dark:text-yellow-300'>
                        Nenhum saldo encontrado
                      </p>
                      <p className='text-xs text-yellow-700 dark:text-yellow-400 mt-1'>
                        Você precisa ter uma carteira com criptomoedas para criar uma ordem de
                        venda.
                      </p>
                    </div>
                  </div>
                )}

                {/* Moeda Fiat */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Moeda Fiat
                  </label>
                  <select
                    value={fiatCurrency}
                    onChange={e => setFiatCurrency(e.target.value)}
                    aria-label='Selecionar moeda fiat'
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  >
                    <option value='BRL'>Real Brasileiro (R$)</option>
                    <option value='USD'>Dólar Americano ($)</option>
                    <option value='EUR'>Euro (€)</option>
                  </select>
                </div>
              </div>

              {/* Card: Preço & Quantidade */}
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-3'>
                  Preço & Quantidade
                </h3>

                {/* Preço Base */}
                {basePrice <= 0 ? (
                  <div className='mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
                    <div className='flex items-center gap-2'>
                      <Loader2 className='w-4 h-4 animate-spin text-blue-600 dark:text-blue-400' />
                      <span className='text-sm text-blue-700 dark:text-blue-300'>
                        Carregando cotação de {coin || 'moeda'}...
                      </span>
                    </div>
                  </div>
                ) : basePrice > 0 ? (
                  <div className='mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
                    <div className='grid grid-cols-2 gap-3 text-sm'>
                      <div>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>Preço Mercado:</p>
                        <p className='font-semibold text-gray-900 dark:text-white'>
                          {getCurrencySymbol()} {formatBalance(basePrice)}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-gray-600 dark:text-gray-400'>Seu Preço:</p>
                        <p className='font-semibold text-blue-600 dark:text-blue-400'>
                          {getCurrencySymbol()} {formatBalance(finalPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300'>
                    ⚠ Não conseguimos buscar o preço. Tente novamente.
                  </div>
                )}

                {/* Margem de Lucro */}
                <div className='mb-3'>
                  <div className='flex items-center justify-between mb-2'>
                    <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Margem de Lucro
                    </label>
                    <span
                      className={`text-sm font-bold ${priceMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {priceMargin > 0 ? '+' : ''}
                      {priceMargin.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type='range'
                    min='-50'
                    max='100'
                    step='0.5'
                    value={priceMargin}
                    onChange={e => setPriceMargin(Number.parseFloat(e.target.value))}
                    aria-label='Margem de lucro'
                    className='w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer'
                  />
                  <div className='flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1'>
                    <span>-50%</span>
                    <span>0%</span>
                    <span>+100%</span>
                  </div>

                  {/* Quick Buttons */}
                  <div className='grid grid-cols-3 gap-2 mt-2'>
                    <button
                      type='button'
                      onClick={() => setPriceMargin(-10)}
                      className='py-1 px-2 rounded text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30 transition'
                    >
                      -10%
                    </button>
                    <button
                      type='button'
                      onClick={() => setPriceMargin(0)}
                      className='py-1 px-2 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition'
                    >
                      Mercado
                    </button>
                    <button
                      type='button'
                      onClick={() => setPriceMargin(10)}
                      className='py-1 px-2 rounded text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30 transition'
                    >
                      +10%
                    </button>
                  </div>
                </div>

                {/* Quantidade */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Quantidade a Vender ({coin}) *
                  </label>
                  <div className='flex gap-2'>
                    <input
                      type='number'
                      step='0.01'
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder='0.00'
                      className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                      required
                    />
                    <button
                      type='button'
                      onClick={() => setAmount(currentBalance.toString())}
                      className='px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition text-sm font-medium'
                    >
                      Max ({formatBalance(currentBalance)} {coin})
                    </button>
                  </div>
                  {amount && currentBalance > 0 && (
                    <p className='text-xs mt-1 text-green-600 dark:text-green-400'>
                      ✓ Saldo suficiente
                    </p>
                  )}
                </div>
              </div>

              {/* Card: Limites e Métodos */}
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-3'>
                  Detalhes da Ordem
                </h3>

                {/* Limites */}
                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Mín. ({fiatCurrency}) *
                    </label>
                    <input
                      type='number'
                      step='0.01'
                      value={minAmount}
                      onChange={e => setMinAmount(e.target.value)}
                      placeholder='0.00'
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                      required
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Máx. ({fiatCurrency}) *
                    </label>
                    <input
                      type='number'
                      step='0.01'
                      value={maxAmount}
                      onChange={e => setMaxAmount(e.target.value)}
                      placeholder='0.00'
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                      required
                    />
                  </div>
                </div>

                {/* Tempo Limite */}
                <div className='mb-4'>
                  <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Tempo Limite (min) *
                  </label>
                  <select
                    value={timeLimit}
                    onChange={e => setTimeLimit(e.target.value)}
                    aria-label='Selecionar tempo limite'
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                    required
                  >
                    <option value='15'>15 minutos</option>
                    <option value='30'>30 minutos</option>
                    <option value='45'>45 minutos</option>
                    <option value='60'>60 minutos</option>
                  </select>
                </div>

                {/* Métodos de Pagamento */}
                <div>
                  <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Métodos de Pagamento *
                  </label>
                  {paymentMethodsData && paymentMethodsData.length > 0 ? (
                    <div className='space-y-1 max-h-32 overflow-y-auto'>
                      {paymentMethodsData.map((method: any) => {
                        const detailsObj =
                          typeof method.details === 'string'
                            ? JSON.parse(method.details)
                            : method.details
                        const accountLabel = detailsObj?.account_number || detailsObj?.key || 'N/A'

                        return (
                          <label
                            key={method.id}
                            className='flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm'
                          >
                            <input
                              type='checkbox'
                              checked={selectedPaymentMethods.includes(method.id)}
                              onChange={() => handlePaymentMethodToggle(method.id)}
                              className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                            />
                            <div className='flex-1 min-w-0'>
                              <p className='font-medium text-gray-900 dark:text-white truncate'>
                                {method.method_type}
                              </p>
                              <p className='text-xs text-gray-600 dark:text-gray-400 truncate'>
                                {accountLabel}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      Nenhum método de pagamento configurado
                    </p>
                  )}
                </div>
              </div>

              {/* Card: Termos */}
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-3'>
                  Mensagens (Opcional)
                </h3>

                <div className='space-y-3'>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Termos da Transação
                    </label>
                    <textarea
                      value={terms}
                      onChange={e => setTerms(e.target.value)}
                      placeholder='Ex: Apenas transferência bancária confirmada...'
                      rows={2}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none'
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Resposta Automática
                    </label>
                    <textarea
                      value={autoReply}
                      onChange={e => setAutoReply(e.target.value)}
                      placeholder='Ex: Olá! Você tem 30 minutos para pagar...'
                      rows={2}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none'
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                disabled={createOrderMutation.isPending || basePrice <= 0}
                className='w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg'
                title={basePrice <= 0 ? 'Aguarde o carregamento do preço de mercado' : ''}
              >
                {createOrderMutation.isPending ? 'Criando ordem...' : 'Criar Ordem'}
              </button>
            </form>
          </div>

          {/* Coluna Direita: Perfil, Resumo & Saldo */}
          <div className='lg:col-span-1 space-y-4'>
            {/* Card: Seu Perfil */}
            <UserProfileSection
              token={token}
              onEdit={() => navigate('/p2p/trader-profile/edit')}
              showEditButton={true}
              showProfileLink={true}
            />

            {/* Card: Resumo */}
            {finalPrice > 0 && amount && (
              <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 rounded-lg shadow p-4 border border-blue-200 dark:border-blue-800 sticky top-4'>
                <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>
                  Resumo da Ordem
                </h4>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-gray-700 dark:text-gray-400'>Quantidade:</span>
                    <span className='font-semibold text-gray-900 dark:text-white'>
                      {formatBalance(Number.parseFloat(amount))} {coin}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-700 dark:text-gray-400'>Preço Unit.:</span>
                    <span className='font-semibold text-gray-900 dark:text-white'>
                      {getCurrencySymbol()} {formatBalance(finalPrice)}
                    </span>
                  </div>
                  <div className='border-t border-blue-300 dark:border-blue-700 pt-2 flex justify-between'>
                    <span className='font-semibold text-gray-900 dark:text-white'>Total:</span>
                    <span className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                      {getCurrencySymbol()} {totalValue}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Card: Saldo */}
            {(currentBalance > 0 || Object.keys(allBalances).length > 0) && (
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
                    Seus Saldos
                  </h4>
                  <button
                    onClick={() => refreshBalances()}
                    disabled={balancesLoading}
                    className='p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                    title='Atualizar saldos'
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${balancesLoading ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
                <div className='space-y-2 max-h-48 overflow-y-auto'>
                  {Object.entries(allBalances)
                    .sort((a, b) => b[1] - a[1])
                    .map(([symbol, balance]) => (
                      <div key={symbol} className='flex items-center justify-between text-sm'>
                        <div className='flex items-center gap-2'>
                          <CryptoIcon symbol={symbol} size={16} className='rounded-full' />
                          <span className='font-medium text-gray-900 dark:text-white'>
                            {symbol}
                          </span>
                        </div>
                        <span
                          className={`font-semibold ${balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}
                        >
                          {formatBalance(balance)}
                        </span>
                      </div>
                    ))}
                </div>
                <div className='mt-3 pt-3 border-t border-gray-200 dark:border-gray-700'>
                  <div className='flex items-center justify-between font-semibold text-gray-900 dark:text-white'>
                    <span>Total:</span>
                    <span className='text-lg text-blue-600 dark:text-blue-400'>
                      {formatBalance(Object.values(allBalances).reduce((a, b) => a + b, 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
