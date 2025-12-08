from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from decimal import Decimal
import uuid
import logging

logger = logging.getLogger(__name__)

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, BlockchainError
from app.models.user import User
from app.models.wallet import Wallet
from app.models.address import Address
from app.services.wallet_service import WalletService
from app.services.blockchain_service import BlockchainService
from app.schemas.wallet import (
    WalletCreate, WalletResponse, WalletBalanceResponse,
    AddressResponse, WalletAddressRequest, WalletListResponse,
    WalletBalancesByNetworkResponse, NetworkBalanceDetail
)
from app.utils.crypto_utils import validate_address

router = APIRouter()

@router.post("/", response_model=WalletResponse)
async def create_wallet(
    wallet_data: WalletCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new wallet for the user.
    """
    wallet_service = WalletService(db)
    
    try:
        wallet = await wallet_service.create_wallet(
            user_id=current_user.id,
            name=wallet_data.name,
            network=wallet_data.network,
            derivation_path=wallet_data.derivation_path
        )
        
        return WalletResponse(
            id=wallet.id,
            name=wallet.name,
            network=wallet.network,
            derivation_path=wallet.derivation_path,
            created_at=wallet.created_at,
            is_active=wallet.is_active,
            addresses=[]
        )
        
    except Exception as e:
        raise ValidationError(f"Failed to create wallet: {str(e)}")

@router.get("/", response_model=WalletListResponse)
async def list_wallets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    network: Optional[str] = Query(None, description="Filter by network"),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0)
):
    """
    Get all wallets for the current user.
    """
    query = db.query(Wallet).filter(Wallet.user_id == current_user.id)
    
    if network:
        query = query.filter(Wallet.network == network)
    
    total_count = query.count()
    wallets = query.offset(offset).limit(limit).all()
    
    wallet_responses = []
    for wallet in wallets:
        # Get addresses for each wallet
        addresses = db.query(Address).filter(Address.wallet_id == wallet.id).all()
        
        wallet_responses.append(WalletResponse(
            id=wallet.id,
            name=wallet.name,
            network=wallet.network,
            derivation_path=wallet.derivation_path,
            created_at=wallet.created_at,
            is_active=wallet.is_active,
            addresses=[
                AddressResponse(
                    id=addr.id,
                    address=addr.address,
                    address_type=addr.address_type,
                    derivation_index=addr.derivation_index,
                    is_active=addr.is_active,
                    created_at=addr.created_at
                )
                for addr in addresses
            ]
        ))
    
    return WalletListResponse(
        wallets=wallet_responses,
        total_count=total_count,
        offset=offset,
        limit=limit
    )

@router.get("/{wallet_id}", response_model=WalletResponse)
async def get_wallet(
    wallet_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific wallet by ID.
    """
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user.id
    ).first()
    
    if not wallet:
        raise NotFoundError("Wallet not found")
    
    # Get addresses
    addresses = db.query(Address).filter(Address.wallet_id == wallet.id).all()
    
    return WalletResponse(
        id=wallet.id,
        name=wallet.name,
        network=wallet.network,
        derivation_path=wallet.derivation_path,
        created_at=wallet.created_at,
        is_active=wallet.is_active,
        addresses=[
            AddressResponse(
                id=addr.id,
                address=addr.address,
                address_type=addr.address_type,
                derivation_index=addr.derivation_index,
                is_active=addr.is_active,
                created_at=addr.created_at
            )
            for addr in addresses
        ]
    )

@router.post("/{wallet_id}/addresses", response_model=AddressResponse)
async def create_address(
    wallet_id: uuid.UUID,
    address_data: WalletAddressRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new address for a wallet.
    """
    # Verify wallet ownership
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user.id
    ).first()
    
    if not wallet:
        raise NotFoundError("Wallet not found")
    
    wallet_service = WalletService(db)
    
    try:
        address = await wallet_service.create_address(
            wallet_id=wallet_id,
            address_type=address_data.address_type,
            derivation_index=address_data.derivation_index
        )
        
        return AddressResponse(
            id=address.id,
            address=address.address,
            address_type=address.address_type,
            derivation_index=address.derivation_index,
            is_active=address.is_active,
            created_at=address.created_at
        )
        
    except Exception as e:
        raise ValidationError(f"Failed to create address: {str(e)}")

@router.get("/{wallet_id}/balance", response_model=WalletBalanceResponse)
async def get_wallet_balance(
    wallet_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    include_tokens: bool = Query(False, description="Include token balances")
):
    """
    Get wallet balance across all addresses.
    """
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
        return WalletBalanceResponse(
            wallet_id=wallet_id,
            network=wallet.network,
            native_balance="0",
            token_balances={},
            total_usd_value="0",
            last_updated=None
        )
    
    blockchain_service = BlockchainService()
    
    try:
        # Get balances for all addresses
        total_native_balance = Decimal('0')
        all_token_balances: Dict[str, Decimal] = {}
        
        for address in addresses:
            balance_data = await blockchain_service.get_address_balance(
                address.address, 
                wallet.network,
                include_tokens=include_tokens
            )
            
            # Add native balance
            total_native_balance += Decimal(balance_data['native_balance'])
            
            # Aggregate token balances
            if include_tokens and 'token_balances' in balance_data:
                for token_address, token_data in balance_data['token_balances'].items():
                    if token_address not in all_token_balances:
                        all_token_balances[token_address] = Decimal('0')
                    all_token_balances[token_address] += Decimal(token_data['balance'])
        
        # Convert token balances back to strings
        token_balances_str = {
            addr: str(balance) for addr, balance in all_token_balances.items()
        }
        
        return WalletBalanceResponse(
            wallet_id=wallet_id,
            network=wallet.network,
            native_balance=str(total_native_balance),
            token_balances=token_balances_str,
            total_usd_value="0",  # TODO: Calculate USD value
            last_updated=None  # TODO: Add caching timestamp
        )
        
    except Exception as e:
        raise BlockchainError(f"Failed to fetch wallet balance: {str(e)}")

@router.get("/{wallet_id}/balances", response_model=WalletBalancesByNetworkResponse)
async def get_wallet_balances_by_network(
    wallet_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    include_tokens: bool = Query(False, description="Include USDT/USDC token balances")
):
    """
    Get wallet balances grouped by network for multi-network wallets.
    Returns balance, USD and BRL values from database wallet_balances table.
    """
    from app.clients.price_client import price_client
    from datetime import datetime
    from app.models.balance import WalletBalance
    
    # Verify wallet ownership
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user.id
    ).first()
    
    if not wallet:
        raise NotFoundError("Wallet not found")
    
    try:
        balances_by_network: Dict[str, NetworkBalanceDetail] = {}
        total_usd_value = Decimal('0')
        total_brl_value = Decimal('0')
        
        # ✅ GET BALANCES FROM DATABASE (not blockchain)
        db_balances = db.query(WalletBalance).filter(
            WalletBalance.user_id == current_user.id
        ).all()
        
        import logging
        logger = logging.getLogger(__name__)
        logger.debug(f"db_balances count: {len(db_balances) if db_balances else 0}")
        for b in (db_balances or []):
            logger.debug(f"Balance record: {b.cryptocurrency} = {b.total_balance}")
        
        if not db_balances:
            return WalletBalancesByNetworkResponse(
                wallet_id=wallet_id,
                wallet_name=str(wallet.name),
                balances={},
                total_usd="0",
                total_brl="0"
            )
        
        # Get all addresses for this wallet (only once)
        all_addresses = db.query(Address).filter(
            Address.wallet_id == wallet_id
        ).all()
        
        address_str = str(all_addresses[0].address) if all_addresses else "N/A"
        
        # Get prices for conversion (with fallback)
        prices = {}
        try:
            symbols = ["btc", "eth", "matic", "bnb", "trx", "sol", "ltc", "doge", "ada", "avax", "dot", "link", "shib", "xrp", "usdt", "usdc"]
            prices = await price_client.get_prices(symbols, ["usd", "brl"])
        except Exception as price_error:
            # If price fetch fails, we still return balances but with prices as 0
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to fetch prices, returning balances without price conversion: {str(price_error)}")
            prices = {}
        
        # Process each balance from database
        for balance in db_balances:
            try:
                # Safety checks
                if balance is None:
                    logger.debug("Skipping None balance")
                    continue
                
                if not hasattr(balance, 'cryptocurrency') or balance.cryptocurrency is None:
                    logger.debug("Skipping balance without cryptocurrency attribute")
                    continue
                    
                crypto = str(balance.cryptocurrency).lower().strip()
                if not crypto:
                    logger.debug("Skipping empty cryptocurrency")
                    continue
                
                total_balance = Decimal(str(balance.total_balance))
                logger.debug(f"Processing balance: crypto={crypto}, total_balance={total_balance}")
                
                # Skip zero/negative balances
                if total_balance <= 0:
                    logger.debug(f"Skipping {crypto} - balance is 0 or negative")
                    continue
                
                # Determine network and symbol
                if "usdt" in crypto or "usdc" in crypto:
                    # Token balance
                    if "polygon" in crypto:
                        network_str = "polygon"
                        symbol = "usdt"
                    elif "base" in crypto:
                        network_str = "base"
                        symbol = "usdt"
                    elif "ethereum" in crypto:
                        network_str = "ethereum"
                        symbol = "usdt"
                    else:
                        continue
                else:
                    # Native token balance
                    network_str = crypto
                    network_to_symbol = {
                        "polygon": "matic",
                        "base": "eth",
                        "ethereum": "eth",
                        "bitcoin": "btc",
                        "bsc": "bnb",
                        "tron": "trx",
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
                    symbol = network_to_symbol.get(network_str, network_str)
                
                # Get price (with fallback to 0)
                price_usd = Decimal(str(prices.get(symbol, {}).get('usd', 0))) if symbol in prices else Decimal('0')
                price_brl = Decimal(str(prices.get(symbol, {}).get('brl', 0))) if symbol in prices else Decimal('0')
                
                # Calculate values
                balance_usd = total_balance * price_usd
                balance_brl = total_balance * price_brl
                
                total_usd_value += balance_usd
                total_brl_value += balance_brl
                
                # Add to response
                balance_key = str(balance.cryptocurrency)
                balances_by_network[balance_key] = NetworkBalanceDetail(
                    network=network_str,
                    address=address_str,
                    balance=str(total_balance),
                    balance_usd=f"{balance_usd:.2f}",
                    balance_brl=f"{balance_brl:.2f}",
                    last_updated=datetime.utcnow()
                )
                
            except Exception as item_error:
                logger.error(f"Error processing balance item: {str(item_error)}")
                continue
        
        return WalletBalancesByNetworkResponse(
            wallet_id=wallet_id,
            wallet_name=str(wallet.name),
            balances=balances_by_network,
            total_usd=f"{total_usd_value:.2f}",
            total_brl=f"{total_brl_value:.2f}"
        )
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to fetch wallet balances by network: {str(e)}")
        raise BlockchainError(f"Failed to fetch wallet balances: {str(e)}")

@router.put("/{wallet_id}", response_model=WalletResponse)
async def update_wallet(
    wallet_id: uuid.UUID,
    wallet_data: WalletCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update wallet information.
    """
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user.id
    ).first()
    
    if not wallet:
        raise NotFoundError("Wallet not found")
    
    # Update only the name (network and derivation_path should not be changed)
    wallet.name = wallet_data.name
    
    db.commit()
    db.refresh(wallet)
    
    # Get addresses
    addresses = db.query(Address).filter(Address.wallet_id == wallet.id).all()
    
    return WalletResponse(
        id=wallet.id,
        name=wallet.name,
        network=wallet.network,
        derivation_path=wallet.derivation_path,
        created_at=wallet.created_at,
        is_active=wallet.is_active,
        addresses=[
            AddressResponse(
                id=addr.id,
                address=addr.address,
                address_type=addr.address_type,
                derivation_index=addr.derivation_index,
                is_active=addr.is_active,
                created_at=addr.created_at
            )
            for addr in addresses
        ]
    )

@router.delete("/{wallet_id}")
async def delete_wallet(
    wallet_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a wallet (soft delete).
    """
    wallet = db.query(Wallet).filter(
        Wallet.id == wallet_id,
        Wallet.user_id == current_user.id
    ).first()
    
    if not wallet:
        raise NotFoundError("Wallet not found")
    
    # Soft delete wallet and its addresses
    wallet.is_active = False
    
    db.query(Address).filter(Address.wallet_id == wallet_id).update({
        "is_active": False
    })
    
    db.commit()
    
    return {"message": "Wallet successfully deleted"}
