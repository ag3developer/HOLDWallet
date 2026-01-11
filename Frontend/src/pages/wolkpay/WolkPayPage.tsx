/**
 * WolkPayPage - Página principal WolkPay (Beneficiário)
 * =====================================================
 *
 * Permite ao usuário autenticado criar faturas para que
 * terceiros paguem via PIX e ele receba em crypto.
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Send,
  Users,
  Clock,
  Shield,
  Zap,
  Copy,
  Check,
  ChevronDown,
  AlertCircle,
  Info,
  Share2,
  ExternalLink,
  History,
  Sparkles,
  BadgeCheck,
  Coins,
  DollarSign,
} from 'lucide-react'
import { usePrices } from '@/hooks/usePrices'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import wolkPayService, { CreateInvoiceRequest, InvoiceCreatedResponse } from '@/services/wolkpay'

// Logos das cryptos - usando CoinGecko
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  TRX: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  LTC: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  DAI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
}

// Cryptos suportadas - mesma lista do InstantTrade
const SUPPORTED_CRYPTOS = [
  // MOEDAS NATIVAS (principais blockchains)
  { symbol: 'BTC', name: 'Bitcoin', network: 'bitcoin', category: 'Native' },
  { symbol: 'ETH', name: 'Ethereum', network: 'ethereum', category: 'Native' },
  { symbol: 'MATIC', name: 'Polygon', network: 'polygon', category: 'Native' },
  { symbol: 'BNB', name: 'Binance Smart Chain', network: 'bsc', category: 'Native' },
  { symbol: 'TRX', name: 'TRON', network: 'tron', category: 'Native' },
  { symbol: 'SOL', name: 'Solana', network: 'solana', category: 'Native' },
  { symbol: 'LTC', name: 'Litecoin', network: 'litecoin', category: 'Native' },
  { symbol: 'DOGE', name: 'Dogecoin', network: 'dogecoin', category: 'Native' },
  { symbol: 'ADA', name: 'Cardano', network: 'cardano', category: 'Native' },
  { symbol: 'AVAX', name: 'Avalanche', network: 'avalanche', category: 'Native' },
  { symbol: 'DOT', name: 'Polkadot', network: 'polkadot', category: 'Native' },
  { symbol: 'LINK', name: 'Chainlink', network: 'ethereum', category: 'Native' },
  { symbol: 'SHIB', name: 'Shiba Inu', network: 'ethereum', category: 'Native' },
  { symbol: 'XRP', name: 'XRP', network: 'xrp', category: 'Native' },

  // STABLECOINS (Criptodólares)
  { symbol: 'USDT', name: 'Tether USD', network: 'tron', category: 'Stablecoin' },
  { symbol: 'USDC', name: 'USD Coin', network: 'ethereum', category: 'Stablecoin' },
  { symbol: 'DAI', name: 'Dai Stablecoin', network: 'ethereum', category: 'Stablecoin' },
]

// Constantes de limites
const LIMITS = {
  MIN_BRL: 100,
  MAX_BRL: 15000,
  SERVICE_FEE: 3.65,
  NETWORK_FEE: 0.15,
  TOTAL_FEE: 3.8,
  EXPIRY_MINUTES: 15,
}

const formatCurrency = (amount: number, currency = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

const formatCrypto = (amount: number | string, symbol: string) => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  const decimals = ['BTC'].includes(symbol) ? 8 : ['ETH', 'BNB'].includes(symbol) ? 6 : 2
  return `${numAmount.toFixed(decimals)} ${symbol}`
}

export function WolkPayPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { currency } = useCurrencyStore()
  const { prices } = usePrices(
    SUPPORTED_CRYPTOS.map(c => c.symbol),
    'USD'
  )

  // Estado do formulário
  const [selectedCrypto, setSelectedCrypto] = useState(SUPPORTED_CRYPTOS[0])
  const [showCryptoSelect, setShowCryptoSelect] = useState(false)
  const [inputMode, setInputMode] = useState<'crypto' | 'fiat'>('fiat')
  const [fiatAmount, setFiatAmount] = useState('')
  const [cryptoAmount, setCryptoAmount] = useState('')

  // Estado de loading/error
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado do resultado
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceCreatedResponse | null>(null)
  const [copied, setCopied] = useState(false)

  // Preço atual
  const currentPrice = prices?.[selectedCrypto.symbol]?.price || 0
  const brlRate = currentPrice * 5.5 // Aproximado USD->BRL

  // Cálculo de valores
  const calculatedFiatAmount =
    inputMode === 'crypto'
      ? parseFloat(cryptoAmount || '0') * brlRate
      : parseFloat(fiatAmount || '0')

  const calculatedCryptoAmount =
    inputMode === 'fiat' ? parseFloat(fiatAmount || '0') / brlRate : parseFloat(cryptoAmount || '0')

  // Taxas
  const serviceFee = calculatedFiatAmount * (LIMITS.SERVICE_FEE / 100)
  const networkFee = calculatedFiatAmount * (LIMITS.NETWORK_FEE / 100)
  const totalAmount = calculatedFiatAmount + serviceFee + networkFee

  // Validação
  const isAmountValid =
    calculatedFiatAmount >= LIMITS.MIN_BRL && calculatedFiatAmount <= LIMITS.MAX_BRL
  const canSubmit = isAmountValid && !isLoading

  // Atualiza valor correspondente
  useEffect(() => {
    if (inputMode === 'fiat' && fiatAmount && brlRate > 0) {
      const crypto = parseFloat(fiatAmount) / brlRate
      setCryptoAmount(crypto.toFixed(8))
    }
  }, [fiatAmount, brlRate, inputMode])

  useEffect(() => {
    if (inputMode === 'crypto' && cryptoAmount && brlRate > 0) {
      const fiat = parseFloat(cryptoAmount) * brlRate
      setFiatAmount(fiat.toFixed(2))
    }
  }, [cryptoAmount, brlRate, inputMode])

  // Criar fatura
  const handleCreateInvoice = async () => {
    if (!canSubmit) return

    setIsLoading(true)
    setError(null)

    try {
      const request: CreateInvoiceRequest = {
        crypto_currency: selectedCrypto.symbol,
        crypto_amount: calculatedCryptoAmount,
        crypto_network: selectedCrypto.network,
      }

      console.log('📤 Creating WolkPay invoice:', request)
      const response = await wolkPayService.createInvoice(request)
      console.log('✅ Invoice created:', response)
      setCreatedInvoice(response)
    } catch (err: any) {
      console.error('❌ Error creating invoice:', err)
      console.error('❌ Error response:', err.response?.data)
      console.error('❌ Error status:', err.response?.status)
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        t('wolkpay.errors.createFailed')
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Copiar link
  const handleCopyLink = async () => {
    if (!createdInvoice?.share_url) return

    try {
      await navigator.clipboard.writeText(createdInvoice.share_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Compartilhar
  const handleShare = async () => {
    if (!createdInvoice?.share_url) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('wolkpay.share.title'),
          text: t('wolkpay.share.text', {
            amount: formatCurrency(createdInvoice.invoice.total_amount_brl),
          }),
          url: createdInvoice.share_url,
        })
      } catch (err) {
        console.error('Share failed:', err)
      }
    } else {
      handleCopyLink()
    }
  }

  // Nova fatura
  const handleNewInvoice = () => {
    setCreatedInvoice(null)
    setFiatAmount('')
    setCryptoAmount('')
    setError(null)
  }

  // Se já criou uma fatura, mostrar resultado
  if (createdInvoice) {
    return (
      <div key={i18n.language} className='space-y-6 pb-24'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>WolkPay</h1>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              {t('wolkpay.invoiceCreated')}
            </p>
          </div>
          <button
            onClick={() => navigate('/wolkpay/history')}
            className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors'
          >
            <History className='w-4 h-4' />
            {t('wolkpay.historyButton')}
          </button>
        </div>

        {/* Success Card */}
        <div className='bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center'>
              <Check className='w-6 h-6' />
            </div>
            <div>
              <p className='text-green-100 text-sm'>
                {t('wolkpay.invoice')} #{createdInvoice.invoice.invoice_number}
              </p>
              <h2 className='text-xl font-bold'>{t('wolkpay.invoiceReady')}</h2>
            </div>
          </div>

          <div className='bg-white/10 rounded-xl p-4 mb-4'>
            <div className='flex justify-between items-center mb-2'>
              <span className='text-green-100'>{t('wolkpay.totalToPay')}</span>
              <span className='text-2xl font-bold'>
                {formatCurrency(createdInvoice.invoice.total_amount_brl)}
              </span>
            </div>
            <div className='flex justify-between items-center text-sm'>
              <span className='text-green-100'>{t('wolkpay.youReceive')}</span>
              <span className='font-medium'>
                {formatCrypto(
                  createdInvoice.invoice.crypto_amount,
                  createdInvoice.invoice.crypto_currency
                )}
              </span>
            </div>
          </div>

          <div className='flex items-center gap-2 text-sm text-green-100 mb-4'>
            <Clock className='w-4 h-4' />
            <span>{t('wolkpay.expiresIn', { minutes: LIMITS.EXPIRY_MINUTES })}</span>
          </div>
        </div>

        {/* Share Link */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700'>
          <h3 className='font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Share2 className='w-5 h-5 text-blue-500' />
            {t('wolkpay.shareWithPayer')}
          </h3>

          <div className='flex gap-2'>
            <div className='flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-600 dark:text-gray-300 truncate'>
              {createdInvoice.share_url}
            </div>
            <button
              onClick={handleCopyLink}
              className='px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors'
            >
              {copied ? (
                <Check className='w-5 h-5 text-green-500' />
              ) : (
                <Copy className='w-5 h-5 text-gray-600 dark:text-gray-400' />
              )}
            </button>
          </div>

          <div className='grid grid-cols-2 gap-3 mt-4'>
            <button
              onClick={handleShare}
              className='flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors'
            >
              <Share2 className='w-4 h-4' />
              {t('wolkpay.share.button')}
            </button>
            <button
              onClick={() => window.open(createdInvoice.share_url, '_blank')}
              className='flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors'
            >
              <ExternalLink className='w-4 h-4' />
              {t('wolkpay.preview')}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className='flex gap-3'>
          <button
            onClick={handleNewInvoice}
            className='flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all'
          >
            {t('wolkpay.createAnother')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div key={i18n.language} className='space-y-6 pb-24'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-3 mb-1'>
            <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
              WolkPay
            </h1>
            <div className='flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full'>
              <Sparkles className='w-3 h-3 text-blue-500' />
              <span className='text-xs font-medium text-blue-700 dark:text-blue-400'>
                {t('wolkpay.badge')}
              </span>
            </div>
          </div>
          <p className='text-gray-500 dark:text-gray-400 text-sm'>{t('wolkpay.subtitle')}</p>
        </div>

        <button
          onClick={() => navigate('/wolkpay/history')}
          className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors'
        >
          <History className='w-4 h-4' />
          <span className='hidden sm:inline'>{t('wolkpay.historyButton')}</span>
        </button>
      </div>

      {/* How it works */}
      <div className='bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/50'>
        <h3 className='font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
          <Info className='w-4 h-4 text-blue-500' />
          {t('wolkpay.howItWorks.title')}
        </h3>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <div className='flex items-start gap-3'>
            <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0'>
              1
            </div>
            <div>
              <p className='text-sm font-medium text-gray-900 dark:text-white'>
                {t('wolkpay.howItWorks.step1.title')}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t('wolkpay.howItWorks.step1.desc')}
              </p>
            </div>
          </div>
          <div className='flex items-start gap-3'>
            <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0'>
              2
            </div>
            <div>
              <p className='text-sm font-medium text-gray-900 dark:text-white'>
                {t('wolkpay.howItWorks.step2.title')}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t('wolkpay.howItWorks.step2.desc')}
              </p>
            </div>
          </div>
          <div className='flex items-start gap-3'>
            <div className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0'>
              3
            </div>
            <div>
              <p className='text-sm font-medium text-gray-900 dark:text-white'>
                {t('wolkpay.howItWorks.step3.title')}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {t('wolkpay.howItWorks.step3.desc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm'>
        {/* Crypto Selector */}
        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            {t('wolkpay.selectCrypto')}
          </label>
          <button
            onClick={() => setShowCryptoSelect(!showCryptoSelect)}
            className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-500 transition-colors'
          >
            <div className='flex items-center gap-3'>
              {selectedCrypto?.symbol && CRYPTO_LOGOS[selectedCrypto.symbol] ? (
                <img
                  src={CRYPTO_LOGOS[selectedCrypto.symbol]}
                  alt={selectedCrypto.symbol}
                  className='w-10 h-10 rounded-full'
                />
              ) : (
                <div className='w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center'>
                  <span className='text-white font-bold text-sm'>
                    {selectedCrypto?.symbol?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              <div className='text-left'>
                <p className='font-semibold text-gray-900 dark:text-white'>
                  {selectedCrypto?.symbol}
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>{selectedCrypto?.name}</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${showCryptoSelect ? 'rotate-180' : ''}`}
            />
          </button>

          {showCryptoSelect && (
            <div className='mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden max-h-80 overflow-y-auto'>
              {/* Stablecoins primeiro */}
              <div className='px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2'>
                <DollarSign className='w-4 h-4 text-green-600 dark:text-green-400' />
                <span className='text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide'>
                  Stablecoins
                </span>
              </div>
              {SUPPORTED_CRYPTOS.filter(c => c.category === 'Stablecoin').map(crypto => (
                <button
                  key={crypto.symbol}
                  onClick={() => {
                    setSelectedCrypto(crypto)
                    setShowCryptoSelect(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedCrypto?.symbol === crypto.symbol ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {CRYPTO_LOGOS[crypto.symbol] ? (
                    <img
                      src={CRYPTO_LOGOS[crypto.symbol]}
                      alt={crypto.symbol}
                      className='w-8 h-8 rounded-full'
                    />
                  ) : (
                    <div className='w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center'>
                      <span className='text-white font-bold text-xs'>
                        {crypto.symbol.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className='text-left flex-1'>
                    <p className='font-medium text-gray-900 dark:text-white'>{crypto.symbol}</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>{crypto.name}</p>
                  </div>
                  {selectedCrypto?.symbol === crypto.symbol && (
                    <Check className='w-5 h-5 text-blue-500' />
                  )}
                </button>
              ))}

              {/* Moedas Nativas */}
              <div className='px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-y border-gray-200 dark:border-gray-700 flex items-center gap-2'>
                <Coins className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                <span className='text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide'>
                  Criptomoedas
                </span>
              </div>
              {SUPPORTED_CRYPTOS.filter(c => c.category === 'Native').map(crypto => (
                <button
                  key={crypto.symbol}
                  onClick={() => {
                    setSelectedCrypto(crypto)
                    setShowCryptoSelect(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedCrypto?.symbol === crypto.symbol ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {CRYPTO_LOGOS[crypto.symbol] ? (
                    <img
                      src={CRYPTO_LOGOS[crypto.symbol]}
                      alt={crypto.symbol}
                      className='w-8 h-8 rounded-full'
                    />
                  ) : (
                    <div className='w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center'>
                      <span className='text-white font-bold text-xs'>
                        {crypto.symbol.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className='text-left flex-1'>
                    <p className='font-medium text-gray-900 dark:text-white'>{crypto.symbol}</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>{crypto.name}</p>
                  </div>
                  {selectedCrypto?.symbol === crypto.symbol && (
                    <Check className='w-5 h-5 text-blue-500' />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className='mb-6'>
          <div className='flex items-center justify-between mb-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              {t('wolkpay.amount')}
            </label>
            <div className='flex gap-1'>
              <button
                onClick={() => setInputMode('fiat')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  inputMode === 'fiat'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                BRL
              </button>
              <button
                onClick={() => setInputMode('crypto')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  inputMode === 'crypto'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {selectedCrypto.symbol}
              </button>
            </div>
          </div>

          <div className='relative'>
            <div className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium'>
              {inputMode === 'fiat' ? 'R$' : selectedCrypto.symbol}
            </div>
            <input
              type='number'
              value={inputMode === 'fiat' ? fiatAmount : cryptoAmount}
              onChange={e =>
                inputMode === 'fiat'
                  ? setFiatAmount(e.target.value)
                  : setCryptoAmount(e.target.value)
              }
              placeholder='0,00'
              className='w-full pl-14 pr-4 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-xl font-semibold text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all'
            />
          </div>

          {/* Conversion display */}
          <div className='mt-2 flex items-center justify-between text-sm'>
            <span className='text-gray-500 dark:text-gray-400'>
              {inputMode === 'fiat'
                ? `≈ ${formatCrypto(calculatedCryptoAmount || 0, selectedCrypto.symbol)}`
                : `≈ ${formatCurrency(calculatedFiatAmount || 0)}`}
            </span>
            {currentPrice > 0 && (
              <span className='text-xs text-gray-400'>
                1 {selectedCrypto.symbol} = {formatCurrency(brlRate)}
              </span>
            )}
          </div>

          {/* Amount validation */}
          {fiatAmount && !isAmountValid && (
            <div className='mt-2 flex items-center gap-2 text-sm text-red-500'>
              <AlertCircle className='w-4 h-4' />
              <span>
                {calculatedFiatAmount < LIMITS.MIN_BRL
                  ? t('wolkpay.errors.minAmount', { min: formatCurrency(LIMITS.MIN_BRL) })
                  : t('wolkpay.errors.maxAmount', { max: formatCurrency(LIMITS.MAX_BRL) })}
              </span>
            </div>
          )}
        </div>

        {/* Fee Breakdown */}
        {calculatedFiatAmount > 0 && (
          <div className='mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl space-y-3'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500 dark:text-gray-400'>{t('wolkpay.baseAmount')}</span>
              <span className='text-gray-900 dark:text-white'>
                {formatCurrency(calculatedFiatAmount)}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500 dark:text-gray-400'>
                {t('wolkpay.serviceFee')} ({LIMITS.SERVICE_FEE}%)
              </span>
              <span className='text-gray-900 dark:text-white'>{formatCurrency(serviceFee)}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-500 dark:text-gray-400'>
                {t('wolkpay.networkFee')} ({LIMITS.NETWORK_FEE}%)
              </span>
              <span className='text-gray-900 dark:text-white'>{formatCurrency(networkFee)}</span>
            </div>
            <div className='pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between'>
              <span className='font-semibold text-gray-900 dark:text-white'>
                {t('wolkpay.totalToPay')}
              </span>
              <span className='font-bold text-lg text-blue-600 dark:text-blue-400'>
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400'>
            <AlertCircle className='w-5 h-5 shrink-0' />
            <span className='text-sm'>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleCreateInvoice}
          disabled={!canSubmit}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg transition-all ${
            canSubmit
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              {t('wolkpay.creating')}
            </>
          ) : (
            <>
              <Send className='w-5 h-5' />
              {t('wolkpay.createInvoice')}
            </>
          )}
        </button>
      </div>

      {/* Features */}
      <div className='grid grid-cols-2 gap-3'>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <Shield className='w-6 h-6 text-green-500 mb-2' />
          <p className='font-medium text-sm text-gray-900 dark:text-white'>
            {t('wolkpay.features.secure.title')}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('wolkpay.features.secure.desc')}
          </p>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <Zap className='w-6 h-6 text-yellow-500 mb-2' />
          <p className='font-medium text-sm text-gray-900 dark:text-white'>
            {t('wolkpay.features.instant.title')}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('wolkpay.features.instant.desc')}
          </p>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <Users className='w-6 h-6 text-blue-500 mb-2' />
          <p className='font-medium text-sm text-gray-900 dark:text-white'>
            {t('wolkpay.features.thirdParty.title')}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('wolkpay.features.thirdParty.desc')}
          </p>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <BadgeCheck className='w-6 h-6 text-purple-500 mb-2' />
          <p className='font-medium text-sm text-gray-900 dark:text-white'>
            {t('wolkpay.features.compliant.title')}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            {t('wolkpay.features.compliant.desc')}
          </p>
        </div>
      </div>

      {/* Limits Info */}
      <div className='bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50'>
        <div className='flex items-start gap-3'>
          <Info className='w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
          <div>
            <p className='font-medium text-sm text-amber-800 dark:text-amber-300'>
              {t('wolkpay.limits.title')}
            </p>
            <ul className='mt-1 text-xs text-amber-700 dark:text-amber-400 space-y-1'>
              <li>
                {t('wolkpay.limits.perOperation', {
                  min: formatCurrency(LIMITS.MIN_BRL),
                  max: formatCurrency(LIMITS.MAX_BRL),
                })}
              </li>
              <li>{t('wolkpay.limits.validity', { minutes: LIMITS.EXPIRY_MINUTES })}</li>
              <li>{t('wolkpay.limits.totalFee', { fee: LIMITS.TOTAL_FEE })}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WolkPayPage
