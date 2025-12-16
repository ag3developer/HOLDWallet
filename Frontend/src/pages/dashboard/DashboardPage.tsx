import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  ArrowUpRight,
  Shield,
  Sparkles,
} from 'lucide-react'

export const DashboardPage = () => {
  const navigate = useNavigate()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const { data: apiWallets, isLoading: walletsLoading } = useWallets()
  const { formatCurrency, currency } = useCurrencyStore()
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set())

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
  const walletIds = useMemo(() => apiWallets?.map(w => w.id) || [], [apiWallets])
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

  }, [apiWallets, networkPreferences, showAllNetworks])  // Calcular saldo total (em USD, depois convertemos com formatCurrency)
  const totalBalanceUSD = useMemo(() => {
    let total = 0

    balancesQueries.forEach(query => {
      if (query.data) {
        Object.entries(query.data).forEach(([networkKey, netBalance]: any) => {
          const balance = parseFloat(netBalance.balance || '0')

          // Mapear nome da rede/token para símbolo
          const symbol = getSymbolFromKey(networkKey)

          // ✅ Use real-time price from marketPrices hook instead of backend price
          const marketPriceData = marketPrices[symbol]
          const priceUSD = marketPriceData?.price || parseFloat(netBalance.price_usd || '0')

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
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'>
      {/* Fundo com efeito de luz */}
      <div className='fixed inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 dark:opacity-10'></div>
        <div className='absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 dark:opacity-10'></div>
      </div>

      {/* Conteúdo */}
      <div className='relative z-10 p-4 md:p-6 lg:p-8'>
        {/* Header com greeting customizado */}
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-1.5 h-12 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-full'></div>
            <div>
              <h1 className='text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent'>
                Dashboard
              </h1>
              <p className='text-sm text-slate-600 dark:text-slate-400 mt-1'>
                {new Date().toLocaleDateString('pt-BR')}
                {user && ` • Bem-vindo de volta, ${user.username}`}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid - 4 colunas compacto */}
        {!userLoading && !walletsLoading && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6'>
            {/* Saldo Total */}
            <div className='group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300'>
              <div className='absolute inset-0 bg-gradient-to-br from-blue-500/5 dark:from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity'></div>
              <div className='absolute -right-8 -top-8 w-16 h-16 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/40 transition-all'></div>
              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex-1'>
                    <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1'>
                      Saldo Total
                    </p>
                    <p className='text-2xl font-black text-slate-900 dark:text-white'>
                      {formatCurrency(totalBalanceUSD)}
                    </p>
                    <p className='text-xs text-slate-500 dark:text-slate-500 mt-1'>
                      {wallets?.length || 0} carteira(s)
                    </p>
                  </div>
                  <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform'>
                    <DollarSign className='w-5 h-5 text-white' />
                  </div>
                </div>
                <div className='h-0.5 w-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full'></div>
              </div>
            </div>

            {/* Ordens P2P */}
            <div className='group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 overflow-hidden hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300'>
              <div className='absolute inset-0 bg-gradient-to-br from-purple-500/5 dark:from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity'></div>
              <div className='absolute -right-8 -top-8 w-16 h-16 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/20 dark:group-hover:bg-purple-500/40 transition-all'></div>
              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex-1'>
                    <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1'>
                      Ordens Ativas
                    </p>
                    <p className='text-2xl font-black text-slate-900 dark:text-white'>0</p>
                    <p className='text-xs text-slate-500 dark:text-slate-500 mt-1'>
                      Pronto para negociar
                    </p>
                  </div>
                  <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform'>
                    <TrendingUp className='w-5 h-5 text-white' />
                  </div>
                </div>
                <div className='h-0.5 w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full'></div>
              </div>
            </div>

            {/* Reputação */}
            <div className='group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 overflow-hidden hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-300'>
              <div className='absolute inset-0 bg-gradient-to-br from-amber-500/5 dark:from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity'></div>
              <div className='absolute -right-8 -top-8 w-16 h-16 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/40 transition-all'></div>
              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex-1'>
                    <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1'>
                      Reputação
                    </p>
                    <p className='text-2xl font-black text-slate-900 dark:text-white'>
                      {user?.isVerified ? '100%' : 'Novo'}
                    </p>
                    <p
                      className={`text-xs mt-1 font-semibold ${user?.isVerified ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}
                    >
                      {user?.isVerified ? 'Verificado' : 'Complete perfil'}
                    </p>
                  </div>
                  <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform'>
                    <Award className='w-5 h-5 text-white' />
                  </div>
                </div>
                <div className='h-0.5 w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full'></div>
              </div>
            </div>

            {/* BTC Price */}
            <div className='group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 overflow-hidden hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-300'>
              <div className='absolute inset-0 bg-gradient-to-br from-orange-500/5 dark:from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity'></div>
              <div className='absolute -right-8 -top-8 w-16 h-16 bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-xl group-hover:bg-orange-500/20 dark:group-hover:bg-orange-500/40 transition-all'></div>
              <div className='relative z-10'>
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex-1'>
                    <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1'>
                      Bitcoin
                    </p>
                    <p className='text-xl font-black text-slate-900 dark:text-white'>
                      {marketPrices.BTC ? marketPrices.BTC.priceUSD : '$--'}
                    </p>
                    <p
                      className={`text-xs font-semibold mt-1 ${marketPrices.BTC && marketPrices.BTC.change24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {marketPrices.BTC && marketPrices.BTC.change24h >= 0 ? '↑' : '↓'}
                      {marketPrices.BTC ? marketPrices.BTC.change24hPercent : '--%'}
                    </p>
                  </div>
                  <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform'>
                    <Coins className='w-5 h-5 text-white' />
                  </div>
                </div>
                <div className='h-0.5 w-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full'></div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid - Layout reorganizado */}
        {!userLoading && !walletsLoading && (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
            {/* Carteiras + Ações Rápidas - 2 colunas */}
            <div className='lg:col-span-2 space-y-4'>
              {/* Wallets Card */}
              <div className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-all'>
                <div className='px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg'>
                      <Wallet className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                    </div>
                    <div>
                      <h3 className='font-bold text-slate-900 dark:text-white text-sm'>
                        Suas Carteiras
                      </h3>
                      <p className='text-xs text-slate-600 dark:text-slate-400'>
                        Gerencie suas criptomoedas
                      </p>
                    </div>
                  </div>
                  <Plus className='w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors' />
                </div>

                <div className='p-4'>
                  {(() => {
                    console.log('[DashboardPage RENDER] wallets:', wallets)
                    console.log('[DashboardPage RENDER] wallets.length:', wallets?.length)
                    return null
                  })()}
                  {!wallets || wallets.length === 0 ? (
                    <div className='text-center py-8'>
                      <div className='w-12 h-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3'>
                        <Wallet className='w-6 h-6 text-slate-400 dark:text-slate-500' />
                      </div>
                      <p className='text-slate-600 dark:text-slate-400 text-sm mb-3'>
                        Nenhuma carteira criada (apiWallets: {apiWallets?.length || 0}, wallets:{' '}
                        {wallets?.length || 0})
                      </p>
                      <button
                        onClick={handleCreateWallet}
                        className='bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all inline-flex items-center gap-2 shadow-lg'
                      >
                        <Plus className='w-4 h-4' />
                        Criar Carteira
                      </button>
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      {wallets.map(wallet => {
                        const isExpanded = expandedWallets.has(wallet.id)
                        const networks = getAvailableNetworks(wallet)

                        return (
                          <div
                            key={wallet.id}
                            className='bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-all'
                          >
                            <button
                              onClick={() => toggleWallet(wallet.id)}
                              className='w-full flex items-center justify-between p-3 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors'
                            >
                              <div className='flex items-center space-x-3 flex-1'>
                                <div className='w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-500/20 dark:to-blue-600/20'>
                                  <Wallet className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                                </div>
                                <div className='text-left'>
                                  <h4 className='font-semibold text-slate-900 dark:text-white text-xs'>
                                    {wallet.name}
                                  </h4>
                                  <p className='text-xs text-slate-600 dark:text-slate-400'>
                                    {wallet.type} • {networks.length} redes
                                  </p>
                                </div>
                              </div>
                              <div className='flex items-center space-x-2'>
                                <div className='text-right'>
                                  {(() => {
                                    const walletIndex = walletIds.indexOf(wallet.id)
                                    const balanceQuery = balancesQueries[walletIndex]
                                    const balanceData = balanceQuery?.data

                                    if (balanceQuery?.isLoading) {
                                      return (
                                        <div className='animate-pulse space-y-1'>
                                          <div className='h-3 bg-slate-600 rounded w-16'></div>
                                          <div className='h-2 bg-slate-600 rounded w-12'></div>
                                        </div>
                                      )
                                    }

                                    let totalBRL = 0
                                    let hasLoadingPrice = false
                                    if (balanceData) {
                                      Object.entries(balanceData).forEach(
                                        ([networkKey, netBalance]: any) => {
                                          const balance = parseFloat(netBalance.balance || '0')

                                          // Mapear nome da rede/token para símbolo
                                          const symbol = getSymbolFromKey(networkKey)

                                          // ✅ Use real-time price from marketPrices hook
                                          const marketPriceData = marketPrices[symbol]
                                          const priceUSD =
                                            marketPriceData?.price ||
                                            parseFloat(netBalance.price_usd || '0')
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
                                        <p className='font-bold text-white text-xs'>
                                          {hasLoadingPrice ? (
                                            <span className='animate-pulse'>Atualizando...</span>
                                          ) : (
                                            formatCurrency(totalBRL)
                                          )}
                                        </p>
                                        <p className='text-xs text-slate-400'>Saldo</p>
                                      </>
                                    )
                                  })()}
                                </div>
                                <div className='text-slate-500'>
                                  {isExpanded ? (
                                    <ChevronDown className='w-4 h-4' />
                                  ) : (
                                    <ChevronRight className='w-4 h-4' />
                                  )}
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className='border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 p-3'>
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
                                        className='flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all'
                                      >
                                        <div className='flex items-center space-x-2'>
                                          <div className='w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-500/20 dark:to-blue-600/20'>
                                            <CryptoIcon symbol={network.symbol} size={24} />
                                          </div>
                                          <div>
                                            <p className='font-medium text-slate-900 dark:text-white text-xs'>
                                              {network.name}
                                            </p>
                                            <p className='text-xs text-slate-500 dark:text-slate-400'>
                                              {network.symbol}
                                            </p>
                                          </div>
                                        </div>
                                        <div className='text-right'>
                                          {(() => {
                                            const walletIndex = walletIds.indexOf(wallet.id)
                                            const balanceQuery = balancesQueries[walletIndex]
                                            const balanceData = balanceQuery?.data
                                            const networkBalance = balanceData?.[network.network]

                                            if (balanceQuery?.isLoading) {
                                              return (
                                                <div className='animate-pulse space-y-1'>
                                                  <div className='h-2 bg-slate-300 dark:bg-slate-600 rounded w-20'></div>
                                                  <div className='h-2 bg-slate-300 dark:bg-slate-600 rounded w-16 mt-1'></div>
                                                </div>
                                              )
                                            }

                                            if (networkBalance) {
                                              const balance = Number.parseFloat(
                                                (networkBalance as any).balance || '0'
                                              )

                                              // ✅ Use real-time price from marketPrices
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
                                                  <p className='font-semibold text-slate-900 dark:text-white text-xs'>
                                                    {balance.toFixed(6)} {network.symbol}
                                                  </p>
                                                  <p className='text-xs text-slate-500 dark:text-slate-400'>
                                                    {priceLoading ? (
                                                      <span className='animate-pulse'>
                                                        Carregando preço...
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
                                                <p className='font-semibold text-slate-900 dark:text-white text-xs'>
                                                  0.000000 {network.symbol}
                                                </p>
                                                <p className='text-xs text-slate-500 dark:text-slate-400'>
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
                                <div className='mt-3 pt-3 border-t border-slate-200 dark:border-slate-600'>
                                  <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2'>
                                    Stablecoins
                                  </p>
                                  <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                                    {(() => {
                                      const walletIndex = walletIds.indexOf(wallet.id)
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
                                          <p className='text-xs text-slate-500 dark:text-slate-400 col-span-full'>
                                            Nenhum stablecoin encontrado
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
                                            className={`flex items-center justify-between p-3 ${bgColor} rounded-lg border ${borderColor} transition-all`}
                                          >
                                            <div className='flex items-center space-x-2'>
                                              <div
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg ${token.color === 'green' ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-500/20 dark:to-green-600/20' : 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-500/20 dark:to-blue-600/20'}`}
                                              >
                                                <CryptoIcon symbol={token.symbol} size={24} />
                                              </div>
                                              <div>
                                                <p className='font-medium text-slate-900 dark:text-white text-xs'>
                                                  {token.symbol}
                                                </p>
                                                <p className='text-xs text-slate-500 dark:text-slate-400'>
                                                  {token.name.split('(')[1]?.replace(')', '') ||
                                                    token.symbol}
                                                </p>
                                              </div>
                                            </div>
                                            <div className='text-right'>
                                              <p className='font-semibold text-slate-900 dark:text-white text-xs'>
                                                {balance.toFixed(2)} {token.symbol}
                                              </p>
                                              <p className='text-xs text-slate-500 dark:text-slate-400'>
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
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:border-emerald-400 dark:hover:border-emerald-500 transition-all'>
                <div className='px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2'>
                  <div className='p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg'>
                    <Sparkles className='w-4 h-4 text-emerald-600 dark:text-emerald-400' />
                  </div>
                  <h3 className='font-bold text-slate-900 dark:text-white text-sm'>
                    Ações Rápidas
                  </h3>
                </div>
                <div className='p-3 space-y-2'>
                  <button
                    onClick={handleCreateP2POrder}
                    className='w-full flex items-center gap-3 p-3 bg-blue-100 dark:bg-blue-600/20 hover:bg-blue-200 dark:hover:bg-blue-600/30 rounded-lg border border-blue-300 dark:border-blue-600/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all group'
                  >
                    <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform'>
                      <DollarSign className='w-5 h-5 text-white' />
                    </div>
                    <div className='text-left flex-1'>
                      <p className='text-xs font-bold text-blue-900 dark:text-white'>P2P Trading</p>
                      <p className='text-xs text-blue-700 dark:text-slate-400'>Criar ordem</p>
                    </div>
                    <ArrowUpRight className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                  </button>

                  <button
                    onClick={handleSendCrypto}
                    className='w-full flex items-center gap-3 p-3 bg-green-100 dark:bg-green-600/20 hover:bg-green-200 dark:hover:bg-green-600/30 rounded-lg border border-green-300 dark:border-green-600/50 hover:border-green-400 dark:hover:border-green-500 transition-all group'
                  >
                    <div className='w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform'>
                      <Send className='w-5 h-5 text-white' />
                    </div>
                    <div className='text-left flex-1'>
                      <p className='text-xs font-bold text-green-900 dark:text-white'>Enviar</p>
                      <p className='text-xs text-green-700 dark:text-slate-400'>
                        Transferir cripto
                      </p>
                    </div>
                    <ArrowUpRight className='w-4 h-4 text-green-600 dark:text-green-400' />
                  </button>

                  <button
                    onClick={handleReceiveCrypto}
                    className='w-full flex items-center gap-3 p-3 bg-purple-100 dark:bg-purple-600/20 hover:bg-purple-200 dark:hover:bg-purple-600/30 rounded-lg border border-purple-300 dark:border-purple-600/50 hover:border-purple-400 dark:hover:border-purple-500 transition-all group'
                  >
                    <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform'>
                      <Download className='w-5 h-5 text-white' />
                    </div>
                    <div className='text-left flex-1'>
                      <p className='text-xs font-bold text-purple-900 dark:text-white'>Receber</p>
                      <p className='text-xs text-purple-700 dark:text-slate-400'>
                        Endereço de depósito
                      </p>
                    </div>
                    <ArrowUpRight className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                  </button>

                  <button
                    onClick={handleChatP2P}
                    className='w-full flex items-center gap-3 p-3 bg-orange-100 dark:bg-orange-600/20 hover:bg-orange-200 dark:hover:bg-orange-600/30 rounded-lg border border-orange-300 dark:border-orange-600/50 hover:border-orange-400 dark:hover:border-orange-500 transition-all group'
                  >
                    <div className='w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform'>
                      <MessageCircle className='w-5 h-5 text-white' />
                    </div>
                    <div className='text-left flex-1'>
                      <p className='text-xs font-bold text-orange-900 dark:text-white'>Chat</p>
                      <p className='text-xs text-orange-700 dark:text-slate-400'>
                        Negociar com outros
                      </p>
                    </div>
                    <ArrowUpRight className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                  </button>
                </div>
              </div>
            </div>

            {/* Mercado + Segurança - 1 coluna */}
            <div className='space-y-4'>
              {/* Market Prices */}
              <div className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:border-rose-400 dark:hover:border-rose-500 transition-all'>
                <div className='px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg'>
                      <TrendingUp className='w-4 h-4 text-rose-600 dark:text-rose-400' />
                    </div>
                    <h3 className='font-bold text-slate-900 dark:text-white text-sm'>Mercado</h3>
                  </div>
                  <button
                    onClick={async () => {
                      // Forçar atualização dos preços (refresh=true)
                      // O hook usePrices já faz isso automaticamente a cada 5 segundos
                    }}
                    disabled={loadingPrices}
                    className='p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50'
                    title='Preços atualizando automaticamente'
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-400 ${loadingPrices ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
                <div className='p-3 space-y-2'>
                  {[
                    {
                      symbol: 'BTC',
                      name: 'Bitcoin',
                      color: 'bg-orange-100 dark:bg-orange-600/20',
                      border: 'border-orange-300 dark:border-orange-600/50',
                      text: 'text-orange-900 dark:text-slate-200',
                    },
                    {
                      symbol: 'ETH',
                      name: 'Ethereum',
                      color: 'bg-blue-100 dark:bg-blue-600/20',
                      border: 'border-blue-300 dark:border-blue-600/50',
                      text: 'text-blue-900 dark:text-slate-200',
                    },
                    {
                      symbol: 'BNB',
                      name: 'BNB',
                      color: 'bg-yellow-100 dark:bg-yellow-600/20',
                      border: 'border-yellow-300 dark:border-yellow-600/50',
                      text: 'text-yellow-900 dark:text-slate-200',
                    },
                    {
                      symbol: 'SOL',
                      name: 'Solana',
                      color: 'bg-purple-100 dark:bg-purple-600/20',
                      border: 'border-purple-300 dark:border-purple-600/50',
                      text: 'text-purple-900 dark:text-slate-200',
                    },
                    {
                      symbol: 'USDT',
                      name: 'USDT',
                      color: 'bg-green-100 dark:bg-green-600/20',
                      border: 'border-green-300 dark:border-green-600/50',
                      text: 'text-green-900 dark:text-slate-200',
                    },
                  ].map(crypto => (
                    <div
                      key={crypto.symbol}
                      className={`p-2.5 ${crypto.color} rounded-lg border ${crypto.border} hover:border-opacity-100 transition-all`}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <div className='w-6 h-6 rounded-lg bg-slate-300 dark:bg-slate-700 flex items-center justify-center'>
                            <CryptoIcon symbol={crypto.symbol} size={20} />
                          </div>
                          <p className={`text-xs font-bold ${crypto.text}`}>{crypto.name}</p>
                        </div>
                        <div className='text-right'>
                          <p className={`text-xs font-bold ${crypto.text}`}>
                            {marketPrices?.[crypto.symbol]?.priceUSD || '$--'}
                          </p>
                          <p
                            className={`text-xs font-semibold ${(marketPrices?.[crypto.symbol]?.change24h ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                          >
                            {marketPrices?.[crypto.symbol]?.change24hPercent || '--%'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Status */}
              <div className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:border-cyan-400 dark:hover:border-cyan-500 transition-all'>
                <div className='px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2'>
                  <div className='p-2 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg'>
                    <Shield className='w-4 h-4 text-cyan-600 dark:text-cyan-400' />
                  </div>
                  <h3 className='font-bold text-slate-900 dark:text-white text-sm'>Segurança</h3>
                </div>
                <div className='p-4 space-y-3'>
                  <div className='flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg'>
                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                    <div className='flex-1'>
                      <p className='text-xs font-semibold text-slate-900 dark:text-white'>
                        2FA Ativado
                      </p>
                      <p className='text-xs text-slate-600 dark:text-slate-400'>
                        {user?.isVerified ? 'Verificado' : 'Pendente'}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg'>
                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                    <div className='flex-1'>
                      <p className='text-xs font-semibold text-slate-900 dark:text-white'>
                        Senha Forte
                      </p>
                      <p className='text-xs text-slate-600 dark:text-slate-400'>Bem protegido</p>
                    </div>
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
