"""
🛡️ HOLD Wallet - Admin Audit Schemas
====================================

Schemas para logs de auditoria administrativa.
"""

from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


class AuditLogBase(BaseModel):
    """Base schema para log de auditoria."""
    id: str
    admin_id: str
    admin_username: str
    action: str  # 'user_block', 'trade_cancel', 'settings_update', etc.
    target_type: str  # 'user', 'trade', 'order', 'setting', etc.
    target_id: Optional[str] = None
    details: dict = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogDetail(AuditLogBase):
    """Log de auditoria com detalhes completos."""
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None
    metadata: dict = {}


class AuditLogListResponse(BaseModel):
    """Resposta de listagem de logs."""
    logs: List[AuditLogBase]
    total: int
    page: int
    per_page: int


class AuditLogListParams(BaseModel):
    """Parâmetros para listagem de logs."""
    skip: int = 0
    limit: int = 50
    admin_id: Optional[str] = None
    action: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class AuditLogCreate(BaseModel):
    """Schema para criar log de auditoria."""
    action: str
    target_type: str
    target_id: Optional[str] = None
    details: dict = {}
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None


# Constantes de ações de auditoria
class AuditActions:
    # User actions
    USER_BLOCK = "user_block"
    USER_UNBLOCK = "user_unblock"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    USER_ADMIN_GRANT = "user_admin_grant"
    USER_ADMIN_REVOKE = "user_admin_revoke"
    USER_2FA_DISABLE = "user_2fa_disable"
    USER_PASSWORD_RESET = "user_password_reset"
    
    # Trade actions
    TRADE_CANCEL = "trade_cancel"
    TRADE_REFUND = "trade_refund"
    
    # P2P actions
    ORDER_CANCEL = "order_cancel"
    DISPUTE_RESOLVE = "dispute_resolve"
    ESCROW_RELEASE = "escrow_release"
    ESCROW_REFUND = "escrow_refund"
    
    # Settings actions
    SETTINGS_UPDATE = "settings_update"
    
    # System actions
    SYSTEM_MAINTENANCE = "system_maintenance"


class AuditTargetTypes:
    USER = "user"
    TRADE = "trade"
    ORDER = "order"
    DISPUTE = "dispute"
    ESCROW = "escrow"
    SETTING = "setting"
    SYSTEM = "system"
