import { useState, useMemo, useEffect } from 'react'
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  AlertCircle,
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
import { useWallets } from '@/hooks/useWallets'
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
  switch (status) {
    case 'confirmed':
      return (
        <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'>
          <CheckCircle className='w-3 h-3' />
          Confirmado
        </span>
      )
    case 'pending':
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
    default:
      return null
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
  const isReceive = walletAddresses.some(addr => addr.toLowerCase() === tx.to_address.toLowerCase())
  const amount = Number.parseFloat(tx.amount)

  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors items-center'>
      {/* Data */}
      <div className='text-xs sm:text-sm text-gray-600 dark:text-gray-400'>
        {new Date(tx.created_at).toLocaleDateString('pt-BR')}
      </div>

      {/* Tipo + Moeda */}
      <div className='flex items-center gap-2'>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
            isReceive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
          }`}
        >
          {isReceive ? (
            <ArrowDownLeft className='w-3 h-3 text-green-600 dark:text-green-400' />
          ) : (
            <ArrowUpRight className='w-3 h-3 text-blue-600 dark:text-blue-400' />
          )}
        </div>
        <div className='flex items-center gap-1'>
          <CryptoIcon symbol={tx.token_symbol || tx.network.toUpperCase()} size={20} />
          <span className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate'>
            {tx.token_symbol || tx.network.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Valor */}
      <div
        className={`text-xs sm:text-sm font-semibold text-right ${
          isReceive ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
        }`}
      >
        {isReceive ? '+' : '-'}
        {amount.toFixed(4)}
      </div>

      {/* Status (hidden on mobile) */}
      <div className='hidden sm:block'>{getStatusBadge(tx.status)}</div>

      {/* Rede (hidden on mobile) */}
      <div className='hidden md:block text-xs text-gray-600 dark:text-gray-400 text-center'>
        {tx.network}
      </div>

      {/* Ações */}
      <div className='flex justify-end gap-1'>
        <button
          onClick={() => copyToClipboard(tx.hash)}
          className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
          title='Copiar hash'
        >
          <Copy className='w-3.5 h-3.5 text-gray-500 dark:text-gray-400' />
        </button>
        <button
          onClick={() => openExplorer(tx.hash, tx.network)}
          className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
          title='Abrir no explorer'
        >
          <ExternalLink className='w-3.5 h-3.5 text-gray-500 dark:text-gray-400' />
        </button>
      </div>
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

  // Dados
  const { wallets: apiWallets } = useWallets()
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
    return apiWallets.filter(w => w?.first_address).map(w => String(w.first_address))
  }, [apiWallets])

  // Filtrar e ordenar transações
  const filteredTransactions = useMemo(() => {
    let filtered = apiTransactions || []

    // Filtro por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => {
        const isReceive = walletAddresses.some(
          addr => addr.toLowerCase() === tx.to_address.toLowerCase()
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
    const baseUrl = EXPLORER_URLS[network]
    if (baseUrl) {
      window.open(`${baseUrl}/${hash}`, '_blank')
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
    <div className='space-y-4 sm:space-y-6'>
      {/* Header e Ações */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white'>
            Transações
          </h1>
          <p className='text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1'>
            Total: {filteredTransactions.length} transações
          </p>
        </div>
        <div className='flex gap-2 w-full sm:w-auto'>
          <button
            onClick={() => refreshTransactions()}
            disabled={isLoading}
            className='flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm'
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className='hidden sm:inline'>Atualizar</span>
          </button>

          {/* Report Menu */}
          <div className='relative'>
            <button
              onClick={() => setShowReportMenu(!showReportMenu)}
              className='flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm'
            >
              <Download className='w-4 h-4' />
              <span className='hidden sm:inline'>Relatório</span>
            </button>
            {showReportMenu && (
              <div className='absolute right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[140px]'>
                <button
                  onClick={() => downloadReport('csv')}
                  className='block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white flex items-center gap-2'
                >
                  <FileText className='w-4 h-4' />
                  CSV
                </button>
                <button
                  onClick={() => downloadReport('json')}
                  className='block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-700 flex items-center gap-2'
                >
                  <FileJson className='w-4 h-4' />
                  JSON
                </button>
                <button
                  onClick={() => downloadReport('pdf')}
                  className='block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-700 flex items-center gap-2'
                >
                  <File className='w-4 h-4' />
                  PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
        <input
          type='text'
          placeholder='Buscar hash ou endereço...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        />
      </div>

      {/* Filters */}
      <div className='space-y-3'>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className='flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm'
        >
          <Filter className='w-4 h-4' />
          Filtros
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {showFilters && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
            {/* Tipo */}
            <select
              title='Filtrar por tipo'
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as TransactionType)}
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
            >
              <option value='all'>Todos os tipos</option>
              <option value='send'>Enviados</option>
              <option value='receive'>Recebidos</option>
              <option value='pending'>Pendentes</option>
            </select>

            {/* Rede */}
            <select
              title='Filtrar por rede'
              value={networkFilter}
              onChange={e => setNetworkFilter(e.target.value)}
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
            >
              <option value='all'>Todas as redes</option>
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
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
            >
              <option value='all'>Todos os períodos</option>
              <option value='7d'>Últimos 7 dias</option>
              <option value='30d'>Últimos 30 dias</option>
              <option value='90d'>Últimos 90 dias</option>
              <option value='custom'>Período customizado</option>
            </select>

            {/* Ordenação */}
            <select
              title='Ordenar por'
              value={sortType}
              onChange={e => setSortType(e.target.value as SortType)}
              className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
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
                className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
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
                className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
              />
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
          <p className='text-red-800 dark:text-red-400 text-sm'>{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-500' />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredTransactions.length === 0 && (
        <div className='text-center py-12'>
          <AlertCircle className='w-12 h-12 text-gray-400 mx-auto mb-3' />
          <p className='text-gray-500 dark:text-gray-400 text-sm'>
            {searchTerm || typeFilter !== 'all' || networkFilter !== 'all' || dateRange !== 'all'
              ? 'Nenhuma transação encontrada com esses filtros'
              : 'Nenhuma transação ainda'}
          </p>
        </div>
      )}

      {/* Transactions List */}
      {!isLoading && paginatedTransactions.length > 0 && (
        <div className='space-y-2 sm:space-y-3'>
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
      )}

      {/* Paginação */}
      {!isLoading && filteredTransactions.length > ITEMS_PER_PAGE && (
        <div className='flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
          <p className='text-xs sm:text-sm text-gray-600 dark:text-gray-400'>
            Página {currentPage} de {totalPages} • {filteredTransactions.length} transações
          </p>
          <div className='flex gap-2'>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className='px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1
              const isVisible =
                Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages
              if (!isVisible && i !== 1 && i !== totalPages - 2) return null
              if (i === 1 && currentPage > 3)
                return (
                  <span key='dots-start' className='px-2 py-1'>
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
                  className={`px-3 py-1 rounded text-sm transition-colors ${
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
              <span className='px-2 py-1'>...</span>
            )}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className='px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* Last update info */}
      {!isLoading && filteredTransactions.length > 0 && (
        <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
          Atualizado em {new Date().toLocaleTimeString('pt-BR')}
        </p>
      )}
    </div>
  )
}
