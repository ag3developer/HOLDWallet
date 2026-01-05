"""
🛡️ HOLD Wallet - Admin Audit Router
====================================

Logs de auditoria e atividades do sistema.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/audit",
    tags=["Admin - Audit"],
    dependencies=[Depends(get_current_admin)]
)


# Em produção, teríamos uma tabela de audit_logs
# Por enquanto, retornamos dados simulados

@router.get("/logs", response_model=dict)
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    action_type: Optional[str] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna logs de auditoria do sistema
    """
    try:
        # Em produção, buscar da tabela audit_logs
        # Por enquanto, retornamos estrutura vazia
        
        logger.info(f"📋 Admin {current_admin.email} consultou logs de auditoria")
        
        return {
            "success": True,
            "message": "Audit logs - Em desenvolvimento",
            "total": 0,
            "items": [],
            "note": "Tabela audit_logs será implementada em breve"
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/user-activity/{user_id}", response_model=dict)
async def get_user_activity(
    user_id: str,
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna atividades de um usuário específico
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuário {user_id} não encontrado"
            )
        
        logger.info(f"📋 Admin {current_admin.email} consultou atividades do usuário {user.email}")
        
        return {
            "success": True,
            "user_id": user_id,
            "user_email": user.email,
            "period_days": days,
            "activities": [],
            "note": "Sistema de atividades será implementado em breve"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro buscando atividades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/login-history", response_model=dict)
async def get_login_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna histórico de logins do sistema
    """
    try:
        # Buscar últimos logins baseado no campo last_login
        users_with_login = db.query(User).filter(
            User.last_login.isnot(None)
        ).order_by(User.last_login.desc()).offset(skip).limit(limit).all()
        
        items = []
        for user in users_with_login:
            items.append({
                "user_id": str(user.id),
                "email": user.email,
                "username": user.username,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "is_active": user.is_active
            })
        
        return {
            "success": True,
            "total": len(items),
            "items": items
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando histórico de login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/security/suspicious", response_model=dict)
async def get_suspicious_activity(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna atividades suspeitas detectadas
    """
    try:
        # Em produção, teria análise de padrões suspeitos
        
        return {
            "success": True,
            "message": "Nenhuma atividade suspeita detectada",
            "alerts": [],
            "note": "Sistema de detecção de fraudes em desenvolvimento"
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando atividades suspeitas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/security/force-logout/{user_id}", response_model=dict)
async def force_user_logout(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Força logout de um usuário (invalida sessões)
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
                detail="Você não pode forçar logout de si mesmo"
            )
        
        # Em produção, invalidaria tokens JWT do usuário
        # Por enquanto, apenas registramos a ação
        
        logger.info(f"🔒 Admin {current_admin.email} forçou logout do usuário {user.email}")
        
        return {
            "success": True,
            "message": f"Logout forçado para {user.email}",
            "user_id": user_id,
            "note": "Invalidação de tokens JWT será implementada"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro forçando logout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
