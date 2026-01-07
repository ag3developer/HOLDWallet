import React, { useRef, useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Sparkles,
} from 'lucide-react'
import { useCurrencyStore } from '@/stores/useCurrencyStore'

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
  high24h: number
  low24h: number
}

interface MarketPricesCarouselProps {
  cryptoPrices: CryptoPrice[]
  selectedSymbol: string
  onSelectSymbol: (symbol: string) => void
}

// Crypto logos from CoinGecko (free CDN)
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1696504745',
  BNB: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
  TRX: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png?1696502193',
  BASE: 'https://assets.coingecko.com/coins/images/30617/large/base.jpg?1696519330',
  USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
  USDC: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png?1696506055',
  DAI: 'https://assets.coingecko.com/coins/images/9956/large/4943.png?1696510096',
  SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
  LTC: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png?1696501400',
  DOGE: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png?1696501400',
  ADA: 'https://assets.coingecko.com/coins/images/975/large/cardano.png?1696502090',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png?1696512369',
  DOT: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png?1696512008',
  LINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png?1696502009',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png?1622619446',
  XRP: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442',
}

export function MarketPricesCarousel({
  cryptoPrices,
  selectedSymbol,
  onSelectSymbol,
}: Readonly<MarketPricesCarouselProps>) {
  const { formatCurrency } = useCurrencyStore()
  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    const checkScroll = () => {
      if (carouselRef.current) {
        setCanScrollLeft(carouselRef.current.scrollLeft > 0)
        setCanScrollRight(
          carouselRef.current.scrollLeft <
            carouselRef.current.scrollWidth - carouselRef.current.clientWidth
        )
      }
    }

    const element = carouselRef.current
    element?.addEventListener('scroll', checkScroll)
    checkScroll()
    return () => element?.removeEventListener('scroll', checkScroll)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 300
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-5'>
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div className='p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg'>
            <Activity className='w-5 h-5 text-white' />
          </div>
          <div>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white'>Market Prices</h2>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Live cryptocurrency rates</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <span className='hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium'>
            <span className='w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse' />
            Live
          </span>
          <div className='flex gap-1'>
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft || cryptoPrices.length === 0}
              title='Scroll left'
              className='p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight || cryptoPrices.length === 0}
              title='Scroll right'
              className='p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Show loading state or carousel */}
      {cryptoPrices.length === 0 ? (
        <div className='flex gap-4 overflow-x-auto scrollbar-hide pb-2'>
          {/* Loading skeleton - mostrar 5 cards vazios */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`skeleton-${String(i)}`}
              className='flex-shrink-0 w-52 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-4 animate-pulse'
            >
              <div className='flex items-center gap-3 mb-3'>
                <div className='w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl' />
                <div className='flex-1'>
                  <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded w-16 mb-1.5' />
                  <div className='h-3 bg-gray-300 dark:bg-gray-600 rounded w-20' />
                </div>
              </div>
              <div className='h-6 bg-gray-300 dark:bg-gray-600 rounded w-28 mb-3' />
              <div className='flex gap-4'>
                <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded w-16' />
                <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded w-16' />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div ref={carouselRef} className='flex gap-4 overflow-x-auto scrollbar-hide pb-2'>
          {cryptoPrices.map((crypto, index) => {
            const isPositive = crypto.change24h >= 0
            const isSelected = selectedSymbol === crypto.symbol
            const isTopGainer = index === 0 && crypto.change24h > 2

            return (
              <button
                key={crypto.symbol}
                onClick={() => onSelectSymbol(crypto.symbol)}
                className={`relative flex-shrink-0 w-52 text-left rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] group ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-xl shadow-blue-500/25'
                    : 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 hover:shadow-lg border border-gray-100 dark:border-gray-600'
                }`}
              >
                {/* Top Gainer Badge */}
                {isTopGainer && !isSelected && (
                  <div className='absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-lg'>
                    <Sparkles className='w-3 h-3' />
                    TOP
                  </div>
                )}

                {/* Header com logo e change */}
                <div className='flex items-start justify-between mb-3'>
                  <div className='flex items-center gap-3'>
                    {/* Crypto Logo */}
                    <div
                      className={`flex-shrink-0 p-1 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-600'}`}
                    >
                      <img
                        src={CRYPTO_LOGOS[crypto.symbol] || ''}
                        alt={crypto.symbol}
                        className='w-9 h-9 rounded-lg'
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                    <div>
                      <p
                        className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                      >
                        {crypto.symbol}
                      </p>
                      <p
                        className={`text-xs leading-tight ${isSelected ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        {crypto.name}
                      </p>
                    </div>
                  </div>

                  {/* Change Badge */}
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                      isSelected
                        ? isPositive
                          ? 'bg-green-400/30 text-green-100'
                          : 'bg-red-400/30 text-red-100'
                        : isPositive
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className='w-3 h-3' />
                    ) : (
                      <TrendingDown className='w-3 h-3' />
                    )}
                    <span>{Math.abs(crypto.change24h).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Price */}
                <p
                  className={`text-xl font-bold mb-3 ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                >
                  {formatCurrency(crypto.price)}
                </p>

                {/* High/Low */}
                <div
                  className={`grid grid-cols-2 gap-3 pt-3 border-t ${isSelected ? 'border-white/20' : 'border-gray-200 dark:border-gray-600'}`}
                >
                  <div>
                    <p
                      className={`text-[10px] uppercase tracking-wider mb-0.5 ${isSelected ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      High 24h
                    </p>
                    <p
                      className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                    >
                      {crypto.high24h > 0 ? (
                        formatCurrency(crypto.high24h)
                      ) : (
                        <span className='opacity-50'>—</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p
                      className={`text-[10px] uppercase tracking-wider mb-0.5 ${isSelected ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      Low 24h
                    </p>
                    <p
                      className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                    >
                      {crypto.low24h > 0 ? (
                        formatCurrency(crypto.low24h)
                      ) : (
                        <span className='opacity-50'>—</span>
                      )}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
