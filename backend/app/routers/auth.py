from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.db import get_db
from app.core.security import verify_password, create_access_token, get_current_user
from app.core.exceptions import AuthenticationError, ValidationError
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserResponse, TokenData

router = APIRouter()
security = HTTPBearer()

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access token.
    """
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise AuthenticationError("Invalid email or password")
    
    if not user.is_active:
        raise AuthenticationError("Account is inactive")
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.email, "user_id": str(user.id)},
        expires_delta=timedelta(hours=24)
    )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,  # 24 hours
        user=UserResponse.model_validate(user)
    )

@router.post("/register", response_model=UserResponse)
async def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == register_data.email) | 
        (User.username == register_data.username)
    ).first()
    
    if existing_user:
        if existing_user.email == register_data.email:
            raise ValidationError("Email already registered")
        else:
            raise ValidationError("Username already taken")
    
    # Create new user
    user = User(
        email=register_data.email,
        username=register_data.username,
        password_hash=""  # Will be set below
    )
    
    # Set password with proper hashing
    user.set_password(register_data.password)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        created_at=user.created_at,
        last_login=user.last_login
    )

@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
):
    """
    Refresh access token for authenticated user.
    """
    access_token = create_access_token(
        data={"sub": current_user.email, "user_id": str(current_user.id)},
        expires_delta=timedelta(hours=24)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 86400
    }

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Logout user (mainly for client-side token cleanup).
    """
    # In a production environment, you might want to:
    # - Add token to blacklist
    # - Update user's last_logout timestamp
    # - Clear any session data
    
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.post("/verify-token")
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Verify if the provided token is valid.
    """
    try:
        user = await get_current_user(credentials.credentials, db)
        return {
            "valid": True,
            "user_id": str(user.id),
            "email": user.email
        }
    except Exception:
        return {"valid": False}
