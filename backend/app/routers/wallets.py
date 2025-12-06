"""
Wallet routes for HD wallet operations with mnemonic support.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from decimal import Decimal
import logging
import uuid

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundError, BlockchainError
from app.models.user import User
from app.models.wallet import Wallet
from app.models.address import Address
from app.services.wallet_service import WalletService
from app.services.blockchain_service import BlockchainService
from app.services.transaction_service import transaction_service
from app.services.blockchain_signer import blockchain_signer
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
            address_type=address_type
        )
        
        return AddressResponse(
            id=address.id,
            address=address.address,
            address_type=address.address_type,
            derivation_index=address.derivation_index,
            derivation_path=address.derivation_path,
            is_active=address.is_active,
            created_at=address.created_at
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get wallet balances grouped by network for multi-network wallets.
    Returns balance, USD and BRL values for each supported network.
    """
    from app.clients.price_client import price_client
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
        "polygon": "matic",
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
        total_brl_value = Decimal('0')
        
        # Get prices for all symbols (with fallback)
        symbols = list(set(network_symbols.values()))
        try:
            prices = await price_client.get_prices(symbols, ["usd", "brl"])
        except Exception as price_error:
            logger.warning(f"Price fetch failed (rate limit or API error), continuing without prices: {price_error}")
            # Create empty prices dict so balances still work
            prices = {symbol: {"usd": 0, "brl": 0} for symbol in symbols}
        
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
                    include_tokens=False
                )
                
                native_balance = Decimal(balance_data.get('native_balance', '0'))
                
                if native_balance > 0:
                    # Get price for this network
                    symbol = network_symbols.get(network_str, network_str)
                    price_usd = Decimal(str(prices.get(symbol, {}).get('usd', 0)))
                    price_brl = Decimal(str(prices.get(symbol, {}).get('brl', 0)))
                    
                    # Calculate USD and BRL values
                    balance_usd = native_balance * price_usd
                    balance_brl = native_balance * price_brl
                    
                    total_usd_value += balance_usd
                    total_brl_value += balance_brl
                    
                    balances_by_network[network_str] = NetworkBalanceDetail(
                        network=network_str,
                        address=address_str,
                        balance=str(native_balance),
                        balance_usd=f"{balance_usd:.2f}",
                        balance_brl=f"{balance_brl:.2f}",
                        last_updated=datetime.utcnow()
                    )
            
            except Exception as e:
                logger.error(f"Error fetching balance for {network_str} address {address_str}: {str(e)}")
                # Continue with other networks even if one fails
                continue
        
        return WalletBalancesByNetworkResponse(
            wallet_id=wallet_id,
            wallet_name=str(wallet.name),
            balances=balances_by_network,
            total_usd=f"{total_usd_value:.2f}",
            total_brl=f"{total_brl_value:.2f}"
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
    two_factor_token: Optional[str] = Field(None, description="2FA token (required if 2FA enabled)", min_length=6, max_length=8)

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
        currency = network_currencies.get(request.network.lower(), request.network.upper())
        
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
    🚀 Send blockchain transaction - Supports CUSTODIAL and NON-CUSTODIAL modes
    
    **CUSTODIAL MODE (default):**
    - Backend signs the transaction with user's encrypted private key
    - Fast, convenient, no external wallet needed
    - Returns transaction hash immediately
    
    **NON-CUSTODIAL MODE:**
    - Returns unsigned transaction data for external signing (MetaMask, etc)
    - User signs with their own wallet
    - Maximum security and control
    
    **🔐 TWO-FACTOR AUTHENTICATION:**
    - If 2FA is enabled, you MUST provide `two_factor_token`
    - This adds an extra layer of security for transactions
    
    Set `mode: "non-custodial"` to prepare transaction for external signing.
    """
    try:
        # 🔐 VERIFY 2FA (if enabled)
        from app.services.two_factor_service import two_factor_service
        from app.models.two_factor import TwoFactorAuth
        
        two_fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == current_user.id,
            TwoFactorAuth.is_enabled == True
        ).first()
        
        if two_fa:
            # 2FA is enabled - token is required
            if not request.two_factor_token:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="2FA token required. Please provide your authenticator code."
                )
            
            # Verify 2FA token
            is_valid = await two_factor_service.verify_2fa_for_action(
                db,
                current_user,
                request.two_factor_token
            )
            
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid 2FA token"
                )
            
            logger.info(f"✅ 2FA verified for transaction from user {current_user.id}")
        
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
            
            # Get encrypted seed from wallet
            from app.services.crypto_service import CryptoService
            from bip_utils import Bip39SeedGenerator, Bip44, Bip44Coins, Bip44Changes
            crypto_service = CryptoService()
            
            # Decrypt seed phrase
            mnemonic = crypto_service.decrypt_data(str(wallet.encrypted_seed))
            
            # Generate seed from mnemonic
            seed_bytes = Bip39SeedGenerator(mnemonic).Generate()
            
            # Determine coin type based on network
            network_lower = request.network.lower()
            if network_lower in ["ethereum", "polygon", "bsc", "base", "avalanche"]:
                # EVM networks use Ethereum coin type (60)
                bip44_coin = Bip44Coins.ETHEREUM
            elif network_lower == "bitcoin":
                bip44_coin = Bip44Coins.BITCOIN
            else:
                # Default to Ethereum for unknown EVM networks
                bip44_coin = Bip44Coins.ETHEREUM
            
            # Derive private key using BIP44 path: m/44'/60'/0'/0/0
            bip44_mnemonic = Bip44.FromSeed(seed_bytes, bip44_coin)
            bip44_account = bip44_mnemonic.Purpose().Coin().Account(0)
            bip44_change = bip44_account.Change(Bip44Changes.CHAIN_EXT)
            bip44_address = bip44_change.AddressIndex(0)
            
            # Get private key
            private_key = bip44_address.PrivateKey().Raw().ToHex()
            
            # Get gas price based on fee level
            gas_estimates = await blockchain_signer.estimate_gas_price(request.network, request.fee_level)
            selected_gas = gas_estimates.get(request.fee_level, gas_estimates['standard'])
            
            # Sign and broadcast transaction
            tx_hash, tx_details = await blockchain_signer.sign_evm_transaction(
                network=request.network,
                from_address=from_address,
                to_address=request.to_address,
                amount=request.amount,
                private_key=private_key,
                gas_price_gwei=float(selected_gas['gas_price_gwei'])
            )
            
            # TODO: Save transaction to database
            # transaction_id = save_transaction_to_db(db, tx_details)
            
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
            
            return {
                "success": True,
                "mode": "custodial",
                "transaction_id": 0,  # TODO: Get from database
                "tx_hash": tx_hash,
                "network": request.network,
                "from_address": from_address,
                "to_address": request.to_address,
                "amount": request.amount,
                "fee": str(selected_gas['estimated_cost']),
                "fee_level": request.fee_level,
                "status": "pending",
                "explorer_url": explorer_urls.get(request.network, ""),
                "estimated_confirmation_time": str(selected_gas['estimated_time']),
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
        logger.error(f"❌ Error sending transaction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send transaction: {str(e)}"
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
