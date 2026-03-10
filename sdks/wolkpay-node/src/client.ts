/**
 * WolkPay Client
 */

import { createHmac, timingSafeEqual } from "crypto";
import {
  WolkPayConfig,
  Payment,
  CreatePaymentOptions,
  ListPaymentsOptions,
  ListPaymentsResponse,
} from "./types";
import {
  WolkPayError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  APIError,
} from "./errors";
import { PaymentsResource } from "./resources/payments";
import { WebhooksResource } from "./resources/webhooks";

export class WolkPay {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  public readonly payments: PaymentsResource;
  public readonly webhooks: WebhooksResource;

  /**
   * Create a new WolkPay client
   *
   * @example
   * ```typescript
   * const client = new WolkPay('sk_live_xxx');
   *
   * // Or with options
   * const client = new WolkPay({
   *   apiKey: 'sk_live_xxx',
   *   timeout: 60000
   * });
   * ```
   */
  constructor(config: string | WolkPayConfig) {
    const opts = typeof config === "string" ? { apiKey: config } : config;

    if (!opts.apiKey) {
      throw new AuthenticationError("API key is required");
    }

    if (
      !opts.apiKey.startsWith("sk_live_") &&
      !opts.apiKey.startsWith("sk_test_")
    ) {
      throw new AuthenticationError(
        "Invalid API key format. Must start with 'sk_live_' or 'sk_test_'",
      );
    }

    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl || "https://api.wolknow.com";
    this.timeout = opts.timeout || 30000;
    this.maxRetries = opts.maxRetries || 3;

    // Initialize resources
    this.payments = new PaymentsResource(this);
    this.webhooks = new WebhooksResource(this);
  }

  /**
   * Check if using test API key
   */
  get isTestMode(): boolean {
    return this.apiKey.startsWith("sk_test_");
  }

  /**
   * Make HTTP request to WolkPay API
   */
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: Record<string, unknown>,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(
      `/gateway/${endpoint.replace(/^\//, "")}`,
      this.baseUrl,
    );

    // Add query params
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "WolkPay-Node/1.0.0",
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url.toString(), {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return await this.handleResponse<T>(response);
      } catch (error) {
        if (error instanceof WolkPayError) {
          throw error;
        }

        if ((error as Error).name === "AbortError") {
          lastError = new APIError("Request timeout", 408);
        } else {
          lastError = new APIError((error as Error).message, 503);
        }
      }
    }

    throw lastError;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    let data: Record<string, unknown>;

    try {
      data = await response.json();
    } catch {
      data = { message: await response.text() };
    }

    if (response.ok) {
      return data as T;
    }

    const errorMessage =
      (data.detail as string) || (data.message as string) || "Unknown error";

    switch (response.status) {
      case 401:
        throw new AuthenticationError(errorMessage);
      case 403:
        throw new AuthenticationError(
          "Access forbidden - check API key permissions",
        );
      case 422:
        throw new ValidationError(errorMessage, data.errors as any);
      case 429:
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "60",
          10,
        );
        throw new RateLimitError(errorMessage, retryAfter);
      default:
        if (response.status >= 500) {
          throw new APIError(errorMessage, response.status);
        }
        throw new WolkPayError(errorMessage, response.status);
    }
  }

  /**
   * Verify webhook signature
   *
   * @example
   * ```typescript
   * const isValid = WolkPay.verifyWebhookSignature(
   *   rawBody,
   *   signature,
   *   'whsec_xxx'
   * );
   * ```
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): boolean {
    const payloadBuffer =
      typeof payload === "string" ? Buffer.from(payload) : payload;

    const expectedSignature = `sha256=${createHmac("sha256", secret)
      .update(payloadBuffer)
      .digest("hex")}`;

    try {
      return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse and verify webhook event
   *
   * @example
   * ```typescript
   * const event = WolkPay.constructEvent(
   *   rawBody,
   *   signature,
   *   'whsec_xxx'
   * );
   *
   * if (event.event_type === 'payment.completed') {
   *   // Handle completed payment
   * }
   * ```
   */
  static constructEvent(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Record<string, unknown> {
    if (!WolkPay.verifyWebhookSignature(payload, signature, secret)) {
      throw new Error("Invalid webhook signature");
    }

    const payloadString =
      typeof payload === "string" ? payload : payload.toString();
    return JSON.parse(payloadString);
  }
}
