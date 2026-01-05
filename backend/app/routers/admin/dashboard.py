"""
🛡️ HOLD Wallet - Admin Dashboard Router
========================================

Dashboard administrativo com métricas e resumos do sistema.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.core.config import settings
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.models.instant_trade import InstantTrade, TradeStatus
from app.models.p2p import P2POrder, P2PMatch, P2PDispute
from app.models.system_blockchain_wallet import (
    SystemBlockchainWallet,
    SystemBlockchainAddress,
    SystemWalletTransaction
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/dashboard",
    tags=["Admin - Dashboard"],
    dependencies=[Depends(get_current_admin)]
)


@router.get("/summary")
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna resumo geral do sistema para o dashboard admin
    """
    try:
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)
        
        # Usuários
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        new_users_24h = db.query(func.count(User.id)).filter(User.created_at >= last_24h).scalar() or 0
        new_users_7d = db.query(func.count(User.id)).filter(User.created_at >= last_7d).scalar() or 0
        admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar() or 0
        
        # Wallets
        total_wallets = db.query(func.count(Wallet.id)).scalar() or 0
        
        # Trades OTC
        total_trades = db.query(func.count(InstantTrade.id)).scalar() or 0
        pending_trades = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.PENDING
        ).scalar() or 0
        completed_trades = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        ).scalar() or 0
        
        # P2P
        total_p2p_orders = db.query(func.count(P2POrder.id)).scalar() or 0
        active_p2p_orders = db.query(func.count(P2POrder.id)).filter(
            P2POrder.status == "active"
        ).scalar() or 0
        
        # Disputas
        open_disputes = db.query(func.count(P2PDispute.id)).filter(
            P2PDispute.status == "open"
        ).scalar() or 0
        
        logger.info(f"✅ Dashboard acessado por admin: {current_admin.email}")
        
        return {
            "success": True,
            "data": {
                "users": {
                    "total": total_users,
                    "active": active_users,
                    "inactive": total_users - active_users,
                    "admins": admin_users,
                    "new_24h": new_users_24h,
                    "new_7d": new_users_7d
                },
                "wallets": {
                    "total": total_wallets
                },
                "trades_otc": {
                    "total": total_trades,
                    "pending": pending_trades,
                    "completed": completed_trades
                },
                "p2p": {
                    "total_orders": total_p2p_orders,
                    "active_orders": active_p2p_orders,
                    "open_disputes": open_disputes
                },
                "alerts": {
                    "pending_trades": pending_trades,
                    "open_disputes": open_disputes
                },
                "generated_at": now.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro no dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao carregar dashboard: {str(e)}"
        )


@router.get("/stats/users")
async def get_user_stats(
    period: str = "30d",  # 24h, 7d, 30d, 90d, all
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Estatísticas detalhadas de usuários
    """
    try:
        now = datetime.utcnow()
        
        # Definir período
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        elif period == "90d":
            start_date = now - timedelta(days=90)
        else:
            start_date = None
        
        # Query base
        query = db.query(User)
        if start_date:
            query = query.filter(User.created_at >= start_date)
        
        total = query.count()
        verified = query.filter(User.is_email_verified == True).count()
        
        return {
            "success": True,
            "period": period,
            "data": {
                "total_registered": total,
                "email_verified": verified,
                "verification_rate": round((verified / total * 100) if total > 0 else 0, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro nas stats de usuários: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/system-wallet-summary")
async def get_system_wallet_summary(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna resumo da carteira blockchain do sistema com taxas coletadas.
    """
    try:
        # Buscar carteira do sistema
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.id == settings.SYSTEM_BLOCKCHAIN_WALLET_ID,
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            return {
                "success": True,
                "data": {
                    "wallet_exists": False,
                    "message": "Carteira blockchain do sistema não configurada"
                }
            }
        
        # Buscar endereços
        addresses = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.is_active == True
        ).all()
        
        # Buscar transações (taxas coletadas)
        total_transactions = db.query(func.count(SystemWalletTransaction.id)).filter(
            SystemWalletTransaction.address_id.in_([a.id for a in addresses])
        ).scalar() or 0
        
        total_fees_brl = db.query(func.sum(SystemWalletTransaction.amount)).filter(
            SystemWalletTransaction.address_id.in_([a.id for a in addresses]),
            SystemWalletTransaction.cryptocurrency == "BRL"
        ).scalar() or 0.0
        
        # Taxas por tipo
        p2p_fees = db.query(func.sum(SystemWalletTransaction.amount)).filter(
            SystemWalletTransaction.address_id.in_([a.id for a in addresses]),
            SystemWalletTransaction.reference_type == "p2p_commission"
        ).scalar() or 0.0
        
        otc_spread_fees = db.query(func.sum(SystemWalletTransaction.amount)).filter(
            SystemWalletTransaction.address_id.in_([a.id for a in addresses]),
            SystemWalletTransaction.reference_type == "otc_spread"
        ).scalar() or 0.0
        
        network_fees = db.query(func.sum(SystemWalletTransaction.amount)).filter(
            SystemWalletTransaction.address_id.in_([a.id for a in addresses]),
            SystemWalletTransaction.reference_type == "network_fee"
        ).scalar() or 0.0
        
        # Taxas últimas 24h
        from datetime import timezone
        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)
        
        fees_24h = db.query(func.sum(SystemWalletTransaction.amount)).filter(
            SystemWalletTransaction.address_id.in_([a.id for a in addresses]),
            SystemWalletTransaction.cryptocurrency == "BRL",
            SystemWalletTransaction.created_at >= last_24h
        ).scalar() or 0.0
        
        # Taxas últimos 7 dias
        last_7d = now - timedelta(days=7)
        fees_7d = db.query(func.sum(SystemWalletTransaction.amount)).filter(
            SystemWalletTransaction.address_id.in_([a.id for a in addresses]),
            SystemWalletTransaction.cryptocurrency == "BRL",
            SystemWalletTransaction.created_at >= last_7d
        ).scalar() or 0.0
        
        # Organizar endereços por rede
        address_summary = {}
        for addr in addresses:
            address_summary[addr.network] = {
                "address": addr.address,
                "cryptocurrency": addr.cryptocurrency,
                "cached_balance": float(addr.cached_balance or 0),
                "cached_balance_usd": float(addr.cached_balance_usd or 0),
            }
        
        return {
            "success": True,
            "data": {
                "wallet_exists": True,
                "wallet_id": str(wallet.id),
                "wallet_name": wallet.name,
                "created_at": wallet.created_at.isoformat() if wallet.created_at else None,
                "total_networks": len(addresses),
                "fees_summary": {
                    "total_transactions": total_transactions,
                    "total_fees_brl": float(total_fees_brl),
                    "p2p_commission": float(p2p_fees),
                    "otc_spread": float(otc_spread_fees),
                    "network_fees": float(network_fees),
                    "fees_24h": float(fees_24h),
                    "fees_7d": float(fees_7d),
                },
                "addresses": address_summary
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro ao buscar resumo da carteira: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
