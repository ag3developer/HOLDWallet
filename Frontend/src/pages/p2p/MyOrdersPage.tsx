import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Edit,
  Pause,
  Play,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  Crown,
  Star,
  ChevronRight,
  Sparkles,
  Target,
  Award,
} from 'lucide-react'
import { useMyP2POrders, useCancelP2POrder, useToggleOrderStatus } from '@/hooks/useP2POrders'
import { toast } from 'react-hot-toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export const MyOrdersPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'active' | 'paused' | 'completed' | 'cancelled'>(
    'active'
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCoin, setSelectedCoin] = useState<string>('all')
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    orderId: string | null
  }>({
    isOpen: false,
    orderId: null,
  })

  const { data: ordersData, isLoading, error, refetch } = useMyP2POrders()
  const cancelOrderMutation = useCancelP2POrder()
  const toggleStatusMutation = useToggleOrderStatus()

  const cryptoOptions = [
    { value: 'all', label: 'Todas', icon: '✦' },
    { value: 'BTC', label: 'BTC', icon: '₿' },
    { value: 'ETH', label: 'ETH', icon: 'Ξ' },
    { value: 'USDT', label: 'USDT', icon: '₮' },
  ]

  const handleCancelOrder = async (orderId: string) => {
    setModalState({ isOpen: true, orderId })
  }

  const confirmCancelOrder = async () => {
    if (!modalState.orderId) return
    try {
      await cancelOrderMutation.mutateAsync(modalState.orderId)
      toast.success('Ordem cancelada com sucesso')
    } catch (error) {
      console.error('Error canceling order:', error)
    }
  }

  const handleToggleStatus = async (orderId: string, currentStatus: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync(orderId)
      toast.success(currentStatus ? 'Ordem pausada' : 'Ordem ativada')
    } catch (error) {
      console.error('Error toggling order status:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`
    return amount.toString()
  }

  // Count orders by status
  const orderCounts = {
    active: ordersData?.data?.filter((o: any) => o.status === 'active').length || 0,
    paused: ordersData?.data?.filter((o: any) => o.status === 'paused').length || 0,
    completed: ordersData?.data?.filter((o: any) => o.status === 'completed').length || 0,
    cancelled: ordersData?.data?.filter((o: any) => o.status === 'cancelled').length || 0,
  }

  const totalVolume =
    ordersData?.data?.reduce((acc: number, o: any) => acc + (o.price || 0) * (o.amount || 0), 0) ||
    0

  const filteredOrders =
    ordersData?.data?.filter((order: any) => {
      const matchesTab = order.status === activeTab
      const matchesCoin = selectedCoin === 'all' || order.coin === selectedCoin
      const matchesSearch =
        !searchTerm ||
        order.coin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.payment_methods?.some((pm: string) =>
          pm.toLowerCase().includes(searchTerm.toLowerCase())
        )
      return matchesTab && matchesCoin && matchesSearch
    }) || []

  return (
    <div className='space-y-4 pb-24'>
      {/* Premium Header */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900'>
        {/* Background Effects */}
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-3xl' />
          <div className='absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-3xl' />
        </div>

        <div className='relative p-4'>
          {/* Top Bar */}
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
                  <div className='w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center'>
                    <Crown className='w-3.5 h-3.5 text-white' />
                  </div>
                  <h1 className='text-lg font-bold text-white'>Minhas Ordens</h1>
                </div>
                <p className='text-xs text-gray-400 mt-0.5'>Gerencie seus anúncios P2P</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/p2p/create-order')}
              className='px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all'
            >
              <Plus className='w-3.5 h-3.5' />
              Nova Ordem
            </button>
          </div>

          {/* Stats Grid */}
          <div className='grid grid-cols-4 gap-2'>
            <div className='bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10'>
              <div className='flex items-center gap-1.5 mb-1'>
                <CheckCircle className='w-3 h-3 text-emerald-400' />
                <span className='text-[9px] text-gray-400 uppercase'>Ativas</span>
              </div>
              <p className='text-sm font-bold text-white'>{orderCounts.active}</p>
            </div>
            <div className='bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10'>
              <div className='flex items-center gap-1.5 mb-1'>
                <Pause className='w-3 h-3 text-amber-400' />
                <span className='text-[9px] text-gray-400 uppercase'>Pausadas</span>
              </div>
              <p className='text-sm font-bold text-white'>{orderCounts.paused}</p>
            </div>
            <div className='bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10'>
              <div className='flex items-center gap-1.5 mb-1'>
                <Award className='w-3 h-3 text-blue-400' />
                <span className='text-[9px] text-gray-400 uppercase'>Completas</span>
              </div>
              <p className='text-sm font-bold text-white'>{orderCounts.completed}</p>
            </div>
            <div className='bg-white/5 backdrop-blur-sm rounded-xl p-2.5 border border-white/10'>
              <div className='flex items-center gap-1.5 mb-1'>
                <TrendingUp className='w-3 h-3 text-purple-400' />
                <span className='text-[9px] text-gray-400 uppercase'>Volume</span>
              </div>
              <p className='text-sm font-bold text-white'>R$ {formatCompact(totalVolume)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Crypto Filter */}
      <div className='flex gap-2 overflow-x-auto pb-1 scrollbar-hide'>
        {cryptoOptions.map(crypto => (
          <button
            key={crypto.value}
            onClick={() => setSelectedCoin(crypto.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCoin === crypto.value
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {crypto.value === 'all' ? (
              <Sparkles className='w-3.5 h-3.5' />
            ) : (
              <span className='w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white'>
                {crypto.icon}
              </span>
            )}
            {crypto.label}
          </button>
        ))}
      </div>

      {/* Main Content Card */}
      <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
        {/* Status Tabs */}
        <div className='flex border-b border-gray-100 dark:border-gray-700'>
          {[
            { key: 'active', label: 'Ativas', icon: CheckCircle, color: 'emerald' },
            { key: 'paused', label: 'Pausadas', icon: Pause, color: 'amber' },
            { key: 'completed', label: 'Completas', icon: Award, color: 'blue' },
            { key: 'cancelled', label: 'Canceladas', icon: XCircle, color: 'red' },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            const count = orderCounts[tab.key as keyof typeof orderCounts]
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 px-2 text-[10px] font-semibold transition-all relative flex flex-col items-center gap-1 ${
                  isActive
                    ? `text-${tab.color}-600 dark:text-${tab.color}-400`
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <div className='flex items-center gap-1'>
                  <Icon className='w-3.5 h-3.5' />
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        isActive
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </div>
                {isActive && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${tab.color}-500`}
                    style={{
                      backgroundColor:
                        tab.color === 'emerald'
                          ? '#10b981'
                          : tab.color === 'amber'
                            ? '#f59e0b'
                            : tab.color === 'blue'
                              ? '#3b82f6'
                              : '#ef4444',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className='p-3 border-b border-gray-100 dark:border-gray-700'>
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <Search className='w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar ordem...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-9 pr-3 py-2.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all'
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className='p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-600 disabled:opacity-50 transition-all'
              aria-label='Atualizar'
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className='divide-y divide-gray-100 dark:divide-gray-700'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center py-16'>
              <div className='relative'>
                <div className='w-14 h-14 border-4 border-indigo-200 dark:border-indigo-900 rounded-full' />
                <div className='w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0' />
              </div>
              <p className='mt-4 text-sm text-gray-500 dark:text-gray-400'>Carregando ordens...</p>
            </div>
          ) : error ? (
            <div className='flex flex-col items-center justify-center py-16'>
              <div className='w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4'>
                <XCircle className='w-7 h-7 text-red-500' />
              </div>
              <p className='text-sm font-medium text-gray-900 dark:text-white mb-1'>
                Erro ao carregar
              </p>
              <p className='text-xs text-gray-500 mb-4'>Tente novamente</p>
              <button
                onClick={() => refetch()}
                className='px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg'
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16'>
              <div className='w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-4'>
                <Target className='w-8 h-8 text-indigo-500' />
              </div>
              <p className='text-sm font-semibold text-gray-900 dark:text-white mb-1'>
                Nenhuma ordem {activeTab === 'active' ? 'ativa' : activeTab}
              </p>
              <p className='text-xs text-gray-500 mb-4'>Crie sua primeira ordem P2P</p>
              <button
                onClick={() => navigate('/p2p/create-order')}
                className='px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/25'
              >
                <Plus className='w-3.5 h-3.5' />
                Criar Ordem
              </button>
            </div>
          ) : (
            filteredOrders.map((order: any) => (
              <PremiumOrderCard
                key={order.id}
                order={order}
                formatCurrency={formatCurrency}
                onView={() => navigate(`/p2p/order/${order.id}`)}
                onEdit={() => navigate(`/p2p/edit-order/${order.id}`)}
                onToggle={() => handleToggleStatus(order.id, order.status === 'active')}
                onCancel={() => handleCancelOrder(order.id)}
                isToggling={toggleStatusMutation.isPending}
                isCancelling={cancelOrderMutation.isPending}
              />
            ))
          )}
        </div>
      </div>

      {/* Become Pro CTA */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600'>
        <div className='absolute inset-0 opacity-20'>
          <div className='absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl' />
        </div>
        <div className='relative p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center'>
                <Star className='w-5 h-5 text-white' />
              </div>
              <div>
                <h3 className='text-sm font-bold text-white'>Torne-se Pro Trader</h3>
                <p className='text-purple-200 text-xs'>Taxas reduzidas + Badge exclusiva</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/p2p/trader-profile/edit')}
              className='p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all'
              aria-label='Configurar perfil'
            >
              <ChevronRight className='w-5 h-5 text-white' />
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, orderId: null })}
        onConfirm={confirmCancelOrder}
        title='Cancelar Ordem'
        message='Tem certeza que deseja cancelar esta ordem? Esta ação não pode ser desfeita.'
        confirmText='Sim, cancelar'
        cancelText='Não, manter'
        type='danger'
        icon={<Trash2 className='w-6 h-6' />}
        isLoading={cancelOrderMutation.isPending}
      />
    </div>
  )
}

// ============================================
// PREMIUM ORDER CARD COMPONENT
// ============================================
interface PremiumOrderCardProps {
  order: any
  formatCurrency: (value: number) => string
  onView: () => void
  onEdit: () => void
  onToggle: () => void
  onCancel: () => void
  isToggling: boolean
  isCancelling: boolean
}

const PremiumOrderCard: React.FC<PremiumOrderCardProps> = ({
  order,
  formatCurrency,
  onView,
  onEdit,
  onToggle,
  onCancel,
  isToggling,
  isCancelling,
}) => {
  const isSell = order.type === 'sell' || order.order_type === 'sell'
  const isActive = order.status === 'active'
  const isPaused = order.status === 'paused'

  const getStatusConfig = () => {
    switch (order.status) {
      case 'active':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          icon: CheckCircle,
          label: 'Ativa',
        }
      case 'paused':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-700 dark:text-amber-400',
          icon: Pause,
          label: 'Pausada',
        }
      case 'completed':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-400',
          icon: Award,
          label: 'Completa',
        }
      case 'cancelled':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-400',
          icon: XCircle,
          label: 'Cancelada',
        }
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-600 dark:text-gray-400',
          icon: Clock,
          label: order.status,
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  return (
    <div className='p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all'>
      {/* Top Row: Type + Status + Actions */}
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          {/* Type Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
              isSell
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}
          >
            {isSell ? <TrendingUp className='w-3 h-3' /> : <TrendingDown className='w-3 h-3' />}
            {isSell ? 'Venda' : 'Compra'}
          </div>
          {/* Crypto */}
          <span className='px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-bold'>
            {order.coin || order.cryptocurrency}
          </span>
          {/* Status */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.text}`}
          >
            <StatusIcon className='w-3 h-3' />
            {statusConfig.label}
          </div>
        </div>

        {/* Quick Actions */}
        <div className='flex items-center gap-1'>
          <button
            onClick={onView}
            className='p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all'
            title='Ver detalhes'
          >
            <Eye className='w-4 h-4' />
          </button>
          {isActive && (
            <>
              <button
                onClick={onEdit}
                className='p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all'
                title='Editar'
              >
                <Edit className='w-4 h-4' />
              </button>
              <button
                onClick={onToggle}
                disabled={isToggling}
                className='p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-all disabled:opacity-50'
                title='Pausar'
              >
                <Pause className='w-4 h-4' />
              </button>
            </>
          )}
          {isPaused && (
            <button
              onClick={onToggle}
              disabled={isToggling}
              className='p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all disabled:opacity-50'
              title='Reativar'
            >
              <Play className='w-4 h-4' />
            </button>
          )}
          {(isActive || isPaused) && (
            <button
              onClick={onCancel}
              disabled={isCancelling}
              className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50'
              title='Cancelar'
            >
              <Trash2 className='w-4 h-4' />
            </button>
          )}
        </div>
      </div>

      {/* Details Row */}
      <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl'>
        <div className='flex-1'>
          <p className='text-[10px] text-gray-400 uppercase font-medium'>Preço</p>
          <p className='text-sm font-bold text-gray-900 dark:text-white'>
            {formatCurrency(Number(order.price) || 0)}
          </p>
        </div>
        <div className='h-8 w-px bg-gray-200 dark:bg-gray-600' />
        <div className='flex-1 text-center'>
          <p className='text-[10px] text-gray-400 uppercase font-medium'>Quantidade</p>
          <p className='text-sm font-bold text-gray-900 dark:text-white'>
            {Number(order.total_amount || order.amount) || 0} {order.coin || order.cryptocurrency}
          </p>
        </div>
        <div className='h-8 w-px bg-gray-200 dark:bg-gray-600' />
        <div className='flex-1 text-right'>
          <p className='text-[10px] text-gray-400 uppercase font-medium'>Trades</p>
          <p className='text-sm font-bold text-indigo-600 dark:text-indigo-400'>
            {order.completed_trades || order.completedTrades || 0}
          </p>
        </div>
      </div>

      {/* Bottom Row: Limits + Methods */}
      <div className='flex items-center justify-between mt-3'>
        <div className='flex items-center gap-2 text-xs text-gray-500'>
          <Clock className='w-3 h-3' />
          <span>
            {formatCurrency(Number(order.min_order_limit || order.minAmount) || 0)} -{' '}
            {formatCurrency(Number(order.max_order_limit || order.maxAmount) || 0)}
          </span>
        </div>
        <div className='flex items-center gap-1'>
          {order.payment_methods?.slice(0, 2).map((method: string, index: number) => (
            <span
              key={index}
              className='px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-medium'
            >
              {method}
            </span>
          ))}
          {order.payment_methods?.length > 2 && (
            <span className='text-[10px] text-gray-400'>+{order.payment_methods.length - 2}</span>
          )}
        </div>
      </div>
    </div>
  )
}
