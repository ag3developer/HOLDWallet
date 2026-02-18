/**
 * 📊 EarnPool Page - HOLD Wallet
 * ===============================
 * Design Premium - Nova versão completa
 *
 * @version 4.0.0 - Premium Redesign
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  RefreshCw,
  DollarSign,
  Lock,
  Crown,
  Shield,
  Zap,
  Sparkles,
  BarChart3,
  Activity,
  Gem,
  LineChart,
  ArrowRight,
  ChevronDown,
  Search,
  X,
  Coins,
  TrendingDown,
  CheckCircle2,
  Timer,
  Percent,
  Gift,
  Star,
  Play,
  PauseCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
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

type YieldPeriodType = 'WEEKLY' | 'MONTHLY' | 'YEARLY'

interface EarnPoolConfig {
  id: string
  min_deposit_usdt: number | null
  max_deposit_usdt: number | null
  lock_period_days: number | null
  target_weekly_yield_percentage: number | null
  yield_period_type: YieldPeriodType
  early_withdrawal_admin_fee: number | null
  early_withdrawal_op_fee: number | null
  is_active: boolean
  is_accepting_deposits: boolean
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
// CUSTOM TOOLTIP COMPONENT
// ============================================================================

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const value = payload[0]?.value ?? 0
    const yieldValue = payload[0]?.payload?.yield ?? 0

    // Verificar se os valores são números válidos
    const displayValue = Number.isNaN(value) ? 0 : value
    const displayYield = Number.isNaN(yieldValue) ? 0 : yieldValue

    return (
      <div className='bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl'>
        <p className='text-gray-500 dark:text-gray-400 text-xs font-medium mb-1'>{label}</p>
        <p className='text-white font-bold text-xl'>
          ${displayValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        {displayYield > 0 && (
          <p className='text-emerald-400 text-sm mt-1 flex items-center gap-1'>
            <TrendingUp className='w-3 h-3' />
            +$
            {displayYield.toLocaleString('en-US', { minimumFractionDigits: 2 })} do pool
          </p>
        )}
      </div>
    )
  }
  return null
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  subValue?: string
  trend?: number
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'cyan'
}

const StatCard = ({ icon: Icon, label, value, subValue, trend, color }: StatCardProps) => {
  const colorClasses = {
    emerald: {
      bg: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-500/30',
      icon: 'from-emerald-500 to-teal-500',
      text: 'text-emerald-400',
    },
    blue: {
      bg: 'from-blue-500/20 to-indigo-500/20',
      border: 'border-blue-500/30',
      icon: 'from-blue-500 to-indigo-500',
      text: 'text-blue-400',
    },
    purple: {
      bg: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30',
      icon: 'from-purple-500 to-pink-500',
      text: 'text-purple-400',
    },
    amber: {
      bg: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-500/30',
      icon: 'from-amber-500 to-orange-500',
      text: 'text-amber-400',
    },
    cyan: {
      bg: 'from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-500/30',
      icon: 'from-cyan-500 to-blue-500',
      text: 'text-cyan-400',
    },
  }

  const classes = colorClasses[color]

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${classes.bg} border ${classes.border} p-4 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
    >
      <div className='flex items-start justify-between'>
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${classes.icon} flex items-center justify-center shadow-lg`}
        >
          <Icon className='w-5 h-5 text-white' />
        </div>
        {trend !== undefined && !Number.isNaN(trend) && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {trend >= 0 ? <TrendingUp className='w-3 h-3' /> : <TrendingDown className='w-3 h-3' />}
            {trend >= 0 ? '+' : ''}
            {(trend ?? 0).toFixed(2)}%
          </div>
        )}
      </div>
      <div className='mt-4'>
        <p className='text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider'>{label}</p>
        <p className='text-white text-2xl font-bold mt-1'>{value}</p>
        {subValue && <p className={`${classes.text} text-sm font-medium mt-1`}>{subValue}</p>}
      </div>
    </div>
  )
}

// ============================================================================
// FEATURE CARD COMPONENT
// ============================================================================

interface FeatureCardProps {
  icon: React.ElementType
  title: string
  description: string
  color: string
}

const FeatureCard = ({ icon: Icon, title, description, color }: FeatureCardProps) => (
  <div className='flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all'>
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon className='w-5 h-5 text-white' />
    </div>
    <div>
      <h4 className='text-white font-semibold text-sm'>{title}</h4>
      <p className='text-gray-500 dark:text-gray-400 text-xs mt-1'>{description}</p>
    </div>
  </div>
)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EarnPoolPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()

  // Wallet Hooks
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

  // States
  const [config, setConfig] = useState<EarnPoolConfig | null>(null)
  const [balance, setBalance] = useState<EarnPoolBalance | null>(null)
  const [deposits, setDeposits] = useState<EarnPoolDeposit[]>([])
  const [withdrawals, setWithdrawals] = useState<EarnPoolWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeView, setActiveView] = useState<'dashboard' | 'deposit' | 'withdraw' | 'history'>(
    'dashboard'
  )

  // Deposit Form
  const [depositAmount, setDepositAmount] = useState('')
  const [depositPreview, setDepositPreview] = useState<any>(null)
  const [depositLoading, setDepositLoading] = useState(false)
  const [selectedCrypto, setSelectedCrypto] = useState<WalletCrypto | null>(null)
  const [showCryptoSelector, setShowCryptoSelector] = useState(false)
  const [cryptoSearchQuery, setCryptoSearchQuery] = useState('')

  // Withdraw Form
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawPreview, setWithdrawPreview] = useState<any>(null)
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  // Terms Modal
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(() => {
    return localStorage.getItem('earnpool_terms_accepted') === 'true'
  })

  // ============================================================================
  // AVAILABLE CRYPTOS
  // ============================================================================

  const availableCryptos = useMemo(() => {
    if (!apiWallets || !balancesQueries) return []

    const cryptoList: WalletCrypto[] = []

    apiWallets.forEach((wallet: any, walletIndex: number) => {
      const balanceQueryResult = balancesQueries[walletIndex]

      if (wallet.network === 'multi') {
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

        // Tokens
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
              const address = networkAddresses[networkKey] || ''

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

    return cryptoList.sort((a, b) => b.balanceUSD - a.balanceUSD)
  }, [apiWallets, balancesQueries, networkAddresses])

  const filteredCryptos = useMemo(() => {
    if (!cryptoSearchQuery) return availableCryptos
    const query = cryptoSearchQuery.toLowerCase()
    return availableCryptos.filter(
      crypto =>
        crypto.symbol.toLowerCase().includes(query) || crypto.network.toLowerCase().includes(query)
    )
  }, [availableCryptos, cryptoSearchQuery])

  // ============================================================================
  // PERFORMANCE DATA - Dados REAIS baseados no histórico de depósitos e saques
  // ============================================================================

  const performanceData = useMemo(() => {
    // Se não há depósitos, mostrar gráfico vazio com valores zerados
    if (!deposits || deposits.length === 0) {
      const data = []
      for (let i = 30; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
        data.push({
          date: dayLabel,
          value: 0,
          yield: 0,
        })
      }
      return data
    }

    // Ordenar depósitos por data
    const sortedDeposits = [...deposits].sort(
      (a, b) => new Date(a.deposited_at).getTime() - new Date(b.deposited_at).getTime()
    )

    // Ordenar saques por data
    const sortedWithdrawals = [...(withdrawals || [])].sort(
      (a, b) => new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime()
    )

    // Criar mapa de eventos por dia (depósitos e saques)
    const eventsByDay = new Map<string, { deposits: number; withdrawals: number; yield: number }>()

    // Processar depósitos
    sortedDeposits.forEach(deposit => {
      const depositDate = new Date(deposit.deposited_at)
      const dayKey = depositDate.toISOString().split('T')[0] ?? ''

      const existing = eventsByDay.get(dayKey) || { deposits: 0, withdrawals: 0, yield: 0 }
      existing.deposits += deposit.usdt_amount || 0
      existing.yield += deposit.total_yield_earned || 0
      eventsByDay.set(dayKey, existing)
    })

    // Processar saques completados
    sortedWithdrawals
      .filter(w => w.status === 'COMPLETED' || w.status === 'APPROVED')
      .forEach(withdrawal => {
        const withdrawalDate = new Date(withdrawal.requested_at)
        const dayKey = withdrawalDate.toISOString().split('T')[0] ?? ''

        const existing = eventsByDay.get(dayKey) || { deposits: 0, withdrawals: 0, yield: 0 }
        existing.withdrawals += withdrawal.net_amount || withdrawal.usdt_amount || 0
        eventsByDay.set(dayKey, existing)
      })

    // Gerar dados dos últimos 30 dias
    const data = []
    let runningBalance = 0
    let totalYield = 0

    // Primeiro, calcular o saldo acumulado até 30 dias atrás
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // Processar eventos anteriores a 30 dias para ter o saldo inicial
    sortedDeposits.forEach(deposit => {
      const depositDate = new Date(deposit.deposited_at)
      if (depositDate < thirtyDaysAgo) {
        runningBalance += deposit.usdt_amount || 0
        totalYield += deposit.total_yield_earned || 0
      }
    })

    sortedWithdrawals
      .filter(w => w.status === 'COMPLETED' || w.status === 'APPROVED')
      .forEach(withdrawal => {
        const withdrawalDate = new Date(withdrawal.requested_at)
        if (withdrawalDate < thirtyDaysAgo) {
          runningBalance -= withdrawal.net_amount || withdrawal.usdt_amount || 0
        }
      })

    // Agora gerar os dados do gráfico para os últimos 30 dias
    for (let i = 30; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const dayKey = date.toISOString().split('T')[0] ?? ''
      const dayLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

      // Aplicar eventos do dia
      const dayEvents = eventsByDay.get(dayKey)
      if (dayEvents) {
        runningBalance += dayEvents.deposits - dayEvents.withdrawals
        totalYield += dayEvents.yield
      }

      data.push({
        date: dayLabel,
        value: Math.max(0, runningBalance),
        yield: Math.max(0, totalYield),
      })
    }

    return data
  }, [deposits, withdrawals])

  const performanceChange = useMemo(() => {
    if (performanceData.length < 2) return 0
    const first = performanceData[0]?.value ?? 0
    const last = performanceData.at(-1)?.value ?? 0
    if (first === 0 || Number.isNaN(first) || Number.isNaN(last)) return 0
    const change = ((last - first) / first) * 100
    return Number.isNaN(change) ? 0 : change
  }, [performanceData])

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadData()
  }, [isAuthenticated])

  const loadData = async () => {
    setLoading(true)
    try {
      const configRes = await apiClient.get('/earnpool/config')
      setConfig(configRes.data)

      if (isAuthenticated) {
        const [balanceResult, historyResult] = await Promise.allSettled([
          apiClient.get('/earnpool/balance'),
          apiClient.get('/earnpool/history'),
        ])

        if (balanceResult.status === 'fulfilled') {
          setBalance(balanceResult.value.data)
        }

        if (historyResult.status === 'fulfilled') {
          setDeposits(historyResult.value.data.deposits || [])
          setWithdrawals(historyResult.value.data.withdrawals || [])
        }
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
  // DEPOSIT HANDLERS
  // ============================================================================

  const depositValueInUSDT = useMemo(() => {
    if (!selectedCrypto || !depositAmount) return 0
    const amount = Number.parseFloat(depositAmount)
    if (Number.isNaN(amount) || amount <= 0) return 0
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

    if (amount > selectedCrypto.balance) {
      toast.error(t('earnpool.deposit.insufficientBalance'))
      return
    }

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
      setActiveView('dashboard')
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('earnpool.errors.depositFailed'))
    } finally {
      setDepositLoading(false)
    }
  }

  const handleDepositConfirm = () => {
    if (!depositPreview || !selectedCrypto) return
    // Sempre mostrar os termos antes de cada depósito
    setShowTermsModal(true)
  }

  const handleTermsAccept = () => {
    setHasAcceptedTerms(true)
    localStorage.setItem('earnpool_terms_accepted', 'true')
    setShowTermsModal(false)
    executeDeposit()
  }

  // ============================================================================
  // WITHDRAW HANDLERS
  // ============================================================================

  const handleWithdrawPreview = async () => {
    const amount = Number.parseFloat(withdrawAmount)

    if (!withdrawAmount || amount <= 0) {
      toast.error(t('earnpool.withdraw.error'))
      return
    }

    if (balance && amount > (balance.available_balance ?? 0)) {
      toast.error(t('earnpool.withdraw.exceedsBalance'))
      return
    }

    setWithdrawLoading(true)
    try {
      const res = await apiClient.post('/earnpool/withdraw/preview', { amount })
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
      setActiveView('dashboard')
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || t('earnpool.errors.withdrawFailed'))
    } finally {
      setWithdrawLoading(false)
    }
  }

  // ============================================================================
  // FORMATTING
  // ============================================================================

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getYieldRate = () => {
    return config?.target_weekly_yield_percentage ?? config?.base_apy ?? 0
  }

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className='min-h-screen'>
        <div className='max-w-6xl mx-auto p-4 md:p-6'>
          {/* Skeleton Hero */}
          <div className='rounded-3xl bg-gray-100 dark:bg-gray-800/50 p-8 mb-6 animate-pulse'>
            <div className='h-10 bg-gray-200 dark:bg-gray-700/50 rounded-xl w-64 mb-4' />
            <div className='h-6 bg-gray-200 dark:bg-gray-700/50 rounded-lg w-96 mb-8' />
            <div className='h-48 bg-gray-200 dark:bg-gray-700/30 rounded-2xl' />
          </div>
          {/* Skeleton Cards */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className='h-36 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse'
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className='min-h-screen pb-24'>
      {/* ========== HERO SECTION ========== */}
      <div className='relative overflow-hidden'>
        {/* Gradient Orbs */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div className='absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-[100px]' />
          <div className='absolute -top-20 right-0 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[120px]' />
          <div className='absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[80px]' />
        </div>

        <div className='relative max-w-6xl mx-auto p-4 md:p-6 pt-6 md:pt-10'>
          {/* Top Navigation */}
          <div className='flex items-center justify-between mb-8'>
            <div className='flex items-center gap-4'>
              <div className='relative'>
                <div className='w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30'>
                  <Gem className='w-7 h-7 text-white' />
                </div>
                <div className='absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-900 flex items-center justify-center'>
                  <Activity className='w-3 h-3 text-gray-900' />
                </div>
              </div>
              <div>
                <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
                  {t('earnpool.title')}
                </h1>
                <p className='text-gray-500 dark:text-gray-400 text-sm'>{t('earnpool.subtitle')}</p>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className='p-3 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-all'
                aria-label={t('common.refresh')}
              >
                <RefreshCw
                  className={`w-5 h-5 text-gray-700 dark:text-white ${refreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Main Balance Card */}
          <div className='rounded-3xl bg-white dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 md:p-8 mb-6 shadow-sm'>
            <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-6'>
              {/* Left: Balance Info */}
              <div>
                <p className='text-gray-500 dark:text-gray-400 text-sm font-medium mb-2'>
                  {t('earnpool.yourBalance')}
                </p>
                <div className='flex items-baseline gap-4'>
                  <h2 className='text-4xl md:text-5xl font-bold text-gray-900 dark:text-white'>
                    {formatCurrency(balance?.total_deposited_usdt ?? 0)}
                  </h2>
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                      performanceChange >= 0
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {performanceChange >= 0 ? (
                      <TrendingUp className='w-4 h-4' />
                    ) : (
                      <TrendingDown className='w-4 h-4' />
                    )}
                    {performanceChange >= 0 ? '+' : ''}
                    {(performanceChange ?? 0).toFixed(2)}%
                  </div>
                </div>
                <p className='text-emerald-400 text-lg font-semibold mt-2'>
                  +{formatCurrency(balance?.total_yield_earned ?? 0)}{' '}
                  {t('earnpool.totalYieldEarned').toLowerCase()}
                </p>
              </div>

              {/* Right: Quick Actions */}
              <div className='flex gap-3'>
                <button
                  onClick={() => setActiveView('deposit')}
                  className='flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-105 transition-all'
                >
                  <ArrowDownCircle className='w-5 h-5' />
                  {t('earnpool.actions.deposit')}
                </button>
                <button
                  onClick={() => setActiveView('withdraw')}
                  className='flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white font-semibold border border-gray-200 dark:border-white/20 hover:bg-gray-200 dark:hover:bg-white/20 transition-all'
                >
                  <ArrowUpCircle className='w-5 h-5' />
                  {t('earnpool.actions.withdraw')}
                </button>
              </div>
            </div>

            {/* Performance Chart */}
            <div className='mt-8 h-48 md:h-56'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart
                  data={performanceData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id='chartGradient' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='0%' stopColor='#10b981' stopOpacity={0.3} />
                      <stop offset='100%' stopColor='#10b981' stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' stroke='rgba(255,255,255,0.05)' />
                  <XAxis
                    dataKey='date'
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    interval='preserveStartEnd'
                  />
                  <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type='monotone'
                    dataKey='value'
                    stroke='#10b981'
                    strokeWidth={3}
                    fill='url(#chartGradient)'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Grid */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
            <StatCard
              icon={Percent}
              label={t('earnpool.poolStats.baseApy')}
              value={`${getYieldRate()}%`}
              subValue={t('earnpool.perWeek')}
              color='emerald'
            />
            <StatCard
              icon={Timer}
              label={t('earnpool.poolStats.lockPeriod')}
              value={`${config?.lock_period_days ?? 0} ${t('earnpool.poolStats.days')}`}
              subValue={t('earnpool.flexible')}
              color='blue'
            />
            <StatCard
              icon={BarChart3}
              label={t('earnpool.poolStats.totalPoolBalance')}
              value={formatCurrency(config?.total_pool_balance ?? 0)}
              subValue={t('earnpool.badges.secure')}
              color='purple'
            />
            <StatCard
              icon={Wallet}
              label={t('earnpool.availableBalance')}
              value={formatCurrency(balance?.available_balance ?? 0)}
              subValue={t('earnpool.availableForWithdraw')}
              color='amber'
            />
          </div>

          {/* Features */}
          <div className='rounded-3xl bg-white dark:bg-gray-800/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 md:p-8 shadow-sm'>
            <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
              <Star className='w-5 h-5 text-amber-400' />
              {t('earnpool.howItWorks.title')}
            </h3>
            <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <FeatureCard
                icon={ArrowDownCircle}
                title={t('earnpool.howItWorks.step1')}
                description={t('earnpool.deposit.subtitle')}
                color='bg-gradient-to-br from-emerald-500 to-teal-600'
              />
              <FeatureCard
                icon={Clock}
                title={t('earnpool.howItWorks.step2')}
                description={`${t('earnpool.poolStats.lockPeriod')}: ${config?.lock_period_days ?? 30} ${t('earnpool.poolStats.days')}`}
                color='bg-gradient-to-br from-blue-500 to-indigo-600'
              />
              <FeatureCard
                icon={TrendingUp}
                title={t('earnpool.howItWorks.step3')}
                description={t('earnpool.description')}
                color='bg-gradient-to-br from-purple-500 to-pink-600'
              />
              <FeatureCard
                icon={Gift}
                title={t('earnpool.howItWorks.step4')}
                description={t('earnpool.feeNote')}
                color='bg-gradient-to-br from-amber-500 to-orange-600'
              />
            </div>

            {/* Disclaimer */}
            <div className='mt-6 p-4 rounded-2xl bg-gray-100 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600/50'>
              <div className='flex items-start gap-3'>
                <Info className='w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0' />
                <p className='text-gray-500 dark:text-gray-400 text-xs leading-relaxed'>
                  <strong className='text-gray-700 dark:text-gray-300'>
                    {t('earnpool.title')}:
                  </strong>{' '}
                  {t('earnpool.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== DEPOSIT VIEW ========== */}
      {activeView === 'deposit' && (
        <div className='fixed inset-0 z-50 bg-white dark:bg-gray-900/95 backdrop-blur-xl overflow-y-auto'>
          <div className='max-w-lg mx-auto p-4 md:p-6 pt-6'>
            {/* Header */}
            <div className='flex items-center justify-between mb-8'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center'>
                  <ArrowDownCircle className='w-6 h-6 text-white' />
                </div>
                <div>
                  <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                    {t('earnpool.deposit.title')}
                  </h2>
                  <p className='text-gray-500 dark:text-gray-400 text-sm'>
                    {t('earnpool.deposit.subtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveView('dashboard')
                  setDepositPreview(null)
                  setSelectedCrypto(null)
                  setDepositAmount('')
                }}
                className='p-3 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all'
                aria-label={t('common.close')}
              >
                <X className='w-5 h-5 text-gray-700 dark:text-white' />
              </button>
            </div>

            {/* Step 1: Select Crypto */}
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                1. {t('earnpool.deposit.selectCrypto')}
              </label>
              <button
                onClick={() => setShowCryptoSelector(true)}
                className='w-full p-4 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-emerald-500/50 transition-all flex items-center justify-between'
              >
                {selectedCrypto ? (
                  <div className='flex items-center gap-3'>
                    <img
                      src={CRYPTO_ICONS[selectedCrypto.symbol] || '/images/tokens/generic.png'}
                      alt={selectedCrypto.symbol}
                      className='w-10 h-10 rounded-full'
                    />
                    <div className='text-left'>
                      <p className='font-bold text-gray-900 dark:text-white'>
                        {selectedCrypto.symbol}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {t('common.balance')}: {(selectedCrypto.balance ?? 0).toFixed(8)} (
                        {formatCurrency(selectedCrypto.balanceUSD)})
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center'>
                      <Coins className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                    </div>
                    <span className='text-gray-500 dark:text-gray-400'>
                      {t('earnpool.deposit.chooseCrypto')}
                    </span>
                  </div>
                )}
                <ChevronDown className='w-5 h-5 text-gray-500 dark:text-gray-400' />
              </button>
            </div>

            {/* Step 2: Amount */}
            {selectedCrypto && (
              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                  2. {t('earnpool.deposit.amount')}
                </label>
                <div className='relative'>
                  <input
                    type='number'
                    value={depositAmount}
                    onChange={e => {
                      setDepositAmount(e.target.value)
                      setDepositPreview(null)
                    }}
                    placeholder='0.00000000'
                    className='w-full p-4 pl-14 pr-20 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:border-emerald-500 focus:outline-none transition-all'
                  />
                  <img
                    src={CRYPTO_ICONS[selectedCrypto.symbol]}
                    alt={selectedCrypto.symbol}
                    className='absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full'
                  />
                  <button
                    onClick={() => setDepositAmount(selectedCrypto.balance.toString())}
                    className='absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm hover:text-emerald-300'
                  >
                    MAX
                  </button>
                </div>
                <div className='flex justify-between mt-2 text-sm'>
                  <span className='text-gray-500 dark:text-gray-400'>
                    {t('common.balance')}: {(selectedCrypto.balance ?? 0).toFixed(8)}{' '}
                    {selectedCrypto.symbol}
                  </span>
                  <span className='text-emerald-400 font-medium'>
                    ≈ {formatCurrency(depositValueInUSDT)}
                  </span>
                </div>
              </div>
            )}

            {/* Conversion Info */}
            {selectedCrypto && depositAmount && depositValueInUSDT > 0 && (
              <div className='mb-6 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30'>
                <div className='flex items-center gap-2 mb-3'>
                  <Info className='w-4 h-4 text-blue-400' />
                  <span className='text-sm font-medium text-blue-300'>
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
                    <span className='text-white font-medium'>
                      {depositAmount} {selectedCrypto.symbol}
                    </span>
                  </div>
                  <ArrowRight className='w-4 h-4 text-gray-500 dark:text-gray-400' />
                  <div className='flex items-center gap-2'>
                    <img src={CRYPTO_ICONS.USDT} alt='USDT' className='w-6 h-6 rounded-full' />
                    <span className='text-emerald-400 font-bold'>
                      {formatCurrency(depositValueInUSDT)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Button */}
            {!depositPreview && (
              <button
                onClick={handleDepositPreview}
                disabled={depositLoading || !depositAmount || !selectedCrypto}
                className='w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2'
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
                <div className='p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30'>
                  <h4 className='text-lg font-bold text-white mb-4'>
                    {t('earnpool.deposit.summary')}
                  </h4>
                  <div className='space-y-3'>
                    <div className='flex justify-between'>
                      <span className='text-gray-500 dark:text-gray-400'>Crypto</span>
                      <span className='text-white font-medium'>
                        {depositAmount} {selectedCrypto.symbol}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-500 dark:text-gray-400'>{t('earnpool.deposit.valueInUSDT')}</span>
                      <span className='text-emerald-400 font-bold'>
                        {formatCurrency(depositPreview.usdt_amount ?? depositValueInUSDT)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-500 dark:text-gray-400'>{t('earnpool.deposit.lockPeriod')}</span>
                      <span className='text-white font-medium'>
                        {config?.lock_period_days ?? 30} {t('common.days')}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-500 dark:text-gray-400'>{t('earnpool.deposit.estimatedYield')}</span>
                      <span className='text-emerald-400 font-medium'>
                        {getYieldRate()}% / {t('common.week')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='flex gap-3'>
                  <button
                    onClick={() => setDepositPreview(null)}
                    className='flex-1 p-4 rounded-2xl bg-gray-200 dark:bg-gray-700 text-white font-bold hover:bg-gray-300 dark:bg-gray-600 transition-all'
                  >
                    {t('common.back')}
                  </button>
                  <button
                    onClick={handleDepositConfirm}
                    disabled={depositLoading}
                    className='flex-1 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2'
                  >
                    {depositLoading ? (
                      <RefreshCw className='w-5 h-5 animate-spin' />
                    ) : (
                      <>
                        <CheckCircle2 className='w-5 h-5' />
                        {t('common.confirm')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Crypto Selector Modal */}
          {showCryptoSelector && (
            <div className='fixed inset-0 z-60 bg-black/80 flex items-end md:items-center justify-center'>
              <div className='bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden'>
                <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
                  <h3 className='font-bold text-white'>{t('earnpool.deposit.selectCrypto')}</h3>
                  <button
                    onClick={() => {
                      setShowCryptoSelector(false)
                      setCryptoSearchQuery('')
                    }}
                    className='p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700'
                    aria-label={t('common.close')}
                  >
                    <X className='w-4 h-4 text-white' />
                  </button>
                </div>
                <div className='p-4'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400' />
                    <input
                      type='text'
                      value={cryptoSearchQuery}
                      onChange={e => setCryptoSearchQuery(e.target.value)}
                      placeholder={t('earnpool.deposit.searchCrypto')}
                      className='w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-none text-white'
                    />
                  </div>
                </div>
                <div className='overflow-y-auto max-h-[50vh] px-4 pb-4'>
                  {filteredCryptos.length === 0 ? (
                    <div className='text-center py-8'>
                      <Wallet className='w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3' />
                      <p className='text-gray-500 dark:text-gray-400'>{t('earnpool.deposit.noCryptoAvailable')}</p>
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
                              ? 'bg-emerald-500/20 border-2 border-emerald-500'
                              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 border-2 border-transparent'
                          }`}
                        >
                          <img
                            src={CRYPTO_ICONS[crypto.symbol] || '/images/tokens/generic.png'}
                            alt={crypto.symbol}
                            className='w-10 h-10 rounded-full'
                          />
                          <div className='flex-1 text-left'>
                            <p className='font-bold text-white'>{crypto.symbol}</p>
                            <p className='text-xs text-gray-500 dark:text-gray-400 capitalize'>{crypto.network}</p>
                          </div>
                          <div className='text-right'>
                            <p className='text-white font-medium'>
                              {(crypto.balance ?? 0).toFixed(6)}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400'>
                              {formatCurrency(crypto.balanceUSD ?? 0)}
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
      )}

      {/* ========== WITHDRAW VIEW ========== */}
      {activeView === 'withdraw' && (
        <div className='fixed inset-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl overflow-y-auto'>
          <div className='max-w-lg mx-auto p-4 md:p-6 pt-6'>
            {/* Header */}
            <div className='flex items-center justify-between mb-8'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center'>
                  <ArrowUpCircle className='w-6 h-6 text-white' />
                </div>
                <div>
                  <h2 className='text-xl font-bold text-white'>{t('earnpool.actions.withdraw')}</h2>
                  <p className='text-gray-500 dark:text-gray-400 text-sm'>{t('earnpool.withdraw.subtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveView('dashboard')
                  setWithdrawPreview(null)
                  setWithdrawAmount('')
                }}
                className='p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all'
                aria-label={t('common.close')}
              >
                <X className='w-5 h-5 text-white' />
              </button>
            </div>

            {/* Available Balance */}
            <div className='mb-6 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30'>
              <div className='flex items-center justify-between'>
                <span className='text-gray-500 dark:text-gray-400'>{t('earnpool.withdraw.availableBalance')}</span>
                <span className='text-2xl font-bold text-white'>
                  {formatCurrency(balance?.available_balance ?? 0)}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-600 dark:text-gray-300 mb-3'>
                {t('earnpool.withdraw.amount')}
              </label>
              <div className='relative'>
                <DollarSign className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400' />
                <input
                  type='number'
                  value={withdrawAmount}
                  onChange={e => {
                    setWithdrawAmount(e.target.value)
                    setWithdrawPreview(null)
                  }}
                  placeholder='0.00'
                  max={balance?.available_balance ?? undefined}
                  className='w-full p-4 pl-12 pr-20 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:border-blue-500 focus:outline-none transition-all'
                />
                <button
                  onClick={() => setWithdrawAmount((balance?.available_balance ?? 0).toString())}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-sm hover:text-blue-300'
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Preview Button */}
            {!withdrawPreview && (
              <button
                onClick={handleWithdrawPreview}
                disabled={
                  withdrawLoading ||
                  !withdrawAmount ||
                  Number.parseFloat(withdrawAmount) > (balance?.available_balance ?? 0)
                }
                className='w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2'
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
                <div className='p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30'>
                  <h4 className='text-lg font-bold text-white mb-4'>
                    {t('earnpool.withdraw.summary')}
                  </h4>
                  <div className='space-y-3'>
                    <div className='flex justify-between'>
                      <span className='text-gray-500 dark:text-gray-400'>
                        {t('earnpool.withdraw.requestedAmount')}
                      </span>
                      <span className='text-white font-medium'>
                        {formatCurrency(withdrawPreview.usdt_amount)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-500 dark:text-gray-400'>{t('earnpool.withdraw.earnings')}</span>
                      <span className='text-emerald-400 font-medium'>
                        +{formatCurrency(withdrawPreview.yield_amount)}
                      </span>
                    </div>
                    {withdrawPreview.is_early_withdrawal && (
                      <div className='flex justify-between'>
                        <span className='text-gray-500 dark:text-gray-400'>{t('earnpool.withdraw.earlyFee')}</span>
                        <span className='text-red-400 font-medium'>
                          -
                          {formatCurrency(
                            withdrawPreview.admin_fee_amount +
                              withdrawPreview.operational_fee_amount
                          )}
                        </span>
                      </div>
                    )}
                    <div className='h-px bg-gray-200 dark:bg-gray-700 my-2' />
                    <div className='flex justify-between'>
                      <span className='text-white font-bold'>
                        {t('earnpool.withdraw.netAmount')}
                      </span>
                      <span className='text-2xl font-bold text-emerald-400'>
                        {formatCurrency(withdrawPreview.net_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {withdrawPreview.is_early_withdrawal && (
                  <div className='p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30'>
                    <div className='flex items-start gap-3'>
                      <AlertCircle className='w-5 h-5 text-amber-400 mt-0.5' />
                      <div>
                        <p className='text-amber-300 font-medium'>
                          {t('earnpool.withdraw.earlyTitle')}
                        </p>
                        <p className='text-amber-400/80 text-sm mt-1'>
                          {t('earnpool.withdraw.earlyWarning')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className='flex gap-3'>
                  <button
                    onClick={() => setWithdrawPreview(null)}
                    className='flex-1 p-4 rounded-2xl bg-gray-200 dark:bg-gray-700 text-white font-bold hover:bg-gray-300 dark:bg-gray-600 transition-all'
                  >
                    {t('common.back')}
                  </button>
                  <button
                    onClick={handleWithdrawConfirm}
                    disabled={withdrawLoading}
                    className='flex-1 p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2'
                  >
                    {withdrawLoading ? (
                      <RefreshCw className='w-5 h-5 animate-spin' />
                    ) : (
                      <>
                        <CheckCircle2 className='w-5 h-5' />
                        {t('common.confirm')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terms Modal */}
      <EarnPoolTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleTermsAccept}
        minDeposit={config?.min_deposit ?? 250}
        lockPeriod={config?.lock_period_days ?? 30}
        targetYield={getYieldRate()}
      />
    </div>
  )
}

export default EarnPoolPage
