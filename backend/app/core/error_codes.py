"""
🔴 HOLD Wallet - Standardized Error Codes

Arquitetura profissional de códigos de erro para APIs REST.

Formato: CATEGORIA_SUBCATEGORIA_ERRO
Exemplos:
- AUTH_SESSION_EXPIRED      → 401 - Sessão expirou, precisa login
- AUTH_2FA_INVALID          → 403 - 2FA inválido, NÃO é problema de sessão
- AUTH_BIOMETRIC_EXPIRED    → 403 - Token biométrico expirou
- VALIDATION_BALANCE_LOW    → 400 - Saldo insuficiente
- BLOCKCHAIN_TX_FAILED      → 500 - Transação falhou na blockchain

O frontend usa esses códigos para decidir a ação correta.
"""
from enum import Enum
from typing import Dict, Any
from fastapi import HTTPException, status


class ErrorCategory(str, Enum):
    """Categorias de erro"""
    AUTH = "AUTH"           # Autenticação/Autorização
    VALIDATION = "VALIDATION"  # Validação de dados
    BLOCKCHAIN = "BLOCKCHAIN"  # Erros de blockchain
    BUSINESS = "BUSINESS"    # Regras de negócio
    SYSTEM = "SYSTEM"        # Erros de sistema


class ErrorCode(str, Enum):
    """
    Códigos de erro padronizados.
    
    Convenção:
    - Códigos AUTH_SESSION_* → 401 (logout)
    - Códigos AUTH_* (outros) → 403 (não logout)
    - Códigos VALIDATION_* → 400
    - Códigos BLOCKCHAIN_* → 500
    """
    
    # ========================================
    # AUTH - Erros de Autenticação (401/403)
    # ========================================
    
    # 401 - Sessão inválida (DEVE fazer logout)
    AUTH_SESSION_EXPIRED = "AUTH_SESSION_EXPIRED"
    AUTH_SESSION_INVALID = "AUTH_SESSION_INVALID"
    AUTH_TOKEN_MALFORMED = "AUTH_TOKEN_MALFORMED"
    AUTH_NOT_AUTHENTICATED = "AUTH_NOT_AUTHENTICATED"
    
    # 403 - Autorização negada (NÃO fazer logout)
    AUTH_2FA_REQUIRED = "AUTH_2FA_REQUIRED"
    AUTH_2FA_INVALID = "AUTH_2FA_INVALID"
    AUTH_BIOMETRIC_REQUIRED = "AUTH_BIOMETRIC_REQUIRED"
    AUTH_BIOMETRIC_EXPIRED = "AUTH_BIOMETRIC_EXPIRED"
    AUTH_BIOMETRIC_INVALID = "AUTH_BIOMETRIC_INVALID"
    AUTH_PERMISSION_DENIED = "AUTH_PERMISSION_DENIED"
    AUTH_IP_BLOCKED = "AUTH_IP_BLOCKED"
    AUTH_RATE_LIMITED = "AUTH_RATE_LIMITED"
    
    # ========================================
    # VALIDATION - Erros de Validação (400)
    # ========================================
    VALIDATION_REQUIRED_FIELD = "VALIDATION_REQUIRED_FIELD"
    VALIDATION_INVALID_FORMAT = "VALIDATION_INVALID_FORMAT"
    VALIDATION_BALANCE_INSUFFICIENT = "VALIDATION_BALANCE_INSUFFICIENT"
    VALIDATION_AMOUNT_TOO_LOW = "VALIDATION_AMOUNT_TOO_LOW"
    VALIDATION_AMOUNT_TOO_HIGH = "VALIDATION_AMOUNT_TOO_HIGH"
    VALIDATION_ADDRESS_INVALID = "VALIDATION_ADDRESS_INVALID"
    VALIDATION_NETWORK_INVALID = "VALIDATION_NETWORK_INVALID"
    
    # ========================================
    # BLOCKCHAIN - Erros de Blockchain (500)
    # ========================================
    BLOCKCHAIN_TX_FAILED = "BLOCKCHAIN_TX_FAILED"
    BLOCKCHAIN_GAS_TOO_LOW = "BLOCKCHAIN_GAS_TOO_LOW"
    BLOCKCHAIN_NONCE_ERROR = "BLOCKCHAIN_NONCE_ERROR"
    BLOCKCHAIN_RPC_ERROR = "BLOCKCHAIN_RPC_ERROR"
    BLOCKCHAIN_TIMEOUT = "BLOCKCHAIN_TIMEOUT"
    
    # ========================================
    # BUSINESS - Regras de Negócio (400/403)
    # ========================================
    BUSINESS_QUOTE_EXPIRED = "BUSINESS_QUOTE_EXPIRED"
    BUSINESS_LIMIT_EXCEEDED = "BUSINESS_LIMIT_EXCEEDED"
    BUSINESS_FEATURE_DISABLED = "BUSINESS_FEATURE_DISABLED"
    BUSINESS_KYC_REQUIRED = "BUSINESS_KYC_REQUIRED"
    
    # ========================================
    # SYSTEM - Erros de Sistema (500)
    # ========================================
    SYSTEM_DATABASE_ERROR = "SYSTEM_DATABASE_ERROR"
    SYSTEM_EXTERNAL_SERVICE = "SYSTEM_EXTERNAL_SERVICE"
    SYSTEM_INTERNAL_ERROR = "SYSTEM_INTERNAL_ERROR"


# Mapeamento de código → status HTTP
ERROR_STATUS_MAP: Dict[ErrorCode, int] = {
    # 401 - Sessão (logout)
    ErrorCode.AUTH_SESSION_EXPIRED: status.HTTP_401_UNAUTHORIZED,
    ErrorCode.AUTH_SESSION_INVALID: status.HTTP_401_UNAUTHORIZED,
    ErrorCode.AUTH_TOKEN_MALFORMED: status.HTTP_401_UNAUTHORIZED,
    ErrorCode.AUTH_NOT_AUTHENTICATED: status.HTTP_401_UNAUTHORIZED,
    
    # 403 - Autorização (não logout)
    ErrorCode.AUTH_2FA_REQUIRED: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_2FA_INVALID: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_BIOMETRIC_REQUIRED: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_BIOMETRIC_EXPIRED: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_BIOMETRIC_INVALID: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_PERMISSION_DENIED: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_IP_BLOCKED: status.HTTP_403_FORBIDDEN,
    ErrorCode.AUTH_RATE_LIMITED: status.HTTP_429_TOO_MANY_REQUESTS,
    
    # 400 - Validação
    ErrorCode.VALIDATION_REQUIRED_FIELD: status.HTTP_400_BAD_REQUEST,
    ErrorCode.VALIDATION_INVALID_FORMAT: status.HTTP_400_BAD_REQUEST,
    ErrorCode.VALIDATION_BALANCE_INSUFFICIENT: status.HTTP_400_BAD_REQUEST,
    ErrorCode.VALIDATION_AMOUNT_TOO_LOW: status.HTTP_400_BAD_REQUEST,
    ErrorCode.VALIDATION_AMOUNT_TOO_HIGH: status.HTTP_400_BAD_REQUEST,
    ErrorCode.VALIDATION_ADDRESS_INVALID: status.HTTP_400_BAD_REQUEST,
    ErrorCode.VALIDATION_NETWORK_INVALID: status.HTTP_400_BAD_REQUEST,
    
    # 500 - Blockchain/Sistema
    ErrorCode.BLOCKCHAIN_TX_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCode.BLOCKCHAIN_GAS_TOO_LOW: status.HTTP_400_BAD_REQUEST,
    ErrorCode.BLOCKCHAIN_NONCE_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCode.BLOCKCHAIN_RPC_ERROR: status.HTTP_503_SERVICE_UNAVAILABLE,
    ErrorCode.BLOCKCHAIN_TIMEOUT: status.HTTP_504_GATEWAY_TIMEOUT,
    
    # Business
    ErrorCode.BUSINESS_QUOTE_EXPIRED: status.HTTP_400_BAD_REQUEST,
    ErrorCode.BUSINESS_LIMIT_EXCEEDED: status.HTTP_403_FORBIDDEN,
    ErrorCode.BUSINESS_FEATURE_DISABLED: status.HTTP_403_FORBIDDEN,
    ErrorCode.BUSINESS_KYC_REQUIRED: status.HTTP_403_FORBIDDEN,
    
    # Sistema
    ErrorCode.SYSTEM_DATABASE_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
    ErrorCode.SYSTEM_EXTERNAL_SERVICE: status.HTTP_503_SERVICE_UNAVAILABLE,
    ErrorCode.SYSTEM_INTERNAL_ERROR: status.HTTP_500_INTERNAL_SERVER_ERROR,
}

# Mensagens amigáveis
ERROR_MESSAGES: Dict[ErrorCode, str] = {
    ErrorCode.AUTH_SESSION_EXPIRED: "Sua sessão expirou. Por favor, faça login novamente.",
    ErrorCode.AUTH_SESSION_INVALID: "Sessão inválida. Por favor, faça login novamente.",
    ErrorCode.AUTH_2FA_REQUIRED: "Autenticação de dois fatores necessária.",
    ErrorCode.AUTH_2FA_INVALID: "Código 2FA inválido. Tente novamente.",
    ErrorCode.AUTH_BIOMETRIC_EXPIRED: "Autenticação biométrica expirou. Autentique novamente.",
    ErrorCode.AUTH_BIOMETRIC_INVALID: "Autenticação biométrica inválida.",
    ErrorCode.VALIDATION_BALANCE_INSUFFICIENT: "Saldo insuficiente para esta operação.",
    ErrorCode.BLOCKCHAIN_TX_FAILED: "Transação falhou na blockchain. Tente novamente.",
    ErrorCode.BUSINESS_QUOTE_EXPIRED: "Cotação expirada. Solicite uma nova cotação.",
}


class APIError(HTTPException):
    """
    Exceção padronizada para erros de API.
    
    Uso:
        raise APIError(
            code=ErrorCode.AUTH_2FA_INVALID,
            message="Código 2FA incorreto",
            details={"attempts_remaining": 2}
        )
    """
    
    def __init__(
        self,
        code: ErrorCode,
        message: str = None,
        details: Dict[str, Any] = None
    ):
        self.error_code = code
        self.error_message = message or ERROR_MESSAGES.get(code, "Erro desconhecido")
        self.error_details = details or {}
        
        status_code = ERROR_STATUS_MAP.get(code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        super().__init__(
            status_code=status_code,
            detail={
                "code": code.value,
                "message": self.error_message,
                "details": self.error_details,
                # Flag explícita para o frontend
                "requires_logout": code.value.startswith("AUTH_SESSION_"),
                "requires_reauth": code.value in [
                    "AUTH_2FA_INVALID",
                    "AUTH_BIOMETRIC_EXPIRED",
                    "AUTH_BIOMETRIC_INVALID"
                ]
            }
        )


# Funções helper
def raise_session_expired():
    """Levanta erro de sessão expirada (401 - logout)"""
    raise APIError(ErrorCode.AUTH_SESSION_EXPIRED)


def raise_2fa_invalid(attempts_remaining: int = None):
    """Levanta erro de 2FA inválido (403 - não logout)"""
    details = {}
    if attempts_remaining is not None:
        details["attempts_remaining"] = attempts_remaining
    raise APIError(ErrorCode.AUTH_2FA_INVALID, details=details)


def raise_biometric_expired():
    """Levanta erro de biometria expirada (403 - não logout)"""
    raise APIError(ErrorCode.AUTH_BIOMETRIC_EXPIRED)


def raise_insufficient_balance(required: float, available: float, currency: str):
    """Levanta erro de saldo insuficiente (400)"""
    raise APIError(
        ErrorCode.VALIDATION_BALANCE_INSUFFICIENT,
        message=f"Saldo insuficiente. Necessário: {required} {currency}, Disponível: {available} {currency}",
        details={
            "required": required,
            "available": available,
            "currency": currency
        }
    )
