"""
🛡️ HOLD Wallet - Admin Settings Router
=======================================

Configurações do sistema (taxas, limites, etc).

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import json

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/settings",
    tags=["Admin - Settings"],
    dependencies=[Depends(get_current_admin)]
)


# Configurações padrão (em produção, viriam do banco de dados)
DEFAULT_SETTINGS = {
    "fees": {
        "otc_spread_percentage": 3.0,
        "network_fee_percentage": 0.25,
        "p2p_fee_percentage": 0.5
    },
    "limits": {
        "daily_limit_brl": 3000000.0,  # R$ 3.000.000 (~$500k USD)
        "transaction_limit_brl": 500000.0,  # R$ 500.000 por transação
        "p2p_min_order_brl": 50.0,
        "p2p_max_order_brl": 500000.0
    },
    "payment_methods": {
        "pix": True,
        "ted": True,
        "credit_card": False,
        "debit_card": False
    }
}


class FeesUpdateRequest(BaseModel):
    otc_spread_percentage: Optional[float] = None
    network_fee_percentage: Optional[float] = None
    p2p_fee_percentage: Optional[float] = None


class LimitsUpdateRequest(BaseModel):
    daily_limit_brl: Optional[float] = None
    transaction_limit_brl: Optional[float] = None
    p2p_min_order_brl: Optional[float] = None
    p2p_max_order_brl: Optional[float] = None


@router.get("/fees", response_model=dict)
async def get_fees_settings(
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna configurações de taxas atuais
    """
    try:
        # Em produção, buscar do banco de dados
        return {
            "success": True,
            "data": DEFAULT_SETTINGS["fees"]
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando taxas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/fees", response_model=dict)
async def update_fees_settings(
    request: FeesUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Atualiza configurações de taxas
    """
    try:
        # Em produção, salvar no banco de dados
        updated = {}
        
        if request.otc_spread_percentage is not None:
            DEFAULT_SETTINGS["fees"]["otc_spread_percentage"] = request.otc_spread_percentage
            updated["otc_spread_percentage"] = request.otc_spread_percentage
        
        if request.network_fee_percentage is not None:
            DEFAULT_SETTINGS["fees"]["network_fee_percentage"] = request.network_fee_percentage
            updated["network_fee_percentage"] = request.network_fee_percentage
        
        if request.p2p_fee_percentage is not None:
            DEFAULT_SETTINGS["fees"]["p2p_fee_percentage"] = request.p2p_fee_percentage
            updated["p2p_fee_percentage"] = request.p2p_fee_percentage
        
        logger.info(f"⚙️ Admin {current_admin.email} atualizou taxas: {updated}")
        
        return {
            "success": True,
            "message": "Taxas atualizadas com sucesso",
            "updated": updated,
            "current": DEFAULT_SETTINGS["fees"]
        }
        
    except Exception as e:
        logger.error(f"❌ Erro atualizando taxas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/limits", response_model=dict)
async def get_limits_settings(
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna configurações de limites atuais
    """
    try:
        return {
            "success": True,
            "data": DEFAULT_SETTINGS["limits"]
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando limites: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/limits", response_model=dict)
async def update_limits_settings(
    request: LimitsUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Atualiza configurações de limites
    """
    try:
        updated = {}
        
        if request.daily_limit_brl is not None:
            DEFAULT_SETTINGS["limits"]["daily_limit_brl"] = request.daily_limit_brl
            updated["daily_limit_brl"] = request.daily_limit_brl
        
        if request.transaction_limit_brl is not None:
            DEFAULT_SETTINGS["limits"]["transaction_limit_brl"] = request.transaction_limit_brl
            updated["transaction_limit_brl"] = request.transaction_limit_brl
        
        if request.p2p_min_order_brl is not None:
            DEFAULT_SETTINGS["limits"]["p2p_min_order_brl"] = request.p2p_min_order_brl
            updated["p2p_min_order_brl"] = request.p2p_min_order_brl
        
        if request.p2p_max_order_brl is not None:
            DEFAULT_SETTINGS["limits"]["p2p_max_order_brl"] = request.p2p_max_order_brl
            updated["p2p_max_order_brl"] = request.p2p_max_order_brl
        
        logger.info(f"⚙️ Admin {current_admin.email} atualizou limites: {updated}")
        
        return {
            "success": True,
            "message": "Limites atualizados com sucesso",
            "updated": updated,
            "current": DEFAULT_SETTINGS["limits"]
        }
        
    except Exception as e:
        logger.error(f"❌ Erro atualizando limites: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/payment-methods", response_model=dict)
async def get_payment_methods_settings(
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna métodos de pagamento habilitados
    """
    try:
        return {
            "success": True,
            "data": DEFAULT_SETTINGS["payment_methods"]
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando métodos de pagamento: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/all", response_model=dict)
async def get_all_settings(
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna todas as configurações
    """
    try:
        return {
            "success": True,
            "data": DEFAULT_SETTINGS
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando configurações: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
