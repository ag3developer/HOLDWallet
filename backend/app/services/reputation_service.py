"""
⭐ HOLD Wallet - Sistema de Reputação e Confiabilidade P2P
=========================================================

Sistema completo de avaliação de traders, detecção de fraudes,
e gestão de múltiplos métodos de pagamento para criar confiança
máxima no marketplace P2P.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
import uuid
import logging
import re
from dataclasses import dataclass

from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

class PaymentMethodType(str, Enum):
    """Métodos de pagamento suportados com verificações específicas"""
    PIX = "pix"
    TED = "ted"
    DOC = "doc"
    BANK_TRANSFER = "bank_transfer"
    MERCADO_PAGO = "mercado_pago"
    PICPAY = "picpay"
    PAYPAL = "paypal"
    NUBANK = "nubank"
    INTER = "inter"
    C6_BANK = "c6_bank"
    CASH_DEPOSIT = "cash_deposit"
    CRYPTOCURRENCY = "cryptocurrency"

class FraudRiskLevel(str, Enum):
    """Níveis de risco de fraude"""
    VERY_LOW = "very_low"     # 0-10%
    LOW = "low"               # 11-25%
    MEDIUM = "medium"         # 26-50%
    HIGH = "high"             # 51-75%
    VERY_HIGH = "very_high"   # 76-90%
    CRITICAL = "critical"     # 91-100%

class TraderLevel(str, Enum):
    """Níveis de trader baseados em reputação"""
    NEWCOMER = "newcomer"           # 0-10 trades
    BRONZE = "bronze"               # 11-50 trades
    SILVER = "silver"               # 51-150 trades
    GOLD = "gold"                   # 151-500 trades
    PLATINUM = "platinum"           # 501-1500 trades
    DIAMOND = "diamond"             # 1501-5000 trades
    MASTER = "master"               # 5000+ trades

@dataclass
class PaymentMethodInfo:
    """Informações detalhadas sobre métodos de pagamento"""
    name: str
    display_name: str
    instant: bool
    verification_required: bool
    max_amount: float
    processing_time: str
    fees: str
    fraud_protection: str
    popularity: float  # 0-100%

class ReputationService:
    """Serviço completo de reputação e antifraude"""
    
    def __init__(self):
        # Métodos de pagamento suportados
        self.PAYMENT_METHODS = {
            PaymentMethodType.PIX: PaymentMethodInfo(
                name="PIX",
                display_name="PIX - Instant Transfer",
                instant=True,
                verification_required=True,
                max_amount=200000.0,  # R$ 200k por transação
                processing_time="Instantâneo",
                fees="Gratuito",
                fraud_protection="Alto (Banco Central)",
                popularity=85.5
            ),
            PaymentMethodType.TED: PaymentMethodInfo(
                name="TED",
                display_name="TED - Bank Transfer",
                instant=False,
                verification_required=True,
                max_amount=1000000.0,  # R$ 1M por transação
                processing_time="30 min - 2 horas",
                fees="R$ 8 - R$ 25",
                fraud_protection="Alto (Sistema Bancário)",
                popularity=45.2
            ),
            PaymentMethodType.MERCADO_PAGO: PaymentMethodInfo(
                name="MERCADO_PAGO",
                display_name="Mercado Pago",
                instant=True,
                verification_required=True,
                max_amount=50000.0,  # R$ 50k por transação
                processing_time="Instantâneo",
                fees="2.99% + R$ 0.40",
                fraud_protection="Médio (Mercado Livre)",
                popularity=68.7
            ),
            PaymentMethodType.PICPAY: PaymentMethodInfo(
                name="PICPAY",
                display_name="PicPay",
                instant=True,
                verification_required=True,
                max_amount=10000.0,  # R$ 10k por transação
                processing_time="Instantâneo",
                fees="R$ 1.99 fixo",
                fraud_protection="Médio (PicPay)",
                popularity=32.1
            ),
            PaymentMethodType.NUBANK: PaymentMethodInfo(
                name="NUBANK",
                display_name="Nubank",
                instant=True,
                verification_required=True,
                max_amount=100000.0,
                processing_time="Instantâneo",
                fees="Gratuito",
                fraud_protection="Alto (Nubank)",
                popularity=41.3
            ),
            PaymentMethodType.CASH_DEPOSIT: PaymentMethodInfo(
                name="CASH_DEPOSIT",
                display_name="Depósito em Dinheiro",
                instant=False,
                verification_required=True,
                max_amount=20000.0,
                processing_time="Até 24 horas",
                fees="Gratuito",
                fraud_protection="Médio (Comprovante)",
                popularity=15.8
            )
        }
        
        # Badges de reputação
        self.REPUTATION_BADGES = {
            "fast_trader": {"name": "⚡ Trader Rápido", "requirement": "Tempo médio < 10 min"},
            "high_volume": {"name": "💎 Alto Volume", "requirement": "Volume mensal > R$ 100k"},
            "trusted_seller": {"name": "🛡️ Vendedor Confiável", "requirement": "100+ vendas, 98%+ sucesso"},
            "verified_id": {"name": "✅ ID Verificado", "requirement": "KYC completo aprovado"},
            "long_time_user": {"name": "🏆 Usuário Veterano", "requirement": "2+ anos na plataforma"},
            "dispute_free": {"name": "🕊️ Zero Disputas", "requirement": "500+ trades sem disputas"},
            "premium_support": {"name": "👑 Suporte Premium", "requirement": "Assinatura Pro/Enterprise"},
            "community_helper": {"name": "🤝 Ajudador da Comunidade", "requirement": "Feedback positivo recorrente"}
        }

    async def calculate_user_reputation(
        self,
        db: Session,
        user_id: str
    ) -> Dict[str, Any]:
        """Calcular reputação completa do usuário"""
        try:
            # Mock data - em produção buscar do banco
            trade_history = {
                "total_trades": 347,
                "completed_trades": 342,
                "cancelled_trades": 3,
                "disputed_trades": 2,
                "total_volume_brl": 2450000.00,
                "avg_completion_time": 12.5,  # minutos
                "avg_response_time": 3.2,     # minutos
                "account_age_days": 456,
                "last_active": datetime.now() - timedelta(hours=2)
            }
            
            # Calcular score base (0-100)
            completion_rate = (trade_history["completed_trades"] / trade_history["total_trades"]) * 100
            dispute_rate = (trade_history["disputed_trades"] / trade_history["total_trades"]) * 100
            
            # Fatores de score
            completion_score = min(completion_rate, 100)
            dispute_penalty = dispute_rate * 10  # -10 pontos por 1% de disputas
            volume_bonus = min(trade_history["total_volume_brl"] / 10000, 20)  # Até 20 pontos por volume
            speed_bonus = max(0, 20 - trade_history["avg_completion_time"])  # Bonus por velocidade
            
            base_score = completion_score - dispute_penalty + volume_bonus + speed_bonus
            reputation_score = max(0, min(100, base_score))
            
            # Determinar nível de trader
            trader_level = self._determine_trader_level(trade_history["total_trades"])
            
            # Verificar badges conquistados
            earned_badges = self._calculate_earned_badges(user_id, trade_history)
            
            # Análise de confiabilidade
            trust_analysis = self._analyze_trustworthiness(trade_history, reputation_score)
            
            return {
                "user_id": user_id,
                "reputation_score": round(reputation_score, 1),
                "trader_level": trader_level,
                "total_trades": trade_history["total_trades"],
                "completion_rate": round(completion_rate, 1),
                "dispute_rate": round(dispute_rate, 2),
                "avg_completion_time": f"{trade_history['avg_completion_time']:.1f} min",
                "avg_response_time": f"{trade_history['avg_response_time']:.1f} min",
                "total_volume": f"R$ {trade_history['total_volume_brl']:,.2f}",
                "account_age": f"{trade_history['account_age_days']} dias",
                "badges": earned_badges,
                "trust_indicators": trust_analysis,
                "last_seen": trade_history["last_active"].isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate reputation: {e}")
            raise ValidationError(f"Failed to calculate reputation: {str(e)}")

    def _determine_trader_level(self, total_trades: int) -> Dict[str, Any]:
        """Determinar nível do trader baseado em trades"""
        if total_trades >= 5000:
            level = TraderLevel.MASTER
            next_milestone = None
            progress = 100
        elif total_trades >= 1501:
            level = TraderLevel.DIAMOND
            next_milestone = 5000
            progress = (total_trades - 1501) / (5000 - 1501) * 100
        elif total_trades >= 501:
            level = TraderLevel.PLATINUM
            next_milestone = 1501
            progress = (total_trades - 501) / (1501 - 501) * 100
        elif total_trades >= 151:
            level = TraderLevel.GOLD
            next_milestone = 501
            progress = (total_trades - 151) / (501 - 151) * 100
        elif total_trades >= 51:
            level = TraderLevel.SILVER
            next_milestone = 151
            progress = (total_trades - 51) / (151 - 51) * 100
        elif total_trades >= 11:
            level = TraderLevel.BRONZE
            next_milestone = 51
            progress = (total_trades - 11) / (51 - 11) * 100
        else:
            level = TraderLevel.NEWCOMER
            next_milestone = 11
            progress = total_trades / 11 * 100
        
        return {
            "level": level.value,
            "display_name": level.value.title(),
            "current_trades": total_trades,
            "next_milestone": next_milestone,
            "progress_percentage": round(progress, 1),
            "icon": self._get_level_icon(level)
        }

    def _get_level_icon(self, level: TraderLevel) -> str:
        """Retornar ícone do nível"""
        icons = {
            TraderLevel.NEWCOMER: "🥉",
            TraderLevel.BRONZE: "🥉",
            TraderLevel.SILVER: "🥈",
            TraderLevel.GOLD: "🥇",
            TraderLevel.PLATINUM: "💎",
            TraderLevel.DIAMOND: "💎",
            TraderLevel.MASTER: "👑"
        }
        return icons.get(level, "⭐")

    def _calculate_earned_badges(self, user_id: str, trade_history: Dict) -> List[Dict[str, Any]]:
        """Calcular badges conquistados pelo usuário"""
        earned = []
        
        # Fast Trader
        if trade_history["avg_completion_time"] < 10:
            earned.append({
                "badge": "fast_trader",
                "name": self.REPUTATION_BADGES["fast_trader"]["name"],
                "earned_at": "2024-10-15",
                "description": "Completa trades em menos de 10 minutos"
            })
        
        # High Volume
        monthly_volume = trade_history["total_volume_brl"] / 12  # Estimativa mensal
        if monthly_volume > 100000:
            earned.append({
                "badge": "high_volume",
                "name": self.REPUTATION_BADGES["high_volume"]["name"],
                "earned_at": "2024-09-22",
                "description": f"Volume médio mensal: R$ {monthly_volume:,.0f}"
            })
        
        # Trusted Seller
        completion_rate = (trade_history["completed_trades"] / trade_history["total_trades"]) * 100
        if trade_history["completed_trades"] >= 100 and completion_rate >= 98:
            earned.append({
                "badge": "trusted_seller",
                "name": self.REPUTATION_BADGES["trusted_seller"]["name"],
                "earned_at": "2024-08-10",
                "description": f"{completion_rate:.1f}% taxa de sucesso"
            })
        
        # Verified ID (sempre ativo para demo)
        earned.append({
            "badge": "verified_id",
            "name": self.REPUTATION_BADGES["verified_id"]["name"],
            "earned_at": "2024-05-01",
            "description": "Documentos verificados pela HOLD Wallet"
        })
        
        # Long Time User
        if trade_history["account_age_days"] > 730:  # 2+ anos
            earned.append({
                "badge": "long_time_user",
                "name": self.REPUTATION_BADGES["long_time_user"]["name"],
                "earned_at": "2024-05-01",
                "description": f"{trade_history['account_age_days']} dias na plataforma"
            })
        
        # Dispute Free
        if trade_history["total_trades"] >= 500 and trade_history["disputed_trades"] == 0:
            earned.append({
                "badge": "dispute_free",
                "name": self.REPUTATION_BADGES["dispute_free"]["name"],
                "earned_at": "2024-11-01",
                "description": "500+ trades sem nenhuma disputa"
            })
        
        return earned

    def _analyze_trustworthiness(self, trade_history: Dict, reputation_score: float) -> Dict[str, Any]:
        """Analisar indicadores de confiabilidade"""
        indicators = []
        
        # Score alto
        if reputation_score >= 95:
            indicators.append({
                "type": "excellent",
                "icon": "⭐",
                "message": "Reputação excelente (95+)",
                "weight": "high"
            })
        elif reputation_score >= 85:
            indicators.append({
                "type": "good",
                "icon": "✅",
                "message": "Boa reputação (85+)",
                "weight": "medium"
            })
        
        # Volume alto
        if trade_history["total_volume_brl"] > 1000000:
            indicators.append({
                "type": "volume",
                "icon": "💰",
                "message": "Alto volume transacionado (R$ 1M+)",
                "weight": "high"
            })
        
        # Trader experiente
        if trade_history["total_trades"] > 200:
            indicators.append({
                "type": "experience",
                "icon": "🎯",
                "message": f"Trader experiente ({trade_history['total_trades']} trades)",
                "weight": "medium"
            })
        
        # Ativo recentemente
        hours_since_active = (datetime.now() - trade_history["last_active"]).total_seconds() / 3600
        if hours_since_active < 24:
            indicators.append({
                "type": "activity",
                "icon": "🟢",
                "message": "Ativo nas últimas 24h",
                "weight": "low"
            })
        
        # Resposta rápida
        if trade_history["avg_response_time"] < 5:
            indicators.append({
                "type": "responsiveness",
                "icon": "⚡",
                "message": "Resposta rápida (< 5 min)",
                "weight": "medium"
            })
        
        return {
            "indicators": indicators,
            "trust_level": self._calculate_trust_level(reputation_score, len(indicators)),
            "recommendation": self._get_trust_recommendation(reputation_score)
        }

    def _calculate_trust_level(self, score: float, indicator_count: int) -> str:
        """Calcular nível de confiança geral"""
        if score >= 95 and indicator_count >= 4:
            return "Extremamente Confiável"
        elif score >= 85 and indicator_count >= 3:
            return "Muito Confiável"
        elif score >= 75 and indicator_count >= 2:
            return "Confiável"
        elif score >= 60:
            return "Moderadamente Confiável"
        else:
            return "Baixa Confiabilidade"

    def _get_trust_recommendation(self, score: float) -> str:
        """Gerar recomendação baseada na confiança"""
        if score >= 95:
            return "Recomendado para grandes transações. Histórico excelente."
        elif score >= 85:
            return "Trader confiável. Bom para transações médias a grandes."
        elif score >= 75:
            return "Trader moderadamente confiável. Recomendado para transações menores."
        elif score >= 60:
            return "Proceda com cautela. Considere usar escrow extendido."
        else:
            return "Alto risco. Não recomendado para novos usuários."

    async def detect_fraud_indicators(
        self,
        db: Session,
        user_id: str,
        order_data: Dict[str, Any],
        payment_method: PaymentMethodType
    ) -> Dict[str, Any]:
        """Sistema avançado de detecção de fraudes"""
        try:
            fraud_indicators = []
            risk_score = 0.0
            
            # 1. Verificar padrões suspeitos de usuário
            user_patterns = await self._analyze_user_patterns(db, user_id)
            risk_score += user_patterns["risk_contribution"]
            fraud_indicators.extend(user_patterns["indicators"])
            
            # 2. Verificar dados da transação
            transaction_risks = self._analyze_transaction_risk(order_data, payment_method)
            risk_score += transaction_risks["risk_contribution"]
            fraud_indicators.extend(transaction_risks["indicators"])
            
            # 3. Verificar método de pagamento
            payment_risks = self._analyze_payment_method_risk(payment_method, order_data["amount"])
            risk_score += payment_risks["risk_contribution"]
            fraud_indicators.extend(payment_risks["indicators"])
            
            # 4. Verificar velocidade e timing
            timing_risks = self._analyze_timing_patterns(user_id, order_data)
            risk_score += timing_risks["risk_contribution"]
            fraud_indicators.extend(timing_risks["indicators"])
            
            # Determinar nível de risco
            risk_level = self._determine_risk_level(risk_score)
            
            # Gerar ações recomendadas
            recommended_actions = self._generate_fraud_actions(risk_level, fraud_indicators)
            
            return {
                "fraud_risk_score": round(risk_score, 2),
                "risk_level": risk_level.value,
                "fraud_indicators": fraud_indicators,
                "recommended_actions": recommended_actions,
                "requires_manual_review": risk_score > 75,
                "auto_block": risk_score > 90,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed fraud detection: {e}")
            # Em caso de erro, assumir risco médio para segurança
            return {
                "fraud_risk_score": 50.0,
                "risk_level": FraudRiskLevel.MEDIUM.value,
                "error": str(e),
                "requires_manual_review": True
            }

    async def _analyze_user_patterns(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Analisar padrões comportamentais do usuário"""
        indicators = []
        risk = 0.0
        
        # Mock data - em produção buscar do banco
        user_data = {
            "account_age_days": 456,
            "trades_today": 3,
            "trades_this_week": 15,
            "failed_kyc_attempts": 0,
            "recent_disputes": 1,
            "ip_country_changes": 0,
            "device_changes": 1
        }
        
        # Conta muito nova
        if user_data["account_age_days"] < 7:
            indicators.append({
                "type": "new_account",
                "severity": "medium",
                "message": f"Conta criada há apenas {user_data['account_age_days']} dias",
                "risk_points": 25
            })
            risk += 25
        
        # Atividade excessiva
        if user_data["trades_today"] > 10:
            indicators.append({
                "type": "excessive_activity",
                "severity": "high",
                "message": f"{user_data['trades_today']} trades hoje (acima do normal)",
                "risk_points": 30
            })
            risk += 30
        
        # Disputas recentes
        if user_data["recent_disputes"] > 0:
            indicators.append({
                "type": "recent_disputes",
                "severity": "medium",
                "message": f"{user_data['recent_disputes']} disputas recentes",
                "risk_points": 20
            })
            risk += 20
        
        # Mudanças de IP/localização suspeitas
        if user_data["ip_country_changes"] > 2:
            indicators.append({
                "type": "location_anomaly",
                "severity": "high",
                "message": "Múltiplas mudanças de país detectadas",
                "risk_points": 40
            })
            risk += 40
        
        return {
            "risk_contribution": risk,
            "indicators": indicators
        }

    def _analyze_transaction_risk(self, order_data: Dict, payment_method: PaymentMethodType) -> Dict[str, Any]:
        """Analisar riscos específicos da transação"""
        indicators = []
        risk = 0.0
        
        # Valor muito alto
        if order_data["total_value"] > 100000:  # R$ 100k+
            indicators.append({
                "type": "high_value",
                "severity": "medium",
                "message": f"Transação de alto valor: R$ {order_data['total_value']:,.2f}",
                "risk_points": 15
            })
            risk += 15
        
        # Preço muito fora do mercado
        market_price = 220000.0  # Mock do preço atual do BTC
        order_price = order_data.get("price_brl", market_price)
        price_deviation = abs(order_price - market_price) / market_price * 100
        
        if price_deviation > 5:  # Mais de 5% de diferença
            indicators.append({
                "type": "price_anomaly",
                "severity": "high" if price_deviation > 10 else "medium",
                "message": f"Preço {price_deviation:.1f}% diferente do mercado",
                "risk_points": 25 if price_deviation > 10 else 15
            })
            risk += 25 if price_deviation > 10 else 15
        
        return {
            "risk_contribution": risk,
            "indicators": indicators
        }

    def _analyze_payment_method_risk(self, payment_method: PaymentMethodType, amount: float) -> Dict[str, Any]:
        """Analisar riscos do método de pagamento"""
        indicators = []
        risk = 0.0
        
        method_info = self.PAYMENT_METHODS.get(payment_method)
        if not method_info:
            return {"risk_contribution": 50, "indicators": [{"type": "unknown_method", "severity": "high"}]}
        
        # Valor acima do limite do método
        if amount > method_info.max_amount:
            indicators.append({
                "type": "amount_limit",
                "severity": "high",
                "message": f"Valor R$ {amount:,.2f} excede limite de {method_info.display_name}",
                "risk_points": 35
            })
            risk += 35
        
        # Método com baixa proteção contra fraude
        if "Médio" in method_info.fraud_protection:
            indicators.append({
                "type": "medium_protection",
                "severity": "low",
                "message": f"{method_info.display_name} tem proteção média contra fraudes",
                "risk_points": 10
            })
            risk += 10
        
        return {
            "risk_contribution": risk,
            "indicators": indicators
        }

    def _analyze_timing_patterns(self, user_id: str, order_data: Dict) -> Dict[str, Any]:
        """Analisar padrões de timing suspeitos"""
        indicators = []
        risk = 0.0
        
        # Horário suspeito (madrugada)
        current_hour = datetime.now().hour
        if current_hour >= 2 and current_hour <= 5:
            indicators.append({
                "type": "suspicious_hour",
                "severity": "low",
                "message": f"Transação criada às {current_hour}h (horário incomum)",
                "risk_points": 5
            })
            risk += 5
        
        return {
            "risk_contribution": risk,
            "indicators": indicators
        }

    def _determine_risk_level(self, risk_score: float) -> FraudRiskLevel:
        """Determinar nível de risco baseado no score"""
        if risk_score >= 90:
            return FraudRiskLevel.CRITICAL
        elif risk_score >= 75:
            return FraudRiskLevel.VERY_HIGH
        elif risk_score >= 50:
            return FraudRiskLevel.HIGH
        elif risk_score >= 25:
            return FraudRiskLevel.MEDIUM
        elif risk_score >= 10:
            return FraudRiskLevel.LOW
        else:
            return FraudRiskLevel.VERY_LOW

    def _generate_fraud_actions(self, risk_level: FraudRiskLevel, indicators: List) -> List[str]:
        """Gerar ações recomendadas baseadas no risco"""
        actions = []
        
        if risk_level in [FraudRiskLevel.CRITICAL, FraudRiskLevel.VERY_HIGH]:
            actions.extend([
                "🚫 BLOQUEAR transação automaticamente",
                "👨‍💼 Revisar manualmente antes de prosseguir",
                "📞 Contactar usuário por telefone/email",
                "🔍 Investigar histórico completo do usuário"
            ])
        elif risk_level == FraudRiskLevel.HIGH:
            actions.extend([
                "⏸️ PAUSAR transação para revisão",
                "📋 Solicitar documentação adicional",
                "⏰ Estender tempo de escrow para 48h",
                "🤖 Monitorar chat por IA"
            ])
        elif risk_level == FraudRiskLevel.MEDIUM:
            actions.extend([
                "⚠️ Marcar para monitoramento adicional",
                "📸 Solicitar comprovante de pagamento detalhado",
                "🔒 Usar escrow extendido (24h)",
                "💬 Monitorar comunicação no chat"
            ])
        elif risk_level == FraudRiskLevel.LOW:
            actions.extend([
                "✅ Prosseguir com precauções normais",
                "📊 Monitorar métricas padrão",
                "🔍 Verificação automática de comprovantes"
            ])
        else:  # VERY_LOW
            actions.extend([
                "🟢 Prosseguir normalmente",
                "📈 Usar para melhorar score de reputação"
            ])
        
        return actions

    async def get_payment_methods_info(self) -> Dict[str, Any]:
        """Obter informações detalhadas sobre métodos de pagamento"""
        methods_list = []
        
        for method_type, info in self.PAYMENT_METHODS.items():
            methods_list.append({
                "id": method_type.value,
                "name": info.name,
                "display_name": info.display_name,
                "instant": info.instant,
                "verification_required": info.verification_required,
                "max_amount": info.max_amount,
                "processing_time": info.processing_time,
                "fees": info.fees,
                "fraud_protection": info.fraud_protection,
                "popularity": info.popularity,
                "icon": self._get_payment_icon(method_type),
                "recommended_for": self._get_payment_recommendation(method_type)
            })
        
        # Ordenar por popularidade
        methods_list.sort(key=lambda x: x["popularity"], reverse=True)
        
        return {
            "payment_methods": methods_list,
            "total_methods": len(methods_list),
            "most_popular": methods_list[0]["display_name"],
            "instant_methods": [m for m in methods_list if m["instant"]],
            "high_limit_methods": [m for m in methods_list if m["max_amount"] >= 100000]
        }

    def _get_payment_icon(self, method: PaymentMethodType) -> str:
        """Retornar ícone do método de pagamento"""
        icons = {
            PaymentMethodType.PIX: "🚀",
            PaymentMethodType.TED: "🏦", 
            PaymentMethodType.MERCADO_PAGO: "💙",
            PaymentMethodType.PICPAY: "💚",
            PaymentMethodType.NUBANK: "💜",
            PaymentMethodType.CASH_DEPOSIT: "💰"
        }
        return icons.get(method, "💳")

    def _get_payment_recommendation(self, method: PaymentMethodType) -> str:
        """Gerar recomendação de uso para o método"""
        recommendations = {
            PaymentMethodType.PIX: "Ideal para transações rápidas até R$ 200k",
            PaymentMethodType.TED: "Melhor para valores altos acima de R$ 50k",
            PaymentMethodType.MERCADO_PAGO: "Conveniente para valores até R$ 50k",
            PaymentMethodType.PICPAY: "Perfeito para transações pequenas até R$ 10k",
            PaymentMethodType.NUBANK: "Excelente para usuários Nubank até R$ 100k",
            PaymentMethodType.CASH_DEPOSIT: "Opção anônima para valores até R$ 20k"
        }
        return recommendations.get(method, "Método de pagamento alternativo")

# Instância global
reputation_service = ReputationService()
