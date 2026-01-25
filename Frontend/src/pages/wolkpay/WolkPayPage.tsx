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
  Clock,
  Shield,
  Zap,
  Copy,
  Check,
  ChevronDown,
  AlertCircle,
  Share2,
  ExternalLink,
  History,
  Coins,
  DollarSign,
  TrendingUp,
  Users,
  Globe,
  Sparkles,
  BadgeCheck,
  ArrowRight,
  QrCode,
  Wallet,
  CircleDollarSign,
  Timer,
  Eye,
} from 'lucide-react'
import { usePrices } from '@/hooks/usePrices'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import wolkPayService, {
  CreateInvoiceRequest,
  InvoiceCreatedResponse,
  WolkPayConfig,
} from '@/services/wolkpay'

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

// Constantes de limites - VALORES PADRÃO (serão sobrescritos pelo backend)
const DEFAULT_LIMITS = {
  MIN_BRL: 100,
  MAX_BRL: 15000,
  SERVICE_FEE: 3.65,
  NETWORK_FEE: 0.15,
  TOTAL_FEE: 3.8,
  EXPIRY_MINUTES: 15,
}

const formatCurrency = (amount: number, currency = 'BRL') => {
  const locale = currency === 'BRL' ? 'pt-BR' : currency === 'EUR' ? 'de-DE' : 'en-US'
  return new Intl.NumberFormat(locale, {
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
  const { currency: userCurrency } = useCurrencyStore()

  // WolkPay sempre trabalha em BRL (PIX é brasileiro)
  // Mas mostramos equivalência na moeda do usuário para conveniência

  // Estado das configurações (taxas/limites) do backend
  const [config, setConfig] = useState<WolkPayConfig | null>(null)

  // Valores efetivos (do backend ou padrão)
  const LIMITS = {
    MIN_BRL: config?.min_amount_brl ?? DEFAULT_LIMITS.MIN_BRL,
    MAX_BRL: config?.max_amount_brl ?? DEFAULT_LIMITS.MAX_BRL,
    SERVICE_FEE: config?.service_fee_percentage ?? DEFAULT_LIMITS.SERVICE_FEE,
    NETWORK_FEE: config?.network_fee_percentage ?? DEFAULT_LIMITS.NETWORK_FEE,
    TOTAL_FEE: config?.total_fee_percentage ?? DEFAULT_LIMITS.TOTAL_FEE,
    EXPIRY_MINUTES: config?.expiry_minutes ?? DEFAULT_LIMITS.EXPIRY_MINUTES,
  }

  // Buscar configurações do backend ao montar o componente
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configData = await wolkPayService.getConfig()
        console.log('📊 WolkPay config loaded:', configData)
        setConfig(configData)
      } catch (err) {
        console.error('⚠️ Failed to load WolkPay config, using defaults:', err)
        // Continua usando os valores padrão
      }
    }
    fetchConfig()
  }, [])

  // Buscar preços em BRL (cotação real do mercado - base para PIX)
  const { prices: pricesBRL } = usePrices(
    SUPPORTED_CRYPTOS.map(c => c.symbol),
    'BRL'
  )

  // Buscar cotação USD/BRL e na moeda do usuário usando USDT como referência
  const { prices: usdtPriceBRL } = usePrices(['USDT'], 'BRL')
  const { prices: usdtPriceUser } = usePrices(userCurrency !== 'BRL' ? ['USDT'] : [], userCurrency)

  // Taxa de conversão BRL → moeda do usuário
  const usdBrlRate = usdtPriceBRL?.['USDT']?.price || 5.5
  const usdUserRate = usdtPriceUser?.['USDT']?.price || 1
  // BRL para moeda do usuário: BRL / (USDT em BRL) * (USDT em moeda do usuário)
  const brlToUserRate = userCurrency === 'BRL' ? 1 : (1 / usdBrlRate) * usdUserRate

  // Função para converter BRL para moeda do usuário
  const convertBRLtoUserCurrency = (brlAmount: number) => {
    if (userCurrency === 'BRL') return brlAmount
    return brlAmount * brlToUserRate
  }

  // Função para formatar na moeda do usuário
  const formatUserCurrency = (brlAmount: number) => {
    const converted = convertBRLtoUserCurrency(brlAmount)
    return formatCurrency(converted, userCurrency)
  }

  // Estado do formulário
  const [selectedCrypto, setSelectedCrypto] = useState(SUPPORTED_CRYPTOS[0])
  const [showCryptoSelect, setShowCryptoSelect] = useState(false)
  const [inputMode, setInputMode] = useState<'crypto' | 'fiat'>('fiat')
  const [fiatAmount, setFiatAmount] = useState('')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [feePayer, setFeePayer] = useState<'BENEFICIARY' | 'PAYER'>('BENEFICIARY')
  const [showFeeDetails, setShowFeeDetails] = useState(false) // Controla se mostra detalhes das taxas

  // Estado de loading/error
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado do resultado
  const [createdInvoice, setCreatedInvoice] = useState<InvoiceCreatedResponse | null>(null)
  const [copied, setCopied] = useState(false)

  // Preço atual em BRL (cotação real)
  const currentPriceBRL = pricesBRL?.[selectedCrypto?.symbol]?.price || 0
  const brlRate = currentPriceBRL // Já está em BRL, não precisa converter

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
  const totalFees = serviceFee + networkFee

  // Cálculo baseado em quem paga as taxas
  const totalAmount =
    feePayer === 'PAYER'
      ? calculatedFiatAmount + totalFees // Pagador paga: valor + taxas
      : calculatedFiatAmount // Beneficiário paga: pagador só paga o valor

  const beneficiaryReceives =
    feePayer === 'PAYER'
      ? calculatedFiatAmount // Pagador paga: beneficiário recebe valor cheio
      : calculatedFiatAmount - totalFees // Beneficiário paga: recebe valor - taxas

  // Crypto que o beneficiário vai receber
  const beneficiaryReceivesCrypto = brlRate > 0 ? beneficiaryReceives / brlRate : 0

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
        fee_payer: feePayer,
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
                  // Usar valor LÍQUIDO se disponível, senão calcular
                  createdInvoice.invoice.beneficiary_receives_crypto ||
                    (createdInvoice.invoice.fee_payer === 'PAYER'
                      ? createdInvoice.invoice.crypto_amount
                      : createdInvoice.invoice.crypto_amount * 0.9655), // ~3.45% taxa
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
    <div key={i18n.language} className='space-y-5 pb-24'>
      {/* ============================================ */}
      {/* HERO HEADER - Premium Design */}
      {/* ============================================ */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-5'>
        {/* Background decorations */}
        <div className='absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2' />
        <div className='absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2' />

        <div className='relative'>
          {/* Header row */}
          <div className='flex items-start justify-between mb-4'>
            <div>
              <div className='flex items-center gap-2 mb-1'>
                <span className='px-2 py-0.5 text-[10px] font-bold bg-yellow-400 text-yellow-900 rounded-full uppercase tracking-wide'>
                  Exclusivo
                </span>
              </div>
              <h1 className='text-2xl font-bold text-white flex items-center gap-2'>
                <CircleDollarSign className='w-7 h-7' />
                WolkPay
              </h1>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={() => navigate('/wolkpay/history')}
                className='p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors'
                title='Histórico'
              >
                <Eye className='w-5 h-5 text-white' />
              </button>
              <button
                onClick={() => navigate('/wolkpay/history')}
                className='px-3 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-lg'
              >
                <History className='w-4 h-4' />
                Histórico
              </button>
            </div>
          </div>

          {/* Badges de features */}
          <div className='flex flex-wrap gap-2 mb-4'>
            <span className='px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1.5'>
              <Shield className='w-3 h-3' /> 100% Seguro
            </span>
            <span className='px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1.5'>
              <QrCode className='w-3 h-3' /> PIX Instantâneo
            </span>
            <span className='px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1.5'>
              <Wallet className='w-3 h-3' /> Receba em Crypto
            </span>
          </div>

          {/* Stats Grid */}
          <div className='grid grid-cols-4 gap-2'>
            <div className='bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-white/70 text-[10px] mb-0.5'>
                <Timer className='w-3 h-3' /> VALIDADE
              </div>
              <p className='text-white font-bold text-sm'>{LIMITS.EXPIRY_MINUTES}min</p>
            </div>
            <div className='bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-white/70 text-[10px] mb-0.5'>
                <TrendingUp className='w-3 h-3' /> MÍN
              </div>
              <p className='text-white font-bold text-sm'>R$ {LIMITS.MIN_BRL}</p>
            </div>
            <div className='bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-white/70 text-[10px] mb-0.5'>
                <Globe className='w-3 h-3' /> MÁX
              </div>
              <p className='text-white font-bold text-sm'>R$ {LIMITS.MAX_BRL.toLocaleString()}</p>
            </div>
            <div className='bg-white/10 backdrop-blur-sm rounded-xl p-2.5 text-center'>
              <div className='flex items-center justify-center gap-1 text-white/70 text-[10px] mb-0.5'>
                <Zap className='w-3 h-3 text-yellow-300' /> TAXA
              </div>
              <p className='text-green-300 font-bold text-sm'>{LIMITS.TOTAL_FEE}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* HOW IT WORKS - 3 Steps */}
      {/* ============================================ */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700'>
        <h3 className='text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
          <Sparkles className='w-4 h-4 text-blue-500' />
          Como funciona?
        </h3>
        <div className='flex items-center gap-2'>
          <div className='flex-1 text-center'>
            <div className='w-8 h-8 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm mb-1'>
              1
            </div>
            <p className='text-[10px] text-gray-600 dark:text-gray-400'>Crie a fatura</p>
          </div>
          <ArrowRight className='w-4 h-4 text-gray-300 shrink-0' />
          <div className='flex-1 text-center'>
            <div className='w-8 h-8 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm mb-1'>
              2
            </div>
            <p className='text-[10px] text-gray-600 dark:text-gray-400'>Envie o link</p>
          </div>
          <ArrowRight className='w-4 h-4 text-gray-300 shrink-0' />
          <div className='flex-1 text-center'>
            <div className='w-8 h-8 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-sm mb-1'>
              3
            </div>
            <p className='text-[10px] text-gray-600 dark:text-gray-400'>Receba crypto</p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* MAIN FORM CARD */}
      {/* ============================================ */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm'>
        <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
          <Send className='w-5 h-5 text-blue-500' />
          Criar Nova Fatura
        </h2>

        {/* Crypto Selector */}
        <div className='mb-4'>
          <label className='block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide'>
            Receber em
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
                  className='w-8 h-8 rounded-full'
                />
              ) : (
                <div className='w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center'>
                  <span className='text-white font-bold text-xs'>
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

          {/* Crypto Dropdown */}
          {showCryptoSelect && (
            <div className='mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden max-h-64 overflow-y-auto'>
              {/* Stablecoins */}
              <div className='px-3 py-2 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2'>
                <DollarSign className='w-4 h-4 text-green-600 dark:text-green-400' />
                <span className='text-xs font-semibold text-green-700 dark:text-green-400 uppercase'>
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
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedCrypto?.symbol === crypto.symbol ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {CRYPTO_LOGOS[crypto.symbol] ? (
                    <img
                      src={CRYPTO_LOGOS[crypto.symbol]}
                      alt={crypto.symbol}
                      className='w-6 h-6 rounded-full'
                    />
                  ) : (
                    <div className='w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center'>
                      <span className='text-white font-bold text-[10px]'>
                        {crypto.symbol.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className='text-sm font-medium text-gray-900 dark:text-white flex-1 text-left'>
                    {crypto.symbol}
                  </span>
                  <span className='text-xs text-gray-400'>{crypto.name}</span>
                  {selectedCrypto?.symbol === crypto.symbol && (
                    <Check className='w-4 h-4 text-blue-500' />
                  )}
                </button>
              ))}

              {/* Criptomoedas */}
              <div className='px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border-y border-gray-200 dark:border-gray-700 flex items-center gap-2'>
                <Coins className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                <span className='text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase'>
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
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedCrypto?.symbol === crypto.symbol ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {CRYPTO_LOGOS[crypto.symbol] ? (
                    <img
                      src={CRYPTO_LOGOS[crypto.symbol]}
                      alt={crypto.symbol}
                      className='w-6 h-6 rounded-full'
                    />
                  ) : (
                    <div className='w-6 h-6 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center'>
                      <span className='text-white font-bold text-[10px]'>
                        {crypto.symbol.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className='text-sm font-medium text-gray-900 dark:text-white flex-1 text-left'>
                    {crypto.symbol}
                  </span>
                  <span className='text-xs text-gray-400'>{crypto.name}</span>
                  {selectedCrypto?.symbol === crypto.symbol && (
                    <Check className='w-4 h-4 text-blue-500' />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-2'>
            <label className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'>
              Valor
            </label>
            <div className='flex gap-1'>
              <button
                onClick={() => setInputMode('fiat')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  inputMode === 'fiat'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                BRL
              </button>
              <button
                onClick={() => setInputMode('crypto')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  inputMode === 'crypto'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {selectedCrypto?.symbol || 'USDT'}
              </button>
            </div>
          </div>

          <div className='relative'>
            <div className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium'>
              {inputMode === 'fiat' ? 'R$' : selectedCrypto?.symbol}
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
              className={`w-full py-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-xl font-bold text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all pr-4 ${
                inputMode === 'fiat' ? 'pl-12' : 'pl-16'
              }`}
            />
            {currentPriceBRL > 0 && (
              <div className='absolute right-4 top-1/2 -translate-y-1/2 text-right'>
                <p className='text-xs text-gray-500'>
                  ≈{' '}
                  {inputMode === 'fiat'
                    ? formatCrypto(calculatedCryptoAmount || 0, selectedCrypto?.symbol || 'USDT')
                    : formatCurrency(calculatedFiatAmount || 0)}
                </p>
              </div>
            )}
          </div>

          {/* Amount validation */}
          {fiatAmount && !isAmountValid && (
            <div className='mt-2 flex items-center gap-2 text-xs text-red-500'>
              <AlertCircle className='w-3.5 h-3.5' />
              <span>
                {calculatedFiatAmount < LIMITS.MIN_BRL
                  ? `Valor mínimo: ${formatCurrency(LIMITS.MIN_BRL)}`
                  : `Valor máximo: ${formatCurrency(LIMITS.MAX_BRL)}`}
              </span>
            </div>
          )}
        </div>

        {/* Fee Breakdown - Premium Design */}
        {calculatedFiatAmount > 0 && (
          <div className='mb-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/40 dark:to-gray-700/20 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden'>
            {/* Fee Payer Selection */}
            <div className='p-4 border-b border-gray-200 dark:border-gray-600'>
              <label className='block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide'>
                Quem paga as taxas?
              </label>
              <div className='grid grid-cols-2 gap-3'>
                <button
                  type='button'
                  onClick={() => setFeePayer('BENEFICIARY')}
                  className={`px-3 py-3 rounded-xl border-2 transition-all ${
                    feePayer === 'BENEFICIARY'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`font-semibold text-sm ${feePayer === 'BENEFICIARY' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    Eu pago taxa
                  </div>
                  <div className='text-xs text-gray-500 mt-0.5'>
                    Pagador: {formatCurrency(calculatedFiatAmount)}
                  </div>
                </button>
                <button
                  type='button'
                  onClick={() => setFeePayer('PAYER')}
                  className={`px-3 py-3 rounded-xl border-2 transition-all ${
                    feePayer === 'PAYER'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`font-semibold text-sm ${feePayer === 'PAYER' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    Pagador paga
                  </div>
                  <div className='text-xs text-gray-500 mt-0.5'>
                    Pagador: {formatCurrency(totalAmount)}
                  </div>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className='p-4 space-y-3'>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>Total a pagar:</span>
                <span className='font-bold text-xl text-blue-600 dark:text-blue-400'>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-sm text-gray-600 dark:text-gray-400'>Você recebe:</span>
                <div className='text-right'>
                  <span
                    className={`font-bold text-lg ${feePayer === 'PAYER' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
                  >
                    {formatCurrency(beneficiaryReceives)}
                  </span>
                  <p className='text-xs text-gray-400'>
                    ≈ {formatCrypto(beneficiaryReceivesCrypto, selectedCrypto?.symbol || 'USDT')}
                  </p>
                </div>
              </div>
            </div>

            {/* Fee Details Toggle */}
            <button
              type='button'
              onClick={() => setShowFeeDetails(!showFeeDetails)}
              className='w-full px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 transition-all'
            >
              <span>{showFeeDetails ? 'Ocultar detalhes' : 'Ver detalhes das taxas'}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showFeeDetails ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Fee Details */}
            <div
              className={`overflow-hidden transition-all duration-300 ${showFeeDetails ? 'max-h-48' : 'max-h-0'}`}
            >
              <div className='px-4 pb-4 pt-2 space-y-2 border-t border-gray-200 dark:border-gray-600'>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500'>Valor base</span>
                  <span className='text-gray-900 dark:text-white'>
                    {formatCurrency(calculatedFiatAmount)}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500'>Taxa de serviço ({LIMITS.SERVICE_FEE}%)</span>
                  <span className='text-gray-700 dark:text-gray-300'>
                    {formatCurrency(serviceFee)}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500'>Taxa de rede ({LIMITS.NETWORK_FEE}%)</span>
                  <span className='text-gray-700 dark:text-gray-300'>
                    {formatCurrency(networkFee)}
                  </span>
                </div>
                <div className='flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700'>
                  <span className='font-medium text-gray-700 dark:text-gray-300'>
                    Total taxas ({LIMITS.TOTAL_FEE}%)
                  </span>
                  <span className='font-semibold text-gray-900 dark:text-white'>
                    {formatCurrency(totalFees)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400'>
            <AlertCircle className='w-5 h-5 shrink-0' />
            <span className='text-sm'>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleCreateInvoice}
          disabled={!canSubmit}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg transition-all ${
            canSubmit
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
              Criando fatura...
            </>
          ) : (
            <>
              <Send className='w-5 h-5' />
              Criar Fatura
            </>
          )}
        </button>
      </div>

      {/* ============================================ */}
      {/* FEATURES GRID */}
      {/* ============================================ */}
      <div className='grid grid-cols-2 gap-3'>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <div className='w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-3'>
            <Shield className='w-5 h-5 text-green-600 dark:text-green-400' />
          </div>
          <h3 className='font-semibold text-gray-900 dark:text-white text-sm mb-1'>100% Seguro</h3>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            Transações protegidas e verificadas
          </p>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <div className='w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mb-3'>
            <Zap className='w-5 h-5 text-yellow-600 dark:text-yellow-400' />
          </div>
          <h3 className='font-semibold text-gray-900 dark:text-white text-sm mb-1'>Instantâneo</h3>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Receba crypto em segundos</p>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3'>
            <Users className='w-5 h-5 text-blue-600 dark:text-blue-400' />
          </div>
          <h3 className='font-semibold text-gray-900 dark:text-white text-sm mb-1'>Terceiros</h3>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Qualquer pessoa pode pagar</p>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <div className='w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-3'>
            <BadgeCheck className='w-5 h-5 text-purple-600 dark:text-purple-400' />
          </div>
          <h3 className='font-semibold text-gray-900 dark:text-white text-sm mb-1'>Verificado</h3>
          <p className='text-xs text-gray-500 dark:text-gray-400'>KYC completo e compliance</p>
        </div>
      </div>

      {/* ============================================ */}
      {/* CTA BANNER */}
      {/* ============================================ */}
      <div className='bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl p-4 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center'>
            <Zap className='w-5 h-5 text-white' />
          </div>
          <div>
            <h4 className='font-semibold text-white text-sm'>Precisa de mais?</h4>
            <p className='text-white/80 text-xs'>Veja o P2P Marketplace</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/p2p')}
          className='p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors'
        >
          <ArrowRight className='w-5 h-5 text-white' />
        </button>
      </div>

      {/* ============================================ */}
      {/* FOOTER INFO */}
      {/* ============================================ */}
      <div className='flex items-center justify-center gap-4 text-[10px] text-gray-400 pt-2'>
        <span className='flex items-center gap-1'>
          <Shield className='w-3 h-3' /> SSL Seguro
        </span>
        <span className='flex items-center gap-1'>
          <BadgeCheck className='w-3 h-3' /> KYC Verificado
        </span>
        <span className='flex items-center gap-1'>
          <Clock className='w-3 h-3' /> 24/7 Online
        </span>
      </div>
    </div>
  )
}

export default WolkPayPage
