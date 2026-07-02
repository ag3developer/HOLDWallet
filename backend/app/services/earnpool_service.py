"""
💰 EarnPool - Service Layer
============================

Lógica de negócios do EarnPool.
Gerencia depósitos, saques, cálculo de rendimentos.

Author: WolkNow Team
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, List, Tuple
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import logging
import uuid

from app.models.earnpool import (
    EarnPoolConfig, EarnPoolDeposit, EarnPoolWithdrawal,
    EarnPoolYield, EarnPoolYieldDistribution,
    DepositStatus, WithdrawalStatus, YieldStatus
)
from app.models.user import User
from app.schemas.earnpool import (
    DepositRequest, DepositPreviewResponse, DepositConfirmRequest, DepositResponse,
    WithdrawalRequest, WithdrawalPreviewResponse, WithdrawalConfirmRequest, WithdrawalResponse,
    EarnPoolBalanceResponse, EarnPoolHistoryResponse, YieldHistoryItem,
    ProcessYieldsRequest, ProcessYieldsResponse, AdminPoolOverviewResponse
)

def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Garante que datetime tem timezone UTC (converte naive para aware)"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

logger = logging.getLogger(__name__)


class EarnPoolService:
    """
    Serviço principal do EarnPool
    
    Responsabilidades:
    - Gerenciar depósitos e saques
    - Calcular e distribuir rendimentos
    - Validar regras de negócio
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================================
    # CONFIG
    # =========================================================================
    
    def get_active_config(self) -> Optional[EarnPoolConfig]:
        """Retorna a configuração ativa do EarnPool"""
        return self.db.query(EarnPoolConfig).filter(
            EarnPoolConfig.is_active == True
        ).first()
    
    def get_or_create_config(self) -> EarnPoolConfig:
        """Retorna config ativa ou cria uma padrão"""
        config = self.get_active_config()
        if not config:
            config = EarnPoolConfig(
                id=str(uuid.uuid4()),
                min_deposit_usdt=Decimal("50.00"),
                lock_period_days=30,
                withdrawal_delay_days=7,
                early_withdrawal_admin_fee=Decimal("2.00"),
                early_withdrawal_op_fee=Decimal("1.00"),
                target_weekly_yield_percentage=Decimal("0.75"),
                is_active=True,
                is_accepting_deposits=True
            )
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
            logger.info("✅ EarnPool config created with defaults")
        return config
    
    def update_config(self, updates: dict, admin_id: str) -> EarnPoolConfig:
        """Atualiza configuração (cria nova versão)"""
        old_config = self.get_active_config()
        
        # Desativa config antiga
        if old_config:
            old_config.is_active = False
        
        # Cria nova config
        new_config = EarnPoolConfig(
            id=str(uuid.uuid4()),
            min_deposit_usdt=updates.get('min_deposit_usdt', old_config.min_deposit_usdt if old_config else Decimal("50.00")),
            max_deposit_usdt=updates.get('max_deposit_usdt', old_config.max_deposit_usdt if old_config else None),
            lock_period_days=updates.get('lock_period_days', old_config.lock_period_days if old_config else 30),
            withdrawal_delay_days=updates.get('withdrawal_delay_days', old_config.withdrawal_delay_days if old_config else 7),
            early_withdrawal_admin_fee=updates.get('early_withdrawal_admin_fee', old_config.early_withdrawal_admin_fee if old_config else Decimal("2.00")),
            early_withdrawal_op_fee=updates.get('early_withdrawal_op_fee', old_config.early_withdrawal_op_fee if old_config else Decimal("1.00")),
            target_weekly_yield_percentage=updates.get('target_weekly_yield_percentage', old_config.target_weekly_yield_percentage if old_config else Decimal("0.75")),
            max_pool_size_usdt=updates.get('max_pool_size_usdt', old_config.max_pool_size_usdt if old_config else None),
            is_accepting_deposits=updates.get('is_accepting_deposits', old_config.is_accepting_deposits if old_config else True),
            is_active=True,
            created_by=admin_id,
            notes=updates.get('notes')
        )
        
        self.db.add(new_config)
        self.db.commit()
        self.db.refresh(new_config)
        
        logger.info(f"✅ EarnPool config updated by admin {admin_id}")
        return new_config
    
    # =========================================================================
    # DEPOSIT
    # =========================================================================
    
    async def preview_deposit(
        self,
        user_id: str,
        crypto_symbol: str,
        crypto_amount: Decimal,
        crypto_price_usd: Decimal
    ) -> DepositPreviewResponse:
        """
        Preview do depósito antes de confirmar
        
        Args:
            user_id: ID do usuário
            crypto_symbol: Símbolo da crypto (BTC, ETH, etc.)
            crypto_amount: Quantidade a depositar
            crypto_price_usd: Preço atual em USD
        
        Returns:
            Preview com valores calculados
        """
        config = self.get_or_create_config()
        
        # Calcular equivalente em USDT
        usdt_equivalent = crypto_amount * crypto_price_usd
        
        # Verificar mínimo
        meets_minimum = usdt_equivalent >= config.min_deposit_usdt
        
        # Calcular data de fim do lock
        lock_ends_at = datetime.now(timezone.utc) + timedelta(days=config.lock_period_days)
        
        message = None
        if not meets_minimum:
            message = f"Depósito mínimo é ${config.min_deposit_usdt} USDT. Seu depósito equivale a ${usdt_equivalent:.2f}"
        elif not config.is_accepting_deposits:
            message = "O EarnPool não está aceitando novos depósitos no momento"
        
        return DepositPreviewResponse(
            crypto_symbol=crypto_symbol,
            crypto_amount=crypto_amount,
            crypto_price_usd=crypto_price_usd,
            usdt_equivalent=usdt_equivalent,
            meets_minimum=meets_minimum,
            minimum_required=config.min_deposit_usdt,
            lock_period_days=config.lock_period_days,
            lock_ends_at=lock_ends_at,
            message=message
        )
    
    async def create_deposit(
        self,
        user_id: str,
        crypto_symbol: str,
        crypto_amount: Decimal,
        crypto_price_usd: Decimal,
        tx_hash: Optional[str] = None
    ) -> EarnPoolDeposit:
        """
        Cria um novo depósito no EarnPool
        
        Fluxo:
        1. Valida requisitos (mínimo, pool aberto)
        2. Calcula valor em USDT
        3. Cria registro do depósito
        4. Status: LOCKED (dentro do período mínimo)
        """
        config = self.get_or_create_config()
        
        # Validações
        if not config.is_accepting_deposits:
            raise ValueError("EarnPool não está aceitando depósitos no momento")
        
        usdt_amount = crypto_amount * crypto_price_usd
        
        if usdt_amount < config.min_deposit_usdt:
            raise ValueError(f"Depósito mínimo é ${config.min_deposit_usdt} USDT")
        
        max_deposit = getattr(config, 'max_deposit_usdt', None)
        if max_deposit is not None and usdt_amount > max_deposit:
            raise ValueError(f"Depósito máximo é ${max_deposit} USDT")

        # Verificar tamanho do pool
        max_pool_size = getattr(config, "max_pool_size_usdt", None)
        if max_pool_size:
            current_pool = self._get_total_pool_balance()
            if current_pool + usdt_amount > max_pool_size:
                raise ValueError("Pool atingiu capacidade máxima")

        # Calcular data de fim do lock
        now = datetime.now(timezone.utc)
        lock_ends_at = now + timedelta(days=config.lock_period_days)

        # Criar depósito
        deposit = EarnPoolDeposit(
            id=str(uuid.uuid4()),
            user_id=user_id,
            original_crypto_symbol=crypto_symbol.upper(),
            original_crypto_amount=crypto_amount,
            original_crypto_price_usd=crypto_price_usd,
            usdt_amount=usdt_amount,
            total_yield_earned=Decimal("0"),
            deposited_at=now,
            lock_ends_at=lock_ends_at,
            status=DepositStatus.LOCKED,
            tx_hash_in=tx_hash
        )

        self.db.add(deposit)
        self.db.commit()
        self.db.refresh(deposit)

        logger.info(f"✅ EarnPool deposit created: {deposit.id} - User {user_id} - ${usdt_amount} USDT")
        return deposit

    # =========================================================================
    # WITHDRAWAL
    # =========================================================================

    async def preview_withdrawal(
        self,
        user_id: str,
        deposit_id: Optional[str] = None,
        amount_usdt: Optional[Decimal] = None
    ) -> WithdrawalPreviewResponse:
        """
        Preview do saque antes de confirmar.
        Se deposit_id não for fornecido, usa o depósito mais antigo disponível.
        """
        config = self.get_or_create_config()

        # Se deposit_id não fornecido, buscar o depósito mais antigo disponível
        if not deposit_id:
            deposit = self.db.query(EarnPoolDeposit).filter(
                EarnPoolDeposit.user_id == user_id,
                EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
            ).order_by(EarnPoolDeposit.deposited_at.asc()).first()

            if not deposit:
                raise ValueError("Nenhum depósito disponível para saque")

            deposit_id = str(deposit.id)
        else:
            # Buscar depósito específico
            deposit = self.db.query(EarnPoolDeposit).filter(
                EarnPoolDeposit.id == deposit_id,
                EarnPoolDeposit.user_id == user_id
            ).first()

        if not deposit:
            raise ValueError("Depósito não encontrado")

        if deposit.status in [DepositStatus.WITHDRAWN, DepositStatus.CANCELLED, DepositStatus.WITHDRAWAL_PENDING]:
            raise ValueError(f"Depósito não disponível para saque (status: {deposit.status})")

        # Calcular valores
        total_available = deposit.usdt_amount + deposit.total_yield_earned
        amount_requested = amount_usdt or total_available

        if amount_requested > total_available:
            raise ValueError(f"Valor solicitado (${amount_requested}) maior que disponível (${total_available})")

        # Verificar se é saque antecipado
        now = datetime.now(timezone.utc)
        lock_ends_at = ensure_utc(deposit.lock_ends_at)
        is_early = now < lock_ends_at

        # Calcular taxas
        admin_fee_pct = config.early_withdrawal_admin_fee if is_early else Decimal("0")
        op_fee_pct = config.early_withdrawal_op_fee if is_early else Decimal("0")

        admin_fee_amount = amount_requested * (admin_fee_pct / 100)
        op_fee_amount = amount_requested * (op_fee_pct / 100)
        total_fees = admin_fee_amount + op_fee_amount

        net_amount = amount_requested - total_fees

        # Data de disponibilidade
        available_at = now + timedelta(days=config.withdrawal_delay_days)

        message = None
        if is_early:
            days_remaining = (lock_ends_at - now).days
            message = f"Saque antecipado! Faltam {days_remaining} dias para fim do lock. Taxa total: {admin_fee_pct + op_fee_pct}%"

        return WithdrawalPreviewResponse(
            deposit_id=deposit_id,
            usdt_balance=deposit.usdt_amount,
            yield_balance=deposit.total_yield_earned,
            total_available=total_available,
            amount_requested=amount_requested,
            is_early_withdrawal=is_early,
            lock_ends_at=deposit.lock_ends_at,
            admin_fee_percentage=admin_fee_pct,
            admin_fee_amount=admin_fee_amount,
            operational_fee_percentage=op_fee_pct,
            operational_fee_amount=op_fee_amount,
            total_fees=total_fees,
            net_amount=net_amount,
            available_at=available_at,
            processing_days=config.withdrawal_delay_days,
            message=message
        )

    async def create_withdrawal(
        self,
        user_id: str,
        deposit_id: Optional[str] = None,
        amount_usdt: Optional[Decimal] = None,
        destination_type: str = "wallet",
        destination_address: Optional[str] = None,
        destination_crypto: Optional[str] = "USDT",
        accept_fees: bool = True
    ) -> EarnPoolWithdrawal:
        """
        Cria solicitação de saque.
        """
        config = self.get_or_create_config()

        # Se deposit_id não fornecido, buscar o depósito mais antigo disponível
        if not deposit_id:
            deposit = self.db.query(EarnPoolDeposit).filter(
                EarnPoolDeposit.user_id == user_id,
                EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
            ).order_by(EarnPoolDeposit.deposited_at.asc()).first()

            if not deposit:
                raise ValueError("Nenhum depósito disponível para saque")

            deposit_id = str(deposit.id)
        else:
            # Buscar depósito específico
            deposit = self.db.query(EarnPoolDeposit).filter(
                EarnPoolDeposit.id == deposit_id,
                EarnPoolDeposit.user_id == user_id
            ).first()

        if not deposit:
            raise ValueError("Depósito não encontrado")

        if deposit.status in [DepositStatus.WITHDRAWN, DepositStatus.CANCELLED, DepositStatus.WITHDRAWAL_PENDING]:
            raise ValueError(f"Depósito não disponível para saque (status: {deposit.status})")

        # Calcular valores
        total_available = deposit.usdt_amount + deposit.total_yield_earned
        amount_requested = amount_usdt or total_available

        if amount_requested > total_available:
            raise ValueError("Valor solicitado maior que disponível")

        # Verificar se é saque antecipado
        now = datetime.now(timezone.utc)
        lock_ends_at = ensure_utc(deposit.lock_ends_at)
        is_early = now < lock_ends_at

        # Calcular taxas
        if is_early:
            if not accept_fees:
                raise ValueError("Saque antecipado requer aceitar as taxas")

            admin_fee_pct = config.early_withdrawal_admin_fee
            op_fee_pct = config.early_withdrawal_op_fee
        else:
            admin_fee_pct = Decimal("0")
            op_fee_pct = Decimal("0")

        admin_fee_amount = amount_requested * (admin_fee_pct / 100)
        op_fee_amount = amount_requested * (op_fee_pct / 100)
        net_amount = amount_requested - admin_fee_amount - op_fee_amount

        # Calcular rendimentos proporcionais
        yield_proportion = amount_requested / total_available
        yield_amount = deposit.total_yield_earned * yield_proportion

        # Data de disponibilidade
        available_at = now + timedelta(days=config.withdrawal_delay_days)

        # Criar saque
        withdrawal = EarnPoolWithdrawal(
            id=str(uuid.uuid4()),
            user_id=user_id,
            deposit_id=deposit_id,
            usdt_amount=amount_requested - yield_amount,
            yield_amount=yield_amount,
            admin_fee_percentage=admin_fee_pct,
            admin_fee_amount=admin_fee_amount,
            operational_fee_percentage=op_fee_pct,
            operational_fee_amount=op_fee_amount,
            net_amount=net_amount,
            destination_type=destination_type,
            destination_address=destination_address,
            destination_crypto=destination_crypto,
            requested_at=now,
            available_at=available_at,
            status=WithdrawalStatus.PENDING,
            is_early_withdrawal=is_early
        )

        self.db.add(withdrawal)

        # Atualizar status do depósito
        if amount_requested >= total_available:
            deposit.status = DepositStatus.WITHDRAWAL_PENDING

        self.db.commit()
        self.db.refresh(withdrawal)

        logger.info(f"✅ EarnPool withdrawal created: {withdrawal.id} - User {user_id} - ${net_amount} net")
        return withdrawal

    # =========================================================================
    # BALANCE & HISTORY
    # =========================================================================

    def get_user_balance(self, user_id: str) -> EarnPoolBalanceResponse:
        """Retorna saldo completo do usuário"""
        deposits = self.db.query(EarnPoolDeposit).filter(
            EarnPoolDeposit.user_id == user_id,
            EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
        ).all()

        pending_withdrawals = self.db.query(func.sum(EarnPoolWithdrawal.net_amount)).filter(
            EarnPoolWithdrawal.user_id == user_id,
            EarnPoolWithdrawal.status.in_([WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING])
        ).scalar() or Decimal("0")

        total_deposited = sum(d.usdt_amount for d in deposits)
        total_yield = sum(d.total_yield_earned for d in deposits)
        total_balance = total_deposited + total_yield
        available = total_balance - pending_withdrawals

        return EarnPoolBalanceResponse(
            total_deposited_usdt=total_deposited,
            total_yield_earned=total_yield,
            total_balance=total_balance,
            pending_withdrawals=pending_withdrawals,
            available_balance=available,
            active_deposits_count=len(deposits),
            deposits=[DepositResponse.from_orm(d) for d in deposits]
        )

    def get_user_history(self, user_id: str) -> EarnPoolHistoryResponse:
        """Retorna histórico completo do usuário"""
        deposits = self.db.query(EarnPoolDeposit).filter(
            EarnPoolDeposit.user_id == user_id
        ).order_by(EarnPoolDeposit.deposited_at.desc()).all()

        withdrawals = self.db.query(EarnPoolWithdrawal).filter(
            EarnPoolWithdrawal.user_id == user_id
        ).order_by(EarnPoolWithdrawal.requested_at.desc()).all()

        yield_distributions = self.db.query(EarnPoolYieldDistribution).filter(
            EarnPoolYieldDistribution.user_id == user_id
        ).order_by(EarnPoolYieldDistribution.distributed_at.desc()).all()

        total_deposited = sum(d.usdt_amount for d in deposits)
        total_withdrawn = sum(w.net_amount for w in withdrawals if w.status == WithdrawalStatus.COMPLETED)
        total_yield = sum(y.yield_amount for y in yield_distributions)

        return EarnPoolHistoryResponse(
            deposits=[DepositResponse.from_orm(d) for d in deposits],
            withdrawals=[WithdrawalResponse.from_orm(w) for w in withdrawals],
            yields=[YieldHistoryItem.from_orm(y) for y in yield_distributions],
            summary={
                "total_deposited": float(total_deposited),
                "total_withdrawn": float(total_withdrawn),
                "total_yield_earned": float(total_yield),
                "net_invested": float(total_deposited - total_withdrawn)
            }
        )

    # =========================================================================
    # ADMIN - YIELDS
    # =========================================================================

    def process_weekly_yields(
        self,
        admin_id: str,
        request: ProcessYieldsRequest
    ) -> ProcessYieldsResponse:
        """
        Processa e distribui rendimentos semanais.
        """
        active_deposits = self.db.query(EarnPoolDeposit).filter(
            EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
        ).all()

        if not active_deposits:
            raise ValueError("Nenhum depósito ativo no pool")

        total_pool = sum(d.usdt_amount + d.total_yield_earned for d in active_deposits)
        total_yield_to_distribute = request.platform_revenue_usdt * (request.percentage_to_pool / 100)
        effective_yield_pct = (total_yield_to_distribute / total_pool) * 100 if total_pool > 0 else Decimal("0")

        yield_record = EarnPoolYield(
            id=str(uuid.uuid4()),
            week_start=request.week_start,
            week_end=request.week_end,
            total_pool_usdt=total_pool,
            active_deposits_count=len(active_deposits),
            platform_revenue_usdt=request.platform_revenue_usdt,
            revenue_from_otc=request.revenue_from_otc,
            revenue_from_bills=request.revenue_from_bills,
            revenue_from_recharge=request.revenue_from_recharge,
            revenue_from_other=request.revenue_from_other,
            percentage_to_pool=request.percentage_to_pool,
            total_yield_distributed=total_yield_to_distribute,
            effective_yield_percentage=effective_yield_pct,
            status=YieldStatus.PENDING,
            calculated_by=admin_id,
            notes=request.notes
        )
        self.db.add(yield_record)

        distributions_count = 0
        for deposit in active_deposits:
            user_balance = deposit.usdt_amount + deposit.total_yield_earned
            share_pct = (user_balance / total_pool) * 100 if total_pool > 0 else Decimal("0")
            user_yield = total_yield_to_distribute * (share_pct / 100)

            distribution = EarnPoolYieldDistribution(
                id=str(uuid.uuid4()),
                yield_id=yield_record.id,
                deposit_id=deposit.id,
                user_id=deposit.user_id,
                user_pool_balance=user_balance,
                pool_share_percentage=share_pct,
                yield_amount=user_yield
            )
            self.db.add(distribution)

            deposit.total_yield_earned += user_yield
            deposit.last_yield_at = datetime.now(timezone.utc)

            if deposit.status == DepositStatus.LOCKED and datetime.now(timezone.utc) >= deposit.lock_ends_at:
                deposit.status = DepositStatus.ACTIVE

            distributions_count += 1

        yield_record.status = YieldStatus.DISTRIBUTED
        yield_record.distributed_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(yield_record)

        logger.info(f"✅ EarnPool yields distributed: ${total_yield_to_distribute} to {distributions_count} deposits")

        return ProcessYieldsResponse(
            yield_id=yield_record.id,
            week_start=yield_record.week_start,
            week_end=yield_record.week_end,
            total_pool_usdt=total_pool,
            platform_revenue_usdt=request.platform_revenue_usdt,
            percentage_to_pool=request.percentage_to_pool,
            total_yield_distributed=total_yield_to_distribute,
            effective_yield_percentage=effective_yield_pct,
            distributions_count=distributions_count,
            status=yield_record.status
        )

    # =========================================================================
    # ADMIN - OVERVIEW
    # =========================================================================

    def get_admin_overview(self) -> AdminPoolOverviewResponse:
        """Visão geral do pool para admin"""
        config = self.get_or_create_config()
        total_pool = self._get_total_pool_balance()

        active_deposits = self.db.query(func.count(EarnPoolDeposit.id)).filter(
            EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
        ).scalar() or 0

        total_users = self.db.query(func.count(func.distinct(EarnPoolDeposit.user_id))).filter(
            EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
        ).scalar() or 0

        pending_withdrawals = self.db.query(
            func.count(EarnPoolWithdrawal.id),
            func.sum(EarnPoolWithdrawal.net_amount)
        ).filter(
            EarnPoolWithdrawal.status.in_([WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING])
        ).first()

        pending_count = pending_withdrawals[0] or 0
        pending_amount = pending_withdrawals[1] or Decimal("0")

        total_yields = self.db.query(func.sum(EarnPoolYield.total_yield_distributed)).filter(
            EarnPoolYield.status == YieldStatus.DISTRIBUTED
        ).scalar() or Decimal("0")

        now = datetime.now(timezone.utc)
        week_start = now - timedelta(days=now.weekday())
        this_week_yield = self.db.query(EarnPoolYield).filter(
            EarnPoolYield.week_start >= week_start,
            EarnPoolYield.status == YieldStatus.DISTRIBUTED
        ).first()

        from app.schemas.earnpool import EarnPoolConfigResponse

        return AdminPoolOverviewResponse(
            total_pool_usdt=total_pool,
            active_deposits_count=active_deposits,
            total_users=total_users,
            pending_withdrawals_count=pending_count,
            pending_withdrawals_amount=pending_amount,
            total_yields_distributed=total_yields,
            this_week_yield=this_week_yield.total_yield_distributed if this_week_yield else None,
            config=EarnPoolConfigResponse.from_orm(config)
        )

    # =========================================================================
    # HELPERS
    # =========================================================================

    def _get_total_pool_balance(self) -> Decimal:
        """Calcula saldo total do pool"""
        result = self.db.query(
            func.sum(EarnPoolDeposit.usdt_amount + EarnPoolDeposit.total_yield_earned)
        ).filter(
            EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
        ).scalar()

        return result or Decimal("0")

    def approve_early_withdrawal(
        self,
        withdrawal_id: str,
        admin_id: str,
        approve: bool,
        notes: Optional[str] = None
    ) -> EarnPoolWithdrawal:
        """Aprova ou rejeita saque antecipado"""
        withdrawal = self.db.query(EarnPoolWithdrawal).filter(
            EarnPoolWithdrawal.id == withdrawal_id,
            EarnPoolWithdrawal.is_early_withdrawal == True,
            EarnPoolWithdrawal.status == WithdrawalStatus.PENDING
        ).first()

        if not withdrawal:
            raise ValueError("Saque não encontrado ou não é antecipado")

        if approve:
            withdrawal.status = WithdrawalStatus.APPROVED
            withdrawal.approved_by = admin_id
            withdrawal.approval_notes = notes
            logger.info(f"✅ Early withdrawal {withdrawal_id} approved by {admin_id}")
        else:
            withdrawal.status = WithdrawalStatus.REJECTED
            withdrawal.approved_by = admin_id
            withdrawal.approval_notes = notes

            deposit = self.db.query(EarnPoolDeposit).filter(
                EarnPoolDeposit.id == withdrawal.deposit_id
            ).first()
            if deposit and deposit.status == DepositStatus.WITHDRAWAL_PENDING:
                deposit.status = DepositStatus.LOCKED if datetime.now(timezone.utc) < deposit.lock_ends_at else DepositStatus.ACTIVE

            logger.info(f"❌ Early withdrawal {withdrawal_id} rejected by {admin_id}")

        self.db.commit()
        self.db.refresh(withdrawal)
        return withdrawal

    # =========================================================================
    # INVESTOR CREDITS - Virtual Credits & Performance Fees
    # =========================================================================
    
    def create_virtual_credit(
        self,
        user_id: str,
        usdt_amount: Decimal,
        reason: str,
        reason_details: Optional[str] = None,
        notes: Optional[str] = None,
        admin_id: Optional[str] = None,
        lock_period_days: int = 365
    ) -> Tuple:
        """
        Cria um crédito virtual para um investidor.
        Usado para creditar investidores que depositaram fora do sistema.
        
        Args:
            user_id: UUID do investidor
            usdt_amount: Valor em USDT a creditar
            reason: Motivo (INVESTOR_CORRECTION, MISSING_DEPOSIT, PERFORMANCE_FEE, OTHER)
            reason_details: Detalhes adicionais do motivo
            notes: Notas internas (nome, contato, etc)
            admin_id: UUID do admin que está criando
            lock_period_days: Período de bloqueio em dias (180-365)
            
        Returns:
            Tuple (credit_object, message)
        """
        from app.models.earnpool import EarnPoolVirtualCredit
        from datetime import timedelta
        
        # Validar que o usuário existe
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"Usuário não encontrado: {user_id}")
        
        # Calcular data de desbloqueio
        credited_at = datetime.now(timezone.utc)
        lock_ends_at = credited_at + timedelta(days=lock_period_days)
        
        # Criar crédito virtual
        credit = EarnPoolVirtualCredit(
            id=str(uuid.uuid4()),
            user_id=user_id,
            usdt_amount=usdt_amount,
            reason=reason,
            reason_details=reason_details,
            notes=notes,
            credited_by_admin_id=admin_id,
            is_active=True,
            total_yield_earned=Decimal("0.00"),
            credited_at=credited_at,
            lock_period_days=lock_period_days,
            lock_ends_at=lock_ends_at,
            status="LOCKED",
            yield_withdrawn=Decimal("0.00"),
            principal_withdrawn=Decimal("0.00")
        )
        
        self.db.add(credit)
        self.db.commit()
        self.db.refresh(credit)
        
        logger.info(f"✅ Virtual credit created: {credit.id} - {usdt_amount} USDT for user {user_id}")
        
        message = f"Crédito virtual de ${usdt_amount} USDT criado com sucesso para o investidor"
        return (credit, message)
    
    def create_performance_fee(
        self,
        user_id: str,
        base_amount_usdt: Decimal,
        performance_percentage: Decimal,
        period_description: Optional[str] = None,
        notes: Optional[str] = None,
        admin_id: Optional[str] = None,
        auto_credit: bool = True
    ) -> Tuple:
        """
        Calcula e cria uma taxa de performance para um investidor.
        Opcionalmente cria um crédito virtual automaticamente.
        
        Args:
            user_id: UUID do investidor
            base_amount_usdt: Valor base em USDT
            performance_percentage: Percentual de performance (ex: 0.35 para 0.35%)
            period_description: Descrição do período (ex: "Operações Passadas 2024")
            notes: Notas internas
            admin_id: UUID do admin
            auto_credit: Se True, cria crédito virtual automaticamente
            
        Returns:
            Tuple (performance_fee, virtual_credit, total_credited)
        """
        from app.models.earnpool import EarnPoolPerformanceFee, EarnPoolVirtualCredit
        
        # Validar que o usuário existe
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"Usuário não encontrado: {user_id}")
        
        # Calcular taxa de performance
        fee_amount = base_amount_usdt * (performance_percentage / Decimal("100"))
        
        # Criar registro de performance fee
        fee = EarnPoolPerformanceFee(
            id=str(uuid.uuid4()),
            user_id=user_id,
            base_amount_usdt=base_amount_usdt,
            performance_percentage=performance_percentage,
            fee_amount_usdt=fee_amount,
            period_description=period_description,
            notes=notes,
            status="CREDITED" if auto_credit else "CALCULATED",
            created_by_admin_id=admin_id,
            created_at=datetime.now(timezone.utc),
            credited_at=datetime.now(timezone.utc) if auto_credit else None
        )
        
        virtual_credit = None
        total_credited = fee_amount if auto_credit else Decimal("0")
        
        # Se auto_credit, criar crédito virtual para a taxa
        if auto_credit and fee_amount > 0:
            credited_at = datetime.now(timezone.utc)
            virtual_credit = EarnPoolVirtualCredit(
                id=str(uuid.uuid4()),
                user_id=user_id,
                usdt_amount=fee_amount,
                reason="PERFORMANCE_FEE",
                reason_details=f"Performance fee {performance_percentage}% sobre {base_amount_usdt} USDT",
                notes=notes,
                credited_by_admin_id=admin_id,
                is_active=True,
                total_yield_earned=Decimal("0.00"),
                credited_at=credited_at,
                lock_period_days=180,
                lock_ends_at=credited_at + timedelta(days=180),
                status="LOCKED",
                yield_withdrawn=Decimal("0.00"),
                principal_withdrawn=Decimal("0.00"),
                created_at=credited_at
            )
            self.db.add(virtual_credit)
            fee.virtual_credit_id = virtual_credit.id
        
        self.db.add(fee)
        self.db.commit()
        self.db.refresh(fee)
        
        logger.info(f"✅ Performance fee created: {fee.id} - {fee_amount} USDT ({performance_percentage}%) for user {user_id}")
        
        return (fee, virtual_credit, total_credited)
    
    def get_investor_credits(self, user_id: str) -> dict:
        """
        Retorna todos os créditos de um investidor.
        
        Args:
            user_id: UUID do investidor
            
        Returns:
            Dict com créditos virtuais, taxas de performance e totais
        """
        from app.models.earnpool import EarnPoolVirtualCredit, EarnPoolPerformanceFee
        
        # Buscar créditos virtuais
        virtual_credits = self.db.query(EarnPoolVirtualCredit).filter(
            EarnPoolVirtualCredit.user_id == user_id,
            EarnPoolVirtualCredit.is_active == True
        ).all()
        
        # Buscar taxas de performance
        performance_fees = self.db.query(EarnPoolPerformanceFee).filter(
            EarnPoolPerformanceFee.user_id == user_id
        ).all()
        
        # Calcular totais
        total_virtual_credits = sum(Decimal(str(c.usdt_amount)) for c in virtual_credits)
        total_performance_fees = sum(Decimal(str(f.fee_amount_usdt)) for f in performance_fees)
        total_yield_earned = sum(Decimal(str(c.total_yield_earned or 0)) for c in virtual_credits)
        
        return {
            "user_id": user_id,
            "virtual_credits": [
                {
                    "id": c.id,
                    "usdt_amount": float(c.usdt_amount),
                    "reason": c.reason,
                    "reason_details": c.reason_details,
                    "total_yield_earned": float(c.total_yield_earned or 0),
                    "is_active": c.is_active,
                    "created_at": c.created_at.isoformat() if c.created_at else None
                }
                for c in virtual_credits
            ],
            "performance_fees": [
                {
                    "id": f.id,
                    "base_amount_usdt": float(f.base_amount_usdt),
                    "performance_percentage": float(f.performance_percentage),
                    "fee_amount_usdt": float(f.fee_amount_usdt),
                    "period_description": f.period_description,
                    "status": f.status,
                    "created_at": f.created_at.isoformat() if f.created_at else None
                }
                for f in performance_fees
            ],
            "total_virtual_credits_usdt": float(total_virtual_credits),
            "total_performance_fees_usdt": float(total_performance_fees),
            "total_yield_earned_usdt": float(total_yield_earned),
            "total_investor_balance_usdt": float(total_virtual_credits + total_performance_fees)
        }


# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

def get_earnpool_service(db: Session) -> EarnPoolService:
    """
    Factory function para injeção de dependência do EarnPoolService.
    
    Args:
        db: Sessão do banco de dados
        
    Returns:
        Instância configurada do EarnPoolService
    """
    return EarnPoolService(db)
