"""
🔐 Admin System Blockchain Wallet Router
==========================================

Endpoints para administradores gerenciarem as carteiras blockchain do sistema.

ENDPOINTS:
- POST /admin/system-wallet/create - Criar carteira principal (uma vez)
- GET /admin/system-wallet/addresses - Listar todos os endereços
- GET /admin/system-wallet/address/{network} - Obter endereço de uma rede
- GET /admin/system-wallet/transactions - Histórico de transações
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.system_blockchain_wallet_service import system_wallet_service
from app.models.system_blockchain_wallet import (
    SystemBlockchainWallet,
    SystemBlockchainAddress,
    SystemWalletTransaction
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system-blockchain-wallet", tags=["Admin - System Blockchain Wallet"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Verifica se o usuário é admin."""
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Acesso negado. Apenas administradores podem acessar esta funcionalidade."
        )
    return user


@router.post("/create")
async def create_system_wallet(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 Criar carteira blockchain principal do sistema.
    
    IMPORTANTE:
    - Esta operação só pode ser feita UMA VEZ
    - A mnemonic de 24 palavras será exibida APENAS nesta resposta
    - GUARDE A MNEMONIC EM LOCAL SEGURO (cofre, papel offline, etc.)
    - Após criação, não é possível recuperar a mnemonic
    
    A carteira será criada com endereços para:
    - Bitcoin (BTC)
    - Ethereum (ETH)
    - Polygon (MATIC)
    - BSC (BNB)
    - Tron (TRX)
    - Solana (SOL)
    """
    try:
        result = system_wallet_service.get_or_create_main_wallet(
            db=db,
            admin_user_id=str(current_user.id)
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Falha ao criar carteira do sistema: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao criar carteira: {str(e)}"
        )


@router.get("/addresses")
async def get_all_addresses(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    📍 Listar todos os endereços blockchain do sistema.
    
    Retorna os endereços para todas as redes suportadas.
    Use estes endereços para receber taxas/comissões.
    """
    try:
        addresses = system_wallet_service.get_all_addresses(db)
        
        if not addresses:
            return {
                "success": False,
                "message": "Carteira do sistema ainda não foi criada. Use POST /create primeiro.",
                "data": []
            }
        
        return {
            "success": True,
            "data": addresses,
            "count": len(addresses)
        }
        
    except Exception as e:
        logger.error(f"Falha ao listar endereços: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao listar endereços: {str(e)}"
        )


@router.get("/address/{network}")
async def get_address_by_network(
    network: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    📍 Obter endereço do sistema para uma rede específica.
    
    Networks suportadas: bitcoin, ethereum, polygon, bsc, tron, solana
    """
    try:
        address = system_wallet_service.get_receiving_address(db, network)
        
        if not address:
            raise HTTPException(
                status_code=404,
                detail=f"Endereço não encontrado para rede: {network}"
            )
        
        return {
            "success": True,
            "data": address
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Falha ao obter endereço: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao obter endereço: {str(e)}"
        )


@router.get("/transactions")
async def get_transactions(
    network: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    📊 Histórico de transações das carteiras do sistema.
    
    Filtre por rede (opcional).
    """
    try:
        query = db.query(SystemWalletTransaction).join(
            SystemBlockchainAddress
        ).join(
            SystemBlockchainWallet
        ).filter(
            SystemBlockchainWallet.name == "main_fees_wallet"
        )
        
        if network:
            query = query.filter(SystemBlockchainAddress.network == network.lower())
        
        total = query.count()
        
        transactions = query.order_by(
            SystemWalletTransaction.created_at.desc()
        ).offset(offset).limit(limit).all()
        
        return {
            "success": True,
            "data": [
                {
                    "id": str(tx.id),
                    "tx_hash": tx.tx_hash,
                    "direction": tx.direction,
                    "amount": tx.amount,
                    "cryptocurrency": tx.cryptocurrency,
                    "from_address": tx.from_address,
                    "to_address": tx.to_address,
                    "reference_type": tx.reference_type,
                    "reference_id": tx.reference_id,
                    "status": tx.status,
                    "created_at": tx.created_at.isoformat() if tx.created_at else None
                }
                for tx in transactions
            ],
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset
            }
        }
        
    except Exception as e:
        logger.error(f"Falha ao listar transações: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao listar transações: {str(e)}"
        )


@router.get("/status")
async def get_wallet_status(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    📊 Status geral da carteira do sistema.
    
    Retorna informações sobre a carteira e saldos agregados.
    """
    try:
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == "main_fees_wallet",
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            return {
                "success": True,
                "data": {
                    "exists": False,
                    "message": "Carteira do sistema ainda não foi criada."
                }
            }
        
        addresses = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.is_active == True
        ).all()
        
        # Contar transações
        tx_count = db.query(SystemWalletTransaction).join(
            SystemBlockchainAddress
        ).filter(
            SystemBlockchainAddress.wallet_id == wallet.id
        ).count()
        
        # Somar saldos por crypto
        balances = {}
        for addr in addresses:
            crypto = addr.network.upper()
            if crypto not in balances:
                balances[crypto] = 0.0
            balances[crypto] += addr.cached_balance or 0.0
        
        return {
            "success": True,
            "data": {
                "exists": True,
                "wallet_id": str(wallet.id),
                "name": wallet.name,
                "wallet_type": wallet.wallet_type,
                "is_locked": wallet.is_locked,
                "created_at": wallet.created_at.isoformat() if wallet.created_at else None,
                "networks_count": len(addresses),
                "transactions_count": tx_count,
                "cached_balances": balances
            }
        }
        
    except Exception as e:
        logger.error(f"Falha ao obter status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao obter status: {str(e)}"
        )


@router.post("/refresh-balances")
async def refresh_balances(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔄 Atualizar saldos das carteiras consultando as blockchains.
    
    TODO: Implementar consulta real às APIs das blockchains.
    Por enquanto, apenas retorna os saldos em cache.
    """
    try:
        addresses = system_wallet_service.get_all_addresses(db)
        
        # TODO: Implementar chamadas reais às APIs:
        # - Bitcoin: blockchain.info, blockstream.info
        # - Ethereum/Polygon/BSC: Etherscan, Polygonscan, BscScan
        # - Tron: TronGrid
        # - Solana: Solana RPC
        
        return {
            "success": True,
            "message": "Funcionalidade de consulta às blockchains será implementada em breve.",
            "current_cached_balances": addresses
        }
        
    except Exception as e:
        logger.error(f"Falha ao atualizar saldos: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao atualizar saldos: {str(e)}"
        )


@router.post("/add-missing-networks")
async def add_missing_networks(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    ➕ Adicionar redes faltantes (USDT, USDC) à carteira existente.
    
    Este endpoint verifica quais redes estão faltando e as adiciona
    usando a mesma mnemonic da carteira principal.
    """
    try:
        # Verificar se carteira existe
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == "main_fees_wallet",
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail="Carteira do sistema não existe. Crie primeiro usando POST /create"
            )
        
        # Buscar endereços existentes
        existing_addresses = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.is_active == True
        ).all()
        
        existing_networks = {addr.network for addr in existing_addresses}
        
        # Redes que deveriam existir (incluindo stablecoins)
        all_networks = set(system_wallet_service.SUPPORTED_NETWORKS.keys())
        
        # Encontrar redes faltantes
        missing_networks = all_networks - existing_networks
        
        if not missing_networks:
            return {
                "success": True,
                "message": "Todas as redes já estão configuradas!",
                "total_networks": len(existing_networks),
                "networks": list(existing_networks)
            }
        
        # Adicionar redes faltantes
        added_addresses = system_wallet_service.add_missing_network_addresses(
            db=db,
            wallet_id=str(wallet.id),
            missing_networks=list(missing_networks)
        )
        
        return {
            "success": True,
            "message": f"Adicionadas {len(added_addresses)} novas redes!",
            "added_networks": list(missing_networks),
            "new_addresses": added_addresses,
            "total_networks": len(existing_networks) + len(added_addresses)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Falha ao adicionar redes faltantes: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao adicionar redes: {str(e)}"
        )
