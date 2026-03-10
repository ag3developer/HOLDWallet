# WolkPay Gateway - API Reference

> Complete API documentation for WolkPay Payment Gateway

**Base URL:** `https://api.wolknow.com`  
**Version:** 1.0.0

---

## Authentication

WolkPay uses API Keys for authentication. Include your API key in all requests:

```http
X-API-Key: sk_live_your_api_key
```

### API Key Types

| Type | Prefix     | Description                      |
| ---- | ---------- | -------------------------------- |
| Live | `sk_live_` | Production payments              |
| Test | `sk_test_` | Test mode (no real transactions) |

### Rate Limiting

- **100 requests per minute** per API key
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Max requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Payments

### Create Payment

Create a new payment request.

```http
POST /gateway/payments
```

**Headers:**

```http
X-API-Key: sk_live_xxx
Content-Type: application/json
```

**Request Body:**

| Field             | Type    | Required | Description                                             |
| ----------------- | ------- | -------- | ------------------------------------------------------- |
| `amount`          | number  | ✅       | Payment amount (e.g., 100.00)                           |
| `currency`        | string  | ❌       | Currency code (default: BRL)                            |
| `description`     | string  | ❌       | Description shown to customer                           |
| `external_id`     | string  | ❌       | Your internal reference ID                              |
| `payment_method`  | string  | ❌       | Force method: `pix` or `crypto`                         |
| `crypto_currency` | string  | ❌       | Preferred crypto: BTC, ETH, USDT, USDC, MATIC, BNB, SOL |
| `expires_in`      | integer | ❌       | Expiration in seconds (default: 3600)                   |
| `metadata`        | object  | ❌       | Custom key-value data                                   |
| `success_url`     | string  | ❌       | Redirect URL after success                              |
| `cancel_url`      | string  | ❌       | Redirect URL on cancel                                  |

**Example Request:**

```json
{
  "amount": 199.9,
  "currency": "BRL",
  "description": "Premium Plan - Monthly",
  "external_id": "order_abc123",
  "metadata": {
    "customer_id": "cust_123",
    "plan": "premium"
  },
  "success_url": "https://yoursite.com/success",
  "cancel_url": "https://yoursite.com/cancel"
}
```

**Response (201 Created):**

```json
{
  "id": "pay_1234567890",
  "merchant_id": "mer_xxx",
  "amount": 199.9,
  "currency": "BRL",
  "status": "pending",
  "description": "Premium Plan - Monthly",
  "external_id": "order_abc123",
  "checkout_url": "https://gateway.wolknow.com/checkout/ckout_abc123",
  "checkout_token": "ckout_abc123",
  "expires_at": "2026-03-10T15:00:00Z",
  "created_at": "2026-03-10T14:00:00Z",
  "metadata": {
    "customer_id": "cust_123",
    "plan": "premium"
  }
}
```

---

### Retrieve Payment

Get details of a specific payment.

```http
GET /gateway/payments/{payment_id}
```

**Response (200 OK):**

```json
{
  "id": "pay_1234567890",
  "merchant_id": "mer_xxx",
  "amount": 199.9,
  "currency": "BRL",
  "status": "completed",
  "description": "Premium Plan - Monthly",
  "external_id": "order_abc123",
  "payment_method": "pix",
  "pix_code": "00020126580014br.gov.bcb.pix...",
  "pix_qr_code": "data:image/png;base64,...",
  "paid_at": "2026-03-10T14:05:32Z",
  "expires_at": "2026-03-10T15:00:00Z",
  "created_at": "2026-03-10T14:00:00Z",
  "updated_at": "2026-03-10T14:05:32Z"
}
```

---

### List Payments

List all payments with optional filters.

```http
GET /gateway/payments
```

**Query Parameters:**

| Parameter        | Type    | Description                            |
| ---------------- | ------- | -------------------------------------- |
| `status`         | string  | Filter by status                       |
| `payment_method` | string  | Filter by method (pix, crypto)         |
| `external_id`    | string  | Filter by external reference           |
| `date_from`      | string  | Start date (ISO 8601)                  |
| `date_to`        | string  | End date (ISO 8601)                    |
| `page`           | integer | Page number (default: 1)               |
| `limit`          | integer | Items per page (default: 20, max: 100) |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "pay_1234567890",
      "amount": 199.9,
      "currency": "BRL",
      "status": "completed",
      "payment_method": "pix",
      "created_at": "2026-03-10T14:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "total_pages": 8
}
```

---

### Cancel Payment

Cancel a pending payment.

```http
POST /gateway/payments/{payment_id}/cancel
```

**Response (200 OK):**

```json
{
  "id": "pay_1234567890",
  "status": "cancelled",
  "cancelled_at": "2026-03-10T14:10:00Z"
}
```

---

## Payment Status

| Status             | Description                                   |
| ------------------ | --------------------------------------------- |
| `pending`          | Payment created, awaiting method selection    |
| `awaiting_payment` | Customer selected method, waiting for payment |
| `processing`       | Payment received, being processed             |
| `completed`        | Payment successful                            |
| `failed`           | Payment failed                                |
| `expired`          | Payment expired before completion             |
| `cancelled`        | Payment cancelled                             |
| `refunded`         | Payment refunded                              |

---

## Checkout (Public Endpoints)

These endpoints don't require authentication.

### Get Checkout Data

```http
GET /gateway/checkout/{token}
```

**Response (200 OK):**

```json
{
  "payment_id": "pay_1234567890",
  "merchant": {
    "name": "Loja Example",
    "logo_url": "https://..."
  },
  "amount": 199.9,
  "currency": "BRL",
  "description": "Premium Plan - Monthly",
  "status": "pending",
  "available_methods": ["pix", "crypto"],
  "crypto_currencies": ["BTC", "ETH", "USDT", "USDC"],
  "expires_at": "2026-03-10T15:00:00Z"
}
```

### Get Payment Status

```http
GET /gateway/checkout/{token}/status
```

**Response (200 OK):**

```json
{
  "status": "completed",
  "paid_at": "2026-03-10T14:05:32Z"
}
```

---

## Webhooks

### Configure Webhook

```http
PUT /gateway/webhooks/config
```

**Request Body:**

```json
{
  "webhook_url": "https://yoursite.com/webhooks/wolkpay"
}
```

### Regenerate Secret

```http
POST /gateway/webhooks/regenerate-secret
```

**Response:**

```json
{
  "webhook_secret": "whsec_new_secret_xxx"
}
```

### List Events

```http
GET /gateway/webhooks/events
```

**Query Parameters:**

| Parameter    | Type    | Description               |
| ------------ | ------- | ------------------------- |
| `delivered`  | boolean | Filter by delivery status |
| `event_type` | string  | Filter by event type      |
| `page`       | integer | Page number               |
| `limit`      | integer | Items per page            |

---

## API Keys

### Create API Key

```http
POST /gateway/api-keys
```

**Request Body:**

```json
{
  "name": "Production API Key",
  "environment": "live",
  "permissions": ["payments:create", "payments:read"]
}
```

**Response (201 Created):**

```json
{
  "id": "key_xxx",
  "name": "Production API Key",
  "prefix": "sk_live_abc",
  "key": "sk_live_full_key_only_shown_once",
  "environment": "live",
  "permissions": ["payments:create", "payments:read"],
  "created_at": "2026-03-10T14:00:00Z"
}
```

⚠️ **Important:** The full API key is only shown once. Store it securely.

### List API Keys

```http
GET /gateway/api-keys
```

### Revoke API Key

```http
DELETE /gateway/api-keys/{key_id}
```

---

## Errors

### Error Response Format

```json
{
  "detail": "Error message",
  "code": "error_code",
  "errors": [
    {
      "loc": ["body", "amount"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 422  | Validation Error      |
| 429  | Rate Limit Exceeded   |
| 500  | Internal Server Error |

### Error Codes

| Code                        | Description                     |
| --------------------------- | ------------------------------- |
| `authentication_error`      | Invalid or missing API key      |
| `validation_error`          | Request validation failed       |
| `payment_not_found`         | Payment does not exist          |
| `payment_already_cancelled` | Cannot cancel completed payment |
| `rate_limit_exceeded`       | Too many requests               |
| `api_error`                 | Internal server error           |

---

## SDKs

Official SDKs available:

- [Python SDK](https://github.com/wolknow/wolkpay-python)
- [Node.js SDK](https://github.com/wolknow/wolkpay-node)
- [PHP SDK](https://github.com/wolknow/wolkpay-php)

---

**Last Updated:** March 10, 2026
