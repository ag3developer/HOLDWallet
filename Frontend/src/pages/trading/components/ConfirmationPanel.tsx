import React, { useState, useEffect, useRef } from 'react'
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
  QrCode,
  Copy,
  CheckCheck,
  Shield,
} from 'lucide-react'
import QRCodeLib from 'qrcode'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiClient } from '@/services/api'
import { parseApiError } from '@/services/errors'
import { TradeStatusMonitor } from './TradeStatusMonitor'
import { useCurrencyStore, type Currency } from '@/stores/useCurrencyStore'
import { currencyManager } from '@/services/currency'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { CryptoIcon } from '@/components/CryptoIcon'

/**
 * Sanitiza string base64 removendo prefixos e caracteres inválidos
 * Corrige problemas no Safari iOS com imagens base64
 */
const sanitizeBase64 = (base64: string | undefined | null): string | null => {
  if (!base64) return null

  // Remove prefixo data:image se presente
  let clean = base64
  if (clean.startsWith('data:image')) {
    const parts = clean.split(',')
    clean = parts.length > 1 ? (parts[1] ?? clean) : clean
  }

  // Remove espaços e quebras de linha (comum em Safari iOS)
  clean = clean.replaceAll(/\s/g, '')

  // Valida se é base64 válido
  try {
    atob(clean)
    return clean
  } catch {
    console.warn('[QRCode] Base64 inválido, tentando corrigir padding...')
    const padding = clean.length % 4
    if (padding > 0) {
      clean += '='.repeat(4 - padding)
    }
    try {
      atob(clean)
      return clean
    } catch {
      console.error('[QRCode] Base64 definitivamente inválido')
      return null
    }
  }
}

/**
 * Componente QRCodeImage com fallback para Safari iOS
 * Se a imagem base64 falhar, gera o QR Code localmente usando canvas
 */
const QRCodeImage: React.FC<{
  base64Image: string | undefined | null
  pixCode: string | undefined
  size?: number
  className?: string
}> = ({ base64Image, pixCode, size = 192, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageError, setImageError] = useState(false)
  const [localQrGenerated, setLocalQrGenerated] = useState(false)

  const sanitizedBase64 = sanitizeBase64(base64Image)

  // Gera QR Code localmente se a imagem falhar
  useEffect(() => {
    if ((imageError || !sanitizedBase64) && pixCode && canvasRef.current && !localQrGenerated) {
      console.log('[QRCode] Gerando QR Code localmente no canvas...')
      QRCodeLib.toCanvas(canvasRef.current, pixCode, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(() => {
          setLocalQrGenerated(true)
          console.log('[QRCode] ✅ QR Code gerado localmente com sucesso')
        })
        .catch(err => {
          console.error('[QRCode] ❌ Erro ao gerar QR Code local:', err)
        })
    }
  }, [imageError, sanitizedBase64, pixCode, size, localQrGenerated])

  // Se temos base64 válido e não houve erro, mostra a imagem
  if (sanitizedBase64 && !imageError) {
    return (
      <img
        src={`data:image/png;base64,${sanitizedBase64}`}
        alt='QR Code PIX'
        className={`${className} mx-auto`}
        width={size}
        height={size}
        onError={() => {
          console.warn('[QRCode] Erro ao carregar imagem base64, usando fallback...')
          setImageError(true)
        }}
        onLoad={() => {
          console.log('[QRCode] ✅ Imagem base64 carregada com sucesso')
        }}
      />
    )
  }

  // Fallback: canvas com QR Code gerado localmente
  return <canvas ref={canvasRef} className={`${className} mx-auto`} width={size} height={size} />
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
  tx_hash?: string // TX hash para vendas processadas automaticamente
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
  // 🏦 Os valores do quote vêm em BRL do backend.
  // Usamos CurrencyManager para converter BRL → moeda do usuário quando necessário.
  // PIX/TED payment sections ALWAYS show BRL (são métodos de pagamento brasileiros).
  const { currency: userCurrency } = useCurrencyStore()

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
  const [timeLeft, setTimeLeft] = useState(quote.expires_in_seconds)
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
      // IMPORTANTE: PIX BB-AUTO só é para COMPRA (BUY) - usuário paga via PIX
      // VENDA (SELL) usa o fluxo normal - crypto é transferida automaticamente
      if (isBuy && selectedPayment === 'bb_auto') {
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
            console.log('[BB-AUTO] PIX gerado com sucesso!')
            console.log('[BB-AUTO] PIX data:', response.data.pix)

            // Salvar dados do PIX
            const pixInfo = {
              txid: response.data.pix.txid,
              qrcode: response.data.pix.qrcode,
              qrcode_image: response.data.pix.qrcode_image,
              valor: response.data.pix.valor,
              expiracao_segundos: response.data.pix.expiracao_segundos,
            }

            console.log('[BB-AUTO] Setting pixData:', pixInfo)
            setPixData(pixInfo)

            const tradeId = response.data.trade_id
            console.log('[BB-AUTO] Setting tradeCreated:', tradeId)
            setTradeCreated(tradeId)
            setPixStatus('pending')

            toast.success('PIX gerado! Escaneie o QR Code ou copie o código para pagar.')
            console.log('[BB-AUTO] States set - should render QR Code screen now')

            // NÃO chamar onSuccess ainda - mostrar QR Code primeiro
            // O usuário verá a tela de QR Code para pagar
          } else {
            console.error('[BB-AUTO] Response sem success ou pix:', response.data)
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

      const tradeId = response.data.trade_id || response.data.id
      setTradeCreated(tradeId)

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
        // SELL: Trade criado e processado automaticamente
        if (response.data.auto_processed) {
          toast.success('✅ Venda processada! Sua crypto foi transferida. Aguarde o PIX.', {
            duration: 5000,
            icon: '🎉',
          })
        } else if (response.data.auto_error) {
          toast.error(`Erro no processamento automático: ${response.data.auto_error}`)
        } else {
          toast.success('Venda confirmada! Aguarde o processamento.')
        }
      }

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
        status: response.data.status || 'PENDING', // Usar status retornado pelo backend
        created_at: new Date().toISOString(),
        ...(response.data.expires_at && { expires_at: response.data.expires_at }),
        ...(response.data.tx_hash && { tx_hash: response.data.tx_hash }), // TX da venda automática
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

  /**
   * 🏦 FORMATAÇÃO MULTI-MOEDA PARA OTC
   * Os valores do quote vêm em BRL do backend (instant_trade_service.py usa currency="brl").
   * Convertemos BRL → moeda do usuário usando CurrencyManager.
   * Se o usuário usa BRL, nenhuma conversão é feita.
   * Se o usuário usa USD, converte BRL→USD e formata com $.
   */
  const localeConfig: Record<Currency, { locale: string; code: string }> = {
    USD: { locale: 'en-US', code: 'USD' },
    BRL: { locale: 'pt-BR', code: 'BRL' },
    EUR: { locale: 'de-DE', code: 'EUR' },
  }

  const formatValue = (value: number | undefined): string => {
    if (
      value === null ||
      value === undefined ||
      typeof value !== 'number' ||
      Number.isNaN(value) ||
      !Number.isFinite(value)
    ) {
      const { locale, code } = localeConfig[userCurrency]
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(0)
    }
    // Converter BRL → moeda do usuário
    const converted = currencyManager.convert(value, 'BRL', userCurrency).convertedValue
    const { locale, code } = localeConfig[userCurrency]
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted)
  }

  // isBuy já declarado no início do componente

  /**
   * Formata valor SEMPRE em BRL — usado para PIX/TED (métodos de pagamento brasileiros)
   * que devem mostrar o valor em Reais independente da moeda do usuário.
   */
  const formatBRL = (value: string | number): string => {
    const num = typeof value === 'string' ? Number.parseFloat(value) : value
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }


  // ───────────────────────── Apresentação (mesma identidade da Home/OTC) ─────────────────────────
  const qtyStr = (n: number) =>
    `${(n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: quote.symbol === 'USDT' || quote.symbol === 'USDC' ? 2 : 8 })} ${quote.symbol}`
  const validity = Math.max(1, quote.expires_in_seconds || 30)

  const goToTracking = () => {
    if (!tradeCreated) return
    onSuccess(tradeCreated, {
      id: tradeCreated,
      operation: quote.operation,
      symbol: quote.symbol,
      crypto_amount: quote.crypto_amount,
      fiat_amount: quote.fiat_amount,
      total_amount: quote.total_amount,
      ...(quote.brl_total_amount !== undefined && { brl_total_amount: quote.brl_total_amount }),
      ...(quote.usd_to_brl_rate !== undefined && { usd_to_brl_rate: quote.usd_to_brl_rate }),
      payment_method: 'pix',
      status: pixStatus === 'paid' ? 'PAYMENT_CONFIRMED' : 'PENDING',
      created_at: new Date().toISOString(),
    })
  }

  const Row = ({ k, v, strong }: { k: React.ReactNode; v: React.ReactNode; strong?: boolean }) => (
    <div className='flex justify-between gap-4'>
      <dt className={strong ? 'font-semibold text-gray-900 dark:text-[#EEF1F7]' : MUTED}>{k}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-semibold text-gray-900 dark:text-[#EEF1F7]' : 'font-medium text-gray-900 dark:text-[#EEF1F7]'}`}>
        {v}
      </dd>
    </div>
  )

  // Etapa de pagamento Pix automático (QR Code)
  if (isBuy && tradeCreated && pixData && selectedPayment === 'bb_auto') {
    return (
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] items-start text-gray-900 dark:text-[#EEF1F7]'>
        <section aria-labelledby='pix-title' className={`${CARD} p-5 sm:p-8`}>
          {pixStatus === 'paid' ? (
            <div className='flex flex-col items-center text-center py-8 gap-4'>
              <span className='w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 dark:bg-[#34C77B]/10 dark:text-[#34C77B] flex items-center justify-center'>
                <CheckCircle className='w-8 h-8' aria-hidden='true' />
              </span>
              <div>
                <h2 id='pix-title' className='text-xl font-semibold'>
                  Pagamento confirmado
                </h2>
                <p className={`mt-1 ${SOFT}`}>
                  Seus {qtyStr(quote.crypto_amount)} estão sendo enviados para a sua carteira.
                </p>
              </div>
              <button type='button' onClick={goToTracking} className={`${BTN_PRIMARY} px-6`}>
                Acompanhar a ordem
              </button>
            </div>
          ) : (
            <div className='flex flex-col md:flex-row gap-8 items-center md:items-start'>
              <div className='shrink-0 flex flex-col items-center gap-3'>
                <div className='bg-white p-3 rounded-2xl border border-gray-200 dark:border-transparent'>
                  <QRCodeImage base64Image={pixData.qrcode_image} pixCode={pixData.qrcode} size={220} className='w-[220px] h-[220px]' />
                </div>
                <span className={`inline-flex items-center gap-2 text-sm ${SOFT}`}>
                  <Loader className='w-4 h-4 animate-spin' aria-hidden='true' />
                  Aguardando o pagamento…
                </span>
              </div>
              <div className='flex-1 min-w-0 w-full'>
                <h2 id='pix-title' className='text-xl font-semibold'>
                  Pague com Pix
                </h2>
                <p className={`mt-1 text-sm ${SOFT}`}>
                  Abra o app do seu banco, escaneie o QR Code ou use o Pix copia e cola.
                </p>
                <p className={`mt-6 text-sm ${SOFT}`}>Valor a pagar</p>
                <p className='font-["Space_Grotesk",Inter,sans-serif] text-4xl font-semibold tracking-tight tabular-nums'>
                  {formatBRL(pixData.valor)}
                </p>
                <div className='mt-6'>
                  <p className={`text-sm mb-2 ${SOFT}`}>Pix copia e cola</p>
                  <div className='flex flex-col sm:flex-row gap-2'>
                    <code className='flex-1 min-w-0 rounded-xl bg-gray-50 dark:bg-[#0D121C] border border-gray-200 dark:border-[#222B3D] px-3 py-3 text-xs font-mono break-all max-h-24 overflow-y-auto text-gray-700 dark:text-[#A3ADC2]'>
                      {pixData.qrcode}
                    </code>
                    <button
                      type='button'
                      onClick={copyPixCode}
                      className={`h-12 sm:h-auto px-5 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors ${
                        pixCopied
                          ? 'bg-emerald-600 text-white dark:bg-[#34C77B] dark:text-[#0A0E15]'
                          : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#5B8CFF] dark:text-[#0A0E15] dark:hover:bg-[#7AA2FF]'
                      }`}
                    >
                      {pixCopied ? <CheckCheck className='w-4 h-4' aria-hidden='true' /> : <Copy className='w-4 h-4' aria-hidden='true' />}
                      {pixCopied ? 'Copiado' : 'Copiar código'}
                    </button>
                  </div>
                </div>
                <p className={`mt-5 inline-flex items-center gap-2 text-sm ${SOFT}`}>
                  <Clock className='w-4 h-4' aria-hidden='true' />
                  O Pix expira em {Math.max(1, Math.floor(pixData.expiracao_segundos / 60))} minutos.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className={`${CARD} p-5 sm:p-6 lg:sticky lg:top-4`}>
          <h3 className='text-lg font-semibold mb-4'>Resumo da ordem</h3>
          <dl className='space-y-2.5 text-sm'>
            <Row k='Operação' v={`Compra de ${quote.symbol}`} />
            <Row k='Você paga' v={formatBRL(pixData.valor)} />
            <div className='pt-3 mt-1 border-t border-gray-100 dark:border-[#1E2738]'>
              <Row k='Você recebe' v={qtyStr(quote.crypto_amount)} strong />
            </div>
            <Row k='Ordem' v={<span className='font-mono text-xs'>{tradeCreated.substring(0, 8)}…</span>} />
            <Row k='TXID Pix' v={<span className='font-mono text-xs'>{pixData.txid.length > 16 ? `${pixData.txid.substring(0, 16)}…` : pixData.txid}</span>} />
          </dl>
          {pixStatus !== 'paid' && (
            <button type='button' onClick={goToTracking} className={`${BTN_SECONDARY} w-full mt-5`}>
              Já paguei · acompanhar a ordem
            </button>
          )}
          <p className={`mt-4 flex items-center justify-center gap-2 text-xs ${MUTED}`}>
            <Shield className='w-3.5 h-3.5' aria-hidden='true' />
            Pix processado pelo Banco do Brasil
          </p>
        </aside>
      </div>
    )
  }

  // Ordem criada por outro meio (TED aguardando comprovante ou acompanhamento)
  if (tradeCreated) {
    return (
      <section className={`${CARD} p-5 sm:p-8 max-w-3xl text-gray-900 dark:text-[#EEF1F7]`}>
        {pendingProof ? (
          <div className='space-y-6'>
            <div className='flex items-start gap-4'>
              <span className='w-12 h-12 shrink-0 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300 flex items-center justify-center'>
                <ClipboardList className='w-6 h-6' aria-hidden='true' />
              </span>
              <div>
                <h2 className='text-xl font-semibold'>Envie o comprovante</h2>
                <p className={`mt-1 text-sm ${SOFT}`}>Sua ordem está aguardando a confirmação do pagamento.</p>
              </div>
            </div>
            <dl className='space-y-2.5 text-sm rounded-xl bg-gray-50 dark:bg-[#0D121C] p-4'>
              <Row k='Ordem' v={<span className='font-mono text-xs break-all'>{tradeCreated}</span>} />
              <Row k='Valor' v={formatValue(quote.fiat_amount ?? 0)} />
              <Row k='Forma de pagamento' v={selectedPayment.toUpperCase()} />
              <Row k='Você recebe' v={qtyStr(quote.crypto_amount)} strong />
            </dl>
            <ol className={`space-y-2 text-sm ${SOFT} list-decimal list-inside`}>
              <li>Faça a transferência para a conta informada.</li>
              <li>Guarde o comprovante.</li>
              <li>Envie o comprovante pelo Suporte ou Chat.</li>
              <li>Nossa equipe confere e conclui a ordem.</li>
            </ol>
            <button type='button' onClick={onBack} className={`${BTN_SECONDARY} w-full sm:w-auto px-6`}>
              Voltar para comprar e vender
            </button>
          </div>
        ) : (
          <div className='space-y-6'>
            <TradeStatusMonitor
              tradeId={tradeCreated}
              initialStatus='PENDING'
              onStatusChange={newStatus => {
                if (newStatus === 'COMPLETED') toast.success('Ordem concluída!')
              }}
            />
            <button type='button' onClick={onBack} className={`${BTN_SECONDARY} w-full sm:w-auto px-6`}>
              Voltar para comprar e vender
            </button>
          </div>
        )}
      </section>
    )
  }

  // Revisão + forma de pagamento (compra) ou conta de recebimento (venda)
  const selectedMethod = !isBuy ? userPaymentMethods?.find((m: any) => m.id === selectedReceivingMethod) : null
  const methodLabel = (m: any) =>
    m.type === 'pix' ? 'Pix' : m.type === 'bank_transfer' ? 'TED / transferência' : String(m.type || '').toUpperCase()
  const methodDetail = (m: any) =>
    m.type === 'pix'
      ? `${m.details?.keyType || 'Chave'}: ${m.details?.keyValue || m.details?.key_value || m.details?.pix_key || '••••'}`
      : `${m.details?.bank || m.details?.bank_name || 'Banco'} · Ag ${m.details?.agency || '••••'} · CC ${m.details?.account || m.details?.account_number || '••••'}`
  const blocked = quoteExpired || (!isBuy && !selectedReceivingMethod)

  return (
    <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] items-start text-gray-900 dark:text-[#EEF1F7]'>
      {/* Escolha do pagamento / recebimento */}
      <section aria-labelledby='pay-title' className={`${CARD} p-5 sm:p-6 order-2 lg:order-1`}>
        {isBuy ? (
          <>
            <h2 id='pay-title' className='text-lg font-semibold'>
              Como você quer pagar?
            </h2>
            <p className={`mt-1 text-sm ${SOFT}`}>Pagamentos em reais, de conta no seu nome.</p>
            <div role='radiogroup' aria-labelledby='pay-title' className='mt-5 grid gap-3 sm:grid-cols-2'>
              {BUY_PAYMENT_METHODS.map(method => {
                const Icon = method.icon
                const active = selectedPayment === method.id
                return (
                  <button
                    key={method.id}
                    type='button'
                    role='radio'
                    aria-checked={active}
                    disabled={loading}
                    onClick={() => setSelectedPayment(method.id)}
                    className={`relative text-left rounded-xl border p-4 flex items-start gap-3 transition-colors disabled:opacity-50 ${
                      active
                        ? 'border-blue-600 bg-blue-50/60 dark:border-[#5B8CFF] dark:bg-[#172033]'
                        : 'border-gray-200 hover:border-gray-300 dark:border-[#222B3D] dark:hover:border-[#2F3D5C]'
                    }`}
                  >
                    <span className='w-10 h-10 shrink-0 rounded-xl bg-gray-100 dark:bg-[#0D121C] flex items-center justify-center text-gray-700 dark:text-[#A3ADC2]'>
                      <Icon className='w-5 h-5' aria-hidden='true' />
                    </span>
                    <span className='flex-1 min-w-0'>
                      <span className='flex items-center gap-2 font-semibold'>
                        {method.id === 'bb_auto' ? 'Pix' : 'TED'}
                        {method.id === 'bb_auto' && (
                          <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-[#34C77B]/10 dark:text-[#34C77B]'>
                            Recomendado
                          </span>
                        )}
                      </span>
                      <span className={`block text-sm mt-0.5 ${SOFT}`}>
                        {method.id === 'bb_auto'
                          ? 'Confirmação automática em segundos, 24 h por dia.'
                          : 'Transferência com envio de comprovante. Pode levar algumas horas.'}
                      </span>
                    </span>
                    {active && <CheckCircle className='w-5 h-5 text-blue-600 dark:text-[#8FB0FF] shrink-0' aria-hidden='true' />}
                  </button>
                )
              })}
            </div>

            {selectedPayment === 'ted' && (
              <div className='mt-5 rounded-xl border border-gray-200 dark:border-[#222B3D] p-4'>
                <p className='text-sm font-semibold flex items-center gap-2'>
                  <Building2 className='w-4 h-4' aria-hidden='true' />
                  Dados para a transferência (após confirmar)
                </p>
                <dl className='mt-3 space-y-2 text-sm'>
                  <Row k='Banco' v='Banco do Brasil (001)' />
                  <Row k='CNPJ' v={<span className='font-mono'>24.275.355/0001-51</span>} />
                  <Row k='Agência' v={<span className='font-mono'>5271-0</span>} />
                  <Row k='Conta' v={<span className='font-mono'>26689-2</span>} />
                  <Row k='Titular' v='HOLD DIGITAL ASSETS LTDA' />
                  <div className='pt-2 mt-1 border-t border-gray-100 dark:border-[#1E2738]'>
                    <Row k='Valor' v={formatBRL(quote.total_amount ?? quote.fiat_amount ?? 0)} strong />
                  </div>
                </dl>
                <p className={`mt-3 text-xs flex items-start gap-2 ${SOFT}`}>
                  <AlertTriangle className='w-3.5 h-3.5 mt-0.5 shrink-0' aria-hidden='true' />
                  Depois de confirmar, você tem 15 minutos para transferir e enviar o comprovante.
                </p>
              </div>
            )}

            {selectedPayment === 'ted' && bankDetails && (
              <dl className='mt-4 space-y-2 text-sm rounded-xl bg-gray-50 dark:bg-[#0D121C] p-4'>
                <Row k='Banco' v={bankDetails.bank_name} />
                <Row k='CNPJ' v={<span className='font-mono'>{bankDetails.cnpj}</span>} />
                <Row k='Agência' v={<span className='font-mono'>{bankDetails.agency}</span>} />
                <Row k='Conta' v={<span className='font-mono'>{bankDetails.account_number}</span>} />
                <Row k='Titular' v={bankDetails.account_holder} />
              </dl>
            )}
          </>
        ) : (
          <>
            <h2 id='pay-title' className='text-lg font-semibold flex items-center gap-2'>
              <ArrowDownToLine className='w-5 h-5' aria-hidden='true' />
              Onde você quer receber?
            </h2>
            <p className={`mt-1 text-sm ${SOFT}`}>O valor da venda vai para a conta escolhida.</p>

            {loadingPaymentMethods ? (
              <div className={`mt-5 flex items-center gap-2 text-sm ${SOFT}`}>
                <Loader className='w-4 h-4 animate-spin' aria-hidden='true' />
                Carregando suas contas…
              </div>
            ) : !userPaymentMethods || userPaymentMethods.length === 0 ? (
              <div className='mt-5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/5 p-4'>
                <p className='font-semibold flex items-center gap-2'>
                  <AlertTriangle className='w-4 h-4 text-amber-600 dark:text-amber-300' aria-hidden='true' />
                  Nenhuma conta cadastrada
                </p>
                <p className={`mt-1 text-sm ${SOFT}`}>Cadastre uma chave Pix ou conta bancária no seu nome para receber.</p>
                <Link to='/settings/payment-methods' className={`${BTN_PRIMARY} mt-4 px-5 inline-flex`}>
                  <Plus className='w-4 h-4' aria-hidden='true' />
                  Cadastrar conta
                  <ExternalLink className='w-3.5 h-3.5' aria-hidden='true' />
                </Link>
              </div>
            ) : (
              <div role='radiogroup' aria-labelledby='pay-title' className='mt-5 space-y-3'>
                {userPaymentMethods.map((method: any) => {
                  const active = selectedReceivingMethod === method.id
                  return (
                    <button
                      key={method.id}
                      type='button'
                      role='radio'
                      aria-checked={active}
                      disabled={loading}
                      onClick={() => setSelectedReceivingMethod(method.id)}
                      className={`w-full text-left rounded-xl border p-4 flex items-center gap-3 transition-colors disabled:opacity-50 ${
                        active
                          ? 'border-blue-600 bg-blue-50/60 dark:border-[#5B8CFF] dark:bg-[#172033]'
                          : 'border-gray-200 hover:border-gray-300 dark:border-[#222B3D] dark:hover:border-[#2F3D5C]'
                      }`}
                    >
                      <span className='w-10 h-10 shrink-0 rounded-xl bg-gray-100 dark:bg-[#0D121C] flex items-center justify-center text-gray-700 dark:text-[#A3ADC2]'>
                        {method.type === 'pix' ? <Banknote className='w-5 h-5' aria-hidden='true' /> : <Building2 className='w-5 h-5' aria-hidden='true' />}
                      </span>
                      <span className='flex-1 min-w-0'>
                        <span className='flex items-center gap-2 font-semibold'>
                          {methodLabel(method)}
                          {method.is_primary && (
                            <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-[#0D121C] dark:text-[#A3ADC2]'>
                              Principal
                            </span>
                          )}
                        </span>
                        <span className={`block text-sm truncate ${SOFT}`}>{methodDetail(method)}</span>
                        {(method.details?.holderName || method.details?.holder_name) && (
                          <span className={`block text-xs truncate ${MUTED}`}>{method.details?.holderName || method.details?.holder_name}</span>
                        )}
                      </span>
                      {active && <CheckCircle className='w-5 h-5 text-blue-600 dark:text-[#8FB0FF] shrink-0' aria-hidden='true' />}
                    </button>
                  )
                })}
                <Link
                  to='/settings/payment-methods'
                  className={`flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-gray-300 dark:border-[#2A3449] text-sm ${SOFT} hover:border-blue-500 hover:text-blue-600 dark:hover:border-[#5B8CFF] dark:hover:text-[#8FB0FF]`}
                >
                  <Plus className='w-4 h-4' aria-hidden='true' />
                  Adicionar outra conta
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* Resumo + confirmação */}
      <aside className={`${CARD} p-5 sm:p-6 order-1 lg:order-2 lg:sticky lg:top-4`}>
        <div className='flex items-center gap-3'>
          <CryptoIcon symbol={quote.symbol} size={40} className='rounded-full shrink-0' />
          <div>
            <p className={`text-sm ${SOFT}`}>{isBuy ? 'Compra' : 'Venda'}</p>
            <h3 className='text-lg font-semibold'>{quote.symbol}</h3>
          </div>
        </div>

        <p className={`mt-5 text-sm ${SOFT}`}>{isBuy ? 'Você recebe' : 'Você recebe'}</p>
        <p className='font-["Space_Grotesk",Inter,sans-serif] text-3xl font-semibold tracking-tight tabular-nums break-all'>
          {isBuy ? qtyStr(quote.crypto_amount) : formatValue(quote.total_amount ?? 0)}
        </p>

        <dl className='mt-5 pt-5 border-t border-gray-100 dark:border-[#1E2738] space-y-2.5 text-sm'>
          <Row k={isBuy ? 'Você paga' : 'Você vende'} v={isBuy ? formatValue(quote.fiat_amount ?? 0) : qtyStr(quote.crypto_amount)} />
          <Row k={`Preço por ${quote.symbol}`} v={formatValue(quote.crypto_price ?? 0)} />
          <Row k={`Spread (${quote.spread_percentage ?? 0}%)`} v={formatValue(quote.spread_amount ?? 0)} />
          <Row k={`Taxa de rede (${quote.network_fee_percentage ?? 0}%)`} v={formatValue(quote.network_fee_amount ?? 0)} />
          {!isBuy && selectedMethod && <Row k='Recebe em' v={methodLabel(selectedMethod)} />}
        </dl>

        {/* Validade da cotação */}
        <div className='mt-5'>
          {quoteExpired ? (
            <div className='flex items-center justify-between gap-3 rounded-xl bg-red-50 dark:bg-[#FF7A7A]/10 px-4 py-3'>
              <span className='text-sm font-medium text-red-700 dark:text-[#FF9A9A] flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4' aria-hidden='true' />
                Cotação expirada
              </span>
              {onRefreshQuote && (
                <button
                  type='button'
                  onClick={onRefreshQuote}
                  className='inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-[#8FB0FF]'
                >
                  <RefreshCw className='w-4 h-4' aria-hidden='true' />
                  Nova cotação
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className={`flex justify-between text-xs mb-1.5 ${MUTED}`}>
                <span className='inline-flex items-center gap-1.5'>
                  <Clock className='w-3.5 h-3.5' aria-hidden='true' />
                  Preço garantido por
                </span>
                <span className={`tabular-nums font-semibold ${timeLeft <= 10 ? 'text-amber-600 dark:text-amber-300' : ''}`}>{timeLeft} s</span>
              </div>
              <div className='h-1.5 rounded-full bg-gray-100 dark:bg-[#1E2738] overflow-hidden' aria-hidden='true'>
                <div
                  className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-amber-500' : 'bg-blue-600 dark:bg-[#5B8CFF]'}`}
                  style={{ width: `${Math.min(100, (timeLeft / validity) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type='button'
          onClick={createTrade}
          disabled={loading || blocked}
          className={`${BTN_PRIMARY} w-full mt-5 h-[52px] text-[15px]`}
        >
          {loading ? (
            <>
              <Loader className='w-4 h-4 animate-spin' aria-hidden='true' />
              Processando…
            </>
          ) : quoteExpired ? (
            'Cotação expirada'
          ) : !isBuy && !selectedReceivingMethod ? (
            'Escolha uma conta para receber'
          ) : isBuy ? (
            selectedPayment === 'bb_auto' ? 'Confirmar e gerar o Pix' : 'Confirmar compra'
          ) : (
            'Confirmar venda'
          )}
        </button>
        <button type='button' onClick={onBack} disabled={loading} className={`${BTN_SECONDARY} w-full mt-2`}>
          Voltar
        </button>
        <p className={`mt-4 text-xs text-center ${MUTED}`}>
          {isBuy
            ? 'Ao confirmar, o preço fica travado e a ordem não pode ser desfeita.'
            : 'Ao confirmar, sua cripto é reservada e o valor é enviado para a conta escolhida.'}
        </p>
        <p className={`mt-1 text-[11px] text-center font-mono ${MUTED}`}>Cotação {(quote.quote_id ?? '').substring(0, 12)}</p>
      </aside>
    </div>
  )
}

const CARD = 'bg-white border border-gray-200 dark:bg-[#111724] dark:border-[#1E2738] rounded-2xl'
const MUTED = 'text-gray-500 dark:text-[#8590A6]'
const SOFT = 'text-gray-600 dark:text-[#A3ADC2]'
const BTN_PRIMARY =
  'h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#5B8CFF] dark:text-[#0A0E15] dark:hover:bg-[#7AA2FF] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
const BTN_SECONDARY =
  'h-12 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-[#2A3449] dark:text-[#EEF1F7] dark:hover:bg-[#172033] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-colors'
