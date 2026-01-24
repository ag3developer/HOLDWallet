from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.db import get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token, get_current_user
from app.core.exceptions import AuthenticationError, ValidationError
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserResponse, TokenData
from app.services.user_activity_service import UserActivityService
from app.services.security_service import SecurityService

router = APIRouter()
security = HTTPBearer()

# IPs locais que ignoram verificação de bloqueio
LOCAL_IPS = ["127.0.0.1", "localhost", "::1", "0.0.0.0"]

def is_dev_local_ip(ip_address: str) -> bool:
    """Verifica se é IP local em ambiente de desenvolvimento"""
    is_dev = getattr(settings, 'ENVIRONMENT', 'production') in ['development', 'dev', 'local']
    return is_dev and ip_address in LOCAL_IPS

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access token.
    """
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    
    # Check if IP is blocked (skip for local IPs in development)
    if not is_dev_local_ip(ip_address) and SecurityService.is_ip_blocked(db, ip_address):
        # Record blocked attempt
        SecurityService.record_login_attempt(
            db=db,
            email=login_data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason="ip_blocked"
        )
        raise AuthenticationError("Access denied. Please contact support.")
    
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user:
        # Record failed attempt - user not found
        SecurityService.record_login_attempt(
            db=db,
            email=login_data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason="user_not_found"
        )
        raise AuthenticationError("Invalid email or password")
    
    if not verify_password(login_data.password, user.password_hash):
        # Record failed attempt - wrong password
        SecurityService.record_login_attempt(
            db=db,
            email=login_data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason="invalid_password",
            user_id=str(user.id)
        )
        raise AuthenticationError("Invalid email or password")
    
    if not user.is_active:
        # Record failed attempt - inactive account
        SecurityService.record_login_attempt(
            db=db,
            email=login_data.email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            failure_reason="account_inactive",
            user_id=str(user.id)
        )
        raise AuthenticationError("Account is inactive")
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.email, "user_id": str(user.id)},
        expires_delta=timedelta(hours=24)
    )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Record successful login
    SecurityService.record_login_attempt(
        db=db,
        email=str(user.email),
        ip_address=ip_address,
        user_agent=user_agent,
        success=True,
        user_id=str(user.id)
    )
    
    # Create user session
    try:
        SecurityService.create_session(
            db=db,
            user_id=str(user.id),
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        # Don't fail login if session creation fails
        print(f"Failed to create session: {e}")
    
    # Log audit
    try:
        SecurityService.log_audit(
            db=db,
            action="login",
            user_id=str(user.id),
            user_email=str(user.email),
            description=f"User logged in from {ip_address}",
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        print(f"Failed to log audit: {e}")
    
    # Log login activity (legacy)
    try:
        UserActivityService.log_login(
            db=db,
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )
    except Exception as e:
        print(f"Failed to log login activity: {e}")
    
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
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout user (mainly for client-side token cleanup).
    """
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    
    # Invalidate all sessions for this user (or just current one in production)
    try:
        SecurityService.invalidate_all_user_sessions(
            db=db,
            user_id=str(current_user.id),
            reason="user_logout"
        )
    except Exception as e:
        print(f"Failed to invalidate sessions: {e}")
    
    # Log audit
    try:
        SecurityService.log_audit(
            db=db,
            action="logout",
            user_id=str(current_user.id),
            user_email=str(current_user.email),
            description="User logged out",
            ip_address=ip_address,
            user_agent=user_agent
        )
    except Exception as e:
        print(f"Failed to log audit: {e}")
    
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
