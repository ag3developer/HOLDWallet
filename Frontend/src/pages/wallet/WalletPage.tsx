import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import {
  Wallet,
  Send,
  Download,
  Eye,
  EyeOff,
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react'
import { CryptoIcon } from '@/components/CryptoIcon'
import { SendPage } from '@/pages/wallet/SendPage'
import { ReceivePage } from '@/pages/wallet/ReceivePage'
import { TransactionsPage } from '@/pages/wallet/TransactionsPage'
import { useWallets } from '@/hooks/useWallets'
import { useWalletAddresses } from '@/hooks/useWalletAddresses'
import { useMultipleWalletBalances } from '@/hooks/useWallet'
import { useSendTransaction } from '@/hooks/useSendTransaction'
import { use2FAStatus } from '@/hooks/use2FAStatus'
import { usePriceChange24h, useMultiplePriceChanges24h } from '@/hooks/usePriceChange24h'

export const WalletPage = () => {
  const [showBalances, setShowBalances] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'send' | 'receive'>(
    'overview'
  )
  const { formatCurrency, currency } = useCurrencyStore()

  // Hook de envio de transações
  const { sendTransaction: _sendTransaction } = useSendTransaction({
    onSuccess: data => {
      toast.success(
        <div>
          <p className='font-semibold'>Transação enviada com sucesso!</p>
          <p className='text-xs'>TX: {data.tx_hash?.slice(0, 10)}...</p>
        </div>,
        { duration: 5000 }
      )
      setActiveTab('transactions')
    },
    onError: error => {
      toast.error(error.message)
    },
  })

  // Usar dados reais da API
  const { wallets: apiWallets, isLoading, error } = useWallets()

  // Verificar status do 2FA
  const { data: twoFAStatus } = use2FAStatus()

  // Debug: Log 2FA status
  useEffect(() => {
    console.log('[WalletPage] 2FA Status:', twoFAStatus)
  }, [twoFAStatus])

  // Buscar saldos reais de todas as carteiras
  const walletIds = useMemo(() => apiWallets?.map(w => String(w.id)) || [], [apiWallets])
  const balancesQueries = useMultipleWalletBalances(walletIds)

  // Carregar preferências de rede do localStorage (13 blockchains independentes)
  // Nota: USDT e USDC são tokens, não blockchains - aparecem nos seletores de cada rede
  const [networkPreferences, setNetworkPreferences] = useState(() => {
    const saved = localStorage.getItem('wallet_network_preferences')
    const defaultPreferences = {
      bitcoin: true,
      ethereum: true,
      polygon: true,
      bsc: true,
      tron: true,
      base: true,
      solana: true,
      litecoin: true,
      dogecoin: true,
      cardano: true,
      avalanche: true,
      polkadot: true,
      chainlink: true,
      shiba: true,
      xrp: true,
    }

    // Merge saved preferences with defaults to handle new cryptocurrencies
    if (saved) {
      const savedPrefs = JSON.parse(saved)
      return { ...defaultPreferences, ...savedPrefs }
    }

    return defaultPreferences
  })

  // Preferências de tokens (USDT, USDC, etc)
  const [tokenPreferences, setTokenPreferences] = useState(() => {
    const saved = localStorage.getItem('wallet_token_preferences')
    const defaultTokenPrefs = {
      usdt: true,
      usdc: true,
    }

    if (saved) {
      const savedPrefs = JSON.parse(saved)
      return { ...defaultTokenPrefs, ...savedPrefs }
    }

    return defaultTokenPrefs
  })

  const [showAllNetworks, setShowAllNetworks] = useState(() => {
    const saved = localStorage.getItem('wallet_show_all_networks')
    return saved !== null ? saved === 'true' : true
  })

  // Expandir carteira multi para mostrar todas as redes disponíveis com saldos reais
  const wallets = useMemo(() => {
    const expandedWallets: any[] = []

    apiWallets.forEach((wallet, walletIndex) => {
      // Buscar saldos reais desta carteira
      const balanceQuery = balancesQueries[walletIndex]
      const realBalances = balanceQuery?.data || {}

      if (wallet.network === 'multi') {
        // Para carteiras multi, criar entradas para cada rede suportada (15 blockchains independentes)
        const supportedNetworks = [
          { network: 'bitcoin', symbol: 'BTC', color: 'from-orange-400 to-orange-600' },
          { network: 'ethereum', symbol: 'ETH', color: 'from-blue-400 to-purple-600' },
          { network: 'polygon', symbol: 'MATIC', color: 'from-purple-400 to-purple-600' },
          { network: 'bsc', symbol: 'BNB', color: 'from-yellow-400 to-yellow-600' },
          { network: 'tron', symbol: 'TRX', color: 'from-red-400 to-red-600' },
          { network: 'base', symbol: 'BASE', color: 'from-blue-500 to-blue-700' },
          { network: 'solana', symbol: 'SOL', color: 'from-purple-500 to-pink-500' },
          { network: 'litecoin', symbol: 'LTC', color: 'from-gray-400 to-gray-600' },
          { network: 'dogecoin', symbol: 'DOGE', color: 'from-yellow-300 to-yellow-500' },
          { network: 'cardano', symbol: 'ADA', color: 'from-blue-500 to-blue-700' },
          { network: 'avalanche', symbol: 'AVAX', color: 'from-red-500 to-red-700' },
          { network: 'polkadot', symbol: 'DOT', color: 'from-pink-500 to-pink-700' },
          { network: 'chainlink', symbol: 'LINK', color: 'from-blue-600 to-blue-800' },
          { network: 'shiba', symbol: 'SHIB', color: 'from-orange-500 to-red-500' },
          { network: 'xrp', symbol: 'XRP', color: 'from-gray-600 to-gray-800' },
        ]

        // Filtrar redes baseado nas preferências do usuário (se modo customizado)
        const filteredNetworks = showAllNetworks
          ? supportedNetworks
          : supportedNetworks.filter(
              net => networkPreferences[net.network as keyof typeof networkPreferences]
            )

        filteredNetworks.forEach(({ network, symbol, color }) => {
          // Buscar saldo real desta rede
          const networkBalance = realBalances[network]
          const nativeBalance = networkBalance ? parseFloat(networkBalance.balance || '0') : 0
          const balanceUSD = networkBalance ? parseFloat(networkBalance.balance_usd || '0') : 0
          const balanceBRL = networkBalance ? parseFloat(networkBalance.balance_brl || '0') : 0

          expandedWallets.push({
            id: `${wallet.id}-${network}`,
            walletId: wallet.id,
            name: `${wallet.name} (${symbol})`,
            symbol: symbol,
            network: network,
            balance: nativeBalance,
            balanceUSD: balanceUSD,
            balanceBRL: balanceBRL,
            change24h: 0,
            color: color,
            address: '', // Será preenchido pelo hook useWalletAddresses
          })
        })

        // 🪙 TAMBÉM PROCESSAR TOKENS (USDT, USDC, etc)
        for (const [key, value] of Object.entries(realBalances)) {
          const keyLower = String(key).toLowerCase()
          const tokenMatch = keyLower.match(/^([a-z0-9]+)_(usdt|usdc)$/)

          if (tokenMatch && tokenMatch.length >= 3) {
            const networkKey = tokenMatch[1]
            const tokenSymbol = tokenMatch[2] as string
            const tokenName = tokenSymbol.toUpperCase()

            // 🔍 FILTRAR POR PREFERÊNCIAS DE TOKEN
            if (tokenName === 'USDT' && !tokenPreferences.usdt) {
              continue // Skip USDT se desativado
            }
            if (tokenName === 'USDC' && !tokenPreferences.usdc) {
              continue // Skip USDC se desativado
            }

            const balance = (value as any)?.balance ? Number.parseFloat((value as any).balance) : 0
            const balanceUSD = (value as any)?.balance_usd
              ? Number.parseFloat((value as any).balance_usd)
              : 0
            const balanceBRL = (value as any)?.balance_brl
              ? Number.parseFloat((value as any).balance_brl)
              : 0

            // Cor padrão para tokens stablecoin
            const tokenColor =
              tokenName === 'USDT' ? 'from-green-400 to-green-600' : 'from-blue-400 to-blue-600'

            expandedWallets.push({
              id: `${wallet.id}-${key}`,
              walletId: wallet.id,
              name: `${wallet.name} (${tokenName})`,
              symbol: tokenName,
              network: networkKey,
              balance: balance,
              balanceUSD: balanceUSD,
              balanceBRL: balanceBRL,
              change24h: 0,
              color: tokenColor,
              address: '', // Será preenchido pelo hook useWalletAddresses
            })
          }
        }
      } else {
        // Para carteiras específicas, adicionar normalmente com saldo real
        let color = 'from-blue-400 to-blue-600'
        let symbol = wallet.network.toUpperCase()

        if (wallet.network === 'bitcoin' || wallet.network === 'btc') {
          color = 'from-orange-400 to-orange-600'
          symbol = 'BTC'
        } else if (wallet.network === 'ethereum' || wallet.network === 'eth') {
          color = 'from-blue-400 to-purple-600'
          symbol = 'ETH'
        }

        // Buscar saldo real da rede específica
        const networkBalance = realBalances[wallet.network]
        const nativeBalance = networkBalance ? parseFloat(networkBalance.balance || '0') : 0
        const balanceUSD = networkBalance ? parseFloat(networkBalance.balance_usd || '0') : 0
        const balanceBRL = networkBalance ? parseFloat(networkBalance.balance_brl || '0') : 0

        expandedWallets.push({
          id: wallet.id,
          walletId: wallet.id,
          name: wallet.name,
          symbol: symbol,
          network: wallet.network,
          balance: nativeBalance,
          balanceUSD: balanceUSD,
          balanceBRL: balanceBRL,
          change24h: 0,
          color: color,
          address: wallet.first_address || '',
        })
      }
    })

    return expandedWallets
  }, [apiWallets, networkPreferences, showAllNetworks, balancesQueries, tokenPreferences])

  // Buscar variação de preço de 24h para BTC (usando como indicador principal)
  const { change24h: btcChange24h } = usePriceChange24h('BTC')

  const multiWallet = apiWallets.find(w => w.network === 'multi')
  const networksList = multiWallet
    ? [
        'bitcoin',
        'ethereum',
        'polygon',
        'bsc',
        'tron',
        'base',
        'solana',
        'litecoin',
        'dogecoin',
        'cardano',
        'avalanche',
        'polkadot',
        'chainlink',
        'shiba',
        'xrp',
      ]
    : []
  const { addresses: networkAddresses } = useWalletAddresses(
    multiWallet?.id?.toString(),
    networksList
  )

  // Atualizar endereços das carteiras expandidas
  const walletsWithAddresses = useMemo(() => {
    return wallets.map(wallet => {
      if (wallet.walletId && networkAddresses[wallet.network]) {
        return {
          ...wallet,
          address: networkAddresses[wallet.network],
        }
      }
      return wallet
    })
  }, [wallets, networkAddresses, currency])

  // Buscar variação de preço de 24h para todas as moedas na carteira
  const allSymbols = useMemo(() => {
    return Array.from(new Set(walletsWithAddresses.map(w => w.symbol)))
  }, [walletsWithAddresses])

  const { changes: priceChanges24h } = useMultiplePriceChanges24h(allSymbols)

  // Calcular a variação média do portfólio com base nas moedas que tem saldo
  const portfolioChange24h = useMemo(() => {
    if (walletsWithAddresses.length === 0) return 0

    let totalWeightedChange = 0
    let totalUSD = 0

    for (const wallet of walletsWithAddresses) {
      if (wallet.balanceUSD > 0) {
        // Usar o preço específico da moeda ou BTC como fallback
        const change = priceChanges24h[wallet.symbol] ?? btcChange24h ?? 0
        totalWeightedChange += change * wallet.balanceUSD
        totalUSD += wallet.balanceUSD
      }
    }

    return totalUSD > 0 ? totalWeightedChange / totalUSD : 0
  }, [walletsWithAddresses, btcChange24h, priceChanges24h])

  // Mapear transações da API para o formato do componente - NÃO MAIS NECESSÁRIO
  // Agora usando TransactionsPage component diretamente

  const totalBalanceBRL = walletsWithAddresses.reduce((sum, wallet) => sum + wallet.balanceBRL, 0)

  // Loading state
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 text-blue-600 animate-spin mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando carteiras...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <AlertCircle className='w-12 h-12 text-red-600 mx-auto mb-4' />
          <p className='text-red-600 dark:text-red-400 mb-4'>{error}</p>
          <Link
            to='/wallet/create'
            className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all'
          >
            <Plus className='w-4 h-4 mr-2' />
            Criar Primeira Carteira
          </Link>
        </div>
      </div>
    )
  }

  // Empty state
  if (walletsWithAddresses.length === 0) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <Wallet className='w-16 h-16 text-gray-400 mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
            Nenhuma carteira encontrada
          </h2>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>
            Comece criando sua primeira carteira
          </p>
          <Link
            to='/wallet/create'
            className='inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all'
          >
            <Plus className='w-5 h-5 mr-2' />
            Criar Carteira Principal
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Toast Container */}
      <Toaster />

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3'>
            <div className='w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center'>
              <Wallet className='w-6 h-6 text-white' />
            </div>
            Carteiras
          </h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>
            Gerencie suas criptomoedas e moedas tradicionais
          </p>
        </div>

        <div className='flex gap-3'>
          <Link
            to='/wallet/settings'
            className='inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
          >
            <Settings className='w-4 h-4 mr-2' />
            Configurações
          </Link>
          <Link
            to='/wallet/create'
            className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all'
          >
            <Plus className='w-4 h-4 mr-2' />
            Criar Carteira Principal
          </Link>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className='bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 rounded-2xl p-8 text-white relative overflow-hidden'>
        <div className='absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32'></div>
        <div className='relative'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-semibold'>Saldo Total</h2>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className='p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all'
            >
              {showBalances ? <Eye className='w-5 h-5' /> : <EyeOff className='w-5 h-5' />}
            </button>
          </div>

          <div className='mb-2'>
            <span className='text-4xl font-bold'>
              {showBalances ? formatCurrency(totalBalanceBRL) : '••••••'}
            </span>
          </div>

          <div
            className={`flex items-center gap-2 ${portfolioChange24h >= 0 ? 'text-green-200' : 'text-red-200'}`}
          >
            {portfolioChange24h >= 0 ? (
              <TrendingUp className='w-4 h-4' />
            ) : (
              <TrendingDown className='w-4 h-4' />
            )}
            <span className='text-sm'>
              {portfolioChange24h >= 0 ? '+' : ''}
              {portfolioChange24h?.toFixed(2)}% (últimas 24h)
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className='space-y-3'>
        {/* Settings Info Badge */}
        {!showAllNetworks && (
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Settings className='w-4 h-4 text-blue-600 dark:text-blue-400' />
              <span className='text-sm text-blue-800 dark:text-blue-200'>
                Modo customizado ativo - Mostrando apenas redes selecionadas
              </span>
            </div>
            <Link
              to='/wallet/settings'
              className='text-sm text-blue-600 dark:text-blue-400 hover:underline'
            >
              Alterar
            </Link>
          </div>
        )}

        <div className='flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg'>
          {[
            { id: 'overview', label: 'Visão Geral', icon: Wallet },
            { id: 'transactions', label: 'Transações', icon: Clock },
            { id: 'send', label: 'Enviar', icon: Send },
            { id: 'receive', label: 'Receber', icon: Download },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className='w-4 h-4' />
              <span className='hidden sm:inline'>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {walletsWithAddresses.map(wallet => (
            <div
              key={wallet.id}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow group'
            >
              {/* Header compacto */}
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <div className='w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-1.5'>
                    <CryptoIcon symbol={wallet.symbol} size={32} />
                  </div>
                  <span className='font-semibold text-gray-900 dark:text-white'>
                    {wallet.symbol}
                  </span>
                </div>
                <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <button
                    onClick={() => setActiveTab('send')}
                    aria-label='Enviar criptomoeda'
                    className='p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                  >
                    <Send className='w-3.5 h-3.5' />
                  </button>
                  <button
                    onClick={() => setActiveTab('receive')}
                    aria-label='Receber criptomoeda'
                    className='p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors'
                  >
                    <Download className='w-3.5 h-3.5' />
                  </button>
                </div>
              </div>

              {/* Saldo e variação */}
              <div className='space-y-2'>
                <div className='flex items-baseline gap-1'>
                  <span className='text-xl font-bold text-gray-900 dark:text-white'>
                    {showBalances
                      ? (() => {
                          const decimals = wallet.symbol === 'BRL' ? 2 : 6
                          return wallet.balance.toFixed(decimals)
                        })()
                      : '••••'}
                  </span>
                  <span className='text-xs text-gray-400 dark:text-gray-500'>{wallet.symbol}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>
                    {showBalances ? `$${wallet.balanceUSD.toFixed(2)}` : '••••'}
                  </span>
                  {(() => {
                    const change24h = priceChanges24h[wallet.symbol] ?? 0
                    return (
                      <div
                        className={`flex items-center gap-0.5 text-xs font-semibold ${
                          change24h >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {change24h >= 0 ? (
                          <TrendingUp className='w-3 h-3' />
                        ) : (
                          <TrendingDown className='w-3 h-3' />
                        )}
                        <span>
                          {change24h >= 0 ? '+' : ''}
                          {Math.abs(change24h).toFixed(2)}%
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'transactions' && <TransactionsPage />}

      {activeTab === 'send' && <SendPage />}

      {activeTab === 'receive' && <ReceivePage />}
    </div>
  )
}
