"""
WolkPay Exceptions
"""

from typing import Optional, Dict, List, Any


class WolkPayError(Exception):
    """Base exception for all WolkPay errors"""
    
    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        code: Optional[str] = None
    ):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)
    
    def __str__(self) -> str:
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


class AuthenticationError(WolkPayError):
    """
    Authentication failed
    
    Raised when:
    - API key is missing or invalid
    - API key has been revoked
    - API key doesn't have required permissions
    """
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401, code="authentication_error")


class ValidationError(WolkPayError):
    """
    Request validation failed
    
    Raised when request parameters are invalid.
    Check the 'errors' attribute for field-specific errors.
    """
    
    def __init__(
        self,
        message: str = "Validation failed",
        errors: Optional[List[Dict[str, Any]]] = None
    ):
        super().__init__(message, status_code=422, code="validation_error")
        self.errors = errors or []
    
    def __str__(self) -> str:
        if self.errors:
            error_details = "; ".join(
                f"{e.get('loc', ['unknown'])[-1]}: {e.get('msg', 'invalid')}"
                for e in self.errors
            )
            return f"{self.message} - {error_details}"
        return self.message


class APIError(WolkPayError):
    """
    Server-side API error
    
    Raised for 5xx errors or unexpected server responses.
    """
    
    def __init__(
        self,
        message: str = "API error",
        status_code: int = 500
    ):
        super().__init__(message, status_code=status_code, code="api_error")


class RateLimitError(WolkPayError):
    """
    Rate limit exceeded
    
    Too many requests sent in a short period.
    Check 'retry_after' for seconds to wait before retrying.
    """
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: int = 60
    ):
        super().__init__(message, status_code=429, code="rate_limit_error")
        self.retry_after = retry_after
    
    def __str__(self) -> str:
        return f"{self.message} - Retry after {self.retry_after} seconds"


class WebhookError(WolkPayError):
    """
    Webhook verification error
    
    Raised when webhook signature validation fails.
    """
    
    def __init__(self, message: str = "Webhook verification failed"):
        super().__init__(message, status_code=400, code="webhook_error")
