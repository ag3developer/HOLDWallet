import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Shield, 
  Zap,
  Bitcoin,
  DollarSign,
  Calculator,
  CheckCircle,
  Info,
  Coins,
  Star,
  Users,
  Activity,
  BarChart3,
  Eye,
  EyeOff,
  Settings,
  Repeat,
  Target,
  Globe,
  Wallet,
  CreditCard,
  History,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Lock,
  Percent,
  Timer,
  Award
} from 'lucide-react'

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
  iconName: string
  volume24h: number
  marketCap: number
  high24h: number
  low24h: number
  priceHistory: number[]
}

interface TradeForm {
  type: 'buy' | 'sell'
  fromAsset: string
  toAsset: string
  amount: string
  receiveAmount: string
}

interface TradingStats {
  volume24h: number
  totalTrades: number
  avgExecutionTime: string
  spread: number
}

interface OrderBookEntry {
  price: number
  amount: number
  total: number
}

const cryptoPrices: CryptoPrice[] = [
  { 
    symbol: 'BTC', 
    name: 'Bitcoin', 
    price: 65420.50, 
    change24h: 2.45, 
    iconName: 'bitcoin',
    volume24h: 28547000000,
    marketCap: 1285000000000,
    high24h: 66100.00,
    low24h: 63800.00,
    priceHistory: [63800, 64200, 65100, 64800, 65420]
  },
  { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    price: 3240.80, 
    change24h: -1.20, 
    iconName: 'coins',
    volume24h: 15247000000,
    marketCap: 389000000000,
    high24h: 3285.50,
    low24h: 3198.20,
    priceHistory: [3198, 3245, 3280, 3265, 3240]
  },
  { 
    symbol: 'USDT', 
    name: 'Tether', 
    price: 1.00, 
    change24h: 0.01, 
    iconName: 'dollar',
    volume24h: 52847000000,
    marketCap: 96500000000,
    high24h: 1.001,
    low24h: 0.999,
    priceHistory: [0.999, 1.000, 1.001, 1.000, 1.000]
  },
  { 
    symbol: 'ADA', 
    name: 'Cardano', 
    price: 0.52, 
    change24h: 3.85, 
    iconName: 'coins',
    volume24h: 847000000,
    marketCap: 18200000000,
    high24h: 0.54,
    low24h: 0.49,
    priceHistory: [0.49, 0.50, 0.53, 0.52, 0.52]
  },
  { 
    symbol: 'DOT', 
    name: 'Polkadot', 
    price: 7.42, 
    change24h: -0.85, 
    iconName: 'coins',
    volume24h: 245000000,
    marketCap: 9850000000,
    high24h: 7.68,
    low24h: 7.31,
    priceHistory: [7.31, 7.45, 7.68, 7.55, 7.42]
  },
  { 
    symbol: 'MATIC', 
    name: 'Polygon', 
    price: 0.89, 
    change24h: 5.24, 
    iconName: 'coins',
    volume24h: 156000000,
    marketCap: 8250000000,
    high24h: 0.92,
    low24h: 0.84,
    priceHistory: [0.84, 0.86, 0.90, 0.88, 0.89]
  }
]

const tradingStats: TradingStats = {
  volume24h: 98750000,
  totalTrades: 15420,
  avgExecutionTime: '0.3s',
  spread: 0.15
}

const orderBookData = {
  bids: [
    { price: 65410.50, amount: 0.5, total: 32705.25 },
    { price: 65405.00, amount: 1.2, total: 78486.00 },
    { price: 65400.00, amount: 0.8, total: 52320.00 },
    { price: 65395.50, amount: 2.1, total: 137330.55 },
    { price: 65390.00, amount: 0.6, total: 39234.00 }
  ],
  asks: [
    { price: 65425.50, amount: 0.7, total: 45797.85 },
    { price: 65430.00, amount: 1.5, total: 98145.00 },
    { price: 65435.50, amount: 0.9, total: 58891.95 },
    { price: 65440.00, amount: 1.8, total: 117792.00 },
    { price: 65445.50, amount: 0.4, total: 26178.20 }
  ]
}

export const InstantTradePage = () => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<TradeForm>({
    type: 'buy',
    fromAsset: 'USDT',
    toAsset: 'BTC',
    amount: '',
    receiveAmount: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeTab, setActiveTab] = useState<'simple' | 'advanced' | 'orderbook'>('simple')
  const [priceAlerts, setPriceAlerts] = useState(false)
  const [slippage, setSlippage] = useState(0.5)
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [limitPrice, setLimitPrice] = useState('')

  // Calculate receive amount based on current price
  const calculateReceiveAmount = (amount: string, from: string, to: string) => {
    if (!amount || isNaN(Number(amount))) return '0'
    
    const fromPrice = cryptoPrices.find(p => p.symbol === from)?.price || 1
    const toPrice = cryptoPrices.find(p => p.symbol === to)?.price || 1
    
    const usdValue = Number(amount) * fromPrice
    const receiveAmount = usdValue / toPrice
    
    return receiveAmount.toFixed(to === 'BTC' ? 8 : 6)
  }

  useEffect(() => {
    if (formData.amount) {
      const receive = calculateReceiveAmount(formData.amount, formData.fromAsset, formData.toAsset)
      setFormData(prev => ({ ...prev, receiveAmount: receive }))
    }
  }, [formData.amount, formData.fromAsset, formData.toAsset])

  const handleSwapAssets = () => {
    setFormData(prev => ({
      ...prev,
      fromAsset: prev.toAsset,
      toAsset: prev.fromAsset,
      amount: prev.receiveAmount,
      receiveAmount: prev.amount
    }))
  }

  const handleTradeTypeChange = (type: 'buy' | 'sell') => {
    setFormData(prev => ({
      ...prev,
      type,
      fromAsset: type === 'buy' ? 'USDT' : 'BTC',
      toAsset: type === 'buy' ? 'BTC' : 'USDT'
    }))
  }

  const handleTrade = () => {
    setShowConfirmation(true)
  }

  const confirmTrade = async () => {
    setIsProcessing(true)
    setShowConfirmation(false)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setIsProcessing(false)
    // Here you would redirect to success page or show success message
  }

  const getAssetIcon = (symbol: string) => {
    switch (symbol) {
      case 'BTC':
        return Bitcoin
      case 'ETH':
        return Coins
      case 'USDT':
        return DollarSign
      default:
        return DollarSign
    }
  }

  const fee = Number(formData.amount) * 0.005 // 0.5% fee

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Negociação Instantânea
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Compre e venda criptomoedas diretamente com a HOLD Digital Assets
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Volume 24h</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ${(tradingStats.volume24h / 1000000).toFixed(1)}M
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Trades Hoje</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {tradingStats.totalTrades.toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Execução Média</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {tradingStats.avgExecutionTime}
                </p>
              </div>
              <Timer className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Spread Médio</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {tradingStats.spread}%
                </p>
              </div>
              <Target className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Trading Panel */}
          <div className="xl:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('simple')}
                    className={`flex-1 px-6 py-4 font-medium transition-colors ${
                      activeTab === 'simple'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
                    }`}
                  >
                    <Calculator className="w-4 h-4 inline mr-2" />
                    Simples
                  </button>
                  <button
                    onClick={() => setActiveTab('advanced')}
                    className={`flex-1 px-6 py-4 font-medium transition-colors ${
                      activeTab === 'advanced'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
                    }`}
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Avançado
                  </button>
                  <button
                    onClick={() => setActiveTab('orderbook')}
                    className={`flex-1 px-6 py-4 font-medium transition-colors ${
                      activeTab === 'orderbook'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 inline mr-2" />
                    Order Book
                  </button>
                </div>
              </div>

              {/* Trading Content */}
              <div className="p-6">
                {/* Trade Type Selector */}
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => handleTradeTypeChange('buy')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                      formData.type === 'buy'
                        ? 'bg-green-500 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:text-green-500'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Comprar
                  </button>
                  <button
                    onClick={() => handleTradeTypeChange('sell')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                      formData.type === 'sell'
                        ? 'bg-red-500 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:text-red-500'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 inline mr-2" />
                    Vender
                  </button>
                </div>

                {/* From Asset */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {formData.type === 'buy' ? 'Pagar com' : 'Vender'}
                  </label>
                  <div className="relative">
                    <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center flex-1">
                        {React.createElement(getAssetIcon(formData.fromAsset), { 
                          className: "w-6 h-6 text-orange-500 mr-3" 
                        })}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formData.fromAsset}
                          </div>
                          <div className="text-sm text-gray-500">
                            ${cryptoPrices.find(p => p.symbol === formData.fromAsset)?.price.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        className="text-right text-xl font-medium bg-transparent border-none outline-none text-gray-900 dark:text-white w-32"
                      />
                    </div>
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center mb-4">
                  <button
                    type="button"
                    aria-label="Trocar moedas"
                    onClick={handleSwapAssets}
                    className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ArrowUpDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>

                {/* To Asset */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {formData.type === 'buy' ? 'Receber' : 'Receber em troca'}
                  </label>
                  <div className="relative">
                    <div className="flex items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center flex-1">
                        {React.createElement(getAssetIcon(formData.toAsset), { 
                          className: "w-6 h-6 text-orange-500 mr-3" 
                        })}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formData.toAsset}
                          </div>
                          <div className="text-sm text-gray-500">
                            ${cryptoPrices.find(p => p.symbol === formData.toAsset)?.price.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xl font-medium text-gray-900 dark:text-white">
                        {formData.receiveAmount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fee Information */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Taxa de negociação (0.5%)</span>
                    <span className="font-medium">${fee.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-400">Valor total</span>
                    <span className="font-bold text-lg">${(Number(formData.amount) + fee).toFixed(2)}</span>
                  </div>
                </div>

                {/* Trade Button */}
                <button
                  onClick={handleTrade}
                  disabled={!formData.amount || Number(formData.amount) <= 0 || isProcessing}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    formData.type === 'buy'
                      ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300'
                      : 'bg-red-500 hover:bg-red-600 disabled:bg-gray-300'
                  } text-white disabled:cursor-not-allowed`}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processando...
                    </div>
                  ) : (
                    `${formData.type === 'buy' ? 'Comprar' : 'Vender'} ${formData.toAsset}`
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Market Data Sidebar */}
          <div className="xl:col-span-2 space-y-6">
            {/* Live Prices */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Preços em Tempo Real
                </h3>
                <button
                  aria-label="Atualizar preços"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                {cryptoPrices.map((crypto) => {
                  const IconComponent = getAssetIcon(crypto.symbol)
                  return (
                    <div key={crypto.symbol} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                      <div className="flex items-center space-x-3">
                        <IconComponent className="w-8 h-8 text-orange-500" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {crypto.symbol}
                          </div>
                          <div className="text-sm text-gray-500">{crypto.name}</div>
                          <div className="text-xs text-gray-400">
                            Vol: ${(crypto.volume24h / 1000000000).toFixed(2)}B
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-gray-900 dark:text-white">
                          ${crypto.price.toLocaleString()}
                        </div>
                        <div className={`text-sm font-medium ${
                          crypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {crypto.change24h >= 0 ? '↗' : '↘'} {Math.abs(crypto.change24h)}%
                        </div>
                        <div className="text-xs text-gray-400">
                          H: ${crypto.high24h.toLocaleString()} L: ${crypto.low24h.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Trading Benefits */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Vantagens HOLD
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <Zap className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    Execução Instantânea
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    100% Seguro
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <Clock className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    24/7 Disponível
                  </div>
                </div>
                <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <Percent className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    Taxas Baixas
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Confirmar Negociação
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Revise os detalhes da sua ordem
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tipo</span>
                <span className="font-medium">
                  {formData.type === 'buy' ? 'Compra' : 'Venda'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Enviar</span>
                <span className="font-medium">
                  {formData.amount} {formData.fromAsset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Receber</span>
                <span className="font-medium">
                  {formData.receiveAmount} {formData.toAsset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Taxa</span>
                <span className="font-medium">${fee.toFixed(2)}</span>
              </div>
              <hr className="border-gray-200 dark:border-gray-700" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${(Number(formData.amount) + fee).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmTrade}
                className={`flex-1 py-2 px-4 rounded-lg font-medium text-white transition-colors ${
                  formData.type === 'buy'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
