"""
Webhooks Resource
"""

from typing import Optional, Dict, Any, List, TYPE_CHECKING

from ..types import WebhookEvent

if TYPE_CHECKING:
    from ..client import WolkPay


class WebhooksResource:
    """
    Webhooks API Resource
    
    Configure and manage webhook settings.
    """
    
    def __init__(self, client: "WolkPay"):
        self.client = client
    
    def get_events(
        self,
        delivered: Optional[bool] = None,
        event_type: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> List[WebhookEvent]:
        """
        List webhook events
        
        Args:
            delivered: Filter by delivery status
            event_type: Filter by event type
            page: Page number
            limit: Items per page
            
        Returns:
            List of WebhookEvent objects
            
        Example:
            >>> events = client.webhooks.get_events(delivered=False)
            >>> for event in events:
            ...     print(f"{event.event_type}: {event.payment_id}")
        """
        params = {"page": page, "limit": limit}
        
        if delivered is not None:
            params["delivered"] = delivered
        if event_type:
            params["event_type"] = event_type
        
        response = self.client.get("webhooks/events", params=params)
        
        if isinstance(response, dict) and "data" in response:
            return [WebhookEvent.from_dict(e) for e in response["data"]]
        elif isinstance(response, list):
            return [WebhookEvent.from_dict(e) for e in response]
        
        return []


# Webhook event types
class WebhookEventTypes:
    """Available webhook event types"""
    
    # Payment events
    PAYMENT_CREATED = "payment.created"
    PAYMENT_PENDING = "payment.pending"
    PAYMENT_PROCESSING = "payment.processing"
    PAYMENT_COMPLETED = "payment.completed"
    PAYMENT_FAILED = "payment.failed"
    PAYMENT_EXPIRED = "payment.expired"
    PAYMENT_CANCELLED = "payment.cancelled"
    PAYMENT_REFUNDED = "payment.refunded"
    
    # PIX specific
    PIX_RECEIVED = "pix.received"
    PIX_CONFIRMED = "pix.confirmed"
    
    # Crypto specific
    CRYPTO_DETECTED = "crypto.detected"
    CRYPTO_CONFIRMED = "crypto.confirmed"
    
    @classmethod
    def all(cls) -> List[str]:
        """Get all event types"""
        return [
            cls.PAYMENT_CREATED,
            cls.PAYMENT_PENDING,
            cls.PAYMENT_PROCESSING,
            cls.PAYMENT_COMPLETED,
            cls.PAYMENT_FAILED,
            cls.PAYMENT_EXPIRED,
            cls.PAYMENT_CANCELLED,
            cls.PAYMENT_REFUNDED,
            cls.PIX_RECEIVED,
            cls.PIX_CONFIRMED,
            cls.CRYPTO_DETECTED,
            cls.CRYPTO_CONFIRMED
        ]
