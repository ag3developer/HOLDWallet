"""
💰 EarnPool - User API Routes
=============================

Endpoints para usuários do EarnPool.

Author: WolkNow Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.earnpool_service import get_earnpool_service, EarnPoolService
from app.services.price_aggregator import price_aggregator
from app.schemas.earnpool import (
    DepositRequest, DepositPreviewResponse, DepositConfirmRequest, DepositResponse,
    WithdrawalRequest, WithdrawalPreviewResponse, WithdrawalConfirmRequest, WithdrawalResponse,
    EarnPoolBalanceResponse, EarnPoolHistoryResponse, EarnPoolConfigResponse
)

router = APIRouter(prefix="/earnpool", tags=["EarnPool"])
logger = logging.getLogger(__name__)


# ============================================================================
# CONFIG (PUBLIC)
# ============================================================================

@router.get("/config", response_model=EarnPoolConfigResponse)
async def get_earnpool_config(
    db: Session = Depends(get_db)
):
    """
    Get current EarnPool configuration.
    
    Returns:
    - Minimum deposit
    - Lock period
    - Withdrawal delay
    - Early withdrawal fees
    - Target yield
    - Whether accepting deposits
    """
    service = get_earnpool_service(db)
    config = service.get_or_create_config()
    return config


# ============================================================================
# DEPOSIT
# ============================================================================

async def get_crypto_price_usd(symbol: str) -> Decimal:
    """
    Busca o preço real da crypto em USD usando price_aggregator.
    """
    symbol_upper = symbol.upper()
    
    try:
        # Buscar preço em USD do price_aggregator
        prices = await price_aggregator.get_prices([symbol_upper], currency='usd')
        
        if symbol_upper in prices:
            price_data = prices[symbol_upper]
            price = Decimal(str(price_data.price))
            logger.info(f"✅ Got real-time price for {symbol_upper}: ${price} USD")
            return price
        else:
            logger.warning(f"⚠️ Price not found for {symbol_upper} in price_aggregator")
            raise HTTPException(
                status_code=400,
                detail=f"Não foi possível obter cotação para {symbol_upper}. Tente novamente."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting price for {symbol_upper}: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Erro ao buscar cotação de {symbol_upper}: {str(e)}"
        )


@router.post("/deposit/preview", response_model=DepositPreviewResponse)
async def preview_deposit(
    request: DepositRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview a deposit before confirming.
    
    Shows:
    - USDT equivalent value
    - Whether meets minimum
    - Lock period and end date
    """
    service = get_earnpool_service(db)
    
    # Buscar preço real da crypto via price_aggregator
    crypto_price = await get_crypto_price_usd(request.crypto_symbol)
    
    try:
        preview = await service.preview_deposit(
            user_id=str(current_user.id),
            crypto_symbol=request.crypto_symbol,
            crypto_amount=request.crypto_amount,
            crypto_price_usd=crypto_price
        )
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/deposit", response_model=DepositResponse)
async def create_deposit(
    request: DepositConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new EarnPool deposit.
    
    Process:
    1. Validates minimum amount ($250 USDT)
    2. Converts crypto to USDT (virtual balance)
    3. Creates deposit with LOCKED status
    4. Lock period: 30 days
    
    **Note**: User must have sufficient crypto balance in their wallet.
    """
    service = get_earnpool_service(db)
    
    # Buscar preço real da crypto via price_aggregator
    crypto_price = await get_crypto_price_usd(request.crypto_symbol)
    
    try:
        # TODO: Verificar saldo do usuário na wallet
        # TODO: Transferir crypto para carteira operacional
        
        deposit = await service.create_deposit(
            user_id=str(current_user.id),
            crypto_symbol=request.crypto_symbol,
            crypto_amount=request.crypto_amount,
            crypto_price_usd=crypto_price,
            tx_hash=None  # TODO: TX hash da transferência
        )
        
        logger.info(f"💰 EarnPool deposit created: User {current_user.id} - ${deposit.usdt_amount}")
        return deposit
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# WITHDRAWAL
# ============================================================================

@router.post("/withdraw/preview", response_model=WithdrawalPreviewResponse)
async def preview_withdrawal(
    request: WithdrawalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview a withdrawal before confirming.
    
    Shows:
    - Available balance (deposit + yields)
    - Whether it's early withdrawal (before lock ends)
    - Fees (if early withdrawal)
    - Net amount
    - Available date (D+7)
    """
    service = get_earnpool_service(db)
    
    try:
        preview = await service.preview_withdrawal(
            user_id=str(current_user.id),
            deposit_id=request.deposit_id,
            amount_usdt=request.amount_usdt
        )
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/withdraw", response_model=WithdrawalResponse)
async def create_withdrawal(
    request: WithdrawalConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Request a withdrawal from EarnPool.
    
    Normal withdrawal (after lock period):
    - No fees
    - Available in D+7
    
    Early withdrawal (before lock period ends):
    - Admin fee + Operational fee
    - Requires admin approval
    - Available in D+7 after approval
    """
    service = get_earnpool_service(db)
    
    try:
        withdrawal = await service.create_withdrawal(
            user_id=str(current_user.id),
            deposit_id=request.deposit_id,
            amount_usdt=request.amount_usdt,
            destination_type=request.destination_type,
            destination_address=request.destination_address,
            destination_crypto=request.destination_crypto,
            accept_fees=request.accept_fees
        )
        
        logger.info(f"📤 EarnPool withdrawal requested: User {current_user.id} - ${withdrawal.net_amount}")
        return withdrawal
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# BALANCE & HISTORY
# ============================================================================

@router.get("/balance", response_model=EarnPoolBalanceResponse)
async def get_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's EarnPool balance.
    
    Returns:
    - Total deposited (USDT)
    - Total yield earned
    - Total balance
    - Pending withdrawals
    - Available balance
    - List of active deposits
    """
    service = get_earnpool_service(db)
    
    try:
        balance = service.get_user_balance(str(current_user.id))
        return balance
    except Exception as e:
        logger.error(f"Error getting balance: {e}")
        raise HTTPException(status_code=500, detail="Error getting balance")


@router.get("/history", response_model=EarnPoolHistoryResponse)
async def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's EarnPool history.
    
    Returns:
    - All deposits
    - All withdrawals
    - All yield distributions
    - Summary statistics
    """
    service = get_earnpool_service(db)
    
    try:
        history = service.get_user_history(str(current_user.id))
        return history
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        raise HTTPException(status_code=500, detail="Error getting history")


# ============================================================================
# DEPOSIT DETAILS
# ============================================================================

@router.get("/deposit/{deposit_id}", response_model=DepositResponse)
async def get_deposit_details(
    deposit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific deposit.
    """
    from app.models.earnpool import EarnPoolDeposit
    
    deposit = db.query(EarnPoolDeposit).filter(
        EarnPoolDeposit.id == deposit_id,
        EarnPoolDeposit.user_id == str(current_user.id)
    ).first()
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    return deposit


@router.get("/withdrawal/{withdrawal_id}", response_model=WithdrawalResponse)
async def get_withdrawal_details(
    withdrawal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific withdrawal.
    """
    from app.models.earnpool import EarnPoolWithdrawal
    
    withdrawal = db.query(EarnPoolWithdrawal).filter(
        EarnPoolWithdrawal.id == withdrawal_id,
        EarnPoolWithdrawal.user_id == str(current_user.id)
    ).first()
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    return withdrawal
