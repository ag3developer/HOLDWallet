/**
 * BillPaymentHistoryPage - Histórico de Pagamentos de Boletos
 * ============================================================
 *
 * Lista todos os pagamentos de boletos do usuário.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Receipt,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Filter,
  Calendar,
  Building2,
  CreditCard,
  AlertCircle,
  FileText,
  ExternalLink,
  X,
} from 'lucide-react'
import billPaymentService, {
  BillPayment,
  BillPaymentStatus,
  STATUS_CONFIG,
} from '@/services/billPayment'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount)
}

const formatCrypto = (amount: number | string, symbol: string) => {
  const numAmount = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  let decimals: number
  if (['BTC'].includes(symbol)) {
    decimals = 8
  } else if (['ETH', 'BNB'].includes(symbol)) {
    decimals = 6
  } else {
    decimals = 2
  }
  return `${numAmount.toFixed(decimals)} ${symbol}`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatShortDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

// Ícone baseado no status
const StatusIcon = ({ status }: { status: BillPaymentStatus }) => {
  const config = STATUS_CONFIG[status]
  switch (config.icon) {
    case 'CheckCircle':
      return <CheckCircle className='w-5 h-5' />
    case 'XCircle':
      return <XCircle className='w-5 h-5' />
    case 'RefreshCw':
      return <RefreshCw className='w-5 h-5' />
    case 'Loader':
      return <Loader2 className='w-5 h-5 animate-spin' />
    case 'CreditCard':
      return <CreditCard className='w-5 h-5' />
    case 'Check':
      return <CheckCircle className='w-5 h-5' />
    default:
      return <Clock className='w-5 h-5' />
  }
}

export function BillPaymentHistoryPage() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState<BillPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showFilter, setShowFilter] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<BillPayment | null>(null)
  const perPage = 20

  // Carregar pagamentos
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await billPaymentService.getPayments(
          page,
          perPage,
          statusFilter || undefined
        )
        setPayments(result.payments)
        setTotal(result.total)
      } catch (err) {
        setError('Erro ao carregar histórico')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [page, statusFilter])

  // Filtros disponíveis
  const filterOptions = [
    { value: '', label: 'Todos' },
    { value: 'PENDING', label: 'Pendentes' },
    { value: 'CRYPTO_DEBITED', label: 'Crypto Debitada' },
    { value: 'PROCESSING,PAYING', label: 'Em Processamento' },
    { value: 'PAID', label: 'Pagos' },
    { value: 'FAILED,REFUNDED', label: 'Falha/Reembolso' },
    { value: 'CANCELLED,EXPIRED', label: 'Cancelados' },
  ]

  // Resumo dos status
  const getStatusCounts = () => {
    const counts: Partial<Record<BillPaymentStatus, number>> = {}
    payments.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1
    })
    return counts
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 pb-20'>
      {/* Header */}
      <div className='bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-700 dark:to-purple-700'>
        <div className='max-w-4xl mx-auto px-4 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate('/bill-payment')}
                className='p-2 hover:bg-white/10 rounded-lg transition-colors'
                title='Voltar'
              >
                <ArrowLeft className='w-5 h-5 text-white' />
              </button>
              <div>
                <h1 className='text-xl font-bold text-white flex items-center gap-2'>
                  <Receipt className='w-6 h-6' />
                  Histórico de Boletos
                </h1>
                <p className='text-violet-100 text-sm mt-1'>
                  {total} pagamento{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm transition-colors ${
                showFilter || statusFilter ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <Filter className='w-4 h-4' />
              <span className='hidden sm:inline'>Filtrar</span>
              {statusFilter && <span className='w-2 h-2 bg-amber-400 rounded-full' />}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className='max-w-4xl mx-auto px-4 -mt-2'>
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 mb-4'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='font-medium text-gray-900 dark:text-white'>Filtrar por Status</h3>
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter('')}
                  className='text-sm text-violet-600 dark:text-violet-400 hover:underline'
                >
                  Limpar filtro
                </button>
              )}
            </div>
            <div className='flex flex-wrap gap-2'>
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setStatusFilter(option.value)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === option.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className='max-w-4xl mx-auto px-4 mt-4'>
        {/* Error */}
        {error && (
          <div className='mb-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
            <p className='text-red-700 dark:text-red-400 text-sm'>{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 text-violet-600 animate-spin' />
          </div>
        )}

        {/* Empty State */}
        {!loading && payments.length === 0 && (
          <div className='text-center py-12'>
            <div className='w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4'>
              <Receipt className='w-8 h-8 text-gray-400' />
            </div>
            <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
              Nenhum pagamento encontrado
            </h3>
            <p className='text-gray-500 dark:text-gray-400 mt-2'>
              {statusFilter
                ? 'Tente alterar os filtros de busca'
                : 'Comece pagando seu primeiro boleto com crypto'}
            </p>
            <button
              onClick={() => navigate('/bill-payment')}
              className='mt-4 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors'
            >
              Pagar Boleto
            </button>
          </div>
        )}

        {/* Payments List */}
        {!loading && payments.length > 0 && (
          <div className='space-y-3'>
            {payments.map(payment => {
              const statusConfig = STATUS_CONFIG[payment.status]

              return (
                <button
                  key={payment.id}
                  onClick={() => setSelectedPayment(payment)}
                  className='w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-violet-400 dark:hover:border-violet-500 transition-all text-left'
                >
                  <div className='flex items-start justify-between'>
                    <div className='flex items-start gap-3'>
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusConfig.bgColor}`}
                      >
                        <span className={statusConfig.color}>
                          <StatusIcon status={payment.status} />
                        </span>
                      </div>
                      <div>
                        <p className='font-medium text-gray-900 dark:text-white'>
                          {formatCurrency(payment.bill_amount_brl)}
                        </p>
                        <p className='text-sm text-gray-500 dark:text-gray-400 mt-0.5'>
                          {payment.bank_name || payment.beneficiary_name || 'Boleto'}
                        </p>
                        <div className='flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500'>
                          <span className='flex items-center gap-1'>
                            <Calendar className='w-3 h-3' />
                            {formatShortDate(payment.created_at)}
                          </span>
                          <span className='flex items-center gap-1'>
                            <FileText className='w-3 h-3' />
                            {payment.payment_number}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className='text-right'>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                      <p className='text-sm font-medium text-violet-600 dark:text-violet-400 mt-2'>
                        {formatCrypto(payment.crypto_amount, payment.crypto_currency)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > perPage && (
          <div className='flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              Anterior
            </button>
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              Página {page} de {Math.ceil(total / perPage)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / perPage)}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto'>
            {/* Modal Header */}
            <div className='sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                Detalhes do Pagamento
              </h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                title='Fechar'
              >
                <X className='w-5 h-5 text-gray-500' />
              </button>
            </div>

            <div className='p-6 space-y-6'>
              {/* Status Header */}
              <div className={`p-4 rounded-xl ${STATUS_CONFIG[selectedPayment.status].bgColor}`}>
                <div className='flex items-center gap-3'>
                  <span className={STATUS_CONFIG[selectedPayment.status].color}>
                    <StatusIcon status={selectedPayment.status} />
                  </span>
                  <div>
                    <p className={`font-medium ${STATUS_CONFIG[selectedPayment.status].color}`}>
                      {STATUS_CONFIG[selectedPayment.status].label}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      {selectedPayment.status_message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              {selectedPayment.timeline && selectedPayment.timeline.length > 0 && (
                <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4'>
                  <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                    <Clock className='w-4 h-4' />
                    Acompanhamento
                  </h4>
                  <div className='space-y-0'>
                    {selectedPayment.timeline.map((step, index) => (
                      <div key={step.step} className='relative'>
                        {/* Linha conectora */}
                        {index < selectedPayment.timeline!.length - 1 && (
                          <div
                            className={`absolute left-[11px] top-6 w-0.5 h-full ${
                              step.completed
                                ? step.failed
                                  ? 'bg-red-300 dark:bg-red-600'
                                  : 'bg-green-300 dark:bg-green-600'
                                : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                          />
                        )}

                        <div className='flex items-start gap-3 pb-4'>
                          {/* Indicador */}
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              step.current
                                ? step.failed
                                  ? 'bg-red-500 text-white'
                                  : 'bg-violet-500 text-white ring-4 ring-violet-200 dark:ring-violet-900'
                                : step.completed
                                  ? step.failed
                                    ? 'bg-red-500 text-white'
                                    : 'bg-green-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                            }`}
                          >
                            {step.completed ? (
                              step.failed ? (
                                <XCircle className='w-4 h-4' />
                              ) : (
                                <CheckCircle className='w-4 h-4' />
                              )
                            ) : step.current ? (
                              <Loader2 className='w-4 h-4 animate-spin' />
                            ) : (
                              <div className='w-2 h-2 rounded-full bg-current' />
                            )}
                          </div>

                          {/* Conteúdo */}
                          <div className='flex-1 min-w-0'>
                            <p
                              className={`text-sm font-medium ${
                                step.current
                                  ? step.failed
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-violet-600 dark:text-violet-400'
                                  : step.completed
                                    ? 'text-gray-900 dark:text-white'
                                    : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {step.title}
                            </p>
                            {step.description && (
                              <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                                {step.description}
                              </p>
                            )}
                            {step.timestamp && (
                              <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                                {formatDate(step.timestamp)}
                              </p>
                            )}

                            {/* Hash da Transação Blockchain */}
                            {step.tx_hash && (
                              <div className='mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600'>
                                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                  🔗 Hash da Transação:
                                </p>
                                <div className='flex items-center gap-2'>
                                  <code className='text-xs font-mono text-gray-700 dark:text-gray-300 truncate flex-1'>
                                    {step.tx_hash.slice(0, 10)}...{step.tx_hash.slice(-8)}
                                  </code>
                                  {step.explorer_url && (
                                    <a
                                      href={step.explorer_url}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className='p-1.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg hover:bg-violet-200 dark:hover:bg-violet-500/30 transition-colors'
                                      title='Ver no Explorer'
                                    >
                                      <ExternalLink className='w-3 h-3' />
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Details */}
              <div className='space-y-3'>
                <h4 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                  <FileText className='w-4 h-4' />
                  Informações
                </h4>
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>Número</span>
                  <span className='text-sm font-mono text-gray-900 dark:text-white'>
                    {selectedPayment.payment_number}
                  </span>
                </div>
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>Valor do Boleto</span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {formatCurrency(selectedPayment.bill_amount_brl)}
                  </span>
                </div>
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>
                    Total (com taxas)
                  </span>
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {formatCurrency(selectedPayment.total_amount_brl)}
                  </span>
                </div>
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>Crypto Debitada</span>
                  <span className='font-medium text-violet-600 dark:text-violet-400'>
                    {formatCrypto(selectedPayment.crypto_amount, selectedPayment.crypto_currency)}
                    {selectedPayment.crypto_network && (
                      <span className='text-xs text-gray-400 ml-1'>
                        ({selectedPayment.crypto_network})
                      </span>
                    )}
                  </span>
                </div>
                <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                  <span className='text-sm text-gray-500 dark:text-gray-400'>Vencimento</span>
                  <span className='text-sm text-gray-900 dark:text-white'>
                    {formatShortDate(selectedPayment.due_date)}
                  </span>
                </div>
                {selectedPayment.bank_name && (
                  <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>Banco</span>
                    <span className='text-sm text-gray-900 dark:text-white flex items-center gap-1'>
                      <Building2 className='w-4 h-4' />
                      {selectedPayment.bank_name}
                    </span>
                  </div>
                )}
                {selectedPayment.beneficiary_name && (
                  <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>Beneficiário</span>
                    <span className='text-sm text-gray-900 dark:text-white'>
                      {selectedPayment.beneficiary_name}
                    </span>
                  </div>
                )}
                {selectedPayment.bank_authentication && (
                  <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-700'>
                    <span className='text-sm text-gray-500 dark:text-gray-400'>
                      Autenticação Bancária
                    </span>
                    <span className='text-sm font-mono text-green-600 dark:text-green-400'>
                      {selectedPayment.bank_authentication}
                    </span>
                  </div>
                )}
              </div>

              {/* Blockchain Transaction Hash - Standalone */}
              {selectedPayment.crypto_tx_hash && (
                <div className='bg-violet-50 dark:bg-violet-500/10 rounded-xl p-4'>
                  <h4 className='text-sm font-semibold text-violet-700 dark:text-violet-300 mb-2'>
                    🔗 Transação Blockchain
                  </h4>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <code className='text-xs font-mono text-violet-600 dark:text-violet-400 truncate max-w-[200px]'>
                        {selectedPayment.crypto_tx_hash}
                      </code>
                      {selectedPayment.crypto_explorer_url && (
                        <a
                          href={selectedPayment.crypto_explorer_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors'
                        >
                          <ExternalLink className='w-3 h-3' />
                          Ver no Explorer
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Refund Transaction */}
              {selectedPayment.refund_tx_id && (
                <div className='bg-teal-50 dark:bg-teal-500/10 rounded-xl p-4'>
                  <h4 className='text-sm font-semibold text-teal-700 dark:text-teal-300 mb-2'>
                    ↩️ Reembolso Blockchain
                  </h4>
                  <div className='flex items-center justify-between'>
                    <code className='text-xs font-mono text-teal-600 dark:text-teal-400 truncate max-w-[200px]'>
                      {selectedPayment.refund_tx_id}
                    </code>
                    {selectedPayment.refund_explorer_url && (
                      <a
                        href={selectedPayment.refund_explorer_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors'
                      >
                        <ExternalLink className='w-3 h-3' />
                        Ver no Explorer
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Receipt Link */}
              {selectedPayment.payment_receipt_url && (
                <a
                  href={selectedPayment.payment_receipt_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center justify-center gap-2 w-full py-3 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors font-medium'
                >
                  <ExternalLink className='w-4 h-4' />
                  Ver Comprovante de Pagamento
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BillPaymentHistoryPage
