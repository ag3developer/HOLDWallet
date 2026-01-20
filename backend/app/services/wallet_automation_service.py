"""
🤖 Wallet Automation Service
=============================

Serviço para automação de transferências entre carteiras do sistema.

FUNCIONALIDADES:
1. Auto-sweep: Mover fundos de FEES para COLD quando acumular
2. HOT replenish: Reabastecer HOT quando saldo baixo
3. Cold consolidation: Consolidar fundos em COLD periodicamente
4. Threshold alerts: Alertas quando limites são atingidos

CONFIGURAÇÕES:
- HOT_MAX_BALANCE: Máximo em HOT antes de mover para COLD
- HOT_MIN_BALANCE: Mínimo em HOT para acionar reabastecimento
- FEES_SWEEP_THRESHOLD: Mínimo em FEES para fazer sweep
- CONSOLIDATION_INTERVAL: Intervalo entre consolidações

Autor: Sistema HOLDWallet
Data: Janeiro 2026
"""

import logging
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.system_blockchain_wallet import (
    SystemBlockchainWallet,
    SystemBlockchainAddress,
    SystemWalletTransaction
)

logger = logging.getLogger(__name__)


class WalletAutomationService:
    """Serviço de automação para carteiras do sistema."""
    
    # ========================================================================
    # CONFIGURAÇÕES DE THRESHOLDS (em USD para stablecoins)
    # ========================================================================
    
    # HOT Wallet
    HOT_MAX_BALANCE_USD = Decimal("10000")   # Mover para COLD se HOT > 10k
    HOT_MIN_BALANCE_USD = Decimal("1000")    # Reabastecer se HOT < 1k
    HOT_TARGET_BALANCE_USD = Decimal("5000") # Valor alvo após reabastecimento
    
    # FEES Wallet
    FEES_SWEEP_THRESHOLD_USD = Decimal("500")  # Fazer sweep se FEES > 500
    FEES_SWEEP_TARGET_WALLET = "cold_wallet"   # Para onde enviar
    
    # Consolidação
    CONSOLIDATION_INTERVAL_HOURS = 24  # A cada 24 horas
    MIN_TRANSFER_AMOUNT_USD = Decimal("10")  # Mínimo para transferir
    
    # Redes prioritárias (verificar primeiro)
    PRIORITY_NETWORKS = ["polygon", "bsc", "ethereum", "tron"]
    
    # Tokens para monitorar
    MONITORED_TOKENS = ["usdt", "usdc"]
    
    def __init__(self):
        self.last_consolidation: Optional[datetime] = None
        self.automation_enabled = True
        self.dry_run = False  # Se True, não executa transferências reais
    
    # ========================================================================
    # ANÁLISE DE SALDOS
    # ========================================================================
    
    def get_wallet_stables_balance(
        self,
        db: Session,
        wallet_name: str
    ) -> Dict[str, Any]:
        """
        Obter saldo total de stablecoins de uma carteira.
        
        Returns:
            {
                "total_usd": Decimal,
                "by_network": {
                    "polygon": {"usdt": Decimal, "usdc": Decimal},
                    ...
                }
            }
        """
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == wallet_name,
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            return {"total_usd": Decimal("0"), "by_network": {}}
        
        addresses = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.is_active == True
        ).all()
        
        total_usd = Decimal("0")
        by_network = {}
        
        for addr in addresses:
            network = str(addr.network)
            usdt = Decimal(str(addr.cached_usdt_balance or 0))
            usdc = Decimal(str(addr.cached_usdc_balance or 0))
            
            by_network[network] = {
                "usdt": usdt,
                "usdc": usdc,
                "total": usdt + usdc
            }
            total_usd += usdt + usdc
        
        return {
            "wallet_name": wallet_name,
            "wallet_type": wallet.wallet_type,
            "is_locked": wallet.is_locked,
            "total_usd": total_usd,
            "by_network": by_network
        }
    
    def analyze_all_wallets(self, db: Session) -> Dict[str, Any]:
        """
        Analisar todas as carteiras e retornar status.
        
        Returns:
            {
                "wallets": {...},
                "recommendations": [...],
                "actions_needed": [...]
            }
        """
        wallets = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.is_active == True
        ).all()
        
        analysis = {
            "wallets": {},
            "recommendations": [],
            "actions_needed": [],
            "total_system_usd": Decimal("0")
        }
        
        for wallet in wallets:
            balance_info = self.get_wallet_stables_balance(db, wallet.name)
            analysis["wallets"][wallet.name] = balance_info
            analysis["total_system_usd"] += balance_info["total_usd"]
        
        # Analisar e gerar recomendações
        self._analyze_hot_wallet(analysis)
        self._analyze_fees_wallet(analysis)
        self._analyze_distribution(analysis)
        
        return analysis
    
    def _analyze_hot_wallet(self, analysis: Dict) -> None:
        """Analisar HOT wallet e adicionar recomendações."""
        hot_wallets = [
            (name, data) for name, data in analysis["wallets"].items()
            if data.get("wallet_type") == "hot"
        ]
        
        for name, data in hot_wallets:
            total = data["total_usd"]
            
            if total > self.HOT_MAX_BALANCE_USD:
                excess = total - self.HOT_TARGET_BALANCE_USD
                analysis["recommendations"].append({
                    "type": "hot_excess",
                    "wallet": name,
                    "message": f"HOT wallet com ${total:.2f}. Mover ${excess:.2f} para COLD.",
                    "priority": "high"
                })
                analysis["actions_needed"].append({
                    "action": "transfer_to_cold",
                    "from_wallet": name,
                    "to_wallet": "cold_wallet",
                    "amount_usd": float(excess),
                    "reason": "hot_excess"
                })
            
            elif total < self.HOT_MIN_BALANCE_USD:
                needed = self.HOT_TARGET_BALANCE_USD - total
                analysis["recommendations"].append({
                    "type": "hot_low",
                    "wallet": name,
                    "message": f"HOT wallet com ${total:.2f}. Reabastecer ${needed:.2f} de COLD.",
                    "priority": "medium"
                })
                analysis["actions_needed"].append({
                    "action": "replenish_hot",
                    "from_wallet": "cold_wallet",
                    "to_wallet": name,
                    "amount_usd": float(needed),
                    "reason": "hot_low"
                })
    
    def _analyze_fees_wallet(self, analysis: Dict) -> None:
        """Analisar FEES wallet e adicionar recomendações."""
        fees_wallets = [
            (name, data) for name, data in analysis["wallets"].items()
            if data.get("wallet_type") == "fees" or name == "main_fees_wallet"
        ]
        
        for name, data in fees_wallets:
            total = data["total_usd"]
            
            if total > self.FEES_SWEEP_THRESHOLD_USD:
                analysis["recommendations"].append({
                    "type": "fees_sweep",
                    "wallet": name,
                    "message": f"FEES wallet com ${total:.2f}. Consolidar para COLD.",
                    "priority": "low"
                })
                analysis["actions_needed"].append({
                    "action": "sweep_fees",
                    "from_wallet": name,
                    "to_wallet": self.FEES_SWEEP_TARGET_WALLET,
                    "amount_usd": float(total - self.MIN_TRANSFER_AMOUNT_USD),
                    "reason": "fees_sweep"
                })
    
    def _analyze_distribution(self, analysis: Dict) -> None:
        """Analisar distribuição geral de fundos."""
        total = analysis["total_system_usd"]
        if total == 0:
            return
        
        cold_total = sum(
            data["total_usd"] for name, data in analysis["wallets"].items()
            if data.get("wallet_type") == "cold"
        )
        
        cold_pct = (cold_total / total * 100) if total > 0 else 0
        
        if cold_pct < 80:
            analysis["recommendations"].append({
                "type": "distribution",
                "message": f"Apenas {cold_pct:.1f}% dos fundos em COLD. Recomendado: 90%+",
                "priority": "medium"
            })
    
    # ========================================================================
    # EXECUÇÃO DE AUTOMAÇÕES
    # ========================================================================
    
    async def execute_pending_actions(
        self,
        db: Session,
        admin_user_id: str,
        max_actions: int = 5
    ) -> Dict[str, Any]:
        """
        Executar ações pendentes de automação.
        
        Args:
            db: Sessão do banco
            admin_user_id: ID do admin para auditoria
            max_actions: Máximo de ações a executar
        
        Returns:
            {
                "executed": [...],
                "skipped": [...],
                "errors": [...]
            }
        """
        if not self.automation_enabled:
            return {
                "executed": [],
                "skipped": [],
                "errors": [],
                "message": "Automação desabilitada"
            }
        
        # Analisar situação atual
        analysis = self.analyze_all_wallets(db)
        actions = analysis.get("actions_needed", [])[:max_actions]
        
        results = {
            "executed": [],
            "skipped": [],
            "errors": [],
            "dry_run": self.dry_run
        }
        
        for action in actions:
            try:
                result = await self._execute_action(db, action, admin_user_id)
                if result.get("success"):
                    results["executed"].append({
                        "action": action,
                        "result": result
                    })
                else:
                    results["skipped"].append({
                        "action": action,
                        "reason": result.get("message", "Falha desconhecida")
                    })
            except Exception as e:
                logger.error(f"Erro ao executar ação {action}: {e}")
                results["errors"].append({
                    "action": action,
                    "error": str(e)
                })
        
        return results
    
    async def _execute_action(
        self,
        db: Session,
        action: Dict,
        admin_user_id: str
    ) -> Dict[str, Any]:
        """Executar uma ação específica."""
        action_type = action.get("action")
        
        if self.dry_run:
            logger.info(f"[DRY RUN] Ação: {action_type} - {action}")
            return {
                "success": True,
                "dry_run": True,
                "action": action_type
            }
        
        # Importar serviço de envio
        from app.services.system_wallet_send_service import system_wallet_send_service
        
        from_wallet = action.get("from_wallet")
        to_wallet = action.get("to_wallet")
        amount_usd = Decimal(str(action.get("amount_usd", 0)))
        
        if amount_usd < self.MIN_TRANSFER_AMOUNT_USD:
            return {
                "success": False,
                "message": f"Valor muito baixo: ${amount_usd}"
            }
        
        # Verificar se carteira de origem está bloqueada
        source_wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == from_wallet,
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if source_wallet and source_wallet.is_locked:
            return {
                "success": False,
                "message": f"Carteira {from_wallet} está bloqueada"
            }
        
        # Encontrar melhor rede/token para transferir
        transfer_info = self._find_best_transfer_route(db, from_wallet, amount_usd)
        
        if not transfer_info:
            return {
                "success": False,
                "message": "Nenhuma rota de transferência encontrada"
            }
        
        # Buscar endereço de destino
        dest_wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == to_wallet,
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not dest_wallet:
            return {
                "success": False,
                "message": f"Carteira destino {to_wallet} não encontrada"
            }
        
        dest_address = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == dest_wallet.id,
            SystemBlockchainAddress.network == transfer_info["network"],
            SystemBlockchainAddress.is_active == True
        ).first()
        
        if not dest_address:
            return {
                "success": False,
                "message": f"Endereço destino não encontrado para {transfer_info['network']}"
            }
        
        # Executar transferência
        result = await system_wallet_send_service.send_from_system_wallet(
            db=db,
            wallet_name=from_wallet,
            network=transfer_info["network"],
            to_address=str(dest_address.address),
            amount=transfer_info["amount"],
            token=transfer_info["token"],
            admin_user_id=admin_user_id,
            memo=f"Auto: {action_type}"
        )
        
        return result
    
    def _find_best_transfer_route(
        self,
        db: Session,
        wallet_name: str,
        target_amount_usd: Decimal
    ) -> Optional[Dict]:
        """
        Encontrar melhor rede/token para transferir valor desejado.
        
        Prioriza:
        1. Redes com menor gas (Polygon, BSC)
        2. Tokens com saldo suficiente
        """
        balance_info = self.get_wallet_stables_balance(db, wallet_name)
        
        # Ordenar por rede prioritária
        for network in self.PRIORITY_NETWORKS:
            if network not in balance_info["by_network"]:
                continue
            
            network_data = balance_info["by_network"][network]
            
            # Tentar USDT primeiro (mais líquido)
            for token in ["usdt", "usdc"]:
                token_balance = network_data.get(token, Decimal("0"))
                
                if token_balance >= target_amount_usd:
                    return {
                        "network": network,
                        "token": token,
                        "amount": target_amount_usd,
                        "available": token_balance
                    }
                elif token_balance >= self.MIN_TRANSFER_AMOUNT_USD:
                    # Transferir o que tiver
                    return {
                        "network": network,
                        "token": token,
                        "amount": token_balance,
                        "available": token_balance,
                        "partial": True
                    }
        
        return None
    
    # ========================================================================
    # CONFIGURAÇÃO
    # ========================================================================
    
    def update_thresholds(
        self,
        hot_max: Optional[Decimal] = None,
        hot_min: Optional[Decimal] = None,
        hot_target: Optional[Decimal] = None,
        fees_sweep: Optional[Decimal] = None
    ) -> Dict[str, Decimal]:
        """Atualizar thresholds de automação."""
        if hot_max is not None:
            self.HOT_MAX_BALANCE_USD = hot_max
        if hot_min is not None:
            self.HOT_MIN_BALANCE_USD = hot_min
        if hot_target is not None:
            self.HOT_TARGET_BALANCE_USD = hot_target
        if fees_sweep is not None:
            self.FEES_SWEEP_THRESHOLD_USD = fees_sweep
        
        return self.get_current_thresholds()
    
    def get_current_thresholds(self) -> Dict[str, Any]:
        """Retornar thresholds atuais."""
        return {
            "hot_max_usd": float(self.HOT_MAX_BALANCE_USD),
            "hot_min_usd": float(self.HOT_MIN_BALANCE_USD),
            "hot_target_usd": float(self.HOT_TARGET_BALANCE_USD),
            "fees_sweep_threshold_usd": float(self.FEES_SWEEP_THRESHOLD_USD),
            "min_transfer_usd": float(self.MIN_TRANSFER_AMOUNT_USD),
            "consolidation_interval_hours": self.CONSOLIDATION_INTERVAL_HOURS,
            "automation_enabled": self.automation_enabled,
            "dry_run": self.dry_run
        }
    
    def enable_automation(self, enabled: bool = True) -> None:
        """Habilitar/desabilitar automação."""
        self.automation_enabled = enabled
        logger.info(f"Automação {'habilitada' if enabled else 'desabilitada'}")
    
    def set_dry_run(self, dry_run: bool = True) -> None:
        """Habilitar/desabilitar modo dry-run (não executa transferências reais)."""
        self.dry_run = dry_run
        logger.info(f"Dry-run {'habilitado' if dry_run else 'desabilitado'}")


# Instância singleton
wallet_automation_service = WalletAutomationService()
