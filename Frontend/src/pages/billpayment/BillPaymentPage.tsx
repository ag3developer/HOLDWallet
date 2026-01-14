/**
 * BillPaymentPage - Página de Pagamento de Boletos
 * =================================================
 *
 * Permite pagar boletos bancários usando crypto.
 *
 * Fluxo:
 * 1. Escanear/digitar código de barras
 * 2. Sistema valida e mostra informações do boleto
 * 3. Selecionar crypto para pagamento
 * 4. Ver cotação com taxas (5%)
 * 5. Confirmar e debitar crypto IMEDIATAMENTE
 * 6. Boleto pago em até 24h úteis
 */

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Receipt,
  ScanBarcode,
  FileText,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ArrowRight,
  Clock,
  Wallet,
  Shield,
  Zap,
  History,
  RefreshCw,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Info,
  CreditCard,
  CircleDollarSign,
  Timer,
  BadgeCheck,
  XCircle,
  Camera,
} from 'lucide-react'
import billPaymentService, {
  BillInfo,
  BillPaymentQuote,
  BillPayment,
  BILL_PAYMENT_CONFIG,
  STATUS_CONFIG,
  BILL_TYPE_CONFIG,
} from '@/services/billPayment'
import { usePrices } from '@/hooks/usePrices'
import { BarcodeScanner } from '@/components/scanner'

// Logos das cryptos - usando CoinGecko
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  TRX: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
}

// Cryptos suportadas para pagamento
const SUPPORTED_CRYPTOS = [
  { symbol: 'USDT', name: 'Tether USD', network: 'TRC20', category: 'Stablecoin' },
  { symbol: 'USDC', name: 'USD Coin', network: 'ERC20', category: 'Stablecoin' },
  { symbol: 'BTC', name: 'Bitcoin', network: 'bitcoin', category: 'Native' },
  { symbol: 'ETH', name: 'Ethereum', network: 'ethereum', category: 'Native' },
  { symbol: 'BNB', name: 'BNB Chain', network: 'bsc', category: 'Native' },
  { symbol: 'TRX', name: 'TRON', network: 'tron', category: 'Native' },
  { symbol: 'SOL', name: 'Solana', network: 'solana', category: 'Native' },
  { symbol: 'MATIC', name: 'Polygon', network: 'polygon', category: 'Native' },
]

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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

type Step = 'input' | 'validating' | 'select_crypto' | 'quote' | 'confirming' | 'success'

export function BillPaymentPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Estados
  const [step, setStep] = useState<Step>('input')
  const [barcode, setBarcode] = useState('')
  const [billInfo, setBillInfo] = useState<BillInfo | null>(null)
  const [selectedCrypto, setSelectedCrypto] = useState<(typeof SUPPORTED_CRYPTOS)[0] | null>(null)
  const [showCryptoDropdown, setShowCryptoDropdown] = useState(false)
  const [quote, setQuote] = useState<BillPaymentQuote | null>(null)
  const [payment, setPayment] = useState<BillPayment | null>(null)
  const [confirmDebit, setConfirmDebit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quoteTimeLeft, setQuoteTimeLeft] = useState(0)
  const [copiedBarcode, setCopiedBarcode] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // Callback quando scanner detecta código
  const handleScanResult = (scannedCode: string) => {
    setBarcode(scannedCode)
    setShowScanner(false)
    // Auto-validar após scan
    setTimeout(() => {
      handleValidate(scannedCode)
    }, 300)
  }

  // Timer da cotação
  useEffect(() => {
    if (quote && step === 'quote') {
      const expiresAt = new Date(quote.quote_expires_at).getTime()

      const timer = setInterval(() => {
        const now = Date.now()
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000))
        setQuoteTimeLeft(diff)

        if (diff <= 0) {
          clearInterval(timer)
          setError('Cotação expirada. Por favor, tente novamente.')
          setStep('select_crypto')
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [quote, step])

  // Focar no input ao carregar
  useEffect(() => {
    if (step === 'input' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [step])

  // Validar boleto
  const handleValidate = async (codeToValidate?: string) => {
    const code = codeToValidate || barcode
    if (!code.trim()) {
      setError('Digite o código de barras do boleto')
      return
    }

    setLoading(true)
    setError(null)
    setStep('validating')

    try {
      const result = await billPaymentService.validateBill(code.trim())
      setBillInfo(result)

      if (result.valid) {
        setStep('select_crypto')
      } else {
        setError(result.error_message || 'Boleto inválido')
        setStep('input')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao validar boleto'
      setError(errorMessage)
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  // Gerar cotação
  const handleCreateQuote = async () => {
    if (!selectedCrypto || !billInfo) return

    setLoading(true)
    setError(null)

    try {
      const result = await billPaymentService.createQuote({
        barcode: barcode.trim(),
        crypto_currency: selectedCrypto.symbol,
        crypto_network: selectedCrypto.network,
      })

      setQuote(result)
      setStep('quote')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar cotação'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Confirmar pagamento
  const handleConfirmPayment = async () => {
    if (!quote || !confirmDebit) return

    setLoading(true)
    setError(null)
    setStep('confirming')

    try {
      const result = await billPaymentService.confirmPayment({
        quote_id: quote.quote_id,
        confirm_debit: true,
      })

      setPayment(result)
      setStep('success')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar pagamento'
      setError(errorMessage)
      setStep('quote')
    } finally {
      setLoading(false)
    }
  }

  // Copiar código de barras
  const copyBarcode = () => {
    navigator.clipboard.writeText(barcode)
    setCopiedBarcode(true)
    setTimeout(() => setCopiedBarcode(false), 2000)
  }

  // Reset
  const handleReset = () => {
    setStep('input')
    setBarcode('')
    setBillInfo(null)
    setSelectedCrypto(null)
    setQuote(null)
    setPayment(null)
    setConfirmDebit(false)
    setError(null)
  }

  // Formatar tempo restante
  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 pb-20'>
      {/* Header */}
      <div className='bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-700 dark:to-purple-700'>
        <div className='max-w-2xl mx-auto px-4 py-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-xl font-bold text-white flex items-center gap-2'>
                <Receipt className='w-6 h-6' />
                Pagar Boleto
              </h1>
              <p className='text-violet-100 text-sm mt-1'>Pague boletos usando suas criptomoedas</p>
            </div>
            <button
              onClick={() => navigate('/bill-payment/history')}
              className='flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors'
            >
              <History className='w-4 h-4' />
              <span className='hidden sm:inline'>Histórico</span>
            </button>
          </div>
        </div>
      </div>

      <div className='max-w-2xl mx-auto px-4 -mt-4'>
        {/* Card Principal */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
          {/* Step Indicator */}
          <div className='px-6 pt-6'>
            <div className='flex items-center justify-between mb-6'>
              {[
                { step: 'input', label: 'Boleto', icon: ScanBarcode },
                { step: 'select_crypto', label: 'Crypto', icon: Wallet },
                { step: 'quote', label: 'Cotação', icon: CircleDollarSign },
                { step: 'success', label: 'Pronto', icon: CheckCircle },
              ].map((s, i, arr) => {
                const Icon = s.icon
                const isActive =
                  step === s.step ||
                  (s.step === 'input' && step === 'validating') ||
                  (s.step === 'quote' && step === 'confirming')
                const isCompleted =
                  (s.step === 'input' &&
                    ['select_crypto', 'quote', 'confirming', 'success'].includes(step)) ||
                  (s.step === 'select_crypto' &&
                    ['quote', 'confirming', 'success'].includes(step)) ||
                  (s.step === 'quote' && step === 'success')

                return (
                  <React.Fragment key={s.step}>
                    <div className='flex flex-col items-center'>
                      <div
                        className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all
                        ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isActive
                              ? 'bg-violet-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }
                      `}
                      >
                        {isCompleted ? <Check className='w-5 h-5' /> : <Icon className='w-5 h-5' />}
                      </div>
                      <span
                        className={`text-xs mt-1 ${isActive || isCompleted ? 'text-violet-600 dark:text-violet-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className='mx-6 mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-start gap-3'>
              <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
              <div>
                <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
              </div>
            </div>
          )}

          {/* Step: Input */}
          {(step === 'input' || step === 'validating') && (
            <div className='p-6 pt-0'>
              <div className='text-center mb-6'>
                <div className='w-16 h-16 mx-auto bg-violet-100 dark:bg-violet-500/20 rounded-2xl flex items-center justify-center mb-4'>
                  <ScanBarcode className='w-8 h-8 text-violet-600 dark:text-violet-400' />
                </div>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  Digite ou escaneie o código de barras
                </h2>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                  Cole, digite ou use a câmera para ler o boleto
                </p>
              </div>

              <div className='space-y-4'>
                {/* Botão de Scanner */}
                <button
                  onClick={() => setShowScanner(true)}
                  disabled={loading}
                  className='w-full py-4 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-violet-500/25'
                >
                  <Camera className='w-6 h-6' />
                  <span>Escanear Código de Barras</span>
                </button>

                <div className='flex items-center gap-4'>
                  <div className='flex-1 h-px bg-gray-200 dark:bg-gray-700' />
                  <span className='text-xs text-gray-400 dark:text-gray-500 uppercase font-medium'>
                    ou digite
                  </span>
                  <div className='flex-1 h-px bg-gray-200 dark:bg-gray-700' />
                </div>

                <div>
                  <label
                    htmlFor='barcode-input'
                    className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
                  >
                    Código de Barras
                  </label>
                  <input
                    id='barcode-input'
                    ref={inputRef}
                    type='text'
                    value={barcode}
                    onChange={e => setBarcode(e.target.value.replaceAll(/\D/g, ''))}
                    placeholder='00000.00000 00000.000000 00000.000000 0 00000000000000'
                    className='w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all font-mono text-sm'
                    disabled={loading}
                  />
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
                    {barcode.length > 0 ? `${barcode.length} dígitos` : 'Entre 44 e 48 dígitos'}
                  </p>
                </div>

                <button
                  onClick={() => handleValidate()}
                  disabled={loading || barcode.length < 44}
                  className='w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed'
                >
                  {loading ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Validando...
                    </>
                  ) : (
                    <>
                      Validar Boleto
                      <ArrowRight className='w-5 h-5' />
                    </>
                  )}
                </button>
              </div>

              {/* Info Cards */}
              <div className='mt-6 grid grid-cols-2 gap-3'>
                <div className='p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
                  <div className='flex items-center gap-2 text-gray-600 dark:text-gray-400'>
                    <Shield className='w-4 h-4' />
                    <span className='text-xs font-medium'>100% Seguro</span>
                  </div>
                </div>
                <div className='p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
                  <div className='flex items-center gap-2 text-gray-600 dark:text-gray-400'>
                    <Zap className='w-4 h-4' />
                    <span className='text-xs font-medium'>Taxa: 5%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Select Crypto */}
          {step === 'select_crypto' && billInfo && (
            <div className='p-6 pt-0'>
              {/* Bill Info */}
              <div className='bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 rounded-xl p-4 mb-6 border border-violet-100 dark:border-violet-500/20'>
                <div className='flex items-start justify-between mb-3'>
                  <div className='flex items-center gap-2'>
                    <FileText className='w-5 h-5 text-violet-600 dark:text-violet-400' />
                    <span className='font-medium text-gray-900 dark:text-white'>
                      {BILL_TYPE_CONFIG[billInfo.bill_type]?.label || 'Boleto'}
                    </span>
                  </div>
                  <button
                    onClick={copyBarcode}
                    className='p-2 hover:bg-violet-100 dark:hover:bg-violet-500/20 rounded-lg transition-colors'
                  >
                    {copiedBarcode ? (
                      <Check className='w-4 h-4 text-green-500' />
                    ) : (
                      <Copy className='w-4 h-4 text-gray-400' />
                    )}
                  </button>
                </div>

                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Valor:</span>
                    <span className='text-lg font-bold text-violet-600 dark:text-violet-400'>
                      {formatCurrency(billInfo.amount_brl)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Vencimento:</span>
                    <span className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1'>
                      <Calendar className='w-4 h-4' />
                      {formatDate(billInfo.due_date)}
                      {billInfo.days_until_due > 0 && (
                        <span className='text-xs text-green-600 dark:text-green-400 ml-1'>
                          ({billInfo.days_until_due} dias)
                        </span>
                      )}
                    </span>
                  </div>
                  {billInfo.bank_name && (
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>Banco:</span>
                      <span className='text-sm text-gray-900 dark:text-white flex items-center gap-1'>
                        <Building2 className='w-4 h-4' />
                        {billInfo.bank_name}
                      </span>
                    </div>
                  )}
                  {billInfo.beneficiary_name && (
                    <div className='flex justify-between'>
                      <span className='text-sm text-gray-600 dark:text-gray-400'>
                        Beneficiário:
                      </span>
                      <span className='text-sm text-gray-900 dark:text-white'>
                        {billInfo.beneficiary_name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status do Boleto */}
                {billInfo.status && (
                  <div
                    className={`mt-4 p-3 rounded-lg ${
                      billInfo.is_overdue
                        ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30'
                        : billInfo.status === 'valid'
                          ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                          : 'bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className='flex items-start gap-2'>
                      {billInfo.is_overdue ? (
                        <AlertTriangle className='w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5' />
                      ) : billInfo.status === 'valid' ? (
                        <CheckCircle className='w-5 h-5 text-green-500 flex-shrink-0 mt-0.5' />
                      ) : (
                        <Info className='w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5' />
                      )}
                      <div className='flex-1'>
                        <p
                          className={`text-sm font-medium ${
                            billInfo.is_overdue
                              ? 'text-amber-700 dark:text-amber-400'
                              : billInfo.status === 'valid'
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {billInfo.status_message}
                        </p>

                        {/* Detalhes de Multa e Juros */}
                        {billInfo.is_overdue &&
                          (billInfo.fine_amount_brl || billInfo.interest_amount_brl) && (
                            <div className='mt-2 space-y-1'>
                              {billInfo.original_amount_brl && (
                                <div className='flex justify-between text-xs'>
                                  <span className='text-gray-600 dark:text-gray-400'>
                                    Valor Original:
                                  </span>
                                  <span className='text-gray-900 dark:text-white'>
                                    {formatCurrency(billInfo.original_amount_brl)}
                                  </span>
                                </div>
                              )}
                              {billInfo.fine_amount_brl && billInfo.fine_amount_brl > 0 && (
                                <div className='flex justify-between text-xs'>
                                  <span className='text-amber-600 dark:text-amber-400'>
                                    Multa (2%):
                                  </span>
                                  <span className='text-amber-700 dark:text-amber-300'>
                                    + {formatCurrency(billInfo.fine_amount_brl)}
                                  </span>
                                </div>
                              )}
                              {billInfo.interest_amount_brl && billInfo.interest_amount_brl > 0 && (
                                <div className='flex justify-between text-xs'>
                                  <span className='text-amber-600 dark:text-amber-400'>Juros:</span>
                                  <span className='text-amber-700 dark:text-amber-300'>
                                    + {formatCurrency(billInfo.interest_amount_brl)}
                                  </span>
                                </div>
                              )}
                              <div className='flex justify-between text-xs font-medium pt-1 border-t border-amber-200 dark:border-amber-500/30'>
                                <span className='text-gray-700 dark:text-gray-300'>
                                  Total a Pagar:
                                </span>
                                <span className='text-violet-600 dark:text-violet-400'>
                                  {formatCurrency(billInfo.amount_brl)}
                                </span>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Disclaimer sobre Multas/Juros */}
                {billInfo.fees_disclaimer && (
                  <div className='mt-3 p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30'>
                    <p className='text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5'>
                      <Info className='w-3.5 h-3.5 flex-shrink-0' />
                      {billInfo.fees_disclaimer}
                    </p>
                  </div>
                )}
              </div>

              {/* Crypto Selection */}
              <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                Selecione a criptomoeda para pagar
              </h3>

              <div className='relative mb-4'>
                <button
                  onClick={() => setShowCryptoDropdown(!showCryptoDropdown)}
                  className='w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl flex items-center justify-between hover:border-violet-400 dark:hover:border-violet-500 transition-colors'
                >
                  {selectedCrypto ? (
                    <div className='flex items-center gap-3'>
                      <img
                        src={CRYPTO_LOGOS[selectedCrypto.symbol]}
                        alt={selectedCrypto.symbol}
                        className='w-8 h-8 rounded-full'
                      />
                      <div className='text-left'>
                        <p className='font-medium text-gray-900 dark:text-white'>
                          {selectedCrypto.symbol}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {selectedCrypto.name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className='text-gray-400'>Selecione uma crypto</span>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${showCryptoDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showCryptoDropdown && (
                  <div className='absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-64 overflow-y-auto'>
                    {SUPPORTED_CRYPTOS.map(crypto => (
                      <button
                        key={crypto.symbol}
                        onClick={() => {
                          setSelectedCrypto(crypto)
                          setShowCryptoDropdown(false)
                        }}
                        className='w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
                      >
                        <img
                          src={CRYPTO_LOGOS[crypto.symbol]}
                          alt={crypto.symbol}
                          className='w-8 h-8 rounded-full'
                        />
                        <div className='text-left flex-1'>
                          <p className='font-medium text-gray-900 dark:text-white'>
                            {crypto.symbol}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400'>
                            {crypto.name} • {crypto.network}
                          </p>
                        </div>
                        {crypto.category === 'Stablecoin' && (
                          <span className='px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded-full'>
                            Estável
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateQuote}
                disabled={loading || !selectedCrypto}
                className='w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed'
              >
                {loading ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    Cotando...
                  </>
                ) : (
                  <>
                    Ver Cotação
                    <ArrowRight className='w-5 h-5' />
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className='w-full mt-3 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors'
              >
                Voltar e digitar outro boleto
              </button>
            </div>
          )}

          {/* Step: Quote */}
          {(step === 'quote' || step === 'confirming') && quote && (
            <div className='p-6 pt-0'>
              {/* Timer */}
              <div
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl mb-6 ${
                  quoteTimeLeft <= 60
                    ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                    : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
              >
                <Timer className='w-5 h-5' />
                <span className='font-medium'>
                  Cotação válida por: {formatTimeLeft(quoteTimeLeft)}
                </span>
              </div>

              {/* Quote Summary */}
              <div className='bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 mb-6'>
                <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-4'>
                  Resumo do Pagamento
                </h3>

                <div className='space-y-3'>
                  <div className='flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-600'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Valor do Boleto
                    </span>
                    <span className='font-medium text-gray-900 dark:text-white'>
                      {formatCurrency(quote.bill_amount_brl)}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Taxa de Serviço ({quote.service_fee_percent}%)
                    </span>
                    <span className='text-sm text-gray-900 dark:text-white'>
                      {formatCurrency(quote.service_fee_brl)}
                    </span>
                  </div>

                  <div className='flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-600'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      Taxa de Rede ({quote.network_fee_percent}%)
                    </span>
                    <span className='text-sm text-gray-900 dark:text-white'>
                      {formatCurrency(quote.network_fee_brl)}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='font-medium text-gray-900 dark:text-white'>Total em BRL</span>
                    <span className='text-lg font-bold text-violet-600 dark:text-violet-400'>
                      {formatCurrency(quote.total_amount_brl)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Crypto Amount */}
              <div className='bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl p-4 mb-6 text-white'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-violet-200 text-sm'>Você vai pagar</p>
                    <p className='text-2xl font-bold mt-1'>
                      {formatCrypto(quote.total_crypto_amount, quote.crypto_currency)}
                    </p>
                  </div>
                  <img
                    src={CRYPTO_LOGOS[quote.crypto_currency]}
                    alt={quote.crypto_currency}
                    className='w-12 h-12 rounded-full bg-white/10 p-1'
                  />
                </div>
                <p className='text-xs text-violet-200 mt-2'>
                  Cotação: 1 {quote.crypto_currency} = R${' '}
                  {(quote.crypto_usd_rate * quote.brl_usd_rate).toFixed(2)}
                </p>
              </div>

              {/* Balance Check */}
              <div
                className={`p-4 rounded-xl mb-6 ${
                  quote.has_sufficient_balance
                    ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30'
                    : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'
                }`}
              >
                <div className='flex items-center gap-3'>
                  {quote.has_sufficient_balance ? (
                    <CheckCircle className='w-5 h-5 text-green-500' />
                  ) : (
                    <XCircle className='w-5 h-5 text-red-500' />
                  )}
                  <div>
                    <p
                      className={`font-medium ${
                        quote.has_sufficient_balance
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {quote.has_sufficient_balance ? 'Saldo suficiente' : 'Saldo insuficiente'}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      Seu saldo: {formatCrypto(quote.user_crypto_balance, quote.crypto_currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Confirm Checkbox */}
              {quote.has_sufficient_balance && (
                <label className='flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl mb-6 cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={confirmDebit}
                    onChange={e => setConfirmDebit(e.target.checked)}
                    className='w-5 h-5 mt-0.5 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
                  />
                  <div className='text-sm'>
                    <p className='font-medium text-amber-700 dark:text-amber-400'>
                      Confirmo o débito imediato
                    </p>
                    <p className='text-amber-600 dark:text-amber-300/80 mt-1'>
                      Entendo que {formatCrypto(quote.total_crypto_amount, quote.crypto_currency)}{' '}
                      será debitado da minha carteira agora e o boleto será pago em até 24h úteis.
                    </p>
                  </div>
                </label>
              )}

              {/* Actions */}
              <div className='space-y-3'>
                <button
                  onClick={handleConfirmPayment}
                  disabled={loading || !confirmDebit || !quote.has_sufficient_balance}
                  className='w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed'
                >
                  {loading ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Processando...
                    </>
                  ) : (
                    <>
                      <BadgeCheck className='w-5 h-5' />
                      Confirmar Pagamento
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep('select_crypto')}
                  disabled={loading}
                  className='w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors'
                >
                  Voltar e escolher outra crypto
                </button>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && payment && (
            <div className='p-6 pt-0'>
              <div className='text-center mb-6'>
                <div className='w-20 h-20 mx-auto bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4'>
                  <CheckCircle className='w-10 h-10 text-green-600 dark:text-green-400' />
                </div>
                <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                  Pagamento Iniciado!
                </h2>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-2'>
                  Sua crypto foi debitada e o boleto será pago em breve.
                </p>
              </div>

              {/* Payment Info */}
              <div className='bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 mb-6'>
                <div className='flex items-center justify-between mb-3'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>Número:</span>
                  <span className='font-mono text-sm text-gray-900 dark:text-white'>
                    {payment.payment_number}
                  </span>
                </div>
                <div className='flex items-center justify-between mb-3'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>Status:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[payment.status].bgColor} ${STATUS_CONFIG[payment.status].color}`}
                  >
                    {STATUS_CONFIG[payment.status].label}
                  </span>
                </div>
                <div className='flex items-center justify-between mb-3'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>Valor do Boleto:</span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {formatCurrency(payment.bill_amount_brl)}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>Crypto Debitada:</span>
                  <span className='font-medium text-violet-600 dark:text-violet-400'>
                    {formatCrypto(payment.crypto_amount, payment.crypto_currency)}
                  </span>
                </div>
              </div>

              {/* Status Message */}
              <div className='p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl mb-6'>
                <div className='flex items-start gap-3'>
                  <Info className='w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5' />
                  <p className='text-sm text-blue-700 dark:text-blue-300'>
                    {payment.status_message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className='space-y-3'>
                <button
                  onClick={() => navigate('/bill-payment/history')}
                  className='w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all'
                >
                  <History className='w-5 h-5' />
                  Ver Histórico
                </button>

                <button
                  onClick={handleReset}
                  className='w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors'
                >
                  Pagar outro boleto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className='mt-6 grid grid-cols-3 gap-3'>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center'>
            <Shield className='w-6 h-6 text-violet-600 dark:text-violet-400 mx-auto mb-2' />
            <p className='text-xs font-medium text-gray-900 dark:text-white'>Seguro</p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>100% protegido</p>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center'>
            <Zap className='w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto mb-2' />
            <p className='text-xs font-medium text-gray-900 dark:text-white'>Rápido</p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Pago em até 24h</p>
          </div>
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center'>
            <CreditCard className='w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2' />
            <p className='text-xs font-medium text-gray-900 dark:text-white'>Prático</p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>Sem burocracia</p>
          </div>
        </div>
      </div>

      {/* Scanner de Código de Barras */}
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleScanResult}
        onClose={() => setShowScanner(false)}
      />
    </div>
  )
}

export default BillPaymentPage
