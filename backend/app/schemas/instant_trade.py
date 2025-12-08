"""
🚀 HOLD Wallet - Instant Trade OTC Schemas
===========================================

Schemas Pydantic para validação de requests/responses da API OTC.

Author: HOLD Wallet Team
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal


class QuoteRequest(BaseModel):
    """Request para obter cotação OTC"""
    operation: Literal["buy", "sell"] = Field(..., description="Tipo de operação: buy ou sell")
    symbol: str = Field(..., description="Símbolo da criptomoeda: BTC, ETH, USDT, etc")
    fiat_amount: Optional[Decimal] = Field(None, description="Valor em BRL (para compra)")
    crypto_amount: Optional[Decimal] = Field(None, description="Quantidade em crypto (para venda)")
    
    @validator('symbol')
    def validate_symbol(cls, v):
        if not v or len(v) > 10:
            raise ValueError("Símbolo inválido")
        return v.upper()
    
    @validator('fiat_amount', 'crypto_amount', pre=True, always=True)
    def validate_amounts(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Valor deve ser maior que zero")
        return v


class QuoteResponse(BaseModel):
    """Response com cotação OTC"""
    quote_id: str = Field(..., description="ID da cotação (válido por 30s)")
    operation: str
    symbol: str
    crypto_price: Decimal = Field(..., description="Preço da crypto em BRL")
    fiat_amount: Decimal = Field(..., description="Valor em BRL")
    crypto_amount: Decimal = Field(..., description="Quantidade de crypto")
    spread_percentage: Decimal = Field(default=3.00, description="Spread OTC: 3%")
    spread_amount: Decimal = Field(..., description="Valor do spread")
    network_fee_percentage: Decimal = Field(default=0.25, description="Taxa de rede: 0.25%")
    network_fee_amount: Decimal = Field(..., description="Valor da taxa de rede")
    total_amount: Decimal = Field(..., description="Total a pagar (com taxas)")
    expires_in_seconds: int = Field(default=30, description="Cotação válida por N segundos")
    
    class Config:
        schema_extra = {
            "example": {
                "quote_id": "quote_123456",
                "operation": "buy",
                "symbol": "BTC",
                "crypto_price": "300000.00",
                "fiat_amount": "1000.00",
                "crypto_amount": "0.00335832",
                "spread_percentage": "3.00",
                "spread_amount": "30.00",
                "network_fee_percentage": "0.25",
                "network_fee_amount": "2.50",
                "total_amount": "1032.50",
                "expires_in_seconds": 30
            }
        }


class CreateTradeRequest(BaseModel):
    """Request para criar operação OTC usando uma cotação válida"""
    quote_id: str = Field(..., description="ID da cotação (obrigatório)")
    payment_method: Literal["pix", "ted", "credit_card", "debit_card", "paypal"] = Field(..., description="Método de pagamento")
    
    class Config:
        schema_extra = {
            "example": {
                "quote_id": "quote_123456",
                "payment_method": "pix"
            }
        }


class TradeStatusResponse(BaseModel):
    """Response com status de uma operação"""
    trade_id: str
    reference_code: str
    status: str = Field(..., description="Status: pending, payment_processing, payment_confirmed, completed, expired, cancelled, failed")
    operation: str
    symbol: str
    fiat_amount: Decimal
    crypto_amount: Decimal
    total_amount: Decimal
    payment_method: str
    expires_at: datetime
    payment_confirmed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    time_remaining_seconds: Optional[int] = None
    pix_qr_code: Optional[str] = None
    pix_copy_paste: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "trade_id": "trade_uuid_123",
                "reference_code": "OTC-2025-000123",
                "status": "payment_processing",
                "operation": "buy",
                "symbol": "BTC",
                "fiat_amount": "1032.50",
                "crypto_amount": "0.00335832",
                "total_amount": "1032.50",
                "payment_method": "pix",
                "expires_at": "2025-12-07T15:30:00",
                "time_remaining_seconds": 450,
                "pix_qr_code": "data:image/png;base64,...",
                "created_at": "2025-12-07T15:15:00"
            }
        }


class TradeListResponse(BaseModel):
    """Response com lista de operações"""
    trade_id: str
    reference_code: str
    operation: str
    symbol: str
    fiat_amount: Decimal
    crypto_amount: Decimal
    status: str
    payment_method: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        schema_extra = {
            "example": {
                "trade_id": "trade_uuid_123",
                "reference_code": "OTC-2025-000123",
                "operation": "buy",
                "symbol": "BTC",
                "fiat_amount": "1032.50",
                "crypto_amount": "0.00335832",
                "status": "completed",
                "payment_method": "pix",
                "created_at": "2025-12-07T15:15:00",
                "completed_at": "2025-12-07T15:20:00"
            }
        }


class TradeHistoryResponse(BaseModel):
    """Response com histórico de uma operação"""
    status_changes: List[dict] = Field(..., description="Lista de mudanças de status")
    current_status: str
    
    class Config:
        schema_extra = {
            "example": {
                "status_changes": [
                    {
                        "timestamp": "2025-12-07T15:15:00",
                        "old_status": None,
                        "new_status": "pending",
                        "reason": "Operação criada"
                    },
                    {
                        "timestamp": "2025-12-07T15:17:30",
                        "old_status": "pending",
                        "new_status": "payment_processing",
                        "reason": "Usuário confirmou operação"
                    }
                ],
                "current_status": "payment_processing"
            }
        }


class ErrorResponse(BaseModel):
    """Response de erro"""
    success: bool = False
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
