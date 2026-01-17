import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Search,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  X,
  Star,
  Coins,
  DollarSign,
} from 'lucide-react'
import trayLogo from '@/assets/crypto-icons/tray.png'

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
  high24h: number
  low24h: number
}

interface CryptoSelectorProps {
  readonly cryptoPrices: readonly CryptoPrice[]
  readonly selectedSymbol: string
  readonly onSymbolChange: (symbol: string) => void
  readonly balance?: number
}

// Crypto logos from CoinGecko (free CDN)
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
  TRX: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',
  BASE: 'https://assets.coingecko.com/coins/images/30617/large/base.jpg',
  USDT: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
  LTC: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
  DAI: 'https://assets.coingecko.com/coins/images/9956/large/4943.png',
  TRAY: trayLogo,
}

// Categorias de moedas
const STABLECOINS = new Set(['USDT', 'USDC', 'DAI', 'BUSD'])
const TOP_CRYPTOS = new Set(['BTC', 'ETH', 'SOL', 'BNB'])

export function CryptoSelector({
  cryptoPrices,
  selectedSymbol,
  onSymbolChange,
  balance = 0,
}: CryptoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'popular' | 'stablecoins'>('all')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Update dropdown position when opened
  const updateDropdownPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap
        left: rect.left,
        width: rect.width,
      })
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Update position when dropdown opens and on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition()

      // Update on scroll and resize
      const handleUpdate = () => updateDropdownPosition()
      window.addEventListener('scroll', handleUpdate, true)
      window.addEventListener('resize', handleUpdate)

      return () => {
        window.removeEventListener('scroll', handleUpdate, true)
        window.removeEventListener('resize', handleUpdate)
      }
    }
  }, [isOpen, updateDropdownPosition])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  // Get selected crypto info
  const selectedCrypto = useMemo(() => {
    return cryptoPrices.find(c => c.symbol === selectedSymbol)
  }, [cryptoPrices, selectedSymbol])

  // Filter and categorize cryptos
  const filteredCryptos = useMemo(() => {
    // Debug: log incoming data
    console.log('[CryptoSelector] cryptoPrices:', cryptoPrices?.length || 0, 'items')

    if (!cryptoPrices || cryptoPrices.length === 0) {
      return []
    }

    let filtered = [...cryptoPrices]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        c => c.symbol.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (activeCategory === 'stablecoins') {
      filtered = filtered.filter(c => STABLECOINS.has(c.symbol))
    } else if (activeCategory === 'popular') {
      filtered = filtered.filter(c => TOP_CRYPTOS.has(c.symbol))
    }

    return filtered
  }, [cryptoPrices, searchQuery, activeCategory])

  // Format price for display
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    if (price >= 1) {
      return price.toFixed(2)
    }
    if (price >= 0.01) {
      return price.toFixed(4)
    }
    return price.toFixed(6)
  }

  // Format change percentage
  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  const handleSelect = (symbol: string) => {
    onSymbolChange(symbol)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Dropdown content rendered via portal
  const dropdownContent = isOpen ? (
    <>
      {/* Backdrop */}
      <button
        type='button'
        aria-label='Fechar seletor'
        className='fixed inset-0 bg-black/20 z-[9998] cursor-default'
        onClick={() => setIsOpen(false)}
      />

      {/* Dropdown Panel - Fixed position via portal */}
      <div
        ref={dropdownRef}
        className='fixed z-[9999] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          maxHeight: 'min(480px, calc(100vh - 100px))',
        }}
      >
        {/* Search Bar */}
        <div className='p-4 border-b border-gray-100 dark:border-gray-700'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              ref={searchInputRef}
              type='text'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Buscar moeda...'
              className='w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
            />
            {searchQuery && (
              <button
                type='button'
                title='Limpar busca'
                onClick={() => setSearchQuery('')}
                className='absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
              >
                <X className='w-4 h-4 text-gray-400' />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className='px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex gap-1.5 overflow-x-auto'>
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className='flex items-center justify-center gap-1'>
              <Coins className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
              <span>Todas</span>
            </span>
          </button>
          <button
            onClick={() => setActiveCategory('popular')}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeCategory === 'popular'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className='flex items-center justify-center gap-1'>
              <Star className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
              <span>Popular</span>
            </span>
          </button>
          <button
            onClick={() => setActiveCategory('stablecoins')}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeCategory === 'stablecoins'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className='flex items-center justify-center gap-1'>
              <DollarSign className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
              <span>Stables</span>
            </span>
          </button>
        </div>

        {/* Crypto List */}
        <div className='overflow-y-auto' style={{ maxHeight: '320px' }}>
          {filteredCryptos.length === 0 ? (
            <div className='p-8 text-center'>
              <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center'>
                <Search className='w-8 h-8 text-gray-400' />
              </div>
              <p className='text-gray-500 dark:text-gray-400 font-medium'>
                Nenhuma moeda encontrada
              </p>
              <p className='text-sm text-gray-400 dark:text-gray-500 mt-1'>
                Tente buscar por outro termo
              </p>
            </div>
          ) : (
            <div className='divide-y divide-gray-100 dark:divide-gray-700/50'>
              {filteredCryptos.map(crypto => {
                const isSelected = crypto.symbol === selectedSymbol
                const isStable = STABLECOINS.has(crypto.symbol)

                return (
                  <button
                    key={crypto.symbol}
                    onClick={() => handleSelect(crypto.symbol)}
                    className={`w-full flex items-center justify-between px-4 py-3 min-h-[64px] hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                      {/* Logo */}
                      <div className='relative flex-shrink-0'>
                        <img
                          src={CRYPTO_LOGOS[crypto.symbol]}
                          alt={crypto.symbol}
                          className={`w-10 h-10 rounded-full object-cover ${
                            isSelected
                              ? 'ring-2 ring-blue-500'
                              : 'ring-1 ring-gray-200 dark:ring-gray-700'
                          }`}
                          onError={e => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${crypto.symbol}&background=6366f1&color=fff&size=40`
                          }}
                        />
                        {isSelected && (
                          <span className='absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center'>
                            <svg
                              className='w-2.5 h-2.5 text-white'
                              fill='currentColor'
                              viewBox='0 0 20 20'
                            >
                              <path
                                fillRule='evenodd'
                                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                                clipRule='evenodd'
                              />
                            </svg>
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className='flex flex-col items-start min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span
                            className={`font-semibold ${
                              isSelected
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {crypto.symbol}
                          </span>
                          {isStable && (
                            <span className='px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded flex-shrink-0'>
                              STABLE
                            </span>
                          )}
                        </div>
                        <span className='text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[180px]'>
                          {crypto.name}
                        </span>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className='flex flex-col items-end flex-shrink-0 ml-2'>
                      <span
                        className={`font-medium text-sm ${
                          isSelected
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        ${formatPrice(crypto.price)}
                      </span>
                      <span
                        className={`text-xs font-medium flex items-center gap-0.5 ${
                          crypto.change24h >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {crypto.change24h >= 0 ? (
                          <TrendingUp className='w-3 h-3' />
                        ) : (
                          <TrendingDown className='w-3 h-3' />
                        )}
                        {formatChange(crypto.change24h)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer with count */}
        <div className='px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'>
          <p className='text-xs text-center text-gray-500 dark:text-gray-400'>
            {filteredCryptos.length === 1
              ? '1 moeda disponível'
              : `${filteredCryptos.length} moedas disponíveis`}
          </p>
        </div>
      </div>
    </>
  ) : null

  return (
    <div className='relative'>
      {/* Label */}
      <span
        id='crypto-selector-label'
        className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
      >
        Criptomoeda
      </span>

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type='button'
        aria-labelledby='crypto-selector-label'
        onClick={() => setIsOpen(!isOpen)}
        className='w-full flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 group'
      >
        <div className='flex items-center gap-3'>
          {/* Crypto Logo */}
          <div className='relative'>
            <img
              src={CRYPTO_LOGOS[selectedSymbol]}
              alt={selectedSymbol}
              className='w-10 h-10 rounded-full ring-2 ring-gray-100 dark:ring-gray-700'
              onError={e => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${selectedSymbol}&background=6366f1&color=fff&size=40`
              }}
            />
            {/* Live indicator */}
            <span className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800' />
          </div>

          {/* Crypto Info */}
          <div className='flex flex-col items-start'>
            <div className='flex items-center gap-2'>
              <span className='font-bold text-gray-900 dark:text-white text-lg'>
                {selectedSymbol}
              </span>
              {STABLECOINS.has(selectedSymbol) && (
                <span className='px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded'>
                  STABLE
                </span>
              )}
            </div>
            <span className='text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]'>
              {selectedCrypto?.name || selectedSymbol}
            </span>
          </div>
        </div>

        {/* Price & Change */}
        <div className='flex items-center gap-4'>
          {selectedCrypto && selectedCrypto.price > 0 && (
            <div className='hidden sm:flex flex-col items-end'>
              <span className='font-semibold text-gray-900 dark:text-white'>
                ${formatPrice(selectedCrypto.price)}
              </span>
              {/* Só mostrar variação se tiver dados válidos */}
              {selectedCrypto.change24h === 0 ? (
                <span className='text-xs text-gray-400'>24h</span>
              ) : (
                <span
                  className={`text-xs font-medium flex items-center gap-0.5 ${
                    selectedCrypto.change24h >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {selectedCrypto.change24h >= 0 ? (
                    <TrendingUp className='w-3 h-3' />
                  ) : (
                    <TrendingDown className='w-3 h-3' />
                  )}
                  {formatChange(selectedCrypto.change24h)}
                </span>
              )}
            </div>
          )}

          {/* Chevron */}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown rendered via portal to escape overflow:hidden containers */}
      {createPortal(dropdownContent, document.body)}
    </div>
  )
}
