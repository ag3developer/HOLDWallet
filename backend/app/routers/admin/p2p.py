"""
🛡️ HOLD Wallet - Admin P2P Router
==================================

Gestão de operações P2P (ordens, trades, escrow, disputas).

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, String
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.p2p import P2POrder, P2PMatch, P2PEscrow, P2PDispute

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/p2p",
    tags=["Admin - P2P"],
    dependencies=[Depends(get_current_admin)]
)


# ===== ENDPOINTS - ORDENS =====

@router.get("/orders", response_model=dict)
async def list_p2p_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = None,
    order_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todas as ordens P2P
    """
    try:
        query = db.query(P2POrder)
        
        if status_filter and status_filter != 'all':
            query = query.filter(P2POrder.status == status_filter)
        
        if order_type and order_type != 'all':
            query = query.filter(P2POrder.order_type == order_type)
        
        if search:
            query = query.filter(P2POrder.id.cast(String).ilike(f"%{search}%"))
        
        total = query.count()
        orders = query.order_by(P2POrder.created_at.desc()).offset(skip).limit(limit).all()
        
        # Buscar usernames
        user_ids = [str(o.user_id) for o in orders]
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {str(u.id): u.username for u in users}
        
        items = []
        for order in orders:
            items.append({
                "id": str(order.id),
                "user_id": str(order.user_id),
                "username": user_map.get(str(order.user_id), "Unknown"),
                "order_type": order.order_type,
                "cryptocurrency": order.cryptocurrency,
                "fiat_currency": order.fiat_currency,
                "price": float(order.price) if order.price else 0,
                "total_amount": float(order.total_amount) if order.total_amount else 0,
                "available_amount": float(order.available_amount) if order.available_amount else 0,
                "min_order_limit": float(order.min_order_limit) if order.min_order_limit else 0,
                "max_order_limit": float(order.max_order_limit) if order.max_order_limit else 0,
                "status": order.status,
                "completed_trades": order.completed_trades or 0,
                "created_at": order.created_at.isoformat() if order.created_at else None
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
        logger.error(f"❌ Erro listando ordens P2P: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/stats", response_model=dict)
async def get_p2p_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Retorna estatísticas do P2P
    """
    try:
        total_orders = db.query(P2POrder).count()
        active_orders = db.query(P2POrder).filter(P2POrder.status == "active").count()
        completed_orders = db.query(P2POrder).filter(P2POrder.status == "completed").count()
        cancelled_orders = db.query(P2POrder).filter(P2POrder.status == "cancelled").count()
        paused_orders = db.query(P2POrder).filter(P2POrder.status == "paused").count()
        
        buy_orders = db.query(P2POrder).filter(P2POrder.order_type == "buy").count()
        sell_orders = db.query(P2POrder).filter(P2POrder.order_type == "sell").count()
        
        total_disputes = db.query(P2PDispute).count()
        open_disputes = db.query(P2PDispute).filter(P2PDispute.status == "open").count()
        resolved_disputes = db.query(P2PDispute).filter(P2PDispute.status == "resolved").count()
        
        return {
            "success": True,
            "data": {
                "total_orders": total_orders,
                "active_orders": active_orders,
                "completed_orders": completed_orders,
                "cancelled_orders": cancelled_orders,
                "paused_orders": paused_orders,
                "buy_orders": buy_orders,
                "sell_orders": sell_orders,
                "total_disputes": total_disputes,
                "open_disputes": open_disputes,
                "resolved_disputes": resolved_disputes
            }
        }
    except Exception as e:
        logger.error(f"❌ Erro obtendo stats P2P: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/orders/{order_id}/pause", response_model=dict)
async def pause_p2p_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Pausa uma ordem P2P
    """
    try:
        order = db.query(P2POrder).filter(P2POrder.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ordem {order_id} não encontrada"
            )
        
        order.status = "paused"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"⏸️ Admin {current_admin.email} pausou ordem P2P {order_id}")
        
        return {
            "success": True,
            "message": f"Ordem {order_id} pausada",
            "order_id": str(order.id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro pausando ordem: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/orders/{order_id}/activate", response_model=dict)
async def activate_p2p_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Ativa uma ordem P2P pausada
    """
    try:
        order = db.query(P2POrder).filter(P2POrder.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ordem {order_id} não encontrada"
            )
        
        order.status = "active"
        order.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"▶️ Admin {current_admin.email} ativou ordem P2P {order_id}")
        
        return {
            "success": True,
            "message": f"Ordem {order_id} ativada",
            "order_id": str(order.id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro ativando ordem: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ===== ENDPOINTS - DISPUTAS =====

@router.get("/disputes", response_model=dict)
async def list_disputes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todas as disputas P2P
    """
    try:
        query = db.query(P2PDispute)
        
        if status_filter and status_filter != 'all':
            query = query.filter(P2PDispute.status == status_filter)
        
        if search:
            query = query.filter(P2PDispute.id.cast(String).ilike(f"%{search}%"))
        
        total = query.count()
        disputes = query.order_by(P2PDispute.created_at.desc()).offset(skip).limit(limit).all()
        
        # Buscar usernames dos reporters
        reporter_ids = [str(d.reporter_id) for d in disputes]
        users = db.query(User).filter(User.id.in_(reporter_ids)).all()
        user_map = {str(u.id): u.username for u in users}
        
        items = []
        for dispute in disputes:
            items.append({
                "id": str(dispute.id),
                "match_id": str(dispute.match_id),
                "reporter_id": str(dispute.reporter_id),
                "reporter_username": user_map.get(str(dispute.reporter_id), "Unknown"),
                "reason": dispute.reason,
                "description": dispute.description,
                "status": dispute.status,
                "created_at": dispute.created_at.isoformat() if dispute.created_at else None,
                "resolved_at": dispute.resolved_at.isoformat() if dispute.resolved_at else None
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
        logger.error(f"❌ Erro listando disputas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/disputes/open", response_model=dict)
async def list_open_disputes(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista disputas abertas (que precisam de atenção)
    """
    try:
        disputes = db.query(P2PDispute).filter(
            P2PDispute.status == "open"
        ).order_by(P2PDispute.created_at.asc()).all()
        
        items = []
        for dispute in disputes:
            items.append({
                "id": str(dispute.id),
                "match_id": str(dispute.match_id),
                "reporter_id": str(dispute.reporter_id),
                "reason": dispute.reason,
                "description": dispute.description,
                "created_at": dispute.created_at.isoformat() if dispute.created_at else None
            })
        
        return {
            "success": True,
            "total": len(items),
            "items": items
        }
        
    except Exception as e:
        logger.error(f"❌ Erro listando disputas abertas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


class ResolveDisputeRequest(BaseModel):
    resolution: str  # "buyer_favor", "seller_favor", "split"
    notes: Optional[str] = None


@router.post("/disputes/{dispute_id}/resolve", response_model=dict)
async def resolve_dispute(
    dispute_id: str,
    request: ResolveDisputeRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Resolve uma disputa P2P
    """
    try:
        dispute = db.query(P2PDispute).filter(P2PDispute.id == dispute_id).first()
        
        if not dispute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Disputa {dispute_id} não encontrada"
            )
        
        if dispute.status != "open":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Disputa já foi resolvida"
            )
        
        dispute.status = "resolved"
        dispute.resolution = f"{request.resolution}: {request.notes or 'Sem observações'}"
        dispute.resolved_by = current_admin.id
        dispute.resolved_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"✅ Admin {current_admin.email} resolveu disputa {dispute_id}: {request.resolution}")
        
        return {
            "success": True,
            "message": f"Disputa resolvida: {request.resolution}",
            "dispute_id": str(dispute.id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro resolvendo disputa: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ===== ENDPOINTS - ESCROW =====

@router.get("/escrows", response_model=dict)
async def list_escrows(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Lista todos os escrows P2P
    """
    try:
        query = db.query(P2PEscrow)
        
        if status_filter:
            query = query.filter(P2PEscrow.status == status_filter)
        
        total = query.count()
        escrows = query.order_by(P2PEscrow.created_at.desc()).offset(skip).limit(limit).all()
        
        items = []
        for escrow in escrows:
            items.append({
                "id": str(escrow.id),
                "match_id": str(escrow.match_id),
                "amount_crypto": escrow.amount_crypto,
                "status": escrow.status,
                "created_at": escrow.created_at.isoformat() if escrow.created_at else None,
                "released_at": escrow.released_at.isoformat() if escrow.released_at else None
            })
        
        return {
            "success": True,
            "total": total,
            "items": items
        }
        
    except Exception as e:
        logger.error(f"❌ Erro listando escrows: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/escrows/{escrow_id}/release", response_model=dict)
async def release_escrow(
    escrow_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Libera escrow para o comprador (força conclusão)
    """
    try:
        escrow = db.query(P2PEscrow).filter(P2PEscrow.id == escrow_id).first()
        
        if not escrow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Escrow {escrow_id} não encontrado"
            )
        
        if escrow.status == "released":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Escrow já foi liberado"
            )
        
        escrow.status = "released"
        escrow.released_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"💰 Admin {current_admin.email} liberou escrow {escrow_id}")
        
        return {
            "success": True,
            "message": "Escrow liberado para o comprador",
            "escrow_id": str(escrow.id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro liberando escrow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/escrows/{escrow_id}/return", response_model=dict)
async def return_escrow(
    escrow_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """
    Devolve escrow para o vendedor (cancelamento)
    """
    try:
        escrow = db.query(P2PEscrow).filter(P2PEscrow.id == escrow_id).first()
        
        if not escrow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Escrow {escrow_id} não encontrado"
            )
        
        if escrow.status == "released":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Escrow já foi liberado, não pode ser devolvido"
            )
        
        escrow.status = "returned"
        escrow.released_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"↩️ Admin {current_admin.email} devolveu escrow {escrow_id}")
        
        return {
            "success": True,
            "message": "Escrow devolvido para o vendedor",
            "escrow_id": str(escrow.id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erro devolvendo escrow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
