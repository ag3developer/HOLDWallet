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
    ) -> dict:
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
            Dict com dados da taxa de performance
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
            created_at=datetime.now(timezone.utc)
        )
        
        virtual_credit = None
        
        # Se auto_credit, criar crédito virtual para a taxa
        if auto_credit and fee_amount > 0:
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
                created_at=datetime.now(timezone.utc)
            )
            self.db.add(virtual_credit)
            fee.virtual_credit_id = virtual_credit.id
        
        self.db.add(fee)
        self.db.commit()
        self.db.refresh(fee)
        
        logger.info(f"✅ Performance fee created: {fee.id} - {fee_amount} USDT ({performance_percentage}%) for user {user_id}")
        
        result = {
            "id": fee.id,
            "user_id": fee.user_id,
            "base_amount_usdt": float(fee.base_amount_usdt),
            "performance_percentage": float(fee.performance_percentage),
            "fee_amount_usdt": float(fee.fee_amount_usdt),
            "period_description": fee.period_description,
            "status": fee.status,
            "created_at": fee.created_at.isoformat() if fee.created_at else None
        }
        
        if virtual_credit:
            result["virtual_credit_id"] = virtual_credit.id
            result["virtual_credit_amount"] = float(virtual_credit.usdt_amount)
        
        return result
    
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
