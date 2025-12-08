import React, { useRef, useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import baseLogo from '@/assets/crypto-icons/base.png'

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
  getCurrencySymbol: (currency: string) => string
  getCurrencyLocale: (currency: string) => string
  convertFromBRL: (amount: number) => number
}

// Crypto logos from CoinGecko (free CDN) + local assets
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1696504745',
  BNB: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
  TRX: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png?1696502193',
  BASE: baseLogo,
  USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png?1696501661',
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
  getCurrencySymbol,
  getCurrencyLocale,
  convertFromBRL,
}: Readonly<MarketPricesCarouselProps>) {
  const { currency } = useCurrencyStore()
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

  const safeConvertFromBRL = (value: number): number => {
    if (value === null || value === undefined || typeof value !== 'number') {
      return 0
    }
    if (Number.isNaN(value)) {
      return 0
    }
    const converted = convertFromBRL(value)
    const result = typeof converted === 'number' && !Number.isNaN(converted) ? converted : value
    return Number.isFinite(result) ? result : 0
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-3'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Market Prices</h2>
        <div className='flex gap-2'>
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            title='Scroll left'
            className='p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            <ChevronLeft className='w-5 h-5' />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            title='Scroll right'
            className='p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            <ChevronRight className='w-5 h-5' />
          </button>
        </div>
      </div>
      <div ref={carouselRef} className='flex gap-3 overflow-x-auto scrollbar-hide'>
        {cryptoPrices.map(crypto => {
          const isPositive = crypto.change24h >= 0
          return (
            <button
              key={crypto.symbol}
              onClick={() => onSelectSymbol(crypto.symbol)}
              className={`flex-shrink-0 w-44 text-left bg-white dark:bg-gray-800 rounded-lg shadow p-2.5 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                selectedSymbol === crypto.symbol ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              <div className='flex items-start justify-between mb-1.5'>
                <div className='flex items-center gap-2 flex-1'>
                  {/* Crypto Logo */}
                  <div className='flex-shrink-0'>
                    <img
                      src={CRYPTO_LOGOS[crypto.symbol] || ''}
                      alt={crypto.symbol}
                      className='w-7 h-7 rounded-full'
                      onError={e => {
                        // Fallback if image fails to load
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                  <div>
                    <p className='font-bold text-gray-900 dark:text-white text-sm'>
                      {crypto.symbol}
                    </p>
                    <p className='text-xs text-gray-600 dark:text-gray-400 leading-tight'>
                      {crypto.name}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
                    isPositive
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className='w-2.5 h-2.5' />
                  ) : (
                    <TrendingDown className='w-2.5 h-2.5' />
                  )}
                  <span className='text-xs'>{Math.abs(crypto.change24h).toFixed(1)}%</span>
                </div>
              </div>

              <p className='text-base font-bold text-gray-900 dark:text-white mb-1 leading-tight'>
                {getCurrencySymbol(currency)}{' '}
                {safeConvertFromBRL(crypto.price).toLocaleString(getCurrencyLocale(currency), {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                })}
              </p>

              <div className='grid grid-cols-2 gap-1 pt-1 border-t border-gray-200 dark:border-gray-700 text-xs'>
                <div>
                  <p className='text-gray-600 dark:text-gray-400 text-xs leading-tight'>H</p>
                  <p className='font-medium text-gray-900 dark:text-white text-xs'>
                    {getCurrencySymbol(currency)}{' '}
                    {safeConvertFromBRL(crypto.high24h).toLocaleString(
                      getCurrencyLocale(currency),
                      {
                        maximumFractionDigits: 0,
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className='text-gray-600 dark:text-gray-400 text-xs leading-tight'>L</p>
                  <p className='font-medium text-gray-900 dark:text-white text-xs'>
                    {getCurrencySymbol(currency)}{' '}
                    {safeConvertFromBRL(crypto.low24h).toLocaleString(getCurrencyLocale(currency), {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
