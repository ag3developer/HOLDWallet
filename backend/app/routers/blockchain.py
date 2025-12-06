"""
Blockchain Router - Endpoints para consultas blockchain
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.security import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.models.address import Address
from app.services.blockchain_service import blockchain_service
from app.schemas.blockchain import (
    BalanceResponse,
    TransactionHistoryResponse,
    AddressValidationResponse,
    FeeEstimateResponse
)

router = APIRouter(prefix="/blockchain", tags=["blockchain"])


@router.get("/balance/{address}", response_model=BalanceResponse)
async def get_address_balance(
    address: str,
    network: str = Query(..., description="Network: bitcoin, ethereum, polygon, bsc"),
    include_tokens: bool = Query(False, description="Include token balances for EVM chains"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtém saldo de um endereço específico
    """
    try:
        # Verificar se o endereço pertence ao usuário (opcional - para segurança)
        user_address = db.query(Address).filter(
            Address.address == address,
            Address.wallet_id.in_(
                db.query(Address.wallet_id).join(Address.wallet).filter(
                    Address.wallet.has(user_id=current_user.id)
                )
            )
        ).first()
        
        if not user_address:
            raise HTTPException(
                status_code=403, 
                detail="Endereço não pertence ao usuário atual"
            )
        
        # Validar endereço
        is_valid = await blockchain_service.validate_address(address, network)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Endereço inválido")
        
        # Obter saldo
        balance_data = await blockchain_service.get_address_balance(
            address, network, include_tokens
        )
        
        return BalanceResponse(
            address=address,
            network=network,
            **balance_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions/{address}", response_model=TransactionHistoryResponse)
async def get_address_transactions(
    address: str,
    network: str = Query(..., description="Network: bitcoin, ethereum, polygon, bsc"),
    limit: int = Query(50, ge=1, le=100, description="Number of transactions to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtém histórico de transações de um endereço
    """
    try:
        # Verificar se o endereço pertence ao usuário
        user_address = db.query(Address).filter(
            Address.address == address,
            Address.wallet_id.in_(
                db.query(Address.wallet_id).join(Address.wallet).filter(
                    Address.wallet.has(user_id=current_user.id)
                )
            )
        ).first()
        
        if not user_address:
            raise HTTPException(
                status_code=403, 
                detail="Endereço não pertence ao usuário atual"
            )
        
        # Obter transações
        transactions = await blockchain_service.get_address_transactions(
            address, network, limit
        )
        
        return TransactionHistoryResponse(
            address=address,
            network=network,
            transactions=transactions,
            count=len(transactions)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-address", response_model=AddressValidationResponse)
async def validate_address(
    address: str,
    network: str,
    current_user: User = Depends(get_current_user)
):
    """
    Valida se um endereço é válido para uma rede específica
    """
    try:
        is_valid = await blockchain_service.validate_address(address, network)
        
        return AddressValidationResponse(
            address=address,
            network=network,
            is_valid=is_valid
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fees/{network}", response_model=FeeEstimateResponse)
async def estimate_transaction_fees(
    network: str,
    from_address: Optional[str] = Query(None),
    to_address: Optional[str] = Query(None),
    amount: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """
    Estima taxas de transação para uma rede específica
    """
    try:
        fees = await blockchain_service.estimate_fees(
            network=network,
            from_address=from_address or "",
            to_address=to_address or "",
            amount=amount or "0"
        )
        
        return FeeEstimateResponse(
            network=network,
            **fees
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wallet-balances")
async def get_wallet_balances(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtém saldos de todas as carteiras do usuário
    """
    try:
        # Buscar todos os endereços do usuário
        user_addresses = db.query(Address).join(Address.wallet).filter(
            Address.wallet.has(user_id=current_user.id)
        ).all()
        
        balances = []
        
        for addr in user_addresses:
            try:
                balance_data = await blockchain_service.get_address_balance(
                    addr.address, addr.network
                )
                
                balances.append({
                    "address": addr.address,
                    "network": addr.network,
                    "wallet_id": addr.wallet_id,
                    **balance_data
                })
                
            except Exception as e:
                # Log error but continue with other addresses
                balances.append({
                    "address": addr.address,
                    "network": addr.network,
                    "wallet_id": addr.wallet_id,
                    "native_balance": "0",
                    "error": str(e)
                })
        
        return {
            "user_id": current_user.id,
            "total_addresses": len(user_addresses),
            "balances": balances
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
