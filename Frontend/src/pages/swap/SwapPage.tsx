import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ArrowDownUp,
  ArrowRight,
  RefreshCw,
  Settings,
  Info,
  ChevronDown,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Fuel,
  TrendingUp,
  Shield,
  Zap,
  Loader2,
  Wallet,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// Simple cn utility for combining classnames
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

// Types
interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  balance?: string
  balanceUSD?: number
}

interface SwapQuote {
  quote_id: string
  from_token: Token
  to_token: Token
  from_amount: string
  to_amount: string
  to_amount_min: string
  exchange_rate: number
  price_impact: number
  fee_percentage: number
  fee_amount: string
  fee_usd: number
  gas_estimate: string
  gas_usd: number
  route: string[]
  expires_at: string
}

interface SwapStatus {
  id: string
  status: 'pending' | 'depositing' | 'swapping' | 'withdrawing' | 'completed' | 'failed'
  tx_hash?: string
  error?: string
}

interface Network {
  id: number
  name: string
  icon: string
  color: string
}

// Network configurations - Using CDN URLs for network logos
const NETWORKS: Network[] = [
  {
    id: 137,
    name: 'Polygon',
    icon: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 56,
    name: 'BSC',
    icon: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    icon: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 8453,
    name: 'Base',
    icon: 'https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg',
    color: 'from-blue-600 to-blue-700',
  },
  {
    id: 1,
    name: 'Ethereum',
    icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    color: 'from-gray-500 to-gray-600',
  },
]

// Popular tokens (fallback) - Using CDN URLs for token logos
const POPULAR_TOKENS: Record<number, Token[]> = {
  137: [
    {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
    },
    {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    {
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    {
      address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    {
      address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      decimals: 8,
      logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    },
  ],
  56: [
    {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      symbol: 'BNB',
      name: 'BNB',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    },
    {
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    {
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    {
      address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
  ],
  42161: [
    {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    {
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    {
      address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      symbol: 'ARB',
      name: 'Arbitrum',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    },
  ],
  8453: [
    {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
  ],
  1: [
    {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      decimals: 8,
      logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    },
  ],
}

const getDefaultNetwork = (): Network => NETWORKS[0]!
const getDefaultTokens = (chainId: number): Token[] => POPULAR_TOKENS[chainId] ?? []

// Token Selector Modal
const TokenSelectorModal = ({
  isOpen,
  onClose,
  tokens,
  onSelect,
  selectedToken,
  title,
}: {
  isOpen: boolean
  onClose: () => void
  tokens: Token[]
  onSelect: (token: Token) => void
  selectedToken: Token | undefined
  title: string
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const filteredTokens = useMemo(() => {
    if (!search) return tokens
    const query = search.toLowerCase()
    return tokens.filter(
      tkn => tkn.symbol.toLowerCase().includes(query) || tkn.name.toLowerCase().includes(query)
    )
  }, [tokens, search])

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <button
        type='button'
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
        aria-label='Close token selector'
      />
      <div className='relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>{title}</h3>
          <button
            onClick={onClose}
            aria-label='Close'
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        {/* Search */}
        <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('swap.searchToken')}
              className='w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
        </div>

        {/* Token List */}
        <div className='max-h-[400px] overflow-y-auto'>
          {filteredTokens.length === 0 ? (
            <div className='p-8 text-center text-gray-500 dark:text-gray-400'>
              {t('swap.noTokensFound')}
            </div>
          ) : (
            <div className='p-2'>
              {filteredTokens.map(token => (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelect(token)
                    onClose()
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-colors',
                    selectedToken?.address === token.address
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <div className='w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden'>
                    {token.logoURI ? (
                      <img
                        src={token.logoURI}
                        alt={token.symbol}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <span className='text-sm font-bold text-gray-600 dark:text-gray-300'>
                        {token.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className='flex-1 text-left'>
                    <p className='font-semibold text-gray-900 dark:text-white'>{token.symbol}</p>
                    <p className='text-sm text-gray-500 dark:text-gray-400'>{token.name}</p>
                  </div>
                  {token.balance && (
                    <div className='text-right'>
                      <p className='font-medium text-gray-900 dark:text-white'>{token.balance}</p>
                      {token.balanceUSD !== undefined && (
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                          ${token.balanceUSD.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedToken?.address === token.address && (
                    <CheckCircle2 className='w-5 h-5 text-blue-500' />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Settings Modal
const SettingsModal = ({
  isOpen,
  onClose,
  slippage,
  setSlippage,
}: {
  isOpen: boolean
  onClose: () => void
  slippage: number
  setSlippage: (value: number) => void
}) => {
  const { t } = useTranslation()
  const [customSlippage, setCustomSlippage] = useState('')

  if (!isOpen) return null

  const slippageOptions = [0.1, 0.5, 1]

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <button
        type='button'
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
        aria-label='Close settings'
      />
      <div className='relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            {t('swap.settings')}
          </h3>
          <button
            onClick={onClose}
            aria-label='Close'
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              {t('swap.slippageTolerance')}
              <div className='group relative'>
                <Info className='w-4 h-4 text-gray-400 cursor-help' />
                <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all'>
                  {t('swap.slippageTooltip')}
                </div>
              </div>
            </label>
            <div className='flex gap-2'>
              {slippageOptions.map(option => (
                <button
                  key={option}
                  onClick={() => {
                    setSlippage(option)
                    setCustomSlippage('')
                  }}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-medium text-sm transition-all',
                    slippage === option && !customSlippage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {option}%
                </button>
              ))}
              <div className='flex-1 relative'>
                <input
                  type='number'
                  value={customSlippage}
                  onChange={e => {
                    setCustomSlippage(e.target.value)
                    if (e.target.value) {
                      setSlippage(Number.parseFloat(e.target.value))
                    }
                  }}
                  placeholder={t('swap.custom')}
                  className='w-full py-2.5 px-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>
                  %
                </span>
              </div>
            </div>
          </div>

          {slippage > 1 && (
            <div className='flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl'>
              <AlertCircle className='w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5' />
              <p className='text-sm text-amber-700 dark:text-amber-300'>
                {t('swap.highSlippageWarning')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Swap Confirmation Modal
const SwapConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  quote,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  quote: SwapQuote
  isLoading: boolean
}) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <button
        type='button'
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
        aria-label='Close confirmation'
      />
      <div className='relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
        <div className='p-6'>
          <h3 className='text-xl font-bold text-gray-900 dark:text-white text-center mb-6'>
            {t('swap.confirmSwap')}
          </h3>

          {/* Token Flow */}
          <div className='space-y-4 mb-6'>
            {/* From */}
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden'>
                  {quote.from_token.logoURI ? (
                    <img
                      src={quote.from_token.logoURI}
                      alt={quote.from_token.symbol}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <span className='text-sm font-bold'>{quote.from_token.symbol.slice(0, 2)}</span>
                  )}
                </div>
                <div>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>{t('swap.youPay')}</p>
                  <p className='font-semibold text-gray-900 dark:text-white'>
                    {quote.from_token.symbol}
                  </p>
                </div>
              </div>
              <p className='text-xl font-bold text-gray-900 dark:text-white'>{quote.from_amount}</p>
            </div>

            {/* Arrow */}
            <div className='flex justify-center'>
              <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full'>
                <ArrowDownUp className='w-5 h-5 text-blue-500' />
              </div>
            </div>

            {/* To */}
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden'>
                  {quote.to_token.logoURI ? (
                    <img
                      src={quote.to_token.logoURI}
                      alt={quote.to_token.symbol}
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <span className='text-sm font-bold'>{quote.to_token.symbol.slice(0, 2)}</span>
                  )}
                </div>
                <div>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>{t('swap.youReceive')}</p>
                  <p className='font-semibold text-gray-900 dark:text-white'>
                    {quote.to_token.symbol}
                  </p>
                </div>
              </div>
              <p className='text-xl font-bold text-green-600 dark:text-green-400'>
                {quote.to_amount}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className='space-y-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500 dark:text-gray-400'>{t('swap.exchangeRate')}</span>
              <span className='text-gray-900 dark:text-white font-medium'>
                1 {quote.from_token.symbol} = {quote.exchange_rate.toFixed(6)}{' '}
                {quote.to_token.symbol}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500 dark:text-gray-400'>{t('swap.priceImpact')}</span>
              <span
                className={cn(
                  'font-medium',
                  (() => {
                    if (quote.price_impact < 1) return 'text-green-600 dark:text-green-400'
                    if (quote.price_impact < 3) return 'text-amber-600 dark:text-amber-400'
                    return 'text-red-600 dark:text-red-400'
                  })()
                )}
              >
                {quote.price_impact.toFixed(2)}%
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500 dark:text-gray-400'>{t('swap.platformFee')}</span>
              <span className='text-gray-900 dark:text-white font-medium'>
                {quote.fee_percentage}% (~${quote.fee_usd.toFixed(2)})
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500 dark:text-gray-400'>{t('swap.networkFee')}</span>
              <span className='text-gray-900 dark:text-white font-medium'>
                ~${quote.gas_usd.toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700'>
              <span className='text-gray-500 dark:text-gray-400'>{t('swap.minimumReceived')}</span>
              <span className='text-gray-900 dark:text-white font-medium'>
                {quote.to_amount_min} {quote.to_token.symbol}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className='flex gap-3'>
            <button
              onClick={onClose}
              disabled={isLoading}
              className='flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className='flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2'
            >
              {isLoading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  {t('swap.processing')}
                </>
              ) : (
                <>
                  <CheckCircle2 className='w-5 h-5' />
                  {t('swap.confirmSwap')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Swap Status Card
const SwapStatusCard = ({ status, onClose }: { status: SwapStatus; onClose: () => void }) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copyTxHash = () => {
    if (status.tx_hash) {
      navigator.clipboard.writeText(status.tx_hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-gray-500',
      bg: 'bg-gray-100 dark:bg-gray-800',
      label: t('swap.statusPending'),
    },
    depositing: {
      icon: ArrowRight,
      color: 'text-blue-500',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      label: t('swap.statusDepositing'),
    },
    swapping: {
      icon: RefreshCw,
      color: 'text-purple-500',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      label: t('swap.statusSwapping'),
    },
    withdrawing: {
      icon: ArrowRight,
      color: 'text-amber-500',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      label: t('swap.statusWithdrawing'),
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
      label: t('swap.statusCompleted'),
    },
    failed: {
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-100 dark:bg-red-900/30',
      label: t('swap.statusFailed'),
    },
  }

  const config = statusConfig[status.status]
  const StatusIcon = config.icon

  return (
    <div
      className={cn('p-6 rounded-2xl border', config.bg, 'border-gray-200 dark:border-gray-700')}
    >
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div className={cn('p-3 rounded-xl', config.bg)}>
            <StatusIcon
              className={cn(
                'w-6 h-6',
                config.color,
                status.status === 'swapping' && 'animate-spin'
              )}
            />
          </div>
          <div>
            <p className='font-semibold text-gray-900 dark:text-white'>{config.label}</p>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              ID: {status.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        {(status.status === 'completed' || status.status === 'failed') && (
          <button
            onClick={onClose}
            aria-label='Close status'
            className='p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors'
          >
            <X className='w-5 h-5 text-gray-500' />
          </button>
        )}
      </div>

      {status.tx_hash && (
        <div className='flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-xl'>
          <span className='text-sm text-gray-500 dark:text-gray-400 truncate flex-1'>
            {status.tx_hash}
          </span>
          <button
            onClick={copyTxHash}
            aria-label='Copy transaction hash'
            className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
          >
            {copied ? (
              <Check className='w-4 h-4 text-green-500' />
            ) : (
              <Copy className='w-4 h-4 text-gray-400' />
            )}
          </button>
          <a
            href={`https://polygonscan.com/tx/${status.tx_hash}`}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='View on block explorer'
            className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
          >
            <ExternalLink className='w-4 h-4 text-gray-400' />
          </a>
        </div>
      )}

      {status.error && (
        <div className='mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl'>
          <p className='text-sm text-red-600 dark:text-red-400'>{status.error}</p>
        </div>
      )}
    </div>
  )
}

// Main Swap Page
export function SwapPage() {
  const { t } = useTranslation()

  // State
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(getDefaultNetwork())
  const [fromToken, setFromToken] = useState<Token | undefined>(() => getDefaultTokens(137)[0])
  const [toToken, setToToken] = useState<Token | undefined>(() => getDefaultTokens(137)[1])
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [tokens, setTokens] = useState<Token[]>(() => getDefaultTokens(137))
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [swapStatus, setSwapStatus] = useState<SwapStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isQuoteLoading, setIsQuoteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showFromTokenModal, setShowFromTokenModal] = useState(false)
  const [showToTokenModal, setShowToTokenModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Load tokens for selected network
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const response = await apiClient.get(`/swap/tokens/${selectedNetwork.id}`)
        if (response && typeof response === 'object' && 'tokens' in response) {
          setTokens((response as { tokens: Token[] }).tokens)
        }
      } catch {
        // Fallback to popular tokens
        setTokens(getDefaultTokens(selectedNetwork.id))
      }
    }
    loadTokens()

    // Reset tokens when network changes
    const networkTokens = getDefaultTokens(selectedNetwork.id)
    setFromToken(networkTokens[0])
    setToToken(networkTokens[1])
    setFromAmount('')
    setToAmount('')
    setQuote(null)
  }, [selectedNetwork.id])

  // Get quote when amount changes
  const getQuote = useCallback(async () => {
    if (!fromToken || !toToken || !fromAmount || Number.parseFloat(fromAmount) <= 0) {
      setQuote(null)
      setToAmount('')
      return
    }

    setIsQuoteLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<SwapQuote>('/swap/quote', {
        chain_id: selectedNetwork.id,
        from_token: fromToken.address,
        to_token: toToken.address,
        amount: fromAmount,
        slippage,
      })

      if (response.data) {
        setQuote(response.data)
        setToAmount(response.data.to_amount)
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { detail?: string } } }
      setError(apiError.response?.data?.detail ?? t('swap.quoteError'))
      setQuote(null)
      setToAmount('')
    } finally {
      setIsQuoteLoading(false)
    }
  }, [fromToken, toToken, fromAmount, selectedNetwork.id, slippage, t])

  // Debounced quote fetch
  useEffect(() => {
    const timer = setTimeout(getQuote, 500)
    return () => clearTimeout(timer)
  }, [getQuote])

  // Swap tokens positions
  const handleSwapTokens = () => {
    const tempToken = fromToken
    const tempAmount = fromAmount
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount(toAmount)
    setToAmount(tempAmount)
    setQuote(null)
  }

  // Execute swap
  const handleExecuteSwap = async () => {
    if (!quote) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<{ swap_id: string }>('/swap/execute', {
        quote_id: quote.quote_id,
      })

      setSwapStatus({
        id: response.data.swap_id,
        status: 'pending',
      })
      setShowConfirmation(false)

      // Poll for status updates
      pollSwapStatus(response.data.swap_id)
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { detail?: string } } }
      setError(apiError.response?.data?.detail ?? t('swap.executeError'))
    } finally {
      setIsLoading(false)
    }
  }

  // Poll swap status
  const pollSwapStatus = async (swapId: string) => {
    const poll = async () => {
      try {
        const response = await apiClient.get<SwapStatus>(`/swap/status/${swapId}`)
        setSwapStatus(response.data)

        if (response.data.status !== 'completed' && response.data.status !== 'failed') {
          setTimeout(poll, 3000)
        }
      } catch {
        // Continue polling
        setTimeout(poll, 3000)
      }
    }
    poll()
  }

  // Reset after swap
  const handleCloseStatus = () => {
    setSwapStatus(null)
    setQuote(null)
    setFromAmount('')
    setToAmount('')
  }

  return (
    <div className='min-h-screen pb-20 lg:pb-0'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'>
        <div>
          <div className='flex items-center gap-3 mb-1'>
            <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
              {t('swap.title')}
            </h1>
            <div className='flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 rounded-full'>
              <ArrowDownUp className='w-3.5 h-3.5 text-blue-500' />
              <span className='text-xs font-medium text-blue-700 dark:text-blue-400'>DEX</span>
            </div>
          </div>
          <p className='text-gray-500 dark:text-gray-400 text-sm'>{t('swap.subtitle')}</p>
        </div>

        {/* Network Selector */}
        <div className='flex items-center gap-2 flex-wrap'>
          {NETWORKS.slice(0, 4).map(network => (
            <button
              key={network.id}
              onClick={() => setSelectedNetwork(network)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                selectedNetwork.id === network.id
                  ? `bg-gradient-to-r ${network.color} text-white shadow-lg`
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <img src={network.icon} alt={network.name} className='w-5 h-5 rounded-full' />
              <span>{network.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className='grid lg:grid-cols-3 gap-6'>
        {/* Swap Card */}
        <div className='lg:col-span-2'>
          <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
            {/* Card Header */}
            <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-2'>
                <div className='p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl'>
                  <ArrowDownUp className='w-5 h-5 text-white' />
                </div>
                <div>
                  <h2 className='font-bold text-gray-900 dark:text-white'>
                    {t('swap.swapTokens')}
                  </h2>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>{t('swap.bestRates')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                aria-label='Open settings'
                className='p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors'
              >
                <Settings className='w-5 h-5 text-gray-500' />
              </button>
            </div>

            {/* Swap Form */}
            <div className='p-4 md:p-6 space-y-4'>
              {/* Show Status if swap in progress */}
              {swapStatus && <SwapStatusCard status={swapStatus} onClose={handleCloseStatus} />}

              {!swapStatus && (
                <>
                  {/* From Token */}
                  <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-xl'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-sm text-gray-500 dark:text-gray-400'>
                        {t('swap.youPay')}
                      </span>
                      {fromToken?.balance && (
                        <button
                          onClick={() => setFromAmount(fromToken.balance ?? '')}
                          className='text-xs text-blue-500 hover:text-blue-600 font-medium'
                        >
                          {t('swap.balance')}: {fromToken.balance}
                        </button>
                      )}
                    </div>
                    <div className='flex items-center gap-3'>
                      <button
                        onClick={() => setShowFromTokenModal(true)}
                        aria-label='Select from token'
                        className='flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors'
                      >
                        <div className='w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden'>
                          {fromToken?.logoURI ? (
                            <img
                              src={fromToken.logoURI}
                              alt={fromToken.symbol}
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <span className='text-xs font-bold'>
                              {fromToken?.symbol?.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <span className='font-semibold text-gray-900 dark:text-white'>
                          {fromToken?.symbol ?? t('swap.selectToken')}
                        </span>
                        <ChevronDown className='w-4 h-4 text-gray-400' />
                      </button>
                      <input
                        type='number'
                        value={fromAmount}
                        onChange={e => setFromAmount(e.target.value)}
                        placeholder='0.00'
                        className='flex-1 text-right text-2xl font-bold bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none'
                      />
                    </div>
                  </div>

                  {/* Swap Button */}
                  <div className='flex justify-center -my-2 relative z-10'>
                    <button
                      onClick={handleSwapTokens}
                      aria-label='Swap token positions'
                      className='p-3 bg-white dark:bg-gray-900 border-4 border-gray-50 dark:border-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl active:scale-95'
                    >
                      <ArrowDownUp className='w-5 h-5 text-blue-500' />
                    </button>
                  </div>

                  {/* To Token */}
                  <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-xl'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-sm text-gray-500 dark:text-gray-400'>
                        {t('swap.youReceive')}
                      </span>
                      {quote && (
                        <span className='text-xs text-gray-400'>
                          ~${((Number.parseFloat(toAmount) || 0) * 1).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-3'>
                      <button
                        onClick={() => setShowToTokenModal(true)}
                        aria-label='Select to token'
                        className='flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors'
                      >
                        <div className='w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden'>
                          {toToken?.logoURI ? (
                            <img
                              src={toToken.logoURI}
                              alt={toToken.symbol}
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <span className='text-xs font-bold'>
                              {toToken?.symbol?.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <span className='font-semibold text-gray-900 dark:text-white'>
                          {toToken?.symbol ?? t('swap.selectToken')}
                        </span>
                        <ChevronDown className='w-4 h-4 text-gray-400' />
                      </button>
                      <div className='flex-1 text-right'>
                        {isQuoteLoading ? (
                          <Loader2 className='w-6 h-6 text-blue-500 animate-spin ml-auto' />
                        ) : (
                          <input
                            type='text'
                            value={toAmount}
                            readOnly
                            placeholder='0.00'
                            className='w-full text-right text-2xl font-bold bg-transparent text-green-600 dark:text-green-400 placeholder:text-gray-400 focus:outline-none'
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quote Details */}
                  {quote && (
                    <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2'>
                      <div className='flex justify-between text-sm'>
                        <span className='text-gray-600 dark:text-gray-400'>{t('swap.rate')}</span>
                        <span className='text-gray-900 dark:text-white font-medium'>
                          1 {fromToken?.symbol} = {quote.exchange_rate.toFixed(6)} {toToken?.symbol}
                        </span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-gray-600 dark:text-gray-400'>
                          {t('swap.platformFee')}
                        </span>
                        <span className='text-gray-900 dark:text-white font-medium'>
                          {quote.fee_percentage}% (~${quote.fee_usd.toFixed(2)})
                        </span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-gray-600 dark:text-gray-400'>
                          {t('swap.estimatedGas')}
                        </span>
                        <span className='text-gray-900 dark:text-white font-medium'>
                          ~${quote.gas_usd.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className='flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl'>
                      <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0' />
                      <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
                    </div>
                  )}

                  {/* Swap Button */}
                  <button
                    onClick={() => setShowConfirmation(true)}
                    disabled={!quote || isLoading || isQuoteLoading}
                    className='w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99]'
                  >
                    {(() => {
                      if (isQuoteLoading) {
                        return (
                          <>
                            <Loader2 className='w-5 h-5 animate-spin' />
                            {t('swap.gettingQuote')}
                          </>
                        )
                      }
                      if (!fromToken || !toToken) {
                        return t('swap.selectTokens')
                      }
                      if (!fromAmount || !quote) {
                        return t('swap.enterAmount')
                      }
                      return (
                        <>
                          <ArrowDownUp className='w-5 h-5' />
                          {t('swap.swapNow')}
                        </>
                      )
                    })()}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Benefits & Info */}
        <div className='lg:col-span-1 space-y-6'>
          {/* Benefits Card */}
          <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <Zap className='w-5 h-5 text-blue-500' />
              {t('swap.whySwapHere')}
            </h3>
            <div className='space-y-4'>
              <div className='flex items-start gap-3'>
                <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-lg'>
                  <TrendingUp className='w-4 h-4 text-green-600 dark:text-green-400' />
                </div>
                <div>
                  <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                    {t('swap.benefitBestRates')}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {t('swap.benefitBestRatesDesc')}
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
                  <Shield className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                    {t('swap.benefitSecure')}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {t('swap.benefitSecureDesc')}
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-3'>
                <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg'>
                  <Fuel className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                </div>
                <div>
                  <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                    {t('swap.benefitLowFees')}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {t('swap.benefitLowFeesDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Link to Instant Trade */}
          <Link
            to='/instant-trade'
            className='block p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl hover:shadow-md transition-all group'
          >
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl'>
                <Wallet className='w-5 h-5 text-white' />
              </div>
              <div className='flex-1'>
                <p className='font-semibold text-gray-900 dark:text-white'>
                  {t('swap.buyWithFiat')}
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  {t('swap.buyWithFiatDesc')}
                </p>
              </div>
              <ChevronRight className='w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform' />
            </div>
          </Link>

          {/* Supported Networks */}
          <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='font-bold text-gray-900 dark:text-white mb-4'>
              {t('swap.supportedNetworks')}
            </h3>
            <div className='grid grid-cols-2 gap-2'>
              {NETWORKS.map(network => (
                <div
                  key={network.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg',
                    selectedNetwork.id === network.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-800'
                  )}
                >
                  <img
                    src={network.icon}
                    alt={network.name}
                    className='w-5 h-5'
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    {network.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TokenSelectorModal
        isOpen={showFromTokenModal}
        onClose={() => setShowFromTokenModal(false)}
        tokens={tokens}
        onSelect={setFromToken}
        selectedToken={fromToken}
        title={t('swap.selectFromToken')}
      />

      <TokenSelectorModal
        isOpen={showToTokenModal}
        onClose={() => setShowToTokenModal(false)}
        tokens={tokens.filter(tkn => tkn.address !== fromToken?.address)}
        onSelect={setToToken}
        selectedToken={toToken}
        title={t('swap.selectToToken')}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        slippage={slippage}
        setSlippage={setSlippage}
      />

      {quote && (
        <SwapConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleExecuteSwap}
          quote={quote}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

export default SwapPage
