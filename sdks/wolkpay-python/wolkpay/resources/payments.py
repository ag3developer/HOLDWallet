"""
Payments Resource
"""

from typing import Optional, Dict, Any, List, TYPE_CHECKING

from ..types import Payment, PaymentStatus, PaymentMethod

if TYPE_CHECKING:
    from ..client import WolkPay


class PaymentsResource:
    """
    Payments API Resource
    
    Create and manage payment requests.
    
    Example:
        >>> payment = client.payments.create(
        ...     amount=100.00,
        ...     currency="BRL",
        ...     description="Order #123"
        ... )
        >>> print(payment.checkout_url)
    """
    
    def __init__(self, client: "WolkPay"):
        self.client = client
    
    def create(
        self,
        amount: float,
        currency: str = "BRL",
        description: Optional[str] = None,
        external_id: Optional[str] = None,
        payment_method: Optional[str] = None,
        crypto_currency: Optional[str] = None,
        expires_in: int = 3600,
        metadata: Optional[Dict[str, Any]] = None,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None
    ) -> Payment:
        """
        Create a new payment request
        
        Args:
            amount: Payment amount (e.g., 100.00)
            currency: Currency code (default: BRL)
            description: Payment description (shown to customer)
            external_id: Your internal reference ID
            payment_method: Force specific method ("pix" or "crypto")
            crypto_currency: Preferred crypto (BTC, ETH, USDT, etc.)
            expires_in: Expiration time in seconds (default: 3600)
            metadata: Additional data to store with payment
            success_url: Redirect URL after successful payment
            cancel_url: Redirect URL if customer cancels
            
        Returns:
            Payment object with checkout_url
            
        Example:
            >>> payment = client.payments.create(
            ...     amount=199.90,
            ...     description="Premium Plan - Monthly",
            ...     external_id="order_abc123",
            ...     metadata={"customer_id": "cust_123"}
            ... )
            >>> 
            >>> # Redirect customer to checkout
            >>> print(payment.checkout_url)
        """
        data = {
            "amount": amount,
            "currency": currency,
            "expires_in": expires_in
        }
        
        if description:
            data["description"] = description
        if external_id:
            data["external_id"] = external_id
        if payment_method:
            data["payment_method"] = payment_method
        if crypto_currency:
            data["crypto_currency"] = crypto_currency
        if metadata:
            data["metadata"] = metadata
        if success_url:
            data["success_url"] = success_url
        if cancel_url:
            data["cancel_url"] = cancel_url
        
        response = self.client.post("payments", data=data)
        return Payment.from_dict(response)
    
    def retrieve(self, payment_id: str) -> Payment:
        """
        Retrieve a payment by ID
        
        Args:
            payment_id: The payment ID
            
        Returns:
            Payment object
            
        Example:
            >>> payment = client.payments.retrieve("pay_xxx")
            >>> print(f"Status: {payment.status}")
        """
        response = self.client.get(f"payments/{payment_id}")
        return Payment.from_dict(response)
    
    def list(
        self,
        status: Optional[str] = None,
        payment_method: Optional[str] = None,
        external_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> List[Payment]:
        """
        List payments with optional filters
        
        Args:
            status: Filter by status (pending, completed, etc.)
            payment_method: Filter by method (pix, crypto)
            external_id: Filter by external reference
            date_from: Start date (ISO format)
            date_to: End date (ISO format)
            page: Page number (default: 1)
            limit: Items per page (default: 20, max: 100)
            
        Returns:
            List of Payment objects
            
        Example:
            >>> payments = client.payments.list(
            ...     status="completed",
            ...     date_from="2026-01-01"
            ... )
            >>> for p in payments:
            ...     print(f"{p.id}: {p.amount} {p.currency}")
        """
        params = {
            "page": page,
            "limit": min(limit, 100)
        }
        
        if status:
            params["status"] = status
        if payment_method:
            params["payment_method"] = payment_method
        if external_id:
            params["external_id"] = external_id
        if date_from:
            params["date_from"] = date_from
        if date_to:
            params["date_to"] = date_to
        
        response = self.client.get("payments", params=params)
        
        # Handle paginated response
        if isinstance(response, dict) and "data" in response:
            return [Payment.from_dict(p) for p in response["data"]]
        elif isinstance(response, list):
            return [Payment.from_dict(p) for p in response]
        
        return []
    
    def cancel(self, payment_id: str) -> Payment:
        """
        Cancel a pending payment
        
        Only pending payments can be cancelled.
        
        Args:
            payment_id: The payment ID
            
        Returns:
            Updated Payment object
            
        Example:
            >>> payment = client.payments.cancel("pay_xxx")
            >>> print(payment.status)  # "cancelled"
        """
        response = self.client.post(f"payments/{payment_id}/cancel")
        return Payment.from_dict(response)
    
    def get_status(self, payment_id: str) -> PaymentStatus:
        """
        Get payment status only (lightweight)
        
        Args:
            payment_id: The payment ID
            
        Returns:
            PaymentStatus enum value
        """
        payment = self.retrieve(payment_id)
        return payment.status
    
    def wait_for_completion(
        self,
        payment_id: str,
        timeout: int = 300,
        poll_interval: int = 5
    ) -> Payment:
        """
        Wait for payment to complete (blocking)
        
        Polls the payment status until it's completed, failed, or expired.
        
        Args:
            payment_id: The payment ID
            timeout: Maximum wait time in seconds
            poll_interval: Time between status checks
            
        Returns:
            Final Payment object
            
        Raises:
            TimeoutError: If payment doesn't complete within timeout
            
        Example:
            >>> payment = client.payments.create(amount=100.00)
            >>> # This will block until payment is confirmed
            >>> completed = client.payments.wait_for_completion(
            ...     payment.id,
            ...     timeout=600
            ... )
        """
        import time
        
        start_time = time.time()
        terminal_statuses = {
            PaymentStatus.COMPLETED,
            PaymentStatus.FAILED,
            PaymentStatus.EXPIRED,
            PaymentStatus.CANCELLED,
            PaymentStatus.REFUNDED
        }
        
        while True:
            payment = self.retrieve(payment_id)
            
            if payment.status in terminal_statuses:
                return payment
            
            elapsed = time.time() - start_time
            if elapsed >= timeout:
                raise TimeoutError(
                    f"Payment {payment_id} did not complete within {timeout} seconds"
                )
            
            time.sleep(poll_interval)
