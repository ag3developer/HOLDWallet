/**
 * WolkPay Service
 * ===============
 *
 * Serviço para comunicação com a API WolkPay.
 * Permite pagamento por terceiros para aquisição de crypto.
 */

import { apiClient } from './api'

// ============================================
// TYPES
// ============================================

export type FeePayer = 'BENEFICIARY' | 'PAYER'

export interface CreateInvoiceRequest {
  crypto_currency: string
  crypto_amount: string | number
  crypto_network?: string
  fee_payer?: FeePayer // Quem paga as taxas: BENEFICIARY (padrão) ou PAYER
}

export interface Invoice {
  id: string
  invoice_number: string
  status: InvoiceStatus
  beneficiary_name?: string
  beneficiary_id: string
  crypto_currency: string
  crypto_amount: number
  crypto_network?: string
  usd_rate: number
  brl_rate: number
  base_amount_brl: number
  service_fee_percent: number
  service_fee_brl: number
  network_fee_percent: number
  network_fee_brl: number
  total_amount_brl: number
  fee_payer?: FeePayer
  beneficiary_receives_brl?: number
  checkout_token: string
  checkout_url?: string
  created_at: string
  expires_at: string
  expires_in_seconds?: number
  // Dados da transação blockchain (quando crypto é enviada)
  crypto_tx_hash?: string
  crypto_tx_network?: string
  crypto_wallet_address?: string
  crypto_sent_at?: string
  crypto_explorer_url?: string
}

export interface InvoiceCreatedResponse {
  invoice: Invoice
  share_url: string
  share_qr_code?: string
  message: string
}

export interface InvoiceListResponse {
  invoices: Invoice[]
  total: number
  page: number
  per_page: number
}

export type InvoiceStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'APPROVED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REJECTED'

export interface CheckoutData {
  invoice_id: string
  invoice_number: string
  status: string
  beneficiary_name: string
  beneficiary_uid: string
  beneficiary_verified: boolean
  crypto_currency: string
  crypto_amount: number
  total_amount_brl: number
  // Info de quem paga as taxas
  fee_payer?: FeePayer
  service_fee_brl?: number
  network_fee_brl?: number
  total_fees_brl?: number
  fee_payer_label?: string
  // Timestamps
  expires_at: string
  expires_in_seconds: number
  is_expired: boolean
  terms_version: string
}

// Resposta da busca de pagador (checkout inteligente)
export interface PayerLookupResponse {
  found: boolean
  payer: {
    person_type: 'PF' | 'PJ'
    pf_data?: PayerPFData
    pj_data?: PayerPJData
    address: PayerAddressData
  } | null
}

export interface PayerAddressData {
  zip_code: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
}

export interface PayerPFData {
  full_name: string
  cpf: string
  birth_date: string
  phone: string
  email: string
}

export interface PayerPJData {
  company_name: string
  cnpj: string
  trade_name?: string
  state_registration?: string
  business_phone: string
  business_email: string
  responsible_name: string
  responsible_cpf: string
}

export interface SavePayerDataRequest {
  person_type: 'PF' | 'PJ'
  pf_data?: PayerPFData
  pj_data?: PayerPJData
  address: PayerAddressData
  terms_accepted: boolean
  terms_version: string
}

export interface PixPaymentResponse {
  invoice_id: string
  invoice_number: string
  pix_key: string
  pix_qrcode: string
  pix_qrcode_image?: string
  amount_brl: number
  recipient_name: string
  recipient_document: string
  expires_at: string
  expires_in_seconds: number
  instructions: string
}

export interface PaymentStatusResponse {
  invoice_id: string
  invoice_number: string
  status: string
  paid: boolean
  paid_at?: string
  message: string
}

export interface ConversionEligibility {
  can_convert: boolean
  reason?: string
  email: string
  name: string
  document_type: string
  document_masked: string
  welcome_bonus?: string
  promo_message?: string
  existing_user?: boolean
  benefits_info?: BenefitsInfo
}

export interface BenefitsInfo {
  show_conversion_offer: boolean
  headline: string
  subheadline: string
  benefits: Array<{
    icon: string
    title: string
    description: string
  }>
  cta_text: string
  cta_subtitle: string
  footer_text?: string
}

export interface CreateAccountResponse {
  success: boolean
  user_id: string
  email: string
  name: string
  message: string
  benefits: string[]
  next_steps: string[]
}

// ============================================
// SERVICE
// ============================================

/**
 * Configurações/taxas do WolkPay retornadas pelo backend
 */
export interface WolkPayConfig {
  service_fee_percentage: number
  network_fee_percentage: number
  total_fee_percentage: number
  min_amount_brl: number
  max_amount_brl: number
  expiry_minutes: number
}

class WolkPayService {
  private readonly baseUrl = '/wolkpay'

  // ==========================================
  // CONFIGURAÇÕES (PÚBLICO)
  // ==========================================

  /**
   * Obtém configurações/taxas do WolkPay
   * Endpoint público para exibir taxas corretas no frontend
   */
  async getConfig(): Promise<WolkPayConfig> {
    const response = await apiClient.get<WolkPayConfig>(`${this.baseUrl}/config`)
    return response.data
  }

  // ==========================================
  // BENEFICIÁRIO (AUTENTICADO)
  // ==========================================

  /**
   * Cria uma nova fatura WolkPay
   */
  async createInvoice(data: CreateInvoiceRequest): Promise<InvoiceCreatedResponse> {
    const response = await apiClient.post<InvoiceCreatedResponse>(`${this.baseUrl}/invoice`, data)
    return response.data
  }

  /**
   * Lista faturas do usuário (beneficiário)
   */
  async getMyInvoices(page = 1, perPage = 10, status?: string): Promise<InvoiceListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    })
    if (status) params.append('status', status)

    const response = await apiClient.get<InvoiceListResponse>(
      `${this.baseUrl}/my-invoices?${params}`
    )
    return response.data
  }

  /**
   * Obtém detalhes de uma fatura específica
   */
  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await apiClient.get<Invoice>(`${this.baseUrl}/invoice/${invoiceId}`)
    return response.data
  }

  /**
   * Cancela uma fatura (apenas PENDING ou AWAITING_PAYMENT)
   */
  async cancelInvoice(invoiceId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/invoice/${invoiceId}/cancel`
    )
    return response.data
  }

  // ==========================================
  // CHECKOUT PÚBLICO (SEM AUTH)
  // ==========================================

  /**
   * Obtém dados do checkout (público)
   */
  async getCheckoutData(token: string): Promise<CheckoutData> {
    const response = await apiClient.get<CheckoutData>(`${this.baseUrl}/checkout/${token}`)
    return response.data
  }

  /**
   * Busca dados de pagador existente por CPF/CNPJ (checkout inteligente)
   * Permite auto-preenchimento se o pagador já realizou pagamentos anteriores.
   */
  async lookupPayerByDocument(token: string, document: string): Promise<PayerLookupResponse> {
    const response = await apiClient.get<PayerLookupResponse>(
      `${this.baseUrl}/checkout/${token}/lookup-payer`,
      { params: { document } }
    )
    return response.data
  }

  /**
   * Salva dados do pagador no checkout
   */
  async savePayerData(
    token: string,
    data: SavePayerDataRequest
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/checkout/${token}/payer`,
      data
    )
    return response.data
  }

  /**
   * Gera o PIX para pagamento
   */
  async generatePix(token: string): Promise<PixPaymentResponse> {
    const response = await apiClient.post<PixPaymentResponse>(
      `${this.baseUrl}/checkout/${token}/pay`
    )
    return response.data
  }

  /**
   * Verifica status do pagamento
   */
  async checkPaymentStatus(token: string): Promise<PaymentStatusResponse> {
    const response = await apiClient.get<PaymentStatusResponse>(
      `${this.baseUrl}/checkout/${token}/status`
    )
    return response.data
  }

  // ==========================================
  // CONVERSÃO PAGADOR -> USUÁRIO
  // ==========================================

  /**
   * Verifica se o pagador pode criar conta
   */
  async checkConversionEligibility(token: string): Promise<ConversionEligibility> {
    const response = await apiClient.get<ConversionEligibility>(
      `${this.baseUrl}/checkout/${token}/conversion-eligibility`
    )
    return response.data
  }

  /**
   * Cria conta do pagador
   */
  async createAccountFromPayer(
    token: string,
    password: string,
    confirmPassword: string,
    acceptTerms: boolean,
    acceptPrivacy: boolean,
    acceptMarketing: boolean = false
  ): Promise<CreateAccountResponse> {
    const params = new URLSearchParams({
      password,
      confirm_password: confirmPassword,
      accept_terms: String(acceptTerms),
      accept_privacy: String(acceptPrivacy),
      accept_marketing: String(acceptMarketing),
    })

    const response = await apiClient.post<CreateAccountResponse>(
      `${this.baseUrl}/checkout/${token}/create-account?${params}`
    )
    return response.data
  }

  /**
   * Obtém informações sobre benefícios
   */
  async getBenefitsInfo(token: string): Promise<BenefitsInfo> {
    const response = await apiClient.get<BenefitsInfo>(
      `${this.baseUrl}/checkout/${token}/benefits-info`
    )
    return response.data
  }

  /**
   * Pagador informa que realizou o pagamento
   * Não muda status para PAID - apenas notifica admin para verificação manual
   */
  async confirmPayerPaid(token: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      `${this.baseUrl}/checkout/${token}/payer-confirmed`
    )
    return response.data
  }
}

export const wolkPayService = new WolkPayService()
export default wolkPayService
