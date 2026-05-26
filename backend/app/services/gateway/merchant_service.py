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
        Retorna estatísticas do merchant.
        
        IMPORTANTE: Retorna nomes de campos COMPATÍVEIS com o frontend
        (total_volume, total_transactions, completed_payments, etc.) e
        também os nomes legados (total_completed, total_volume_brl) para
        retrocompatibilidade com integrações antigas.
        
        Considera como "pago" tanto status COMPLETED quanto CONFIRMED
        (pagamento foi recebido mas ainda não foi liquidado ao merchant).
        """
        from app.models.gateway import (
            GatewayPayment,
            GatewayPaymentStatus,
            GatewayPaymentMethod,
        )
        from datetime import timedelta
        
        merchant = await self.get_merchant_by_id(merchant_id)
        if not merchant:
            raise ValueError("Merchant não encontrado")
        
        # Statuses que contam como "pago" (recebido pelo gateway)
        PAID_STATUSES = [
            GatewayPaymentStatus.CONFIRMED,
            GatewayPaymentStatus.COMPLETED,
        ]
        
        # Query base (todo o histórico, ignorando filtro de período para totais gerais)
        base_query = self.db.query(GatewayPayment).filter(
            GatewayPayment.merchant_id == merchant_id
        )
        
        # Query filtrada pelo período (se informado)
        query = base_query
        if date_from:
            query = query.filter(GatewayPayment.created_at >= date_from)
        if date_to:
            query = query.filter(GatewayPayment.created_at <= date_to)
        
        # Totais por status
        total_payments = query.count()
        total_completed = query.filter(
            GatewayPayment.status.in_(PAID_STATUSES)
        ).count()
        total_pending = query.filter(
            GatewayPayment.status.in_([
                GatewayPaymentStatus.PENDING,
                GatewayPaymentStatus.PROCESSING,
            ])
        ).count()
        total_expired = query.filter(
            GatewayPayment.status == GatewayPaymentStatus.EXPIRED
        ).count()
        total_failed = query.filter(
            GatewayPayment.status.in_([
                GatewayPaymentStatus.FAILED,
                GatewayPaymentStatus.CANCELLED,
            ])
        ).count()
        
        # Pagamentos pagos (para somas)
        paid_payments = query.filter(
            GatewayPayment.status.in_(PAID_STATUSES)
        ).all()
        
        # Pagamentos pendentes (para "pending_volume")
        pending_payments_list = query.filter(
            GatewayPayment.status.in_([
                GatewayPaymentStatus.PENDING,
                GatewayPaymentStatus.PROCESSING,
            ])
        ).all()
        
        # Valores
        total_volume = sum(
            p.amount_requested or Decimal('0') for p in paid_payments
        ) if paid_payments else Decimal('0')
        
        total_fees = sum(
            p.fee_amount or Decimal('0') for p in paid_payments
        ) if paid_payments else Decimal('0')
        
        total_settled = sum(
            p.settlement_amount or Decimal('0') 
            for p in paid_payments 
            if p.settlement_status == 'completed'
        ) if paid_payments else Decimal('0')
        
        pending_settlement = sum(
            p.settlement_amount or Decimal('0')
            for p in paid_payments
            if p.settlement_status != 'completed'
        ) if paid_payments else Decimal('0')
        
        pending_volume = sum(
            p.amount_requested or Decimal('0') for p in pending_payments_list
        ) if pending_payments_list else Decimal('0')
        
        net_volume = total_volume - total_fees
        
        # Por método de pagamento
        pix_payments_count = sum(
            1 for p in paid_payments
            if p.payment_method == GatewayPaymentMethod.PIX
        )
        crypto_payments_count = sum(
            1 for p in paid_payments
            if p.payment_method == GatewayPaymentMethod.CRYPTO
        )
        pix_volume = sum(
            p.amount_requested or Decimal('0') for p in paid_payments
            if p.payment_method == GatewayPaymentMethod.PIX
        ) if paid_payments else Decimal('0')
        crypto_volume = sum(
            p.amount_requested or Decimal('0') for p in paid_payments
            if p.payment_method == GatewayPaymentMethod.CRYPTO
        ) if paid_payments else Decimal('0')
        
        # Taxa de sucesso (% de aprovados sobre total)
        success_rate = (
            (total_completed / total_payments) * 100
            if total_payments > 0 else 0.0
        )
        
        # Percentuais por método
        pix_percentage = (
            (pix_payments_count / total_completed) * 100
            if total_completed > 0 else 0.0
        )
        crypto_percentage = (
            (crypto_payments_count / total_completed) * 100
            if total_completed > 0 else 0.0
        )
        
        # Stats de hoje (no fuso UTC)
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        today_query = base_query.filter(
            GatewayPayment.created_at >= today_start
        )
        today_paid = today_query.filter(
            GatewayPayment.status.in_(PAID_STATUSES)
        ).all()
        today_payments = len(today_paid)
        today_volume = sum(
            p.amount_requested or Decimal('0') for p in today_paid
        ) if today_paid else Decimal('0')
        
        # Stats do mês corrente
        month_start = today_start.replace(day=1)
        month_query = base_query.filter(
            GatewayPayment.created_at >= month_start
        )
        month_paid = month_query.filter(
            GatewayPayment.status.in_(PAID_STATUSES)
        ).all()
        this_month_payments = len(month_paid)
        this_month_volume = sum(
            p.amount_requested or Decimal('0') for p in month_paid
        ) if month_paid else Decimal('0')
        
        # Comparação com período anterior (mesmo tamanho)
        if date_from and date_to:
            period_size = date_to - date_from
            prev_start = date_from - period_size
            prev_end = date_from
            prev_query = base_query.filter(
                GatewayPayment.created_at >= prev_start,
                GatewayPayment.created_at < prev_end,
            )
            prev_paid = prev_query.filter(
                GatewayPayment.status.in_(PAID_STATUSES)
            ).all()
            prev_volume = sum(
                p.amount_requested or Decimal('0') for p in prev_paid
            ) if prev_paid else Decimal('0')
            prev_count = len(prev_paid)
            
            volume_change = (
                float(((total_volume - prev_volume) / prev_volume) * 100)
                if prev_volume > 0 else 0.0
            )
            transactions_change = (
                ((total_completed - prev_count) / prev_count) * 100
                if prev_count > 0 else 0.0
            )
        else:
            volume_change = 0.0
            transactions_change = 0.0
        
        return {
            "merchant_id": merchant_id,
            "merchant_code": merchant.merchant_code,
            
            # === Campos compatíveis com o frontend (nomes "novos") ===
            "total_volume": float(total_volume),
            "total_transactions": total_completed,
            "total_payments": total_payments,
            "completed_payments": total_completed,
            "pending_payments": total_pending,
            "failed_payments": total_failed,
            "expired_payments": total_expired,
            
            "total_volume_brl": float(total_volume),
            "total_fees_brl": float(total_fees),
            "net_volume_brl": float(net_volume),
            "pending_volume": float(pending_volume),
            
            "today_payments": today_payments,
            "today_transactions": today_payments,
            "today_volume_brl": float(today_volume),
            "today_volume": float(today_volume),
            
            "this_month_payments": this_month_payments,
            "this_month_volume_brl": float(this_month_volume),
            
            "success_rate": round(success_rate, 2),
            "volume_change": round(volume_change, 2),
            "transactions_change": round(transactions_change, 2),
            
            "pix_percentage": round(pix_percentage, 2),
            "crypto_percentage": round(crypto_percentage, 2),
            "pix_volume_brl": float(pix_volume),
            "crypto_volume_brl": float(crypto_volume),
            "pix_payments": pix_payments_count,
            "crypto_payments": crypto_payments_count,
            
            # === Campos legados (mantidos para compatibilidade) ===
            "total_completed": total_completed,
            "total_pending": total_pending,
            "total_expired": total_expired,
            "total_failed": total_failed,
            "total_fees_collected": float(total_fees),
            "total_settled": float(total_settled),
            "pending_settlement": float(pending_settlement),
            
            # === Período ===
            "period_start": date_from.isoformat() if date_from else None,
            "period_end": date_to.isoformat() if date_to else None,
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
