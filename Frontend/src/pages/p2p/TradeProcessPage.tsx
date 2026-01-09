import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Send,
  Flag,
  Star,
  Info,
  Shield,
  DollarSign,
  MessageCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  X,
  AlertTriangle,
  ThumbsUp,
} from 'lucide-react'
import {
  useP2PTrade,
  useMarkPaymentSent,
  useConfirmPaymentReceived,
  useReleaseEscrow,
  useCancelTrade,
  useDisputeTrade,
  useSendTradeMessage,
  useTradeMessages,
  useLeaveFeedback,
} from '@/hooks/useP2PTrades'
import { toast } from 'react-hot-toast'
import { appNotifications } from '@/services/appNotifications'
import { P2PPaymentDetails } from '@/components/p2p/P2PPaymentDetails'
import { useAuthStore } from '@/stores/useAuthStore'

type TradeStatusLocal =
  | 'pending'
  | 'payment_pending'
  | 'payment_sent'
  | 'payment_confirmed'
  | 'escrow_released'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export const TradeProcessPage = () => {
  const navigate = useNavigate()
  const { tradeId } = useParams<{ tradeId: string }>()
  const { user } = useAuthStore()

  // State
  const [message, setMessage] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)

  // Fetch trade data
  const { data: trade, isLoading, error } = useP2PTrade(tradeId!)
  const { data: messagesData } = useTradeMessages(tradeId!)

  // Mutations
  const markPaymentMutation = useMarkPaymentSent()
  const confirmPaymentMutation = useConfirmPaymentReceived()
  const releaseEscrowMutation = useReleaseEscrow()
  const cancelTradeMutation = useCancelTrade()
  const disputeMutation = useDisputeTrade()
  const sendMessageMutation = useSendTradeMessage()
  const feedbackMutation = useLeaveFeedback()

  // Timer countdown
  useEffect(() => {
    if (!trade || !trade.timeLimit) return

    const calculateTimeLeft = () => {
      const createdAt = new Date(trade.createdAt).getTime()
      const timeLimit = trade.timeLimit * 60 * 1000 // convert to ms
      const deadline = createdAt + timeLimit
      const now = Date.now()
      const remaining = Math.max(0, deadline - now)
      return Math.floor(remaining / 1000) // convert to seconds
    }

    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)

      if (remaining === 0) {
        clearInterval(interval)
        toast.error('Tempo limite expirado!')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [trade])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getTimelineSteps = (status: string) => {
    const steps = [
      {
        key: 'pending',
        label: 'Aguardando Pagamento',
        icon: Clock,
        active: status === 'pending' || status === 'payment_pending',
      },
      {
        key: 'payment_sent',
        label: 'Pagamento Enviado',
        icon: Upload,
        active: status === 'payment_sent',
      },
      {
        key: 'payment_confirmed',
        label: 'Pagamento Confirmado',
        icon: CheckCircle,
        active: status === 'payment_confirmed',
      },
      {
        key: 'escrow_released',
        label: 'Escrow Liberado',
        icon: Shield,
        active: status === 'escrow_released',
      },
      {
        key: 'completed',
        label: 'Completo',
        icon: ThumbsUp,
        active: status === 'completed',
      },
    ]

    const currentIndex = steps.findIndex(s => s.key === status)

    return steps.map((step, index) => ({
      ...step,
      completed: index < currentIndex,
      current: index === currentIndex,
    }))
  }

  const handleMarkPaymentSent = async () => {
    if (!uploadedFile) {
      toast.error('Por favor, faça upload do comprovante de pagamento')
      return
    }

    try {
      await markPaymentMutation.mutateAsync({
        tradeId: tradeId!,
        message: 'Pagamento enviado',
      })

      // Notify payment sent
      appNotifications.pixSent(Number.parseFloat(trade?.amount || '0'), 'Contraparte')

      toast.success('Pagamento marcado como enviado!')
      setUploadedFile(null)
    } catch (error) {
      console.error('Error marking payment:', error)
    }
  }

  const handleConfirmPayment = async () => {
    try {
      await confirmPaymentMutation.mutateAsync(tradeId!)

      // Notify payment confirmed
      appNotifications.paymentConfirmed(
        tradeId || '',
        Number.parseFloat(trade?.amount || '0'),
        'BRL'
      )

      toast.success('Pagamento confirmado!')
    } catch (error) {
      console.error('Error confirming payment:', error)
    }
  }

  const handleReleaseEscrow = async () => {
    try {
      await releaseEscrowMutation.mutateAsync(tradeId!)

      // Notify trade completed
      appNotifications.orderCompleted(
        tradeId || '',
        Number.parseFloat(trade?.amount || '0'),
        trade?.coin || 'BTC'
      )

      toast.success('Escrow liberado! Criptomoeda transferida.')
    } catch (error) {
      console.error('Error releasing escrow:', error)
    }
  }

  const handleCancelTrade = async () => {
    if (!confirm('Tem certeza que deseja cancelar este trade?')) return

    try {
      await cancelTradeMutation.mutateAsync({
        tradeId: tradeId!,
        reason: 'Usuário cancelou o trade',
      })
      toast.success('Trade cancelado')
      navigate('/p2p')
    } catch (error) {
      console.error('Error canceling trade:', error)
    }
  }

  const handleOpenDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Por favor, descreva o motivo da disputa')
      return
    }

    try {
      await disputeMutation.mutateAsync({
        tradeId: tradeId!,
        reason: disputeReason,
        description: disputeReason,
      })

      toast.success('Disputa aberta. Nossa equipe irá analisar.')
      setShowDisputeModal(false)
      setDisputeReason('')
    } catch (error) {
      console.error('Error opening dispute:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

    try {
      await sendMessageMutation.mutateAsync({
        tradeId: tradeId!,
        message: message.trim(),
      })

      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleLeaveFeedback = async () => {
    if (rating === 0) {
      toast.error('Por favor, selecione uma avaliação')
      return
    }

    try {
      await feedbackMutation.mutateAsync({
        tradeId: tradeId!,
        rating,
        comment: feedbackComment,
        type: rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative',
      })

      toast.success('Obrigado pelo seu feedback!')
      setShowFeedbackModal(false)
      navigate('/p2p')
    } catch (error) {
      console.error('Error leaving feedback:', error)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        toast.error('Arquivo muito grande. Máximo 5MB')
        return
      }
      setUploadedFile(file)
      toast.success('Arquivo selecionado')
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
        <span className='ml-3 text-gray-600 dark:text-gray-400'>Carregando trade...</span>
      </div>
    )
  }

  if (error || !trade) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen'>
        <AlertCircle className='w-16 h-16 text-red-500 mb-4' />
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
          Erro ao carregar trade
        </h2>
        <p className='text-gray-600 dark:text-gray-400 mb-4'>
          {error instanceof Error ? error.message : 'Trade não encontrado'}
        </p>
        <button
          onClick={() => navigate('/p2p')}
          className='text-blue-600 hover:text-blue-700 font-medium'
        >
          Voltar ao Marketplace
        </button>
      </div>
    )
  }

  // Debug: verificar se usuário é comprador
  console.log('[TradeProcessPage] Debug:', {
    'trade.buyerId': trade.buyerId,
    'user?.id': user?.id,
    'trade.status': trade.status,
    isBuyer: trade.buyerId === user?.id,
    paymentMethod: trade.paymentMethod,
  })

  const steps = getTimelineSteps(trade.status)
  const isBuyer = trade.buyerId === user?.id // Verificar se usuário atual é o comprador
  const canMarkPayment =
    isBuyer && (trade.status === 'payment_pending' || trade.status === 'pending')
  const canConfirmPayment = !isBuyer && trade.status === 'payment_sent'
  const canReleaseEscrow = !isBuyer && trade.status === 'payment_confirmed'
  const isCompleted = trade.status === 'completed'
  const isDisputed = trade.status === 'disputed'

  return (
    <div className='max-w-7xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <button
          onClick={() => navigate('/p2p')}
          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
        >
          <ArrowLeft className='w-5 h-5' />
        </button>
        <div className='flex-1'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            Trade #{trade.id.slice(0, 8)}
          </h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1'>
            {isBuyer ? 'Comprando' : 'Vendendo'} {trade.coin}
          </p>
        </div>

        {/* Timer */}
        {!isCompleted && !isDisputed && (
          <div
            className={`px-6 py-3 rounded-lg ${
              timeLeft < 300 ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'
            }`}
          >
            <div className='flex items-center gap-2'>
              <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'text-red-600' : 'text-blue-600'}`} />
              <div>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Tempo Restante</p>
                <p
                  className={`text-2xl font-bold ${
                    timeLeft < 300 ? 'text-red-600' : 'text-blue-600'
                  }`}
                >
                  {formatTime(timeLeft)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
        <div className='relative'>
          <div className='flex justify-between'>
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.key} className='flex flex-col items-center flex-1'>
                  <div
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                      step.completed
                        ? 'bg-green-600'
                        : step.current
                          ? 'bg-blue-600 ring-4 ring-blue-200 dark:ring-blue-900'
                          : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <Icon className='w-6 h-6 text-white' />
                  </div>
                  <p
                    className={`mt-2 text-sm font-medium text-center ${
                      step.completed || step.current
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute top-6 left-1/2 w-full h-1 -z-10 ${
                        step.completed ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      style={{ transform: 'translateY(-50%)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column - Trade Info & Actions */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Trade Details */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
              Detalhes do Trade
            </h2>

            <div className='grid grid-cols-2 gap-6'>
              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                  Você {isBuyer ? 'paga' : 'recebe'}
                </p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {formatCurrency(parseFloat(trade.amount))}
                </p>
              </div>

              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                  Você {isBuyer ? 'recebe' : 'envia'}
                </p>
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {(parseFloat(trade.amount) / parseFloat(trade.price)).toFixed(8)} {trade.coin}
                </p>
              </div>

              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Preço</p>
                <p className='text-lg font-semibold text-gray-900 dark:text-white'>
                  {formatCurrency(parseFloat(trade.price))}
                </p>
              </div>

              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Método de Pagamento</p>
                <p className='text-lg font-semibold text-gray-900 dark:text-white'>
                  {trade.paymentMethod?.type?.toUpperCase() || 'PIX'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Ações</h2>

            {isDisputed && (
              <div className='p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 mb-4'>
                <div className='flex gap-3'>
                  <AlertTriangle className='w-6 h-6 text-red-600 flex-shrink-0' />
                  <div>
                    <p className='font-medium text-red-900 dark:text-red-300'>Trade em Disputa</p>
                    <p className='text-sm text-red-700 dark:text-red-400 mt-1'>
                      Nossa equipe está analisando. Você receberá uma resposta em breve.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-4'>
                <div className='flex gap-3'>
                  <CheckCircle className='w-6 h-6 text-green-600 flex-shrink-0' />
                  <div>
                    <p className='font-medium text-green-900 dark:text-green-300'>
                      Trade Completo!
                    </p>
                    <p className='text-sm text-green-700 dark:text-green-400 mt-1'>
                      A transação foi concluída com sucesso. Avalie o trader!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details com QR Code PIX */}
            {canMarkPayment && (
              <div className='space-y-4'>
                {/* Componente de Pagamento com QR Code */}
                <P2PPaymentDetails
                  tradeId={tradeId!}
                  orderId={trade.orderId || tradeId!}
                  sellerPaymentMethods={[
                    {
                      id: trade.paymentMethod?.id || '1',
                      type: trade.paymentMethod?.type || 'pix',
                      details: trade.paymentMethod?.details || {},
                    },
                  ]}
                  amount={Number.parseFloat(trade.total || trade.amount)}
                  fiatCurrency={trade.fiatCurrency || 'BRL'}
                  cryptoAmount={(parseFloat(trade.amount) / parseFloat(trade.price)).toFixed(8)}
                  cryptoCoin={trade.coin || 'USDT'}
                  sellerName={trade.seller?.username || 'Vendedor'}
                  timeLimit={Math.ceil(timeLeft / 60)}
                  onPaymentSent={handleMarkPaymentSent}
                />

                {/* Upload de Comprovante (opcional) */}
                <div className='border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6'>
                  <input
                    type='file'
                    accept='image/*,.pdf'
                    onChange={handleFileUpload}
                    className='hidden'
                    id='proof-upload'
                  />
                  <label
                    htmlFor='proof-upload'
                    className='flex flex-col items-center cursor-pointer'
                  >
                    {uploadedFile ? (
                      <div className='flex items-center gap-3'>
                        <FileText className='w-8 h-8 text-green-600' />
                        <div>
                          <p className='font-medium text-gray-900 dark:text-white'>
                            {uploadedFile.name}
                          </p>
                          <p className='text-sm text-gray-600 dark:text-gray-400'>
                            {(uploadedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          onClick={e => {
                            e.preventDefault()
                            setUploadedFile(null)
                          }}
                          className='ml-auto p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg'
                        >
                          <X className='w-5 h-5' />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className='w-12 h-12 text-gray-400 mb-3' />
                        <p className='text-gray-700 dark:text-gray-300 font-medium mb-1'>
                          Clique para fazer upload
                        </p>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          PNG, JPG ou PDF (máx. 5MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>

                <button
                  onClick={handleMarkPaymentSent}
                  disabled={!uploadedFile || markPaymentMutation.isPending}
                  className='w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2'
                >
                  {markPaymentMutation.isPending ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className='w-5 h-5' />
                      Marcar Pagamento como Enviado
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Confirm Payment */}
            {canConfirmPayment && (
              <div className='space-y-4'>
                <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800'>
                  <div className='flex gap-3'>
                    <AlertCircle className='w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5' />
                    <div className='text-sm text-gray-700 dark:text-gray-300'>
                      <p className='font-medium mb-1'>Atenção:</p>
                      <p>
                        Confirme apenas se você realmente recebeu o pagamento. Após confirmar, o
                        escrow será liberado.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  disabled={confirmPaymentMutation.isPending}
                  className='w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2'
                >
                  {confirmPaymentMutation.isPending ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className='w-5 h-5' />
                      Confirmar Recebimento do Pagamento
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Release Escrow */}
            {canReleaseEscrow && (
              <button
                onClick={handleReleaseEscrow}
                disabled={releaseEscrowMutation.isPending}
                className='w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2'
              >
                {releaseEscrowMutation.isPending ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    Liberando...
                  </>
                ) : (
                  <>
                    <Shield className='w-5 h-5' />
                    Liberar Escrow
                  </>
                )}
              </button>
            )}

            {/* Feedback */}
            {isCompleted && (
              <button
                onClick={() => setShowFeedbackModal(true)}
                className='w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center justify-center gap-2'
              >
                <Star className='w-5 h-5' />
                Avaliar Trader
              </button>
            )}

            {/* Dispute and Cancel */}
            {!isCompleted && !isDisputed && (
              <div className='flex gap-3 mt-4'>
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className='flex-1 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2'
                >
                  <Flag className='w-4 h-4' />
                  Abrir Disputa
                </button>

                <button
                  onClick={handleCancelTrade}
                  disabled={cancelTradeMutation.isPending}
                  className='flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2'
                >
                  <X className='w-4 h-4' />
                  Cancelar Trade
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Chat */}
        <div
          className='bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col'
          style={{ height: '600px' }}
        >
          <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
            <div className='flex items-center gap-3'>
              <MessageCircle className='w-5 h-5 text-blue-600' />
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Chat do Trade</h2>
            </div>
          </div>

          {/* Messages */}
          <div className='flex-1 overflow-y-auto p-4 space-y-4'>
            {(messagesData || [])?.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.is_own
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className='text-sm'>{msg.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.is_own ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {(!messagesData || messagesData.length === 0) && (
              <div className='flex flex-col items-center justify-center h-full'>
                <MessageCircle className='w-12 h-12 text-gray-400 mb-3' />
                <p className='text-gray-600 dark:text-gray-400 text-center'>
                  Nenhuma mensagem ainda.
                  <br />
                  Inicie a conversa!
                </p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
            <div className='flex gap-2'>
              <input
                type='text'
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                placeholder='Digite sua mensagem...'
                className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className='px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors inline-flex items-center justify-center'
              >
                <Send className='w-5 h-5' />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Abrir Disputa</h3>
              <button
                onClick={() => setShowDisputeModal(false)}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Motivo da Disputa
              </label>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={4}
                placeholder='Descreva o problema...'
                className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
              />
            </div>

            <div className='flex gap-3'>
              <button
                onClick={() => setShowDisputeModal(false)}
                className='flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenDispute}
                disabled={!disputeReason.trim() || disputeMutation.isPending}
                className='flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors'
              >
                {disputeMutation.isPending ? 'Abrindo...' : 'Abrir Disputa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>
                Avaliar Trader
              </h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Avaliação
              </label>
              <div className='flex gap-2 justify-center'>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className='p-2 transition-transform hover:scale-110'
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Comentário (opcional)
              </label>
              <textarea
                value={feedbackComment}
                onChange={e => setFeedbackComment(e.target.value)}
                rows={3}
                placeholder='Conte sua experiência...'
                className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
              />
            </div>

            <div className='flex gap-3'>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className='flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={handleLeaveFeedback}
                disabled={rating === 0 || feedbackMutation.isPending}
                className='flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors'
              >
                {feedbackMutation.isPending ? 'Enviando...' : 'Enviar Avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
