/**
 * HOLD Wallet - Admin Trade Detail Page
 * ======================================
 *
 * Página de detalhes de um trade OTC específico.
 * Usa React Query para cache de dados.
 */

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar,
  DollarSign,
  Wallet,
  Percent,
  Copy,
  ExternalLink,
  FileText,
  History,
  Ban,
  Play,
  Send,
  RotateCcw,
  ChevronDown,
  Building2,
  Banknote,
  X,
  ShieldAlert,
  CircleDollarSign,
  ArrowRightLeft,
  BookCheck,
} from 'lucide-react'
import {
  useTrade,
  useCancelTrade,
  useConfirmTradePayment,
  useRetryTradeDeposit,
  useSendToAccounting,
  useUpdateTradeStatus,
  useProcessSellTrade,
  useCompleteSellTrade,
} from '@/hooks/admin/useAdminTrades'
import { toast } from 'react-hot-toast'

// ============================================
// COMPONENTE: Modal de Confirmação Premium
// ============================================
interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (inputValue?: string) => void
  title: string
  message: string
  details?: string[]
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'success' | 'info'
  loading?: boolean
  icon?: React.ReactNode
  showInput?: boolean
  inputLabel?: string
  inputPlaceholder?: string
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  loading = false,
  icon,
  showInput = false,
  inputLabel,
  inputPlaceholder = 'Digite aqui...',
}) => {
  const [inputValue, setInputValue] = useState('')

  // Reset input when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) setInputValue('')
  }, [isOpen])

  if (!isOpen) return null

  const variantStyles = {
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      titleColor: 'text-red-900 dark:text-red-100',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      titleColor: 'text-amber-900 dark:text-amber-100',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      titleColor: 'text-emerald-900 dark:text-emerald-100',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      titleColor: 'text-blue-900 dark:text-blue-100',
    },
  }

  const styles = variantStyles[variant]

  const defaultIcon = {
    danger: <Ban className='w-6 h-6' />,
    warning: <AlertTriangle className='w-6 h-6' />,
    success: <CheckCircle className='w-6 h-6' />,
    info: <ShieldAlert className='w-6 h-6' />,
  }

  const handleBackdropClick = () => {
    if (!loading) onClose()
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <button
        type='button'
        className='absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default'
        onClick={handleBackdropClick}
        onKeyDown={e => e.key === 'Escape' && handleBackdropClick()}
        aria-label='Fechar modal'
        disabled={loading}
      />

      {/* Modal */}
      <div className='relative w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200'>
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700'>
          {/* Header com ícone */}
          <div className={`${styles.bg} ${styles.border} border-b px-6 py-5`}>
            <div className='flex items-start gap-4'>
              <div className={`${styles.iconBg} ${styles.iconColor} p-3 rounded-xl`}>
                {icon || defaultIcon[variant]}
              </div>
              <div className='flex-1'>
                <h3 className={`text-lg font-bold ${styles.titleColor}`}>{title}</h3>
                <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>{message}</p>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className='p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50'
                title='Fechar'
                aria-label='Fechar modal'
              >
                <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
              </button>
            </div>
          </div>

          {/* Detalhes adicionais */}
          {details && details.length > 0 && (
            <div className='px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700'>
              <ul className='space-y-2'>
                {details.map(detail => (
                  <li
                    key={detail}
                    className='flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300'
                  >
                    <ArrowRightLeft className='w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0' />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Input opcional */}
          {showInput && (
            <div className='px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
              {inputLabel && (
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  {inputLabel}
                </label>
              )}
              <input
                type='text'
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={inputPlaceholder}
                disabled={loading}
                className='w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50'
                autoFocus
              />
            </div>
          )}

          {/* Botões */}
          <div className='px-6 py-4 flex gap-3 justify-end bg-white dark:bg-gray-800'>
            <button
              onClick={onClose}
              disabled={loading}
              className='px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all disabled:opacity-50'
            >
              {cancelText}
            </button>
            <button
              onClick={() => onConfirm(inputValue || undefined)}
              disabled={loading}
              className={`px-5 py-2.5 text-sm font-semibold text-white ${styles.buttonBg} rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2`}
            >
              {loading ? (
                <>
                  <RefreshCw className='w-4 h-4 animate-spin' />
                  Processando...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Tipos para Modal de Confirmação
// ============================================
interface ModalConfig {
  isOpen: boolean
  title: string
  message: string
  details?: string[]
  variant: 'danger' | 'warning' | 'success' | 'info'
  confirmText: string
  onConfirm: (inputValue?: string) => Promise<void>
  icon?: React.ReactNode
  showInput?: boolean
  inputLabel?: string
  inputPlaceholder?: string
}

export const AdminTradeDetailPage: React.FC = () => {
  const { tradeId } = useParams<{ tradeId: string }>()
  const navigate = useNavigate()
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('polygon')

  // Estado do modal de confirmação
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    details: [],
    variant: 'warning',
    confirmText: 'Confirmar',
    onConfirm: async () => {},
    showInput: false,
    inputLabel: '',
    inputPlaceholder: '',
  })
  const [modalLoading, setModalLoading] = useState(false)

  // Query para trade específico
  const { data: trade, isLoading, error, refetch, isFetching } = useTrade(tradeId || '')

  // Mutations
  const cancelTradeMutation = useCancelTrade()
  const confirmPaymentMutation = useConfirmTradePayment()
  const retryDepositMutation = useRetryTradeDeposit()
  const sendToAccountingMutation = useSendToAccounting()
  const updateStatusMutation = useUpdateTradeStatus()
  const processSellMutation = useProcessSellTrade()
  const completeSellMutation = useCompleteSellTrade()

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value)
  }

  const formatCrypto = (value: number, symbol: string) => {
    return `${value.toFixed(8)} ${symbol}`
  }

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase()
    switch (s) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
      case 'payment_processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'failed':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase()
    switch (s) {
      case 'completed':
        return 'Concluído'
      case 'pending':
        return 'Pendente'
      case 'payment_processing':
        return 'Processando Pagamento'
      case 'payment_confirmed':
        return 'Pagamento Confirmado'
      case 'crypto_received':
        return 'Crypto Recebida'
      case 'cancelled':
        return 'Cancelado'
      case 'expired':
        return 'Expirado'
      case 'failed':
        return 'Falhou'
      default:
        return status
    }
  }

  const canCancel = (status: string) => {
    const s = status?.toLowerCase()
    return s === 'pending' || s === 'payment_processing'
  }

  const canConfirmPayment = (status: string) => {
    const s = status?.toLowerCase()
    return s === 'pending' || s === 'payment_processing'
  }

  const canRetryDeposit = (status: string) => {
    const s = status?.toLowerCase()
    return s === 'payment_confirmed' || s === 'failed'
  }

  const canSendToAccounting = (status: string) => {
    return status?.toLowerCase() === 'completed'
  }

  // SELL: Pode processar venda (retirar crypto do usuário)
  const canProcessSell = (status: string, operationType: string) => {
    const s = status?.toLowerCase()
    return operationType === 'sell' && (s === 'pending' || s === 'payment_processing')
  }

  // SELL: Pode finalizar venda (após enviar PIX/TED)
  const canCompleteSell = (status: string, operationType: string) => {
    const s = status?.toLowerCase()
    return operationType === 'sell' && s === 'crypto_received'
  }

  const handleCancelTrade = async () => {
    if (!trade || !tradeId) return

    setModalConfig({
      isOpen: true,
      title: 'Cancelar Trade',
      message: `Deseja cancelar o trade ${trade.reference_code}?`,
      details: [
        `Valor: ${formatCurrency(trade.fiat_amount)}`,
        `Crypto: ${trade.crypto_amount} ${trade.symbol}`,
        'Esta ação não pode ser desfeita.',
      ],
      variant: 'danger',
      confirmText: 'Cancelar Trade',
      icon: <Ban className='w-6 h-6' />,
      showInput: true,
      inputLabel: 'Motivo do cancelamento (opcional)',
      inputPlaceholder: 'Digite o motivo...',
      onConfirm: async (reason?: string) => {
        try {
          setModalLoading(true)
          await cancelTradeMutation.mutateAsync({
            tradeId,
            ...(reason ? { reason } : {}),
          })
          toast.success(`Trade ${trade.reference_code} cancelado com sucesso`)
          setModalConfig(prev => ({ ...prev, isOpen: false }))
        } catch (err: any) {
          console.error('Erro ao cancelar trade:', err)
          toast.error(err.response?.data?.detail || 'Erro ao cancelar trade')
        } finally {
          setModalLoading(false)
        }
      },
    })
  }

  const handleConfirmPayment = async () => {
    if (!trade || !tradeId) return

    setModalConfig({
      isOpen: true,
      title: 'Confirmar Recebimento de Pagamento',
      message: `Confirmar recebimento do pagamento do trade ${trade.reference_code}?`,
      details: [
        'Isso irá disparar o depósito de crypto para o usuário.',
        `Valor: ${formatCurrency(trade.fiat_amount)}`,
        `Crypto: ${trade.crypto_amount} ${trade.symbol}`,
        `Rede: ${selectedNetwork.toUpperCase()}`,
      ],
      variant: 'success',
      confirmText: 'Confirmar Pagamento',
      icon: <CircleDollarSign className='w-6 h-6' />,
      onConfirm: async () => {
        try {
          setModalLoading(true)
          const result = await confirmPaymentMutation.mutateAsync({
            tradeId,
            data: { network: selectedNetwork },
          })

          if (result.success) {
            toast.success(`Pagamento confirmado! TX: ${result.tx_hash || 'Processando...'}`)
          } else {
            toast.error(result.error || 'Erro ao processar depósito')
          }
          setModalConfig(prev => ({ ...prev, isOpen: false }))
        } catch (err: any) {
          console.error('Erro ao confirmar pagamento:', err)
          toast.error(err.response?.data?.detail || 'Erro ao confirmar pagamento')
        } finally {
          setModalLoading(false)
        }
      },
    })
  }

  const handleRetryDeposit = async () => {
    if (!trade || !tradeId) return

    setModalConfig({
      isOpen: true,
      title: 'Tentar Novamente Depósito',
      message: `Tentar novamente o depósito para ${trade.reference_code}?`,
      details: [
        `Crypto: ${trade.crypto_amount} ${trade.symbol}`,
        `Rede: ${selectedNetwork.toUpperCase()}`,
      ],
      variant: 'warning',
      confirmText: 'Tentar Novamente',
      icon: <RotateCcw className='w-6 h-6' />,
      onConfirm: async () => {
        try {
          setModalLoading(true)
          const result = await retryDepositMutation.mutateAsync({
            tradeId,
            network: selectedNetwork,
          })

          if (result.success) {
            toast.success(`Depósito realizado! TX: ${result.tx_hash}`)
          } else {
            toast.error(result.error || 'Erro ao processar depósito')
          }
          setModalConfig(prev => ({ ...prev, isOpen: false }))
        } catch (err: any) {
          console.error('Erro no retry:', err)
          toast.error(err.response?.data?.detail || 'Erro ao tentar novamente')
        } finally {
          setModalLoading(false)
        }
      },
    })
  }

  const handleSendToAccounting = async () => {
    if (!trade || !tradeId) return

    setModalConfig({
      isOpen: true,
      title: 'Enviar para Contabilidade',
      message: `Enviar comissões do trade ${trade.reference_code} para contabilidade?`,
      details: [
        `Valor do Trade: ${formatCurrency(trade.fiat_amount)}`,
        'Os registros contábeis serão criados automaticamente.',
      ],
      variant: 'info',
      confirmText: 'Enviar',
      icon: <BookCheck className='w-6 h-6' />,
      onConfirm: async () => {
        try {
          setModalLoading(true)
          const result = await sendToAccountingMutation.mutateAsync(tradeId)
          toast.success(
            `Enviado para contabilidade! ${result.entries?.length || 0} registros criados.`
          )
          setModalConfig(prev => ({ ...prev, isOpen: false }))
        } catch (err: any) {
          console.error('Erro ao enviar para contabilidade:', err)
          toast.error(err.response?.data?.detail || 'Erro ao enviar para contabilidade')
        } finally {
          setModalLoading(false)
        }
      },
    })
  }

  // Handler para processar VENDA (retirar crypto do usuário)
  const handleProcessSell = async () => {
    if (!trade || !tradeId) return

    setModalConfig({
      isOpen: true,
      title: 'Processar Venda',
      message: `Processar venda do trade ${trade.reference_code}?`,
      details: [
        `Isso irá RETIRAR ${trade.crypto_amount} ${trade.symbol} da carteira do usuário.`,
        'Os fundos serão transferidos para a carteira da plataforma.',
        'Após confirmar, você precisará enviar PIX/TED ao usuário.',
      ],
      variant: 'danger',
      confirmText: 'Processar Venda',
      icon: <ArrowRightLeft className='w-6 h-6' />,
      onConfirm: async () => {
        try {
          setModalLoading(true)
          const result = await processSellMutation.mutateAsync({
            tradeId,
            data: { network: selectedNetwork },
          })

          if (result.success) {
            toast.success(
              `Crypto recebida! TX: ${result.tx_hash || 'Processando...'}\nAgora envie o PIX/TED ao usuário.`
            )
          } else {
            toast.error(result.error || 'Erro ao processar venda')
          }
          setModalConfig(prev => ({ ...prev, isOpen: false }))
        } catch (err: any) {
          console.error('Erro ao processar venda:', err)
          toast.error(err.response?.data?.detail || 'Erro ao processar venda')
        } finally {
          setModalLoading(false)
        }
      },
    })
  }

  // Handler para finalizar VENDA (após enviar PIX/TED)
  const handleCompleteSell = async () => {
    if (!trade || !tradeId) return

    setModalConfig({
      isOpen: true,
      title: 'Finalizar Venda',
      message: 'Confirmar que o pagamento BRL foi enviado ao usuário?',
      details: [
        `Trade: ${trade.reference_code}`,
        `Valor: ${formatCurrency(trade.fiat_amount)}`,
        'Isso irá finalizar o trade como COMPLETED.',
      ],
      variant: 'success',
      confirmText: 'Finalizar Trade',
      icon: <CheckCircle className='w-6 h-6' />,
      onConfirm: async () => {
        try {
          setModalLoading(true)
          const result = await completeSellMutation.mutateAsync(tradeId)

          if (result.success) {
            toast.success(`Trade ${trade.reference_code} finalizado com sucesso!`)
          } else {
            toast.error('Erro ao finalizar venda')
          }
          setModalConfig(prev => ({ ...prev, isOpen: false }))
        } catch (err: any) {
          console.error('Erro ao finalizar venda:', err)
          toast.error(err.response?.data?.detail || 'Erro ao finalizar venda')
        } finally {
          setModalLoading(false)
        }
      },
    })
  }

  const handleUpdateStatus = (newStatus: string) => {
    if (!trade || !tradeId) return

    setModalConfig({
      isOpen: true,
      title: 'Alterar Status',
      message: `Alterar status do trade ${trade.reference_code} para "${getStatusLabel(newStatus)}"?`,
      details: [
        `Status atual: ${getStatusLabel(trade.status)}`,
        `Novo status: ${getStatusLabel(newStatus)}`,
      ],
      variant: 'info',
      confirmText: 'Alterar Status',
      icon: <RefreshCw className='w-6 h-6' />,
      showInput: true,
      inputLabel: 'Motivo da alteração (opcional)',
      inputPlaceholder: 'Digite o motivo...',
      onConfirm: async (reason?: string) => {
        try {
          setModalLoading(true)
          await updateStatusMutation.mutateAsync({
            tradeId,
            data: {
              status: newStatus as any,
              ...(reason ? { reason } : {}),
            },
          })
          toast.success(`Status alterado para ${getStatusLabel(newStatus)}`)
          setShowActionsMenu(false)
          setModalConfig(prev => ({ ...prev, isOpen: false }))
        } catch (err: any) {
          console.error('Erro ao atualizar status:', err)
          toast.error(err.response?.data?.detail || 'Erro ao atualizar status')
        } finally {
          setModalLoading(false)
        }
      },
    })
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  // Calcular comissões do sistema
  const calculateFees = () => {
    if (!trade) return { spread: 0, networkFee: 0, total: 0 }
    return {
      spread: trade.spread_amount || 0,
      networkFee: trade.network_fee_amount || 0,
      total: (trade.spread_amount || 0) + (trade.network_fee_amount || 0),
    }
  }

  const fees = calculateFees()

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <RefreshCw className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando detalhes do trade...</p>
        </div>
      </div>
    )
  }

  if (error || !trade) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <AlertTriangle className='w-12 h-12 text-yellow-500 mx-auto mb-4' />
          <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>
            Trade não encontrado
          </h2>
          <p className='text-gray-600 dark:text-gray-400 mb-4'>
            O trade solicitado não existe ou foi removido.
          </p>
          <button
            onClick={() => navigate('/admin/trades')}
            className='text-blue-600 hover:underline'
          >
            Voltar para lista de trades
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-3 md:p-4'>
      {/* Header Compacto */}
      <div className='mb-4'>
        <button
          onClick={() => navigate('/admin/trades')}
          className='flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2'
        >
          <ArrowLeft className='w-3 h-3' />
          Voltar
        </button>

        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                trade.operation_type === 'buy'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              {trade.operation_type === 'buy' ? (
                <TrendingUp className='w-4 h-4 text-green-600' />
              ) : (
                <TrendingDown className='w-4 h-4 text-red-600' />
              )}
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-sm font-semibold text-gray-900 dark:text-white'>
                  {trade.operation_type === 'buy' ? 'Compra' : 'Venda'} {trade.symbol}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${getStatusColor(trade.status)}`}
                >
                  {getStatusLabel(trade.status)}
                </span>
              </div>
              <div className='flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400'>
                <button
                  onClick={() => copyToClipboard(trade.reference_code, 'Código de referência')}
                  className='flex items-center gap-1 hover:text-blue-600 font-mono'
                  title='Copiar código de referência'
                >
                  {trade.reference_code}
                  <Copy className='w-2.5 h-2.5' />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className='flex gap-1.5'>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className='px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1 disabled:opacity-50'
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            {canCancel(trade.status) && (
              <button
                onClick={handleCancelTrade}
                disabled={cancelTradeMutation.isPending}
                className='px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 disabled:opacity-50'
              >
                <Ban className='w-3 h-3' />
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-4'>
        {/* Main Info - 3 colunas */}
        <div className='lg:col-span-3 space-y-4'>
          {/* Trade Values - Grid compacto */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <h2 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2'>
              <DollarSign className='w-4 h-4' />
              Valores do Trade
            </h2>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-xs text-gray-500 dark:text-gray-400'>Qtd Crypto</span>
                <p className='text-base font-semibold text-gray-900 dark:text-white'>
                  {formatCrypto(trade.crypto_amount, trade.symbol)}
                </p>
              </div>
              <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-xs text-gray-500 dark:text-gray-400'>Preço Unit.</span>
                <p className='text-base font-semibold text-gray-900 dark:text-white'>
                  {formatCurrency(trade.crypto_price)}
                </p>
              </div>
              <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-xs text-gray-500 dark:text-gray-400'>Valor Fiat (USD)</span>
                <p className='text-base font-semibold text-gray-900 dark:text-white'>
                  {formatCurrency(trade.fiat_amount)}
                </p>
              </div>
              <div className='p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg'>
                <span className='text-xs text-blue-600 dark:text-blue-400'>Total USD</span>
                <p className='text-base font-semibold text-blue-600 dark:text-blue-400'>
                  {formatCurrency(trade.total_amount)}
                </p>
              </div>
            </div>

            {/* Valores BRL - Apenas se houver */}
            {trade.brl_total_amount && (
              <div className='mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
                <h3 className='text-sm font-medium text-green-700 dark:text-green-400 mb-3 flex items-center gap-2'>
                  <Banknote className='w-4 h-4' />
                  Pagamento em BRL ({trade.payment_method?.toUpperCase()})
                </h3>
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                  <div>
                    <span className='text-xs text-green-600 dark:text-green-400'>
                      Valor Depositado
                    </span>
                    <p className='text-lg font-bold text-green-700 dark:text-green-300'>
                      R${' '}
                      {trade.brl_total_amount?.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  {trade.brl_amount && (
                    <div>
                      <span className='text-xs text-green-600 dark:text-green-400'>Valor Base</span>
                      <p className='text-base font-semibold text-green-700 dark:text-green-300'>
                        R${' '}
                        {trade.brl_amount?.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}
                  {trade.usd_to_brl_rate && (
                    <div>
                      <span className='text-xs text-green-600 dark:text-green-400'>
                        Cotação USD/BRL
                      </span>
                      <p className='text-base font-semibold text-green-700 dark:text-green-300'>
                        R${' '}
                        {trade.usd_to_brl_rate?.toLocaleString('pt-BR', {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </p>
                    </div>
                  )}
                </div>
                {/* Instrução de transferência com código copiável */}
                <div className='mt-3 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg'>
                  <p className='text-xs text-green-700 dark:text-green-300'>
                    <strong>Importante:</strong> Transfira exatamente o valor indicado. Use o código{' '}
                    <button
                      onClick={() => copyToClipboard(trade.reference_code, 'Código de referência')}
                      className='inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-200 dark:bg-green-800 rounded font-mono font-bold hover:bg-green-300 dark:hover:bg-green-700 transition-colors'
                      title='Clique para copiar'
                    >
                      {trade.reference_code}
                      <Copy className='w-3 h-3' />
                    </button>{' '}
                    na descrição da transferência.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Fees & Spread - Compacto */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <h2 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2'>
              <Percent className='w-4 h-4' />
              Taxas e Spread
            </h2>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-xs text-gray-500 dark:text-gray-400'>Spread</span>
                <p className='text-base font-semibold text-gray-900 dark:text-white'>
                  {trade.spread_percentage?.toFixed(2) || '0.00'}%
                </p>
                <p className='text-xs text-gray-500'>{formatCurrency(trade.spread_amount || 0)}</p>
              </div>
              <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-xs text-gray-500 dark:text-gray-400'>Taxa Rede</span>
                <p className='text-base font-semibold text-gray-900 dark:text-white'>
                  {trade.network_fee_percentage?.toFixed(2) || '0.00'}%
                </p>
                <p className='text-xs text-gray-500'>
                  {formatCurrency(trade.network_fee_amount || 0)}
                </p>
              </div>
              <div className='p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg'>
                <span className='text-xs text-purple-600 dark:text-purple-400'>Total Fee</span>
                <p className='text-base font-semibold text-purple-600 dark:text-purple-400'>
                  {formatCurrency(fees.total)}
                </p>
              </div>
              <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between'>
                <div>
                  <span className='text-xs text-gray-500 dark:text-gray-400'>Contabilidade</span>
                  {trade.status?.toLowerCase() === 'completed' ? (
                    <p className='text-xs text-green-600'>Pronto</p>
                  ) : (
                    <p className='text-xs text-yellow-600'>Aguardando</p>
                  )}
                </div>
                <Building2 className='w-4 h-4 text-gray-400' />
              </div>
            </div>
          </div>

          {/* Trade Actions - Compacto */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <h2 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2'>
              <Play className='w-4 h-4' />
              Ações
            </h2>

            <div className='flex flex-wrap items-center gap-2'>
              {/* Network Selection */}
              <select
                id='network-select'
                value={selectedNetwork}
                onChange={e => setSelectedNetwork(e.target.value)}
                className='px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                title='Rede'
              >
                <option value='polygon'>Polygon</option>
                <option value='ethereum'>Ethereum</option>
                <option value='base'>Base</option>
                <option value='bsc'>BSC</option>
              </select>

              {/* Confirmar Pagamento */}
              {canConfirmPayment(trade.status) && (
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirmPaymentMutation.isPending}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50'
                >
                  {confirmPaymentMutation.isPending ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : (
                    <CheckCircle className='w-4 h-4' />
                  )}
                  Confirmar Pagamento
                </button>
              )}

              {/* Retry Depósito */}
              {canRetryDeposit(trade.status) && (
                <button
                  onClick={handleRetryDeposit}
                  disabled={retryDepositMutation.isPending}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50'
                >
                  {retryDepositMutation.isPending ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : (
                    <RotateCcw className='w-4 h-4' />
                  )}
                  Retry Depósito
                </button>
              )}

              {/* Enviar para Contabilidade */}
              {canSendToAccounting(trade.status) && (
                <button
                  onClick={handleSendToAccounting}
                  disabled={sendToAccountingMutation.isPending}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50'
                >
                  {sendToAccountingMutation.isPending ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : (
                    <Building2 className='w-4 h-4' />
                  )}
                  Contabilidade
                </button>
              )}

              {/* ===== AÇÕES DE VENDA (SELL) ===== */}

              {/* Processar Venda - Retirar crypto do usuário */}
              {canProcessSell(trade.status, trade.operation_type) && (
                <button
                  onClick={handleProcessSell}
                  disabled={processSellMutation.isPending}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50'
                >
                  {processSellMutation.isPending ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : (
                    <TrendingDown className='w-4 h-4' />
                  )}
                  Processar Venda
                </button>
              )}

              {/* Finalizar Venda - Após enviar PIX/TED */}
              {canCompleteSell(trade.status, trade.operation_type) && (
                <button
                  onClick={handleCompleteSell}
                  disabled={completeSellMutation.isPending}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50'
                >
                  {completeSellMutation.isPending ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : (
                    <CheckCircle className='w-4 h-4' />
                  )}
                  Finalizar Venda
                </button>
              )}

              {/* Alterar Status */}
              <div className='relative'>
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className='flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700'
                >
                  <Send className='w-4 h-4' />
                  Status
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showActionsMenu && (
                  <div className='absolute top-full left-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10'>
                    {[
                      'pending',
                      'payment_processing',
                      'payment_confirmed',
                      'completed',
                      'failed',
                    ].map(status => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(status)}
                        disabled={updateStatusMutation.isPending || trade.status === status}
                        className='w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50'
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wallet & Payment - Compacto */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <h2 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2'>
              <Wallet className='w-4 h-4' />
              Carteira e Pagamento
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-xs text-gray-500 dark:text-gray-400'>Método</span>
                <p className='text-sm text-gray-900 dark:text-white'>
                  {trade.payment_method || 'N/A'}
                </p>
              </div>

              {trade.wallet_address && (
                <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>Wallet</span>
                    <button
                      onClick={() => copyToClipboard(trade.wallet_address!, 'Endereço')}
                      className='text-blue-600 hover:text-blue-700'
                      title='Copiar endereço'
                      aria-label='Copiar endereço da carteira'
                    >
                      <Copy className='w-3.5 h-3.5' />
                    </button>
                  </div>
                  <p className='text-xs text-gray-900 dark:text-white font-mono truncate'>
                    {trade.wallet_address}
                  </p>
                  {trade.network && <span className='text-xs text-blue-600'>{trade.network}</span>}
                </div>
              )}

              {trade.tx_hash && (
                <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:col-span-2'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>TX Hash</span>
                    <div className='flex gap-1.5'>
                      <button
                        onClick={() => copyToClipboard(trade.tx_hash!, 'Hash')}
                        className='text-blue-600 hover:text-blue-700'
                        title='Copiar hash'
                        aria-label='Copiar hash da transação'
                      >
                        <Copy className='w-3.5 h-3.5' />
                      </button>
                      <a
                        href={`https://bscscan.com/tx/${trade.tx_hash}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:text-blue-700'
                        title='Ver no explorador'
                        aria-label='Ver transação no explorador'
                      >
                        <ExternalLink className='w-3.5 h-3.5' />
                      </a>
                    </div>
                  </div>
                  <p className='text-xs text-gray-900 dark:text-white font-mono truncate'>
                    {trade.tx_hash}
                  </p>
                </div>
              )}

              {trade.payment_proof_url && (
                <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                  <a
                    href={trade.payment_proof_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-sm text-blue-600 hover:underline flex items-center gap-2'
                  >
                    <FileText className='w-4 h-4' />
                    Ver Comprovante
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {trade.error_message && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3'>
              <p className='text-sm text-red-700 dark:text-red-300 flex items-center gap-2'>
                <AlertTriangle className='w-4 h-4' />
                {trade.error_message}
              </p>
            </div>
          )}

          {/* Trade History - Compacto */}
          {trade.history && trade.history.length > 0 && (
            <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
              <h2 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2'>
                <History className='w-4 h-4' />
                Histórico
              </h2>
              <div className='space-y-2 max-h-40 overflow-y-auto'>
                {trade.history.map((event, index) => (
                  <div
                    key={`${event.created_at}-${event.new_status}`}
                    className='flex items-center gap-2 text-xs'
                  >
                    <span className='text-gray-400 w-20 flex-shrink-0'>
                      {formatDate(event.created_at).split(',')[0]}
                    </span>
                    {event.old_status && (
                      <>
                        <span
                          className={`px-1.5 py-0.5 rounded ${getStatusColor(event.old_status)}`}
                        >
                          {getStatusLabel(event.old_status)}
                        </span>
                        <span className='text-gray-400'>→</span>
                      </>
                    )}
                    <span className={`px-1.5 py-0.5 rounded ${getStatusColor(event.new_status)}`}>
                      {getStatusLabel(event.new_status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - 1 coluna */}
        <div className='space-y-4'>
          {/* User Info */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2'>
              <User className='w-4 h-4' />
              Usuário
            </h3>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center'>
                <span className='text-sm font-bold text-blue-600 dark:text-blue-400'>
                  {trade.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900 dark:text-white'>
                  {trade.username || 'N/A'}
                </p>
                <button
                  onClick={() => copyToClipboard(trade.user_id, 'User ID')}
                  className='text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1'
                >
                  <Copy className='w-3 h-3' />
                  {trade.user_id?.substring(0, 8)}...
                </button>
              </div>
            </div>
            <button
              onClick={() => navigate(`/admin/users/${trade.user_id}`)}
              className='w-full mt-3 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600'
            >
              Ver Perfil
            </button>
          </div>

          {/* Dates */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2'>
              <Calendar className='w-4 h-4' />
              Datas
            </h3>
            <div className='space-y-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Criado</span>
                <span className='text-gray-900 dark:text-white'>
                  {formatDate(trade.created_at).split(',')[0]}
                </span>
              </div>
              {trade.expires_at && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Expira</span>
                  <span className='text-gray-900 dark:text-white'>
                    {formatDate(trade.expires_at).split(',')[0]}
                  </span>
                </div>
              )}
              {trade.payment_confirmed_at && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Pago</span>
                  <span className='text-green-600'>
                    {formatDate(trade.payment_confirmed_at).split(',')[0]}
                  </span>
                </div>
              )}
              {trade.completed_at && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Concluído</span>
                  <span className='text-green-600'>
                    {formatDate(trade.completed_at).split(',')[0]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm'>
            <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3'>Resumo</h3>
            <div className='space-y-2 text-xs'>
              <div className='flex justify-between items-center'>
                <span className='text-gray-500'>Tipo</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    trade.operation_type === 'buy'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {trade.operation_type === 'buy' ? 'Compra' : 'Venda'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-500'>Crypto</span>
                <span className='text-gray-900 dark:text-white font-medium'>{trade.symbol}</span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-gray-500'>Status</span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(trade.status)}`}>
                  {getStatusLabel(trade.status)}
                </span>
              </div>
              {trade.network && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Rede</span>
                  <span className='text-gray-900 dark:text-white'>{trade.network}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação Premium */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        details={modalConfig.details || []}
        confirmText={modalConfig.confirmText}
        variant={modalConfig.variant}
        loading={modalLoading}
        icon={modalConfig.icon}
        showInput={modalConfig.showInput || false}
        inputLabel={modalConfig.inputLabel || ''}
        inputPlaceholder={modalConfig.inputPlaceholder || 'Digite aqui...'}
      />
    </div>
  )
}
