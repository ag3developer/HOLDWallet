import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Calculator, ArrowUpDown, Info, DollarSign, CircleDollarSign, Euro } from 'lucide-react'
import { toUSD, fromUSD } from '@/services/currency'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'

interface CurrencyCalculatorProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSelectAmount?: (amount: number, currency: string) => void
  readonly initialCurrency?: string
}

type Currency = 'USD' | 'BRL' | 'EUR'

interface CurrencyInfo {
  code: Currency
  symbol: string
  name: string
  icon: 'usd' | 'brl' | 'eur'
}

const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', name: 'Dólar Americano', icon: 'usd' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro', icon: 'brl' },
  { code: 'EUR', symbol: '€', name: 'Euro', icon: 'eur' },
]

// Taxas padrão (fallback se API não responder)
const DEFAULT_SYSTEM_FEE_PERCENT = 3.25 // 3% spread + 0.25% network

// Default currency info para evitar undefined
const DEFAULT_CURRENCY: CurrencyInfo = {
  code: 'USD',
  symbol: '$',
  name: 'Dólar Americano',
  icon: 'usd',
}

// Componente para renderizar ícone de moeda
function CurrencyIcon({ icon, className }: { readonly icon: string; readonly className?: string }) {
  switch (icon) {
    case 'usd':
      return <DollarSign className={className} />
    case 'brl':
      return <CircleDollarSign className={className} />
    case 'eur':
      return <Euro className={className} />
    default:
      return <DollarSign className={className} />
  }
}

export function CurrencyCalculator({
  isOpen,
  onClose,
  onSelectAmount,
  initialCurrency = 'USD',
}: CurrencyCalculatorProps) {
  const [fromCurrency, setFromCurrency] = useState<Currency>(initialCurrency as Currency)
  const [toCurrency, setToCurrency] = useState<Currency>(initialCurrency === 'USD' ? 'BRL' : 'USD')
  const [amount, setAmount] = useState<string>('')
  const [includeFees, setIncludeFees] = useState(false)

  // Buscar taxas da API (público, não precisa de auth)
  const { data: feesData } = useQuery({
    queryKey: ['instant-trade-fees'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/instant-trade/fees')
        return data
      } catch {
        return null
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 1,
  })

  // Taxa total do sistema (spread + network fee) - dinâmica da API
  const SYSTEM_FEE_PERCENT = feesData?.fees?.total
    ? Number.parseFloat(feesData.fees.total.replace('%', ''))
    : DEFAULT_SYSTEM_FEE_PERCENT

  // Reset quando abre o modal
  useEffect(() => {
    if (isOpen) {
      setFromCurrency(initialCurrency as Currency)
      setToCurrency(initialCurrency === 'USD' ? 'BRL' : 'USD')
      setAmount('')
    }
  }, [isOpen, initialCurrency])

  // Calcular conversão
  const calculateConversion = useCallback(
    (value: number, from: Currency, to: Currency): number => {
      if (value <= 0) return 0

      let result: number

      // Primeiro converter para USD (moeda base)
      let valueInUSD: number
      if (from === 'USD') {
        valueInUSD = value
      } else {
        valueInUSD = toUSD(value, from)
      }

      // Depois converter de USD para moeda destino
      if (to === 'USD') {
        result = valueInUSD
      } else {
        result = fromUSD(valueInUSD, to)
      }

      // Aplicar taxa se selecionado
      if (includeFees) {
        result = result * (1 - SYSTEM_FEE_PERCENT / 100)
      }

      return result
    },
    [includeFees, SYSTEM_FEE_PERCENT]
  )

  // Valor convertido
  const convertedAmount = calculateConversion(Number(amount) || 0, fromCurrency, toCurrency)

  // Inverter moedas
  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    // Também trocar o valor para manter a conversão
    if (convertedAmount > 0) {
      setAmount(convertedAmount.toFixed(2))
    }
  }

  // Obter info da moeda (sempre retorna um valor válido)
  const getCurrencyInfo = (code: Currency): CurrencyInfo => {
    return CURRENCIES.find(c => c.code === code) ?? DEFAULT_CURRENCY
  }

  // Usar valor no formulário
  const handleUseValue = (value: number, currency: Currency) => {
    if (onSelectAmount && value > 0) {
      onSelectAmount(value, currency)
      onClose()
    }
  }

  // Formatar número
  const formatNumber = (value: number, decimals: number = 2): string => {
    if (value === 0) return '0.00'
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  // Obter taxa de câmbio atual
  const getExchangeRate = (from: Currency, to: Currency): number => {
    if (from === to) return 1
    return calculateConversion(1, from, to) / (includeFees ? 1 - SYSTEM_FEE_PERCENT / 100 : 1)
  }

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    globalThis.addEventListener('keydown', handleEsc)
    return () => globalThis.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open (Safari/iOS fix)
  // Calculate real viewport height for Safari webapp
  const [viewportHeight, setViewportHeight] = useState('100vh')
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect iOS (including iPad with iOS 13+)
    const userAgent = navigator.userAgent.toLowerCase()
    const iOS =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.maxTouchPoints > 1 && /macintosh/.test(userAgent))
    setIsIOS(iOS)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // Calculate real viewport height (Safari webapp fix)
      const updateHeight = () => {
        // Use visualViewport for more accurate height on iOS
        const vh = globalThis.visualViewport?.height || globalThis.innerHeight
        setViewportHeight(`${vh}px`)
      }

      // Initial update
      updateHeight()

      // Small delay to ensure iOS has settled
      const initialTimer = setTimeout(updateHeight, 100)

      // Update on resize/orientation change
      globalThis.addEventListener('resize', updateHeight)
      globalThis.addEventListener('orientationchange', updateHeight)
      globalThis.visualViewport?.addEventListener('resize', updateHeight)

      // Lock body scroll - iOS specific handling
      const scrollY = globalThis.scrollY
      const originalStyles = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
        height: document.body.style.height,
      }

      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.width = '100%'

      // iOS specific: also set height
      if (isIOS) {
        document.body.style.height = '100%'
      }

      return () => {
        clearTimeout(initialTimer)
        globalThis.removeEventListener('resize', updateHeight)
        globalThis.removeEventListener('orientationchange', updateHeight)
        globalThis.visualViewport?.removeEventListener('resize', updateHeight)

        document.body.style.overflow = originalStyles.overflow
        document.body.style.position = originalStyles.position
        document.body.style.top = originalStyles.top
        document.body.style.left = originalStyles.left
        document.body.style.right = originalStyles.right
        document.body.style.width = originalStyles.width
        document.body.style.height = originalStyles.height

        globalThis.scrollTo(0, scrollY)
      }
    }
    return undefined
  }, [isOpen, isIOS])

  if (!isOpen) return null

  const fromInfo = getCurrencyInfo(fromCurrency)
  const toInfo = getCurrencyInfo(toCurrency)

  const modalContent = (
    <>
      {/* Overlay */}
      <button
        type='button'
        aria-label='Fechar calculadora'
        className='fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity cursor-default border-0'
        onClick={onClose}
        style={{
          height: viewportHeight,
          minHeight: viewportHeight,
        }}
      />

      {/* Modal - Bottom sheet on mobile (iOS), centered on desktop */}
      <div
        className='fixed inset-x-0 bottom-0 sm:inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none'
        style={{
          height: isIOS ? 'auto' : viewportHeight,
          maxHeight: viewportHeight,
        }}
      >
        <dialog
          open
          aria-labelledby='calculator-title'
          className='bg-white dark:bg-gray-800 
                     w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl
                     shadow-2xl pointer-events-auto 
                     transform transition-all 
                     animate-in slide-in-from-bottom sm:zoom-in-95 duration-300
                     m-0 p-0 border-0
                     flex flex-col'
          style={{
            maxHeight: isIOS ? `calc(${viewportHeight} - 40px)` : `calc(${viewportHeight} - 20px)`,
            height: isIOS ? 'auto' : undefined,
            minHeight: isIOS ? '70vh' : undefined,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Header - Sticky */}
          <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0'>
            {/* Drag Handle for mobile */}
            <div className='absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full sm:hidden' />

            <div className='flex items-center gap-3 mt-2 sm:mt-0'>
              <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
                <Calculator className='w-5 h-5 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <h3
                  id='calculator-title'
                  className='text-base sm:text-lg font-semibold text-gray-900 dark:text-white'
                >
                  Calculadora de Conversão
                </h3>
                <p className='text-xs text-gray-500 dark:text-gray-400 hidden sm:block'>
                  Converta entre USD, BRL e EUR
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={onClose}
              aria-label='Fechar'
              className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mt-2 sm:mt-0'
            >
              <X className='w-5 h-5 text-gray-500' />
            </button>
          </div>

          {/* Content - Scrollable on mobile with iOS optimizations */}
          <div
            className='p-4 space-y-4 flex-1'
            style={{
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
          >
            {/* From Currency */}
            <div className='space-y-2'>
              <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>De</span>
              <div className='flex flex-col sm:flex-row gap-2'>
                <div className='relative'>
                  <CurrencyIcon
                    icon={fromInfo.icon}
                    className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none'
                  />
                  <select
                    value={fromCurrency}
                    onChange={e => setFromCurrency(e.target.value as Currency)}
                    aria-label='Moeda de origem'
                    className='w-full sm:w-32 pl-9 pr-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 
                             dark:border-gray-600 rounded-xl text-sm font-medium
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none'
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='relative flex-1'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none'>
                    {fromInfo.symbol}
                  </span>
                  <input
                    type='number'
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder='0.00'
                    aria-label='Valor a converter'
                    className='w-full pl-10 pr-4 py-3.5 sm:py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 
                             dark:border-gray-600 rounded-xl text-lg font-semibold text-right
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             text-gray-900 dark:text-white placeholder-gray-400'
                    autoFocus
                  />
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className='flex justify-center py-1'>
              <button
                type='button'
                onClick={handleSwapCurrencies}
                className='p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                         rounded-full transition-all hover:scale-110 active:scale-95 touch-manipulation'
                aria-label='Inverter moedas'
              >
                <ArrowUpDown className='w-5 h-5 text-gray-600 dark:text-gray-300' />
              </button>
            </div>

            {/* To Currency */}
            <div className='space-y-2'>
              <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Para</span>
              <div className='flex flex-col sm:flex-row gap-2'>
                <div className='relative'>
                  <CurrencyIcon
                    icon={toInfo.icon}
                    className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none'
                  />
                  <select
                    value={toCurrency}
                    onChange={e => setToCurrency(e.target.value as Currency)}
                    aria-label='Moeda de destino'
                    className='w-full sm:w-32 pl-9 pr-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 
                             dark:border-gray-600 rounded-xl text-sm font-medium
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none'
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='relative flex-1'>
                  <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none'>
                    {toInfo.symbol}
                  </span>
                  <div
                    className='w-full pl-10 pr-4 py-3.5 sm:py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 
                              dark:border-blue-700 rounded-xl text-lg font-bold text-right
                              text-blue-700 dark:text-blue-300'
                    aria-label='Valor convertido'
                  >
                    {formatNumber(convertedAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange Rate Info */}
            <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm'>
                <span className='text-gray-600 dark:text-gray-400'>Taxa de câmbio:</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  1 {fromInfo.code} = {formatNumber(getExchangeRate(fromCurrency, toCurrency), 4)}{' '}
                  {toInfo.code}
                </span>
              </div>

              {/* Include Fees Toggle */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Incluir taxas (~{SYSTEM_FEE_PERCENT}%)
                  </span>
                  <div className='group relative'>
                    <Info className='w-4 h-4 text-gray-400 cursor-help' />
                    <div
                      className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 
                                  bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible 
                                  group-hover:opacity-100 group-hover:visible transition-all
                                  whitespace-nowrap z-10'
                    >
                      Spread + taxa de rede estimados
                      <div className='absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900' />
                    </div>
                  </div>
                </div>
                <button
                  type='button'
                  role='switch'
                  aria-checked={includeFees}
                  aria-label='Incluir taxas do sistema'
                  onClick={() => setIncludeFees(!includeFees)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                            ${includeFees ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                              ${includeFees ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className='space-y-2'>
              <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
                Valores rápidos ({fromInfo.code})
              </span>
              <div className='grid grid-cols-4 gap-1.5 sm:gap-2'>
                {[100, 500, 1000, 5000].map(val => (
                  <button
                    key={val}
                    type='button'
                    onClick={() => setAmount(val.toString())}
                    className='px-2 sm:px-3 py-2.5 sm:py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
                             dark:hover:bg-gray-600 rounded-lg text-sm font-medium
                             text-gray-700 dark:text-gray-300 transition-colors touch-manipulation
                             active:scale-95'
                  >
                    {fromInfo.symbol}
                    {val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer - Hidden on very small screens, collapsed */}
            <div className='flex items-start gap-2 p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl'>
              <Info className='w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5' />
              <p className='text-xs text-amber-700 dark:text-amber-300 leading-relaxed'>
                Valores aproximados. O valor final pode variar de acordo com a cotação no momento da
                transação.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            className='p-4 border-t border-gray-200 dark:border-gray-700 space-y-2 shrink-0'
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
          >
            {/* Use Value Buttons */}
            {onSelectAmount && Number(amount) > 0 && (
              <div className='grid grid-cols-2 gap-2'>
                <button
                  type='button'
                  onClick={() => handleUseValue(Number(amount), fromCurrency)}
                  className='px-3 sm:px-4 py-3 sm:py-2.5 bg-gray-100 dark:bg-gray-700 
                           hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm 
                           font-medium text-gray-700 dark:text-gray-300 transition-colors
                           touch-manipulation active:scale-95'
                >
                  Usar {fromInfo.symbol}
                  {formatNumber(Number(amount))}
                </button>
                <button
                  type='button'
                  onClick={() => handleUseValue(convertedAmount, toCurrency)}
                  className='px-3 sm:px-4 py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 
                           rounded-xl text-sm font-medium text-white transition-colors
                           touch-manipulation active:scale-95'
                >
                  Usar {toInfo.symbol}
                  {formatNumber(convertedAmount)}
                </button>
              </div>
            )}

            <button
              type='button'
              onClick={onClose}
              className='w-full px-4 py-3 sm:py-2.5 bg-gray-200 dark:bg-gray-700 
                       hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl text-sm 
                       font-medium text-gray-700 dark:text-gray-300 transition-colors
                       touch-manipulation active:scale-95'
            >
              Fechar
            </button>
          </div>
        </dialog>
      </div>
    </>
  )

  // Render via Portal to escape any container constraints
  return createPortal(modalContent, document.body)
}
