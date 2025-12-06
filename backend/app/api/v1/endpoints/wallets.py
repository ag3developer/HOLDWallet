from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.schemas.wallet import WalletCreate, WalletUpdate, WalletResponse, WalletWithBalance, WalletListResponse
from app.services.wallet_service import wallet_service

router = APIRouter()

@router.post("/", response_model=WalletResponse, status_code=status.HTTP_201_CREATED)
def create_wallet(
    wallet_data: WalletCreate,
    db: Session = Depends(get_db)
):
    """Create a new wallet."""
    try:
        wallet = wallet_service.create_wallet(db, wallet_data)
        return wallet
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating wallet: {str(e)}"
        )

@router.get("/", response_model=List[WalletWithBalance])
async def get_wallets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all wallets with balance information."""
    try:
        wallets = await wallet_service.get_wallets_with_balances(db, skip, limit)
        return wallets
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching wallets: {str(e)}"
        )

@router.get("/{wallet_id}", response_model=WalletWithBalance)
async def get_wallet(
    wallet_id: str,
    db: Session = Depends(get_db)
):
    """Get wallet by ID with balance information."""
    try:
        wallet = await wallet_service.get_wallet_with_balance(db, wallet_id)
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        return wallet
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching wallet: {str(e)}"
        )

@router.put("/{wallet_id}", response_model=WalletResponse)
def update_wallet(
    wallet_id: str,
    wallet_update: WalletUpdate,
    db: Session = Depends(get_db)
):
    """Update wallet information."""
    try:
        wallet = wallet_service.update_wallet(db, wallet_id, wallet_update)
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        return wallet
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating wallet: {str(e)}"
        )

@router.delete("/{wallet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wallet(
    wallet_id: str,
    db: Session = Depends(get_db)
):
    """Delete (deactivate) wallet."""
    try:
        success = wallet_service.delete_wallet(db, wallet_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error deleting wallet: {str(e)}"
        )

@router.get("/address/{address}", response_model=WalletResponse)
def get_wallet_by_address(
    address: str,
    db: Session = Depends(get_db)
):
    """Get wallet by address."""
    try:
        wallet = wallet_service.get_wallet_by_address(db, address)
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wallet not found"
            )
        return wallet
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching wallet: {str(e)}"
        )
