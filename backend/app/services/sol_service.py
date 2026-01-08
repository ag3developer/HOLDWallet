"""
☀️ Solana Transaction Service
==============================

Serviço para envio automático de SOL usando APIs GRATUITAS.
Solana usa curva Ed25519 diferente do Bitcoin/Ethereum.

APIs usadas:
- Solana RPC público (mainnet-beta)
- Helius API (free tier)

Autor: HOLD Wallet
Data: Janeiro 2026
"""

import asyncio
import base58
import base64
import requests
import logging
import struct
from decimal import Decimal
from typing import Dict, Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# ============================================
# CONSTANTES
# ============================================
LAMPORT = 1_000_000_000  # 1 SOL = 1,000,000,000 lamports

# RPCs Públicos (rate limited mas gratuitos)
SOLANA_RPC_MAINNET = "https://api.mainnet-beta.solana.com"
SOLANA_RPC_DEVNET = "https://api.devnet.solana.com"

# Explorers
SOLANA_EXPLORER = "https://explorer.solana.com/tx"
SOLSCAN_EXPLORER = "https://solscan.io/tx"


@dataclass 
class SOLTransactionResult:
    """Resultado de uma transação Solana."""
    success: bool
    tx_hash: Optional[str] = None
    error: Optional[str] = None
    fee_paid: int = 0  # em lamports
    explorer_url: Optional[str] = None


class SOLService:
    """
    Serviço para transações Solana.
    Usa RPC público gratuito.
    """
    
    def __init__(self, devnet: bool = False):
        """
        Inicializa o serviço SOL.
        
        Args:
            devnet: Se True, usa devnet. Se False, usa mainnet.
        """
        self.devnet = devnet
        self.rpc_url = SOLANA_RPC_DEVNET if devnet else SOLANA_RPC_MAINNET
        self.explorer_base = f"{SOLANA_EXPLORER}?cluster=devnet" if devnet else SOLANA_EXPLORER
        logger.info(f"☀️ SOLService initialized ({'devnet' if devnet else 'mainnet'})")
    
    def _rpc_call(self, method: str, params: List = None) -> Optional[Dict]:
        """Faz uma chamada RPC para o node Solana."""
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": method,
                "params": params or []
            }
            
            response = requests.post(
                self.rpc_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'error' in result:
                    logger.error(f"❌ RPC error: {result['error']}")
                    return None
                return result.get('result')
            
            logger.error(f"❌ HTTP error: {response.status_code}")
            return None
            
        except Exception as e:
            logger.error(f"❌ RPC call failed: {e}")
            return None
    
    def validate_address(self, address: str) -> bool:
        """Valida um endereço Solana (base58, 32-44 chars)."""
        if not address:
            return False
        try:
            # Endereços Solana são base58 encoded, 32 bytes
            decoded = base58.b58decode(address)
            return len(decoded) == 32
        except Exception:
            return False
    
    def get_balance(self, address: str) -> Optional[Decimal]:
        """Consulta saldo de um endereço SOL."""
        try:
            result = self._rpc_call("getBalance", [address])
            if result and 'value' in result:
                lamports = result['value']
                return Decimal(str(lamports)) / Decimal(str(LAMPORT))
            return None
        except Exception as e:
            logger.error(f"❌ Erro consultando saldo SOL: {e}")
            return None
    
    def get_recent_blockhash(self) -> Optional[str]:
        """Obtém blockhash recente para transação."""
        result = self._rpc_call("getLatestBlockhash")
        if result and 'value' in result:
            return result['value']['blockhash']
        return None
    
    def get_minimum_rent(self) -> int:
        """Retorna o mínimo de lamports para rent exemption."""
        result = self._rpc_call("getMinimumBalanceForRentExemption", [0])
        return result or 890880  # Default ~0.00089 SOL
    
    async def send_sol(
        self,
        from_address: str,
        to_address: str,
        amount_sol: float,
        private_key_base58: str
    ) -> SOLTransactionResult:
        """
        Envia SOL de um endereço para outro.
        
        Args:
            from_address: Endereço de origem
            to_address: Endereço de destino
            amount_sol: Quantidade em SOL
            private_key_base58: Chave privada em base58
            
        Returns:
            SOLTransactionResult com status da transação
        """
        try:
            logger.info(f"☀️ Enviando {amount_sol} SOL de {from_address[:10]}... para {to_address[:10]}...")
            
            # Usar solders para criar transação
            from solders.keypair import Keypair
            from solders.pubkey import Pubkey
            from solders.system_program import transfer, TransferParams
            from solders.transaction import Transaction
            from solders.message import Message
            from solders.hash import Hash
            
            # 1. Decodificar private key
            if len(private_key_base58) == 64:
                # É hex, converter para bytes
                secret_key = bytes.fromhex(private_key_base58)
            else:
                # É base58
                secret_key = base58.b58decode(private_key_base58)
            
            # Criar keypair
            keypair = Keypair.from_bytes(secret_key)
            
            # 2. Obter blockhash recente
            blockhash = self.get_recent_blockhash()
            if not blockhash:
                return SOLTransactionResult(
                    success=False,
                    error="Não foi possível obter blockhash"
                )
            
            # 3. Criar instrução de transferência
            amount_lamports = int(amount_sol * LAMPORT)
            
            from_pubkey = Pubkey.from_string(from_address)
            to_pubkey = Pubkey.from_string(to_address)
            
            transfer_ix = transfer(TransferParams(
                from_pubkey=from_pubkey,
                to_pubkey=to_pubkey,
                lamports=amount_lamports
            ))
            
            # 4. Criar transação
            recent_blockhash = Hash.from_string(blockhash)
            msg = Message.new_with_blockhash(
                [transfer_ix],
                from_pubkey,
                recent_blockhash
            )
            
            tx = Transaction.new_unsigned(msg)
            tx.sign([keypair], recent_blockhash)
            
            # 5. Serializar e enviar
            tx_bytes = bytes(tx)
            tx_base64 = base64.b64encode(tx_bytes).decode('utf-8')
            
            result = self._rpc_call("sendTransaction", [
                tx_base64,
                {"encoding": "base64", "preflightCommitment": "confirmed"}
            ])
            
            if result:
                tx_hash = result
                logger.info(f"✅ SOL enviado! TX: {tx_hash}")
                
                return SOLTransactionResult(
                    success=True,
                    tx_hash=tx_hash,
                    fee_paid=5000,  # Fee padrão Solana
                    explorer_url=f"{self.explorer_base}/{tx_hash}"
                )
            else:
                return SOLTransactionResult(
                    success=False,
                    error="Falha ao enviar transação"
                )
                
        except ImportError:
            logger.error("❌ Biblioteca 'solders' não instalada!")
            return SOLTransactionResult(
                success=False,
                error="Biblioteca 'solders' não instalada. Execute: pip install solders"
            )
        except Exception as e:
            logger.error(f"❌ Erro enviando SOL: {e}")
            return SOLTransactionResult(
                success=False,
                error=str(e)
            )


# ============================================
# INSTÂNCIA SINGLETON
# ============================================
sol_service = SOLService()
