/**
 * WolkPay Type Definitions
 */

export type PaymentStatus =
  | "pending"
  | "awaiting_payment"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

export type PaymentMethod = "pix" | "crypto";

export type CryptoCurrency =
  | "BTC"
  | "ETH"
  | "USDT"
  | "USDC"
  | "MATIC"
  | "BNB"
  | "SOL";

export interface Payment {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description?: string;
  externalId?: string;
  paymentMethod?: PaymentMethod;
  checkoutUrl?: string;
  checkoutToken?: string;
  pixCode?: string;
  pixQrCode?: string;
  cryptoAddress?: string;
  cryptoCurrency?: CryptoCurrency;
  cryptoAmount?: number;
  cryptoNetwork?: string;
  expiresAt?: Date;
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentOptions {
  /** Payment amount (e.g., 100.00) */
  amount: number;
  /** Currency code (default: BRL) */
  currency?: string;
  /** Payment description (shown to customer) */
  description?: string;
  /** Your internal reference ID */
  externalId?: string;
  /** Force specific method ("pix" or "crypto") */
  paymentMethod?: PaymentMethod;
  /** Preferred crypto (BTC, ETH, USDT, etc.) */
  cryptoCurrency?: CryptoCurrency;
  /** Expiration time in seconds (default: 3600) */
  expiresIn?: number;
  /** Additional data to store with payment */
  metadata?: Record<string, unknown>;
  /** Redirect URL after successful payment */
  successUrl?: string;
  /** Redirect URL if customer cancels */
  cancelUrl?: string;
}

export interface ListPaymentsOptions {
  /** Filter by status */
  status?: PaymentStatus;
  /** Filter by payment method */
  paymentMethod?: PaymentMethod;
  /** Filter by external reference */
  externalId?: string;
  /** Start date (ISO format) */
  dateFrom?: string;
  /** End date (ISO format) */
  dateTo?: string;
  /** Page number (default: 1) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  limit?: number;
}

export interface ListPaymentsResponse {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Merchant {
  id: string;
  merchantCode: string;
  companyName: string;
  email: string;
  status: string;
  webhookUrl?: string;
  webhookSecret?: string;
  createdAt?: Date;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: "test" | "live";
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt?: Date;
}

export interface WebhookEvent {
  id: string;
  eventType: string;
  paymentId: string;
  status: string;
  delivered: boolean;
  deliveredAt?: Date;
  createdAt?: Date;
  payload?: Record<string, unknown>;
}

export interface WebhookPayload {
  id: string;
  event_type: string;
  payment_id: string;
  payment: Payment;
  timestamp: string;
}

export interface WolkPayConfig {
  /** API Key (sk_live_... or sk_test_...) */
  apiKey: string;
  /** Base URL (default: https://api.wolknow.com) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
}
