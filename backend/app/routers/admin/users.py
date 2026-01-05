"""
🛡️ HOLD Wallet - Admin Users Router
====================================

Gestão completa de usuários do sistema.

Funcionalidades:
- Listar usuários (com filtros e paginação)
- Ver detalhes do usuário
- Editar usuário
- Bloquear/desbloquear
- Verificar email
- Reset de senha
- Desabilitar 2FA
- Deletar usuário

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr
import logging
import uuid

from app.core.db import get_db
from app.core.security import get_current_admin, get_password_hash
from app.models.user import User
from app.models.wallet import Wallet
from app.models.two_factor import TwoFactorAuth

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/users",
    tags=["Admin - Users"],
    dependencies=[Depends(get_current_admin)]
)


# ===== SCHEMAS =====

class UserListItem(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool
    is_admin: bool
    is_email_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserDetailResponse(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool
    is_admin: bool
    is_email_verified: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    wallets_count: int
    has_2fa: bool
    
    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    is_email_verified: Optional[bool] = None


class UserActionResponse(BaseModel):
    success: bool
    message: str
    user_id: str


# ===== ENDPOINTS =====

@router.get("", response_model=dict)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_admin: Optional[bool] = None,
    order_by: str = Query("created_at", regex="^(created_at|username|email|last_login)$"),
    order_dir: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todos os usuários com filtros e paginação
    """
    try:
        query = db.query(User)
        
        # Filtros
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
        
        # Total
        total = query.count()
        
        # Ordenação
        order_column = getattr(User, order_by)
        if order_dir == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
        
        # Paginação
        users = query.offset(skip).limit(limit).all()
        
        # Formatar resposta
        items = []
        for user in users:
            items.append(UserListItem(
                id=str(user.id),
                username=user.username,
                email=user.email,
                is_active=user.is_active,
                is_admin=user.is_admin,
                is_email_verified=user.is_email_verified or False,
                created_at=user.created_at,
                last_login=user.last_login
            ))
        
        logger.info(f"✅ Admin {current_admin.email} listou {len(items)} usuários")
        
        return {
            "success": True,
            "total": total,
            "skip": skip,
            "limit": limit,
            "items": [item.model_dump() for item in items]
        }
        
    except Exception as e:
        logger.error(f"❌ Erro listando usuários: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{user_id}", response_model=dict)
async def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna detalhes completos de um usuário
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {user_id} não encontrado"
            )
        
        # Contar wallets
        wallets_count = db.query(func.count(Wallet.id)).filter(
            Wallet.user_id == user.id
        ).scalar() or 0
        
        # Verificar 2FA
        two_fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == user.id
        ).first()
        has_2fa = two_fa.is_enabled if two_fa else False
        
        logger.info(f"✅ Admin {current_admin.email} acessou detalhes do usuário {user.email}")
        
        return {
            "success": True,
            "data": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
                "is_admin": user.is_admin,
                "is_email_verified": user.is_email_verified or False,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "wallets_count": wallets_count,
                "has_2fa": has_2fa
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro buscando usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{user_id}", response_model=UserActionResponse)
async def update_user(
    user_id: str,
    update_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Atualiza dados de um usuário
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {user_id} não encontrado"
            )
        
        # Não permitir editar o próprio admin
        if str(user.id) == str(current_admin.id) and update_data.is_admin == False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode remover seu próprio acesso admin"
            )
        
        # Atualizar campos
        if update_data.username is not None:
            # Verificar se username já existe
            existing = db.query(User).filter(
                User.username == update_data.username,
                User.id != user.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username já está em uso"
                )
            user.username = update_data.username
        
        if update_data.email is not None:
            # Verificar se email já existe
            existing = db.query(User).filter(
                User.email == update_data.email,
                User.id != user.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email já está em uso"
                )
            user.email = update_data.email
        
        if update_data.is_active is not None:
            user.is_active = update_data.is_active
        
        if update_data.is_admin is not None:
            user.is_admin = update_data.is_admin
        
        if update_data.is_email_verified is not None:
            user.is_email_verified = update_data.is_email_verified
        
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"✅ Admin {current_admin.email} atualizou usuário {user.email}")
        
        return UserActionResponse(
            success=True,
            message=f"Usuário {user.email} atualizado com sucesso",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro atualizando usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{user_id}/block", response_model=UserActionResponse)
async def block_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Bloqueia um usuário (is_active = False)
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {user_id} não encontrado"
            )
        
        if str(user.id) == str(current_admin.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode bloquear a si mesmo"
            )
        
        user.is_active = False
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"🚫 Admin {current_admin.email} bloqueou usuário {user.email}")
        
        return UserActionResponse(
            success=True,
            message=f"Usuário {user.email} bloqueado com sucesso",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro bloqueando usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{user_id}/unblock", response_model=UserActionResponse)
async def unblock_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Desbloqueia um usuário (is_active = True)
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {user_id} não encontrado"
            )
        
        user.is_active = True
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"✅ Admin {current_admin.email} desbloqueou usuário {user.email}")
        
        return UserActionResponse(
            success=True,
            message=f"Usuário {user.email} desbloqueado com sucesso",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro desbloqueando usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{user_id}/verify-email", response_model=UserActionResponse)
async def verify_user_email(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Marca email do usuário como verificado manualmente
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {user_id} não encontrado"
            )
        
        user.is_email_verified = True
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"✅ Admin {current_admin.email} verificou email de {user.email}")
        
        return UserActionResponse(
            success=True,
            message=f"Email de {user.email} verificado com sucesso",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro verificando email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{user_id}/disable-2fa", response_model=UserActionResponse)
async def disable_user_2fa(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Desabilita 2FA do usuário (para recuperação de conta)
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {user_id} não encontrado"
            )
        
        two_fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == user.id
        ).first()
        
        if not two_fa:
            return UserActionResponse(
                success=True,
                message=f"Usuário {user.email} não tem 2FA configurado",
                user_id=str(user.id)
            )
        
        two_fa.is_enabled = False
        two_fa.is_verified = False
        db.commit()
        
        logger.info(f"🔓 Admin {current_admin.email} desabilitou 2FA de {user.email}")
        
        return UserActionResponse(
            success=True,
            message=f"2FA de {user.email} desabilitado com sucesso",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro desabilitando 2FA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{user_id}", response_model=UserActionResponse)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Deleta um usuário (soft delete - marca como inativo)
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {user_id} não encontrado"
            )
        
        if str(user.id) == str(current_admin.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode deletar a si mesmo"
            )
        
        if user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível deletar um usuário admin"
            )
        
        # Soft delete - apenas desativa
        user.is_active = False
        user.email = f"deleted_{user.id}_{user.email}"  # Marca email como deletado
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"🗑️ Admin {current_admin.email} deletou usuário {user_id}")
        
        return UserActionResponse(
            success=True,
            message=f"Usuário deletado com sucesso",
            user_id=str(user.id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro deletando usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
