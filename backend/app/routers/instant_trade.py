"""
💱 HOLD Wallet - Instant Trade OTC API Routers
==============================================

API endpoints for OTC trading operations.
Professional, well-documented, and scalable.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.instant_trade_service import get_instant_trade_service, InstantTradeService
from app.schemas.instant_trade import QuoteRequest, CreateTradeRequest, TradeStatusResponse

router = APIRouter(prefix="/instant-trade", tags=["Instant Trade OTC"])
logger = logging.getLogger(__name__)


@router.get("/assets")
async def get_supported_assets():
    """
    Get list of supported cryptocurrencies for OTC trading.
    
    Returns:
    - BTC (Bitcoin)
    - ETH (Ethereum)
    - USDT (Tether)
    - SOL (Solana)
    - And more...
    """
    return {
        "success": True,
        "assets": [
            {"symbol": "BTC", "name": "Bitcoin"},
            {"symbol": "ETH", "name": "Ethereum"},
            {"symbol": "USDT", "name": "Tether"},
            {"symbol": "SOL", "name": "Solana"},
            {"symbol": "ADA", "name": "Cardano"},
            {"symbol": "AVAX", "name": "Avalanche"},
            {"symbol": "MATIC", "name": "Polygon"},
            {"symbol": "DOT", "name": "Polkadot"},
        ],
    }


@router.post("/quote")
async def get_quote(
    request: QuoteRequest,
    db: Session = Depends(get_db),
):
    """
    Get a quote for OTC buy/sell operation.
    
    Parameters:
    - operation: "buy" or "sell"
    - symbol: Cryptocurrency symbol (e.g., "BTC")
    - fiat_amount: Amount in BRL (for buy)
    - crypto_amount: Amount in cryptocurrency (for sell)
    
    Returns:
    - Quote with total amount including fees
    - Valid for 30 seconds
    """
    try:
        service = get_instant_trade_service(db)

        # Determine amount based on operation
        if request.operation == "buy":
            if not request.fiat_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="fiat_amount required for buy operations",
                )
            amount = request.fiat_amount
        else:
            if not request.crypto_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="crypto_amount required for sell operations",
                )
            amount = request.crypto_amount

        quote = await service.calculate_quote(
            operation=request.operation,
            symbol=request.symbol,
            amount=amount,
        )

        return {
            "success": True,
            "quote": quote,
            "message": "Quote valid for 30 seconds",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/create")
async def create_trade(
    request: CreateTradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new OTC trade from a valid quote.
    
    Parameters:
    - quote_id: ID of a valid quote (obtained from /quote endpoint)
    - payment_method: "pix", "ted", "credit_card", "debit_card", or "paypal"
    
    Returns:
    - Trade details with reference code (OTC-YYYY-XXXXXX)
    - Payment information
    - Expiration time (15 minutes)
    """
    try:
        service = get_instant_trade_service(db)
        
        # Use str(current_user.id) to get the user ID
        user_id_str = str(current_user.id)
        
        trade = service.create_trade_from_quote(
            user_id=user_id_str,
            quote_id=request.quote_id,
            payment_method=request.payment_method,
        )

        # If payment method is TED, include bank account details
        response_data = {
            "success": True,
            "trade_id": trade["trade_id"],
            "reference_code": trade["reference_code"],
            "message": "Trade created successfully. You have 15 minutes to complete payment.",
        }

        # Add bank details for manual transfer methods (TED)
        if request.payment_method == "ted":
            response_data["bank_details"] = {
                "bank_code": "001",
                "bank_name": "Banco do Brasil",
                "agency": "5271-0",
                "account_number": "26689-2",
                "account_holder": "HOLD DIGITAL ASSETS LTDA",
                "cnpj": "24.275.355/0001-51",
                "pix_key": "24.275.355/0001-51",
                "instructions": f"Transfer R$ {trade.get('total_amount', 0):.2f} to the account above and upload proof of payment.",
            }

        return response_data

    except Exception as e:
        logger.error(f"Error creating trade: {str(e)}")
        error_detail = str(e)
        
        # Add more context to the error message
        if "Quote not found" in error_detail or "expired" in error_detail:
            error_detail = "Quote has expired. Please get a new quote and try again within 30 seconds."
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail,
        )


@router.get("/{trade_id}")
async def get_trade_status(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get status of a specific trade.
    
    Parameters:
    - trade_id: Trade ID
    
    Returns:
    - Trade status and details
    - Time remaining for payment
    """
    try:
        service = get_instant_trade_service(db)
        
        trade = service.get_trade_status(trade_id)

        return {
            "success": True,
            "trade": trade,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{trade_id}/cancel")
async def cancel_trade(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancel a pending trade.
    
    Parameters:
    - trade_id: Trade ID to cancel
    
    Returns:
    - Cancellation confirmation
    """
    try:
        service = get_instant_trade_service(db)
        
        service.cancel_trade(trade_id)

        return {
            "success": True,
            "message": "Trade cancelled successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/history/my-trades")
async def get_trade_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get user's trade history with complete details.
    
    Parameters:
    - page: Page number (default: 1)
    - per_page: Items per page (default: 10, max: 100)
    
    Returns:
    - List of user's trades with full details including:
      * Trade ID and reference code
      * Operation type (buy/sell)
      * Cryptocurrency and amounts
      * Fees and totals
      * Payment method
      * Status and timestamps
    """
    try:
        service = get_instant_trade_service(db)
        
        user_id_str = str(current_user.id)
        
        history = service.get_user_trades(
            user_id=user_id_str,
            page=page,
            per_page=per_page,
        )

        return {
            "success": True,
            "data": history,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{trade_id}/confirm-payment")
async def confirm_payment(
    trade_id: str,
    payment_proof_url: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Confirm payment for a trade.
    
    Parameters:
    - trade_id: Trade ID to confirm payment
    - payment_proof_url: Optional URL to payment proof (receipt, screenshot, etc)
    
    Returns:
    - Trade with updated status (PAYMENT_CONFIRMED)
    """
    try:
        service = get_instant_trade_service(db)
        
        trade = service.confirm_payment(
            trade_id=trade_id,
            payment_proof_url=payment_proof_url,
        )

        return {
            "success": True,
            "trade": trade,
            "message": "Payment confirmed successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{trade_id}/complete")
async def complete_trade(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Complete a trade (mark as completed after crypto transfer).
    
    Parameters:
    - trade_id: Trade ID to complete
    
    Returns:
    - Trade with updated status (COMPLETED)
    """
    try:
        service = get_instant_trade_service(db)
        
        trade = service.complete_trade(trade_id=trade_id)

        return {
            "success": True,
            "trade": trade,
            "message": "Trade completed successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{trade_id}/audit-log")
async def get_trade_audit_log(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get complete audit log for a trade (all status changes).
    
    Parameters:
    - trade_id: Trade ID
    
    Returns:
    - Complete history of all operations on this trade
    """
    try:
        service = get_instant_trade_service(db)
        
        history = service.get_trade_history(trade_id=trade_id)

        return {
            "success": True,
            "audit_log": history,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/fees")
async def get_fees():
    """
    Get OTC fee structure.
    
    Returns:
    - Spread: 3%
    - Network Fee: 0.25%
    - Total: 3.25%
    """
    return {
        "success": True,
        "fees": {
            "spread": "3.00%",
            "network_fee": "0.25%",
            "total": "3.25%",
        },
        "limits": {
            "min": "R$ 50,00",
            "max": "R$ 50.000,00",
        },
        "message": "PF (Pessoa Física) limits",
    }
