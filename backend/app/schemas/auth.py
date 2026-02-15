from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime
import uuid

class LoginRequest(BaseModel):
    """Request schema for user login."""
    email: EmailStr
    password: str
    two_factor_code: Optional[str] = None  # Código 2FA (obrigatório para admins)

class RegisterRequest(BaseModel):
    """Request schema for user registration."""
    email: EmailStr
    username: str
    password: str
    referral_code: Optional[str] = None  # Código de indicação (WOLK FRIENDS)
    
    @validator('referral_code')
    def validate_referral_code(cls, v):
        if v:
            # Remove espaços e converte para maiúsculo
            v = v.strip().upper()
            if len(v) < 5 or len(v) > 20:
                raise ValueError('Invalid referral code format')
        return v
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v) > 50:
            raise ValueError('Username must be less than 50 characters')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserResponse(BaseModel):
    """Response schema for user information."""
    id: uuid.UUID
    email: str
    username: str
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True
    is_admin: bool = False
    
    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    """Response schema for successful login."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenData(BaseModel):
    """Schema for token data."""
    sub: str
    user_id: str
    exp: Optional[datetime] = None
