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
  Shield,
  MessageCircle,
  Loader2,
  X,
  AlertTriangle,
  ThumbsUp,
  Activity,
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
      const timeLimit = trade.timeLimit * 60 * 1000
      const deadline = createdAt + timeLimit
      const now = Date.now()
      const remaining = Math.max(0, deadline - now)
      return Math.floor(remaining / 1000)
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
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
      case 'payment_pending':
        return {
          label: 'Aguardando Pagamento',
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          icon: Clock,
        }
      case 'payment_sent':
        return {
          label: 'Pagamento Enviado',
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          icon: Upload,
        }
      case 'payment_confirmed':
        return {
          label: 'Pagamento Confirmado',
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-100 dark:bg-green-900/30',
          icon: CheckCircle,
        }
      case 'completed':
        return {
          label: 'Concluído',
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-100 dark:bg-green-900/30',
          icon: ThumbsUp,
        }
      case 'disputed':
        return {
          label: 'Em Disputa',
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-100 dark:bg-red-900/30',
          icon: AlertTriangle,
        }
      case 'cancelled':
        return {
          label: 'Cancelado',
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-100 dark:bg-gray-800',
          icon: X,
        }
      default:
        return {
          label: status,
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-100 dark:bg-gray-800',
          icon: Clock,
        }
    }
  }

  const getTimelineSteps = (status: string) => {
    const steps = [
      { key: 'pending', label: 'Aguardando', icon: Clock },
      { key: 'payment_sent', label: 'Pago', icon: Upload },
      { key: 'payment_confirmed', label: 'Confirmado', icon: CheckCircle },
      { key: 'completed', label: 'Completo', icon: ThumbsUp },
    ]

    const statusOrder = [
      'pending',
      'payment_pending',
      'payment_sent',
      'payment_confirmed',
      'escrow_released',
      'completed',
    ]
    const currentIndex = statusOrder.indexOf(status)

    return steps.map((step, index) => ({
      ...step,
      completed: currentIndex > index || (index === 0 && currentIndex >= 0),
      current:
        (index === 0 && (status === 'pending' || status === 'payment_pending')) ||
        (index === 1 && status === 'payment_sent') ||
        (index === 2 && (status === 'payment_confirmed' || status === 'escrow_released')) ||
        (index === 3 && status === 'completed'),
    }))
  }

  // Handlers
  const handleMarkPaymentSent = async () => {
    try {
      await markPaymentMutation.mutateAsync({
        tradeId: tradeId!,
        message: 'Pagamento enviado',
      })
      appNotifications.pixSent(Number.parseFloat(trade?.amount || '0'), 'Contraparte')
      toast.success('Pagamento marcado como enviado!')
    } catch (error) {
      console.error('Error marking payment:', error)
    }
  }

  const handleConfirmPayment = async () => {
    try {
      await confirmPaymentMutation.mutateAsync(tradeId!)
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
      await sendMessageMutation.mutateAsync({ tradeId: tradeId!, message: message.trim() })
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

  // Loading state
  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh]'>
        <div className='relative'>
          <div className='w-16 h-16 border-4 border-blue-200 dark:border-blue-900 rounded-full animate-pulse' />
          <div className='absolute inset-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin' />
        </div>
        <p className='mt-4 text-gray-600 dark:text-gray-400 font-medium'>Carregando trade...</p>
      </div>
    )
  }

  // Error state
  if (error || !trade) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] px-4'>
        <div className='w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4'>
          <AlertCircle className='w-10 h-10 text-red-500' />
        </div>
        <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>Erro ao carregar</h2>
        <p className='text-gray-600 dark:text-gray-400 text-center mb-6'>
          {error instanceof Error ? error.message : 'Trade não encontrado'}
        </p>
        <button
          onClick={() => navigate('/p2p')}
          className='px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors'
        >
          Voltar ao Marketplace
        </button>
      </div>
    )
  }

  const statusInfo = getStatusInfo(trade.status)
  const StatusIcon = statusInfo.icon
  const steps = getTimelineSteps(trade.status)
  const isBuyer = trade.buyerId === user?.id
  const canMarkPayment =
    isBuyer && (trade.status === 'payment_pending' || trade.status === 'pending')
  const canConfirmPayment = !isBuyer && trade.status === 'payment_sent'
  const canReleaseEscrow = !isBuyer && trade.status === 'payment_confirmed'
  const isCompleted = trade.status === 'completed'
  const isDisputed = trade.status === 'disputed'

  return (
    <div className='space-y-4 md:space-y-6 pb-20 md:pb-6'>
      {/* Premium Header */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'>
        {/* Top Bar with Gradient */}
        <div className='bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 p-4 md:p-6'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate('/p2p')}
                className='p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors'
                title='Voltar ao Marketplace'
                aria-label='Voltar ao Marketplace'
              >
                <ArrowLeft className='w-5 h-5 text-white' />
              </button>
              <div>
                <div className='flex items-center gap-2'>
                  <h1 className='text-xl md:text-2xl font-bold text-white'>Trade P2P</h1>
                  <div
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </div>
                </div>
                <p className='text-blue-100 text-sm mt-0.5'>
                  #{trade.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Timer - Premium Style */}
            {!isCompleted && !isDisputed && (
              <div className='flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl'>
                <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'text-red-300' : 'text-white'}`} />
                <div>
                  <p className='text-xs text-blue-100'>Tempo Restante</p>
                  <p
                    className={`text-2xl font-bold font-mono ${timeLeft < 300 ? 'text-red-300' : 'text-white'}`}
                  >
                    {formatTime(timeLeft)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline - Compact */}
        <div className='px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <React.Fragment key={step.key}>
                  <div className='flex flex-col items-center'>
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                        step.completed
                          ? 'bg-green-500 text-white'
                          : step.current
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                      }`}
                    >
                      <Icon className='w-5 h-5' />
                    </div>
                    <p
                      className={`text-xs mt-1 font-medium text-center ${
                        step.completed || step.current
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded-full ${
                        step.completed ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
        {/* Left Column - Trade Info & Actions */}
        <div className='lg:col-span-2 space-y-4 md:space-y-6'>
          {/* Trade Summary Card - Premium */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'>
            <div className='p-4 md:p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <div className='p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl'>
                  <Activity className='w-5 h-5 text-white' />
                </div>
                <h2 className='text-lg font-bold text-gray-900 dark:text-white'>Resumo do Trade</h2>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                {/* You Pay/Receive */}
                <div className='p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl'>
                  <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
                    Você {isBuyer ? 'Paga' : 'Recebe'}
                  </p>
                  <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {formatCurrency(parseFloat(trade.total || trade.amount))}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>BRL</p>
                </div>

                {/* Crypto Amount */}
                <div className='p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl'>
                  <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
                    Você {isBuyer ? 'Recebe' : 'Envia'}
                  </p>
                  <p className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                    {(parseFloat(trade.total || trade.amount) / parseFloat(trade.price)).toFixed(6)}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>{trade.coin}</p>
                </div>

                {/* Price */}
                <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                  <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
                    Preço Unitário
                  </p>
                  <p className='text-lg font-bold text-gray-900 dark:text-white'>
                    {formatCurrency(parseFloat(trade.price))}
                  </p>
                </div>

                {/* Method */}
                <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl'>
                  <p className='text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1'>
                    Método
                  </p>
                  <p className='text-lg font-bold text-gray-900 dark:text-white'>
                    {trade.paymentMethod?.type?.toUpperCase() || 'PIX'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Alerts */}
          {isDisputed && (
            <div className='p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800'>
              <div className='flex gap-3'>
                <div className='p-2 bg-red-100 dark:bg-red-900/50 rounded-xl'>
                  <AlertTriangle className='w-5 h-5 text-red-600 dark:text-red-400' />
                </div>
                <div>
                  <p className='font-bold text-red-900 dark:text-red-300'>Trade em Disputa</p>
                  <p className='text-sm text-red-700 dark:text-red-400 mt-1'>
                    Nossa equipe está analisando. Você receberá uma resposta em breve.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800'>
              <div className='flex gap-3'>
                <div className='p-2 bg-green-100 dark:bg-green-900/50 rounded-xl'>
                  <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400' />
                </div>
                <div className='flex-1'>
                  <p className='font-bold text-green-900 dark:text-green-300'>Trade Concluído!</p>
                  <p className='text-sm text-green-700 dark:text-green-400 mt-1'>
                    A transação foi finalizada com sucesso.
                  </p>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2'
                >
                  <Star className='w-4 h-4' />
                  <span className='hidden sm:inline'>Avaliar</span>
                </button>
              </div>
            </div>
          )}

          {/* Payment Details - For Buyer */}
          {canMarkPayment && (
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
              cryptoAmount={(
                parseFloat(trade.total || trade.amount) / parseFloat(trade.price)
              ).toFixed(6)}
              cryptoCoin={trade.coin || 'USDT'}
              sellerName={trade.seller?.username || 'Vendedor'}
              timeLimit={Math.ceil(timeLeft / 60)}
              onPaymentSent={handleMarkPaymentSent}
            />
          )}

          {/* Confirm Payment - For Seller */}
          {canConfirmPayment && (
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'>
              <div className='p-4 md:p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl'>
                    <AlertCircle className='w-5 h-5 text-white' />
                  </div>
                  <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                    Confirmar Recebimento
                  </h2>
                </div>

                <div className='p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 mb-4'>
                  <p className='text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2'>
                    <AlertCircle className='w-4 h-4 flex-shrink-0 mt-0.5' />
                    <span>
                      <strong>Atenção:</strong> Confirme apenas se você realmente recebeu o
                      pagamento de{' '}
                      <strong>{formatCurrency(parseFloat(trade.total || trade.amount))}</strong> na
                      sua conta. Após confirmar, a criptomoeda será liberada.
                    </span>
                  </p>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  disabled={confirmPaymentMutation.isPending}
                  className='w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg'
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
            </div>
          )}

          {/* Release Escrow */}
          {canReleaseEscrow && (
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'>
              <div className='p-4 md:p-6'>
                <div className='flex items-center gap-2 mb-4'>
                  <div className='p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl'>
                    <Shield className='w-5 h-5 text-white' />
                  </div>
                  <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                    Liberar Escrow
                  </h2>
                </div>

                <p className='text-gray-600 dark:text-gray-400 mb-4'>
                  O pagamento foi confirmado. Clique para liberar a criptomoeda para o comprador.
                </p>

                <button
                  onClick={handleReleaseEscrow}
                  disabled={releaseEscrowMutation.isPending}
                  className='w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg'
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
              </div>
            </div>
          )}

          {/* Actions - Dispute & Cancel */}
          {!isCompleted && !isDisputed && (
            <div className='flex gap-3'>
              <button
                onClick={() => setShowDisputeModal(true)}
                className='flex-1 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-medium transition-colors flex items-center justify-center gap-2'
              >
                <Flag className='w-4 h-4' />
                Abrir Disputa
              </button>

              <button
                onClick={handleCancelTrade}
                disabled={cancelTradeMutation.isPending}
                className='flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2'
              >
                <X className='w-4 h-4' />
                Cancelar Trade
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Chat */}
        <div className='lg:col-span-1'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-4'>
            {/* Chat Header */}
            <div className='p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl'>
                  <MessageCircle className='w-5 h-5 text-white' />
                </div>
                <div>
                  <h3 className='font-bold text-gray-900 dark:text-white'>Chat do Trade</h3>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Converse com {isBuyer ? 'o vendedor' : 'o comprador'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className='h-[300px] md:h-[400px] overflow-y-auto p-4 space-y-3'>
              {(messagesData || [])?.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      msg.is_own
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                    }`}
                  >
                    <p className='text-sm'>{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${msg.is_own ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}
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
                  <div className='w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3'>
                    <MessageCircle className='w-8 h-8 text-gray-400' />
                  </div>
                  <p className='text-gray-500 dark:text-gray-400 text-center text-sm'>
                    Nenhuma mensagem ainda.
                    <br />
                    Inicie a conversa!
                  </p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className='p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'>
              <div className='flex gap-2'>
                <input
                  type='text'
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder='Digite sua mensagem...'
                  className='flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className='px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl transition-colors'
                  title='Enviar mensagem'
                  aria-label='Enviar mensagem'
                >
                  <Send className='w-5 h-5' />
                </button>
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className='mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-xl'>
                <Shield className='w-5 h-5 text-green-600 dark:text-green-400' />
              </div>
              <div>
                <p className='font-medium text-gray-900 dark:text-white text-sm'>100% Seguro</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Escrow protege sua transação
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200'>
            <div className='p-6 border-b border-gray-100 dark:border-gray-700'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-red-100 dark:bg-red-900/30 rounded-xl'>
                    <Flag className='w-5 h-5 text-red-600 dark:text-red-400' />
                  </div>
                  <h3 className='text-xl font-bold text-gray-900 dark:text-white'>Abrir Disputa</h3>
                </div>
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors'
                  title='Fechar'
                  aria-label='Fechar modal'
                >
                  <X className='w-5 h-5 text-gray-500' />
                </button>
              </div>
            </div>

            <div className='p-6'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Motivo da Disputa
              </label>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={4}
                placeholder='Descreva o problema detalhadamente...'
                className='w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none'
              />

              <div className='flex gap-3 mt-6'>
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className='flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpenDispute}
                  disabled={!disputeReason.trim() || disputeMutation.isPending}
                  className='flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors'
                >
                  {disputeMutation.isPending ? 'Abrindo...' : 'Abrir Disputa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200'>
            <div className='p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl'>
                    <Star className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                  </div>
                  <h3 className='text-xl font-bold text-gray-900 dark:text-white'>
                    Avaliar Trader
                  </h3>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className='p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-xl transition-colors'
                  title='Fechar'
                  aria-label='Fechar modal'
                >
                  <X className='w-5 h-5 text-gray-500' />
                </button>
              </div>
            </div>

            <div className='p-6'>
              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center'>
                  Como foi sua experiência?
                </label>
                <div className='flex gap-2 justify-center'>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className='p-2 transition-all hover:scale-110 active:scale-95'
                      title={`Avaliar ${star} estrela${star > 1 ? 's' : ''}`}
                      aria-label={`Avaliar ${star} estrela${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= rating
                            ? 'text-amber-500 fill-current'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Comentário (opcional)
                </label>
                <textarea
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                  rows={3}
                  placeholder='Conte sua experiência...'
                  className='w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none'
                />
              </div>

              <div className='flex gap-3'>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className='flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors'
                >
                  Pular
                </button>
                <button
                  onClick={handleLeaveFeedback}
                  disabled={rating === 0 || feedbackMutation.isPending}
                  className='flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-medium transition-colors'
                >
                  {feedbackMutation.isPending ? 'Enviando...' : 'Enviar Avaliação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
