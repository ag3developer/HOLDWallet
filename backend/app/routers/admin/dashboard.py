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
    Retorna resumo geral do sistema para o dashboard admin.
    Inclui todas as métricas necessárias: usuários, trades, financeiro, disputas.
    """
    try:
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)
        
        # =====================
        # USUÁRIOS
        # =====================
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
        new_users_24h = db.query(func.count(User.id)).filter(User.created_at >= last_24h).scalar() or 0
        new_users_7d = db.query(func.count(User.id)).filter(User.created_at >= last_7d).scalar() or 0
        admin_users = db.query(func.count(User.id)).filter(User.is_admin == True).scalar() or 0
        verified_email = db.query(func.count(User.id)).filter(User.is_email_verified == True).scalar() or 0
        
        # =====================
        # WALLETS
        # =====================
        total_wallets = db.query(func.count(Wallet.id)).scalar() or 0
        # Wallets ativas (não há campo balance no modelo Wallet atual)
        wallets_with_balance = db.query(func.count(Wallet.id)).filter(
            Wallet.is_active == True
        ).scalar() or 0
        
        # =====================
        # TRADES OTC (InstantTrades)
        # =====================
        total_otc_trades = db.query(func.count(InstantTrade.id)).scalar() or 0
        pending_otc = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.PENDING
        ).scalar() or 0
        completed_otc = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        ).scalar() or 0
        
        # =====================
        # P2P
        # =====================
        total_p2p_orders = db.query(func.count(P2POrder.id)).scalar() or 0
        active_p2p_orders = db.query(func.count(P2POrder.id)).filter(
            P2POrder.status == "active"
        ).scalar() or 0
        completed_p2p = db.query(func.count(P2POrder.id)).filter(
            P2POrder.status == "completed"
        ).scalar() or 0
        
        total_p2p_matches = db.query(func.count(P2PMatch.id)).scalar() or 0
        
        # =====================
        # DISPUTAS
        # =====================
        total_disputes = db.query(func.count(P2PDispute.id)).scalar() or 0
        open_disputes = db.query(func.count(P2PDispute.id)).filter(
            P2PDispute.status == "open"
        ).scalar() or 0
        resolved_disputes = db.query(func.count(P2PDispute.id)).filter(
            P2PDispute.status == "resolved"
        ).scalar() or 0
        
        # =====================
        # FINANCEIRO - Volume de Trades
        # =====================
        # Volume total OTC (em BRL)
        total_volume_brl = db.query(func.sum(InstantTrade.brl_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        ).scalar() or 0.0
        
        # Volume últimas 24h
        volume_24h = db.query(func.sum(InstantTrade.brl_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED,
            InstantTrade.completed_at >= last_24h
        ).scalar() or 0.0
        
        # Volume últimos 7 dias
        volume_7d = db.query(func.sum(InstantTrade.brl_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED,
            InstantTrade.completed_at >= last_7d
        ).scalar() or 0.0
        
        # =====================
        # TAXAS COLETADAS (da tabela accounting_entries)
        # =====================
        from app.models.accounting import AccountingEntry
        
        total_fees = db.query(func.sum(AccountingEntry.amount)).filter(
            AccountingEntry.status == "processed"
        ).scalar() or 0.0
        
        fees_24h = db.query(func.sum(AccountingEntry.amount)).filter(
            AccountingEntry.status == "processed",
            AccountingEntry.created_at >= last_24h
        ).scalar() or 0.0
        
        fees_7d = db.query(func.sum(AccountingEntry.amount)).filter(
            AccountingEntry.status == "processed",
            AccountingEntry.created_at >= last_7d
        ).scalar() or 0.0
        
        # Breakdown por tipo de taxa
        spread_fees = db.query(func.sum(AccountingEntry.amount)).filter(
            AccountingEntry.entry_type == "spread",
            AccountingEntry.status == "processed"
        ).scalar() or 0.0
        
        network_fees = db.query(func.sum(AccountingEntry.amount)).filter(
            AccountingEntry.entry_type == "network_fee",
            AccountingEntry.status == "processed"
        ).scalar() or 0.0
        
        platform_fees = db.query(func.sum(AccountingEntry.amount)).filter(
            AccountingEntry.entry_type == "platform_fee",
            AccountingEntry.status == "processed"
        ).scalar() or 0.0
        
        # Valor médio dos trades
        avg_trade_value = 0.0
        if completed_otc > 0:
            avg_trade_value = float(total_volume_brl) / completed_otc
        
        # =====================
        # ATIVIDADE RECENTE
        # =====================
        recent_trades = db.query(InstantTrade).order_by(
            InstantTrade.created_at.desc()
        ).limit(5).all()
        
        recent_activity = []
        for trade in recent_trades:
            status_map = {
                TradeStatus.PENDING: ('warning', 'Trade pendente'),
                TradeStatus.COMPLETED: ('success', 'Trade completado'),
                TradeStatus.CANCELLED: ('error', 'Trade cancelado'),
                TradeStatus.EXPIRED: ('error', 'Trade expirado'),
            }
            status_info = status_map.get(trade.status, ('info', 'Trade'))
            
            recent_activity.append({
                "id": str(trade.id),
                "type": "trade",
                "title": status_info[1],
                "description": f"{trade.reference_code} • R$ {float(trade.brl_amount or 0):,.2f}",
                "time": trade.created_at.isoformat() if trade.created_at else None,
                "status": status_info[0]
            })
        
        # Usuários recentes
        recent_users = db.query(User).order_by(
            User.created_at.desc()
        ).limit(3).all()
        
        for user in recent_users:
            recent_activity.append({
                "id": str(user.id),
                "type": "user_registered",
                "title": "Novo usuário",
                "description": user.email,
                "time": user.created_at.isoformat() if user.created_at else None,
                "status": "info"
            })
        
        # Ordenar por tempo
        recent_activity.sort(key=lambda x: x.get('time') or '', reverse=True)
        recent_activity = recent_activity[:10]  # Top 10
        
        logger.info(f"✅ Dashboard completo acessado por admin: {current_admin.email}")
        
        return {
            "success": True,
            "data": {
                "users": {
                    "total": total_users,
                    "active": active_users,
                    "inactive": total_users - active_users,
                    "admins": admin_users,
                    "new_24h": new_users_24h,
                    "new_7d": new_users_7d,
                    "verified_kyc": verified_email  # usando email verificado como proxy
                },
                "wallets": {
                    "total": total_wallets,
                    "with_balance": wallets_with_balance
                },
                "trades": {
                    "otc_total": total_otc_trades,
                    "otc_pending": pending_otc,
                    "otc_completed": completed_otc,
                    "p2p_total": total_p2p_orders,
                    "p2p_active": active_p2p_orders,
                    "p2p_completed": completed_p2p,
                    "p2p_matches": total_p2p_matches
                },
                "financial": {
                    "total_volume_brl": float(total_volume_brl),
                    "volume_24h": float(volume_24h),
                    "volume_7d": float(volume_7d),
                    "total_fees_collected": float(total_fees),
                    "fees_24h": float(fees_24h),
                    "fees_7d": float(fees_7d),
                    "avg_trade_value": float(avg_trade_value),
                    "breakdown": {
                        "spread": float(spread_fees),
                        "network_fee": float(network_fees),
                        "platform_fee": float(platform_fees)
                    }
                },
                "disputes": {
                    "total": total_disputes,
                    "open": open_disputes,
                    "resolved": resolved_disputes
                },
                "system": {
                    "uptime": 99.9,  # TODO: implementar health check real
                    "api_health": "healthy",
                    "db_health": "healthy"
                },
                "recent_activity": recent_activity,
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
