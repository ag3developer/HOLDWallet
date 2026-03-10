# WolkPay PHP SDK

Official PHP SDK for **WolkPay Gateway** - Accept PIX and Cryptocurrency payments in Brazil.

## Requirements

- PHP 7.4+
- cURL extension
- JSON extension

## Installation

```bash
composer require wolknow/wolkpay-php
```

## Quick Start

```php
<?php

require_once 'vendor/autoload.php';

use WolkPay\WolkPay;

// Initialize client
$client = new WolkPay('sk_live_your_api_key');

// Create a payment
$payment = $client->payments->create([
    'amount' => 100.00,
    'currency' => 'BRL',
    'description' => 'Order #123',
    'external_id' => 'order_abc123'
]);

// Redirect customer to checkout
echo $payment->checkout_url;
```

## Features

- ✅ **PIX Payments** - Instant Brazilian payments
- ✅ **Crypto Payments** - BTC, ETH, USDT, USDC, and more
- ✅ **Webhook Support** - Signature verification
- ✅ **Retry Logic** - Automatic request retries
- ✅ **Error Handling** - Detailed exceptions

## Create Payments

### Basic Payment

```php
$payment = $client->payments->create([
    'amount' => 199.90,
    'description' => 'Premium Plan'
]);

echo $payment->checkout_url;  // Send to customer
echo $payment->id;            // Store for reference
```

### With Metadata

```php
$payment = $client->payments->create([
    'amount' => 99.00,
    'description' => 'Monthly Subscription',
    'external_id' => 'sub_12345',
    'metadata' => [
        'customer_id' => 'cust_abc',
        'plan' => 'premium'
    ],
    'success_url' => 'https://yoursite.com/success',
    'cancel_url' => 'https://yoursite.com/cancel'
]);
```

### Force Payment Method

```php
// PIX only
$pixPayment = $client->payments->create([
    'amount' => 50.00,
    'payment_method' => 'pix'
]);

// Crypto only (USDT)
$cryptoPayment = $client->payments->create([
    'amount' => 100.00,
    'payment_method' => 'crypto',
    'crypto_currency' => 'USDT'
]);
```

## Retrieve Payments

```php
// Get single payment
$payment = $client->payments->retrieve('pay_xxx');
echo "Status: {$payment->status}";

// List all payments
$payments = $client->payments->all([
    'status' => 'completed',
    'date_from' => '2026-01-01'
]);

foreach ($payments as $p) {
    echo "{$p->id}: R\${$p->amount}\n";
}
```

## Cancel Payment

```php
// Only pending payments can be cancelled
$cancelled = $client->payments->cancel('pay_xxx');
echo $cancelled->status;  // "cancelled"
```

## Webhooks

### Verify Signature

```php
<?php

use WolkPay\WolkPay;

// Get raw request body
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WOLKPAY_SIGNATURE'] ?? '';
$secret = 'whsec_your_webhook_secret';

// Verify signature
if (!WolkPay::verifyWebhookSignature($payload, $signature, $secret)) {
    http_response_code(400);
    exit('Invalid signature');
}

// Parse event
$event = json_decode($payload, true);

// Handle event
switch ($event['event_type']) {
    case 'payment.completed':
        $paymentId = $event['payment_id'];
        // Update your order status
        break;

    case 'payment.failed':
        // Handle failure
        break;

    case 'payment.expired':
        // Handle expiration
        break;
}

http_response_code(200);
echo json_encode(['received' => true]);
```

### Using constructEvent Helper

```php
use WolkPay\WolkPay;
use WolkPay\Exceptions\WebhookException;

try {
    $event = WolkPay::constructEvent($payload, $signature, $secret);

    if ($event['event_type'] === 'payment.completed') {
        // Process payment
    }

} catch (WebhookException $e) {
    http_response_code(400);
    exit('Invalid signature');
}
```

### Webhook Events

| Event               | Description                  |
| ------------------- | ---------------------------- |
| `payment.created`   | Payment request created      |
| `payment.pending`   | Awaiting customer payment    |
| `payment.completed` | Payment successful           |
| `payment.failed`    | Payment failed               |
| `payment.expired`   | Payment expired              |
| `payment.cancelled` | Payment cancelled            |
| `pix.received`      | PIX payment received         |
| `crypto.confirmed`  | Crypto transaction confirmed |

## Error Handling

```php
use WolkPay\WolkPay;
use WolkPay\Exceptions\AuthenticationException;
use WolkPay\Exceptions\ValidationException;
use WolkPay\Exceptions\RateLimitException;
use WolkPay\Exceptions\ApiException;

$client = new WolkPay('sk_live_xxx');

try {
    $payment = $client->payments->create(['amount' => 100]);
} catch (AuthenticationException $e) {
    echo "Invalid API key: " . $e->getMessage();
} catch (ValidationException $e) {
    echo "Validation error: " . $e->getMessage();
    print_r($e->getErrors());
} catch (RateLimitException $e) {
    echo "Rate limit exceeded";
} catch (ApiException $e) {
    echo "API error: " . $e->getMessage();
}
```

## Test Mode

Use test API keys for development:

```php
// Test mode - no real payments processed
$client = new WolkPay('sk_test_xxx');

// Check if test mode
var_dump($client->isTestMode());  // true
```

## Configuration

```php
$client = new WolkPay('sk_live_xxx', [
    'base_url' => 'https://api.wolknow.com',  // Custom API URL
    'timeout' => 30,                           // Request timeout (seconds)
    'max_retries' => 3                         // Retry attempts
]);
```

## Laravel Integration

### Service Provider

```php
// app/Providers/WolkPayServiceProvider.php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use WolkPay\WolkPay;

class WolkPayServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(WolkPay::class, function ($app) {
            return new WolkPay(config('services.wolkpay.key'));
        });
    }
}

// config/services.php
'wolkpay' => [
    'key' => env('WOLKPAY_API_KEY'),
    'webhook_secret' => env('WOLKPAY_WEBHOOK_SECRET'),
],
```

### Controller Example

```php
<?php

namespace App\Http\Controllers;

use WolkPay\WolkPay;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private WolkPay $wolkpay) {}

    public function createPayment(Request $request)
    {
        $payment = $this->wolkpay->payments->create([
            'amount' => $request->amount,
            'description' => $request->description,
            'external_id' => $request->order_id,
        ]);

        return response()->json([
            'checkout_url' => $payment->checkout_url
        ]);
    }

    public function webhook(Request $request)
    {
        $event = WolkPay::constructEvent(
            $request->getContent(),
            $request->header('X-WolkPay-Signature'),
            config('services.wolkpay.webhook_secret')
        );

        if ($event['event_type'] === 'payment.completed') {
            // Update order status
        }

        return response()->json(['received' => true]);
    }
}
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📚 [Documentation](https://docs.wolknow.com/gateway)
- 💬 [Discord](https://discord.gg/wolknow)
- 📧 [Email](mailto:support@wolknow.com)
