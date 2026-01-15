"""
🔒 Admin Locked Balances Management
===================================

Endpoints para gerenciar saldos bloqueados dos usuários.

Features:
- Listar todos os saldos bloqueados
- Identificar origem do bloqueio
- Desbloquear saldo manualmente
- Histórico de ações

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.balance import WalletBalance
from app.models.wolkpay import WolkPayBillPayment, BillPaymentStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/locked-balances", tags=["Admin Locked Balances"])


# ==========================================
# SCHEMAS
# ==========================================

class LockedBalanceItem(BaseModel):
    """Item de saldo bloqueado"""
    user_id: str
    username: str
    email: str
    cryptocurrency: str
    available_balance: float
    locked_balance: float
    total_balance: float
    last_updated_reason: Optional[str] = None
    updated_at: Optional[str] = None
    
    # Análise de origem
    possible_sources: List[dict] = []


class LockedBalancesResponse(BaseModel):
    """Resposta da listagem de saldos bloqueados"""
    total_users_with_locked: int
    total_locked_value: dict  # Por crypto
    locked_balances: List[LockedBalanceItem]


class UnlockBalanceRequest(BaseModel):
    """Request para desbloquear saldo"""
    user_id: str = Field(..., description="ID do usuário")
    cryptocurrency: str = Field(..., description="Criptomoeda (ex: USDT)")
    amount: Optional[float] = Field(None, description="Valor a desbloquear (None = todo)")
    reason: str = Field(..., description="Motivo do desbloqueio")


class UnlockBalanceResponse(BaseModel):
    """Resposta do desbloqueio"""
    success: bool
    message: str
    old_locked: float
    new_locked: float
    amount_unlocked: float
    user_id: str
    cryptocurrency: str


# ==========================================
# HELPERS
# ==========================================

def require_admin(user: User):
    """Verifica se o usuário é admin"""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado. Requer privilégios de administrador.")
    return user


def analyze_lock_sources(db: Session, user_id: str, cryptocurrency: str) -> List[dict]:
    """Analisa possíveis fontes de bloqueio"""
    sources = []
    
    # 1. Verificar Bill Payments pendentes
    try:
        bill_payments = db.query(WolkPayBillPayment).filter(
            WolkPayBillPayment.user_id == user_id,
            WolkPayBillPayment.status.in_([
                BillPaymentStatus.PENDING,
                BillPaymentStatus.CRYPTO_DEBITED,
                BillPaymentStatus.PROCESSING,
                BillPaymentStatus.PAYING
            ])
        ).all()
        
        for bp in bill_payments:
            # Verificar se a crypto bate
            crypto_key = f"{bp.crypto_network}_{bp.crypto_currency}".lower() if bp.crypto_network else bp.crypto_currency.upper()
            if crypto_key.upper() == cryptocurrency.upper() or bp.crypto_currency.upper() == cryptocurrency.upper():
                sources.append({
                    "type": "bill_payment",
                    "id": str(bp.id),
                    "reference": bp.payment_number,
                    "status": bp.status.value,
                    "amount": float(bp.crypto_amount),
                    "created_at": bp.created_at.isoformat() if bp.created_at else None,
                    "description": f"Pagamento de boleto {bp.payment_number}"
                })
    except Exception as e:
        logger.warning(f"Erro ao analisar bill payments: {e}")
    
    # 2. Verificar P2P Trades (se tabela existir)
    try:
        from sqlalchemy import text
        result = db.execute(text("""
            SELECT id, status, amount, cryptocurrency, created_at
            FROM p2p_trades
            WHERE seller_id = :user_id 
            AND status NOT IN ('COMPLETED', 'CANCELLED', 'EXPIRED', 'RELEASED')
            AND UPPER(cryptocurrency) = UPPER(:crypto)
        """), {"user_id": user_id, "crypto": cryptocurrency})
        
        for row in result:
            sources.append({
                "type": "p2p_trade",
                "id": str(row[0]),
                "reference": f"P2P-{str(row[0])[:8]}",
                "status": row[1],
                "amount": float(row[2]) if row[2] else 0,
                "created_at": row[4].isoformat() if row[4] else None,
                "description": f"Trade P2P como vendedor"
            })
    except Exception as e:
        logger.debug(f"P2P trades não encontradas ou erro: {e}")
    
    # 3. Verificar P2P Orders ativas (ordens de venda)
    try:
        from sqlalchemy import text
        result = db.execute(text("""
            SELECT id, order_type, status, available_amount, cryptocurrency, created_at
            FROM p2p_orders
            WHERE user_id = :user_id 
            AND order_type = 'sell'
            AND status IN ('active', 'ACTIVE', 'open', 'OPEN')
            AND UPPER(cryptocurrency) = UPPER(:crypto)
        """), {"user_id": user_id, "crypto": cryptocurrency})
        
        for row in result:
            sources.append({
                "type": "p2p_order",
                "id": str(row[0]),
                "reference": f"ORDER-{str(row[0])[:8]}",
                "status": row[2],
                "amount": float(row[3]) if row[3] else 0,
                "created_at": row[5].isoformat() if row[5] else None,
                "description": f"Ordem de venda P2P ativa"
            })
    except Exception as e:
        logger.debug(f"P2P orders não encontradas ou erro: {e}")
    
    return sources


# ==========================================
# ENDPOINTS
# ==========================================

@router.get("", response_model=LockedBalancesResponse)
async def list_locked_balances(
    min_locked: float = Query(0.01, description="Valor mínimo bloqueado para filtrar"),
    cryptocurrency: Optional[str] = Query(None, description="Filtrar por crypto"),
    search: Optional[str] = Query(None, description="Buscar por username ou email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos os usuários com saldo bloqueado
    
    Retorna:
    - Lista de usuários com locked_balance > 0
    - Total bloqueado por crypto
    - Análise das possíveis fontes de bloqueio
    """
    require_admin(current_user)
    
    try:
        # Query base
        query = db.query(WalletBalance).filter(
            WalletBalance.locked_balance > min_locked
        )
        
        # Filtro por crypto
        if cryptocurrency:
            query = query.filter(
                func.upper(WalletBalance.cryptocurrency) == cryptocurrency.upper()
            )
        
        # Buscar todos os saldos bloqueados
        locked_balances = query.order_by(desc(WalletBalance.locked_balance)).all()
        
        # Processar resultados
        results = []
        total_by_crypto = {}
        
        for balance in locked_balances:
            # Buscar usuário
            user = db.query(User).filter(User.id == balance.user_id).first()
            
            if not user:
                continue
            
            # Filtro por busca
            if search:
                search_lower = search.lower()
                if search_lower not in (user.username or '').lower() and search_lower not in (user.email or '').lower():
                    continue
            
            # Analisar fontes
            sources = analyze_lock_sources(db, str(balance.user_id), balance.cryptocurrency)
            
            # Somar total por crypto
            crypto = balance.cryptocurrency.upper()
            if crypto not in total_by_crypto:
                total_by_crypto[crypto] = 0
            total_by_crypto[crypto] += float(balance.locked_balance)
            
            results.append(LockedBalanceItem(
                user_id=str(balance.user_id),
                username=user.username or "N/A",
                email=user.email or "N/A",
                cryptocurrency=balance.cryptocurrency,
                available_balance=float(balance.available_balance or 0),
                locked_balance=float(balance.locked_balance or 0),
                total_balance=float(balance.total_balance or 0),
                last_updated_reason=balance.last_updated_reason,
                updated_at=balance.updated_at.isoformat() if balance.updated_at else None,
                possible_sources=sources
            ))
        
        return LockedBalancesResponse(
            total_users_with_locked=len(results),
            total_locked_value=total_by_crypto,
            locked_balances=results
        )
        
    except Exception as e:
        logger.error(f"Erro ao listar saldos bloqueados: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
async def get_user_locked_balance(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Detalhes dos saldos bloqueados de um usuário específico
    """
    require_admin(current_user)
    
    try:
        # Buscar usuário
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        # Buscar todos os saldos com bloqueio
        balances = db.query(WalletBalance).filter(
            WalletBalance.user_id == user_id,
            WalletBalance.locked_balance > 0
        ).all()
        
        results = []
        for balance in balances:
            sources = analyze_lock_sources(db, user_id, balance.cryptocurrency)
            results.append({
                "cryptocurrency": balance.cryptocurrency,
                "available_balance": float(balance.available_balance or 0),
                "locked_balance": float(balance.locked_balance or 0),
                "total_balance": float(balance.total_balance or 0),
                "last_updated_reason": balance.last_updated_reason,
                "updated_at": balance.updated_at.isoformat() if balance.updated_at else None,
                "possible_sources": sources,
                "source_total": sum(s.get('amount', 0) for s in sources),
                "orphan_amount": float(balance.locked_balance or 0) - sum(s.get('amount', 0) for s in sources)
            })
        
        return {
            "user_id": user_id,
            "username": user.username,
            "email": user.email,
            "locked_balances": results,
            "total_locked": sum(r['locked_balance'] for r in results)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar saldos do usuário: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unlock", response_model=UnlockBalanceResponse)
async def unlock_balance(
    request: UnlockBalanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Desbloqueia saldo de um usuário manualmente
    
    ⚠️ USE COM CUIDADO! Esta ação move saldo de locked para available.
    
    Parâmetros:
    - user_id: ID do usuário
    - cryptocurrency: Crypto a desbloquear (ex: USDT)
    - amount: Valor a desbloquear (None = todo o locked)
    - reason: Motivo do desbloqueio (obrigatório)
    """
    require_admin(current_user)
    
    try:
        # Verificar usuário
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        # Buscar saldo
        balance = db.query(WalletBalance).filter(
            WalletBalance.user_id == request.user_id,
            func.upper(WalletBalance.cryptocurrency) == request.cryptocurrency.upper()
        ).first()
        
        if not balance:
            raise HTTPException(status_code=404, detail=f"Saldo de {request.cryptocurrency} não encontrado para este usuário")
        
        old_locked = float(balance.locked_balance or 0)
        
        if old_locked <= 0:
            raise HTTPException(status_code=400, detail="Este usuário não tem saldo bloqueado nesta crypto")
        
        # Calcular valor a desbloquear
        amount_to_unlock = request.amount if request.amount else old_locked
        
        if amount_to_unlock > old_locked:
            raise HTTPException(
                status_code=400, 
                detail=f"Valor a desbloquear ({amount_to_unlock}) é maior que o bloqueado ({old_locked})"
            )
        
        # Atualizar saldo
        new_locked = old_locked - amount_to_unlock
        new_available = float(balance.available_balance or 0) + amount_to_unlock
        
        balance.locked_balance = Decimal(str(new_locked))
        balance.available_balance = Decimal(str(new_available))
        balance.last_updated_reason = f"Admin unlock by {current_user.username}: {request.reason}"
        balance.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"✅ Admin {current_user.username} desbloqueou {amount_to_unlock} {request.cryptocurrency} do usuário {user.username}")
        
        return UnlockBalanceResponse(
            success=True,
            message=f"Desbloqueado {amount_to_unlock} {request.cryptocurrency} com sucesso",
            old_locked=old_locked,
            new_locked=new_locked,
            amount_unlocked=amount_to_unlock,
            user_id=request.user_id,
            cryptocurrency=request.cryptocurrency
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao desbloquear saldo: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unlock-all-orphans")
async def unlock_all_orphan_balances(
    dry_run: bool = Query(True, description="Se True, apenas simula sem alterar"),
    min_orphan: float = Query(0.01, description="Valor mínimo de órfão para desbloquear"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Desbloqueia todos os saldos órfãos automaticamente
    
    Um saldo órfão é aquele que está bloqueado mas não tem fonte identificada
    (nenhum P2P trade, ordem ou bill payment pendente).
    
    ⚠️ USE dry_run=True primeiro para ver o que será afetado!
    """
    require_admin(current_user)
    
    try:
        # Buscar todos os saldos bloqueados
        locked_balances = db.query(WalletBalance).filter(
            WalletBalance.locked_balance > min_orphan
        ).all()
        
        results = []
        total_unlocked = {}
        
        for balance in locked_balances:
            user = db.query(User).filter(User.id == balance.user_id).first()
            if not user:
                continue
            
            # Analisar fontes
            sources = analyze_lock_sources(db, str(balance.user_id), balance.cryptocurrency)
            source_total = sum(s.get('amount', 0) for s in sources)
            orphan_amount = float(balance.locked_balance or 0) - source_total
            
            # Se tem saldo órfão
            if orphan_amount >= min_orphan:
                crypto = balance.cryptocurrency.upper()
                
                if not dry_run:
                    # Desbloquear apenas o valor órfão
                    new_locked = source_total
                    new_available = float(balance.available_balance or 0) + orphan_amount
                    
                    balance.locked_balance = Decimal(str(new_locked))
                    balance.available_balance = Decimal(str(new_available))
                    balance.last_updated_reason = f"Auto-unlock orphan by {current_user.username}"
                    balance.updated_at = datetime.now(timezone.utc)
                
                # Contabilizar
                if crypto not in total_unlocked:
                    total_unlocked[crypto] = 0
                total_unlocked[crypto] += orphan_amount
                
                results.append({
                    "user_id": str(balance.user_id),
                    "username": user.username,
                    "cryptocurrency": crypto,
                    "orphan_amount": orphan_amount,
                    "action": "unlocked" if not dry_run else "would_unlock"
                })
        
        if not dry_run and results:
            db.commit()
            logger.info(f"✅ Admin {current_user.username} desbloqueou {len(results)} saldos órfãos")
        
        return {
            "success": True,
            "dry_run": dry_run,
            "affected_users": len(results),
            "total_unlocked": total_unlocked,
            "details": results,
            "message": f"{'[DRY RUN] ' if dry_run else ''}{len(results)} saldos órfãos {'seriam' if dry_run else 'foram'} desbloqueados"
        }
        
    except Exception as e:
        logger.error(f"Erro ao desbloquear saldos órfãos: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
