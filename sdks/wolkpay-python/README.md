# WolkPay Python SDK

Official Python SDK for **WolkPay Gateway** - Accept PIX and Cryptocurrency payments in Brazil.

## Installation

```bash
pip install wolkpay
```

## Quick Start

```python
from wolkpay import WolkPay

# Initialize client with your API key
client = WolkPay(api_key="sk_live_your_api_key")

# Create a payment
payment = client.payments.create(
    amount=100.00,
    currency="BRL",
    description="Order #123",
    external_id="order_abc123"
)

# Redirect customer to checkout
print(f"Checkout URL: {payment.checkout_url}")
```

## Features

- ✅ **PIX Payments** - Instant Brazilian payments
- ✅ **Crypto Payments** - BTC, ETH, USDT, USDC, and more
- ✅ **Webhook Support** - Real-time payment notifications
- ✅ **Type Hints** - Full typing support
- ✅ **Retry Logic** - Automatic request retries
- ✅ **Error Handling** - Detailed error messages

## Create Payments

### Basic Payment

```python
payment = client.payments.create(
    amount=199.90,
    description="Premium Plan"
)

print(payment.checkout_url)  # Send to customer
print(payment.id)            # Store for reference
```

### With Metadata

```python
payment = client.payments.create(
    amount=99.00,
    description="Monthly Subscription",
    external_id="sub_12345",
    metadata={
        "customer_id": "cust_abc",
        "plan": "premium"
    },
    success_url="https://yoursite.com/success",
    cancel_url="https://yoursite.com/cancel"
)
```

### Force Payment Method

```python
# PIX only
pix_payment = client.payments.create(
    amount=50.00,
    payment_method="pix"
)

# Crypto only (USDT)
crypto_payment = client.payments.create(
    amount=100.00,
    payment_method="crypto",
    crypto_currency="USDT"
)
```

## Retrieve Payments

```python
# Get single payment
payment = client.payments.retrieve("pay_xxx")
print(f"Status: {payment.status}")

# List all payments
payments = client.payments.list(
    status="completed",
    date_from="2026-01-01"
)

for p in payments:
    print(f"{p.id}: R${p.amount:.2f}")
```

## Cancel Payment

```python
# Only pending payments can be cancelled
cancelled = client.payments.cancel("pay_xxx")
print(cancelled.status)  # "cancelled"
```

## Webhooks

### Verify Webhook Signature

```python
from wolkpay import WolkPay

# In your webhook handler
@app.post("/webhooks/wolkpay")
async def handle_webhook(request):
    payload = await request.body()
    signature = request.headers.get("X-WolkPay-Signature")

    # Verify signature
    is_valid = WolkPay.verify_webhook_signature(
        payload=payload,
        signature=signature,
        secret="whsec_your_webhook_secret"
    )

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Process event
    event = json.loads(payload)

    if event["event_type"] == "payment.completed":
        payment_id = event["payment_id"]
        # Update your order status

    return {"received": True}
```

### Webhook Events

| Event                | Description                  |
| -------------------- | ---------------------------- |
| `payment.created`    | Payment request created      |
| `payment.pending`    | Awaiting customer payment    |
| `payment.processing` | Payment being processed      |
| `payment.completed`  | Payment successful           |
| `payment.failed`     | Payment failed               |
| `payment.expired`    | Payment expired              |
| `payment.cancelled`  | Payment cancelled            |
| `pix.received`       | PIX payment received         |
| `crypto.confirmed`   | Crypto transaction confirmed |

## Error Handling

```python
from wolkpay import WolkPay
from wolkpay.exceptions import (
    AuthenticationError,
    ValidationError,
    RateLimitError,
    APIError
)

client = WolkPay(api_key="sk_live_xxx")

try:
    payment = client.payments.create(amount=100.00)
except AuthenticationError as e:
    print(f"Invalid API key: {e}")
except ValidationError as e:
    print(f"Validation error: {e}")
    print(f"Field errors: {e.errors}")
except RateLimitError as e:
    print(f"Rate limit exceeded. Retry after {e.retry_after} seconds")
except APIError as e:
    print(f"API error: {e}")
```

## Test Mode

Use test API keys for development:

```python
# Test mode - no real payments processed
client = WolkPay(api_key="sk_test_xxx")

# Check if test mode
print(client.is_test_mode)  # True
```

## Configuration

```python
client = WolkPay(
    api_key="sk_live_xxx",
    base_url="https://api.wolknow.com",  # Custom API URL
    timeout=30,                           # Request timeout (seconds)
    max_retries=3                         # Retry attempts
)
```

## Requirements

- Python 3.8+
- requests

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📚 [Documentation](https://docs.wolknow.com/gateway)
- 💬 [Discord](https://discord.gg/wolknow)
- 📧 [Email](mailto:support@wolknow.com)
