<?php

declare(strict_types=1);

namespace WolkPay\Resources;

use WolkPay\WolkPay;

/**
 * Payments Resource
 */
class Payments
{
    private WolkPay $client;

    public function __construct(WolkPay $client)
    {
        $this->client = $client;
    }

    /**
     * Create a new payment
     *
     * @param array $params Payment parameters
     *   - amount: float (required) Payment amount
     *   - currency: string Currency code (default: BRL)
     *   - description: string Payment description
     *   - external_id: string Your internal reference
     *   - payment_method: string Force method (pix|crypto)
     *   - crypto_currency: string Preferred crypto (BTC, ETH, USDT, etc.)
     *   - expires_in: int Expiration in seconds (default: 3600)
     *   - metadata: array Additional data
     *   - success_url: string Redirect URL on success
     *   - cancel_url: string Redirect URL on cancel
     *
     * @return object Payment object
     *
     * @example
     * ```php
     * $payment = $client->payments->create([
     *     'amount' => 100.00,
     *     'description' => 'Order #123',
     *     'external_id' => 'order_abc123'
     * ]);
     *
     * echo $payment->checkout_url;
     * ```
     */
    public function create(array $params): object
    {
        $data = [
            'amount' => $params['amount'],
            'currency' => $params['currency'] ?? 'BRL',
            'expires_in' => $params['expires_in'] ?? 3600,
        ];

        $optionalFields = [
            'description',
            'external_id',
            'payment_method',
            'crypto_currency',
            'metadata',
            'success_url',
            'cancel_url',
        ];

        foreach ($optionalFields as $field) {
            if (isset($params[$field])) {
                $data[$field] = $params[$field];
            }
        }

        $response = $this->client->request('POST', 'payments', $data);
        return (object) $response;
    }

    /**
     * Retrieve a payment by ID
     *
     * @param string $paymentId Payment ID
     * @return object Payment object
     */
    public function retrieve(string $paymentId): object
    {
        $response = $this->client->request('GET', "payments/{$paymentId}");
        return (object) $response;
    }

    /**
     * List payments with optional filters
     *
     * @param array $params Filter parameters
     *   - status: string Filter by status
     *   - payment_method: string Filter by method
     *   - external_id: string Filter by external reference
     *   - date_from: string Start date (ISO format)
     *   - date_to: string End date (ISO format)
     *   - page: int Page number (default: 1)
     *   - limit: int Items per page (default: 20, max: 100)
     *
     * @return array Array of payment objects
     */
    public function all(array $params = []): array
    {
        $queryParams = [
            'page' => $params['page'] ?? 1,
            'limit' => min($params['limit'] ?? 20, 100),
        ];

        $filters = ['status', 'payment_method', 'external_id', 'date_from', 'date_to'];
        foreach ($filters as $filter) {
            if (isset($params[$filter])) {
                $queryParams[$filter] = $params[$filter];
            }
        }

        $response = $this->client->request('GET', 'payments', null, $queryParams);

        // Handle paginated response
        if (isset($response['data'])) {
            return array_map(fn($p) => (object) $p, $response['data']);
        }

        return array_map(fn($p) => (object) $p, $response);
    }

    /**
     * Cancel a pending payment
     *
     * @param string $paymentId Payment ID
     * @return object Updated payment object
     */
    public function cancel(string $paymentId): object
    {
        $response = $this->client->request('POST', "payments/{$paymentId}/cancel");
        return (object) $response;
    }

    /**
     * Get payment status
     *
     * @param string $paymentId Payment ID
     * @return string Payment status
     */
    public function getStatus(string $paymentId): string
    {
        $payment = $this->retrieve($paymentId);
        return $payment->status;
    }
}
