from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.schemas.transaction import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    TransactionWithPrice, TransactionListResponse, SendTransactionRequest
)

router = APIRouter()

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_data: TransactionCreate,
    db: Session = Depends(get_db)
):
    """Create a new transaction record."""
    try:
        # This endpoint is for recording transaction metadata only
        # The actual transaction signing and broadcasting happens on the frontend
        
        # Here you would save transaction metadata to the database
        # For now, just return the input data as a response
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Transaction creation not yet implemented"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating transaction: {str(e)}"
        )

@router.get("/", response_model=List[TransactionWithPrice])
def get_transactions(
    wallet_id: Optional[str] = Query(None, description="Filter by wallet ID"),
    network: Optional[str] = Query(None, description="Filter by network"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get transaction history with optional filters."""
    try:
        # This would fetch transactions from the database
        # For now, return empty list
        
        return []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching transactions: {str(e)}"
        )

@router.get("/{tx_hash}", response_model=TransactionWithPrice)
def get_transaction(
    tx_hash: str,
    db: Session = Depends(get_db)
):
    """Get transaction by hash."""
    try:
        # This would fetch a specific transaction from the database
        # For now, return not found
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching transaction: {str(e)}"
        )

@router.put("/{tx_hash}", response_model=TransactionResponse)
def update_transaction(
    tx_hash: str,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db)
):
    """Update transaction status or metadata."""
    try:
        # This would update transaction in the database
        # Useful for updating confirmation status, adding notes, etc.
        
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Transaction update not yet implemented"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating transaction: {str(e)}"
        )

@router.post("/send", response_model=dict)
async def send_transaction(
    send_request: SendTransactionRequest,
    db: Session = Depends(get_db)
):
    """
    This endpoint provides transaction preparation data.
    The actual signing and broadcasting happens on the frontend for security.
    """
    try:
        # Validate addresses and network
        from app.services.blockchain_service import blockchain_service
        
        if not blockchain_service.validate_address(send_request.from_address, send_request.network):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid from_address for the specified network"
            )
        
        if not blockchain_service.validate_address(send_request.to_address, send_request.network):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid to_address for the specified network"
            )
        
        # Get current gas prices for EVM networks
        gas_prices = None
        if send_request.network in ["ethereum", "polygon", "bsc"]:
            gas_prices = await blockchain_service.estimate_gas_price(send_request.network)
        
        # Return transaction preparation data
        return {
            "status": "prepared",
            "message": "Transaction data prepared. Sign and broadcast on frontend.",
            "network": send_request.network,
            "from_address": send_request.from_address,
            "to_address": send_request.to_address,
            "amount": send_request.amount,
            "token_symbol": send_request.token_symbol,
            "token_address": send_request.token_address,
            "estimated_gas_prices": gas_prices,
            "note": send_request.note
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error preparing transaction: {str(e)}"
        )

@router.get("/wallet/{wallet_id}", response_model=List[TransactionWithPrice])
async def get_wallet_transactions(
    wallet_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all transactions for a specific wallet."""
    try:
        # This would fetch transactions for a specific wallet
        # For now, return empty list
        
        return []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching wallet transactions: {str(e)}"
        )
