"""
🏢 HOLD Wallet - Trader Profile Schemas
=========================================

Pydantic schemas for trader profile API endpoints.

Author: HOLD Wallet Team
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class TraderProfileCreate(BaseModel):
    """Schema for creating a trader profile"""
    display_name: str = Field(..., min_length=3, max_length=100, description="Display name for the trader")
    bio: Optional[str] = Field(None, max_length=500, description="Trader bio/description")
    avatar_url: Optional[str] = Field(None, description="URL to trader avatar")
    min_order_amount: Optional[float] = Field(None, ge=0, description="Minimum order amount in BRL")
    max_order_amount: Optional[float] = Field(None, ge=0, description="Maximum order amount in BRL")
    accepted_payment_methods: Optional[str] = Field(None, description="Comma-separated payment methods")
    auto_accept_orders: bool = Field(False, description="Auto-accept new orders")


class TraderProfileUpdate(BaseModel):
    """Schema for updating a trader profile"""
    display_name: Optional[str] = Field(None, min_length=3, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None)
    min_order_amount: Optional[float] = Field(None, ge=0)
    max_order_amount: Optional[float] = Field(None, ge=0)
    accepted_payment_methods: Optional[str] = Field(None)
    auto_accept_orders: Optional[bool] = None


class TraderProfileResponse(BaseModel):
    """Response schema for trader profile"""
    id: UUID
    user_id: UUID
    display_name: str
    avatar_url: Optional[str]
    bio: Optional[str]
    is_verified: bool
    verification_level: str
    
    # Statistics
    total_trades: int
    completed_trades: int
    success_rate: float
    average_rating: float
    total_reviews: int
    
    # Settings
    auto_accept_orders: bool
    min_order_amount: Optional[float]
    max_order_amount: Optional[float]
    accepted_payment_methods: Optional[str]
    average_response_time: Optional[int]
    
    # Status
    is_active: bool
    is_blocked: bool
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TraderPublicProfile(BaseModel):
    """Public trader profile (limited info)"""
    id: UUID
    display_name: str
    avatar_url: Optional[str]
    bio: Optional[str]
    is_verified: bool
    verification_level: str
    
    total_trades: int
    completed_trades: int
    success_rate: float
    average_rating: float
    total_reviews: int
    
    created_at: datetime
    
    class Config:
        from_attributes = True


class TraderStatsResponse(BaseModel):
    """Response schema for trader stats"""
    id: UUID
    trader_id: UUID
    date: datetime
    trades_completed: int
    total_volume_brl: float
    success_rate: float
    average_rating: float
    new_reviews: int
    disputes: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class TraderListResponse(BaseModel):
    """Response for trader list"""
    id: UUID
    display_name: str
    avatar_url: Optional[str]
    is_verified: bool
    success_rate: float
    average_rating: float
    total_reviews: int
    total_trades: int
    
    class Config:
        from_attributes = True
