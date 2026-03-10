# WolkPay Gateway - Webhooks Guide

> Complete guide to handling WolkPay webhook events

---

## Overview

Webhooks allow WolkPay to notify your server when payment events occur. Instead of polling for status changes, your server receives real-time updates.

### How Webhooks Work

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Customer  │────▶│   WolkPay   │────▶│ Your Server │
│   Pays      │     │   Gateway   │     │   Webhook   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    1. Payment confirmed
                    2. Event created
                    3. POST to your URL
                    4. Signature included
```

---

## Configuration

### Set Webhook URL

1. Go to [WolkPay Dashboard](https://gateway.wolknow.com/dashboard)
2. Navigate to **Webhooks**
3. Enter your webhook URL
4. Click **Save**

Or via API:

```http
PUT /gateway/webhooks/config
X-API-Key: sk_live_xxx
Content-Type: application/json

{
  "webhook_url": "https://yoursite.com/webhooks/wolkpay"
}
```

### Get Webhook Secret

Your webhook secret is used to verify signatures:

```http
POST /gateway/webhooks/regenerate-secret
X-API-Key: sk_live_xxx
```

Response:

```json
{
  "webhook_secret": "whsec_abc123..."
}
```

⚠️ **Store this secret securely.** It's only shown once.

---

## Webhook Events

### Event Types

| Event                | Description         | When                           |
| -------------------- | ------------------- | ------------------------------ |
| `payment.created`    | New payment created | Payment request initiated      |
| `payment.pending`    | Awaiting payment    | Customer selected method       |
| `payment.processing` | Being processed     | Payment received, confirming   |
| `payment.completed`  | Payment successful  | ✅ Confirmed and complete      |
| `payment.failed`     | Payment failed      | Error during processing        |
| `payment.expired`    | Payment expired     | Timeout reached                |
| `payment.cancelled`  | Payment cancelled   | Merchant or customer cancelled |
| `payment.refunded`   | Payment refunded    | Refund processed               |
| `pix.received`       | PIX received        | PIX payment detected           |
| `pix.confirmed`      | PIX confirmed       | PIX confirmed by bank          |
| `crypto.detected`    | Crypto detected     | Transaction seen on blockchain |
| `crypto.confirmed`   | Crypto confirmed    | Required confirmations reached |

### Event Payload

```json
{
  "id": "evt_1234567890",
  "event_type": "payment.completed",
  "payment_id": "pay_abc123",
  "created_at": "2026-03-10T14:05:32Z",
  "payment": {
    "id": "pay_abc123",
    "merchant_id": "mer_xxx",
    "amount": 199.9,
    "currency": "BRL",
    "status": "completed",
    "description": "Order #123",
    "external_id": "order_abc123",
    "payment_method": "pix",
    "paid_at": "2026-03-10T14:05:32Z",
    "created_at": "2026-03-10T14:00:00Z",
    "metadata": {
      "customer_id": "cust_123"
    }
  }
}
```

---

## Signature Verification

**Always verify webhook signatures** to ensure requests come from WolkPay.

### Signature Header

```
X-WolkPay-Signature: sha256=abc123...
```

### Verification Algorithm

1. Get raw request body (as bytes)
2. Compute HMAC-SHA256 with your webhook secret
3. Compare with signature header

### Code Examples

**Python:**

```python
import hmac
import hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(f"sha256={expected}", signature)

# Usage
@app.post("/webhooks/wolkpay")
async def webhook_handler(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-WolkPay-Signature", "")

    if not verify_webhook(payload, signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=400)

    event = await request.json()
    # Process event...
```

**Node.js:**

```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifyWebhook(
  payload: Buffer,
  signature: string,
  secret: string,
): boolean {
  const expected = `sha256=${createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Express.js
app.post(
  "/webhooks/wolkpay",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["x-wolkpay-signature"] as string;

    if (!verifyWebhook(req.body, signature, WEBHOOK_SECRET)) {
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());
    // Process event...
  },
);
```

**PHP:**

```php
function verifyWebhook(string $payload, string $signature, string $secret): bool {
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature);
}

// Usage
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WOLKPAY_SIGNATURE'] ?? '';

if (!verifyWebhook($payload, $signature, WEBHOOK_SECRET)) {
    http_response_code(400);
    exit('Invalid signature');
}

$event = json_decode($payload, true);
// Process event...
```

---

## Handling Events

### Best Practices

1. **Return 200 quickly** - Process async if needed
2. **Handle duplicates** - Events may be sent multiple times
3. **Use idempotency** - Check if already processed
4. **Log everything** - For debugging and audit

### Example Handler

```python
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks

app = FastAPI()

async def process_payment_completed(event: dict):
    payment = event["payment"]
    external_id = payment["external_id"]

    # Check if already processed (idempotency)
    order = await get_order(external_id)
    if order.status == "paid":
        return  # Already processed

    # Update order
    order.status = "paid"
    order.paid_at = payment["paid_at"]
    await order.save()

    # Send confirmation email
    await send_order_confirmation(order)

@app.post("/webhooks/wolkpay")
async def webhook_handler(
    request: Request,
    background_tasks: BackgroundTasks
):
    # Verify signature first
    payload = await request.body()
    signature = request.headers.get("X-WolkPay-Signature", "")

    if not verify_webhook(payload, signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=400, detail="Invalid signature")

    event = await request.json()
    event_type = event["event_type"]

    # Log event
    logger.info(f"Received webhook: {event_type} - {event['id']}")

    # Process in background for quick response
    if event_type == "payment.completed":
        background_tasks.add_task(process_payment_completed, event)
    elif event_type == "payment.failed":
        background_tasks.add_task(process_payment_failed, event)
    elif event_type == "payment.expired":
        background_tasks.add_task(process_payment_expired, event)

    # Return 200 immediately
    return {"received": True}
```

---

## Retry Policy

If your endpoint returns an error (non-2xx), WolkPay will retry:

| Attempt | Delay      |
| ------- | ---------- |
| 1       | Immediate  |
| 2       | 5 minutes  |
| 3       | 30 minutes |
| 4       | 2 hours    |
| 5       | 24 hours   |

After 5 failed attempts, the event is marked as failed.

### View Failed Events

```http
GET /gateway/webhooks/events?delivered=false
```

---

## Testing Webhooks

### Local Development

Use [ngrok](https://ngrok.com) to expose your local server:

```bash
# Terminal 1: Start your server
python app.py

# Terminal 2: Start ngrok
ngrok http 8000
```

Use the ngrok URL as your webhook URL:

```
https://abc123.ngrok.io/webhooks/wolkpay
```

### Manual Testing

Send a test webhook from your terminal:

```bash
# Generate test signature
SECRET="whsec_your_secret"
PAYLOAD='{"event_type":"payment.completed","payment_id":"test_123"}'
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)"

# Send test request
curl -X POST https://yoursite.com/webhooks/wolkpay \
  -H "Content-Type: application/json" \
  -H "X-WolkPay-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

---

## Troubleshooting

### Event Not Received

1. Check webhook URL is correct
2. Verify endpoint is publicly accessible
3. Check server logs for errors
4. Ensure 200 response within 30 seconds

### Signature Verification Fails

1. Use raw body bytes, not parsed JSON
2. Check webhook secret is correct
3. Ensure no middleware modifies body
4. Compare full signature including `sha256=` prefix

### Duplicate Events

Implement idempotency:

```python
# Store processed event IDs
processed_events = set()

def handle_event(event: dict):
    event_id = event["id"]

    if event_id in processed_events:
        return  # Skip duplicate

    # Process event...

    processed_events.add(event_id)
```

---

## Security Checklist

- [ ] Always verify webhook signatures
- [ ] Use HTTPS endpoints only
- [ ] Implement idempotency checks
- [ ] Log all webhook events
- [ ] Handle timeouts (respond within 30s)
- [ ] Rotate webhook secrets periodically

---

## Support

- 📚 [API Reference](./API_REFERENCE.md)
- 📖 [Integration Guide](./INTEGRATION_GUIDE.md)
- 💬 [Discord](https://discord.gg/wolknow)
- 📧 [support@wolknow.com](mailto:support@wolknow.com)
