"""
User Profile Schemas
====================

Pydantic schemas for user profile operations.

Author: HOLD Wallet Team
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime, date
from uuid import UUID
import json


# ============================================
# USER PROFILE SCHEMAS
# ============================================

class UserProfileBase(BaseModel):
    """Base schema for user profile."""
    full_name: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=30)
    bio: Optional[str] = Field(None, max_length=1000)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    birth_date: Optional[date] = None
    website: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)
    social_links: Optional[Dict[str, str]] = None


class UserProfileCreate(UserProfileBase):
    """Schema for creating a user profile."""
    pass


class UserProfileUpdate(BaseModel):
    """Schema for updating a user profile."""
    full_name: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=30)
    bio: Optional[str] = Field(None, max_length=1000)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    birth_date: Optional[date] = None
    website: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)
    social_links: Optional[Dict[str, str]] = None

    @validator('phone')
    def validate_phone(cls, v):
        if v is not None and v != '':
            # Remove non-numeric characters for validation
            clean_phone = ''.join(filter(str.isdigit, v))
            if len(clean_phone) < 10:
                raise ValueError('Phone must have at least 10 digits')
            if len(clean_phone) > 15:
                raise ValueError('Phone must have at most 15 digits')
        return v

    @validator('website')
    def validate_website(cls, v):
        if v is not None and v != '':
            if not v.startswith(('http://', 'https://')):
                v = f'https://{v}'
        return v


class UserProfileResponse(UserProfileBase):
    """Response schema for user profile."""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserFullProfileResponse(BaseModel):
    """Full user profile response including user data and KYC info."""
    # User data
    id: UUID
    email: str
    username: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    # Profile data (from KYC)
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    birth_date: Optional[date] = None
    website: Optional[str] = None
    avatar_url: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    
    # KYC specific fields
    kyc_status: Optional[str] = None
    kyc_level: Optional[str] = None
    occupation: Optional[str] = None
    document_type: Optional[str] = None
    nationality: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================
# NOTIFICATION SETTINGS SCHEMAS
# ============================================

class NotificationSettingsBase(BaseModel):
    """Base schema for notification settings."""
    trade_alerts: bool = True
    price_alerts: bool = True
    security_alerts: bool = True
    marketing_emails: bool = False
    weekly_report: bool = True
    push_enabled: bool = True
    push_trade_alerts: bool = True
    push_price_alerts: bool = False
    push_security_alerts: bool = True
    email_enabled: bool = True


class NotificationSettingsUpdate(BaseModel):
    """Schema for updating notification settings."""
    trade_alerts: Optional[bool] = None
    price_alerts: Optional[bool] = None
    security_alerts: Optional[bool] = None
    marketing_emails: Optional[bool] = None
    weekly_report: Optional[bool] = None
    push_enabled: Optional[bool] = None
    push_trade_alerts: Optional[bool] = None
    push_price_alerts: Optional[bool] = None
    push_security_alerts: Optional[bool] = None
    email_enabled: Optional[bool] = None


class NotificationSettingsResponse(NotificationSettingsBase):
    """Response schema for notification settings."""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============================================
# PASSWORD CHANGE SCHEMAS
# ============================================

class PasswordChangeRequest(BaseModel):
    """Schema for password change request."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class PasswordChangeResponse(BaseModel):
    """Response schema for password change."""
    success: bool
    message: str


# ============================================
# SECURITY SETTINGS SCHEMAS  
# ============================================

class SecuritySettingsResponse(BaseModel):
    """Response schema for security settings."""
    two_factor_enabled: bool = False
    two_factor_method: Optional[str] = None  # totp, sms, email
    last_password_change: Optional[datetime] = None
    active_sessions: int = 0
    login_notifications: bool = True


class TwoFactorStatusResponse(BaseModel):
    """Response schema for 2FA status."""
    enabled: bool
    method: Optional[str] = None
    verified: bool = False
    backup_codes_remaining: int = 0
