import React, { useState, useEffect } from 'react'
import {
  CheckCircle,
  Loader,
  ArrowLeft,
  Banknote,
  Building2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
  Plus,
  ExternalLink,
  ArrowDownToLine,
  Zap,
  QrCode,
  Copy,
  CheckCheck,
  Shield,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiClient } from '@/services/api'
import { parseApiError } from '@/services/errors'
import { TradeStatusMonitor } from './TradeStatusMonitor'
import { useCurrencyStore } from '@/stores/useCurrencyStore'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'

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
  // Valores em BRL (para TED/PIX)
  brl_amount?: number
  brl_total_amount?: number
  usd_to_brl_rate?: number
}

export interface TradeData {
  id: string
  reference_code?: string
  operation: 'buy' | 'sell'
  symbol: string
  crypto_amount: number
  fiat_amount: number
  total_amount: number
  brl_total_amount?: number
  usd_to_brl_rate?: number
  payment_method: string
  status: string
  created_at?: string
  expires_at?: string
}

interface ConfirmationPanelProps {
  readonly quote: Quote
  readonly onBack: () => void
  readonly onSuccess: (tradeId: string, tradeData?: TradeData) => void
  readonly onRefreshQuote?: () => void
}

// Métodos de pagamento para COMPRA (usuário paga)
const BUY_PAYMENT_METHODS = [
  { id: 'bb_auto', name: 'PIX Instantâneo', icon: QrCode, highlight: true, badge: 'Automático' },
  { id: 'ted', name: 'TED', icon: Building2 },
]

export function ConfirmationPanel({
  quote,
  onBack,
  onSuccess,
  onRefreshQuote,
}: ConfirmationPanelProps) {
  const { formatCurrency } = useCurrencyStore()

  // Buscar métodos de pagamento cadastrados do usuário (para SELL)
  const { data: userPaymentMethods, isLoading: loadingPaymentMethods } = usePaymentMethods()

  const isBuy = quote.operation === 'buy'

  // Para BUY: método de pagamento (pix, ted, etc)
  // Para SELL: ID do método de recebimento cadastrado do usuário
  const [selectedPayment, setSelectedPayment] = useState('bb_auto')
  const [selectedReceivingMethod, setSelectedReceivingMethod] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [tradeCreated, setTradeCreated] = useState<string | null>(null)
  const [pendingProof, setPendingProof] = useState(false)
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(quote.expires_in_seconds || 30)
  const [quoteExpired, setQuoteExpired] = useState(false)

  // Estados para BB-AUTO (PIX automático via Banco do Brasil)
  const [pixData, setPixData] = useState<{
    txid: string
    qrcode: string
    qrcode_image?: string
    valor: string
    expiracao_segundos: number
  } | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [pixStatus, setPixStatus] = useState<'pending' | 'paid' | 'expired'>('pending')

  // Auto-selecionar primeiro método de recebimento quando carregar (para SELL)
  useEffect(() => {
    if (!isBuy && userPaymentMethods && userPaymentMethods.length > 0 && !selectedReceivingMethod) {
      // Priorizar método marcado como principal, senão o primeiro
      const primaryMethod = userPaymentMethods.find((m: any) => m.is_primary)
      const methodId = primaryMethod?.id || userPaymentMethods[0]?.id
      if (methodId) {
        setSelectedReceivingMethod(methodId)
      }
    }
  }, [userPaymentMethods, isBuy, selectedReceivingMethod])

  // Timer countdown for quote expiration
  useEffect(() => {
    if (tradeCreated) return // Don't run timer if trade is already created

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setQuoteExpired(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [quote.quote_id, tradeCreated])

  // Função para copiar código PIX
  const copyPixCode = async () => {
    if (pixData?.qrcode) {
      try {
        await navigator.clipboard.writeText(pixData.qrcode)
        setPixCopied(true)
        toast.success('Código PIX copiado!')
        setTimeout(() => setPixCopied(false), 3000)
      } catch {
        toast.error('Erro ao copiar código')
      }
    }
  }

  // Polling para verificar status do PIX BB-AUTO
  useEffect(() => {
    if (!tradeCreated || selectedPayment !== 'bb_auto' || pixStatus !== 'pending') return

    const checkPixStatus = async () => {
      try {
        const response = await apiClient.get(`/instant-trade/${tradeCreated}/pix-status`)
        if (response.data.pix_pago) {
          setPixStatus('paid')
          toast.success('Pagamento PIX confirmado! Sua crypto será enviada automaticamente.')
        }
      } catch (error) {
        console.log('[BB-AUTO] Error checking PIX status:', error)
      }
    }

    // Verificar a cada 5 segundos
    const interval = setInterval(checkPixStatus, 5000)
    return () => clearInterval(interval)
  }, [tradeCreated, selectedPayment, pixStatus])

  const createTrade = async () => {
    // Validação para SELL: precisa ter método de recebimento selecionado
    if (!isBuy && !selectedReceivingMethod) {
      toast.error('Selecione uma conta para receber o pagamento')
      return
    }

    setLoading(true)
    try {
      // BB-AUTO: Usar endpoint especial que gera PIX via API do BB
      if (selectedPayment === 'bb_auto') {
        console.log('[BB-AUTO] Creating trade with PIX automático...')
        console.log('[BB-AUTO] Quote data:', {
          quote_id: quote.quote_id,
          brl_amount: quote.brl_amount,
          brl_total_amount: quote.brl_total_amount,
          usd_to_brl_rate: quote.usd_to_brl_rate,
          total_amount: quote.total_amount,
        })

        const bbAutoData = {
          quote_id: quote.quote_id,
          payment_method: 'pix', // Obrigatório para o backend
          brl_amount: quote.brl_amount || quote.total_amount,
          brl_total_amount: quote.brl_total_amount || quote.total_amount,
          usd_to_brl_rate: quote.usd_to_brl_rate || 1,
        }

        console.log('[BB-AUTO] Request data:', bbAutoData)

        try {
          const response = await apiClient.post('/instant-trade/create-with-pix', bbAutoData)

          console.log('[BB-AUTO] Response:', response.data)

          if (response.data.success && response.data.pix) {
            // Salvar dados do PIX
            setPixData({
              txid: response.data.pix.txid,
              qrcode: response.data.pix.qrcode,
              qrcode_image: response.data.pix.qrcode_image,
              valor: response.data.pix.valor,
              expiracao_segundos: response.data.pix.expiracao_segundos,
            })

            const tradeId = response.data.trade_id
            setTradeCreated(tradeId)
            setPixStatus('pending')

            toast.success('PIX gerado! Escaneie o QR Code ou copie o código para pagar.')

            // NÃO chamar onSuccess ainda - mostrar QR Code primeiro
            // O usuário verá a tela de QR Code para pagar
          } else {
            throw new Error(response.data.message || 'Erro ao gerar PIX')
          }
        } catch (pixError: any) {
          console.error('[BB-AUTO] Error:', pixError)
          const errorMessage =
            pixError.response?.data?.detail || pixError.message || 'Erro ao gerar PIX'
          console.error('[BB-AUTO] Error detail:', errorMessage)
          toast.error(errorMessage)
          setLoading(false)
          return
        }

        setLoading(false)
        return // Retornar aqui para não executar o fluxo normal
      }

      // Fluxo normal para outros métodos de pagamento
      // Preparar dados do request
      const requestData: {
        quote_id: string
        payment_method?: string
        receiving_method_id?: string
        brl_amount?: number
        brl_total_amount?: number
        usd_to_brl_rate?: number
      } = {
        quote_id: quote.quote_id,
      }

      if (isBuy) {
        // BUY: usuário escolhe como pagar
        requestData.payment_method = selectedPayment
      } else {
        // SELL: usuário escolhe onde receber
        requestData.receiving_method_id = selectedReceivingMethod!
        // Para SELL, o "payment_method" é o tipo do método de recebimento
        const selectedMethod = userPaymentMethods?.find(
          (m: any) => m.id === selectedReceivingMethod
        )
        // Mapear tipo do método de recebimento para o formato aceito pelo backend OTC
        // Backend P2P usa "bank_transfer", mas OTC espera "ted"
        const methodType = selectedMethod?.type || 'pix'
        const paymentMethodMap: Record<string, string> = {
          bank_transfer: 'ted',
          bank: 'ted',
          banktransfer: 'ted',
          pix: 'pix',
          ted: 'ted',
        }
        requestData.payment_method = paymentMethodMap[methodType] || 'pix'
      }

      // Se tiver valores em BRL, incluir no request (para TED/PIX)
      // SEMPRE incluir se existir (mesmo que seja 0)
      if (quote.brl_amount !== undefined && quote.brl_amount !== null) {
        requestData.brl_amount = quote.brl_amount
      }
      if (quote.brl_total_amount !== undefined && quote.brl_total_amount !== null) {
        requestData.brl_total_amount = quote.brl_total_amount
      }
      if (quote.usd_to_brl_rate !== undefined && quote.usd_to_brl_rate !== null) {
        requestData.usd_to_brl_rate = quote.usd_to_brl_rate
      }

      console.log('[ConfirmationPanel] Quote BRL values:', {
        brl_amount: quote.brl_amount,
        brl_total_amount: quote.brl_total_amount,
        usd_to_brl_rate: quote.usd_to_brl_rate,
      })
      console.log('[ConfirmationPanel] Creating trade with:', requestData)

      const response = await apiClient.post('/instant-trade/create', requestData)

      console.log('[ConfirmationPanel] Trade created successfully:', response.data)

      if (isBuy) {
        // BUY: Mostrar instruções de pagamento
        if (selectedPayment === 'ted' && response.data.bank_details) {
          setBankDetails(response.data.bank_details)
          toast.success('Trade criado! Transfira para a conta abaixo.')
          setPendingProof(true)
        } else {
          toast.success('Trade criado com sucesso!')
        }
      } else {
        // SELL: Trade criado, aguardando processamento
        toast.success('Venda confirmada! Aguarde o processamento do pagamento.')
      }

      const tradeId = response.data.trade_id || response.data.id
      setTradeCreated(tradeId)

      // Construir dados da trade para passar ao componente pai
      const tradeData: TradeData = {
        id: tradeId,
        reference_code: response.data.reference_code,
        operation: quote.operation,
        symbol: quote.symbol,
        crypto_amount: quote.crypto_amount,
        fiat_amount: quote.fiat_amount,
        total_amount: quote.total_amount,
        ...(quote.brl_total_amount !== undefined && { brl_total_amount: quote.brl_total_amount }),
        ...(quote.usd_to_brl_rate !== undefined && { usd_to_brl_rate: quote.usd_to_brl_rate }),
        payment_method: selectedPayment,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        ...(response.data.expires_at && { expires_at: response.data.expires_at }),
      }

      onSuccess(tradeId, tradeData)
    } catch (error: any) {
      // Usar sistema de tratamento de erros enterprise
      const parsedError = parseApiError(error)

      // Handle 403 Forbidden - trade was created but waiting for proof of payment
      if (error.response?.status === 403) {
        const tradeId =
          error.response?.data?.trade_id || error.response?.data?.id || `pending_${Date.now()}`

        toast.success('Trade created! Awaiting payment proof. Please send your receipt.')
        setPendingProof(true)
        setTradeCreated(tradeId)

        // Construir dados parciais da trade para o caso de erro 403
        const partialTradeData: TradeData = {
          id: tradeId,
          reference_code: error.response?.data?.reference_code,
          operation: quote.operation,
          symbol: quote.symbol,
          crypto_amount: quote.crypto_amount,
          fiat_amount: quote.fiat_amount,
          total_amount: quote.total_amount,
          ...(quote.brl_total_amount !== undefined && { brl_total_amount: quote.brl_total_amount }),
          ...(quote.usd_to_brl_rate !== undefined && { usd_to_brl_rate: quote.usd_to_brl_rate }),
          payment_method: selectedPayment,
          status: 'PENDING_PROOF',
          created_at: new Date().toISOString(),
        }

        onSuccess(tradeId, partialTradeData)
      } else {
        // Mostrar mensagem amigável ao usuário
        toast.error(parsedError.userMessage)

        // Log estruturado apenas em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          console.log('[ConfirmationPanel] Trade error:', {
            category: parsedError.category,
            message: parsedError.technicalMessage,
            code: parsedError.code,
            isRetryable: parsedError.isRetryable,
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number | undefined): string => {
    if (
      value === null ||
      value === undefined ||
      typeof value !== 'number' ||
      Number.isNaN(value) ||
      !Number.isFinite(value)
    ) {
      return formatCurrency(0)
    }
    return formatCurrency(value)
  }

  // isBuy já declarado no início do componente

  // Renderização especial para BB-AUTO com QR Code PIX
  if (tradeCreated && pixData && selectedPayment === 'bb_auto') {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4'>
        {/* Header */}
        <div className='flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
          <button
            onClick={onBack}
            className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
            title='Voltar'
            aria-label='Voltar'
          >
            <ArrowLeft className='w-4 h-4 text-gray-600 dark:text-gray-400' />
          </button>
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <Zap className='w-5 h-5 text-yellow-500' />
              <h2 className='text-sm font-bold text-gray-900 dark:text-white'>
                PIX Automático - Banco do Brasil
              </h2>
            </div>
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
              Escaneie o QR Code ou copie o código para pagar
            </p>
          </div>
        </div>

        {/* Status do PIX */}
        {pixStatus === 'paid' ? (
          <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4'>
            <div className='flex items-center gap-3'>
              <CheckCircle className='w-8 h-8 text-green-600 dark:text-green-400' />
              <div>
                <h3 className='font-bold text-green-900 dark:text-green-100'>
                  Pagamento Confirmado!
                </h3>
                <p className='text-sm text-green-700 dark:text-green-300'>
                  Sua crypto será enviada automaticamente em instantes.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* QR Code */}
            <div className='flex flex-col items-center'>
              {pixData.qrcode_image ? (
                <div className='bg-white p-4 rounded-xl shadow-lg border-2 border-yellow-400'>
                  <img src={pixData.qrcode_image} alt='QR Code PIX' className='w-48 h-48' />
                </div>
              ) : (
                <div className='bg-gray-100 dark:bg-gray-700 p-4 rounded-xl w-48 h-48 flex items-center justify-center'>
                  <QrCode className='w-24 h-24 text-gray-400' />
                </div>
              )}

              {/* Valor */}
              <div className='mt-4 text-center'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>Valor a pagar</p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  R$ {pixData.valor}
                </p>
              </div>
            </div>

            {/* Código PIX para copiar */}
            <div className='space-y-2'>
              <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Código PIX Copia e Cola:
              </p>
              <div className='relative'>
                <div className='bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 pr-12 font-mono text-xs text-gray-800 dark:text-gray-200 break-all max-h-24 overflow-y-auto'>
                  {pixData.qrcode}
                </div>
                <button
                  onClick={copyPixCode}
                  className='absolute top-2 right-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors'
                  title='Copiar código PIX'
                >
                  {pixCopied ? (
                    <CheckCheck className='w-4 h-4 text-green-500' />
                  ) : (
                    <Copy className='w-4 h-4 text-gray-500 dark:text-gray-400' />
                  )}
                </button>
              </div>
            </div>

            {/* Timer de expiração */}
            <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3'>
              <div className='flex items-center gap-2'>
                <Clock className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                <span className='text-sm text-amber-800 dark:text-amber-200'>
                  Este PIX expira em {Math.floor(pixData.expiracao_segundos / 60)} minutos
                </span>
              </div>
            </div>

            {/* Status de verificação */}
            <div className='flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
              <Loader className='w-4 h-4 animate-spin' />
              <span>Aguardando confirmação do pagamento...</span>
            </div>
          </>
        )}

        {/* Informações do Trade */}
        <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2'>
          <div className='flex justify-between text-xs'>
            <span className='text-gray-600 dark:text-gray-400'>Trade ID:</span>
            <span className='font-mono text-gray-900 dark:text-white'>
              {tradeCreated.substring(0, 8)}...
            </span>
          </div>
          <div className='flex justify-between text-xs'>
            <span className='text-gray-600 dark:text-gray-400'>PIX TXID:</span>
            <span className='font-mono text-gray-900 dark:text-white'>{pixData.txid}</span>
          </div>
          <div className='flex justify-between text-xs'>
            <span className='text-gray-600 dark:text-gray-400'>Você receberá:</span>
            <span className='font-bold text-green-600 dark:text-green-400'>
              {quote.crypto_amount.toFixed(8)} {quote.symbol}
            </span>
          </div>
        </div>

        {/* Badge de segurança */}
        <div className='flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2'>
          <Shield className='w-3 h-3' />
          <span>Pagamento processado via API oficial do Banco do Brasil</span>
        </div>
      </div>
    )
  }

  if (tradeCreated) {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4'>
        <div className='flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex-1'>
            <h2 className='text-sm font-bold text-gray-900 dark:text-white'>
              {pendingProof ? 'Awaiting Payment Proof' : 'Trade Status'}
            </h2>
          </div>
        </div>

        {pendingProof ? (
          <div className='space-y-4'>
            {/* Pending Status Message */}
            <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4'>
              <div className='flex items-start gap-3'>
                <div className='flex-shrink-0'>
                  <div className='flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30'>
                    <svg
                      className='h-5 w-5 text-amber-600 dark:text-amber-400'
                      fill='currentColor'
                      viewBox='0 0 20 20'
                    >
                      <path
                        fillRule='evenodd'
                        d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                        clipRule='evenodd'
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className='text-sm font-medium text-amber-900 dark:text-amber-100'>
                    Payment Proof Required
                  </h3>
                  <p className='text-xs text-amber-700 dark:text-amber-300 mt-1'>
                    Your trade is waiting for payment confirmation. Please send your payment
                    receipt/proof to proceed.
                  </p>
                </div>
              </div>
            </div>

            {/* Trade ID */}
            <div className='bg-gray-50 dark:bg-gray-700 p-3 rounded'>
              <p className='text-xs text-gray-600 dark:text-gray-400'>Trade ID:</p>
              <p className='font-mono text-sm text-gray-900 dark:text-white break-all'>
                {tradeCreated}
              </p>
            </div>

            {/* Payment Details Summary */}
            <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3 space-y-2'>
              <p className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
                Payment Details:
              </p>
              <div className='space-y-1 text-xs'>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Amount:</span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {formatValue(quote.fiat_amount ?? 0)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Method:</span>
                  <span className='font-medium text-gray-900 dark:text-white capitalize'>
                    {selectedPayment}
                  </span>
                </div>
                <div className='flex justify-between border-t border-blue-200 dark:border-blue-700 pt-1'>
                  <span className='text-gray-600 dark:text-gray-400'>Receiving:</span>
                  <span className='font-bold text-blue-600 dark:text-blue-400'>
                    {(quote.crypto_amount ?? 0).toFixed(8)} {quote.symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3'>
              <p className='text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2'>
                Next Steps:
              </p>
              <ol className='text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside'>
                <li>Send payment using the method above</li>
                <li>Save your payment receipt/proof</li>
                <li>Go to "Support" or "Chat" and upload your proof</li>
                <li>Our team will verify and complete your trade</li>
              </ol>
            </div>

            <button
              onClick={onBack}
              className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            >
              Back to Trading
            </button>
          </div>
        ) : (
          <>
            <TradeStatusMonitor
              tradeId={tradeCreated}
              initialStatus='PENDING'
              onStatusChange={newStatus => {
                if (newStatus === 'COMPLETED') {
                  toast.success('Trade completed successfully!')
                }
              }}
            />
            <button
              onClick={onBack}
              className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            >
              Back to Trading
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
      {/* Header with Back Button */}
      <div className='flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700'>
        <button
          onClick={onBack}
          disabled={loading}
          title='Go back'
          className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50'
        >
          <ArrowLeft className='w-4 h-4 text-gray-600 dark:text-gray-400' />
        </button>
        <div className='flex-1'>
          <h2 className='text-sm font-bold text-gray-900 dark:text-white'>Review Trade</h2>
        </div>
      </div>

      {/* Trade Summary */}
      <div className='space-y-3'>
        {/* Main Layout: Summary + Quote Side by Side */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          {/* Left Column: Summary Card */}
          <div>
            {/* Summary Card */}
            <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded p-3 space-y-2'>
              <div className='flex items-center gap-2 mb-2'>
                <div className='h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0'>
                  <CheckCircle className='w-5 h-5 text-white' />
                </div>
                <div>
                  <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                    {isBuy ? 'Buy' : 'Sell'} {quote.symbol}
                  </p>
                </div>
              </div>

              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-700 dark:text-gray-300'>Type:</span>
                  <span className='font-medium text-gray-900 dark:text-white capitalize'>
                    {quote.operation}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-700 dark:text-gray-300'>Asset:</span>
                  <span className='font-medium text-gray-900 dark:text-white'>{quote.symbol}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-700 dark:text-gray-300'>
                    {isBuy ? 'Pay:' : 'Amount:'}
                  </span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {isBuy
                      ? formatValue(quote.fiat_amount ?? 0)
                      : `${(quote.crypto_amount ?? 0).toFixed(8)} ${quote.symbol}`}
                  </span>
                </div>
                <div className='flex justify-between border-t border-blue-200 dark:border-blue-700 pt-2'>
                  <span className='font-semibold text-gray-900 dark:text-white'>
                    {isBuy ? 'Receive:' : 'Get:'}
                  </span>
                  <span className='font-bold text-blue-600 dark:text-blue-400'>
                    {isBuy
                      ? `${(quote.crypto_amount ?? 0).toFixed(8)} ${quote.symbol}`
                      : formatValue(quote.total_amount ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quote Details (Price breakdown) */}
          <div className='bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 rounded p-3 space-y-2 border border-gray-200 dark:border-gray-700'>
            <p className='text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide'>
              Quote Details
            </p>

            <div className='space-y-1 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Price:</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {formatValue(quote.crypto_price ?? 0)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>
                  Spread ({quote.spread_percentage ?? 0}%):
                </span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {formatValue(quote.spread_amount ?? 0)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>
                  Fee ({quote.network_fee_percentage ?? 0}%):
                </span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {formatValue(quote.network_fee_amount ?? 0)}
                </span>
              </div>
              <div className='flex justify-between border-t border-gray-300 dark:border-gray-600 pt-1'>
                <span className='font-semibold text-gray-900 dark:text-white'>Total:</span>
                <span className='font-bold text-blue-600 dark:text-blue-400'>
                  {formatValue(quote.total_amount ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO DIFERENTE PARA BUY vs SELL */}
        {isBuy ? (
          /* BUY: Payment Method Selection - Como o usuário vai PAGAR */
          <div>
            <div className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>
              Método de Pagamento
            </div>
            <div className='grid grid-cols-5 gap-2'>
              {BUY_PAYMENT_METHODS.map(method => {
                const IconComponent = method.icon
                const isHighlight = 'highlight' in method && method.highlight
                const badge = 'badge' in method ? method.badge : null
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    disabled={loading}
                    className={`relative p-2 rounded border transition-all disabled:opacity-50 text-center ${
                      selectedPayment === method.id
                        ? isHighlight
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 ring-2 ring-yellow-400'
                          : 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : isHighlight
                          ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/10 hover:border-yellow-500'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {badge && (
                      <div className='absolute -top-2 left-1/2 -translate-x-1/2'>
                        <span className='px-1.5 py-0.5 text-[9px] font-bold bg-yellow-500 text-white rounded-full whitespace-nowrap'>
                          {badge}
                        </span>
                      </div>
                    )}
                    <IconComponent
                      className={`w-5 h-5 mx-auto mb-1 ${
                        isHighlight
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    />
                    <div
                      className={`text-xs font-medium ${
                        isHighlight
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {method.name}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          /* SELL: Receiving Method Selection - Onde o usuário vai RECEBER */
          <div>
            <div className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2'>
              <ArrowDownToLine className='w-4 h-4 text-green-600 dark:text-green-400' />
              Conta para Recebimento
            </div>

            {loadingPaymentMethods ? (
              <div className='flex items-center justify-center p-4'>
                <Loader className='w-5 h-5 animate-spin text-blue-600' />
                <span className='ml-2 text-sm text-gray-600 dark:text-gray-400'>
                  Carregando suas contas...
                </span>
              </div>
            ) : !userPaymentMethods || userPaymentMethods.length === 0 ? (
              /* Nenhuma conta cadastrada */
              <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4'>
                <div className='flex items-start gap-3'>
                  <AlertTriangle className='w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium text-amber-900 dark:text-amber-100'>
                      Nenhuma conta cadastrada
                    </p>
                    <p className='text-xs text-amber-700 dark:text-amber-300 mt-1'>
                      Para vender crypto, você precisa cadastrar uma conta bancária ou chave PIX
                      para receber o pagamento.
                    </p>
                    <Link
                      to='/settings/payment-methods'
                      className='inline-flex items-center gap-1 mt-3 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded transition-colors'
                    >
                      <Plus className='w-3 h-3' />
                      Cadastrar Conta
                      <ExternalLink className='w-3 h-3' />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Lista de contas cadastradas */
              <div className='space-y-2'>
                {userPaymentMethods.map((method: any) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedReceivingMethod(method.id)}
                    disabled={loading}
                    className={`w-full p-3 rounded-lg border transition-all disabled:opacity-50 text-left ${
                      selectedReceivingMethod === method.id
                        ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <div
                        className={`p-2 rounded-full ${
                          method.type === 'pix'
                            ? 'bg-green-100 dark:bg-green-900/50'
                            : 'bg-blue-100 dark:bg-blue-900/50'
                        }`}
                      >
                        {method.type === 'pix' ? (
                          <Banknote className='w-4 h-4 text-green-600 dark:text-green-400' />
                        ) : (
                          <Building2 className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-medium text-gray-900 dark:text-white'>
                            {method.type === 'pix'
                              ? 'PIX'
                              : method.type === 'bank_transfer'
                                ? 'TED/Transferência'
                                : method.type?.toUpperCase()}
                          </span>
                          {method.is_primary && (
                            <span className='px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded'>
                              Principal
                            </span>
                          )}
                        </div>
                        <p className='text-xs text-gray-600 dark:text-gray-400 truncate'>
                          {method.type === 'pix'
                            ? `${method.details?.keyType || 'Chave'}: ${method.details?.keyValue || method.details?.key_value || method.details?.pix_key || '****'}`
                            : `${method.details?.bank || method.details?.bank_name || 'Banco'} - Ag ${method.details?.agency || '****'} / CC ${method.details?.account || method.details?.account_number || '****'}`}
                        </p>
                        {/* Mostrar nome do titular */}
                        <p className='text-[10px] text-gray-500 dark:text-gray-500 truncate'>
                          {method.details?.holderName || method.details?.holder_name || ''}
                        </p>
                      </div>
                      {selectedReceivingMethod === method.id && (
                        <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />
                      )}
                    </div>
                  </button>
                ))}

                {/* Link para adicionar nova conta */}
                <Link
                  to='/settings/payment-methods'
                  className='flex items-center justify-center gap-2 w-full p-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                >
                  <Plus className='w-3 h-3' />
                  Adicionar outra conta
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Bank Transfer Details - Show BEFORE confirming for TED (only for BUY) */}
        {isBuy && selectedPayment === 'ted' && (
          <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 space-y-2'>
            <p className='text-xs font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-1'>
              <ClipboardList className='w-3 h-3' />
              Transfer to this account after confirming:
            </p>
            <div className='space-y-1 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Bank:</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  Banco do Brasil (001)
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>CNPJ:</span>
                <span className='font-mono text-gray-900 dark:text-white'>24.275.355/0001-51</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Agency:</span>
                <span className='font-mono text-gray-900 dark:text-white'>5271-0</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Account:</span>
                <span className='font-mono text-gray-900 dark:text-white'>26689-2</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Holder:</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  HOLD DIGITAL ASSETS LTDA
                </span>
              </div>
              <div className='flex justify-between border-t border-amber-200 dark:border-amber-700 pt-1 mt-1'>
                <span className='text-gray-600 dark:text-gray-400'>Amount:</span>
                <span className='font-bold text-amber-700 dark:text-amber-300'>
                  {formatValue(quote.total_amount ?? quote.fiat_amount ?? 0)}
                </span>
              </div>
            </div>
            <p className='text-xs text-amber-700 dark:text-amber-300 mt-2 flex items-center gap-1'>
              <AlertTriangle className='w-3 h-3' />
              After confirming, you have 15 minutes to complete the transfer and upload the receipt.
            </p>
          </div>
        )}

        {/* Legacy Bank Transfer Details - After trade created (only for BUY) */}
        {isBuy && selectedPayment === 'ted' && bankDetails && (
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 space-y-2'>
            <p className='text-xs font-semibold text-blue-900 dark:text-blue-100'>
              Transfer to this account:
            </p>
            <div className='space-y-1 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Bank:</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {bankDetails.bank_name}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>CNPJ:</span>
                <span className='font-mono text-gray-900 dark:text-white'>{bankDetails.cnpj}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Agency:</span>
                <span className='font-mono text-gray-900 dark:text-white'>
                  {bankDetails.agency}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Account:</span>
                <span className='font-mono text-gray-900 dark:text-white'>
                  {bankDetails.account_number}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600 dark:text-gray-400'>Holder:</span>
                <span className='font-medium text-gray-900 dark:text-white'>
                  {bankDetails.account_holder}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SELL: Resumo da conta de recebimento selecionada */}
        {!isBuy &&
          selectedReceivingMethod &&
          userPaymentMethods &&
          (() => {
            const selectedMethod = userPaymentMethods.find(
              (m: any) => m.id === selectedReceivingMethod
            )
            if (!selectedMethod) return null

            return (
              <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 space-y-2'>
                <p className='text-xs font-semibold text-green-900 dark:text-green-100 flex items-center gap-1'>
                  <CheckCircle className='w-3 h-3' />
                  Você receberá em:
                </p>
                <div className='space-y-1 text-xs'>
                  <div className='flex justify-between'>
                    <span className='text-gray-600 dark:text-gray-400'>Tipo:</span>
                    <span className='font-medium text-gray-900 dark:text-white'>
                      {selectedMethod.type?.toUpperCase()}
                    </span>
                  </div>
                  {selectedMethod.type === 'pix' ? (
                    <div className='flex justify-between'>
                      <span className='text-gray-600 dark:text-gray-400'>Chave:</span>
                      <span className='font-mono text-gray-900 dark:text-white'>
                        {selectedMethod.details?.key_value || selectedMethod.details?.pix_key}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className='flex justify-between'>
                        <span className='text-gray-600 dark:text-gray-400'>Banco:</span>
                        <span className='font-medium text-gray-900 dark:text-white'>
                          {selectedMethod.details?.bank_name}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600 dark:text-gray-400'>Agência/Conta:</span>
                        <span className='font-mono text-gray-900 dark:text-white'>
                          {selectedMethod.details?.agency} /{' '}
                          {selectedMethod.details?.account_number}
                        </span>
                      </div>
                    </>
                  )}
                  <div className='flex justify-between border-t border-green-200 dark:border-green-700 pt-1 mt-1'>
                    <span className='text-gray-600 dark:text-gray-400'>Valor a receber:</span>
                    <span className='font-bold text-green-700 dark:text-green-300'>
                      {formatValue(quote.total_amount ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}

        {/* Quote ID Info */}
        <div className='bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs'>
          <span className='text-gray-600 dark:text-gray-400'>ID: </span>
          <span className='font-mono text-gray-900 dark:text-white'>
            {(quote.quote_id ?? '').substring(0, 12)}...
          </span>
        </div>

        {/* Quote Expiration Timer */}
        {!tradeCreated && (
          <div
            className={`p-3 rounded text-xs flex items-center justify-between ${
              quoteExpired
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                : timeLeft <= 10
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
            }`}
          >
            <div className='flex items-center gap-2'>
              {quoteExpired ? (
                <>
                  <AlertTriangle className='w-4 h-4 text-red-600 dark:text-red-400' />
                  <span className='font-medium text-red-700 dark:text-red-300'>Quote Expired</span>
                </>
              ) : (
                <>
                  <Clock
                    className={`w-4 h-4 ${
                      timeLeft <= 10
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      timeLeft <= 10
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-green-700 dark:text-green-300'
                    }`}
                  >
                    Quote valid for: {timeLeft}s
                  </span>
                </>
              )}
            </div>
            {quoteExpired && onRefreshQuote && (
              <button
                onClick={onRefreshQuote}
                className='flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors'
              >
                <RefreshCw className='w-3 h-3' />
                New Quote
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700'>
          <button
            onClick={onBack}
            disabled={loading}
            className='px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            Voltar
          </button>
          <button
            onClick={createTrade}
            disabled={loading || quoteExpired || (!isBuy && !selectedReceivingMethod)}
            className={`flex-1 px-3 py-1.5 text-xs rounded disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors ${
              quoteExpired || (!isBuy && !selectedReceivingMethod)
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : isBuy
                  ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400'
                  : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400'
            }`}
          >
            {loading ? (
              <>
                <Loader className='w-3 h-3 animate-spin' />
                <span>Processando...</span>
              </>
            ) : quoteExpired ? (
              <>
                <AlertTriangle className='w-3 h-3' />
                <span>Cotação Expirada</span>
              </>
            ) : !isBuy && !selectedReceivingMethod ? (
              <>
                <AlertTriangle className='w-3 h-3' />
                <span>Selecione uma conta</span>
              </>
            ) : (
              <>
                <CheckCircle className='w-3 h-3' />
                <span>{isBuy ? 'Confirmar Compra' : 'Confirmar Venda'}</span>
              </>
            )}
          </button>
        </div>

        {/* Info Message */}
        <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 flex items-start gap-2'>
          <CheckCircle className='w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0' />
          <p className='text-xs text-amber-700 dark:text-amber-400'>
            {isBuy
              ? 'Cotação válida por 5 min. Após confirmação, a transação não pode ser revertida.'
              : 'Após confirmar, sua crypto será reservada e o pagamento enviado para a conta selecionada.'}
          </p>
        </div>
      </div>
    </div>
  )
}
