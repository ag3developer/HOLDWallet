import React, { useState, useEffect, useRef } from 'react'
import { Calculator } from 'lucide-react'
import { TradingLimitsDisplay } from './TradingLimitsDisplay'
import { CryptoSelector } from './CryptoSelector'
import { CurrencyCalculator } from './CurrencyCalculator'
import { useAuthStore } from '@/stores/useAuthStore'
import { apiClient } from '@/services/api'
import { toUSD } from '@/services/currency'
import { parseApiError } from '@/services/errors'

interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
  high24h: number
  low24h: number
}

interface Quote {
  quote_id: string
  operation: 'buy' | 'sell'
  symbol: string
  crypto_price: number
  fiat_amount: number
  crypto_amount: number
  spread_percentage: number
  spread_amount: number
  network_fee_percentage: number
  network_fee_amount: number
  total_amount: number
  expires_in_seconds: number
  // Valores em BRL para TED/PIX
  brl_amount?: number
  brl_total_amount?: number
  usd_to_brl_rate?: number
}

interface TradingFormProps {
  readonly cryptoPrices: readonly CryptoPrice[]
  readonly selectedSymbol: string
  readonly onSymbolChange: (symbol: string) => void
  readonly isBuy: boolean
  readonly onOperationChange: (isBuy: boolean) => void
  readonly onQuoteReceived: (quote: Quote) => void
  readonly currency: string
  readonly convertFromBRL: (value: number) => number
}

export function TradingForm({
  cryptoPrices,
  selectedSymbol,
  onSymbolChange,
  isBuy,
  onOperationChange,
  onQuoteReceived,
  currency,
  convertFromBRL,
}: TradingFormProps) {
  const { token } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastQuoteTime, setLastQuoteTime] = useState<number>(0)
  const [lastQuotedAmount, setLastQuotedAmount] = useState<string>('') // Rastrear valor cotado
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [allBalances, setAllBalances] = useState<Record<string, number>>({})
  const [isTyping, setIsTyping] = useState(false) // Indicador de digitação
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false) // Modal calculadora
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const QUOTE_VALIDITY_MS = 60000 // 60 segundos
  const DEBOUNCE_MS = 1200 // Aumentado para 1.2s para dar mais tempo ao usuário

  // Fetch wallet balances on component mount
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        if (!token) {
          console.error('[TradingForm] No token found')
          return
        }

        // Get wallets usando apiClient
        const walletsResp = await apiClient.get('/wallets/')

        const wallets = walletsResp.data
        if (!wallets?.length) throw new Error('No wallets found')

        const walletId = wallets[0].id

        // Get balances with tokens (USDT, USDC, etc)
        const balanceResp = await apiClient.get(`/wallets/${walletId}/balances?include_tokens=true`)

        const balData = balanceResp.data
        const mapped = mapBalances(balData.balances)
        setAllBalances(mapped)
      } catch (error) {
        console.error('[TradingForm] Error fetching balances:', error)
        setAllBalances({})
      }
    }

    fetchBalances()
  }, [token])

  // Helper function to map network names to symbols
  const mapBalances = (balances: Record<string, any>): Record<string, number> => {
    const mapped: Record<string, number> = {}

    for (const [network, balInfo] of Object.entries(balances || {})) {
      const networkLower = network.toLowerCase()
      const amount = extractBalance(balInfo)
      const symbol = mapNetworkToSymbol(networkLower)

      if (symbol) {
        // Somar saldos do mesmo símbolo (ex: USDT de múltiplas redes)
        mapped[symbol] = (mapped[symbol] || 0) + amount
      }
    }

    return mapped
  }

  // Helper to extract balance amount
  const extractBalance = (balInfo: any): number => {
    if (typeof balInfo === 'object' && balInfo?.balance !== undefined) {
      return Number.parseFloat(String(balInfo.balance)) || 0
    }
    return typeof balInfo === 'number' ? balInfo : 0
  }

  // Helper to map network to symbol
  const mapNetworkToSymbol = (networkLower: string): string => {
    // Detectar tokens stablecoin primeiro
    if (networkLower.includes('usdt')) return 'USDT'
    if (networkLower.includes('usdc')) return 'USDC'

    // Mapping de redes nativas
    const networkMap: Record<string, string> = {
      polygon: 'MATIC',
      ethereum: 'ETH',
      eth: 'ETH',
      bitcoin: 'BTC',
      btc: 'BTC',
      base: 'BASE',
      bsc: 'BNB',
      solana: 'SOL',
      sol: 'SOL',
      tron: 'TRX',
      trx: 'TRX',
      litecoin: 'LTC',
      ltc: 'LTC',
      dogecoin: 'DOGE',
      doge: 'DOGE',
      cardano: 'ADA',
      ada: 'ADA',
      avalanche: 'AVAX',
      avax: 'AVAX',
      polkadot: 'DOT',
      dot: 'DOT',
      chainlink: 'LINK',
      link: 'LINK',
      shiba: 'SHIB',
      shib: 'SHIB',
      xrp: 'XRP',
    }

    return networkMap[networkLower] || ''
  }

  // Smart formatting: shows appropriate decimals based on value
  const formatBalance = (value: number): string => {
    if (value === 0) return '0'

    // For very small numbers (< 0.0001), show up to 8 decimals
    if (value < 0.0001) {
      return value.toFixed(8).replace(/\.?0+$/, '')
    }

    // For small numbers (< 1), show up to 6 decimals
    if (value < 1) {
      return value.toFixed(6).replace(/\.?0+$/, '')
    }

    // For medium numbers (< 1000), show up to 4 decimals
    if (value < 1000) {
      return value.toFixed(4).replace(/\.?0+$/, '')
    }

    // For large numbers, show up to 2 decimals
    return value.toFixed(2).replace(/\.?0+$/, '')
  }

  // Update walletBalance when selectedSymbol changes
  useEffect(() => {
    const newBalance = allBalances[selectedSymbol] || 0
    setWalletBalance(newBalance)
  }, [selectedSymbol, allBalances])

  // Timer para mostrar contagem regressiva
  useEffect(() => {
    if (lastQuoteTime === 0) return

    const updateTimer = () => {
      const now = Date.now()
      const elapsed = now - lastQuoteTime
      const remaining = Math.max(0, Math.ceil((QUOTE_VALIDITY_MS - elapsed) / 1000))
      setSecondsRemaining(remaining)

      if (remaining === 0) {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }

    updateTimer() // Call immediately

    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [lastQuoteTime])

  // Auto-fetch quote with debounce when amount changes
  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // If no valid amount, reset typing state and don't fetch
    if (!amount || Number(amount) <= 0) {
      setIsTyping(false)
      return
    }

    // Marcar que usuário está digitando
    setIsTyping(true)

    // NOVA LÓGICA: Permitir re-cotar se o valor mudou, mesmo com quote válida
    const now = Date.now()
    const timeSinceLastQuote = now - lastQuoteTime
    const amountChanged = amount !== lastQuotedAmount

    // Se o valor NÃO mudou e a quote ainda é válida, não re-cotar
    if (!amountChanged && timeSinceLastQuote < QUOTE_VALIDITY_MS) {
      setIsTyping(false)
      return
    }

    // 🚫 BLOQUEAR cotação se for SELL e saldo insuficiente
    if (!isBuy && Number(amount) > walletBalance) {
      setIsTyping(false)
      return
    }

    // Set timeout to fetch quote after user stops typing (DEBOUNCE_MS)
    timeoutRef.current = setTimeout(async () => {
      setIsTyping(false) // Parou de digitar
      setLoading(true)
      try {
        // Para VENDA: amount já é em crypto, não precisa conversão
        // Para COMPRA: amount é em fiat (BRL/USD/EUR), pode precisar conversão
        const amountValue = Number(amount)
        let amountToSend = amountValue
        let originalBrlAmount: number | undefined
        let usdToBrlRate: number | undefined

        // Só converter moeda para COMPRA (fiat → USD)
        // Para VENDA, o valor já está em crypto (USDT, BTC, etc)
        if (isBuy && currency !== 'USD') {
          // Guardar o valor original em BRL para enviar junto com o trade
          if (currency === 'BRL') {
            originalBrlAmount = amountValue
            usdToBrlRate = amountValue / toUSD(amountValue, 'BRL')
          }
          // Usar CurrencyManager para conversão real (BRL→USD ou EUR→USD)
          amountToSend = toUSD(amountValue, currency as 'BRL' | 'EUR')
          console.log(
            `[TradingForm] Converting ${amountValue} ${currency} → ${amountToSend.toFixed(2)} USD (rate: ${usdToBrlRate?.toFixed(4)})`
          )
        } else if (!isBuy) {
          // Para VENDA, o valor é em crypto - enviar diretamente
          console.log(
            `[TradingForm] SELL: Sending ${amountValue} ${selectedSymbol} directly (no conversion)`
          )
        }

        const response = await apiClient.post('/instant-trade/quote', {
          operation: isBuy ? 'buy' : 'sell',
          symbol: selectedSymbol,
          [isBuy ? 'fiat_amount' : 'crypto_amount']: amountToSend,
        })

        // Enriquecer a quote com valores em BRL para TED/PIX
        const enrichedQuote: Quote = {
          ...response.data.quote,
        }

        // Se o usuário digitou em BRL, adicionar esses valores à quote
        if (currency === 'BRL' && originalBrlAmount && usdToBrlRate) {
          enrichedQuote.brl_amount = originalBrlAmount
          // Calcular total em BRL (com spread e taxas)
          const totalUSD = response.data.quote.total_amount
          enrichedQuote.brl_total_amount = totalUSD * usdToBrlRate
          enrichedQuote.usd_to_brl_rate = usdToBrlRate
          console.log(
            `[TradingForm] BRL values: amount=${originalBrlAmount}, total=${enrichedQuote.brl_total_amount.toFixed(2)}, rate=${usdToBrlRate.toFixed(4)}`
          )
        }

        onQuoteReceived(enrichedQuote)
        setLastQuoteTime(Date.now())
        setLastQuotedAmount(amount) // Salvar o valor que foi cotado
      } catch (error: any) {
        // Usar o novo sistema de tratamento de erros
        const parsedError = parseApiError(error)

        // Auto-quote silencioso - apenas log em dev
        if (process.env.NODE_ENV === 'development') {
          console.log('[TradingForm] Auto-quote:', parsedError.userMessage)
        }

        // Não mostrar toast para auto-quote (é silencioso)
        // O usuário verá o preview e pode clicar em "Get Quote" manualmente
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS) // Usar debounce configurável (1.2s)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [amount, selectedSymbol, isBuy, onQuoteReceived, lastQuoteTime, lastQuotedAmount])

  return (
    <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'>
      <div className='p-5 space-y-4'>
        {/* Operation Toggle - Improved Design */}
        <div className='flex bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1.5 gap-1'>
          <button
            onClick={() => {
              onOperationChange(true)
              setAmount('')
              setLastQuotedAmount('') // Reset valor cotado
              setLastQuoteTime(0)
            }}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isBuy
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md shadow-green-500/25'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => {
              onOperationChange(false)
              setAmount('')
              setLastQuotedAmount('') // Reset valor cotado
              setLastQuoteTime(0)
            }}
            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isBuy
                ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
                : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md shadow-red-500/25'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Cryptocurrency Selection - Professional Selector */}
        <CryptoSelector
          cryptoPrices={cryptoPrices}
          selectedSymbol={selectedSymbol}
          onSymbolChange={newSymbol => {
            onSymbolChange(newSymbol)
            setAmount('')
            // Reset quote timer to force new quote fetch for the new symbol
            setLastQuoteTime(0)
          }}
          balance={allBalances[selectedSymbol] || 0}
        />

        {/* Amount Input */}
        <div>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center gap-2'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Amount ({isBuy ? currency : selectedSymbol})
              </label>
              {/* Calculator Button */}
              {isBuy && (
                <button
                  type='button'
                  onClick={() => setIsCalculatorOpen(true)}
                  className='p-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
                           dark:hover:bg-gray-600 transition-colors group'
                  title='Abrir calculadora de conversão'
                  aria-label='Abrir calculadora de conversão de moedas'
                >
                  <Calculator className='w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400' />
                </button>
              )}
            </div>
            {!isBuy && (
              <div className='flex items-center gap-2'>
                {walletBalance > 0 ? (
                  <button
                    type='button'
                    onClick={() => {
                      setAmount(walletBalance.toString())
                      setLastQuoteTime(0)
                    }}
                    className='text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium'
                  >
                    Max: {formatBalance(walletBalance)} {selectedSymbol}
                  </button>
                ) : (
                  <span className='text-xs text-gray-500 dark:text-gray-400 px-2 py-1'>
                    Saldo: 0 {selectedSymbol}
                  </span>
                )}
              </div>
            )}
          </div>
          <input
            type='number'
            value={amount}
            onChange={e => {
              setAmount(e.target.value)
              // Reset quote if amount is cleared
              if (!e.target.value || e.target.value === '') {
                setLastQuoteTime(0)
              }
            }}
            placeholder='0.00'
            max={isBuy ? undefined : walletBalance}
            className='w-full px-4 py-3 text-lg font-semibold border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 transition-all'
          />
        </div>

        {/* Status Message when loading */}
        {loading && (
          <div className='flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700'>
            <div className='animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent' />
            <span className='text-xs text-blue-700 dark:text-blue-400'>Buscando cotação...</span>
          </div>
        )}

        {/* Typing Indicator - Show when user is typing */}
        {isTyping && !loading && amount && Number(amount) > 0 && (
          <div className='flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700'>
            <div className='flex gap-1'>
              <span className='w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse' />
              <span className='w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse' />
              <span className='w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse' />
            </div>
            <span className='text-xs text-yellow-700 dark:text-yellow-400'>
              Aguardando você terminar de digitar...
            </span>
          </div>
        )}

        {/* Insufficient Balance Warning */}
        {!isBuy && amount && Number(amount) > walletBalance && (
          <div className='p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-700 space-y-2'>
            <div className='flex items-center gap-2'>
              <svg
                className='w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                  clipRule='evenodd'
                />
              </svg>
              <span className='text-xs font-medium text-red-700 dark:text-red-400'>
                Saldo Insuficiente
              </span>
            </div>
            <div className='text-xs text-red-600 dark:text-red-400'>
              Você possui apenas{' '}
              <span className='font-semibold'>
                {formatBalance(walletBalance)} {selectedSymbol}
              </span>
              .
              <br />
              Deposite mais {selectedSymbol} ou reduza o valor para continuar.
            </div>
          </div>
        )}

        {/* Quote Valid Timer */}
        {lastQuoteTime > 0 && secondsRemaining > 0 && (
          <div className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700'>
            <span className='text-xs text-green-700 dark:text-green-400 font-medium'>
              Quote válida por:
            </span>
            <span className='text-sm font-bold text-green-600 dark:text-green-400'>
              {secondsRemaining}s
            </span>
          </div>
        )}

        {/* Trading Limits Display */}
        {amount &&
          Number(amount) > 0 &&
          (() => {
            let currencySymbol: string
            if (currency === 'BRL') {
              currencySymbol = 'R$'
            } else if (currency === 'USD') {
              currencySymbol = '$'
            } else {
              currencySymbol = '€'
            }
            return (
              <TradingLimitsDisplay
                accountType='PF'
                amount={Number(amount)}
                currency={currency as any}
                convertFromBRL={convertFromBRL}
                dailySpent={0}
                currencySymbol={currencySymbol}
              />
            )
          })()}
      </div>

      {/* Currency Calculator Modal */}
      <CurrencyCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        initialCurrency={currency}
        onSelectAmount={(value, _selectedCurrency) => {
          // Usar o valor selecionado diretamente no campo
          setAmount(value.toFixed(2))
          setLastQuoteTime(0) // Forçar nova cotação
        }}
      />
    </div>
  )
}
