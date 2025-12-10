"""
🏢 HOLD Wallet - Trader Profiles Router
========================================

API endpoints for trader profiles management in P2P trading system.
Endpoints:
  - POST   /api/v1/trader-profiles         - Create new trader profile
  - GET    /api/v1/trader-profiles/me      - Get        if not profile.is_active:  # type: ignore
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=TRADER_PROFILE_NOT_FOUND
            )ent user's trader profile
  - PUT    /api/v1/trader-profiles/me      - Update current user's trader profile
  - GET    /api/v1/trader-profiles/{id}    - Get public trader profile
  - GET    /api/v1/trader-profiles         - List traders (with filters)
  - GET    /api/v1/trader-profiles/{id}/stats - Get trader stats

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.db.database import get_db
from app.models.trader_profile import TraderProfile, TraderStats
from app.models.user import User
from app.services.trader_profile_service import trader_profile_service
from app.core.security import get_current_user
from app.core.exceptions import ValidationError
from app.schemas.trader_profile import (
    TraderProfileCreate,
    TraderProfileUpdate,
    TraderProfileResponse,
    TraderPublicProfile,
    TraderStatsResponse,
    TraderListResponse,
)

router = APIRouter(tags=["trader-profiles"])

# Constants
TRADER_PROFILE_NOT_FOUND = "Trader profile not found"
USER_ALREADY_HAS_PROFILE = "User already has a trader profile"


@router.post("/trader-profiles")
async def create_trader_profile(
    data: TraderProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new trader profile for the current user
    """
    try:
        # Check if user already has a trader profile
        existing_profile = db.query(TraderProfile).filter(
            TraderProfile.user_id == current_user.id
        ).first()
        
        if existing_profile:
            raise ValidationError(USER_ALREADY_HAS_PROFILE)
        
        # Create new trader profile
        profile = TraderProfile(
            user_id=current_user.id,
            display_name=data.display_name,
            bio=data.bio,
            avatar_url=data.avatar_url,
            min_order_amount=data.min_order_amount,
            max_order_amount=data.max_order_amount,
            accepted_payment_methods=data.accepted_payment_methods,
            auto_accept_orders=data.auto_accept_orders,
            is_active=True,
            verification_level="unverified",
        )
        
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        return {
            "success": True,
            "message": "Trader profile created successfully",
            "data": TraderProfileResponse.from_orm(profile),
        }
    
    except ValidationError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating trader profile: {str(e)}"
        )


@router.get("/trader-profiles/me")
async def get_my_trader_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's trader profile
    """
    try:
        profile = db.query(TraderProfile).filter(
            TraderProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=TRADER_PROFILE_NOT_FOUND
            )
        
        return {
            "success": True,
            "data": TraderProfileResponse.from_orm(profile),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving trader profile: {str(e)}"
        )


@router.put("/trader-profiles/me")
async def update_my_trader_profile(
    data: TraderProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's trader profile
    """
    try:
        profile = db.query(TraderProfile).filter(
            TraderProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=TRADER_PROFILE_NOT_FOUND
            )
        
        # Update fields if provided
        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        
        db.commit()
        db.refresh(profile)
        
        return {
            "success": True,
            "message": "Trader profile updated successfully",
            "data": TraderProfileResponse.from_orm(profile),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating trader profile: {str(e)}"
        )


@router.get("/trader-profiles/{trader_id}")
async def get_public_trader_profile(
    trader_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a public trader profile by ID
    No authentication required for viewing
    """
    try:
        # Try to parse as UUID
        try:
            trader_uuid = UUID(trader_id)
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid trader ID format"
            )
        
        profile = db.query(TraderProfile).filter(
            TraderProfile.id == trader_uuid
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=TRADER_PROFILE_NOT_FOUND
            )
        
        if not profile.is_active:  # type: ignore
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=TRADER_PROFILE_NOT_FOUND
            )
        
        return {
            "success": True,
            "data": TraderPublicProfile.from_orm(profile),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving trader profile: {str(e)}"
        )


@router.get("/trader-profiles")
async def list_trader_profiles(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    verification_level: Optional[str] = Query(None),
    sort_by: str = Query("average_rating"),
    db: Session = Depends(get_db)
):
    """
    List trader profiles with optional filtering and sorting
    
    Query parameters:
    - skip: number of results to skip (default: 0)
    - limit: max number of results (default: 10, max: 100)
    - verification_level: filter by verification level (unverified, basic, advanced, premium)
    - sort_by: sort field (average_rating, total_trades, success_rate) (default: average_rating)
    """
    try:
        query = db.query(TraderProfile).filter(
            TraderProfile.is_active == True,  # type: ignore
            TraderProfile.is_blocked == False  # type: ignore
        )
        
        # Apply verification level filter if provided
        if verification_level:
            query = query.filter(TraderProfile.verification_level == verification_level)
        
        # Apply sorting
        if sort_by == "total_trades":
            query = query.order_by(TraderProfile.total_trades.desc())
        elif sort_by == "success_rate":
            query = query.order_by(TraderProfile.success_rate.desc())
        else:  # default to average_rating
            query = query.order_by(TraderProfile.average_rating.desc())
        
        # Get total count before pagination
        total = query.count()
        
        # Apply pagination
        profiles = query.offset(skip).limit(limit).all()
        
        return {
            "success": True,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "count": len(profiles),
            },
            "data": [TraderListResponse.from_orm(p) for p in profiles],
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing trader profiles: {str(e)}"
        )


@router.get("/trader-profiles/{trader_id}/stats")
async def get_trader_stats(
    trader_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """
    Get trader statistics for the last N days
    
    Query parameters:
    - days: number of days to retrieve stats for (default: 30, max: 365)
    """
    try:
        # Try to parse as UUID
        try:
            trader_uuid = UUID(trader_id)
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid trader ID format"
            )
        
        # Verify trader exists and is active
        profile = db.query(TraderProfile).filter(
            TraderProfile.id == trader_uuid
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail=TRADER_PROFILE_NOT_FOUND
            )
        
        # Get stats for the period
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        stats = db.query(TraderStats).filter(
            TraderStats.trader_id == trader_uuid,
            TraderStats.date >= cutoff_date
        ).order_by(TraderStats.date.desc()).all()
        
        return {
            "success": True,
            "trader_id": str(trader_uuid),
            "period_days": days,
            "stats_count": len(stats),
            "data": [TraderStatsResponse.from_orm(s) for s in stats],
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving trader stats: {str(e)}"
        )
