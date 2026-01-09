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
  Lock,
  BadgeCheck,
  Zap,
  Timer,
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
    <div className='space-y-4 pb-24'>
      {/* Premium Header */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900'>
        {/* Background Effects */}
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl' />
          <div className='absolute bottom-0 right-0 w-40 h-40 bg-purple-500 rounded-full blur-3xl' />
        </div>

        <div className='relative p-4'>
          {/* Top Row */}
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate('/p2p')}
                className='p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all border border-white/10'
                aria-label='Voltar'
              >
                <ArrowLeft className='w-4 h-4 text-white' />
              </button>
              <div>
                <div className='flex items-center gap-2'>
                  <h1 className='text-lg font-bold text-white'>Trade P2P</h1>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${statusInfo.bg} ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <p className='text-blue-300 text-xs font-mono'>
                  #{trade.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Timer */}
            {!isCompleted && !isDisputed && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                  timeLeft < 300 ? 'bg-red-500/20 border-red-500/30' : 'bg-white/10 border-white/10'
                }`}
              >
                <Timer className={`w-4 h-4 ${timeLeft < 300 ? 'text-red-400' : 'text-white'}`} />
                <span
                  className={`text-lg font-bold font-mono ${timeLeft < 300 ? 'text-red-400' : 'text-white'}`}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
          </div>

          {/* Premium Timeline */}
          <div className='bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10'>
            <div className='flex items-center justify-between'>
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <React.Fragment key={step.key}>
                    <div className='flex flex-col items-center'>
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          step.completed
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : step.current
                              ? 'bg-white text-blue-600 shadow-lg'
                              : 'bg-white/10 text-white/40'
                        }`}
                      >
                        <Icon className='w-4 h-4' />
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 font-medium ${
                          step.completed || step.current ? 'text-white' : 'text-white/40'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded-full ${
                          step.completed ? 'bg-emerald-400' : 'bg-white/10'
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Trade Summary Card */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
        <div className='p-4'>
          <div className='flex items-center gap-2 mb-3'>
            <Zap className='w-4 h-4 text-amber-500' />
            <span className='text-xs font-semibold text-gray-500 uppercase'>
              Resumo da Transação
            </span>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            {/* You Pay/Receive */}
            <div className='p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl'>
              <p className='text-[10px] text-gray-500 uppercase font-medium mb-1'>
                VOCÊ {isBuyer ? 'PAGA' : 'RECEBE'}
              </p>
              <p className='text-xl font-bold text-gray-900 dark:text-white'>
                {formatCurrency(Number.parseFloat(trade.total || trade.amount))}
              </p>
            </div>

            {/* Crypto Amount */}
            <div className='p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl'>
              <p className='text-[10px] text-gray-500 uppercase font-medium mb-1'>
                VOCÊ {isBuyer ? 'RECEBE' : 'ENVIA'}
              </p>
              <p className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                {(
                  Number.parseFloat(trade.total || trade.amount) / Number.parseFloat(trade.price)
                ).toFixed(4)}
                <span className='text-sm font-medium ml-1'>{trade.coin}</span>
              </p>
            </div>
          </div>

          {/* Counterparty Info */}
          <div className='mt-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm'>
                  {(isBuyer ? trade.seller?.username : trade.buyer?.username)
                    ?.charAt(0)
                    .toUpperCase() || 'U'}
                </div>
                <div>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                      {isBuyer ? trade.seller?.username : trade.buyer?.username || 'Usuário'}
                    </span>
                    <BadgeCheck className='w-3.5 h-3.5 text-blue-500' />
                  </div>
                  <p className='text-xs text-gray-500'>{isBuyer ? 'Vendedor' : 'Comprador'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(true)}
                className='p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all'
                aria-label='Chat'
              >
                <MessageCircle className='w-4 h-4' />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      {isDisputed && (
        <div className='flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl border border-red-200 dark:border-red-800'>
          <div className='w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center'>
            <AlertTriangle className='w-5 h-5 text-red-500' />
          </div>
          <div>
            <p className='text-sm font-bold text-red-700 dark:text-red-300'>Trade em Disputa</p>
            <p className='text-xs text-red-600 dark:text-red-400'>
              Nossa equipe está analisando o caso
            </p>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className='flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center'>
              <CheckCircle className='w-5 h-5 text-emerald-500' />
            </div>
            <div>
              <p className='text-sm font-bold text-emerald-700 dark:text-emerald-300'>
                Trade Concluído!
              </p>
              <p className='text-xs text-emerald-600 dark:text-emerald-400'>
                Transação finalizada com sucesso
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className='px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/25'
          >
            <Star className='w-3.5 h-3.5' /> Avaliar
          </button>
        </div>
      )}

      {/* Payment Details - Buyer */}
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

      {/* Confirm Payment - Seller */}
      {canConfirmPayment && (
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
          <div className='p-4'>
            <div className='flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-4'>
              <AlertCircle className='w-5 h-5 text-amber-600 flex-shrink-0' />
              <p className='text-xs text-amber-700 dark:text-amber-300'>
                Confirme apenas após verificar o recebimento de{' '}
                <strong>{formatCurrency(Number.parseFloat(trade.total || trade.amount))}</strong> em
                sua conta
              </p>
            </div>
            <button
              onClick={handleConfirmPayment}
              disabled={confirmPaymentMutation.isPending}
              className='w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all'
            >
              {confirmPaymentMutation.isPending ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <CheckCircle className='w-4 h-4' />
              )}
              Confirmar Recebimento
            </button>
          </div>
        </div>
      )}

      {/* Release Escrow - Seller */}
      {canReleaseEscrow && (
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
          <div className='p-4'>
            <div className='flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl mb-4'>
              <Shield className='w-5 h-5 text-purple-600 flex-shrink-0' />
              <p className='text-xs text-purple-700 dark:text-purple-300'>
                Pagamento confirmado! Libere a cripto para finalizar o trade.
              </p>
            </div>
            <button
              onClick={handleReleaseEscrow}
              disabled={releaseEscrowMutation.isPending}
              className='w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all'
            >
              {releaseEscrowMutation.isPending ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Shield className='w-4 h-4' />
              )}
              Liberar Escrow
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isCompleted && !isDisputed && (
        <div className='grid grid-cols-3 gap-2'>
          <button
            onClick={() => setShowDisputeModal(true)}
            className='py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all'
          >
            <Flag className='w-3.5 h-3.5' /> Disputa
          </button>
          <button
            onClick={handleCancelTrade}
            disabled={cancelTradeMutation.isPending}
            className='py-3 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all'
          >
            <X className='w-3.5 h-3.5' /> Cancelar
          </button>
          <button
            onClick={() => setShowChat(true)}
            className='py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all'
          >
            <MessageCircle className='w-3.5 h-3.5' /> Chat
          </button>
        </div>
      )}

      {/* Security Footer */}
      <div className='flex items-center justify-center gap-6 py-3'>
        <div className='flex items-center gap-1.5 text-gray-400'>
          <Lock className='w-3.5 h-3.5' />
          <span className='text-[10px] font-medium'>SSL Seguro</span>
        </div>
        <div className='flex items-center gap-1.5 text-emerald-500'>
          <Shield className='w-3.5 h-3.5' />
          <span className='text-[10px] font-medium'>Escrow Ativo</span>
        </div>
        <div className='flex items-center gap-1.5 text-gray-400'>
          <BadgeCheck className='w-3.5 h-3.5' />
          <span className='text-[10px] font-medium'>Verificado</span>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col'>
          <div className='bg-white dark:bg-gray-900 flex-1 flex flex-col max-h-screen'>
            {/* Chat Header */}
            <div className='p-4 bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center'>
                  <MessageCircle className='w-5 h-5 text-white' />
                </div>
                <div>
                  <h3 className='font-bold text-white'>Chat do Trade</h3>
                  <p className='text-xs text-blue-300'>Conversa segura e criptografada</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className='p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all'
                aria-label='Fechar chat'
              >
                <X className='w-4 h-4 text-white' />
              </button>
            </div>

            {/* Messages */}
            <div className='flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800'>
              {(messagesData || []).map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      msg.is_own
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-gray-600'
                    }`}
                  >
                    <p>{msg.message}</p>
                    <p
                      className={`text-[10px] mt-1 ${msg.is_own ? 'text-blue-200' : 'text-gray-400'}`}
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
                <div className='flex flex-col items-center justify-center h-full text-gray-400 py-12'>
                  <div className='w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3'>
                    <MessageCircle className='w-8 h-8' />
                  </div>
                  <p className='text-sm font-medium'>Nenhuma mensagem ainda</p>
                  <p className='text-xs text-gray-400'>
                    Inicie a conversa com seu parceiro de trade
                  </p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className='p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'>
              <div className='flex gap-2'>
                <input
                  type='text'
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder='Digite sua mensagem...'
                  className='flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all'
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className='px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25'
                  aria-label='Enviar mensagem'
                >
                  <Send className='w-5 h-5' />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl'>
            <div className='p-4 bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Flag className='w-5 h-5 text-white' />
                <span className='font-bold text-white'>Abrir Disputa</span>
              </div>
              <button
                onClick={() => setShowDisputeModal(false)}
                className='p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all'
                aria-label='Fechar'
              >
                <X className='w-4 h-4 text-white' />
              </button>
            </div>
            <div className='p-4'>
              <p className='text-xs text-gray-500 mb-3'>
                Descreva detalhadamente o problema para nossa equipe analisar.
              </p>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={4}
                placeholder='Descreva o problema ocorrido...'
                className='w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all'
              />
              <div className='flex gap-2 mt-4'>
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className='flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all'
                >
                  Cancelar
                </button>
                <button
                  onClick={handleOpenDispute}
                  disabled={!disputeReason.trim() || disputeMutation.isPending}
                  className='flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-lg shadow-red-500/25 transition-all'
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
        <div className='fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl'>
            <div className='p-4 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Star className='w-5 h-5 text-white' />
                <span className='font-bold text-white'>Avaliar Trade</span>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className='p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all'
                aria-label='Fechar'
              >
                <X className='w-4 h-4 text-white' />
              </button>
            </div>
            <div className='p-4'>
              <p className='text-xs text-gray-500 text-center mb-4'>
                Como foi sua experiência com este trade?
              </p>
              <div className='flex justify-center gap-2 mb-4'>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className='p-1.5 transition-transform hover:scale-110'
                    aria-label={`${star} estrelas`}
                  >
                    <Star
                      className={`w-10 h-10 transition-all ${
                        star <= rating
                          ? 'text-amber-500 fill-current drop-shadow-lg'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackComment}
                onChange={e => setFeedbackComment(e.target.value)}
                rows={3}
                placeholder='Deixe um comentário (opcional)'
                className='w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-sm resize-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all'
              />
              <div className='flex gap-2 mt-4'>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className='flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all'
                >
                  Pular
                </button>
                <button
                  onClick={handleLeaveFeedback}
                  disabled={rating === 0 || feedbackMutation.isPending}
                  className='flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-lg shadow-amber-500/25 transition-all'
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
