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
    MerchantStatus, GatewayPaymentStatus, GatewayPaymentMethod,
    GatewayAuditAction, SettlementCurrency
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
        
        # Processar cada merchant
        result = []
        for merchant in merchants:
            # Contar pagamentos do merchant
            payment_count = db.query(func.count(GatewayPayment.id)).filter(
                GatewayPayment.merchant_id == merchant.id
            ).scalar()
            
            # Volume do merchant
            volume = db.query(func.sum(GatewayPayment.amount_requested)).filter(
                GatewayPayment.merchant_id == merchant.id,
                GatewayPayment.status == GatewayPaymentStatus.COMPLETED
            ).scalar()
            
            # Contar API keys do merchant
            api_keys_count = db.query(func.count(GatewayApiKey.id)).filter(
                GatewayApiKey.merchant_id == merchant.id,
                GatewayApiKey.is_active == True
            ).scalar() or 0
            
            result.append({
                "id": str(merchant.id),
                "owner_email": merchant.owner_email,  # Email do responsável pela empresa
                "company_name": merchant.company_name,
                "trade_name": merchant.trade_name,
                "cnpj": merchant.cnpj,
                "email": merchant.email,
                "phone": merchant.phone,
                "website": merchant.website,
                "owner_name": merchant.owner_name,
                "merchant_code": merchant.merchant_code,
                "status": merchant.status.value,
                "fee_percentage": float(merchant.custom_fee_percent or 0),
                "daily_limit": float(merchant.daily_limit_brl or 0),
                "monthly_limit": float(merchant.monthly_limit_brl or 0),
                "payment_count": payment_count or 0,
                "total_transactions": payment_count or 0,  # Alias para frontend
                "total_volume": float(volume or 0),
                "api_keys_count": api_keys_count,
                "created_at": merchant.created_at.isoformat() if merchant.created_at else None,
                "activated_at": merchant.activated_at.isoformat() if merchant.activated_at else None
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
    
    # Converter UUID para string pois o campo no DB é VARCHAR(36)
    merchant_id_str = str(merchant_id)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant não encontrado"
            )
        
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
                "merchant_code": merchant.merchant_code,
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
                "fee_percentage": float(merchant.custom_fee_percent or 0),
                "custom_fee_percent": float(merchant.custom_fee_percent or 0),
                "daily_limit_brl": float(merchant.daily_limit_brl or 0),
                "monthly_limit_brl": float(merchant.monthly_limit_brl or 0),
                "min_payment_brl": float(merchant.min_payment_brl or 10),
                "max_payment_brl": float(merchant.max_payment_brl or 50000),
                "auto_settlement": getattr(merchant, 'auto_settlement', True),
                "settlement_currency": merchant.settlement_currency.value if merchant.settlement_currency else None,
                "settlement_wallet_address": merchant.settlement_wallet_address,
                "settlement_wallet_network": merchant.settlement_wallet_network,
                "bank_pix_key": merchant.bank_pix_key,
                "bank_pix_key_type": merchant.bank_pix_key_type,
                "logo_url": merchant.logo_url,
                "primary_color": merchant.primary_color,
                "webhook_url": merchant.webhook_url,
                "created_at": merchant.created_at.isoformat(),
                "activated_at": merchant.activated_at.isoformat() if merchant.activated_at else None,
                "approved_at": merchant.activated_at.isoformat() if merchant.activated_at else None,
                "approved_by": None,
                "suspended_at": None,
                "suspended_by": None,
                "suspended_reason": None
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
                    "payment_code": p.payment_id,
                    "amount": float(p.amount_requested or 0),
                    "currency": p.currency_requested,
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
                    "action": log.action.value if hasattr(log.action, 'value') else str(log.action),
                    "description": log.description,
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
        
        # Converter UUID para string pois o campo no DB é VARCHAR(36)
        merchant = await merchant_service.activate_merchant(
            merchant_id=str(merchant_id),
            admin_id=str(current_user.id),
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
    
    # Converter UUID para string pois o campo no DB é VARCHAR(36)
    merchant_id_str = str(merchant_id)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
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
            action=GatewayAuditAction.MERCHANT_ACTIVATED,
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
    
    # Converter UUID para string pois o campo no DB é VARCHAR(36)
    merchant_id_str = str(merchant_id)
    
    try:
        if fee_percentage < 0 or fee_percentage > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Taxa deve estar entre 0 e 100"
            )
        
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant não encontrado"
            )
        
        old_fee = float(merchant.custom_fee_percent or 0)
        merchant.custom_fee_percent = Decimal(str(fee_percentage))
        
        # Log de auditoria
        audit_service = AuditService(db)
        await audit_service.log(
            merchant_id=merchant.id,
            actor_id=str(current_user.id),
            action=GatewayAuditAction.MERCHANT_UPDATED,
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


@router.put("/merchants/{merchant_id}/settings")
async def update_merchant_settings(
    merchant_id: UUID,
    settings: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza configurações completas do merchant.
    
    Campos permitidos:
    - custom_fee_percent: Taxa personalizada (0-100)
    - daily_limit_brl: Limite diário em BRL
    - monthly_limit_brl: Limite mensal em BRL
    - settlement_currency: Moeda de settlement (BRL, USDT, BTC, ETH)
    - settlement_wallet_address: Endereço da carteira para settlement
    - bank_pix_key: Chave PIX para recebimento
    - bank_pix_key_type: Tipo da chave PIX (CPF, CNPJ, EMAIL, PHONE, EVP)
    - webhook_url: URL para callbacks
    - logo_url: URL do logo
    - primary_color: Cor primária (HEX)
    - auto_settlement: Settlement automático
    - min_payment_brl: Valor mínimo de pagamento
    - max_payment_brl: Valor máximo de pagamento
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    # Converter UUID para string pois o campo no DB é VARCHAR(36)
    merchant_id_str = str(merchant_id)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant não encontrado"
            )
        
        old_data = {}
        new_data = {}
        
        # Lista de campos permitidos e seus validadores
        allowed_fields = {
            'custom_fee_percent': lambda x: 0 <= x <= 100,
            'daily_limit_brl': lambda x: x >= 0,
            'monthly_limit_brl': lambda x: x >= 0,
            'settlement_currency': lambda x: x in ['BRL', 'USDT', 'ORIGINAL', None],
            'settlement_wallet_address': lambda x: True,
            'bank_pix_key': lambda x: True,
            'bank_pix_key_type': lambda x: x in ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP', None],
            'webhook_url': lambda x: True,
            'logo_url': lambda x: True,
            'primary_color': lambda x: True,
            'auto_settlement': lambda x: isinstance(x, bool),
            'min_payment_brl': lambda x: x >= 0,
            'max_payment_brl': lambda x: x >= 0,
        }
        
        for field, validator in allowed_fields.items():
            if field in settings:
                value = settings[field]
                
                # Normalizar strings vazias para None
                if isinstance(value, str) and value.strip() == '':
                    value = None
                    settings[field] = None
                
                # Validar o valor
                if value is not None and not validator(value):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Valor inválido para {field}"
                    )
                
                # Salvar dados antigos
                old_value = getattr(merchant, field, None)
                if old_value is not None and hasattr(old_value, 'value'):
                    old_data[field] = old_value.value
                elif isinstance(old_value, Decimal):
                    old_data[field] = float(old_value)
                else:
                    old_data[field] = old_value
                
                # Converter para Decimal se necessário
                if field in ['custom_fee_percent', 'daily_limit_brl', 'monthly_limit_brl', 'min_payment_brl', 'max_payment_brl']:
                    if value is not None:
                        value = Decimal(str(value))
                
                # Converter settlement_currency string para enum
                if field == 'settlement_currency' and value is not None:
                    try:
                        value = SettlementCurrency(value)
                    except ValueError:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Valor inválido para settlement_currency: {value}"
                        )
                
                # Atualizar o campo
                setattr(merchant, field, value)
                # Guardar valor JSON-safe para new_data
                raw = settings[field]
                if isinstance(raw, Decimal):
                    new_data[field] = float(raw)
                elif hasattr(raw, 'value'):
                    new_data[field] = raw.value
                else:
                    new_data[field] = raw
        
        # Garantir que old_data e new_data sao JSON-safe
        def _json_safe(obj):
            if isinstance(obj, dict):
                return {k: _json_safe(v) for k, v in obj.items()}
            if isinstance(obj, Decimal):
                return float(obj)
            if hasattr(obj, 'value') and not isinstance(obj, (bool, int, float, str)):
                return obj.value
            return obj
        
        old_data = _json_safe(old_data)
        new_data = _json_safe(new_data)
        
        # Log de auditoria
        audit_service = AuditService(db)
        await audit_service.log(
            merchant_id=merchant.id,
            actor_id=str(current_user.id),
            action=GatewayAuditAction.MERCHANT_SETTINGS_UPDATED,
            old_data=old_data,
            new_data=new_data
        )
        
        db.commit()
        db.refresh(merchant)
        
        logger.info(f"Configurações do merchant {merchant_id} atualizadas por admin {current_user.id}")
        
        # Retornar merchant atualizado
        return {
            "success": True,
            "message": "Configurações atualizadas com sucesso",
            "merchant": {
                "id": str(merchant.id),
                "company_name": merchant.company_name,
                "status": merchant.status.value,
                "custom_fee_percent": float(merchant.custom_fee_percent) if merchant.custom_fee_percent else 0,
                "daily_limit_brl": float(merchant.daily_limit_brl) if merchant.daily_limit_brl else 0,
                "monthly_limit_brl": float(merchant.monthly_limit_brl) if merchant.monthly_limit_brl else 0,
                "settlement_currency": merchant.settlement_currency.value if merchant.settlement_currency else None,
                "settlement_wallet_address": merchant.settlement_wallet_address,
                "bank_pix_key": merchant.bank_pix_key,
                "bank_pix_key_type": merchant.bank_pix_key_type,
                "webhook_url": merchant.webhook_url,
                "logo_url": merchant.logo_url,
                "primary_color": merchant.primary_color,
                "auto_settlement": getattr(merchant, 'auto_settlement', True),
                "min_payment_brl": float(merchant.min_payment_brl) if getattr(merchant, 'min_payment_brl', None) else 0,
                "max_payment_brl": float(merchant.max_payment_brl) if getattr(merchant, 'max_payment_brl', None) else 0,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao atualizar configurações do merchant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/merchants/{merchant_id}/summary")
async def get_merchant_summary(
    merchant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna resumo financeiro de um merchant.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    # Converter UUID para string pois o campo no DB é VARCHAR(36)
    merchant_id_str = str(merchant_id)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant não encontrado"
            )
        
        # Estatísticas de pagamentos
        stats = db.query(
            func.count(GatewayPayment.id).label('total_payments'),
            func.sum(GatewayPayment.amount_requested).label('total_volume'),
            func.sum(GatewayPayment.fee_amount).label('total_fees'),
            func.max(GatewayPayment.created_at).label('last_payment_date')
        ).filter(
            GatewayPayment.merchant_id == merchant.id,
            GatewayPayment.status == GatewayPaymentStatus.COMPLETED
        ).first()
        
        # Settlement pendente
        pending_settlement = db.query(
            func.sum(GatewayPayment.settlement_amount)
        ).filter(
            GatewayPayment.merchant_id == merchant.id,
            GatewayPayment.status == GatewayPaymentStatus.COMPLETED,
            GatewayPayment.settled_at == None
        ).scalar() or 0
        
        return {
            "merchant_id": str(merchant.id),
            "total_volume_brl": float(stats.total_volume or 0),
            "total_payments": stats.total_payments or 0,
            "total_fees_brl": float(stats.total_fees or 0),
            "pending_settlement_brl": float(pending_settlement),
            "last_payment_date": stats.last_payment_date.isoformat() if stats.last_payment_date else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter resumo do merchant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/merchants/{merchant_id}/payments")
async def get_merchant_payments(
    merchant_id: UUID,
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
    Lista pagamentos de um merchant específico.
    
    Apenas admins podem acessar.
    """
    require_admin(current_user)
    
    # Converter UUID para string pois o campo no DB é VARCHAR(36)
    merchant_id_str = str(merchant_id)
    
    try:
        # Verificar se merchant existe
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant não encontrado"
            )
        
        query = db.query(GatewayPayment).filter(
            GatewayPayment.merchant_id == merchant_id_str
        )
        
        # Filtros
        if status_filter:
            query = query.filter(GatewayPayment.status == status_filter)
        
        if method:
            query = query.filter(GatewayPayment.payment_method == method)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    GatewayPayment.payment_id.ilike(search_term),
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
            result.append({
                "id": str(p.id),
                "payment_id": p.payment_id,
                "external_id": p.external_id,
                "amount": float(p.amount_requested or 0),
                "currency": p.currency_requested,
                "status": p.status.value,
                "payment_method": p.payment_method.value if p.payment_method else None,
                "customer_email": p.customer_email,
                "customer_name": p.customer_name,
                "fee_amount": float(p.fee_amount or 0),
                "settlement_amount": float(p.settlement_amount or 0),
                "created_at": p.created_at.isoformat(),
                "confirmed_at": p.confirmed_at.isoformat() if p.confirmed_at else None,
                "completed_at": p.completed_at.isoformat() if p.completed_at else None
            })
        
        return {
            "payments": result,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar pagamentos do merchant: {e}")
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
                "amount": float(p.amount_requested),
                "currency": p.currency_requested,
                "net_amount": float(p.settlement_amount) if p.settlement_amount else None,
                "fee_amount": float(p.fee_amount) if p.fee_amount else None,
                "status": p.status.value,
                "payment_method": p.payment_method.value if p.payment_method else None,
                "customer_name": p.customer_name,
                "customer_email": p.customer_email,
                "description": p.description,
                "created_at": p.created_at.isoformat(),
                "completed_at": p.completed_at.isoformat() if p.completed_at else None,
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
                "amount": float(payment.amount_requested),
                "currency": payment.currency_requested,
                "net_amount": float(payment.settlement_amount) if payment.settlement_amount else None,
                "fee_amount": float(payment.fee_amount) if payment.fee_amount else None,
                "fee_percentage": float(payment.fee_percent) if payment.fee_percent else None,
                "status": payment.status.value,
                "payment_method": payment.payment_method.value if payment.payment_method else None,
                "customer_name": payment.customer_name,
                "customer_email": payment.customer_email,
                "customer_document": payment.customer_document,
                "description": payment.description,
                "pix_txid": payment.pix_txid,
                "pix_qrcode": payment.pix_qrcode,
                "crypto_address": payment.crypto_address,
                "crypto_amount": float(payment.crypto_amount) if payment.crypto_amount else None,
                "crypto_currency": payment.crypto_currency,
                "crypto_network": payment.crypto_network,
                "crypto_tx_hash": payment.crypto_tx_hash,
                "success_url": payment.success_url,
                "cancel_url": payment.cancel_url,
                "extra_data": payment.extra_data,
                "created_at": payment.created_at.isoformat(),
                "confirmed_at": payment.confirmed_at.isoformat() if payment.confirmed_at else None,
                "completed_at": payment.completed_at.isoformat() if payment.completed_at else None,
                "expires_at": payment.expires_at.isoformat() if payment.expires_at else None
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


# ==========================================
# API KEYS MANAGEMENT
# ==========================================

@router.get("/merchants/{merchant_id}/api-keys")
async def list_merchant_api_keys(
    merchant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todas as API Keys de um merchant.
    """
    require_admin(current_user)
    merchant_id_str = str(merchant_id)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant nao encontrado")
        
        keys = db.query(GatewayApiKey).filter(
            GatewayApiKey.merchant_id == merchant_id_str
        ).order_by(GatewayApiKey.created_at.desc()).all()
        
        return {
            "api_keys": [
                {
                    "id": str(k.id),
                    "name": k.name,
                    "description": k.description,
                    "key_prefix": k.key_prefix,
                    "is_test": k.is_test,
                    "is_active": k.is_active,
                    "permissions": k.permissions,
                    "allowed_ips": k.allowed_ips,
                    "rate_limit_per_minute": k.rate_limit_per_minute,
                    "rate_limit_per_hour": k.rate_limit_per_hour,
                    "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                    "last_used_ip": k.last_used_ip,
                    "total_requests": k.total_requests or 0,
                    "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                    "revoked_at": k.revoked_at.isoformat() if k.revoked_at else None,
                    "revoked_reason": k.revoked_reason,
                    "created_at": k.created_at.isoformat(),
                }
                for k in keys
            ],
            "total": len(keys)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar API keys: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/merchants/{merchant_id}/api-keys")
async def create_merchant_api_key(
    merchant_id: UUID,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria uma nova API Key para o merchant.
    Body: { name, description?, is_test? }
    """
    require_admin(current_user)
    merchant_id_str = str(merchant_id)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant nao encontrado")
        
        name = body.get("name", "Nova API Key")
        description = body.get("description")
        is_test = body.get("is_test", False)
        
        full_key, prefix, key_hash = GatewayApiKey.generate_api_key(is_test=is_test)
        
        api_key = GatewayApiKey(
            merchant_id=merchant_id_str,
            name=name,
            description=description,
            key_prefix=prefix,
            key_hash=key_hash,
            is_test=is_test,
        )
        db.add(api_key)
        
        audit_service = AuditService(db)
        await audit_service.log(
            merchant_id=merchant_id_str,
            actor_id=str(current_user.id),
            action=GatewayAuditAction.API_KEY_CREATED,
            new_data={"name": name, "is_test": is_test, "prefix": prefix}
        )
        
        db.commit()
        db.refresh(api_key)
        
        return {
            "success": True,
            "message": "API Key criada com sucesso",
            "api_key": {
                "id": str(api_key.id),
                "name": api_key.name,
                "key_prefix": api_key.key_prefix,
                "full_key": full_key,
                "is_test": api_key.is_test,
                "created_at": api_key.created_at.isoformat(),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao criar API key: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/merchants/{merchant_id}/api-keys/{key_id}/revoke")
async def revoke_merchant_api_key(
    merchant_id: UUID,
    key_id: UUID,
    body: dict = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Revoga uma API Key do merchant.
    Body: { reason? }
    """
    require_admin(current_user)
    merchant_id_str = str(merchant_id)
    key_id_str = str(key_id)
    
    try:
        api_key = db.query(GatewayApiKey).filter(
            GatewayApiKey.id == key_id_str,
            GatewayApiKey.merchant_id == merchant_id_str
        ).first()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API Key nao encontrada")
        
        if not api_key.is_active:
            raise HTTPException(status_code=400, detail="API Key ja esta revogada")
        
        reason = (body or {}).get("reason", "Revogada pelo admin")
        
        api_key.is_active = False
        api_key.revoked_at = datetime.now(timezone.utc)
        api_key.revoked_reason = reason
        
        audit_service = AuditService(db)
        await audit_service.log(
            merchant_id=merchant_id_str,
            actor_id=str(current_user.id),
            action=GatewayAuditAction.API_KEY_REVOKED,
            old_data={"key_prefix": api_key.key_prefix, "is_active": True},
            new_data={"is_active": False, "reason": reason}
        )
        
        db.commit()
        
        return {
            "success": True,
            "message": "API Key revogada com sucesso"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao revogar API key: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# WEBHOOKS HISTORY
# ==========================================

@router.get("/merchants/{merchant_id}/webhooks")
async def list_merchant_webhooks(
    merchant_id: UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    event_filter: Optional[str] = Query(None, alias="event"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista historico de webhooks enviados para um merchant.
    """
    require_admin(current_user)
    merchant_id_str = str(merchant_id)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant nao encontrado")
        
        query = db.query(GatewayWebhook).filter(
            GatewayWebhook.merchant_id == merchant_id_str
        )
        
        if status_filter:
            query = query.filter(GatewayWebhook.status == status_filter)
        
        if event_filter:
            query = query.filter(GatewayWebhook.event == event_filter)
        
        total = query.count()
        offset = (page - 1) * per_page
        webhooks = query.order_by(GatewayWebhook.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Stats summary
        stats = {
            "total_sent": db.query(func.count(GatewayWebhook.id)).filter(
                GatewayWebhook.merchant_id == merchant_id_str,
                GatewayWebhook.status == "SENT"
            ).scalar() or 0,
            "total_failed": db.query(func.count(GatewayWebhook.id)).filter(
                GatewayWebhook.merchant_id == merchant_id_str,
                GatewayWebhook.status.in_(["FAILED", "EXHAUSTED"])
            ).scalar() or 0,
            "total_pending": db.query(func.count(GatewayWebhook.id)).filter(
                GatewayWebhook.merchant_id == merchant_id_str,
                GatewayWebhook.status == "PENDING"
            ).scalar() or 0,
        }
        
        result = []
        for w in webhooks:
            payment = db.query(GatewayPayment).filter(
                GatewayPayment.id == w.payment_id
            ).first()
            
            result.append({
                "id": str(w.id),
                "payment_id": str(w.payment_id),
                "payment_code": payment.payment_id if payment else None,
                "event": w.event.value if hasattr(w.event, 'value') else str(w.event),
                "url": w.url,
                "status": w.status.value if hasattr(w.status, 'value') else str(w.status),
                "attempts": w.attempts,
                "max_attempts": w.max_attempts,
                "last_response_code": w.last_response_code,
                "last_error": w.last_error,
                "next_attempt_at": w.next_attempt_at.isoformat() if w.next_attempt_at else None,
                "created_at": w.created_at.isoformat(),
                "sent_at": w.sent_at.isoformat() if w.sent_at else None,
            })
        
        return {
            "webhooks": result,
            "stats": stats,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar webhooks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# AUDIT LOGS
# ==========================================

@router.get("/merchants/{merchant_id}/audit-logs")
async def list_merchant_audit_logs(
    merchant_id: UUID,
    action_filter: Optional[str] = Query(None, alias="action"),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista logs de auditoria de um merchant com filtros e paginacao.
    """
    require_admin(current_user)
    merchant_id_str = str(merchant_id)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant nao encontrado")
        
        query = db.query(GatewayAuditLog).filter(
            GatewayAuditLog.merchant_id == merchant_id_str
        )
        
        if action_filter:
            query = query.filter(GatewayAuditLog.action == action_filter)
        
        total = query.count()
        offset = (page - 1) * per_page
        logs = query.order_by(GatewayAuditLog.created_at.desc()).offset(offset).limit(per_page).all()
        
        result = []
        for log in logs:
            result.append({
                "id": str(log.id),
                "action": log.action.value if hasattr(log.action, 'value') else str(log.action),
                "actor_type": log.actor_type,
                "actor_id": log.actor_id,
                "actor_email": log.actor_email,
                "description": log.description,
                "old_data": log.old_data,
                "new_data": log.new_data,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "request_id": log.request_id,
                "payment_id": log.payment_id,
                "api_key_id": log.api_key_id,
                "created_at": log.created_at.isoformat(),
            })
        
        return {
            "audit_logs": result,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# CUSTOMERS / PAYERS
# ==========================================

@router.get("/merchants/{merchant_id}/customers")
async def list_merchant_customers(
    merchant_id: UUID,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista clientes/pagadores unicos de um merchant.
    Agrupa por customer_email com totais.
    """
    require_admin(current_user)
    merchant_id_str = str(merchant_id)
    
    try:
        merchant = db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id_str
        ).first()
        
        if not merchant:
            raise HTTPException(status_code=404, detail="Merchant nao encontrado")
        
        # Subquery para agregar por customer_email
        base_query = db.query(
            GatewayPayment.customer_email,
            func.max(GatewayPayment.customer_name).label('customer_name'),
            func.max(GatewayPayment.customer_phone).label('customer_phone'),
            func.max(GatewayPayment.customer_document).label('customer_document'),
            func.count(GatewayPayment.id).label('total_payments'),
            func.sum(GatewayPayment.amount_requested).label('total_amount'),
            func.max(GatewayPayment.created_at).label('last_payment_at'),
            func.min(GatewayPayment.created_at).label('first_payment_at'),
        ).filter(
            GatewayPayment.merchant_id == merchant_id_str,
            GatewayPayment.customer_email != None,
            GatewayPayment.customer_email != '',
        )
        
        if search:
            search_term = f"%{search}%"
            base_query = base_query.filter(
                or_(
                    GatewayPayment.customer_email.ilike(search_term),
                    GatewayPayment.customer_name.ilike(search_term),
                    GatewayPayment.customer_document.ilike(search_term),
                )
            )
        
        base_query = base_query.group_by(GatewayPayment.customer_email)
        
        # Total de clientes unicos
        total_subquery = base_query.subquery()
        total = db.query(func.count()).select_from(total_subquery).scalar() or 0
        
        # Paginacao
        offset = (page - 1) * per_page
        customers = base_query.order_by(
            func.max(GatewayPayment.created_at).desc()
        ).offset(offset).limit(per_page).all()
        
        result = []
        for c in customers:
            # Contar pagamentos concluidos
            completed = db.query(func.count(GatewayPayment.id)).filter(
                GatewayPayment.merchant_id == merchant_id_str,
                GatewayPayment.customer_email == c.customer_email,
                GatewayPayment.status == GatewayPaymentStatus.COMPLETED,
            ).scalar() or 0
            
            result.append({
                "email": c.customer_email,
                "name": c.customer_name,
                "phone": c.customer_phone,
                "document": c.customer_document,
                "total_payments": c.total_payments,
                "completed_payments": completed,
                "total_amount": float(c.total_amount or 0),
                "last_payment_at": c.last_payment_at.isoformat() if c.last_payment_at else None,
                "first_payment_at": c.first_payment_at.isoformat() if c.first_payment_at else None,
            })
        
        # Summary stats
        total_customers_all = db.query(
            func.count(func.distinct(GatewayPayment.customer_email))
        ).filter(
            GatewayPayment.merchant_id == merchant_id_str,
            GatewayPayment.customer_email != None,
            GatewayPayment.customer_email != '',
        ).scalar() or 0
        
        return {
            "customers": result,
            "total": total,
            "total_unique_customers": total_customers_all,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar clientes do merchant: {e}")
        raise HTTPException(status_code=500, detail=str(e))
