/**
 * HOLD Wallet - Admin Transactions Page
 * ==========================================
 *
 * Pagina de gestao de transacoes blockchain no painel administrativo.
 * Design moderno, responsivo e compacto para todos os dispositivos.
 */

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import {
  useTransactionStats,
  useTransactions,
  useSyncTransactions,
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
  Filter,
  TrendingUp,
  TrendingDown,
  Wallet,
  Hash,
  User,
  RefreshCcw,
} from 'lucide-react'

// Mapeamento de logos das criptomoedas
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
  ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
  USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  MATIC: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  POL: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
  XRP: 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
  ADA: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
  DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
  DOT: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png',
  AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  LTC: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png',
  LINK: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
  UNI: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
  ATOM: 'https://cryptologos.cc/logos/cosmos-atom-logo.png',
  XLM: 'https://cryptologos.cc/logos/stellar-xlm-logo.png',
}

// Cores das redes
const NETWORK_COLORS: Record<string, { bg: string; text: string }> = {
  polygon: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  ethereum: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  bsc: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  base: { bg: 'bg-blue-600/10', text: 'text-blue-300' },
  bitcoin: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  solana: { bg: 'bg-gradient-to-r from-purple-500/10 to-green-500/10', text: 'text-purple-300' },
  avalanche: { bg: 'bg-red-500/10', text: 'text-red-400' },
}

// Explorer URLs por rede
const EXPLORER_URLS: Record<string, string> = {
  polygon: 'https://polygonscan.com/tx/',
  ethereum: 'https://etherscan.io/tx/',
  bsc: 'https://bscscan.com/tx/',
  base: 'https://basescan.org/tx/',
  bitcoin: 'https://blockstream.info/tx/',
  solana: 'https://solscan.io/tx/',
  avalanche: 'https://snowtrace.io/tx/',
}

export const AdminTransactionsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const limit = 15

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

  // Sincronização com blockchain
  const syncMutation = useSyncTransactions()

  const transactions = transactionsData?.items || []
  const total = transactionsData?.total || 0
  const totalPages = Math.ceil(total / limit)

  const handleRefresh = () => {
    refetchStats()
    refetchTransactions()
    toast.success('Dados atualizados')
  }

  const handleSyncBlockchain = async () => {
    try {
      const result = await syncMutation.mutateAsync()
      if (result.updated > 0) {
        toast.success(
          `Sincronizado! ${result.confirmed} confirmadas, ${result.failed} falharam, ${result.still_pending} pendentes`
        )
      } else if (result.total_checked === 0) {
        toast.success('Nenhuma transação pendente para sincronizar')
      } else {
        toast.success(`${result.still_pending} transações ainda pendentes na blockchain`)
      }
      // Recarregar dados
      refetchStats()
      refetchTransactions()
    } catch (error) {
      toast.error('Erro ao sincronizar com blockchain')
      console.error(error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  const shortenHash = (hash?: string) => {
    if (!hash) return '-'
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
  }

  const formatAmount = (amount: number | string | null | undefined) => {
    // Converte para número se necessário
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount)

    // Verifica se é um número válido
    if (isNaN(numAmount) || amount === null || amount === undefined) {
      return '0.00'
    }

    if (numAmount >= 1000) return numAmount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
    if (numAmount >= 1) return numAmount.toFixed(4)
    return numAmount.toFixed(8)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const getExplorerUrl = (network?: string, hash?: string) => {
    if (!hash) return null
    const baseUrl = EXPLORER_URLS[network?.toLowerCase() || ''] || EXPLORER_URLS.polygon
    return baseUrl + hash
  }

  const getCryptoLogo = (symbol?: string) => {
    if (!symbol) return null
    return CRYPTO_LOGOS[symbol.toUpperCase()] || null
  }

  const getNetworkStyle = (network?: string) => {
    return (
      NETWORK_COLORS[network?.toLowerCase() || ''] || {
        bg: 'bg-gray-500/10',
        text: 'text-gray-400',
      }
    )
  }

  return (
    <div className='min-h-screen bg-[#0a0a0a] p-3 sm:p-4 lg:p-6 space-y-4'>
      {/* Header Compacto */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20'>
            <Activity className='h-5 w-5 text-blue-400' />
          </div>
          <div>
            <h1 className='text-lg sm:text-xl font-bold text-white'>Transacoes Blockchain</h1>
            <p className='text-gray-500 text-xs sm:text-sm'>Depositos e saques on-chain</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {/* Botão Sincronizar com Blockchain */}
          <button
            onClick={handleSyncBlockchain}
            disabled={syncMutation.isPending || statsLoading}
            title='Sincronizar status das transações pendentes com a blockchain'
            className='flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-green-400 border border-green-500/20 transition-all text-sm disabled:opacity-50'
          >
            <RefreshCcw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            <span className='hidden sm:inline'>
              {syncMutation.isPending ? 'Sincronizando...' : 'Sync Blockchain'}
            </span>
          </button>
          {/* Botão Atualizar */}
          <button
            onClick={handleRefresh}
            disabled={statsLoading || transactionsLoading}
            className='flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all text-sm disabled:opacity-50'
          >
            <RefreshCw
              className={`h-4 w-4 ${statsLoading || transactionsLoading ? 'animate-spin' : ''}`}
            />
            <span className='hidden sm:inline'>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - Grid Responsivo */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3'>
        {/* Total */}
        <div className='bg-gradient-to-br from-[#111] to-[#0d0d0d] border border-white/5 rounded-xl p-3 sm:p-4'>
          <div className='flex items-center justify-between mb-2'>
            <Activity className='h-4 w-4 text-gray-500' />
            <span className='text-[10px] sm:text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded'>
              24h: {stats?.last_24h || 0}
            </span>
          </div>
          <div className='text-xl sm:text-2xl font-bold text-white'>
            {statsLoading ? '...' : (stats?.total || 0).toLocaleString()}
          </div>
          <p className='text-[10px] sm:text-xs text-gray-500 mt-1'>Total de transacoes</p>
        </div>

        {/* Pendentes */}
        <div className='bg-gradient-to-br from-[#111] to-[#0d0d0d] border border-yellow-500/10 rounded-xl p-3 sm:p-4'>
          <div className='flex items-center justify-between mb-2'>
            <Clock className='h-4 w-4 text-yellow-500/70' />
            {(stats?.pending || 0) > 0 && (
              <span className='flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-2 w-2 rounded-full bg-yellow-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-2 w-2 bg-yellow-500'></span>
              </span>
            )}
          </div>
          <div className='text-xl sm:text-2xl font-bold text-yellow-500'>
            {statsLoading ? '...' : (stats?.pending || 0).toLocaleString()}
          </div>
          <p className='text-[10px] sm:text-xs text-gray-500 mt-1'>Pendentes</p>
        </div>

        {/* Depositos */}
        <div className='bg-gradient-to-br from-[#111] to-[#0d0d0d] border border-green-500/10 rounded-xl p-3 sm:p-4'>
          <div className='flex items-center justify-between mb-2'>
            <TrendingDown className='h-4 w-4 text-green-500/70' />
            <ArrowDownLeft className='h-3 w-3 text-green-500/50' />
          </div>
          <div className='text-xl sm:text-2xl font-bold text-green-500'>
            {statsLoading ? '...' : (stats?.deposits || 0).toLocaleString()}
          </div>
          <p className='text-[10px] sm:text-xs text-gray-500 mt-1'>Depositos</p>
        </div>

        {/* Saques */}
        <div className='bg-gradient-to-br from-[#111] to-[#0d0d0d] border border-blue-500/10 rounded-xl p-3 sm:p-4'>
          <div className='flex items-center justify-between mb-2'>
            <TrendingUp className='h-4 w-4 text-blue-500/70' />
            <ArrowUpRight className='h-3 w-3 text-blue-500/50' />
          </div>
          <div className='text-xl sm:text-2xl font-bold text-blue-500'>
            {statsLoading ? '...' : (stats?.withdrawals || 0).toLocaleString()}
          </div>
          <p className='text-[10px] sm:text-xs text-gray-500 mt-1'>Saques</p>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className='bg-[#111] border border-white/5 rounded-xl p-3'>
        <div className='flex flex-col sm:flex-row gap-2'>
          {/* Search */}
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500' />
            <input
              type='text'
              placeholder='Buscar hash, endereco...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50'
            />
          </div>

          {/* Filtros Desktop */}
          <div className='hidden sm:flex gap-2'>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              title='Filtrar por status'
              aria-label='Filtrar por status'
              className='px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer'
            >
              <option value='all'>Status</option>
              <option value='pending'>Pendente</option>
              <option value='confirmed'>Confirmada</option>
              <option value='failed'>Falhou</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              title='Filtrar por tipo'
              aria-label='Filtrar por tipo'
              className='px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer'
            >
              <option value='all'>Tipo</option>
              <option value='deposit'>Deposito</option>
              <option value='withdrawal'>Saque</option>
            </select>
          </div>

          {/* Filtros Mobile Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className='sm:hidden flex items-center justify-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400'
          >
            <Filter className='h-4 w-4' />
            Filtros
          </button>
        </div>

        {/* Filtros Mobile Expandidos */}
        {showFilters && (
          <div className='flex gap-2 mt-2 sm:hidden'>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              title='Filtrar por status'
              aria-label='Filtrar por status'
              className='flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm'
            >
              <option value='all'>Status</option>
              <option value='pending'>Pendente</option>
              <option value='confirmed'>Confirmada</option>
              <option value='failed'>Falhou</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              title='Filtrar por tipo'
              aria-label='Filtrar por tipo'
              className='flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm'
            >
              <option value='all'>Tipo</option>
              <option value='deposit'>Deposito</option>
              <option value='withdrawal'>Saque</option>
            </select>
          </div>
        )}
      </div>

      {/* Lista de Transacoes - Cards Mobile / Tabela Desktop */}
      <div className='bg-[#111] border border-white/5 rounded-xl overflow-hidden'>
        {transactionsLoading ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <RefreshCw className='h-8 w-8 animate-spin text-blue-500 mb-3' />
            <p className='text-gray-500 text-sm'>Carregando transacoes...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12'>
            <Activity className='h-10 w-10 text-gray-700 mb-3' />
            <p className='text-gray-500 text-sm'>Nenhuma transacao encontrada</p>
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className='hidden lg:block overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-white/5 bg-white/[0.02]'>
                    <th className='text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Moeda
                    </th>
                    <th className='text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Tipo
                    </th>
                    <th className='text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Valor
                    </th>
                    <th className='text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Usuario
                    </th>
                    <th className='text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Hash
                    </th>
                    <th className='text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Data
                    </th>
                    <th className='text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider'></th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-white/5'>
                  {transactions.map((tx: Transaction) => {
                    const logo = getCryptoLogo(tx.cryptocurrency)
                    const networkStyle = getNetworkStyle(tx.network)
                    const explorerUrl = getExplorerUrl(tx.network, tx.tx_hash)

                    return (
                      <tr key={tx.id} className='hover:bg-white/[0.02] transition-colors'>
                        {/* Moeda */}
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-2'>
                            {logo ? (
                              <img
                                src={logo}
                                alt={tx.cryptocurrency}
                                className='w-7 h-7 rounded-full'
                              />
                            ) : (
                              <div className='w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center'>
                                <Wallet className='h-3.5 w-3.5 text-gray-400' />
                              </div>
                            )}
                            <div>
                              <span className='text-white font-medium text-sm'>
                                {tx.cryptocurrency || 'N/A'}
                              </span>
                              {tx.network && (
                                <span className={`block text-[10px] ${networkStyle.text}`}>
                                  {tx.network}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className='px-4 py-3'>
                          {tx.tx_type === 'deposit' || tx.tx_type === 'sell' ? (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20'>
                              <ArrowDownLeft className='h-3 w-3' />
                              Entrada
                            </span>
                          ) : tx.tx_type === 'withdrawal' || tx.tx_type === 'buy' ? (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20'>
                              <ArrowUpRight className='h-3 w-3' />
                              Saida
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20'>
                              {tx.tx_type || 'transfer'}
                            </span>
                          )}
                        </td>

                        {/* Valor */}
                        <td className='px-4 py-3 text-right'>
                          <span
                            className={`font-mono text-sm font-medium ${
                              tx.tx_type === 'deposit' || tx.tx_type === 'sell'
                                ? 'text-green-400'
                                : 'text-white'
                            }`}
                          >
                            {tx.tx_type === 'deposit' || tx.tx_type === 'sell' ? '+' : '-'}
                            {formatAmount(tx.amount)}
                          </span>
                        </td>

                        {/* Usuario */}
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-2'>
                            <div className='w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-medium text-blue-300'>
                              {tx.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className='text-gray-300 text-sm'>
                              {tx.username || 'Unknown'}
                            </span>
                          </div>
                        </td>

                        {/* Hash */}
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-1.5'>
                            <Hash className='h-3 w-3 text-gray-600' />
                            <span className='text-gray-400 font-mono text-xs'>
                              {shortenHash(tx.tx_hash)}
                            </span>
                            {tx.tx_hash && (
                              <button
                                onClick={() => copyToClipboard(tx.tx_hash!)}
                                title='Copiar hash'
                                aria-label='Copiar hash da transacao'
                                className='text-gray-600 hover:text-white transition-colors p-0.5'
                              >
                                <Copy className='h-3 w-3' />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className='px-4 py-3 text-center'>
                          {tx.status === 'confirmed' ? (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400'>
                              <CheckCircle className='h-3 w-3' />
                              OK
                            </span>
                          ) : tx.status === 'pending' ? (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-yellow-500/10 text-yellow-400'>
                              <Clock className='h-3 w-3' />
                              Pend.
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400'>
                              <XCircle className='h-3 w-3' />
                              Erro
                            </span>
                          )}
                        </td>

                        {/* Data */}
                        <td className='px-4 py-3 text-right'>
                          <span className='text-gray-500 text-xs'>{formatDate(tx.created_at)}</span>
                        </td>

                        {/* Acoes */}
                        <td className='px-4 py-3 text-right'>
                          {explorerUrl && (
                            <a
                              href={explorerUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              title='Ver no explorer'
                              aria-label='Ver transacao no blockchain explorer'
                              className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all'
                            >
                              <ExternalLink className='h-3 w-3' />
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className='lg:hidden divide-y divide-white/5'>
              {transactions.map((tx: Transaction) => {
                const logo = getCryptoLogo(tx.cryptocurrency)
                const networkStyle = getNetworkStyle(tx.network)
                const explorerUrl = getExplorerUrl(tx.network, tx.tx_hash)
                const isIncoming = tx.tx_type === 'deposit' || tx.tx_type === 'sell'

                return (
                  <div key={tx.id} className='p-3 hover:bg-white/[0.02] transition-colors'>
                    <div className='flex items-start justify-between gap-3'>
                      {/* Left: Coin + Info */}
                      <div className='flex items-center gap-3'>
                        {/* Coin Logo */}
                        <div className='relative'>
                          {logo ? (
                            <img
                              src={logo}
                              alt={tx.cryptocurrency}
                              className='w-10 h-10 rounded-full'
                            />
                          ) : (
                            <div className='w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center'>
                              <Wallet className='h-5 w-5 text-gray-400' />
                            </div>
                          )}
                          {/* Direction indicator */}
                          <div
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                              isIncoming ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                          >
                            {isIncoming ? (
                              <ArrowDownLeft className='h-3 w-3 text-white' />
                            ) : (
                              <ArrowUpRight className='h-3 w-3 text-white' />
                            )}
                          </div>
                        </div>

                        {/* Info */}
                        <div>
                          <div className='flex items-center gap-2'>
                            <span className='text-white font-medium'>
                              {tx.cryptocurrency || 'N/A'}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${networkStyle.bg} ${networkStyle.text}`}
                            >
                              {tx.network}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 mt-0.5'>
                            <User className='h-3 w-3 text-gray-600' />
                            <span className='text-gray-500 text-xs'>
                              {tx.username || 'Unknown'}
                            </span>
                            <span className='text-gray-700'>|</span>
                            <span className='text-gray-600 text-xs'>
                              {formatDate(tx.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount + Status */}
                      <div className='text-right'>
                        <div
                          className={`font-mono font-medium ${isIncoming ? 'text-green-400' : 'text-white'}`}
                        >
                          {isIncoming ? '+' : '-'}
                          {formatAmount(tx.amount)}
                        </div>
                        <div className='mt-1'>
                          {tx.status === 'confirmed' ? (
                            <span className='inline-flex items-center gap-1 text-[10px] text-green-400'>
                              <CheckCircle className='h-3 w-3' />
                              Confirmada
                            </span>
                          ) : tx.status === 'pending' ? (
                            <span className='inline-flex items-center gap-1 text-[10px] text-yellow-400'>
                              <Clock className='h-3 w-3' />
                              Pendente
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 text-[10px] text-red-400'>
                              <XCircle className='h-3 w-3' />
                              Falhou
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hash Row */}
                    {tx.tx_hash && (
                      <div className='flex items-center justify-between mt-2 pt-2 border-t border-white/5'>
                        <div className='flex items-center gap-2'>
                          <Hash className='h-3 w-3 text-gray-600' />
                          <span className='text-gray-500 font-mono text-xs'>
                            {shortenHash(tx.tx_hash)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(tx.tx_hash!)}
                            title='Copiar hash'
                            aria-label='Copiar hash da transacao'
                            className='text-gray-600 hover:text-white transition-colors'
                          >
                            <Copy className='h-3 w-3' />
                          </button>
                        </div>
                        {explorerUrl && (
                          <a
                            href={explorerUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            title='Ver no explorer'
                            className='flex items-center gap-1 text-blue-400 text-xs'
                          >
                            <ExternalLink className='h-3 w-3' />
                            Ver
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Paginacao */}
        {totalPages > 1 && (
          <div className='flex items-center justify-between px-3 sm:px-4 py-3 border-t border-white/5 bg-white/[0.01]'>
            <p className='text-xs text-gray-500'>
              <span className='hidden sm:inline'>Mostrando </span>
              {(page - 1) * limit + 1}-{Math.min(page * limit, total)} de {total}
            </p>
            <div className='flex items-center gap-1'>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                title='Pagina anterior'
                aria-label='Ir para pagina anterior'
                className='p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              >
                <ChevronLeft className='h-4 w-4' />
              </button>
              <span className='px-3 text-xs text-gray-400'>
                {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                title='Proxima pagina'
                aria-label='Ir para proxima pagina'
                className='p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              >
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
