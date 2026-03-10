"""
WolkPay Types and Data Classes
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List


class PaymentStatus(str, Enum):
    """Payment status values"""
    PENDING = "pending"
    AWAITING_PAYMENT = "awaiting_payment"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    """Supported payment methods"""
    PIX = "pix"
    CRYPTO = "crypto"


class CryptoCurrency(str, Enum):
    """Supported cryptocurrencies"""
    BTC = "BTC"
    ETH = "ETH"
    USDT = "USDT"
    USDC = "USDC"
    MATIC = "MATIC"
    BNB = "BNB"
    SOL = "SOL"


@dataclass
class Payment:
    """
    Payment object
    
    Represents a payment request created through the WolkPay Gateway.
    """
    id: str
    merchant_id: str
    amount: float
    currency: str
    status: PaymentStatus
    description: Optional[str] = None
    external_id: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    checkout_url: Optional[str] = None
    checkout_token: Optional[str] = None
    pix_code: Optional[str] = None
    pix_qr_code: Optional[str] = None
    crypto_address: Optional[str] = None
    crypto_currency: Optional[str] = None
    crypto_amount: Optional[float] = None
    crypto_network: Optional[str] = None
    expires_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Payment":
        """Create Payment from API response"""
        return cls(
            id=data["id"],
            merchant_id=data["merchant_id"],
            amount=float(data["amount"]),
            currency=data["currency"],
            status=PaymentStatus(data["status"]),
            description=data.get("description"),
            external_id=data.get("external_id"),
            payment_method=PaymentMethod(data["payment_method"]) if data.get("payment_method") else None,
            checkout_url=data.get("checkout_url"),
            checkout_token=data.get("checkout_token"),
            pix_code=data.get("pix_code"),
            pix_qr_code=data.get("pix_qr_code"),
            crypto_address=data.get("crypto_address"),
            crypto_currency=data.get("crypto_currency"),
            crypto_amount=float(data["crypto_amount"]) if data.get("crypto_amount") else None,
            crypto_network=data.get("crypto_network"),
            expires_at=_parse_datetime(data.get("expires_at")),
            paid_at=_parse_datetime(data.get("paid_at")),
            created_at=_parse_datetime(data.get("created_at")),
            updated_at=_parse_datetime(data.get("updated_at")),
            metadata=data.get("metadata") or {}
        )
    
    def is_completed(self) -> bool:
        """Check if payment is completed"""
        return self.status == PaymentStatus.COMPLETED
    
    def is_pending(self) -> bool:
        """Check if payment is still pending"""
        return self.status in (PaymentStatus.PENDING, PaymentStatus.AWAITING_PAYMENT)
    
    def is_expired(self) -> bool:
        """Check if payment has expired"""
        return self.status == PaymentStatus.EXPIRED


@dataclass
class Merchant:
    """Merchant account information"""
    id: str
    merchant_code: str
    company_name: str
    email: str
    status: str
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    created_at: Optional[datetime] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Merchant":
        return cls(
            id=data["id"],
            merchant_code=data["merchant_code"],
            company_name=data["company_name"],
            email=data["email"],
            status=data["status"],
            webhook_url=data.get("webhook_url"),
            webhook_secret=data.get("webhook_secret"),
            created_at=_parse_datetime(data.get("created_at"))
        )


@dataclass
class ApiKey:
    """API Key information"""
    id: str
    name: str
    prefix: str
    environment: str
    permissions: List[str]
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ApiKey":
        return cls(
            id=data["id"],
            name=data["name"],
            prefix=data["prefix"],
            environment=data["environment"],
            permissions=data.get("permissions", []),
            is_active=data.get("is_active", True),
            last_used_at=_parse_datetime(data.get("last_used_at")),
            created_at=_parse_datetime(data.get("created_at"))
        )


@dataclass
class WebhookEvent:
    """Webhook event data"""
    id: str
    event_type: str
    payment_id: str
    status: str
    delivered: bool
    delivered_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    payload: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WebhookEvent":
        return cls(
            id=data["id"],
            event_type=data["event_type"],
            payment_id=data["payment_id"],
            status=data["status"],
            delivered=data.get("delivered", False),
            delivered_at=_parse_datetime(data.get("delivered_at")),
            created_at=_parse_datetime(data.get("created_at")),
            payload=data.get("payload") or {}
        )


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    """Parse ISO datetime string"""
    if not value:
        return None
    try:
        # Handle various ISO formats
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
