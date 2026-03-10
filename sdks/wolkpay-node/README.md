# WolkPay Node.js SDK

Official Node.js/TypeScript SDK for **WolkPay Gateway** - Accept PIX and Cryptocurrency payments in Brazil.

## Installation

```bash
npm install wolkpay
# or
yarn add wolkpay
# or
pnpm add wolkpay
```

## Quick Start

```typescript
import WolkPay from "wolkpay";

// Initialize client with your API key
const client = new WolkPay("sk_live_your_api_key");

// Create a payment
const payment = await client.payments.create({
  amount: 100.0,
  currency: "BRL",
  description: "Order #123",
  externalId: "order_abc123",
});

// Redirect customer to checkout
console.log(payment.checkoutUrl);
```

## Features

- ✅ **PIX Payments** - Instant Brazilian payments
- ✅ **Crypto Payments** - BTC, ETH, USDT, USDC, and more
- ✅ **TypeScript Support** - Full type definitions included
- ✅ **Webhook Support** - Signature verification helpers
- ✅ **Async/Await** - Modern Promise-based API
- ✅ **Retry Logic** - Automatic request retries

## Create Payments

### Basic Payment

```typescript
const payment = await client.payments.create({
  amount: 199.9,
  description: "Premium Plan",
});

console.log(payment.checkoutUrl); // Send to customer
console.log(payment.id); // Store for reference
```

### With Options

```typescript
const payment = await client.payments.create({
  amount: 99.0,
  description: "Monthly Subscription",
  externalId: "sub_12345",
  metadata: {
    customerId: "cust_abc",
    plan: "premium",
  },
  successUrl: "https://yoursite.com/success",
  cancelUrl: "https://yoursite.com/cancel",
});
```

### Force Payment Method

```typescript
// PIX only
const pixPayment = await client.payments.create({
  amount: 50.0,
  paymentMethod: "pix",
});

// Crypto only (USDT)
const cryptoPayment = await client.payments.create({
  amount: 100.0,
  paymentMethod: "crypto",
  cryptoCurrency: "USDT",
});
```

## Retrieve Payments

```typescript
// Get single payment
const payment = await client.payments.retrieve("pay_xxx");
console.log(`Status: ${payment.status}`);

// List all payments
const { data: payments } = await client.payments.list({
  status: "completed",
  dateFrom: "2026-01-01",
});

for (const p of payments) {
  console.log(`${p.id}: R$${p.amount.toFixed(2)}`);
}
```

## Cancel Payment

```typescript
// Only pending payments can be cancelled
const cancelled = await client.payments.cancel("pay_xxx");
console.log(cancelled.status); // "cancelled"
```

## Wait for Completion

```typescript
// Wait for payment to be completed (polling)
const completed = await client.payments.waitForCompletion("pay_xxx", {
  timeout: 600000, // 10 minutes
  pollInterval: 5000, // Check every 5 seconds
});

if (completed.status === "completed") {
  console.log("Payment successful!");
}
```

## Webhooks

### Express.js Example

```typescript
import express from "express";
import WolkPay from "wolkpay";

const app = express();

// Important: Use raw body for signature verification
app.post(
  "/webhooks/wolkpay",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["x-wolkpay-signature"] as string;
    const webhookSecret = "whsec_your_webhook_secret";

    try {
      // Verify and parse event
      const event = WolkPay.constructEvent(req.body, signature, webhookSecret);

      // Handle event
      switch (event.event_type) {
        case "payment.completed":
          console.log(`Payment ${event.payment_id} completed!`);
          // Update your order status
          break;

        case "payment.failed":
          console.log(`Payment ${event.payment_id} failed`);
          break;

        case "payment.expired":
          console.log(`Payment ${event.payment_id} expired`);
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  },
);
```

### Webhook Events

| Event               | Description               |
| ------------------- | ------------------------- |
| `payment.created`   | Payment request created   |
| `payment.pending`   | Awaiting customer payment |
| `payment.completed` | Payment successful        |
| `payment.failed`    | Payment failed            |
| `payment.expired`   | Payment expired           |
| `payment.cancelled` | Payment cancelled         |
| `pix.received`      | PIX payment received      |
| `crypto.confirmed`  | Crypto tx confirmed       |

## Error Handling

```typescript
import WolkPay, {
  AuthenticationError,
  ValidationError,
  RateLimitError,
  APIError,
} from "wolkpay";

const client = new WolkPay("sk_live_xxx");

try {
  const payment = await client.payments.create({ amount: 100 });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid API key:", error.message);
  } else if (error instanceof ValidationError) {
    console.error("Validation error:", error.message);
    console.error("Field errors:", error.errors);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limit exceeded. Retry after ${error.retryAfter}s`);
  } else if (error instanceof APIError) {
    console.error("API error:", error.message);
  }
}
```

## Test Mode

Use test API keys for development:

```typescript
// Test mode - no real payments processed
const client = new WolkPay("sk_test_xxx");

// Check if test mode
console.log(client.isTestMode); // true
```

## Configuration

```typescript
const client = new WolkPay({
  apiKey: "sk_live_xxx",
  baseUrl: "https://api.wolknow.com", // Custom API URL
  timeout: 30000, // Request timeout (ms)
  maxRetries: 3, // Retry attempts
});
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import WolkPay, {
  Payment,
  PaymentStatus,
  CreatePaymentOptions,
  WebhookPayload,
} from "wolkpay";

const options: CreatePaymentOptions = {
  amount: 100,
  description: "Test payment",
};

const payment: Payment = await client.payments.create(options);
```

## Requirements

- Node.js 16+
- No external dependencies

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📚 [Documentation](https://docs.wolknow.com/gateway)
- 💬 [Discord](https://discord.gg/wolknow)
- 📧 [Email](mailto:support@wolknow.com)
