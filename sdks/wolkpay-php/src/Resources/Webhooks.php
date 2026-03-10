<?php

declare(strict_types=1);

namespace WolkPay\Resources;

use WolkPay\WolkPay;

/**
 * Webhooks Resource
 */
class Webhooks
{
    private WolkPay $client;

    public function __construct(WolkPay $client)
    {
        $this->client = $client;
    }

    /**
     * List webhook events
     *
     * @param array $params Filter parameters
     *   - delivered: bool Filter by delivery status
     *   - event_type: string Filter by event type
     *   - page: int Page number
     *   - limit: int Items per page
     *
     * @return array Array of webhook event objects
     */
    public function listEvents(array $params = []): array
    {
        $queryParams = [
            'page' => $params['page'] ?? 1,
            'limit' => $params['limit'] ?? 20,
        ];

        if (isset($params['delivered'])) {
            $queryParams['delivered'] = $params['delivered'];
        }

        if (isset($params['event_type'])) {
            $queryParams['event_type'] = $params['event_type'];
        }

        $response = $this->client->request('GET', 'webhooks/events', null, $queryParams);

        if (isset($response['data'])) {
            return array_map(fn($e) => (object) $e, $response['data']);
        }

        return array_map(fn($e) => (object) $e, $response);
    }
}

/**
 * Webhook Event Types
 */
class WebhookEventTypes
{
    // Payment events
    public const PAYMENT_CREATED = 'payment.created';
    public const PAYMENT_PENDING = 'payment.pending';
    public const PAYMENT_PROCESSING = 'payment.processing';
    public const PAYMENT_COMPLETED = 'payment.completed';
    public const PAYMENT_FAILED = 'payment.failed';
    public const PAYMENT_EXPIRED = 'payment.expired';
    public const PAYMENT_CANCELLED = 'payment.cancelled';
    public const PAYMENT_REFUNDED = 'payment.refunded';

    // PIX specific
    public const PIX_RECEIVED = 'pix.received';
    public const PIX_CONFIRMED = 'pix.confirmed';

    // Crypto specific
    public const CRYPTO_DETECTED = 'crypto.detected';
    public const CRYPTO_CONFIRMED = 'crypto.confirmed';

    /**
     * Get all event types
     */
    public static function all(): array
    {
        return [
            self::PAYMENT_CREATED,
            self::PAYMENT_PENDING,
            self::PAYMENT_PROCESSING,
            self::PAYMENT_COMPLETED,
            self::PAYMENT_FAILED,
            self::PAYMENT_EXPIRED,
            self::PAYMENT_CANCELLED,
            self::PAYMENT_REFUNDED,
            self::PIX_RECEIVED,
            self::PIX_CONFIRMED,
            self::CRYPTO_DETECTED,
            self::CRYPTO_CONFIRMED,
        ];
    }
}
