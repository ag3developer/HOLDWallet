/**
 * Gateway Checkout Page
 * =====================
 *
 * Pagina publica de checkout do WolkPay Gateway.
 * Design premium, clean e responsivo.
 *
 * Features:
 * - Selecao de metodo (PIX ou Crypto)
 * - QR Code dinamico
 * - Timer de expiracao
 * - Polling de status em tempo real
 * - Copia do codigo/endereco
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import {
  Shield,
  Clock,
  Copy,
  Check,
  RefreshCw,
  ChevronRight,
  Lock,
  Wallet,
  CheckCircle2,
  XCircle,
  Timer,
  Building2,
  ExternalLink,
  Loader2,
  QrCode,
  ArrowLeft,
  Info,
} from 'lucide-react'
import gatewayService, {
  GatewayCheckoutData,
  GatewayPaymentMethod,
  formatBRL,
  formatCrypto,
  getTimeRemaining,
} from '@/services/gatewayService'
import { getCryptoLogo } from '@/utils/cryptoLogos'

// ============================================
// TYPES
// ============================================

type CheckoutStep = 'loading' | 'select-method' | 'payment' | 'success' | 'expired' | 'error'

interface CryptoOption {
  symbol: string
  name: string
  network: string
  networkName: string
}

// ============================================
// CONSTANTS
// ============================================

const CRYPTO_OPTIONS: CryptoOption[] = [
  { symbol: 'BTC', name: 'Bitcoin', network: 'bitcoin', networkName: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', network: 'ethereum', networkName: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether', network: 'polygon', networkName: 'Polygon' },
  { symbol: 'USDC', name: 'USD Coin', network: 'polygon', networkName: 'Polygon' },
  { symbol: 'MATIC', name: 'Polygon', network: 'polygon', networkName: 'Polygon' },
  { symbol: 'BNB', name: 'BNB', network: 'bsc', networkName: 'BNB Chain' },
  { symbol: 'SOL', name: 'Solana', network: 'solana', networkName: 'Solana' },
]

const POLLING_INTERVAL = 5000 // 5 seconds

// ============================================
// COMPONENT
// ============================================

export function GatewayCheckoutPage() {
  const { token } = useParams<{ token: string }>()

  // State
  const [step, setStep] = useState<CheckoutStep>('loading')
  const [checkoutData, setCheckoutData] = useState<GatewayCheckoutData | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<GatewayPaymentMethod | null>(null)
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState({ minutes: 0, seconds: 0, expired: false })
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Refs
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================
  // EFFECTS
  // ============================================

  // Load checkout data
  useEffect(() => {
    if (!token) {
      setError('Token de pagamento invalido')
      setStep('error')
      return
    }

    loadCheckoutData()

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [token])

  // Timer countdown
  useEffect(() => {
    if (!checkoutData?.expires_at || step === 'success' || step === 'expired') return

    const updateTimer = () => {
      const remaining = getTimeRemaining(checkoutData.expires_at)
      setTimeRemaining(remaining)

      if (remaining.expired) {
        setStep('expired')
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [checkoutData?.expires_at, step])

  // Generate QR Code
  useEffect(() => {
    if (!checkoutData) return

    const qrData =
      checkoutData.pix_qrcode || checkoutData.crypto_qrcode || checkoutData.crypto_address
    if (!qrData) return

    QRCode.toDataURL(qrData, {
      width: 280,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    })
      .then(setQrCodeDataUrl)
      .catch(console.error)
  }, [checkoutData?.pix_qrcode, checkoutData?.crypto_qrcode, checkoutData?.crypto_address])

  // ============================================
  // FUNCTIONS
  // ============================================

  const loadCheckoutData = async () => {
    if (!token) return

    try {
      setStep('loading')
      const data = await gatewayService.getCheckoutData(token)
      setCheckoutData(data)

      // Check status
      if (data.status === 'COMPLETED' || data.status === 'CONFIRMED') {
        setStep('success')
      } else if (data.status === 'EXPIRED') {
        setStep('expired')
      } else if (data.payment_method) {
        setSelectedMethod(data.payment_method)
        setStep('payment')
        startPolling()
      } else {
        setStep('select-method')
      }
    } catch (err) {
      console.error('Error loading checkout:', err)
      setError('Pagamento nao encontrado ou expirado')
      setStep('error')
    }
  }

  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      if (!token) return

      try {
        const status = await gatewayService.getPaymentStatus(token)

        if (status.status === 'COMPLETED' || status.status === 'CONFIRMED') {
          setStep('success')
          setCheckoutData(prev => (prev ? { ...prev, status: status.status } : null))
          if (pollingRef.current) clearInterval(pollingRef.current)
        } else if (status.status === 'EXPIRED') {
          setStep('expired')
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, POLLING_INTERVAL)
  }, [token])

  const handleSelectMethod = async (method: GatewayPaymentMethod) => {
    if (!token) return

    setIsProcessing(true)
    setSelectedMethod(method)

    try {
      const request: {
        method: GatewayPaymentMethod
        crypto_currency?: string
        crypto_network?: string
      } = {
        method,
      }
      if (method === 'CRYPTO' && selectedCrypto) {
        request.crypto_currency = selectedCrypto.symbol
        request.crypto_network = selectedCrypto.network
      }

      const response = await gatewayService.selectPaymentMethod(token, request)

      setCheckoutData(prev => {
        if (!prev) return null
        return {
          ...prev,
          payment_method: method,
          pix_qrcode: response.pix_qrcode ?? prev.pix_qrcode,
          pix_qrcode_image: response.pix_qrcode_image ?? prev.pix_qrcode_image,
          pix_txid: response.pix_txid ?? prev.pix_txid,
          crypto_address: response.crypto_address ?? prev.crypto_address,
          crypto_amount: response.crypto_amount ?? prev.crypto_amount,
          crypto_currency: response.crypto_currency ?? prev.crypto_currency,
          crypto_network: response.crypto_network ?? prev.crypto_network,
          crypto_qrcode: response.crypto_qrcode ?? prev.crypto_qrcode,
          expires_at: response.expires_at,
        }
      })

      setStep('payment')
      startPolling()
    } catch (err) {
      console.error('Error selecting method:', err)
      setError('Erro ao selecionar metodo de pagamento')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleBack = () => {
    setSelectedMethod(null)
    setSelectedCrypto(null)
    setStep('select-method')
    if (pollingRef.current) clearInterval(pollingRef.current)
  }

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderHeader = () => (
    <header className='sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800'>
      <div className='max-w-lg mx-auto px-4 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            {checkoutData?.merchant.logo_url ? (
              <img
                src={checkoutData.merchant.logo_url}
                alt={checkoutData.merchant.business_name}
                className='w-10 h-10 rounded-xl object-cover'
              />
            ) : (
              <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center'>
                <Building2 className='w-5 h-5 text-white' />
              </div>
            )}
            <div>
              <h1 className='text-sm font-semibold text-slate-900 dark:text-white'>
                {checkoutData?.merchant.business_name || 'Carregando...'}
              </h1>
              <p className='text-xs text-slate-500 dark:text-slate-400'>Pagamento seguro</p>
            </div>
          </div>
          <div className='flex items-center gap-2 text-emerald-600 dark:text-emerald-400'>
            <Shield className='w-4 h-4' />
            <span className='text-xs font-medium'>SSL</span>
          </div>
        </div>
      </div>
    </header>
  )

  const renderTimer = () => {
    if (step === 'success' || step === 'expired' || step === 'error') return null

    const isLow = timeRemaining.minutes < 5

    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          isLow
            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}
      >
        <Timer className='w-4 h-4' />
        <span>
          {String(timeRemaining.minutes).padStart(2, '0')}:
          {String(timeRemaining.seconds).padStart(2, '0')}
        </span>
      </div>
    )
  }

  const renderAmount = () => (
    <div className='text-center py-6'>
      <p className='text-sm text-slate-500 dark:text-slate-400 mb-1'>Valor do pagamento</p>
      <p className='text-4xl font-bold text-slate-900 dark:text-white tracking-tight'>
        {formatBRL(checkoutData?.amount || 0)}
      </p>
      {checkoutData?.description && (
        <p className='text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto'>
          {checkoutData.description}
        </p>
      )}
    </div>
  )

  // ============================================
  // RENDER STEPS
  // ============================================

  const renderLoading = () => (
    <div className='flex flex-col items-center justify-center py-20'>
      <Loader2 className='w-10 h-10 text-indigo-600 animate-spin mb-4' />
      <p className='text-slate-600 dark:text-slate-400'>Carregando pagamento...</p>
    </div>
  )

  const renderSelectMethod = () => (
    <div className='space-y-6'>
      {renderAmount()}

      <div className='space-y-3'>
        <h2 className='text-lg font-semibold text-slate-900 dark:text-white text-center'>
          Como voce deseja pagar?
        </h2>

        {/* PIX Option */}
        <button
          onClick={() => handleSelectMethod('PIX')}
          disabled={isProcessing}
          className='w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group disabled:opacity-50'
        >
          <div className='flex items-center gap-4'>
            <div className='w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0'>
              <QrCode className='w-7 h-7 text-white' />
            </div>
            <div className='flex-1 text-left'>
              <p className='text-lg font-semibold text-slate-900 dark:text-white'>PIX</p>
              <p className='text-sm text-slate-500 dark:text-slate-400'>
                Pagamento instantaneo via QR Code
              </p>
            </div>
            <ChevronRight className='w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors' />
          </div>
        </button>

        {/* Crypto Option */}
        <div className='space-y-3'>
          <button
            onClick={() => setSelectedCrypto(CRYPTO_OPTIONS[0] ?? null)}
            disabled={isProcessing}
            className={`w-full p-4 bg-white dark:bg-slate-800 border-2 rounded-2xl transition-all ${
              selectedCrypto
                ? 'border-indigo-500'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500'
            } disabled:opacity-50`}
          >
            <div className='flex items-center gap-4'>
              <div className='w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0'>
                <Wallet className='w-7 h-7 text-white' />
              </div>
              <div className='flex-1 text-left'>
                <p className='text-lg font-semibold text-slate-900 dark:text-white'>Criptomoedas</p>
                <p className='text-sm text-slate-500 dark:text-slate-400'>
                  BTC, ETH, USDT, USDC e mais
                </p>
              </div>
              <ChevronRight
                className={`w-5 h-5 transition-transform ${
                  selectedCrypto ? 'rotate-90 text-indigo-500' : 'text-slate-400'
                }`}
              />
            </div>
          </button>

          {selectedCrypto && (
            <div className='grid grid-cols-3 sm:grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl'>
              {CRYPTO_OPTIONS.map(crypto => (
                <button
                  key={`${crypto.symbol}-${crypto.network}`}
                  onClick={() => setSelectedCrypto(crypto)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    selectedCrypto.symbol === crypto.symbol &&
                    selectedCrypto.network === crypto.network
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500'
                      : 'bg-white dark:bg-slate-800 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <img
                    src={getCryptoLogo(crypto.symbol)}
                    alt={crypto.symbol}
                    className='w-8 h-8 rounded-full'
                  />
                  <span className='text-xs font-medium text-slate-900 dark:text-white'>
                    {crypto.symbol}
                  </span>
                  <span className='text-[10px] text-slate-500 dark:text-slate-400'>
                    {crypto.networkName}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedCrypto && (
            <button
              onClick={() => handleSelectMethod('CRYPTO')}
              disabled={isProcessing}
              className='w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2'
            >
              {isProcessing ? (
                <Loader2 className='w-5 h-5 animate-spin' />
              ) : (
                <>
                  <span>Pagar com {selectedCrypto.symbol}</span>
                  <ChevronRight className='w-5 h-5' />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Security Badge */}
      <div className='flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400'>
        <Lock className='w-4 h-4' />
        <span>Ambiente seguro e criptografado</span>
      </div>
    </div>
  )

  const renderPayment = () => {
    const isPix = selectedMethod === 'PIX'
    const copyText = isPix ? checkoutData?.pix_qrcode : checkoutData?.crypto_address

    return (
      <div className='space-y-6'>
        {/* Back Button */}
        <button
          onClick={handleBack}
          className='flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors'
        >
          <ArrowLeft className='w-4 h-4' />
          <span>Voltar</span>
        </button>

        {/* Amount Card */}
        <div className='bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-2'>
              {isPix ? (
                <QrCode className='w-5 h-5' />
              ) : (
                <img
                  src={getCryptoLogo(checkoutData?.crypto_currency || 'BTC')}
                  alt={checkoutData?.crypto_currency}
                  className='w-6 h-6 rounded-full'
                />
              )}
              <span className='font-medium'>{isPix ? 'PIX' : checkoutData?.crypto_currency}</span>
            </div>
            {renderTimer()}
          </div>

          <p className='text-3xl font-bold tracking-tight'>
            {isPix
              ? formatBRL(checkoutData?.amount || 0)
              : `${formatCrypto(checkoutData?.crypto_amount || '0', checkoutData?.crypto_currency || '')} ${checkoutData?.crypto_currency}`}
          </p>

          {!isPix && checkoutData?.amount && (
            <p className='text-sm text-white/70 mt-1'>{formatBRL(checkoutData.amount)}</p>
          )}
        </div>

        {/* QR Code */}
        <div className='bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700'>
          <div className='flex flex-col items-center'>
            <div className='w-full max-w-[280px] aspect-square bg-white rounded-xl p-2 mb-4'>
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt='QR Code' className='w-full h-full' />
              ) : (
                <div className='w-full h-full flex items-center justify-center'>
                  <Loader2 className='w-8 h-8 text-slate-400 animate-spin' />
                </div>
              )}
            </div>

            <p className='text-sm text-slate-500 dark:text-slate-400 text-center mb-4'>
              {isPix
                ? 'Escaneie o QR Code ou copie o codigo PIX abaixo'
                : `Envie exatamente ${formatCrypto(checkoutData?.crypto_amount || '0', checkoutData?.crypto_currency || '')} ${checkoutData?.crypto_currency} para o endereco`}
            </p>

            {/* Copy Field */}
            <div className='w-full'>
              <label htmlFor='copy-code' className='sr-only'>
                Codigo para copia
              </label>
              <div className='flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700'>
                <input
                  id='copy-code'
                  type='text'
                  readOnly
                  value={copyText || ''}
                  placeholder='Codigo do pagamento'
                  className='flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-300 truncate outline-none'
                />
                <button
                  onClick={() => copyText && handleCopy(copyText)}
                  className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                    copied
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {copied ? <Check className='w-5 h-5' /> : <Copy className='w-5 h-5' />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className='flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl'>
          <Info className='w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5' />
          <div className='text-sm text-blue-700 dark:text-blue-300'>
            {isPix ? (
              <p>Apos o pagamento, aguarde alguns segundos para a confirmacao automatica.</p>
            ) : (
              <p>Apos o envio, aguarde as confirmacoes da rede. Isso pode levar alguns minutos.</p>
            )}
          </div>
        </div>

        {/* Status Indicator */}
        <div className='flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400'>
          <RefreshCw className='w-4 h-4 animate-spin' />
          <span>Aguardando pagamento...</span>
        </div>
      </div>
    )
  }

  const renderSuccess = () => (
    <div className='flex flex-col items-center justify-center py-12 text-center'>
      <div className='w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30'>
        <CheckCircle2 className='w-10 h-10 text-white' />
      </div>

      <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-2'>
        Pagamento confirmado!
      </h2>

      <p className='text-slate-500 dark:text-slate-400 mb-6 max-w-xs'>
        Seu pagamento foi processado com sucesso. O lojista foi notificado.
      </p>

      <div className='w-full max-w-sm p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-slate-600 dark:text-slate-400'>Valor pago</span>
          <span className='font-semibold text-slate-900 dark:text-white'>
            {formatBRL(checkoutData?.amount || 0)}
          </span>
        </div>
        <div className='flex items-center justify-between text-sm mt-2'>
          <span className='text-slate-600 dark:text-slate-400'>Codigo</span>
          <span className='font-mono text-slate-900 dark:text-white'>
            {checkoutData?.payment_code}
          </span>
        </div>
      </div>

      {checkoutData?.merchant.website_url && (
        <a
          href={checkoutData.merchant.website_url}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-6 inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline'
        >
          <span>Voltar para {checkoutData.merchant.business_name}</span>
          <ExternalLink className='w-4 h-4' />
        </a>
      )}
    </div>
  )

  const renderExpired = () => (
    <div className='flex flex-col items-center justify-center py-12 text-center'>
      <div className='w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-6'>
        <Clock className='w-10 h-10 text-slate-500 dark:text-slate-400' />
      </div>

      <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-2'>Pagamento expirado</h2>

      <p className='text-slate-500 dark:text-slate-400 mb-6 max-w-xs'>
        O tempo para pagamento acabou. Solicite um novo link ao lojista.
      </p>

      <div className='w-full max-w-sm p-4 bg-slate-100 dark:bg-slate-800 rounded-xl'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-slate-600 dark:text-slate-400'>Codigo</span>
          <span className='font-mono text-slate-900 dark:text-white'>
            {checkoutData?.payment_code}
          </span>
        </div>
      </div>
    </div>
  )

  const renderError = () => (
    <div className='flex flex-col items-center justify-center py-12 text-center'>
      <div className='w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6'>
        <XCircle className='w-10 h-10 text-red-500' />
      </div>

      <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-2'>Erro</h2>

      <p className='text-slate-500 dark:text-slate-400 mb-6 max-w-xs'>
        {error || 'Ocorreu um erro ao carregar o pagamento.'}
      </p>

      <button
        onClick={loadCheckoutData}
        className='inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl hover:opacity-90 transition-opacity'
      >
        <RefreshCw className='w-4 h-4' />
        <span>Tentar novamente</span>
      </button>
    </div>
  )

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-950'>
      {renderHeader()}

      <main className='max-w-lg mx-auto px-4 py-6'>
        {step === 'loading' && renderLoading()}
        {step === 'select-method' && renderSelectMethod()}
        {step === 'payment' && renderPayment()}
        {step === 'success' && renderSuccess()}
        {step === 'expired' && renderExpired()}
        {step === 'error' && renderError()}
      </main>

      {/* Footer */}
      <footer className='max-w-lg mx-auto px-4 py-6 text-center'>
        <div className='flex items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500'>
          <Shield className='w-4 h-4' />
          <span>Powered by WolkPay Gateway</span>
        </div>
      </footer>
    </div>
  )
}

export default GatewayCheckoutPage
