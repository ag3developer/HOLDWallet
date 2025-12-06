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
      const response = await this.apiClient.post<WalletWithMnemonic>('/wallets/create', walletData)
      return response.data
    } catch (error: any) {
      console.error('Error creating wallet:', error)
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao criar carteira. Tente novamente.'
      )
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
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao carregar carteiras.'
      )
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
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao carregar carteira.'
      )
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
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao atualizar carteira.'
      )
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
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao excluir carteira.'
      )
    }
  }

  /**
   * Criar novo endereço na carteira
   */
  async createAddress(walletId: number, addressType: string = 'receiving'): Promise<AddressResponse> {
    try {
      const response = await this.apiClient.post<AddressResponse>(
        `/wallets/${walletId}/addresses`, 
        { address_type: addressType }
      )
      return response.data
    } catch (error: any) {
      console.error('Error creating address:', error)
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao gerar novo endereço.'
      )
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
      throw new Error(
        error.response?.data?.detail || 
        'Erro ao carregar endereços.'
      )
    }
  }

  /**
   * Obter endereço de rede específica para carteira multi
   * Busca endereço existente para a rede solicitada
   */
  async getNetworkAddress(walletId: string, network: string): Promise<string> {
    try {
      const response = await this.apiClient.get<AddressResponse[]>(`/wallets/${walletId}/addresses`)
      
      // Procurar endereço existente para a rede
      const networkAddress = response.data.find(addr => 
        addr.network === network && addr.is_active
      )
      
      if (networkAddress) {
        return networkAddress.address
      }
      
      // Se não existe endereço, retornar vazio
      // O backend deve gerar endereços para todas as redes ao criar carteira multi
      console.warn(`No ${network} address found for wallet ${walletId}`)
      return ''
      
    } catch (error: any) {
      console.error(`Error fetching ${network} address:`, error)
      return '' // Retornar vazio se falhar
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
        description: 'Suporta múltiplas criptomoedas com uma única seed phrase'
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
      { id: 'xrp', name: 'XRP', symbol: 'XRP', icon: '◈' }
    ]
  }
}

export const walletService = new WalletService()
