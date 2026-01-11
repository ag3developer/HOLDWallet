import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  RefreshCw,
  Crown,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Clock,
  Wallet,
  BadgeCheck,
  Sparkles,
  ChevronRight,
  Check,
  CreditCard,
  Target,
  Percent,
} from 'lucide-react'
import { useCreateP2POrder } from '@/hooks/useP2POrders'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { usePrices } from '@/hooks/usePrices'
import { useWalletBalances } from '@/hooks/useWalletBalances'
import { useUserWallet } from '@/hooks/useUserWallet'
import { CryptoIcon } from '@/components/CryptoIcon'
import { ExchangeRateDisplay } from '@/components/ExchangeRateDisplay'
import { toast } from 'react-hot-toast'
import { currencyConverterService } from '@/services/currency-converter-service'
import { appNotifications } from '@/services/appNotifications'

export const CreateOrderPage = () => {
  const navigate = useNavigate()
  const createOrderMutation = useCreateP2POrder()
  const { data: paymentMethodsData } = usePaymentMethods()
  const { data: wallet, isLoading: walletLoading } = useUserWallet()

  // Form state
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('sell')
  const [coin, setCoin] = useState('')
  const [fiatCurrency, setFiatCurrency] = useState('BRL')
  const [basePrice, setBasePrice] = useState<number>(0)
  const [priceMargin, setPriceMargin] = useState<number>(0)
  const [amount, setAmount] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [timeLimit, setTimeLimit] = useState('30')
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
  const [terms, setTerms] = useState('')
  const [autoReply, setAutoReply] = useState('')
  const [allBalances, setAllBalances] = useState<Record<string, number>>({})
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)

  const availableCryptos = Object.keys(allBalances).length > 0 ? Object.keys(allBalances) : []
  // ⚠️ IMPORTANTE: Sempre buscar preços em USD!
  // A conversão para fiatCurrency é feita manualmente abaixo usando currencyConverterService
  // Se buscar em BRL e depois converter de USD→BRL, o valor será multiplicado 2x
  const { prices: cryptoPrices, loading: pricesLoading } = usePrices(
    coin ? [coin] : availableCryptos,
    'USD'
  )
  const { balances, loading: balancesHookLoading, refreshBalances } = useWalletBalances(wallet?.id)

  useEffect(() => {
    setAllBalances(balances)
    setBalancesLoading(balancesHookLoading || walletLoading)
    if (!coin && Object.keys(balances).length > 0) {
      const sortedCoins = Object.keys(balances).sort(
        (a, b) => (balances[b] ?? 0) - (balances[a] ?? 0)
      )
      const firstCoin = sortedCoins[0]
      if (firstCoin) setCoin(firstCoin)
    }
  }, [balances, balancesHookLoading, walletLoading, coin])

  useEffect(() => {
    if (coin && cryptoPrices?.[coin]?.price) {
      // cryptoPrices já vem em USD (buscamos com 'USD' acima)
      const priceInUSD = cryptoPrices[coin].price
      let convertedPrice = priceInUSD
      // Converter de USD para a moeda fiat selecionada
      if (fiatCurrency === 'BRL') {
        convertedPrice = currencyConverterService.convert(priceInUSD, 'USD', 'BRL')
      } else if (fiatCurrency === 'EUR') {
        convertedPrice = currencyConverterService.convert(priceInUSD, 'USD', 'EUR')
      }
      setBasePrice(convertedPrice)
    } else {
      setBasePrice(0)
    }
  }, [cryptoPrices, coin, fiatCurrency])

  const finalPrice = basePrice > 0 ? basePrice * (1 + priceMargin / 100) : 0
  const totalValue =
    finalPrice > 0 && amount ? (finalPrice * Number.parseFloat(amount)).toFixed(2) : '0.00'
  const currentBalance = allBalances[coin] || 0

  const formatBalance = (value: number): string => {
    if (value === 0) return '0'
    if (value < 0.0001) return value.toFixed(8).replace(/\.?0+$/, '')
    if (value < 1) return value.toFixed(6).replace(/\.?0+$/, '')
    if (value < 1000) return value.toFixed(4).replace(/\.?0+$/, '')
    return value.toFixed(2).replace(/\.?0+$/, '')
  }

  const getCurrencySymbol = () => {
    if (fiatCurrency === 'BRL') return 'R$'
    if (fiatCurrency === 'USD') return '$'
    return '€'
  }

  const handlePaymentMethodToggle = (methodId: string) => {
    setSelectedPaymentMethods(prev =>
      prev.includes(methodId) ? prev.filter(id => id !== methodId) : [...prev, methodId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
    if (basePrice <= 0) {
      toast.error('Aguarde o carregamento do preço de mercado')
      return
    }
    if (finalPrice <= 0) {
      toast.error('Preço final inválido')
      return
    }

    const amountNum = Number.parseFloat(amount)
    const minAmountNum = Number.parseFloat(minAmount)
    const maxAmountNum = Number.parseFloat(maxAmount)
    const totalValueNum = Number.parseFloat(totalValue)

    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('Quantidade deve ser maior que 0')
      return
    }
    if (Number.isNaN(minAmountNum) || minAmountNum <= 0) {
      toast.error('Valor mínimo deve ser maior que 0')
      return
    }
    if (Number.isNaN(maxAmountNum) || maxAmountNum <= 0) {
      toast.error('Valor máximo deve ser maior que 0')
      return
    }
    if (minAmountNum > maxAmountNum) {
      toast.error('Valor mínimo não pode ser maior que o máximo')
      return
    }
    if (amountNum > currentBalance) {
      toast.error(`Saldo insuficiente. Você tem ${formatBalance(currentBalance)} ${coin}`)
      return
    }
    if (totalValueNum < minAmountNum) {
      toast.error('Valor total é menor que o mínimo')
      return
    }
    if (totalValueNum > maxAmountNum) {
      toast.error('Valor total é maior que o máximo')
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
        price: finalPrice.toString(),
        amount: amountNum.toString(),
        minAmount: minAmountNum.toString(),
        maxAmount: maxAmountNum.toString(),
        paymentMethods: selectedPaymentMethods,
        timeLimit: Number.parseInt(timeLimit),
      }

      if (terms) orderData.terms = terms
      if (autoReply) orderData.autoReply = autoReply

      await createOrderMutation.mutateAsync(orderData)
      appNotifications.orderCreated('new', orderType, amountNum, coin)
      toast.success('Ordem criada com sucesso!')
      navigate('/p2p')
    } catch (error) {
      console.error('Error creating order:', error)
    }
  }

  const steps = [
    { number: 1, label: 'Tipo', icon: Target },
    { number: 2, label: 'Preço', icon: Percent },
    { number: 3, label: 'Detalhes', icon: CreditCard },
  ]

  return (
    <div className='space-y-4 pb-24'>
      {/* Premium Header */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900'>
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full blur-3xl' />
          <div className='absolute bottom-0 left-0 w-48 h-48 bg-indigo-500 rounded-full blur-3xl' />
        </div>

        <div className='relative p-4'>
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
                  <div className='w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center'>
                    <Crown className='w-3.5 h-3.5 text-white' />
                  </div>
                  <h1 className='text-lg font-bold text-white'>Criar Anúncio</h1>
                </div>
                <p className='text-xs text-gray-400 mt-0.5'>
                  {orderType === 'sell' ? 'Venda' : 'Compra'} de {coin || 'Crypto'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className='flex items-center gap-2'>
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              return (
                <React.Fragment key={step.number}>
                  <button
                    onClick={() => setCurrentStep(step.number)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className='w-3 h-3' /> : <Icon className='w-3 h-3' />}
                    <span className='text-[10px] font-semibold'>{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 ${isCompleted ? 'bg-emerald-500/50' : 'bg-white/10'}`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Step 1: Order Type & Crypto */}
        {currentStep === 1 && (
          <div className='space-y-4'>
            {/* Order Type */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
              <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                <Target className='w-4 h-4 text-blue-500' />
                Tipo de Ordem
              </h3>
              <div className='grid grid-cols-2 gap-3'>
                <button
                  type='button'
                  onClick={() => setOrderType('sell')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    orderType === 'sell'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                      orderType === 'sell'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    <TrendingUp className='w-5 h-5' />
                  </div>
                  <p
                    className={`text-sm font-bold ${
                      orderType === 'sell'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Vender
                  </p>
                  <p className='text-[10px] text-gray-500 mt-0.5'>Receber {fiatCurrency}</p>
                </button>
                <button
                  type='button'
                  onClick={() => setOrderType('buy')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    orderType === 'buy'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                      orderType === 'buy'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    <TrendingDown className='w-5 h-5' />
                  </div>
                  <p
                    className={`text-sm font-bold ${
                      orderType === 'buy'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Comprar
                  </p>
                  <p className='text-[10px] text-gray-500 mt-0.5'>Pagar {fiatCurrency}</p>
                </button>
              </div>
            </div>

            {/* Select Crypto */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                  <Wallet className='w-4 h-4 text-purple-500' />
                  Selecionar Crypto
                </h3>
                <button
                  type='button'
                  onClick={() => refreshBalances()}
                  disabled={balancesLoading}
                  className='p-1.5 text-gray-400 hover:text-blue-500 rounded-lg transition-all'
                  aria-label='Atualizar saldos'
                >
                  <RefreshCw className={`w-4 h-4 ${balancesLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {balancesLoading ? (
                <div className='flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl'>
                  <Loader2 className='w-4 h-4 animate-spin text-blue-500' />
                  <span className='text-xs text-blue-600 dark:text-blue-400'>
                    Carregando saldos...
                  </span>
                </div>
              ) : Object.keys(allBalances).length > 0 ? (
                <div className='grid grid-cols-2 gap-2'>
                  {Object.entries(allBalances)
                    .sort((a, b) => b[1] - a[1])
                    .map(([symbol, balance]) => (
                      <button
                        key={symbol}
                        type='button'
                        onClick={() => setCoin(symbol)}
                        className={`p-3 rounded-xl border-2 transition-all text-left ${
                          coin === symbol
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className='flex items-center gap-2 mb-1'>
                          <CryptoIcon symbol={symbol} size={20} className='rounded-full' />
                          <span className='text-sm font-bold text-gray-900 dark:text-white'>
                            {symbol}
                          </span>
                        </div>
                        <p className='text-xs text-gray-500'>Saldo: {formatBalance(balance)}</p>
                      </button>
                    ))}
                </div>
              ) : (
                <div className='p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-start gap-2'>
                  <AlertCircle className='w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5' />
                  <div>
                    <p className='text-xs font-medium text-amber-700 dark:text-amber-400'>
                      Nenhum saldo encontrado
                    </p>
                    <p className='text-[10px] text-amber-600 dark:text-amber-500 mt-0.5'>
                      Deposite crypto para criar uma ordem de venda
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Fiat Currency */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
              <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3'>Moeda Fiat</h3>
              <div className='grid grid-cols-3 gap-2'>
                {[
                  { code: 'BRL', symbol: 'R$', flag: '🇧🇷' },
                  { code: 'USD', symbol: '$', flag: '🇺🇸' },
                  { code: 'EUR', symbol: '€', flag: '🇪🇺' },
                ].map(currency => (
                  <button
                    key={currency.code}
                    type='button'
                    onClick={() => setFiatCurrency(currency.code)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      fiatCurrency === currency.code
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span className='text-lg'>{currency.flag}</span>
                    <p className='text-xs font-bold text-gray-900 dark:text-white mt-1'>
                      {currency.code}
                    </p>
                  </button>
                ))}
              </div>
              <div className='mt-3'>
                <ExchangeRateDisplay />
              </div>
            </div>

            <button
              type='button'
              onClick={() => setCurrentStep(2)}
              disabled={!coin}
              className='w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2'
            >
              Continuar
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        )}

        {/* Step 2: Price & Amount */}
        {currentStep === 2 && (
          <div className='space-y-4'>
            {/* Market Price */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
              <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                <TrendingUp className='w-4 h-4 text-emerald-500' />
                Preço
              </h3>

              {basePrice <= 0 ? (
                <div className='flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl'>
                  <Loader2 className='w-4 h-4 animate-spin text-blue-500' />
                  <span className='text-xs text-blue-600 dark:text-blue-400'>
                    Carregando cotação de {coin}...
                  </span>
                </div>
              ) : (
                <>
                  <div className='grid grid-cols-2 gap-3 mb-4'>
                    <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                      <p className='text-[10px] text-gray-400 uppercase font-medium'>Mercado</p>
                      <p className='text-lg font-bold text-gray-900 dark:text-white'>
                        {getCurrencySymbol()} {formatBalance(basePrice)}
                      </p>
                    </div>
                    <div className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800'>
                      <p className='text-[10px] text-blue-500 uppercase font-medium'>Seu Preço</p>
                      <p className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                        {getCurrencySymbol()} {formatBalance(finalPrice)}
                      </p>
                    </div>
                  </div>

                  {/* Margin Slider */}
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                        Margem de Lucro
                      </span>
                      <span
                        className={`text-sm font-bold ${priceMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
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
                      className='w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600'
                    />
                    <div className='flex justify-between text-[10px] text-gray-400'>
                      <span>-50%</span>
                      <span>0%</span>
                      <span>+100%</span>
                    </div>
                    <div className='grid grid-cols-3 gap-2'>
                      {[
                        { value: -10, label: '-10%', color: 'red' },
                        { value: 0, label: 'Mercado', color: 'gray' },
                        { value: 10, label: '+10%', color: 'emerald' },
                      ].map(btn => (
                        <button
                          key={btn.value}
                          type='button'
                          onClick={() => setPriceMargin(btn.value)}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                            priceMargin === btn.value
                              ? btn.color === 'red'
                                ? 'bg-red-500 text-white'
                                : btn.color === 'emerald'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-600 text-white'
                              : btn.color === 'red'
                                ? 'bg-red-100 dark:bg-red-900/20 text-red-600'
                                : btn.color === 'emerald'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Amount */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
              <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                <Sparkles className='w-4 h-4 text-amber-500' />
                Quantidade a Vender
              </h3>
              <div className='space-y-3'>
                <div className='relative'>
                  <input
                    type='number'
                    step='0.0001'
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder='0.00'
                    className='w-full px-4 py-3 text-lg font-mono border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                  />
                  <span className='absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400'>
                    {coin}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-xs text-gray-500'>
                    Disponível: {formatBalance(currentBalance)} {coin}
                  </span>
                  <button
                    type='button'
                    onClick={() => setAmount(currentBalance.toString())}
                    className='px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs font-medium'
                  >
                    Usar Máximo
                  </button>
                </div>
                {amount && Number.parseFloat(amount) <= currentBalance && (
                  <div className='flex items-center gap-1 text-emerald-600'>
                    <Check className='w-3 h-3' />
                    <span className='text-xs'>Saldo suficiente</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            {finalPrice > 0 && amount && (
              <div className='bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800'>
                <h4 className='text-xs font-semibold text-gray-900 dark:text-white mb-3'>Resumo</h4>
                <div className='space-y-2'>
                  <div className='flex justify-between text-xs'>
                    <span className='text-gray-600 dark:text-gray-400'>Quantidade:</span>
                    <span className='font-semibold text-gray-900 dark:text-white'>
                      {formatBalance(Number.parseFloat(amount) || 0)} {coin}
                    </span>
                  </div>
                  <div className='flex justify-between text-xs'>
                    <span className='text-gray-600 dark:text-gray-400'>Preço:</span>
                    <span className='font-semibold text-gray-900 dark:text-white'>
                      {getCurrencySymbol()} {formatBalance(finalPrice)}
                    </span>
                  </div>
                  <div className='pt-2 border-t border-blue-200 dark:border-blue-700 flex justify-between'>
                    <span className='text-sm font-bold text-gray-900 dark:text-white'>Total:</span>
                    <span className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                      {getCurrencySymbol()} {totalValue}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className='flex gap-3'>
              <button
                type='button'
                onClick={() => setCurrentStep(1)}
                className='flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl'
              >
                Voltar
              </button>
              <button
                type='button'
                onClick={() => setCurrentStep(3)}
                disabled={!amount || basePrice <= 0}
                className='flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl flex items-center justify-center gap-2'
              >
                Continuar
                <ChevronRight className='w-4 h-4' />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {currentStep === 3 && (
          <div className='space-y-4'>
            {/* Limits */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
              <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                <Shield className='w-4 h-4 text-blue-500' />
                Limites da Ordem
              </h3>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-[10px] text-gray-500 uppercase font-medium mb-1'>
                    Mínimo ({fiatCurrency})
                  </label>
                  <input
                    type='number'
                    step='0.01'
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    placeholder='0.00'
                    className='w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white'
                    required
                  />
                </div>
                <div>
                  <label className='block text-[10px] text-gray-500 uppercase font-medium mb-1'>
                    Máximo ({fiatCurrency})
                  </label>
                  <input
                    type='number'
                    step='0.01'
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    placeholder='0.00'
                    className='w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white'
                    required
                  />
                </div>
              </div>
            </div>

            {/* Time Limit */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
              <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                <Clock className='w-4 h-4 text-amber-500' />
                Tempo Limite
              </h3>
              <div className='grid grid-cols-4 gap-2'>
                {['15', '30', '45', '60'].map(time => (
                  <button
                    key={time}
                    type='button'
                    onClick={() => setTimeLimit(time)}
                    className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
                      timeLimit === time
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {time} min
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
              <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                <CreditCard className='w-4 h-4 text-purple-500' />
                Métodos de Pagamento
              </h3>
              {paymentMethodsData && paymentMethodsData.length > 0 ? (
                <div className='space-y-2'>
                  {paymentMethodsData.map((method: any) => {
                    const isSelected = selectedPaymentMethods.includes(method.id)
                    return (
                      <button
                        key={method.id}
                        type='button'
                        onClick={() => handlePaymentMethodToggle(method.id)}
                        className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                          }`}
                        >
                          {method.method_type?.includes('PIX') ? (
                            <Zap className='w-4 h-4' />
                          ) : (
                            <CreditCard className='w-4 h-4' />
                          )}
                        </div>
                        <div className='flex-1 text-left'>
                          <p className='text-sm font-medium text-gray-900 dark:text-white'>
                            {method.method_type}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && <Check className='w-3 h-3 text-white' />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className='p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 text-amber-500' />
                  <span className='text-xs text-amber-700 dark:text-amber-400'>
                    Nenhum método configurado
                  </span>
                </div>
              )}
            </div>

            {/* Terms (Optional) */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4'>
              <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-3'>
                Mensagens (Opcional)
              </h3>
              <div className='space-y-3'>
                <div>
                  <label className='block text-[10px] text-gray-500 uppercase font-medium mb-1'>
                    Termos da Transação
                  </label>
                  <textarea
                    value={terms}
                    onChange={e => setTerms(e.target.value)}
                    placeholder='Ex: Apenas transferência bancária confirmada...'
                    rows={2}
                    className='w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white resize-none'
                  />
                </div>
                <div>
                  <label className='block text-[10px] text-gray-500 uppercase font-medium mb-1'>
                    Resposta Automática
                  </label>
                  <textarea
                    value={autoReply}
                    onChange={e => setAutoReply(e.target.value)}
                    placeholder='Ex: Olá! Você tem 30 minutos para pagar...'
                    rows={2}
                    className='w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white resize-none'
                  />
                </div>
              </div>
            </div>

            <div className='flex gap-3'>
              <button
                type='button'
                onClick={() => setCurrentStep(2)}
                className='flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl'
              >
                Voltar
              </button>
              <button
                type='submit'
                disabled={createOrderMutation.isPending || selectedPaymentMethods.length === 0}
                className='flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2'
              >
                {createOrderMutation.isPending ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Criando...
                  </>
                ) : (
                  <>
                    <BadgeCheck className='w-4 h-4' />
                    Criar Ordem
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
