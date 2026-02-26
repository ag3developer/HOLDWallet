"""
🌐 Multi-Chain Send Service
============================

Serviço UNIFICADO para envio automático de TODAS as 16 criptomoedas suportadas.
Este é o ponto central que roteia para o serviço específico de cada blockchain.

Redes Suportadas:
- EVM: ETH, MATIC, BNB, BASE, USDT, USDC (blockchain_deposit_service)
- Bitcoin-like: BTC, LTC, DOGE (btc_service, ltc_doge_service)
- Solana: SOL (sol_service)
- TRON: TRX, USDT-TRC20 (tron_service)
- XRP: XRP (xrp_service)
- Polkadot: DOT (dot_service)
- Cardano: ADA (ada_service) - a implementar
- Avalanche: AVAX (avalanche_service) - usa EVM
- Chainlink: LINK (ERC20 no Ethereum)
- Shiba: SHIB (ERC20 no Ethereum)

Autor: HOLD Wallet
Data: Janeiro 2026
"""

import logging
from decimal import Decimal
from typing import Dict, Optional, Any
from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.models.instant_trade import InstantTrade, TradeStatus
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class MultiChainSendResult:
    """Resultado de envio em qualquer blockchain."""
    success: bool
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    network: str = ""
    explorer_url: Optional[str] = None
    fee_paid: int = 0


# ============================================
# MAPEAMENTO DE REDES
# ============================================

# Criptos que usam EVM (Ethereum Virtual Machine)
# IMPORTANTE: cada token tem sua rede específica configurada
# Exemplo: TRAY é APENAS em Polygon (não existe em outras redes)
#          USDT existe em múltiplas redes, mas a padrão é Polygon
EVM_CRYPTOS = {
    'ETH': {'network': 'ethereum', 'native': True},
    'MATIC': {'network': 'polygon', 'native': True},
    'BNB': {'network': 'bsc', 'native': True},
    'AVAX': {'network': 'avalanche', 'native': True},  # C-Chain é EVM
    'USDT': {'network': 'polygon', 'native': False, 'contract': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'},  # Rede padrão: Polygon
    'USDC': {'network': 'polygon', 'native': False, 'contract': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'},  # Rede padrão: Polygon
    'TRAY': {'network': 'polygon', 'native': False, 'contract': '0x6b62514E925099643abA13B322A62ff6298f8E8A'},  # TRAY APENAS em Polygon (token de DEX)
    'LINK': {'network': 'ethereum', 'native': False, 'contract': '0x514910771AF9Ca656af840dff83E8264EcF986CA'},
    'SHIB': {'network': 'ethereum', 'native': False, 'contract': '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE'},
    'BASE': {'network': 'base', 'native': True},
}

# Criptos com blockchain própria (UTXO model)
UTXO_CRYPTOS = ['BTC', 'LTC', 'DOGE']

# Outras blockchains específicas
SPECIFIC_CRYPTOS = {
    'SOL': 'solana',
    'TRX': 'tron',
    'XRP': 'xrp',
    'DOT': 'polkadot',
    'ADA': 'cardano',
}


class MultiChainSendService:
    """
    Serviço unificado para envio de qualquer criptomoeda.
    Roteia automaticamente para o serviço correto baseado no símbolo.
    """
    
    def __init__(self):
        logger.info("🌐 MultiChainSendService initialized")
    
    def get_network_for_symbol(self, symbol: str) -> str:
        """Retorna a rede padrão para um símbolo."""
        symbol = symbol.upper()
        
        if symbol in EVM_CRYPTOS:
            return EVM_CRYPTOS[symbol]['network']
        
        if symbol in UTXO_CRYPTOS:
            return symbol.lower()
        
        if symbol in SPECIFIC_CRYPTOS:
            return SPECIFIC_CRYPTOS[symbol]
        
        return 'unknown'
    
    def is_evm_crypto(self, symbol: str) -> bool:
        """Verifica se é uma cripto EVM."""
        return symbol.upper() in EVM_CRYPTOS
    
    def is_utxo_crypto(self, symbol: str) -> bool:
        """Verifica se é uma cripto UTXO."""
        return symbol.upper() in UTXO_CRYPTOS
    
    async def send_crypto(
        self,
        db: Session,
        trade: InstantTrade,
        network: str = None,
        bypass_restriction: bool = False  # Admin pode ignorar restrições
    ) -> MultiChainSendResult:
        """
        Envia criptomoeda para o usuário.
        Detecta automaticamente qual serviço usar.
        
        Args:
            db: Sessão do banco
            trade: Trade com dados da transação
            network: Rede específica (opcional, detecta automaticamente)
            bypass_restriction: Se True, ignora verificação de restrict_deposits (uso admin)
            
        Returns:
            MultiChainSendResult com status
        """
        symbol = str(trade.symbol).upper()
        
        logger.info(f"🌐 Processando envio de {trade.crypto_amount} {symbol}...")
        
        try:
            # ============================================
            # EVM CRYPTOS (ETH, MATIC, USDT, etc)
            # ============================================
            if self.is_evm_crypto(symbol):
                return await self._send_evm(db, trade, network, bypass_restriction)
            
            # ============================================
            # BITCOIN
            # ============================================
            if symbol == 'BTC':
                return await self._send_btc(db, trade)
            
            # ============================================
            # LITECOIN
            # ============================================
            if symbol == 'LTC':
                return await self._send_ltc(db, trade)
            
            # ============================================
            # DOGECOIN
            # ============================================
            if symbol == 'DOGE':
                return await self._send_doge(db, trade)
            
            # ============================================
            # SOLANA
            # ============================================
            if symbol == 'SOL':
                return await self._send_sol(db, trade)
            
            # ============================================
            # TRON (TRX e USDT-TRC20)
            # ============================================
            if symbol == 'TRX':
                return await self._send_trx(db, trade)
            
            # ============================================
            # XRP (Ripple)
            # ============================================
            if symbol == 'XRP':
                return await self._send_xrp(db, trade)
            
            # ============================================
            # POLKADOT
            # ============================================
            if symbol == 'DOT':
                return await self._send_dot(db, trade)
            
            # ============================================
            # CARDANO (A implementar)
            # ============================================
            if symbol == 'ADA':
                return MultiChainSendResult(
                    success=False,
                    error="ADA ainda não implementado. Envie manualmente.",
                    network='cardano'
                )
            
            # Cripto não suportada
            return MultiChainSendResult(
                success=False,
                error=f"Criptomoeda {symbol} não suportada para envio automático",
                network='unknown'
            )
            
        except Exception as e:
            logger.error(f"❌ Erro no envio multi-chain: {e}")
            return MultiChainSendResult(
                success=False,
                error=str(e),
                network=self.get_network_for_symbol(symbol)
            )
    
    # ============================================
    # MÉTODOS PRIVADOS POR BLOCKCHAIN
    # ============================================
    
    async def _send_evm(self, db: Session, trade: InstantTrade, network: str = None, bypass_restriction: bool = False) -> MultiChainSendResult:
        """Envia crypto EVM (ETH, MATIC, USDT, etc)."""
        from app.services.blockchain_deposit_service import blockchain_deposit_service
        
        symbol = str(trade.symbol).upper()
        
        # Determinar rede
        if not network:
            network = EVM_CRYPTOS.get(symbol, {}).get('network', 'polygon')
        
        result = blockchain_deposit_service.deposit_crypto_to_user(
            db=db,
            trade=trade,
            network=network,
            bypass_restriction=bypass_restriction
        )
        
        return MultiChainSendResult(
            success=result.get('success', False),
            tx_hash=result.get('tx_hash'),
            error=result.get('error'),
            network=network,
            explorer_url=self._get_explorer_url(network, result.get('tx_hash'))
        )
    
    async def _send_btc(self, db: Session, trade: InstantTrade) -> MultiChainSendResult:
        """Envia Bitcoin."""
        from app.services.blockchain_deposit_service import blockchain_deposit_service
        
        result = await blockchain_deposit_service.send_btc_to_user(db=db, trade=trade)
        
        return MultiChainSendResult(
            success=result.get('success', False),
            tx_hash=result.get('tx_hash'),
            error=result.get('error'),
            network='bitcoin',
            explorer_url=result.get('explorer_url'),
            fee_paid=result.get('fee_paid_satoshis', 0)
        )
    
    async def _send_ltc(self, db: Session, trade: InstantTrade) -> MultiChainSendResult:
        """Envia Litecoin."""
        try:
            from app.services.ltc_doge_service import ltc_service
            from app.services.system_blockchain_wallet_service import system_wallet_service
            
            # Obter credenciais da plataforma
            ltc_data = system_wallet_service.get_private_key_for_sending(db, 'litecoin')
            if not ltc_data:
                return MultiChainSendResult(
                    success=False,
                    error="Carteira LTC da plataforma não configurada",
                    network='litecoin'
                )
            
            # Buscar endereço do usuário
            user_address = self._get_user_address(db, trade.user_id, 'litecoin')
            if not user_address:
                return MultiChainSendResult(
                    success=False,
                    error="Endereço LTC do usuário não encontrado",
                    network='litecoin'
                )
            
            # Enviar
            result = await ltc_service.send_ltc(
                from_address=ltc_data['address'],
                to_address=user_address,
                amount_ltc=float(trade.crypto_amount),
                private_key_wif=ltc_data.get('private_key_wif', '')
            )
            
            if result.success:
                self._update_trade_completed(db, trade, result.tx_hash, 'litecoin', user_address)
            
            return MultiChainSendResult(
                success=result.success,
                tx_hash=result.tx_hash,
                error=result.error,
                network='litecoin',
                explorer_url=result.explorer_url,
                fee_paid=result.fee_paid
            )
            
        except ImportError:
            return MultiChainSendResult(
                success=False,
                error="Serviço LTC não disponível",
                network='litecoin'
            )
    
    async def _send_doge(self, db: Session, trade: InstantTrade) -> MultiChainSendResult:
        """Envia Dogecoin."""
        try:
            from app.services.ltc_doge_service import doge_service
            from app.services.system_blockchain_wallet_service import system_wallet_service
            
            # Obter credenciais da plataforma
            doge_data = system_wallet_service.get_private_key_for_sending(db, 'dogecoin')
            if not doge_data:
                return MultiChainSendResult(
                    success=False,
                    error="Carteira DOGE da plataforma não configurada",
                    network='dogecoin'
                )
            
            # Buscar endereço do usuário
            user_address = self._get_user_address(db, trade.user_id, 'dogecoin')
            if not user_address:
                return MultiChainSendResult(
                    success=False,
                    error="Endereço DOGE do usuário não encontrado",
                    network='dogecoin'
                )
            
            # Enviar
            result = await doge_service.send_doge(
                from_address=doge_data['address'],
                to_address=user_address,
                amount_doge=float(trade.crypto_amount),
                private_key_wif=doge_data.get('private_key_wif', '')
            )
            
            if result.success:
                self._update_trade_completed(db, trade, result.tx_hash, 'dogecoin', user_address)
            
            return MultiChainSendResult(
                success=result.success,
                tx_hash=result.tx_hash,
                error=result.error,
                network='dogecoin',
                explorer_url=result.explorer_url,
                fee_paid=result.fee_paid
            )
            
        except ImportError:
            return MultiChainSendResult(
                success=False,
                error="Serviço DOGE não disponível",
                network='dogecoin'
            )
    
    async def _send_sol(self, db: Session, trade: InstantTrade) -> MultiChainSendResult:
        """Envia Solana."""
        try:
            from app.services.sol_service import sol_service
            from app.services.system_blockchain_wallet_service import system_wallet_service
            
            # Obter credenciais da plataforma
            sol_data = system_wallet_service.get_private_key_for_sending(db, 'solana')
            if not sol_data:
                return MultiChainSendResult(
                    success=False,
                    error="Carteira SOL da plataforma não configurada",
                    network='solana'
                )
            
            # Buscar endereço do usuário
            user_address = self._get_user_address(db, trade.user_id, 'solana')
            if not user_address:
                return MultiChainSendResult(
                    success=False,
                    error="Endereço SOL do usuário não encontrado",
                    network='solana'
                )
            
            # Enviar
            result = await sol_service.send_sol(
                from_address=sol_data['address'],
                to_address=user_address,
                amount_sol=float(trade.crypto_amount),
                private_key_base58=sol_data.get('private_key_hex', '')
            )
            
            if result.success:
                self._update_trade_completed(db, trade, result.tx_hash, 'solana', user_address)
            
            return MultiChainSendResult(
                success=result.success,
                tx_hash=result.tx_hash,
                error=result.error,
                network='solana',
                explorer_url=result.explorer_url,
                fee_paid=result.fee_paid
            )
            
        except ImportError:
            return MultiChainSendResult(
                success=False,
                error="Serviço SOL não disponível. Execute: pip install solders",
                network='solana'
            )
    
    async def _send_trx(self, db: Session, trade: InstantTrade) -> MultiChainSendResult:
        """Envia TRON."""
        try:
            from app.services.tron_service import tron_service
            from app.services.system_blockchain_wallet_service import system_wallet_service
            
            # Obter credenciais da plataforma
            trx_data = system_wallet_service.get_private_key_for_sending(db, 'tron')
            if not trx_data:
                return MultiChainSendResult(
                    success=False,
                    error="Carteira TRX da plataforma não configurada",
                    network='tron'
                )
            
            # Buscar endereço do usuário
            user_address = self._get_user_address(db, trade.user_id, 'tron')
            if not user_address:
                return MultiChainSendResult(
                    success=False,
                    error="Endereço TRX do usuário não encontrado",
                    network='tron'
                )
            
            # Enviar
            result = await tron_service.send_trx(
                from_address=trx_data['address'],
                to_address=user_address,
                amount_trx=float(trade.crypto_amount),
                private_key_hex=trx_data.get('private_key_hex', '')
            )
            
            if result.success:
                self._update_trade_completed(db, trade, result.tx_hash, 'tron', user_address)
            
            return MultiChainSendResult(
                success=result.success,
                tx_hash=result.tx_hash,
                error=result.error,
                network='tron',
                explorer_url=result.explorer_url,
                fee_paid=result.fee_paid
            )
            
        except ImportError:
            return MultiChainSendResult(
                success=False,
                error="Serviço TRON não disponível",
                network='tron'
            )
    
    async def _send_xrp(self, db: Session, trade: InstantTrade) -> MultiChainSendResult:
        """Envia XRP."""
        try:
            from app.services.xrp_service import xrp_service
            from app.services.system_blockchain_wallet_service import system_wallet_service
            
            # Obter credenciais da plataforma
            xrp_data = system_wallet_service.get_private_key_for_sending(db, 'xrp')
            if not xrp_data:
                return MultiChainSendResult(
                    success=False,
                    error="Carteira XRP da plataforma não configurada",
                    network='xrp'
                )
            
            # Buscar endereço do usuário
            user_address = self._get_user_address(db, trade.user_id, 'xrp')
            if not user_address:
                return MultiChainSendResult(
                    success=False,
                    error="Endereço XRP do usuário não encontrado",
                    network='xrp'
                )
            
            # Enviar
            result = await xrp_service.send_xrp(
                from_address=xrp_data['address'],
                to_address=user_address,
                amount_xrp=float(trade.crypto_amount),
                private_key_hex=xrp_data.get('private_key_hex', '')
            )
            
            if result.success:
                self._update_trade_completed(db, trade, result.tx_hash, 'xrp', user_address)
            
            return MultiChainSendResult(
                success=result.success,
                tx_hash=result.tx_hash,
                error=result.error,
                network='xrp',
                explorer_url=result.explorer_url,
                fee_paid=result.fee_paid
            )
            
        except ImportError:
            return MultiChainSendResult(
                success=False,
                error="Serviço XRP não disponível. Execute: pip install xrpl-py",
                network='xrp'
            )
    
    async def _send_dot(self, db: Session, trade: InstantTrade) -> MultiChainSendResult:
        """Envia Polkadot."""
        try:
            from app.services.dot_service import dot_service
            from app.services.system_blockchain_wallet_service import system_wallet_service
            
            # Obter credenciais da plataforma
            dot_data = system_wallet_service.get_private_key_for_sending(db, 'polkadot')
            if not dot_data:
                return MultiChainSendResult(
                    success=False,
                    error="Carteira DOT da plataforma não configurada",
                    network='polkadot'
                )
            
            # Buscar endereço do usuário
            user_address = self._get_user_address(db, trade.user_id, 'polkadot')
            if not user_address:
                return MultiChainSendResult(
                    success=False,
                    error="Endereço DOT do usuário não encontrado",
                    network='polkadot'
                )
            
            # Enviar
            result = await dot_service.send_dot(
                from_address=dot_data['address'],
                to_address=user_address,
                amount_dot=float(trade.crypto_amount),
                private_key_hex=dot_data.get('private_key_hex', '')
            )
            
            if result.success:
                self._update_trade_completed(db, trade, result.tx_hash, 'polkadot', user_address)
            
            return MultiChainSendResult(
                success=result.success,
                tx_hash=result.tx_hash,
                error=result.error,
                network='polkadot',
                explorer_url=result.explorer_url,
                fee_paid=result.fee_paid
            )
            
        except ImportError:
            return MultiChainSendResult(
                success=False,
                error="Serviço DOT não disponível. Execute: pip install substrate-interface",
                network='polkadot'
            )
    
    # ============================================
    # HELPERS
    # ============================================
    
    def _get_user_address(self, db: Session, user_id: str, network: str) -> Optional[str]:
        """Busca endereço do usuário para a rede."""
        try:
            from app.models.wallet import Wallet
            from app.models.address import Address
            from sqlalchemy import func
            
            address = db.query(Address).join(
                Wallet, Address.wallet_id == Wallet.id
            ).filter(
                Wallet.user_id == user_id,
                Wallet.is_active == True,
                func.lower(Address.network) == network.lower(),
                Address.is_active == True
            ).first()
            
            return str(address.address) if address else None
            
        except Exception as e:
            logger.error(f"❌ Erro buscando endereço do usuário: {e}")
            return None
    
    def _update_trade_completed(
        self, 
        db: Session, 
        trade: InstantTrade, 
        tx_hash: str, 
        network: str,
        wallet_address: str
    ):
        """Atualiza trade como completado."""
        from datetime import datetime
        
        trade.tx_hash = tx_hash
        trade.network = network
        trade.wallet_address = wallet_address
        trade.status = TradeStatus.COMPLETED
        trade.completed_at = datetime.now()
        
        db.commit()
        db.refresh(trade)
    
    def _get_explorer_url(self, network: str, tx_hash: str) -> Optional[str]:
        """Retorna URL do explorer para a transação."""
        if not tx_hash:
            return None
        
        explorers = {
            'ethereum': f"https://etherscan.io/tx/{tx_hash}",
            'polygon': f"https://polygonscan.com/tx/{tx_hash}",
            'bsc': f"https://bscscan.com/tx/{tx_hash}",
            'base': f"https://basescan.org/tx/{tx_hash}",
            'avalanche': f"https://snowtrace.io/tx/{tx_hash}",
            'bitcoin': f"https://blockstream.info/tx/{tx_hash}",
            'litecoin': f"https://blockchair.com/litecoin/transaction/{tx_hash}",
            'dogecoin': f"https://blockchair.com/dogecoin/transaction/{tx_hash}",
            'solana': f"https://explorer.solana.com/tx/{tx_hash}",
            'tron': f"https://tronscan.org/#/transaction/{tx_hash}",
            'xrp': f"https://xrpscan.com/tx/{tx_hash}",
            'polkadot': f"https://polkadot.subscan.io/extrinsic/{tx_hash}",
        }
        
        return explorers.get(network.lower())


# ============================================
# INSTÂNCIA SINGLETON
# ============================================
multi_chain_service = MultiChainSendService()
