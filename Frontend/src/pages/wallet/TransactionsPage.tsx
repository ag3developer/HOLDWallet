import { useState, useMemo, useEffect } from 'react'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Copy,
  ChevronDown,
  Download,
  FileJson,
  FileText,
  File,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallet'
import { CryptoIcon } from '@/components/CryptoIcon'
import { Transaction } from '@/services/transactionService'

type SortType = 'recent' | 'oldest' | 'highest' | 'lowest'
type TransactionType = 'all' | 'send' | 'receive' | 'pending'
type ReportFormat = 'csv' | 'json' | 'pdf'
type DateRange = 'all' | '7d' | '30d' | '90d' | 'custom'

const ITEMS_PER_PAGE = 10

// Função para gerar CSV
const generateCSV = (transactions: Transaction[], walletId: string, walletAddress: string) => {
  // Cabeçalho com informações da carteira
  const header = `RELATÓRIO DE TRANSAÇÕES - HOLDWALLET
ID da Carteira,${walletId}
Endereço Principal,${walletAddress}
Data do Relatório,${new Date().toLocaleString('pt-BR')}
Total de Transações,${transactions.length}

`

  const tableHeaders = [
    'Data',
    'Tipo',
    'Moeda',
    'Valor',
    'Taxa',
    'Status',
    'Rede',
    'Hash',
    'De',
    'Para',
  ]
  const rows = transactions.map(tx => [
    new Date(tx.created_at).toLocaleString('pt-BR'),
    tx.to_address.toLowerCase() === walletAddress.toLowerCase() ? 'Recebido' : 'Enviado',
    tx.token_symbol || tx.network.toUpperCase(),
    tx.amount,
    tx.fee || '0',
    tx.status,
    tx.network,
    tx.hash,
    tx.from_address,
    tx.to_address,
  ])

  const csv =
    header + [tableHeaders, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  return csv
}

// Função para gerar JSON
const generateJSON = (transactions: Transaction[], walletId: string, walletAddress: string) => {
  const data = {
    export_date: new Date().toISOString(),
    wallet_id: walletId,
    wallet_address: walletAddress,
    total_transactions: transactions.length,
    transactions: transactions.map(tx => ({
      date: tx.created_at,
      type: tx.to_address.toLowerCase() === walletAddress.toLowerCase() ? 'received' : 'sent',
      symbol: tx.token_symbol || tx.network.toUpperCase(),
      amount: tx.amount,
      fee: tx.fee,
      status: tx.status,
      network: tx.network,
      hash: tx.hash,
      from: tx.from_address,
      to: tx.to_address,
    })),
  }
  return JSON.stringify(data, null, 2)
}

// Função para filtrar por data
const getDateRangeFilter = (range: DateRange): { start: Date; end: Date } => {
  const end = new Date()
  const start = new Date()

  switch (range) {
    case '7d':
      start.setDate(end.getDate() - 7)
      break
    case '30d':
      start.setMonth(end.getMonth() - 1)
      break
    case '90d':
      start.setMonth(end.getMonth() - 3)
      break
    case 'all':
      start.setFullYear(1970)
      break
  }

  return { start, end }
}

// Função para gerar PDF
const generatePDF = (transactions: Transaction[], walletId: string, walletAddress: string) => {
  // Simple HTML-based PDF generation
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Relatório de Transações</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .header { background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .header-item { margin: 8px 0; font-size: 14px; }
        .header-label { font-weight: bold; color: #1f2937; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #2563eb; color: white; padding: 12px; text-align: left; font-weight: bold; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .received { color: #059669; font-weight: bold; }
        .sent { color: #dc2626; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; }
        .summary { background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #059669; }
      </style>
    </head>
    <body>
      <h1>Relatório de Transações - HOLDWallet</h1>
      
      <div class="header">
        <div class="header-item">
          <span class="header-label">ID da Carteira:</span> ${walletId}
        </div>
        <div class="header-item">
          <span class="header-label">Endereço Principal:</span> ${walletAddress}
        </div>
        <div class="header-item">
          <span class="header-label">Data do Relatório:</span> ${new Date().toLocaleString('pt-BR')}
        </div>
        <div class="header-item">
          <span class="header-label">Total de Transações:</span> ${transactions.length}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Moeda</th>
            <th>Valor</th>
            <th>Taxa</th>
            <th>Status</th>
            <th>Rede</th>
            <th>Hash</th>
          </tr>
        </thead>
        <tbody>
          ${transactions
            .map(
              tx => `
            <tr>
              <td>${new Date(tx.created_at).toLocaleString('pt-BR')}</td>
              <td class="${walletAddress.toLowerCase() === tx.to_address.toLowerCase() ? 'received' : 'sent'}">
                ${walletAddress.toLowerCase() === tx.to_address.toLowerCase() ? 'Recebido' : 'Enviado'}
              </td>
              <td>${tx.token_symbol || tx.network.toUpperCase()}</td>
              <td>${tx.amount}</td>
              <td>${tx.fee || '-'}</td>
              <td>${tx.status}</td>
              <td>${tx.network}</td>
              <td style="font-size: 12px; font-family: monospace;">${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="summary">
        <strong>Resumo:</strong> Relatório gerado automaticamente pelo HOLDWallet em ${new Date().toLocaleString('pt-BR')}
      </div>

      <div class="footer">
        <p>© 2025 HOLDWallet - Todos os direitos reservados</p>
        <p>Este é um documento eletrônico de caráter informativo</p>
      </div>
    </body>
    </html>
  `

  return html
}

// Explorer URLs por rede
const EXPLORER_URLS: Record<string, string> = {
  bitcoin: 'https://blockstream.info/tx',
  ethereum: 'https://etherscan.io/tx',
  polygon: 'https://polygonscan.com/tx',
  bsc: 'https://bscscan.com/tx',
  tron: 'https://tronscan.org/#/transaction',
  base: 'https://basescan.org/tx',
  avalanche: 'https://snowtrace.io/tx',
  solana: 'https://solscan.io/tx',
  litecoin: 'https://blockstream.info/ltc/tx',
  dogecoin: 'https://blockchair.com/dogecoin/transaction',
  cardano: 'https://cardanoscan.io/transaction',
  polkadot: 'https://polkascan.io/polkadot/transaction',
  xrp: 'https://xrpscan.com/tx',
}

// Status badge helper
const getStatusBadge = (status: string) => {
  const statusLower = status?.toLowerCase() || ''

  switch (statusLower) {
    case 'confirmed':
      return (
        <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'>
          <CheckCircle className='w-3 h-3' />
          Concluído
        </span>
      )
    case 'pending':
    case 'created':
    case 'signed':
      return (
        <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'>
          <Clock className='w-3 h-3' />
          Pendente
        </span>
      )
    case 'failed':
      return (
        <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'>
          <AlertCircle className='w-3 h-3' />
          Falhou
        </span>
      )
    case 'cancelled':
    case 'canceled':
      return (
        <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400'>
          <XCircle className='w-3 h-3' />
          Cancelada
        </span>
      )
    default:
      // Se não for um status conhecido, mostra como pendente
      return (
        <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'>
          <Clock className='w-3 h-3' />
          Pendente
        </span>
      )
  }
}

// Componente compacto de linha de transação (table row style)
const TransactionRow = ({
  tx,
  walletAddresses,
  copyToClipboard,
  openExplorer,
}: {
  tx: Transaction
  walletAddresses: string[]
  copyToClipboard: (text: string) => void
  openExplorer: (hash: string, network: string) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const isReceive = walletAddresses.some(addr => addr.toLowerCase() === tx.to_address.toLowerCase())
  const amount = Number.parseFloat(tx.amount)

  // Gerar ID numérico para suporte (baseado no hash)
  const generateTxId = (hash: string): string => {
    const hexPart = hash.replace('0x', '').substring(0, 8)
    const numId = Number.parseInt(hexPart, 16) % 100000000
    return numId.toString().padStart(8, '0')
  }

  // Formatar data/hora completa
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      full: date.toLocaleString('pt-BR'),
    }
  }

  // Nome amigável da rede
  const getNetworkName = (network: string): string => {
    const names: Record<string, string> = {
      polygon: 'Polygon',
      ethereum: 'Ethereum',
      bsc: 'BSC',
      base: 'Base',
      bitcoin: 'Bitcoin',
      tron: 'TRON',
      solana: 'Solana',
    }
    return names[network.toLowerCase()] || network.charAt(0).toUpperCase() + network.slice(1)
  }

  const dateTime = formatDateTime(tx.created_at)
  const txId = generateTxId(tx.hash)

  return (
    <div className='border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-300 dark:hover:border-blue-700 transition-all'>
      {/* Row Principal - Clicável para expandir */}
      <button
        type='button'
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors items-center cursor-pointer text-left'
      >
        {/* Data + Hora */}
        <div className='text-xs'>
          <div className='text-gray-900 dark:text-white font-medium'>{dateTime.date}</div>
          <div className='text-gray-500 dark:text-gray-400 text-[10px]'>{dateTime.time}</div>
        </div>

        {/* Tipo + Moeda */}
        <div className='flex items-center gap-1.5'>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              isReceive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
            }`}
          >
            {isReceive ? (
              <ArrowDownLeft className='w-3.5 h-3.5 text-green-600 dark:text-green-400' />
            ) : (
              <ArrowUpRight className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400' />
            )}
          </div>
          <div className='flex items-center gap-1'>
            <CryptoIcon symbol={tx.token_symbol || tx.network.toUpperCase()} size={18} />
            <span className='text-xs font-semibold text-gray-900 dark:text-white'>
              {tx.token_symbol || tx.network.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Valor */}
        <div
          className={`text-xs font-bold text-right ${
            isReceive ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
          }`}
        >
          {isReceive ? '+' : '-'}
          {amount.toFixed(4)}
        </div>

        {/* Status */}
        <div className='hidden sm:block'>{getStatusBadge(tx.status)}</div>

        {/* Rede */}
        <div className='hidden md:block text-[10px] text-gray-600 dark:text-gray-400 text-center'>
          {tx.network}
        </div>

        {/* Ações */}
        <div className='flex justify-end gap-0.5'>
          <button
            onClick={e => {
              e.stopPropagation()
              copyToClipboard(tx.hash)
            }}
            className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
            title='Copiar hash'
          >
            <Copy className='w-3 h-3 text-gray-500 dark:text-gray-400' />
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              openExplorer(tx.hash, tx.network)
            }}
            className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
            title='Abrir no explorer'
          >
            <ExternalLink className='w-3 h-3 text-gray-500 dark:text-gray-400' />
          </button>
          <div className={`p-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown className='w-3 h-3 text-gray-400' />
          </div>
        </div>
      </button>

      {/* Detalhes Expandidos - Compacto */}
      {isExpanded && (
        <div className='bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-3 space-y-2'>
          {/* ID da Transação (Suporte) */}
          <div className='flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2'>
            <div>
              <p className='text-[10px] text-blue-600 dark:text-blue-400 font-medium'>
                ID (Suporte)
              </p>
              <p className='text-sm font-bold text-blue-700 dark:text-blue-300 font-mono'>
                #{txId}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(txId)}
              className='p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors'
              title='Copiar ID'
            >
              <Copy className='w-3.5 h-3.5 text-blue-600 dark:text-blue-400' />
            </button>
          </div>

          {/* Grid de detalhes - Compacto */}
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
            {/* Tipo */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700'>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 mb-0.5'>Tipo</p>
              <div
                className={`flex items-center gap-1 text-xs font-semibold ${isReceive ? 'text-green-600' : 'text-blue-600'}`}
              >
                {isReceive ? (
                  <ArrowDownLeft className='w-3 h-3' />
                ) : (
                  <ArrowUpRight className='w-3 h-3' />
                )}
                {isReceive ? 'Recebido' : 'Enviado'}
              </div>
            </div>

            {/* Rede */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700'>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 mb-0.5'>Rede</p>
              <p className='text-xs font-semibold text-gray-900 dark:text-white'>
                {getNetworkName(tx.network)}
              </p>
            </div>

            {/* Valor */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700'>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 mb-0.5'>Valor</p>
              <div className='flex items-center gap-1'>
                <CryptoIcon symbol={tx.token_symbol || tx.network.toUpperCase()} size={14} />
                <p
                  className={`text-xs font-bold ${isReceive ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}
                >
                  {isReceive ? '+' : '-'}
                  {amount.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Taxa */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700'>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 mb-0.5'>Taxa</p>
              <p className='text-xs font-semibold text-gray-900 dark:text-white'>
                {tx.fee ? `${tx.fee}` : 'N/A'}
              </p>
            </div>

            {/* Data/Hora */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700'>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 mb-0.5'>Data/Hora</p>
              <p className='text-xs font-semibold text-gray-900 dark:text-white'>{dateTime.full}</p>
            </div>

            {/* Status */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700'>
              <p className='text-[10px] text-gray-500 dark:text-gray-400 mb-0.5'>Status</p>
              <div className='flex items-center gap-1'>{getStatusBadge(tx.status)}</div>
            </div>
          </div>

          {/* Endereços - Compacto */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            {/* De */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between mb-0.5'>
                <p className='text-[10px] text-gray-500 dark:text-gray-400'>De</p>
                <button
                  onClick={() => copyToClipboard(tx.from_address)}
                  className='p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                >
                  <Copy className='w-2.5 h-2.5 text-gray-400' />
                </button>
              </div>
              <p className='font-mono text-[10px] text-gray-900 dark:text-white truncate'>
                {tx.from_address}
              </p>
            </div>

            {/* Para */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between mb-0.5'>
                <p className='text-[10px] text-gray-500 dark:text-gray-400'>Para</p>
                <button
                  onClick={() => copyToClipboard(tx.to_address)}
                  className='p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                >
                  <Copy className='w-2.5 h-2.5 text-gray-400' />
                </button>
              </div>
              <p className='font-mono text-[10px] text-gray-900 dark:text-white truncate'>
                {tx.to_address}
              </p>
            </div>
          </div>

          {/* Hash */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between mb-0.5'>
              <p className='text-[10px] text-gray-500 dark:text-gray-400'>Hash</p>
              <div className='flex gap-0.5'>
                <button
                  onClick={() => copyToClipboard(tx.hash)}
                  className='p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                >
                  <Copy className='w-2.5 h-2.5 text-gray-400' />
                </button>
                <button
                  onClick={() => openExplorer(tx.hash, tx.network)}
                  className='p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                >
                  <ExternalLink className='w-2.5 h-2.5 text-gray-400' />
                </button>
              </div>
            </div>
            <p className='font-mono text-[10px] text-gray-900 dark:text-white break-all'>
              {tx.hash}
            </p>
          </div>

          {/* Botão Explorer */}
          <button
            onClick={() => openExplorer(tx.hash, tx.network)}
            className='w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs'
          >
            <ExternalLink className='w-3.5 h-3.5' />
            Ver no Explorer ({getNetworkName(tx.network)})
          </button>
        </div>
      )}
    </div>
  )
}

export const TransactionsPage = () => {
  // Estados de filtro e paginação
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all')
  const [networkFilter, setNetworkFilter] = useState<string>('all')
  const [sortType, setSortType] = useState<SortType>('recent')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showReportMenu, setShowReportMenu] = useState(false)

  // Dados - useWallets retorna { data, isLoading, etc } do React Query
  const { data: apiWallets } = useWallets()
  const firstWalletId = useMemo(() => {
    if (!apiWallets || apiWallets.length === 0) return undefined
    const wallet = apiWallets[0]
    return wallet ? String(wallet.id) : undefined
  }, [apiWallets])

  const {
    transactions: apiTransactions,
    isLoading,
    error,
    refreshTransactions,
  } = useTransactions({
    wallet_id: firstWalletId || '',
    limit: 100,
  })

  // Atualizar automaticamente a cada 30 segundos
  useEffect(() => {
    if (!firstWalletId) return
    const interval = setInterval(() => {
      refreshTransactions()
    }, 30000)
    return () => clearInterval(interval)
  }, [refreshTransactions, firstWalletId])

  // Determinar endereços da carteira
  const walletAddresses = useMemo(() => {
    if (!apiWallets) return []
    return apiWallets.filter((w: any) => w?.first_address).map((w: any) => String(w.first_address))
  }, [apiWallets])

  // Filtrar e ordenar transações
  const filteredTransactions = useMemo(() => {
    let filtered = apiTransactions || []

    // Filtro por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => {
        const isReceive = walletAddresses.some(
          (addr: string) => addr.toLowerCase() === tx.to_address.toLowerCase()
        )

        if (typeFilter === 'send') return !isReceive
        if (typeFilter === 'receive') return isReceive
        if (typeFilter === 'pending') return tx.status === 'pending'
        return true
      })
    }

    // Filtro por rede
    if (networkFilter !== 'all') {
      filtered = filtered.filter(tx => tx.network === networkFilter)
    }

    // Filtro por data
    let dateStart: Date | null = null
    let dateEnd: Date | null = null

    if (dateRange === 'custom') {
      if (customStartDate) dateStart = new Date(customStartDate)
      if (customEndDate) dateEnd = new Date(customEndDate)
    } else if (dateRange !== 'all') {
      const range = getDateRangeFilter(dateRange)
      dateStart = range.start
      dateEnd = range.end
    }

    if (dateStart || dateEnd) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at)
        if (dateStart && txDate < dateStart) return false
        if (dateEnd && txDate > dateEnd) return false
        return true
      })
    }

    // Filtro por busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        tx =>
          tx.hash.toLowerCase().includes(search) ||
          tx.from_address.toLowerCase().includes(search) ||
          tx.to_address.toLowerCase().includes(search)
      )
    }

    // Ordenação
    filtered.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      const amountA = Number.parseFloat(a.amount)
      const amountB = Number.parseFloat(b.amount)

      switch (sortType) {
        case 'recent':
          return timeB - timeA
        case 'oldest':
          return timeA - timeB
        case 'highest':
          return amountB - amountA
        case 'lowest':
          return amountA - amountB
        default:
          return 0
      }
    })

    return filtered
  }, [
    apiTransactions,
    typeFilter,
    networkFilter,
    searchTerm,
    sortType,
    walletAddresses,
    dateRange,
    customStartDate,
    customEndDate,
  ])

  // Redes únicas para filtro
  const uniqueNetworks = useMemo(() => {
    return Array.from(new Set(apiTransactions?.map(tx => tx.network) || []))
  }, [apiTransactions])

  // Copiar para clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  // Abrir explorer
  const handleOpenExplorer = (hash: string, network: string) => {
    const baseUrl = EXPLORER_URLS[network.toLowerCase()]
    if (baseUrl && hash) {
      // Garantir que o hash tenha o prefixo 0x para redes EVM
      let formattedHash = hash
      const evmNetworks = ['ethereum', 'polygon', 'bsc', 'base', 'avalanche']
      if (evmNetworks.includes(network.toLowerCase()) && !hash.startsWith('0x')) {
        formattedHash = `0x${hash}`
      }
      window.open(`${baseUrl}/${formattedHash}`, '_blank')
    }
  }

  if (!firstWalletId) {
    return (
      <div className='text-center py-12'>
        <AlertCircle className='w-12 h-12 text-gray-400 mx-auto mb-3' />
        <p className='text-gray-500 dark:text-gray-400'>Nenhuma carteira disponível</p>
      </div>
    )
  }

  // Download de relatório
  const downloadReport = (format: ReportFormat) => {
    if (!firstWalletId || !walletAddresses[0]) return

    let content = ''
    let filename = ''
    let type = ''

    const walletAddress = walletAddresses[0]

    if (format === 'csv') {
      content = generateCSV(filteredTransactions, firstWalletId, walletAddress)
      filename = `transacoes-${new Date().toISOString().split('T')[0]}.csv`
      type = 'text/csv'
    } else if (format === 'json') {
      content = generateJSON(filteredTransactions, firstWalletId, walletAddress)
      filename = `transacoes-${new Date().toISOString().split('T')[0]}.json`
      type = 'application/json'
    } else if (format === 'pdf') {
      content = generatePDF(filteredTransactions, firstWalletId, walletAddress)
      filename = `transacoes-${new Date().toISOString().split('T')[0]}.html`
      type = 'text/html'
    }

    const blob = new Blob([content], { type })
    const url = globalThis.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    globalThis.URL.revokeObjectURL(url)
    a.remove()
    toast.success(`Relatório ${format.toUpperCase()} baixado!`)
    setShowReportMenu(false)
  }

  // Paginação
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className='space-y-3'>
      {/* Header e Ações - Compacto */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center'>
            <Clock className='w-4 h-4 text-white' />
          </div>
          <div>
            <h1 className='text-lg font-bold text-gray-900 dark:text-white'>Transações</h1>
            <p className='text-[10px] text-gray-600 dark:text-gray-400'>
              {filteredTransactions.length} transações
            </p>
          </div>
        </div>
        <div className='flex gap-1.5'>
          <button
            onClick={() => refreshTransactions()}
            disabled={isLoading}
            className='flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors text-xs'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className='hidden sm:inline'>Atualizar</span>
          </button>

          {/* Report Menu */}
          <div className='relative'>
            <button
              onClick={() => setShowReportMenu(!showReportMenu)}
              className='flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-xs'
            >
              <Download className='w-3.5 h-3.5' />
              <span className='hidden sm:inline'>Relatório</span>
            </button>
            {showReportMenu && (
              <div className='absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[120px]'>
                <button
                  onClick={() => downloadReport('csv')}
                  className='block w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs text-gray-900 dark:text-white flex items-center gap-1.5'
                >
                  <FileText className='w-3.5 h-3.5' />
                  CSV
                </button>
                <button
                  onClick={() => downloadReport('json')}
                  className='block w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-700 flex items-center gap-1.5'
                >
                  <FileJson className='w-3.5 h-3.5' />
                  JSON
                </button>
                <button
                  onClick={() => downloadReport('pdf')}
                  className='block w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-700 flex items-center gap-1.5'
                >
                  <File className='w-3.5 h-3.5' />
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar - Compacto */}
      <div className='relative'>
        <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400' />
        <input
          type='text'
          placeholder='Buscar hash ou endereço...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        />
      </div>

      {/* Filters - Compacto */}
      <div className='space-y-2'>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className='flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs'
        >
          <Filter className='w-3.5 h-3.5' />
          Filtros
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {showFilters && (
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
            {/* Tipo */}
            <select
              title='Filtrar por tipo'
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as TransactionType)}
              className='px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs'
            >
              <option value='all'>Todos tipos</option>
              <option value='send'>Enviados</option>
              <option value='receive'>Recebidos</option>
              <option value='pending'>Pendentes</option>
            </select>

            {/* Rede */}
            <select
              title='Filtrar por rede'
              value={networkFilter}
              onChange={e => setNetworkFilter(e.target.value)}
              className='px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs'
            >
              <option value='all'>Todas redes</option>
              {uniqueNetworks.map(network => (
                <option key={network} value={network}>
                  {network.charAt(0).toUpperCase() + network.slice(1)}
                </option>
              ))}
            </select>

            {/* Período */}
            <select
              title='Filtrar por período'
              value={dateRange}
              onChange={e => {
                setDateRange(e.target.value as DateRange)
                setCurrentPage(1)
              }}
              className='px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs'
            >
              <option value='all'>Todos períodos</option>
              <option value='7d'>7 dias</option>
              <option value='30d'>30 dias</option>
              <option value='90d'>90 dias</option>
              <option value='custom'>Customizado</option>
            </select>

            {/* Ordenação */}
            <select
              title='Ordenar por'
              value={sortType}
              onChange={e => setSortType(e.target.value as SortType)}
              className='px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs'
            >
              <option value='recent'>Mais recente</option>
              <option value='oldest'>Mais antigo</option>
              <option value='highest'>Maior valor</option>
              <option value='lowest'>Menor valor</option>
            </select>

            {/* Data customizada - Start */}
            {dateRange === 'custom' && (
              <input
                type='date'
                title='Data inicial'
                placeholder='Data inicial'
                value={customStartDate}
                onChange={e => {
                  setCustomStartDate(e.target.value)
                  setCurrentPage(1)
                }}
                className='px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs'
              />
            )}

            {/* Data customizada - End */}
            {dateRange === 'custom' && (
              <input
                type='date'
                title='Data final'
                placeholder='Data final'
                value={customEndDate}
                onChange={e => {
                  setCustomEndDate(e.target.value)
                  setCurrentPage(1)
                }}
                className='px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs'
              />
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className='p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
          <p className='text-red-800 dark:text-red-400 text-xs'>{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className='flex items-center justify-center py-8'>
          <Loader2 className='w-6 h-6 animate-spin text-blue-500' />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredTransactions.length === 0 && (
        <div className='text-center py-8'>
          <AlertCircle className='w-10 h-10 text-gray-400 mx-auto mb-2' />
          <p className='text-gray-500 dark:text-gray-400 text-xs'>
            {searchTerm || typeFilter !== 'all' || networkFilter !== 'all' || dateRange !== 'all'
              ? 'Nenhuma transação encontrada'
              : 'Nenhuma transação ainda'}
          </p>
        </div>
      )}

      {/* Transactions List - Com scroll para mais de 5 transações */}
      {!isLoading && paginatedTransactions.length > 0 && (
        <div className='max-h-[380px] sm:max-h-[420px] lg:max-h-[500px] overflow-y-auto tx-scroll'>
          <div className='space-y-2 pr-1'>
            {paginatedTransactions.map(tx => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                walletAddresses={walletAddresses}
                copyToClipboard={handleCopyToClipboard}
                openExplorer={handleOpenExplorer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paginação - Compacta */}
      {!isLoading && filteredTransactions.length > ITEMS_PER_PAGE && (
        <div className='flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
          <p className='text-[10px] text-gray-600 dark:text-gray-400'>
            Pág {currentPage}/{totalPages} • {filteredTransactions.length} total
          </p>
          <div className='flex gap-1'>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className='px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              ←
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1
              const isVisible =
                Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages
              if (!isVisible && i !== 1 && i !== totalPages - 2) return null
              if (i === 1 && currentPage > 3)
                return (
                  <span key='dots-start' className='px-1 py-1 text-xs'>
                    ...
                  </span>
                )
              return (
                <button
                  key={page}
                  onClick={() => {
                    setCurrentPage(page)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    currentPage === page
                      ? 'bg-blue-500 text-white'
                      : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              )
            })}
            {totalPages > 3 && currentPage < totalPages - 2 && (
              <span className='px-1 py-1 text-xs'>...</span>
            )}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className='px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Last update info */}
      {!isLoading && filteredTransactions.length > 0 && (
        <p className='text-[10px] text-gray-500 dark:text-gray-400 text-center'>
          Atualizado em {new Date().toLocaleTimeString('pt-BR')}
        </p>
      )}
    </div>
  )
}
