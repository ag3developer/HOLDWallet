<?php

declare(strict_types=1);

namespace WolkPay;

use WolkPay\Exceptions\AuthenticationException;
use WolkPay\Exceptions\WolkPayException;
use WolkPay\Resources\Payments;
use WolkPay\Resources\Webhooks;

/**
 * WolkPay PHP SDK
 *
 * Official PHP SDK for WolkPay Gateway - Accept PIX and Crypto payments.
 *
 * @example
 * ```php
 * use WolkPay\WolkPay;
 *
 * $client = new WolkPay('sk_live_xxx');
 *
 * $payment = $client->payments->create([
 *     'amount' => 100.00,
 *     'currency' => 'BRL',
 *     'description' => 'Order #123'
 * ]);
 *
 * echo $payment->checkout_url;
 * ```
 */
class WolkPay
{
    public const VERSION = '1.0.0';
    public const DEFAULT_BASE_URL = 'https://api.wolknow.com';

    private string $apiKey;
    private string $baseUrl;
    private int $timeout;
    private int $maxRetries;

    public Payments $payments;
    public Webhooks $webhooks;

    /**
     * Create a new WolkPay client
     *
     * @param string $apiKey Your API key (sk_live_... or sk_test_...)
     * @param array $options Configuration options
     *   - base_url: API base URL (default: https://api.wolknow.com)
     *   - timeout: Request timeout in seconds (default: 30)
     *   - max_retries: Maximum retry attempts (default: 3)
     *
     * @throws AuthenticationException If API key is invalid
     */
    public function __construct(string $apiKey, array $options = [])
    {
        if (empty($apiKey)) {
            throw new AuthenticationException('API key is required');
        }

        if (!str_starts_with($apiKey, 'sk_live_') && !str_starts_with($apiKey, 'sk_test_')) {
            throw new AuthenticationException(
                "Invalid API key format. Must start with 'sk_live_' or 'sk_test_'"
            );
        }

        $this->apiKey = $apiKey;
        $this->baseUrl = $options['base_url'] ?? self::DEFAULT_BASE_URL;
        $this->timeout = $options['timeout'] ?? 30;
        $this->maxRetries = $options['max_retries'] ?? 3;

        // Initialize resources
        $this->payments = new Payments($this);
        $this->webhooks = new Webhooks($this);
    }

    /**
     * Check if using test API key
     */
    public function isTestMode(): bool
    {
        return str_starts_with($this->apiKey, 'sk_test_');
    }

    /**
     * Make HTTP request to WolkPay API
     *
     * @param string $method HTTP method
     * @param string $endpoint API endpoint
     * @param array|null $data Request body
     * @param array|null $params Query parameters
     * @return array Response data
     * @throws WolkPayException On API errors
     */
    public function request(
        string $method,
        string $endpoint,
        ?array $data = null,
        ?array $params = null
    ): array {
        $url = $this->buildUrl($endpoint, $params);

        $lastException = null;

        for ($attempt = 0; $attempt < $this->maxRetries; $attempt++) {
            try {
                return $this->executeRequest($method, $url, $data);
            } catch (WolkPayException $e) {
                // Don't retry client errors (4xx)
                if ($e->getStatusCode() >= 400 && $e->getStatusCode() < 500) {
                    throw $e;
                }
                $lastException = $e;
            }
        }

        throw $lastException ?? new WolkPayException('Request failed');
    }

    private function buildUrl(string $endpoint, ?array $params = null): string
    {
        $url = rtrim($this->baseUrl, '/') . '/gateway/' . ltrim($endpoint, '/');

        if ($params) {
            $url .= '?' . http_build_query($params);
        }

        return $url;
    }

    private function executeRequest(string $method, string $url, ?array $data = null): array
    {
        $ch = curl_init();

        $headers = [
            'X-API-Key: ' . $this->apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
            'User-Agent: WolkPay-PHP/' . self::VERSION,
        ];

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => $method,
        ]);

        if ($data && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        curl_close($ch);

        if ($error) {
            throw new WolkPayException("Connection error: {$error}", 0, 'connection_error');
        }

        return $this->handleResponse($response, $statusCode);
    }

    private function handleResponse(string $response, int $statusCode): array
    {
        $data = json_decode($response, true) ?? ['message' => $response];

        if ($statusCode >= 200 && $statusCode < 300) {
            return $data;
        }

        $message = $data['detail'] ?? $data['message'] ?? 'Unknown error';

        switch ($statusCode) {
            case 401:
                throw new Exceptions\AuthenticationException($message);
            case 403:
                throw new Exceptions\AuthenticationException('Access forbidden - check API key permissions');
            case 422:
                throw new Exceptions\ValidationException($message, $data['errors'] ?? []);
            case 429:
                throw new Exceptions\RateLimitException($message);
            default:
                if ($statusCode >= 500) {
                    throw new Exceptions\ApiException($message, $statusCode);
                }
                throw new WolkPayException($message, $statusCode);
        }
    }

    /**
     * Verify webhook signature
     *
     * @param string $payload Raw request body
     * @param string $signature X-WolkPay-Signature header
     * @param string $secret Your webhook secret
     * @return bool True if signature is valid
     */
    public static function verifyWebhookSignature(
        string $payload,
        string $signature,
        string $secret
    ): bool {
        $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
        return hash_equals($expected, $signature);
    }

    /**
     * Parse and verify webhook event
     *
     * @param string $payload Raw request body
     * @param string $signature X-WolkPay-Signature header
     * @param string $secret Your webhook secret
     * @return array Event data
     * @throws Exceptions\WebhookException If signature is invalid
     */
    public static function constructEvent(
        string $payload,
        string $signature,
        string $secret
    ): array {
        if (!self::verifyWebhookSignature($payload, $signature, $secret)) {
            throw new Exceptions\WebhookException('Invalid webhook signature');
        }

        return json_decode($payload, true);
    }
}
