import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.exceptions import AuthenticationError

security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    # Ensure inputs are bytes
    password_bytes = plain_password.encode('utf-8')
    hash_bytes = hashed_password.encode('utf-8') if isinstance(hashed_password, str) else hashed_password
    return bcrypt.checkpw(password_bytes, hash_bytes)

def get_password_hash(password: str) -> str:
    """Generate password hash."""
    # Truncate password to 72 bytes if needed (bcrypt limitation)
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user from JWT token."""
    credentials_exception = AuthenticationError("Could not validate credentials")
    
    try:
        payload = verify_token(credentials.credentials)
        if payload is None:
            raise credentials_exception
        
        user_email: str = payload.get("sub")
        if user_email is None:
            raise credentials_exception
        
        # Import here to avoid circular imports
        from app.models.user import User
        
        user = db.query(User).filter(User.email == user_email).first()
        if user is None:
            raise credentials_exception
        
        if not user.is_active:
            raise AuthenticationError("User account is inactive")
        
        return user
        
    except JWTError:
        raise credentials_exception


async def get_current_admin(
    current_user = Depends(get_current_user)
):
    """
    Verifica se o usuário atual é um administrador.
    Usa o dependency get_current_user e verifica o flag is_admin.
    """
    if not getattr(current_user, 'is_admin', False):
        raise AuthenticationError("Admin privileges required")
    
    return current_user
