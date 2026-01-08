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
from app.models.transaction import Transaction, TransactionStatus, TransactionType
from app.models.instant_trade import InstantTrade, TradeStatus, OperationType

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
    Inclui tanto transações da tabela transactions quanto InstantTrades com tx_hash
    """
    try:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        # ========== TRANSAÇÕES TABELA TRANSACTIONS ==========
        total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
        
        # Por status (usando enum)
        pending = db.query(func.count(Transaction.id)).filter(
            Transaction.status == TransactionStatus.pending
        ).scalar() or 0
        
        confirmed = db.query(func.count(Transaction.id)).filter(
            Transaction.status == TransactionStatus.confirmed
        ).scalar() or 0
        
        failed = db.query(func.count(Transaction.id)).filter(
            Transaction.status == TransactionStatus.failed
        ).scalar() or 0
        
        created = db.query(func.count(Transaction.id)).filter(
            Transaction.status == TransactionStatus.created
        ).scalar() or 0
        
        # Últimas 24h
        tx_24h = db.query(func.count(Transaction.id)).filter(
            Transaction.created_at >= last_24h
        ).scalar() or 0
        
        # Última semana
        tx_7d = db.query(func.count(Transaction.id)).filter(
            Transaction.created_at >= last_7d
        ).scalar() or 0
        
        # Depósitos e Saques da tabela transactions (por tx_type)
        deposits_tx = db.query(func.count(Transaction.id)).filter(
            Transaction.tx_type == TransactionType.deposit
        ).scalar() or 0
        
        withdrawals_tx = db.query(func.count(Transaction.id)).filter(
            Transaction.tx_type == TransactionType.withdrawal
        ).scalar() or 0
        
        # ========== INSTANT TRADES COM TX_HASH (transações blockchain) ==========
        # Compras (BUY) = plataforma envia crypto para usuário = SAQUE da plataforma
        buy_trades_with_tx = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.operation_type == "buy",
            InstantTrade.tx_hash.isnot(None)
        ).scalar() or 0
        
        # Vendas (SELL) = usuário envia crypto para plataforma = DEPÓSITO na plataforma
        sell_trades_with_tx = db.query(func.count(InstantTrade.id)).filter(
            InstantTrade.operation_type == "sell",
            InstantTrade.tx_hash.isnot(None)
        ).scalar() or 0
        
        # Total incluindo InstantTrades
        total_deposits = deposits_tx + sell_trades_with_tx  # Vendas = entrada na plataforma
        total_withdrawals = withdrawals_tx + buy_trades_with_tx  # Compras = saída da plataforma
        
        # Por rede
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
        except Exception:
            pass
        
        return {
            "success": True,
            "data": {
                "total": total_transactions + buy_trades_with_tx + sell_trades_with_tx,
                "pending": pending,
                "confirmed": confirmed,
                "failed": failed,
                "created": created,
                "last_24h": tx_24h,
                "last_7d": tx_7d,
                "deposits": total_deposits,
                "withdrawals": total_withdrawals,
                "by_network": networks_stats,
                # Detalhamento
                "otc_buys": buy_trades_with_tx,
                "otc_sells": sell_trades_with_tx
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
    include_otc: bool = Query(True, description="Incluir transações OTC (InstantTrade)"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todas as transações blockchain (incluindo InstantTrades com tx_hash)
    """
    try:
        items = []
        
        # ========== TRANSAÇÕES DA TABELA TRANSACTIONS ==========
        query = db.query(Transaction)
        
        # Filtro por status usando enum
        if status_filter and status_filter != 'all':
            try:
                status_enum = TransactionStatus(status_filter)
                query = query.filter(Transaction.status == status_enum)
            except ValueError:
                pass
        
        # Filtro por tipo
        if tx_type and tx_type != 'all':
            try:
                type_enum = TransactionType(tx_type)
                query = query.filter(Transaction.tx_type == type_enum)
            except ValueError:
                pass
        
        if network and network != 'all':
            query = query.filter(Transaction.network == network)
        
        if user_id:
            try:
                query = query.filter(Transaction.user_id == int(user_id))
            except ValueError:
                pass
        
        if search:
            query = query.filter(
                Transaction.tx_hash.ilike(f"%{search}%") |
                Transaction.to_address.ilike(f"%{search}%") |
                Transaction.from_address.ilike(f"%{search}%")
            )
        
        transactions = query.order_by(desc(Transaction.created_at)).all()
        
        # Buscar usernames para transactions
        tx_user_ids = [t.user_id for t in transactions if t.user_id]
        tx_users = db.query(User).filter(User.id.in_(tx_user_ids)).all() if tx_user_ids else []
        tx_user_map = {u.id: u.username for u in tx_users}
        
        for tx in transactions:
            tx_type_value = tx.tx_type.value if hasattr(tx, 'tx_type') and tx.tx_type else "transfer"
            items.append({
                "id": f"tx_{tx.id}",
                "source": "transaction",
                "user_id": str(tx.user_id) if tx.user_id else None,
                "username": tx_user_map.get(tx.user_id, "Unknown") if tx.user_id else None,
                "tx_type": tx_type_value,
                "tx_hash": tx.tx_hash,
                "from_address": tx.from_address,
                "to_address": tx.to_address,
                "amount": float(tx.amount) if tx.amount else 0,
                "cryptocurrency": tx.token_symbol,
                "network": tx.network,
                "status": tx.status.value if tx.status else None,
                "fee": float(tx.fee) if tx.fee else 0,
                "confirmations": tx.confirmations or 0,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
                "confirmed_at": tx.confirmed_at.isoformat() if tx.confirmed_at else None
            })
        
        # ========== INSTANT TRADES COM TX_HASH ==========
        if include_otc:
            otc_query = db.query(InstantTrade).filter(InstantTrade.tx_hash.isnot(None))
            
            # Filtro por tipo OTC
            if tx_type and tx_type != 'all':
                if tx_type == 'deposit' or tx_type == 'sell':
                    otc_query = otc_query.filter(InstantTrade.operation_type == "sell")
                elif tx_type == 'withdrawal' or tx_type == 'buy':
                    otc_query = otc_query.filter(InstantTrade.operation_type == "buy")
            
            if network and network != 'all':
                otc_query = otc_query.filter(InstantTrade.network == network)
            
            if user_id:
                otc_query = otc_query.filter(InstantTrade.user_id == user_id)
            
            if search:
                otc_query = otc_query.filter(
                    InstantTrade.tx_hash.ilike(f"%{search}%") |
                    InstantTrade.wallet_address.ilike(f"%{search}%") |
                    InstantTrade.reference_code.ilike(f"%{search}%")
                )
            
            otc_trades = otc_query.order_by(desc(InstantTrade.created_at)).all()
            
            # Buscar usernames para OTC
            otc_user_ids = [t.user_id for t in otc_trades if t.user_id]
            otc_users = db.query(User).filter(User.id.in_(otc_user_ids)).all() if otc_user_ids else []
            otc_user_map = {str(u.id): u.username for u in otc_users}
            
            for trade in otc_trades:
                # BUY = plataforma envia para usuário = withdrawal
                # SELL = usuário envia para plataforma = deposit
                op_type = str(trade.operation_type.value) if hasattr(trade.operation_type, 'value') else str(trade.operation_type)
                tx_type_mapped = "withdrawal" if op_type == "buy" else "deposit"
                
                # Determinar status
                trade_status = str(trade.status.value) if hasattr(trade.status, 'value') else str(trade.status)
                if trade_status in ["completed", "crypto_sent", "crypto_received"]:
                    mapped_status = "confirmed"
                elif trade_status in ["pending", "processing", "awaiting_payment"]:
                    mapped_status = "pending"
                elif trade_status in ["cancelled", "failed", "expired"]:
                    mapped_status = "failed"
                else:
                    mapped_status = "pending"
                
                items.append({
                    "id": f"otc_{trade.id}",
                    "source": "instant_trade",
                    "user_id": str(trade.user_id) if trade.user_id else None,
                    "username": otc_user_map.get(str(trade.user_id), "Unknown") if trade.user_id else None,
                    "tx_type": tx_type_mapped,
                    "tx_hash": trade.tx_hash,
                    "from_address": trade.wallet_address if op_type == "sell" else None,
                    "to_address": trade.wallet_address if op_type == "buy" else None,
                    "amount": float(trade.crypto_amount) if trade.crypto_amount else 0,
                    "cryptocurrency": trade.symbol,
                    "network": trade.network,
                    "status": mapped_status,
                    "fee": 0,
                    "confirmations": 1 if mapped_status == "confirmed" else 0,
                    "created_at": trade.created_at.isoformat() if trade.created_at else None,
                    "confirmed_at": trade.updated_at.isoformat() if trade.updated_at and mapped_status == "confirmed" else None,
                    "reference_code": trade.reference_code,
                    "brl_amount": float(trade.brl_amount) if trade.brl_amount else 0
                })
        
        # Ordenar por data (mais recentes primeiro)
        items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        
        # Aplicar paginação
        total = len(items)
        items = items[skip:skip + limit]
        
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
