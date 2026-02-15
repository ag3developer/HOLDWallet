"""
🎁 Referral Service - WOLK FRIENDS
===================================
Lógica de negócio do programa de indicação

@version 1.0.0
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List
import uuid
import random
import string
import logging

from app.models.referral import (
    ReferralCode, Referral, ReferralEarning, ReferralConfig,
    ReferralTier, ReferralStatus
)
from app.models.user import User

logger = logging.getLogger(__name__)


def to_uuid(value: str) -> uuid.UUID:
    """Converte string para UUID"""
    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(str(value))


# Configurações de tier padrão
TIER_CONFIG = {
    ReferralTier.BRONZE: {"min_referrals": 0, "commission_rate": Decimal("20.00")},
    ReferralTier.SILVER: {"min_referrals": 6, "commission_rate": Decimal("25.00")},
    ReferralTier.GOLD: {"min_referrals": 21, "commission_rate": Decimal("30.00")},
    ReferralTier.DIAMOND: {"min_referrals": 51, "commission_rate": Decimal("35.00")},
    ReferralTier.AMBASSADOR: {"min_referrals": 100, "commission_rate": Decimal("40.00")},
}


class ReferralService:
    """Serviço para gerenciar o programa de indicação"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================================
    # CÓDIGO DE INDICAÇÃO
    # =========================================================================
    
    def generate_unique_code(self, username: str) -> str:
        """Gera um código de indicação baseado no username"""
        # Usar o username diretamente como código (mais fácil de lembrar)
        # O username já é único no sistema
        return username.lower()
    
    def get_or_create_referral_code(self, user_id: str) -> ReferralCode:
        """Obtém ou cria código de indicação para um usuário"""
        user_uuid = to_uuid(user_id)
        
        # Busca código existente
        referral_code = self.db.query(ReferralCode).filter(
            ReferralCode.user_id == user_uuid
        ).first()
        
        if referral_code:
            # Atualiza o código para o username se ainda não estiver
            user = self.db.query(User).filter(User.id == user_uuid).first()
            if user and referral_code.code != user.username.lower():
                referral_code.code = user.username.lower()
                self.db.commit()
                self.db.refresh(referral_code)
            return referral_code
        
        # Busca o usuário para pegar o username
        user = self.db.query(User).filter(User.id == user_uuid).first()
        if not user:
            raise ValueError("Usuário não encontrado")
        
        # Cria novo código usando o username
        code = self.generate_unique_code(user.username)
        
        referral_code = ReferralCode(
            user_id=user_uuid,
            code=code,
            current_tier=ReferralTier.BRONZE
        )
        
        self.db.add(referral_code)
        self.db.commit()
        self.db.refresh(referral_code)
        
        logger.info(f"✅ Código de indicação criado: {code} para usuário {user.username}")
        
        return referral_code
    
    def get_referral_code_by_code(self, code: str) -> Optional[ReferralCode]:
        """Busca código de indicação pelo código"""
        return self.db.query(ReferralCode).filter(
            ReferralCode.code == code.upper(),
            ReferralCode.is_active == True
        ).first()
    
    # =========================================================================
    # REGISTRO DE INDICAÇÃO
    # =========================================================================
    
    def register_referral(self, referred_user_id: str, referral_code: str) -> Optional[Referral]:
        """
        Registra uma nova indicação quando um usuário se cadastra com código
        
        Args:
            referred_user_id: ID do usuário que foi indicado (novo usuário)
            referral_code: Código de indicação usado
            
        Returns:
            Referral se sucesso, None se código inválido ou usuário já indicado
        """
        referred_uuid = to_uuid(referred_user_id)
        
        # Verifica se o código existe
        code_obj = self.get_referral_code_by_code(referral_code)
        if not code_obj:
            logger.warning(f"⚠️ Código de indicação inválido: {referral_code}")
            return None
        
        # Verifica se o usuário já tem uma indicação
        existing = self.db.query(Referral).filter(
            Referral.referred_id == referred_uuid
        ).first()
        
        if existing:
            logger.warning(f"⚠️ Usuário {referred_user_id} já possui indicação")
            return None
        
        # Não permite auto-indicação
        if str(code_obj.user_id) == str(referred_uuid):
            logger.warning("⚠️ Tentativa de auto-indicação")
            return None
        
        # Cria a indicação
        referral = Referral(
            referrer_id=code_obj.user_id,
            referrer_code_id=code_obj.id,
            referred_id=referred_uuid,
            status=ReferralStatus.PENDING
        )
        
        self.db.add(referral)
        
        # Incrementa total de indicações
        code_obj.total_referrals += 1
        
        self.db.commit()
        self.db.refresh(referral)
        
        logger.info(f"✅ Indicação registrada: {code_obj.code} -> usuário {referred_user_id}")
        
        return referral
    
    # =========================================================================
    # QUALIFICAÇÃO E ATIVIDADE
    # =========================================================================
    
    def qualify_referral(self, referred_user_id: str, transaction_amount: Decimal) -> bool:
        """
        Qualifica uma indicação quando o usuário faz sua primeira transação
        
        Args:
            referred_user_id: ID do usuário indicado
            transaction_amount: Valor da transação
            
        Returns:
            True se qualificou, False se não tinha indicação ou já estava qualificado
        """
        referred_uuid = to_uuid(referred_user_id)
        
        referral = self.db.query(Referral).filter(
            Referral.referred_id == referred_uuid,
            Referral.status == ReferralStatus.PENDING
        ).first()
        
        if not referral:
            return False
        
        # Verifica valor mínimo (padrão $1)
        config = self._get_config()
        min_amount = config.min_transaction_to_qualify if config else Decimal("1.00")
        
        if transaction_amount < min_amount:
            return False
        
        # Qualifica
        referral.status = ReferralStatus.QUALIFIED
        referral.qualified_at = datetime.utcnow()
        referral.last_activity_at = datetime.utcnow()
        
        self.db.commit()
        
        logger.info(f"✅ Indicação qualificada: usuário {referred_user_id}")
        
        # Atualiza tier do indicador
        self._update_referrer_tier(str(referral.referrer_id))
        
        return True
    
    def update_referral_activity(self, referred_user_id: str) -> None:
        """Atualiza última atividade do indicado"""
        referred_uuid = to_uuid(referred_user_id)
        
        referral = self.db.query(Referral).filter(
            Referral.referred_id == referred_uuid,
            Referral.status.in_([ReferralStatus.QUALIFIED, ReferralStatus.ACTIVE, ReferralStatus.INACTIVE])
        ).first()
        
        if referral:
            referral.last_activity_at = datetime.utcnow()
            if referral.status != ReferralStatus.ACTIVE:
                referral.status = ReferralStatus.ACTIVE
            self.db.commit()
    
    def check_and_update_inactive_referrals(self) -> int:
        """
        Job para marcar indicações inativas (sem transação há 30+ dias)
        
        Returns:
            Número de indicações marcadas como inativas
        """
        config = self._get_config()
        days = config.days_to_consider_active if config else 30
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Busca indicações que estão ativas mas sem atividade recente
        inactive_referrals = self.db.query(Referral).filter(
            Referral.status == ReferralStatus.ACTIVE,
            Referral.last_activity_at < cutoff_date
        ).all()
        
        count = 0
        for referral in inactive_referrals:
            referral.status = ReferralStatus.INACTIVE
            count += 1
            
            # Atualiza tier do indicador
            self._update_referrer_tier(str(referral.referrer_id))
        
        if count > 0:
            self.db.commit()
            logger.info(f"⚠️ {count} indicações marcadas como inativas")
        
        return count
    
    # =========================================================================
    # COMISSÕES
    # =========================================================================
    
    def process_referral_commission(
        self,
        referred_user_id: str,
        transaction_type: str,
        transaction_id: str,
        transaction_amount: Decimal,
        fee_amount: Decimal
    ) -> Optional[ReferralEarning]:
        """
        Processa comissão de indicação para uma transação
        
        Args:
            referred_user_id: ID do usuário que fez a transação
            transaction_type: Tipo da transação (instant_trade, p2p, etc)
            transaction_id: ID da transação
            transaction_amount: Valor total da transação
            fee_amount: Taxa cobrada na transação (spread)
            
        Returns:
            ReferralEarning se comissão foi gerada, None caso contrário
        """
        referred_uuid = to_uuid(referred_user_id)
        
        # Busca a indicação
        referral = self.db.query(Referral).filter(
            Referral.referred_id == referred_uuid,
            Referral.status.in_([ReferralStatus.QUALIFIED, ReferralStatus.ACTIVE])
        ).first()
        
        if not referral:
            # Tenta qualificar se for primeira transação
            if self.qualify_referral(referred_user_id, transaction_amount):
                referral = self.db.query(Referral).filter(
                    Referral.referred_id == referred_uuid
                ).first()
            else:
                return None
        
        if not referral:
            return None
        
        # Busca o código do indicador para pegar o tier
        referrer_code = self.db.query(ReferralCode).filter(
            ReferralCode.user_id == referral.referrer_id
        ).first()
        
        if not referrer_code:
            return None
        
        # Calcula comissão baseada no tier
        tier = referrer_code.current_tier
        commission_rate = TIER_CONFIG[tier]["commission_rate"]
        commission_amount = fee_amount * (commission_rate / Decimal("100"))
        
        # Cria o registro de ganho
        earning = ReferralEarning(
            referral_id=referral.id,
            referrer_id=referral.referrer_id,
            transaction_type=transaction_type,
            transaction_id=transaction_id,
            transaction_amount=transaction_amount,
            fee_amount=fee_amount,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            tier_at_earning=tier,
            is_paid=False
        )
        
        self.db.add(earning)
        
        # Atualiza totais
        referral.total_volume_generated += transaction_amount
        referral.total_fees_generated += fee_amount
        referral.total_commission_paid += commission_amount
        referral.last_activity_at = datetime.utcnow()
        
        if referral.status == ReferralStatus.QUALIFIED:
            referral.status = ReferralStatus.ACTIVE
        
        referrer_code.total_earned += commission_amount
        
        self.db.commit()
        self.db.refresh(earning)
        
        logger.info(
            f"💰 Comissão de indicação: {commission_amount} USD "
            f"({commission_rate}% de {fee_amount} USD) para {referral.referrer_id}"
        )
        
        return earning
    
    # =========================================================================
    # TIER MANAGEMENT
    # =========================================================================
    
    def _update_referrer_tier(self, referrer_id: str) -> None:
        """Atualiza o tier do indicador baseado em indicados ativos"""
        referrer_uuid = to_uuid(referrer_id)
        
        referrer_code = self.db.query(ReferralCode).filter(
            ReferralCode.user_id == referrer_uuid
        ).first()
        
        if not referrer_code:
            return
        
        # Conta indicados ativos
        active_count = self.db.query(Referral).filter(
            Referral.referrer_id == referrer_uuid,
            Referral.status == ReferralStatus.ACTIVE
        ).count()
        
        referrer_code.active_referrals = active_count
        
        # Determina novo tier
        new_tier = ReferralTier.BRONZE
        
        if active_count >= 100:
            # Para embaixador, verifica também volume mensal (implementar depois)
            new_tier = ReferralTier.AMBASSADOR
        elif active_count >= 51:
            new_tier = ReferralTier.DIAMOND
        elif active_count >= 21:
            new_tier = ReferralTier.GOLD
        elif active_count >= 6:
            new_tier = ReferralTier.SILVER
        
        if referrer_code.current_tier != new_tier:
            old_tier = referrer_code.current_tier
            referrer_code.current_tier = new_tier
            logger.info(f"🏆 Tier atualizado: {referrer_id} de {old_tier} para {new_tier}")
        
        self.db.commit()
    
    def get_tier_info(self, tier: ReferralTier) -> Dict[str, Any]:
        """Retorna informações sobre um tier"""
        return {
            "tier": tier.value,
            "min_referrals": TIER_CONFIG[tier]["min_referrals"],
            "commission_rate": float(TIER_CONFIG[tier]["commission_rate"]),
        }
    
    # =========================================================================
    # ESTATÍSTICAS
    # =========================================================================
    
    def get_user_referral_stats(self, user_id: str) -> Dict[str, Any]:
        """Retorna estatísticas de indicação de um usuário"""
        user_uuid = to_uuid(user_id)
        referrer_code = self.get_or_create_referral_code(user_id)
        
        # Busca indicações
        referrals = self.db.query(Referral).filter(
            Referral.referrer_id == user_uuid
        ).all()
        
        # Conta por status
        pending_count = sum(1 for r in referrals if r.status == ReferralStatus.PENDING)
        active_count = sum(1 for r in referrals if r.status == ReferralStatus.ACTIVE)
        inactive_count = sum(1 for r in referrals if r.status == ReferralStatus.INACTIVE)
        
        # Ganhos pendentes
        pending_earnings = self.db.query(
            func.sum(ReferralEarning.commission_amount)
        ).filter(
            ReferralEarning.referrer_id == user_uuid,
            ReferralEarning.is_paid == False
        ).scalar() or Decimal("0")
        
        # Ganhos totais
        total_earnings = self.db.query(
            func.sum(ReferralEarning.commission_amount)
        ).filter(
            ReferralEarning.referrer_id == user_uuid
        ).scalar() or Decimal("0")
        
        # Próximo tier
        current_tier = referrer_code.current_tier
        next_tier = None
        referrals_to_next = 0
        
        tier_order = [ReferralTier.BRONZE, ReferralTier.SILVER, ReferralTier.GOLD, 
                      ReferralTier.DIAMOND, ReferralTier.AMBASSADOR]
        current_idx = tier_order.index(current_tier)
        
        if current_idx < len(tier_order) - 1:
            next_tier = tier_order[current_idx + 1]
            referrals_to_next = TIER_CONFIG[next_tier]["min_referrals"] - active_count
        
        return {
            "referral_code": referrer_code.code,
            "current_tier": current_tier.value,
            "commission_rate": float(TIER_CONFIG[current_tier]["commission_rate"]),
            "total_referrals": referrer_code.total_referrals,
            "active_referrals": active_count,
            "pending_referrals": pending_count,
            "inactive_referrals": inactive_count,
            "total_earned": float(total_earnings),
            "pending_earnings": float(pending_earnings),
            "next_tier": next_tier.value if next_tier else None,
            "referrals_to_next_tier": max(0, referrals_to_next) if next_tier else 0,
        }
    
    def get_recent_earnings(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retorna ganhos recentes de um usuário"""
        user_uuid = to_uuid(user_id)
        
        earnings = self.db.query(ReferralEarning).filter(
            ReferralEarning.referrer_id == user_uuid
        ).order_by(ReferralEarning.created_at.desc()).limit(limit).all()
        
        result = []
        for e in earnings:
            # Tratar tier_at_earning que pode ser Enum ou String
            tier_value = "BRONZE"
            if e.tier_at_earning is not None:
                tier_value = e.tier_at_earning.value if hasattr(e.tier_at_earning, 'value') else str(e.tier_at_earning)
            
            result.append({
                "id": str(e.id),
                "transaction_type": e.transaction_type or "",
                "transaction_amount": float(e.transaction_amount or 0),
                "fee_amount": float(e.fee_amount or 0),
                "commission_rate": float(e.commission_rate or 0),
                "commission_amount": float(e.commission_amount or 0),
                "tier": tier_value,
                "is_paid": bool(e.is_paid) if e.is_paid is not None else False,
                "created_at": e.created_at.isoformat() if e.created_at is not None else "",
            })
        
        return result
    
    def get_referral_list(self, user_id: str) -> List[Dict[str, Any]]:
        """Retorna lista de indicados de um usuário"""
        user_uuid = to_uuid(user_id)
        
        referrals = self.db.query(Referral).filter(
            Referral.referrer_id == user_uuid
        ).order_by(Referral.created_at.desc()).all()
        
        result = []
        for r in referrals:
            # Busca info do usuário indicado (mascarado)
            referred_user = self.db.query(User).filter(User.id == r.referred_id).first()
            username_masked = "***" + referred_user.username[-3:] if referred_user else "***"
            
            result.append({
                "id": str(r.id),
                "referred_username": username_masked,
                "status": r.status.value,
                "created_at": r.created_at.isoformat(),
                "qualified_at": r.qualified_at.isoformat() if r.qualified_at else None,
                "last_activity": r.last_activity_at.isoformat() if r.last_activity_at else None,
                "total_volume": float(r.total_volume_generated),
                "total_commission": float(r.total_commission_paid),
            })
        
        return result
    
    # =========================================================================
    # CONFIG
    # =========================================================================
    
    def _get_config(self) -> Optional[ReferralConfig]:
        """Obtém configuração do programa"""
        return self.db.query(ReferralConfig).first()
    
    def get_program_info(self) -> Dict[str, Any]:
        """Retorna informações públicas do programa"""
        config = self._get_config()
        
        return {
            "is_active": config.is_program_active if config else True,
            "tiers": [
                {
                    "name": tier.value,
                    "min_referrals": TIER_CONFIG[tier]["min_referrals"],
                    "commission_rate": float(TIER_CONFIG[tier]["commission_rate"]),
                }
                for tier in ReferralTier
            ],
            "rules": {
                "min_transaction_to_qualify": float(config.min_transaction_to_qualify) if config else 1.0,
                "days_to_consider_active": config.days_to_consider_active if config else 30,
            }
        }


# Função helper para criar instância
def get_referral_service(db: Session) -> ReferralService:
    return ReferralService(db)
