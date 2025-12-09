"""
🏢 HOLD Wallet - Trader Profile API Endpoints
==============================================

RESTful API endpoints for trader profile management.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.trader_profile import TraderProfile, TraderStats
from app.schemas.trader_profile import (
    TraderProfileCreate,
    TraderProfileUpdate,
    TraderProfileResponse,
    TraderPublicProfile,
    TraderListResponse,
    TraderStatsResponse,
)

router = APIRouter(prefix="/trader-profiles", tags=["Trader Profiles"])


@router.post("", response_model=TraderProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_trader_profile(
    profile_data: TraderProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new trader profile for the current user"""
    
    # Check if user already has a trader profile
    existing_profile = db.query(TraderProfile).filter(
        TraderProfile.user_id == current_user.id
    ).first()
    
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has a trader profile"
        )
    
    # Create new trader profile
    new_profile = TraderProfile(
        user_id=current_user.id,
        display_name=profile_data.display_name,
        bio=profile_data.bio,
        avatar_url=profile_data.avatar_url,
        min_order_amount=profile_data.min_order_amount,
        max_order_amount=profile_data.max_order_amount,
        accepted_payment_methods=profile_data.accepted_payment_methods,
        auto_accept_orders=profile_data.auto_accept_orders,
    )
    
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    return new_profile


@router.get("/me", response_model=TraderProfileResponse)
async def get_my_trader_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's trader profile"""
    
    profile = db.query(TraderProfile).filter(
        TraderProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trader profile not found"
        )
    
    return profile


@router.put("/me", response_model=TraderProfileResponse)
async def update_my_trader_profile(
    profile_data: TraderProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's trader profile"""
    
    profile = db.query(TraderProfile).filter(
        TraderProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trader profile not found"
        )
    
    # Update fields
    if profile_data.display_name is not None:
        profile.display_name = profile_data.display_name
    if profile_data.bio is not None:
        profile.bio = profile_data.bio
    if profile_data.avatar_url is not None:
        profile.avatar_url = profile_data.avatar_url
    if profile_data.min_order_amount is not None:
        profile.min_order_amount = profile_data.min_order_amount
    if profile_data.max_order_amount is not None:
        profile.max_order_amount = profile_data.max_order_amount
    if profile_data.accepted_payment_methods is not None:
        profile.accepted_payment_methods = profile_data.accepted_payment_methods
    if profile_data.auto_accept_orders is not None:
        profile.auto_accept_orders = profile_data.auto_accept_orders
    
    db.commit()
    db.refresh(profile)
    
    return profile


@router.get("/{profile_id}", response_model=TraderPublicProfile)
async def get_trader_profile(
    profile_id: UUID,
    db: Session = Depends(get_db),
):
    """Get public trader profile by ID"""
    
    profile = db.query(TraderProfile).filter(
        TraderProfile.id == profile_id,
        TraderProfile.is_active == True,
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trader profile not found"
        )
    
    return profile


@router.get("", response_model=List[TraderListResponse])
async def list_traders(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("success_rate", regex="^(success_rate|average_rating|total_trades|created_at)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    verified_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    """List all active trader profiles"""
    
    query = db.query(TraderProfile).filter(
        TraderProfile.is_active == True,
        TraderProfile.is_blocked == False,
    )
    
    if verified_only:
        query = query.filter(TraderProfile.is_verified == True)
    
    # Sort
    if sort_by == "success_rate":
        query = query.order_by(TraderProfile.success_rate.desc() if order == "desc" else TraderProfile.success_rate.asc())
    elif sort_by == "average_rating":
        query = query.order_by(TraderProfile.average_rating.desc() if order == "desc" else TraderProfile.average_rating.asc())
    elif sort_by == "total_trades":
        query = query.order_by(TraderProfile.total_trades.desc() if order == "desc" else TraderProfile.total_trades.asc())
    else:
        query = query.order_by(TraderProfile.created_at.desc() if order == "desc" else TraderProfile.created_at.asc())
    
    profiles = query.skip(skip).limit(limit).all()
    
    return profiles


@router.get("/{profile_id}/stats", response_model=List[TraderStatsResponse])
async def get_trader_stats(
    profile_id: UUID,
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Get trader statistics for the last N days"""
    
    # Verify trader exists
    profile = db.query(TraderProfile).filter(
        TraderProfile.id == profile_id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trader profile not found"
        )
    
    stats = db.query(TraderStats).filter(
        TraderStats.trader_id == profile_id,
    ).order_by(TraderStats.date.desc()).limit(days).all()
    
    return stats
