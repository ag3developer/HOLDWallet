"""
🛡️ HOLD Wallet - Admin Transactions Router
===========================================

Gestão de transações blockchain wallet-to-wallet.
Mostra depósitos (recebimentos) e saques (envios) on-chain.
Inclui sincronização de status com a blockchain.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import asyncio

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.transaction import Transaction, TransactionStatus
from app.models.address import Address
from app.models.wallet import Wallet
from app.services.blockchain_signer import BlockchainSigner

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/transactions",
    tags=["Admin - Transactions"],
    dependencies=[Depends(get_current_admin)]
)

# Instância do signer para verificar status na blockchain
blockchain_signer = BlockchainSigner()


@router.get("/stats", response_model=dict)
async def get_transaction_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna estatísticas de transações blockchain wallet-to-wallet.
    Determina depósitos e saques baseado nos endereços dos usuários.
    """
    try:
        from datetime import timezone
        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        # Total de transações
        total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
        
        # Por status
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
        
        # Últimas 24h e 7d
        tx_24h = db.query(func.count(Transaction.id)).filter(
            Transaction.created_at >= last_24h
        ).scalar() or 0
        
        tx_7d = db.query(func.count(Transaction.id)).filter(
            Transaction.created_at >= last_7d
        ).scalar() or 0
        
        # ===== CALCULAR DEPÓSITOS E SAQUES =====
        # Buscar todos os endereços de usuários da plataforma
        user_addresses = db.query(Address.address).distinct().all()
        user_address_set = {addr[0].lower() for addr in user_addresses if addr[0]}
        
        # Buscar todas as transações para calcular
        all_transactions = db.query(Transaction).all()
        
        deposits = 0   # to_address pertence a um usuário (recebeu)
        withdrawals = 0  # from_address pertence a um usuário (enviou)
        
        for tx in all_transactions:
            from_addr = (tx.from_address or "").lower()
            to_addr = (tx.to_address or "").lower()
            
            # Se o destinatário é um usuário da plataforma = depósito
            if to_addr in user_address_set:
                deposits += 1
            # Se o remetente é um usuário da plataforma = saque
            if from_addr in user_address_set:
                withdrawals += 1
        
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
                "total": total_transactions,
                "pending": pending,
                "confirmed": confirmed,
                "failed": failed,
                "created": created,
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
    Lista transações blockchain wallet-to-wallet.
    Determina se é depósito ou saque baseado nos endereços dos usuários.
    """
    try:
        # Buscar todos os endereços de usuários da plataforma
        user_addresses = db.query(Address.address).distinct().all()
        user_address_set = {addr[0].lower() for addr in user_addresses if addr[0]}
        
        query = db.query(Transaction)
        
        # Filtro por status
        if status_filter and status_filter != 'all':
            try:
                status_enum = TransactionStatus(status_filter)
                query = query.filter(Transaction.status == status_enum)
            except ValueError:
                pass
        
        # Filtro por rede
        if network and network != 'all':
            query = query.filter(Transaction.network == network)
        
        # Filtro por usuário
        if user_id:
            try:
                query = query.filter(Transaction.user_id == int(user_id))
            except ValueError:
                pass
        
        # Busca por hash ou endereço
        if search:
            query = query.filter(
                Transaction.tx_hash.ilike(f"%{search}%") |
                Transaction.to_address.ilike(f"%{search}%") |
                Transaction.from_address.ilike(f"%{search}%")
            )
        
        # Buscar todas para filtrar por tipo se necessário
        all_transactions = query.order_by(desc(Transaction.created_at)).all()
        
        # Determinar tipo de cada transação e filtrar se necessário
        typed_transactions = []
        for tx in all_transactions:
            from_addr = (tx.from_address or "").lower()
            to_addr = (tx.to_address or "").lower()
            
            # Determinar tipo: depósito (recebeu) ou saque (enviou)
            is_deposit = to_addr in user_address_set
            is_withdrawal = from_addr in user_address_set
            
            if is_withdrawal:
                tx_type_value = "withdrawal"
            elif is_deposit:
                tx_type_value = "deposit"
            else:
                tx_type_value = "transfer"
            
            # Aplicar filtro de tipo se especificado
            if tx_type and tx_type != 'all':
                if tx_type == 'deposit' and not is_deposit:
                    continue
                if tx_type == 'withdrawal' and not is_withdrawal:
                    continue
            
            typed_transactions.append((tx, tx_type_value))
        
        # Contar total após filtro de tipo
        total = len(typed_transactions)
        
        # Aplicar paginação
        paginated = typed_transactions[skip:skip + limit]
        
        # Buscar usernames
        user_ids_list = list({t[0].user_id for t in paginated if t[0].user_id})
        users = db.query(User).filter(User.id.in_(user_ids_list)).all() if user_ids_list else []
        user_map = {u.id: u.username for u in users}
        
        items = []
        for tx, tx_type_value in paginated:
            items.append({
                "id": tx.id,
                "user_id": tx.user_id,
                "username": user_map.get(tx.user_id, "Unknown") if tx.user_id else None,
                "tx_type": tx_type_value,
                "tx_hash": tx.tx_hash,
                "from_address": tx.from_address,
                "to_address": tx.to_address,
                "amount": str(tx.amount) if tx.amount else "0",
                "cryptocurrency": tx.token_symbol,
                "network": tx.network,
                "status": tx.status.value if tx.status else None,
                "fee": str(tx.fee) if tx.fee else "0",
                "confirmations": tx.confirmations or 0,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
                "confirmed_at": tx.confirmed_at.isoformat() if tx.confirmed_at else None
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


# ============================================
# SINCRONIZAÇÃO COM BLOCKCHAIN
# ============================================

@router.post("/sync", response_model=dict)
async def sync_pending_transactions(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Sincroniza o status de todas as transações pendentes com a blockchain.
    Verifica cada transação com tx_hash e atualiza o status no banco.
    """
    try:
        # Buscar transações pendentes que têm hash
        pending_transactions = db.query(Transaction).filter(
            Transaction.status == TransactionStatus.pending,
            Transaction.tx_hash.isnot(None)
        ).all()
        
        if not pending_transactions:
            return {
                "success": True,
                "message": "Nenhuma transação pendente para sincronizar",
                "data": {
                    "total_checked": 0,
                    "updated": 0,
                    "confirmed": 0,
                    "failed": 0,
                    "still_pending": 0
                }
            }
        
        updated = 0
        confirmed = 0
        failed = 0
        still_pending = 0
        errors = []
        
        for tx in pending_transactions:
            try:
                # Verificar status na blockchain
                network = tx.network or "polygon"
                
                try:
                    status_info = await blockchain_signer.get_transaction_status(
                        network=network,
                        tx_hash=tx.tx_hash
                    )
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao verificar tx {tx.tx_hash}: {e}")
                    errors.append({"tx_hash": tx.tx_hash, "error": str(e)})
                    continue
                
                blockchain_status = status_info.get("status", "pending")
                confirmations = status_info.get("confirmations", 0)
                block_number = status_info.get("block_number")
                
                # Atualizar se status mudou
                if blockchain_status == "confirmed":
                    tx.status = TransactionStatus.confirmed
                    tx.confirmations = confirmations
                    tx.block_number = block_number
                    tx.confirmed_at = datetime.utcnow()
                    tx.updated_at = datetime.utcnow()
                    updated += 1
                    confirmed += 1
                    logger.info(f"✅ Transação {tx.tx_hash} confirmada ({confirmations} confirmações)")
                    
                elif blockchain_status == "failed":
                    tx.status = TransactionStatus.failed
                    tx.confirmations = confirmations
                    tx.block_number = block_number
                    tx.updated_at = datetime.utcnow()
                    tx.error_message = "Transação falhou na blockchain"
                    updated += 1
                    failed += 1
                    logger.warning(f"❌ Transação {tx.tx_hash} falhou")
                    
                else:
                    # Ainda pendente - atualizar confirmações se houver
                    if confirmations > 0:
                        tx.confirmations = confirmations
                        tx.updated_at = datetime.utcnow()
                    still_pending += 1
                
            except Exception as e:
                logger.error(f"❌ Erro processando tx {tx.id}: {e}")
                errors.append({"tx_id": tx.id, "error": str(e)})
        
        # Commit das mudanças
        db.commit()
        
        return {
            "success": True,
            "message": f"Sincronização concluída: {confirmed} confirmadas, {failed} falharam, {still_pending} ainda pendentes",
            "data": {
                "total_checked": len(pending_transactions),
                "updated": updated,
                "confirmed": confirmed,
                "failed": failed,
                "still_pending": still_pending,
                "errors": errors if errors else None
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Erro sincronizando transações: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/sync/{transaction_id}", response_model=dict)
async def sync_single_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Sincroniza o status de uma transação específica com a blockchain.
    """
    try:
        tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        
        if not tx:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        
        if not tx.tx_hash:
            raise HTTPException(
                status_code=400, 
                detail="Transação não possui hash - não pode ser verificada na blockchain"
            )
        
        # Verificar status na blockchain
        network = tx.network or "polygon"
        
        try:
            status_info = await blockchain_signer.get_transaction_status(
                network=network,
                tx_hash=tx.tx_hash
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao consultar blockchain: {str(e)}"
            )
        
        old_status = tx.status.value if tx.status else "unknown"
        blockchain_status = status_info.get("status", "pending")
        confirmations = status_info.get("confirmations", 0)
        block_number = status_info.get("block_number")
        gas_used = status_info.get("gas_used")
        is_final = status_info.get("final", False)
        
        # Atualizar transação
        if blockchain_status == "confirmed":
            tx.status = TransactionStatus.confirmed
            tx.confirmations = confirmations
            tx.block_number = block_number
            tx.confirmed_at = datetime.utcnow()
            tx.updated_at = datetime.utcnow()
            
        elif blockchain_status == "failed":
            tx.status = TransactionStatus.failed
            tx.confirmations = confirmations
            tx.block_number = block_number
            tx.updated_at = datetime.utcnow()
            tx.error_message = "Transação falhou na blockchain"
            
        else:
            # Ainda pendente
            if confirmations > 0:
                tx.confirmations = confirmations
                tx.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Status atualizado: {old_status} → {blockchain_status}",
            "data": {
                "id": tx.id,
                "tx_hash": tx.tx_hash,
                "old_status": old_status,
                "new_status": blockchain_status,
                "confirmations": confirmations,
                "block_number": block_number,
                "gas_used": gas_used,
                "is_final": is_final
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro sincronizando transação {transaction_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.patch("/{transaction_id}/status", response_model=dict)
async def update_transaction_status(
    transaction_id: int,
    new_status: str = Query(..., description="Novo status: pending, confirmed, failed"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Atualiza manualmente o status de uma transação.
    Use com cuidado - preferir sincronização automática.
    """
    try:
        tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        
        if not tx:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        
        # Validar status
        valid_statuses = ["pending", "confirmed", "failed", "cancelled"]
        if new_status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Status inválido. Use: {', '.join(valid_statuses)}"
            )
        
        old_status = tx.status.value if tx.status else "unknown"
        
        # Atualizar
        tx.status = TransactionStatus(new_status)
        tx.updated_at = datetime.utcnow()
        
        if new_status == "confirmed":
            tx.confirmed_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"📝 Admin {current_admin.username} alterou status da tx {tx.id}: {old_status} → {new_status}")
        
        return {
            "success": True,
            "message": f"Status atualizado: {old_status} → {new_status}",
            "data": {
                "id": tx.id,
                "tx_hash": tx.tx_hash,
                "old_status": old_status,
                "new_status": new_status
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro atualizando status: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
