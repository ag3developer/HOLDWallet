"""
🤝 HOLD Wallet - P2P Trading API Endpoints
==========================================

API endpoints for P2P trading system including order management,
payment methods, trades, and marketplace statistics.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

from app.db.database import get_db

# Router without prefix - will be added in main.py
router = APIRouter(tags=["p2p"])


# ==================== PAYMENT METHODS ====================

@router.get("/payment-methods")
async def get_payment_methods(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    db: Session = Depends(get_db)
):
    """Get user's payment methods or supported payment types"""
    try:
        if user_id:
            # Get user's saved payment methods from database
            result = db.execute(
                text("""
                    SELECT id, user_id, type, details, is_active, created_at
                    FROM payment_methods
                    WHERE user_id = :user_id AND is_active = 1
                    ORDER BY created_at DESC
                """),
                {"user_id": user_id}
            )
            methods = result.fetchall()
            
            return {
                "success": True,
                "data": [
                    {
                        "id": method.id,
                        "type": method.type,
                        "details": json.loads(method.details) if method.details else {},
                        "is_active": bool(method.is_active),
                        "created_at": method.created_at
                    }
                    for method in methods
                ]
            }
        else:
            # Return supported payment method types
            return {
                "success": True,
                "data": [
                    {
                        "type": "pix",
                        "name": "PIX",
                        "description": "Transferência instantânea",
                        "avg_time": "0-5 minutos"
                    },
                    {
                        "type": "bank_transfer",
                        "name": "Transferência Bancária",
                        "description": "TED/DOC",
                        "avg_time": "30-60 minutos"
                    },
                    {
                        "type": "mercado_pago",
                        "name": "Mercado Pago",
                        "description": "Carteira digital",
                        "avg_time": "0-10 minutos"
                    },
                    {
                        "type": "paypal",
                        "name": "PayPal",
                        "description": "Pagamento online internacional",
                        "avg_time": "0-15 minutos"
                    }
                ]
            }
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payment methods: {str(e)}"
        )


@router.post("/payment-methods")
async def create_payment_method(
    user_id: int,
    type: str,
    details: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Create a new payment method"""
    try:
        # Validate payment method type
        valid_types = ["pix", "bank_transfer", "mercado_pago", "paypal"]
        if type not in valid_types:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid payment method type. Must be one of: {', '.join(valid_types)}"
            )
        
        # Insert payment method
        result = db.execute(
            text("""
                INSERT INTO payment_methods (user_id, type, details, is_active, created_at, updated_at)
                VALUES (:user_id, :type, :details, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """),
            {
                "user_id": user_id,
                "type": type,
                "details": json.dumps(details)
            }
        )
        db.commit()
        
        # Get the created record
        method_id = result.lastrowid
        created = db.execute(
            text("SELECT * FROM payment_methods WHERE id = :id"),
            {"id": method_id}
        ).fetchone()
        
        return {
            "success": True,
            "data": {
                "id": created.id,
                "type": created.type,
                "details": json.loads(created.details),
                "is_active": bool(created.is_active),
                "created_at": created.created_at
            },
            "message": "Payment method created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment method: {str(e)}"
        )


@router.put("/payment-methods/{method_id}")
async def update_payment_method(
    method_id: int,
    user_id: int,
    details: Optional[Dict[str, Any]] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Update a payment method"""
    try:
        # Check if exists
        existing = db.execute(
            text("SELECT id FROM payment_methods WHERE id = :id AND user_id = :user_id"),
            {"id": method_id, "user_id": user_id}
        ).fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Payment method not found"
            )
        
        # Build update query
        updates = []
        params = {"id": method_id, "user_id": user_id}
        
        if details is not None:
            updates.append("details = :details")
            params["details"] = json.dumps(details)
        if is_active is not None:
            updates.append("is_active = :is_active")
            params["is_active"] = 1 if is_active else 0
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            query = f"UPDATE payment_methods SET {', '.join(updates)} WHERE id = :id AND user_id = :user_id"
            db.execute(text(query), params)
            db.commit()
        
        # Get updated record
        updated = db.execute(
            text("SELECT * FROM payment_methods WHERE id = :id"),
            {"id": method_id}
        ).fetchone()
        
        return {
            "success": True,
            "data": {
                "id": updated.id,
                "type": updated.type,
                "details": json.loads(updated.details),
                "is_active": bool(updated.is_active),
                "updated_at": updated.updated_at
            },
            "message": "Payment method updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update payment method: {str(e)}"
        )


@router.delete("/payment-methods/{method_id}")
async def delete_payment_method(
    method_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Delete a payment method"""
    try:
        # Check if exists
        existing = db.execute(
            text("SELECT id FROM payment_methods WHERE id = :id AND user_id = :user_id"),
            {"id": method_id, "user_id": user_id}
        ).fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Payment method not found"
            )
        
        db.execute(
            text("DELETE FROM payment_methods WHERE id = :id AND user_id = :user_id"),
            {"id": method_id, "user_id": user_id}
        )
        db.commit()
        
        return {
            "success": True,
            "message": "Payment method deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete payment method: {str(e)}"
        )


# ==================== ORDERS ====================

@router.get("/orders")
async def get_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, description="Filter by order type: buy or sell"),
    coin: Optional[str] = Query(None, description="Filter by cryptocurrency"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    online: Optional[bool] = Query(None, description="Filter by online users"),
    db: Session = Depends(get_db)
):
    """Get P2P orders with filters and pagination"""
    try:
        # Build query
        query = db.query(P2POrder)
        
        # Apply filters
        if type:
            if type not in ["buy", "sell"]:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail="Invalid order type. Must be 'buy' or 'sell'"
                )
            query = query.filter(P2POrder.order_type == type)
        
        if coin:
            query = query.filter(P2POrder.cryptocurrency == coin.upper())
        
        if payment_method:
            # Search in JSON payment_methods field
            query = query.filter(P2POrder.payment_methods.like(f'%"{payment_method}"%'))
        
        if user_id:
            query = query.filter(P2POrder.user_id == user_id)
        
        if status:
            query = query.filter(P2POrder.status == status)
        else:
            # Default to active orders only
            query = query.filter(P2POrder.status == 'active')
        
        # Get total count
        total = query.count()
        
        # Apply pagination and sorting
        orders = query.order_by(desc(P2POrder.created_at)).offset((page - 1) * limit).limit(limit).all()
        
        # Format response
        return {
            "success": True,
            "data": [
                {
                    "id": order.id,
                    "user_id": order.user_id,
                    "order_type": order.order_type,
                    "cryptocurrency": order.cryptocurrency,
                    "fiat_currency": order.fiat_currency,
                    "price": float(order.price),
                    "total_amount": float(order.total_amount),
                    "available_amount": float(order.available_amount),
                    "min_order_limit": float(order.min_order_limit),
                    "max_order_limit": float(order.max_order_limit),
                    "time_limit": order.time_limit,
                    "payment_methods": json.loads(order.payment_methods) if order.payment_methods else [],
                    "terms": order.terms,
                    "status": order.status,
                    "completed_trades": order.completed_trades,
                    "total_volume": float(order.total_volume) if order.total_volume else 0,
                    "created_at": order.created_at.isoformat() if order.created_at else None
                }
                for order in orders
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get orders: {str(e)}"
        )


@router.get("/orders/{order_id}")
async def get_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    """Get a single order by ID"""
    try:
        order = db.query(P2POrder).filter(P2POrder.id == order_id).first()
        
        if not order:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        return {
            "success": True,
            "data": {
                "id": order.id,
                "user_id": order.user_id,
                "order_type": order.order_type,
                "cryptocurrency": order.cryptocurrency,
                "fiat_currency": order.fiat_currency,
                "price": float(order.price),
                "total_amount": float(order.total_amount),
                "available_amount": float(order.available_amount),
                "min_order_limit": float(order.min_order_limit),
                "max_order_limit": float(order.max_order_limit),
                "time_limit": order.time_limit,
                "payment_methods": json.loads(order.payment_methods) if order.payment_methods else [],
                "terms": order.terms,
                "auto_reply": order.auto_reply,
                "status": order.status,
                "completed_trades": order.completed_trades,
                "total_volume": float(order.total_volume) if order.total_volume else 0,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "updated_at": order.updated_at.isoformat() if order.updated_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get order: {str(e)}"
        )


@router.post("/orders")
async def create_order(
    user_id: int,
    order_type: str,
    cryptocurrency: str,
    price: float,
    total_amount: float,
    min_order_limit: float,
    max_order_limit: float,
    payment_methods: List[str],
    fiat_currency: str = "BRL",
    time_limit: int = 30,
    terms: Optional[str] = None,
    auto_reply: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Create a new P2P order"""
    try:
        # Validate order type
        if order_type not in ["buy", "sell"]:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid order type. Must be 'buy' or 'sell'"
            )
        
        # Validate amounts
        if min_order_limit > max_order_limit:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Minimum order limit cannot be greater than maximum"
            )
        
        # Create order
        order = P2POrder(
            user_id=user_id,
            order_type=order_type,
            cryptocurrency=cryptocurrency.upper(),
            fiat_currency=fiat_currency,
            price=Decimal(str(price)),
            total_amount=Decimal(str(total_amount)),
            available_amount=Decimal(str(total_amount)),
            min_order_limit=Decimal(str(min_order_limit)),
            max_order_limit=Decimal(str(max_order_limit)),
            time_limit=time_limit,
            payment_methods=json.dumps(payment_methods),
            terms=terms,
            auto_reply=auto_reply,
            status='active'
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        return {
            "success": True,
            "data": {
                "id": order.id,
                "order_type": order.order_type,
                "cryptocurrency": order.cryptocurrency,
                "price": float(order.price),
                "total_amount": float(order.total_amount),
                "status": order.status,
                "created_at": order.created_at.isoformat()
            },
            "message": "Order created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )


@router.put("/orders/{order_id}")
async def update_order(
    order_id: int,
    user_id: int,
    price: Optional[float] = None,
    available_amount: Optional[float] = None,
    min_order_limit: Optional[float] = None,
    max_order_limit: Optional[float] = None,
    payment_methods: Optional[List[str]] = None,
    terms: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update an existing order"""
    try:
        order = db.query(P2POrder).filter(
            P2POrder.id == order_id,
            P2POrder.user_id == user_id
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Update fields
        if price is not None:
            order.price = Decimal(str(price))
        if available_amount is not None:
            order.available_amount = Decimal(str(available_amount))
        if min_order_limit is not None:
            order.min_order_limit = Decimal(str(min_order_limit))
        if max_order_limit is not None:
            order.max_order_limit = Decimal(str(max_order_limit))
        if payment_methods is not None:
            order.payment_methods = json.dumps(payment_methods)
        if terms is not None:
            order.terms = terms
        if status is not None:
            if status not in ['active', 'paused', 'completed', 'cancelled']:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail="Invalid status"
                )
            order.status = status
        
        order.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(order)
        
        return {
            "success": True,
            "data": {
                "id": order.id,
                "status": order.status,
                "updated_at": order.updated_at.isoformat()
            },
            "message": "Order updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update order: {str(e)}"
        )


@router.delete("/orders/{order_id}")
async def delete_order(
    order_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Cancel/delete an order"""
    try:
        order = db.query(P2POrder).filter(
            P2POrder.id == order_id,
            P2POrder.user_id == user_id
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Mark as cancelled instead of deleting
        order.status = 'cancelled'
        order.updated_at = datetime.utcnow()
        
        db.commit()
        
        return {
            "success": True,
            "message": "Order cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}"
        )


@router.post("/orders/{order_id}/toggle")
async def toggle_order(
    order_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Toggle order status between active and paused"""
    try:
        order = db.query(P2POrder).filter(
            P2POrder.id == order_id,
            P2POrder.user_id == user_id
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Toggle status
        if order.status == 'active':
            order.status = 'paused'
        elif order.status == 'paused':
            order.status = 'active'
        else:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Can only toggle active/paused orders"
            )
        
        order.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(order)
        
        return {
            "success": True,
            "data": {
                "id": order.id,
                "status": order.status,
                "updated_at": order.updated_at.isoformat()
            },
            "message": f"Order {'paused' if order.status == 'paused' else 'activated'} successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle order: {str(e)}"
        )


# ==================== MARKET STATS ====================

@router.get("/market-stats")
async def get_market_stats(
    coin: Optional[str] = Query(None, description="Filter by cryptocurrency"),
    db: Session = Depends(get_db)
):
    """Get P2P marketplace statistics"""
    try:
        # Base queries
        orders_query = db.query(P2POrder).filter(P2POrder.status == 'active')
        trades_query = db.query(P2PTrade)
        
        if coin:
            orders_query = orders_query.filter(P2POrder.cryptocurrency == coin.upper())
            trades_query = trades_query.join(P2POrder).filter(P2POrder.cryptocurrency == coin.upper())
        
        # Get statistics
        total_active_orders = orders_query.count()
        total_buy_orders = orders_query.filter(P2POrder.order_type == 'buy').count()
        total_sell_orders = orders_query.filter(P2POrder.order_type == 'sell').count()
        
        # Get 24h trades
        last_24h = datetime.utcnow() - timedelta(hours=24)
        trades_24h = trades_query.filter(
            P2PTrade.created_at >= last_24h,
            P2PTrade.status == 'completed'
        ).all()
        
        volume_24h = sum(float(trade.total_fiat) for trade in trades_24h)
        trades_count_24h = len(trades_24h)
        
        # Get price statistics
        if coin:
            buy_orders = orders_query.filter(P2POrder.order_type == 'buy').all()
            sell_orders = orders_query.filter(P2POrder.order_type == 'sell').all()
            
            highest_buy_price = max([float(o.price) for o in buy_orders]) if buy_orders else 0
            lowest_sell_price = min([float(o.price) for o in sell_orders]) if sell_orders else 0
            avg_price = sum([float(o.price) for o in orders_query.all()]) / total_active_orders if total_active_orders > 0 else 0
        else:
            highest_buy_price = 0
            lowest_sell_price = 0
            avg_price = 0
        
        return {
            "success": True,
            "data": {
                "coin": coin if coin else "ALL",
                "total_active_orders": total_active_orders,
                "total_buy_orders": total_buy_orders,
                "total_sell_orders": total_sell_orders,
                "volume_24h": volume_24h,
                "trades_24h": trades_count_24h,
                "highest_buy_price": highest_buy_price,
                "lowest_sell_price": lowest_sell_price,
                "avg_price": avg_price,
                "spread": lowest_sell_price - highest_buy_price if lowest_sell_price > 0 and highest_buy_price > 0 else 0
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get market stats: {str(e)}"
        )
