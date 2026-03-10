# WolkPay Gateway - Code Examples

> Ready-to-use code examples for common integration scenarios

---

## Table of Contents

1. [E-commerce Checkout](#e-commerce-checkout)
2. [Subscription Billing](#subscription-billing)
3. [Invoice Payments](#invoice-payments)
4. [Donation Page](#donation-page)
5. [API-Only Integration](#api-only-integration)
6. [Webhook Handlers](#webhook-handlers)

---

## E-commerce Checkout

### Python (FastAPI)

```python
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from wolkpay import WolkPay
import os

app = FastAPI()
wolkpay = WolkPay(api_key=os.environ["WOLKPAY_API_KEY"])

class CheckoutRequest(BaseModel):
    order_id: str
    amount: float
    items: list[dict]
    customer_email: str

@app.post("/api/checkout")
async def create_checkout(data: CheckoutRequest):
    # Create payment
    payment = wolkpay.payments.create(
        amount=data.amount,
        currency="BRL",
        description=f"Order #{data.order_id}",
        external_id=data.order_id,
        metadata={
            "customer_email": data.customer_email,
            "items": data.items
        },
        success_url=f"https://yoursite.com/orders/{data.order_id}/success",
        cancel_url=f"https://yoursite.com/cart"
    )

    return {
        "checkout_url": payment.checkout_url,
        "payment_id": payment.id
    }

@app.post("/webhooks/wolkpay")
async def handle_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-WolkPay-Signature", "")

    if not WolkPay.verify_webhook_signature(
        payload, signature, os.environ["WOLKPAY_WEBHOOK_SECRET"]
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")

    event = await request.json()

    if event["event_type"] == "payment.completed":
        order_id = event["payment"]["external_id"]
        # Update order status in database
        await update_order_status(order_id, "paid")
        # Send confirmation email
        await send_confirmation_email(order_id)

    return {"received": True}
```

### Node.js (Express)

```typescript
import express from "express";
import WolkPay from "wolkpay";

const app = express();
const wolkpay = new WolkPay(process.env.WOLKPAY_API_KEY!);

// Checkout endpoint
app.post("/api/checkout", express.json(), async (req, res) => {
  const { orderId, amount, items, customerEmail } = req.body;

  try {
    const payment = await wolkpay.payments.create({
      amount,
      currency: "BRL",
      description: `Order #${orderId}`,
      externalId: orderId,
      metadata: {
        customerEmail,
        items,
      },
      successUrl: `https://yoursite.com/orders/${orderId}/success`,
      cancelUrl: "https://yoursite.com/cart",
    });

    res.json({
      checkoutUrl: payment.checkoutUrl,
      paymentId: payment.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
app.post(
  "/webhooks/wolkpay",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["x-wolkpay-signature"] as string;

    try {
      const event = WolkPay.constructEvent(
        req.body,
        signature,
        process.env.WOLKPAY_WEBHOOK_SECRET!,
      );

      if (event.event_type === "payment.completed") {
        const orderId = event.payment.external_id;
        await updateOrderStatus(orderId, "paid");
        await sendConfirmationEmail(orderId);
      }

      res.json({ received: true });
    } catch (error) {
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  },
);

app.listen(3000);
```

### PHP (Laravel)

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use WolkPay\WolkPay;
use App\Models\Order;
use App\Jobs\SendOrderConfirmation;

class CheckoutController extends Controller
{
    private WolkPay $wolkpay;

    public function __construct()
    {
        $this->wolkpay = new WolkPay(config('services.wolkpay.key'));
    }

    public function createCheckout(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|string',
            'amount' => 'required|numeric|min:1',
            'items' => 'required|array',
            'customer_email' => 'required|email'
        ]);

        $payment = $this->wolkpay->payments->create([
            'amount' => $validated['amount'],
            'currency' => 'BRL',
            'description' => "Order #{$validated['order_id']}",
            'external_id' => $validated['order_id'],
            'metadata' => [
                'customer_email' => $validated['customer_email'],
                'items' => $validated['items']
            ],
            'success_url' => route('orders.success', $validated['order_id']),
            'cancel_url' => route('cart')
        ]);

        return response()->json([
            'checkout_url' => $payment->checkout_url,
            'payment_id' => $payment->id
        ]);
    }

    public function handleWebhook(Request $request)
    {
        $payload = $request->getContent();
        $signature = $request->header('X-WolkPay-Signature');

        try {
            $event = WolkPay::constructEvent(
                $payload,
                $signature,
                config('services.wolkpay.webhook_secret')
            );
        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        if ($event['event_type'] === 'payment.completed') {
            $orderId = $event['payment']['external_id'];

            Order::where('id', $orderId)->update(['status' => 'paid']);
            SendOrderConfirmation::dispatch($orderId);
        }

        return response()->json(['received' => true]);
    }
}
```

---

## Subscription Billing

### Python

```python
from wolkpay import WolkPay
from datetime import datetime
from typing import Optional

class SubscriptionBilling:
    def __init__(self, api_key: str):
        self.client = WolkPay(api_key=api_key)

    def create_subscription_payment(
        self,
        subscription_id: str,
        customer_email: str,
        plan_name: str,
        amount: float,
        billing_period: Optional[str] = None
    ):
        """Create a payment for subscription billing."""

        if not billing_period:
            billing_period = datetime.now().strftime("%Y-%m")

        payment = self.client.payments.create(
            amount=amount,
            currency="BRL",
            description=f"{plan_name} - {billing_period}",
            external_id=f"sub_{subscription_id}_{billing_period}",
            expires_in=86400 * 3,  # 3 days to pay
            metadata={
                "subscription_id": subscription_id,
                "customer_email": customer_email,
                "plan_name": plan_name,
                "billing_period": billing_period,
                "type": "subscription"
            }
        )

        return payment

    def send_payment_reminder(self, subscription):
        """Send payment link to customer."""
        payment = self.create_subscription_payment(
            subscription_id=subscription.id,
            customer_email=subscription.customer_email,
            plan_name=subscription.plan_name,
            amount=subscription.price
        )

        # Send email with payment link
        send_email(
            to=subscription.customer_email,
            subject=f"Payment Required - {subscription.plan_name}",
            template="subscription_payment",
            context={
                "plan_name": subscription.plan_name,
                "amount": payment.amount,
                "checkout_url": payment.checkout_url,
                "expires_at": payment.expires_at
            }
        )

        return payment

# Usage
billing = SubscriptionBilling(api_key="sk_live_xxx")

# Send monthly invoice
for subscription in get_active_subscriptions():
    billing.send_payment_reminder(subscription)
```

---

## Invoice Payments

### Node.js

```typescript
import WolkPay from "wolkpay";

interface Invoice {
  id: string;
  customerId: string;
  customerEmail: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  dueDate: Date;
}

class InvoicePayments {
  private wolkpay: WolkPay;

  constructor(apiKey: string) {
    this.wolkpay = new WolkPay(apiKey);
  }

  async createInvoicePayment(invoice: Invoice) {
    const total = invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const itemsDescription = invoice.items
      .map((i) => `${i.quantity}x ${i.description}`)
      .join(", ");

    const payment = await this.wolkpay.payments.create({
      amount: total,
      currency: "BRL",
      description: `Invoice #${invoice.id}: ${itemsDescription}`,
      externalId: `inv_${invoice.id}`,
      expiresIn: Math.floor((invoice.dueDate.getTime() - Date.now()) / 1000),
      metadata: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        items: invoice.items,
      },
    });

    return {
      paymentId: payment.id,
      checkoutUrl: payment.checkoutUrl,
      amount: payment.amount,
      expiresAt: payment.expiresAt,
    };
  }

  async sendInvoiceEmail(invoice: Invoice) {
    const paymentInfo = await this.createInvoicePayment(invoice);

    await sendEmail({
      to: invoice.customerEmail,
      subject: `Invoice #${invoice.id} - Payment Required`,
      template: "invoice_payment",
      data: {
        invoiceId: invoice.id,
        items: invoice.items,
        total: paymentInfo.amount,
        checkoutUrl: paymentInfo.checkoutUrl,
        dueDate: invoice.dueDate,
      },
    });

    return paymentInfo;
  }
}

// Usage
const invoices = new InvoicePayments("sk_live_xxx");

const invoice: Invoice = {
  id: "INV-2026-001",
  customerId: "cust_123",
  customerEmail: "customer@example.com",
  items: [
    { description: "Web Development", quantity: 40, unitPrice: 150 },
    { description: "Hosting (Monthly)", quantity: 1, unitPrice: 99 },
  ],
  dueDate: new Date("2026-03-31"),
};

await invoices.sendInvoiceEmail(invoice);
```

---

## Donation Page

### React Component

```tsx
import React, { useState } from "react";

interface DonationFormProps {
  apiEndpoint: string;
  organizationName: string;
}

const DonationForm: React.FC<DonationFormProps> = ({
  apiEndpoint,
  organizationName,
}) => {
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [donorName, setDonorName] = useState<string>("");
  const [donorEmail, setDonorEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const predefinedAmounts = [25, 50, 100, 250, 500];

  const handleDonate = async () => {
    setLoading(true);

    const donationAmount = customAmount ? parseFloat(customAmount) : amount;

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: donationAmount,
          donorName,
          donorEmail,
          organizationName,
        }),
      });

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (error) {
      alert("Error processing donation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donation-form">
      <h2>Support {organizationName}</h2>

      <div className="amount-selection">
        {predefinedAmounts.map((preset) => (
          <button
            key={preset}
            className={amount === preset && !customAmount ? "selected" : ""}
            onClick={() => {
              setAmount(preset);
              setCustomAmount("");
            }}
          >
            R${preset}
          </button>
        ))}

        <input
          type="number"
          placeholder="Custom amount"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
        />
      </div>

      <div className="donor-info">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email for receipt"
          value={donorEmail}
          onChange={(e) => setDonorEmail(e.target.value)}
          required
        />
      </div>

      <button
        onClick={handleDonate}
        disabled={loading}
        className="donate-button"
      >
        {loading ? "Processing..." : `Donate R$${customAmount || amount}`}
      </button>
    </div>
  );
};

export default DonationForm;
```

### Backend Handler

```python
from fastapi import FastAPI
from pydantic import BaseModel
from wolkpay import WolkPay

app = FastAPI()
wolkpay = WolkPay(api_key="sk_live_xxx")

class DonationRequest(BaseModel):
    amount: float
    donor_name: str = "Anonymous"
    donor_email: str
    organization_name: str

@app.post("/api/donations")
async def create_donation(data: DonationRequest):
    payment = wolkpay.payments.create(
        amount=data.amount,
        currency="BRL",
        description=f"Donation to {data.organization_name}",
        external_id=f"donation_{uuid.uuid4()}",
        metadata={
            "type": "donation",
            "donor_name": data.donor_name,
            "donor_email": data.donor_email,
            "organization": data.organization_name
        },
        success_url="https://yoursite.com/thank-you",
        cancel_url="https://yoursite.com/donate"
    )

    return {"checkout_url": payment.checkout_url}
```

---

## API-Only Integration

### Custom PIX Display

```python
from wolkpay import WolkPay
import qrcode
import io
import base64

wolkpay = WolkPay(api_key="sk_live_xxx")

def create_pix_payment(amount: float, description: str):
    """Create payment and get PIX data for custom display."""

    payment = wolkpay.payments.create(
        amount=amount,
        description=description,
        payment_method="pix"  # Force PIX only
    )

    # Generate QR code image if not provided
    if payment.pix_qr_code:
        qr_image = payment.pix_qr_code
    else:
        qr = qrcode.make(payment.pix_code)
        buffer = io.BytesIO()
        qr.save(buffer, format="PNG")
        qr_image = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"

    return {
        "payment_id": payment.id,
        "pix_code": payment.pix_code,
        "qr_code_image": qr_image,
        "amount": payment.amount,
        "expires_at": payment.expires_at.isoformat()
    }

def check_payment_status(payment_id: str):
    """Poll for payment status."""
    payment = wolkpay.payments.retrieve(payment_id)

    return {
        "status": payment.status,
        "is_completed": payment.is_completed(),
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None
    }
```

---

## Webhook Handlers

### Complete Webhook Handler (Python)

```python
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from wolkpay import WolkPay
import logging

app = FastAPI()
logger = logging.getLogger(__name__)

WEBHOOK_SECRET = "whsec_xxx"

async def handle_payment_completed(event: dict):
    """Process completed payment."""
    payment = event["payment"]
    external_id = payment["external_id"]
    metadata = payment.get("metadata", {})

    payment_type = metadata.get("type", "order")

    if payment_type == "order":
        await process_order_payment(external_id, payment)
    elif payment_type == "subscription":
        await process_subscription_payment(external_id, payment)
    elif payment_type == "donation":
        await process_donation(external_id, payment)
    elif payment_type == "invoice":
        await process_invoice_payment(external_id, payment)

async def handle_payment_failed(event: dict):
    """Handle failed payment."""
    payment = event["payment"]
    external_id = payment["external_id"]

    # Log failure
    logger.warning(f"Payment failed: {payment['id']} for {external_id}")

    # Notify customer
    email = payment.get("metadata", {}).get("customer_email")
    if email:
        await send_payment_failed_email(email, external_id)

async def handle_payment_expired(event: dict):
    """Handle expired payment."""
    payment = event["payment"]
    external_id = payment["external_id"]

    # Mark order as expired
    await update_order_status(external_id, "payment_expired")

    # Optionally create new payment link
    # await create_new_payment_link(external_id)

@app.post("/webhooks/wolkpay")
async def webhook_handler(
    request: Request,
    background_tasks: BackgroundTasks
):
    payload = await request.body()
    signature = request.headers.get("X-WolkPay-Signature", "")

    # Verify signature
    if not WolkPay.verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        logger.warning("Invalid webhook signature received")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event = await request.json()
    event_type = event["event_type"]
    event_id = event["id"]

    # Log event
    logger.info(f"Webhook received: {event_type} ({event_id})")

    # Check for duplicate (idempotency)
    if await is_event_processed(event_id):
        logger.info(f"Duplicate event skipped: {event_id}")
        return {"received": True, "duplicate": True}

    # Route to handler
    handlers = {
        "payment.completed": handle_payment_completed,
        "payment.failed": handle_payment_failed,
        "payment.expired": handle_payment_expired,
        "payment.cancelled": handle_payment_cancelled,
        "pix.received": handle_pix_received,
        "crypto.confirmed": handle_crypto_confirmed,
    }

    handler = handlers.get(event_type)
    if handler:
        background_tasks.add_task(handler, event)

    # Mark event as processed
    await mark_event_processed(event_id)

    return {"received": True}
```

---

## More Examples

For more examples and use cases, check:

- [GitHub Examples Repository](https://github.com/wolknow/wolkpay-examples)
- [API Reference](./API_REFERENCE.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)

---

**Last Updated:** March 10, 2026
