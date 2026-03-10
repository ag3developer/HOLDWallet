"""
📋 WolkPay Gateway - Audit Service
===================================

Serviço de auditoria para compliance e tracking.

Features:
- Registro de todas as ações
- Consulta de logs
- Relatórios de auditoria

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.gateway import (
    GatewayAuditLog,
    GatewayAuditAction
)

logger = logging.getLogger(__name__)


class AuditService:
    """
    Serviço de auditoria do Gateway
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ===================================
    # LOG CREATION
    # ===================================
    
    async def log(
        self,
        action: GatewayAuditAction,
        actor_type: str = "system",
        actor_id: Optional[str] = None,
        actor_email: Optional[str] = None,
        merchant_id: Optional[str] = None,
        payment_id: Optional[str] = None,
        api_key_id: Optional[str] = None,
        description: Optional[str] = None,
        old_data: Optional[Dict[str, Any]] = None,
        new_data: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> GatewayAuditLog:
        """
        Registra uma ação de auditoria
        
        Args:
            action: Tipo da ação (enum)
            actor_type: Tipo do ator (system, admin, merchant, api)
            actor_id: ID do ator (user_id, admin_id)
            actor_email: Email do ator
            merchant_id: ID do merchant relacionado
            payment_id: ID do payment relacionado
            api_key_id: ID da API key usada
            description: Descrição da ação
            old_data: Dados anteriores (para updates)
            new_data: Novos dados
            ip_address: IP de origem
            user_agent: User agent do cliente
            request_id: ID da requisição (para correlação)
        """
        audit_log = GatewayAuditLog(
            action=action,
            actor_type=actor_type,
            actor_id=actor_id,
            actor_email=actor_email,
            merchant_id=merchant_id,
            payment_id=payment_id,
            api_key_id=api_key_id,
            description=description,
            old_data=old_data,
            new_data=new_data,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id
        )
        
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        
        logger.debug(f"📋 Audit log: {action.value} - {description}")
        
        return audit_log
    
    # ===================================
    # CONVENIENCE METHODS
    # ===================================
    
    async def log_merchant_created(
        self,
        merchant_id: str,
        merchant_code: str,
        company_name: str,
        actor_id: Optional[str] = None,
        actor_type: str = "system",
        ip_address: Optional[str] = None
    ) -> GatewayAuditLog:
        """Log de criação de merchant"""
        return await self.log(
            action=GatewayAuditAction.MERCHANT_CREATED,
            actor_type=actor_type,
            actor_id=actor_id,
            merchant_id=merchant_id,
            description=f"Merchant {merchant_code} criado",
            new_data={
                "merchant_code": merchant_code,
                "company_name": company_name
            },
            ip_address=ip_address
        )
    
    async def log_payment_created(
        self,
        merchant_id: str,
        payment_id: str,
        payment_db_id: str,
        amount: str,
        method: str,
        api_key_id: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> GatewayAuditLog:
        """Log de criação de pagamento"""
        return await self.log(
            action=GatewayAuditAction.PAYMENT_CREATED,
            actor_type="api",
            merchant_id=merchant_id,
            payment_id=payment_db_id,
            api_key_id=api_key_id,
            description=f"Pagamento {payment_id} criado - {method}",
            new_data={
                "payment_id": payment_id,
                "amount": amount,
                "method": method
            },
            ip_address=ip_address
        )
    
    async def log_payment_confirmed(
        self,
        merchant_id: str,
        payment_db_id: str,
        payment_id: str,
        amount_received: str,
        tx_info: Optional[Dict[str, Any]] = None
    ) -> GatewayAuditLog:
        """Log de confirmação de pagamento"""
        return await self.log(
            action=GatewayAuditAction.PAYMENT_CONFIRMED,
            actor_type="system",
            merchant_id=merchant_id,
            payment_id=payment_db_id,
            description=f"Pagamento {payment_id} confirmado - R$ {amount_received}",
            new_data={
                "payment_id": payment_id,
                "amount_received": amount_received,
                **(tx_info or {})
            }
        )
    
    async def log_payment_completed(
        self,
        merchant_id: str,
        payment_db_id: str,
        payment_id: str,
        settlement_amount: str
    ) -> GatewayAuditLog:
        """Log de pagamento completado"""
        return await self.log(
            action=GatewayAuditAction.PAYMENT_COMPLETED,
            actor_type="system",
            merchant_id=merchant_id,
            payment_id=payment_db_id,
            description=f"Pagamento {payment_id} completado",
            new_data={
                "payment_id": payment_id,
                "settlement_amount": settlement_amount
            }
        )
    
    async def log_api_key_created(
        self,
        merchant_id: str,
        api_key_id: str,
        key_name: str,
        key_prefix: str,
        is_test: bool,
        actor_id: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> GatewayAuditLog:
        """Log de criação de API key"""
        return await self.log(
            action=GatewayAuditAction.API_KEY_CREATED,
            actor_type="merchant",
            actor_id=actor_id,
            merchant_id=merchant_id,
            api_key_id=api_key_id,
            description=f"API Key '{key_name}' criada",
            new_data={
                "name": key_name,
                "prefix": key_prefix,
                "is_test": is_test
            },
            ip_address=ip_address
        )
    
    async def log_api_key_revoked(
        self,
        merchant_id: str,
        api_key_id: str,
        key_name: str,
        reason: Optional[str] = None,
        actor_id: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> GatewayAuditLog:
        """Log de revogação de API key"""
        return await self.log(
            action=GatewayAuditAction.API_KEY_REVOKED,
            actor_type="merchant",
            actor_id=actor_id,
            merchant_id=merchant_id,
            api_key_id=api_key_id,
            description=f"API Key '{key_name}' revogada: {reason}",
            new_data={
                "name": key_name,
                "reason": reason
            },
            ip_address=ip_address
        )
    
    # ===================================
    # QUERIES
    # ===================================
    
    async def list_logs(
        self,
        merchant_id: Optional[str] = None,
        payment_id: Optional[str] = None,
        action: Optional[GatewayAuditAction] = None,
        actor_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        per_page: int = 50
    ) -> Tuple[List[GatewayAuditLog], int]:
        """
        Lista logs de auditoria com filtros
        
        Returns:
            Tuple[List[GatewayAuditLog], int]: (logs, total)
        """
        query = self.db.query(GatewayAuditLog)
        
        if merchant_id:
            query = query.filter(GatewayAuditLog.merchant_id == merchant_id)
        
        if payment_id:
            query = query.filter(GatewayAuditLog.payment_id == payment_id)
        
        if action:
            query = query.filter(GatewayAuditLog.action == action)
        
        if actor_type:
            query = query.filter(GatewayAuditLog.actor_type == actor_type)
        
        if date_from:
            query = query.filter(GatewayAuditLog.created_at >= date_from)
        
        if date_to:
            query = query.filter(GatewayAuditLog.created_at <= date_to)
        
        total = query.count()
        
        offset = (page - 1) * per_page
        logs = query.order_by(
            GatewayAuditLog.created_at.desc()
        ).offset(offset).limit(per_page).all()
        
        return logs, total
    
    async def get_merchant_activity(
        self,
        merchant_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Retorna resumo de atividade do merchant
        """
        from datetime import timedelta
        
        date_from = datetime.now(timezone.utc) - timedelta(days=days)
        
        logs, total = await self.list_logs(
            merchant_id=merchant_id,
            date_from=date_from,
            per_page=1000
        )
        
        # Contar por ação
        action_counts: Dict[str, int] = {}
        for log in logs:
            action_name = log.action.value
            action_counts[action_name] = action_counts.get(action_name, 0) + 1
        
        return {
            "merchant_id": merchant_id,
            "period_days": days,
            "total_actions": total,
            "action_breakdown": action_counts
        }
