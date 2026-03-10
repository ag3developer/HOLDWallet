/**
 * Payments Resource
 */

import type { WolkPay } from "../client";
import type {
  Payment,
  CreatePaymentOptions,
  ListPaymentsOptions,
  ListPaymentsResponse,
  PaymentStatus,
} from "../types";

export class PaymentsResource {
  constructor(private readonly client: WolkPay) {}

  /**
   * Create a new payment
   *
   * @example
   * ```typescript
   * const payment = await client.payments.create({
   *   amount: 100.00,
   *   description: 'Order #123'
   * });
   *
   * console.log(payment.checkoutUrl);
   * ```
   */
  async create(options: CreatePaymentOptions): Promise<Payment> {
    const data: Record<string, unknown> = {
      amount: options.amount,
      currency: options.currency || "BRL",
      expires_in: options.expiresIn || 3600,
    };

    if (options.description) data.description = options.description;
    if (options.externalId) data.external_id = options.externalId;
    if (options.paymentMethod) data.payment_method = options.paymentMethod;
    if (options.cryptoCurrency) data.crypto_currency = options.cryptoCurrency;
    if (options.metadata) data.metadata = options.metadata;
    if (options.successUrl) data.success_url = options.successUrl;
    if (options.cancelUrl) data.cancel_url = options.cancelUrl;

    const response = await this.client.request<Record<string, unknown>>(
      "POST",
      "payments",
      data,
    );

    return this.mapPayment(response);
  }

  /**
   * Retrieve a payment by ID
   *
   * @example
   * ```typescript
   * const payment = await client.payments.retrieve('pay_xxx');
   * console.log(payment.status);
   * ```
   */
  async retrieve(paymentId: string): Promise<Payment> {
    const response = await this.client.request<Record<string, unknown>>(
      "GET",
      `payments/${paymentId}`,
    );

    return this.mapPayment(response);
  }

  /**
   * List payments with optional filters
   *
   * @example
   * ```typescript
   * const { data: payments } = await client.payments.list({
   *   status: 'completed',
   *   dateFrom: '2026-01-01'
   * });
   * ```
   */
  async list(options: ListPaymentsOptions = {}): Promise<ListPaymentsResponse> {
    const params: Record<string, unknown> = {
      page: options.page || 1,
      limit: Math.min(options.limit || 20, 100),
    };

    if (options.status) params.status = options.status;
    if (options.paymentMethod) params.payment_method = options.paymentMethod;
    if (options.externalId) params.external_id = options.externalId;
    if (options.dateFrom) params.date_from = options.dateFrom;
    if (options.dateTo) params.date_to = options.dateTo;

    const response = await this.client.request<Record<string, unknown>>(
      "GET",
      "payments",
      undefined,
      params,
    );

    // Handle paginated response
    if (Array.isArray(response)) {
      return {
        data: response.map((p) =>
          this.mapPayment(p as Record<string, unknown>),
        ),
        total: response.length,
        page: 1,
        limit: response.length,
        totalPages: 1,
      };
    }

    const data = (response.data as Record<string, unknown>[]) || [];
    return {
      data: data.map((p) => this.mapPayment(p)),
      total: (response.total as number) || data.length,
      page: (response.page as number) || 1,
      limit: (response.limit as number) || 20,
      totalPages: (response.total_pages as number) || 1,
    };
  }

  /**
   * Cancel a pending payment
   *
   * @example
   * ```typescript
   * const cancelled = await client.payments.cancel('pay_xxx');
   * ```
   */
  async cancel(paymentId: string): Promise<Payment> {
    const response = await this.client.request<Record<string, unknown>>(
      "POST",
      `payments/${paymentId}/cancel`,
    );

    return this.mapPayment(response);
  }

  /**
   * Get payment status only (lightweight)
   */
  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const payment = await this.retrieve(paymentId);
    return payment.status;
  }

  /**
   * Wait for payment to complete (polling)
   *
   * @example
   * ```typescript
   * const completed = await client.payments.waitForCompletion('pay_xxx', {
   *   timeout: 600000, // 10 minutes
   *   pollInterval: 5000 // 5 seconds
   * });
   * ```
   */
  async waitForCompletion(
    paymentId: string,
    options: { timeout?: number; pollInterval?: number } = {},
  ): Promise<Payment> {
    const timeout = options.timeout || 300000; // 5 minutes default
    const pollInterval = options.pollInterval || 5000; // 5 seconds default
    const startTime = Date.now();

    const terminalStatuses: PaymentStatus[] = [
      "completed",
      "failed",
      "expired",
      "cancelled",
      "refunded",
    ];

    while (true) {
      const payment = await this.retrieve(paymentId);

      if (terminalStatuses.includes(payment.status)) {
        return payment;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        throw new Error(
          `Payment ${paymentId} did not complete within ${timeout}ms`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  private mapPayment(data: Record<string, unknown>): Payment {
    return {
      id: data.id as string,
      merchantId: data.merchant_id as string,
      amount: data.amount as number,
      currency: data.currency as string,
      status: data.status as PaymentStatus,
      description: data.description as string | undefined,
      externalId: data.external_id as string | undefined,
      paymentMethod: data.payment_method as "pix" | "crypto" | undefined,
      checkoutUrl: data.checkout_url as string | undefined,
      checkoutToken: data.checkout_token as string | undefined,
      pixCode: data.pix_code as string | undefined,
      pixQrCode: data.pix_qr_code as string | undefined,
      cryptoAddress: data.crypto_address as string | undefined,
      cryptoCurrency: data.crypto_currency as any,
      cryptoAmount: data.crypto_amount as number | undefined,
      cryptoNetwork: data.crypto_network as string | undefined,
      expiresAt: data.expires_at
        ? new Date(data.expires_at as string)
        : undefined,
      paidAt: data.paid_at ? new Date(data.paid_at as string) : undefined,
      createdAt: data.created_at
        ? new Date(data.created_at as string)
        : undefined,
      updatedAt: data.updated_at
        ? new Date(data.updated_at as string)
        : undefined,
      metadata: data.metadata as Record<string, unknown> | undefined,
    };
  }
}
