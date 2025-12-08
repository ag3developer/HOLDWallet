"""
🤝 HOLD Wallet - P2P Trading API Endpoints
==========================================

API endpoints for P2P trading system using direct SQL queries.

Notes:
- Uses SQLAlchemy text() with parameterized queries for database compatibility
- Compatible with both SQLite (current) and PostgreSQL (future migration)
- All queries use named parameters (:param_name) for security and portability
"""

from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

from app.db.database import get_db

router = APIRouter(tags=["p2p"])


@router.get("/payment-methods")
async def get_payment_methods(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get payment methods
    
    If user_id is not provided, returns all payment methods for user_id=1 (default test user)
    This will be replaced with authentication token user_id in production
    """
    # TODO: Get user_id from authentication token instead of query param
    # For now, default to user 1 if not provided
    if user_id is None:
        user_id = 1
    
    result = db.execute(
        text("SELECT * FROM payment_methods WHERE user_id = :user_id AND is_active = 1 ORDER BY created_at DESC"),
        {"user_id": user_id}
    )
    methods = result.fetchall()
    
    response_data = {
        "success": True,
        "data": [
            {
                "id": m.id,
                "type": m.type,
                "details": parse_json_details(m.details),
                "is_active": bool(m.is_active),
                "created_at": str(m.created_at)
            }
            for m in methods
        ]
    }
    
    print(f"[DEBUG] Returning payment methods: {response_data}")
    
    return response_data


def parse_json_details(details):
    """Parse JSON details handling double-encoded JSON strings"""
    if not details:
        return {}
    
    try:
        # First parse
        parsed = json.loads(details) if isinstance(details, str) else details
        
        # Check if result is a string (double encoded)
        if isinstance(parsed, str):
            parsed = json.loads(parsed)
        
        return parsed if isinstance(parsed, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


@router.post("/payment-methods")
async def create_payment_method(
    payment_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Create a new payment method
    
    Expected body:
    {
        "name": "My PIX",  # Optional
        "type": "pix",
        "details": { "key": "123.456.789-00", "key_type": "cpf" }
    }
    """
    try:
        # Log the received data for debugging
        print(f"[DEBUG] Received payment_data: {payment_data}")
        
        # Extract fields from body
        payment_type = payment_data.get("type")
        details = payment_data.get("details", {})
        name = payment_data.get("name", "")
        
        # TODO: Get user_id from authentication token
        # For now, using a default user_id (will be replaced with auth)
        user_id = payment_data.get("user_id", 1)  # Default to user 1 for testing
        
        if not payment_type:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Payment method type is required"
            )
        
        # Normalize type to lowercase
        payment_type = str(payment_type).lower().strip()
        
        # Validate payment method type with more flexible matching
        valid_types = ["pix", "bank_transfer", "mercado_pago", "paypal"]
        
        # Map common variations to standard types
        type_mapping = {
            "pix": "pix",
            "bank": "bank_transfer",
            "bank_transfer": "bank_transfer",
            "banktransfer": "bank_transfer",
            "mercadopago": "mercado_pago",
            "mercado_pago": "mercado_pago",
            "paypal": "paypal"
        }
        
        # Try to map the type
        mapped_type = type_mapping.get(payment_type)
        
        if not mapped_type:
            print(f"[DEBUG] Invalid type received: '{payment_type}'")
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid payment method type '{payment_type}'. Must be one of: {', '.join(valid_types)}"
            )
        
        payment_type = mapped_type
        
        # Add name to details if provided
        if name:
            details["name"] = name
        
        # Insert payment method
        query = text("""
            INSERT INTO payment_methods (user_id, type, details, is_active, created_at, updated_at)
            VALUES (:user_id, :type, :details, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """)
        
        result = db.execute(
            query,
            {
                "user_id": user_id,
                "type": payment_type,
                "details": json.dumps(details)
            }
        )
        db.commit()
        
        # Get the created record ID
        # For SQLite: use result.lastrowid
        # For PostgreSQL: can use RETURNING clause
        method_id = result.lastrowid if hasattr(result, 'lastrowid') else None
        
        if method_id:
            created = db.execute(
                text("SELECT * FROM payment_methods WHERE id = :id"),
                {"id": method_id}
            ).fetchone()
            
            if created:
                return {
                    "success": True,
                    "data": {
                        "id": created.id,
                        "type": created.type,
                        "details": json.loads(created.details),
                        "is_active": bool(created.is_active),
                        "created_at": str(created.created_at)
                    },
                    "message": "Payment method created successfully"
                }
        
        # Fallback response if we can't fetch the created record
        return {
            "success": True,
            "message": "Payment method created successfully"
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[DEBUG] Exception: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment method: {str(e)}"
        )


@router.put("/payment-methods/{method_id}")
async def update_payment_method(
    method_id: int,
    payment_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """Update a payment method
    
    Expected body:
    {
        "name": "Updated name",  # Optional
        "type": "pix",  # Optional
        "details": {...},  # Optional
        "is_active": true  # Optional
    }
    """
    try:
        # TODO: Get user_id from authentication token
        user_id = payment_data.get("user_id", 1)  # Default to user 1 for testing
        
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
        
        # Build update query dynamically
        updates = []
        params = {"id": method_id, "user_id": user_id}
        
        if "details" in payment_data:
            updates.append("details = :details")
            details = payment_data["details"]
            # Add name to details if provided
            if "name" in payment_data:
                details["name"] = payment_data["name"]
            params["details"] = json.dumps(details)
        elif "name" in payment_data:
            # Update only the name in existing details
            existing_details = db.execute(
                text("SELECT details FROM payment_methods WHERE id = :id"),
                {"id": method_id}
            ).fetchone()
            if existing_details:
                details = json.loads(existing_details.details or "{}")
                details["name"] = payment_data["name"]
                updates.append("details = :details")
                params["details"] = json.dumps(details)
        
        if "is_active" in payment_data:
            updates.append("is_active = :is_active")
            params["is_active"] = 1 if payment_data["is_active"] else 0
        
        if "type" in payment_data:
            updates.append("type = :type")
            params["type"] = payment_data["type"]
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            query_str = f"UPDATE payment_methods SET {', '.join(updates)} WHERE id = :id AND user_id = :user_id"
            db.execute(text(query_str), params)
            db.commit()
        
        # Get updated record
        updated = db.execute(
            text("SELECT * FROM payment_methods WHERE id = :id"),
            {"id": method_id}
        ).fetchone()
        
        if updated:
            return {
                "success": True,
                "data": {
                    "id": updated.id,
                    "type": updated.type,
                    "details": json.loads(updated.details),
                    "is_active": bool(updated.is_active),
                    "updated_at": str(updated.updated_at)
                },
                "message": "Payment method updated successfully"
            }
        else:
            return {
                "success": True,
                "message": "Payment method updated successfully"
            }
    except HTTPException:
        db.rollback()
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
    user_id: int = Query(1, description="User ID (default: 1 for testing)"),
    db: Session = Depends(get_db)
):
    """Delete a payment method"""
    print(f"[DEBUG] DELETE payment method - method_id: {method_id}, user_id: {user_id}")
    try:
        # Check if exists
        existing = db.execute(
            text("SELECT id FROM payment_methods WHERE id = :id AND user_id = :user_id"),
            {"id": method_id, "user_id": user_id}
        ).fetchone()
        
        print(f"[DEBUG] Payment method exists: {existing is not None}")
        
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
        
        print(f"[DEBUG] Payment method {method_id} deleted successfully")
        
        return {
            "success": True,
            "message": "Payment method deleted successfully"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete payment method: {str(e)}"
        )


@router.post("/orders")
async def create_order(
    order_data: Dict[str, Any],
    user_id: int = Query(1, description="User ID (default: 1 for testing)"),
    db: Session = Depends(get_db)
):
    """Create a new P2P order"""
    print(f"[DEBUG] POST /orders - user_id: {user_id}, data: {order_data}")
    
    try:
        # Extract data from request
        order_type = order_data.get("type", "").lower()  # 'buy' or 'sell'
        coin = order_data.get("coin", "").upper()
        fiat_currency = order_data.get("fiat_currency", "BRL").upper()
        price = float(order_data.get("price", 0))
        amount = float(order_data.get("amount", 0))
        min_amount = float(order_data.get("min_amount", 0))
        max_amount = float(order_data.get("max_amount", 0))
        payment_methods = order_data.get("payment_methods", [])  # List of payment method IDs
        time_limit = int(order_data.get("time_limit", 30))
        terms = order_data.get("terms")
        auto_reply = order_data.get("auto_reply")
        
        # Validation
        if order_type not in ['buy', 'sell']:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Order type must be 'buy' or 'sell'"
            )
        
        if not coin or not fiat_currency:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Cryptocurrency and fiat currency are required"
            )
        
        if price <= 0 or amount <= 0 or min_amount <= 0 or max_amount <= 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Price and amounts must be greater than 0"
            )
        
        if min_amount > max_amount:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Minimum amount cannot be greater than maximum amount"
            )
        
        if not payment_methods or len(payment_methods) == 0:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="At least one payment method is required"
            )
        
        # Convert payment methods list to JSON string
        payment_methods_json = json.dumps(payment_methods)
        
        # Insert order
        query = text("""
            INSERT INTO p2p_orders (
                user_id, order_type, cryptocurrency, fiat_currency,
                price, total_amount, available_amount, min_order_limit, max_order_limit,
                payment_methods, time_limit, terms, auto_reply,
                status, created_at, updated_at
            ) VALUES (
                :user_id, :order_type, :cryptocurrency, :fiat_currency,
                :price, :total_amount, :available_amount, :min_order_limit, :max_order_limit,
                :payment_methods, :time_limit, :terms, :auto_reply,
                'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """)
        
        result = db.execute(query, {
            "user_id": user_id,
            "order_type": order_type,
            "cryptocurrency": coin,
            "fiat_currency": fiat_currency,
            "price": price,
            "total_amount": amount,
            "available_amount": amount,  # Initially same as total_amount
            "min_order_limit": min_amount,
            "max_order_limit": max_amount,
            "payment_methods": payment_methods_json,
            "time_limit": time_limit,
            "terms": terms,
            "auto_reply": auto_reply
        })
        db.commit()
        
        # Get the last inserted order ID
        order_id_result = db.execute(text("SELECT last_insert_rowid() as id")).fetchone()
        order_id = order_id_result.id if order_id_result else None
        
        print(f"[DEBUG] Order created successfully - ID: {order_id}")
        
        return {
            "success": True,
            "data": {
                "id": order_id,
                "user_id": user_id,
                "order_type": order_type,
                "cryptocurrency": coin,
                "fiat_currency": fiat_currency,
                "price": price,
                "amount": amount,
                "min_amount": min_amount,
                "max_amount": max_amount,
                "payment_methods": payment_methods,
                "time_limit_minutes": time_limit,
                "terms": terms,
                "auto_reply": auto_reply,
                "status": "active"
            },
            "message": "Order created successfully"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to create order: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )


@router.get("/orders")
async def get_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    coin: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get P2P orders"""
    conditions = ["status = 'active'"]
    params = {}
    
    if type:
        conditions.append("order_type = :order_type")
        params["order_type"] = type
    if coin:
        conditions.append("cryptocurrency = :cryptocurrency")
        params["cryptocurrency"] = coin.upper()
    
    where_clause = " AND ".join(conditions)
    offset = (page - 1) * limit
    
    # Get total count
    count_query = f"SELECT COUNT(*) as total FROM p2p_orders WHERE {where_clause}"
    total = db.execute(text(count_query), params).fetchone().total
    
    # Get orders
    query = f"""
        SELECT * FROM p2p_orders 
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """
    params["limit"] = limit
    params["offset"] = offset
    
    result = db.execute(text(query), params)
    orders = result.fetchall()
    
    # Enrich orders with user data and payment methods
    enriched_orders = []
    for o in orders:
        # Mock user data
        user_data = {
            "id": str(o.user_id),
            "username": f"user_{o.user_id}",
            "verified": True,
            "total_trades": o.completed_trades,
            "success_rate": 98.5,
            "avg_rating": 4.8,
            "badges": ["verified", "pro_trader"],
            "is_online": True
        }
        
        # Get payment methods (just count for listing)
        pm_ids = json.loads(o.payment_methods) if o.payment_methods else []
        
        enriched_orders.append({
            "id": str(o.id),
            "userId": str(o.user_id),
            "type": o.order_type,
            "coin": o.cryptocurrency,
            "cryptocurrency": o.cryptocurrency,
            "fiat_currency": o.fiat_currency,  # snake_case
            "fiatCurrency": o.fiat_currency,  # camelCase
            "price": str(o.price),
            "amount": str(o.total_amount),
            "minAmount": str(o.min_order_limit),
            "maxAmount": str(o.max_order_limit),
            "paymentMethods": pm_ids,  # Just IDs for listing (full objects in details)
            "status": o.status,
            "user": user_data,
            "completedTrades": o.completed_trades,
            "successRate": user_data["success_rate"],
            "avgRating": user_data["avg_rating"],
            "badges": user_data["badges"],
            "isOnline": user_data["is_online"],
            "createdAt": str(o.created_at)
        })
    
    return {
        "success": True,
        "data": enriched_orders,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


@router.get("/my-orders")
async def get_my_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: active, paused, completed, cancelled"),
    user_id: int = Query(1, description="User ID (default: 1 for testing)"),
    db: Session = Depends(get_db)
):
    """Get user's own P2P orders"""
    print(f"[DEBUG] GET /my-orders - user_id: {user_id}, page: {page}, status: {status}")
    
    try:
        conditions = ["user_id = :user_id"]
        params = {"user_id": user_id}
        
        if status:
            conditions.append("status = :status")
            params["status"] = status.lower()
        
        where_clause = " AND ".join(conditions)
        offset = (page - 1) * limit
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM p2p_orders WHERE {where_clause}"
        count_result = db.execute(text(count_query), params).fetchone()
        total = count_result[0] if count_result else 0
        
        # Get orders
        query = f"""
            SELECT * FROM p2p_orders 
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """
        params["limit"] = limit
        params["offset"] = offset
        
        result = db.execute(text(query), params)
        orders = result.fetchall()
        
        print(f"[DEBUG] Found {len(orders)} orders for user {user_id}")
        
        return {
            "success": True,
            "data": [
                {
                    "id": o.id,
                    "user_id": o.user_id,
                    "order_type": o.order_type,
                    "cryptocurrency": o.cryptocurrency,
                    "fiat_currency": o.fiat_currency,
                    "price": float(o.price),
                    "total_amount": float(o.total_amount),
                    "available_amount": float(o.available_amount),
                    "min_order_limit": float(o.min_order_limit),
                    "max_order_limit": float(o.max_order_limit),
                    "payment_methods": json.loads(o.payment_methods) if o.payment_methods else [],
                    "time_limit": o.time_limit,
                    "terms": o.terms,
                    "auto_reply": o.auto_reply,
                    "status": o.status,
                    "completed_trades": o.completed_trades,
                    "total_volume": float(o.total_volume) if o.total_volume else 0,
                    "created_at": str(o.created_at),
                    "updated_at": str(o.updated_at)
                }
                for o in orders
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if total > 0 else 0
            }
        }
    except Exception as e:
        print(f"[ERROR] Failed to get my orders: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get orders: {str(e)}"
        )


@router.get("/orders/{order_id}")
async def get_order_details(
    order_id: int,
    db: Session = Depends(get_db)
):
    """Get details of a specific order"""
    print(f"[DEBUG] GET /orders/{order_id}")
    
    try:
        query = text("SELECT * FROM p2p_orders WHERE id = :id")
        result = db.execute(query, {"id": order_id}).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Get payment methods details
        payment_method_ids = json.loads(result.payment_methods) if result.payment_methods else []
        payment_methods_data = []
        
        if payment_method_ids:
            ids_str = ','.join(str(id) for id in payment_method_ids)
            pm_query = text(f"SELECT * FROM payment_methods WHERE id IN ({ids_str})")
            pm_results = db.execute(pm_query).fetchall()
            
            for pm in pm_results:
                # Parse details (handle both string and already-parsed objects)
                details = pm.details
                if isinstance(details, str):
                    try:
                        details = json.loads(details)
                        # Handle double-encoded JSON
                        if isinstance(details, str):
                            details = json.loads(details)
                    except:
                        details = {}
                
                payment_methods_data.append({
                    "id": str(pm.id),
                    "name": pm.type.upper(),  # PIX, BANK, etc
                    "type": pm.type.lower(),
                    "details": details,
                    "isActive": bool(pm.is_active)
                })
        
        # Mock user data (later integrate with real users table)
        user_data = {
            "id": str(result.user_id),
            "username": f"user_{result.user_id}",
            "email": f"user{result.user_id}@holdwallet.com",
            "verified": True,
            "joined_date": "2024-01-15",
            "total_trades": result.completed_trades,
            "success_rate": 98.5,
            "avg_rating": 4.8,
            "badges": ["verified", "pro_trader"],
            "is_online": True,
            "last_seen": str(result.updated_at)
        }
        
        return {
            "success": True,
            "data": {
                "id": str(result.id),
                "userId": str(result.user_id),
                "type": result.order_type,
                "cryptocurrency": result.cryptocurrency,
                "coin": result.cryptocurrency,  # Alias for frontend
                "fiat_currency": result.fiat_currency,  # snake_case
                "fiatCurrency": result.fiat_currency,  # camelCase for frontend
                "price": str(result.price),
                "amount": str(result.total_amount),
                "total": str(float(result.price) * float(result.total_amount)),
                "minAmount": str(result.min_order_limit),
                "maxAmount": str(result.max_order_limit),
                "paymentMethods": payment_methods_data,  # Full payment method objects
                "timeLimit": result.time_limit,
                "terms": result.terms,
                "autoReply": result.auto_reply,
                "status": result.status,
                "completedTrades": result.completed_trades,
                "successRate": user_data["success_rate"],
                "avgRating": user_data["avg_rating"],
                "badges": user_data["badges"],
                "isOnline": user_data["is_online"],
                "lastSeen": user_data["last_seen"],
                "user": user_data,
                "createdAt": str(result.created_at),
                "updatedAt": str(result.updated_at)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to get order details: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get order: {str(e)}"
        )


@router.put("/orders/{order_id}")
async def update_order(
    order_id: int,
    update_data: Dict[str, Any],
    user_id: int = Query(1, description="User ID (default: 1 for testing)"),
    db: Session = Depends(get_db)
):
    """Update order (e.g., pause/activate, change price)"""
    print(f"[DEBUG] PUT /orders/{order_id} - user_id: {user_id}, data: {update_data}")
    
    try:
        # Check if order exists and belongs to user
        check_query = text("SELECT id FROM p2p_orders WHERE id = :id AND user_id = :user_id")
        existing = db.execute(check_query, {"id": order_id, "user_id": user_id}).fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found or you don't have permission to update it"
            )
        
        # Build update query dynamically
        allowed_fields = ["status", "price", "min_order_limit", "max_order_limit", "terms", "auto_reply"]
        update_fields = []
        params = {"id": order_id, "user_id": user_id}
        
        for field in allowed_fields:
            if field in update_data:
                update_fields.append(f"{field} = :{field}")
                params[field] = update_data[field]
        
        if not update_fields:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        # Add updated_at
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        
        update_query = text(f"""
            UPDATE p2p_orders 
            SET {', '.join(update_fields)}
            WHERE id = :id AND user_id = :user_id
        """)
        
        db.execute(update_query, params)
        db.commit()
        
        print(f"[DEBUG] Order {order_id} updated successfully")
        
        return {
            "success": True,
            "message": "Order updated successfully"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to update order: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update order: {str(e)}"
        )


@router.delete("/orders/{order_id}")
async def cancel_order(
    order_id: int,
    user_id: int = Query(1, description="User ID (default: 1 for testing)"),
    db: Session = Depends(get_db)
):
    """Cancel an order (sets status to 'cancelled')"""
    print(f"[DEBUG] DELETE /orders/{order_id} - user_id: {user_id}")
    
    try:
        # Check if order exists and belongs to user
        check_query = text("SELECT id, status FROM p2p_orders WHERE id = :id AND user_id = :user_id")
        existing = db.execute(check_query, {"id": order_id, "user_id": user_id}).fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found or you don't have permission to cancel it"
            )
        
        # Update status to cancelled
        update_query = text("""
            UPDATE p2p_orders 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = :id AND user_id = :user_id
        """)
        
        db.execute(update_query, {"id": order_id, "user_id": user_id})
        db.commit()
        
        print(f"[DEBUG] Order {order_id} cancelled successfully")
        
        return {
            "success": True,
            "message": "Order cancelled successfully"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to cancel order: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}"
        )


# ============================================
# TRADES ENDPOINTS
# ============================================

@router.post("/trades")
async def start_trade(
    trade_data: Dict[str, Any],
    buyer_id: int = Query(1, description="Buyer ID (default: 1 for testing)"),
    db: Session = Depends(get_db)
):
    """Start a new P2P trade"""
    print(f"[DEBUG] POST /trades - buyer_id: {buyer_id}, data: {trade_data}")
    
    try:
        order_id = int(trade_data.get("order_id"))
        amount = float(trade_data.get("amount"))
        payment_method_id = trade_data.get("payment_method_id")
        
        # Get order details
        order_query = text("SELECT * FROM p2p_orders WHERE id = :id AND status = 'active'")
        order = db.execute(order_query, {"id": order_id}).fetchone()
        
        if not order:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found or not active"
            )
        
        # Validations
        total_price = amount * float(order.price)
        if total_price < float(order.min_order_limit) or total_price > float(order.max_order_limit):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Amount must be between {order.min_order_limit} and {order.max_order_limit}"
            )
        
        # ✅ PHASE 1: Validate buyer balance (for buy orders)
        if order.order_type == 'buy':
            # Buyer needs to have BRL balance
            buyer_balance = db.execute(
                text("SELECT available_balance FROM wallet_balances WHERE user_id = :user_id AND cryptocurrency = 'BRL'"),
                {"user_id": buyer_id}
            ).fetchone()
            
            if not buyer_balance or buyer_balance.available_balance < total_price:
                raise HTTPException(
                    status_code=http_status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"Insufficient balance. You need {total_price} BRL"
                )
        else:
            # Seller needs to have crypto balance
            seller_balance = db.execute(
                text("SELECT available_balance FROM wallet_balances WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency"),
                {"user_id": order.user_id, "cryptocurrency": order.cryptocurrency}
            ).fetchone()
            
            if not seller_balance or seller_balance.available_balance < amount:
                raise HTTPException(
                    status_code=http_status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"Seller insufficient balance. Needs {amount} {order.cryptocurrency}"
                )
        
        # Insert trade
        from datetime import datetime, timedelta
        expires_at = datetime.now() + timedelta(minutes=order.time_limit)
        
        trade_query = text("""
            INSERT INTO p2p_trades (
                order_id, buyer_id, seller_id, cryptocurrency, fiat_currency,
                amount, price, total_fiat, payment_method_id, expires_at,
                status, created_at, updated_at
            ) VALUES (
                :order_id, :buyer_id, :seller_id, :cryptocurrency, :fiat_currency,
                :amount, :price, :total_fiat, :payment_method_id, :expires_at,
                'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
        """)
        
        db.execute(trade_query, {
            "order_id": order_id,
            "buyer_id": buyer_id,
            "seller_id": order.user_id,
            "cryptocurrency": order.cryptocurrency,
            "fiat_currency": order.fiat_currency,
            "amount": amount,
            "price": float(order.price),
            "total_fiat": total_price,
            "payment_method_id": payment_method_id,
            "expires_at": expires_at.strftime("%Y-%m-%d %H:%M:%S")
        })
        db.commit()
        
        # Get trade ID
        trade_id_result = db.execute(text("SELECT last_insert_rowid() as id")).fetchone()
        trade_id = trade_id_result.id if trade_id_result else None
        
        print(f"[DEBUG] Trade created - ID: {trade_id}")
        
        # ✅ PHASE 1: Freeze balances for the trade
        try:
            if order.order_type == 'buy':
                # Freeze BRL on buyer side
                db.execute(text("""
                    UPDATE wallet_balances
                    SET locked_balance = locked_balance + :amount,
                        available_balance = available_balance - :amount,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id AND cryptocurrency = 'BRL'
                """), {"user_id": buyer_id, "amount": total_price})
            else:
                # Freeze crypto on seller side
                db.execute(text("""
                    UPDATE wallet_balances
                    SET locked_balance = locked_balance + :amount,
                        available_balance = available_balance - :amount,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
                """), {"user_id": order.user_id, "amount": amount, "cryptocurrency": order.cryptocurrency})
            
            db.commit()
            print(f"[DEBUG] Balances frozen for trade {trade_id}")
        except Exception as freeze_error:
            # If freezing fails, delete the trade and rollback
            db.execute(text("DELETE FROM p2p_trades WHERE id = :id"), {"id": trade_id})
            db.commit()
            print(f"[ERROR] Failed to freeze balance: {str(freeze_error)}")
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to freeze balance for trade: {str(freeze_error)}"
            )
        
        return {
            "success": True,
            "data": {
                "id": str(trade_id),
                "order_id": str(order_id),
                "buyer_id": str(buyer_id),
                "seller_id": str(order.user_id),
                "amount": str(amount),
                "price": str(order.price),
                "total_price": str(total_price),
                "status": "pending"
            },
            "message": "Trade started successfully"
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to start trade: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start trade: {str(e)}"
        )


@router.get("/trades/{trade_id}")
async def get_trade_details(
    trade_id: int,
    db: Session = Depends(get_db)
):
    """Get trade details"""
    print(f"[DEBUG] GET /trades/{trade_id}")
    
    try:
        query = text("SELECT * FROM p2p_trades WHERE id = :id")
        trade = db.execute(query, {"id": trade_id}).fetchone()
        
        if not trade:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Trade not found"
            )
        
        return {
            "success": True,
            "data": {
                "id": str(trade.id),
                "order_id": str(trade.order_id),
                "buyer_id": str(trade.buyer_id),
                "seller_id": str(trade.seller_id),
                "amount": str(trade.amount),
                "price": str(trade.price),
                "total_price": str(trade.total_price),
                "payment_method_id": str(trade.payment_method_id) if trade.payment_method_id else None,
                "status": trade.status,
                "created_at": str(trade.created_at),
                "updated_at": str(trade.updated_at)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to get trade: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trade: {str(e)}"
        )


@router.post("/trades/{trade_id}/complete")
async def complete_trade(
    trade_id: int,
    completion_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Complete a trade and release the escrow balance
    
    This transfers the frozen balance from seller to buyer:
    - Seller: locked_balance -= amount (the crypto they were selling)
    - Buyer: available_balance += amount (receives the crypto)
    
    Or if it's a buy order:
    - Buyer: locked_balance -= total_price (the BRL they were paying)
    - Seller: available_balance += total_price (receives the BRL)
    """
    print(f"[DEBUG] POST /trades/{trade_id}/complete")
    
    try:
        # Get trade details
        trade_query = text("SELECT * FROM p2p_trades WHERE id = :id")
        trade = db.execute(trade_query, {"id": trade_id}).fetchone()
        
        if not trade:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Trade not found"
            )
        
        if trade.status != 'pending':
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Can only complete trades with 'pending' status. Current status: {trade.status}"
            )
        
        # Get the order to determine trade type
        order_query = text("SELECT * FROM p2p_orders WHERE id = :id")
        order = db.execute(order_query, {"id": trade.order_id}).fetchone()
        
        if not order:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # RELEASE BALANCE BASED ON ORDER TYPE
        if order.order_type == 'buy':
            # BUY ORDER: Buyer paid BRL, seller receives BRL
            # Release buyer's frozen BRL → Seller gets it
            db.execute(text("""
                UPDATE wallet_balances
                SET available_balance = available_balance + :amount,
                    updated_at = CURRENT_TIMESTAMP,
                    last_updated_reason = 'Trade completed - received payment'
                WHERE user_id = :user_id AND cryptocurrency = 'BRL'
            """), {"user_id": trade.seller_id, "amount": trade.total_price})
            
            # Move locked balance to available for seller
            db.execute(text("""
                UPDATE wallet_balances
                SET locked_balance = locked_balance - :amount,
                    updated_at = CURRENT_TIMESTAMP,
                    last_updated_reason = 'Trade completed - released balance'
                WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
            """), {"user_id": trade.buyer_id, "amount": trade.total_price, "cryptocurrency": 'BRL'})
        else:
            # SELL ORDER: Seller paid crypto, buyer receives crypto
            # Seller receives BRL payment
            seller_brl_balance = db.execute(
                text("SELECT available_balance FROM wallet_balances WHERE user_id = :user_id AND cryptocurrency = 'BRL'"),
                {"user_id": trade.seller_id}
            ).fetchone()
            
            if seller_brl_balance:
                # Update existing BRL balance
                db.execute(text("""
                    UPDATE wallet_balances
                    SET available_balance = available_balance + :amount,
                        updated_at = CURRENT_TIMESTAMP,
                        last_updated_reason = 'Trade completed - received payment'
                    WHERE user_id = :user_id AND cryptocurrency = 'BRL'
                """), {"user_id": trade.seller_id, "amount": trade.total_price})
            else:
                # Create new BRL balance for seller
                db.execute(text("""
                    INSERT INTO wallet_balances (id, user_id, cryptocurrency, available_balance, locked_balance, total_balance, last_updated_reason)
                    VALUES (lower(hex(randomblob(8))), :user_id, 'BRL', :amount, 0, :amount, 'Trade completed - received payment')
                """), {"user_id": trade.seller_id, "amount": trade.total_price})
            
            # Buyer receives crypto
            buyer_crypto_balance = db.execute(
                text("SELECT available_balance FROM wallet_balances WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency"),
                {"user_id": trade.buyer_id, "cryptocurrency": trade.cryptocurrency}
            ).fetchone()
            
            if buyer_crypto_balance:
                # Update existing crypto balance
                db.execute(text("""
                    UPDATE wallet_balances
                    SET available_balance = available_balance + :amount,
                        updated_at = CURRENT_TIMESTAMP,
                        last_updated_reason = 'Trade completed - received crypto'
                    WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
                """), {"user_id": trade.buyer_id, "amount": trade.amount, "cryptocurrency": trade.cryptocurrency})
            else:
                # Create new crypto balance for buyer
                db.execute(text("""
                    INSERT INTO wallet_balances (id, user_id, cryptocurrency, available_balance, locked_balance, total_balance, last_updated_reason)
                    VALUES (lower(hex(randomblob(8))), :user_id, :cryptocurrency, :amount, 0, :amount, 'Trade completed - received crypto')
                """), {"user_id": trade.buyer_id, "amount": trade.amount, "cryptocurrency": trade.cryptocurrency})
            
            # Release seller's locked crypto
            db.execute(text("""
                UPDATE wallet_balances
                SET locked_balance = locked_balance - :amount,
                    updated_at = CURRENT_TIMESTAMP,
                    last_updated_reason = 'Trade completed - released balance'
                WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
            """), {"user_id": trade.seller_id, "amount": trade.amount, "cryptocurrency": trade.cryptocurrency})
            
            # Release buyer's locked BRL
            db.execute(text("""
                UPDATE wallet_balances
                SET locked_balance = locked_balance - :amount,
                    updated_at = CURRENT_TIMESTAMP,
                    last_updated_reason = 'Trade completed - released balance'
                WHERE user_id = :user_id AND cryptocurrency = 'BRL'
            """), {"user_id": trade.buyer_id, "amount": trade.total_price})
        
        # Update trade status to completed
        db.execute(text("""
            UPDATE p2p_trades
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """), {"id": trade_id})
        
        db.commit()
        
        print(f"[DEBUG] Trade {trade_id} completed successfully")
        
        return {
            "success": True,
            "data": {
                "trade_id": str(trade_id),
                "status": "completed",
                "message": "Balance released successfully"
            }
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to complete trade: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete trade: {str(e)}"
        )


@router.get("/market-stats")
async def get_market_stats(
    coin: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get market statistics"""
    params = {}
    where_clause = "status = 'active'"
    
    if coin:
        where_clause += " AND cryptocurrency = :cryptocurrency"
        params["cryptocurrency"] = coin.upper()
    
    # Get order counts
    count_query = f"""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN order_type = 'buy' THEN 1 ELSE 0 END) as buy_orders,
            SUM(CASE WHEN order_type = 'sell' THEN 1 ELSE 0 END) as sell_orders
        FROM p2p_orders
        WHERE {where_clause}
    """
    stats = db.execute(text(count_query), params).fetchone()
    
    return {
        "success": True,
        "data": {
            "coin": coin if coin else "ALL",
            "total_active_orders": stats.total or 0,
            "total_buy_orders": stats.buy_orders or 0,
            "total_sell_orders": stats.sell_orders or 0
        }
    }


# ============================================
# 💰 BALANCE MANAGEMENT ENDPOINTS
# ============================================

@router.post("/wallet/deposit")
async def deposit_balance(
    balance_data: Dict[str, Any],
    user_id: int = Query(1),
    db: Session = Depends(get_db)
):
    """
    Deposit balance to user wallet (for testing)
    
    This is called when:
    1. User deposits crypto via blockchain (webhook from blockchain service)
    2. Testing purpose: manual deposit
    
    Example:
    POST /wallet/deposit?user_id=123
    {
        "cryptocurrency": "USDT",
        "amount": 1000,
        "transaction_hash": "0x123abc...",
        "reason": "Blockchain deposit"
    }
    """
    try:
        cryptocurrency = balance_data.get("cryptocurrency", "BTC").upper()
        amount = float(balance_data.get("amount", 0))
        tx_hash = balance_data.get("transaction_hash", "")
        reason = balance_data.get("reason", "Deposit")
        
        if amount <= 0:
            raise ValueError("Amount must be greater than 0")
        
        # Get or create balance
        balance = db.execute(
            text("SELECT id, available_balance, locked_balance FROM wallet_balances WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency"),
            {"user_id": user_id, "cryptocurrency": cryptocurrency}
        ).fetchone()
        
        old_available = balance.available_balance if balance else 0
        
        if not balance:
            # CREATE NEW BALANCE ENTRY
            db.execute(text("""
                INSERT INTO wallet_balances (id, user_id, cryptocurrency, available_balance, locked_balance, total_balance, last_updated_reason)
                VALUES (lower(hex(randomblob(8))), :user_id, :cryptocurrency, :amount, 0, :amount, :reason)
            """), {"user_id": user_id, "cryptocurrency": cryptocurrency, "amount": amount, "reason": reason})
        else:
            # UPDATE EXISTING BALANCE
            db.execute(text("""
                UPDATE wallet_balances
                SET available_balance = available_balance + :amount,
                    total_balance = total_balance + :amount,
                    updated_at = CURRENT_TIMESTAMP,
                    last_updated_reason = :reason
                WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
            """), {"user_id": user_id, "cryptocurrency": cryptocurrency, "amount": amount, "reason": reason})
        
        # RECORD TRANSACTION IN HISTORY (for audit trail)
        db.execute(text("""
            INSERT INTO balance_history (id, user_id, cryptocurrency, operation_type, amount, balance_before, balance_after, locked_before, locked_after, reference_id, reason)
            VALUES (lower(hex(randomblob(8))), :user_id, :cryptocurrency, 'deposit', :amount, :balance_before, :balance_after, 0, 0, :reference_id, :reason)
        """), {
            "user_id": user_id,
            "cryptocurrency": cryptocurrency,
            "amount": amount,
            "balance_before": old_available,
            "balance_after": old_available + amount,
            "reference_id": tx_hash,
            "reason": reason
        })
        
        db.commit()
        
        # Get updated balance
        updated = db.execute(
            text("SELECT available_balance, locked_balance FROM wallet_balances WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency"),
            {"user_id": user_id, "cryptocurrency": cryptocurrency}
        ).fetchone()
        
        return {
            "success": True,
            "data": {
                "cryptocurrency": cryptocurrency,
                "available_balance": float(updated.available_balance),
                "locked_balance": float(updated.locked_balance),
                "total_balance": float(updated.available_balance + updated.locked_balance),
                "amount_deposited": amount
            },
            "message": f"Deposited {amount} {cryptocurrency} successfully"
        }
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to deposit: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )



async def get_wallet_balance(
    user_id: int = Query(1, description="User ID"),
    cryptocurrency: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get user wallet balance(s)"""
    try:
        if cryptocurrency:
            # Get specific cryptocurrency balance
            balance_query = text("""
                SELECT id, user_id, cryptocurrency, available_balance, locked_balance, total_balance
                FROM wallet_balances
                WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
            """)
            balance = db.execute(
                balance_query,
                {"user_id": user_id, "cryptocurrency": cryptocurrency.upper()}
            ).fetchone()
            
            if not balance:
                # Create new balance if doesn't exist
                return {
                    "success": True,
                    "data": {
                        "user_id": str(user_id),
                        "cryptocurrency": cryptocurrency.upper(),
                        "available_balance": 0.0,
                        "locked_balance": 0.0,
                        "total_balance": 0.0
                    }
                }
            
            return {
                "success": True,
                "data": {
                    "user_id": str(balance.user_id),
                    "cryptocurrency": balance.cryptocurrency,
                    "available_balance": float(balance.available_balance),
                    "locked_balance": float(balance.locked_balance),
                    "total_balance": float(balance.total_balance)
                }
            }
        else:
            # Get all cryptocurrency balances for user
            balances_query = text("""
                SELECT cryptocurrency, available_balance, locked_balance, total_balance
                FROM wallet_balances
                WHERE user_id = :user_id
            """)
            balances = db.execute(balances_query, {"user_id": user_id}).fetchall()
            
            return {
                "success": True,
                "data": [
                    {
                        "cryptocurrency": b.cryptocurrency,
                        "available_balance": float(b.available_balance),
                        "locked_balance": float(b.locked_balance),
                        "total_balance": float(b.total_balance)
                    }
                    for b in balances
                ]
            }
    except Exception as e:
        print(f"[ERROR] Failed to get balance: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get balance: {str(e)}"
        )


@router.post("/wallet/freeze")
async def freeze_balance(
    balance_data: Dict[str, Any],
    user_id: int = Query(1),
    db: Session = Depends(get_db)
):
    """Freeze (lock) balance for P2P trade"""
    try:
        cryptocurrency = balance_data.get("cryptocurrency", "BTC").upper()
        amount = float(balance_data.get("amount", 0))
        reason = balance_data.get("reason", "P2P Trade")
        reference_id = balance_data.get("reference_id")
        
        # Get or create balance
        balance_query = text("""
            SELECT available_balance, locked_balance FROM wallet_balances
            WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
        """)
        balance = db.execute(
            balance_query,
            {"user_id": user_id, "cryptocurrency": cryptocurrency}
        ).fetchone()
        
        if not balance:
            # Create new balance
            db.execute(text("""
                INSERT INTO wallet_balances (id, user_id, cryptocurrency, available_balance, locked_balance, total_balance)
                VALUES (lower(hex(randomblob(8))), :user_id, :cryptocurrency, 0, 0, 0)
            """), {"user_id": user_id, "cryptocurrency": cryptocurrency})
            db.commit()
            raise ValueError(f"Insufficient balance for freeze")
        
        # Check sufficient balance
        if balance.available_balance < amount:
            raise ValueError(
                f"Insufficient available balance. Available: {balance.available_balance}, Requested: {amount}"
            )
        
        # Freeze balance
        freeze_query = text("""
            UPDATE wallet_balances
            SET available_balance = available_balance - :amount,
                locked_balance = locked_balance + :amount,
                updated_at = CURRENT_TIMESTAMP,
                last_updated_reason = :reason
            WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
        """)
        
        db.execute(
            freeze_query,
            {
                "user_id": user_id,
                "cryptocurrency": cryptocurrency,
                "amount": amount,
                "reason": f"Frozen: {reason}"
            }
        )
        
        # Record in history
        db.execute(text("""
            INSERT INTO balance_history (id, user_id, cryptocurrency, operation_type, amount, balance_before, balance_after, locked_before, locked_after, reference_id, reason)
            VALUES (lower(hex(randomblob(8))), :user_id, :cryptocurrency, 'freeze', :amount, :balance_before, :balance_after, :locked_before, :locked_after, :reference_id, :reason)
        """), {
            "user_id": user_id,
            "cryptocurrency": cryptocurrency,
            "amount": amount,
            "balance_before": balance.available_balance,
            "balance_after": balance.available_balance - amount,
            "locked_before": balance.locked_balance,
            "locked_after": balance.locked_balance + amount,
            "reference_id": reference_id,
            "reason": reason
        })
        
        db.commit()
        
        # Get updated balance
        updated = db.execute(
            balance_query,
            {"user_id": user_id, "cryptocurrency": cryptocurrency}
        ).fetchone()
        
        return {
            "success": True,
            "data": {
                "available_balance": float(updated.available_balance),
                "locked_balance": float(updated.locked_balance),
                "total_balance": float(updated.available_balance + updated.locked_balance)
            },
            "message": f"Frozen {amount} {cryptocurrency} successfully"
        }
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to freeze balance: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/wallet/unfreeze")
async def unfreeze_balance(
    balance_data: Dict[str, Any],
    user_id: int = Query(1),
    db: Session = Depends(get_db)
):
    """Unfreeze (unlock) balance"""
    try:
        cryptocurrency = balance_data.get("cryptocurrency", "BTC").upper()
        amount = float(balance_data.get("amount", 0))
        reason = balance_data.get("reason", "Trade Cancelled")
        reference_id = balance_data.get("reference_id")
        
        # Get balance
        balance_query = text("""
            SELECT available_balance, locked_balance FROM wallet_balances
            WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
        """)
        balance = db.execute(
            balance_query,
            {"user_id": user_id, "cryptocurrency": cryptocurrency}
        ).fetchone()
        
        if not balance or balance.locked_balance < amount:
            raise ValueError(
                f"Insufficient locked balance. Locked: {balance.locked_balance if balance else 0}, Requested: {amount}"
            )
        
        # Unfreeze balance
        unfreeze_query = text("""
            UPDATE wallet_balances
            SET available_balance = available_balance + :amount,
                locked_balance = locked_balance - :amount,
                updated_at = CURRENT_TIMESTAMP,
                last_updated_reason = :reason
            WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
        """)
        
        db.execute(
            unfreeze_query,
            {
                "user_id": user_id,
                "cryptocurrency": cryptocurrency,
                "amount": amount,
                "reason": f"Unfrozen: {reason}"
            }
        )
        
        # Record in history
        db.execute(text("""
            INSERT INTO balance_history (id, user_id, cryptocurrency, operation_type, amount, balance_before, balance_after, locked_before, locked_after, reference_id, reason)
            VALUES (lower(hex(randomblob(8))), :user_id, :cryptocurrency, 'unfreeze', :amount, :balance_before, :balance_after, :locked_before, :locked_after, :reference_id, :reason)
        """), {
            "user_id": user_id,
            "cryptocurrency": cryptocurrency,
            "amount": amount,
            "balance_before": balance.available_balance,
            "balance_after": balance.available_balance + amount,
            "locked_before": balance.locked_balance,
            "locked_after": balance.locked_balance - amount,
            "reference_id": reference_id,
            "reason": reason
        })
        
        db.commit()
        
        # Get updated balance
        updated = db.execute(
            balance_query,
            {"user_id": user_id, "cryptocurrency": cryptocurrency}
        ).fetchone()
        
        return {
            "success": True,
            "data": {
                "available_balance": float(updated.available_balance),
                "locked_balance": float(updated.locked_balance),
                "total_balance": float(updated.available_balance + updated.locked_balance)
            },
            "message": f"Unfrozen {amount} {cryptocurrency} successfully"
        }
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to unfreeze balance: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/wallet/history")
async def get_balance_history(
    user_id: int = Query(1),
    cryptocurrency: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get balance change history"""
    try:
        params = {"user_id": user_id}
        where_clause = "user_id = :user_id"
        
        if cryptocurrency:
            where_clause += " AND cryptocurrency = :cryptocurrency"
            params["cryptocurrency"] = cryptocurrency.upper()
        
        history_query = text(f"""
            SELECT id, operation_type, amount, balance_before, balance_after, reference_id, reason, created_at
            FROM balance_history
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """)
        
        params["limit"] = limit
        params["offset"] = offset
        
        history = db.execute(history_query, params).fetchall()
        
        return {
            "success": True,
            "data": [
                {
                    "operation_type": h.operation_type,
                    "amount": float(h.amount),
                    "balance_before": float(h.balance_before),
                    "balance_after": float(h.balance_after),
                    "reference_id": h.reference_id,
                    "reason": h.reason,
                    "created_at": str(h.created_at)
                }
                for h in history
            ]
        }
    except Exception as e:
        print(f"[ERROR] Failed to get history: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
