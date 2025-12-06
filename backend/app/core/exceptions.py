from fastapi import HTTPException, status
from typing import Optional, Dict, Any

class BaseCustomException(HTTPException):
    """Base exception class for custom application exceptions."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class AuthenticationError(BaseCustomException):
    """Authentication related errors."""
    
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )

class AuthorizationError(BaseCustomException):
    """Authorization related errors."""
    
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )

class NotFoundError(BaseCustomException):
    """Resource not found errors."""
    
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )

class ValidationError(BaseCustomException):
    """Validation related errors."""
    
    def __init__(self, detail: str = "Validation failed"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class WalletError(BaseCustomException):
    """Wallet operation errors."""
    
    def __init__(self, detail: str = "Wallet operation failed"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class BlockchainError(BaseCustomException):
    """Blockchain interaction errors."""
    
    def __init__(self, detail: str = "Blockchain operation failed"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )

class TransactionError(BaseCustomException):
    """Transaction related errors."""
    
    def __init__(self, detail: str = "Transaction failed"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class PriceServiceError(BaseCustomException):
    """Price service errors."""
    
    def __init__(self, detail: str = "Price service unavailable"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )

class ExternalServiceError(BaseCustomException):
    """External service errors."""
    
    def __init__(self, detail: str = "External service unavailable"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )

class RateLimitError(BaseCustomException):
    """Rate limiting errors."""
    
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail
        )

# Common error messages
ERROR_MESSAGES = {
    "INVALID_CREDENTIALS": "Invalid username or password",
    "USER_NOT_FOUND": "User not found",
    "USER_ALREADY_EXISTS": "User already exists",
    "WALLET_NOT_FOUND": "Wallet not found", 
    "ADDRESS_NOT_FOUND": "Address not found",
    "INVALID_ADDRESS": "Invalid address format",
    "INVALID_NETWORK": "Invalid network",
    "INSUFFICIENT_BALANCE": "Insufficient balance",
    "TRANSACTION_FAILED": "Transaction failed",
    "BLOCKCHAIN_UNAVAILABLE": "Blockchain service unavailable",
    "PRICE_UNAVAILABLE": "Price service unavailable",
    "INVALID_TOKEN": "Invalid or expired token",
    "PERMISSION_DENIED": "Permission denied"
}
