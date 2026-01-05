"""
🛡️ HOLD Wallet - Admin P2P Schemas
==================================

Schemas para gestão P2P administrativa.
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum


class P2POrderStatus(str, Enum):
    """Status de ordem P2P."""
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class P2POrderType(str, Enum):
    """Tipo de ordem P2P."""
    BUY = "buy"
    SELL = "sell"


class DisputeStatus(str, Enum):
    """Status de disputa."""
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"


class EscrowStatus(str, Enum):
    """Status de escrow."""
    PENDING = "pending"
    FUNDED = "funded"
    RELEASED = "released"
    REFUNDED = "refunded"
    DISPUTED = "disputed"


class P2POrderBase(BaseModel):
    """Base schema para ordens P2P."""
    id: str
    maker_id: str
    maker_username: str
    type: P2POrderType
    asset: str
    amount: float
    remaining_amount: float
    price: float
    min_amount: float
    max_amount: float
    status: P2POrderStatus
    payment_methods: List[str]
    matches_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class P2POrderListResponse(BaseModel):
    """Resposta de listagem de ordens P2P."""
    orders: List[P2POrderBase]
    total: int
    page: int
    per_page: int


class DisputeBase(BaseModel):
    """Base schema para disputas."""
    id: str
    order_id: str
    match_id: str
    complainant_id: str
    complainant_username: str
    respondent_id: str
    respondent_username: str
    reason: str
    description: Optional[str] = None
    evidence_urls: List[str] = []
    status: DisputeStatus
    resolution: Optional[str] = None
    winner_id: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

    class Config:
        from_attributes = True


class DisputeListResponse(BaseModel):
    """Resposta de listagem de disputas."""
    disputes: List[DisputeBase]
    total: int
    page: int
    per_page: int


class DisputeResolveRequest(BaseModel):
    """Request para resolver disputa."""
    winner_id: str
    resolution: str
    release_escrow: bool = True
    notify_users: bool = True


class DisputeResolveResponse(BaseModel):
    """Response de resolução de disputa."""
    dispute_id: str
    status: DisputeStatus
    winner_id: str
    resolution: str
    resolved_at: datetime
    resolved_by: str


class EscrowBase(BaseModel):
    """Base schema para escrow."""
    id: str
    order_id: str
    match_id: str
    seller_id: str
    buyer_id: str
    amount: float
    asset: str
    status: EscrowStatus
    created_at: datetime
    funded_at: Optional[datetime] = None
    released_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EscrowActionResponse(BaseModel):
    """Response de ação em escrow."""
    escrow_id: str
    status: EscrowStatus
    action: str  # 'released', 'refunded'
    processed_at: datetime
    processed_by: str
