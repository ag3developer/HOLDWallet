"""
🔐 Admin System Blockchain Wallet Router
==========================================

Endpoints para administradores gerenciarem as carteiras blockchain do sistema.

ENDPOINTS:
- POST /admin/system-wallet/create - Criar carteira principal (uma vez)
- GET /admin/system-wallet/addresses - Listar todos os endereços
- GET /admin/system-wallet/address/{network} - Obter endereço de uma rede
- GET /admin/system-wallet/transactions - Histórico de transações
- POST /admin/system-wallet/send - Enviar crypto para endereço externo (NOVO)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from decimal import Decimal
import logging
from datetime import datetime

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.system_blockchain_wallet_service import system_wallet_service
from app.services.system_wallet_send_service import system_wallet_send_service
from app.models.system_blockchain_wallet import (
    SystemBlockchainWallet,
    SystemBlockchainAddress,
    SystemWalletTransaction
)
from app.schemas.system_wallet import (
    SystemWalletSendRequest,
    SystemWalletSendResponse,
    InternalTransferRequest,
    InternalTransferResponse
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
        total_tray = 0.0
        
        for addr in addresses:
            crypto = addr.network.upper()
            if crypto not in balances:
                balances[crypto] = 0.0
            balances[crypto] += addr.cached_balance or 0.0
            
            # Somar tokens ERC-20
            total_usdt += addr.cached_usdt_balance or 0.0
            total_usdc += addr.cached_usdc_balance or 0.0
            total_dai += addr.cached_dai_balance or 0.0
            # TRAY (apenas Polygon, verificar se atributo existe)
            if hasattr(addr, 'cached_tray_balance'):
                total_tray += addr.cached_tray_balance or 0.0
        
        # Adicionar totais de stablecoins ao dict de saldos
        balances["USDT"] = total_usdt
        balances["USDC"] = total_usdc
        if total_dai > 0:
            balances["DAI"] = total_dai
        # Adicionar TRAY (DEX Token)
        balances["TRAY"] = total_tray
        
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
            network_str = str(addr.network)  # Converter para string pura
            # Adicionar rede nativa
            address_map[network_str] = addr.address
            
            # Se for EVM, adicionar consultas para USDT e USDC
            if network_str in evm_networks:
                address_map[f"{network_str}_usdt"] = addr.address
                address_map[f"{network_str}_usdc"] = addr.address
            
            # TRAY está apenas na Polygon
            if network_str == "polygon":
                address_map["polygon_tray"] = addr.address
        
        # Consultar saldos em paralelo (nativos + tokens)
        balances = await blockchain_balance_service.get_all_balances(address_map)
        
        # Consolidar saldos por endereço
        consolidated_balances = {}
        total_tray = 0
        
        for addr in addresses:
            network = str(addr.network)  # Converter para string pura
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
                "native_symbol": balances.get(network, {}).get("symbol", network.upper()) if network in balances else network.upper(),
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


@router.post("/send")
async def send_from_system_wallet(
    request: SystemWalletSendRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Enviar crypto da carteira do sistema para endereco externo (Ledger, etc).
    
    SEGURANCA:
    - Apenas admins podem executar
    - 2FA obrigatorio se configurado
    - Todas as transacoes sao logadas
    
    CAMPOS OBRIGATORIOS:
    - wallet_name: Nome da carteira (default: main_fees_wallet)
    - network: Rede blockchain (polygon, ethereum, bitcoin, tron, solana, etc.)
    - to_address: Endereco de destino (validado por formato)
    - amount: Valor a enviar (string para precisao decimal)
    - token: "native" para moeda nativa ou nome do token (USDT, USDC, DAI)
    
    CAMPOS OPCIONAIS:
    - memo: Nota interna para auditoria
    - two_factor_code: Codigo 2FA (6 digitos)
    
    RESPOSTA:
    - tx_hash: Hash da transacao na blockchain
    - explorer_url: Link para visualizar no explorer
    - status: pending (aguardando confirmacao)
    """
    try:
        logger.info(f"[AdminSend] Admin {current_user.email} solicitou envio")
        logger.info(f"  Wallet: {request.wallet_name}")
        logger.info(f"  Network: {request.network}")
        logger.info(f"  To: {request.to_address}")
        logger.info(f"  Amount: {request.amount}")
        logger.info(f"  Token: {request.token}")
        
        # TODO: Verificar 2FA se configurado
        # if request.two_factor_code:
        #     from app.services.two_factor_service import verify_2fa
        #     if not verify_2fa(current_user.id, request.two_factor_code):
        #         raise HTTPException(status_code=401, detail="Codigo 2FA invalido")
        
        # Executar envio
        result = await system_wallet_send_service.send_from_system_wallet(
            db=db,
            wallet_name=request.wallet_name,
            network=request.network.lower(),
            to_address=request.to_address.strip(),
            amount=Decimal(str(request.amount)),
            token=request.token.lower(),
            admin_user_id=str(current_user.id),
            memo=request.memo
        )
        
        if not result.get("success"):
            logger.warning(f"  Falha no envio: {result.get('error')}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error_code": result.get("error_code", "SEND_FAILED"),
                    "message": result.get("message", "Falha ao enviar transacao")
                }
            )
        
        logger.info(f"  Sucesso! TX: {result.get('tx_hash')}")
        
        return {
            "success": True,
            "message": "Transacao enviada com sucesso",
            "data": {
                "tx_hash": result.get("tx_hash"),
                "status": result.get("status", "pending"),
                "explorer_url": result.get("explorer_url"),
                "from_address": result.get("from_address"),
                "to_address": result.get("to_address"),
                "amount": result.get("amount"),
                "token": result.get("token"),
                "network": result.get("network"),
                "wallet_name": result.get("wallet_name"),
                "gas_used": result.get("gas_used"),
                "gas_price": result.get("gas_price")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao enviar da carteira do sistema: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao processar envio: {str(e)}"
        )


@router.post("/internal-transfer")
async def internal_transfer(
    request: InternalTransferRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Transferir crypto entre carteiras do sistema (COLD, HOT, FEES).
    
    Uso:
    - Mover fundos da HOT para COLD (seguranca)
    - Mover fundos da COLD para HOT (reabastecimento)
    - Consolidar taxas da FEES para COLD
    
    CAMPOS OBRIGATORIOS:
    - from_wallet: Nome da carteira de origem
    - to_wallet: Nome da carteira de destino
    - network: Rede blockchain
    - amount: Valor a transferir
    - token: "native" ou nome do token
    
    NOTA: Ambas carteiras devem ter endereco na mesma rede.
    """
    try:
        logger.info(f"[InternalTransfer] Admin {current_user.email}")
        logger.info(f"  From: {request.from_wallet} -> To: {request.to_wallet}")
        logger.info(f"  Network: {request.network}, Amount: {request.amount} {request.token}")
        
        # Buscar endereco de destino (to_wallet)
        to_wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == request.to_wallet,
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not to_wallet:
            raise HTTPException(
                status_code=404,
                detail=f"Carteira de destino '{request.to_wallet}' nao encontrada"
            )
        
        to_address_obj = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == to_wallet.id,
            SystemBlockchainAddress.network == request.network.lower(),
            SystemBlockchainAddress.is_active == True
        ).first()
        
        if not to_address_obj:
            raise HTTPException(
                status_code=404,
                detail=f"Endereco nao encontrado para {request.to_wallet} na rede {request.network}"
            )
        
        to_address = str(to_address_obj.address)
        
        # Usar o servico de envio normal
        result = await system_wallet_send_service.send_from_system_wallet(
            db=db,
            wallet_name=request.from_wallet,
            network=request.network.lower(),
            to_address=to_address,
            amount=Decimal(str(request.amount)),
            token=request.token.lower(),
            admin_user_id=str(current_user.id),
            memo=f"Internal transfer to {request.to_wallet}"
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail={
                    "error_code": result.get("error_code", "TRANSFER_FAILED"),
                    "message": result.get("message", "Falha na transferencia interna")
                }
            )
        
        return {
            "success": True,
            "message": f"Transferencia de {request.from_wallet} para {request.to_wallet} enviada",
            "data": {
                "tx_hash": result.get("tx_hash"),
                "status": result.get("status", "pending"),
                "explorer_url": result.get("explorer_url"),
                "from_wallet": request.from_wallet,
                "to_wallet": request.to_wallet,
                "from_address": result.get("from_address"),
                "to_address": to_address,
                "amount": str(request.amount),
                "token": request.token,
                "network": request.network
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na transferencia interna: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno na transferencia: {str(e)}"
        )


# ============================================================================
# FASE 2: MÚLTIPLAS CARTEIRAS (COLD, HOT, FEES)
# ============================================================================

@router.get("/wallets")
async def list_all_system_wallets(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Listar todas as carteiras do sistema.
    
    Retorna lista de carteiras com:
    - ID, nome, tipo (cold, hot, fees)
    - Quantidade de redes configuradas
    - Saldo total aproximado
    - Status (ativa, bloqueada)
    """
    try:
        wallets = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.is_active == True
        ).all()
        
        if not wallets:
            return {
                "success": True,
                "data": [],
                "count": 0,
                "message": "Nenhuma carteira do sistema encontrada. Crie uma usando POST /create"
            }
        
        wallet_list = []
        for wallet in wallets:
            # Contar enderecos
            addresses = db.query(SystemBlockchainAddress).filter(
                SystemBlockchainAddress.wallet_id == wallet.id,
                SystemBlockchainAddress.is_active == True
            ).all()
            
            # Somar saldos
            total_native_usd = 0.0
            total_stables = 0.0
            
            for addr in addresses:
                # Saldo nativo (aproximado - seria melhor ter preco)
                total_native_usd += float(addr.cached_balance or 0)
                # Stablecoins
                total_stables += float(addr.cached_usdt_balance or 0)
                total_stables += float(addr.cached_usdc_balance or 0)
            
            wallet_list.append({
                "id": str(wallet.id),
                "name": wallet.name,
                "wallet_type": wallet.wallet_type or "fees",
                "is_locked": bool(wallet.is_locked),
                "networks_count": len(addresses),
                "total_stables_usd": round(total_stables, 2),
                "created_at": wallet.created_at.isoformat() if wallet.created_at else None
            })
        
        return {
            "success": True,
            "data": wallet_list,
            "count": len(wallet_list)
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar carteiras: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar carteiras: {str(e)}"
        )


@router.post("/wallets/create")
async def create_new_system_wallet(
    wallet_name: str = Query(..., description="Nome unico da carteira (ex: cold_wallet, hot_wallet)"),
    wallet_type: str = Query(..., description="Tipo: cold, hot ou fees"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Criar nova carteira do sistema (COLD ou HOT).
    
    TIPOS:
    - cold: Armazenamento seguro, saques manuais apenas
    - hot: Operacional, para saques automaticos
    - fees: Coleta de taxas (ja existe como main_fees_wallet)
    
    A nova carteira tera:
    - Mnemonic proprio de 24 palavras (exibido apenas uma vez!)
    - Enderecos para todas as 16 redes suportadas
    - Private keys criptografadas
    
    IMPORTANTE: Guarde a mnemonic em local seguro!
    """
    try:
        # Validar tipo
        valid_types = ["cold", "hot", "fees"]
        if wallet_type.lower() not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo invalido. Use: {', '.join(valid_types)}"
            )
        
        # Verificar se ja existe
        existing = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == wallet_name.lower().replace(" ", "_"),
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Carteira com nome '{wallet_name}' ja existe"
            )
        
        # Criar nova carteira usando o servico
        result = system_wallet_service.create_new_wallet(
            db=db,
            wallet_name=wallet_name.lower().replace(" ", "_"),
            wallet_type=wallet_type.lower(),
            admin_user_id=str(current_user.id)
        )
        
        logger.info(f"Admin {current_user.email} criou carteira: {wallet_name} ({wallet_type})")
        
        return {
            "success": True,
            "message": f"Carteira '{wallet_name}' criada com sucesso!",
            "warning": "GUARDE A MNEMONIC EM LOCAL SEGURO! Ela nao sera exibida novamente.",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar carteira: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao criar carteira: {str(e)}"
        )


@router.patch("/wallets/{wallet_name}/type")
async def update_wallet_type(
    wallet_name: str,
    new_type: str = Query(..., description="Novo tipo: cold, hot ou fees"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Alterar o tipo de uma carteira existente.
    
    Use para:
    - Promover main_fees_wallet para cold
    - Mudar hot para cold apos acumular fundos
    """
    try:
        valid_types = ["cold", "hot", "fees"]
        if new_type.lower() not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo invalido. Use: {', '.join(valid_types)}"
            )
        
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == wallet_name,
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail=f"Carteira '{wallet_name}' nao encontrada"
            )
        
        old_type = wallet.wallet_type
        wallet.wallet_type = new_type.lower()
        db.commit()
        
        logger.info(f"Admin {current_user.email} alterou tipo de {wallet_name}: {old_type} -> {new_type}")
        
        return {
            "success": True,
            "message": f"Tipo da carteira alterado de '{old_type}' para '{new_type}'",
            "data": {
                "wallet_name": wallet_name,
                "old_type": old_type,
                "new_type": new_type.lower()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao alterar tipo: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao alterar tipo: {str(e)}"
        )


@router.patch("/wallets/{wallet_name}/lock")
async def toggle_wallet_lock(
    wallet_name: str,
    lock: bool = Query(..., description="True para bloquear, False para desbloquear"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Bloquear ou desbloquear uma carteira.
    
    Carteira bloqueada:
    - Nao pode fazer envios
    - Ainda pode receber
    - Util para carteiras COLD
    """
    try:
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == wallet_name,
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail=f"Carteira '{wallet_name}' nao encontrada"
            )
        
        wallet.is_locked = lock
        db.commit()
        
        action = "bloqueada" if lock else "desbloqueada"
        logger.info(f"Admin {current_user.email} {action} carteira: {wallet_name}")
        
        return {
            "success": True,
            "message": f"Carteira '{wallet_name}' {action}",
            "data": {
                "wallet_name": wallet_name,
                "is_locked": lock
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao bloquear/desbloquear: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )


@router.get("/wallets/{wallet_name}/addresses")
async def get_wallet_addresses(
    wallet_name: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Listar todos os enderecos de uma carteira especifica.
    """
    try:
        wallet = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.name == wallet_name,
            SystemBlockchainWallet.is_active == True
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=404,
                detail=f"Carteira '{wallet_name}' nao encontrada"
            )
        
        addresses = db.query(SystemBlockchainAddress).filter(
            SystemBlockchainAddress.wallet_id == wallet.id,
            SystemBlockchainAddress.is_active == True
        ).all()
        
        address_list = []
        for addr in addresses:
            address_list.append({
                "network": str(addr.network),
                "address": str(addr.address),
                "cryptocurrency": addr.cryptocurrency,
                "cached_balance": float(addr.cached_balance or 0),
                "cached_usdt": float(addr.cached_usdt_balance or 0),
                "cached_usdc": float(addr.cached_usdc_balance or 0),
                "last_update": addr.cached_balance_updated_at.isoformat() if addr.cached_balance_updated_at else None
            })
        
        return {
            "success": True,
            "wallet_name": wallet_name,
            "wallet_type": wallet.wallet_type,
            "is_locked": bool(wallet.is_locked),
            "data": address_list,
            "count": len(address_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar enderecos: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )


@router.get("/wallets/summary")
async def get_wallets_summary(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Resumo consolidado de todas as carteiras do sistema.
    
    Retorna:
    - Total por tipo (COLD, HOT, FEES)
    - Total em stablecoins
    - Distribuicao percentual
    """
    try:
        wallets = db.query(SystemBlockchainWallet).filter(
            SystemBlockchainWallet.is_active == True
        ).all()
        
        summary = {
            "cold": {"count": 0, "total_stables": 0.0, "wallets": []},
            "hot": {"count": 0, "total_stables": 0.0, "wallets": []},
            "fees": {"count": 0, "total_stables": 0.0, "wallets": []},
        }
        
        grand_total = 0.0
        
        for wallet in wallets:
            addresses = db.query(SystemBlockchainAddress).filter(
                SystemBlockchainAddress.wallet_id == wallet.id,
                SystemBlockchainAddress.is_active == True
            ).all()
            
            wallet_stables = 0.0
            for addr in addresses:
                wallet_stables += float(addr.cached_usdt_balance or 0)
                wallet_stables += float(addr.cached_usdc_balance or 0)
            
            wallet_type = wallet.wallet_type or "fees"
            if wallet_type in summary:
                summary[wallet_type]["count"] += 1
                summary[wallet_type]["total_stables"] += wallet_stables
                summary[wallet_type]["wallets"].append({
                    "name": wallet.name,
                    "stables": round(wallet_stables, 2),
                    "is_locked": bool(wallet.is_locked)
                })
            
            grand_total += wallet_stables
        
        # Calcular percentuais
        for wtype in summary:
            if grand_total > 0:
                summary[wtype]["percentage"] = round(
                    (summary[wtype]["total_stables"] / grand_total) * 100, 1
                )
            else:
                summary[wtype]["percentage"] = 0.0
            summary[wtype]["total_stables"] = round(summary[wtype]["total_stables"], 2)
        
        return {
            "success": True,
            "grand_total_stables_usd": round(grand_total, 2),
            "by_type": summary,
            "recommendation": _get_distribution_recommendation(summary, grand_total)
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar resumo: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )


def _get_distribution_recommendation(summary: dict, total: float) -> dict:
    """Gera recomendacao de distribuicao de fundos."""
    if total == 0:
        return {"status": "ok", "message": "Nenhum fundo para distribuir"}
    
    cold_pct = summary["cold"]["percentage"]
    hot_pct = summary["hot"]["percentage"]
    
    # Meta: 95% COLD, 5% HOT
    if cold_pct < 90:
        return {
            "status": "warning",
            "message": f"Recomendado mover fundos para COLD. Atual: {cold_pct}% COLD, meta: 95%",
            "action": "transfer_to_cold"
        }
    elif hot_pct > 10:
        return {
            "status": "warning", 
            "message": f"HOT wallet com {hot_pct}% dos fundos. Mover excesso para COLD.",
            "action": "transfer_to_cold"
        }
    else:
        return {
            "status": "ok",
            "message": "Distribuicao de fundos adequada"
        }


# ============================================================================
# FASE 3: AUTOMAÇÃO DE TRANSFERÊNCIAS
# ============================================================================

@router.get("/automation/status")
async def get_automation_status(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Status atual da automação de carteiras.
    
    Retorna:
    - Thresholds configurados
    - Análise das carteiras
    - Ações recomendadas
    """
    try:
        from app.services.wallet_automation_service import wallet_automation_service
        
        # Thresholds atuais
        thresholds = wallet_automation_service.get_current_thresholds()
        
        # Análise das carteiras
        analysis = wallet_automation_service.analyze_all_wallets(db)
        
        # Converter Decimals para float para JSON
        wallets_data = {}
        for name, data in analysis["wallets"].items():
            wallets_data[name] = {
                "wallet_type": data.get("wallet_type"),
                "is_locked": data.get("is_locked"),
                "total_usd": float(data.get("total_usd", 0)),
                "networks_with_balance": len([
                    n for n, v in data.get("by_network", {}).items()
                    if v.get("total", 0) > 0
                ])
            }
        
        return {
            "success": True,
            "automation": thresholds,
            "wallets": wallets_data,
            "total_system_usd": float(analysis.get("total_system_usd", 0)),
            "recommendations": analysis.get("recommendations", []),
            "actions_needed": len(analysis.get("actions_needed", []))
        }
        
    except Exception as e:
        logger.error(f"Erro ao obter status de automação: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )


@router.get("/automation/analysis")
async def get_detailed_analysis(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Análise detalhada de todas as carteiras.
    
    Inclui saldos por rede e recomendações de ação.
    """
    try:
        from app.services.wallet_automation_service import wallet_automation_service
        
        analysis = wallet_automation_service.analyze_all_wallets(db)
        
        # Converter Decimals para serialização JSON
        result = {
            "success": True,
            "wallets": {},
            "total_system_usd": float(analysis.get("total_system_usd", 0)),
            "recommendations": analysis.get("recommendations", []),
            "actions_needed": analysis.get("actions_needed", [])
        }
        
        for name, data in analysis["wallets"].items():
            networks = {}
            for net, vals in data.get("by_network", {}).items():
                networks[net] = {
                    "usdt": float(vals.get("usdt", 0)),
                    "usdc": float(vals.get("usdc", 0)),
                    "total": float(vals.get("total", 0))
                }
            
            result["wallets"][name] = {
                "wallet_type": data.get("wallet_type"),
                "is_locked": data.get("is_locked"),
                "total_usd": float(data.get("total_usd", 0)),
                "by_network": networks
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Erro na análise: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )


@router.post("/automation/execute")
async def execute_automation(
    dry_run: bool = Query(True, description="Se True, apenas simula sem executar"),
    max_actions: int = Query(3, description="Máximo de ações a executar", ge=1, le=10),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Executar ações de automação pendentes.
    
    ATENÇÃO: Se dry_run=False, transferências REAIS serão executadas!
    
    Ações possíveis:
    - transfer_to_cold: Mover excesso de HOT para COLD
    - replenish_hot: Reabastecer HOT de COLD
    - sweep_fees: Consolidar FEES para COLD
    """
    try:
        from app.services.wallet_automation_service import wallet_automation_service
        
        # Configurar modo dry-run
        wallet_automation_service.set_dry_run(dry_run)
        
        logger.info(f"Admin {current_user.email} executando automação (dry_run={dry_run})")
        
        # Executar ações
        results = await wallet_automation_service.execute_pending_actions(
            db=db,
            admin_user_id=str(current_user.id),
            max_actions=max_actions
        )
        
        return {
            "success": True,
            "dry_run": dry_run,
            "message": "Simulação concluída" if dry_run else "Ações executadas",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Erro na execução de automação: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )


@router.patch("/automation/thresholds")
async def update_automation_thresholds(
    hot_max: Optional[float] = Query(None, description="Máximo em HOT (USD)"),
    hot_min: Optional[float] = Query(None, description="Mínimo em HOT (USD)"),
    hot_target: Optional[float] = Query(None, description="Alvo em HOT após reabastecimento (USD)"),
    fees_sweep: Optional[float] = Query(None, description="Limite para sweep de FEES (USD)"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Atualizar thresholds de automação.
    
    Valores em USD para stablecoins (USDT/USDC).
    """
    try:
        from app.services.wallet_automation_service import wallet_automation_service
        
        new_thresholds = wallet_automation_service.update_thresholds(
            hot_max=Decimal(str(hot_max)) if hot_max else None,
            hot_min=Decimal(str(hot_min)) if hot_min else None,
            hot_target=Decimal(str(hot_target)) if hot_target else None,
            fees_sweep=Decimal(str(fees_sweep)) if fees_sweep else None
        )
        
        logger.info(f"Admin {current_user.email} atualizou thresholds: {new_thresholds}")
        
        return {
            "success": True,
            "message": "Thresholds atualizados",
            "thresholds": new_thresholds
        }
        
    except Exception as e:
        logger.error(f"Erro ao atualizar thresholds: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )


@router.patch("/automation/toggle")
async def toggle_automation(
    enabled: bool = Query(..., description="True para habilitar, False para desabilitar"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Habilitar ou desabilitar automação.
    
    Quando desabilitada, nenhuma ação automática será executada.
    """
    try:
        from app.services.wallet_automation_service import wallet_automation_service
        
        wallet_automation_service.enable_automation(enabled)
        
        status = "habilitada" if enabled else "desabilitada"
        logger.info(f"Admin {current_user.email} {status} automação")
        
        return {
            "success": True,
            "message": f"Automação {status}",
            "automation_enabled": enabled
        }
        
    except Exception as e:
        logger.error(f"Erro ao alternar automação: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )


# ============================================================================
# FASE 4: ALERTAS E MONITORAMENTO
# ============================================================================

@router.get("/alerts/check")
async def check_wallet_alerts(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Verificar alertas de carteiras.
    
    Retorna alertas para:
    - Saldo baixo em HOT
    - Saldo alto em HOT (risco)
    - Acúmulo em FEES
    - Carteiras bloqueadas com saldo
    """
    try:
        from app.services.wallet_automation_service import wallet_automation_service
        
        analysis = wallet_automation_service.analyze_all_wallets(db)
        
        alerts = []
        
        # Verificar cada carteira
        for name, data in analysis["wallets"].items():
            total_usd = float(data.get("total_usd", 0))
            wallet_type = data.get("wallet_type", "unknown")
            is_locked = data.get("is_locked", False)
            
            # Alerta: HOT com saldo baixo
            if wallet_type == "hot" and total_usd < float(wallet_automation_service.HOT_MIN_BALANCE_USD):
                alerts.append({
                    "type": "warning",
                    "category": "low_balance",
                    "wallet": name,
                    "message": f"HOT wallet com saldo baixo: ${total_usd:.2f}",
                    "threshold": float(wallet_automation_service.HOT_MIN_BALANCE_USD),
                    "action": "replenish_from_cold"
                })
            
            # Alerta: HOT com saldo alto (risco de segurança)
            if wallet_type == "hot" and total_usd > float(wallet_automation_service.HOT_MAX_BALANCE_USD):
                alerts.append({
                    "type": "critical",
                    "category": "high_balance",
                    "wallet": name,
                    "message": f"HOT wallet com saldo alto: ${total_usd:.2f}. Risco de segurança!",
                    "threshold": float(wallet_automation_service.HOT_MAX_BALANCE_USD),
                    "action": "move_to_cold"
                })
            
            # Alerta: FEES acumulando
            if (wallet_type == "fees" or name == "main_fees_wallet") and total_usd > float(wallet_automation_service.FEES_SWEEP_THRESHOLD_USD):
                alerts.append({
                    "type": "info",
                    "category": "fees_accumulation",
                    "wallet": name,
                    "message": f"Taxas acumuladas: ${total_usd:.2f}. Considere consolidar.",
                    "threshold": float(wallet_automation_service.FEES_SWEEP_THRESHOLD_USD),
                    "action": "sweep_to_cold"
                })
            
            # Alerta: Carteira bloqueada com saldo significativo
            if is_locked and total_usd > 100:
                alerts.append({
                    "type": "info",
                    "category": "locked_with_balance",
                    "wallet": name,
                    "message": f"Carteira bloqueada com ${total_usd:.2f}",
                    "action": "review_lock_status"
                })
        
        # Ordenar por prioridade
        priority_order = {"critical": 0, "warning": 1, "info": 2}
        alerts.sort(key=lambda x: priority_order.get(x["type"], 99))
        
        return {
            "success": True,
            "alerts_count": len(alerts),
            "has_critical": any(a["type"] == "critical" for a in alerts),
            "has_warnings": any(a["type"] == "warning" for a in alerts),
            "alerts": alerts,
            "checked_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao verificar alertas: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )


@router.get("/monitoring/dashboard")
async def get_monitoring_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Dashboard consolidado de monitoramento.
    
    Visão geral de:
    - Todas as carteiras e saldos
    - Alertas ativos
    - Ações pendentes
    - Últimas transações
    """
    try:
        from app.services.wallet_automation_service import wallet_automation_service
        
        # Análise das carteiras
        analysis = wallet_automation_service.analyze_all_wallets(db)
        
        # Últimas transações
        recent_txs = db.query(SystemWalletTransaction).order_by(
            SystemWalletTransaction.created_at.desc()
        ).limit(10).all()
        
        transactions = []
        for tx in recent_txs:
            transactions.append({
                "id": str(tx.id),
                "tx_hash": tx.tx_hash[:16] + "..." if tx.tx_hash else None,
                "direction": tx.direction,
                "amount": float(tx.amount) if tx.amount else 0,
                "cryptocurrency": tx.cryptocurrency,
                "status": tx.status,
                "created_at": tx.created_at.isoformat() if tx.created_at else None
            })
        
        # Contadores
        total_wallets = len(analysis["wallets"])
        locked_wallets = sum(1 for w in analysis["wallets"].values() if w.get("is_locked"))
        
        # Saldos por tipo
        by_type = {"cold": 0.0, "hot": 0.0, "fees": 0.0}
        for name, data in analysis["wallets"].items():
            wtype = data.get("wallet_type") or "fees"
            by_type[wtype] = by_type.get(wtype, 0) + float(data.get("total_usd", 0))
        
        return {
            "success": True,
            "summary": {
                "total_wallets": total_wallets,
                "locked_wallets": locked_wallets,
                "total_system_usd": float(analysis.get("total_system_usd", 0)),
                "by_type": by_type
            },
            "automation": wallet_automation_service.get_current_thresholds(),
            "recommendations_count": len(analysis.get("recommendations", [])),
            "actions_pending": len(analysis.get("actions_needed", [])),
            "recent_transactions": transactions,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao gerar dashboard: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro: {str(e)}"
        )
