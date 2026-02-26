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
        
        if config.max_deposit_usd
