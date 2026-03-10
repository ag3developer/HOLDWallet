"""
WolkPay Python SDK
==================

Official Python SDK for WolkPay Gateway - Accept PIX and Crypto payments.

Basic Usage:
    from wolkpay import WolkPay

    client = WolkPay(api_key="sk_live_...")
    
    payment = client.payments.create(
        amount=100.00,
        currency="BRL",
        description="Order #123"
    )
    
    print(payment.checkout_url)
"""

__version__ = "1.0.0"
__author__ = "WolkNow"
__email__ = "dev@wolknow.com"

from .client import WolkPay
from .exceptions import (
    WolkPayError,
    AuthenticationError,
    ValidationError,
    APIError,
    RateLimitError,
    WebhookError
)
from .types import (
    Payment,
    PaymentStatus,
    PaymentMethod,
    Merchant,
    ApiKey,
    WebhookEvent
)

__all__ = [
    "WolkPay",
    "WolkPayError",
    "AuthenticationError",
    "ValidationError",
    "APIError",
    "RateLimitError",
    "WebhookError",
    "Payment",
    "PaymentStatus",
    "PaymentMethod",
    "Merchant",
    "ApiKey",
    "WebhookEvent"
]
