import { apiClient } from './api'
import { authService } from './auth'

export interface WalletCreate {
  name: string
  network: string
  passphrase?: string
}

export interface WalletRestore {
  name: string
  network: string
  mnemonic: string
  passphrase?: string
}

export interface WalletResponse {
  id: number
  name: string
  network: string
  derivation_path?: string
  first_address?: string
  created_at: string
  is_active: boolean
  restored?: boolean
}

export interface WalletWithMnemonic extends WalletResponse {
  mnemonic?: string
}

export interface AddressResponse {
  id: number
  address: string
  network?: string
  address_type: string
  derivation_index?: number
  derivation_path?: string
  is_active: boolean
  created_at: string
}

export interface WalletBalance {
  wallet_id: number
  network: string
  native_balance: string
  token_balances: Record<string, string>
  total_usd_value: string
  last_updated?: string
}

export interface WalletWithBalance extends WalletResponse {
  balance?: WalletBalance
}

class WalletService {
  private readonly apiClient = apiClient
  private readonly authService = authService

  /**
   * Criar nova carteira
   */
  async createWallet(walletData: WalletCreate): Promise<WalletWithMnemonic> {
    try {
      console.log('[WalletService] 📤 POST /wallets/create with data:', walletData)
      const response = await this.apiClient.post<WalletWithMnemonic>('/wallets/create', walletData)
      console.log('[WalletService] ✅ Response received:', response.data)
      return response.data
    } catch (error: any) {
      console.error('[WalletService] ❌ FULL Error object:', error)
      console.error('[WalletService] ❌ Error type:', typeof error, error.constructor.name)
      console.error('[WalletService] ❌ Error message:', error.message)
      console.error('[WalletService] ❌ Error response:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      })

      // Try to extract meaningful error message
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Erro ao criar carteira. Tente novamente.'

      // Create a new error preserving all info
      const newError = new Error(errorMessage)
      ;(newError as any).status = error.response?.status
      ;(newError as any).code = error.code
      ;(newError as any).details = error.response?.data
      ;(newError as any).originalError = error

      throw newError
    }
  }

  /**
   * Restaurar carteira existente
   */
  async restoreWallet(walletData: WalletRestore): Promise<WalletResponse> {
    try {
      const response = await this.apiClient.post<WalletResponse>('/wallets/restore', walletData)
      return response.data
    } catch (error: any) {
      console.error('Error restoring wallet:', error)
      throw new Error(
        error.response?.data?.detail ||
          'Erro ao restaurar carteira. Verifique a frase de recuperação.'
      )
    }
  }

  /**
   * Listar carteiras do usuário
   */
  async getWallets(): Promise<WalletWithBalance[]> {
    try {
      const response = await this.apiClient.get<WalletWithBalance[]>('/wallets/')
      return response.data
    } catch (error: any) {
      console.error('Error fetching wallets:', error)
      throw new Error(error.response?.data?.detail || 'Erro ao carregar carteiras.')
    }
  }

  /**
   * Obter carteira por ID
   */
  async getWallet(walletId: number): Promise<WalletWithBalance> {
    try {
      const response = await this.apiClient.get<WalletWithBalance>(`/wallets/${walletId}`)
      return response.data
    } catch (error: any) {
      console.error('Error fetching wallet:', error)
      if (error.response?.status === 404) {
        throw new Error('Carteira não encontrada.')
      }
      throw new Error(error.response?.data?.detail || 'Erro ao carregar carteira.')
    }
  }

  /**
   * Atualizar carteira
   */
  async updateWallet(walletId: number, updates: { name?: string }): Promise<WalletResponse> {
    try {
      const response = await this.apiClient.put<WalletResponse>(`/wallets/${walletId}`, updates)
      return response.data
    } catch (error: any) {
      console.error('Error updating wallet:', error)
      if (error.response?.status === 404) {
        throw new Error('Carteira não encontrada.')
      }
      throw new Error(error.response?.data?.detail || 'Erro ao atualizar carteira.')
    }
  }

  /**
   * Excluir carteira (desativar)
   */
  async deleteWallet(walletId: number): Promise<void> {
    try {
      await this.apiClient.delete(`/wallets/${walletId}`)
    } catch (error: any) {
      console.error('Error deleting wallet:', error)
      if (error.response?.status === 404) {
        throw new Error('Carteira não encontrada.')
      }
      throw new Error(error.response?.data?.detail || 'Erro ao excluir carteira.')
    }
  }

  /**
   * Criar novo endereço na carteira
   */
  async createAddress(
    walletId: string | number,
    addressType: string = 'receiving',
    network?: string
  ): Promise<AddressResponse> {
    try {
      const params = new URLSearchParams({
        address_type: addressType,
        ...(network && { network }),
      }).toString()

      console.log(
        `[WalletService] 📝 Creating address for wallet ${walletId} on network ${network || 'auto'}`
      )

      const response = await this.apiClient.post<AddressResponse>(
        `/wallets/${walletId}/addresses?${params}`,
        {}
      )

      console.log(
        `[WalletService] ✅ Address created: ${response.data.address.substring(0, 10)}...`
      )
      return response.data
    } catch (error: any) {
      console.error('Error creating address:', error)
      throw new Error(error.response?.data?.detail || 'Erro ao gerar novo endereço.')
    }
  }

  /**
   * Listar endereços da carteira
   */
  async getAddresses(walletId: number): Promise<AddressResponse[]> {
    try {
      const response = await this.apiClient.get<AddressResponse[]>(`/wallets/${walletId}/addresses`)
      return response.data
    } catch (error: any) {
      console.error('Error fetching addresses:', error)
      throw new Error(error.response?.data?.detail || 'Erro ao carregar endereços.')
    }
  }

  /**
   * Obter endereço de rede específica para carteira multi
   * Busca endereço existente para a rede solicitada
   * Se não existir, gera um novo automaticamente (lazy loading)
   * Com retry automático e tratamento silencioso de erros de rede
   */
  async getNetworkAddress(walletId: string, network: string, retries = 2): Promise<string> {
    try {
      // Apenas log se for a primeira tentativa
      if (retries === 2) {
        console.log(`[WalletService] 🔍 Fetching ${network} address for wallet ${walletId}`)
      }

      const response = await this.apiClient.get<AddressResponse[]>(`/wallets/${walletId}/addresses`)

      // Procurar endereço existente para a rede
      const networkAddress = response.data.find(addr => addr.network === network && addr.is_active)

      if (networkAddress) {
        console.log(
          `[WalletService] ✅ Found existing ${network} address: ${networkAddress.address.substring(0, 10)}...`
        )
        return networkAddress.address
      }

      // Se não existe endereço, gerar um novo automaticamente
      console.warn(
        `[WalletService] ⚠️ No ${network} address found for wallet ${walletId}, generating new one...`
      )

      try {
        // Tentar gerar novo endereço para a rede específica (sem Number() conversion)
        const newAddress = await this.createAddress(walletId, 'receiving', network)
        console.log(
          `[WalletService] ✅ Generated new ${network} address: ${newAddress.address.substring(0, 10)}...`
        )
        return newAddress.address
      } catch (createError: unknown) {
        console.warn(
          `[WalletService] ⚠️ Could not generate ${network} address:`,
          createError instanceof Error ? createError.message : 'Backend may be offline'
        )
        return ''
      }
    } catch (error: any) {
      // Check if it's a network error and we have retries left
      const isNetworkError = error.code === 'ERR_NETWORK' || error.message?.includes('Network')

      if (isNetworkError && retries > 0) {
        // Wait a bit before retrying (exponential backoff)
        const delay = (3 - retries) * 500 // 500ms, 1000ms
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.getNetworkAddress(walletId, network, retries - 1)
      }

      // Apenas log silencioso do erro - não quebrar a UI
      if (retries === 0) {
        console.warn(
          `[WalletService] ⚠️ ${network} address unavailable after retries (backend may be offline)`
        )
      }
      return ''
    }
  }

  /**
   * Obter redes suportadas
   */
  getSupportedNetworks() {
    return [
      {
        id: 'multi',
        name: 'Carteira Multi-Rede',
        symbol: 'MULTI',
        icon: '🔗',
        description: 'Suporta múltiplas criptomoedas com uma única seed phrase',
      },
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
      { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' },
      { id: 'polygon', name: 'Polygon', symbol: 'MATIC', icon: '◊' },
      { id: 'bsc', name: 'Binance Smart Chain', symbol: 'BNB', icon: '⚡' },
      { id: 'solana', name: 'Solana', symbol: 'SOL', icon: '◎' },
      { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', icon: 'Ł' },
      { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', icon: 'Ð' },
      { id: 'cardano', name: 'Cardano', symbol: 'ADA', icon: '₳' },
      { id: 'avalanche', name: 'Avalanche', symbol: 'AVAX', icon: '🔺' },
      { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', icon: '●' },
      { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', icon: '🔗' },
      { id: 'xrp', name: 'XRP', symbol: 'XRP', icon: '◈' },
    ]
  }
}

export const walletService = new WalletService()
