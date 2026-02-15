"""
💰 EarnPool Revenue Sharing Service
====================================

Serviço para distribuição de receita do pool de liquidez.

A receita vem das taxas de rede cobradas em:
- WolkPay (pagamentos)
- Trade Instantâneo
- Boletos
- Outros serviços

A distribuição segue as regras:
1. Cada Tier recebe uma % do pool total de receita
2. Dentro de cada Tier, a distribuição é proporcional ao valor depositado
3. NUNCA excede o pool acumulado

Author: WolkNow Team
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import logging
import uuid

from app.models.earnpool import (
    EarnPoolDeposit, EarnPoolTier, EarnPoolRevenuePool,
    EarnPoolTierDistribution, EarnPoolCooperatorDistribution,
    DepositStatus
)

logger = logging.getLogger(__name__)


class EarnPoolRevenueService:
    """
    Serviço de distribuição de receita do EarnPool
    
    Fluxo:
    1. Acumular receita de taxas (add_revenue)
    2. Calcular distribuição por tier (calculate_distribution)
    3. Distribuir para cooperados (distribute_to_cooperators)
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================================
    # TIERS
    # =========================================================================
    
    def get_all_tiers(self) -> List[EarnPoolTier]:
        """Retorna todos os tiers ativos ordenados por level"""
        return self.db.query(EarnPoolTier).filter(
            EarnPoolTier.is_active == True
        ).order_by(EarnPoolTier.tier_level).all()
    
    def get_tier_for_amount(self, amount_usdt: Decimal) -> Optional[EarnPoolTier]:
        """
        Retorna o tier correspondente ao valor depositado.
        
        Args:
            amount_usdt: Valor total depositado em USDT
            
        Returns:
            EarnPoolTier correspondente ou None
        """
        return self.db.query(EarnPoolTier).filter(
            EarnPoolTier.is_active == True,
            EarnPoolTier.min_deposit_usdt <= amount_usdt,
            (EarnPoolTier.max_deposit_usdt >= amount_usdt) | (EarnPoolTier.max_deposit_usdt.is_(None))
        ).order_by(EarnPoolTier.tier_level.desc()).first()
    
    def get_user_tier(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retorna o tier atual do usuário baseado em seus depósitos ativos.
        
        Args:
            user_id: ID do usuário
            
        Returns:
            Dict com informações do tier ou None
        """
        # Calcular total depositado pelo usuário
        total_deposited = self.db.query(
            func.sum(EarnPoolDeposit.usdt_amount)
        ).filter(
            EarnPoolDeposit.user_id == user_id,
            EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
        ).scalar() or Decimal("0")
        
        if total_deposited == 0:
            return None
        
        tier = self.get_tier_for_amount(total_deposited)
        if not tier:
            return None
        
        return {
            "tier_level": tier.tier_level,
            "tier_name": tier.name,
            "tier_name_key": tier.name_key,
            "total_deposited": total_deposited,
            "pool_share_percentage": tier.pool_share_percentage,
            "withdrawal_priority_days": tier.withdrawal_priority_days,
            "early_withdrawal_discount": tier.early_withdrawal_discount,
            "badge_color": tier.badge_color,
            "badge_icon": tier.badge_icon,
            "min_for_tier": tier.min_deposit_usdt,
            "max_for_tier": tier.max_deposit_usdt,
            "next_tier": self._get_next_tier_info(tier.tier_level, total_deposited)
        }
    
    def _get_next_tier_info(self, current_level: int, current_amount: Decimal) -> Optional[Dict]:
        """Retorna info sobre o próximo tier"""
        next_tier = self.db.query(EarnPoolTier).filter(
            EarnPoolTier.tier_level == current_level + 1,
            EarnPoolTier.is_active == True
        ).first()
        
        if not next_tier:
            return None
        
        amount_needed = next_tier.min_deposit_usdt - current_amount
        return {
            "tier_level": next_tier.tier_level,
            "tier_name": next_tier.name,
            "amount_needed": max(Decimal("0"), amount_needed),
            "pool_share_percentage": next_tier.pool_share_percentage
        }
    
    # =========================================================================
    # REVENUE POOL
    # =========================================================================
    
    def get_or_create_current_period(self) -> EarnPoolRevenuePool:
        """
        Obtém ou cria o pool de receita do período atual (semana).
        """
        now = datetime.now(timezone.utc)
        
        # Início da semana (segunda-feira)
        days_since_monday = now.weekday()
        week_start = (now - timedelta(days=days_since_monday)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = week_start + timedelta(days=7)
        
        # Buscar período existente
        period = self.db.query(EarnPoolRevenuePool).filter(
            EarnPoolRevenuePool.period_start == week_start,
            EarnPoolRevenuePool.status == "ACCUMULATING"
        ).first()
        
        if not period:
            period = EarnPoolRevenuePool(
                id=str(uuid.uuid4()),
                period_start=week_start,
                period_end=week_end,
                revenue_wolkpay=Decimal("0"),
                revenue_instant_trade=Decimal("0"),
                revenue_bills=Decimal("0"),
                revenue_other=Decimal("0"),
                total_revenue=Decimal("0"),
                total_distributed=Decimal("0"),
                remaining_balance=Decimal("0"),
                status="ACCUMULATING"
            )
            self.db.add(period)
            self.db.commit()
            self.db.refresh(period)
            logger.info(f"✅ Created new revenue period: {week_start} - {week_end}")
        
        return period
    
    def add_revenue(
        self,
        amount: Decimal,
        source: str,  # "wolkpay", "instant_trade", "bills", "other"
        description: str = None
    ) -> EarnPoolRevenuePool:
        """
        Adiciona receita ao pool do período atual.
        
        Esta função deve ser chamada quando uma taxa de rede é cobrada.
        
        Args:
            amount: Valor da taxa em USDT
            source: Fonte da receita (wolkpay, instant_trade, bills, other)
            description: Descrição opcional
            
        Returns:
            EarnPoolRevenuePool atualizado
        """
        period = self.get_or_create_current_period()
        
        # Atualizar receita por fonte
        if source == "wolkpay":
            period.revenue_wolkpay = (period.revenue_wolkpay or 0) + amount
        elif source == "instant_trade":
            period.revenue_instant_trade = (period.revenue_instant_trade or 0) + amount
        elif source == "bills":
            period.revenue_bills = (period.revenue_bills or 0) + amount
        else:
            period.revenue_other = (period.revenue_other or 0) + amount
        
        # Atualizar total
        period.total_revenue = (
            (period.revenue_wolkpay or 0) +
            (period.revenue_instant_trade or 0) +
            (period.revenue_bills or 0) +
            (period.revenue_other or 0)
        )
        period.remaining_balance = period.total_revenue - (period.total_distributed or 0)
        
        self.db.commit()
        self.db.refresh(period)
        
        logger.info(f"💰 Revenue added: ${amount} from {source}. Total: ${period.total_revenue}")
        return period
    
    def get_current_revenue_summary(self) -> Dict[str, Any]:
        """Retorna resumo da receita do período atual"""
        period = self.get_or_create_current_period()
        
        return {
            "period_start": period.period_start.isoformat(),
            "period_end": period.period_end.isoformat(),
            "revenue_wolkpay": float(period.revenue_wolkpay or 0),
            "revenue_instant_trade": float(period.revenue_instant_trade or 0),
            "revenue_bills": float(period.revenue_bills or 0),
            "revenue_other": float(period.revenue_other or 0),
            "total_revenue": float(period.total_revenue or 0),
            "total_distributed": float(period.total_distributed or 0),
            "remaining_balance": float(period.remaining_balance or 0),
            "status": period.status
        }
    
    # =========================================================================
    # DISTRIBUTION
    # =========================================================================
    
    def calculate_distribution(self, period_id: str = None) -> Dict[str, Any]:
        """
        Calcula a distribuição de receita para os cooperados.
        
        LÓGICA CORRETA:
        1. Cada cooperado recebe (tier_percentage% × seu_deposito) por semana
        2. O TOTAL distribuído NUNCA pode exceder o pool de receita acumulado
        3. Se o total calculado exceder o pool, aplica-se um fator de redução proporcional
        
        Exemplo:
        - Pool acumulado: $1,000
        - User A: $10,000 no Tier 6 (0.75%) → Rendimento ideal: $75
        - User B: $5,000 no Tier 5 (0.70%) → Rendimento ideal: $35
        - Total ideal: $110
        - Como $110 > $1,000? NÃO! $110 < $1,000, então distribui normalmente
        
        Se o total ideal fosse $1,500 e pool = $1,000:
        - Fator de redução: 1000/1500 = 0.667
        - User A recebe: $75 × 0.667 = $50
        - User B recebe: $35 × 0.667 = $23.33
        
        Returns:
            Dict com cálculos de distribuição
        """
        # Obter período
        if period_id:
            period = self.db.query(EarnPoolRevenuePool).filter(
                EarnPoolRevenuePool.id == period_id
            ).first()
        else:
            period = self.get_or_create_current_period()
        
        if not period or period.total_revenue <= 0:
            return {"error": "No revenue to distribute", "total_revenue": 0}
        
        pool_available = Decimal(str(period.total_revenue))
        
        # Obter todos os tiers ativos
        tiers = self.get_all_tiers()
        
        # PASSO 1: Calcular rendimento IDEAL de cada cooperado
        all_cooperators = []
        total_ideal_yield = Decimal("0")
        
        for tier in tiers:
            cooperators = self._get_cooperators_for_tier(tier)
            
            for coop in cooperators:
                # Rendimento ideal = tier_percentage% × valor_depositado
                ideal_yield = (tier.pool_share_percentage / 100) * coop["total_deposited"]
                
                all_cooperators.append({
                    "user_id": coop["user_id"],
                    "total_deposited": coop["total_deposited"],
                    "tier_level": tier.tier_level,
                    "tier_name": tier.name,
                    "tier_percentage": tier.pool_share_percentage,
                    "ideal_yield": ideal_yield
                })
                
                total_ideal_yield += ideal_yield
        
        # PASSO 2: Calcular fator de redução se necessário
        if total_ideal_yield > pool_available:
            reduction_factor = pool_available / total_ideal_yield
            logger.warning(f"⚠️ Pool insufficient! Ideal: ${total_ideal_yield}, Available: ${pool_available}. Reduction factor: {reduction_factor:.4f}")
        else:
            reduction_factor = Decimal("1")  # Sem redução
            logger.info(f"✅ Pool sufficient. Ideal: ${total_ideal_yield}, Available: ${pool_available}")
        
        # PASSO 3: Aplicar fator de redução e agrupar por tier
        distribution_by_tier = {}
        total_to_distribute = Decimal("0")
        
        for coop in all_cooperators:
            actual_yield = coop["ideal_yield"] * reduction_factor
            tier_level = coop["tier_level"]
            
            if tier_level not in distribution_by_tier:
                distribution_by_tier[tier_level] = {
                    "tier_level": tier_level,
                    "tier_name": coop["tier_name"],
                    "tier_percentage": float(coop["tier_percentage"]),
                    "tier_total_deposits": Decimal("0"),
                    "cooperators_count": 0,
                    "amount_to_distribute": Decimal("0"),
                    "cooperators": []
                }
            
            distribution_by_tier[tier_level]["tier_total_deposits"] += coop["total_deposited"]
            distribution_by_tier[tier_level]["cooperators_count"] += 1
            distribution_by_tier[tier_level]["amount_to_distribute"] += actual_yield
            distribution_by_tier[tier_level]["cooperators"].append({
                "user_id": coop["user_id"],
                "deposit_amount": float(coop["total_deposited"]),
                "tier_percentage": float(coop["tier_percentage"]),
                "ideal_yield": float(coop["ideal_yield"]),
                "actual_yield": float(actual_yield),
                "reduction_applied": float(reduction_factor) < 1.0
            })
            
            total_to_distribute += actual_yield
        
        # Converter para lista ordenada
        tier_list = sorted(distribution_by_tier.values(), key=lambda x: x["tier_level"])
        for tier_data in tier_list:
            tier_data["tier_total_deposits"] = float(tier_data["tier_total_deposits"])
            tier_data["amount_to_distribute"] = float(tier_data["amount_to_distribute"])
        
        return {
            "period_id": str(period.id),
            "period_start": period.period_start.isoformat(),
            "period_end": period.period_end.isoformat(),
            "total_revenue": float(period.total_revenue),
            "total_ideal_yield": float(total_ideal_yield),
            "total_to_distribute": float(total_to_distribute),
            "reduction_factor": float(reduction_factor),
            "reduction_applied": float(reduction_factor) < 1.0,
            "remaining_after_distribution": float(pool_available - total_to_distribute),
            "cooperators_count": len(all_cooperators),
            "distribution_by_tier": tier_list
        }
    
    def _get_cooperators_for_tier(self, tier: EarnPoolTier) -> List[Dict]:
        """Retorna lista de cooperados de um tier específico"""
        # Buscar todos os depósitos ativos agrupados por usuário
        query = self.db.query(
            EarnPoolDeposit.user_id,
            func.sum(EarnPoolDeposit.usdt_amount).label('total_deposited')
        ).filter(
            EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
        ).group_by(EarnPoolDeposit.user_id)
        
        cooperators = []
        for row in query.all():
            total = row.total_deposited
            
            # Verificar se está neste tier
            if total >= tier.min_deposit_usdt:
                if tier.max_deposit_usdt is None or total <= tier.max_deposit_usdt:
                    cooperators.append({
                        "user_id": str(row.user_id),
                        "total_deposited": total
                    })
        
        return cooperators
    
    def distribute_revenue(self, period_id: str = None, admin_id: str = None) -> Dict[str, Any]:
        """
        Executa a distribuição de receita para os cooperados.
        
        A distribuição usa a nova lógica:
        - Cada cooperado recebe tier_percentage% do SEU depósito
        - Limitado ao pool disponível (com fator de redução se necessário)
        
        Args:
            period_id: ID do período (opcional, usa atual se não fornecido)
            admin_id: ID do admin que autorizou (para auditoria)
            
        Returns:
            Dict com resultado da distribuição
        """
        # Calcular primeiro
        calculation = self.calculate_distribution(period_id)
        
        if "error" in calculation:
            return calculation
        
        # Obter período
        period = self.db.query(EarnPoolRevenuePool).filter(
            EarnPoolRevenuePool.id == calculation["period_id"]
        ).first()
        
        if period.status == "DISTRIBUTED":
            return {"error": "Period already distributed"}
        
        # Marcar como em distribuição
        period.status = "DISTRIBUTING"
        self.db.commit()
        
        try:
            total_distributed = Decimal("0")
            
            for tier_dist in calculation["distribution_by_tier"]:
                # Criar registro de distribuição do tier
                tier = self.db.query(EarnPoolTier).filter(
                    EarnPoolTier.tier_level == tier_dist["tier_level"]
                ).first()
                
                tier_distribution = EarnPoolTierDistribution(
                    id=str(uuid.uuid4()),
                    revenue_pool_id=period.id,
                    tier_id=tier.id,
                    tier_total_deposits=Decimal(str(tier_dist["tier_total_deposits"])),
                    tier_cooperators_count=tier_dist["cooperators_count"],
                    pool_share_percentage=tier.pool_share_percentage,
                    amount_to_distribute=Decimal(str(tier_dist["amount_to_distribute"])),
                    amount_distributed=Decimal("0"),
                    status="PENDING"
                )
                self.db.add(tier_distribution)
                self.db.flush()
                
                # Distribuir para cada cooperado
                for coop in tier_dist["cooperators"]:
                    # Usar actual_yield (já com fator de redução aplicado)
                    yield_amount = Decimal(str(coop["actual_yield"]))
                    
                    if yield_amount <= 0:
                        continue
                    
                    # Buscar depósito do usuário
                    deposit = self.db.query(EarnPoolDeposit).filter(
                        EarnPoolDeposit.user_id == coop["user_id"],
                        EarnPoolDeposit.status.in_([DepositStatus.ACTIVE, DepositStatus.LOCKED])
                    ).first()
                    
                    if not deposit:
                        continue
                    
                    # Criar distribuição individual
                    coop_dist = EarnPoolCooperatorDistribution(
                        id=str(uuid.uuid4()),
                        tier_distribution_id=tier_distribution.id,
                        user_id=coop["user_id"],
                        deposit_id=deposit.id,
                        user_tier_level=tier.tier_level,
                        user_deposit_amount=Decimal(str(coop["deposit_amount"])),
                        user_share_percentage=Decimal(str(coop["tier_percentage"])),  # % do tier
                        yield_amount=yield_amount
                    )
                    self.db.add(coop_dist)
                    
                    # Atualizar rendimento no depósito
                    deposit.total_yield_earned = (deposit.total_yield_earned or 0) + yield_amount
                    deposit.last_yield_at = datetime.now(timezone.utc)
                    
                    tier_distribution.amount_distributed += yield_amount
                    total_distributed += yield_amount
                
                tier_distribution.status = "DISTRIBUTED"
                tier_distribution.distributed_at = datetime.now(timezone.utc)
            
            # Atualizar período
            period.total_distributed = total_distributed
            period.remaining_balance = period.total_revenue - total_distributed
            period.status = "DISTRIBUTED"
            period.distributed_at = datetime.now(timezone.utc)
            
            # Registrar admin que distribuiu (se fornecido)
            if admin_id:
                period.notes = f"Distributed by admin: {admin_id}"
            
            self.db.commit()
            
            logger.info(f"✅ Revenue distributed: ${total_distributed} to {calculation['cooperators_count']} cooperators")
            
            return {
                "success": True,
                "period_id": str(period.id),
                "total_revenue": float(period.total_revenue),
                "total_distributed": float(total_distributed),
                "remaining_balance": float(period.remaining_balance),
                "cooperators_count": calculation["cooperators_count"],
                "reduction_applied": calculation["reduction_applied"],
                "reduction_factor": calculation["reduction_factor"],
                "distribution_by_tier": calculation["distribution_by_tier"]
            }
            
        except Exception as e:
            self.db.rollback()
            period.status = "ACCUMULATING"  # Reverter status
            self.db.commit()
            logger.error(f"❌ Distribution failed: {e}")
            return {"error": str(e)}


def get_earnpool_revenue_service(db: Session) -> EarnPoolRevenueService:
    """Factory function para obter o serviço"""
    return EarnPoolRevenueService(db)
