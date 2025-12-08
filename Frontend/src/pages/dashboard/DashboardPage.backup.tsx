import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useAuth'
import { useWallets, useMultipleWalletBalances } from '@/hooks/useWallet'
import { marketPriceService } from '@/services/market-price-service'
import { CryptoIcon } from '@/components/CryptoIcon'
import {
  DollarSign,
  TrendingUp,
  Award,
  Wallet,
  CreditCard,
  Send,
  Download,
  MessageCircle,
  Plus,
  Activity,
  Clock,
  ArrowDownLeft,
  BarChart3,
  Zap,
  Coins,
  ChevronDown,
  ChevronRight,
  Star,
  RefreshCw,
} from 'lucide-react'

export const DashboardPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const { data: apiWallets, isLoading: walletsLoading } = useWallets()
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set())
  const [marketPrices, setMarketPrices] = useState<any>({})
  const [loadingPrices, setLoadingPrices] = useState(false)

  // Buscar preços de mercado via Trayops API
  useEffect(() => {
    const fetchMarketPrices = async () => {
      setLoadingPrices(true)
      try {
        const symbols = ['BTC', 'ETH', 'USDT']
        const prices = await marketPriceService.getPrices(symbols)
        const priceMap: any = {}
        for (const price of prices) {
          priceMap[price.symbol] = price
        }
        setMarketPrices(priceMap)
      } catch (error) {
        console.error('Erro ao buscar preços de mercado:', error)
      } finally {
        setLoadingPrices(false)
      }
    }

    fetchMarketPrices()

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchMarketPrices, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Buscar saldos reais de todas as carteiras
  const walletIds = useMemo(() => apiWallets?.map(w => w.id) || [], [apiWallets])
  const balancesQueries = useMultipleWalletBalances(walletIds)

  // Carregar preferências de rede do localStorage
  const networkPreferences = useMemo(() => {
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
    return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences
  }, [])

  const showAllNetworks = useMemo(() => {
    const saved = localStorage.getItem('wallet_show_all_networks')
    return saved !== null ? saved === 'true' : true
  }, [])

  // Filtrar carteiras por preferências
  const wallets = useMemo(() => {
    // Verificar se apiWallets existe e é um array
    if (!apiWallets || !Array.isArray(apiWallets)) {
      return []
    }

    // Se mostrar todas, retorna direto
    if (showAllNetworks) {
      return apiWallets
    }

    // Filtrar por preferências (coin em minúsculo)
    const filtered = apiWallets.filter(wallet => {
      // Validar que wallet.coin existe
      if (!wallet || !wallet.coin) {
        return false
      }
      const coinKey = wallet.coin.toLowerCase()
      return networkPreferences[coinKey as keyof typeof networkPreferences]
    })

    // Se o filtro removeu todas as carteiras mas existem carteiras,
    // retorna todas para não deixar o dashboard vazio
    if (filtered.length === 0 && apiWallets.length > 0) {
      return apiWallets
    }

    return filtered
  }, [apiWallets, networkPreferences, showAllNetworks])

  // Calculate total balance from all wallets usando dados reais da API
  const totalBalanceBRL = useMemo(() => {
    let total = 0

    balancesQueries.forEach((query, index) => {
      console.log(`[DEBUG] Wallet ${index} balance query:`, {
        isLoading: query.isLoading,
        isError: query.isError,
        data: query.data,
        error: query.error,
      })

      if (query.data) {
        Object.values(query.data).forEach((netBalance: any) => {
          const balanceBrl = parseFloat(netBalance.balance_brl || '0')
          console.log(`[DEBUG] Network balance:`, netBalance, 'BRL:', balanceBrl)
          total += balanceBrl
        })
      }
    })

    console.log(`[DEBUG] Total balance BRL:`, total)
    return total
  }, [balancesQueries])

  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

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

  // Handlers de navegação
  const handleCreateP2POrder = () => {
    navigate('/app/p2p/create-order')
  }

  const handleSendCrypto = () => {
    navigate('/app/wallet')
  }

  const handleReceiveCrypto = () => {
    navigate('/app/wallet')
  }

  const handleChatP2P = () => {
    navigate('/app/chat')
  }

  // Redes disponíveis por carteira
  const getAvailableNetworks = (wallet: any) => {
    // Redes suportadas pela HOLD Wallet
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
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8'>
      {/* Header Compacto */}
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
            {t('dashboard.welcome', 'Dashboard')}
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            {user ? `Bem-vindo, ${user.username}` : 'HOLD Wallet'}
          </p>
        </div>
      </div>

      {/* Stats Grid - Compacto e Profissional */}
      {!userLoading && !walletsLoading && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {/* Saldo Total */}
          <div className='bg-white dark:bg-gray-800/50 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-green-500 dark:hover:border-green-600 transition-colors'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                  Saldo Total
                </p>
                <p className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-2'>
                  {formatCurrency(totalBalanceBRL)}
                </p>
                <p className='text-xs text-gray-400 mt-2'>{wallets?.length || 0} carteira(s)</p>
              </div>
              <div className='w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg flex items-center justify-center'>
                <DollarSign className='w-5 h-5 text-white' />
              </div>
            </div>
          </div>

          {/* Ordens P2P */}
          <div className='bg-white dark:bg-gray-800/50 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-500 dark:hover:border-blue-600 transition-colors'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                  Ordens Ativas
                </p>
                <p className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-2'>
                  0
                </p>
                <p className='text-xs text-gray-400 mt-2'>Nenhuma ordem</p>
              </div>
              <div className='w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-lg flex items-center justify-center'>
                <TrendingUp className='w-5 h-5 text-white' />
              </div>
            </div>
          </div>

          {/* Reputação */}
          <div className='bg-white dark:bg-gray-800/50 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-yellow-500 dark:hover:border-yellow-600 transition-colors'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                  Reputação
                </p>
                <p className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-2'>
                  100%
                </p>
                <p className='text-xs text-green-600 dark:text-green-400 mt-2 font-medium'>
                  Verificado
                </p>
              </div>
              <div className='w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-lg flex items-center justify-center'>
                <Award className='w-5 h-5 text-white' />
              </div>
            </div>
          </div>

          {/* Preço de Mercado (BTC) */}
          <div className='bg-white dark:bg-gray-800/50 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-orange-500 dark:hover:border-orange-600 transition-colors'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
                  Bitcoin
                </p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white mt-2'>
                  {marketPrices.BTC ? marketPrices.BTC.priceUSD : '$--'}
                </p>
                <p
                  className={`text-xs font-medium mt-2 ${
                    marketPrices.BTC && marketPrices.BTC.change24h >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {marketPrices.BTC ? marketPrices.BTC.change24hPercent : '--%'}
                </p>
              </div>
              <div className='w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center'>
                <Coins className='w-5 h-5 text-white' />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      {!userLoading && !walletsLoading && (
        <>
          {/* Wallets Overview */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
            <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-2 mb-2'>
                <Wallet className='w-6 h-6 text-gray-600 dark:text-gray-400' />
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  Suas Carteiras
                </h3>
              </div>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Gerencie seus ativos de criptomoedas
              </p>
            </div>
            <div className='p-6'>
              {!wallets || wallets.length === 0 ? (
                <div className='text-center py-8'>
                  <div className='w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4'>
                    <CreditCard className='w-8 h-8 text-gray-400' />
                  </div>
                  <p className='text-gray-500 dark:text-gray-400 mb-4'>
                    Nenhuma carteira encontrada
                  </p>
                  <button className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2'>
                    <Plus className='w-4 h-4' />
                    Criar Primeira Carteira
                  </button>
                </div>
              ) : (
                <div className='space-y-3'>
                  {wallets.map(wallet => {
                    const isExpanded = expandedWallets.has(wallet.id)
                    const networks = getAvailableNetworks(wallet)

                    return (
                      <div
                        key={wallet.id}
                        className='border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden'
                      >
                        {/* Wallet Header - Clicável */}
                        <button
                          onClick={() => toggleWallet(wallet.id)}
                          className='w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                        >
                          <div className='flex items-center space-x-4'>
                            <div className='w-10 h-10 flex items-center justify-center'>
                              <CryptoIcon symbol={wallet.coin || 'BTC'} size={40} />
                            </div>
                            <div className='text-left'>
                              <h4 className='font-medium text-gray-900 dark:text-white'>
                                {wallet.name}
                              </h4>
                              <p className='text-sm text-gray-500 dark:text-gray-400'>
                                {wallet.type} • {networks.length} redes
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center space-x-4'>
                            <div className='text-right'>
                              {(() => {
                                // Calcular saldo total real desta carteira
                                const walletIndex = walletIds.indexOf(wallet.id)
                                const balanceQuery = balancesQueries[walletIndex]
                                const balanceData = balanceQuery?.data

                                if (balanceQuery?.isLoading) {
                                  return (
                                    <div className='animate-pulse'>
                                      <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1'></div>
                                      <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-16'></div>
                                    </div>
                                  )
                                }

                                // Somar saldos de todas as redes
                                let totalBRL = 0
                                if (balanceData) {
                                  Object.values(balanceData).forEach((netBalance: any) => {
                                    totalBRL += parseFloat(netBalance.balance_brl || '0')
                                  })
                                }

                                return (
                                  <>
                                    <p className='font-semibold text-gray-900 dark:text-white'>
                                      {formatCurrency(totalBRL)}
                                    </p>
                                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                                      Saldo total
                                    </p>
                                  </>
                                )
                              })()}
                            </div>
                            {isExpanded ? (
                              <ChevronDown className='w-5 h-5 text-gray-400' />
                            ) : (
                              <ChevronRight className='w-5 h-5 text-gray-400' />
                            )}
                          </div>
                        </button>

                        {/* Networks List - Expansível */}
                        {isExpanded && (
                          <div className='border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'>
                            <div className='p-4 space-y-2'>
                              {networks
                                .filter(net => {
                                  // Filtrar por preferências se não estiver mostrando todas
                                  if (showAllNetworks) return true
                                  return networkPreferences[
                                    net.network as keyof typeof networkPreferences
                                  ]
                                })
                                .map(network => (
                                  <div
                                    key={network.network}
                                    className='flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                                  >
                                    <div className='flex items-center space-x-3'>
                                      <div className='w-8 h-8 flex items-center justify-center'>
                                        <CryptoIcon symbol={network.symbol} size={32} />
                                      </div>
                                      <div>
                                        <p className='font-medium text-gray-900 dark:text-white text-sm'>
                                          {network.name}
                                        </p>
                                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                                          {network.symbol}
                                        </p>
                                      </div>
                                    </div>
                                    <div className='text-right'>
                                      {(() => {
                                        // Buscar saldo real da API
                                        const walletIndex = walletIds.indexOf(wallet.id)
                                        const balanceQuery = balancesQueries[walletIndex]
                                        const balanceData = balanceQuery?.data
                                        const networkBalance = balanceData?.[network.network]

                                        // Verificar se está carregando
                                        if (balanceQuery?.isLoading) {
                                          return (
                                            <div className='animate-pulse'>
                                              <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1'></div>
                                              <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-16'></div>
                                            </div>
                                          )
                                        }

                                        // Mostrar saldo se existir
                                        if (networkBalance) {
                                          return (
                                            <>
                                              <p className='font-medium text-gray-900 dark:text-white text-sm'>
                                                {parseFloat(networkBalance.balance).toFixed(6)}{' '}
                                                {network.symbol}
                                              </p>
                                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                                {formatCurrency(
                                                  parseFloat(networkBalance.balance_brl || '0')
                                                )}
                                              </p>
                                            </>
                                          )
                                        }

                                        // Fallback: sem saldo
                                        return (
                                          <>
                                            <p className='font-medium text-gray-900 dark:text-white text-sm'>
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
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
            <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-2'>
                <Activity className='w-6 h-6 text-gray-600 dark:text-gray-400' />
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  Ações Rápidas
                </h3>
              </div>
            </div>
            <div className='p-6'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <button
                  onClick={handleCreateP2POrder}
                  className='flex flex-col items-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/30 dark:hover:to-blue-700/30 transition-all group'
                >
                  <div className='w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform'>
                    <DollarSign className='w-6 h-6 text-white' />
                  </div>
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Criar Ordem P2P
                  </span>
                </button>
                <button
                  onClick={handleSendCrypto}
                  className='flex flex-col items-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl hover:from-green-100 hover:to-green-200 dark:hover:from-green-800/30 dark:hover:to-green-700/30 transition-all group'
                >
                  <div className='w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform'>
                    <Send className='w-6 h-6 text-white' />
                  </div>
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Enviar Crypto
                  </span>
                </button>
                <button
                  onClick={handleReceiveCrypto}
                  className='flex flex-col items-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/30 dark:hover:to-purple-700/30 transition-all group'
                >
                  <div className='w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform'>
                    <Download className='w-6 h-6 text-white' />
                  </div>
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Receber
                  </span>
                </button>
                <button
                  onClick={handleChatP2P}
                  className='flex flex-col items-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-800/30 dark:hover:to-orange-700/30 transition-all group'
                >
                  <div className='w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform'>
                    <MessageCircle className='w-6 h-6 text-white' />
                  </div>
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Chat P2P
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Market Overview */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='w-6 h-6 text-gray-600 dark:text-gray-400' />
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  Resumo do Mercado
                </h3>
              </div>
              <button
                onClick={async () => {
                  setLoadingPrices(true)
                  try {
                    const symbols = ['BTC', 'ETH', 'USDT']
                    const prices = await marketPriceService.getPrices(symbols)
                    const priceMap: any = {}
                    for (const price of prices) {
                      priceMap[price.symbol] = price
                    }
                    setMarketPrices(priceMap)
                  } catch (error) {
                    console.error('Erro ao atualizar preços:', error)
                  } finally {
                    setLoadingPrices(false)
                  }
                }}
                disabled={loadingPrices}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50'
                title='Atualizar preços'
              >
                <RefreshCw
                  className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${loadingPrices ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {/* Bitcoin */}
              <div className='flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg'>
                <div className='w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center'>
                  <Coins className='w-4 h-4 text-white' />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-orange-700 dark:text-orange-300'>
                    Bitcoin
                  </p>
                  <p className='text-lg font-bold text-orange-600'>
                    {marketPrices.BTC ? marketPrices.BTC.priceUSD : '$--'}
                  </p>
                  <p
                    className={`text-xs ${
                      marketPrices.BTC && marketPrices.BTC.change24h >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {marketPrices.BTC ? marketPrices.BTC.change24hPercent : '--%'}
                  </p>
                </div>
              </div>

              {/* Ethereum */}
              <div className='flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg'>
                <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center'>
                  <Coins className='w-4 h-4 text-white' />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-blue-700 dark:text-blue-300'>Ethereum</p>
                  <p className='text-lg font-bold text-blue-600'>
                    {marketPrices.ETH ? marketPrices.ETH.priceUSD : '$--'}
                  </p>
                  <p
                    className={`text-xs ${
                      marketPrices.ETH && marketPrices.ETH.change24h >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {marketPrices.ETH ? marketPrices.ETH.change24hPercent : '--%'}
                  </p>
                </div>
              </div>

              {/* USDT */}
              <div className='flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg'>
                <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center'>
                  <DollarSign className='w-4 h-4 text-white' />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-green-700 dark:text-green-300'>USDT</p>
                  <p className='text-lg font-bold text-green-600'>
                    {marketPrices.USDT ? marketPrices.USDT.priceUSD : '$--'}
                  </p>
                  <p
                    className={`text-xs ${
                      marketPrices.USDT && marketPrices.USDT.change24h >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {marketPrices.USDT ? marketPrices.USDT.change24hPercent : '--%'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity & Analytics Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Recent Activity */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
              <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-2'>
                  <Clock className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                    Atividade Recente
                  </h3>
                </div>
              </div>
              <div className='p-6'>
                <div className='space-y-4'>
                  <div className='flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                    <div className='w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center'>
                      <ArrowDownLeft className='w-5 h-5 text-green-600' />
                    </div>
                    <div className='flex-1'>
                      <p className='font-medium text-gray-900 dark:text-white'>Conta criada</p>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        Bem-vindo à HOLD Wallet!
                      </p>
                    </div>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>Hoje</span>
                  </div>

                  <div className='text-center py-8'>
                    <Activity className='w-12 h-12 mx-auto text-gray-400 mb-3' />
                    <p className='text-gray-500 dark:text-gray-400'>
                      Suas atividades aparecerão aqui
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Portfolio Analytics */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow'>
              <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
                <div className='flex items-center gap-2'>
                  <BarChart3 className='w-5 h-5 text-gray-600 dark:text-gray-400' />
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                    Análise de Portfolio
                  </h3>
                </div>
              </div>
              <div className='p-6'>
                <div className='space-y-6'>
                  {/* Portfolio Distribution */}
                  <div>
                    <div className='flex justify-between items-center mb-3'>
                      <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                        Distribuição
                      </span>
                      <span className='text-sm text-gray-500 dark:text-gray-400'>100%</span>
                    </div>
                    <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                      <div className='bg-blue-500 h-2 rounded-full w-full'></div>
                    </div>
                    <div className='flex justify-between mt-2'>
                      <span className='text-xs text-gray-500 dark:text-gray-400'>BRL 100%</span>
                    </div>
                  </div>

                  {/* Performance Stats */}
                  <div className='grid grid-cols-3 gap-4'>
                    <div className='text-center p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg'>
                      <div className='flex items-center justify-center gap-1 text-green-600 mb-1'>
                        <TrendingUp className='w-4 h-4' />
                        <span className='text-lg font-bold'>0%</span>
                      </div>
                      <span className='text-xs text-gray-600 dark:text-gray-400'>24h</span>
                    </div>
                    <div className='text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg'>
                      <div className='flex items-center justify-center gap-1 text-blue-600 mb-1'>
                        <BarChart3 className='w-4 h-4' />
                        <span className='text-lg font-bold'>0%</span>
                      </div>
                      <span className='text-xs text-gray-600 dark:text-gray-400'>7d</span>
                    </div>
                    <div className='text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg'>
                      <div className='flex items-center justify-center gap-1 text-purple-600 mb-1'>
                        <Star className='w-4 h-4' />
                        <span className='text-lg font-bold'>0</span>
                      </div>
                      <span className='text-xs text-gray-600 dark:text-gray-400'>Trades</span>
                    </div>
                  </div>

                  {/* Getting Started Tips */}
                  <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <Zap className='w-4 h-4 text-blue-600' />
                      <span className='font-medium text-blue-700 dark:text-blue-300'>Dica</span>
                    </div>
                    <p className='text-sm text-blue-600 dark:text-blue-400'>
                      Comece criando sua primeira carteira para começar a negociar!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
