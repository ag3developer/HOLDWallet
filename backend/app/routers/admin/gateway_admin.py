"""
🚀 WolkPay Gateway - Admin Router
==================================

Endpoints administrativos do WolkPay Gateway.

Routes:
- /admin/gateway/merchants - Listar merchants
- /admin/gateway/merchants/pending - Listar merchants pendentes
- /admin/gateway/merchants/{id} - Detalhes do merchant
- /admin/gateway/merchants/{id}/approve - Aprovar merchant
- /admin/gateway/merchants/{id}/suspend - Suspender merchant
- /admin/gateway/merchants/{id}/block - Bloquear merchant
- /admin/gateway/stats - Estatísticas gerais
- /admin/gateway/payments - Listar todos os pagamentos

Author: HOLD Wallet Team
Date: March 2026
"""

import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, List
from decimal import Decimal
from uuid import UUID

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.gateway import (
    GatewayMerchant, GatewayApiKey, GatewayPayment, GatewayWebhook,
    GatewayAuditLog, GatewaySettings,
    MerchantStatus, GatewayPaymentStatus, GatewayPaymentMethod
)
from app.services.gateway.merchant_service import MerchantService
from app.services.gateway.audit_service import AuditService
from app.schemas.gateway import (
    MerchantResponse, MerchantPublicResponse,
    AdminMerchantApprove, AdminMerchantUpdate
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/gateway", tags=["Gateway Admin"])


def require_admin(user: User):
    """Verifica se o usuário é admin"""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Acesso negado. Requer privilégios de administrador."
        )
    return user


# ==========================================
# ESTATÍSTICAS GERAIS
# ==========================================

@router.get("/stats")
async def get_gateway_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna estatísticas gerais do Gateway.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        # Total de merchants por status
        merchant_stats = db.query(
            GatewayMerchant.status,
            func.count(GatewayMerchant.id).label('count')
        ).group_by(GatewayMerchant.status).all()
        
        merchants_by_status = {str(s.status.value): s.count for s in merchant_stats}
        
        # Total de merchants
        total_merchants = sum(merchants_by_status.values())
        
        # Merchants pendentes (destaque)
        pending_merchants = merchants_by_status.get('PENDING', 0)
        
        # Total de pagamentos por status
        payment_stats = db.query(
            GatewayPayment.status,
            func.count(GatewayPayment.id).label('count'),
            func.sum(GatewayPayment.amount_requested).label('total')
        ).group_by(GatewayPayment.status).all()
        
        payments_by_status = {
            str(p.status.value): {
                'count': p.count,
                'total': float(p.total or 0)
            } for p in payment_stats
        }
        
        # Volume total processado (COMPLETED)
        total_volume = payments_by_status.get('COMPLETED', {}).get('total', 0)
        total_payments = sum(p['count'] for p in payments_by_status.values())
        
        # Pagamentos hoje
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_stats = db.query(
            func.count(GatewayPayment.id).label('count'),
            func.sum(GatewayPayment.amount_requested).label('total')
        ).filter(GatewayPayment.created_at >= today).first()
        
        # Pagamentos este mês
        first_of_month = today.replace(day=1)
        month_stats = db.query(
            func.count(GatewayPayment.id).label('count'),
            func.sum(GatewayPayment.amount_requested).label('total')
        ).filter(GatewayPayment.created_at >= first_of_month).first()
        
        # API Keys ativas
        active_api_keys = db.query(func.count(GatewayApiKey.id)).filter(
            GatewayApiKey.is_active == True
        ).scalar()
        
        return {
            "merchants": {
                "total": total_merchants,
                "pending": pending_merchants,
                "active": merchants_by_status.get('ACTIVE', 0),
                "suspended": merchants_by_status.get('SUSPENDED', 0),
                "blocked": merchants_by_status.get('BLOCKED', 0),
                "by_status": merchants_by_status
            },
            "payments": {
                "total": total_payments,
                "total_volume": total_volume,
                "by_status": payments_by_status,
                "today": {
                    "count": today_stats.count or 0,
                    "total": float(today_stats.total or 0)
                },
                "this_month": {
                    "count": month_stats.count or 0,
                    "total": float(month_stats.total or 0)
                }
            },
            "api_keys": {
                "active": active_api_keys
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas do gateway: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==========================================
# LISTAGEM DE MERCHANTS
# ==========================================

@router.get("/merchants")
async def list_merchants(
    status_filter: Optional[MerchantStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos os merchants com filtros.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        query = db.query(GatewayMerchant)
        
        # Filtro por status
        if status_filter:
            query = query.filter(GatewayMerchant.status == status_filter)
        
        # Busca por nome/CNPJ/email
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    GatewayMerchant.company_name.ilike(search_term),
                    GatewayMerchant.trade_name.ilike(search_term),
                    GatewayMerchant.cnpj.ilike(search_term),
                    GatewayMerchant.email.ilike(search_term)
                )
            )
        
        # Contagem total
        total = query.count()
        
        # Paginação
        offset = (page - 1) * per_page
        merchants = query.order_by(GatewayMerchant.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Buscar usuário de cada merchant
        result = []
        for merchant in merchants:
            user = db.query(User).filter(User.id == merchant.user_id).first()
            
            # Contar pagamentos do merchant
            payment_count = db.query(func.count(GatewayPayment.id)).filter(
                GatewayPayment.merchant_id == merchant.id
            ).scalar()
            
            # Volume do merchant
            volume = db.query(func.sum(GatewayPayment.amount_requested)).filter(
                GatewayPayment.merchant_id == merchant.id,
                GatewayPayment.status == GatewayPaymentStatus.COMPLETED
            ).scalar()
            
            result.append({
                "id": str(merchant.id),
                "user_id": str(merchant.user_id),
                "user_email": user.email if user else None,
                "company_name": merchant.company_name,
                "trade_name": merchant.trade_name,
                "cnpj": merchant.cnpj,
                "email": merchant.email,
                "phone": merchant.phone,
                "website": merchant.website,
                "owner_name": merchant.owner_name,
                "status": merchant.status.value,
                "fee_percentage": float(merchant.fee_percentage),
                "payment_count": payment_count or 0,
                "total_volume": float(volume or 0),
                "created_at": merchant.created_at.isoformat(),
                "approved_at": merchant.approved_at.isoformat() if merchant.approved_at else None,
                "approved_by": str(merchant.approved_by) if merchant.approved_by else None
            })
        
        return {
            "merchants": result,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar merchants: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/merchants/pending")
async def list_pending_merchants(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista merchants pendentes de aprovação.
    
    Apenas admins podem acessar.
    """
    return await list_merchants(
        status_filter=MerchantStatus.PENDING,
        search=None,
        page=page,
        per_page=per_page,
        db=db,
        current_user=current_user
    )


@router.get("/merchants/{merchant_id}")
async def get_merchant_detail(
    merchant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna detalhes de um merchant específico.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id
        ).first()
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant não encontrado"
            )
        
        # Buscar usuário
        user = db.query(User).filter(User.id == merchant.user_id).first()
        
        # API Keys
        api_keys = db.query(GatewayApiKey).filter(
            GatewayApiKey.merchant_id == merchant.id
        ).all()
        
        # Pagamentos recentes
        recent_payments = db.query(GatewayPayment).filter(
            GatewayPayment.merchant_id == merchant.id
        ).order_by(GatewayPayment.created_at.desc()).limit(10).all()
        
        # Estatísticas
        stats = db.query(
            func.count(GatewayPayment.id).label('total_payments'),
            func.sum(GatewayPayment.amount_requested).label('total_volume'),
            func.sum(GatewayPayment.fee_amount).label('total_fees')
        ).filter(
            GatewayPayment.merchant_id == merchant.id,
            GatewayPayment.status == GatewayPaymentStatus.COMPLETED
        ).first()
        
        # Audit logs
        audit_logs = db.query(GatewayAuditLog).filter(
            GatewayAuditLog.merchant_id == merchant.id
        ).order_by(GatewayAuditLog.created_at.desc()).limit(20).all()
        
        return {
            "merchant": {
                "id": str(merchant.id),
                "user_id": str(merchant.user_id),
                "user_email": user.email if user else None,
                "company_name": merchant.company_name,
                "trade_name": merchant.trade_name,
                "cnpj": merchant.cnpj,
                "email": merchant.email,
                "phone": merchant.phone,
                "website": merchant.website,
                "owner_name": merchant.owner_name,
                "owner_cpf": merchant.owner_cpf,
                "owner_email": merchant.owner_email,
                "owner_phone": merchant.owner_phone,
                "zip_code": merchant.zip_code,
                "street": merchant.street,
                "number": merchant.number,
                "complement": merchant.complement,
                "neighborhood": merchant.neighborhood,
                "city": merchant.city,
                "state": merchant.state,
                "status": merchant.status.value,
                "fee_percentage": float(merchant.fee_percentage),
                "settlement_currency": merchant.settlement_currency.value if merchant.settlement_currency else None,
                "settlement_wallet_address": merchant.settlement_wallet_address,
                "settlement_wallet_network": merchant.settlement_wallet_network,
                "bank_pix_key": merchant.bank_pix_key,
                "bank_pix_key_type": merchant.bank_pix_key_type,
                "logo_url": merchant.logo_url,
                "primary_color": merchant.primary_color,
                "webhook_url": merchant.webhook_url,
                "created_at": merchant.created_at.isoformat(),
                "approved_at": merchant.approved_at.isoformat() if merchant.approved_at else None,
                "approved_by": str(merchant.approved_by) if merchant.approved_by else None,
                "suspended_at": merchant.suspended_at.isoformat() if merchant.suspended_at else None,
                "suspended_by": str(merchant.suspended_by) if merchant.suspended_by else None,
                "suspended_reason": merchant.suspended_reason
            },
            "api_keys": [
                {
                    "id": str(key.id),
                    "name": key.name,
                    "key_prefix": key.key_prefix,
                    "is_test": key.is_test,
                    "is_active": key.is_active,
                    "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
                    "total_requests": key.total_requests,
                    "created_at": key.created_at.isoformat()
                }
                for key in api_keys
            ],
            "recent_payments": [
                {
                    "id": str(p.id),
                    "payment_code": p.payment_code,
                    "amount": float(p.amount),
                    "currency": p.currency,
                    "status": p.status.value,
                    "payment_method": p.payment_method.value if p.payment_method else None,
                    "created_at": p.created_at.isoformat()
                }
                for p in recent_payments
            ],
            "stats": {
                "total_payments": stats.total_payments or 0,
                "total_volume": float(stats.total_volume or 0),
                "total_fees": float(stats.total_fees or 0)
            },
            "audit_logs": [
                {
                    "id": str(log.id),
                    "action": log.action,
                    "old_data": log.old_data,
                    "new_data": log.new_data,
                    "ip_address": log.ip_address,
                    "created_at": log.created_at.isoformat()
                }
                for log in audit_logs
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter detalhes do merchant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==========================================
# AÇÕES DE ADMIN
# ==========================================

@router.put("/merchants/{merchant_id}/approve")
async def approve_merchant(
    merchant_id: UUID,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aprova um merchant pendente.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        merchant_service = MerchantService(db)
        
        merchant = await merchant_service.approve_merchant(
            merchant_id=merchant_id,
            actor_id=str(current_user.id),
            notes=notes
        )
        
        logger.info(f"Merchant {merchant_id} aprovado por admin {current_user.id}")
        
        return {
            "success": True,
            "message": "Merchant aprovado com sucesso",
            "merchant_id": str(merchant.id),
            "status": merchant.status.value
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao aprovar merchant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/merchants/{merchant_id}/suspend")
async def suspend_merchant(
    merchant_id: UUID,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Suspende um merchant.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        merchant_service = MerchantService(db)
        
        merchant = await merchant_service.suspend_merchant(
            merchant_id=str(merchant_id),
            admin_id=str(current_user.id),
            reason=reason
        )
        
        logger.info(f"Merchant {merchant_id} suspenso por admin {current_user.id}: {reason}")
        
        return {
            "success": True,
            "message": "Merchant suspenso com sucesso",
            "merchant_id": str(merchant.id),
            "status": merchant.status.value,
            "reason": reason
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao suspender merchant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/merchants/{merchant_id}/block")
async def block_merchant(
    merchant_id: UUID,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bloqueia um merchant permanentemente.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        merchant_service = MerchantService(db)
        
        merchant = await merchant_service.block_merchant(
            merchant_id=str(merchant_id),
            admin_id=str(current_user.id),
            reason=reason
        )
        
        logger.info(f"Merchant {merchant_id} bloqueado por admin {current_user.id}: {reason}")
        
        return {
            "success": True,
            "message": "Merchant bloqueado com sucesso",
            "merchant_id": str(merchant.id),
            "status": merchant.status.value,
            "reason": reason
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Erro ao bloquear merchant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/merchants/{merchant_id}/reactivate")
async def reactivate_merchant(
    merchant_id: UUID,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reativa um merchant suspenso.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id
        ).first()
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant não encontrado"
            )
        
        if merchant.status == MerchantStatus.BLOCKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Merchant bloqueado não pode ser reativado"
            )
        
        if merchant.status == MerchantStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Merchant já está ativo"
            )
        
        # Reativar
        merchant.status = MerchantStatus.ACTIVE
        merchant.suspended_at = None
        merchant.suspended_by = None
        merchant.suspended_reason = None
        
        # Log de auditoria
        audit_service = AuditService(db)
        await audit_service.log(
            merchant_id=merchant.id,
            actor_id=str(current_user.id),
            action="merchant.reactivated",
            new_data={"notes": notes}
        )
        
        db.commit()
        
        logger.info(f"Merchant {merchant_id} reativado por admin {current_user.id}")
        
        return {
            "success": True,
            "message": "Merchant reativado com sucesso",
            "merchant_id": str(merchant.id),
            "status": merchant.status.value
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao reativar merchant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/merchants/{merchant_id}/fee")
async def update_merchant_fee(
    merchant_id: UUID,
    fee_percentage: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza a taxa do merchant.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        if fee_percentage < 0 or fee_percentage > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Taxa deve estar entre 0 e 100"
            )
        
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id
        ).first()
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant não encontrado"
            )
        
        old_fee = float(merchant.fee_percentage)
        merchant.fee_percentage = Decimal(str(fee_percentage))
        
        # Log de auditoria
        audit_service = AuditService(db)
        await audit_service.log(
            merchant_id=merchant.id,
            actor_id=str(current_user.id),
            action="merchant.fee_updated",
            old_data={"fee_percentage": old_fee},
            new_data={"fee_percentage": fee_percentage}
        )
        
        db.commit()
        
        logger.info(f"Taxa do merchant {merchant_id} alterada de {old_fee}% para {fee_percentage}% por admin {current_user.id}")
        
        return {
            "success": True,
            "message": "Taxa atualizada com sucesso",
            "merchant_id": str(merchant.id),
            "old_fee": old_fee,
            "new_fee": fee_percentage
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar taxa do merchant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ==========================================
# PAGAMENTOS
# ==========================================

@router.get("/payments")
async def list_all_payments(
    merchant_id: Optional[UUID] = None,
    status_filter: Optional[GatewayPaymentStatus] = Query(None, alias="status"),
    method: Optional[GatewayPaymentMethod] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos os pagamentos do gateway.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        query = db.query(GatewayPayment)
        
        # Filtros
        if merchant_id:
            query = query.filter(GatewayPayment.merchant_id == merchant_id)
        
        if status_filter:
            query = query.filter(GatewayPayment.status == status_filter)
        
        if method:
            query = query.filter(GatewayPayment.payment_method == method)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    GatewayPayment.payment_code.ilike(search_term),
                    GatewayPayment.customer_email.ilike(search_term),
                    GatewayPayment.customer_name.ilike(search_term)
                )
            )
        
        if date_from:
            query = query.filter(GatewayPayment.created_at >= date_from)
        
        if date_to:
            query = query.filter(GatewayPayment.created_at <= date_to)
        
        # Contagem total
        total = query.count()
        
        # Paginação
        offset = (page - 1) * per_page
        payments = query.order_by(GatewayPayment.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Formatar resultado
        result = []
        for p in payments:
            merchant = db.query(GatewayMerchant).filter(
                GatewayMerchant.id == p.merchant_id
            ).first()
            
            result.append({
                "id": str(p.id),
                "payment_code": p.payment_code,
                "merchant_id": str(p.merchant_id),
                "merchant_name": merchant.company_name if merchant else None,
                "amount": float(p.amount),
                "currency": p.currency,
                "net_amount": float(p.net_amount) if p.net_amount else None,
                "fee_amount": float(p.fee_amount) if p.fee_amount else None,
                "status": p.status.value,
                "payment_method": p.payment_method.value if p.payment_method else None,
                "customer_name": p.customer_name,
                "customer_email": p.customer_email,
                "description": p.description,
                "created_at": p.created_at.isoformat(),
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                "expires_at": p.expires_at.isoformat() if p.expires_at else None
            })
        
        return {
            "payments": result,
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar pagamentos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/payments/{payment_id}")
async def get_payment_detail(
    payment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna detalhes de um pagamento específico.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    try:
        payment = db.query(GatewayPayment).filter(
            GatewayPayment.id == payment_id
        ).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pagamento não encontrado"
            )
        
        # Buscar merchant
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == payment.merchant_id
        ).first()
        
        # Buscar webhooks enviados
        webhooks = db.query(GatewayWebhook).filter(
            GatewayWebhook.payment_id == payment.id
        ).order_by(GatewayWebhook.created_at.desc()).all()
        
        return {
            "payment": {
                "id": str(payment.id),
                "payment_code": payment.payment_code,
                "checkout_token": payment.checkout_token,
                "merchant_id": str(payment.merchant_id),
                "merchant_name": merchant.company_name if merchant else None,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "net_amount": float(payment.net_amount) if payment.net_amount else None,
                "fee_amount": float(payment.fee_amount) if payment.fee_amount else None,
                "fee_percentage": float(payment.fee_percentage) if payment.fee_percentage else None,
                "status": payment.status.value,
                "payment_method": payment.payment_method.value if payment.payment_method else None,
                "customer_name": payment.customer_name,
                "customer_email": payment.customer_email,
                "customer_document": payment.customer_document,
                "description": payment.description,
                "pix_txid": payment.pix_txid,
                "pix_qrcode": payment.pix_qrcode,
                "crypto_address": payment.crypto_address,
                "crypto_amount": payment.crypto_amount,
                "crypto_currency": payment.crypto_currency,
                "crypto_network": payment.crypto_network,
                "crypto_tx_hash": payment.crypto_tx_hash,
                "success_url": payment.success_url,
                "cancel_url": payment.cancel_url,
                "callback_url": payment.callback_url,
                "metadata": payment.metadata,
                "created_at": payment.created_at.isoformat(),
                "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
                "expires_at": payment.expires_at.isoformat() if payment.expires_at else None,
                "cancelled_at": payment.cancelled_at.isoformat() if payment.cancelled_at else None,
                "refunded_at": payment.refunded_at.isoformat() if payment.refunded_at else None
            },
            "webhooks": [
                {
                    "id": str(w.id),
                    "event": w.event.value if w.event else None,
                    "url": w.url,
                    "status_code": w.status_code,
                    "attempts": w.attempts,
                    "next_retry": w.next_retry.isoformat() if w.next_retry else None,
                    "created_at": w.created_at.isoformat()
                }
                for w in webhooks
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter detalhes do pagamento: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
