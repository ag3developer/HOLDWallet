from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from app.schemas.blockchain import BalanceResponse, NetworksResponse, GasResponse
from app.services.blockchain_service import blockchain_service

router = APIRouter()

@router.get("/balance/{address}", response_model=dict)
async def get_balance(
    address: str,
    network: str = Query(..., description="Network name (bitcoin, ethereum, polygon, bsc)"),
    token_address: Optional[str] = Query(None, description="Token contract address for ERC20 tokens")
):
    """Get balance for an address on a specific network."""
    try:
        # Validate network
        supported_networks = ["bitcoin", "ethereum", "polygon", "bsc"]
        if network.lower() not in supported_networks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported network. Supported: {supported_networks}"
            )
        
        # Validate address format
        if not blockchain_service.validate_address(address, network.lower()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid address format for the specified network"
            )
        
        balance = await blockchain_service.get_balance(address, network.lower(), token_address)
        
        if balance is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error fetching balance from blockchain"
            )
        
        return {
            "address": address,
            "network": network.lower(),
            "balance": str(balance),
            "token_address": token_address,
            "decimals": 18 if network.lower() != "bitcoin" else 8
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching balance: {str(e)}"
        )

@router.get("/transactions/{address}")
async def get_transaction_history(
    address: str,
    network: str = Query(..., description="Network name (bitcoin, ethereum, polygon, bsc)"),
    limit: int = Query(50, ge=1, le=100, description="Number of transactions to return")
):
    """Get transaction history for an address."""
    try:
        # Validate network
        supported_networks = ["bitcoin", "ethereum", "polygon", "bsc"]
        if network.lower() not in supported_networks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported network. Supported: {supported_networks}"
            )
        
        # Validate address format
        if not blockchain_service.validate_address(address, network.lower()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid address format for the specified network"
            )
        
        transactions = await blockchain_service.get_transaction_history(
            address, network.lower(), limit
        )
        
        return {
            "address": address,
            "network": network.lower(),
            "transactions": transactions,
            "count": len(transactions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching transaction history: {str(e)}"
        )

@router.get("/gas/{network}")
async def get_gas_prices(
    network: str = Query(..., description="Network name (ethereum, polygon, bsc)")
):
    """Get current gas prices for EVM networks."""
    try:
        # Validate network (only EVM networks support gas)
        evm_networks = ["ethereum", "polygon", "bsc"]
        if network.lower() not in evm_networks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gas prices only available for EVM networks: {evm_networks}"
            )
        
        gas_prices = await blockchain_service.estimate_gas_price(network.lower())
        
        if gas_prices is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error fetching gas prices"
            )
        
        return {
            "network": network.lower(),
            "gas_prices": gas_prices,
            "unit": "wei",
            "estimated_time_minutes": {
                "slow": 10,
                "standard": 5,
                "fast": 2
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching gas prices: {str(e)}"
        )

@router.get("/networks", response_model=dict)
async def get_supported_networks():
    """Get list of supported networks and their configurations."""
    try:
        networks = [
            {
                "name": "Bitcoin",
                "identifier": "bitcoin",
                "chain_id": None,
                "symbol": "BTC",
                "decimals": 8,
                "is_testnet": False,
                "explorer_url": "https://blockstream.info",
                "type": "utxo"
            },
            {
                "name": "Ethereum",
                "identifier": "ethereum", 
                "chain_id": 1,
                "symbol": "ETH",
                "decimals": 18,
                "is_testnet": False,
                "explorer_url": "https://etherscan.io",
                "type": "evm"
            },
            {
                "name": "Polygon",
                "identifier": "polygon",
                "chain_id": 137,
                "symbol": "MATIC",
                "decimals": 18,
                "is_testnet": False,
                "explorer_url": "https://polygonscan.com",
                "type": "evm"
            },
            {
                "name": "Binance Smart Chain",
                "identifier": "bsc",
                "chain_id": 56,
                "symbol": "BNB", 
                "decimals": 18,
                "is_testnet": False,
                "explorer_url": "https://bscscan.com",
                "type": "evm"
            }
        ]
        
        return {
            "networks": networks,
            "total_count": len(networks)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching networks: {str(e)}"
        )

@router.get("/validate/{network}/{address}")
async def validate_address(network: str, address: str):
    """Validate if an address is valid for a specific network."""
    try:
        supported_networks = ["bitcoin", "ethereum", "polygon", "bsc"]
        if network.lower() not in supported_networks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported network. Supported: {supported_networks}"
            )
        
        is_valid = blockchain_service.validate_address(address, network.lower())
        
        return {
            "address": address,
            "network": network.lower(),
            "is_valid": is_valid
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validating address: {str(e)}"
        )
