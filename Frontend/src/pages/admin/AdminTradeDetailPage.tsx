/**
 * HOLD Wallet - Admin Trade Detail Page
 * ======================================
 *
 * Página de detalhes de um trade OTC específico.
 * Usa React Query para cache de dados.
 */

import React, { useState, useEffect } from 'react'
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
  Zap,
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
  useManualCompleteTrade,
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

  // Estado para completar trade manualmente (BTC)
  const [manualTxHash, setManualTxHash] = useState('')

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
  const manualCompleteMutation = useManualCompleteTrade()

  // Mapa de símbolo para rede padrão
  const getDefaultNetworkForSymbol = (symbol: string): string => {
    const symbolNetworks: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      MATIC: 'polygon',
      POL: 'polygon',
      USDT: 'polygon',
      USDC: 'polygon',
      DAI: 'polygon',
    }
    return symbolNetworks[symbol?.toUpperCase()] || 'polygon'
  }

  // Redes disponíveis por símbolo
  const getAvailableNetworksForSymbol = (symbol: string): { value: string; label: string }[] => {
    const s = symbol?.toUpperCase()

    // Criptos nativas - só podem usar sua própria rede
    if (s === 'BTC') {
      return [{ value: 'bitcoin', label: 'Bitcoin' }]
    }
    if (s === 'ETH') {
      return [
        { value: 'ethereum', label: 'Ethereum' },
        { value: 'polygon', label: 'Polygon' },
        { value: 'base', label: 'Base' },
      ]
    }
    if (s === 'MATIC' || s === 'POL') {
      return [{ value: 'polygon', label: 'Polygon' }]
    }

    // Stablecoins - podem usar múltiplas redes EVM
    if (s === 'USDT' || s === 'USDC' || s === 'DAI') {
      return [
        { value: 'polygon', label: 'Polygon' },
        { value: 'ethereum', label: 'Ethereum' },
        { value: 'base', label: 'Base' },
      ]
    }

    // Default para outras criptos
    return [
      { value: 'polygon', label: 'Polygon' },
      { value: 'ethereum', label: 'Ethereum' },
      { value: 'base', label: 'Base' },
    ]
  }

  // Verifica se a crypto é suportada para depósito automático
  // ✅ ATUALIZADO: Agora multi_chain_service suporta TODAS as 16 criptos!
  // Apenas ADA ainda requer processamento manual
  const isAutomaticDepositSupported = (symbol: string): boolean => {
    // Moedas que ainda requerem envio manual
    const manualOnlyCryptos = ['ADA', 'XLM'] // Cardano e Stellar ainda não implementados
    return !manualOnlyCryptos.includes(symbol?.toUpperCase())
  }

  // Obter URL do blockchain explorer baseado na rede/símbolo
  const getExplorerUrl = (txHash: string, network?: string, symbol?: string): string => {
    // Determinar a rede baseado no parâmetro ou no símbolo
    const net = network?.toLowerCase() || ''
    const sym = symbol?.toUpperCase() || ''

    // Bitcoin e derivados
    if (net === 'bitcoin' || sym === 'BTC') {
      return `https://blockstream.info/tx/${txHash}`
    }
    if (sym === 'LTC') {
      return `https://blockchair.com/litecoin/transaction/${txHash}`
    }
    if (sym === 'DOGE') {
      return `https://dogechain.info/tx/${txHash}`
    }

    // Redes EVM
    if (net === 'ethereum' || net === 'eth') {
      return `https://etherscan.io/tx/${txHash}`
    }
    if (net === 'base') {
      return `https://basescan.org/tx/${txHash}`
    }
    if (net === 'bsc' || net === 'binance') {
      return `https://bscscan.com/tx/${txHash}`
    }
    if (net === 'arbitrum') {
      return `https://arbiscan.io/tx/${txHash}`
    }
    if (net === 'avalanche' || sym === 'AVAX') {
      return `https://snowtrace.io/tx/${txHash}`
    }

    // Polygon como default (mais usado no sistema)
    return `https://polygonscan.com/tx/${txHash}`
  }

  // Obter nome do explorer para exibição
  const getExplorerName = (network?: string, symbol?: string): string => {
    const net = network?.toLowerCase() || ''
    const sym = symbol?.toUpperCase() || ''

    if (net === 'bitcoin' || sym === 'BTC') return 'Blockstream'
    if (sym === 'LTC') return 'Blockchair'
    if (sym === 'DOGE') return 'Dogechain'
    if (net === 'ethereum' || net === 'eth') return 'Etherscan'
    if (net === 'base') return 'Basescan'
    if (net === 'bsc' || net === 'binance') return 'BSCscan'
    if (net === 'arbitrum') return 'Arbiscan'
    if (net === 'avalanche' || sym === 'AVAX') return 'Snowtrace'
    return 'Polygonscan'
  }

  // Effect para inicializar a rede correta baseada no trade
  useEffect(() => {
    if (trade) {
      // Se o trade já tem uma rede definida, usar ela
      if (trade.network) {
        setSelectedNetwork(trade.network)
      } else {
        // Senão, usar a rede padrão para o símbolo
        setSelectedNetwork(getDefaultNetworkForSymbol(trade.symbol))
      }
    }
  }, [trade?.id, trade?.network, trade?.symbol])

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
          const result = await completeSellMutation.mutateAsync({ tradeId, enviarPix: false })

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

  // Handler para finalizar VENDA com envio automático de PIX via API BB
  const handleCompleteSellWithPix = async () => {
    if (!trade || !tradeId) return

    const rm = trade.receiving_method
    const pixInfo = rm?.pix_key
      ? `${rm.pix_key_type?.toUpperCase() || 'CPF'}: ${rm.pix_key}`
      : 'Chave PIX não disponível'

    setModalConfig({
      isOpen: true,
      title: '⚡ Enviar PIX e Finalizar',
      message:
        'O sistema enviará PIX automaticamente via API do Banco do Brasil e finalizará o trade.',
      details: [
        `Trade: ${trade.reference_code}`,
        `Valor: ${formatCurrency(trade.brl_total_amount || trade.fiat_amount)}`,
        `Titular: ${rm?.holder_name || 'N/A'}`,
        `Chave PIX: ${pixInfo}`,
        '',
        '⚠️ O PIX será enviado automaticamente!',
      ],
      variant: 'warning',
      confirmText: 'Enviar PIX e Finalizar',
      icon: <Zap className='w-6 h-6' />,
      onConfirm: async () => {
        try {
          setModalLoading(true)
          // Chama o endpoint com enviar_pix=true
          const result = await completeSellMutation.mutateAsync({
            tradeId,
            enviarPix: true,
          })

          if (result.success) {
            if (result.pix_enviado) {
              toast.success(`✅ PIX enviado com sucesso! E2E: ${result.pix_end_to_end_id}`)
            }
            toast.success(`Trade ${trade.reference_code} finalizado!`)
          } else {
            toast.error('Erro ao enviar PIX e finalizar venda')
          }
          setModalConfig(prev => ({ ...prev, isOpen: false }))
        } catch (err: any) {
          console.error('Erro ao enviar PIX:', err)
          toast.error(err.response?.data?.detail || 'Erro ao enviar PIX via Banco do Brasil')
        } finally {
          setModalLoading(false)
        }
      },
    })
  }

  // Handler para completar trade MANUALMENTE (BTC e outras non-EVM)
  const handleManualComplete = async () => {
    if (!trade || !tradeId || !manualTxHash.trim()) {
      toast.error('Informe o TX Hash da transação')
      return
    }

    setModalConfig({
      isOpen: true,
      title: 'Completar Trade Manualmente',
      message: `Confirmar que você enviou ${trade.crypto_amount} ${trade.symbol} para o usuário?`,
      details: [
        `Trade: ${trade.reference_code}`,
        `Crypto: ${trade.crypto_amount} ${trade.symbol}`,
        `TX Hash: ${manualTxHash}`,
        `Endereço destino: ${trade.wallet_address || 'N/A'}`,
        'Isso marcará o trade como COMPLETED.',
      ],
      variant: 'success',
      confirmText: 'Confirmar Envio',
      icon: <CheckCircle className='w-6 h-6' />,
      onConfirm: async () => {
        try {
          setModalLoading(true)
          const result = await manualCompleteMutation.mutateAsync({
            tradeId,
            data: { tx_hash: manualTxHash.trim() },
          })

          if (result.success) {
            toast.success(`Trade ${trade.reference_code} completado com sucesso!`)
            setManualTxHash('')
          } else {
            toast.error('Erro ao completar trade')
          }
          setModalConfig(prev => ({ ...prev, isOpen: false }))
        } catch (err: any) {
          console.error('Erro ao completar trade:', err)
          toast.error(err.response?.data?.detail || 'Erro ao completar trade')
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
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-2 sm:p-3 md:p-4'>
      {/* Header Compacto */}
      <div className='mb-3'>
        <button
          onClick={() => navigate('/admin/trades')}
          className='flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-1.5'
        >
          <ArrowLeft className='w-3 h-3' />
          Voltar
        </button>

        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                trade.operation_type === 'buy'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              {trade.operation_type === 'buy' ? (
                <TrendingUp className='w-3.5 h-3.5 text-green-600' />
              ) : (
                <TrendingDown className='w-3.5 h-3.5 text-red-600' />
              )}
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-1.5 flex-wrap'>
                <h1 className='text-sm font-semibold text-gray-900 dark:text-white truncate'>
                  {trade.operation_type === 'buy' ? 'Compra' : 'Venda'} {trade.symbol}
                </h1>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap ${getStatusColor(trade.status)}`}
                >
                  {getStatusLabel(trade.status)}
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(trade.reference_code, 'Código de referência')}
                className='flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-600 font-mono'
                title='Copiar código de referência'
              >
                {trade.reference_code}
                <Copy className='w-2.5 h-2.5' />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className='flex gap-1.5 flex-shrink-0'>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className='p-1.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50'
              title='Atualizar'
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            {canCancel(trade.status) && (
              <button
                onClick={handleCancelTrade}
                disabled={cancelTradeMutation.isPending}
                className='px-2 py-1 text-[11px] bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 disabled:opacity-50'
              >
                <Ban className='w-3 h-3' />
                <span className='hidden sm:inline'>Cancelar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-3'>
        {/* Main Info */}
        <div className='lg:col-span-8 xl:col-span-9 space-y-3'>
          {/* Trade Values - Grid compacto */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm'>
            <h2 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5'>
              <DollarSign className='w-3.5 h-3.5' />
              Valores
            </h2>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
              <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
                <span className='text-[10px] text-gray-500 dark:text-gray-400 block'>Crypto</span>
                <p className='text-sm font-semibold text-gray-900 dark:text-white truncate'>
                  {formatCrypto(trade.crypto_amount, trade.symbol)}
                </p>
              </div>
              <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
                <span className='text-[10px] text-gray-500 dark:text-gray-400 block'>Preço</span>
                <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                  {formatCurrency(trade.crypto_price)}
                </p>
              </div>
              <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
                <span className='text-[10px] text-gray-500 dark:text-gray-400 block'>Fiat</span>
                <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                  {formatCurrency(trade.fiat_amount)}
                </p>
              </div>
              <div className='p-2 bg-blue-50 dark:bg-blue-900/30 rounded'>
                <span className='text-[10px] text-blue-600 dark:text-blue-400 block'>Total</span>
                <p className='text-sm font-semibold text-blue-600 dark:text-blue-400'>
                  {formatCurrency(trade.total_amount)}
                </p>
              </div>
            </div>

            {/* Valores BRL - Apenas se houver */}
            {trade.brl_total_amount && (
              <div className='mt-2 p-2.5 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800'>
                <div className='flex items-center justify-between mb-2'>
                  <h3 className='text-[11px] font-medium text-green-700 dark:text-green-400 flex items-center gap-1'>
                    <Banknote className='w-3 h-3' />
                    BRL ({trade.payment_method?.toUpperCase()})
                  </h3>
                  {trade.usd_to_brl_rate && (
                    <span className='text-[9px] text-green-600 dark:text-green-400'>
                      1 USD = R$ {trade.usd_to_brl_rate.toFixed(4)}
                    </span>
                  )}
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <span className='text-[9px] text-green-600'>Valor Final</span>
                    <p className='text-base font-bold text-green-700 dark:text-green-300'>
                      R${' '}
                      {trade.brl_total_amount?.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  {trade.brl_amount && trade.brl_amount !== trade.brl_total_amount && (
                    <div>
                      <span className='text-[9px] text-green-600'>Valor Base</span>
                      <p className='text-sm font-medium text-green-700 dark:text-green-300'>
                        R${' '}
                        {trade.brl_amount?.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== SEÇÃO ESPECIAL PARA VENDA (SELL) ===== */}
            {trade.operation_type === 'sell' && (
              <div className='mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800'>
                <h3 className='text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5'>
                  <TrendingDown className='w-3 h-3' />
                  Fluxo de Venda
                </h3>

                {/* Status Steps - Compacto */}
                <div className='flex items-center gap-1 mb-2 overflow-x-auto'>
                  {[
                    { status: 'pending', label: 'Pendente' },
                    { status: 'crypto_received', label: 'Crypto OK' },
                    { status: 'completed', label: 'Concluído' },
                  ].map((step, idx) => {
                    const currentStatus = trade.status?.toLowerCase()
                    const isCompleted =
                      (step.status === 'pending' &&
                        ['crypto_received', 'completed'].includes(currentStatus)) ||
                      (step.status === 'crypto_received' && currentStatus === 'completed') ||
                      (step.status === currentStatus && currentStatus === 'completed')
                    const isCurrent = step.status === currentStatus

                    return (
                      <div key={step.status} className='flex items-center'>
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-medium ${
                            isCompleted
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                              : isCurrent
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className='w-3 h-3' />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                          <span className='whitespace-nowrap'>{step.label}</span>
                        </div>
                        {idx < 2 && (
                          <div
                            className={`w-3 h-px mx-0.5 ${isCompleted ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Valores da Venda - Compacto */}
                <div className='grid grid-cols-3 gap-1.5 mb-2'>
                  <div className='p-1.5 bg-amber-100/50 dark:bg-amber-900/30 rounded text-center'>
                    <span className='text-[8px] text-amber-600 block'>Crypto</span>
                    <p className='text-[11px] font-bold text-amber-700 dark:text-amber-300'>
                      {trade.crypto_amount} {trade.symbol}
                    </p>
                  </div>
                  <div className='p-1.5 bg-amber-100/50 dark:bg-amber-900/30 rounded text-center'>
                    <span className='text-[8px] text-amber-600 block'>USD</span>
                    <p className='text-[11px] font-bold text-amber-700 dark:text-amber-300'>
                      {formatCurrency(trade.fiat_amount)}
                    </p>
                  </div>
                  <div className='p-1.5 bg-green-100 dark:bg-green-900/40 rounded text-center'>
                    <span className='text-[8px] text-green-600 block'>PIX Líquido</span>
                    <p className='text-[11px] font-bold text-green-700 dark:text-green-300'>
                      R${' '}
                      {trade.brl_total_amount?.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      }) || '---'}
                    </p>
                  </div>
                </div>

                {/* Taxas inline */}
                {(trade.spread_amount || trade.network_fee_amount) && (
                  <div className='flex flex-wrap gap-2 text-[9px] text-gray-600 dark:text-gray-400 mb-2'>
                    <span>Spread: -{formatCurrency(trade.spread_amount || 0)}</span>
                    <span>Rede: -{formatCurrency(trade.network_fee_amount || 0)}</span>
                    {trade.usd_to_brl_rate && (
                      <span className='text-blue-600'>
                        USD/BRL: R$ {trade.usd_to_brl_rate.toFixed(4)}
                      </span>
                    )}
                  </div>
                )}

                {/* Status Message */}
                <div
                  className={`p-1.5 rounded text-[10px] ${
                    trade.status?.toLowerCase() === 'completed'
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      : trade.status?.toLowerCase() === 'crypto_received'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {trade.status?.toLowerCase() === 'pending' && (
                    <span className='flex items-center gap-1'>
                      <Play className='w-3 h-3' /> Clique em "Processar Venda" para retirar crypto
                    </span>
                  )}
                  {trade.status?.toLowerCase() === 'payment_processing' && (
                    <span className='flex items-center gap-1'>
                      <RefreshCw className='w-3 h-3 animate-spin' /> Transferindo crypto...
                    </span>
                  )}
                  {trade.status?.toLowerCase() === 'crypto_received' && (
                    <span className='flex items-center gap-1'>
                      <CheckCircle className='w-3 h-3' /> Crypto recebida! Envie PIX e finalize.
                    </span>
                  )}
                  {trade.status?.toLowerCase() === 'completed' && (
                    <span className='flex items-center gap-1'>
                      <CheckCircle className='w-3 h-3' /> Venda concluída com sucesso!
                    </span>
                  )}
                </div>

                {/* TX Hash */}
                {trade.tx_hash && (
                  <div className='mt-1.5 flex items-center gap-1 text-[9px] text-gray-500'>
                    <span>TX:</span>
                    <span className='font-mono truncate max-w-[120px]'>{trade.tx_hash}</span>
                    <button
                      onClick={() => copyToClipboard(trade.tx_hash!, 'TX')}
                      className='text-blue-600'
                      title='Copiar TX Hash'
                      aria-label='Copiar TX Hash'
                    >
                      <Copy className='w-2.5 h-2.5' />
                    </button>
                    <a
                      href={getExplorerUrl(trade.tx_hash, trade.network, trade.symbol)}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600'
                      title={`Ver no ${getExplorerName(trade.network, trade.symbol)}`}
                      aria-label='Ver transação no explorador'
                    >
                      <ExternalLink className='w-2.5 h-2.5' />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fees & Actions - Row compacto */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {/* Fees */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm'>
              <h2 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5'>
                <Percent className='w-3.5 h-3.5' />
                Taxas
              </h2>
              <div className='grid grid-cols-3 gap-2'>
                <div className='text-center'>
                  <span className='text-[9px] text-gray-500 block'>Spread</span>
                  <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                    {trade.spread_percentage?.toFixed(1) || '0'}%
                  </p>
                  <p className='text-[9px] text-gray-500'>
                    {formatCurrency(trade.spread_amount || 0)}
                  </p>
                </div>
                <div className='text-center'>
                  <span className='text-[9px] text-gray-500 block'>Rede</span>
                  <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                    {trade.network_fee_percentage?.toFixed(1) || '0'}%
                  </p>
                  <p className='text-[9px] text-gray-500'>
                    {formatCurrency(trade.network_fee_amount || 0)}
                  </p>
                </div>
                <div className='text-center'>
                  <span className='text-[9px] text-purple-600 block'>Total</span>
                  <p className='text-sm font-semibold text-purple-600'>
                    {formatCurrency(fees.total)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm'>
              <h2 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5'>
                <Play className='w-3.5 h-3.5' />
                Ações
              </h2>

              {/* Aviso para cryptos não-EVM (BTC, etc) */}
              {!isAutomaticDepositSupported(trade.symbol) && trade.status !== 'completed' && (
                <div className='mb-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded'>
                  <div className='flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 mb-2'>
                    <AlertTriangle className='w-3 h-3' />
                    <strong>{trade.symbol}</strong> requer envio manual. Informe o TX após enviar:
                  </div>
                  <div className='flex gap-1.5'>
                    <input
                      type='text'
                      value={manualTxHash}
                      onChange={e => setManualTxHash(e.target.value)}
                      placeholder='Cole o TX Hash aqui...'
                      className='flex-1 px-2 py-1.5 text-[10px] border border-amber-300 dark:border-amber-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400'
                    />
                    <button
                      onClick={handleManualComplete}
                      disabled={manualCompleteMutation.isPending || !manualTxHash.trim()}
                      className='flex items-center gap-1 px-3 py-1.5 text-[10px] bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 whitespace-nowrap'
                    >
                      {manualCompleteMutation.isPending ? (
                        <RefreshCw className='w-3 h-3 animate-spin' />
                      ) : (
                        <CheckCircle className='w-3 h-3' />
                      )}
                      Completar
                    </button>
                  </div>
                  {trade.wallet_address && (
                    <div className='mt-1.5 text-[9px] text-amber-600 dark:text-amber-400'>
                      Enviar para: <span className='font-mono'>{trade.wallet_address}</span>
                      <button
                        onClick={() => copyToClipboard(trade.wallet_address!, 'Endereço')}
                        className='ml-1 text-amber-700 hover:text-amber-800'
                        title='Copiar endereço'
                      >
                        <Copy className='w-2.5 h-2.5 inline' />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className='flex flex-wrap items-center gap-1.5'>
                {/* Network Selection - Dinâmico baseado no símbolo */}
                {(() => {
                  const availableNetworks = getAvailableNetworksForSymbol(trade.symbol)
                  // Se só tem uma rede, mostrar como label fixo
                  if (availableNetworks.length === 1 && availableNetworks[0]) {
                    return (
                      <span className='px-2 py-1 text-[10px] border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-medium'>
                        {availableNetworks[0].label}
                      </span>
                    )
                  }
                  // Se tem múltiplas redes, mostrar dropdown
                  return (
                    <select
                      id='network-select'
                      value={selectedNetwork}
                      onChange={e => setSelectedNetwork(e.target.value)}
                      className='px-2 py-1 text-[10px] border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                      title='Rede'
                    >
                      {availableNetworks.map(net => (
                        <option key={net.value} value={net.value}>
                          {net.label}
                        </option>
                      ))}
                    </select>
                  )
                })()}

                {/* Confirmar Pagamento - Apenas para cryptos EVM */}
                {canConfirmPayment(trade.status) &&
                  trade.operation_type === 'buy' &&
                  isAutomaticDepositSupported(trade.symbol) && (
                    <button
                      onClick={handleConfirmPayment}
                      disabled={confirmPaymentMutation.isPending}
                      className='flex items-center gap-1 px-2 py-1 text-[10px] bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50'
                    >
                      {confirmPaymentMutation.isPending ? (
                        <RefreshCw className='w-3 h-3 animate-spin' />
                      ) : (
                        <CheckCircle className='w-3 h-3' />
                      )}
                      Confirmar
                    </button>
                  )}

                {/* Retry Depósito - Apenas para cryptos EVM */}
                {canRetryDeposit(trade.status) && isAutomaticDepositSupported(trade.symbol) && (
                  <button
                    onClick={handleRetryDeposit}
                    disabled={retryDepositMutation.isPending}
                    className='flex items-center gap-1 px-2 py-1 text-[10px] bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50'
                  >
                    {retryDepositMutation.isPending ? (
                      <RefreshCw className='w-3 h-3 animate-spin' />
                    ) : (
                      <RotateCcw className='w-3 h-3' />
                    )}
                    Retry
                  </button>
                )}

                {/* Contabilidade */}
                {canSendToAccounting(trade.status) && (
                  <button
                    onClick={handleSendToAccounting}
                    disabled={sendToAccountingMutation.isPending}
                    className='flex items-center gap-1 px-2 py-1 text-[10px] bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50'
                  >
                    {sendToAccountingMutation.isPending ? (
                      <RefreshCw className='w-3 h-3 animate-spin' />
                    ) : (
                      <Building2 className='w-3 h-3' />
                    )}
                    Contab.
                  </button>
                )}

                {/* SELL: Processar Venda */}
                {canProcessSell(trade.status, trade.operation_type) && (
                  <button
                    onClick={handleProcessSell}
                    disabled={processSellMutation.isPending}
                    className='flex items-center gap-1 px-2 py-1 text-[10px] bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50'
                  >
                    {processSellMutation.isPending ? (
                      <RefreshCw className='w-3 h-3 animate-spin' />
                    ) : (
                      <TrendingDown className='w-3 h-3' />
                    )}
                    Processar
                  </button>
                )}

                {/* SELL: Finalizar */}
                {canCompleteSell(trade.status, trade.operation_type) && (
                  <div className='flex gap-1'>
                    {/* Botão PIX Automático (se tiver receiving_method) */}
                    {trade.receiving_method && (
                      <button
                        onClick={() => handleCompleteSellWithPix()}
                        disabled={completeSellMutation.isPending}
                        className='flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50'
                        title='Envia PIX automaticamente via API BB e finaliza'
                      >
                        {completeSellMutation.isPending ? (
                          <RefreshCw className='w-3 h-3 animate-spin' />
                        ) : (
                          <Zap className='w-3 h-3' />
                        )}
                        PIX Auto
                      </button>
                    )}
                    {/* Botão Finalizar Manual */}
                    <button
                      onClick={handleCompleteSell}
                      disabled={completeSellMutation.isPending}
                      className='flex items-center gap-1 px-2 py-1 text-[10px] bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50'
                      title='Marcar como finalizado (PIX enviado manualmente)'
                    >
                      {completeSellMutation.isPending ? (
                        <RefreshCw className='w-3 h-3 animate-spin' />
                      ) : (
                        <CheckCircle className='w-3 h-3' />
                      )}
                      Finalizar
                    </button>
                  </div>
                )}

                {/* Status Menu */}
                <div className='relative'>
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className='flex items-center gap-1 px-2 py-1 text-[10px] bg-gray-600 text-white rounded hover:bg-gray-700'
                  >
                    <Send className='w-3 h-3' />
                    Status
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showActionsMenu && (
                    <div className='absolute top-full right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-10'>
                      {[
                        'pending',
                        'payment_processing',
                        'payment_confirmed',
                        'crypto_received',
                        'completed',
                        'failed',
                      ].map(status => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(status)}
                          disabled={
                            updateStatusMutation.isPending || trade.status?.toLowerCase() === status
                          }
                          className='w-full px-2 py-1.5 text-left text-[10px] hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50'
                        >
                          {getStatusLabel(status)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Wallet & Payment - Compacto */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm'>
            <h2 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5'>
              <Wallet className='w-3.5 h-3.5' />
              Carteira
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
                <span className='text-[9px] text-gray-500 block'>Método</span>
                <p className='text-xs text-gray-900 dark:text-white font-medium'>
                  {trade.payment_method?.toUpperCase() || 'N/A'}
                </p>
              </div>

              {trade.wallet_address && (
                <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
                  <div className='flex items-center justify-between'>
                    <span className='text-[9px] text-gray-500'>Wallet</span>
                    <button
                      onClick={() => copyToClipboard(trade.wallet_address!, 'Endereço')}
                      className='text-blue-600 hover:text-blue-700'
                      title='Copiar endereço'
                      aria-label='Copiar endereço da carteira'
                    >
                      <Copy className='w-3 h-3' />
                    </button>
                  </div>
                  <p className='text-[10px] text-gray-900 dark:text-white font-mono truncate'>
                    {trade.wallet_address}
                  </p>
                  {trade.network && (
                    <span className='text-[9px] text-blue-600'>{trade.network}</span>
                  )}
                </div>
              )}

              {trade.tx_hash && (
                <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded sm:col-span-2'>
                  <div className='flex items-center justify-between'>
                    <span className='text-[9px] text-gray-500'>TX Hash</span>
                    <div className='flex gap-1'>
                      <button
                        onClick={() => copyToClipboard(trade.tx_hash!, 'Hash')}
                        className='text-blue-600 hover:text-blue-700'
                        title='Copiar hash'
                        aria-label='Copiar hash'
                      >
                        <Copy className='w-3 h-3' />
                      </button>
                      <a
                        href={getExplorerUrl(trade.tx_hash, trade.network, trade.symbol)}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:text-blue-700'
                        title={`Ver no ${getExplorerName(trade.network, trade.symbol)}`}
                        aria-label='Ver no explorador'
                      >
                        <ExternalLink className='w-3 h-3' />
                      </a>
                    </div>
                  </div>
                  <p className='text-[10px] text-gray-900 dark:text-white font-mono truncate'>
                    {trade.tx_hash}
                  </p>
                </div>
              )}

              {trade.payment_proof_url && (
                <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
                  <a
                    href={trade.payment_proof_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-[10px] text-blue-600 hover:underline flex items-center gap-1'
                  >
                    <FileText className='w-3 h-3' />
                    Ver Comprovante
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* PIX Info - Banco do Brasil */}
          {trade.pix_txid && (
            <div className='bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm'>
              <h2 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5'>
                <Banknote className='w-3.5 h-3.5' />
                Dados do PIX
              </h2>
              <div className='space-y-2'>
                {/* TXID */}
                <div className='p-2 bg-green-50 dark:bg-green-900/20 rounded'>
                  <div className='flex items-center justify-between'>
                    <span className='text-[9px] text-green-600 dark:text-green-400'>PIX TXID</span>
                    <button
                      onClick={() => copyToClipboard(trade.pix_txid!, 'PIX TXID')}
                      className='text-green-600 hover:text-green-700'
                      title='Copiar TXID'
                      aria-label='Copiar PIX TXID'
                    >
                      <Copy className='w-3 h-3' />
                    </button>
                  </div>
                  <p className='text-[10px] text-green-700 dark:text-green-300 font-mono'>
                    {trade.pix_txid}
                  </p>
                </div>

                {/* PIX Copia e Cola (QR Code String) */}
                {trade.pix_qrcode && (
                  <div className='p-2 bg-green-50 dark:bg-green-900/20 rounded'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-[9px] text-green-600 dark:text-green-400'>
                        PIX Copia e Cola
                      </span>
                      <button
                        onClick={() => copyToClipboard(trade.pix_qrcode!, 'PIX Copia e Cola')}
                        className='text-green-600 hover:text-green-700 flex items-center gap-1'
                        title='Copiar código PIX'
                        aria-label='Copiar código PIX'
                      >
                        <Copy className='w-3 h-3' />
                        <span className='text-[9px]'>Copiar</span>
                      </button>
                    </div>
                    <p className='text-[9px] text-green-700 dark:text-green-300 font-mono break-all line-clamp-3'>
                      {trade.pix_qrcode}
                    </p>
                  </div>
                )}

                {/* Dados de Confirmação */}
                <div className='grid grid-cols-2 gap-2'>
                  {trade.pix_valor_recebido && (
                    <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
                      <span className='text-[9px] text-gray-500 block'>Valor Recebido</span>
                      <p className='text-xs font-semibold text-green-600'>
                        R${' '}
                        {trade.pix_valor_recebido.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}

                  {trade.pix_end_to_end_id && (
                    <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
                      <div className='flex items-center justify-between'>
                        <span className='text-[9px] text-gray-500'>End-to-End ID</span>
                        <button
                          onClick={() => copyToClipboard(trade.pix_end_to_end_id!, 'E2E ID')}
                          className='text-blue-600 hover:text-blue-700'
                          title='Copiar E2E ID'
                          aria-label='Copiar End-to-End ID'
                        >
                          <Copy className='w-2.5 h-2.5' />
                        </button>
                      </div>
                      <p className='text-[9px] text-gray-900 dark:text-white font-mono truncate'>
                        {trade.pix_end_to_end_id}
                      </p>
                    </div>
                  )}
                </div>

                {trade.pix_confirmado_em && (
                  <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded'>
                    <span className='text-[9px] text-green-600 block'>Confirmado em</span>
                    <p className='text-xs font-medium text-green-700 dark:text-green-300'>
                      {formatDate(trade.pix_confirmado_em)}
                    </p>
                  </div>
                )}

                {/* Link Location (URL do QR) */}
                {trade.pix_location && (
                  <div className='p-2 bg-gray-50 dark:bg-gray-700/50 rounded'>
                    <div className='flex items-center justify-between'>
                      <span className='text-[9px] text-gray-500'>URL do QR Code</span>
                      <a
                        href={trade.pix_location}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:text-blue-700 flex items-center gap-1'
                        title='Abrir QR Code'
                      >
                        <ExternalLink className='w-3 h-3' />
                      </a>
                    </div>
                    <p className='text-[9px] text-gray-600 dark:text-gray-400 font-mono truncate'>
                      {trade.pix_location}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {trade.error_message && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2'>
              <p className='text-[10px] text-red-700 dark:text-red-300 flex items-center gap-1'>
                <AlertTriangle className='w-3 h-3' />
                {trade.error_message}
              </p>
            </div>
          )}

          {/* Trade History - Compacto */}
          {trade.history && trade.history.length > 0 && (
            <div className='bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm'>
              <h2 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5'>
                <History className='w-3.5 h-3.5' />
                Histórico
              </h2>
              <div className='space-y-1 max-h-32 overflow-y-auto'>
                {trade.history.map((event, index) => (
                  <div
                    key={`${event.created_at}-${event.new_status}`}
                    className='flex items-center gap-1.5 text-[10px]'
                  >
                    <span className='text-gray-400 w-16 flex-shrink-0'>
                      {formatDate(event.created_at).split(',')[0]}
                    </span>
                    {event.old_status && (
                      <>
                        <span
                          className={`px-1 py-0.5 rounded text-[9px] ${getStatusColor(event.old_status)}`}
                        >
                          {getStatusLabel(event.old_status)}
                        </span>
                        <span className='text-gray-400'>→</span>
                      </>
                    )}
                    <span
                      className={`px-1 py-0.5 rounded text-[9px] ${getStatusColor(event.new_status)}`}
                    >
                      {getStatusLabel(event.new_status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className='lg:col-span-4 xl:col-span-3 space-y-3'>
          {/* User Info */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm'>
            <h3 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5'>
              <User className='w-3.5 h-3.5' />
              Usuário
            </h3>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0'>
                <span className='text-xs font-bold text-blue-600 dark:text-blue-400'>
                  {trade.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className='min-w-0 flex-1'>
                <p className='text-xs font-medium text-gray-900 dark:text-white truncate'>
                  {trade.username || 'N/A'}
                </p>
                <button
                  onClick={() => copyToClipboard(trade.user_id, 'User ID')}
                  className='text-[9px] text-gray-500 hover:text-blue-600 flex items-center gap-0.5'
                >
                  <Copy className='w-2.5 h-2.5' />
                  {trade.user_id?.substring(0, 8)}...
                </button>
              </div>
            </div>
            <button
              onClick={() => navigate(`/admin/users/${trade.user_id}`)}
              className='w-full mt-2 px-2 py-1.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600'
            >
              Ver Perfil
            </button>
          </div>

          {/* Dates & Summary Combined */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm'>
            <h3 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5'>
              <Calendar className='w-3.5 h-3.5' />
              Informações
            </h3>
            <div className='space-y-1.5 text-[10px]'>
              {/* Tipo e Status */}
              <div className='flex justify-between items-center'>
                <span className='text-gray-500'>Tipo</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    trade.operation_type === 'buy'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {trade.operation_type === 'buy' ? 'Compra' : 'Venda'}
                </span>
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-gray-500'>Crypto</span>
                <span className='text-gray-900 dark:text-white font-medium'>{trade.symbol}</span>
              </div>
              {trade.network && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Rede</span>
                  <span className='text-gray-900 dark:text-white capitalize'>{trade.network}</span>
                </div>
              )}
              <div className='border-t border-gray-100 dark:border-gray-700 my-1.5 pt-1.5'>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Criado</span>
                  <span className='text-gray-900 dark:text-white'>
                    {formatDate(trade.created_at).split(',')[0]}
                  </span>
                </div>
              </div>
              {trade.expires_at && (
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Expira</span>
                  <span className='text-orange-600'>
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
