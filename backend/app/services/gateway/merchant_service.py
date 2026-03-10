"""
🏪 WolkPay Gateway - Merchant Service
======================================

Gerenciamento de merchants (empresas) no Gateway.

Features:
- Cadastro de novos merchants
- Ativação/suspensão de merchants
- Atualização de dados e configurações
- Consulta de merchants

Author: HOLD Wallet Team
Date: January 2026
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.gateway import (
    GatewayMerchant,
    MerchantStatus,
    GatewayAuditLog,
    GatewayAuditAction,
    SettlementCurrency
)
from app.schemas.gateway import (
    MerchantCreate,
    MerchantUpdate,
    MerchantResponse,
    AdminMerchantUpdate
)

logger = logging.getLogger(__name__)


class MerchantService:
    """
    Serviço para gerenciamento de merchants no Gateway
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ===================================
    # CRUD OPERATIONS
    # ===================================
    
    async def create_merchant(
        self,
        data: MerchantCreate,
        actor_id: Optional[str] = None,
        actor_type: str = "system"
    ) -> Tuple[GatewayMerchant, str]:
        """
        Cria um novo merchant
        
        Returns:
            Tuple[GatewayMerchant, str]: (merchant, webhook_secret)
        """
        logger.info(f"📦 Criando merchant: {data.company_name} ({data.cnpj})")
        
        # Verificar se CNPJ já existe
        existing = self.db.query(GatewayMerchant).filter(
            GatewayMerchant.cnpj == data.cnpj
        ).first()
        
        if existing:
            raise ValueError(f"CNPJ {data.cnpj} já cadastrado")
        
        # Gerar código único do merchant
        merchant_code = GatewayMerchant.generate_merchant_code()
        while self.db.query(GatewayMerchant).filter(
            GatewayMerchant.merchant_code == merchant_code
        ).first():
            merchant_code = GatewayMerchant.generate_merchant_code()
        
        # Gerar webhook secret
        webhook_secret = GatewayMerchant.generate_webhook_secret()
        
        # Obter próximo hd_index
        max_hd = self.db.query(func.max(GatewayMerchant.hd_index)).scalar() or 0
        next_hd_index = max_hd + 1
        
        # Criar merchant
        merchant = GatewayMerchant(
            merchant_code=merchant_code,
            company_name=data.company_name,
            trade_name=data.trade_name,
            cnpj=data.cnpj,
            email=data.email,
            phone=data.phone,
            website=data.website,
            owner_name=data.owner_name,
            owner_cpf=data.owner_cpf,
            owner_email=data.owner_email,
            owner_phone=data.owner_phone,
            zip_code=data.zip_code,
            street=data.street,
            number=data.number,
            complement=data.complement,
            neighborhood=data.neighborhood,
            city=data.city,
            state=data.state,
            settlement_currency=data.settlement_currency,
            settlement_wallet_address=data.settlement_wallet_address,
            settlement_wallet_network=data.settlement_wallet_network,
            bank_pix_key=data.bank_pix_key,
            bank_pix_key_type=data.bank_pix_key_type,
            logo_url=data.logo_url,
            primary_color=data.primary_color,
            webhook_url=data.webhook_url,
            webhook_secret=webhook_secret,
            webhook_events=["payment.confirmed", "payment.completed", "payment.expired", "payment.failed"],
            hd_index=next_hd_index,
            status=MerchantStatus.PENDING
        )
        
        self.db.add(merchant)
        self.db.flush()
        
        # Criar log de auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant.id,
            actor_type=actor_type,
            actor_id=actor_id,
            action=GatewayAuditAction.MERCHANT_CREATED,
            description=f"Merchant {merchant.merchant_code} criado",
            new_data={
                "merchant_code": merchant.merchant_code,
                "company_name": merchant.company_name,
                "cnpj": merchant.cnpj,
                "email": merchant.email
            }
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(merchant)
        
        logger.info(f"✅ Merchant criado: {merchant.merchant_code}")
        
        return merchant, webhook_secret
    
    async def get_merchant_by_id(self, merchant_id: str) -> Optional[GatewayMerchant]:
        """Busca merchant por ID"""
        return self.db.query(GatewayMerchant).filter(
            GatewayMerchant.id == merchant_id
        ).first()
    
    async def get_merchant_by_code(self, merchant_code: str) -> Optional[GatewayMerchant]:
        """Busca merchant por código"""
        return self.db.query(GatewayMerchant).filter(
            GatewayMerchant.merchant_code == merchant_code
        ).first()
    
    async def get_merchant_by_cnpj(self, cnpj: str) -> Optional[GatewayMerchant]:
        """Busca merchant por CNPJ"""
        cnpj_clean = ''.join(c for c in cnpj if c.isdigit())
        return self.db.query(GatewayMerchant).filter(
            GatewayMerchant.cnpj == cnpj_clean
        ).first()
    
    async def update_merchant(
        self,
        merchant_id: str,
        data: MerchantUpdate,
        actor_id: Optional[str] = None,
        actor_type: str = "merchant"
    ) -> GatewayMerchant:
        """Atualiza dados do merchant"""
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        # Guardar dados antigos para auditoria
        old_data = {
            "trade_name": merchant.trade_name,
            "phone": merchant.phone,
            "website": merchant.website,
            "webhook_url": merchant.webhook_url
        }
        
        # Atualizar campos
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(merchant, field):
                setattr(merchant, field, value)
        
        # Criar log de auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant.id,
            actor_type=actor_type,
            actor_id=actor_id,
            action=GatewayAuditAction.MERCHANT_UPDATED,
            description=f"Merchant {merchant.merchant_code} atualizado",
            old_data=old_data,
            new_data=update_data
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(merchant)
        
        logger.info(f"✅ Merchant atualizado: {merchant.merchant_code}")
        
        return merchant
    
    async def list_merchants(
        self,
        status: Optional[MerchantStatus] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[GatewayMerchant], int]:
        """
        Lista merchants com filtros
        
        Returns:
            Tuple[List[GatewayMerchant], int]: (merchants, total)
        """
        query = self.db.query(GatewayMerchant)
        
        # Filtrar por status
        if status:
            query = query.filter(GatewayMerchant.status == status)
        
        # Busca por texto
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    GatewayMerchant.company_name.ilike(search_pattern),
                    GatewayMerchant.trade_name.ilike(search_pattern),
                    GatewayMerchant.cnpj.ilike(search_pattern),
                    GatewayMerchant.email.ilike(search_pattern),
                    GatewayMerchant.merchant_code.ilike(search_pattern)
                )
            )
        
        # Total
        total = query.count()
        
        # Paginação
        offset = (page - 1) * per_page
        merchants = query.order_by(
            GatewayMerchant.created_at.desc()
        ).offset(offset).limit(per_page).all()
        
        return merchants, total
    
    # ===================================
    # ADMIN OPERATIONS
    # ===================================
    
    async def activate_merchant(
        self,
        merchant_id: str,
        admin_id: str,
        notes: Optional[str] = None
    ) -> GatewayMerchant:
        """Ativa um merchant (admin)"""
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        if merchant.status == MerchantStatus.ACTIVE:
            raise ValueError("Merchant já está ativo")
        
        old_status = merchant.status
        merchant.status = MerchantStatus.ACTIVE
        merchant.activated_at = datetime.now(timezone.utc)
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant.id,
            actor_type="admin",
            actor_id=admin_id,
            action=GatewayAuditAction.MERCHANT_ACTIVATED,
            description=f"Merchant {merchant.merchant_code} ativado por admin",
            old_data={"status": old_status.value},
            new_data={"status": MerchantStatus.ACTIVE.value, "notes": notes}
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(merchant)
        
        logger.info(f"✅ Merchant ativado: {merchant.merchant_code} por admin {admin_id}")
        
        return merchant
    
    async def suspend_merchant(
        self,
        merchant_id: str,
        admin_id: str,
        reason: str
    ) -> GatewayMerchant:
        """Suspende um merchant (admin)"""
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        old_status = merchant.status
        merchant.status = MerchantStatus.SUSPENDED
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant.id,
            actor_type="admin",
            actor_id=admin_id,
            action=GatewayAuditAction.MERCHANT_SUSPENDED,
            description=f"Merchant {merchant.merchant_code} suspenso: {reason}",
            old_data={"status": old_status.value},
            new_data={"status": MerchantStatus.SUSPENDED.value, "reason": reason}
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(merchant)
        
        logger.warning(f"⚠️ Merchant suspenso: {merchant.merchant_code} - {reason}")
        
        return merchant
    
    async def block_merchant(
        self,
        merchant_id: str,
        admin_id: str,
        reason: str
    ) -> GatewayMerchant:
        """Bloqueia um merchant (admin) - geralmente por fraude"""
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        old_status = merchant.status
        merchant.status = MerchantStatus.BLOCKED
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant.id,
            actor_type="admin",
            actor_id=admin_id,
            action=GatewayAuditAction.MERCHANT_BLOCKED,
            description=f"Merchant {merchant.merchant_code} BLOQUEADO: {reason}",
            old_data={"status": old_status.value},
            new_data={"status": MerchantStatus.BLOCKED.value, "reason": reason}
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(merchant)
        
        logger.error(f"🚫 Merchant BLOQUEADO: {merchant.merchant_code} - {reason}")
        
        return merchant
    
    async def update_merchant_admin(
        self,
        merchant_id: str,
        data: AdminMerchantUpdate,
        admin_id: str
    ) -> GatewayMerchant:
        """Atualiza dados do merchant (admin - incluindo taxas e limites)"""
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        old_data = {
            "custom_fee_percent": str(merchant.custom_fee_percent) if merchant.custom_fee_percent else None,
            "daily_limit_brl": str(merchant.daily_limit_brl),
            "monthly_limit_brl": str(merchant.monthly_limit_brl)
        }
        
        update_data = data.model_dump(exclude_unset=True, exclude_none=True)
        
        for field, value in update_data.items():
            if hasattr(merchant, field):
                setattr(merchant, field, value)
        
        # Se mudou status
        if data.status and data.status != merchant.status:
            if data.status == MerchantStatus.ACTIVE:
                merchant.activated_at = datetime.now(timezone.utc)
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant.id,
            actor_type="admin",
            actor_id=admin_id,
            action=GatewayAuditAction.MERCHANT_UPDATED,
            description=f"Merchant {merchant.merchant_code} atualizado por admin",
            old_data=old_data,
            new_data={k: str(v) if isinstance(v, Decimal) else v for k, v in update_data.items()}
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(merchant)
        
        logger.info(f"✅ Merchant atualizado (admin): {merchant.merchant_code}")
        
        return merchant
    
    # ===================================
    # WEBHOOK OPERATIONS
    # ===================================
    
    async def update_webhook_config(
        self,
        merchant_id: str,
        webhook_url: str,
        webhook_events: List[str],
        actor_id: Optional[str] = None
    ) -> Tuple[GatewayMerchant, str]:
        """
        Atualiza configuração de webhook do merchant
        
        Returns:
            Tuple[GatewayMerchant, str]: (merchant, new_webhook_secret)
        """
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        # Gerar novo secret
        new_secret = GatewayMerchant.generate_webhook_secret()
        
        old_data = {
            "webhook_url": merchant.webhook_url,
            "webhook_events": merchant.webhook_events
        }
        
        merchant.webhook_url = webhook_url
        merchant.webhook_events = webhook_events
        merchant.webhook_secret = new_secret
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant.id,
            actor_type="merchant",
            actor_id=actor_id,
            action=GatewayAuditAction.WEBHOOK_CONFIGURED,
            description=f"Webhook configurado para {webhook_url}",
            old_data=old_data,
            new_data={
                "webhook_url": webhook_url,
                "webhook_events": webhook_events
            }
        )
        self.db.add(audit_log)
        
        self.db.commit()
        self.db.refresh(merchant)
        
        logger.info(f"✅ Webhook configurado: {merchant.merchant_code} -> {webhook_url}")
        
        return merchant, new_secret
    
    async def regenerate_webhook_secret(
        self,
        merchant_id: str,
        actor_id: Optional[str] = None
    ) -> str:
        """
        Regenera o webhook secret do merchant
        
        Returns:
            str: Novo webhook secret
        """
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        new_secret = GatewayMerchant.generate_webhook_secret()
        merchant.webhook_secret = new_secret
        
        # Auditoria
        audit_log = GatewayAuditLog(
            merchant_id=merchant.id,
            actor_type="merchant",
            actor_id=actor_id,
            action=GatewayAuditAction.WEBHOOK_CONFIGURED,
            description="Webhook secret regenerado"
        )
        self.db.add(audit_log)
        
        self.db.commit()
        
        logger.info(f"🔑 Webhook secret regenerado: {merchant.merchant_code}")
        
        return new_secret
    
    # ===================================
    # STATS & REPORTING
    # ===================================
    
    async def get_merchant_stats(
        self,
        merchant_id: str,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Retorna estatísticas do merchant
        """
        from app.models.gateway import GatewayPayment, GatewayPaymentStatus
        
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        # Query base
        query = self.db.query(GatewayPayment).filter(
            GatewayPayment.merchant_id == merchant_id
        )
        
        # Filtrar por período
        if date_from:
            query = query.filter(GatewayPayment.created_at >= date_from)
        if date_to:
            query = query.filter(GatewayPayment.created_at <= date_to)
        
        # Totais por status
        total_payments = query.count()
        total_completed = query.filter(
            GatewayPayment.status == GatewayPaymentStatus.COMPLETED
        ).count()
        total_pending = query.filter(
            GatewayPayment.status == GatewayPaymentStatus.PENDING
        ).count()
        total_expired = query.filter(
            GatewayPayment.status == GatewayPaymentStatus.EXPIRED
        ).count()
        total_failed = query.filter(
            GatewayPayment.status == GatewayPaymentStatus.FAILED
        ).count()
        
        # Valores
        completed_payments = query.filter(
            GatewayPayment.status == GatewayPaymentStatus.COMPLETED
        ).all()
        
        total_volume = sum(
            p.amount_requested for p in completed_payments
        ) if completed_payments else Decimal('0')
        
        total_fees = sum(
            p.fee_amount or Decimal('0') for p in completed_payments
        ) if completed_payments else Decimal('0')
        
        total_settled = sum(
            p.settlement_amount or Decimal('0') 
            for p in completed_payments 
            if p.settlement_status == 'completed'
        ) if completed_payments else Decimal('0')
        
        pending_settlement = sum(
            p.settlement_amount or Decimal('0')
            for p in completed_payments
            if p.settlement_status != 'completed'
        ) if completed_payments else Decimal('0')
        
        return {
            "merchant_id": merchant_id,
            "merchant_code": merchant.merchant_code,
            "total_payments": total_payments,
            "total_completed": total_completed,
            "total_pending": total_pending,
            "total_expired": total_expired,
            "total_failed": total_failed,
            "total_volume_brl": str(total_volume),
            "total_fees_collected": str(total_fees),
            "total_settled": str(total_settled),
            "pending_settlement": str(pending_settlement),
            "period_start": date_from.isoformat() if date_from else None,
            "period_end": date_to.isoformat() if date_to else None
        }
    
    async def check_daily_limit(
        self,
        merchant_id: str,
        amount: Decimal
    ) -> Tuple[bool, Decimal]:
        """
        Verifica se o merchant pode processar mais pagamentos hoje
        
        Returns:
            Tuple[bool, Decimal]: (can_process, remaining_limit)
        """
        from app.models.gateway import GatewayPayment, GatewayPaymentStatus
        
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        # Início do dia (UTC)
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        
        # Total processado hoje
        today_volume = self.db.query(
            func.sum(GatewayPayment.amount_requested)
        ).filter(
            and_(
                GatewayPayment.merchant_id == merchant_id,
                GatewayPayment.created_at >= today_start,
                GatewayPayment.status.in_([
                    GatewayPaymentStatus.PENDING,
                    GatewayPaymentStatus.PROCESSING,
                    GatewayPaymentStatus.CONFIRMED,
                    GatewayPaymentStatus.COMPLETED
                ])
            )
        ).scalar() or Decimal('0')
        
        remaining = merchant.daily_limit_brl - today_volume
        can_process = (today_volume + amount) <= merchant.daily_limit_brl
        
        return can_process, remaining
