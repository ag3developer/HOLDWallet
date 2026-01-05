"""
🛡️ HOLD Wallet - Admin User Service
====================================

Serviço de negócio para gestão de usuários.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging

from app.models.user import User
from app.models.wallet import Wallet
from app.models.two_factor import TwoFactorAuth

logger = logging.getLogger(__name__)


class AdminUserService:
    """Serviço para gestão administrativa de usuários"""
    
    @staticmethod
    def get_user_stats(db: Session, days: int = 30) -> Dict[str, Any]:
        """Retorna estatísticas de usuários"""
        now = datetime.now(timezone.utc)
        start_24h = now - timedelta(hours=24)
        start_7d = now - timedelta(days=7)
        start_period = now - timedelta(days=days)
        
        total = db.query(func.count(User.id)).scalar() or 0
        active = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        admin = db.query(func.count(User.id)).filter(User.is_admin == True).scalar() or 0
        verified = db.query(func.count(User.id)).filter(User.is_email_verified == True).scalar() or 0
        
        new_24h = db.query(func.count(User.id)).filter(User.created_at >= start_24h).scalar() or 0
        new_7d = db.query(func.count(User.id)).filter(User.created_at >= start_7d).scalar() or 0
        new_period = db.query(func.count(User.id)).filter(User.created_at >= start_period).scalar() or 0
        
        return {
            "total_users": total,
            "active_users": active,
            "inactive_users": total - active,
            "admin_users": admin,
            "verified_users": verified,
            "unverified_users": total - verified,
            "new_users_24h": new_24h,
            "new_users_7d": new_7d,
            f"new_users_{days}d": new_period,
            "verification_rate": round((verified / total * 100) if total > 0 else 0, 2)
        }
    
    @staticmethod
    def get_user_details(db: Session, user_id: str) -> Optional[Dict[str, Any]]:
        """Retorna detalhes completos de um usuário"""
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            return None
        
        # Contar wallets
        wallets_count = db.query(func.count(Wallet.id)).filter(
            Wallet.user_id == user.id
        ).scalar() or 0
        
        # Verificar 2FA
        two_fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == user.id
        ).first()
        has_2fa = two_fa.is_enabled if two_fa else False
        
        return {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "is_email_verified": user.is_email_verified or False,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "last_login": user.last_login,
            "wallets_count": wallets_count,
            "has_2fa": has_2fa
        }
    
    @staticmethod
    def search_users(
        db: Session,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_admin: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[User], int]:
        """Busca usuários com filtros"""
        from sqlalchemy import or_
        
        query = db.query(User)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    User.username.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        if is_admin is not None:
            query = query.filter(User.is_admin == is_admin)
        
        total = query.count()
        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
        
        return users, total
