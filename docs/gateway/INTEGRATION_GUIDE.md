# WolkPay Gateway - Integration Guide

> Step-by-step guide to integrate WolkPay payments into your application

---

## Overview

WolkPay Gateway allows you to accept **PIX** and **Cryptocurrency** payments in Brazil with a simple API integration.

### Payment Flow

```
┌─────────────────┐
│  Your Website   │
│                 │
│  1. Create      │
│     Payment     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   WolkPay API   │
│                 │
│  Returns        │
│  checkout_url   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Checkout Page  │
│                 │
│  Customer pays  │
│  via PIX/Crypto │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Webhook      │
│                 │
│  Payment        │
│  confirmed      │
└─────────────────┘
```

---

## Quick Start

### 1. Get Your API Key

1. Log in to [WolkPay Dashboard](https://gateway.wolknow.com/dashboard)
2. Go to **API Keys**
3. Click **Create New Key**
4. Copy your `sk_live_...` key

### 2. Install SDK

**Python:**

```bash
pip install wolkpay
```

**Node.js:**

```bash
npm install wolkpay
```

**PHP:**

```bash
composer require wolknow/wolkpay-php
```

### 3. Create Your First Payment

**Python:**

```python
from wolkpay import WolkPay

client = WolkPay(api_key="sk_live_your_key")

payment = client.payments.create(
    amount=100.00,
    description="Order #123"
)

# Redirect customer to checkout
print(payment.checkout_url)
```

**Node.js:**

```typescript
import WolkPay from "wolkpay";

const client = new WolkPay("sk_live_your_key");

const payment = await client.payments.create({
  amount: 100.0,
  description: "Order #123",
});

// Redirect customer to checkout
console.log(payment.checkoutUrl);
```

**PHP:**

```php
use WolkPay\WolkPay;

$client = new WolkPay('sk_live_your_key');

$payment = $client->payments->create([
    'amount' => 100.00,
    'description' => 'Order #123'
]);

// Redirect customer to checkout
echo $payment->checkout_url;
```

### 4. Handle Webhooks

Set up a webhook endpoint to receive payment notifications:

**Python (FastAPI):**

```python
from fastapi import FastAPI, Request, HTTPException
from wolkpay import WolkPay

app = FastAPI()

@app.post("/webhooks/wolkpay")
async def handle_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-WolkPay-Signature")

    if not WolkPay.verify_webhook_signature(payload, signature, "whsec_xxx"):
        raise HTTPException(status_code=400, detail="Invalid signature")

    event = await request.json()

    if event["event_type"] == "payment.completed":
        order_id = event["payment"]["external_id"]
        # Mark order as paid

    return {"received": True}
```

---

## Integration Patterns

### Pattern 1: Redirect to Checkout

Best for: Simple integrations, hosted checkout

```python
# 1. Create payment
payment = client.payments.create(
    amount=order.total,
    external_id=order.id,
    success_url=f"https://yoursite.com/orders/{order.id}/success",
    cancel_url=f"https://yoursite.com/orders/{order.id}"
)

# 2. Store payment ID
order.payment_id = payment.id
order.save()

# 3. Redirect customer
redirect(payment.checkout_url)
```

### Pattern 2: Embedded Checkout (iframe)

Best for: Keeping customers on your site

```html
<!-- In your checkout page -->
<iframe
  src="https://gateway.wolknow.com/checkout/ckout_xxx"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

### Pattern 3: API-Only (Custom UI)

Best for: Full control over UI

```python
# Create payment with specific method
payment = client.payments.create(
    amount=100.00,
    payment_method="pix"  # or "crypto"
)

# Get PIX code to display
pix_code = payment.pix_code
qr_code_image = payment.pix_qr_code

# Poll for status
while True:
    status = client.payments.get_status(payment.id)
    if status == "completed":
        break
    time.sleep(5)
```

---

## E-commerce Integration

### WooCommerce

```php
// In your WooCommerce plugin
class WC_Gateway_WolkPay extends WC_Payment_Gateway {

    public function process_payment($order_id) {
        $order = wc_get_order($order_id);

        $client = new WolkPay(get_option('wolkpay_api_key'));

        $payment = $client->payments->create([
            'amount' => $order->get_total(),
            'currency' => $order->get_currency(),
            'description' => "Order #{$order_id}",
            'external_id' => (string) $order_id,
            'metadata' => [
                'order_id' => $order_id,
                'customer_email' => $order->get_billing_email()
            ],
            'success_url' => $order->get_checkout_order_received_url(),
            'cancel_url' => wc_get_checkout_url()
        ]);

        // Store payment ID
        $order->update_meta_data('_wolkpay_payment_id', $payment->id);
        $order->save();

        return [
            'result' => 'success',
            'redirect' => $payment->checkout_url
        ];
    }
}
```

### Shopify

```javascript
// In your Shopify app
app.post("/create-payment", async (req, res) => {
  const { checkout } = req.body;

  const payment = await wolkpay.payments.create({
    amount: checkout.total_price / 100, // Shopify uses cents
    currency: checkout.currency,
    description: `Shopify Order`,
    externalId: checkout.token,
    successUrl: `https://yourshop.myshopify.com/checkouts/${checkout.token}/thank_you`,
    cancelUrl: `https://yourshop.myshopify.com/checkouts/${checkout.token}`,
  });

  res.json({ redirect_url: payment.checkoutUrl });
});
```

---

## Subscription Payments

For recurring payments, create a new payment for each billing cycle:

```python
def charge_subscription(subscription):
    payment = client.payments.create(
        amount=subscription.price,
        description=f"Subscription - {subscription.plan_name}",
        external_id=f"sub_{subscription.id}_{datetime.now().month}",
        metadata={
            "subscription_id": subscription.id,
            "billing_period": datetime.now().strftime("%Y-%m")
        }
    )

    # Send checkout link to customer
    send_email(
        to=subscription.customer_email,
        subject="Payment Required",
        body=f"Please complete your payment: {payment.checkout_url}"
    )

    return payment.id
```

---

## Testing

### Test Mode

Use test API keys (`sk_test_...`) for development:

```python
# Test mode - no real payments
client = WolkPay(api_key="sk_test_your_test_key")
```

### Test Cards & PIX

In test mode:

- **PIX:** Any payment will auto-complete after 5 seconds
- **Crypto:** Use test addresses provided in dashboard

### Webhook Testing

Use tools like [ngrok](https://ngrok.com) to test webhooks locally:

```bash
ngrok http 8000
# Use the ngrok URL as your webhook URL
```

---

## Go Live Checklist

- [ ] Switch to live API key (`sk_live_...`)
- [ ] Update webhook URL to production
- [ ] Verify webhook signature validation
- [ ] Test complete payment flow
- [ ] Handle all webhook event types
- [ ] Set up error monitoring
- [ ] Enable rate limit handling

---

## Security Best Practices

1. **Never expose API keys** in frontend code
2. **Always verify webhook signatures**
3. **Use HTTPS** for all endpoints
4. **Store payment IDs**, not full payment data
5. **Implement idempotency** using `external_id`

---

## Support

- 📚 [API Reference](./API_REFERENCE.md)
- 📖 [Webhooks Guide](./WEBHOOKS_GUIDE.md)
- 💬 [Discord](https://discord.gg/wolknow)
- 📧 [support@wolknow.com](mailto:support@wolknow.com)
