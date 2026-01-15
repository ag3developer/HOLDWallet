/**
 * 🔒 HOLD Wallet - Admin Locked Balances Page
 * ============================================
 *
 * Página de gestão de saldos bloqueados.
 * Permite visualizar, analisar e desbloquear saldos.
 */

import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  Lock,
  Unlock,
  Search,
  RefreshCw,
  AlertTriangle,
  User,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  Coins,
  ArrowRight,
  Shield,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'

// Interfaces
interface PossibleSource {
  type: string
  id: string
  reference: string
  status: string
  amount: number
  created_at: string | null
  description: string
}

interface LockedBalanceItem {
  user_id: string
  username: string
  email: string
  cryptocurrency: string
  available_balance: number
  locked_balance: number
  total_balance: number
  last_updated_reason: string | null
  updated_at: string | null
  possible_sources: PossibleSource[]
}

interface LockedBalancesResponse {
  total_users_with_locked: number
  total_locked_value: Record<string, number>
  locked_balances: LockedBalanceItem[]
}

// API Functions
const fetchLockedBalances = async (params: {
  minLocked?: number
  cryptocurrency?: string
  search?: string
}): Promise<LockedBalancesResponse> => {
  const queryParams = new URLSearchParams()
  if (params.minLocked) queryParams.set('min_locked', params.minLocked.toString())
  if (params.cryptocurrency) queryParams.set('cryptocurrency', params.cryptocurrency)
  if (params.search) queryParams.set('search', params.search)

  const { data } = await apiClient.get(`/admin/locked-balances?${queryParams}`)
  return data
}

const unlockBalance = async (payload: {
  user_id: string
  cryptocurrency: string
  amount?: number
  reason: string
}) => {
  const { data } = await apiClient.post('/admin/locked-balances/unlock', payload)
  return data
}

const unlockAllOrphans = async (dryRun: boolean) => {
  const { data } = await apiClient.post(
    `/admin/locked-balances/unlock-all-orphans?dry_run=${dryRun}`
  )
  return data
}

// Component
export default function AdminLockedBalancesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [cryptoFilter, setCryptoFilter] = useState('')
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({})
  const [unlockModalOpen, setUnlockModalOpen] = useState(false)
  const [selectedBalance, setSelectedBalance] = useState<LockedBalanceItem | null>(null)
  const [unlockReason, setUnlockReason] = useState('')
  const [unlockAmount, setUnlockAmount] = useState<string>('')

  // Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'locked-balances', search, cryptoFilter],
    queryFn: () =>
      fetchLockedBalances({
        minLocked: 0.01,
        cryptocurrency: cryptoFilter || undefined,
        search: search || undefined,
      }),
    staleTime: 30000,
  })

  // Mutations
  const unlockMutation = useMutation({
    mutationFn: unlockBalance,
    onSuccess: result => {
      toast.success(result.message)
      queryClient.invalidateQueries({ queryKey: ['admin', 'locked-balances'] })
      setUnlockModalOpen(false)
      setSelectedBalance(null)
      setUnlockReason('')
      setUnlockAmount('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro ao desbloquear saldo')
    },
  })

  const unlockOrphansMutation = useMutation({
    mutationFn: (dryRun: boolean) => unlockAllOrphans(dryRun),
    onSuccess: result => {
      if (result.dry_run) {
        toast.success(`Simulação: ${result.affected_users} saldos seriam desbloqueados`)
      } else {
        toast.success(result.message)
        queryClient.invalidateQueries({ queryKey: ['admin', 'locked-balances'] })
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erro na operação')
    },
  })

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }))
  }

  const openUnlockModal = (balance: LockedBalanceItem) => {
    setSelectedBalance(balance)
    setUnlockAmount(balance.locked_balance.toString())
    setUnlockModalOpen(true)
  }

  const handleUnlock = () => {
    if (!selectedBalance || !unlockReason.trim()) {
      toast.error('Informe o motivo do desbloqueio')
      return
    }

    const amount = parseFloat(unlockAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido')
      return
    }

    unlockMutation.mutate({
      user_id: selectedBalance.user_id,
      cryptocurrency: selectedBalance.cryptocurrency,
      amount: amount,
      reason: unlockReason,
    })
  }

  const getSourceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bill_payment: '📄 Pagamento de Boleto',
      p2p_trade: '🔄 Trade P2P',
      p2p_order: '📋 Ordem P2P',
    }
    return labels[type] || type
  }

  const getSourceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      bill_payment: 'bg-blue-500/20 text-blue-400',
      p2p_trade: 'bg-purple-500/20 text-purple-400',
      p2p_order: 'bg-green-500/20 text-green-400',
    }
    return colors[type] || 'bg-gray-500/20 text-gray-400'
  }

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
            <Lock className='h-7 w-7 text-amber-500' />
            Saldos Bloqueados
          </h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1'>
            Gerencie saldos bloqueados e identifique órfãos
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className='flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-lg transition-colors'
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => unlockOrphansMutation.mutate(true)}
            disabled={unlockOrphansMutation.isPending}
            className='flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors'
          >
            <AlertTriangle className='h-4 w-4' />
            Simular Desbloqueio Órfãos
          </button>
          <button
            onClick={() => {
              if (confirm('⚠️ Isso vai desbloquear TODOS os saldos órfãos. Continuar?')) {
                unlockOrphansMutation.mutate(false)
              }
            }}
            disabled={unlockOrphansMutation.isPending}
            className='flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors'
          >
            <Unlock className='h-4 w-4' />
            Desbloquear Órfãos
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-gray-600 dark:text-gray-400 text-sm'>Usuários Afetados</span>
              <User className='h-5 w-5 text-blue-500' />
            </div>
            <p className='text-2xl font-bold text-gray-900 dark:text-white mt-2'>
              {data.total_users_with_locked}
            </p>
          </div>

          {Object.entries(data.total_locked_value).map(([crypto, amount]) => (
            <div
              key={crypto}
              className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4'
            >
              <div className='flex items-center justify-between'>
                <span className='text-gray-600 dark:text-gray-400 text-sm'>Total {crypto}</span>
                <Lock className='h-5 w-5 text-amber-500' />
              </div>
              <p className='text-2xl font-bold text-amber-500 mt-2'>{amount.toFixed(4)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className='flex flex-col md:flex-row gap-4'>
        <div className='flex-1 relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400' />
          <input
            type='text'
            placeholder='Buscar por usuário ou email...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500'
          />
        </div>
        <select
          value={cryptoFilter}
          onChange={e => setCryptoFilter(e.target.value)}
          className='px-4 py-2.5 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white'
        >
          <option value=''>Todas Cryptos</option>
          <option value='USDT'>USDT</option>
          <option value='BTC'>BTC</option>
          <option value='ETH'>ETH</option>
        </select>
      </div>

      {/* List */}
      <div className='space-y-3'>
        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-blue-500' />
          </div>
        ) : !data?.locked_balances.length ? (
          <div className='text-center py-12 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl'>
            <CheckCircle className='h-12 w-12 text-green-500 mx-auto mb-4' />
            <p className='text-gray-600 dark:text-gray-400'>Nenhum saldo bloqueado encontrado</p>
          </div>
        ) : (
          data.locked_balances.map(balance => {
            const isExpanded = expandedUsers[balance.user_id]
            const sourceTotal = balance.possible_sources.reduce((sum, s) => sum + s.amount, 0)
            const orphanAmount = balance.locked_balance - sourceTotal
            const hasOrphan = orphanAmount > 0.01

            return (
              <div
                key={`${balance.user_id}-${balance.cryptocurrency}`}
                className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden'
              >
                {/* Header */}
                <div
                  className='p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5'
                  onClick={() => toggleUser(`${balance.user_id}-${balance.cryptocurrency}`)}
                >
                  <div className='flex items-center gap-4'>
                    <div className='w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold'>
                      {balance.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className='font-medium text-gray-900 dark:text-white'>
                        {balance.username}
                      </p>
                      <p className='text-sm text-gray-500'>{balance.email}</p>
                    </div>
                  </div>

                  <div className='flex items-center gap-6'>
                    <div className='text-right'>
                      <p className='text-sm text-gray-500'>Crypto</p>
                      <p className='font-mono font-bold text-gray-900 dark:text-white'>
                        {balance.cryptocurrency}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm text-gray-500'>Bloqueado</p>
                      <p className='font-mono font-bold text-amber-500'>
                        {balance.locked_balance.toFixed(6)}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm text-gray-500'>Disponível</p>
                      <p className='font-mono text-gray-900 dark:text-white'>
                        {balance.available_balance.toFixed(6)}
                      </p>
                    </div>

                    {hasOrphan && (
                      <span className='px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1'>
                        <AlertTriangle className='h-3 w-3' />
                        Órfão: {orphanAmount.toFixed(4)}
                      </span>
                    )}

                    <button
                      onClick={e => {
                        e.stopPropagation()
                        openUnlockModal(balance)
                      }}
                      className='px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg flex items-center gap-1 transition-colors'
                    >
                      <Unlock className='h-4 w-4' />
                      Desbloquear
                    </button>

                    {isExpanded ? (
                      <ChevronDown className='h-5 w-5 text-gray-400' />
                    ) : (
                      <ChevronRight className='h-5 w-5 text-gray-400' />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className='border-t border-gray-200 dark:border-white/10 p-4 bg-gray-50 dark:bg-white/5'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {/* Info */}
                      <div>
                        <h4 className='text-sm font-medium text-gray-900 dark:text-white mb-2'>
                          Informações
                        </h4>
                        <div className='space-y-2 text-sm'>
                          <p className='text-gray-600 dark:text-gray-400'>
                            <span className='font-medium'>Último motivo:</span>{' '}
                            {balance.last_updated_reason || 'N/A'}
                          </p>
                          <p className='text-gray-600 dark:text-gray-400'>
                            <span className='font-medium'>Atualizado em:</span>{' '}
                            {balance.updated_at
                              ? new Date(balance.updated_at).toLocaleString('pt-BR')
                              : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Sources */}
                      <div>
                        <h4 className='text-sm font-medium text-gray-900 dark:text-white mb-2'>
                          Fontes Identificadas ({balance.possible_sources.length})
                        </h4>
                        {balance.possible_sources.length === 0 ? (
                          <p className='text-sm text-amber-500 flex items-center gap-1'>
                            <AlertTriangle className='h-4 w-4' />
                            Nenhuma fonte identificada - Saldo órfão!
                          </p>
                        ) : (
                          <div className='space-y-2'>
                            {balance.possible_sources.map((source, idx) => (
                              <div
                                key={idx}
                                className='flex items-center justify-between text-sm bg-white dark:bg-[#111] rounded p-2'
                              >
                                <div className='flex items-center gap-2'>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs ${getSourceTypeColor(source.type)}`}
                                  >
                                    {getSourceTypeLabel(source.type)}
                                  </span>
                                  <span className='text-gray-600 dark:text-gray-400'>
                                    {source.reference}
                                  </span>
                                  <span className='text-gray-500'>({source.status})</span>
                                </div>
                                <span className='font-mono text-gray-900 dark:text-white'>
                                  {source.amount.toFixed(4)}
                                </span>
                              </div>
                            ))}
                            <div className='flex items-center justify-between text-sm pt-2 border-t border-gray-200 dark:border-white/10'>
                              <span className='text-gray-600 dark:text-gray-400'>
                                Total identificado:
                              </span>
                              <span className='font-mono font-bold text-gray-900 dark:text-white'>
                                {sourceTotal.toFixed(4)}
                              </span>
                            </div>
                            {hasOrphan && (
                              <div className='flex items-center justify-between text-sm bg-red-500/10 rounded p-2'>
                                <span className='text-red-400 flex items-center gap-1'>
                                  <AlertTriangle className='h-4 w-4' />
                                  Valor órfão (sem fonte):
                                </span>
                                <span className='font-mono font-bold text-red-400'>
                                  {orphanAmount.toFixed(4)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Unlock Modal */}
      {unlockModalOpen && selectedBalance && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6'>
            <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <Unlock className='h-6 w-6 text-green-500' />
              Desbloquear Saldo
            </h3>

            <div className='space-y-4'>
              <div className='bg-gray-100 dark:bg-white/5 rounded-lg p-3'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Usuário</p>
                <p className='font-medium text-gray-900 dark:text-white'>
                  {selectedBalance.username} ({selectedBalance.email})
                </p>
              </div>

              <div className='bg-gray-100 dark:bg-white/5 rounded-lg p-3'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>Crypto</p>
                <p className='font-mono font-bold text-gray-900 dark:text-white'>
                  {selectedBalance.cryptocurrency}
                </p>
              </div>

              <div className='bg-amber-500/10 rounded-lg p-3'>
                <p className='text-sm text-amber-400'>Saldo Bloqueado Atual</p>
                <p className='font-mono font-bold text-2xl text-amber-500'>
                  {selectedBalance.locked_balance.toFixed(6)}
                </p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-900 dark:text-white mb-1'>
                  Valor a Desbloquear
                </label>
                <input
                  type='number'
                  step='0.000001'
                  value={unlockAmount}
                  onChange={e => setUnlockAmount(e.target.value)}
                  max={selectedBalance.locked_balance}
                  className='w-full px-4 py-2 bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-900 dark:text-white mb-1'>
                  Motivo do Desbloqueio *
                </label>
                <textarea
                  value={unlockReason}
                  onChange={e => setUnlockReason(e.target.value)}
                  placeholder='Ex: Saldo órfão sem operação associada'
                  rows={3}
                  className='w-full px-4 py-2 bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500'
                />
              </div>

              <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-3'>
                <p className='text-sm text-red-400 flex items-center gap-2'>
                  <AlertTriangle className='h-4 w-4' />
                  Atenção: Esta ação move o saldo de bloqueado para disponível.
                </p>
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={() => {
                  setUnlockModalOpen(false)
                  setSelectedBalance(null)
                  setUnlockReason('')
                }}
                className='flex-1 px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white rounded-lg transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlock}
                disabled={unlockMutation.isPending || !unlockReason.trim()}
                className='flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
              >
                {unlockMutation.isPending ? (
                  <Loader2 className='h-5 w-5 animate-spin' />
                ) : (
                  <>
                    <Unlock className='h-5 w-5' />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
