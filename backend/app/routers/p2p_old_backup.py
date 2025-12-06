"""
🤝 HOLD Wallet - P2P Trading API Endpoints
==========================================

API endpoints for P2P trading system including order management,
matching, escrow, disputes, and marketplace.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

from app.db.database import get_db
from app.models.p2p_tables import (
    PaymentMethod, P2POrder, P2PTrade, P2PEscrow, 
    P2PDispute, P2PFeedback, P2PChatMessage, UserP2PStats
)

# Router without prefix - will be added in main.py
router = APIRouter(tags=["p2p"])

@router.get("/marketplace")
async def get_p2p_marketplace(
    asset: Optional[str] = Query(None, description="Filter by asset (BTC, ETH, etc)"),
    order_type: Optional[OrderType] = Query(None, description="Filter by order type"),
    payment_method: Optional[PaymentMethod] = Query(None, description="Filter by payment method"),
    min_amount: Optional[float] = Query(None, description="Minimum order amount in BRL"),
    max_amount: Optional[float] = Query(None, description="Maximum order amount in BRL"),
    sort_by: str = Query(default="price", regex="^(price|reputation|volume|time)$"),
    db: Session = Depends(get_db)
):
    """Get P2P marketplace with active orders"""
    try:
        marketplace = await p2p_service.get_p2p_marketplace(
            db, asset, order_type, payment_method, min_amount, max_amount, sort_by
        )
        
        return {
            "success": True,
            "marketplace": marketplace,
            "filters": {
                "asset": asset,
                "order_type": order_type,
                "payment_method": payment_method,
                "sort_by": sort_by
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/orders")
async def create_p2p_order(
    user_id: str,
    order_type: OrderType,
    asset: str,
    amount: float,
    price_brl: float,
    payment_methods: List[PaymentMethod],
    min_order_amount: Optional[float] = None,
    max_order_amount: Optional[float] = None,
    description: str = "",
    auto_accept: bool = False,
    db: Session = Depends(get_db)
):
    """Create a new P2P trading order"""
    try:
        order = await p2p_service.create_p2p_order(
            db, user_id, order_type, asset, amount, price_brl,
            payment_methods, min_order_amount, max_order_amount, 
            description, auto_accept
        )
        
        return {
            "success": True,
            "order": order,
            "message": "Ordem P2P criada com sucesso!"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/orders/{order_id}/match")
async def match_p2p_order(
    order_id: str,
    counterparty_order_id: str,
    amount: float,
    db: Session = Depends(get_db)
):
    """Match two P2P orders"""
    try:
        match = await p2p_service.match_p2p_orders(
            db, order_id, counterparty_order_id, amount
        )
        
        # Criar chat automaticamente após match
        if match["success"]:
            try:
                # Buscar IDs dos usuários das ordens (mock para demo)
                buyer_id = "buyer_user_id"  # Em produção, buscar do banco
                seller_id = "seller_user_id"  # Em produção, buscar do banco
                
                chat_result = await chat_service.create_chat_room(
                    db, match["match"]["match_id"], buyer_id, seller_id
                )
                match["chat_room"] = chat_result["chat_room"]
            except Exception as e:
                # Não falhar o match se chat falhar
                match["chat_warning"] = "Chat room creation failed"
        
        return {
            "success": True,
            "match": match,
            "message": "Ordens matched com sucesso! Chat criado automaticamente."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/matches/{match_id}/escrow")
async def initiate_escrow(
    match_id: str,
    seller_wallet_id: str,
    db: Session = Depends(get_db)
):
    """Initiate escrow for P2P transaction"""
    try:
        escrow = await p2p_service.initiate_escrow(
            db, match_id, seller_wallet_id
        )
        
        return {
            "success": True,
            "escrow": escrow,
            "message": "Escrow iniciado com sucesso!"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/matches/{match_id}/confirm-payment")
async def confirm_payment(
    match_id: str,
    buyer_id: str,
    payment_method: str,
    transaction_id: str,
    amount: float,
    notes: str = "",
    db: Session = Depends(get_db)
):
    """Confirm fiat payment for P2P transaction"""
    try:
        payment_proof = {
            "payment_method": payment_method,
            "transaction_id": transaction_id,
            "amount": amount,
            "timestamp": "2024-11-24T12:00:00Z",
            "notes": notes
        }
        
        confirmation = await p2p_service.confirm_payment(
            db, match_id, buyer_id, payment_proof
        )
        
        return {
            "success": True,
            "confirmation": confirmation,
            "message": "Pagamento confirmado! Crypto será liberado automaticamente."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/escrow/{escrow_id}/release")
async def release_escrow(
    escrow_id: str,
    buyer_wallet_id: str,
    db: Session = Depends(get_db)
):
    """Release crypto from escrow to buyer"""
    try:
        release = await p2p_service.release_escrow(
            db, escrow_id, buyer_wallet_id
        )
        
        return {
            "success": True,
            "release": release,
            "message": "Crypto liberado com sucesso!"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/disputes")
async def create_dispute(
    match_id: str,
    complainant_id: str,
    reason: str,
    description: str,
    evidence_urls: List[str] = [],
    db: Session = Depends(get_db)
):
    """Create a dispute for P2P transaction"""
    try:
        dispute = await p2p_service.create_dispute(
            db, match_id, complainant_id, reason, evidence_urls
        )
        
        return {
            "success": True,
            "dispute": dispute,
            "message": "Disputa criada. Nossa equipe irá analisar."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/users/{user_id}/reputation")
async def get_user_reputation(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed user reputation for P2P trading"""
    try:
        reputation = await p2p_service.get_user_reputation(db, user_id)
        
        return {
            "success": True,
            "reputation": reputation
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/assets")
async def get_supported_assets():
    """Get assets supported in P2P trading"""
    try:
        return {
            "success": True,
            "assets": [
                {
                    "symbol": asset,
                    "name": asset,
                    "min_amount": config["min_amount"],
                    "max_amount": config["max_amount"],
                    "escrow_time_minutes": config["escrow_time"]
                }
                for asset, config in p2p_service.SUPPORTED_ASSETS.items()
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/payment-methods")
async def get_payment_methods():
    """Get supported payment methods for P2P"""
    try:
        return {
            "success": True,
            "payment_methods": [
                {
                    "method": "pix",
                    "name": "PIX",
                    "description": "Transferência instantânea",
                    "avg_time": "0-5 minutos",
                    "fees": "Grátis"
                },
                {
                    "method": "ted",
                    "name": "TED",
                    "description": "Transferência eletrônica",
                    "avg_time": "30-60 minutos",
                    "fees": "R$ 8-15"
                },
                {
                    "method": "mercado_pago",
                    "name": "Mercado Pago",
                    "description": "Carteira digital",
                    "avg_time": "0-10 minutos", 
                    "fees": "Grátis"
                },
                {
                    "method": "bank_transfer",
                    "name": "Transferência Bancária",
                    "description": "DOC/TED tradicional",
                    "avg_time": "1-24 horas",
                    "fees": "R$ 0-15"
                }
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/analytics")
async def get_p2p_analytics(
    db: Session = Depends(get_db)
):
    """Get P2P system analytics and statistics"""
    try:
        analytics = await p2p_service.get_p2p_analytics(db)
        
        return {
            "success": True,
            "analytics": analytics
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/fees")
async def get_p2p_fees():
    """Get P2P commission structure"""
    try:
        return {
            "success": True,
            "commission_structure": {
                "standard_rate": "0.5%",
                "premium_rate": "0.3%", 
                "enterprise_rate": "0.2%",
                "maker_discount": "0.1%",
                "high_volume_rate": "0.25%"
            },
            "tier_benefits": {
                "free": "0.5% comissão",
                "basic": "0.5% comissão",
                "pro": "0.3% comissão + limites maiores",
                "enterprise": "0.2% comissão + sem limites"
            },
            "volume_discounts": {
                "above_100k": "0.25% para volume >R$ 100K/mês"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/my-orders")
async def get_user_orders(
    user_id: str,
    status: Optional[OrderStatus] = Query(None),
    limit: int = Query(default=50, le=100),
    db: Session = Depends(get_db)
):
    """Get user's P2P orders"""
    try:
        # Mock user orders
        orders = [
            {
                "order_id": "order_123",
                "order_type": "sell",
                "asset": "BTC",
                "amount": 0.5,
                "price_brl": 210000,
                "status": "active",
                "created_at": "2024-11-24T10:00:00Z",
                "matches": 2
            }
        ]
        
        return {
            "success": True,
            "orders": orders,
            "total": len(orders)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
