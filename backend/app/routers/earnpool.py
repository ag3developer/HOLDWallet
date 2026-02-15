"""
💰 EarnPool - User API Routes
=============================

Endpoints para usuários do EarnPool.

Fluxo de Depósito:
1. preview_deposit - Mostra valor em USDT e requisitos
2. create_deposit - Verifica saldo, deduz da carteira do usuário, registra depósito

Fluxo de Saque:
1. preview_withdrawal - Mostra taxas e valores
2. create_withdrawal - Solicita saque (D+7)

Author: WolkNow Team
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from decimal import Decimal
import logging

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.earnpool_service import get_earnpool_service, EarnPoolService
from app.services.price_aggregator import price_aggregator
from app.services.wallet_balance_service import WalletBalanceService
from app.schemas.earnpool import (
    DepositRequest, DepositPreviewResponse, DepositConfirmRequest, DepositResponse,
    WithdrawalRequest, WithdrawalPreviewResponse, WithdrawalConfirmRequest, WithdrawalResponse,
    EarnPoolBalanceResponse, EarnPoolHistoryResponse, EarnPoolConfigResponse
)

router = APIRouter(prefix="/earnpool", tags=["EarnPool"])
logger = logging.getLogger(__name__)

# Mapeamento de crypto symbol para o formato usado em WalletBalance
CRYPTO_BALANCE_MAP = {
    # Major cryptos
    "BTC": "BTC",
    "ETH": "ETH", 
    "SOL": "SOL",
    "MATIC": "POLYGON_MATIC",
    "BNB": "BSC_BNB",
    "AVAX": "AVALANCHE_AVAX",
    "DOT": "DOT",
    "ADA": "ADA",
    "XRP": "XRP",
    "LTC": "LTC",
    "DOGE": "DOGE",
    "TRX": "TRX",
    "LINK": "LINK",
    "SHIB": "SHIB",
    
    # Stablecoins - USDT
    "USDT": "POLYGON_USDT",  # Default: Polygon
    "ETH_USDT": "ETHEREUM_USDT",
    "POLYGON_USDT": "POLYGON_USDT",
    "BSC_USDT": "BSC_USDT",
    "TRON_USDT": "TRON_USDT",
    "AVALANCHE_USDT": "AVALANCHE_USDT",
    
    # Stablecoins - USDC
    "USDC": "POLYGON_USDC",  # Default: Polygon
    "ETH_USDC": "ETHEREUM_USDC",
    "POLYGON_USDC": "POLYGON_USDC",
    "BSC_USDC": "BSC_USDC",
    
    # TRAY Token (Polygon)
    "TRAY": "POLYGON_TRAY",
}

# Mapeamento de crypto para network (para buscar endereço do sistema)
CRYPTO_NETWORK_MAP = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "MATIC": "polygon",
    "POLYGON_MATIC": "polygon",
    "BNB": "bsc",
    "AVAX": "avalanche",
    "DOT": "polkadot",
    "ADA": "cardano",
    "XRP": "xrp",
    "LTC": "litecoin",
    "DOGE": "dogecoin",
    "TRX": "tron",
    "LINK": "ethereum",  # ERC-20
    "SHIB": "ethereum",  # ERC-20
    
    # USDT
    "USDT": "polygon_usdt",
    "POLYGON_USDT": "polygon_usdt",
    "ETH_USDT": "ethereum_usdt",
    "BSC_USDT": "bsc_usdt",
    "TRON_USDT": "tron_usdt",
    
    # USDC
    "USDC": "polygon_usdc",
    "POLYGON_USDC": "polygon_usdc",
    
    # TRAY
    "TRAY": "polygon_tray",
    "POLYGON_TRAY": "polygon_tray",
}


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
    1. Validates minimum amount
    2. Verifies user has sufficient balance
    3. Deducts balance from user's wallet (internal transfer)
    4. Creates deposit record with LOCKED status
    5. Lock period: 30 days
    
    The crypto is transferred internally from user's wallet balance 
    to the system pool (accounting transfer, not on-chain).
    """
    service = get_earnpool_service(db)
    
    # Buscar preço real da crypto via price_aggregator
    crypto_price = await get_crypto_price_usd(request.crypto_symbol)
    
    # Normalizar símbolo da crypto
    symbol_upper = request.crypto_symbol.upper()
    balance_key = CRYPTO_BALANCE_MAP.get(symbol_upper, symbol_upper)
    
    try:
        # ============================================================
        # 1. VERIFICAR SALDO DO USUÁRIO
        # ============================================================
        user_balance = WalletBalanceService.get_balance(
            db, 
            str(current_user.id), 
            balance_key
        )
        
        if not user_balance:
            raise HTTPException(
                status_code=400, 
                detail=f"Você não possui saldo de {symbol_upper}. Deposite primeiro."
            )
        
        available_balance = Decimal(str(user_balance.get('available_balance', 0)))
        required_amount = Decimal(str(request.crypto_amount))
        
        logger.info(f"💰 EarnPool deposit check: User {current_user.id} - {symbol_upper}")
        logger.info(f"   Available: {available_balance}, Required: {required_amount}")
        
        if available_balance < required_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente. Disponível: {available_balance} {symbol_upper}, Necessário: {required_amount} {symbol_upper}"
            )
        
        # ============================================================
        # 2. DEDUZIR SALDO DO USUÁRIO (TRANSFERÊNCIA INTERNA)
        # ============================================================
        # Congela o saldo do usuário (move de available para locked)
        try:
            WalletBalanceService.freeze_balance(
                db,
                str(current_user.id),
                balance_key,
                float(required_amount),
                reason="EarnPool Deposit - Liquidity Pool Contribution",
                reference_id=None  # Será atualizado com deposit_id depois
            )
            logger.info(f"✅ Balance frozen for EarnPool: {required_amount} {symbol_upper}")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # ============================================================
        # 3. CRIAR REGISTRO DO DEPÓSITO
        # ============================================================
        try:
            deposit = await service.create_deposit(
                user_id=str(current_user.id),
                crypto_symbol=request.crypto_symbol,
                crypto_amount=request.crypto_amount,
                crypto_price_usd=crypto_price,
                tx_hash=f"internal_earnpool_{current_user.id}_{balance_key}"
            )
            
            # Atualizar histórico com o deposit_id
            WalletBalanceService._record_history(
                db,
                str(current_user.id),
                balance_key,
                "earnpool_deposit",
                float(required_amount),
                float(available_balance),
                float(available_balance - required_amount),
                0,
                float(required_amount),
                str(deposit.id),
                f"EarnPool Deposit - Pool Contribution ID: {deposit.id}"
            )
            
            # Agora remove do locked (transferência para o sistema)
            # O saldo "sai" da carteira do usuário e vai para o pool
            # Usando SQL direto para evitar problemas com type hints
            from sqlalchemy import text
            db.execute(
                text("""
                    UPDATE wallet_balances 
                    SET locked_balance = locked_balance - :amount,
                        total_balance = total_balance - :amount,
                        updated_at = NOW(),
                        last_updated_reason = :reason
                    WHERE user_id = :user_id 
                    AND LOWER(cryptocurrency) = LOWER(:crypto)
                """),
                {
                    "amount": float(required_amount),
                    "user_id": str(current_user.id),
                    "crypto": balance_key,
                    "reason": f"EarnPool Deposit ID: {deposit.id}"
                }
            )
            db.commit()
            logger.info(f"✅ Balance transferred to EarnPool: {required_amount} {symbol_upper}")
            
        except ValueError as e:
            # Se falhar, desfaz o freeze
            try:
                WalletBalanceService.unfreeze_balance(
                    db,
                    str(current_user.id),
                    balance_key,
                    float(required_amount),
                    reason="EarnPool Deposit Failed - Rollback"
                )
            except Exception:
                pass
            raise HTTPException(status_code=400, detail=str(e))
        
        logger.info(f"💰 EarnPool deposit created: User {current_user.id} - ${deposit.usdt_amount} USDT ({required_amount} {symbol_upper})")
        return deposit
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ EarnPool deposit error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar depósito: {str(e)}")


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


# ============================================================================
# TIER INFO (USER)
# ============================================================================

@router.get("/tier")
async def get_my_tier(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna informações do tier atual do usuário.
    
    Inclui:
    - Tier atual (level, nome, benefícios)
    - Total depositado
    - % de compartilhamento do pool
    - Próximo tier e quanto falta para alcançar
    """
    from app.services.earnpool_revenue_service import get_earnpool_revenue_service
    
    service = get_earnpool_revenue_service(db)
    tier_info = service.get_user_tier(str(current_user.id))
    
    if not tier_info:
        # Retornar info vazia se não tem depósitos
        return {
            "has_deposits": False,
            "tier": None,
            "message": "Você ainda não participou do pool de liquidez. Faça seu primeiro aporte para entrar!"
        }
    
    return {
        "has_deposits": True,
        "tier": tier_info
    }


@router.get("/tiers")
async def get_available_tiers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos os tiers disponíveis do pool de liquidez.
    
    Permite ao usuário ver os benefícios de cada nível
    e planejar seus aportes.
    """
    from app.services.earnpool_revenue_service import get_earnpool_revenue_service
    
    service = get_earnpool_revenue_service(db)
    tiers = service.get_all_tiers()
    
    return {
        "tiers": [
            {
                "tier_level": tier.tier_level,
                "name": tier.name,
                "name_key": tier.name_key,
                "min_deposit_usdt": float(tier.min_deposit_usdt),
                "max_deposit_usdt": float(tier.max_deposit_usdt) if tier.max_deposit_usdt else None,
                "pool_share_percentage": float(tier.pool_share_percentage),
                "withdrawal_priority_days": tier.withdrawal_priority_days,
                "early_withdrawal_discount": float(tier.early_withdrawal_discount or 0),
                "badge_color": tier.badge_color,
                "badge_icon": tier.badge_icon
            }
            for tier in tiers
        ]
    }
