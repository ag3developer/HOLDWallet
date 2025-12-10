from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# User response schemas
class UserResponse(BaseModel):
    """Response schema for user information."""
    id: UUID
    email: str
    username: str
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True

class UserUpdateRequest(BaseModel):
    """Request schema for updating user profile."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    
    @validator('username')
    def validate_username(cls, v):
        if v is not None:
            if len(v) < 3:
                raise ValueError('Username must be at least 3 characters long')
            if len(v) > 50:
                raise ValueError('Username must be less than 50 characters')
            if not v.replace('_', '').replace('-', '').isalnum():
                raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
            return v.lower()
        return v

class WalletSummary(BaseModel):
    """Summary of wallet information for user response."""
    id: int
    name: str
    network: str
    created_at: datetime
    is_active: bool

class UserWalletsResponse(BaseModel):
    """Response schema for user's wallets."""
    user_id: int
    total_wallets: int
    wallets: List[WalletSummary]
    pagination: Dict[str, Any]

# User settings schemas
class UserSettingsBase(BaseModel):
    default_currency: str = Field(default="USD", pattern="^(USD|BRL|EUR)$")
    theme: str = Field(default="light", pattern="^(light|dark)$")
    language: str = Field(default="en", pattern="^(en|pt|es)$")
    auto_lock_timeout: int = Field(default=300, ge=60, le=3600)
    require_pin_for_transactions: bool = True
    biometric_enabled: bool = False
    gas_preference: str = Field(default="standard", pattern="^(slow|standard|fast)$")
    transaction_notifications: bool = True
    price_alerts: bool = False
    security_notifications: bool = True
    developer_mode: bool = False

class UserSettingsCreate(UserSettingsBase):
    user_id: str = Field(..., min_length=1)
    preferred_networks: Optional[List[str]] = ["ethereum", "polygon", "bitcoin"]
    custom_rpc_urls: Optional[Dict[str, str]] = {}
    address_book: Optional[Dict[str, str]] = {}
    backup_reminder_enabled: bool = True
    backup_frequency_days: int = Field(default=30, ge=1, le=365)

class UserSettingsUpdate(BaseModel):
    default_currency: Optional[str] = Field(None, pattern="^(USD|BRL|EUR)$")
    theme: Optional[str] = Field(None, pattern="^(light|dark)$")
    language: Optional[str] = Field(None, pattern="^(en|pt|es)$")
    auto_lock_timeout: Optional[int] = Field(None, ge=60, le=3600)
    require_pin_for_transactions: Optional[bool] = None
    biometric_enabled: Optional[bool] = None
    preferred_networks: Optional[List[str]] = None
    gas_preference: Optional[str] = Field(None, pattern="^(slow|standard|fast)$")
    transaction_notifications: Optional[bool] = None
    price_alerts: Optional[bool] = None
    security_notifications: Optional[bool] = None
    developer_mode: Optional[bool] = None
    custom_rpc_urls: Optional[Dict[str, str]] = None
    address_book: Optional[Dict[str, str]] = None
    backup_reminder_enabled: Optional[bool] = None
    backup_frequency_days: Optional[int] = Field(None, ge=1, le=365)

class UserSettingsResponse(UserSettingsBase):
    id: int
    user_id: str
    preferred_networks: List[str]
    custom_rpc_urls: Dict[str, str]
    address_book: Dict[str, str]
    backup_reminder_enabled: bool
    backup_frequency_days: int
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    last_backup_reminder: Optional[datetime]
    
    class Config:
        from_attributes = True

# Address book schemas
class AddressBookEntry(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    address: str = Field(..., min_length=1)
    network: str = Field(..., min_length=1)
    note: Optional[str] = Field(None, max_length=500)

class AddressBookResponse(BaseModel):
    addresses: Dict[str, AddressBookEntry]
    total_count: int
