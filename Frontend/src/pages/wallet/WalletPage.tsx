import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
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
  Settings,
  Shield,
  Zap,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Globe,
  Lock,
} from 'lucide-react'
import { CryptoIcon } from '@/components/CryptoIcon'
import { SendPage } from '@/pages/wallet/SendPage'
import { ReceivePage } from '@/pages/wallet/ReceivePage'
import { TransactionsPage } from '@/pages/wallet/TransactionsPage'
import { useWallets, useMultipleWalletBalances } from '@/hooks/useWallet'
import { useWalletAddresses } from '@/hooks/useWalletAddresses'
import { useSendTransaction } from '@/hooks/useSendTransaction'
import { use2FAStatus } from '@/hooks/use2FAStatus'
import { usePriceChange24h, useMultiplePriceChanges24h } from '@/hooks/usePriceChange24h'
import { useMarketPrices } from '@/hooks/useMarketPrices'

// Crypto logos from CoinGecko (free CDN)
const CRYPTO_LOGOS: Record<string, string> = {
  // ... logos ...
}

// Todos os símbolos de criptomoedas suportados
const ALL_CRYPTO_SYMBOLS = [
  'BTC',
  'ETH',
  'MATIC',
  'BNB',
  'TRX',
  'BASE',
  'SOL',
  'LTC',
  'DOGE',
  'ADA',
  'AVAX',
  'DOT',
  'LINK',
  'SHIB',
  'XRP',
  'USDT',
  'USDC',
]

// Mapear nome da rede/token para símbolo da criptomoeda
const getSymbolFromKey = (key: string): string => {
  // Verificar se é um token (ex: ethereum_usdt, polygon_usdc, polygon_tray)
  if (key.includes('_usdt') || key.includes('_USDT')) {
    return 'USDT'
  }
  if (key.includes('_usdc') || key.includes('_USDC')) {
    return 'USDC'
  }
  if (key.includes('_tray') || key.includes('_TRAY')) {
    return 'TRAY'
  }

  // Caso contrário, mapear rede para símbolo
  const networkToSymbol: Record<string, string> = {
    bitcoin: 'BTC',
    ethereum: 'ETH',
    polygon: 'MATIC',
    bsc: 'BNB',
    tron: 'TRX',
    base: 'BASE',
    solana: 'SOL',
    litecoin: 'LTC',
    dogecoin: 'DOGE',
    cardano: 'ADA',
    avalanche: 'AVAX',
    polkadot: 'DOT',
    chainlink: 'LINK',
    shiba: 'SHIB',
    xrp: 'XRP',
  }

  return networkToSymbol[key] || key.toUpperCase()
}

export const WalletPage = () => {
  const { t, i18n } = useTranslation()
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
          <p className='font-semibold'>{t('wallet.transactionSent')}!</p>
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

  // Usar dados reais da API - useWallets retorna { data, isLoading, error, etc }
  const { data: apiWallets, isLoading, error } = useWallets()

  // Verificar status do 2FA
  const { data: twoFAStatus } = use2FAStatus()

  // Debug: Log 2FA status
  useEffect(() => {
    console.log('[WalletPage] 2FA Status:', twoFAStatus)
  }, [twoFAStatus])

  // Buscar preços em tempo real (atualiza a cada 5 segundos)
  const { prices: marketPrices } = useMarketPrices(ALL_CRYPTO_SYMBOLS)

  // Debug: Log marketPrices updates
  useEffect(() => {
    if (marketPrices && Object.keys(marketPrices).length > 0) {
      console.log('[WalletPage] marketPrices updated:', Object.keys(marketPrices))
    }
  }, [marketPrices])

  // Buscar saldos reais de todas as carteiras
  const walletIds = useMemo(() => apiWallets?.map((w: any) => String(w.id)) || [], [apiWallets])
  const balancesQueries = useMultipleWalletBalances(walletIds)

  // Carregar preferências de rede do localStorage (13 blockchains independentes)
  // Nota: USDT e USDC são tokens, não blockchains - aparecem nos seletores de cada rede
  // Safari fix: try-catch para evitar erros de localStorage
  const [networkPreferences, setNetworkPreferences] = useState(() => {
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

    try {
      const saved = localStorage.getItem('wallet_network_preferences')
      // Merge saved preferences with defaults to handle new cryptocurrencies
      if (saved) {
        const savedPrefs = JSON.parse(saved)
        return { ...defaultPreferences, ...savedPrefs }
      }
    } catch (e) {
      console.warn('[WalletPage] Error reading localStorage:', e)
    }

    return defaultPreferences
  })

  // Preferências de tokens (USDT, USDC, etc)
  // Safari fix: try-catch para evitar erros de localStorage
  const [tokenPreferences, setTokenPreferences] = useState(() => {
    const defaultTokenPrefs = {
      usdt: true,
      usdc: true,
      tray: true,
    }

    try {
      const saved = localStorage.getItem('wallet_token_preferences')
      if (saved) {
        const savedPrefs = JSON.parse(saved)
        return { ...defaultTokenPrefs, ...savedPrefs }
      }
    } catch (e) {
      console.warn('[WalletPage] Error reading token preferences:', e)
    }

    return defaultTokenPrefs
  })

  const [showAllNetworks, setShowAllNetworks] = useState(() => {
    try {
      const saved = localStorage.getItem('wallet_show_all_networks')
      return saved !== null ? saved === 'true' : true
    } catch (e) {
      console.warn('[WalletPage] Error reading showAllNetworks:', e)
      return true
    }
  })

  // Expandir carteira multi para mostrar todas as redes disponíveis com saldos reais
  const wallets = useMemo(() => {
    const expandedWallets: any[] = []

    if (!apiWallets) return expandedWallets

    apiWallets.forEach((wallet: any, walletIndex: number) => {
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
          const nativeBalance = networkBalance
            ? Number.parseFloat(networkBalance.balance || '0')
            : 0

          // ✅ Usar APENAS preço em tempo real - sem fallback para balance_usd antigo
          const marketPriceData = marketPrices[symbol.toUpperCase()]
          const priceUSD = marketPriceData?.price || 0 // Sem fallback - preço real ou 0
          const balanceUSD = nativeBalance * priceUSD
          // ⚠️ Backend agora retorna APENAS balance_usd, frontend converte para BRL conforme settings

          // Adicionar label de rede se for Base ou outra rede com mesmo símbolo
          const networkLabel = network === 'base' ? ` (${symbol} - Base)` : ` (${symbol})`

          expandedWallets.push({
            id: `${wallet.id}-${network}`,
            walletId: wallet.id,
            name: `${wallet.name}${networkLabel}`,
            symbol: symbol,
            network: network,
            balance: nativeBalance,
            balanceUSD: balanceUSD,
            balanceBRL: balanceUSD, // Temporário: será convertido para BRL no display via formatCurrency()
            change24h: 0,
            color: color,
            address: '', // Será preenchido pelo hook useWalletAddresses
          })
        })

        // 🪙 TAMBÉM PROCESSAR TOKENS (USDT, USDC, TRAY, etc)
        for (const [key, value] of Object.entries(realBalances)) {
          const keyLower = String(key).toLowerCase()
          const tokenMatch = keyLower.match(/^([a-z0-9]+)_(usdt|usdc|tray)$/)

          console.log(
            `[WalletPage] Checking key: ${key} (${keyLower}), match: ${tokenMatch ? 'YES' : 'NO'}`
          )

          if (tokenMatch && tokenMatch.length >= 3) {
            const networkKey = tokenMatch[1]
            const tokenSymbol = tokenMatch[2] as string
            const tokenName = tokenSymbol.toUpperCase()

            console.log(`[WalletPage] Found token: ${tokenName} on network: ${networkKey}`)

            // 🔍 FILTRAR POR PREFERÊNCIAS DE TOKEN
            if (tokenName === 'USDT' && !tokenPreferences.usdt) {
              console.log(`[WalletPage] USDT disabled, skipping`)
              continue // Skip USDT se desativado
            }
            if (tokenName === 'USDC' && !tokenPreferences.usdc) {
              console.log(`[WalletPage] USDC disabled, skipping`)
              continue // Skip USDC se desativado
            }
            if (tokenName === 'TRAY' && !tokenPreferences.tray) {
              console.log(`[WalletPage] TRAY disabled, skipping`)
              continue // Skip TRAY se desativado
            }

            const balance = (value as any)?.balance ? Number.parseFloat((value as any).balance) : 0

            // Usar preço em tempo real em vez de balance_usd estático da API
            const marketPriceData = marketPrices[tokenName]
            const priceUSD = marketPriceData?.price || 0 // ✅ REMOVED FALLBACK - use only real-time prices
            const balanceUSD = balance * priceUSD

            console.log(
              `[WalletPage] Adding token: ${tokenName}, balance=${balance}, price=${priceUSD}`
            )

            // Cor padrão para tokens
            let tokenColor = 'from-blue-400 to-blue-600'
            if (tokenName === 'USDT') {
              tokenColor = 'from-green-400 to-green-600'
            } else if (tokenName === 'USDC') {
              tokenColor = 'from-blue-400 to-blue-600'
            } else if (tokenName === 'TRAY') {
              tokenColor = 'from-purple-400 to-purple-600'
            }

            expandedWallets.push({
              id: `${wallet.id}-${key}`,
              walletId: wallet.id,
              name: `${wallet.name} (${tokenName})`,
              symbol: tokenName,
              network: networkKey,
              balance: balance,
              balanceUSD: balanceUSD,
              balanceBRL: balanceUSD, // Temporário: será convertido para BRL no display via formatCurrency()
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
        const nativeBalance = networkBalance ? Number.parseFloat(networkBalance.balance || '0') : 0

        // Usar preço em tempo real em vez de balance_usd estático da API
        const marketPriceData = marketPrices[symbol.toUpperCase()]
        const priceUSD = marketPriceData?.price || 0 // ✅ REMOVED FALLBACK TO balance_usd - use only real-time prices
        const balanceUSD = nativeBalance * priceUSD

        expandedWallets.push({
          id: wallet.id,
          walletId: wallet.id,
          name: wallet.name,
          symbol: symbol,
          network: wallet.network,
          balance: nativeBalance,
          balanceUSD: balanceUSD,
          balanceBRL: balanceUSD, // Temporário: será convertido para BRL no display via formatCurrency()
          change24h: 0,
          color: color,
          address: wallet.first_address || '',
        })
      }
    })

    console.log(
      '[WalletPage] Expanded wallets with balances:',
      expandedWallets.map(w => ({
        symbol: w.symbol,
        balance: w.balance,
        balanceUSD: w.balanceUSD,
      }))
    )
    console.log(
      '[WalletPage] Market prices available:',
      Object.keys(marketPrices).map(k => ({ symbol: k, price: marketPrices[k]?.price }))
    )

    return expandedWallets
  }, [
    apiWallets,
    networkPreferences,
    showAllNetworks,
    balancesQueries,
    tokenPreferences,
    marketPrices,
  ])

  // Buscar variação de preço de 24h para BTC (usando como indicador principal)
  const { change24h: btcChange24h } = usePriceChange24h('BTC')

  const multiWallet = apiWallets?.find((w: any) => w.network === 'multi')
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
    console.log(
      '[WalletPage] walletsWithAddresses useMemo called with wallets count:',
      wallets.length
    )
    console.log(
      '[WalletPage] Wallets in useMemo:',
      wallets.map(w => ({ id: w.id, symbol: w.symbol, network: w.network }))
    )

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

  // ⚠️ PADRÃO: Somar todos os saldos em USD, depois converter conforme moeda selecionada
  const totalBalanceUSD = walletsWithAddresses.reduce((sum, wallet) => sum + wallet.balanceUSD, 0)

  // Debug: Log total balance
  useEffect(() => {
    console.log(
      '[WalletPage] totalBalanceUSD:',
      totalBalanceUSD,
      'from',
      walletsWithAddresses.length,
      'wallets'
    )
    console.log(
      '[WalletPage] Rendered wallets:',
      walletsWithAddresses.map(w => ({
        id: w.id,
        symbol: w.symbol,
        balance: w.balance,
        balanceUSD: w.balanceUSD,
      }))
    )
  }, [totalBalanceUSD, walletsWithAddresses.length])

  // Error state - apenas se houver erro crítico e nenhum dado
  if (error && walletsWithAddresses.length === 0) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <AlertCircle className='w-12 h-12 text-red-600 mx-auto mb-4' />
          <p className='text-red-600 dark:text-red-400 mb-4'>
            {error.message || t('wallet.errorLoadingWallets')}
          </p>
          <Link
            to='/wallet/create'
            className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all'
          >
            <Plus className='w-4 h-4 mr-2' />
            {t('wallet.createFirstWallet')}
          </Link>
        </div>
      </div>
    )
  }

  // Safari fix: Detectar se ainda está hidratando/carregando
  const isSafari =
    typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isStillHydrating = !apiWallets && !isLoading && !error

  // Empty state - apenas após carregamento completo E não estar hidratando
  // Safari: espera mais tempo antes de mostrar empty state
  if (
    !isLoading &&
    !isStillHydrating &&
    walletsWithAddresses.length === 0 &&
    apiWallets !== undefined
  ) {
    // Safari: dar uma chance extra de carregar
    if (isSafari && !apiWallets) {
      return (
        <div className='flex items-center justify-center min-h-screen'>
          <div className='text-center'>
            <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
            <p className='text-gray-600 dark:text-gray-400'>{t('wallet.loadingWallets')}</p>
          </div>
        </div>
      )
    }

    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <Wallet className='w-16 h-16 text-gray-400 mx-auto mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
            {t('wallet.noWalletsFound')}
          </h2>
          <p className='text-gray-600 dark:text-gray-400 mb-6'>{t('wallet.startCreatingWallet')}</p>
          <Link
            to='/wallet/create'
            className='inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all'
          >
            <Plus className='w-5 h-5 mr-2' />
            {t('wallet.createMainWallet')}
          </Link>
        </div>
      </div>
    )
  }

  // Safari: mostrar loading enquanto apiWallets é undefined
  if (apiWallets === undefined || isStillHydrating) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>{t('wallet.loadingWallets')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4' key={i18n.language}>
      {/* Clean Header - Compacto */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md'>
            <Wallet className='w-5 h-5 text-white' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
                {t('wallet.wallets')}
              </h1>
              <div className='flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full'>
                <span className='w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse' />
                <span className='text-[10px] font-medium text-green-700 dark:text-green-400'>
                  {t('wallet.live')}
                </span>
              </div>
            </div>
            <p className='text-gray-500 dark:text-gray-400 text-xs'>{t('wallet.manageCrypto')}</p>
          </div>
        </div>

        {/* Stats Pills - Compacto */}
        <div className='flex gap-2'>
          <div className='flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm'>
            <BarChart3 className='w-3.5 h-3.5 text-blue-500' />
            <span className='text-xs font-bold text-gray-900 dark:text-white'>
              {walletsWithAddresses.length} {t('wallet.assets')}
            </span>
          </div>
          <div className='flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm'>
            <Activity className='w-3.5 h-3.5 text-purple-500' />
            <span
              className={`text-xs font-bold ${portfolioChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {portfolioChange24h >= 0 ? '+' : ''}
              {portfolioChange24h?.toFixed(2)}% 24h
            </span>
          </div>
        </div>
      </div>

      {/* Total Balance Card - Compacto */}
      <div className='bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl p-4 md:p-5 text-white relative overflow-hidden shadow-lg'>
        {/* Decorative elements */}
        <div className='absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20'></div>
        <div className='absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16'></div>

        <div className='relative'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <div className='p-2 bg-white/20 rounded-lg backdrop-blur-sm'>
                <Wallet className='w-5 h-5' />
              </div>
              <div>
                <h2 className='text-sm font-semibold opacity-90'>{t('wallet.totalBalance')}</h2>
                <p className='text-[10px] opacity-70'>{t('wallet.updatedRealTime')}</p>
              </div>
            </div>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className='p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all backdrop-blur-sm'
            >
              {showBalances ? <Eye className='w-4 h-4' /> : <EyeOff className='w-4 h-4' />}
            </button>
          </div>

          <div className='mb-2'>
            {isLoading ? (
              <div className='h-9 w-48 bg-white/20 rounded-lg animate-pulse'></div>
            ) : (
              <span className='text-3xl md:text-4xl font-bold tracking-tight'>
                {showBalances ? formatCurrency(totalBalanceUSD) : '••••••'}
              </span>
            )}
          </div>

          <div className='flex items-center gap-3'>
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                portfolioChange24h >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}
            >
              {portfolioChange24h >= 0 ? (
                <ArrowUpRight className='w-3 h-3' />
              ) : (
                <ArrowDownRight className='w-3 h-3' />
              )}
              <span className='font-semibold'>
                {portfolioChange24h >= 0 ? '+' : ''}
                {portfolioChange24h?.toFixed(2)}%
              </span>
              <span className='opacity-70'>24h</span>
            </div>
            <div className='flex items-center gap-1 text-[10px] opacity-70'>
              <Shield className='w-3 h-3' />
              <span>{t('wallet.protected')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar - Compacto */}
      <div className='grid grid-cols-4 gap-2'>
        <button
          onClick={() => setActiveTab('send')}
          className='flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group'
        >
          <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform'>
            <Send className='w-4 h-4 text-blue-600 dark:text-blue-400' />
          </div>
          <span className='text-[10px] font-medium text-gray-700 dark:text-gray-300'>
            {t('wallet.send')}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('receive')}
          className='flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all group'
        >
          <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform'>
            <Download className='w-4 h-4 text-green-600 dark:text-green-400' />
          </div>
          <span className='text-[10px] font-medium text-gray-700 dark:text-gray-300'>
            {t('wallet.receive')}
          </span>
        </button>
        <Link
          to='/instant-trade'
          className='flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all group'
        >
          <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform'>
            <Zap className='w-4 h-4 text-purple-600 dark:text-purple-400' />
          </div>
          <span className='text-[10px] font-medium text-gray-700 dark:text-gray-300'>
            {t('wallet.trade')}
          </span>
        </Link>
        <Link
          to='/wallet/settings'
          className='flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all group'
        >
          <div className='p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:scale-110 transition-transform'>
            <Settings className='w-4 h-4 text-gray-600 dark:text-gray-400' />
          </div>
          <span className='text-[10px] font-medium text-gray-700 dark:text-gray-300'>
            {t('wallet.config')}
          </span>
        </Link>
      </div>

      {/* Main Content Area */}
      <div className='hidden lg:grid lg:grid-cols-3 gap-4'>
        {/* Left Column: Wallet List + Tabs */}
        <div className='lg:col-span-2 space-y-4'>
          {/* Settings Info Badge */}
          {!showAllNetworks && (
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Settings className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400' />
                <span className='text-xs text-blue-800 dark:text-blue-200'>
                  {t('wallet.customModeActive')}
                </span>
              </div>
              <Link
                to='/wallet/settings'
                className='text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium'
              >
                {t('wallet.change')}
              </Link>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden'>
            <div className='flex border-b border-gray-200 dark:border-gray-700'>
              {[
                { id: 'overview', label: t('wallet.overview'), icon: Wallet },
                { id: 'transactions', label: t('wallet.transactions'), icon: Clock },
                { id: 'send', label: t('wallet.send'), icon: Send },
                { id: 'receive', label: t('wallet.receive'), icon: Download },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <tab.icon className='w-4 h-4' />
                  <span className='hidden sm:inline'>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className='p-4'>
              {activeTab === 'overview' && (
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                  {isLoading && walletsWithAddresses.length === 0 && (
                    <>
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <div
                          key={`skeleton-${i}`}
                          className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 animate-pulse'
                        >
                          <div className='flex items-center gap-2 mb-2'>
                            <div className='w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg'></div>
                            <div className='h-3 w-12 bg-gray-200 dark:bg-gray-600 rounded'></div>
                          </div>
                          <div className='h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded mb-1'></div>
                          <div className='h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded'></div>
                        </div>
                      ))}
                    </>
                  )}

                  {walletsWithAddresses.map(wallet => (
                    <div
                      key={wallet.id}
                      className='group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer'
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                          <div className='w-8 h-8 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm p-1'>
                            <CryptoIcon symbol={wallet.symbol} size={24} />
                          </div>
                          <div>
                            <span className='font-semibold text-sm text-gray-900 dark:text-white'>
                              {wallet.symbol}
                            </span>
                            <p className='text-[10px] text-gray-500 dark:text-gray-400 capitalize'>
                              {wallet.network}
                            </p>
                          </div>
                        </div>
                        <div className='flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                          <button
                            onClick={() => setActiveTab('send')}
                            title='Enviar'
                            className='p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded hover:bg-blue-50 dark:hover:bg-blue-900/30'
                          >
                            <Send className='w-3.5 h-3.5' />
                          </button>
                          <button
                            onClick={() => setActiveTab('receive')}
                            title='Receber'
                            className='p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors rounded hover:bg-green-50 dark:hover:bg-green-900/30'
                          >
                            <Download className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      </div>

                      <div className='space-y-0.5'>
                        <div className='flex items-baseline gap-1'>
                          <span className='text-base font-bold text-gray-900 dark:text-white'>
                            {showBalances
                              ? wallet.balance.toFixed(wallet.symbol === 'BRL' ? 2 : 4)
                              : '••••'}
                          </span>
                          <span className='text-[10px] text-gray-400'>{wallet.symbol}</span>
                        </div>
                        <div className='flex items-center justify-between'>
                          <span className='text-xs text-gray-500 dark:text-gray-400'>
                            {showBalances ? formatCurrency(wallet.balanceUSD) : '••••'}
                          </span>
                          {(() => {
                            const change24h = priceChanges24h[wallet.symbol] ?? 0
                            return (
                              <div
                                className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  change24h >= 0
                                    ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
                                    : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
                                }`}
                              >
                                {change24h >= 0 ? (
                                  <TrendingUp className='w-2.5 h-2.5' />
                                ) : (
                                  <TrendingDown className='w-2.5 h-2.5' />
                                )}
                                {Math.abs(change24h).toFixed(1)}%
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add New Wallet Card */}
                  <Link
                    to='/wallet/create'
                    className='flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all group'
                  >
                    <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform'>
                      <Plus className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                    </div>
                    <span className='text-xs font-medium text-blue-700 dark:text-blue-300'>
                      {t('wallet.newWallet')}
                    </span>
                  </Link>
                </div>
              )}

              {activeTab === 'transactions' && <TransactionsPage />}
              {activeTab === 'send' && <SendPage />}
              {activeTab === 'receive' && <ReceivePage />}
            </div>
          </div>
        </div>

        {/* Right Column: Benefits Sidebar - Compacto */}
        <div className='lg:col-span-1 space-y-4'>
          {/* Quick Info Card */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-4'>
            <div className='flex items-center gap-2 mb-3'>
              <div className='p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg'>
                <Sparkles className='w-4 h-4 text-white' />
              </div>
              <div>
                <h3 className='font-bold text-sm text-gray-900 dark:text-white'>
                  {t('wallet.tips')}
                </h3>
                <p className='text-[10px] text-gray-500 dark:text-gray-400'>
                  {t('wallet.securityAndResources')}
                </p>
              </div>
            </div>

            <div className='space-y-2'>
              <div className='p-2 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 rounded-lg border-l-2 border-green-500'>
                <div className='flex items-center gap-2'>
                  <Shield className='w-3.5 h-3.5 text-green-600 dark:text-green-400' />
                  <div>
                    <p className='font-semibold text-xs text-gray-900 dark:text-white'>
                      {t('wallet.fullySecure')}
                    </p>
                    <p className='text-[10px] text-gray-600 dark:text-gray-400'>
                      {t('wallet.yourKeysYourCoins')}
                    </p>
                  </div>
                </div>
              </div>

              <div className='p-2 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 rounded-lg border-l-2 border-blue-500'>
                <div className='flex items-center gap-2'>
                  <Globe className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400' />
                  <div>
                    <p className='font-semibold text-xs text-gray-900 dark:text-white'>
                      {t('wallet.multiNetwork')}
                    </p>
                    <p className='text-[10px] text-gray-600 dark:text-gray-400'>
                      15+ {t('wallet.blockchains')}
                    </p>
                  </div>
                </div>
              </div>

              <div className='p-2 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 rounded-lg border-l-2 border-purple-500'>
                <div className='flex items-center gap-2'>
                  <Zap className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
                  <div>
                    <p className='font-semibold text-xs text-gray-900 dark:text-white'>
                      {t('wallet.instantTrade')}
                    </p>
                    <p className='text-[10px] text-gray-600 dark:text-gray-400'>
                      {t('wallet.bestOTCRates')}
                    </p>
                  </div>
                </div>
              </div>

              <div className='p-2 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20 rounded-lg border-l-2 border-amber-500'>
                <div className='flex items-center gap-2'>
                  <Lock className='w-3.5 h-3.5 text-amber-600 dark:text-amber-400' />
                  <div>
                    <p className='font-semibold text-xs text-gray-900 dark:text-white'>
                      {t('wallet.biometrics2FA')}
                    </p>
                    <p className='text-[10px] text-gray-600 dark:text-gray-400'>
                      {t('wallet.faceIdTouchId')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className='mt-3 pt-3 border-t border-gray-100 dark:border-gray-700'>
              <div className='flex items-center justify-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400'>
                <Shield className='w-3 h-3 text-green-500' />
                <span>{t('wallet.encryptedTransactions')}</span>
              </div>
            </div>
          </div>

          {/* Market Overview Mini */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-4'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='font-bold text-sm text-gray-900 dark:text-white'>
                {t('wallet.market')}
              </h3>
              <Link
                to='/instant-trade'
                className='text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium'
              >
                {t('wallet.seeMore')}
              </Link>
            </div>
            <div className='space-y-2'>
              {['BTC', 'ETH', 'USDT'].map(symbol => {
                const price = marketPrices[symbol]?.price || 0
                const change = priceChanges24h[symbol] || 0
                return (
                  <div key={symbol} className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <CryptoIcon symbol={symbol} size={20} />
                      <span className='font-medium text-xs text-gray-900 dark:text-white'>
                        {symbol}
                      </span>
                    </div>
                    <div className='text-right'>
                      <p className='text-xs font-semibold text-gray-900 dark:text-white'>
                        {formatCurrency(price)}
                      </p>
                      <p
                        className={`text-[10px] ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {change >= 0 ? '+' : ''}
                        {change.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className='lg:hidden space-y-3'>
        {/* Settings Info Badge */}
        {!showAllNetworks && (
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <Settings className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0' />
              <span className='text-[10px] text-blue-800 dark:text-blue-200'>
                {t('wallet.customMode')}
              </span>
            </div>
            <Link
              to='/wallet/settings'
              className='text-[10px] text-blue-600 dark:text-blue-400 hover:underline'
            >
              {t('wallet.change')}
            </Link>
          </div>
        )}

        {/* Tabs Mobile - Compacto */}
        <div className='flex space-x-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg overflow-x-auto scrollbar-hide'>
          {[
            { id: 'overview', label: t('wallet.overview'), icon: Wallet },
            { id: 'transactions', label: t('wallet.history'), icon: Clock },
            { id: 'send', label: t('wallet.send'), icon: Send },
            { id: 'receive', label: t('wallet.receive'), icon: Download },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className='w-3.5 h-3.5' />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Mobile */}
        {activeTab === 'overview' && (
          <div className='grid grid-cols-2 gap-2'>
            {isLoading && walletsWithAddresses.length === 0 && (
              <>
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={`skeleton-mobile-${i}`}
                    className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 animate-pulse'
                  >
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg'></div>
                      <div className='h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded'></div>
                    </div>
                    <div className='h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded'></div>
                  </div>
                ))}
              </>
            )}

            {walletsWithAddresses.map(wallet => (
              <div
                key={wallet.id}
                className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2.5 hover:shadow-md transition-shadow'
              >
                <div className='flex items-center justify-between mb-1.5'>
                  <div className='flex items-center gap-1.5'>
                    <div className='w-7 h-7 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-1'>
                      <CryptoIcon symbol={wallet.symbol} size={20} />
                    </div>
                    <div>
                      <span className='font-semibold text-xs text-gray-900 dark:text-white'>
                        {wallet.symbol}
                      </span>
                      <p className='text-[9px] text-gray-500 dark:text-gray-400 capitalize'>
                        {wallet.network}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const change24h = priceChanges24h[wallet.symbol] ?? 0
                    return (
                      <div
                        className={`flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded-full ${
                          change24h >= 0
                            ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
                            : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
                        }`}
                      >
                        {change24h >= 0 ? (
                          <TrendingUp className='w-2 h-2' />
                        ) : (
                          <TrendingDown className='w-2 h-2' />
                        )}
                        {Math.abs(change24h).toFixed(1)}%
                      </div>
                    )
                  })()}
                </div>

                <div className='space-y-0'>
                  <div className='flex items-baseline gap-0.5'>
                    <span className='text-sm font-bold text-gray-900 dark:text-white'>
                      {showBalances
                        ? wallet.balance.toFixed(wallet.symbol === 'BRL' ? 2 : 4)
                        : '••••'}
                    </span>
                    <span className='text-[9px] text-gray-400'>{wallet.symbol}</span>
                  </div>
                  <span className='text-[10px] text-gray-500 dark:text-gray-400'>
                    {showBalances ? formatCurrency(wallet.balanceUSD) : '••••'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'transactions' && <TransactionsPage />}
        {activeTab === 'send' && <SendPage />}
        {activeTab === 'receive' && <ReceivePage />}
      </div>

      {/* Custom CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
