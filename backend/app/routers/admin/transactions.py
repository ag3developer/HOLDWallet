"""
🛡️ HOLD Wallet - Admin Transactions Router
===========================================

Gestão de transações blockchain.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from datetime import datetime, timedelta
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.transaction import Transaction

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/transactions",
    tags=["Admin - Transactions"],
    dependencies=[Depends(get_current_admin)]
)


@router.get("/stats", response_model=dict)
async def get_transaction_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna estatísticas de transações blockchain
    """
    try:
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
        
        # Por status
        pending = db.query(func.count(Transaction.id)).filter(
            Transaction.status == 'pending'
        ).scalar() or 0
        
        confirmed = db.query(func.count(Transaction.id)).filter(
            Transaction.status == 'confirmed'
        ).scalar() or 0
        
        failed = db.query(func.count(Transaction.id)).filter(
            Transaction.status == 'failed'
        ).scalar() or 0
        
        # Últimas 24h
        tx_24h = db.query(func.count(Transaction.id)).filter(
            Transaction.created_at >= last_24h
        ).scalar() or 0
        
        # Última semana
        tx_7d = db.query(func.count(Transaction.id)).filter(
            Transaction.created_at >= last_7d
        ).scalar() or 0
        
        # Por tipo
        deposits = db.query(func.count(Transaction.id)).filter(
            Transaction.tx_type == 'deposit'
        ).scalar() or 0
        
        withdrawals = db.query(func.count(Transaction.id)).filter(
            Transaction.tx_type == 'withdrawal'
        ).scalar() or 0
        
        # Por rede (se existir o campo)
        networks_stats = []
        try:
            networks = db.query(
                Transaction.network,
                func.count(Transaction.id).label('count')
            ).group_by(Transaction.network).all()
            
            for n in networks:
                if n.network:
                    networks_stats.append({
                        "network": n.network,
                        "count": n.count
                    })
        except:
            pass
        
        return {
            "success": True,
            "data": {
                "total": total_transactions,
                "pending": pending,
                "confirmed": confirmed,
                "failed": failed,
                "last_24h": tx_24h,
                "last_7d": tx_7d,
                "deposits": deposits,
                "withdrawals": withdrawals,
                "by_network": networks_stats
            }
        }
    except Exception as e:
        logger.error(f"❌ Erro obtendo stats de transações: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("", response_model=dict)
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = None,
    tx_type: Optional[str] = None,
    network: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todas as transações blockchain
    """
    try:
        query = db.query(Transaction)
        
        if status_filter and status_filter != 'all':
            query = query.filter(Transaction.status == status_filter)
        
        if tx_type and tx_type != 'all':
            query = query.filter(Transaction.tx_type == tx_type)
        
        if network and network != 'all':
            query = query.filter(Transaction.network == network)
        
        if user_id:
            query = query.filter(Transaction.user_id == user_id)
        
        if search:
            query = query.filter(
                Transaction.tx_hash.ilike(f"%{search}%") |
                Transaction.to_address.ilike(f"%{search}%") |
                Transaction.from_address.ilike(f"%{search}%")
            )
        
        total = query.count()
        transactions = query.order_by(desc(Transaction.created_at)).offset(skip).limit(limit).all()
        
        # Buscar usernames
        user_ids = list(set([str(t.user_id) for t in transactions if t.user_id]))
        users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
        user_map = {str(u.id): u.username for u in users}
        
        items = []
        for tx in transactions:
            items.append({
                "id": str(tx.id),
                "user_id": str(tx.user_id) if tx.user_id else None,
                "username": user_map.get(str(tx.user_id), "Unknown") if tx.user_id else None,
                "tx_type": tx.tx_type,
                "tx_hash": tx.tx_hash,
                "from_address": tx.from_address,
                "to_address": tx.to_address,
                "amount": float(tx.amount) if tx.amount else 0,
                "cryptocurrency": tx.cryptocurrency if hasattr(tx, 'cryptocurrency') else None,
                "network": tx.network if hasattr(tx, 'network') else None,
                "status": tx.status,
                "fee": float(tx.fee) if hasattr(tx, 'fee') and tx.fee else 0,
                "confirmations": tx.confirmations if hasattr(tx, 'confirmations') else 0,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
                "confirmed_at": tx.confirmed_at.isoformat() if hasattr(tx, 'confirmed_at') and tx.confirmed_at else None
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
        logger.error(f"❌ Erro listando transações: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{transaction_id}", response_model=dict)
async def get_transaction_detail(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna detalhes de uma transação específica
    """
    try:
        tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        
        if not tx:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        
        # Buscar usuário
        user = db.query(User).filter(User.id == tx.user_id).first() if tx.user_id else None
        
        return {
            "success": True,
            "data": {
                "id": str(tx.id),
                "user_id": str(tx.user_id) if tx.user_id else None,
                "username": user.username if user else None,
                "email": user.email if user else None,
                "tx_type": tx.tx_type,
                "tx_hash": tx.tx_hash,
                "from_address": tx.from_address,
                "to_address": tx.to_address,
                "amount": float(tx.amount) if tx.amount else 0,
                "cryptocurrency": tx.cryptocurrency if hasattr(tx, 'cryptocurrency') else None,
                "network": tx.network if hasattr(tx, 'network') else None,
                "status": tx.status,
                "fee": float(tx.fee) if hasattr(tx, 'fee') and tx.fee else 0,
                "confirmations": tx.confirmations if hasattr(tx, 'confirmations') else 0,
                "block_number": tx.block_number if hasattr(tx, 'block_number') else None,
                "error_message": tx.error_message if hasattr(tx, 'error_message') else None,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
                "updated_at": tx.updated_at.isoformat() if hasattr(tx, 'updated_at') and tx.updated_at else None,
                "confirmed_at": tx.confirmed_at.isoformat() if hasattr(tx, 'confirmed_at') and tx.confirmed_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro obtendo transação: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/user/{user_id}", response_model=dict)
async def get_user_transactions(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    tx_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista transações de um usuário específico
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        query = db.query(Transaction).filter(Transaction.user_id == user_id)
        
        if tx_type and tx_type != 'all':
            query = query.filter(Transaction.tx_type == tx_type)
        
        total = query.count()
        transactions = query.order_by(desc(Transaction.created_at)).offset(skip).limit(limit).all()
        
        items = []
        for tx in transactions:
            items.append({
                "id": str(tx.id),
                "tx_type": tx.tx_type,
                "tx_hash": tx.tx_hash,
                "amount": float(tx.amount) if tx.amount else 0,
                "cryptocurrency": tx.cryptocurrency if hasattr(tx, 'cryptocurrency') else None,
                "network": tx.network if hasattr(tx, 'network') else None,
                "status": tx.status,
                "created_at": tx.created_at.isoformat() if tx.created_at else None
            })
        
        return {
            "success": True,
            "data": {
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email
                },
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro listando transações do usuário: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
