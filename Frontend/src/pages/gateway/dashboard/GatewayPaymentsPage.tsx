/**
 * WolkPay Gateway - Lista de Pagamentos
 * Listagem e gestão de todos os pagamentos recebidos
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  ArrowUpDown,
  Eye,
  Copy,
  X,
  Wallet,
  QrCode,
} from 'lucide-react'
import {
  getPayments,
  getPaymentById,
  cancelPayment,
  type PaymentListItem,
  type GatewayPaymentStatus,
  type GatewayPaymentMethod,
  getStatusBadgeColor,
  getStatusLabel,
} from '../../../services/gatewayService'

export default function GatewayPaymentsPage() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState<PaymentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const perPage = 10

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<GatewayPaymentStatus | ''>('')
  const [methodFilter, setMethodFilter] = useState<GatewayPaymentMethod | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Detail modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentListItem | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadPayments()
  }, [currentPage, statusFilter, methodFilter, dateFrom, dateTo])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const response = await getPayments({
        page: currentPage,
        per_page: perPage,
        status: statusFilter || undefined,
        payment_method: methodFilter || undefined,
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined,
        search: searchQuery || undefined,
      })

      setPayments(response.payments || [])
      setTotalPages(response.total_pages || 1)
      setTotalItems(response.total || 0)
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    loadPayments()
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setMethodFilter('')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  const handleViewPayment = async (payment: PaymentListItem) => {
    setShowDetail(true)
    setDetailLoading(true)
    try {
      const details = await getPaymentById(payment.id)
      setSelectedPayment(details)
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error)
      setSelectedPayment(payment)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCancelPayment = async (paymentId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este pagamento?')) return

    try {
      await cancelPayment(paymentId)
      loadPayments()
      setShowDetail(false)
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error)
      alert('Não foi possível cancelar o pagamento')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status: GatewayPaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
      case 'CONFIRMED':
        return <CheckCircle className='w-4 h-4 text-emerald-500' />
      case 'PENDING':
      case 'PROCESSING':
        return <Clock className='w-4 h-4 text-amber-500' />
      case 'FAILED':
      case 'CANCELLED':
      case 'EXPIRED':
        return <XCircle className='w-4 h-4 text-red-500' />
      default:
        return <AlertCircle className='w-4 h-4 text-slate-400' />
    }
  }

  const getMethodIcon = (method?: GatewayPaymentMethod) => {
    switch (method) {
      case 'PIX':
        return <QrCode className='w-4 h-4' />
      case 'CRYPTO':
        return <Wallet className='w-4 h-4' />
      default:
        return <CreditCard className='w-4 h-4' />
    }
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      {/* Header */}
      <header className='bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-center gap-4'>
              <Link
                to='/gateway/dashboard'
                className='p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors'
              >
                <ChevronLeft className='w-5 h-5' />
              </Link>
              <div>
                <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>Pagamentos</h1>
                <p className='text-slate-600 dark:text-slate-400 mt-1'>
                  {totalItems} pagamentos no total
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                  showFilters
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <Filter className='w-4 h-4' />
                Filtros
              </button>
              <button
                onClick={loadPayments}
                disabled={loading}
                className='p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50'
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Search & Filters */}
        <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6'>
          {/* Search Bar */}
          <div className='p-4 border-b border-slate-200 dark:border-slate-700'>
            <div className='flex gap-3'>
              <div className='flex-1 relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                <input
                  type='text'
                  placeholder='Buscar por código, email ou ID...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSearch()}
                  className='w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                />
              </div>
              <button
                onClick={handleSearch}
                className='px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors'
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className='p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700'>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as GatewayPaymentStatus | '')}
                    className='w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  >
                    <option value=''>Todos</option>
                    <option value='PENDING'>Pendente</option>
                    <option value='PROCESSING'>Processando</option>
                    <option value='CONFIRMED'>Confirmado</option>
                    <option value='COMPLETED'>Concluído</option>
                    <option value='FAILED'>Falhou</option>
                    <option value='CANCELLED'>Cancelado</option>
                    <option value='EXPIRED'>Expirado</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                    Método
                  </label>
                  <select
                    value={methodFilter}
                    onChange={e => setMethodFilter(e.target.value as GatewayPaymentMethod | '')}
                    className='w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  >
                    <option value=''>Todos</option>
                    <option value='PIX'>PIX</option>
                    <option value='CRYPTO'>Crypto</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                    Data Início
                  </label>
                  <div className='relative'>
                    <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                    <input
                      type='date'
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className='w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                    Data Fim
                  </label>
                  <div className='relative'>
                    <Calendar className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                    <input
                      type='date'
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className='w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    />
                  </div>
                </div>
              </div>

              <div className='mt-4 flex justify-end'>
                <button
                  onClick={handleClearFilters}
                  className='text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors'
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Payments Table */}
        <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden'>
          {loading ? (
            <div className='p-12 text-center'>
              <RefreshCw className='w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3' />
              <p className='text-slate-500 dark:text-slate-400'>Carregando pagamentos...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className='p-12 text-center'>
              <CreditCard className='w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-slate-900 dark:text-white mb-2'>
                Nenhum pagamento encontrado
              </h3>
              <p className='text-slate-500 dark:text-slate-400'>
                Os pagamentos aparecerão aqui quando forem criados
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className='hidden lg:block overflow-x-auto'>
                <table className='w-full'>
                  <thead className='bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700'>
                    <tr>
                      <th className='px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                        Código
                      </th>
                      <th className='px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                        Valor
                      </th>
                      <th className='px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                        Método
                      </th>
                      <th className='px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                        Status
                      </th>
                      <th className='px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                        Data
                      </th>
                      <th className='px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100 dark:divide-slate-700'>
                    {payments.map(payment => (
                      <tr
                        key={payment.id}
                        className='hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors'
                      >
                        <td className='px-6 py-4'>
                          <div className='flex items-center gap-3'>
                            {getStatusIcon(payment.status)}
                            <div>
                              <p className='font-mono text-sm font-medium text-slate-900 dark:text-white'>
                                {payment.payment_code}
                              </p>
                              {payment.external_id && (
                                <p className='text-xs text-slate-500 dark:text-slate-400'>
                                  Ref: {payment.external_id}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <p className='font-semibold text-slate-900 dark:text-white'>
                            {formatCurrency(payment.amount)}
                          </p>
                        </td>
                        <td className='px-6 py-4'>
                          <div className='flex items-center gap-2'>
                            {getMethodIcon(payment.payment_method)}
                            <span className='text-sm text-slate-600 dark:text-slate-300'>
                              {payment.payment_method || '-'}
                            </span>
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(payment.status)}`}
                          >
                            {getStatusLabel(payment.status)}
                          </span>
                        </td>
                        <td className='px-6 py-4'>
                          <p className='text-sm text-slate-600 dark:text-slate-300'>
                            {formatDate(payment.created_at)}
                          </p>
                        </td>
                        <td className='px-6 py-4 text-right'>
                          <button
                            onClick={() => handleViewPayment(payment)}
                            className='p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors'
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className='lg:hidden divide-y divide-slate-100 dark:divide-slate-700'>
                {payments.map(payment => (
                  <div
                    key={payment.id}
                    className='p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors'
                    onClick={() => handleViewPayment(payment)}
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2'>
                        {getStatusIcon(payment.status)}
                        <span className='font-mono text-sm font-medium text-slate-900 dark:text-white'>
                          {payment.payment_code}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(payment.status)}`}
                      >
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='font-semibold text-slate-900 dark:text-white'>
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className='text-sm text-slate-500 dark:text-slate-400'>
                        {formatDate(payment.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className='px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between'>
                <p className='text-sm text-slate-600 dark:text-slate-400'>
                  Mostrando {(currentPage - 1) * perPage + 1} a{' '}
                  {Math.min(currentPage * perPage, totalItems)} de {totalItems}
                </p>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className='p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronLeft className='w-4 h-4' />
                  </button>
                  <span className='px-3 py-1 text-sm text-slate-600 dark:text-slate-300'>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className='p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    <ChevronRight className='w-4 h-4' />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Payment Detail Modal */}
      {showDetail && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='fixed inset-0 bg-black/50 backdrop-blur-sm'
            onClick={() => setShowDetail(false)}
          />
          <div className='relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto'>
            <div className='sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-slate-900 dark:text-white'>
                Detalhes do Pagamento
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                className='p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {detailLoading ? (
              <div className='p-8 text-center'>
                <RefreshCw className='w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3' />
                <p className='text-slate-500'>Carregando...</p>
              </div>
            ) : (
              selectedPayment && (
                <div className='p-6 space-y-4'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-slate-500 dark:text-slate-400'>Código</span>
                    <div className='flex items-center gap-2'>
                      <span className='font-mono text-sm font-medium text-slate-900 dark:text-white'>
                        {selectedPayment.payment_code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedPayment.payment_code)}
                        className='p-1 rounded text-slate-400 hover:text-slate-600'
                      >
                        <Copy className='w-4 h-4' />
                      </button>
                    </div>
                  </div>

                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-slate-500 dark:text-slate-400'>Valor</span>
                    <span className='text-lg font-bold text-slate-900 dark:text-white'>
                      {formatCurrency(selectedPayment.amount)}
                    </span>
                  </div>

                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-slate-500 dark:text-slate-400'>Status</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(selectedPayment.status)}`}
                    >
                      {getStatusLabel(selectedPayment.status)}
                    </span>
                  </div>

                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-slate-500 dark:text-slate-400'>Método</span>
                    <div className='flex items-center gap-2'>
                      {getMethodIcon(selectedPayment.payment_method)}
                      <span className='text-sm text-slate-900 dark:text-white'>
                        {selectedPayment.payment_method || 'Não selecionado'}
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-slate-500 dark:text-slate-400'>Criado em</span>
                    <span className='text-sm text-slate-900 dark:text-white'>
                      {formatDate(selectedPayment.created_at)}
                    </span>
                  </div>

                  {selectedPayment.external_id && (
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-slate-500 dark:text-slate-400'>ID Externo</span>
                      <span className='text-sm text-slate-900 dark:text-white'>
                        {selectedPayment.external_id}
                      </span>
                    </div>
                  )}

                  {selectedPayment.payer_email && (
                    <div className='flex items-center justify-between'>
                      <span className='text-sm text-slate-500 dark:text-slate-400'>Email</span>
                      <span className='text-sm text-slate-900 dark:text-white'>
                        {selectedPayment.payer_email}
                      </span>
                    </div>
                  )}

                  {selectedPayment.status === 'PENDING' && (
                    <div className='pt-4 border-t border-slate-200 dark:border-slate-700'>
                      <button
                        onClick={() => handleCancelPayment(selectedPayment.id)}
                        className='w-full py-3 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2'
                      >
                        <XCircle className='w-5 h-5' />
                        Cancelar Pagamento
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
