"""
💱 HOLD Wallet - Exchange & Swap API Endpoints
==============================================

API endpoints for cryptocurrency swaps, fiat onramp, and trading functionality.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.db.database import get_db
from app.services.exchange import exchange_service

router = APIRouter(prefix="/exchange", tags=["exchange"])

@router.get("/assets")
async def get_supported_assets():
    """Get list of supported assets for trading"""
    try:
        assets = await exchange_service.get_supported_assets()
        
        return {
            "success": True,
            "assets": assets,
            "total_assets": len(assets)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/quote/swap")
async def get_swap_quote(
    user_id: str,
    from_asset: str,
    to_asset: str,
    amount: float,
    swap_type: str = Query(default="standard", regex="^(standard|instant|cross_chain)$"),
    db: Session = Depends(get_db)
):
    """Get a quote for cryptocurrency swap"""
    try:
        quote = await exchange_service.get_swap_quote(
            db, user_id, from_asset, to_asset, amount, swap_type
        )
        
        return {
            "success": True,
            "quote": quote,
            "message": f"Quote valid for 5 minutes"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/swap")
async def execute_swap(
    user_id: str,
    quote_id: str,
    from_wallet_id: str,
    to_wallet_id: str,
    db: Session = Depends(get_db)
):
    """Execute a cryptocurrency swap"""
    try:
        swap_result = await exchange_service.execute_swap(
            db, user_id, quote_id, from_wallet_id, to_wallet_id
        )
        
        return {
            "success": True,
            "swap": swap_result,
            "message": "Swap initiated successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/quote/fiat")
async def get_fiat_onramp_quote(
    user_id: str,
    fiat_amount: float,
    fiat_currency: str = Query(default="BRL"),
    crypto_asset: str = "BTC",
    payment_method: str = Query(default="pix", regex="^(credit_card|debit_card|pix|bank_transfer)$"),
    db: Session = Depends(get_db)
):
    """Get quote for buying crypto with fiat currency"""
    try:
        quote = await exchange_service.get_fiat_onramp_quote(
            db, user_id, fiat_amount, fiat_currency, crypto_asset, payment_method
        )
        
        return {
            "success": True,
            "quote": quote,
            "payment_methods": {
                "pix": "Fastest - 0.5% fee",
                "bank_transfer": "Cheapest - No additional fees",
                "debit_card": "Fast - 1.5% fee", 
                "credit_card": "Instant - 3% fee"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/pairs")
async def get_trading_pairs():
    """Get available trading pairs"""
    try:
        return {
            "success": True,
            "pairs": list(exchange_service.SUPPORTED_PAIRS.keys()),
            "pair_details": exchange_service.SUPPORTED_PAIRS
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/rates")
async def get_exchange_rates():
    """Get current exchange rates"""
    try:
        return {
            "success": True,
            "rates": exchange_service.EXCHANGE_RATES,
            "last_updated": "2024-11-24T12:00:00Z",
            "note": "Rates updated every 30 seconds"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/fees")
async def get_fee_structure():
    """Get current fee structure"""
    try:
        # Convert basis points to percentages for display
        fees_percentage = {
            name: f"{fee/100}%" 
            for name, fee in exchange_service.FEE_STRUCTURE.items()
        }
        
        return {
            "success": True,
            "fees": fees_percentage,
            "fee_structure": exchange_service.FEE_STRUCTURE,
            "discounts": {
                "pro_users": "10% discount on all fees",
                "enterprise_users": "20% discount on all fees"
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/stats")
async def get_exchange_statistics(
    db: Session = Depends(get_db)
):
    """Get exchange volume and revenue statistics (admin endpoint)"""
    try:
        stats = await exchange_service.get_exchange_stats(db)
        
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/fiat/buy")
async def buy_crypto_with_fiat(
    user_id: str,
    quote_id: str,
    wallet_id: str,
    payment_method_id: str,
    db: Session = Depends(get_db)
):
    """Execute fiat to crypto purchase"""
    try:
        # Mock implementation
        purchase_data = {
            "purchase_id": "fiat_001",
            "status": "processing",
            "estimated_completion": "5-15 minutes",
            "payment_method": "PIX",
            "tracking_code": "PIX123456789"
        }
        
        return {
            "success": True,
            "purchase": purchase_data,
            "message": "Fiat purchase initiated. You will receive your crypto shortly."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
