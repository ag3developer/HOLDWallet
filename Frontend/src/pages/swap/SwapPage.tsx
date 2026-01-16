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
  logoURI?: string | undefined
  balance?: string | undefined
  balanceUSD?: number | undefined
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
  {
    id: 43114,
    name: 'Avalanche',
    icon: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    color: 'from-red-500 to-red-600',
  },
]

// Helper function to get token logo URI from CoinGecko
const getTokenLogoURI = (symbol: string): string => {
  const SYMBOL_TO_LOGO: Record<string, string> = {
    ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    WETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
    POL: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
    BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    DAI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
    WBTC: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    UNI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
    AAVE: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
    ARB: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    OP: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
    AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
    SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
    LTC: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
    TRX: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
    XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
    DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
    ATOM: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
    FTM: 'https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png',
    NEAR: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
    CRV: 'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
    MKR: 'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
    COMP: 'https://assets.coingecko.com/coins/images/10775/small/COMP.png',
    SNX: 'https://assets.coingecko.com/coins/images/3406/small/SNX.png',
    SUSHI: 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
    '1INCH': 'https://assets.coingecko.com/coins/images/13469/small/1inch-token.png',
    GRT: 'https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png',
    LDO: 'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
    APE: 'https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg',
    SAND: 'https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg',
    MANA: 'https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png',
  }

  return (
    SYMBOL_TO_LOGO[symbol.toUpperCase()] ||
    'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
  )
}

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
  43114: [
    {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      symbol: 'AVAX',
      name: 'Avalanche',
      decimals: 18,
      logoURI:
        'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    },
    {
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    {
      address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    {
      address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
      symbol: 'WETH.e',
      name: 'Wrapped Ether',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
  ],
}

const getDefaultNetwork = (): Network => NETWORKS[0]!
const getDefaultTokens = (chainId: number): Token[] => POPULAR_TOKENS[chainId] ?? []

// Token Selector Modal - Mobile Optimized
const TokenSelectorModal = ({
  isOpen,
  onClose,
  tokens,
  onSelect,
  selectedToken,
  title,
  showBalances = false,
  emptyMessage,
}: {
  isOpen: boolean
  onClose: () => void
  tokens: Token[]
  onSelect: (token: Token) => void
  selectedToken: Token | undefined
  title: string
  showBalances?: boolean
  emptyMessage?: string
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
    <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center'>
      <button
        type='button'
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
        aria-label='Close token selector'
      />
      {/* Mobile: Full width bottom sheet, Desktop: Centered modal */}
      <div className='relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[85vh] sm:max-h-[80vh] flex flex-col safe-area-bottom'>
        {/* Drag Handle - Mobile only */}
        <div className='flex justify-center pt-3 pb-1 sm:hidden'>
          <div className='w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full' />
        </div>

        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>{title}</h3>
          <button
            onClick={onClose}
            aria-label='Close'
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-manipulation'
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
              className='w-full pl-10 pr-4 py-3.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base'
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              spellCheck='false'
            />
          </div>
        </div>

        {/* Token List - Scrollable */}
        <div className='flex-1 overflow-y-auto overscroll-contain'>
          {filteredTokens.length === 0 ? (
            <div className='p-8 text-center'>
              <Wallet className='w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3' />
              <p className='text-gray-500 dark:text-gray-400'>
                {emptyMessage || t('swap.noTokensFound')}
              </p>
              {showBalances && (
                <p className='text-sm text-gray-400 dark:text-gray-500 mt-2'>
                  {t('swap.depositTokensHint')}
                </p>
              )}
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
                    'w-full flex items-center gap-3 p-3.5 rounded-xl transition-colors touch-manipulation active:scale-[0.98]',
                    selectedToken?.address === token.address
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                  )}
                >
                  <div className='w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0'>
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
                  <div className='flex-1 text-left min-w-0'>
                    <p className='font-semibold text-gray-900 dark:text-white truncate'>
                      {token.symbol}
                    </p>
                    <p className='text-sm text-gray-500 dark:text-gray-400 truncate'>
                      {token.name}
                    </p>
                  </div>
                  {token.balance && (
                    <div className='text-right flex-shrink-0'>
                      <p className='font-medium text-gray-900 dark:text-white'>{token.balance}</p>
                      {token.balanceUSD !== undefined && (
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                          ${token.balanceUSD.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedToken?.address === token.address && (
                    <CheckCircle2 className='w-5 h-5 text-blue-500 flex-shrink-0' />
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

// Settings Modal - Mobile Optimized
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
    <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center'>
      <button
        type='button'
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
        aria-label='Close settings'
      />
      <div className='relative w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 safe-area-bottom'>
        {/* Drag Handle - Mobile only */}
        <div className='flex justify-center -mt-3 mb-4 sm:hidden'>
          <div className='w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full' />
        </div>

        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            {t('swap.settings')}
          </h3>
          <button
            onClick={onClose}
            aria-label='Close'
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-manipulation'
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
                <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none'>
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
                    'flex-1 py-3 rounded-xl font-medium text-sm transition-all touch-manipulation active:scale-[0.97]',
                    slippage === option && !customSlippage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600'
                  )}
                >
                  {option}%
                </button>
              ))}
              <div className='flex-1 relative'>
                <input
                  type='number'
                  inputMode='decimal'
                  value={customSlippage}
                  onChange={e => {
                    setCustomSlippage(e.target.value)
                    if (e.target.value) {
                      setSlippage(Number.parseFloat(e.target.value))
                    }
                  }}
                  placeholder={t('swap.custom')}
                  className='w-full py-3 px-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
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

// Swap Confirmation Modal - Mobile Optimized
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
    <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center'>
      <button
        type='button'
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
        aria-label='Close confirmation'
      />
      <div className='relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col safe-area-bottom'>
        {/* Drag Handle - Mobile only */}
        <div className='flex justify-center pt-3 pb-1 sm:hidden'>
          <div className='w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full' />
        </div>

        <div className='p-5 sm:p-6 overflow-y-auto'>
          <h3 className='text-xl font-bold text-gray-900 dark:text-white text-center mb-5'>
            {t('swap.confirmSwap')}
          </h3>

          {/* Token Flow */}
          <div className='space-y-3 mb-5'>
            {/* From */}
            <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0'>
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
                <div className='min-w-0'>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>{t('swap.youPay')}</p>
                  <p className='font-semibold text-gray-900 dark:text-white truncate'>
                    {quote.from_token.symbol}
                  </p>
                </div>
              </div>
              <p className='text-lg sm:text-xl font-bold text-gray-900 dark:text-white'>
                {quote.from_amount}
              </p>
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
                <div className='w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0'>
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
                <div className='min-w-0'>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>{t('swap.youReceive')}</p>
                  <p className='font-semibold text-gray-900 dark:text-white truncate'>
                    {quote.to_token.symbol}
                  </p>
                </div>
              </div>
              <p className='text-lg sm:text-xl font-bold text-green-600 dark:text-green-400'>
                {quote.to_amount}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className='space-y-2.5 mb-5 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm'>
            <div className='flex justify-between'>
              <span className='text-gray-500 dark:text-gray-400'>{t('swap.exchangeRate')}</span>
              <span className='text-gray-900 dark:text-white font-medium text-right'>
                1 {quote.from_token.symbol} = {quote.exchange_rate.toFixed(6)}{' '}
                {quote.to_token.symbol}
              </span>
            </div>
            <div className='flex justify-between'>
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
            <div className='flex justify-between'>
              <span className='text-gray-500 dark:text-gray-400'>{t('swap.platformFee')}</span>
              <span className='text-gray-900 dark:text-white font-medium'>
                {quote.fee_percentage}% (~${quote.fee_usd.toFixed(2)})
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500 dark:text-gray-400'>{t('swap.networkFee')}</span>
              <span className='text-gray-900 dark:text-white font-medium'>
                ~${quote.gas_usd.toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700'>
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
              className='flex-1 py-3.5 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 transition-colors disabled:opacity-50 touch-manipulation'
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className='flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98]'
            >
              {isLoading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  <span className='hidden sm:inline'>{t('swap.processing')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className='w-5 h-5' />
                  <span>{t('swap.confirmSwap')}</span>
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
  const [availableTokens, setAvailableTokens] = useState<Token[]>(() => getDefaultTokens(137))
  const [userTokens, setUserTokens] = useState<Token[]>([])
  const [loadingBalances, setLoadingBalances] = useState(false)
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

  // Load user token balances (tokens the user owns)
  useEffect(() => {
    const loadUserBalances = async () => {
      setLoadingBalances(true)
      try {
        const response = await apiClient.get(`/swap/user-balances/${selectedNetwork.id}`)
        if (response && typeof response === 'object' && 'tokens' in response) {
          const balanceTokens = (
            response as {
              tokens: Array<{
                address: string
                symbol: string
                name: string
                decimals: number
                balance: string
                balance_formatted: string
                balance_usd: string
                price_usd: string
                logo_url: string
              }>
            }
          ).tokens.map(tkn => ({
            address: tkn.address,
            symbol: tkn.symbol,
            name: tkn.name,
            decimals: tkn.decimals,
            logoURI: tkn.logo_url || undefined,
            balance: tkn.balance_formatted,
            balanceUSD: Number.parseFloat(tkn.balance_usd),
          }))
          setUserTokens(balanceTokens)

          // Set default from token (first user token with balance)
          if (balanceTokens.length > 0) {
            setFromToken(balanceTokens[0])
          }
        }
      } catch {
        // User may not have any tokens
        setUserTokens([])
      } finally {
        setLoadingBalances(false)
      }
    }
    loadUserBalances()
  }, [selectedNetwork.id])

  // Load available tokens from DEX aggregators (all supported tokens)
  useEffect(() => {
    const loadAvailableTokens = async () => {
      try {
        const response = await apiClient.get(`/swap/tokens/${selectedNetwork.id}`)
        if (response && typeof response === 'object' && 'tokens' in response) {
          const supportedTokens = (response as { tokens: Token[] }).tokens.map(tkn => ({
            ...tkn,
            logoURI: getTokenLogoURI(tkn.symbol),
          }))
          setAvailableTokens(supportedTokens)

          // Set default to token (second token, or first if only one)
          if (supportedTokens.length > 1) {
            setToToken(supportedTokens[1])
          } else if (supportedTokens.length === 1) {
            setToToken(supportedTokens[0])
          }
        }
      } catch {
        // Fallback to popular tokens
        setAvailableTokens(getDefaultTokens(selectedNetwork.id))
      }
    }
    loadAvailableTokens()

    // Reset state when network changes
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
    <div className='min-h-screen pb-24 sm:pb-20 lg:pb-0 px-4 sm:px-0'>
      {/* Header - Responsive */}
      <div className='flex flex-col gap-4 mb-5 sm:mb-6'>
        <div>
          <div className='flex items-center gap-2 sm:gap-3 mb-1'>
            <h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
              {t('swap.title')}
            </h1>
            <div className='flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800 rounded-full'>
              <ArrowDownUp className='w-3 sm:w-3.5 h-3 sm:h-3.5 text-blue-500' />
              <span className='text-xs font-medium text-blue-700 dark:text-blue-400'>DEX</span>
            </div>
          </div>
          <p className='text-gray-500 dark:text-gray-400 text-xs sm:text-sm'>
            {t('swap.subtitle')}
          </p>
        </div>

        {/* Network Selector - Horizontal scroll on mobile */}
        <div className='flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide'>
          {NETWORKS.map(network => (
            <button
              key={network.id}
              onClick={() => setSelectedNetwork(network)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex-shrink-0 touch-manipulation active:scale-[0.97]',
                selectedNetwork.id === network.id
                  ? `bg-gradient-to-r ${network.color} text-white shadow-lg`
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 active:bg-gray-100 dark:active:bg-gray-700'
              )}
            >
              <img
                src={network.icon}
                alt={network.name}
                className='w-4 sm:w-5 h-4 sm:h-5 rounded-full'
              />
              <span>{network.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Stack on mobile, grid on desktop */}
      <div className='grid lg:grid-cols-3 gap-4 sm:gap-6'>
        {/* Swap Card */}
        <div className='lg:col-span-2'>
          <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
            {/* Card Header */}
            <div className='flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-2 sm:gap-3'>
                <div className='p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl'>
                  <ArrowDownUp className='w-4 sm:w-5 h-4 sm:h-5 text-white' />
                </div>
                <div>
                  <h2 className='font-bold text-sm sm:text-base text-gray-900 dark:text-white'>
                    {t('swap.swapTokens')}
                  </h2>
                  <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:block'>
                    {t('swap.bestRates')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                aria-label='Open settings'
                className='p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 rounded-lg sm:rounded-xl transition-colors touch-manipulation'
              >
                <Settings className='w-4 sm:w-5 h-4 sm:h-5 text-gray-500' />
              </button>
            </div>

            {/* Swap Form */}
            <div className='p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4'>
              {/* Show Status if swap in progress */}
              {swapStatus && <SwapStatusCard status={swapStatus} onClose={handleCloseStatus} />}

              {!swapStatus && (
                <>
                  {/* From Token */}
                  <div className='p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-xl'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
                        {t('swap.youPay')}
                      </span>
                      {fromToken?.balance && (
                        <button
                          onClick={() => setFromAmount(fromToken.balance ?? '')}
                          className='text-[10px] sm:text-xs text-blue-500 hover:text-blue-600 active:text-blue-700 font-medium touch-manipulation'
                        >
                          {t('swap.balance')}: {fromToken.balance}
                        </button>
                      )}
                    </div>
                    <div className='flex items-center gap-2 sm:gap-3'>
                      <button
                        onClick={() => setShowFromTokenModal(true)}
                        aria-label='Select from token'
                        className='flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:border-gray-300 dark:hover:border-gray-600 active:bg-gray-50 dark:active:bg-gray-800 transition-colors touch-manipulation flex-shrink-0'
                      >
                        <div className='w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden'>
                          {fromToken?.logoURI ? (
                            <img
                              src={fromToken.logoURI}
                              alt={fromToken.symbol}
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <span className='text-[10px] sm:text-xs font-bold'>
                              {fromToken?.symbol?.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <span className='font-semibold text-xs sm:text-sm text-gray-900 dark:text-white'>
                          {fromToken?.symbol ?? t('swap.selectToken')}
                        </span>
                        <ChevronDown className='w-3 sm:w-4 h-3 sm:h-4 text-gray-400' />
                      </button>
                      <input
                        type='number'
                        inputMode='decimal'
                        value={fromAmount}
                        onChange={e => setFromAmount(e.target.value)}
                        placeholder='0.00'
                        className='flex-1 min-w-0 text-right text-lg sm:text-2xl font-bold bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none'
                      />
                    </div>
                  </div>

                  {/* Swap Button */}
                  <div className='flex justify-center -my-1.5 sm:-my-2 relative z-10'>
                    <button
                      onClick={handleSwapTokens}
                      aria-label='Swap token positions'
                      className='p-2 sm:p-3 bg-white dark:bg-gray-900 border-4 border-gray-50 dark:border-gray-800 rounded-lg sm:rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors shadow-lg hover:shadow-xl active:scale-95 touch-manipulation'
                    >
                      <ArrowDownUp className='w-4 sm:w-5 h-4 sm:h-5 text-blue-500' />
                    </button>
                  </div>

                  {/* To Token */}
                  <div className='p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-xl'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-xs sm:text-sm text-gray-500 dark:text-gray-400'>
                        {t('swap.youReceive')}
                      </span>
                      {quote && (
                        <span className='text-[10px] sm:text-xs text-gray-400'>
                          ~${((Number.parseFloat(toAmount) || 0) * 1).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-2 sm:gap-3'>
                      <button
                        onClick={() => setShowToTokenModal(true)}
                        aria-label='Select to token'
                        className='flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl hover:border-gray-300 dark:hover:border-gray-600 active:bg-gray-50 dark:active:bg-gray-800 transition-colors touch-manipulation flex-shrink-0'
                      >
                        <div className='w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden'>
                          {toToken?.logoURI ? (
                            <img
                              src={toToken.logoURI}
                              alt={toToken.symbol}
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <span className='text-[10px] sm:text-xs font-bold'>
                              {toToken?.symbol?.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <span className='font-semibold text-xs sm:text-sm text-gray-900 dark:text-white'>
                          {toToken?.symbol ?? t('swap.selectToken')}
                        </span>
                        <ChevronDown className='w-3 sm:w-4 h-3 sm:h-4 text-gray-400' />
                      </button>
                      <div className='flex-1 min-w-0 text-right'>
                        {isQuoteLoading ? (
                          <Loader2 className='w-5 sm:w-6 h-5 sm:h-6 text-blue-500 animate-spin ml-auto' />
                        ) : (
                          <input
                            type='text'
                            value={toAmount}
                            readOnly
                            placeholder='0.00'
                            className='w-full text-right text-lg sm:text-2xl font-bold bg-transparent text-green-600 dark:text-green-400 placeholder:text-gray-400 focus:outline-none'
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quote Details */}
                  {quote && (
                    <div className='p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1.5 sm:space-y-2 text-xs sm:text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-gray-600 dark:text-gray-400'>{t('swap.rate')}</span>
                        <span className='text-gray-900 dark:text-white font-medium text-right'>
                          1 {fromToken?.symbol} = {quote.exchange_rate.toFixed(6)} {toToken?.symbol}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600 dark:text-gray-400'>
                          {t('swap.platformFee')}
                        </span>
                        <span className='text-gray-900 dark:text-white font-medium'>
                          {quote.fee_percentage}% (~${quote.fee_usd.toFixed(2)})
                        </span>
                      </div>
                      <div className='flex justify-between'>
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
                    <div className='flex items-start gap-2 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl'>
                      <AlertCircle className='w-4 sm:w-5 h-4 sm:h-5 text-red-500 flex-shrink-0 mt-0.5' />
                      <p className='text-xs sm:text-sm text-red-600 dark:text-red-400'>{error}</p>
                    </div>
                  )}

                  {/* Swap Button */}
                  <button
                    onClick={() => setShowConfirmation(true)}
                    disabled={!quote || isLoading || isQuoteLoading}
                    className='w-full py-3.5 sm:py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-sm sm:text-base rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99] touch-manipulation'
                  >
                    {(() => {
                      if (isQuoteLoading) {
                        return (
                          <>
                            <Loader2 className='w-4 sm:w-5 h-4 sm:h-5 animate-spin' />
                            <span>{t('swap.gettingQuote')}</span>
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
                          <ArrowDownUp className='w-4 sm:w-5 h-4 sm:h-5' />
                          <span>{t('swap.swapNow')}</span>
                        </>
                      )
                    })()}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Benefits & Info (hidden on mobile, shown below swap card as compact cards) */}
        <div className='lg:col-span-1 space-y-4 sm:space-y-6'>
          {/* Benefits Card */}
          <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6'>
            <h3 className='font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2'>
              <Zap className='w-4 sm:w-5 h-4 sm:h-5 text-blue-500' />
              {t('swap.whySwapHere')}
            </h3>
            <div className='space-y-3 sm:space-y-4'>
              <div className='flex items-start gap-2 sm:gap-3'>
                <div className='p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0'>
                  <TrendingUp className='w-3.5 sm:w-4 h-3.5 sm:h-4 text-green-600 dark:text-green-400' />
                </div>
                <div className='min-w-0'>
                  <p className='font-semibold text-xs sm:text-sm text-gray-900 dark:text-white'>
                    {t('swap.benefitBestRates')}
                  </p>
                  <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2'>
                    {t('swap.benefitBestRatesDesc')}
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-2 sm:gap-3'>
                <div className='p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0'>
                  <Shield className='w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-600 dark:text-blue-400' />
                </div>
                <div className='min-w-0'>
                  <p className='font-semibold text-xs sm:text-sm text-gray-900 dark:text-white'>
                    {t('swap.benefitSecure')}
                  </p>
                  <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2'>
                    {t('swap.benefitSecureDesc')}
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-2 sm:gap-3'>
                <div className='p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0'>
                  <Fuel className='w-3.5 sm:w-4 h-3.5 sm:h-4 text-purple-600 dark:text-purple-400' />
                </div>
                <div className='min-w-0'>
                  <p className='font-semibold text-xs sm:text-sm text-gray-900 dark:text-white'>
                    {t('swap.benefitLowFees')}
                  </p>
                  <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2'>
                    {t('swap.benefitLowFeesDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Link to Instant Trade */}
          <Link
            to='/instant-trade'
            className='block p-3 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl hover:shadow-md active:scale-[0.99] transition-all group touch-manipulation'
          >
            <div className='flex items-center gap-2 sm:gap-3'>
              <div className='p-1.5 sm:p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg sm:rounded-xl flex-shrink-0'>
                <Wallet className='w-4 sm:w-5 h-4 sm:h-5 text-white' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='font-semibold text-xs sm:text-sm text-gray-900 dark:text-white'>
                  {t('swap.buyWithFiat')}
                </p>
                <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate'>
                  {t('swap.buyWithFiatDesc')}
                </p>
              </div>
              <ChevronRight className='w-4 sm:w-5 h-4 sm:h-5 text-gray-400 group-hover:translate-x-1 transition-transform flex-shrink-0' />
            </div>
          </Link>

          {/* Supported Networks - Compact on mobile */}
          <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6'>
            <h3 className='font-bold text-sm sm:text-base text-gray-900 dark:text-white mb-3 sm:mb-4'>
              {t('swap.supportedNetworks')}
            </h3>
            <div className='grid grid-cols-3 sm:grid-cols-2 gap-1.5 sm:gap-2'>
              {NETWORKS.map(network => (
                <div
                  key={network.id}
                  className={cn(
                    'flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg',
                    selectedNetwork.id === network.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-800'
                  )}
                >
                  <img
                    src={network.icon}
                    alt={network.name}
                    className='w-4 sm:w-5 h-4 sm:h-5'
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <span className='text-[10px] sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate'>
                    {network.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* FROM Token: Show only user's tokens with balance */}
      <TokenSelectorModal
        isOpen={showFromTokenModal}
        onClose={() => setShowFromTokenModal(false)}
        tokens={userTokens}
        onSelect={setFromToken}
        selectedToken={fromToken}
        title={t('swap.selectFromToken')}
        showBalances
        emptyMessage={loadingBalances ? t('swap.loadingBalances') : t('swap.noTokensInWallet')}
      />

      {/* TO Token: Show all available tokens from DEX aggregators */}
      <TokenSelectorModal
        isOpen={showToTokenModal}
        onClose={() => setShowToTokenModal(false)}
        tokens={availableTokens.filter(
          (tkn: Token) => tkn.address.toLowerCase() !== fromToken?.address.toLowerCase()
        )}
        onSelect={setToToken}
        selectedToken={toToken}
        title={t('swap.selectToToken')}
        emptyMessage={t('swap.noTokensAvailable')}
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
