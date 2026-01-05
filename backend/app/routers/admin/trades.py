"""
🛡️ HOLD Wallet - Admin Trades Router
=====================================

Gestão de trades OTC (Instant Trades).
Move funcionalidades do admin_instant_trades.py para estrutura organizada.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.instant_trade import InstantTrade, TradeStatus, InstantTradeHistory

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/trades",
    tags=["Admin - Trades OTC"],
    dependencies=[Depends(get_current_admin)]
)


# ===== SCHEMAS =====

class TradeListItem(BaseModel):
    id: str
    reference_code: str
    user_id: str
    operation_type: str
    symbol: str
    fiat_amount: float
    crypto_amount: float
    total_amount: float
    payment_method: str
    status: str
    wallet_address: Optional[str]
    tx_hash: Optional[str]
    network: Optional[str]
    created_at: datetime
    expires_at: datetime


class TradeStatsResponse(BaseModel):
    total_trades: int
    pending: int
    completed: int
    failed: int
    cancelled: int
    total_volume_brl: float
    total_volume_24h: float


# ===== ENDPOINTS =====

@router.get("", response_model=dict)
async def list_trades(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    operation_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todos os trades OTC com paginação e filtros
    """
    try:
        query = db.query(InstantTrade)
        
        # Filtro por status
        if status and status != 'all':
            try:
                status_enum = TradeStatus(status)
                query = query.filter(InstantTrade.status == status_enum)
            except ValueError:
                pass  # Ignora status inválido
        
        # Filtro por tipo de operação (buy/sell)
        if operation_type and operation_type != 'all':
            query = query.filter(InstantTrade.operation_type == operation_type)
        
        # Busca por referência ou ID
        if search:
            query = query.filter(
                (InstantTrade.reference_code.ilike(f"%{search}%")) |
                (InstantTrade.id.ilike(f"%{search}%"))
            )
        
        # Total antes da paginação
        total = query.count()
        
        # Ordenar e paginar
        trades = query.order_by(InstantTrade.created_at.desc()).offset(skip).limit(limit).all()
        
        # Buscar usernames
        user_ids = [str(t.user_id) for t in trades]
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {str(u.id): u.username for u in users}
        
        # Formatar resposta
        items = []
        for trade in trades:
            items.append({
                "id": str(trade.id),
                "reference_code": trade.reference_code,
                "user_id": str(trade.user_id),
                "username": user_map.get(str(trade.user_id), "Unknown"),
                "operation_type": trade.operation_type.value if hasattr(trade.operation_type, 'value') else trade.operation_type,
                "symbol": trade.symbol,
                "fiat_amount": float(trade.fiat_amount),
                "crypto_amount": float(trade.crypto_amount),
                "crypto_price": float(trade.crypto_price),
                "total_amount": float(trade.total_amount),
                "payment_method": trade.payment_method.value if hasattr(trade.payment_method, 'value') else trade.payment_method,
                "status": trade.status.value if hasattr(trade.status, 'value') else trade.status,
                "created_at": trade.created_at.isoformat(),
                "expires_at": trade.expires_at.isoformat() if trade.expires_at else None
            })
        
        return {
            "success": True,
            "data": {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro listando trades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/stats", response_model=dict)
async def get_trades_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna estatísticas de trades OTC
    """
    try:
        total = db.query(func.count(InstantTrade.id)).scalar() or 0
        pending = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.PENDING
        ).scalar() or 0
        completed = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        ).scalar() or 0
        failed = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.FAILED
        ).scalar() or 0
        cancelled = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.status == TradeStatus.CANCELLED
        ).scalar() or 0
        
        # Volume total
        total_volume = db.query(func.sum(InstantTrade.total_amount)).filter(
            InstantTrade.status == TradeStatus.COMPLETED
        ).scalar() or 0
        
        return {
            "success": True,
            "data": {
                "total_trades": total,
                "pending": pending,
                "completed": completed,
                "failed": failed,
                "cancelled": cancelled,
                "total_volume_brl": float(total_volume)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro nas stats de trades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{trade_id}", response_model=dict)
async def get_trade_detail(
    trade_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna detalhes de um trade específico
    """
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Buscar histórico
        history = db.query(InstantTradeHistory).filter(
            InstantTradeHistory.trade_id == trade_id
        ).order_by(InstantTradeHistory.created_at.desc()).all()
        
        history_items = []
        for h in history:
            history_items.append({
                "old_status": h.old_status.value if h.old_status else None,
                "new_status": h.new_status.value if h.new_status else None,
                "reason": h.reason,
                "created_at": h.created_at.isoformat()
            })
        
        return {
            "success": True,
            "data": {
                "id": trade.id,
                "reference_code": trade.reference_code,
                "user_id": trade.user_id,
                "operation_type": trade.operation_type.value,
                "symbol": trade.symbol,
                "name": trade.name,
                "fiat_amount": float(trade.fiat_amount),
                "crypto_amount": float(trade.crypto_amount),
                "crypto_price": float(trade.crypto_price),
                "spread_percentage": float(trade.spread_percentage),
                "spread_amount": float(trade.spread_amount),
                "network_fee_percentage": float(trade.network_fee_percentage),
                "network_fee_amount": float(trade.network_fee_amount),
                "total_amount": float(trade.total_amount),
                "payment_method": trade.payment_method.value,
                "payment_proof_url": trade.payment_proof_url,
                "status": trade.status.value,
                "wallet_address": trade.wallet_address,
                "network": trade.network,
                "tx_hash": trade.tx_hash,
                "error_message": trade.error_message,
                "created_at": trade.created_at.isoformat(),
                "expires_at": trade.expires_at.isoformat(),
                "payment_confirmed_at": trade.payment_confirmed_at.isoformat() if trade.payment_confirmed_at else None,
                "completed_at": trade.completed_at.isoformat() if trade.completed_at else None,
                "history": history_items
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro buscando trade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{trade_id}/cancel", response_model=dict)
async def cancel_trade(
    trade_id: str,
    reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Cancela um trade pendente
    """
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()
        
        if not trade:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trade {trade_id} não encontrado"
            )
        
        # Só pode cancelar trades pendentes
        if trade.status not in [TradeStatus.PENDING, TradeStatus.PAYMENT_PROCESSING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Trade com status {trade.status.value} não pode ser cancelado"
            )
        
        old_status = trade.status
        trade.status = TradeStatus.CANCELLED
        
        # Registrar histórico
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=TradeStatus.CANCELLED,
            reason=f"Cancelado por admin {current_admin.email}: {reason or 'Sem motivo informado'}"
        )
        db.add(history)
        db.commit()
        
        logger.info(f"🚫 Admin {current_admin.email} cancelou trade {trade.reference_code}")
        
        return {
            "success": True,
            "message": f"Trade {trade.reference_code} cancelado com sucesso",
            "trade_id": trade.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro cancelando trade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
