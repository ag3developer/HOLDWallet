import { apiClient } from './api'

export interface ValidateAddressRequest {
  address: string
  network: string
}

export interface ValidateAddressResponse {
  valid: boolean
  address: string
  network: string
  message: string
}

export interface EstimateFeeRequest {
  wallet_id: string
  to_address: string
  amount: string
  network: string
}

export interface FeeEstimates {
  slow_fee: string
  standard_fee: string
  fast_fee: string
}

export interface EstimateFeeResponse {
  fee_estimates: FeeEstimates
  currency: string
  network: string
}

export interface SendTransactionRequest {
  wallet_id: string
  to_address: string
  amount: string
  network: string
  fee_level: 'slow' | 'standard' | 'fast'
  mode?: 'custodial' | 'non-custodial'
  note?: string
  password?: string
  token_symbol?: string
  token_address?: string
  two_factor_token?: string
}

export interface SendTransactionResponse {
  success: boolean
  mode: 'custodial' | 'non-custodial'
  transaction_id?: number
  tx_hash?: string
  network: string
  from_address: string
  to_address: string
  amount: string
  fee: string
  status: string
  explorer_url?: string
  estimated_confirmation_time?: string
  message?: string
  transaction_data?: {
    transaction: any
    chain_id: number
    estimated_gas: number
    gas_price_gwei: string
  }
  instructions?: {
    metamask?: string
    trust_wallet?: string
    walletconnect?: string
  }
}

export interface TransactionStatusResponse {
  transaction_id: number
  status: string
  confirmations: number
  final: boolean
  tx_hash?: string
  block_number?: number
}

// Interface para validação pré-envio (consulta blockchain)
export interface ValidateSendRequest {
  wallet_id: string
  to_address: string
  amount: string
  network: string
  fee_level?: 'slow' | 'standard' | 'fast' | undefined
  token_symbol?: string | undefined
  token_address?: string | undefined
}

export interface ValidateSendResponse {
  valid: boolean
  error?: string
  message?: string
  from_address?: string
  to_address?: string
  amount?: string
  balance?: string
  token_balance?: string
  native_balance?: string
  gas_estimate?: string
  gas_required?: string
  total_required?: string
  remaining_after?: string
  shortfall?: string
  network?: string
  token_symbol?: string
  native_symbol?: string
  requires_auth?: boolean
}

class SendService {
  /**
   * PRÉ-VALIDAÇÃO DE TRANSAÇÃO
   * Deve ser chamado ANTES de pedir biometria/2FA
   * Verifica na blockchain: saldo real, gas disponível, endereço válido
   */
  async validateSend(data: ValidateSendRequest): Promise<ValidateSendResponse> {
    try {
      console.log('[SendService] Pre-validating transaction:', {
        wallet_id: data.wallet_id,
        to_address: data.to_address,
        amount: data.amount,
        network: data.network,
        token_symbol: data.token_symbol,
      })

      const response = await apiClient.post<ValidateSendResponse>('/wallets/validate-send', data)

      console.log('[SendService] Pre-validation response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('[SendService] Pre-validation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })

      // Retornar objeto de erro em vez de throw para manter compatibilidade
      return {
        valid: false,
        error: error.response?.data?.error || 'VALIDATION_FAILED',
        message:
          error.response?.data?.message || error.response?.data?.detail || 'Falha na validação',
      }
    }
  }

  /**
   * Validate a blockchain address
   */
  async validateAddress(data: ValidateAddressRequest): Promise<ValidateAddressResponse> {
    try {
      console.log('[SendService] Validating address:', {
        address: data.address,
        network: data.network,
      })

      const response = await apiClient.post<ValidateAddressResponse>(
        '/wallets/validate-address',
        data
      )

      console.log('[SendService] Validation response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('[SendService] Validation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      throw new Error(error.response?.data?.detail || 'Falha ao validar endereço')
    }
  }

  /**
   * Estimate transaction fees
   */
  async estimateFee(data: EstimateFeeRequest): Promise<EstimateFeeResponse> {
    try {
      console.log('[SendService] Estimating fees:', {
        wallet_id: data.wallet_id,
        to_address: data.to_address,
        amount: data.amount,
        network: data.network,
      })

      const response = await apiClient.post<EstimateFeeResponse>('/wallets/estimate-fee', data)

      console.log('[SendService] Fee estimation response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('[SendService] Fee estimation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      throw new Error(error.response?.data?.detail || 'Falha ao estimar taxas')
    }
  }

  /**
   * Send transaction (custodial or non-custodial mode)
   */
  async sendTransaction(data: SendTransactionRequest): Promise<SendTransactionResponse> {
    try {
      console.log('[SendService] Sending transaction:', {
        wallet_id: data.wallet_id,
        to_address: data.to_address,
        amount: data.amount,
        network: data.network,
        fee_level: data.fee_level,
        mode: data.mode || 'custodial',
        has_2fa_token: !!data.two_factor_token,
        token_length: data.two_factor_token?.length,
        token_value: data.two_factor_token, // TEMPORÁRIO - remover depois!
      })

      console.log('[SendService] Full request data:', data) // Ver tudo

      const response = await apiClient.post<SendTransactionResponse>('/wallets/send', {
        ...data,
        mode: data.mode || 'custodial', // Default to custodial mode
      })

      console.log('[SendService] Transaction response:', {
        success: response.data.success,
        tx_hash: response.data.tx_hash,
        status: response.data.status,
      })

      return response.data
    } catch (error: any) {
      console.error('[SendService] Transaction error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      throw new Error(error.response?.data?.detail || 'Falha ao enviar transação')
    }
  }

  /**
   * Send transaction in CUSTODIAL mode (backend signs)
   */
  async sendCustodial(
    data: Omit<SendTransactionRequest, 'mode'>
  ): Promise<SendTransactionResponse> {
    return this.sendTransaction({ ...data, mode: 'custodial' })
  }

  /**
   * Send transaction in NON-CUSTODIAL mode (prepare for external signing)
   */
  async sendNonCustodial(
    data: Omit<SendTransactionRequest, 'mode'>
  ): Promise<SendTransactionResponse> {
    return this.sendTransaction({ ...data, mode: 'non-custodial' })
  }

  /**
   * Get transaction status by ID
   */
  async getTransactionStatus(transactionId: number): Promise<TransactionStatusResponse> {
    const response = await apiClient.get<TransactionStatusResponse>(
      `/transactions/${transactionId}/status`
    )
    return response.data
  }
}

// Export singleton instance
export const sendService = new SendService()

// Also export the class for testing
export default SendService
