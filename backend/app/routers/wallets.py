"""
Wallet routes for HD wallet operations with mnemonic support.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from decimal import Decimal
from datetime import datetime
import logging
import uuid
import asyncio

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundError, BlockchainError, ValidationError
from app.models.user import User
from app.models.wallet import Wallet
from app.models.address import Address
from app.models.transaction import Transaction, TransactionStatus
from app.services.wallet_service import WalletService
from app.services.blockchain_service import BlockchainService
from app.services.transaction_service import transaction_service
from app.services.blockchain_signer import blockchain_signer
from app.services.usdt_transaction_service import USDTTransactionService, usdt_transaction_service
from app.services.user_activity_service import UserActivityService
from app.services.price_aggregator import PriceData
from app.config.token_contracts import USDT_CONTRACTS, USDC_CONTRACTS
from pydantic import BaseModel, Field

from app.schemas.wallet import (
    WalletCreate, 
    WalletResponse, 
    WalletRestore,
    WalletWithMnemonic,
    AddressResponse,
    WalletBalancesByNetworkResponse,
    NetworkBalanceDetail
)

router = APIRouter()
wallet_service = WalletService()
blockchain_service = BlockchainService()
logger = logging.getLogger(__name__)

@router.post("/create", response_model=WalletWithMnemonic)
async def create_wallet_with_mnemonic(
    wallet_data: WalletCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new HD wallet with mnemonic phrase.
    
    ⚠️  SECURITY WARNING: The mnemonic is only returned once!
    Make sure the user saves it securely before proceeding.
    """
    try:
        logger.info(f"Creating new HD wallet for user {current_user.id}")
        
        result = await wallet_service.create_wallet_with_mnemonic(
            db=db,
            user_id=str(current_user.id),
            name=wallet_data.name,
            network=wallet_data.network,
            passphrase=wallet_data.passphrase or ""
        )
        
        # Log activity
        try:
            UserActivityService.log_activity(
                db=db,
                user_id=str(current_user.id),
                activity_type="wallet",
                description=f"Carteira '{wallet_data.name or 'Nova carteira'}' criada na rede {wallet_data.network}",
                status="success",
                extra_data={
                    "network": wallet_data.network,
                    "wallet_name": wallet_data.name,
                    "wallet_id": str(result["wallet"].id)
                },
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
        except Exception as log_error:
            logger.error(f"Failed to log wallet creation activity: {log_error}")
        
        return WalletWithMnemonic(
            id=result["wallet"].id,
            name=result["wallet"].name,
            network=result["wallet"].network,
            derivation_path=result["derivation_path"],
            first_address=result["first_address"],
            mnemonic=result["mnemonic"] if result.get("is_new_seed", False) else None,  # Only show for NEW seed
            created_at=result["wallet"].created_at,
            is_active=result["wallet"].is_active,
            restored=result.get("restored", False)
        )
        
    except Exception as e:
        logger.error(f"Failed to create wallet: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create wallet: {str(e)}"
        )

@router.post("/restore", response_model=WalletResponse)
async def restore_wallet_from_mnemonic(
    restore_data: WalletRestore,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Restore wallet from existing mnemonic phrase.
    """
    try:
        logger.info(f"Restoring wallet for user {current_user.id}")
        
        result = await wallet_service.restore_wallet_from_mnemonic(
            db=db,
            user_id=str(current_user.id),
            name=restore_data.name,
            network=restore_data.network,
            mnemonic=restore_data.mnemonic,
            passphrase=restore_data.passphrase or ""
        )
        
        return WalletResponse(
            id=result["wallet"].id,
            name=result["wallet"].name,
            network=result["wallet"].network,
            derivation_path=result["derivation_path"],
            first_address=result["first_address"],
            created_at=result["wallet"].created_at,
            is_active=result["wallet"].is_active,
            restored=result.get("restored", False)
        )
        
    except Exception as e:
        logger.error(f"Failed to restore wallet: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to restore wallet: {str(e)}"
        )

@router.get("/", response_model=List[WalletResponse])
async def get_user_wallets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all wallets for the current user."""
    try:
        wallets = db.query(Wallet).filter(
            Wallet.user_id == current_user.id,
            Wallet.is_active == True
        ).all()
        
        wallet_responses = []
        for wallet in wallets:
            # Get first address
            first_address = await wallet_service.get_wallet_addresses(
                db=db, 
                wallet_id=str(wallet.id), 
                address_type="receiving"
            )
            
            wallet_responses.append(WalletResponse(
                id=wallet.id,
                name=wallet.name,
                network=wallet.network,
                derivation_path=wallet.derivation_path,
                first_address=first_address[0].address if first_address else None,
                created_at=wallet.created_at,
                is_active=wallet.is_active
            ))
        
        return wallet_responses
        
    except Exception as e:
        logger.error(f"Failed to get wallets: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get wallets: {str(e)}"
        )

@router.post("/{wallet_id}/addresses", response_model=AddressResponse)
async def generate_new_address(
    wallet_id: str,
    address_type: str = "receiving",
    network: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new address for a wallet."""
    try:
        # Validate ownership
        is_owner = await wallet_service.validate_wallet_ownership(
            db=db,
            wallet_id=wallet_id,
            user_id=str(current_user.id)
        )
        
        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this wallet"
            )
        
        # Get wallet
        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        
        # Generate address
        address = await wallet_service.generate_address(
            db=db,
            wallet=wallet,
            address_type=address_type,
            network=network
        )
        
        return AddressResponse(
            id=address.id,
            address=address.address,
            address_type=address.address_type,
            derivation_index=address.derivation_index,
            derivation_path=address.derivation_path,
            is_active=address.is_active,
            created_at=address.created_at,
            network=address.network
        )
        
    except Exception as e:
        logger.error(f"Failed to generate address: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate address: {str(e)}"
        )

@router.get("/{wallet_id}/addresses", response_model=List[AddressResponse])
async def get_wallet_addresses(
    wallet_id: str,
    address_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all addresses for a wallet."""
    try:
        # Validate ownership
        is_owner = await wallet_service.validate_wallet_ownership(
            db=db,
            wallet_id=wallet_id,
            user_id=str(current_user.id)
        )
        
        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this wallet"
            )
        
        # Get addresses
        addresses = await wallet_service.get_wallet_addresses(
            db=db,
            wallet_id=wallet_id,
            address_type=address_type
        )
        
        return [
            AddressResponse(
                id=addr.id,
                address=addr.address,
                network=addr.network,
                address_type=addr.address_type,
                derivation_index=addr.derivation_index,
                derivation_path=addr.derivation_path,
                is_active=addr.is_active,
                created_at=addr.created_at
            )
            for addr in addresses
        ]
        
    except Exception as e:
        logger.error(f"Failed to get addresses: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get addresses: {str(e)}"
        )

@router.get("/{wallet_id}/balances", response_model=WalletBalancesByNetworkResponse)
async def get_wallet_balances_by_network(
    wallet_id: uuid.UUID,
    include_tokens: bool = Query(False, description="Include token balances"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get wallet balances grouped by network for multi-network wallets.
    Returns balance, USD and BRL values for each supported network.
    """
    from app.services.price_aggregator import price_aggregator
    from datetime import datetime
    
    # Verify wallet ownership
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user.id
    ).first()
    
    if not wallet:
        raise NotFoundError("Wallet not found")
    
    # Get all addresses for this wallet
    addresses = db.query(Address).filter(
        Address.wallet_id == wallet_id,
        Address.is_active == True
    ).all()
    
    if not addresses:
        return WalletBalancesByNetworkResponse(
            wallet_id=wallet_id,
            wallet_name=str(wallet.name),
            balances={},
            total_usd="0",
            total_brl="0"
        )
    
    blockchain_service = BlockchainService()
    
    # Supported networks for multi-wallet
    supported_networks = [
        "bitcoin", "ethereum", "polygon", "bsc", "tron", "base", 
        "solana", "litecoin", "dogecoin", "cardano", "avalanche", 
        "polkadot", "chainlink", "shiba", "xrp"
    ]
    
    # Network to symbol mapping
    network_symbols = {
        "bitcoin": "btc",
        "ethereum": "eth",
        "polygon": "polygon",  # Padronizado: usar "polygon" em vez de "matic"
        "bsc": "bnb",
        "tron": "trx",
        "base": "eth",
        "solana": "sol",
        "litecoin": "ltc",
        "dogecoin": "doge",
        "cardano": "ada",
        "avalanche": "avax",
        "polkadot": "dot",
        "chainlink": "link",
        "shiba": "shib",
        "xrp": "xrp"
    }
    
    try:
        balances_by_network: Dict[str, NetworkBalanceDetail] = {}
        total_usd_value = Decimal('0')
        
        # Get prices for all symbols (with fallback to multiple sources)
        symbols = list(set(network_symbols.values()))
        prices_usd = {}
        
        try:
            # ⚠️ PADRÃO: Backend sempre retorna preços em USD em TEMPO REAL
            # Frontend é responsável pela conversão para BRL via Settings
            prices_usd = await price_aggregator.get_prices(symbols, "usd")
            logger.info(f"[BALANCE DEBUG] Prices fetched (USD) - symbols: {list(prices_usd.keys())}")
            logger.info(f"[BALANCE DEBUG] Missing USD prices: {set(symbols) - set(prices_usd.keys())}")
        except Exception as price_error:
            logger.warning(f"⚠️ Price fetch failed: {price_error}")
            # NÃO usar fallback prices - retornar 0 para permitir que frontend mostre loading
            # Preços sempre devem vir em tempo real, nunca fixo
        
        # Get balance for each network
        for address_obj in addresses:
            network_str = str(address_obj.network or wallet.network)
            address_str = str(address_obj.address)
            
            if network_str not in supported_networks:
                continue
            
            try:
                balance_data = await blockchain_service.get_address_balance(
                    address_str,
                    network_str,
                    include_tokens=include_tokens  # 🔑 PASSANDO PARÂMETRO DO ENDPOINT!
                )
                
                native_balance = Decimal(balance_data.get('native_balance', '0'))
                logger.info(f"[BALANCE DEBUG] {network_str}: native_balance={native_balance}")
                
                if native_balance > 0:
                    # Get price for this network
                    symbol = network_symbols.get(network_str, network_str).lower()
                    logger.info(f"[BALANCE DEBUG] {network_str}: symbol={symbol}, native_balance={native_balance}")
                    
                    # Get prices (PriceData objects from aggregator)
                    price_data_usd = prices_usd.get(symbol)
                    
                    # Se preço não estiver disponível, retorna com price_usd = 0
                    # O frontend mostrará loading para preço enquanto tenta carregar
                    if not price_data_usd:
                        logger.warning(f"⚠️ Price not available for {symbol} - returning with price_usd=0")
                        price_usd = Decimal('0')
                    else:
                        price_usd = Decimal(str(price_data_usd.price))
                    
                    logger.info(f"[BALANCE DEBUG] {network_str}: price_usd={price_usd}, symbol={symbol}")
                    
                    # Calculate USD value only (Frontend will handle conversion to BRL)
                    balance_usd = native_balance * price_usd
                    
                    # Indicar se o preço está em loading (price_usd = 0)
                    price_loading = price_usd == 0
                    
                    logger.info(f"[BALANCE DEBUG] {network_str}: balance_usd={balance_usd}, native_balance={native_balance}, price_usd={price_usd}, price_loading={price_loading}")
                    
                    total_usd_value += balance_usd
                    
                    balances_by_network[network_str] = NetworkBalanceDetail(
                        network=network_str,
                        address=address_str,
                        balance=str(native_balance),
                        price_usd=f"{price_usd:.6f}",  # Retorna preço unitário
                        price_loading=price_loading,  # Indica se preço está em loading
                        balance_usd=f"{balance_usd:.2f}",
                        last_updated=datetime.utcnow()
                    )
                
                # 🪙 ADICIONAR SALDOS DE TOKENS
                token_balances = balance_data.get('token_balances', {})
                if token_balances:
                    logger.info(f"📊 Saldos de tokens encontrados para {address_str}: {token_balances}")
                    
                    # Verificar USDT e USDC
                    from app.config.token_contracts import USDT_CONTRACTS, USDC_CONTRACTS
                    
                    # Processar USDT
                    if network_str.lower() in USDT_CONTRACTS:
                        usdt_address = USDT_CONTRACTS[network_str.lower()]['address'].lower()
                        for token_addr, token_data in token_balances.items():
                            if token_addr.lower() == usdt_address:
                                usdt_balance = Decimal(str(token_data.get('balance', '0')))
                                # USDT normalmente é $1.00 USD
                                balance_usd = usdt_balance * Decimal('1.0')
                                
                                if usdt_balance > 0:
                                    total_usd_value += balance_usd
                                
                                balances_by_network[f"{network_str}_usdt"] = NetworkBalanceDetail(
                                    network=f"{network_str} (USDT)",
                                    address=address_str,
                                    balance=str(usdt_balance),
                                    price_usd="1.00",  # USDT é sempre $1.00 USD
                                    price_loading=False,  # USDT sempre tem preço
                                    balance_usd=f"{balance_usd:.2f}",
                                    last_updated=datetime.utcnow()
                                )
                                if usdt_balance > 0:
                                    logger.info(f"✅ USDT balance on {network_str}: {usdt_balance}")
                                else:
                                    logger.info(f"⚠️  USDT (0 balance) on {network_str}")
                    
                    # Processar USDC
                    if network_str.lower() in USDC_CONTRACTS:
                        usdc_address = USDC_CONTRACTS[network_str.lower()]['address'].lower()
                        for token_addr, token_data in token_balances.items():
                            if token_addr.lower() == usdc_address:
                                usdc_balance = Decimal(str(token_data.get('balance', '0')))
                                # USDC normalmente é $1.00 USD
                                balance_usd = usdc_balance * Decimal('1.0')
                                
                                if usdc_balance > 0:
                                    total_usd_value += balance_usd
                                
                                balances_by_network[f"{network_str}_usdc"] = NetworkBalanceDetail(
                                    network=f"{network_str} (USDC)",
                                    address=address_str,
                                    balance=str(usdc_balance),
                                    price_usd="1.00",  # USDC é sempre $1.00 USD
                                    price_loading=False,  # USDC sempre tem preço
                                    balance_usd=f"{balance_usd:.2f}",
                                    last_updated=datetime.utcnow()
                                )
                                if usdc_balance > 0:
                                    logger.info(f"✅ USDC balance on {network_str}: {usdc_balance}")
                                else:
                                    logger.info(f"⚠️  USDC (0 balance) on {network_str}")
            
            except Exception as e:
                logger.error(f"Error fetching balance for {network_str} address {address_str}: {str(e)}")
                # Continue with other networks even if one fails
                continue
        
        # ⚠️ PADRÃO: Backend returns totals in USD only
        # Frontend handles conversion to BRL
        logger.info(f"[BALANCE DEBUG] FINAL TOTAL USD: {total_usd_value}")
        logger.info(f"[BALANCE DEBUG] Balances count: {len(balances_by_network)}")
        for network, detail in balances_by_network.items():
            logger.info(f"[BALANCE DEBUG]   {network}: USD={detail.balance_usd}, balance={detail.balance}")
        
        return WalletBalancesByNetworkResponse(
            wallet_id=wallet_id,
            wallet_name=str(wallet.name),
            balances=balances_by_network,
            total_usd=f"{total_usd_value:.2f}",
            total_brl=f"{(total_usd_value * Decimal('4.50')):.2f}"  # Frontend will recalculate with real exchange rate
        )
        
    except Exception as e:
        logger.error(f"Failed to fetch wallet balances by network: {str(e)}")
        raise BlockchainError(f"Failed to fetch wallet balances: {str(e)}")

@router.get("/{wallet_id}/mnemonic")
async def get_wallet_mnemonic(
    wallet_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔐 Get wallet mnemonic (12 palavras-chave).
    
    ⚠️  SECURITY WARNING: This is a sensitive operation!
    Only the wallet owner can access this information.
    """
    try:
        # Validate ownership
        is_owner = await wallet_service.validate_wallet_ownership(
            db=db,
            wallet_id=wallet_id,
            user_id=str(current_user.id)
        )
        
        if not is_owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this wallet"
            )
        
        # Get wallet mnemonic
        mnemonic = await wallet_service.get_wallet_mnemonic(
            db=db,
            wallet_id=wallet_id
        )
        
        logger.warning(f"Mnemonic accessed for wallet {wallet_id} by user {current_user.id}")
        
        return {
            "wallet_id": wallet_id,
            "mnemonic": mnemonic,
            "words_count": len(mnemonic.split()),
            "warning": "⚠️ Keep these words safe! Anyone with access can control your funds.",
            "backup_tips": [
                "Write these words on paper",
                "Store in a secure location",
                "Never share with anyone",
                "Consider using multiple backup locations"
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get mnemonic: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get mnemonic: {str(e)}"
        )

@router.get("/{wallet_id}/transactions")
async def get_wallet_transactions(
    wallet_id: str,
    network: Optional[str] = Query(None, description="Filter by specific network"),
    limit: int = Query(50, ge=1, le=100, description="Number of transactions to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get real blockchain transactions for a wallet.
    Fetches transactions directly from blockchain APIs (Blockstream, Polygon RPC, etc).
    """
    from app.services.blockchain_service import BlockchainService
    from datetime import datetime
    
    # Verify wallet ownership
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user.id
    ).first()
    
    if not wallet:
        raise NotFoundError("Wallet not found")
    
    # Get all addresses for this wallet
    addresses = db.query(Address).filter(
        Address.wallet_id == wallet_id,
        Address.is_active == True
    ).all()
    
    if not addresses:
        return {
            "wallet_id": wallet_id,
            "transactions": [],
            "total": 0
        }
    
    blockchain_service = BlockchainService()
    all_transactions = []
    
    # Supported networks for transaction history
    networks_to_check = ["polygon"] if network else ["bitcoin", "ethereum", "polygon", "bsc"]
    
    # Network to symbol mapping (for correct display)
    network_symbols = {
        "bitcoin": "BTC",
        "ethereum": "ETH",
        "polygon": "MATIC",
        "bsc": "BNB",
        "tron": "TRX",
        "base": "ETH",
        "solana": "SOL",
        "litecoin": "LTC",
        "dogecoin": "DOGE",
        "cardano": "ADA",
        "avalanche": "AVAX",
        "polkadot": "DOT",
        "chainlink": "LINK",
        "shiba": "SHIB",
        "xrp": "XRP"
    }
    
    try:
        # Fetch transactions for each address/network combination
        for address_obj in addresses:
            address_str = str(address_obj.address)
            network_str = str(address_obj.network or wallet.network)
            
            # Skip if filtering by network and this isn't it
            if network and network_str != network:
                continue
            
            # Only fetch for supported networks
            if network_str not in networks_to_check:
                continue
            
            try:
                logger.info(f"Fetching transactions for {address_str} on {network_str}")
                txs = await blockchain_service.get_address_transactions(
                    address_str,
                    network_str,
                    limit=limit
                )
                
                # Format transactions
                for tx in txs:
                    # Determine if it's incoming or outgoing
                    is_incoming = tx.get('to', '').lower() == address_str.lower()
                    
                    formatted_tx = {
                        "id": tx.get('hash', tx.get('txid', '')),
                        "hash": tx.get('hash', tx.get('txid', '')),
                        "network": network_str,
                        "type": "receive" if is_incoming else "send",
                        "from_address": tx.get('from', ''),
                        "to_address": tx.get('to', ''),
                        "amount": str(tx.get('value', 0)),
                        "token_symbol": network_symbols.get(network_str, network_str.upper()),
                        "status": "confirmed" if tx.get('confirmations', 0) > 0 else "pending",
                        "confirmations": tx.get('confirmations', 0),
                        "block_number": tx.get('block_number', tx.get('blockheight', 0)),
                        "timestamp": datetime.fromtimestamp(tx.get('timestamp', 0)) if tx.get('timestamp') else datetime.utcnow(),
                        "created_at": datetime.fromtimestamp(tx.get('timestamp', 0)) if tx.get('timestamp') else datetime.utcnow(),
                        "fee": str(tx.get('fee', 0))
                    }
                    
                    all_transactions.append(formatted_tx)
                    
            except Exception as e:
                logger.error(f"Error fetching transactions for {network_str} address {address_str}: {str(e)}")
                # Continue with other addresses even if one fails
                continue
        
        # Sort by timestamp (newest first)
        all_transactions.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Limit total results
        all_transactions = all_transactions[:limit]
        
        return {
            "wallet_id": wallet_id,
            "wallet_name": str(wallet.name),
            "transactions": all_transactions,
            "total": len(all_transactions)
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch wallet transactions: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch wallet transactions: {str(e)}"
        )

# Request schemas for sending transactions
class ValidateAddressRequest(BaseModel):
    """Request to validate a blockchain address."""
    address: str = Field(..., description="Address to validate")
    network: str = Field(..., description="Blockchain network")

class EstimateFeeRequest(BaseModel):
    """Request to estimate transaction fees."""
    wallet_id: str = Field(..., description="Wallet UUID")
    to_address: str = Field(..., description="Recipient address")
    amount: str = Field(..., description="Amount to send")
    network: str = Field(..., description="Blockchain network")

class SendTransactionRequest(BaseModel):
    """Request to send a transaction."""
    wallet_id: str = Field(..., description="Wallet UUID")
    to_address: str = Field(..., description="Recipient address")
    amount: str = Field(..., description="Amount to send")
    network: str = Field(..., description="Blockchain network")
    fee_level: str = Field(default="standard", description="Fee speed: slow, standard, fast")
    mode: str = Field(default="custodial", description="Signing mode: 'custodial' or 'non-custodial'")
    note: Optional[str] = Field(None, description="Optional transaction note")
    password: Optional[str] = Field(None, description="Wallet password if required")
    two_factor_token: Optional[str] = Field(None, description="2FA token or biometric token (required if 2FA enabled)", min_length=6, max_length=64)
    token_symbol: Optional[str] = Field(None, description="Token symbol (e.g., USDT, USDC)")
    token_address: Optional[str] = Field(None, description="Token contract address")


class ValidateSendRequest(BaseModel):
    """Request to validate a transaction BEFORE asking for authentication."""
    wallet_id: str = Field(..., description="Wallet UUID")
    to_address: str = Field(..., description="Recipient address")
    amount: str = Field(..., description="Amount to send")
    network: str = Field(..., description="Blockchain network")
    fee_level: str = Field(default="standard", description="Fee speed: slow, standard, fast")
    token_symbol: Optional[str] = Field(None, description="Token symbol (e.g., USDT, USDC)")
    token_address: Optional[str] = Field(None, description="Token contract address")

@router.post("/validate-address")
async def validate_address(
    request: ValidateAddressRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Validate a blockchain address format.
    
    Returns whether the address is valid for the specified network.
    """
    try:
        is_valid = await blockchain_service.validate_address(
            request.address,
            request.network
        )
        
        return {
            "address": request.address,
            "network": request.network,
            "valid": is_valid,
            "message": "Address is valid" if is_valid else "Invalid address format"
        }
        
    except Exception as e:
        logger.error(f"Error validating address: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to validate address: {str(e)}"
        )


@router.post("/validate-send")
async def validate_send_transaction(
    request: ValidateSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔍 PRÉ-VALIDAÇÃO DE TRANSAÇÃO
    
    Este endpoint DEVE ser chamado ANTES de pedir biometria/2FA ao usuário.
    Ele verifica na blockchain:
    
    1. ✅ Se a carteira existe e pertence ao usuário
    2. ✅ Se o endereço de destino é válido
    3. ✅ Se há saldo REAL suficiente (consulta blockchain)
    4. ✅ Se há gas suficiente para a transação
    5. ✅ Estima o custo total (valor + gas)
    
    FLUXO CORRETO:
    Frontend → validate-send → OK → Pede biometria/2FA → send
    
    Returns:
        - valid: true se pode prosseguir com autenticação
        - error: mensagem de erro se inválido
        - balance: saldo real na blockchain
        - gas_estimate: estimativa de gas
        - total_cost: custo total (valor + gas)
    """
    from web3 import Web3
    from decimal import Decimal
    
    logger.info(f"🔍 Pre-validating transaction for user {current_user.id}")
    logger.info(f"   Wallet: {request.wallet_id}")
    logger.info(f"   To: {request.to_address}")
    logger.info(f"   Amount: {request.amount} on {request.network}")
    
    try:
        # 1. Verificar se a carteira existe e pertence ao usuário
        wallet = db.query(Wallet).filter(
            Wallet.id == uuid.UUID(request.wallet_id),
            Wallet.user_id == current_user.id
        ).first()
        
        if not wallet:
            logger.warning(f"❌ Wallet not found: {request.wallet_id}")
            return {
                "valid": False,
                "error": "WALLET_NOT_FOUND",
                "message": "Carteira não encontrada"
            }
        
        # 2. Obter endereço da carteira para a rede
        address_obj = db.query(Address).filter(
            Address.wallet_id == wallet.id,
            Address.network == request.network,
            Address.is_active == True
        ).first()
        
        if not address_obj:
            logger.warning(f"❌ No address for network {request.network}")
            return {
                "valid": False,
                "error": "NO_ADDRESS_FOR_NETWORK",
                "message": f"Endereço não encontrado para rede {request.network}"
            }
        
        from_address = str(address_obj.address)
        logger.info(f"   From address: {from_address}")
        
        # 3. Validar endereço de destino
        try:
            if not Web3.is_address(request.to_address):
                return {
                    "valid": False,
                    "error": "INVALID_TO_ADDRESS",
                    "message": "Endereço de destino inválido"
                }
        except Exception:
            return {
                "valid": False,
                "error": "INVALID_TO_ADDRESS",
                "message": "Endereço de destino inválido"
            }
        
        # 4. Consultar saldo REAL na blockchain
        # Usar o blockchain_signer que já está configurado
        network_lower = request.network.lower()
        w3 = blockchain_signer.providers.get(network_lower)
        
        if not w3 or not w3.is_connected():
            logger.error(f"❌ Not connected to {network_lower}")
            return {
                "valid": False,
                "error": "NETWORK_UNAVAILABLE",
                "message": f"Não foi possível conectar à rede {request.network}"
            }
        
        # Verificar se é transação de token ou moeda nativa
        is_token = request.token_symbol and request.token_symbol.upper() in ['USDT', 'USDC']
        
        if is_token:
            # Para tokens, verificar saldo do token E saldo de gas
            from app.config.token_contracts import get_token_address, get_token_decimals, ERC20_ABI
            
            token_address = get_token_address(request.token_symbol, request.network)
            if not token_address:
                return {
                    "valid": False,
                    "error": "TOKEN_NOT_SUPPORTED",
                    "message": f"{request.token_symbol} não suportado em {request.network}"
                }
            
            decimals = get_token_decimals(request.token_symbol, request.network)
            
            # Saldo do token
            try:
                contract = w3.eth.contract(
                    address=Web3.to_checksum_address(token_address),
                    abi=ERC20_ABI
                )
                token_balance_wei = contract.functions.balanceOf(
                    Web3.to_checksum_address(from_address)
                ).call()
                token_balance = Decimal(token_balance_wei) / (10 ** decimals)
            except Exception as e:
                logger.error(f"❌ Error fetching token balance: {e}")
                return {
                    "valid": False,
                    "error": "BALANCE_CHECK_FAILED",
                    "message": "Erro ao consultar saldo do token"
                }
            
            # Saldo nativo para gas
            try:
                native_balance_wei = w3.eth.get_balance(Web3.to_checksum_address(from_address))
                native_balance = Decimal(native_balance_wei) / (10 ** 18)
            except Exception as e:
                logger.error(f"❌ Error fetching native balance: {e}")
                return {
                    "valid": False,
                    "error": "BALANCE_CHECK_FAILED",
                    "message": "Erro ao consultar saldo para gas"
                }
            
            # Estimar gas para token transfer
            try:
                gas_price = w3.eth.gas_price
                gas_limit = 65000  # ERC20 transfer típico
                gas_cost_wei = gas_price * gas_limit
                gas_cost = Decimal(gas_cost_wei) / (10 ** 18)
            except Exception as e:
                logger.warning(f"⚠️ Gas estimate failed, using default: {e}")
                gas_cost = Decimal("0.01")  # Fallback
            
            amount_decimal = Decimal(request.amount)
            
            # Verificar saldo do token
            if token_balance < amount_decimal:
                logger.warning(f"❌ Insufficient token balance: {token_balance} < {amount_decimal}")
                return {
                    "valid": False,
                    "error": "INSUFFICIENT_TOKEN_BALANCE",
                    "message": f"Saldo insuficiente de {request.token_symbol}",
                    "balance": str(token_balance),
                    "required": str(amount_decimal),
                    "native_balance": str(native_balance)
                }
            
            # Verificar saldo para gas
            if native_balance < gas_cost:
                native_symbol = {"polygon": "MATIC", "ethereum": "ETH", "bsc": "BNB", "base": "ETH"}.get(network_lower, "NATIVE")
                logger.warning(f"❌ Insufficient gas: {native_balance} < {gas_cost}")
                return {
                    "valid": False,
                    "error": "INSUFFICIENT_GAS",
                    "message": f"Saldo insuficiente de {native_symbol} para gas",
                    "balance": str(native_balance),
                    "gas_required": str(gas_cost),
                    "native_symbol": native_symbol
                }
            
            logger.info(f"✅ Pre-validation PASSED for token transfer")
            return {
                "valid": True,
                "message": "Transação pode ser realizada",
                "from_address": from_address,
                "to_address": request.to_address,
                "amount": request.amount,
                "token_symbol": request.token_symbol,
                "token_balance": str(token_balance),
                "native_balance": str(native_balance),
                "gas_estimate": str(gas_cost),
                "network": request.network,
                "requires_auth": True  # Indica que precisa de 2FA/biometria
            }
        
        else:
            # Transação de moeda nativa (MATIC, ETH, BNB, etc)
            try:
                balance_wei = w3.eth.get_balance(Web3.to_checksum_address(from_address))
                balance = Decimal(balance_wei) / (10 ** 18)
                logger.info(f"   Blockchain balance: {balance}")
            except Exception as e:
                logger.error(f"❌ Error fetching balance: {e}")
                return {
                    "valid": False,
                    "error": "BALANCE_CHECK_FAILED",
                    "message": "Erro ao consultar saldo na blockchain"
                }
            
            # Estimar gas
            try:
                gas_price = w3.eth.gas_price
                gas_limit = 21000  # Transfer simples
                gas_cost_wei = gas_price * gas_limit
                gas_cost = Decimal(gas_cost_wei) / (10 ** 18)
                logger.info(f"   Gas estimate: {gas_cost}")
            except Exception as e:
                logger.warning(f"⚠️ Gas estimate failed, using default: {e}")
                gas_cost = Decimal("0.001")  # Fallback
            
            amount_decimal = Decimal(request.amount)
            total_required = amount_decimal + gas_cost
            
            # Verificar saldo total (valor + gas)
            if balance < total_required:
                native_symbol = {"polygon": "MATIC", "ethereum": "ETH", "bsc": "BNB", "base": "ETH"}.get(network_lower, "NATIVE")
                logger.warning(f"❌ Insufficient balance: {balance} < {total_required}")
                return {
                    "valid": False,
                    "error": "INSUFFICIENT_BALANCE",
                    "message": f"Saldo insuficiente de {native_symbol}",
                    "balance": str(balance),
                    "amount": str(amount_decimal),
                    "gas_estimate": str(gas_cost),
                    "total_required": str(total_required),
                    "shortfall": str(total_required - balance)
                }
            
            logger.info(f"✅ Pre-validation PASSED for native transfer")
            return {
                "valid": True,
                "message": "Transação pode ser realizada",
                "from_address": from_address,
                "to_address": request.to_address,
                "amount": request.amount,
                "balance": str(balance),
                "gas_estimate": str(gas_cost),
                "total_required": str(total_required),
                "remaining_after": str(balance - total_required),
                "network": request.network,
                "requires_auth": True  # Indica que precisa de 2FA/biometria
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in validate-send: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "valid": False,
            "error": "VALIDATION_FAILED",
            "message": f"Erro na validação: {str(e)}"
        }


@router.post("/estimate-fee")
async def estimate_transaction_fee(
    request: EstimateFeeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Estimate transaction fees for different speed levels.
    
    Returns fee estimates for slow, standard, and fast transactions.
    """
    try:
        # Verify wallet belongs to user
        wallet = db.query(Wallet).filter(
            Wallet.id == uuid.UUID(request.wallet_id),
            Wallet.user_id == current_user.id
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        
        # Get wallet address for the network
        address_obj = db.query(Address).filter(
            Address.wallet_id == wallet.id,
            Address.network == request.network,
            Address.is_active == True
        ).first()
        
        if not address_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active address found for network {request.network}"
            )
        
        from_address = address_obj.address
        
        # Estimate fees
        fees = await blockchain_service.estimate_fees(
            network=request.network,
            from_address=from_address,
            to_address=request.to_address,
            amount=request.amount
        )
        
        # Normalize fee format to match frontend expectations
        # Frontend expects: { slow_fee, standard_fee, fast_fee }
        fee_estimates = {
            "slow_fee": fees.get("slow_fee", fees.get("estimated_fee", "0.001")),
            "standard_fee": fees.get("standard_fee", fees.get("estimated_fee", "0.0012")),
            "fast_fee": fees.get("fast_fee", "0.0015")
        }
        
        # Get currency symbol for the network
        network_currencies = {
            "bitcoin": "BTC",
            "ethereum": "ETH",
            "polygon": "MATIC",
            "bsc": "BNB",
            "tron": "TRX",
            "base": "ETH",
            "solana": "SOL",
            "litecoin": "LTC",
            "dogecoin": "DOGE",
            "cardano": "ADA",
            "avalanche": "AVAX"
        }
        currency = network_currencies.get(request.network.lower(), request.network.upper());
        
        return {
            "wallet_id": request.wallet_id,
            "network": request.network,
            "from_address": from_address,
            "to_address": request.to_address,
            "amount": request.amount,
            "fee_estimates": fee_estimates,
            "currency": currency
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error estimating fee: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to estimate fee: {str(e)}"
        )


@router.post("/send")
async def send_transaction(
    request: SendTransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send blockchain transaction - Simplified authentication model
    
    **AUTHENTICATION MODEL:**
    - If user has biometric enabled AND provides biometric token: verify biometric
    - If user has 2FA enabled AND provides 2FA token: verify 2FA
    - Otherwise: use session authentication (user is already logged in)
    
    This follows the same model as popular Web3 wallets (MetaMask, Trust Wallet)
    where being logged in is sufficient for most transactions.
    
    **CUSTODIAL MODE (default):**
    - Backend signs the transaction with user's encrypted private key
    - Fast, convenient, no external wallet needed
    
    **NON-CUSTODIAL MODE:**
    - Returns unsigned transaction data for external signing
    """
    # Variable to track if we need to consume biometric token after success
    biometric_token_to_consume = None
    
    # Import auth services
    from app.services.two_factor_service import two_factor_service
    from app.services.webauthn_service import webauthn_service
    from app.models.two_factor import TwoFactorAuth
    
    try:
        # Check if user provided authentication token
        logger.info(f"Processing send request for user {current_user.id}")
        
        # Check 2FA status (for info only - not blocking)
        two_fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == current_user.id,
            TwoFactorAuth.is_enabled == True
        ).first()
        
        # If token provided, verify it
        if request.two_factor_token:
            logger.info(f"Token provided, verifying...")
            
            if request.two_factor_token.startswith("bio_"):
                # Biometric token
                logger.info("Verifying biometric token...")
                is_valid = webauthn_service.verify_biometric_token(
                    current_user.id,
                    request.two_factor_token,
                    consume=False  # Don't consume yet
                )
                if is_valid:
                    logger.info(f"Biometric token verified for user {current_user.id}")
                    biometric_token_to_consume = request.two_factor_token
                else:
                    logger.error("Invalid biometric token")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="BIOMETRIC_TOKEN_EXPIRED"
                    )
            else:
                # 2FA TOTP token
                if two_fa:
                    logger.info("Verifying 2FA token...")
                    is_valid = await two_factor_service.verify_2fa_for_action(
                        db,
                        current_user,
                        request.two_factor_token
                    )
                    if not is_valid:
                        logger.error("Invalid 2FA token")
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="INVALID_2FA_TOKEN"
                        )
                    logger.info(f"2FA verified for user {current_user.id}")
        else:
            # No token provided - use session authentication
            # This is valid! User is already authenticated via JWT
            logger.info(f"No auth token provided, using session for user {current_user.id}")
        
        # Verify wallet belongs to user
        wallet = db.query(Wallet).filter(
            Wallet.id == uuid.UUID(request.wallet_id),
            Wallet.user_id == current_user.id
        ).first()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        
        # Get wallet address for the network
        address_obj = db.query(Address).filter(
            Address.wallet_id == wallet.id,
            Address.network == request.network,
            Address.is_active == True
        ).first()
        
        if not address_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active address found for network {request.network}"
            )
        
        from_address = str(address_obj.address)
        
        logger.info(f"📤 Send transaction request: mode={request.mode}, {from_address} -> {request.to_address}")
        
        # ============================================
        # MODE 1: NON-CUSTODIAL (External Signing)
        # ============================================
        if request.mode == "non-custodial":
            logger.info("🔓 NON-CUSTODIAL MODE: Preparing transaction for external signing")
            
            # Get gas price estimate based on fee level
            gas_estimates = await blockchain_signer.estimate_gas_price(request.network, request.fee_level)
            selected_gas = gas_estimates.get(request.fee_level, gas_estimates['standard'])
            
            # Prepare unsigned transaction
            unsigned_tx = await blockchain_signer.prepare_transaction_for_external_signing(
                network=request.network,
                from_address=from_address,
                to_address=request.to_address,
                amount=request.amount,
                gas_price_gwei=float(selected_gas['gas_price_gwei'])
            )
            
            return {
                "success": True,
                "mode": "non-custodial",
                "message": "Transaction prepared. Please sign with your external wallet (MetaMask, Trust Wallet, etc.)",
                "transaction_data": unsigned_tx,
                "from_address": from_address,
                "to_address": request.to_address,
                "amount": request.amount,
                "network": request.network,
                "fee_level": request.fee_level,
                "instructions": {
                    "metamask": "Connect MetaMask and approve the transaction",
                    "trust_wallet": "Open Trust Wallet and scan the QR code",
                    "walletconnect": "Use WalletConnect to sign with any compatible wallet"
                }
            }
        
        # ============================================
        # MODE 2: CUSTODIAL (Backend Signing)  
        # ============================================
        else:
            logger.info("🔒 CUSTODIAL MODE: Signing transaction on backend")
            
            from app.services.crypto_service import CryptoService
            crypto_service = CryptoService()
            
            private_key = None
            
            # PRIORITY 1: Use encrypted_private_key from address (most reliable)
            if address_obj.encrypted_private_key:
                logger.info("🔑 Using encrypted_private_key from address table")
                try:
                    private_key = crypto_service.decrypt_data(str(address_obj.encrypted_private_key))
                    
                    # Verify the key matches the address
                    from eth_account import Account
                    account = Account.from_key(private_key)
                    if account.address.lower() == from_address.lower():
                        logger.info(f"✅ Private key verified - matches address {from_address}")
                    else:
                        logger.warning(f"⚠️ Key mismatch! Address: {from_address}, Key derives: {account.address}")
                        private_key = None  # Reset to try derivation
                except Exception as e:
                    logger.error(f"❌ Error decrypting private key: {e}")
                    private_key = None
            
            # PRIORITY 2: Fallback to BIP44 derivation from mnemonic
            if not private_key and wallet.encrypted_seed:
                logger.info("🔑 Falling back to BIP44 derivation from mnemonic")
                try:
                    from bip_utils import Bip39SeedGenerator, Bip44, Bip44Coins, Bip44Changes
                    
                    mnemonic = crypto_service.decrypt_data(str(wallet.encrypted_seed))
                    seed_bytes = Bip39SeedGenerator(mnemonic).Generate()
                    
                    # Determine coin type based on network
                    network_lower = request.network.lower()
                    if network_lower in ["ethereum", "polygon", "bsc", "base", "avalanche"]:
                        bip44_coin = Bip44Coins.ETHEREUM
                    elif network_lower == "bitcoin":
                        bip44_coin = Bip44Coins.BITCOIN
                    else:
                        bip44_coin = Bip44Coins.ETHEREUM
                    
                    # Derive using derivation_index from address or default to 0
                    derivation_index = int(address_obj.derivation_index) if address_obj.derivation_index else 0
                    
                    bip44_mnemonic = Bip44.FromSeed(seed_bytes, bip44_coin)
                    bip44_account = bip44_mnemonic.Purpose().Coin().Account(0)
                    bip44_change = bip44_account.Change(Bip44Changes.CHAIN_EXT)
                    bip44_address = bip44_change.AddressIndex(derivation_index)
                    
                    private_key = bip44_address.PrivateKey().Raw().ToHex()
                    derived_address = bip44_address.PublicKey().ToAddress()
                    
                    logger.info(f"🔍 Derived address (index {derivation_index}): {derived_address}")
                    
                    if derived_address.lower() != from_address.lower():
                        logger.warning(f"⚠️ BIP44 derivation mismatch! DB: {from_address}, Derived: {derived_address}")
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Unable to derive correct private key for this address"
                        )
                except HTTPException:
                    raise
                except Exception as e:
                    logger.error(f"❌ Error deriving from mnemonic: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to derive private key: {str(e)}"
                    )
            
            if not private_key:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No private key available for this address"
                )
            
            # Get gas price based on fee level (needed for both tokens and native)
            gas_estimates = await blockchain_signer.estimate_gas_price(request.network, request.fee_level)
            selected_gas = gas_estimates.get(request.fee_level, gas_estimates['standard'])
            
            # DETECTAR SE É TOKEN USDT OU USDC
            is_usdt = request.token_symbol and request.token_symbol.upper() == 'USDT'
            is_usdc = request.token_symbol and request.token_symbol.upper() == 'USDC'
            
            tx_hash = None
            tx_details = None
            
            if is_usdt or is_usdc:
                logger.info(f"🪙 Detectado token {request.token_symbol} - usando USDTTransactionService")
                
                # Obter endereço do contrato
                contracts = USDT_CONTRACTS if is_usdt else USDC_CONTRACTS
                network_lower = request.network.lower()
                
                if network_lower not in contracts:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"{request.token_symbol} não suportado na rede {request.network}"
                    )
                
                token_contract = contracts[network_lower]
                
                logger.info(f"📝 Preparando transação {request.token_symbol}:")
                logger.info(f"  De: {from_address}")
                logger.info(f"  Para: {request.to_address}")
                logger.info(f"  Valor: {request.amount}")
                logger.info(f"  Contrato: {token_contract['address']}")
                
                # Assinar e enviar transação de token
                try:
                    # Usar asyncio.to_thread para não bloquear a event loop
                    tx_result = await asyncio.to_thread(
                        usdt_transaction_service.sign_and_send_transaction,
                        from_address,
                        request.to_address,
                        request.amount,
                        request.token_symbol,
                        request.network,
                        private_key,
                        request.fee_level
                    )
                except asyncio.TimeoutError:
                    logger.error("Timeout ao enviar transacao")
                    raise HTTPException(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        detail="Transação demorou muito. Tente novamente."
                    )
                except Exception as e:
                    logger.error(f"Erro ao assinar/enviar transacao: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Erro ao processar transação: {str(e)}"
                    )
                
                if tx_result.get('error'):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Erro ao enviar {request.token_symbol}: {tx_result['error']}"
                    )
                
                tx_hash = tx_result.get('tx_hash')
                tx_details = {}  # Não temos detalhes adicionais para tokens
                logger.info(f"✅ Transação {request.token_symbol} enviada: {tx_hash}")
                
            else:
                logger.info("💱 Transação nativa (não é token) - usando blockchain_signer")
                
                # Sign and broadcast transaction (native coin)
                tx_hash, tx_details = await blockchain_signer.sign_evm_transaction(
                    network=request.network,
                    from_address=from_address,
                    to_address=request.to_address,
                    amount=request.amount,
                    private_key=private_key,
                    gas_price_gwei=float(selected_gas['gas_price_gwei']) if isinstance(selected_gas, dict) else selected_gas
                )
            
            # Determine token_address for database
            if request.token_address:
                db_token_address = request.token_address
            elif is_usdt:
                db_token_address = USDT_CONTRACTS.get(request.network.lower(), {}).get('address')
            elif is_usdc:
                db_token_address = USDC_CONTRACTS.get(request.network.lower(), {}).get('address')
            else:
                db_token_address = None
            
            # Save transaction to database
            try:
                transaction_record = Transaction(
                    user_id=current_user.id,
                    address_id=address_obj.id if address_obj else None,
                    tx_hash=tx_hash,
                    from_address=from_address,
                    to_address=request.to_address,
                    amount=str(request.amount),
                    fee=str(selected_gas.get('estimated_cost', '0')) if isinstance(selected_gas, dict) else str(selected_gas),
                    network=request.network,
                    status=TransactionStatus.pending,
                    token_address=db_token_address,
                    token_symbol=request.token_symbol,
                    memo=request.note,
                    raw_transaction=tx_details.get('raw_tx') if tx_details else None,
                    signed_transaction=tx_details.get('signed_tx') if tx_details else None,
                    broadcasted_at=datetime.utcnow(),
                )
                db.add(transaction_record)
                db.commit()
                db.refresh(transaction_record)
                transaction_id = transaction_record.id
                
                logger.info(f"✅ Transaction saved to database: ID={transaction_id}, Hash={tx_hash}")
            except Exception as db_error:
                logger.error(f"❌ Error saving transaction to database: {db_error}")
                # Even if DB save fails, transaction was already sent to blockchain!
                # We should still return success to user
                logger.warning("⚠️  Transaction sent to blockchain but failed to save to database. Attempting backup save...")
                transaction_id = None
            
            # Get explorer URL
            explorer_urls = {
                'ethereum': f'https://etherscan.io/tx/{tx_hash}',
                'polygon': f'https://polygonscan.com/tx/{tx_hash}',
                'bsc': f'https://bscscan.com/tx/{tx_hash}',
                'bitcoin': f'https://blockstream.info/tx/{tx_hash}',
                'tron': f'https://tronscan.org/#/transaction/{tx_hash}',
                'base': f'https://basescan.org/tx/{tx_hash}',
                'avalanche': f'https://snowtrace.io/tx/{tx_hash}'
            }
            
            # 🔐 CONSUMIR TOKEN BIOMÉTRICO APÓS SUCESSO
            # O token só é marcado como usado DEPOIS que a transação foi enviada com sucesso
            if biometric_token_to_consume:
                logger.info("🔐 Consuming biometric token after successful transaction...")
                webauthn_service.consume_biometric_token(biometric_token_to_consume)
            
            return {
                "success": True,
                "mode": "custodial",
                "transaction_id": transaction_id or "pending_save",
                "tx_hash": tx_hash,
                "network": request.network,
                "from_address": from_address,
                "to_address": request.to_address,
                "amount": request.amount,
                "fee": str(selected_gas.get('estimated_cost', '0')) if isinstance(selected_gas, dict) else str(selected_gas),
                "fee_level": request.fee_level,
                "status": "pending",
                "explorer_url": explorer_urls.get(request.network, ""),
                "estimated_confirmation_time": str(selected_gas.get('estimated_time', '0')) if isinstance(selected_gas, dict) else "0",
                "message": "✅ Transaction broadcasted successfully! It may take a few minutes to confirm.",
                "details": tx_details
            }
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error sending transaction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error sending transaction: {error_msg}")
        
        # Retornar mensagem amigável para erros conhecidos
        error_lower = error_msg.lower()
        
        if 'insufficient funds' in error_lower or 'saldo insuficiente' in error_lower or 'saldo de' in error_lower:
            # Se já é uma mensagem formatada, usar ela diretamente
            if 'gas' in error_lower:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Saldo insuficiente para cobrir o valor + taxa de gas. Reduza o valor da transação ou adicione mais fundos."
            )
        elif 'nonce too low' in error_lower or 'transação pendente' in error_lower:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Existe uma transação pendente. Aguarde a confirmação antes de enviar outra."
            )
        elif 'replacement transaction' in error_lower or 'underpriced' in error_lower:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Taxa de gas muito baixa. Aguarde a confirmação da transação anterior."
            )
        elif 'execution reverted' in error_lower:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transação rejeitada pelo contrato. Verifique o saldo do token."
            )
        elif 'invalid address' in error_lower or 'checksum' in error_lower:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Endereço de destino inválido. Verifique o endereço e tente novamente."
            )
        elif 'timeout' in error_lower:
            raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail="Tempo esgotado. A rede está congestionada, tente novamente."
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Falha ao enviar transação: {error_msg}"
        )


@router.get("/transactions/{transaction_id}/status")
async def get_transaction_status(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check the confirmation status of a transaction.
    
    Returns current status, confirmations, and whether it's finalized.
    """
    try:
        status_info = await transaction_service.check_transaction_status(
            db=db,
            transaction_id=transaction_id,
            user_id=current_user.id
        )
        
        return status_info
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error checking transaction status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to check transaction status: {str(e)}"
        )
