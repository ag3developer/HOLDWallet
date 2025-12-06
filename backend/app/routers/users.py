from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, AuthorizationError
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.user import UserResponse, UserUpdateRequest, UserWalletsResponse

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile information.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
        is_active=current_user.is_active
    )

@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile information.
    """
    # Check if new username is already taken (if changed)
    if user_update.username and user_update.username != current_user.username:
        existing_user = db.query(User).filter(
            User.username == user_update.username,
            User.id != current_user.id
        ).first()
        
        if existing_user:
            raise ValidationError("Username already taken")
        
        current_user.username = user_update.username
    
    # Update other fields
    if user_update.email and user_update.email != current_user.email:
        # Check if email is already taken
        existing_email = db.query(User).filter(
            User.email == user_update.email,
            User.id != current_user.id
        ).first()
        
        if existing_email:
            raise ValidationError("Email already registered")
        
        current_user.email = user_update.email
    
    # Update timestamps
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
        is_active=current_user.is_active
    )

@router.get("/me/wallets", response_model=UserWalletsResponse)
async def get_user_wallets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Get all wallets for the current user.
    """
    # Get user wallets with pagination
    wallets_query = db.query(Wallet).filter(Wallet.user_id == current_user.id)
    total_count = wallets_query.count()
    
    wallets = wallets_query.offset(offset).limit(limit).all()
    
    return UserWalletsResponse(
        user_id=current_user.id,
        total_wallets=total_count,
        wallets=[
            {
                "id": wallet.id,
                "name": wallet.name,
                "network": wallet.network,
                "created_at": wallet.created_at,
                "is_active": wallet.is_active
            }
            for wallet in wallets
        ],
        pagination={
            "offset": offset,
            "limit": limit,
            "total": total_count,
            "has_more": (offset + limit) < total_count
        }
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user by ID (admin only or own profile).
    """
    # Users can only view their own profile unless they're admin
    if str(current_user.id) != user_id:
        raise AuthorizationError("You can only view your own profile")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        created_at=user.created_at,
        last_login=user.last_login,
        is_active=user.is_active
    )

@router.delete("/me")
async def delete_current_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete current user account (soft delete).
    """
    # Soft delete - mark as inactive
    current_user.is_active = False
    current_user.updated_at = datetime.utcnow()
    
    # Also deactivate all user's wallets
    db.query(Wallet).filter(Wallet.user_id == current_user.id).update({
        "is_active": False,
        "updated_at": datetime.utcnow()
    })
    
    db.commit()
    
    return {"message": "Account successfully deactivated"}

@router.get("/")
async def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Search by username or email")
):
    """
    List users (admin only functionality - currently restricted).
    """
    # This would typically be an admin-only endpoint
    raise AuthorizationError("User listing is not available")

@router.get("/me/stats")
async def get_user_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user statistics and activity summary.
    """
    # Count user's wallets
    total_wallets = db.query(Wallet).filter(Wallet.user_id == current_user.id).count()
    active_wallets = db.query(Wallet).filter(
        Wallet.user_id == current_user.id,
        Wallet.is_active == True
    ).count()
    
    # Calculate account age
    account_age_days = (datetime.utcnow() - current_user.created_at).days
    
    return {
        "user_id": str(current_user.id),
        "total_wallets": total_wallets,
        "active_wallets": active_wallets,
        "account_age_days": account_age_days,
        "last_login": current_user.last_login,
        "account_created": current_user.created_at
    }
