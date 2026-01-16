"""
Transaction Service - Sistema completo para criação, assinatura e broadcast de transações
"""
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal
import hashlib
import json
from datetime import datetime, timezone

from app.core.config import settings
from app.services.blockchain_service import blockchain_service
from app.services.cache_service import cache_service
from app.services.crypto_service import crypto_service
from app.models.transaction import Transaction
from app.models.address import Address
from app.models.wallet import Wallet
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

class TransactionService:
    """Serviço principal para gerenciamento de transações"""
    
    def __init__(self):
        self.bitcoin_tx_service = BitcoinTransactionService()
        self.ethereum_tx_service = EthereumTransactionService()
        self.polygon_tx_service = PolygonTransactionService()
        self.bsc_tx_service = BSCTransactionService()
    
    async def create_transaction(
        self,
        db: Session,
        from_address: str,
        to_address: str,
        amount: str,
        network: str,
        user_id: int,
        fee_preference: str = "standard",  # slow, standard, fast
        memo: Optional[str] = None,
        token_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cria uma nova transação (ainda não assinada)
        """
        try:
            logger.info(f"🔍 Criando transação: from={from_address}, to={to_address}, network={network}, user_id={user_id}")
            
            # Validar endereços
            if not await blockchain_service.validate_address(from_address, network):
                raise ValueError("Endereço de origem inválido")
            
            if not await blockchain_service.validate_address(to_address, network):
                raise ValueError("Endereço de destino inválido")
            
            # Verificar se o endereço de origem pertence ao usuário
            # Normalizar o endereço para Ethereum (lowercase para checksum)
            from_address_normalized = from_address.lower() if network.lower() in ["ethereum", "polygon", "bsc"] else from_address
            
            logger.info(f"🔎 Procurando endereço: {from_address_normalized} para user_id: {user_id}")
            
            from_addr = db.query(Address).filter(
                Address.address.ilike(from_address_normalized) if network.lower() in ["ethereum", "polygon", "bsc"] else Address.address == from_address_normalized,
                Address.wallet.has(user_id=user_id)
            ).first()
            
            if not from_addr:
                # Log de debug: listar todos os endereços do usuário
                all_user_addresses = db.query(Address).join(Wallet).filter(Wallet.user_id == user_id).all()
                logger.warning(f"⚠️ Endereço {from_address} não encontrado para user_id {user_id}")
                logger.warning(f"📋 Endereços disponíveis para este usuário: {[addr.address for addr in all_user_addresses]}")
                raise ValueError("Endereço de origem não pertence ao usuário")
            
            logger.info(f"✅ Endereço verificado: {from_addr.address} para wallet_id: {from_addr.wallet_id}")
            
            # Obter saldo atual
            balance_data = await blockchain_service.get_address_balance(
                from_address, network
            )
            current_balance = Decimal(balance_data.get("native_balance", "0"))
            
            # Verificar saldo suficiente
            amount_decimal = Decimal(amount)
            if current_balance < amount_decimal:
                raise ValueError(f"Saldo insuficiente. Disponível: {current_balance}")
            
            # Estimar taxas
            fees = await blockchain_service.estimate_fees(
                network=network,
                from_address=from_address,
                to_address=to_address,
                amount=amount,
                token_address=token_address
            )
            
            # Selecionar taxa baseada na preferência
            fee_amount = self._get_fee_by_preference(fees, fee_preference, network)
            
            # Verificar se há saldo para taxa
            total_needed = amount_decimal + Decimal(str(fee_amount))
            if current_balance < total_needed:
                raise ValueError(
                    f"Saldo insuficiente incluindo taxa. "
                    f"Necessário: {total_needed}, Disponível: {current_balance}"
                )
            
            # Criar transação baseada na rede
            if network.lower() == "bitcoin":
                tx_data = await self.bitcoin_tx_service.create_transaction(
                    from_address, to_address, amount_decimal, fee_amount
                )
            elif network.lower() in ["ethereum", "polygon", "bsc"]:
                service = getattr(self, f"{network.lower()}_tx_service")
                tx_data = await service.create_transaction(
                    from_address, to_address, amount_decimal, fee_amount, token_address
                )
            else:
                raise ValueError(f"Rede não suportada: {network}")
            
            # Salvar transação no banco
            transaction = Transaction(
                from_address=from_address,
                to_address=to_address,
                amount=str(amount_decimal),
                fee=str(fee_amount),
                network=network,
                status="created",
                user_id=user_id,
                tx_hash=None,  # Será preenchido após broadcast
                memo=memo,
                token_address=token_address,
                raw_transaction=json.dumps(tx_data["raw_tx"]),
                created_at=datetime.now(timezone.utc)
            )
            
            db.add(transaction)
            db.commit()
            db.refresh(transaction)
            
            return {
                "transaction_id": transaction.id,
                "from_address": from_address,
                "to_address": to_address,
                "amount": str(amount_decimal),
                "fee": str(fee_amount),
                "network": network,
                "status": "created",
                "raw_transaction": tx_data["raw_tx"],
                "estimated_confirmation_time": fees.get("estimated_time", "10-60 minutos")
            }
            
        except Exception as e:
            logger.error(f"Erro ao criar transação: {e}")
            raise
    
    async def sign_transaction(
        self,
        db: Session,
        transaction_id: int,
        user_id: int,
        password: Optional[str] = None  # Para desbloqueio da carteira
    ) -> Dict[str, Any]:
        """
        Assina uma transação criada
        """
        try:
            # Buscar transação
            transaction = db.query(Transaction).filter(
                Transaction.id == transaction_id,
                Transaction.user_id == user_id,
                Transaction.status == "created"
            ).first()
            
            if not transaction:
                raise ValueError("Transação não encontrada ou já processada")
            
            # Buscar carteira e chaves privadas
            from_addr = db.query(Address).filter(
                Address.address == transaction.from_address
            ).first()
            
            wallet = from_addr.wallet
            
            # Obter chave privada (descriptografar com senha se necessário)
            private_key = await crypto_service.get_private_key_for_address(
                wallet.encrypted_seed, 
                transaction.from_address,
                transaction.network,
                wallet.seed_hash,
                password
            )
            
            # Assinar transação baseada na rede
            raw_tx_data = json.loads(transaction.raw_transaction)
            
            if transaction.network.lower() == "bitcoin":
                signed_tx = await self.bitcoin_tx_service.sign_transaction(
                    raw_tx_data, private_key
                )
            elif transaction.network.lower() in ["ethereum", "polygon", "bsc"]:
                service = getattr(self, f"{transaction.network.lower()}_tx_service")
                signed_tx = await service.sign_transaction(
                    raw_tx_data, private_key
                )
            else:
                raise ValueError(f"Rede não suportada: {transaction.network}")
            
            # Atualizar transação
            transaction.signed_transaction = signed_tx
            transaction.status = "signed"
            transaction.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            
            return {
                "transaction_id": transaction.id,
                "status": "signed",
                "signed_transaction": signed_tx,
                "ready_for_broadcast": True
            }
            
        except Exception as e:
            logger.error(f"Erro ao assinar transação: {e}")
            raise
    
    async def broadcast_transaction(
        self,
        db: Session,
        transaction_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Faz broadcast de uma transação assinada
        """
        try:
            # Buscar transação assinada
            transaction = db.query(Transaction).filter(
                Transaction.id == transaction_id,
                Transaction.user_id == user_id,
                Transaction.status == "signed"
            ).first()
            
            if not transaction:
                raise ValueError("Transação não encontrada ou não está assinada")
            
            # Broadcast para a rede
            result = await blockchain_service.broadcast_transaction(
                transaction.network,
                transaction.signed_transaction
            )
            
            if result.get("status") == "broadcasted":
                # Sucesso no broadcast
                transaction.tx_hash = result.get("transaction_hash")
                transaction.status = "pending"
                transaction.broadcasted_at = datetime.now(timezone.utc)
                
                # Invalidar cache de saldo
                await cache_service.clear_pattern(f"balance:{transaction.network}:{transaction.from_address}")
                
            else:
                # Erro no broadcast
                transaction.status = "failed"
                transaction.error_message = result.get("error", "Erro desconhecido no broadcast")
            
            transaction.updated_at = datetime.now(timezone.utc)
            db.commit()
            
            return {
                "transaction_id": transaction.id,
                "tx_hash": transaction.tx_hash,
                "status": transaction.status,
                "network": transaction.network,
                "broadcast_result": result
            }
            
        except Exception as e:
            logger.error(f"Erro ao fazer broadcast da transação: {e}")
            raise
    
    async def check_transaction_status(
        self,
        db: Session,
        transaction_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """
        Verifica status de confirmação de uma transação
        """
        try:
            transaction = db.query(Transaction).filter(
                Transaction.id == transaction_id,
                Transaction.user_id == user_id
            ).first()
            
            if not transaction or not transaction.tx_hash:
                raise ValueError("Transação não encontrada ou sem hash")
            
            # Verificar status na blockchain
            if transaction.network.lower() == "bitcoin":
                status_info = await self.bitcoin_tx_service.get_transaction_status(
                    transaction.tx_hash
                )
            elif transaction.network.lower() in ["ethereum", "polygon", "bsc"]:
                service = getattr(self, f"{transaction.network.lower()}_tx_service")
                status_info = await service.get_transaction_status(
                    transaction.tx_hash
                )
            else:
                status_info = {"status": "unknown", "confirmations": 0}
            
            # Atualizar status se necessário
            current_status = transaction.status
            new_status = status_info.get("status", current_status)
            
            if new_status != current_status:
                transaction.status = new_status
                transaction.confirmations = status_info.get("confirmations", 0)
                transaction.confirmed_at = status_info.get("confirmed_at")
                transaction.updated_at = datetime.now(timezone.utc)
                db.commit()
            
            return {
                "transaction_id": transaction.id,
                "tx_hash": transaction.tx_hash,
                "status": transaction.status,
                "confirmations": status_info.get("confirmations", 0),
                "network": transaction.network,
                "block_number": status_info.get("block_number"),
                "gas_used": status_info.get("gas_used"),
                "final": status_info.get("final", False)
            }
            
        except Exception as e:
            logger.error(f"Erro ao verificar status da transação: {e}")
            raise
    
    async def get_user_transactions(
        self,
        db: Session,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        network: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtém histórico de transações do usuário
        """
        try:
            query = db.query(Transaction).filter(Transaction.user_id == user_id)
            
            if network:
                query = query.filter(Transaction.network == network)
            
            if status:
                query = query.filter(Transaction.status == status)
            
            # Contar total
            total = query.count()
            
            # Aplicar paginação e ordenação
            transactions = query.order_by(
                Transaction.created_at.desc()
            ).offset(offset).limit(limit).all()
            
            # Formatar resposta
            tx_list = []
            for tx in transactions:
                tx_data = {
                    "id": tx.id,
                    "tx_hash": tx.tx_hash,
                    "from_address": tx.from_address,
                    "to_address": tx.to_address,
                    "amount": tx.amount,
                    "fee": tx.fee,
                    "network": tx.network,
                    "status": tx.status,
                    "confirmations": tx.confirmations,
                    "memo": tx.memo,
                    "token_address": tx.token_address,
                    "created_at": tx.created_at.isoformat(),
                    "updated_at": tx.updated_at.isoformat() if tx.updated_at else None,
                    "confirmed_at": tx.confirmed_at.isoformat() if tx.confirmed_at else None
                }
                tx_list.append(tx_data)
            
            return {
                "transactions": tx_list,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total
            }
            
        except Exception as e:
            logger.error(f"Erro ao buscar transações do usuário: {e}")
            raise
    
    def _get_fee_by_preference(
        self, 
        fees: Dict[str, Any], 
        preference: str,
        network: str
    ) -> Decimal:
        """
        Retorna a taxa baseada na preferência do usuário
        """
        try:
            if network.lower() == "bitcoin":
                fee_map = {
                    "slow": fees.get("slow_fee", 1),
                    "standard": fees.get("standard_fee", 5), 
                    "fast": fees.get("fast_fee", 10)
                }
                # Bitcoin fees são em sat/vB, precisamos calcular para a transação
                return Decimal(str(fee_map.get(preference, 5))) / Decimal("100000000")
            else:
                # EVM networks
                gas_price = Decimal(str(fees.get("gas_price", "20")))  # Gwei
                gas_limit = Decimal(str(fees.get("gas_limit", 21000)))
                
                multipliers = {
                    "slow": Decimal("0.8"),
                    "standard": Decimal("1.0"),
                    "fast": Decimal("1.5")
                }
                
                multiplier = multipliers.get(preference, Decimal("1.0"))
                fee_wei = gas_price * gas_limit * multiplier * Decimal("1000000000")  # Gwei to Wei
                fee_eth = fee_wei / Decimal("1000000000000000000")  # Wei to ETH
                
                return fee_eth
                
        except Exception as e:
            logger.warning(f"Erro ao calcular taxa, usando padrão: {e}")
            return Decimal("0.001")


class BitcoinTransactionService:
    """Serviço específico para transações Bitcoin"""
    
    async def create_transaction(
        self,
        from_address: str,
        to_address: str,
        amount: Decimal,
        fee: Decimal
    ) -> Dict[str, Any]:
        """Cria transação Bitcoin raw"""
        # Implementação simplificada - em produção usar bitcoinlib
        return {
            "raw_tx": {
                "version": 2,
                "inputs": [],  # UTXOs seriam consultados aqui
                "outputs": [
                    {
                        "address": to_address,
                        "amount": int(amount * Decimal("100000000"))  # satoshis
                    }
                ],
                "fee": int(fee * Decimal("100000000"))
            }
        }
    
    async def sign_transaction(self, raw_tx: Dict, private_key: str) -> str:
        """Assina transação Bitcoin"""
        # Implementação simplificada
        return f"signed_bitcoin_tx_{hash(json.dumps(raw_tx))}"
    
    async def get_transaction_status(self, tx_hash: str) -> Dict[str, Any]:
        """Verifica status de transação Bitcoin via Blockstream"""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.BTC_API_URL}/tx/{tx_hash}"
                )
                if response.status_code == 200:
                    data = response.json()
                    confirmed = data.get("status", {}).get("confirmed", False)
                    confirmations = data.get("status", {}).get("confirmations", 0)
                    
                    return {
                        "status": "confirmed" if confirmed else "pending",
                        "confirmations": confirmations,
                        "block_number": data.get("status", {}).get("block_height"),
                        "final": confirmations >= 6
                    }
                else:
                    return {"status": "pending", "confirmations": 0}
        except Exception:
            return {"status": "unknown", "confirmations": 0}


class EthereumTransactionService:
    """Serviço base para transações EVM (Ethereum, Polygon, BSC)"""
    
    def __init__(self, rpc_url: str = None):
        self.rpc_url = rpc_url or settings.ETHEREUM_RPC_URL
    
    async def create_transaction(
        self,
        from_address: str,
        to_address: str,
        amount: Decimal,
        fee: Decimal,
        token_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Cria transação Ethereum raw"""
        # Implementação simplificada
        return {
            "raw_tx": {
                "from": from_address,
                "to": to_address,
                "value": str(int(amount * Decimal("1000000000000000000"))),  # wei
                "gas": 21000,
                "gasPrice": str(int(fee * Decimal("1000000000000000000") / 21000)),
                "nonce": 0,  # Seria consultado via RPC
                "token_address": token_address
            }
        }
    
    async def sign_transaction(self, raw_tx: Dict, private_key: str) -> str:
        """Assina transação Ethereum"""
        # Implementação simplificada  
        return f"0x{hash(json.dumps(raw_tx)):064x}"
    
    async def get_transaction_status(self, tx_hash: str) -> Dict[str, Any]:
        """Verifica status via RPC"""
        try:
            import httpx
            
            # Garantir que o hash tenha o prefixo 0x
            if tx_hash and not tx_hash.startswith('0x'):
                tx_hash = f"0x{tx_hash}"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "jsonrpc": "2.0",
                    "method": "eth_getTransactionReceipt",
                    "params": [tx_hash],
                    "id": 1
                }
                response = await client.post(self.rpc_url, json=payload)
                
                if response.status_code == 200:
                    result = response.json().get("result")
                    if result:
                        status = "confirmed" if result.get("status") == "0x1" else "failed"
                        block_number = int(result.get("blockNumber", "0x0"), 16)
                        
                        return {
                            "status": status,
                            "confirmations": max(0, await self._get_latest_block() - block_number),
                            "block_number": block_number,
                            "gas_used": int(result.get("gasUsed", "0x0"), 16),
                            "final": True
                        }
                    else:
                        return {"status": "pending", "confirmations": 0}
        except Exception as e:
            logger.warning(f"Erro ao verificar TX {tx_hash}: {e}")
            return {"status": "unknown", "confirmations": 0}
    
    async def _get_latest_block(self) -> int:
        """Obtém número do último bloco"""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                payload = {
                    "jsonrpc": "2.0", 
                    "method": "eth_blockNumber",
                    "params": [],
                    "id": 1
                }
                response = await client.post(self.rpc_url, json=payload)
                result = response.json().get("result", "0x0")
                return int(result, 16)
        except Exception:
            return 0


class PolygonTransactionService(EthereumTransactionService):
    """Serviço para transações Polygon"""
    
    def __init__(self):
        super().__init__(rpc_url=settings.POLYGON_RPC_URL)


class BSCTransactionService(EthereumTransactionService):
    """Serviço para transações BSC"""
    
    def __init__(self):
        super().__init__(rpc_url=settings.BSC_RPC_URL)


class BaseTransactionService(EthereumTransactionService):
    """Serviço para transações Base"""
    
    def __init__(self):
        super().__init__(rpc_url=getattr(settings, 'BASE_RPC_URL', 'https://mainnet.base.org'))


class AvalancheTransactionService(EthereumTransactionService):
    """Serviço para transações Avalanche"""
    
    def __init__(self):
        super().__init__(rpc_url=getattr(settings, 'AVALANCHE_RPC_URL', 'https://api.avax.network/ext/bc/C/rpc'))


# ============================================
# Serviço para verificar status de transações
# ============================================
class TransactionStatusChecker:
    """Serviço para verificar e atualizar status de transações pendentes"""
    
    def __init__(self):
        self.bitcoin_service = BitcoinTransactionService()
        self.ethereum_service = EthereumTransactionService()
        self.polygon_service = PolygonTransactionService()
        self.bsc_service = BSCTransactionService()
        self.base_service = BaseTransactionService()
        self.avalanche_service = AvalancheTransactionService()
    
    async def check_and_update_pending_transactions(
        self,
        db: Session,
        user_id: int,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Verifica e atualiza status de todas as transações pendentes do usuário.
        
        Returns:
            {
                "checked": int,
                "updated": int,
                "confirmed": List[tx_hash],
                "failed": List[tx_hash]
            }
        """
        from app.models.transaction import Transaction, TransactionStatus
        
        results = {
            "checked": 0,
            "updated": 0,
            "confirmed": [],
            "failed": []
        }
        
        try:
            # Buscar transações pendentes do usuário
            pending_transactions = db.query(Transaction).filter(
                Transaction.user_id == user_id,
                Transaction.status == TransactionStatus.pending,
                Transaction.tx_hash.isnot(None)
            ).order_by(Transaction.created_at.desc()).limit(limit).all()
            
            if not pending_transactions:
                logger.info(f"✅ Nenhuma transação pendente para user_id={user_id}")
                return results
            
            logger.info(f"🔍 Verificando {len(pending_transactions)} transações pendentes para user_id={user_id}")
            
            for tx in pending_transactions:
                results["checked"] += 1
                
                try:
                    # Obter status na blockchain baseado na rede
                    status_info = await self._get_tx_status_by_network(tx.network, tx.tx_hash)
                    
                    new_status = status_info.get("status", "pending")
                    
                    # Se status mudou, atualizar
                    if new_status != "pending" and new_status != tx.status.value:
                        old_status = tx.status.value
                        
                        if new_status == "confirmed":
                            tx.status = TransactionStatus.confirmed
                            tx.confirmed_at = datetime.now(timezone.utc)
                            results["confirmed"].append(tx.tx_hash)
                        elif new_status == "failed":
                            tx.status = TransactionStatus.failed
                            results["failed"].append(tx.tx_hash)
                        
                        tx.confirmations = status_info.get("confirmations", 0)
                        tx.block_number = status_info.get("block_number")
                        tx.updated_at = datetime.now(timezone.utc)
                        
                        results["updated"] += 1
                        logger.info(f"✅ TX {tx.tx_hash[:16]}... atualizada: {old_status} → {new_status}")
                
                except Exception as e:
                    logger.warning(f"⚠️ Erro ao verificar TX {tx.tx_hash}: {e}")
                    continue
            
            # Commit todas as atualizações
            if results["updated"] > 0:
                db.commit()
                logger.info(f"✅ {results['updated']} transações atualizadas no banco")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar transações pendentes: {e}")
            db.rollback()
            raise
    
    async def _get_tx_status_by_network(self, network: str, tx_hash: str) -> Dict[str, Any]:
        """Obtém status da transação na blockchain correspondente"""
        network_lower = network.lower() if network else ""
        
        try:
            if network_lower == "bitcoin":
                return await self.bitcoin_service.get_transaction_status(tx_hash)
            elif network_lower == "ethereum":
                return await self.ethereum_service.get_transaction_status(tx_hash)
            elif network_lower == "polygon":
                return await self.polygon_service.get_transaction_status(tx_hash)
            elif network_lower == "bsc":
                return await self.bsc_service.get_transaction_status(tx_hash)
            elif network_lower == "base":
                return await self.base_service.get_transaction_status(tx_hash)
            elif network_lower == "avalanche":
                return await self.avalanche_service.get_transaction_status(tx_hash)
            elif network_lower == "tron":
                return await self._check_tron_status(tx_hash)
            elif network_lower == "solana":
                return await self._check_solana_status(tx_hash)
            elif network_lower == "xrp":
                return await self._check_xrp_status(tx_hash)
            elif network_lower in ["litecoin", "dogecoin"]:
                return await self._check_utxo_status(network_lower, tx_hash)
            else:
                logger.warning(f"⚠️ Rede não suportada para verificação: {network}")
                return {"status": "pending", "confirmations": 0}
        except Exception as e:
            logger.error(f"❌ Erro ao verificar status para {network}/{tx_hash}: {e}")
            return {"status": "unknown", "confirmations": 0}
    
    async def _check_tron_status(self, tx_hash: str) -> Dict[str, Any]:
        """Verifica status de transação TRON"""
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"https://api.trongrid.io/v1/transactions/{tx_hash}"
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("data") and len(data["data"]) > 0:
                        tx_data = data["data"][0]
                        ret = tx_data.get("ret", [{}])[0]
                        contract_ret = ret.get("contractRet", "")
                        
                        if contract_ret == "SUCCESS":
                            return {
                                "status": "confirmed",
                                "confirmations": 1,
                                "block_number": tx_data.get("blockNumber"),
                                "final": True
                            }
                        elif contract_ret in ["REVERT", "OUT_OF_ENERGY"]:
                            return {"status": "failed", "confirmations": 0}
                
                return {"status": "pending", "confirmations": 0}
        except Exception as e:
            logger.warning(f"Erro ao verificar TRON TX: {e}")
            return {"status": "unknown", "confirmations": 0}
    
    async def _check_solana_status(self, tx_hash: str) -> Dict[str, Any]:
        """Verifica status de transação Solana"""
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getTransaction",
                    "params": [tx_hash, {"encoding": "json", "maxSupportedTransactionVersion": 0}]
                }
                response = await client.post(
                    "https://api.mainnet-beta.solana.com",
                    json=payload
                )
                if response.status_code == 200:
                    result = response.json().get("result")
                    if result:
                        meta = result.get("meta", {})
                        if meta.get("err") is None:
                            return {
                                "status": "confirmed",
                                "confirmations": 1,
                                "block_number": result.get("slot"),
                                "final": True
                            }
                        else:
                            return {"status": "failed", "confirmations": 0}
                
                return {"status": "pending", "confirmations": 0}
        except Exception as e:
            logger.warning(f"Erro ao verificar Solana TX: {e}")
            return {"status": "unknown", "confirmations": 0}
    
    async def _check_xrp_status(self, tx_hash: str) -> Dict[str, Any]:
        """Verifica status de transação XRP"""
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "method": "tx",
                    "params": [{"transaction": tx_hash, "binary": False}]
                }
                response = await client.post(
                    "https://xrplcluster.com",
                    json=payload
                )
                if response.status_code == 200:
                    result = response.json().get("result", {})
                    if result.get("validated"):
                        tx_result = result.get("meta", {}).get("TransactionResult", "")
                        if tx_result == "tesSUCCESS":
                            return {
                                "status": "confirmed",
                                "confirmations": 1,
                                "block_number": result.get("ledger_index"),
                                "final": True
                            }
                        else:
                            return {"status": "failed", "confirmations": 0}
                
                return {"status": "pending", "confirmations": 0}
        except Exception as e:
            logger.warning(f"Erro ao verificar XRP TX: {e}")
            return {"status": "unknown", "confirmations": 0}
    
    async def _check_utxo_status(self, network: str, tx_hash: str) -> Dict[str, Any]:
        """Verifica status de transações UTXO (LTC, DOGE) via Blockchair"""
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"https://api.blockchair.com/{network}/dashboards/transaction/{tx_hash}"
                )
                if response.status_code == 200:
                    data = response.json()
                    tx_data = data.get("data", {}).get(tx_hash, {}).get("transaction", {})
                    
                    if tx_data:
                        block_id = tx_data.get("block_id")
                        if block_id and block_id > 0:
                            return {
                                "status": "confirmed",
                                "confirmations": 1,  # Simplificado
                                "block_number": block_id,
                                "final": True
                            }
                
                return {"status": "pending", "confirmations": 0}
        except Exception as e:
            logger.warning(f"Erro ao verificar {network} TX: {e}")
            return {"status": "unknown", "confirmations": 0}


# Instância global do serviço
transaction_service = TransactionService()
transaction_status_checker = TransactionStatusChecker()
