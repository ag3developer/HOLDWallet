"""
🛡️ HOLD Wallet - Admin Trade Schemas
====================================

Schemas para gestão de trades administrativos.
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum


class TradeStatus(str, Enum):
    """Status de um trade."""
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class TradeType(str, Enum):
    """Tipo de trade."""
    BUY = "buy"
    SELL = "sell"


class TradeBase(BaseModel):
    """Base schema para trades."""
    id: str
    user_id: str
    username: str
    type: TradeType
    asset: str
    amount: float
    price_usdt: float
    total_usdt: float
    status: TradeStatus
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TradeDetail(TradeBase):
    """Trade com detalhes completos."""
    user_email: Optional[str] = None
    fee_amount: float = 0.0
    fee_percent: float = 0.0
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None


class TradeListResponse(BaseModel):
    """Resposta de listagem de trades."""
    trades: List[TradeBase]
    total: int
    page: int
    per_page: int


class TradeListParams(BaseModel):
    """Parâmetros para listagem de trades."""
    skip: int = 0
    limit: int = 20
    status: Optional[TradeStatus] = None
    type: Optional[TradeType] = None
    search: Optional[str] = None
    user_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class TradeCancelRequest(BaseModel):
    """Request para cancelar trade."""
    reason: str
    refund: bool = True
    notify_user: bool = True


class TradeCancelResponse(BaseModel):
    """Response de cancelamento de trade."""
    trade_id: str
    status: TradeStatus
    cancelled_at: datetime
    cancelled_by: str
    reason: str
    refund_processed: bool
