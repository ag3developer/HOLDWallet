/**
 * Webhooks Resource
 */

import type { WolkPay } from "../client";
import type { WebhookEvent } from "../types";

export interface ListWebhookEventsOptions {
  delivered?: boolean;
  eventType?: string;
  page?: number;
  limit?: number;
}

export class WebhooksResource {
  constructor(private readonly client: WolkPay) {}

  /**
   * List webhook events
   *
   * @example
   * ```typescript
   * const events = await client.webhooks.listEvents({
   *   delivered: false
   * });
   * ```
   */
  async listEvents(
    options: ListWebhookEventsOptions = {},
  ): Promise<WebhookEvent[]> {
    const params: Record<string, unknown> = {
      page: options.page || 1,
      limit: options.limit || 20,
    };

    if (options.delivered !== undefined) params.delivered = options.delivered;
    if (options.eventType) params.event_type = options.eventType;

    const response = await this.client.request<Record<string, unknown>>(
      "GET",
      "webhooks/events",
      undefined,
      params,
    );

    // Handle array or paginated response
    const data = Array.isArray(response)
      ? response
      : (response.data as Record<string, unknown>[]) || [];

    return data.map((e) => this.mapEvent(e as Record<string, unknown>));
  }

  private mapEvent(data: Record<string, unknown>): WebhookEvent {
    return {
      id: data.id as string,
      eventType: data.event_type as string,
      paymentId: data.payment_id as string,
      status: data.status as string,
      delivered: data.delivered as boolean,
      deliveredAt: data.delivered_at
        ? new Date(data.delivered_at as string)
        : undefined,
      createdAt: data.created_at
        ? new Date(data.created_at as string)
        : undefined,
      payload: data.payload as Record<string, unknown> | undefined,
    };
  }
}

/**
 * Webhook Event Types
 */
export const WebhookEventTypes = {
  // Payment events
  PAYMENT_CREATED: "payment.created",
  PAYMENT_PENDING: "payment.pending",
  PAYMENT_PROCESSING: "payment.processing",
  PAYMENT_COMPLETED: "payment.completed",
  PAYMENT_FAILED: "payment.failed",
  PAYMENT_EXPIRED: "payment.expired",
  PAYMENT_CANCELLED: "payment.cancelled",
  PAYMENT_REFUNDED: "payment.refunded",

  // PIX specific
  PIX_RECEIVED: "pix.received",
  PIX_CONFIRMED: "pix.confirmed",

  // Crypto specific
  CRYPTO_DETECTED: "crypto.detected",
  CRYPTO_CONFIRMED: "crypto.confirmed",
} as const;

export type WebhookEventType =
  (typeof WebhookEventTypes)[keyof typeof WebhookEventTypes];
