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
import uuid

from app.db.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.core.config import settings
from app.core.kyc_middleware import check_kyc_limit
from app.models.user import User
from app.services.platform_settings_service import platform_settings_service
from app.services.kyc_service import KYCService
from uuid import UUID
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["p2p"])


# ==========================================
# CONFIGURAÇÕES PÚBLICAS (TAXAS/LIMITES)
# ==========================================

@router.get("/config")
async def get_p2p_config(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Retorna configurações públicas do P2P (taxas, limites, etc.)
    
    Endpoint que pode ser usado autenticado ou não.
    - Se autenticado: retorna o limite personalizado do usuário baseado no KYC
    - Se não autenticado: retorna o limite global do sistema
    """
    # Taxas do P2P
    maker_fee = platform_settings_service.get(db, "p2p_maker_fee", 0.0)
    taker_fee = platform_settings_service.get(db, "p2p_taker_fee", 0.5)
    
    # Limites globais do sistema
    min_brl = platform_settings_service.get(db, "p2p_min_order_brl", 50.0)
    max_brl_global = platform_settings_service.get(db, "p2p_max_order_brl", 500000.0)
    
    # Se usuário autenticado, buscar limite personalizado do KYC
    max_brl = max_brl_global
    daily_limit = None
    monthly_limit = None
    kyc_level = None
    kyc_level_name = None
    
    logger.info(f"[P2P Config] current_user: {current_user}")
    
    if current_user:
        try:
            logger.info(f"[P2P Config] Buscando limites para user: {current_user.id}")
            kyc_service = KYCService(db)
            user_uuid = UUID(str(current_user.id)) if not isinstance(current_user.id, UUID) else current_user.id
            user_limits = await kyc_service.get_user_limits(user_uuid)
            
            logger.info(f"[P2P Config] Limites retornados: {user_limits}")
            
            # Buscar limite do serviço P2P
            p2p_limit = user_limits.get("p2p", {})
            if p2p_limit and isinstance(p2p_limit, dict):
                transaction_limit = p2p_limit.get("transaction_limit_brl")
                daily_limit_val = p2p_limit.get("daily_limit_brl")
                monthly_limit_val = p2p_limit.get("monthly_limit_brl")
                
                logger.info(f"[P2P Config] transaction_limit={transaction_limit}, daily_limit={daily_limit_val}")
                
                # Determinar o limite máximo efetivo por operação
                limits_to_check = [float(max_brl_global)]
                if transaction_limit is not None:
                    limits_to_check.append(float(transaction_limit))
                
                max_brl = min(limits_to_check)
                daily_limit = daily_limit_val
                monthly_limit = monthly_limit_val
                logger.info(f"[P2P Config] max_brl calculado: {max_brl}")
            
            # Incluir info do nível KYC
            kyc_level = user_limits.get("kyc_level")
            kyc_level_name = user_limits.get("kyc_level_name")
            
        except Exception as e:
            logger.warning(f"Erro ao buscar limites KYC do usuário: {e}")
            # Continua usando o limite global
    
    response = {
        "maker_fee_percentage": maker_fee,
        "taker_fee_percentage": taker_fee,
        "min_order_brl": min_brl,
        "max_order_brl": max_brl,
        "daily_limit_brl": daily_limit,
        "monthly_limit_brl": monthly_limit,
    }
    
    # Adicionar info KYC se usuário autenticado
    if current_user:
        response["kyc_level"] = kyc_level
        response["kyc_level_name"] = kyc_level_name
    
    return response


@router.get("/payment-methods")
async def get_payment_methods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment methods for the authenticated user"""
    result = db.execute(
        text("SELECT * FROM payment_methods WHERE user_id = :user_id AND is_active = 1 ORDER BY created_at DESC"),
        {"user_id": str(current_user.id)}
    )
    methods = result.fetchall()
    
    response_data = {
        "success": True,
        "data": [
            {
                "id": str(m.id),
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


def normalize_payment_details(details: dict) -> dict:
    """
    Normalize payment method details to frontend expected format.
    Maps keyValue -> pix_key, keyType -> pix_key_type, holderName -> holder_name
    """
    if not details:
        return {}
    
    normalized = {}
    
    # Map keyValue to pix_key
    if 'keyValue' in details:
        normalized['pix_key'] = details['keyValue']
    if 'keyType' in details:
        normalized['pix_key_type'] = details['keyType'].lower() if details['keyType'] else 'cpf'
    if 'holderName' in details:
        normalized['holder_name'] = details['holderName']
    if 'bankName' in details:
        normalized['bank_name'] = details['bankName']
    if 'agency' in details:
        normalized['agency'] = details['agency']
    if 'accountNumber' in details:
        normalized['account_number'] = details['accountNumber']
    if 'accountType' in details:
        normalized['account_type'] = details['accountType']
    
    # Also keep original fields for backward compatibility
    normalized.update(details)
    
    return normalized


@router.post("/payment-methods")
async def create_payment_method(
    payment_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new payment method for the authenticated user
    
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
        
        # Insert payment method with UUID for PostgreSQL
        query = text("""
            INSERT INTO payment_methods (id, user_id, type, details, is_active, created_at, updated_at)
            VALUES (gen_random_uuid(), :user_id, :type, :details, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
        """)
        
        result = db.execute(
            query,
            {
                "user_id": str(current_user.id),
                "type": payment_type,
                "details": json.dumps(details)
            }
        )
        method_id = result.fetchone()[0]
        db.commit()
        
        # Get the created record
        created = db.execute(
            text("SELECT * FROM payment_methods WHERE id = :id"),
            {"id": str(method_id)}
        ).fetchone()
        
        if created:
            return {
                    "success": True,
                    "data": {
                        "id": str(created.id),
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a payment method"""
    user_id = str(current_user.id)  # ✅ UUID
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new P2P order.
    
    Requires:
    - KYC Básico para ordens até R$ 5.000
    - KYC Intermediário para ordens até R$ 100.000
    - KYC Avançado para ordens acima de R$ 100.000
    """
    user_id = str(current_user.id)  # ✅ UUID do usuário autenticado
    print(f"[DEBUG] POST /orders - user_id: {user_id}, data: {order_data}")
    
    # ========== VERIFICAR RESTRIÇÕES DE WALLET ==========
    from app.services.wallet_restriction_service import wallet_restriction_service
    wallet_restriction_service.check_operation_allowed(
        db=db,
        user_id=user_id,
        operation_type='p2p',
        raise_exception=True
    )
    # ====================================================
    
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
        
        # ========== VALIDAÇÃO KYC ==========
        # Calcula valor máximo da ordem em BRL para validar limite
        max_order_value_brl = max_amount * price if fiat_currency == "BRL" else max_amount
        if max_order_value_brl > 0:
            await check_kyc_limit(
                db=db,
                user=current_user,
                service_type="p2p",
                operation_type="transaction",
                amount_brl=max_order_value_brl
            )
        # ====================================
        
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
        
        # Insert order - PostgreSQL usa RETURNING id
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
            RETURNING id
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
        
        # ✅ PostgreSQL retorna o ID diretamente com RETURNING
        order_id_result = result.fetchone()
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
    status: Optional[str] = Query('active', description="Filter by status: active, paused, completed, cancelled"),
    db: Session = Depends(get_db)
):
    """Get P2P orders"""
    conditions = []
    params = {}
    
    # Default to 'active' if not specified
    if status:
        conditions.append("status = :status")
        params["status"] = status.lower()
    else:
        conditions.append("status = 'active'")
    
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
        # Get trader profile data from database
        # o.user_id might be integer or UUID, so convert to string for comparison
        user_id_str = str(o.user_id)
        
        trader_profile_query = """
            SELECT tp.display_name, tp.avatar_url, tp.is_verified, tp.verification_level,
                   tp.total_trades, tp.completed_trades, tp.success_rate, tp.average_rating,
                   tp.total_reviews, u.email
            FROM trader_profiles tp
            LEFT JOIN users u ON tp.user_id = u.id
            WHERE tp.user_id = :user_id
        """
        trader_result = db.execute(text(trader_profile_query), {"user_id": user_id_str}).fetchone()
        
        if trader_result:
            user_data = {
                "id": str(o.user_id),
                "username": trader_result.email.split('@')[0] if trader_result.email else f"user_{o.user_id}",
                "display_name": trader_result.display_name,
                "avatar": trader_result.avatar_url,
                "verified": trader_result.is_verified,
                "verification_level": trader_result.verification_level,
                "total_trades": trader_result.total_trades or 0,
                "completed_trades": trader_result.completed_trades or 0,
                "success_rate": (trader_result.success_rate or 0) * 100,
                "avg_rating": trader_result.average_rating or 0,
                "total_reviews": trader_result.total_reviews or 0,
                "badges": ["verified", "pro_trader"] if trader_result.is_verified else [],
                "is_online": True
            }
        else:
            # Fallback if no trader profile found
            user_data = {
                "id": str(o.user_id),
                "username": f"user_{o.user_id}",
                "display_name": f"Trader {o.user_id}",
                "verified": False,
                "verification_level": "basic",
                "total_trades": o.completed_trades or 0,
                "completed_trades": o.completed_trades or 0,
                "success_rate": 98.5,
                "avg_rating": 4.8,
                "total_reviews": 0,
                "badges": [],
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's own P2P orders"""
    user_id = str(current_user.id)  # ✅ UUID
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
    order_id: str,  # ✅ Aceita string
    db: Session = Depends(get_db)
):
    """Get details of a specific order"""
    print(f"[DEBUG] GET /orders/{order_id}")
    
    try:
        # Tenta converter para UUID primeiro, depois para int
        from uuid import UUID
        order_id_value = None
        is_uuid = False
        
        try:
            order_uuid = UUID(order_id)
            order_id_value = order_uuid  # Mantém como UUID object
            is_uuid = True
            print(f"[DEBUG] Order ID is UUID: {order_id_value}")
        except ValueError:
            try:
                order_id_value = int(order_id)
                print(f"[DEBUG] Order ID is integer: {order_id_value}")
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid order ID format: {order_id}"
                )
        
        # Query diferente dependendo do tipo
        if is_uuid:
            query = text("SELECT * FROM p2p_orders WHERE id = CAST(:id AS UUID)")
        else:
            query = text("SELECT * FROM p2p_orders WHERE id = :id")
        
        result = db.execute(query, {"id": str(order_id_value) if is_uuid else order_id_value}).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Get payment methods details
        payment_method_ids = json.loads(result.payment_methods) if result.payment_methods else []
        payment_methods_data = []
        
        if payment_method_ids:
            # ✅ Adiciona aspas ao redor de cada UUID
            ids_str = ','.join(f"'{id}'" for id in payment_method_ids)
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
        # Get trader profile data from database
        # result.user_id might be integer or UUID, so convert to string for comparison
        user_id_str = str(result.user_id)
        
        trader_profile_query = """
            SELECT tp.display_name, tp.avatar_url, tp.is_verified, tp.verification_level,
                   tp.total_trades, tp.completed_trades, tp.success_rate, tp.average_rating,
                   tp.total_reviews, u.email
            FROM trader_profiles tp
            LEFT JOIN users u ON tp.user_id = u.id
            WHERE tp.user_id = :user_id
        """
        trader_result = db.execute(text(trader_profile_query), {"user_id": user_id_str}).fetchone()
        
        if trader_result:
            user_data = {
                "id": str(result.user_id),
                "username": trader_result.email.split('@')[0] if trader_result.email else f"user_{result.user_id}",
                "display_name": trader_result.display_name,
                "email": trader_result.email,
                "avatar": trader_result.avatar_url,
                "verified": trader_result.is_verified,
                "verification_level": trader_result.verification_level,
                "joined_date": "2024-01-15",
                "total_trades": trader_result.total_trades or 0,
                "completed_trades": trader_result.completed_trades or 0,
                "success_rate": (trader_result.success_rate or 0) * 100,
                "avg_rating": trader_result.average_rating or 0,
                "total_reviews": trader_result.total_reviews or 0,
                "badges": ["verified", "pro_trader"] if trader_result.is_verified else [],
                "is_online": True,
                "last_seen": str(result.updated_at)
            }
        else:
            user_data = {
                "id": str(result.user_id),
                "username": f"user_{result.user_id}",
                "display_name": f"Trader {result.user_id}",
                "email": f"user{result.user_id}@holdwallet.com",
                "verified": False,
                "verification_level": "basic",
                "joined_date": "2024-01-15",
                "total_trades": result.completed_trades or 0,
                "completed_trades": result.completed_trades or 0,
                "success_rate": 98.5,
                "avg_rating": 4.8,
                "total_reviews": 0,
                "badges": [],
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
    order_id: str,  # ✅ Aceita string
    update_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update order (e.g., pause/activate, change price)"""
    user_id = current_user.id  # ✅ Integer
    print(f"[DEBUG] PUT /orders/{order_id} - user_id: {user_id}, data: {update_data}")
    
    try:
        # Converte order_id para UUID ou int
        from uuid import UUID
        order_id_value = None
        is_uuid = False
        
        try:
            order_uuid = UUID(order_id)
            order_id_value = order_uuid
            is_uuid = True
            print(f"[DEBUG] Order ID is UUID: {order_id_value}")
        except ValueError:
            try:
                order_id_value = int(order_id)
                print(f"[DEBUG] Order ID is integer: {order_id_value}")
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid order ID format: {order_id}"
                )
        
        # Check if order exists and belongs to user
        if is_uuid:
            check_query = text("SELECT id FROM p2p_orders WHERE id = CAST(:id AS UUID) AND user_id = :user_id")
        else:
            check_query = text("SELECT id FROM p2p_orders WHERE id = :id AND user_id = :user_id")
        
        existing = db.execute(check_query, {"id": str(order_id_value) if is_uuid else order_id_value, "user_id": user_id}).fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found or you don't have permission to update it"
            )
        
        # Build update query dynamically
        allowed_fields = ["status", "price", "min_order_limit", "max_order_limit", "terms", "auto_reply"]
        update_fields = []
        params = {"id": str(order_id_value) if is_uuid else order_id_value, "user_id": user_id}
        
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
        
        # Query diferente dependendo do tipo
        if is_uuid:
            update_query = text(f"""
                UPDATE p2p_orders 
                SET {', '.join(update_fields)}
                WHERE id = CAST(:id AS UUID) AND user_id = :user_id
            """)
        else:
            update_query = text(f"""
                UPDATE p2p_orders 
                SET {', '.join(update_fields)}
                WHERE id = :id AND user_id = :user_id
            """)
        
        db.execute(update_query, params)
        db.commit()
        
        print(f"[DEBUG] Order {order_id_value} updated successfully")
        
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
    order_id: str,  # ✅ Aceita string (UUID ou int)
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an order (sets status to 'cancelled')"""
    user_id = current_user.id  # ✅ Usa ID diretamente (integer)
    print(f"[DEBUG] DELETE /orders/{order_id} - user_id: {user_id}, type: {type(order_id)}")
    
    try:
        # Tenta converter para UUID primeiro, depois para int
        from uuid import UUID
        order_id_value = None
        is_uuid = False
        
        try:
            # Tenta UUID primeiro
            order_uuid = UUID(order_id)
            order_id_value = order_uuid
            is_uuid = True
            print(f"[DEBUG] Order ID is UUID: {order_id_value}")
        except ValueError:
            # Tenta int
            try:
                order_id_value = int(order_id)
                print(f"[DEBUG] Order ID is integer: {order_id_value}")
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid order ID format: {order_id}"
                )
        
        # Check if order exists and belongs to user
        if is_uuid:
            check_query = text("SELECT id, status FROM p2p_orders WHERE id = CAST(:id AS UUID) AND user_id = :user_id")
        else:
            check_query = text("SELECT id, status FROM p2p_orders WHERE id = :id AND user_id = :user_id")
        
        existing = db.execute(check_query, {"id": str(order_id_value) if is_uuid else order_id_value, "user_id": user_id}).fetchone()
        
        if not existing:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found or you don't have permission to cancel it"
            )
        
        # Update status to cancelled
        if is_uuid:
            update_query = text("""
                UPDATE p2p_orders 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id = CAST(:id AS UUID) AND user_id = :user_id
            """)
        else:
            update_query = text("""
                UPDATE p2p_orders 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND user_id = :user_id
            """)
        
        db.execute(update_query, {"id": str(order_id_value) if is_uuid else order_id_value, "user_id": user_id})
        db.commit()
        
        print(f"[DEBUG] Order {order_id_value} cancelled successfully")
        
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new P2P trade.
    
    Requires:
    - KYC Básico para trades até R$ 5.000
    - KYC Intermediário para trades até R$ 100.000
    - KYC Avançado para trades acima de R$ 100.000
    """
    buyer_id = str(current_user.id)  # ✅ UUID do usuário autenticado
    print(f"[DEBUG] POST /trades - buyer_id: {buyer_id}, data: {trade_data}")
    
    try:
        from uuid import UUID as PyUUID
        
        # ========== VALIDAÇÃO KYC ==========
        # Valida KYC para o valor do trade (se informado)
        trade_amount_brl = float(trade_data.get("fiat_amount") or trade_data.get("amount") or 0)
        if trade_amount_brl > 0:
            await check_kyc_limit(
                db=db,
                user=current_user,
                service_type="p2p",
                operation_type="transaction",
                amount_brl=trade_amount_brl
            )
        # ====================================
        
        # Aceitar tanto orderId (camelCase) quanto order_id (snake_case)
        order_id_raw = trade_data.get("orderId") or trade_data.get("order_id")
        if not order_id_raw:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="orderId is required"
            )
        
        # Verificar se é UUID ou int
        order_id_value = None
        is_uuid = False
        
        try:
            # Tenta como UUID primeiro
            order_uuid = PyUUID(str(order_id_raw))
            order_id_value = str(order_uuid)
            is_uuid = True
            print(f"[DEBUG] Order ID is UUID: {order_id_value}")
        except ValueError:
            try:
                # Tenta como int
                order_id_value = int(order_id_raw)
                print(f"[DEBUG] Order ID is integer: {order_id_value}")
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid order ID format: {order_id_raw}"
                )
        
        amount = float(trade_data.get("amount", 0))
        payment_method_id = trade_data.get("paymentMethodId") or trade_data.get("payment_method_id")
        
        # Get order details - query diferente dependendo do tipo de ID
        if is_uuid:
            order_query = text("SELECT * FROM p2p_orders WHERE id = CAST(:id AS UUID) AND status = 'active'")
            order = db.execute(order_query, {"id": order_id_value}).fetchone()
        else:
            order_query = text("SELECT * FROM p2p_orders WHERE id = :id AND status = 'active'")
            order = db.execute(order_query, {"id": order_id_value}).fetchone()
        
        if not order:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Order not found or not active"
            )
        
        # ⚠️ IMPORTANTE: O frontend envia o valor em FIAT (BRL), não em crypto!
        # amount = valor em BRL que o usuário quer negociar
        # crypto_amount = quantidade de crypto correspondente
        fiat_amount = amount  # Valor em BRL enviado pelo frontend
        crypto_amount = fiat_amount / float(order.price)  # Calcula quantidade de crypto
        
        print(f"[DEBUG] Trade calculation: fiat_amount={fiat_amount} BRL, price={order.price}, crypto_amount={crypto_amount} {order.cryptocurrency}")
        
        # Validations - min/max limits são em FIAT (BRL)
        if fiat_amount < float(order.min_order_limit) or fiat_amount > float(order.max_order_limit):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Valor deve estar entre R$ {float(order.min_order_limit):.2f} e R$ {float(order.max_order_limit):.2f}"
            )
        
        # Verificar se há crypto suficiente disponível na ordem
        if crypto_amount > float(order.available_amount):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Quantidade insuficiente na ordem. Disponível: {float(order.available_amount):.8f} {order.cryptocurrency}"
            )
        
        # ✅ PHASE 1: Validate buyer balance (for buy orders)
        if order.order_type == 'buy':
            # Buyer needs to have BRL balance
            buyer_balance = db.execute(
                text("SELECT available_balance FROM wallet_balances WHERE user_id = :user_id AND cryptocurrency = 'BRL'"),
                {"user_id": buyer_id}
            ).fetchone()
            
            if not buyer_balance or buyer_balance.available_balance < fiat_amount:
                raise HTTPException(
                    status_code=http_status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"Saldo insuficiente. Você precisa de R$ {fiat_amount:.2f}"
                )
        else:
            # Seller needs to have crypto balance
            seller_balance = db.execute(
                text("SELECT available_balance FROM wallet_balances WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency"),
                {"user_id": order.user_id, "cryptocurrency": order.cryptocurrency}
            ).fetchone()
            
            if not seller_balance or seller_balance.available_balance < crypto_amount:
                raise HTTPException(
                    status_code=http_status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"Vendedor com saldo insuficiente. Necessário: {crypto_amount:.8f} {order.cryptocurrency}"
                )
        
        # Insert trade - PostgreSQL usa RETURNING id
        from datetime import datetime, timedelta
        expires_at = datetime.now() + timedelta(minutes=order.time_limit)
        
        # Usar o order.id diretamente (já é o valor correto do banco)
        actual_order_id = order.id
        
        trade_query = text("""
            INSERT INTO p2p_trades (
                order_id, buyer_id, seller_id, cryptocurrency, fiat_currency,
                amount, price, total_fiat, payment_method_id, expires_at,
                status, created_at, updated_at
            ) VALUES (
                :order_id, CAST(:buyer_id AS UUID), :seller_id, :cryptocurrency, :fiat_currency,
                :amount, :price, :total_fiat, :payment_method_id, :expires_at,
                'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            RETURNING id
        """)
        
        result = db.execute(trade_query, {
            "order_id": actual_order_id,
            "buyer_id": buyer_id,
            "seller_id": order.user_id,
            "cryptocurrency": order.cryptocurrency,
            "fiat_currency": order.fiat_currency,
            "amount": crypto_amount,  # Quantidade de crypto
            "price": float(order.price),
            "total_fiat": fiat_amount,  # Valor em BRL
            "payment_method_id": payment_method_id,
            "expires_at": expires_at.strftime("%Y-%m-%d %H:%M:%S")
        })
        db.commit()
        
        # ✅ PostgreSQL retorna o ID diretamente com RETURNING
        trade_id_result = result.fetchone()
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
                """), {"user_id": buyer_id, "amount": fiat_amount})
            else:
                # Freeze crypto on seller side
                db.execute(text("""
                    UPDATE wallet_balances
                    SET locked_balance = locked_balance + :amount,
                        available_balance = available_balance - :amount,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = :user_id AND cryptocurrency = :cryptocurrency
                """), {"user_id": order.user_id, "amount": crypto_amount, "cryptocurrency": order.cryptocurrency})
            
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
                "order_id": str(actual_order_id),
                "buyer_id": str(buyer_id),
                "seller_id": str(order.user_id),
                "cryptocurrency": order.cryptocurrency,
                "fiat_currency": order.fiat_currency,
                "amount": str(crypto_amount),  # Quantidade de crypto
                "price": str(order.price),
                "total_fiat": str(fiat_amount),  # Valor em BRL
                "total_price": str(fiat_amount),  # Alias para compatibilidade
                "status": "pending"
            },
            "message": "Trade iniciado com sucesso"
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
    trade_id: str,  # ✅ Aceita string (UUID ou int)
    db: Session = Depends(get_db)
):
    """Get trade details"""
    print(f"[DEBUG] GET /trades/{trade_id}")
    
    try:
        from uuid import UUID as PyUUID
        
        # Verificar se é UUID ou int
        trade_id_value = None
        is_uuid = False
        
        try:
            trade_uuid = PyUUID(str(trade_id))
            trade_id_value = str(trade_uuid)
            is_uuid = True
            print(f"[DEBUG] Trade ID is UUID: {trade_id_value}")
        except ValueError:
            try:
                trade_id_value = int(trade_id)
                print(f"[DEBUG] Trade ID is integer: {trade_id_value}")
            except ValueError:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid trade ID format: {trade_id}"
                )
        
        # Query diferente dependendo do tipo
        if is_uuid:
            query = text("SELECT * FROM p2p_trades WHERE id = CAST(:id AS UUID)")
        else:
            query = text("SELECT * FROM p2p_trades WHERE id = :id")
        
        trade = db.execute(query, {"id": trade_id_value}).fetchone()
        
        if not trade:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Trade not found"
            )
        
        # Buscar dados da ordem associada
        order_query = text("SELECT * FROM p2p_orders WHERE id = :id")
        order = db.execute(order_query, {"id": trade.order_id}).fetchone()
        
        # Buscar método de pagamento se existir
        payment_method = None
        if trade.payment_method_id:
            print(f"[DEBUG] Trade has payment_method_id: {trade.payment_method_id}")
            pm_query = text("SELECT * FROM payment_methods WHERE id = CAST(:id AS UUID)")
            pm_result = db.execute(pm_query, {"id": str(trade.payment_method_id)}).fetchone()
            if pm_result:
                raw_details = parse_json_details(pm_result.details)
                print(f"[DEBUG] Raw payment method details: {raw_details}")
                payment_method = {
                    "id": str(pm_result.id),
                    "type": pm_result.type,
                    "details": normalize_payment_details(raw_details)
                }
                print(f"[DEBUG] Normalized payment method: {payment_method}")
        
        # Se não tem payment_method do trade, pega o primeiro da ordem
        if not payment_method and order and order.payment_methods:
            pm_ids = json.loads(order.payment_methods)
            print(f"[DEBUG] Order payment_methods IDs: {pm_ids}")
            if pm_ids:
                pm_query = text("SELECT * FROM payment_methods WHERE id = CAST(:id AS UUID)")
                pm_result = db.execute(pm_query, {"id": str(pm_ids[0])}).fetchone()
                if pm_result:
                    raw_details = parse_json_details(pm_result.details)
                    print(f"[DEBUG] Raw payment method details from order: {raw_details}")
                    payment_method = {
                        "id": str(pm_result.id),
                        "type": pm_result.type,
                        "details": normalize_payment_details(raw_details)
                    }
                    print(f"[DEBUG] Normalized payment method from order: {payment_method}")
        
        # Determinar total_fiat (pode ser total_fiat ou total_price dependendo do schema)
        total_fiat = getattr(trade, 'total_fiat', None) or getattr(trade, 'total_price', None) or 0
        
        # Pegar cryptocurrency do trade ou da ordem
        cryptocurrency = getattr(trade, 'cryptocurrency', None) or (order.cryptocurrency if order else "USDT")
        fiat_currency = getattr(trade, 'fiat_currency', None) or (order.fiat_currency if order else "BRL")
        time_limit = order.time_limit if order else 30  # Default 30 minutos
        
        return {
            "success": True,
            "data": {
                "id": str(trade.id),
                "orderId": str(trade.order_id),
                "buyerId": str(trade.buyer_id),
                "sellerId": str(trade.seller_id),
                "cryptocurrency": cryptocurrency,
                "coin": cryptocurrency,  # Alias para frontend
                "fiatCurrency": fiat_currency,
                "amount": str(trade.amount),
                "price": str(trade.price),
                "total": str(total_fiat),
                "paymentMethod": payment_method,
                "paymentMethodId": str(trade.payment_method_id) if trade.payment_method_id else None,
                "timeLimit": time_limit,  # Em minutos
                "expiresAt": str(trade.expires_at) if hasattr(trade, 'expires_at') and trade.expires_at else None,
                "status": trade.status,
                "createdAt": str(trade.created_at),
                "updatedAt": str(trade.updated_at)
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


@router.get("/trades/{trade_id}/messages")
async def get_trade_messages(
    trade_id: str,
    db: Session = Depends(get_db)
):
    """Get messages for a P2P trade"""
    print(f"[DEBUG] GET /trades/{trade_id}/messages")
    
    try:
        # Por enquanto retorna lista vazia - implementar chat posteriormente
        # TODO: Criar tabela p2p_trade_messages e implementar chat real
        return {
            "success": True,
            "data": [],
            "message": "Chat messages endpoint - implementation pending"
        }
    except Exception as e:
        print(f"[ERROR] Failed to get trade messages: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trade messages: {str(e)}"
        )


@router.post("/trades/{trade_id}/messages")
async def send_trade_message(
    trade_id: str,
    message_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message in a P2P trade"""
    print(f"[DEBUG] POST /trades/{trade_id}/messages")
    
    try:
        # Por enquanto retorna sucesso fake - implementar chat posteriormente
        # TODO: Criar tabela p2p_trade_messages e implementar chat real
        return {
            "success": True,
            "data": {
                "id": str(uuid.uuid4()),
                "trade_id": trade_id,
                "user_id": str(current_user.id),
                "message": message_data.get("message", ""),
                "created_at": datetime.now().isoformat()
            },
            "message": "Message sent (pending real implementation)"
        }
    except Exception as e:
        print(f"[ERROR] Failed to send trade message: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send trade message: {str(e)}"
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
    
    💰 FEE COLLECTION (0.5% P2P fee):
    - Fee is deducted from the SELLER side (person receiving payment)
    - Fee is added to system_wallets
    - Fee is recorded in fee_history
    """
    print(f"[DEBUG] POST /trades/{trade_id}/complete")
    
    # Platform fee configuration - agora usa configuração do banco de dados
    P2P_FEE_PERCENTAGE = platform_settings_service.get(db, "p2p_fee_percentage", 0.5)
    SYSTEM_WALLET_ID = settings.SYSTEM_BLOCKCHAIN_WALLET_ID  # Carteira blockchain do sistema
    
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
        
        # Calculate platform fee
        fee_amount_brl = float(trade.total_price) * (P2P_FEE_PERCENTAGE / 100)
        net_amount_brl = float(trade.total_price) - fee_amount_brl
        
        print(f"[DEBUG] Trade {trade_id}: gross={trade.total_price}, fee={fee_amount_brl}, net={net_amount_brl}")
        
        # RELEASE BALANCE BASED ON ORDER TYPE
        if order.order_type == 'buy':
            # BUY ORDER: Buyer paid BRL, seller receives BRL (minus fee)
            # Release buyer's frozen BRL → Seller gets NET amount
            db.execute(text("""
                UPDATE wallet_balances
                SET available_balance = available_balance + :amount,
                    updated_at = CURRENT_TIMESTAMP,
                    last_updated_reason = 'Trade completed - received payment (net after 0.5% fee)'
                WHERE user_id = :user_id AND cryptocurrency = 'BRL'
            """), {"user_id": trade.seller_id, "amount": net_amount_brl})
            
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
            # Seller receives BRL payment (minus fee)
            seller_brl_balance = db.execute(
                text("SELECT available_balance FROM wallet_balances WHERE user_id = :user_id AND cryptocurrency = 'BRL'"),
                {"user_id": trade.seller_id}
            ).fetchone()
            
            if seller_brl_balance:
                # Update existing BRL balance - Seller receives NET amount
                db.execute(text("""
                    UPDATE wallet_balances
                    SET available_balance = available_balance + :amount,
                        updated_at = CURRENT_TIMESTAMP,
                        last_updated_reason = 'Trade completed - received payment (net after 0.5% fee)'
                    WHERE user_id = :user_id AND cryptocurrency = 'BRL'
                """), {"user_id": trade.seller_id, "amount": net_amount_brl})
            else:
                # Create new BRL balance for seller with NET amount
                db.execute(text("""
                    INSERT INTO wallet_balances (id, user_id, cryptocurrency, available_balance, locked_balance, total_balance, last_updated_reason)
                    VALUES (gen_random_uuid(), :user_id, 'BRL', :amount, 0, :amount, 'Trade completed - received payment (net after 0.5% fee)')
                """), {"user_id": trade.seller_id, "amount": net_amount_brl})
            
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
                    VALUES (gen_random_uuid(), :user_id, :cryptocurrency, :amount, 0, :amount, 'Trade completed - received crypto')
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
        
        # 💰 ADD FEE TO SYSTEM WALLET (Contábil)
        try:
            db.execute(text("""
                UPDATE system_wallets
                SET brl_balance = brl_balance + :fee_amount,
                    total_fees_collected_brl = total_fees_collected_brl + :fee_amount,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :wallet_id
            """), {"fee_amount": fee_amount_brl, "wallet_id": SYSTEM_WALLET_ID})
            
            print(f"[DEBUG] Fee {fee_amount_brl} BRL added to system wallet (contábil)")
        except Exception as fee_wallet_error:
            print(f"[WARNING] Could not add fee to system wallet (table may not exist): {fee_wallet_error}")
        
        # 🔐 REGISTRAR NA CARTEIRA BLOCKCHAIN DO SISTEMA
        try:
            from app.services.system_blockchain_wallet_service import system_wallet_service
            
            # Registrar taxa na carteira blockchain
            tx = system_wallet_service.record_fee_collected(
                db=db,
                amount=fee_amount_brl,
                cryptocurrency="BRL",
                network="ethereum",  # Rede padrão para registro
                trade_id=str(trade_id),
                trade_type="p2p_commission",
                description=f"Taxa 0.5% do trade P2P #{trade_id}"
            )
            
            if tx:
                print(f"[DEBUG] Fee recorded in blockchain wallet: {tx.tx_hash}")
            else:
                print("[WARNING] Could not record fee in blockchain wallet")
        except Exception as blockchain_error:
            print(f"[WARNING] Could not record in blockchain wallet: {blockchain_error}")
        
        # 📝 RECORD FEE IN HISTORY
        try:
            import uuid
            db.execute(text("""
                INSERT INTO fee_history (
                    id, trade_id, trade_type, cryptocurrency, fiat_currency,
                    gross_amount, fee_percentage, fee_amount, net_amount, fee_amount_brl,
                    payer_user_id, receiver_user_id, system_wallet_id, status, created_at, updated_at
                ) VALUES (
                    :id, :trade_id, 'p2p_commission', :cryptocurrency, :fiat_currency,
                    :gross_amount, :fee_percentage, :fee_amount, :net_amount, :fee_amount_brl,
                    :payer_user_id, :receiver_user_id, :system_wallet_id, 'collected', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            """), {
                "id": str(uuid.uuid4()),
                "trade_id": trade_id,
                "cryptocurrency": trade.cryptocurrency,
                "fiat_currency": trade.fiat_currency or 'BRL',
                "gross_amount": float(trade.total_price),
                "fee_percentage": P2P_FEE_PERCENTAGE,
                "fee_amount": fee_amount_brl,
                "net_amount": net_amount_brl,
                "fee_amount_brl": fee_amount_brl,
                "payer_user_id": str(trade.seller_id),
                "receiver_user_id": str(trade.buyer_id),
                "system_wallet_id": SYSTEM_WALLET_ID
            })
            
            print(f"[DEBUG] Fee history recorded for trade {trade_id}")
        except Exception as fee_history_error:
            print(f"[WARNING] Could not record fee history (table may not exist): {fee_history_error}")
        
        # Update trade status to completed
        db.execute(text("""
            UPDATE p2p_trades
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """), {"id": trade_id})
        
        db.commit()
        
        print(f"[DEBUG] Trade {trade_id} completed successfully with fee collection")
        
        return {
            "success": True,
            "data": {
                "trade_id": str(trade_id),
                "status": "completed",
                "gross_amount": str(trade.total_price),
                "fee_percentage": P2P_FEE_PERCENTAGE,
                "fee_amount": str(round(fee_amount_brl, 2)),
                "net_amount": str(round(net_amount_brl, 2)),
                "message": "Balance released successfully. Platform fee of 0.5% collected."
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deposit balance to user wallet (for testing)
    
    This is called when:
    1. User deposits crypto via blockchain (webhook from blockchain service)
    2. Testing purpose: manual deposit
    
    Example:
    POST /wallet/deposit
    {
        "cryptocurrency": "USDT",
        "amount": 1000,
        "transaction_hash": "0x123abc...",
        "reason": "Blockchain deposit"
    }
    """
    user_id = str(current_user.id)  # ✅ UUID
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Freeze (lock) balance for P2P trade"""
    user_id = str(current_user.id)  # ✅ UUID
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unfreeze (unlock) balance"""
    user_id = str(current_user.id)  # ✅ UUID
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
    cryptocurrency: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get balance change history"""
    user_id = str(current_user.id)  # ✅ UUID
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
