"""
🛡️ HOLD Wallet - Admin Settings Router
=======================================

Configurações do sistema (taxas, limites, etc).
Agora com persistência em banco de dados.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.services.platform_settings_service import platform_settings_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/settings",
    tags=["Admin - Settings"],
    dependencies=[Depends(get_current_admin)]
)


# === Request Models ===

class FeesUpdateRequest(BaseModel):
    otc_spread_percentage: Optional[float] = None
    network_fee_percentage: Optional[float] = None
    p2p_fee_percentage: Optional[float] = None


class LimitsUpdateRequest(BaseModel):
    daily_limit_brl: Optional[float] = None
    transaction_limit_brl: Optional[float] = None
    p2p_min_order_brl: Optional[float] = None
    p2p_max_order_brl: Optional[float] = None


class TradingSettingsRequest(BaseModel):
    trading_enabled: Optional[bool] = None
    p2p_enabled: Optional[bool] = None
    escrow_timeout_hours: Optional[int] = None
    max_open_orders_per_user: Optional[int] = None


class PaymentMethodsRequest(BaseModel):
    payment_pix_enabled: Optional[bool] = None
    payment_ted_enabled: Optional[bool] = None


# === Endpoints de Taxas ===

@router.get("/fees")
async def get_fees_settings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna configurações de taxas atuais
    """
    try:
        # Inicializa configurações padrão se não existirem
        platform_settings_service.initialize_defaults(db)
        
        fees = platform_settings_service.get_fees(db)
        
        return {
            "success": True,
            "data": fees
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando taxas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/fees")
async def update_fees_settings(
    request: FeesUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Atualiza configurações de taxas
    """
    try:
        updates = {}
        
        if request.otc_spread_percentage is not None:
            updates["otc_spread_percentage"] = request.otc_spread_percentage
        
        if request.network_fee_percentage is not None:
            updates["network_fee_percentage"] = request.network_fee_percentage
        
        if request.p2p_fee_percentage is not None:
            updates["p2p_fee_percentage"] = request.p2p_fee_percentage
        
        if updates:
            platform_settings_service.set_multiple(
                db, updates, admin_id=str(current_admin.id)
            )
            logger.info(f"⚙️ Admin {current_admin.email} atualizou taxas: {updates}")
        
        # Retorna as taxas atualizadas
        current_fees = platform_settings_service.get_fees(db)
        
        return {
            "success": True,
            "message": "Taxas atualizadas com sucesso",
            "updated": updates,
            "current": current_fees
        }
        
    except Exception as e:
        logger.error(f"❌ Erro atualizando taxas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# === Endpoints de Limites ===

@router.get("/limits")
async def get_limits_settings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna configurações de limites atuais
    """
    try:
        platform_settings_service.initialize_defaults(db)
        limits = platform_settings_service.get_limits(db)
        
        return {
            "success": True,
            "data": limits
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando limites: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/limits")
async def update_limits_settings(
    request: LimitsUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Atualiza configurações de limites
    """
    try:
        updates = {}
        
        if request.daily_limit_brl is not None:
            updates["daily_limit_brl"] = request.daily_limit_brl
        
        if request.transaction_limit_brl is not None:
            updates["transaction_limit_brl"] = request.transaction_limit_brl
        
        if request.p2p_min_order_brl is not None:
            updates["p2p_min_order_brl"] = request.p2p_min_order_brl
        
        if request.p2p_max_order_brl is not None:
            updates["p2p_max_order_brl"] = request.p2p_max_order_brl
        
        if updates:
            platform_settings_service.set_multiple(
                db, updates, admin_id=str(current_admin.id)
            )
            logger.info(f"⚙️ Admin {current_admin.email} atualizou limites: {updates}")
        
        current_limits = platform_settings_service.get_limits(db)
        
        return {
            "success": True,
            "message": "Limites atualizados com sucesso",
            "updated": updates,
            "current": current_limits
        }
        
    except Exception as e:
        logger.error(f"❌ Erro atualizando limites: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# === Endpoints de Trading ===

@router.get("/trading")
async def get_trading_settings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna configurações de trading
    """
    try:
        platform_settings_service.initialize_defaults(db)
        trading = platform_settings_service.get_trading_settings(db)
        
        return {
            "success": True,
            "data": trading
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando configurações de trading: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/trading")
async def update_trading_settings(
    request: TradingSettingsRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Atualiza configurações de trading
    """
    try:
        updates = {}
        
        if request.trading_enabled is not None:
            updates["trading_enabled"] = request.trading_enabled
        
        if request.p2p_enabled is not None:
            updates["p2p_enabled"] = request.p2p_enabled
        
        if request.escrow_timeout_hours is not None:
            updates["escrow_timeout_hours"] = request.escrow_timeout_hours
        
        if request.max_open_orders_per_user is not None:
            updates["max_open_orders_per_user"] = request.max_open_orders_per_user
        
        if updates:
            platform_settings_service.set_multiple(
                db, updates, admin_id=str(current_admin.id)
            )
            logger.info(f"⚙️ Admin {current_admin.email} atualizou trading: {updates}")
        
        current_trading = platform_settings_service.get_trading_settings(db)
        
        return {
            "success": True,
            "message": "Configurações de trading atualizadas",
            "updated": updates,
            "current": current_trading
        }
        
    except Exception as e:
        logger.error(f"❌ Erro atualizando trading: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# === Endpoints de Métodos de Pagamento ===

@router.get("/payment-methods")
async def get_payment_methods_settings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna métodos de pagamento habilitados
    """
    try:
        platform_settings_service.initialize_defaults(db)
        methods = platform_settings_service.get_payment_methods(db)
        
        return {
            "success": True,
            "data": methods
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando métodos de pagamento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/payment-methods")
async def update_payment_methods_settings(
    request: PaymentMethodsRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Atualiza métodos de pagamento
    """
    try:
        updates = {}
        
        if request.payment_pix_enabled is not None:
            updates["payment_pix_enabled"] = request.payment_pix_enabled
        
        if request.payment_ted_enabled is not None:
            updates["payment_ted_enabled"] = request.payment_ted_enabled
        
        if updates:
            platform_settings_service.set_multiple(
                db, updates, admin_id=str(current_admin.id)
            )
            logger.info(f"⚙️ Admin {current_admin.email} atualizou pagamentos: {updates}")
        
        current_methods = platform_settings_service.get_payment_methods(db)
        
        return {
            "success": True,
            "message": "Métodos de pagamento atualizados",
            "updated": updates,
            "current": current_methods
        }
        
    except Exception as e:
        logger.error(f"❌ Erro atualizando métodos de pagamento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# === Endpoint para todas as configurações ===

@router.get("/all")
async def get_all_settings(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna todas as configurações organizadas por categoria
    """
    try:
        platform_settings_service.initialize_defaults(db)
        all_settings = platform_settings_service.get_all(db)
        
        return {
            "success": True,
            "data": all_settings
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando configurações: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# === Endpoint público para usuários (apenas leitura de taxas) ===

@router.get("/public/fees")
async def get_public_fees(
    db: Session = Depends(get_db)
):
    """
    Retorna taxas públicas (sem autenticação de admin).
    Usado pelo frontend do usuário para mostrar taxas.
    """
    try:
        platform_settings_service.initialize_defaults(db)
        
        fees = platform_settings_service.get_fees(db)
        limits = platform_settings_service.get_limits(db)
        
        return {
            "success": True,
            "data": {
                "fees": fees,
                "limits": {
                    "p2p_min_order_brl": limits.get("p2p_min_order_brl", 50),
                    "p2p_max_order_brl": limits.get("p2p_max_order_brl", 500000),
                }
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando taxas públicas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
