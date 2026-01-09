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

export const TradeProcessPage = () => {
  const navigate = useNavigate()
  const { tradeId } = useParams<{ tradeId: string }>()
  const { user } = useAuthStore()

  const [message, setMessage] = useState('')
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)

  const { data: trade, isLoading, error } = useP2PTrade(tradeId!)
  const { data: messagesData } = useTradeMessages(tradeId!)

  const markPaymentMutation = useMarkPaymentSent()
  const confirmPaymentMutation = useConfirmPaymentReceived()
  const releaseEscrowMutation = useReleaseEscrow()
  const cancelTradeMutation = useCancelTrade()
  const disputeMutation = useDisputeTrade()
  const sendMessageMutation = useSendTradeMessage()
  const feedbackMutation = useLeaveFeedback()

  useEffect(() => {
    if (!trade?.timeLimit) return
    const calculateTimeLeft = () => {
      const createdAt = new Date(trade.createdAt).getTime()
      const timeLimit = trade.timeLimit * 60 * 1000
      const deadline = createdAt + timeLimit
      const now = Date.now()
      return Math.max(0, Math.floor((deadline - now) / 1000))
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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: 'Aguardando', color: 'text-amber-500', bg: 'bg-amber-500/20' },
      payment_pending: { label: 'Aguardando', color: 'text-amber-500', bg: 'bg-amber-500/20' },
      payment_sent: { label: 'Pago', color: 'text-blue-500', bg: 'bg-blue-500/20' },
      payment_confirmed: { label: 'Confirmado', color: 'text-green-500', bg: 'bg-green-500/20' },
      completed: { label: 'Concluído', color: 'text-green-500', bg: 'bg-green-500/20' },
      disputed: { label: 'Disputa', color: 'text-red-500', bg: 'bg-red-500/20' },
      cancelled: { label: 'Cancelado', color: 'text-gray-500', bg: 'bg-gray-500/20' },
    }
    return statusMap[status] || statusMap.pending
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

  const handleMarkPaymentSent = async () => {
    try {
      await markPaymentMutation.mutateAsync({ tradeId: tradeId!, message: 'Pagamento enviado' })
      appNotifications.pixSent(Number.parseFloat(trade?.amount || '0'), 'Contraparte')
      toast.success('Pagamento marcado como enviado!')
    } catch (err) {
      console.error('Error marking payment:', err)
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
    } catch (err) {
      console.error('Error confirming payment:', err)
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
      toast.success('Escrow liberado!')
    } catch (err) {
      console.error('Error releasing escrow:', err)
    }
  }

  const handleCancelTrade = async () => {
    if (!confirm('Tem certeza que deseja cancelar?')) return
    try {
      await cancelTradeMutation.mutateAsync({ tradeId: tradeId!, reason: 'Cancelado pelo usuário' })
      toast.success('Trade cancelado')
      navigate('/p2p')
    } catch (err) {
      console.error('Error canceling trade:', err)
    }
  }

  const handleOpenDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Descreva o motivo da disputa')
      return
    }
    try {
      await disputeMutation.mutateAsync({
        tradeId: tradeId!,
        reason: disputeReason,
        description: disputeReason,
      })
      toast.success('Disputa aberta')
      setShowDisputeModal(false)
      setDisputeReason('')
    } catch (err) {
      console.error('Error opening dispute:', err)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return
    try {
      await sendMessageMutation.mutateAsync({ tradeId: tradeId!, message: message.trim() })
      setMessage('')
    } catch (err) {
      console.error('Error sending message:', err)
    }
  }

  const getFeedbackType = (r: number) => {
    if (r >= 4) return 'positive'
    if (r >= 3) return 'neutral'
    return 'negative'
  }

  const handleLeaveFeedback = async () => {
    if (rating === 0) {
      toast.error('Selecione uma avaliação')
      return
    }
    try {
      await feedbackMutation.mutateAsync({
        tradeId: tradeId!,
        rating,
        comment: feedbackComment,
        type: getFeedbackType(rating),
      })
      toast.success('Obrigado pelo feedback!')
      setShowFeedbackModal(false)
      navigate('/p2p')
    } catch (err) {
      console.error('Error leaving feedback:', err)
    }
  }

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[50vh]'>
        <Loader2 className='w-10 h-10 text-blue-600 animate-spin' />
        <p className='mt-3 text-gray-500 text-sm'>Carregando...</p>
      </div>
    )
  }

  if (error || !trade) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[50vh] px-4'>
        <AlertCircle className='w-12 h-12 text-red-500 mb-3' />
        <p className='text-gray-600 dark:text-gray-400 text-center mb-4'>Trade não encontrado</p>
        <button
          onClick={() => navigate('/p2p')}
          className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm'
        >
          Voltar
        </button>
      </div>
    )
  }

  const statusInfo = getStatusInfo(trade.status) || {
    label: 'Aguardando',
    color: 'text-amber-500',
    bg: 'bg-amber-500/20',
  }
  const steps = getTimelineSteps(trade.status)
  const isBuyer = trade.buyerId === user?.id
  const canMarkPayment =
    isBuyer && (trade.status === 'payment_pending' || trade.status === 'pending')
  const canConfirmPayment = !isBuyer && trade.status === 'payment_sent'
  const canReleaseEscrow = !isBuyer && trade.status === 'payment_confirmed'
  const isCompleted = trade.status === 'completed'
  const isDisputed = trade.status === 'disputed'

  return (
    <div className='space-y-3 pb-24'>
      {/* Header Compacto Premium */}
      <div className='bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-xl p-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => navigate('/p2p')}
              className='p-1.5 bg-white/20 hover:bg-white/30 rounded-lg'
              aria-label='Voltar'
            >
              <ArrowLeft className='w-4 h-4 text-white' />
            </button>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-sm font-bold text-white'>Trade P2P</h1>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.bg} ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              <p className='text-blue-200 text-xs'>#{trade.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          {!isCompleted && !isDisputed && (
            <div className='flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg'>
              <Clock className={`w-3.5 h-3.5 ${timeLeft < 300 ? 'text-red-300' : 'text-white'}`} />
              <span
                className={`text-base font-bold font-mono ${timeLeft < 300 ? 'text-red-300' : 'text-white'}`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
        </div>

        {/* Timeline Inline */}
        <div className='flex items-center justify-between mt-3 px-2'>
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <React.Fragment key={step.key}>
                <div className='flex flex-col items-center'>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-500 text-white' : step.current ? 'bg-white text-blue-600' : 'bg-white/20 text-white/50'}`}
                  >
                    <Icon className='w-3.5 h-3.5' />
                  </div>
                  <span
                    className={`text-[9px] mt-0.5 ${step.completed || step.current ? 'text-white' : 'text-white/50'}`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 ${step.completed ? 'bg-green-400' : 'bg-white/20'}`}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Resumo Compacto */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700'>
        <div className='grid grid-cols-2 gap-2'>
          <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <p className='text-[10px] text-gray-500 uppercase'>
              VOCÊ {isBuyer ? 'PAGA' : 'RECEBE'}
            </p>
            <p className='text-base font-bold text-gray-900 dark:text-white'>
              {formatCurrency(Number.parseFloat(trade.total || trade.amount))}
            </p>
          </div>
          <div className='p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
            <p className='text-[10px] text-gray-500 uppercase'>
              VOCÊ {isBuyer ? 'RECEBE' : 'ENVIA'}
            </p>
            <p className='text-base font-bold text-blue-600'>
              {(
                Number.parseFloat(trade.total || trade.amount) / Number.parseFloat(trade.price)
              ).toFixed(6)}{' '}
              <span className='text-xs font-normal'>{trade.coin}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Alertas de Status */}
      {isDisputed && (
        <div className='flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800'>
          <AlertTriangle className='w-5 h-5 text-red-500 flex-shrink-0' />
          <div>
            <p className='text-sm font-medium text-red-700 dark:text-red-300'>Trade em Disputa</p>
            <p className='text-xs text-red-600 dark:text-red-400'>Nossa equipe está analisando</p>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800'>
          <div className='flex items-center gap-2'>
            <CheckCircle className='w-5 h-5 text-green-500' />
            <p className='text-sm font-medium text-green-700 dark:text-green-300'>
              Trade Concluído!
            </p>
          </div>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className='px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg flex items-center gap-1'
          >
            <Star className='w-3 h-3' /> Avaliar
          </button>
        </div>
      )}

      {/* Dados de Pagamento - Comprador */}
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
            Number.parseFloat(trade.total || trade.amount) / Number.parseFloat(trade.price)
          ).toFixed(6)}
          cryptoCoin={trade.coin || 'USDT'}
          sellerName={trade.seller?.username || 'Vendedor'}
          timeLimit={Math.ceil(timeLeft / 60)}
          onPaymentSent={handleMarkPaymentSent}
        />
      )}

      {/* Confirmar Pagamento - Vendedor */}
      {canConfirmPayment && (
        <div className='bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700'>
          <div className='flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-3'>
            <AlertCircle className='w-4 h-4 text-amber-600 flex-shrink-0' />
            <p className='text-xs text-amber-700 dark:text-amber-300'>
              Confirme apenas após receber{' '}
              <strong>{formatCurrency(Number.parseFloat(trade.total || trade.amount))}</strong>
            </p>
          </div>
          <button
            onClick={handleConfirmPayment}
            disabled={confirmPaymentMutation.isPending}
            className='w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50'
          >
            {confirmPaymentMutation.isPending ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <CheckCircle className='w-4 h-4' />
            )}
            Confirmar Recebimento
          </button>
        </div>
      )}

      {/* Liberar Escrow - Vendedor */}
      {canReleaseEscrow && (
        <div className='bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700'>
          <p className='text-xs text-gray-600 dark:text-gray-400 mb-3'>
            Pagamento confirmado. Libere a cripto para o comprador.
          </p>
          <button
            onClick={handleReleaseEscrow}
            disabled={releaseEscrowMutation.isPending}
            className='w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50'
          >
            {releaseEscrowMutation.isPending ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Shield className='w-4 h-4' />
            )}
            Liberar Escrow
          </button>
        </div>
      )}

      {/* Ações */}
      {!isCompleted && !isDisputed && (
        <div className='flex gap-2'>
          <button
            onClick={() => setShowDisputeModal(true)}
            className='flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-xs font-medium flex items-center justify-center gap-1'
          >
            <Flag className='w-3.5 h-3.5' /> Disputa
          </button>
          <button
            onClick={handleCancelTrade}
            disabled={cancelTradeMutation.isPending}
            className='flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1'
          >
            <X className='w-3.5 h-3.5' /> Cancelar
          </button>
          <button
            onClick={() => setShowChat(true)}
            className='flex-1 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl text-xs font-medium flex items-center justify-center gap-1'
          >
            <MessageCircle className='w-3.5 h-3.5' /> Chat
          </button>
        </div>
      )}

      {/* Badge Segurança */}
      <div className='flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg'>
        <Shield className='w-4 h-4 text-green-600' />
        <p className='text-xs text-green-700 dark:text-green-400'>Escrow protege sua transação</p>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col'>
          <div className='bg-white dark:bg-gray-800 flex-1 flex flex-col max-h-screen'>
            <div className='p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600'>
              <div className='flex items-center gap-2'>
                <MessageCircle className='w-5 h-5 text-white' />
                <span className='font-bold text-white'>Chat do Trade</span>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className='p-1.5 bg-white/20 rounded-lg'
                aria-label='Fechar chat'
              >
                <X className='w-4 h-4 text-white' />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto p-3 space-y-2'>
              {(messagesData || []).map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${msg.is_own ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'}`}
                  >
                    <p>{msg.message}</p>
                    <p
                      className={`text-[10px] mt-0.5 ${msg.is_own ? 'text-blue-200' : 'text-gray-500'}`}
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
                <div className='flex flex-col items-center justify-center h-full text-gray-400'>
                  <MessageCircle className='w-10 h-10 mb-2' />
                  <p className='text-sm'>Nenhuma mensagem ainda</p>
                </div>
              )}
            </div>
            <div className='p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'>
              <div className='flex gap-2'>
                <input
                  type='text'
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder='Digite sua mensagem...'
                  className='flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm'
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className='px-4 py-2.5 bg-blue-600 text-white rounded-xl disabled:opacity-50'
                  aria-label='Enviar mensagem'
                >
                  <Send className='w-4 h-4' />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Flag className='w-5 h-5 text-red-500' />
                <span className='font-bold text-gray-900 dark:text-white'>Abrir Disputa</span>
              </div>
              <button
                onClick={() => setShowDisputeModal(false)}
                className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
                aria-label='Fechar'
              >
                <X className='w-4 h-4 text-gray-500' />
              </button>
            </div>
            <div className='p-4'>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={4}
                placeholder='Descreva o problema...'
                className='w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm resize-none'
              />
              <div className='flex gap-2 mt-4'>
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className='flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium'
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpenDispute}
                  disabled={!disputeReason.trim() || disputeMutation.isPending}
                  className='flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-50'
                >
                  {disputeMutation.isPending ? 'Abrindo...' : 'Abrir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden'>
            <div className='p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Star className='w-5 h-5 text-amber-500' />
                <span className='font-bold text-gray-900 dark:text-white'>Avaliar Trade</span>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className='p-1.5 hover:bg-white/50 rounded-lg'
                aria-label='Fechar'
              >
                <X className='w-4 h-4 text-gray-500' />
              </button>
            </div>
            <div className='p-4'>
              <div className='flex justify-center gap-1 mb-4'>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className='p-1 transition-transform hover:scale-110'
                    aria-label={`${star} estrelas`}
                  >
                    <Star
                      className={`w-8 h-8 ${star <= rating ? 'text-amber-500 fill-current' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackComment}
                onChange={e => setFeedbackComment(e.target.value)}
                rows={3}
                placeholder='Comentário (opcional)'
                className='w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm resize-none'
              />
              <div className='flex gap-2 mt-4'>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className='flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium'
                >
                  Pular
                </button>
                <button
                  onClick={handleLeaveFeedback}
                  disabled={rating === 0 || feedbackMutation.isPending}
                  className='flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl text-sm font-medium disabled:opacity-50'
                >
                  {feedbackMutation.isPending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
