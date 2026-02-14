/**
 * 📊 EarnPool Page - HOLD Wallet
 * ===============================
 *
 * Página principal do EarnPool - Pool de liquidez para comissões operacionais.
 * Permite visualizar saldo, fornecer liquidez e retirar USDT.
 *
 * @version 2.0.0 - Redesign Premium
 */

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp,
  Wallet,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Info,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  DollarSign,
  Percent,
  Calendar,
  Lock,
  Unlock,
  Crown,
  Shield,
  Zap,
  Globe,
  Sparkles,
  BarChart3,
  Activity,
  Award,
  Target,
  PiggyBank,
  Gem,
  LineChart,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Coins,
} from 'lucide-react'
import { apiClient } from '@/services/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { useWallets, useMultipleWalletBalances } from '@/hooks/useWallet'
import { EarnPoolTermsModal } from '@/components/earnpool/EarnPoolTermsModal'
import { useWalletAddresses } from '@/hooks/useWalletAddresses'
import toast from 'react-hot-toast'

// Import TRAY logo
import trayLogo from '@/assets/crypto-icons/tray.png'

// ============================================================================
// CRYPTO ICONS
// ============================================================================

const CRYPTO_ICONS: Record<string, string> = {
  BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
  ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
  USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
  MATIC: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  TRX: 'https://cryptologos.cc/logos/tron-trx-logo.png',
  LTC: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png',
  DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
  ADA: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
  AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  DOT: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png',
  XRP: 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
  LINK: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
  SHIB: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.png',
  TRAY: trayLogo,
}

// ============================================================================
// TIPOS
// ============================================================================

interface EarnPoolConfig {
  id: string
  min_deposit_usdt: number | null
  max_deposit_usdt: number | null
  lock_period_days: number | null
  target_weekly_yield_percentage: number | null
  early_withdrawal_admin_fee: number | null
  early_withdrawal_op_fee: number | null
  is_active: boolean
  is_accepting_deposits: boolean
  // Aliases for backward compatibility
  min_deposit?: number | null
  max_deposit?: number | null
  base_apy?: number | null
  early_withdrawal_fee?: number | null
  total_pool_balance?: number | null
}

interface EarnPoolBalance {
  total_deposited_usdt: number
  total_yield_earned: number
  total_balance: number
  pending_withdrawals: number
  available_balance: number
  active_deposits_count: number
  deposits: EarnPoolDeposit[]
  // Aliases for backward compatibility
  total_deposited?: number | null
  locked_until?: string | null
  deposits_count?: number | null
}

interface EarnPoolDeposit {
  id: string
  user_id?: string
  original_crypto_symbol: string
  original_crypto_amount: number
  original_crypto_price_usd: number
  usdt_amount: number
  total_yield_earned: number
  status: 'PENDING' | 'ACTIVE' | 'LOCKED' | 'WITHDRAWAL_PENDING' | 'WITHDRAWN' | 'CANCELLED'
  deposited_at: string
  lock_ends_at: string
  last_yield_at?: string | null
  tx_hash_in?: string | null
  // Aliases for backward compatibility
  amount?: number
  currency?: string
  unlocks_at?: string
}

interface EarnPoolWithdrawal {
  id: string
  user_id?: string
  deposit_id?: string
  usdt_amount: number
  yield_amount: number
  admin_fee_amount: number
  operational_fee_amount: number
  net_amount: number
  destination_type: string
  destination_address?: string
  destination_crypto?: string
  status: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
  is_early_withdrawal: boolean
  requested_at: string
  available_at: string
  // Aliases for backward compatibility
  amount?: number
  fee_amount?: number
}

interface WalletCrypto {
  walletId: string
  symbol: string
  network: string
  address: string
  balance: number
  balanceUSD: number
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function EarnPoolPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()

  // ============================================================================
  // HOOKS PARA CARTEIRAS
  // ============================================================================

  const { data: apiWallets } = useWallets()
  const multiWallet = apiWallets?.find((w: any) => w.network === 'multi')
  const balancesQueries = useMultipleWalletBalances(apiWallets?.map((w: any) => w.id) || [])

  const networksList = [
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
    'xrp',
  ]
  const { addresses: networkAddresses } = useWalletAddresses(
    multiWallet?.id?.toString(),
    networksList
  )

  // Estados
  const [config, setConfig] = useState<EarnPoolConfig | null>(null)
  const [balance, setBalance] = useState<EarnPoolBalance | null>(null)
  const [deposits, setDeposits] = useState<EarnPoolDeposit[]>([])
  const [withdrawals, setWithdrawals] = useState<EarnPoolWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'history'>(
    'overview'
  )

  // Formulário de depósito
  const [depositAmount, setDepositAmount] = useState('')
  const [depositPreview, setDepositPreview] = useState<any>(null)
  const [depositLoading, setDepositLoading] = useState(false)

  // Seleção de crypto para depósito
  const [selectedCrypto, setSelectedCrypto] = useState<WalletCrypto | null>(null)
  const [showCryptoSelector, setShowCryptoSelector] = useState(false)
  const [cryptoSearchQuery, setCryptoSearchQuery] = useState('')

  // Formulário de saque
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawPreview, setWithdrawPreview] = useState<any>(null)
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  // Modal de termos
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => {
    // Check localStorage for previously accepted terms
    return localStorage.getItem('earnpool_terms_accepted') === 'true'
  })

  // ============================================================================
  // LISTA DE CRYPTOS DISPONÍVEIS
  // ============================================================================

  const availableCryptos = useMemo(() => {
    if (!apiWallets || !balancesQueries) return []

    const cryptoList: WalletCrypto[] = []

    apiWallets.forEach((wallet: any, walletIndex: number) => {
      const balanceQueryResult = balancesQueries[walletIndex]

      if (wallet.network === 'multi') {
        // Redes principais
        const supportedNetworks = [
          { network: 'bitcoin', symbol: 'BTC' },
          { network: 'ethereum', symbol: 'ETH' },
          { network: 'polygon', symbol: 'MATIC' },
          { network: 'bsc', symbol: 'BNB' },
          { network: 'tron', symbol: 'TRX' },
          { network: 'base', symbol: 'BASE' },
          { network: 'solana', symbol: 'SOL' },
          { network: 'litecoin', symbol: 'LTC' },
          { network: 'dogecoin', symbol: 'DOGE' },
          { network: 'cardano', symbol: 'ADA' },
          { network: 'avalanche', symbol: 'AVAX' },
          { network: 'polkadot', symbol: 'DOT' },
          { network: 'xrp', symbol: 'XRP' },
        ]

        supportedNetworks.forEach(({ network, symbol }) => {
          const networkBalance = balanceQueryResult?.data?.[network]
          const address = networkAddresses[network] || ''
          const balanceVal = networkBalance?.balance ? Number(networkBalance.balance) : 0
          const balanceUSD = networkBalance?.balance_usd ? Number(networkBalance.balance_usd) : 0

          if (balanceVal > 0) {
            cryptoList.push({
              walletId: wallet.id,
              symbol,
              network,
              address,
              balance: balanceVal,
              balanceUSD,
            })
          }
        })

        // Tokens (USDT, USDC, etc.)
        if (balanceQueryResult?.data) {
          const balancesData = balanceQueryResult.data as Record<string, any>

          for (const [key, value] of Object.entries(balancesData)) {
            const keyLower = String(key).toLowerCase()
            const tokenMatch = keyLower.match(/^([a-z0-9]+)_(usdt|usdc|tray|link|shib)$/)

            if (tokenMatch && tokenMatch.length >= 3 && tokenMatch[1] && tokenMatch[2]) {
              const networkKey = tokenMatch[1]
              const tokenSymbol = tokenMatch[2].toUpperCase()
              const balanceVal = value?.balance ? Number(value.balance) : 0
              const balanceUSD = value?.balance_usd ? Number(value.balance_usd) : 0
              const address = networkAddresses[networkKey as keyof typeof networkAddresses] || ''

              if (balanceVal > 0 && networkKey) {
                cryptoList.push({
                  walletId: wallet.id,
                  symbol: tokenSymbol,
                  network: networkKey,
                  address,
                  balance: balanceVal,
                  balanceUSD,
                })
              }
            }
          }
        }
      }
    })

    // Ordenar por valor USD (maior primeiro)
    return cryptoList.sort((a, b) => b.balanceUSD - a.balanceUSD)
  }, [apiWallets, balancesQueries, networkAddresses])

  // Cryptos filtradas pela busca
  const filteredCryptos = useMemo(() => {
    if (!cryptoSearchQuery) return availableCryptos
    const query = cryptoSearchQuery.toLowerCase()
    return availableCryptos.filter(
      crypto =>
        crypto.symbol.toLowerCase().includes(query) || crypto.network.toLowerCase().includes(query)
    )
  }, [availableCryptos, cryptoSearchQuery])

  // ============================================================================
  // CARREGAMENTO DE DADOS
  // ============================================================================

  useEffect(() => {
    loadData()
  }, [isAuthenticated])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar configuração (público)
      const configRes = await apiClient.get('/earnpool/config')
      setConfig(configRes.data)

      // Só carregar dados do usuário se estiver autenticado
      if (isAuthenticated) {
        // Carregar saldo do usuário (autenticado)
        // Usamos Promise.allSettled para não interromper se alguma chamada falhar
        const [balanceResult, historyResult] = await Promise.allSettled([
          apiClient.get('/earnpool/balance'),
          apiClient.get('/earnpool/history'),
        ])

        // Processar resultado do balance
        if (balanceResult.status === 'fulfilled') {
          setBalance(balanceResult.value.data)
        } else {
          // 401/403 = usuário não autenticado ou sem permissão - apenas loga
          const status = (balanceResult.reason as any)?.response?.status
          if (status === 401 || status === 403) {
            console.log('[EarnPool] Auth error on balance - showing public view')
          } else {
            console.warn('[EarnPool] Error loading balance:', balanceResult.reason)
          }
        }

        // Processar resultado do history
        if (historyResult.status === 'fulfilled') {
          setDeposits(historyResult.value.data.deposits || [])
          setWithdrawals(historyResult.value.data.withdrawals || [])
        } else {
          // Silenciosamente ignorar erros de autenticação no histórico
          const status = (historyResult.reason as any)?.response?.status
          if (status !== 401 && status !== 403) {
            console.warn('[EarnPool] Error loading history:', historyResult.reason)
          }
        }
      } else {
        console.log('[EarnPool] User not authenticated - showing public view only')
      }
    } catch (error) {
      console.error('[EarnPool] Error loading data:', error)
      toast.error(t('earnpool.errors.loadingFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast.success(t('common.refresh'))
  }

  // ============================================================================
  // DEPÓSITO
  // ============================================================================

  // Calcular valor em USDT baseado na crypto selecionada
  const depositValueInUSDT = useMemo(() => {
    if (!selectedCrypto || !depositAmount) return 0
    const amount = Number.parseFloat(depositAmount)
    if (Number.isNaN(amount) || amount <= 0) return 0

    // Calcular preço unitário em USD
    const pricePerUnit =
      selectedCrypto.balance > 0 ? selectedCrypto.balanceUSD / selectedCrypto.balance : 0

    return amount * pricePerUnit
  }, [selectedCrypto, depositAmount])

  const handleDepositPreview = async () => {
    if (!selectedCrypto) {
      toast.error(t('earnpool.deposit.selectCrypto'))
      return
    }

    if (!depositAmount || Number.parseFloat(depositAmount) <= 0) {
      toast.error(t('earnpool.deposit.error'))
      return
    }

    const amount = Number.parseFloat(depositAmount)

    // Verificar se tem saldo suficiente
    if (amount > selectedCrypto.balance) {
      toast.error(t('earnpool.deposit.insufficientBalance'))
      return
    }

    // Verificar valor mínimo em USDT
    if (config && depositValueInUSDT < (config.min_deposit_usdt ?? config.min_deposit ?? 0)) {
      toast.error(
        t('earnpool.deposit.minAmountUSDT', {
          amount: config.min_deposit_usdt ?? config.min_deposit,
        })
      )
      return
    }

    setDepositLoading(true)
    try {
      const res = await apiClient.post('/earnpool/deposit/preview', {
        crypto_symbol: selectedCrypto.symbol,
        crypto_amount: amount,
        crypto_network: selectedCrypto.network,
        usdt_amount: depositValueInUSDT,
      })
      setDepositPreview(res.data)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('earnpool.deposit.error'))
    } finally {
      setDepositLoading(false)
    }
  }

  // Handler chamado quando o usuário clica em "Confirm Deposit"
  const handleDepositConfirmClick = () => {
    if (!depositPreview || !selectedCrypto) return

    // Se ainda não aceitou os termos, mostrar o modal
    if (!hasAcceptedTerms) {
      setShowTermsModal(true)
      return
    }

    // Se já aceitou, prosseguir com o depósito
    executeDeposit()
  }

  // Handler chamado quando o usuário aceita os termos no modal
  const handleTermsAccept = () => {
    setHasAcceptedTerms(true)
    localStorage.setItem('earnpool_terms_accepted', 'true')
    setShowTermsModal(false)
    // Prosseguir com o depósito
    executeDeposit()
  }

  // Executa o depósito de fato
  const executeDeposit = async () => {
    if (!depositPreview || !selectedCrypto) return

    setDepositLoading(true)
    try {
      await apiClient.post('/earnpool/deposit', {
        crypto_symbol: selectedCrypto.symbol,
        crypto_amount: Number.parseFloat(depositAmount),
        crypto_network: selectedCrypto.network,
        wallet_id: selectedCrypto.walletId,
        accept_terms: true,
      })
      toast.success(t('earnpool.deposit.success'))
      setDepositAmount('')
      setDepositPreview(null)
      setSelectedCrypto(null)
      setActiveTab('overview')
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('earnpool.errors.depositFailed'))
    } finally {
      setDepositLoading(false)
    }
  }

  // Legacy function - mantida para compatibilidade
  const handleDepositConfirm = async () => {
    handleDepositConfirmClick()
  }

  // Handler para usar saldo máximo
  const handleUseMaxBalance = () => {
    if (selectedCrypto) {
      setDepositAmount(selectedCrypto.balance.toString())
      setDepositPreview(null)
    }
  }

  // ============================================================================
  // SAQUE
  // ============================================================================

  const handleWithdrawPreview = async () => {
    if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
      toast.error(t('earnpool.withdraw.error'))
      return
    }

    setWithdrawLoading(true)
    try {
      const res = await apiClient.post('/earnpool/withdraw/preview', {
        amount: Number.parseFloat(withdrawAmount),
      })
      setWithdrawPreview(res.data)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('earnpool.withdraw.error'))
    } finally {
      setWithdrawLoading(false)
    }
  }

  const handleWithdrawConfirm = async () => {
    if (!withdrawPreview) return

    setWithdrawLoading(true)
    try {
      await apiClient.post('/earnpool/withdraw', {
        amount: Number.parseFloat(withdrawAmount),
      })
      toast.success(t('earnpool.withdraw.success'))
      setWithdrawAmount('')
      setWithdrawPreview(null)
      setActiveTab('overview')
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('earnpool.errors.withdrawFailed'))
    } finally {
      setWithdrawLoading(false)
    }
  }

  // ============================================================================
  // FORMATAÇÃO
  // ============================================================================

  const formatCurrency = (value: number | null | undefined) => {
    // Tratar valores nulos, undefined ou NaN
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '$0.00'
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4'>
        <div className='max-w-4xl mx-auto'>
          {/* Skeleton Hero */}
          <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-emerald-900 to-teal-900 p-6 mb-6'>
            <div className='animate-pulse space-y-4'>
              <div className='h-8 bg-white/10 rounded-lg w-48' />
              <div className='h-4 bg-white/10 rounded w-72' />
              <div className='grid grid-cols-4 gap-3 mt-6'>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className='h-20 bg-white/10 rounded-xl' />
                ))}
              </div>
            </div>
          </div>
          {/* Skeleton Cards */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className='h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse'
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // MINI CHART COMPONENT
  // ============================================================================

  const MiniChart = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    return (
      <div className='flex items-end gap-0.5 h-8'>
        {data.map((value, i) => {
          const height = ((value - min) / range) * 100
          return (
            <div
              key={i}
              className={`w-1.5 rounded-t transition-all duration-300 ${color}`}
              style={{ height: `${Math.max(height, 10)}%`, opacity: 0.4 + (i / data.length) * 0.6 }}
            />
          )
        })}
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 pb-24'>
      {/* ====== HERO HEADER PREMIUM ====== */}
      <div className='relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-800'>
        {/* Background Effects */}
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute top-0 left-0 w-64 h-64 bg-emerald-400 rounded-full blur-3xl animate-pulse' />
          <div className='absolute bottom-0 right-0 w-80 h-80 bg-teal-400 rounded-full blur-3xl' />
          <div
            className='absolute top-1/2 left-1/2 w-48 h-48 bg-cyan-400 rounded-full blur-2xl animate-pulse'
            style={{ animationDelay: '1s' }}
          />
        </div>

        {/* Grid Pattern */}
        <div className='absolute inset-0 opacity-5'>
          <div
            className='absolute inset-0'
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className='relative p-4 md:p-6'>
          {/* Top Bar */}
          <div className='flex items-center justify-between mb-6'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30'>
                <Gem className='w-6 h-6 text-white' />
              </div>
              <div>
                <p className='text-[10px] text-emerald-400 font-bold uppercase tracking-widest'>
                  {t('earnpool.badge')}
                </p>
                <h1 className='text-xl md:text-2xl font-bold text-white'>{t('earnpool.title')}</h1>
              </div>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => setActiveTab('history')}
                className='p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border border-white/10'
                aria-label={t('earnpool.history.title')}
              >
                <History className='w-4 h-4 text-white' />
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className='p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border border-white/10'
                aria-label={t('common.refresh')}
              >
                <RefreshCw className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Trust Badges */}
          <div className='flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide'>
            <div className='flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-lg border border-emerald-500/30 whitespace-nowrap'>
              <Shield className='w-3.5 h-3.5 text-emerald-400' />
              <span className='text-[11px] text-emerald-300 font-medium'>
                {t('earnpool.badges.secure')}
              </span>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 backdrop-blur-sm rounded-lg border border-cyan-500/30 whitespace-nowrap'>
              <Zap className='w-3.5 h-3.5 text-cyan-400' />
              <span className='text-[11px] text-cyan-300 font-medium'>
                {t('earnpool.badges.instant')}
              </span>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 backdrop-blur-sm rounded-lg border border-purple-500/30 whitespace-nowrap'>
              <Award className='w-3.5 h-3.5 text-purple-400' />
              <span className='text-[11px] text-purple-300 font-medium'>
                {t('earnpool.badges.verified')}
              </span>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 backdrop-blur-sm rounded-lg border border-amber-500/30 whitespace-nowrap'>
              <Crown className='w-3.5 h-3.5 text-amber-400' />
              <span className='text-[11px] text-amber-300 font-medium'>
                {t('earnpool.badges.premium')}
              </span>
            </div>
          </div>

          {/* Pool Status Alert */}
          {config && !config.is_active && (
            <div className='bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-3 flex items-center gap-3 mb-4'>
              <AlertCircle className='w-5 h-5 text-yellow-400 flex-shrink-0' />
              <p className='text-sm text-yellow-200'>{t('earnpool.errors.poolInactive')}</p>
            </div>
          )}

          {/* Live Stats Grid */}
          {config && (
            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              {/* Pool Balance */}
              <div className='bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all group'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <PiggyBank className='w-4 h-4 text-emerald-400' />
                    <span className='text-[10px] text-gray-400 uppercase tracking-wide'>
                      {t('earnpool.poolStats.totalPoolBalance')}
                    </span>
                  </div>
                  <Activity className='w-3 h-3 text-emerald-400 animate-pulse' />
                </div>
                <p className='text-xl md:text-2xl font-bold text-white mb-1'>
                  {formatCurrency(config.total_pool_balance)}
                </p>
                <MiniChart data={[40, 55, 45, 60, 50, 70, 65, 80, 75, 90]} color='bg-emerald-400' />
              </div>

              {/* APY / Commission Rate */}
              <div className='bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all group'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <Percent className='w-4 h-4 text-cyan-400' />
                    <span className='text-[10px] text-gray-400 uppercase tracking-wide'>
                      {t('earnpool.poolStats.baseApy')}
                    </span>
                  </div>
                  <Sparkles className='w-3 h-3 text-cyan-400' />
                </div>
                <p className='text-xl md:text-2xl font-bold text-emerald-400'>
                  {config.target_weekly_yield_percentage ?? config.base_apy ?? 0}%
                  <span className='text-xs text-gray-400 font-normal ml-1'>
                    {t('earnpool.perWeek')}
                  </span>
                </p>
                <MiniChart data={[80, 82, 85, 83, 88, 90, 87, 92, 95, 93]} color='bg-cyan-400' />
              </div>

              {/* Lock Period */}
              <div className='bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all group'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <Calendar className='w-4 h-4 text-purple-400' />
                    <span className='text-[10px] text-gray-400 uppercase tracking-wide'>
                      {t('earnpool.poolStats.lockPeriod')}
                    </span>
                  </div>
                  <Lock className='w-3 h-3 text-purple-400' />
                </div>
                <p className='text-xl md:text-2xl font-bold text-white'>
                  {config.lock_period_days ?? 0}
                  <span className='text-sm text-gray-400 font-normal ml-1'>
                    {t('earnpool.poolStats.days')}
                  </span>
                </p>
                <div className='flex items-center gap-2 mt-2'>
                  <div className='flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden'>
                    <div
                      className='h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full'
                      style={{ width: '60%' }}
                    />
                  </div>
                  <span className='text-[10px] text-gray-400'>{t('earnpool.flexible')}</span>
                </div>
              </div>

              {/* Early Withdrawal Fee */}
              <div className='bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all group'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <Target className='w-4 h-4 text-amber-400' />
                    <span className='text-[10px] text-gray-400 uppercase tracking-wide'>
                      {t('earnpool.poolStats.earlyWithdrawalFee')}
                    </span>
                  </div>
                  <Info className='w-3 h-3 text-amber-400' />
                </div>
                <p className='text-xl md:text-2xl font-bold text-white'>
                  {config.early_withdrawal_fee ?? 0}%
                </p>
                <p className='text-[10px] text-gray-400 mt-2'>{t('earnpool.feeNote')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== MAIN CONTENT ====== */}
      <div className='p-4 md:p-6 max-w-4xl mx-auto space-y-6'>
        {/* ====== USER BALANCE CARDS ====== */}
        {balance && (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {/* Total Deposited */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all group'>
              <div className='flex items-center justify-between mb-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25'>
                  <Wallet className='w-5 h-5 text-white' />
                </div>
                {config &&
                  (config.target_weekly_yield_percentage ?? config.base_apy) &&
                  (config.target_weekly_yield_percentage ?? config.base_apy ?? 0) > 0 && (
                    <div className='flex items-center gap-1 text-emerald-500'>
                      <TrendingUp className='w-3.5 h-3.5' />
                      <span className='text-xs font-medium'>
                        +{config.target_weekly_yield_percentage ?? config.base_apy}%
                      </span>
                    </div>
                  )}
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
                {t('earnpool.totalDeposited')}
              </p>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                {formatCurrency(balance.total_deposited_usdt)}
              </p>
              {(balance.total_deposited_usdt ?? 0) > 0 && (
                <div className='mt-3 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all'
                    style={{ width: '75%' }}
                  />
                </div>
              )}
            </div>

            {/* Total Yield Earned */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all group'>
              <div className='flex items-center justify-between mb-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25'>
                  <BarChart3 className='w-5 h-5 text-white' />
                </div>
                <div className='flex items-center gap-1 text-emerald-500'>
                  <Sparkles className='w-3.5 h-3.5' />
                  <span className='text-xs font-medium'>{t('earnpool.earning')}</span>
                </div>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
                {t('earnpool.totalYieldEarned')}
              </p>
              <p className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                {formatCurrency(balance.total_yield_earned)}
              </p>
              <MiniChart data={[20, 35, 30, 45, 40, 55, 50, 65, 60, 75]} color='bg-emerald-500' />
            </div>

            {/* Available Balance */}
            <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all group'>
              <div className='flex items-center justify-between mb-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25'>
                  <DollarSign className='w-5 h-5 text-white' />
                </div>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className='text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline flex items-center gap-1'
                >
                  {t('earnpool.actions.withdraw')}
                  <ChevronRight className='w-3 h-3' />
                </button>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
                {t('earnpool.availableBalance')}
              </p>
              <p className='text-2xl font-bold text-purple-600 dark:text-purple-400'>
                {formatCurrency(balance.available_balance)}
              </p>
              {balance.locked_until && (
                <div className='mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400'>
                  <Lock className='w-3 h-3' />
                  <span>
                    {t('earnpool.lockedUntil')}: {formatDate(balance.locked_until)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== QUICK ACTION BUTTONS ====== */}
        {isAuthenticated && (
          <div className='grid grid-cols-2 gap-4'>
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-semibold transition-all ${
                activeTab === 'deposit'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
              }`}
            >
              <ArrowDownCircle className='w-5 h-5' />
              <span>{t('earnpool.actions.deposit')}</span>
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-semibold transition-all ${
                activeTab === 'withdraw'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <ArrowUpCircle className='w-5 h-5' />
              <span>{t('earnpool.actions.withdraw')}</span>
            </button>
          </div>
        )}

        {/* ====== MAIN PANEL ====== */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
          {/* Tab Navigation */}
          <div className='flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
            {[
              {
                id: 'overview',
                icon: LineChart,
                label: t('earnpool.poolOverview'),
                color: 'emerald',
              },
              {
                id: 'deposit',
                icon: ArrowDownCircle,
                label: t('earnpool.actions.deposit'),
                color: 'green',
              },
              {
                id: 'withdraw',
                icon: ArrowUpCircle,
                label: t('earnpool.actions.withdraw'),
                color: 'blue',
              },
              { id: 'history', icon: History, label: t('earnpool.history.title'), color: 'purple' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-sm font-medium transition-all relative ${
                  activeTab === tab.id
                    ? `text-${tab.color}-600 dark:text-${tab.color}-400 bg-white dark:bg-gray-800`
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className='w-4 h-4' />
                <span className='hidden sm:inline'>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${tab.color}-500`} />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className='p-6'>
            {/* ====== OVERVIEW TAB ====== */}
            {activeTab === 'overview' && (
              <div className='space-y-6'>
                {/* Welcome Section */}
                <div className='text-center py-4'>
                  <div className='w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/30'>
                    <Globe className='w-10 h-10 text-white' />
                  </div>
                  <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>
                    {t('earnpool.title')}
                  </h3>
                  <p className='text-gray-600 dark:text-gray-400 max-w-lg mx-auto'>
                    {t('earnpool.description')}
                  </p>
                </div>

                {/* Deposit Limits */}
                {config && (
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800'>
                      <div className='flex items-center gap-2 mb-2'>
                        <ArrowDownCircle className='w-4 h-4 text-emerald-600 dark:text-emerald-400' />
                        <span className='text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-medium'>
                          {t('earnpool.poolStats.minDeposit')}
                        </span>
                      </div>
                      <p className='text-2xl font-bold text-emerald-700 dark:text-emerald-300'>
                        {formatCurrency(config.min_deposit_usdt ?? config.min_deposit)}
                      </p>
                    </div>
                    <div className='bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800'>
                      <div className='flex items-center gap-2 mb-2'>
                        <Target className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                        <span className='text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-medium'>
                          {t('earnpool.poolStats.maxDeposit')}
                        </span>
                      </div>
                      <p className='text-2xl font-bold text-blue-700 dark:text-blue-300'>
                        {formatCurrency(config.max_deposit)}
                      </p>
                    </div>
                  </div>
                )}

                {/* How it Works */}
                <div className='bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5'>
                  <h4 className='font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                    <Info className='w-4 h-4 text-blue-500' />
                    {t('earnpool.howItWorks.title')}
                  </h4>
                  <div className='space-y-3'>
                    {[
                      {
                        icon: ArrowDownCircle,
                        text: t('earnpool.howItWorks.step1'),
                        color: 'emerald',
                      },
                      { icon: Clock, text: t('earnpool.howItWorks.step2'), color: 'purple' },
                      { icon: TrendingUp, text: t('earnpool.howItWorks.step3'), color: 'cyan' },
                      { icon: ArrowUpCircle, text: t('earnpool.howItWorks.step4'), color: 'blue' },
                    ].map((step, index) => (
                      <div key={index} className='flex items-start gap-3'>
                        <div
                          className={`w-8 h-8 rounded-lg bg-${step.color}-100 dark:bg-${step.color}-900/30 flex items-center justify-center flex-shrink-0`}
                        >
                          <step.icon
                            className={`w-4 h-4 text-${step.color}-600 dark:text-${step.color}-400`}
                          />
                        </div>
                        <p className='text-sm text-gray-700 dark:text-gray-300 pt-1.5'>
                          {step.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                {isAuthenticated && (
                  <button
                    onClick={() => setActiveTab('deposit')}
                    className='w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2'
                  >
                    <ArrowDownCircle className='w-5 h-5' />
                    {t('earnpool.deposit.cta')}
                    <ArrowRight className='w-5 h-5' />
                  </button>
                )}
              </div>
            )}

            {/* ====== DEPOSIT TAB ====== */}
            {activeTab === 'deposit' && (
              <div className='max-w-md mx-auto'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center'>
                    <ArrowDownCircle className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                      {t('earnpool.deposit.title')}
                    </h3>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                      {t('earnpool.deposit.subtitle')}
                    </p>
                  </div>
                </div>

                {/* Step 1: Select Crypto */}
                <div className='mb-6'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t('earnpool.deposit.selectCrypto')}
                  </label>

                  {/* Crypto Selector Button */}
                  <button
                    onClick={() => setShowCryptoSelector(true)}
                    className='w-full p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all flex items-center justify-between'
                  >
                    {selectedCrypto ? (
                      <div className='flex items-center gap-3'>
                        <img
                          src={CRYPTO_ICONS[selectedCrypto.symbol] || '/images/tokens/generic.png'}
                          alt={selectedCrypto.symbol}
                          className='w-10 h-10 rounded-full'
                          onError={e => {
                            ;(e.target as HTMLImageElement).src = '/images/tokens/generic.png'
                          }}
                        />
                        <div className='text-left'>
                          <p className='font-bold text-gray-900 dark:text-white'>
                            {selectedCrypto.symbol}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {t('common.balance')}: {selectedCrypto.balance.toFixed(8)} (
                            {formatCurrency(selectedCrypto.balanceUSD)})
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center'>
                          <Coins className='w-5 h-5 text-gray-400' />
                        </div>
                        <span className='text-gray-500 dark:text-gray-400'>
                          {t('earnpool.deposit.chooseCrypto')}
                        </span>
                      </div>
                    )}
                    <ChevronDown className='w-5 h-5 text-gray-400' />
                  </button>

                  {/* Crypto Selector Modal */}
                  {showCryptoSelector && (
                    <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center'>
                      <div className='bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden'>
                        {/* Header */}
                        <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
                          <h3 className='font-bold text-gray-900 dark:text-white'>
                            {t('earnpool.deposit.selectCrypto')}
                          </h3>
                          <button
                            onClick={() => {
                              setShowCryptoSelector(false)
                              setCryptoSearchQuery('')
                            }}
                            className='w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center'
                          >
                            <X className='w-4 h-4 text-gray-500' />
                          </button>
                        </div>

                        {/* Search */}
                        <div className='p-4'>
                          <div className='relative'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                            <input
                              type='text'
                              value={cryptoSearchQuery}
                              onChange={e => setCryptoSearchQuery(e.target.value)}
                              placeholder={t('earnpool.deposit.searchCrypto')}
                              className='w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 border-none text-gray-900 dark:text-white'
                            />
                          </div>
                        </div>

                        {/* Crypto List */}
                        <div className='overflow-y-auto max-h-[50vh] px-4 pb-4'>
                          {filteredCryptos.length === 0 ? (
                            <div className='text-center py-8'>
                              <Wallet className='w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3' />
                              <p className='text-gray-500 dark:text-gray-400'>
                                {t('earnpool.deposit.noCryptoAvailable')}
                              </p>
                              <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                                {t('earnpool.deposit.depositFirst')}
                              </p>
                            </div>
                          ) : (
                            <div className='space-y-2'>
                              {filteredCryptos.map((crypto, index) => (
                                <button
                                  key={`${crypto.symbol}-${crypto.network}-${index}`}
                                  onClick={() => {
                                    setSelectedCrypto(crypto)
                                    setShowCryptoSelector(false)
                                    setCryptoSearchQuery('')
                                    setDepositAmount('')
                                    setDepositPreview(null)
                                  }}
                                  className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                                    selectedCrypto?.symbol === crypto.symbol &&
                                    selectedCrypto?.network === crypto.network
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500'
                                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                                  }`}
                                >
                                  <img
                                    src={
                                      CRYPTO_ICONS[crypto.symbol] || '/images/tokens/generic.png'
                                    }
                                    alt={crypto.symbol}
                                    className='w-10 h-10 rounded-full'
                                    onError={e => {
                                      ;(e.target as HTMLImageElement).src =
                                        '/images/tokens/generic.png'
                                    }}
                                  />
                                  <div className='flex-1 text-left'>
                                    <div className='flex items-center gap-2'>
                                      <p className='font-bold text-gray-900 dark:text-white'>
                                        {crypto.symbol}
                                      </p>
                                      <span className='text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 uppercase'>
                                        {crypto.network}
                                      </span>
                                    </div>
                                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                                      {crypto.balance.toFixed(8)}
                                    </p>
                                  </div>
                                  <div className='text-right'>
                                    <p className='font-semibold text-gray-900 dark:text-white'>
                                      {formatCurrency(crypto.balanceUSD)}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Amount Input (only if crypto selected) */}
                {selectedCrypto && (
                  <div className='mb-6'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      {t('earnpool.deposit.amount')}
                    </label>
                    <div className='relative'>
                      <div className='absolute left-4 top-1/2 -translate-y-1/2'>
                        <img
                          src={CRYPTO_ICONS[selectedCrypto.symbol] || '/images/tokens/generic.png'}
                          alt={selectedCrypto.symbol}
                          className='w-6 h-6 rounded-full'
                          onError={e => {
                            ;(e.target as HTMLImageElement).src = '/images/tokens/generic.png'
                          }}
                        />
                      </div>
                      <input
                        type='number'
                        value={depositAmount}
                        onChange={e => {
                          setDepositAmount(e.target.value)
                          setDepositPreview(null)
                        }}
                        placeholder='0.00000000'
                        className='w-full pl-14 pr-20 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all'
                      />
                      <button
                        onClick={handleUseMaxBalance}
                        className='absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline'
                      >
                        MAX
                      </button>
                    </div>
                    <div className='flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400'>
                      <span>
                        {t('common.balance')}: {selectedCrypto.balance.toFixed(8)}{' '}
                        {selectedCrypto.symbol}
                      </span>
                      <span>≈ {formatCurrency(depositValueInUSDT)} USDT</span>
                    </div>

                    {/* Min USDT Warning */}
                    {config &&
                      depositValueInUSDT > 0 &&
                      depositValueInUSDT < (config.min_deposit_usdt ?? config.min_deposit ?? 0) && (
                        <div className='mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-start gap-2'>
                          <AlertCircle className='w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0' />
                          <p className='text-xs text-amber-700 dark:text-amber-300'>
                            {t('earnpool.deposit.minAmountUSDT', {
                              amount: config.min_deposit_usdt ?? config.min_deposit,
                            })}
                          </p>
                        </div>
                      )}
                  </div>
                )}

                {/* USDT Conversion Info */}
                {selectedCrypto && depositAmount && depositValueInUSDT > 0 && (
                  <div className='mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800'>
                    <div className='flex items-center gap-2 mb-3'>
                      <Info className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                      <span className='text-sm font-medium text-blue-700 dark:text-blue-300'>
                        {t('earnpool.deposit.conversionInfo')}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <img
                          src={CRYPTO_ICONS[selectedCrypto.symbol]}
                          alt={selectedCrypto.symbol}
                          className='w-6 h-6 rounded-full'
                        />
                        <span className='font-medium text-gray-900 dark:text-white'>
                          {depositAmount} {selectedCrypto.symbol}
                        </span>
                      </div>
                      <ArrowRight className='w-4 h-4 text-gray-400' />
                      <div className='flex items-center gap-2'>
                        <img src={CRYPTO_ICONS.USDT} alt='USDT' className='w-6 h-6 rounded-full' />
                        <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                          {formatCurrency(depositValueInUSDT)}
                        </span>
                      </div>
                    </div>
                    <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-2'>
                      {t('earnpool.deposit.conversionNote')}
                    </p>
                  </div>
                )}

                {/* Preview Button */}
                {!depositPreview && (
                  <button
                    onClick={handleDepositPreview}
                    disabled={
                      depositLoading ||
                      !depositAmount ||
                      !selectedCrypto ||
                      !!(
                        config &&
                        depositValueInUSDT < (config.min_deposit_usdt ?? config.min_deposit ?? 0)
                      )
                    }
                    className='w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 disabled:shadow-none'
                  >
                    {depositLoading ? (
                      <RefreshCw className='w-5 h-5 animate-spin' />
                    ) : (
                      <>
                        <BarChart3 className='w-5 h-5' />
                        {t('earnpool.deposit.preview')}
                      </>
                    )}
                  </button>
                )}

                {/* Preview Result */}
                {depositPreview && selectedCrypto && (
                  <div className='space-y-4'>
                    <div className='bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800'>
                      <div className='space-y-3'>
                        {/* Original Crypto */}
                        <div className='flex justify-between items-center'>
                          <span className='text-gray-600 dark:text-gray-400 text-sm'>
                            {t('earnpool.deposit.cryptoAmount')}
                          </span>
                          <div className='flex items-center gap-2'>
                            <img
                              src={CRYPTO_ICONS[selectedCrypto.symbol]}
                              alt={selectedCrypto.symbol}
                              className='w-5 h-5 rounded-full'
                            />
                            <span className='font-bold text-gray-900 dark:text-white'>
                              {depositAmount} {selectedCrypto.symbol}
                            </span>
                          </div>
                        </div>

                        {/* USDT Value */}
                        <div className='flex justify-between items-center'>
                          <span className='text-gray-600 dark:text-gray-400 text-sm'>
                            {t('earnpool.deposit.usdtValue')}
                          </span>
                          <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                            {formatCurrency(depositValueInUSDT)} USDT
                          </span>
                        </div>

                        <div className='flex justify-between items-center'>
                          <span className='text-gray-600 dark:text-gray-400 text-sm'>
                            {t('earnpool.deposit.lockPeriod')}
                          </span>
                          <span className='font-medium text-gray-900 dark:text-white'>
                            {depositPreview.lock_period_days} {t('earnpool.poolStats.days')}
                          </span>
                        </div>
                        <div className='flex justify-between items-center'>
                          <span className='text-gray-600 dark:text-gray-400 text-sm'>
                            {t('earnpool.deposit.unlocksAt')}
                          </span>
                          <span className='font-medium text-gray-900 dark:text-white'>
                            {formatDate(depositPreview.unlocks_at)}
                          </span>
                        </div>
                        <div className='h-px bg-emerald-200 dark:bg-emerald-700 my-2' />
                        <div className='flex justify-between items-center'>
                          <span className='text-gray-600 dark:text-gray-400 text-sm'>
                            {t('earnpool.deposit.estimatedApy')}
                          </span>
                          <span className='font-bold text-emerald-600 dark:text-emerald-400 text-lg'>
                            {depositPreview.estimated_apy}%
                          </span>
                        </div>
                        <div className='flex justify-between items-center bg-emerald-100 dark:bg-emerald-800/30 rounded-xl p-3'>
                          <span className='text-emerald-700 dark:text-emerald-300 text-sm font-medium'>
                            {t('earnpool.deposit.estimatedYearlyYield')}
                          </span>
                          <span className='font-bold text-emerald-600 dark:text-emerald-400 text-xl'>
                            {formatCurrency(depositPreview.estimated_yearly_yield)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Info */}
                    <div className='p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800'>
                      <div className='flex items-start gap-3'>
                        <Clock className='w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5' />
                        <div>
                          <p className='font-medium text-amber-800 dark:text-amber-200 text-sm'>
                            {t('earnpool.deposit.pendingApproval')}
                          </p>
                          <p className='text-xs text-amber-600 dark:text-amber-400 mt-1'>
                            {t('earnpool.deposit.pendingApprovalNote')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='flex gap-3'>
                      <button
                        onClick={() => {
                          setDepositPreview(null)
                          setSelectedCrypto(null)
                          setDepositAmount('')
                        }}
                        className='flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold transition-all hover:bg-gray-200 dark:hover:bg-gray-600'
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleDepositConfirm}
                        disabled={depositLoading}
                        className='flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30'
                      >
                        {depositLoading ? (
                          <RefreshCw className='w-5 h-5 animate-spin' />
                        ) : (
                          <>
                            <CheckCircle className='w-5 h-5' />
                            {t('earnpool.deposit.confirm')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====== WITHDRAW TAB ====== */}
            {activeTab === 'withdraw' && (
              <div className='max-w-md mx-auto'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center'>
                    <ArrowUpCircle className='w-6 h-6 text-white' />
                  </div>
                  <div>
                    <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                      {t('earnpool.withdraw.title')}
                    </h3>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>
                      {t('earnpool.withdraw.subtitle')}
                    </p>
                  </div>
                </div>

                {/* Amount Input */}
                <div className='mb-6'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t('earnpool.withdraw.amount')}
                  </label>
                  <div className='relative'>
                    <div className='absolute left-4 top-1/2 -translate-y-1/2'>
                      <DollarSign className='w-5 h-5 text-gray-400' />
                    </div>
                    <input
                      type='number'
                      value={withdrawAmount}
                      onChange={e => {
                        setWithdrawAmount(e.target.value)
                        setWithdrawPreview(null)
                      }}
                      placeholder='0.00'
                      max={balance?.available_balance ?? undefined}
                      className='w-full pl-12 pr-20 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
                    />
                    <span className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold'>
                      USDT
                    </span>
                  </div>
                  {balance && (
                    <button
                      onClick={() => setWithdrawAmount((balance.available_balance ?? 0).toString())}
                      className='mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1'
                    >
                      {t('earnpool.availableBalance')}: {formatCurrency(balance.available_balance)}
                      <span className='px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-[10px]'>
                        MAX
                      </span>
                    </button>
                  )}
                </div>

                {/* Preview Button */}
                {!withdrawPreview && (
                  <button
                    onClick={handleWithdrawPreview}
                    disabled={withdrawLoading || !withdrawAmount}
                    className='w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:shadow-none'
                  >
                    {withdrawLoading ? (
                      <RefreshCw className='w-5 h-5 animate-spin' />
                    ) : (
                      <>
                        <BarChart3 className='w-5 h-5' />
                        {t('earnpool.withdraw.preview')}
                      </>
                    )}
                  </button>
                )}

                {/* Preview Result */}
                {withdrawPreview && (
                  <div className='space-y-4'>
                    {/* Early Withdrawal Warning */}
                    {withdrawPreview.is_early_withdrawal && (
                      <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3'>
                        <AlertCircle className='w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5' />
                        <p className='text-sm text-amber-700 dark:text-amber-400'>
                          {t('earnpool.withdraw.earlyWithdrawalWarning', {
                            fee: withdrawPreview.fee_percentage,
                          })}
                        </p>
                      </div>
                    )}

                    <div className='bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800'>
                      <div className='space-y-3'>
                        <div className='flex justify-between items-center'>
                          <span className='text-gray-600 dark:text-gray-400 text-sm'>
                            {t('earnpool.withdraw.amount')}
                          </span>
                          <span className='font-bold text-gray-900 dark:text-white'>
                            {formatCurrency(withdrawPreview.amount)}
                          </span>
                        </div>
                        {withdrawPreview.fee_amount > 0 && (
                          <div className='flex justify-between items-center'>
                            <span className='text-gray-600 dark:text-gray-400 text-sm'>
                              {t('earnpool.withdraw.feeAmount')} ({withdrawPreview.fee_percentage}%)
                            </span>
                            <span className='font-medium text-red-600 dark:text-red-400'>
                              -{formatCurrency(withdrawPreview.fee_amount)}
                            </span>
                          </div>
                        )}
                        <div className='h-px bg-blue-200 dark:bg-blue-700 my-2' />
                        <div className='flex justify-between items-center bg-blue-100 dark:bg-blue-800/30 rounded-xl p-3'>
                          <span className='text-blue-700 dark:text-blue-300 text-sm font-medium'>
                            {t('earnpool.withdraw.netAmount')}
                          </span>
                          <span className='font-bold text-blue-600 dark:text-blue-400 text-xl'>
                            {formatCurrency(withdrawPreview.net_amount)}
                          </span>
                        </div>
                        <div className='flex justify-between items-center'>
                          <span className='text-gray-600 dark:text-gray-400 text-sm'>
                            {t('earnpool.withdraw.availableAt')}
                          </span>
                          <span className='font-medium text-gray-900 dark:text-white'>
                            {formatDate(withdrawPreview.available_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
                      {t('earnpool.withdraw.processingTime')}
                    </p>

                    <div className='flex gap-3'>
                      <button
                        onClick={() => setWithdrawPreview(null)}
                        className='flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold transition-all hover:bg-gray-200 dark:hover:bg-gray-600'
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleWithdrawConfirm}
                        disabled={withdrawLoading}
                        className='flex-1 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30'
                      >
                        {withdrawLoading ? (
                          <RefreshCw className='w-5 h-5 animate-spin' />
                        ) : (
                          <>
                            <CheckCircle className='w-5 h-5' />
                            {t('earnpool.withdraw.confirm')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====== HISTORY TAB ====== */}
            {activeTab === 'history' && (
              <div className='space-y-8'>
                {/* Deposits Section */}
                <div>
                  <div className='flex items-center justify-between mb-4'>
                    <h3 className='font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                      <div className='w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center'>
                        <ArrowDownCircle className='w-4 h-4 text-emerald-600 dark:text-emerald-400' />
                      </div>
                      {t('earnpool.history.deposits')}
                    </h3>
                    <span className='text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full'>
                      {deposits.length} {t('earnpool.history.total')}
                    </span>
                  </div>

                  {deposits.length === 0 ? (
                    <div className='text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-2xl'>
                      <PiggyBank className='w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3' />
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        {t('earnpool.history.noDeposits')}
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {deposits.map(deposit => (
                        <div
                          key={deposit.id}
                          className='bg-white dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-600 hover:shadow-md transition-all'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                              <div className='w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center'>
                                <DollarSign className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
                              </div>
                              <div>
                                <p className='font-bold text-gray-900 dark:text-white'>
                                  {formatCurrency(deposit.usdt_amount ?? deposit.amount)} USDT
                                </p>
                                <p className='text-xs text-gray-500 dark:text-gray-400'>
                                  {deposit.original_crypto_symbol &&
                                    deposit.original_crypto_amount != null && (
                                      <span className='mr-2'>
                                        ({Number(deposit.original_crypto_amount).toFixed(4)}{' '}
                                        {deposit.original_crypto_symbol})
                                      </span>
                                    )}
                                  {formatDateTime(deposit.deposited_at)}
                                </p>
                              </div>
                            </div>
                            <div className='text-right'>
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                  deposit.status === 'LOCKED'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    : deposit.status === 'ACTIVE'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {deposit.status === 'LOCKED' ? (
                                  <Lock className='w-3 h-3' />
                                ) : (
                                  <Unlock className='w-3 h-3' />
                                )}
                                {t(`earnpool.status.${deposit.status.toLowerCase()}`)}
                              </span>
                              {deposit.status === 'LOCKED' && (
                                <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-1'>
                                  {t('earnpool.lockedUntil')}:{' '}
                                  {formatDate(deposit.lock_ends_at ?? deposit.unlocks_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Withdrawals Section */}
                <div>
                  <div className='flex items-center justify-between mb-4'>
                    <h3 className='font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                      <div className='w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center'>
                        <ArrowUpCircle className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                      </div>
                      {t('earnpool.history.withdrawals')}
                    </h3>
                    <span className='text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full'>
                      {withdrawals.length} {t('earnpool.history.total')}
                    </span>
                  </div>

                  {withdrawals.length === 0 ? (
                    <div className='text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-2xl'>
                      <Wallet className='w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3' />
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        {t('earnpool.history.noWithdrawals')}
                      </p>
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {withdrawals.map(withdrawal => (
                        <div
                          key={withdrawal.id}
                          className='bg-white dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-600 hover:shadow-md transition-all'
                        >
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                              <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center'>
                                <DollarSign className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                              </div>
                              <div>
                                <p className='font-bold text-gray-900 dark:text-white'>
                                  {formatCurrency(withdrawal.net_amount)} USDT
                                </p>
                                <p className='text-xs text-gray-500 dark:text-gray-400'>
                                  {formatDateTime(withdrawal.requested_at)}
                                </p>
                                {(withdrawal.admin_fee_amount ?? withdrawal.fee_amount ?? 0) >
                                  0 && (
                                  <p className='text-xs text-red-500 dark:text-red-400'>
                                    {t('common.fee')}: -
                                    {formatCurrency(
                                      withdrawal.admin_fee_amount ?? withdrawal.fee_amount ?? 0
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className='text-right'>
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                  withdrawal.status === 'PENDING'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    : withdrawal.status === 'APPROVED' ||
                                        withdrawal.status === 'COMPLETED'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}
                              >
                                {withdrawal.status === 'COMPLETED' ? (
                                  <CheckCircle className='w-3 h-3' />
                                ) : (
                                  <Clock className='w-3 h-3' />
                                )}
                                {t(`earnpool.status.${withdrawal.status.toLowerCase()}`)}
                              </span>
                              {withdrawal.status === 'PENDING' && (
                                <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-1'>
                                  {t('earnpool.withdraw.availableAt')}:{' '}
                                  {formatDate(withdrawal.available_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <EarnPoolTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleTermsAccept}
        minDeposit={config?.min_deposit ?? 250}
        lockPeriod={config?.lock_period_days ?? 30}
        targetYield={0.75}
      />
    </div>
  )
}

export default EarnPoolPage
