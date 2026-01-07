"""
🌐 HOLD Wallet - Public Settings Router
========================================

Endpoints públicos para acessar configurações da plataforma.
Usado pelo frontend para mostrar taxas e limites aos usuários.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.core.db import get_db
from app.services.platform_settings_service import platform_settings_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/settings",
    tags=["Public - Settings"]
)


@router.get("/fees")
async def get_public_fees(
    db: Session = Depends(get_db)
):
    """
    Retorna taxas públicas da plataforma.
    Não requer autenticação.
    
    Usado para mostrar aos usuários:
    - Taxa OTC (spread de compra/venda)
    - Taxa P2P
    - Taxa de rede (saques)
    """
    try:
        # Inicializa configurações padrão se não existirem
        platform_settings_service.initialize_defaults(db)
        
        fees = platform_settings_service.get_fees(db)
        
        return {
            "success": True,
            "data": {
                "otc_spread_percentage": fees.get("otc_spread_percentage", 3.0),
                "p2p_fee_percentage": fees.get("p2p_fee_percentage", 0.5),
                "network_fee_percentage": fees.get("network_fee_percentage", 0.25),
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando taxas públicas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar taxas"
        )


@router.get("/limits")
async def get_public_limits(
    db: Session = Depends(get_db)
):
    """
    Retorna limites públicos da plataforma.
    Não requer autenticação.
    
    Usado para mostrar aos usuários:
    - Limite mínimo/máximo de ordens P2P
    - Limite de transação
    """
    try:
        platform_settings_service.initialize_defaults(db)
        
        limits = platform_settings_service.get_limits(db)
        
        return {
            "success": True,
            "data": {
                "p2p_min_order_brl": limits.get("p2p_min_order_brl", 50.0),
                "p2p_max_order_brl": limits.get("p2p_max_order_brl", 500000.0),
                "transaction_limit_brl": limits.get("transaction_limit_brl", 500000.0),
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando limites públicos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar limites"
        )


@router.get("/trading-status")
async def get_trading_status(
    db: Session = Depends(get_db)
):
    """
    Retorna status do trading na plataforma.
    Não requer autenticação.
    
    Usado para verificar se OTC e P2P estão habilitados.
    """
    try:
        platform_settings_service.initialize_defaults(db)
        
        trading = platform_settings_service.get_trading_settings(db)
        
        return {
            "success": True,
            "data": {
                "trading_enabled": trading.get("trading_enabled", True),
                "p2p_enabled": trading.get("p2p_enabled", True),
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando status de trading: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar status"
        )


@router.get("/all")
async def get_all_public_settings(
    db: Session = Depends(get_db)
):
    """
    Retorna todas as configurações públicas da plataforma.
    Não requer autenticação.
    
    Consolidado para reduzir número de requisições.
    """
    try:
        platform_settings_service.initialize_defaults(db)
        
        fees = platform_settings_service.get_fees(db)
        limits = platform_settings_service.get_limits(db)
        trading = platform_settings_service.get_trading_settings(db)
        
        return {
            "success": True,
            "data": {
                "fees": {
                    "otc_spread_percentage": fees.get("otc_spread_percentage", 3.0),
                    "p2p_fee_percentage": fees.get("p2p_fee_percentage", 0.5),
                    "network_fee_percentage": fees.get("network_fee_percentage", 0.25),
                },
                "limits": {
                    "p2p_min_order_brl": limits.get("p2p_min_order_brl", 50.0),
                    "p2p_max_order_brl": limits.get("p2p_max_order_brl", 500000.0),
                    "transaction_limit_brl": limits.get("transaction_limit_brl", 500000.0),
                },
                "trading": {
                    "trading_enabled": trading.get("trading_enabled", True),
                    "p2p_enabled": trading.get("p2p_enabled", True),
                }
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro buscando configurações públicas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar configurações"
        )
