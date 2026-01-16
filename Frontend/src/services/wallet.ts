import { Wallet, Transaction, ApiResponse, PaginatedResponse } from '@/types'
import { apiClient } from './api'

interface NetworkBalance {
  network: string
  address: string
  balance: string
  balance_usd: string
  balance_brl: string
  last_updated?: string
}

interface WalletBalancesByNetwork {
  wallet_id: string
  wallet_name: string
  balances: Record<string, NetworkBalance>
  total_usd: string
  total_brl: string
}

interface CreateWalletRequest {
  name: string
  type: 'hot' | 'cold' | 'hardware' | 'multisig'
  coin: string
}

interface ImportWalletRequest {
  name: string
  type: 'hot' | 'cold' | 'hardware' | 'multisig'
  coin: string
  privateKey?: string
  mnemonic?: string
  address?: string
}

interface SendTransactionRequest {
  walletId: string
  toAddress: string
  amount: string
  memo?: string
  priority?: 'low' | 'medium' | 'high'
}

interface TransactionFilters {
  type?: string
  status?: string
  coin?: string
  startDate?: string
  endDate?: string
  minAmount?: string
  maxAmount?: string
}

class WalletService {
  // Get all user wallets
  async getWallets(): Promise<Wallet[]> {
    try {
      // 🔧 Use trailing slash to avoid 307 redirect (Safari iOS fix)
      const response = await apiClient.get<ApiResponse<Wallet[]>>('/wallets/')
      console.log('✅ Wallets response:', response.data)

      // Garantir que sempre retorna um array
      const wallets = response.data?.data || response.data || []
      console.log('✅ Wallets parsed:', wallets)

      return Array.isArray(wallets) ? wallets : []
    } catch (error: any) {
      // Log based on error type
      if (error.isNetworkError || error.code === 'ERR_NETWORK') {
        console.warn('⚠️ Network error fetching wallets (server may be offline)')
      } else if (error.code === 'TIMEOUT_ERROR') {
        console.warn('⚠️ Timeout fetching wallets')
      } else {
        console.error('❌ Error fetching wallets:', error)
      }
      
      // Re-throw with network error flag preserved
      throw error
    }
  }

  // Get specific wallet by ID
  async getWallet(walletId: string): Promise<Wallet> {
    const response = await apiClient.get<ApiResponse<Wallet>>(`/wallets/${walletId}`)
    return response.data.data
  }

  // Create new wallet
  async createWallet(walletData: CreateWalletRequest): Promise<Wallet> {
    // 🔧 Use trailing slash to avoid 307 redirect (Safari iOS fix)
    const response = await apiClient.post<ApiResponse<Wallet>>('/wallets/', walletData)
    return response.data.data
  }

  // Import existing wallet
  async importWallet(walletData: ImportWalletRequest): Promise<Wallet> {
    const response = await apiClient.post<ApiResponse<Wallet>>('/wallets/import', walletData)
    return response.data.data
  }

  // Update wallet name
  async updateWallet(
    walletId: string,
    updates: Partial<Pick<Wallet, 'name' | 'isActive'>>
  ): Promise<Wallet> {
    const response = await apiClient.put<ApiResponse<Wallet>>(`/wallets/${walletId}`, updates)
    return response.data.data
  }

  // Delete wallet
  async deleteWallet(walletId: string): Promise<void> {
    await apiClient.delete(`/wallets/${walletId}`)
  }

  // Get wallet balance
  async getWalletBalance(
    walletId: string,
    refresh?: boolean
  ): Promise<{ balance: string; balanceUSD: string }> {
    const params = refresh ? { refresh: 'true' } : {}
    const response = await apiClient.get<ApiResponse<{ balance: string; balanceUSD: string }>>(
      `/wallets/${walletId}/balance`,
      { params }
    )
    return response.data.data
  }

  // Get wallet balances by network (for multi-network wallets)
  async getWalletBalancesByNetwork(walletId: string): Promise<Record<string, NetworkBalance>> {
    console.log(`[DEBUG] Service: Fetching /wallets/${walletId}/balances with include_tokens=true`)
    const response = await apiClient.get<WalletBalancesByNetwork>(
      `/wallets/${walletId}/balances?include_tokens=true`
    )
    console.log(`[DEBUG] Service: Response received:`, response.data)
    // API retorna direto sem wrapper ApiResponse
    const balances = response.data.balances || {}
    console.log(`[DEBUG] Service: Extracted balances:`, balances)
    return balances
  }

  // Get wallet address for receiving
  async getReceiveAddress(walletId: string): Promise<{ address: string; qrCode: string }> {
    const response = await apiClient.get<ApiResponse<{ address: string; qrCode: string }>>(
      `/wallets/${walletId}/receive`
    )
    return response.data.data
  }

  // Send transaction
  async sendTransaction(transactionData: SendTransactionRequest): Promise<Transaction> {
    const response = await apiClient.post<ApiResponse<Transaction>>(
      '/transactions/send',
      transactionData
    )
    return response.data.data
  }

  // Estimate transaction fee
  async estimateFee(
    walletId: string,
    toAddress: string,
    amount: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<{ fee: string; feeUSD: string }> {
    const response = await apiClient.post<ApiResponse<{ fee: string; feeUSD: string }>>(
      '/transactions/estimate-fee',
      {
        walletId,
        toAddress,
        amount,
        priority,
      }
    )
    return response.data.data
  }

  // Get wallet transactions
  async getWalletTransactions(
    walletId: string,
    page = 1,
    limit = 20,
    filters?: TransactionFilters
  ): Promise<PaginatedResponse<Transaction>> {
    const params = { page: page.toString(), limit: limit.toString(), ...filters }
    const response = await apiClient.get<PaginatedResponse<Transaction>>(
      `/wallets/${walletId}/transactions`,
      { params }
    )
    return response.data
  }

  // Get all user transactions
  async getTransactions(
    page = 1,
    limit = 20,
    filters?: TransactionFilters
  ): Promise<PaginatedResponse<Transaction>> {
    const params = { page: page.toString(), limit: limit.toString(), ...filters }
    const response = await apiClient.get<PaginatedResponse<Transaction>>('/transactions', {
      params,
    })
    return response.data
  }

  // Get specific transaction
  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await apiClient.get<ApiResponse<Transaction>>(`/transactions/${transactionId}`)
    return response.data.data
  }

  // Cancel pending transaction
  async cancelTransaction(transactionId: string): Promise<Transaction> {
    const response = await apiClient.post<ApiResponse<Transaction>>(
      `/transactions/${transactionId}/cancel`
    )
    return response.data.data
  }

  // Resend failed transaction
  async resendTransaction(transactionId: string): Promise<Transaction> {
    const response = await apiClient.post<ApiResponse<Transaction>>(
      `/transactions/${transactionId}/resend`
    )
    return response.data.data
  }

  // Get supported coins
  async getSupportedCoins(): Promise<
    { coin: string; name: string; icon: string; decimals: number; networks: string[] }[]
  > {
    const response = await apiClient.get<
      ApiResponse<
        { coin: string; name: string; icon: string; decimals: number; networks: string[] }[]
      >
    >('/wallets/supported-coins')
    return response.data.data
  }

  // Validate wallet address
  async validateAddress(
    coin: string,
    address: string
  ): Promise<{ isValid: boolean; network?: string }> {
    const response = await apiClient.post<ApiResponse<{ isValid: boolean; network?: string }>>(
      '/wallets/validate-address',
      {
        coin,
        address,
      }
    )
    return response.data.data
  }

  // Export wallet (private key or mnemonic)
  async exportWallet(
    walletId: string,
    password: string
  ): Promise<{ privateKey?: string; mnemonic?: string }> {
    const response = await apiClient.post<ApiResponse<{ privateKey?: string; mnemonic?: string }>>(
      `/wallets/${walletId}/export`,
      {
        password,
      }
    )
    return response.data.data
  }

  // Backup wallet
  async backupWallet(walletId: string): Promise<{ backupData: string; checksum: string }> {
    const response = await apiClient.get<ApiResponse<{ backupData: string; checksum: string }>>(
      `/wallets/${walletId}/backup`
    )
    return response.data.data
  }

  // Restore wallet from backup
  async restoreWallet(backupData: string, checksum: string, newName?: string): Promise<Wallet> {
    const response = await apiClient.post<ApiResponse<Wallet>>('/wallets/restore', {
      backupData,
      checksum,
      name: newName,
    })
    return response.data.data
  }

  // Get wallet statistics
  async getWalletStats(
    walletId: string,
    period: '24h' | '7d' | '30d' | '1y' = '30d'
  ): Promise<{
    totalReceived: string
    totalSent: string
    transactionCount: number
    avgTransactionSize: string
    balanceHistory: { date: string; balance: string; balanceUSD: string }[]
  }> {
    const response = await apiClient.get<ApiResponse<any>>(`/wallets/${walletId}/stats`, {
      params: { period },
    })
    return response.data.data
  }
}

export const walletService = new WalletService()
