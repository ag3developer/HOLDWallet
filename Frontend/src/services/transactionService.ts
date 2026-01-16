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
  total: number
  total_count?: number // Para compatibilidade
  offset: number
  limit: number
  has_more?: boolean
}

// Getter para total_count (compatibilidade)
export const getTotalCount = (response: TransactionListResponse): number => {
  return response.total_count ?? response.total
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
      throw new Error(error.response?.data?.detail || 'Erro ao buscar transações. Tente novamente.')
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
      throw new Error(error.response?.data?.detail || 'Erro ao buscar transação. Tente novamente.')
    }
  }

  /**
   * Sincronizar transações de uma carteira
   */
  async syncWalletTransactions(
    walletId: string
  ): Promise<{ message: string; synced_count: number }> {
    try {
      const response = await this.apiClient.post<{ message: string; synced_count: number }>(
        `/tx/sync/${walletId}`
      )
      return response.data
    } catch (error: any) {
      console.error('Error syncing transactions:', error)
      throw new Error(
        error.response?.data?.detail || 'Erro ao sincronizar transações. Tente novamente.'
      )
    }
  }

  /**
   * Atualizar status de transações pendentes
   * Verifica na blockchain se transações pendentes foram confirmadas ou falharam
   */
  async refreshPendingTransactions(): Promise<{
    success: boolean
    checked: number
    updated: number
    confirmed: string[]
    failed: string[]
    message: string
  }> {
    try {
      const response = await this.apiClient.post<{
        success: boolean
        checked: number
        updated: number
        confirmed: string[]
        failed: string[]
        message: string
      }>('/tx/refresh-pending')
      return response.data
    } catch (error: any) {
      console.error('Error refreshing pending transactions:', error)
      throw new Error(error.response?.data?.detail || 'Erro ao atualizar transações pendentes.')
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
        total: response.data.total,
        total_count: response.data.total,
        offset: 0,
        limit,
      }
    } catch (error: any) {
      console.error('Error fetching blockchain transactions:', error)
      throw new Error(
        error.response?.data?.detail || 'Erro ao buscar transações do blockchain. Tente novamente.'
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
      ethereum: `https://etherscan.io/tx/${hash}`,
      eth: `https://etherscan.io/tx/${hash}`,
      polygon: `https://polygonscan.com/tx/${hash}`,
      bsc: `https://bscscan.com/tx/${hash}`,
      bitcoin: `https://blockstream.info/tx/${hash}`,
      btc: `https://blockstream.info/tx/${hash}`,
      multi: `https://etherscan.io/tx/${hash}`, // Default para multi (EVM)
    }

    return explorers[network.toLowerCase()] || `https://etherscan.io/tx/${hash}`
  }

  /**
   * Etapa 1: Enviar transação (create, sign e broadcast em um único passo)
   */
  async sendTransactionDirect(data: {
    wallet_id?: string
    from_address?: string
    to_address: string
    amount: string
    network: string
    fee_level?: 'slow' | 'standard' | 'fast'
    fee_preference?: 'safe' | 'standard' | 'fast'
    note?: string
    memo?: string
    password?: string
    token_address?: string
    token_symbol?: string
    two_factor_token?: string
  }): Promise<any> {
    try {
      // Normalizar nomes de parâmetros para o backend
      const payload: Record<string, any> = {
        to_address: data.to_address,
        amount: data.amount,
        network: data.network,
        fee_level: data.fee_level || data.fee_preference || 'standard',
        ...(data.password && { password: data.password }),
        ...(data.note && { note: data.note }),
        ...(data.memo && { note: data.memo }),
        ...(data.token_symbol && { token_symbol: data.token_symbol }),
        ...(data.token_address && { token_address: data.token_address }),
        ...(data.two_factor_token && { two_factor_token: data.two_factor_token }),
      }

      // Se temos wallet_id, usar o endpoint com wallet_id
      if (data.wallet_id) {
        payload.wallet_id = data.wallet_id
      }

      const response = await this.apiClient.post('/wallets/send', payload)
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao enviar transação'
      throw new Error(message)
    }
  }

  /**
   * Legacy: Etapa 1: Criar transação (unsigned) - DEPRECATED
   */
  async createTransaction(data: {
    from_address: string
    to_address: string
    amount: string
    network: string
    fee_preference: 'safe' | 'standard' | 'fast'
    memo?: string
    token_address?: string
  }): Promise<any> {
    try {
      const response = await this.apiClient.post('/wallets/send', {
        to_address: data.to_address,
        amount: data.amount,
        network: data.network,
        fee_level: data.fee_preference || 'standard',
        ...(data.memo && { note: data.memo }),
      })
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao criar transação'
      throw new Error(message)
    }
  }

  /**
   * Legacy: Etapa 2: Assinar transação - DEPRECATED
   */
  async signTransaction(data: { transaction_id: number; password?: string }): Promise<any> {
    // O novo endpoint já faz assinatura automaticamente
    return { signed: true }
  }

  /**
   * Legacy: Etapa 3: Fazer broadcast da transação - DEPRECATED
   */
  async broadcastTransaction(data: { transaction_id: number }): Promise<any> {
    // O novo endpoint já faz broadcast automaticamente
    return { broadcasted: true }
  }

  /**
   * Verificar status de uma transação
   */
  async getTransactionStatus(transactionId: number): Promise<any> {
    try {
      const response = await this.apiClient.get(`/transactions/status/${transactionId}`)
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao verificar status'
      throw new Error(message)
    }
  }

  /**
   * Fluxo completo: criar, assinar e fazer broadcast (novo endpoint unificado)
   */
  async sendTransaction(
    createData: {
      from_address?: string
      to_address: string
      amount: string
      network: string
      fee_preference?: 'safe' | 'standard' | 'fast'
      memo?: string
      token_address?: string
      token_symbol?: string
      wallet_id?: string
    },
    signPassword?: string,
    twoFactorToken?: string
  ): Promise<{
    transactionId: number
    txHash: string
    status: string
  }> {
    try {
      console.log('📝 Enviando transação (tudo em um)...')
      console.log('Token 2FA recebido:', twoFactorToken)
      console.log('Token Symbol:', createData.token_symbol)

      const payload: {
        wallet_id?: string
        from_address?: string
        to_address: string
        amount: string
        network: string
        fee_level?: 'slow' | 'standard' | 'fast'
        fee_preference?: 'safe' | 'standard' | 'fast'
        note?: string
        memo?: string
        password?: string
        token_address?: string
        token_symbol?: string
        two_factor_token?: string
      } = {
        to_address: createData.to_address,
        amount: createData.amount,
        network: createData.network,
        fee_level:
          (createData.fee_preference === 'safe' ? 'slow' : createData.fee_preference) || 'standard', // ✅ Converter fee_preference para fee_level (safe -> slow)
      }

      if (createData.memo) payload.note = createData.memo // ✅ Usar "note" em vez de "memo"
      if (signPassword) payload.password = signPassword
      if (createData.wallet_id) payload.wallet_id = createData.wallet_id
      if (createData.token_address) payload.token_address = createData.token_address
      if (createData.token_symbol) {
        payload.token_symbol = createData.token_symbol
        console.log('✓ Token symbol adicionado ao payload:', createData.token_symbol)
      }
      if (twoFactorToken) {
        payload.two_factor_token = twoFactorToken
        console.log('✓ Token 2FA adicionado ao payload:', twoFactorToken)
      } else {
        console.warn('⚠️ Token 2FA não foi fornecido')
      }

      console.log('Payload a ser enviado:', payload)
      const response = await this.sendTransactionDirect(payload)

      console.log('✅ Transação enviada com sucesso!')
      return {
        transactionId: response.transaction_id,
        txHash: response.tx_hash,
        status: response.status,
      }
    } catch (error: any) {
      console.error('❌ Erro no fluxo de transação:', error.message)
      throw error
    }
  }

  /**
   * Estimar taxa de transação
   */
  async estimateFee(estimateData: {
    wallet_id: string
    to_address: string
    amount: string
    network: string
  }): Promise<{
    fee_estimates: {
      slow_fee: string
      standard_fee: string
      fast_fee: string
    }
    currency: string
    network: string
  }> {
    try {
      console.log('💰 Estimando taxa de gás...')
      const payload = {
        wallet_id: estimateData.wallet_id,
        to_address: estimateData.to_address,
        amount: estimateData.amount,
        network: estimateData.network,
      }

      const response = await this.apiClient.post<{
        fee_estimates: {
          slow_fee: string
          standard_fee: string
          fast_fee: string
        }
        currency: string
        network: string
      }>('/wallets/estimate-fee', payload)

      console.log('✅ Taxas estimadas com sucesso:', response.data)
      return response.data
    } catch (error: any) {
      console.error('❌ Erro ao estimar taxa:', error.message)
      throw new Error(
        error.response?.data?.detail || 'Erro ao estimar taxa de gás. Tente novamente.'
      )
    }
  }
}

export const transactionService = new TransactionService()
