import { apiClient } from './api'

export interface Transaction {
  id: string
  hash: string
  from_address: string
  to_address: string
  amount: string
  fee?: string
  status: 'pending' | 'confirmed' | 'failed'
  block_number?: number
  network: string
  token_address?: string
  token_symbol?: string
  created_at: string
  confirmed_at?: string
}

export interface TransactionListResponse {
  transactions: Transaction[]
  total_count: number
  offset: number
  limit: number
}

export interface TransactionFilters {
  wallet_id?: string
  network?: string
  status?: string
  limit?: number
  offset?: number
  date_from?: string
  date_to?: string
}

class TransactionService {
  private readonly apiClient = apiClient

  /**
   * Buscar histórico de transações do usuário
   */
  async getTransactions(filters?: TransactionFilters): Promise<TransactionListResponse> {
    try {
      const params = new URLSearchParams()
      
      if (filters?.wallet_id) params.append('wallet_id', filters.wallet_id)
      if (filters?.network) params.append('network', filters.network)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())
      if (filters?.date_from) params.append('date_from', filters.date_from)
      if (filters?.date_to) params.append('date_to', filters.date_to)
      
      const queryString = params.toString()
      const url = `/tx/${queryString ? `?${queryString}` : ''}`
      
      const response = await this.apiClient.get<TransactionListResponse>(url)
      return response.data
    } catch (error: any) {
      console.error('Error fetching transactions:', error)
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao buscar transações. Tente novamente.'
      )
    }
  }

  /**
   * Buscar uma transação específica
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    try {
      const response = await this.apiClient.get<Transaction>(`/tx/${transactionId}`)
      return response.data
    } catch (error: any) {
      console.error('Error fetching transaction:', error)
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao buscar transação. Tente novamente.'
      )
    }
  }

  /**
   * Sincronizar transações de uma carteira
   */
  async syncWalletTransactions(walletId: string): Promise<{ message: string; synced_count: number }> {
    try {
      const response = await this.apiClient.post<{ message: string; synced_count: number }>(
        `/tx/sync/${walletId}`
      )
      return response.data
    } catch (error: any) {
      console.error('Error syncing transactions:', error)
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao sincronizar transações. Tente novamente.'
      )
    }
  }

  /**
   * Buscar transações reais do blockchain para uma carteira
   */
  async getWalletBlockchainTransactions(
    walletId: string, 
    network?: string, 
    limit: number = 50
  ): Promise<TransactionListResponse> {
    try {
      const params = new URLSearchParams()
      if (network) params.append('network', network)
      params.append('limit', limit.toString())
      
      const queryString = params.toString()
      const url = `/wallets/${walletId}/transactions${queryString ? `?${queryString}` : ''}`
      
      console.log(`[DEBUG] Fetching blockchain transactions: ${url}`)
      const response = await this.apiClient.get<{
        wallet_id: string
        wallet_name: string
        transactions: Transaction[]
        total: number
      }>(url)
      
      console.log(`[DEBUG] Blockchain transactions received:`, response.data)
      
      return {
        transactions: response.data.transactions,
        total_count: response.data.total,
        offset: 0,
        limit
      }
    } catch (error: any) {
      console.error('Error fetching blockchain transactions:', error)
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao buscar transações do blockchain. Tente novamente.'
      )
    }
  }

  /**
   * Formatar valor para exibição
   */
  formatAmount(amount: string, decimals: number = 8): string {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0'
    
    // Se for muito pequeno, usar notação científica
    if (num < 0.00000001 && num > 0) {
      return num.toExponential(2)
    }
    
    return num.toFixed(decimals).replace(/\.?0+$/, '')
  }

  /**
   * Determinar tipo de transação (enviado/recebido)
   */
  getTransactionType(transaction: Transaction, userAddresses: string[]): 'send' | 'receive' {
    const fromLower = transaction.from_address.toLowerCase()
    const toLower = transaction.to_address.toLowerCase()
    const userAddressesLower = userAddresses.map(addr => addr.toLowerCase())
    
    // Se o endereço de origem está nas carteiras do usuário, é envio
    if (userAddressesLower.includes(fromLower)) {
      return 'send'
    }
    
    // Se o endereço de destino está nas carteiras do usuário, é recebimento
    if (userAddressesLower.includes(toLower)) {
      return 'receive'
    }
    
    // Default: recebimento
    return 'receive'
  }

  /**
   * Formatar hash para exibição curta
   */
  formatHash(hash: string, chars: number = 6): string {
    if (!hash || hash.length <= chars * 2) return hash
    return `${hash.substring(0, chars)}...${hash.substring(hash.length - chars)}`
  }

  /**
   * Obter URL do explorador de blockchain
   */
  getExplorerUrl(network: string, hash: string): string {
    const explorers: Record<string, string> = {
      'ethereum': `https://etherscan.io/tx/${hash}`,
      'eth': `https://etherscan.io/tx/${hash}`,
      'polygon': `https://polygonscan.com/tx/${hash}`,
      'bsc': `https://bscscan.com/tx/${hash}`,
      'bitcoin': `https://blockstream.info/tx/${hash}`,
      'btc': `https://blockstream.info/tx/${hash}`,
      'multi': `https://etherscan.io/tx/${hash}`, // Default para multi (EVM)
    }
    
    return explorers[network.toLowerCase()] || `https://etherscan.io/tx/${hash}`
  }
}

export const transactionService = new TransactionService()
