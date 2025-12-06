from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid

from app.core.db import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundError, ValidationError, BlockchainError
from app.models.user import User
from app.models.wallet import Wallet
from app.models.address import Address
from app.models.transaction import Transaction
from app.services.blockchain_service import BlockchainService
from app.schemas.transaction import (
    TransactionResponse, TransactionListResponse, TransactionSendRequest,
    TransactionEstimateRequest, TransactionEstimateResponse
)

router = APIRouter()

@router.get("/", response_model=TransactionListResponse)
async def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    wallet_id: Optional[uuid.UUID] = Query(None, description="Filter by wallet ID"),
    network: Optional[str] = Query(None, description="Filter by network"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date")
):
    """
    Get transaction history for the user.
    """
    # Build query to get user's transactions through their wallets
    query = db.query(Transaction).join(Address).join(Wallet).filter(
        Wallet.user_id == current_user.id
    )
    
    # Apply filters
    if wallet_id:
        query = query.filter(Wallet.id == wallet_id)
    
    if network:
        query = query.filter(Wallet.network == network)
    
    if status:
        query = query.filter(Transaction.status == status)
    
    if date_from:
        query = query.filter(Transaction.created_at >= date_from)
    
    if date_to:
        query = query.filter(Transaction.created_at <= date_to)
    
    # Order by most recent first
    query = query.order_by(Transaction.created_at.desc())
    
    total_count = query.count()
    transactions = query.offset(offset).limit(limit).all()
    
    transaction_responses = []
    for tx in transactions:
        transaction_responses.append(TransactionResponse(
            id=tx.id,
            hash=tx.hash,
            from_address=tx.from_address,
            to_address=tx.to_address,
            amount=str(tx.amount),
            fee=str(tx.fee) if tx.fee else None,
            status=tx.status,
            block_number=tx.block_number,
            network=tx.address.wallet.network,
            token_address=tx.token_address,
            token_symbol=tx.token_symbol,
            created_at=tx.created_at,
            confirmed_at=tx.confirmed_at
        ))
    
    # Calculate has_more for pagination
    has_more = (offset + limit) < total_count
    
    return TransactionListResponse(
        transactions=transaction_responses,
        total=total_count,
        total_count=total_count,
        offset=offset,
        limit=limit,
        has_more=has_more
    )

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific transaction by ID.
    """
    # Get transaction and verify ownership through wallet
    transaction = db.query(Transaction).join(Address).join(Wallet).filter(
        Transaction.id == transaction_id,
        Wallet.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise NotFoundError("Transaction not found")
    
    return TransactionResponse(
        id=transaction.id,
        hash=transaction.hash,
        from_address=transaction.from_address,
        to_address=transaction.to_address,
        amount=str(transaction.amount),
        fee=str(transaction.fee) if transaction.fee else None,
        status=transaction.status,
        block_number=transaction.block_number,
        network=transaction.address.wallet.network,
        token_address=transaction.token_address,
        token_symbol=transaction.token_symbol,
        created_at=transaction.created_at,
        confirmed_at=transaction.confirmed_at
    )

@router.post("/estimate", response_model=TransactionEstimateResponse)
async def estimate_transaction(
    estimate_data: TransactionEstimateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Estimate transaction fees and validate transaction parameters.
    """
    # Verify user owns the from_address
    address = db.query(Address).join(Wallet).filter(
        Address.address == estimate_data.from_address,
        Wallet.user_id == current_user.id
    ).first()
    
    if not address:
        raise ValidationError("You don't own this address")
    
    blockchain_service = BlockchainService()
    
    try:
        # Get fee estimate
        fee_estimate = await blockchain_service.estimate_fees(
            network=address.wallet.network,
            from_address=estimate_data.from_address,
            to_address=estimate_data.to_address,
            amount=estimate_data.amount,
            token_address=estimate_data.token_address
        )
        
        return TransactionEstimateResponse(
            network=address.wallet.network,
            estimated_fee=fee_estimate['estimated_fee'],
            fee_options={
                'slow': fee_estimate.get('slow_fee', fee_estimate['estimated_fee']),
                'standard': fee_estimate['estimated_fee'],
                'fast': fee_estimate.get('fast_fee', fee_estimate['estimated_fee'])
            },
            gas_limit=fee_estimate.get('gas_limit'),
            gas_price=fee_estimate.get('gas_price'),
            valid=True,
            error_message=None
        )
        
    except Exception as e:
        return TransactionEstimateResponse(
            network=address.wallet.network,
            estimated_fee="0",
            fee_options={},
            gas_limit=None,
            gas_price=None,
            valid=False,
            error_message=str(e)
        )

@router.post("/send", response_model=TransactionResponse)
async def send_transaction(
    send_data: TransactionSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a transaction (this is a placeholder - actual signing should be done client-side).
    """
    # Note: In a non-custodial wallet, this endpoint should NOT handle private keys
    # The client should sign the transaction and send the signed transaction
    
    # Verify user owns the from_address
    address = db.query(Address).join(Wallet).filter(
        Address.address == send_data.from_address,
        Wallet.user_id == current_user.id
    ).first()
    
    if not address:
        raise ValidationError("You don't own this address")
    
    # This is a placeholder implementation
    # In reality, the client would:
    # 1. Get transaction parameters from /estimate
    # 2. Sign the transaction locally
    # 3. Send the signed transaction to /broadcast
    
    raise NotImplementedError(
        "Transaction signing must be done client-side. "
        "Use /estimate to get transaction parameters, "
        "sign locally, and use /broadcast to submit."
    )

@router.post("/broadcast")
async def broadcast_transaction(
    signed_transaction: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Broadcast a signed transaction to the network.
    """
    blockchain_service = BlockchainService()
    
    try:
        # Extract network from the transaction or require it as parameter
        network = signed_transaction.get('network')
        if not network:
            raise ValidationError("Network is required")
        
        # Broadcast the signed transaction
        result = await blockchain_service.broadcast_transaction(
            network=network,
            signed_tx=signed_transaction['raw_transaction']
        )
        
        # Create transaction record
        transaction = Transaction(
            hash=result['transaction_hash'],
            from_address=signed_transaction['from_address'],
            to_address=signed_transaction['to_address'],
            amount=signed_transaction['amount'],
            fee=signed_transaction.get('fee'),
            status='pending',
            token_address=signed_transaction.get('token_address'),
            token_symbol=signed_transaction.get('token_symbol'),
            address_id=None  # Would need to find the correct address_id
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return {
            "transaction_hash": result['transaction_hash'],
            "status": "pending",
            "message": "Transaction broadcasted successfully"
        }
        
    except Exception as e:
        raise BlockchainError(f"Failed to broadcast transaction: {str(e)}")

@router.get("/sync/{wallet_id}")
async def sync_wallet_transactions(
    wallet_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sync transactions for a specific wallet from the blockchain.
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
        return {"message": "No addresses to sync", "synced_count": 0}
    
    blockchain_service = BlockchainService()
    synced_count = 0
    
    try:
        for address in addresses:
            # Sync transactions for each address
            transactions = await blockchain_service.get_address_transactions(
                address.address,
                wallet.network
            )
            
            for tx_data in transactions:
                # Check if transaction already exists
                existing_tx = db.query(Transaction).filter(
                    Transaction.hash == tx_data['hash']
                ).first()
                
                if not existing_tx:
                    # Create new transaction record
                    transaction = Transaction(
                        hash=tx_data['hash'],
                        from_address=tx_data['from'],
                        to_address=tx_data['to'],
                        amount=tx_data['amount'],
                        fee=tx_data.get('fee'),
                        status=tx_data['status'],
                        block_number=tx_data.get('block_number'),
                        token_address=tx_data.get('token_address'),
                        token_symbol=tx_data.get('token_symbol'),
                        address_id=address.id,
                        confirmed_at=tx_data.get('confirmed_at')
                    )
                    
                    db.add(transaction)
                    synced_count += 1
        
        db.commit()
        
        return {
            "message": f"Successfully synced {synced_count} new transactions",
            "synced_count": synced_count,
            "wallet_id": str(wallet_id)
        }
        
    except Exception as e:
        db.rollback()
        raise BlockchainError(f"Failed to sync transactions: {str(e)}")

@router.get("/stats/summary")
async def get_transaction_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365, description="Number of days for stats")
):
    """
    Get transaction statistics summary for the user.
    """
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get user's transactions in the date range
    transactions = db.query(Transaction).join(Address).join(Wallet).filter(
        Wallet.user_id == current_user.id,
        Transaction.created_at >= start_date,
        Transaction.created_at <= end_date
    ).all()
    
    # Calculate stats
    total_transactions = len(transactions)
    sent_transactions = len([tx for tx in transactions if tx.from_address in 
                            [addr.address for addr in current_user.wallets[0].addresses]])
    received_transactions = total_transactions - sent_transactions
    
    # Status breakdown
    status_counts = {}
    for tx in transactions:
        status_counts[tx.status] = status_counts.get(tx.status, 0) + 1
    
    return {
        "period_days": days,
        "total_transactions": total_transactions,
        "sent_transactions": sent_transactions,
        "received_transactions": received_transactions,
        "status_breakdown": status_counts,
        "start_date": start_date,
        "end_date": end_date
    }
