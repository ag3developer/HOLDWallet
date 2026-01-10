import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/hooks/useAuth'
import { useWallets, useMultipleWalletBalances } from '@/hooks/useWallet'
import { useMarketPrices } from '@/hooks/useMarketPrices'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import {
  DollarSign,
  TrendingUp,
  Award,
  Wallet,
  Send,
  Download,
  MessageCircle,
  Plus,
  Coins,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Shield,
  Sparkles,
  CheckCircle,
} from 'lucide-react'

// Skeleton Components para loading state
const SkeletonBox = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
)

const StatCardSkeleton = () => (
  <div className='bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm'>
    <div className='flex items-start justify-between mb-2'>
      <div className='flex-1'>
        <SkeletonBox className='h-3 w-20 mb-2' />
        <SkeletonBox className='h-7 w-24 mb-1' />
        <SkeletonBox className='h-3 w-16' />
      </div>
      <SkeletonBox className='w-10 h-10 rounded-xl' />
    </div>
    <SkeletonBox className='h-0.5 w-full mt-2' />
  </div>
)

const WalletCardSkeleton = () => (
  <div className='bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm'>
    <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        <SkeletonBox className='w-8 h-8 rounded-xl' />
        <div>
          <SkeletonBox className='h-4 w-24 mb-1' />
          <SkeletonBox className='h-3 w-32' />
        </div>
      </div>
    </div>
    <div className='p-4 space-y-3'>
      <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
        <div className='flex items-center gap-3'>
          <SkeletonBox className='w-10 h-10 rounded-xl' />
          <div>
            <SkeletonBox className='h-4 w-20 mb-1' />
            <SkeletonBox className='h-3 w-16' />
          </div>
        </div>
        <SkeletonBox className='h-5 w-16' />
      </div>
      <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
        <div className='flex items-center gap-3'>
          <SkeletonBox className='w-10 h-10 rounded-xl' />
          <div>
            <SkeletonBox className='h-4 w-20 mb-1' />
            <SkeletonBox className='h-3 w-16' />
          </div>
        </div>
        <SkeletonBox className='h-5 w-16' />
      </div>
    </div>
  </div>
)

const QuickActionsSkeleton = () => (
  <div className='bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm'>
    <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700'>
      <div className='flex items-center gap-2'>
        <SkeletonBox className='w-8 h-8 rounded-xl' />
        <SkeletonBox className='h-4 w-24' />
      </div>
    </div>
    <div className='p-4 space-y-2'>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className='flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl'
        >
          <SkeletonBox className='w-10 h-10 rounded-xl' />
          <div className='flex-1'>
            <SkeletonBox className='h-4 w-24 mb-1' />
            <SkeletonBox className='h-3 w-32' />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const MarketCardSkeleton = () => (
  <div className='bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm'>
    <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        <SkeletonBox className='w-8 h-8 rounded-xl' />
        <SkeletonBox className='h-4 w-16' />
      </div>
      <SkeletonBox className='w-5 h-5 rounded' />
    </div>
    <div className='p-4 space-y-3'>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <SkeletonBox className='w-8 h-8 rounded-full' />
            <SkeletonBox className='h-4 w-16' />
          </div>
          <div className='text-right'>
            <SkeletonBox className='h-4 w-20 mb-1' />
            <SkeletonBox className='h-3 w-12' />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const DashboardPage = () => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  // useWallets retorna { data, isLoading, isFetching, isError, etc } do React Query
  const {
    data: apiWallets,
    isLoading: walletsLoading,
    isFetching: walletsFetching,
    isSuccess: walletsSuccess,
    isError: walletsError,
    refetch: refetchWallets,
  } = useWallets()
  const { formatCurrency, currency } = useCurrencyStore()
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set())
  const [manualRetryCount, setManualRetryCount] = useState(0)

  // Safari/PWA detection
  const isSafari =
    typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isPWA =
    typeof globalThis !== 'undefined' &&
    (globalThis.matchMedia?.('(display-mode: standalone)')?.matches ||
      (globalThis.navigator as any)?.standalone === true)

  // Auto-retry mechanism for Safari/PWA when wallets are empty but user should have them
  useEffect(() => {
    // Se retornou sucesso mas 0 carteiras, pode ser problema de timing
    if (walletsSuccess && apiWallets?.length === 0 && manualRetryCount < 3) {
      const delay = isSafari || isPWA ? 1500 : 800

      const timer = setTimeout(() => {
        setManualRetryCount(prev => prev + 1)
        refetchWallets()
      }, delay)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [walletsSuccess, apiWallets?.length, manualRetryCount, refetchWallets, isSafari, isPWA])

  // Reset retry count when wallets are loaded
  useEffect(() => {
    if (apiWallets && apiWallets.length > 0 && manualRetryCount > 0) {
      setManualRetryCount(0)
    }
  }, [apiWallets, manualRetryCount])

  // Mapear nome da rede para símbolo da criptomoeda
  const getSymbolFromKey = (key: string): string => {
    // Verificar se é um token (ex: ethereum_usdt, polygon_usdc)
    if (key.includes('_usdt') || key.includes('_USDT')) {
      return 'USDT'
    }
    if (key.includes('_usdc') || key.includes('_USDC')) {
      return 'USDC'
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

  // Símbolos de criptos para buscar preços
  const priceSymbols = useMemo(
    () => [
      'BTC',
      'ETH',
      'USDT',
      'USDC',
      'SOL',
      'BNB',
      'MATIC',
      'ADA',
      'AVAX',
      'TRX',
      'BASE',
      'LTC',
      'DOGE',
      'DOT',
      'LINK',
      'SHIB',
      'XRP',
    ],
    []
  )

  // Hook para buscar preços via backend aggregator
  const { prices: marketPrices, isLoading: loadingPrices } = useMarketPrices(priceSymbols, currency)

  // Debug log
  useEffect(() => {
    console.log('[DashboardPage] marketPrices updated:', Object.keys(marketPrices), marketPrices)
  }, [marketPrices])

  // Buscar saldos reais
  const walletIds = useMemo(() => apiWallets?.map((w: any) => String(w.id)) || [], [apiWallets])
  const balancesQueries = useMultipleWalletBalances(walletIds)

  // Carregar preferências de rede com fallback para Safari
  const networkPreferences = useMemo(() => {
    try {
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
      if (!saved) return defaultPreferences

      const parsed = JSON.parse(saved)
      return { ...defaultPreferences, ...parsed }
    } catch (error) {
      console.error('[DashboardPage] Error loading network preferences:', error)
      return {
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
    }
  }, [])

  const showAllNetworks = useMemo(() => {
    try {
      const saved = localStorage.getItem('wallet_show_all_networks')
      console.log('[DashboardPage] localStorage wallet_show_all_networks:', saved)
      const result = saved !== null ? saved === 'true' : true
      console.log('[DashboardPage] showAllNetworks result:', result)
      return result
    } catch (error) {
      console.error('[DashboardPage] Error loading showAllNetworks:', error)
      return true // Default to showing all networks
    }
  }, [])

  // Filtrar carteiras por preferências
  const wallets = useMemo(() => {
    console.log('[DashboardPage] apiWallets:', apiWallets)
    console.log('[DashboardPage] showAllNetworks:', showAllNetworks)

    if (!apiWallets || !Array.isArray(apiWallets)) {
      console.log('[DashboardPage] No wallets or not array')
      return []
    }

    console.log('[DashboardPage] apiWallets length:', apiWallets.length)

    // Se não houver carteiras da API, retorna vazio
    if (apiWallets.length === 0) {
      console.log('[DashboardPage] No wallets from API')
      return []
    }

    // SEMPRE mostrar todas as carteiras no Dashboard (não aplicar filtro de rede)
    // O filtro de rede só deve ser aplicado na página de Wallets
    console.log('[DashboardPage] Returning all wallets (no filter in Dashboard)')
    return apiWallets
  }, [apiWallets, networkPreferences, showAllNetworks]) // Calcular saldo total (em USD, depois convertemos com formatCurrency)
  const totalBalanceUSD = useMemo(() => {
    let total = 0

    balancesQueries.forEach(query => {
      if (query.data) {
        Object.entries(query.data).forEach(([networkKey, netBalance]: any) => {
          const balance = Number.parseFloat(netBalance.balance || '0')

          // Mapear nome da rede/token para símbolo
          const symbol = getSymbolFromKey(networkKey)

          // ✅ Use real-time price from marketPrices hook instead of backend price
          const marketPriceData = marketPrices[symbol]
          const priceUSD = marketPriceData?.price || Number.parseFloat(netBalance.price_usd || '0')

          const balanceUSD = balance * priceUSD
          console.log(
            `[Dashboard] ${networkKey} (${symbol}): balance=${balance}, price=${priceUSD}, total=${balanceUSD}`
          )
          total += balanceUSD
        })
      }
    })

    console.log('[Dashboard] totalBalanceUSD:', total)
    return total
  }, [balancesQueries, marketPrices, currency])

  const toggleWallet = (walletId: string) => {
    setExpandedWallets(prev => {
      const next = new Set(prev)
      if (next.has(walletId)) {
        next.delete(walletId)
      } else {
        next.add(walletId)
      }
      return next
    })
  }

  // Handlers
  const handleCreateP2POrder = () => {
    navigate('/p2p/create-order')
  }

  const handleSendCrypto = () => {
    navigate('/wallet')
  }

  const handleReceiveCrypto = () => {
    navigate('/wallet')
  }

  const handleChatP2P = () => {
    navigate('/chat')
  }

  const handleCreateWallet = () => {
    navigate('/wallet')
  }

  const getAvailableNetworks = (wallet: any) => {
    return [
      { network: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
      { network: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
      { network: 'polygon', name: 'Polygon', symbol: 'MATIC' },
      { network: 'bsc', name: 'BSC', symbol: 'BNB' },
      { network: 'tron', name: 'Tron', symbol: 'TRX' },
      { network: 'base', name: 'Base', symbol: 'BASE' },
      { network: 'solana', name: 'Solana', symbol: 'SOL' },
      { network: 'litecoin', name: 'Litecoin', symbol: 'LTC' },
      { network: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE' },
      { network: 'cardano', name: 'Cardano', symbol: 'ADA' },
      { network: 'avalanche', name: 'Avalanche', symbol: 'AVAX' },
      { network: 'polkadot', name: 'Polkadot', symbol: 'DOT' },
      { network: 'chainlink', name: 'Chainlink', symbol: 'LINK' },
      { network: 'shiba', name: 'Shiba Inu', symbol: 'SHIB' },
      { network: 'xrp', name: 'XRP', symbol: 'XRP' },
    ]
  }

  return (
    <div key={i18n.language} className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Conteúdo */}
      <div className='relative z-10 p-4 md:p-6 space-y-6'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <div className='flex items-center gap-3 mb-1'>
              <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
                {t('dashboard.title')}
              </h1>
              <div className='flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-full'>
                <span className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
                <span className='text-xs font-medium text-green-700 dark:text-green-400'>Live</span>
              </div>
            </div>
            <p className='text-gray-500 dark:text-gray-400 text-sm'>
              {new Date().toLocaleDateString(
                i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language === 'es-ES' ? 'es-ES' : 'en-US'
              )}
              {user && ` • ${t('dashboard.welcome')}, ${user.username}`}
            </p>
          </div>

          {/* Action Pills */}
          <div className='flex gap-2'>
            <button
              onClick={() => navigate('/wallet')}
              className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all'
            >
              <Wallet className='w-4 h-4 text-blue-500' />
              <span className='text-sm font-medium text-gray-900 dark:text-white'>
                {t('navigation.wallet')}
              </span>
            </button>
            <button
              onClick={() => navigate('/instant-trade')}
              className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm hover:shadow-md transition-all'
            >
              <TrendingUp className='w-4 h-4 text-white' />
              <span className='text-sm font-medium text-white'>{t('dashboard.trade')}</span>
            </button>
          </div>
        </div>

        {/* Stats Grid - 4 colunas com design premium */}
        {userLoading || walletsLoading ? (
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : (
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
            {/* Saldo Total - Card Premium */}
            <div className='group relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-4 shadow-lg shadow-blue-500/20 overflow-hidden hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5'>
              {/* Efeito de brilho */}
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>
              {/* Círculos decorativos */}
              <div className='absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl'></div>
              <div className='absolute -bottom-8 -left-8 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl'></div>

              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='p-2.5 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform'>
                    <DollarSign className='w-5 h-5 text-white' />
                  </div>
                  <div className='flex items-center gap-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full'>
                    <span className='w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse'></span>
                    <span className='text-[10px] font-medium text-white/90'>USD</span>
                  </div>
                </div>
                <p className='text-2xl font-bold text-white mb-1'>
                  {formatCurrency(totalBalanceUSD)}
                </p>
                <p className='text-xs text-blue-200'>
                  {t('dashboard.totalBalance')} • {wallets?.length || 0} {t('dashboard.wallets')}
                </p>
              </div>
            </div>

            {/* Ordens P2P - Card Premium */}
            <div className='group relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-700 rounded-2xl p-4 shadow-lg shadow-purple-500/20 overflow-hidden hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5'>
              {/* Efeito de brilho */}
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>
              {/* Círculos decorativos */}
              <div className='absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl'></div>
              <div className='absolute -bottom-8 -left-8 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl'></div>

              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='p-2.5 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform'>
                    <TrendingUp className='w-5 h-5 text-white' />
                  </div>
                  <div className='flex items-center gap-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full'>
                    <span className='text-[10px] font-medium text-white/90'>P2P</span>
                  </div>
                </div>
                <p className='text-2xl font-bold text-white mb-1'>0</p>
                <p className='text-xs text-purple-200'>
                  {t('dashboard.activeOrders')} • {t('dashboard.readyToTrade')}
                </p>
              </div>
            </div>

            {/* Reputação - Card Premium */}
            <div className='group relative bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 rounded-2xl p-4 shadow-lg shadow-orange-500/20 overflow-hidden hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-0.5'>
              {/* Efeito de brilho */}
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>
              {/* Círculos decorativos */}
              <div className='absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl'></div>
              <div className='absolute -bottom-8 -left-8 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl'></div>

              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='p-2.5 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform'>
                    <Award className='w-5 h-5 text-white' />
                  </div>
                  <div className='flex items-center gap-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full'>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${user?.isVerified ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}
                    ></span>
                    <span className='text-[10px] font-medium text-white/90'>
                      {user?.isVerified ? t('dashboard.verified') : t('dashboard.new')}
                    </span>
                  </div>
                </div>
                <p className='text-2xl font-bold text-white mb-1'>
                  {user?.isVerified ? '100%' : '--'}
                </p>
                <p className='text-xs text-amber-100'>
                  {t('dashboard.reputation')} •{' '}
                  {user?.isVerified ? t('dashboard.excellent') : t('dashboard.completeProfile')}
                </p>
              </div>
            </div>

            {/* BTC Price - Card Premium */}
            <div className='group relative bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 rounded-2xl p-4 shadow-lg shadow-orange-500/20 overflow-hidden hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300 hover:-translate-y-0.5'>
              {/* Efeito de brilho */}
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>
              {/* Círculos decorativos */}
              <div className='absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl'></div>
              <div className='absolute -bottom-8 -left-8 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl'></div>

              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='p-2.5 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform'>
                    <Coins className='w-5 h-5 text-white' />
                  </div>
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${(marketPrices.BTC?.change24h ?? 0) >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'}`}
                  >
                    <span className='text-[10px] font-medium text-white'>
                      {marketPrices.BTC?.change24hPercent || '--%'}
                    </span>
                  </div>
                </div>
                <p className='text-xl font-bold text-white mb-1'>
                  {marketPrices.BTC?.price ? formatCurrency(marketPrices.BTC.price) : '--'}
                </p>
                <p className='text-xs text-orange-100'>Bitcoin • {t('dashboard.currentPrice')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid - Layout reorganizado */}
        {userLoading || walletsLoading ? (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            <div className='lg:col-span-2 space-y-4'>
              <WalletCardSkeleton />
              <QuickActionsSkeleton />
            </div>
            <div className='space-y-4'>
              <MarketCardSkeleton />
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            {/* Carteiras + Ações Rápidas - 2 colunas */}
            <div className='lg:col-span-2 space-y-4'>
              {/* Wallets Card */}
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
                <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl'>
                      <Wallet className='w-5 h-5 text-white' />
                    </div>
                    <div>
                      <h3 className='font-bold text-gray-900 dark:text-white'>
                        {t('dashboard.yourWallets')}
                      </h3>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {t('dashboard.manageYourCrypto')}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-1'>
                    {walletsFetching && (
                      <span className='text-xs text-gray-400 dark:text-gray-500 mr-1'>
                        {t('dashboard.updating')}
                      </span>
                    )}
                    <button
                      onClick={() => refetchWallets()}
                      title={t('dashboard.refreshWallets')}
                      disabled={walletsFetching}
                      className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50'
                    >
                      <RefreshCw
                        className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${walletsFetching ? 'animate-spin text-blue-500' : 'hover:text-blue-600 dark:hover:text-blue-400'}`}
                      />
                    </button>
                    <button
                      onClick={handleCreateWallet}
                      title={t('dashboard.addWallet')}
                      className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors'
                    >
                      <Plus className='w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400' />
                    </button>
                  </div>
                </div>

                <div className='p-4'>
                  {/* Renderizar conteúdo das carteiras */}
                  {(() => {
                    // Estado de loading - mostrar skeleton enquanto carrega
                    // walletsLoading = true no primeiro fetch
                    // walletsFetching = true em qualquer fetch (primeiro ou refetch)
                    // walletsSuccess = true só depois de ter dados
                    const isLoadingWallets = walletsLoading || (walletsFetching && !walletsSuccess)
                    const hasNoWallets = walletsSuccess && (!wallets || wallets.length === 0)

                    // Estado de erro - mostrar botão de retry
                    if (walletsError && !isLoadingWallets) {
                      return (
                        <div className='text-center py-10'>
                          <div className='w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4'>
                            <RefreshCw className='w-8 h-8 text-red-500 dark:text-red-400' />
                          </div>
                          <p className='text-gray-600 dark:text-gray-400 mb-2'>
                            {t('dashboard.errorLoadingWallets')}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-500 mb-4'>
                            {t('dashboard.checkConnectionTryAgain')}
                          </p>
                          <button
                            onClick={() => refetchWallets()}
                            className='bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all inline-flex items-center gap-2 shadow-lg'
                          >
                            <RefreshCw className='w-4 h-4' />
                            {t('dashboard.tryAgain')}
                          </button>
                        </div>
                      )
                    }

                    if (isLoadingWallets) {
                      return (
                        <div className='space-y-3'>
                          {[1, 2].map(i => (
                            <div
                              key={i}
                              className='animate-pulse bg-gray-100 dark:bg-gray-700/50 rounded-xl p-4'
                            >
                              <div className='flex items-center space-x-3'>
                                <div className='w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-xl'></div>
                                <div className='flex-1'>
                                  <div className='h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-2'></div>
                                  <div className='h-3 bg-gray-200 dark:bg-gray-600 rounded w-16'></div>
                                </div>
                                <div className='text-right'>
                                  <div className='h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-2'></div>
                                  <div className='h-3 bg-gray-200 dark:bg-gray-600 rounded w-14'></div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <p className='text-center text-xs text-gray-500 dark:text-gray-400 mt-2'>
                            {t('dashboard.loadingWallets')}
                          </p>
                        </div>
                      )
                    }

                    if (hasNoWallets) {
                      return (
                        <div className='text-center py-10'>
                          <div className='w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4'>
                            <Wallet className='w-8 h-8 text-gray-400 dark:text-gray-500' />
                          </div>
                          <p className='text-gray-600 dark:text-gray-400 mb-4'>
                            {t('dashboard.noWalletsFound')}
                          </p>
                          <button
                            onClick={handleCreateWallet}
                            className='bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all inline-flex items-center gap-2 shadow-lg'
                          >
                            <Plus className='w-4 h-4' />
                            {t('dashboard.createWallet')}
                          </button>
                        </div>
                      )
                    }

                    // Lista de carteiras
                    return (
                      <div className='space-y-3'>
                        {wallets.map(wallet => {
                          const walletIdStr = String(wallet.id)
                          const isExpanded = expandedWallets.has(walletIdStr)
                          const networks = getAvailableNetworks(wallet)

                          return (
                            <div
                              key={wallet.id}
                              className='bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 overflow-hidden hover:border-blue-200 dark:hover:border-blue-500/30 transition-all'
                            >
                              <button
                                onClick={() => toggleWallet(walletIdStr)}
                                className='w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                              >
                                <div className='flex items-center space-x-3 flex-1'>
                                  <div className='w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20'>
                                    <Wallet className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                                  </div>
                                  <div className='text-left'>
                                    <h4 className='font-semibold text-gray-900 dark:text-white text-sm'>
                                      {wallet.name}
                                    </h4>
                                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                                      Multi • {networks.length} {t('dashboard.networks')}
                                    </p>
                                  </div>
                                </div>
                                <div className='flex items-center space-x-3'>
                                  <div className='text-right'>
                                    {(() => {
                                      const walletIndex = walletIds.indexOf(walletIdStr)
                                      const balanceQuery = balancesQueries[walletIndex]
                                      const balanceData = balanceQuery?.data

                                      if (balanceQuery?.isLoading) {
                                        return (
                                          <div className='animate-pulse space-y-1'>
                                            <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded w-20'></div>
                                            <div className='h-3 bg-gray-300 dark:bg-gray-600 rounded w-14'></div>
                                          </div>
                                        )
                                      }

                                      let totalBRL = 0
                                      let hasLoadingPrice = false
                                      if (balanceData) {
                                        Object.entries(balanceData).forEach(
                                          ([networkKey, netBalance]: any) => {
                                            const balance = Number.parseFloat(
                                              netBalance.balance || '0'
                                            )
                                            const symbol = getSymbolFromKey(networkKey)
                                            const marketPriceData = marketPrices[symbol]
                                            const priceUSD =
                                              marketPriceData?.price ||
                                              Number.parseFloat(netBalance.price_usd || '0')
                                            const priceLoading =
                                              marketPriceData === undefined ||
                                              netBalance.price_loading ||
                                              false

                                            const balanceUSD = balance * priceUSD
                                            totalBRL += balanceUSD
                                            if (priceLoading) hasLoadingPrice = true
                                          }
                                        )
                                      }

                                      return (
                                        <>
                                          <p className='font-bold text-gray-900 dark:text-white text-sm'>
                                            {hasLoadingPrice ? (
                                              <span className='animate-pulse'>
                                                {t('dashboard.updating')}
                                              </span>
                                            ) : (
                                              formatCurrency(totalBRL)
                                            )}
                                          </p>
                                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                                            {t('dashboard.balance')}
                                          </p>
                                        </>
                                      )
                                    })()}
                                  </div>
                                  <div className='text-gray-400 dark:text-gray-500'>
                                    {isExpanded ? (
                                      <ChevronDown className='w-5 h-5' />
                                    ) : (
                                      <ChevronRight className='w-5 h-5' />
                                    )}
                                  </div>
                                </div>
                              </button>

                              {isExpanded && (
                                <div className='border-t border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-800/50 p-4'>
                                  <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                                    {networks
                                      .filter(net => {
                                        if (showAllNetworks) return true
                                        return networkPreferences[
                                          net.network as keyof typeof networkPreferences
                                        ]
                                      })
                                      .map(network => (
                                        <div
                                          key={network.network}
                                          className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all'
                                        >
                                          <div className='flex items-center space-x-2'>
                                            <div className='w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-600'>
                                              <CryptoIcon symbol={network.symbol} size={24} />
                                            </div>
                                            <div>
                                              <p className='font-medium text-gray-900 dark:text-white text-xs'>
                                                {network.name}
                                              </p>
                                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                                {network.symbol}
                                              </p>
                                            </div>
                                          </div>
                                          <div className='text-right'>
                                            {(() => {
                                              const walletIndex = walletIds.indexOf(walletIdStr)
                                              const balanceQuery = balancesQueries[walletIndex]
                                              const balanceData = balanceQuery?.data
                                              const networkBalance = balanceData?.[network.network]

                                              if (balanceQuery?.isLoading) {
                                                return (
                                                  <div className='animate-pulse space-y-1'>
                                                    <div className='h-3 bg-gray-300 dark:bg-gray-600 rounded w-16'></div>
                                                    <div className='h-2 bg-gray-300 dark:bg-gray-600 rounded w-12 mt-1'></div>
                                                  </div>
                                                )
                                              }

                                              if (networkBalance) {
                                                const balance = Number.parseFloat(
                                                  (networkBalance as any).balance || '0'
                                                )
                                                const marketPriceData = marketPrices[network.symbol]
                                                const priceUSD =
                                                  marketPriceData?.price ||
                                                  Number.parseFloat(
                                                    (networkBalance as any).price_usd || '0'
                                                  )
                                                const priceLoading =
                                                  marketPriceData === undefined || false
                                                const totalUSD = balance * priceUSD

                                                return (
                                                  <>
                                                    <p className='font-semibold text-gray-900 dark:text-white text-xs'>
                                                      {balance.toFixed(6)} {network.symbol}
                                                    </p>
                                                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                                                      {priceLoading ? (
                                                        <span className='animate-pulse'>
                                                          {t('dashboard.loading')}
                                                        </span>
                                                      ) : (
                                                        formatCurrency(totalUSD)
                                                      )}
                                                    </p>
                                                  </>
                                                )
                                              }

                                              return (
                                                <>
                                                  <p className='font-semibold text-gray-900 dark:text-white text-xs'>
                                                    0.000000 {network.symbol}
                                                  </p>
                                                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                                                    R$ 0,00
                                                  </p>
                                                </>
                                              )
                                            })()}
                                          </div>
                                        </div>
                                      ))}
                                  </div>

                                  {/* 🪙 TOKENS SECTION (USDT, USDC, etc) */}
                                  <div className='mt-4 pt-4 border-t border-gray-100 dark:border-gray-600'>
                                    <p className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3'>
                                      Stablecoins
                                    </p>
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                                      {(() => {
                                        const walletIndex = walletIds.indexOf(walletIdStr)
                                        const balanceQuery = balancesQueries[walletIndex]
                                        const balanceData = balanceQuery?.data || {}
                                        const tokens: any[] = []

                                        // Procurar por tokens no balanceData
                                        for (const [key, value] of Object.entries(balanceData)) {
                                          const keyLower = String(key).toLowerCase()

                                          // Detectar USDT
                                          if (keyLower.includes('usdt')) {
                                            const networkName =
                                              keyLower.split('_')[0]?.toUpperCase() ?? 'UNKNOWN'
                                            tokens.push({
                                              id: key,
                                              symbol: 'USDT',
                                              name: `USDT (${networkName})`,
                                              balance: value,
                                              color: 'green',
                                            })
                                          }

                                          // Detectar USDC
                                          if (keyLower.includes('usdc')) {
                                            const networkName =
                                              keyLower.split('_')[0]?.toUpperCase() ?? 'UNKNOWN'
                                            tokens.push({
                                              id: key,
                                              symbol: 'USDC',
                                              name: `USDC (${networkName})`,
                                              balance: value,
                                              color: 'blue',
                                            })
                                          }
                                        }

                                        // Se não encontrou tokens, retorna mensagem
                                        if (tokens.length === 0) {
                                          return (
                                            <p className='text-xs text-gray-500 dark:text-gray-400 col-span-full'>
                                              {t('dashboard.noStablecoinsFound')}
                                            </p>
                                          )
                                        }

                                        // Renderizar tokens
                                        return tokens.map(token => {
                                          const bgColorGreen = 'bg-green-100 dark:bg-green-600/20'
                                          const bgColorBlue = 'bg-blue-100 dark:bg-blue-600/20'
                                          const borderColorGreen =
                                            'border-green-300 dark:border-green-600/50 hover:border-green-400 dark:hover:border-green-500'
                                          const borderColorBlue =
                                            'border-blue-300 dark:border-blue-600/50 hover:border-blue-400 dark:hover:border-blue-500'
                                          const bgColor =
                                            token.color === 'green' ? bgColorGreen : bgColorBlue
                                          const borderColor =
                                            token.color === 'green'
                                              ? borderColorGreen
                                              : borderColorBlue

                                          const balance = Number.parseFloat(
                                            token.balance?.balance || '0'
                                          )
                                          const marketPriceData = marketPrices[token.symbol]
                                          const priceUSD = marketPriceData?.price ?? 1
                                          const totalUSD = balance * priceUSD

                                          return (
                                            <div
                                              key={token.id}
                                              className={`flex items-center justify-between p-3 ${bgColor} rounded-xl border ${borderColor} transition-all`}
                                            >
                                              <div className='flex items-center space-x-2'>
                                                <div
                                                  className={`w-8 h-8 flex items-center justify-center rounded-lg ${token.color === 'green' ? 'bg-green-100 dark:bg-green-500/20' : 'bg-blue-100 dark:bg-blue-500/20'}`}
                                                >
                                                  <CryptoIcon symbol={token.symbol} size={24} />
                                                </div>
                                                <div>
                                                  <p className='font-medium text-gray-900 dark:text-white text-xs'>
                                                    {token.symbol}
                                                  </p>
                                                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                                                    {token.name.split('(')[1]?.replace(')', '') ||
                                                      token.symbol}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className='text-right'>
                                                <p className='font-semibold text-gray-900 dark:text-white text-xs'>
                                                  {balance.toFixed(2)} {token.symbol}
                                                </p>
                                                <p className='text-xs text-gray-500 dark:text-gray-400'>
                                                  {formatCurrency(totalUSD)}
                                                </p>
                                              </div>
                                            </div>
                                          )
                                        })
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Quick Actions */}
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
                <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3'>
                  <div className='p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl'>
                    <Sparkles className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h3 className='font-bold text-gray-900 dark:text-white'>
                      {t('dashboard.quickActions')}
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {t('dashboard.quickAccessFunctions')}
                    </p>
                  </div>
                </div>
                <div className='p-4 grid grid-cols-2 gap-3'>
                  <button
                    onClick={handleCreateP2POrder}
                    className='group p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl border border-blue-200 dark:border-blue-700/30 hover:border-blue-300 dark:hover:border-blue-600/50 transition-all text-left'
                  >
                    <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg'>
                      <DollarSign className='w-5 h-5 text-white' />
                    </div>
                    <p className='font-semibold text-gray-900 dark:text-white text-sm'>
                      P2P Trading
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                      {t('dashboard.createOrder')}
                    </p>
                  </button>

                  <button
                    onClick={handleSendCrypto}
                    className='group p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 rounded-xl border border-green-200 dark:border-green-700/30 hover:border-green-300 dark:hover:border-green-600/50 transition-all text-left'
                  >
                    <div className='w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg'>
                      <Send className='w-5 h-5 text-white' />
                    </div>
                    <p className='font-semibold text-gray-900 dark:text-white text-sm'>
                      {t('dashboard.send')}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                      {t('dashboard.transferCrypto')}
                    </p>
                  </button>

                  <button
                    onClick={handleReceiveCrypto}
                    className='group p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-xl border border-purple-200 dark:border-purple-700/30 hover:border-purple-300 dark:hover:border-purple-600/50 transition-all text-left'
                  >
                    <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg'>
                      <Download className='w-5 h-5 text-white' />
                    </div>
                    <p className='font-semibold text-gray-900 dark:text-white text-sm'>
                      {t('dashboard.receive')}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                      {t('dashboard.depositAddress')}
                    </p>
                  </button>

                  <button
                    onClick={handleChatP2P}
                    className='group p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 rounded-xl border border-orange-200 dark:border-orange-700/30 hover:border-orange-300 dark:hover:border-orange-600/50 transition-all text-left'
                  >
                    <div className='w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg'>
                      <MessageCircle className='w-5 h-5 text-white' />
                    </div>
                    <p className='font-semibold text-gray-900 dark:text-white text-sm'>Chat</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                      {t('dashboard.negotiateWithOthers')}
                    </p>
                  </button>
                </div>
              </div>
            </div>

            {/* Mercado + Segurança - 1 coluna */}
            <div className='space-y-4'>
              {/* Market Prices */}
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
                <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl'>
                      <TrendingUp className='w-5 h-5 text-white' />
                    </div>
                    <div>
                      <h3 className='font-bold text-gray-900 dark:text-white'>
                        {t('dashboard.market')}
                      </h3>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {t('dashboard.realTimePrices')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      // Forçar atualização dos preços (refresh=true)
                      // O hook usePrices já faz isso automaticamente a cada 5 segundos
                    }}
                    disabled={loadingPrices}
                    className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50'
                    title={t('dashboard.pricesUpdatingAutomatically')}
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loadingPrices ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
                <div className='p-4 space-y-2'>
                  {[
                    {
                      symbol: 'BTC',
                      name: 'Bitcoin',
                      gradient: 'from-orange-500 to-amber-500',
                      bg: 'bg-orange-50 dark:bg-orange-900/20',
                      border: 'border-orange-200 dark:border-orange-700/30',
                    },
                    {
                      symbol: 'ETH',
                      name: 'Ethereum',
                      gradient: 'from-blue-500 to-indigo-500',
                      bg: 'bg-blue-50 dark:bg-blue-900/20',
                      border: 'border-blue-200 dark:border-blue-700/30',
                    },
                    {
                      symbol: 'BNB',
                      name: 'BNB',
                      gradient: 'from-yellow-500 to-amber-500',
                      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                      border: 'border-yellow-200 dark:border-yellow-700/30',
                    },
                    {
                      symbol: 'SOL',
                      name: 'Solana',
                      gradient: 'from-purple-500 to-violet-500',
                      bg: 'bg-purple-50 dark:bg-purple-900/20',
                      border: 'border-purple-200 dark:border-purple-700/30',
                    },
                    {
                      symbol: 'USDT',
                      name: 'USDT',
                      gradient: 'from-green-500 to-emerald-500',
                      bg: 'bg-green-50 dark:bg-green-900/20',
                      border: 'border-green-200 dark:border-green-700/30',
                    },
                  ].map(crypto => (
                    <div
                      key={crypto.symbol}
                      className={`p-3 ${crypto.bg} rounded-xl border ${crypto.border} hover:scale-[1.02] transition-all`}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${crypto.gradient} flex items-center justify-center shadow-md`}
                          >
                            <CryptoIcon symbol={crypto.symbol} size={22} />
                          </div>
                          <div>
                            <p className='text-sm font-bold text-gray-900 dark:text-white'>
                              {crypto.name}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              {crypto.symbol}
                            </p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='text-sm font-bold text-gray-900 dark:text-white'>
                            {marketPrices?.[crypto.symbol]?.price
                              ? formatCurrency(marketPrices[crypto.symbol]!.price)
                              : '--'}
                          </p>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-semibold ${(marketPrices?.[crypto.symbol]?.change24h ?? 0) >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}
                          >
                            {marketPrices?.[crypto.symbol]?.change24hPercent || '--%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Status */}
              <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden'>
                <div className='px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3'>
                  <div className='p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl'>
                    <Shield className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h3 className='font-bold text-gray-900 dark:text-white'>
                      {t('dashboard.security')}
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {t('dashboard.accountStatus')}
                    </p>
                  </div>
                </div>
                <div className='p-4 space-y-3'>
                  <div className='flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700/30'>
                    <div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
                    <div className='flex-1'>
                      <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                        {t('dashboard.twoFAEnabled')}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {user?.isVerified ? t('dashboard.verified') : t('dashboard.pending')}
                      </p>
                    </div>
                    <CheckCircle className='w-5 h-5 text-green-500' />
                  </div>
                  <div className='flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700/30'>
                    <div className='w-3 h-3 bg-blue-500 rounded-full'></div>
                    <div className='flex-1'>
                      <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                        {t('dashboard.strongPassword')}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {t('dashboard.wellProtected')}
                      </p>
                    </div>
                    <CheckCircle className='w-5 h-5 text-blue-500' />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
