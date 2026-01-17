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
    Inclui saldos de tokens ERC-20 (USDT, USDC, DAI).
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
        
        # Somar saldos por crypto (nativos)
        balances = {}
        total_usdt = 0.0
        total_usdc = 0.0
        total_dai = 0.0
        
        for addr in addresses:
            crypto = addr.network.upper()
            if crypto not in balances:
                balances[crypto] = 0.0
            balances[crypto] += addr.cached_balance or 0.0
            
            # Somar tokens ERC-20
            total_usdt += addr.cached_usdt_balance or 0.0
            total_usdc += addr.cached_usdc_balance or 0.0
            total_dai += addr.cached_dai_balance or 0.0
        
        # Adicionar totais de stablecoins ao dict de saldos
        balances["USDT"] = total_usdt
        balances["USDC"] = total_usdc
        if total_dai > 0:
            balances["DAI"] = total_dai
        
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
    🔄 Atualizar saldos das carteiras consultando as blockchains em tempo real.
    
    Consulta APIs públicas para obter saldos atualizados:
    - Saldos nativos (ETH, MATIC, BNB, etc.)
    - Tokens ERC-20: USDT, USDC, DAI, TRAY
    """
    try:
        from app.services.blockchain_balance_service import blockchain_balance_service
        
        # Buscar carteira do sistema
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == "main_fees_wallet",
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail="Carteira do sistema não encontrada"
            )
        
        # Buscar todos os endereços
        addresses = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.is_active == True
        ).all()
        
        # Redes EVM que suportam tokens
        evm_networks = ["ethereum", "polygon", "bsc", "avalanche", "base", "arbitrum"]
        
        # Criar mapa de endereços por rede (incluindo tokens)
        address_map = {}
        for addr in addresses:
            # Adicionar rede nativa
            address_map[addr.network] = addr.address
            
            # Se for EVM, adicionar consultas para USDT e USDC
            if addr.network in evm_networks:
                address_map[f"{addr.network}_usdt"] = addr.address
                address_map[f"{addr.network}_usdc"] = addr.address
            
            # TRAY está apenas na Polygon
            if addr.network == "polygon":
                address_map["polygon_tray"] = addr.address
        
        # Consultar saldos em paralelo (nativos + tokens)
        balances = await blockchain_balance_service.get_all_balances(address_map)
        
        # Consolidar saldos por endereço
        consolidated_balances = {}
        total_tray = 0
        
        for addr in addresses:
            network = addr.network
            native_balance = 0
            usdt_balance = 0
            usdc_balance = 0
            tray_balance = 0
            
            # Saldo nativo
            if network in balances:
                native_data = balances[network]
                native_balance = native_data.get("balance", 0) if native_data.get("success") else 0
            
            # Saldos de tokens (apenas EVM)
            if network in evm_networks:
                usdt_key = f"{network}_usdt"
                usdc_key = f"{network}_usdc"
                
                if usdt_key in balances:
                    usdt_data = balances[usdt_key]
                    usdt_balance = usdt_data.get("balance", 0) if usdt_data.get("success") else 0
                
                if usdc_key in balances:
                    usdc_data = balances[usdc_key]
                    usdc_balance = usdc_data.get("balance", 0) if usdc_data.get("success") else 0
            
            # TRAY (apenas Polygon)
            if network == "polygon":
                tray_key = "polygon_tray"
                if tray_key in balances:
                    tray_data = balances[tray_key]
                    tray_balance = tray_data.get("balance", 0) if tray_data.get("success") else 0
                    total_tray = tray_balance
            
            # Atualizar no banco (saldos nativo e tokens)
            addr.cached_balance = native_balance
            addr.cached_usdt_balance = usdt_balance
            addr.cached_usdc_balance = usdc_balance
            if network == "polygon":
                addr.cached_tray_balance = tray_balance
            addr.cached_balance_updated_at = datetime.now()
            
            # Guardar para resposta
            consolidated_balances[network] = {
                "native": native_balance,
                "native_symbol": balances.get(network, {}).get("symbol", network.upper()),
                "usdt": usdt_balance,
                "usdc": usdc_balance,
                "tray": tray_balance if network == "polygon" else 0,
                "total_stables_usd": usdt_balance + usdc_balance
            }
        
        db.commit()
        
        # Calcular totais para a resposta
        total_usdt = sum(b.get("usdt", 0) for b in consolidated_balances.values())
        total_usdc = sum(b.get("usdc", 0) for b in consolidated_balances.values())
        
        return {
            "success": True,
            "message": f"Saldos atualizados para {len(addresses)} endereços",
            "balances_by_network": consolidated_balances,
            "totals": {
                "USDT": total_usdt,
                "USDC": total_usdc,
                "TRAY": total_tray,
                "total_stables": total_usdt + total_usdc
            },
            "updated_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
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


@router.get("/export-private-key/{network}")
async def export_private_key(
    network: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🔐 Exportar chave privada para uma rede específica.
    
    ⚠️ ATENÇÃO: Esta é uma operação sensível!
    Use apenas para configurar PLATFORM_WALLET_PRIVATE_KEY no .env
    
    Networks suportadas: polygon, ethereum, base, bsc, etc.
    
    Após exportar:
    1. Copie a private_key
    2. Adicione ao .env: PLATFORM_WALLET_PRIVATE_KEY=<key>
    3. Reinicie o backend
    """
    try:
        from app.services.crypto_service import CryptoService
        
        crypto_service = CryptoService()
        
        # Buscar carteira do sistema
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == "main_fees_wallet",
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail="Carteira do sistema não encontrada. Crie primeiro usando POST /create"
            )
        
        # Buscar endereço da rede especificada
        address = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.network == network.lower(),
            SystemBlockchainAddress.is_active == True
        ).first()
        
        if not address:
            # Tentar buscar endereço EVM (polygon, ethereum, etc compartilham a mesma key)
            evm_networks = ['polygon', 'ethereum', 'base', 'bsc', 'avalanche', 'multi']
            if network.lower() in evm_networks:
                address = db.query(SystemBlockchainAddress).filter(
                    SystemBlockchainAddress.wallet_id == wallet.id,
                    SystemBlockchainAddress.network.in_(evm_networks),
                    SystemBlockchainAddress.is_active == True
                ).first()
        
        if not address:
            raise HTTPException(
                status_code=404,
                detail=f"Endereço não encontrado para rede: {network}. "
                        f"Redes disponíveis: polygon, ethereum, base, bsc, multi"
            )
        
        # Verificar se encrypted_private_key existe (pode ser None ou string vazia)
        encrypted_pk_value = address.encrypted_private_key
        has_encrypted_pk = encrypted_pk_value is not None and str(encrypted_pk_value).strip() not in ['', 'None']
        
        if not has_encrypted_pk:
            # Tentar derivar a private key do mnemonic da carteira
            logger.info(f"Private key não encontrada para {network}, derivando do mnemonic...")
            
            # Descriptografar mnemonic
            mnemonic_value = wallet.encrypted_mnemonic
            if mnemonic_value is None or str(mnemonic_value).strip() in ['', 'None']:
                raise HTTPException(
                    status_code=500,
                    detail="Mnemonic da carteira não encontrado. A carteira precisa ser recriada."
                )
            
            mnemonic = crypto_service.decrypt_data(str(mnemonic_value))
            
            # Derivar a private key para EVM
            from eth_account import Account
            Account.enable_unaudited_hdwallet_features()
            
            # Derivar usando BIP44 path para Ethereum/EVM
            account = Account.from_mnemonic(mnemonic, account_path="m/44'/60'/0'/0/0")
            private_key = account.key.hex()
            
            # Atualizar o registro com a private key criptografada
            encrypted_pk = crypto_service.encrypt_data(private_key)
            address.encrypted_private_key = encrypted_pk  # type: ignore
            db.commit()
            
            logger.info(f"Private key derivada e salva para {network}")
        else:
            # Descriptografar private key existente
            encrypted_pk = str(encrypted_pk_value)
            private_key = crypto_service.decrypt_data(encrypted_pk)
        
        # Formatar para mostrar
        if not private_key.startswith("0x"):
            private_key = f"0x{private_key}"
        
        wallet_address = str(address.address)
        
        logger.warning(f"⚠️ Admin {current_user.email} exportou private key da rede {network}")
        
        return {
            "success": True,
            "warning": "⚠️ GUARDE ESTA CHAVE COM SEGURANÇA! Adicione ao .env como PLATFORM_WALLET_PRIVATE_KEY",
            "network": network,
            "address": wallet_address,
            "private_key": private_key,
            "instructions": [
                "1. Copie a private_key acima",
                "2. Abra o arquivo backend/.env",
                "3. Adicione: PLATFORM_WALLET_PRIVATE_KEY=" + private_key[:10] + "...",
                "4. Também adicione: PLATFORM_WALLET_ADDRESS=" + address.address,
                "5. Salve o arquivo e reinicie o backend",
                "6. A mesma chave funciona para todas as redes EVM (Polygon, Ethereum, Base, BSC)"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Falha ao exportar private key: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao exportar private key: {str(e)}"
        )


@router.get("/balance/{network}")
async def get_network_balance(
    network: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    💰 Consultar saldo real da carteira do sistema em uma rede específica.
    
    Consulta a blockchain em tempo real para obter o saldo atual.
    Inclui saldo de tokens USDT/USDC se disponível.
    """
    try:
        from app.services.blockchain_balance_service import blockchain_balance_service
        
        # Buscar endereço do sistema para a rede
        address = db.query(SystemBlockchainAddress).join(
            SystemBlockchainWallet
        ).filter(
            SystemBlockchainWallet.name == "main_fees_wallet",
            SystemBlockchainWallet.is_active == True,
            SystemBlockchainAddress.network == network.lower(),
            SystemBlockchainAddress.is_active == True
        ).first()
        
        if not address:
            raise HTTPException(
                status_code=404,
                detail=f"Endereço não encontrado para rede: {network}"
            )
        
        addr_str = str(address.address)
        
        # Consultar saldo nativo
        native_balance = await blockchain_balance_service.get_native_balance(network, addr_str)
        
        # Consultar saldo USDT
        usdt_balance = await blockchain_balance_service.get_token_balance(network, addr_str, "usdt")
        
        # Consultar saldo USDC
        usdc_balance = await blockchain_balance_service.get_token_balance(network, addr_str, "usdc")
        
        # Obter timestamp de última atualização
        last_update = None
        if address.cached_balance_updated_at is not None:
            last_update = address.cached_balance_updated_at.isoformat()
        
        return {
            "success": True,
            "network": network,
            "address": addr_str,
            "balances": {
                "native": native_balance,
                "usdt": usdt_balance,
                "usdc": usdc_balance
            },
            "cached_balance": address.cached_balance,
            "last_cached_update": last_update
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Falha ao consultar saldo: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao consultar saldo: {str(e)}"
        )
