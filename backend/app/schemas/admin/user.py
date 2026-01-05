"""
🛡️ HOLD Wallet - Admin User Schemas
====================================

Schemas para gestão de usuários no painel admin.

Author: HOLD Wallet Team
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserListItem(BaseModel):
    """Item da lista de usuários"""
    id: str
    username: str
    email: str
    is_active: bool
    is_admin: bool
    is_email_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserDetailResponse(BaseModel):
    """Detalhes completos do usuário"""
    id: str
    username: str
    email: str
    is_active: bool
    is_admin: bool
    is_email_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    wallets_count: int = 0
    has_2fa: bool = False
    
    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    """Request para atualizar usuário"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    is_email_verified: Optional[bool] = None


class UserActionResponse(BaseModel):
    """Response para ações em usuários"""
    success: bool
    message: str
    user_id: str


class UserStatsResponse(BaseModel):
    """Estatísticas de usuários"""
    total_users: int
    active_users: int
    inactive_users: int
    admin_users: int
    verified_users: int
    new_users_24h: int
    new_users_7d: int
