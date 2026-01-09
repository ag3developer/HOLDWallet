import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Star,
  Info,
} from 'lucide-react'
import {
  useP2PTrade,
  useMarkPaymentSent,
  useConfirmPaymentReceived,
  useCancelTrade,
  useDisputeTrade,
} from '@/hooks/useP2PTrades'
import { P2PTradeChatBox } from '@/components/chat/P2PTradeChatBox'
import { P2PPaymentDetails } from '@/components/p2p/P2PPaymentDetails'
import { useAuthStore } from '@/stores/useAuthStore'

const P2PTradeProcess: React.FC = () => {
  const { tradeId } = useParams<{ tradeId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: trade, isLoading } = useP2PTrade(tradeId!)
  const markPaymentSent = useMarkPaymentSent()
  const confirmPayment = useConfirmPaymentReceived()
  const cancelTrade = useCancelTrade()
  const disputeTrade = useDisputeTrade()

  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Timer countdown
  useEffect(() => {
    if (!trade?.expiresAt) return

    const updateTimer = () => {
      const now = Date.now()
      const expiresAt = new Date(trade.expiresAt).getTime()
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
      setTimeRemaining(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [trade?.expiresAt])

  const handleMarkPaymentSent = () => {
    if (!tradeId) return
    markPaymentSent.mutate({ tradeId })
  }

  const handleConfirmPayment = () => {
    if (!tradeId) return
    confirmPayment.mutate(tradeId)
  }

  const handleCancelTrade = () => {
    if (!tradeId) return
    cancelTrade.mutate(
      { tradeId, reason: 'Cancelado pelo usuário' },
      {
        onSuccess: () => {
          navigate('/p2p')
        },
      }
    )
  }

  const handleDispute = () => {
    if (!tradeId || !disputeReason) return
    disputeTrade.mutate(
      { tradeId, reason: disputeReason, description: disputeReason },
      {
        onSuccess: () => {
          setShowDisputeForm(false)
        },
      }
    )
  }

  const getStatusInfo = () => {
    const status = trade?.status
    switch (status) {
      case 'payment_pending':
        return {
          icon: <Clock className='w-6 h-6 text-yellow-500' />,
          text: 'Aguardando Pagamento',
          color: 'yellow',
        }
      case 'payment_sent':
        return {
          icon: <CheckCircle className='w-6 h-6 text-blue-500' />,
          text: 'Pagamento Enviado - Aguardando Confirmação',
          color: 'blue',
        }
      case 'completed':
        return {
          icon: <CheckCircle className='w-6 h-6 text-green-500' />,
          text: 'Trade Completo',
          color: 'green',
        }
      case 'cancelled':
        return {
          icon: <AlertCircle className='w-6 h-6 text-red-500' />,
          text: 'Trade Cancelado',
          color: 'red',
        }
      case 'disputed':
        return {
          icon: <Shield className='w-6 h-6 text-orange-500' />,
          text: 'Em Disputa - Suporte Analisando',
          color: 'orange',
        }
      default:
        return {
          icon: <Info className='w-6 h-6 text-gray-500' />,
          text: 'Status Desconhecido',
          color: 'gray',
        }
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    )
  }

  if (!trade) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <AlertCircle className='w-16 h-16 mx-auto text-red-500 mb-4' />
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
            Trade não encontrado
          </h2>
          <button onClick={() => navigate('/p2p')} className='text-blue-600 hover:underline'>
            Voltar ao marketplace
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo()
  // Determinar se o usuário atual é o comprador
  const currentUserId = user?.id || ''
  const isBuyer = trade.buyerId === currentUserId

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-6xl mx-auto px-4'>
        {/* Header */}
        <button
          onClick={() => navigate('/p2p')}
          className='flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6'
        >
          <ArrowLeft className='w-5 h-5' />
          Voltar ao Marketplace
        </button>

        {/* Status Banner */}
        <div
          className={`bg-${statusInfo.color}-50 dark:bg-${statusInfo.color}-900/20 border-2 border-${statusInfo.color}-200 dark:border-${statusInfo.color}-800 rounded-lg p-6 mb-6`}
        >
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              {statusInfo.icon}
              <div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {statusInfo.text}
                </h2>
                <p className='text-gray-600 dark:text-gray-400 mt-1'>Trade ID: {tradeId}</p>
              </div>
            </div>

            {trade.status === 'payment_pending' && timeRemaining > 0 && (
              <div className='text-center'>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Tempo Restante</p>
                <p
                  className={`text-3xl font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}
                >
                  {formatTime(timeRemaining)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column - Trade Details */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Trade Info */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-4'>
                Detalhes do Trade
              </h3>

              <div className='grid grid-cols-2 gap-6'>
                <div>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Criptomoeda</p>
                  <p className='text-xl font-bold text-gray-900 dark:text-white'>{trade.amount}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Preço Unitário</p>
                  <p className='text-xl font-bold text-gray-900 dark:text-white'>
                    {formatCurrency(Number.parseFloat(trade.price))}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Valor Total</p>
                  <p className='text-2xl font-bold text-green-600'>
                    {formatCurrency(Number.parseFloat(trade.total))}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                    Método de Pagamento
                  </p>
                  <p className='text-xl font-bold text-gray-900 dark:text-white'>
                    {trade.paymentMethod?.type || 'PIX'}
                  </p>
                </div>
              </div>
            </div>

            {/* Trade Process Steps */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-6'>
                Processo do Trade
              </h3>

              <div className='space-y-4'>
                {/* Step 1 */}
                <div className='flex gap-4'>
                  <div className='flex flex-col items-center'>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        trade.status === 'payment_pending'
                          ? 'bg-gray-300 dark:bg-gray-600'
                          : 'bg-green-500'
                      }`}
                    >
                      <CheckCircle className='w-6 h-6 text-white' />
                    </div>
                    <div className='w-0.5 h-16 bg-gray-300 dark:bg-gray-600'></div>
                  </div>
                  <div className='flex-1 pb-8'>
                    <h4 className='font-bold text-gray-900 dark:text-white mb-2'>
                      1. Trade Iniciado
                    </h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      O trade foi criado com sucesso. Aguardando confirmação de pagamento.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className='flex gap-4'>
                  <div className='flex flex-col items-center'>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        trade.status === 'payment_sent' ||
                        trade.status === 'payment_confirmed' ||
                        trade.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      {trade.status === 'payment_sent' ||
                      trade.status === 'payment_confirmed' ||
                      trade.status === 'completed' ? (
                        <CheckCircle className='w-6 h-6 text-white' />
                      ) : (
                        <span className='text-white font-bold'>2</span>
                      )}
                    </div>
                    <div className='w-0.5 h-16 bg-gray-300 dark:bg-gray-600'></div>
                  </div>
                  <div className='flex-1 pb-8'>
                    <h4 className='font-bold text-gray-900 dark:text-white mb-2'>
                      2. Pagamento Enviado
                    </h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {isBuyer
                        ? 'Envie o pagamento e clique em "Pagamento Enviado".'
                        : 'Aguardando o comprador enviar o pagamento.'}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className='flex gap-4'>
                  <div className='flex flex-col items-center'>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        trade.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      {trade.status === 'completed' ? (
                        <CheckCircle className='w-6 h-6 text-white' />
                      ) : (
                        <span className='text-white font-bold'>3</span>
                      )}
                    </div>
                  </div>
                  <div className='flex-1'>
                    <h4 className='font-bold text-gray-900 dark:text-white mb-2'>
                      3. Trade Completo
                    </h4>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {isBuyer
                        ? 'Aguardando o vendedor confirmar o recebimento.'
                        : 'Confirme o recebimento do pagamento para liberar a cripto.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details com QR Code PIX */}
            {trade.status === 'payment_pending' && isBuyer && (
              <P2PPaymentDetails
                tradeId={tradeId!}
                orderId={trade.orderId}
                sellerPaymentMethods={[
                  {
                    id: '1',
                    type: trade.paymentMethod?.type || 'pix',
                    details: {
                      pix_key: trade.paymentMethod?.details?.pixKey || '',
                      pix_key_type: trade.paymentMethod?.details?.pixKeyType || 'cpf',
                      holder_name: trade.seller?.username || 'Vendedor',
                    },
                  },
                ]}
                amount={Number.parseFloat(trade.total)}
                fiatCurrency='BRL'
                cryptoAmount={trade.amount}
                cryptoCoin='USDT'
                sellerName={trade.seller?.username || 'Vendedor'}
                timeLimit={Math.ceil(timeRemaining / 60)}
                onPaymentSent={handleMarkPaymentSent}
              />
            )}

            {/* Chat Box - Integrado com Backend */}
            <P2PTradeChatBox
              tradeId={tradeId!}
              counterpartyName={isBuyer ? trade.seller?.username || 'Vendedor' : 'Comprador'}
              counterpartyId={isBuyer ? trade.sellerId : trade.buyerId}
              orderId={trade.orderId}
            />
          </div>

          {/* Right Column - Actions */}
          <div className='lg:col-span-1 space-y-6'>
            {/* Trader Info */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-4'>
                {isBuyer ? 'Vendedor' : 'Comprador'}
              </h3>

              <div className='flex items-center gap-3 mb-4'>
                <div className='relative'>
                  <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold'>
                    {trade.seller?.username?.charAt(0) || 'U'}
                  </div>
                  {trade.seller?.isOnline && (
                    <div className='absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full'></div>
                  )}
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <p className='font-bold text-gray-900 dark:text-white'>
                      {trade.seller?.username || 'Anônimo'}
                    </p>
                    {trade.seller?.isVerified && <CheckCircle className='w-4 h-4 text-blue-500' />}
                  </div>
                  <div className='flex items-center gap-1 mt-1'>
                    <Star className='w-3 h-3 text-yellow-500 fill-current' />
                    <span className='text-sm text-gray-600 dark:text-gray-400'>
                      {trade.seller?.reputation?.score || 0}% (
                      {trade.seller?.stats?.totalTrades || trade.seller?.total_trades || 0} trades)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Comprador (apenas cancelar, pagamento está no componente) */}
            {trade.status === 'payment_pending' && isBuyer && (
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-3'>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className='w-full py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-bold transition-colors'
                >
                  Cancelar Trade
                </button>
              </div>
            )}

            {trade.status === 'payment_sent' && !isBuyer && (
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-3'>
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirmPayment.isPending}
                  className='w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50'
                >
                  {confirmPayment.isPending ? (
                    <span className='flex items-center justify-center gap-2'>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Processando...
                    </span>
                  ) : (
                    '✓ Confirmar Recebimento'
                  )}
                </button>

                <button
                  onClick={() => setShowDisputeForm(true)}
                  className='w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors'
                >
                  Abrir Disputa
                </button>
              </div>
            )}

            {/* Warning Box */}
            <div className='bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4'>
              <div className='flex gap-2'>
                <AlertCircle className='w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5' />
                <div>
                  <p className='text-sm font-medium text-orange-800 dark:text-orange-200 mb-1'>
                    Importante
                  </p>
                  <ul className='text-xs text-orange-700 dark:text-orange-300 space-y-1'>
                    <li>• Não cancele após enviar o pagamento</li>
                    <li>• Guarde comprovantes de pagamento</li>
                    <li>• Não compartilhe dados sensíveis no chat</li>
                    <li>• Em caso de problemas, abra uma disputa</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
            <div className='bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6'>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-4'>
                Confirmar Cancelamento
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-6'>
                Tem certeza que deseja cancelar este trade? Esta ação não pode ser desfeita.
              </p>
              <div className='flex gap-3'>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className='flex-1 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors'
                >
                  Não, voltar
                </button>
                <button
                  onClick={handleCancelTrade}
                  disabled={cancelTrade.isPending}
                  className='flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors'
                >
                  {cancelTrade.isPending ? 'Cancelando...' : 'Sim, cancelar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Form Modal */}
        {showDisputeForm && (
          <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
            <div className='bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6'>
              <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-4'>
                Abrir Disputa
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
                Descreva o motivo da disputa. Nossa equipe irá analisar e entrar em contato.
              </p>
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder='Descreva o problema...'
                rows={5}
                className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4'
              />
              <div className='flex gap-3'>
                <button
                  onClick={() => setShowDisputeForm(false)}
                  className='flex-1 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDispute}
                  disabled={!disputeReason || disputeTrade.isPending}
                  className='flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50'
                >
                  {disputeTrade.isPending ? 'Enviando...' : 'Abrir Disputa'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default P2PTradeProcess
