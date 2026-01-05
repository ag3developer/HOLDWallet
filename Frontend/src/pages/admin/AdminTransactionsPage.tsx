/**
 * 🛡️ HOLD Wallet - Admin Transactions Page
 * ==========================================
 *
 * Página de gestão de transações blockchain no painel administrativo.
 */

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import {
  useTransactionStats,
  useTransactions,
  type Transaction,
} from '@/hooks/admin/useAdminTransactions'
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react'

export const AdminTransactionsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 20

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, typeFilter])

  // React Query hooks
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useTransactionStats()
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useTransactions({
    skip: (page - 1) * limit,
    limit,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    tx_type: typeFilter !== 'all' ? typeFilter : undefined,
    search: debouncedSearch || undefined,
  })

  const transactions = transactionsData?.items || []
  const total = transactionsData?.total || 0
  const totalPages = Math.ceil(total / limit)

  const handleRefresh = () => {
    refetchStats()
    refetchTransactions()
    toast.success('Dados atualizados')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  const shortenHash = (hash?: string) => {
    if (!hash) return '-'
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500'>
            <CheckCircle className='h-3 w-3' />
            Confirmada
          </span>
        )
      case 'pending':
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500'>
            <Clock className='h-3 w-3' />
            Pendente
          </span>
        )
      case 'failed':
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500'>
            <XCircle className='h-3 w-3' />
            Falhou
          </span>
        )
      default:
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500'>
            {status}
          </span>
        )
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500'>
            <ArrowDownLeft className='h-3 w-3' />
            Depósito
          </span>
        )
      case 'withdrawal':
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500'>
            <ArrowUpRight className='h-3 w-3' />
            Saque
          </span>
        )
      default:
        return (
          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500'>
            {type}
          </span>
        )
    }
  }

  return (
    <div className='min-h-screen bg-[#0a0a0a] p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-white flex items-center gap-2'>
            <Activity className='h-6 w-6 text-blue-500' />
            Transações Blockchain
          </h1>
          <p className='text-gray-400 text-sm mt-1'>Histórico de depósitos e saques on-chain</p>
        </div>
        <button
          onClick={handleRefresh}
          className='flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors'
        >
          <RefreshCw
            className={`h-4 w-4 ${statsLoading || transactionsLoading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-[#111] border border-white/10 rounded-xl p-4'>
          <div className='flex items-center gap-2 text-gray-400 text-sm mb-2'>
            <Activity className='h-4 w-4' />
            Total de Transações
          </div>
          <div className='text-2xl font-bold text-white'>
            {statsLoading ? '...' : (stats?.total || 0).toLocaleString()}
          </div>
          <div className='text-xs text-gray-500 mt-1'>{stats?.last_24h || 0} nas últimas 24h</div>
        </div>

        <div className='bg-[#111] border border-white/10 rounded-xl p-4'>
          <div className='flex items-center gap-2 text-gray-400 text-sm mb-2'>
            <Clock className='h-4 w-4' />
            Pendentes
          </div>
          <div className='text-2xl font-bold text-yellow-500'>
            {statsLoading ? '...' : (stats?.pending || 0).toLocaleString()}
          </div>
          <div className='text-xs text-gray-500 mt-1'>aguardando confirmação</div>
        </div>

        <div className='bg-[#111] border border-white/10 rounded-xl p-4'>
          <div className='flex items-center gap-2 text-gray-400 text-sm mb-2'>
            <ArrowDownLeft className='h-4 w-4' />
            Depósitos
          </div>
          <div className='text-2xl font-bold text-green-500'>
            {statsLoading ? '...' : (stats?.deposits || 0).toLocaleString()}
          </div>
          <div className='text-xs text-gray-500 mt-1'>total recebido</div>
        </div>

        <div className='bg-[#111] border border-white/10 rounded-xl p-4'>
          <div className='flex items-center gap-2 text-gray-400 text-sm mb-2'>
            <ArrowUpRight className='h-4 w-4' />
            Saques
          </div>
          <div className='text-2xl font-bold text-blue-500'>
            {statsLoading ? '...' : (stats?.withdrawals || 0).toLocaleString()}
          </div>
          <div className='text-xs text-gray-500 mt-1'>total enviado</div>
        </div>
      </div>

      {/* Filtros */}
      <div className='bg-[#111] border border-white/10 rounded-xl p-4'>
        <div className='flex flex-col md:flex-row gap-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar por hash, endereço ou usuário...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50'
            />
          </div>

          <div className='flex gap-2'>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              title='Filtrar por status'
              className='px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50'
            >
              <option value='all'>Todos Status</option>
              <option value='pending'>Pendente</option>
              <option value='confirmed'>Confirmada</option>
              <option value='failed'>Falhou</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              title='Filtrar por tipo'
              className='px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50'
            >
              <option value='all'>Todos Tipos</option>
              <option value='deposit'>Depósito</option>
              <option value='withdrawal'>Saque</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className='bg-[#111] border border-white/10 rounded-xl overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-white/10'>
                <th className='text-left px-4 py-3 text-sm font-medium text-gray-400'>Usuário</th>
                <th className='text-left px-4 py-3 text-sm font-medium text-gray-400'>Tipo</th>
                <th className='text-left px-4 py-3 text-sm font-medium text-gray-400'>Moeda</th>
                <th className='text-right px-4 py-3 text-sm font-medium text-gray-400'>Valor</th>
                <th className='text-left px-4 py-3 text-sm font-medium text-gray-400'>Hash</th>
                <th className='text-left px-4 py-3 text-sm font-medium text-gray-400'>Status</th>
                <th className='text-left px-4 py-3 text-sm font-medium text-gray-400'>Data</th>
                <th className='text-right px-4 py-3 text-sm font-medium text-gray-400'>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactionsLoading ? (
                <tr>
                  <td colSpan={8} className='text-center py-12'>
                    <RefreshCw className='h-8 w-8 animate-spin mx-auto mb-2 text-blue-500' />
                    <p className='text-gray-400'>Carregando transações...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className='text-center py-12'>
                    <Activity className='h-8 w-8 mx-auto mb-2 text-gray-600' />
                    <p className='text-gray-400'>Nenhuma transação encontrada</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx: Transaction) => (
                  <tr
                    key={tx.id}
                    className='border-b border-white/5 hover:bg-white/5 transition-colors'
                  >
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <div className='w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-medium text-blue-400'>
                          {tx.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className='text-white font-medium'>{tx.username || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className='px-4 py-3'>{getTypeBadge(tx.tx_type)}</td>
                    <td className='px-4 py-3'>
                      <span className='text-white font-mono text-sm'>
                        {tx.cryptocurrency || 'N/A'}
                        {tx.network && (
                          <span className='text-gray-500 text-xs ml-1'>({tx.network})</span>
                        )}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-right font-mono text-white'>
                      {tx.amount.toFixed(8)}
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <span className='text-gray-400 font-mono text-sm'>
                          {shortenHash(tx.tx_hash)}
                        </span>
                        {tx.tx_hash && (
                          <button
                            onClick={() => copyToClipboard(tx.tx_hash!)}
                            title='Copiar hash'
                            className='text-gray-500 hover:text-white transition-colors'
                          >
                            <Copy className='h-3 w-3' />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className='px-4 py-3'>{getStatusBadge(tx.status)}</td>
                    <td className='px-4 py-3 text-gray-400 text-sm'>
                      {tx.created_at ? new Date(tx.created_at).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      {tx.tx_hash && (
                        <a
                          href={`https://etherscan.io/tx/${tx.tx_hash}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm'
                        >
                          <ExternalLink className='h-3 w-3' />
                          Explorer
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className='flex items-center justify-between px-4 py-3 border-t border-white/10'>
            <p className='text-sm text-gray-400'>
              Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className='flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronLeft className='h-4 w-4' />
                Anterior
              </button>
              <span className='flex items-center px-3 text-gray-400'>
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className='flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Próximo
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminTransactionsPage
