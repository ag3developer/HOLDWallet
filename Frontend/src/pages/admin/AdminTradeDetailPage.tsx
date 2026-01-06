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
  XCircle,
  Clock,
  User,
  Calendar,
  Hash,
  DollarSign,
  Wallet,
  CreditCard,
  Percent,
  Link2,
  Copy,
  ExternalLink,
  FileText,
  History,
  Ban,
  Play,
  Send,
  Calculator,
  RotateCcw,
  ChevronDown,
  Building2,
} from 'lucide-react'
import {
  useTrade,
  useCancelTrade,
  useConfirmTradePayment,
  useRetryTradeDeposit,
  useSendToAccounting,
  useUpdateTradeStatus,
} from '@/hooks/admin/useAdminTrades'
import { toast } from 'react-hot-toast'

export const AdminTradeDetailPage: React.FC = () => {
  const { tradeId } = useParams<{ tradeId: string }>()
  const navigate = useNavigate()
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState('polygon')

  // Query para trade específico
  const { data: trade, isLoading, error, refetch, isFetching } = useTrade(tradeId || '')

  // Mutations
  const cancelTradeMutation = useCancelTrade()
  const confirmPaymentMutation = useConfirmTradePayment()
  const retryDepositMutation = useRetryTradeDeposit()
  const sendToAccountingMutation = useSendToAccounting()
  const updateStatusMutation = useUpdateTradeStatus()

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

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase()
    switch (s) {
      case 'completed':
        return <CheckCircle className='w-5 h-5' />
      case 'pending':
      case 'payment_processing':
        return <Clock className='w-5 h-5' />
      case 'cancelled':
      case 'expired':
        return <XCircle className='w-5 h-5' />
      case 'failed':
        return <AlertTriangle className='w-5 h-5' />
      default:
        return null
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

  const handleCancelTrade = async () => {
    if (!trade || !tradeId) return

    if (!confirm(`Deseja cancelar o trade ${trade.reference_code}?`)) {
      return
    }

    const reason = prompt('Motivo do cancelamento (opcional):')

    try {
      await cancelTradeMutation.mutateAsync({
        tradeId,
        ...(reason ? { reason } : {}),
      })
      toast.success(`Trade ${trade.reference_code} cancelado com sucesso`)
    } catch (err: any) {
      console.error('Erro ao cancelar trade:', err)
      toast.error(err.response?.data?.detail || 'Erro ao cancelar trade')
    }
  }

  const handleConfirmPayment = async () => {
    if (!trade || !tradeId) return

    if (
      !confirm(
        `Confirmar recebimento do pagamento do trade ${trade.reference_code}?\n\nIsso irá disparar o depósito de crypto para o usuário.`
      )
    ) {
      return
    }

    try {
      const result = await confirmPaymentMutation.mutateAsync({
        tradeId,
        data: { network: selectedNetwork },
      })

      if (result.success) {
        toast.success(`Pagamento confirmado! TX: ${result.tx_hash || 'Processando...'}`)
      } else {
        toast.error(result.error || 'Erro ao processar depósito')
      }
    } catch (err: any) {
      console.error('Erro ao confirmar pagamento:', err)
      toast.error(err.response?.data?.detail || 'Erro ao confirmar pagamento')
    }
  }

  const handleRetryDeposit = async () => {
    if (!trade || !tradeId) return

    if (!confirm(`Tentar novamente o depósito para ${trade.reference_code}?`)) {
      return
    }

    try {
      const result = await retryDepositMutation.mutateAsync({
        tradeId,
        network: selectedNetwork,
      })

      if (result.success) {
        toast.success(`Depósito realizado! TX: ${result.tx_hash}`)
      } else {
        toast.error(result.error || 'Erro ao processar depósito')
      }
    } catch (err: any) {
      console.error('Erro no retry:', err)
      toast.error(err.response?.data?.detail || 'Erro ao tentar novamente')
    }
  }

  const handleSendToAccounting = async () => {
    if (!trade || !tradeId) return

    if (!confirm(`Enviar comissões do trade ${trade.reference_code} para contabilidade?`)) {
      return
    }

    try {
      const result = await sendToAccountingMutation.mutateAsync(tradeId)
      toast.success(`Enviado para contabilidade! ${result.entries?.length || 0} registros criados.`)
    } catch (err: any) {
      console.error('Erro ao enviar para contabilidade:', err)
      toast.error(err.response?.data?.detail || 'Erro ao enviar para contabilidade')
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!trade || !tradeId) return

    const reason = prompt(`Motivo da alteração para "${getStatusLabel(newStatus)}" (opcional):`)

    try {
      await updateStatusMutation.mutateAsync({
        tradeId,
        data: {
          status: newStatus as any,
          ...(reason ? { reason } : {}),
        },
      })
      toast.success(`Status alterado para ${getStatusLabel(newStatus)}`)
      setShowActionsMenu(false)
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err)
      toast.error(err.response?.data?.detail || 'Erro ao atualizar status')
    }
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
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6'>
      {/* Header */}
      <div className='mb-6 md:mb-8'>
        <button
          onClick={() => navigate('/admin/trades')}
          className='flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4'
        >
          <ArrowLeft className='w-4 h-4' />
          Voltar para Trades
        </button>

        <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <div
              className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center ${
                trade.operation_type === 'buy'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              {trade.operation_type === 'buy' ? (
                <TrendingUp className='w-7 h-7 md:w-8 md:h-8 text-green-600' />
              ) : (
                <TrendingDown className='w-7 h-7 md:w-8 md:h-8 text-red-600' />
              )}
            </div>
            <div>
              <div className='flex flex-wrap items-center gap-2 md:gap-3'>
                <h1 className='text-xl md:text-2xl font-bold text-gray-900 dark:text-white'>
                  {trade.operation_type === 'buy' ? 'Compra' : 'Venda'} de {trade.symbol}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(trade.status)}`}
                >
                  {getStatusIcon(trade.status)}
                  {getStatusLabel(trade.status)}
                </span>
              </div>
              <div className='flex flex-wrap items-center gap-2 md:gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400'>
                <span className='flex items-center gap-1'>
                  <Hash className='w-4 h-4' />
                  {trade.reference_code}
                </span>
                <button
                  onClick={() => copyToClipboard(trade.id, 'ID')}
                  className='flex items-center gap-1 hover:text-blue-600'
                  title='Copiar ID'
                >
                  <Copy className='w-3 h-3' />
                  <span className='truncate max-w-[120px] md:max-w-none'>{trade.id}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className='flex flex-wrap gap-2'>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className='px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 disabled:opacity-50'
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            {canCancel(trade.status) && (
              <button
                onClick={handleCancelTrade}
                disabled={cancelTradeMutation.isPending}
                className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50'
              >
                {cancelTradeMutation.isPending ? (
                  <RefreshCw className='w-4 h-4 animate-spin' />
                ) : (
                  <Ban className='w-4 h-4' />
                )}
                Cancelar Trade
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
        {/* Main Info */}
        <div className='lg:col-span-2 space-y-4 md:space-y-6'>
          {/* Trade Values */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <DollarSign className='w-5 h-5 text-green-600' />
              Valores do Trade
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Quantidade Crypto</span>
                <p className='text-xl font-bold text-gray-900 dark:text-white mt-1'>
                  {formatCrypto(trade.crypto_amount, trade.symbol)}
                </p>
              </div>
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Preço Unitário</span>
                <p className='text-xl font-bold text-gray-900 dark:text-white mt-1'>
                  {formatCurrency(trade.crypto_price)}
                </p>
              </div>
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Valor Fiat</span>
                <p className='text-xl font-bold text-gray-900 dark:text-white mt-1'>
                  {formatCurrency(trade.fiat_amount)}
                </p>
              </div>
              <div className='p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg'>
                <span className='text-sm text-blue-600 dark:text-blue-400'>Total do Trade</span>
                <p className='text-xl font-bold text-blue-600 dark:text-blue-400 mt-1'>
                  {formatCurrency(trade.total_amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Fees & Spread */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <Percent className='w-5 h-5 text-purple-600' />
              Taxas e Spread
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Spread</span>
                <div className='flex items-baseline gap-2 mt-1'>
                  <p className='text-lg font-bold text-gray-900 dark:text-white'>
                    {trade.spread_percentage?.toFixed(2) || '0.00'}%
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    ({formatCurrency(trade.spread_amount || 0)})
                  </p>
                </div>
              </div>
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Taxa de Rede</span>
                <div className='flex items-baseline gap-2 mt-1'>
                  <p className='text-lg font-bold text-gray-900 dark:text-white'>
                    {trade.network_fee_percentage?.toFixed(2) || '0.00'}%
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    ({formatCurrency(trade.network_fee_amount || 0)})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Actions - Ações da Fatura */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <Play className='w-5 h-5 text-blue-600' />
              Ações da Fatura
            </h2>

            {/* Network Selection */}
            <div className='mb-4'>
              <label
                htmlFor='network-select'
                className='block text-sm text-gray-500 dark:text-gray-400 mb-2'
              >
                Rede para Depósito
              </label>
              <select
                id='network-select'
                value={selectedNetwork}
                onChange={e => setSelectedNetwork(e.target.value)}
                className='w-full md:w-auto px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                title='Selecione a rede blockchain'
              >
                <option value='polygon'>Polygon</option>
                <option value='ethereum'>Ethereum</option>
                <option value='base'>Base</option>
                <option value='bsc'>BSC (Binance)</option>
              </select>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {/* Confirmar Pagamento */}
              {canConfirmPayment(trade.status) && (
                <button
                  onClick={handleConfirmPayment}
                  disabled={confirmPaymentMutation.isPending}
                  className='flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors'
                >
                  {confirmPaymentMutation.isPending ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : (
                    <CheckCircle className='w-4 h-4' />
                  )}
                  Confirmar Pagamento e Depositar
                </button>
              )}

              {/* Retry Depósito */}
              {canRetryDeposit(trade.status) && (
                <button
                  onClick={handleRetryDeposit}
                  disabled={retryDepositMutation.isPending}
                  className='flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors'
                >
                  {retryDepositMutation.isPending ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : (
                    <RotateCcw className='w-4 h-4' />
                  )}
                  Tentar Depósito Novamente
                </button>
              )}

              {/* Enviar para Contabilidade */}
              {canSendToAccounting(trade.status) && (
                <button
                  onClick={handleSendToAccounting}
                  disabled={sendToAccountingMutation.isPending}
                  className='flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors'
                >
                  {sendToAccountingMutation.isPending ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : (
                    <Building2 className='w-4 h-4' />
                  )}
                  Enviar para Contabilidade
                </button>
              )}

              {/* Alterar Status */}
              <div className='relative'>
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
                >
                  <Send className='w-4 h-4' />
                  Alterar Status
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showActionsMenu && (
                  <div className='absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10'>
                    <button
                      onClick={() => handleUpdateStatus('pending')}
                      disabled={updateStatusMutation.isPending || trade.status === 'pending'}
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 flex items-center gap-2'
                    >
                      <Clock className='w-4 h-4 text-yellow-500' />
                      Pendente
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('payment_processing')}
                      disabled={
                        updateStatusMutation.isPending || trade.status === 'payment_processing'
                      }
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 flex items-center gap-2'
                    >
                      <RefreshCw className='w-4 h-4 text-blue-500' />
                      Processando Pagamento
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('payment_confirmed')}
                      disabled={updateStatusMutation.isPending}
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 flex items-center gap-2'
                    >
                      <CheckCircle className='w-4 h-4 text-green-500' />
                      Pagamento Confirmado
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('completed')}
                      disabled={updateStatusMutation.isPending || trade.status === 'completed'}
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 flex items-center gap-2'
                    >
                      <CheckCircle className='w-4 h-4 text-green-600' />
                      Concluído
                    </button>
                    <button
                      onClick={() => handleUpdateStatus('failed')}
                      disabled={updateStatusMutation.isPending || trade.status === 'failed'}
                      className='w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 flex items-center gap-2'
                    >
                      <AlertTriangle className='w-4 h-4 text-orange-500' />
                      Falhou
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comissões do Sistema - Fee para Contabilidade */}
          <div className='bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 md:p-6 border border-purple-200 dark:border-purple-800'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <Calculator className='w-5 h-5 text-purple-600' />
              Comissões da Plataforma (Fee)
            </h2>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Spread</span>
                <p className='text-lg font-bold text-purple-600 mt-1'>
                  {formatCurrency(fees.spread)}
                </p>
                <p className='text-xs text-gray-500'>
                  {trade.spread_percentage?.toFixed(2) || '0.00'}% do valor
                </p>
              </div>
              <div className='p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Taxa de Rede</span>
                <p className='text-lg font-bold text-blue-600 mt-1'>
                  {formatCurrency(fees.networkFee)}
                </p>
                <p className='text-xs text-gray-500'>
                  {trade.network_fee_percentage?.toFixed(2) || '0.00'}% do valor
                </p>
              </div>
              <div className='p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg'>
                <span className='text-sm text-purple-600 dark:text-purple-400'>
                  Total de Comissões
                </span>
                <p className='text-xl font-bold text-purple-700 dark:text-purple-300 mt-1'>
                  {formatCurrency(fees.total)}
                </p>
                <p className='text-xs text-purple-600 dark:text-purple-400'>
                  Receita da plataforma
                </p>
              </div>
            </div>

            {/* Info sobre status de contabilização */}
            <div className='mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Building2 className='w-4 h-4 text-gray-500' />
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Status na Contabilidade
                  </span>
                </div>
                {trade.status?.toLowerCase() === 'completed' ? (
                  <span className='px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs'>
                    Pronto para enviar
                  </span>
                ) : (
                  <span className='px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs'>
                    Aguardando conclusão do trade
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Wallet & Payment */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <Wallet className='w-5 h-5 text-blue-600' />
              Carteira e Pagamento
            </h2>
            <div className='space-y-4'>
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>
                    Método de Pagamento
                  </span>
                  <CreditCard className='w-4 h-4 text-gray-400' />
                </div>
                <p className='text-gray-900 dark:text-white font-medium'>
                  {trade.payment_method || 'Não informado'}
                </p>
              </div>

              {trade.wallet_address && (
                <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      Endereço da Carteira
                    </span>
                    <button
                      onClick={() => copyToClipboard(trade.wallet_address!, 'Endereço')}
                      className='text-blue-600 hover:text-blue-700'
                      title='Copiar endereço'
                      aria-label='Copiar endereço da carteira'
                    >
                      <Copy className='w-4 h-4' />
                    </button>
                  </div>
                  <p className='text-gray-900 dark:text-white font-mono text-sm break-all'>
                    {trade.wallet_address}
                  </p>
                  {trade.network && (
                    <span className='inline-block mt-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs'>
                      Rede: {trade.network}
                    </span>
                  )}
                </div>
              )}

              {trade.tx_hash && (
                <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      Hash da Transação
                    </span>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => copyToClipboard(trade.tx_hash!, 'Hash')}
                        className='text-blue-600 hover:text-blue-700'
                        title='Copiar hash'
                        aria-label='Copiar hash da transação'
                      >
                        <Copy className='w-4 h-4' />
                      </button>
                      <a
                        href={`https://bscscan.com/tx/${trade.tx_hash}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:text-blue-700'
                        title='Ver no explorador'
                        aria-label='Ver transação no explorador de blocos'
                      >
                        <ExternalLink className='w-4 h-4' />
                      </a>
                    </div>
                  </div>
                  <p className='text-gray-900 dark:text-white font-mono text-sm break-all'>
                    {trade.tx_hash}
                  </p>
                </div>
              )}

              {trade.payment_proof_url && (
                <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      Comprovante de Pagamento
                    </span>
                    <FileText className='w-4 h-4 text-gray-400' />
                  </div>
                  <a
                    href={trade.payment_proof_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 hover:underline flex items-center gap-1'
                  >
                    <Link2 className='w-4 h-4' />
                    Ver Comprovante
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {trade.error_message && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 md:p-6'>
              <h2 className='text-lg font-semibold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2'>
                <AlertTriangle className='w-5 h-5' />
                Mensagem de Erro
              </h2>
              <p className='text-red-700 dark:text-red-300'>{trade.error_message}</p>
            </div>
          )}

          {/* Trade History */}
          {trade.history && trade.history.length > 0 && (
            <div className='bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                <History className='w-5 h-5 text-gray-600' />
                Histórico de Status
              </h2>
              <div className='space-y-4'>
                {trade.history.map((event, index) => (
                  <div
                    key={`${event.created_at}-${event.new_status}`}
                    className='flex items-start gap-4'
                  >
                    <div className='flex flex-col items-center'>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                      {index < trade.history.length - 1 && (
                        <div className='w-0.5 h-full min-h-[40px] bg-gray-200 dark:bg-gray-700' />
                      )}
                    </div>
                    <div className='flex-1 pb-4'>
                      <div className='flex flex-wrap items-center gap-2'>
                        {event.old_status && (
                          <>
                            <span
                              className={`px-2 py-1 rounded text-xs ${getStatusColor(event.old_status)}`}
                            >
                              {getStatusLabel(event.old_status)}
                            </span>
                            <span className='text-gray-400'>→</span>
                          </>
                        )}
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(event.new_status)}`}
                        >
                          {getStatusLabel(event.new_status)}
                        </span>
                      </div>
                      {event.reason && (
                        <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                          {event.reason}
                        </p>
                      )}
                      <p className='text-xs text-gray-500 mt-1'>{formatDate(event.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className='space-y-4 md:space-y-6'>
          {/* User Info */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <User className='w-5 h-5 text-blue-600' />
              Usuário
            </h3>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center'>
                <span className='text-lg font-bold text-blue-600 dark:text-blue-400'>
                  {trade.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className='font-medium text-gray-900 dark:text-white'>
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
              className='w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2'
            >
              <User className='w-4 h-4' />
              Ver Perfil do Usuário
            </button>
          </div>

          {/* Dates */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <Calendar className='w-5 h-5 text-purple-600' />
              Datas
            </h3>
            <div className='space-y-4'>
              <div>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Criado em</span>
                <p className='text-gray-900 dark:text-white font-medium'>
                  {formatDate(trade.created_at)}
                </p>
              </div>
              {trade.expires_at && (
                <div>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>Expira em</span>
                  <p className='text-gray-900 dark:text-white font-medium'>
                    {formatDate(trade.expires_at)}
                  </p>
                </div>
              )}
              {trade.payment_confirmed_at && (
                <div>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>
                    Pagamento Confirmado
                  </span>
                  <p className='text-green-600 dark:text-green-400 font-medium'>
                    {formatDate(trade.payment_confirmed_at)}
                  </p>
                </div>
              )}
              {trade.completed_at && (
                <div>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>Concluído em</span>
                  <p className='text-green-600 dark:text-green-400 font-medium'>
                    {formatDate(trade.completed_at)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Resumo Rápido
            </h3>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Tipo</span>
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
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Criptomoeda</span>
                <span className='text-gray-900 dark:text-white font-medium'>{trade.symbol}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Status</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(trade.status)}`}
                >
                  {getStatusLabel(trade.status)}
                </span>
              </div>
              {trade.network && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>Rede</span>
                  <span className='text-gray-900 dark:text-white font-medium'>{trade.network}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
