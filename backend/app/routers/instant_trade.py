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
from uuid import UUID
import logging
import secrets
import string

from app.core.db import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.core.kyc_middleware import check_kyc_limit
from app.models.user import User
from app.models.instant_trade import InstantTrade
from app.services.instant_trade_service import get_instant_trade_service, InstantTradeService
from app.services.kyc_service import KYCService
from app.schemas.instant_trade import QuoteRequest, CreateTradeRequest, TradeStatusResponse

router = APIRouter(prefix="/instant-trade", tags=["Instant Trade OTC"])
logger = logging.getLogger(__name__)

# ============================================================================
# HOLD DIGITAL ASSETS - BANK DETAILS
# ============================================================================
COMPANY_BANK_DETAILS = {
    "bank_name": "Banco do Brasil",
    "bank_code": "001",
    "agency": "5271-0",
    "account": "26689-2",
    "account_type": "Conta Corrente",
    "holder_name": "HOLD DIGITAL ASSETS LTDA",
    "cnpj": "24.275.355/0001-51",
    "pix_key": "24.275.355/0001-51",  # CNPJ as PIX key
}


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


@router.get("/fees")
async def get_fees(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Get OTC fee structure from database configuration.
    
    Returns:
    - Spread: configurável via admin
    - Network Fee: configurável via admin
    - Total: soma das taxas
    - Limites baseados no KYC do usuário (se autenticado)
    
    IMPORTANTE: Esta rota deve ficar ANTES de /{trade_id} para evitar conflitos de roteamento.
    """
    from app.services.platform_settings_service import platform_settings_service
    
    spread = platform_settings_service.get(db, "otc_spread_percentage", 3.0)
    network_fee = platform_settings_service.get(db, "network_fee_percentage", 0.25)
    total = spread + network_fee
    
    # Limites globais do sistema
    min_brl = platform_settings_service.get(db, "instant_trade_min_brl", 50.0)
    max_brl_global = platform_settings_service.get(db, "instant_trade_max_brl", 50000.0)
    
    # Se usuário autenticado, buscar limite personalizado do KYC
    max_brl = max_brl_global
    daily_limit = None
    monthly_limit = None
    kyc_level = None
    kyc_level_name = None
    
    logger.info(f"[Instant Trade Config] current_user: {current_user}")
    
    if current_user:
        try:
            logger.info(f"[Instant Trade Config] Buscando limites para user: {current_user.id}")
            kyc_service = KYCService(db)
            user_uuid = UUID(str(current_user.id)) if not isinstance(current_user.id, UUID) else current_user.id
            user_limits = await kyc_service.get_user_limits(user_uuid)
            
            logger.info(f"[Instant Trade Config] Limites retornados: {user_limits}")
            
            # Buscar limite do serviço Instant Trade
            it_limit = user_limits.get("instant_trade", {})
            if it_limit and isinstance(it_limit, dict):
                transaction_limit = it_limit.get("transaction_limit_brl")
                daily_limit_val = it_limit.get("daily_limit_brl")
                monthly_limit_val = it_limit.get("monthly_limit_brl")
                
                logger.info(f"[Instant Trade Config] transaction_limit={transaction_limit}, daily_limit={daily_limit_val}")
                
                # Determinar o limite máximo efetivo por operação
                limits_to_check = [float(max_brl_global)]
                if transaction_limit is not None:
                    limits_to_check.append(float(transaction_limit))
                
                max_brl = min(limits_to_check)
                daily_limit = daily_limit_val
                monthly_limit = monthly_limit_val
                logger.info(f"[Instant Trade Config] max_brl calculado: {max_brl}")
            
            # Incluir info do nível KYC
            kyc_level = user_limits.get("kyc_level")
            kyc_level_name = user_limits.get("kyc_level_name")
            
        except Exception as e:
            logger.warning(f"Erro ao buscar limites KYC do usuário: {e}")
    
    response = {
        "success": True,
        "fees": {
            "spread": f"{spread:.2f}%",
            "network_fee": f"{network_fee:.2f}%",
            "total": f"{total:.2f}%",
        },
        "limits": {
            "min": f"R$ {min_brl:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "max": f"R$ {max_brl:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "min_brl": min_brl,
            "max_brl": max_brl,
            "daily_limit_brl": daily_limit,
            "monthly_limit_brl": monthly_limit,
        },
        "message": "Limites personalizados baseados no KYC" if current_user else "Limites globais do sistema",
    }
    
    # Adicionar info KYC se usuário autenticado
    if current_user:
        response["kyc_level"] = kyc_level
        response["kyc_level_name"] = kyc_level_name
    
    return response


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
    
    Requires:
    - KYC Básico para operações até R$ 1.000
    - KYC Intermediário para operações até R$ 50.000
    - KYC Avançado para operações acima de R$ 50.000
    """
    try:
        logger.info(f"Creating trade: quote_id={request.quote_id}, payment_method={request.payment_method}, user_id={current_user.id}")
        logger.info(f"BRL values received: brl_amount={request.brl_amount}, brl_total_amount={request.brl_total_amount}, usd_to_brl_rate={request.usd_to_brl_rate}")
        
        # ========== VALIDAÇÃO KYC ==========
        # Verificar se o usuário tem KYC aprovado para o valor da operação
        brl_total = float(request.brl_total_amount) if request.brl_total_amount else 0
        if brl_total > 0:
            await check_kyc_limit(
                db=db,
                user=current_user,
                service_type="instant_trade",
                operation_type="transaction",
                amount_brl=brl_total
            )
        # ====================================
        
        service = get_instant_trade_service(db)
        
        # Use str(current_user.id) to get the user ID
        user_id_str = str(current_user.id)
        
        # Converter valores BRL para Decimal se fornecidos
        from decimal import Decimal
        brl_amount = Decimal(str(request.brl_amount)) if request.brl_amount else None
        brl_total_amount = Decimal(str(request.brl_total_amount)) if request.brl_total_amount else None
        usd_to_brl_rate = Decimal(str(request.usd_to_brl_rate)) if request.usd_to_brl_rate else None
        
        trade = service.create_trade_from_quote(
            user_id=user_id_str,
            quote_id=request.quote_id,
            payment_method=request.payment_method,
            brl_amount=brl_amount,
            brl_total_amount=brl_total_amount,
            usd_to_brl_rate=usd_to_brl_rate,
            receiving_method_id=request.receiving_method_id,
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
            # Usar brl_total_amount se disponível, senão usar total_amount
            amount_to_transfer = brl_total_amount if brl_total_amount else trade.get('total_amount', 0)
            response_data["bank_details"] = {
                "bank_code": COMPANY_BANK_DETAILS["bank_code"],
                "bank_name": COMPANY_BANK_DETAILS["bank_name"],
                "agency": COMPANY_BANK_DETAILS["agency"],
                "account_number": COMPANY_BANK_DETAILS["account"],
                "account_holder": COMPANY_BANK_DETAILS["holder_name"],
                "cnpj": COMPANY_BANK_DETAILS["cnpj"],
                "pix_key": COMPANY_BANK_DETAILS["pix_key"],
                "instructions": f"Transfer R$ {float(amount_to_transfer):.2f} to the account above and upload proof of payment.",
            }

        return response_data

    except Exception as e:
        # IMPORTANTE: Fazer rollback para limpar transação abortada
        db.rollback()
        
        logger.error(f"Error creating trade: {str(e)}")
        error_detail = str(e)
        
        # Add more context to the error message
        if "Quote not found" in error_detail or "expired" in error_detail:
            error_detail = "Quote has expired. Please get a new quote and try again within 30 seconds."
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail,
        )


@router.post("/create-with-pix")
async def create_trade_with_pix(
    request: CreateTradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new OTC trade and generate PIX QR Code automatically via Banco do Brasil API.
    
    This endpoint integrates with Banco do Brasil PIX API to:
    1. Create the trade
    2. Generate QR Code PIX automatically
    3. Return QR code data for payment
    4. Receive webhook when payment is confirmed
    5. Automatically send crypto to user's wallet
    
    Parameters:
    - quote_id: ID of a valid quote (obtained from /quote endpoint)
    - brl_amount: Original amount in BRL
    - brl_total_amount: Total amount with fees in BRL
    - usd_to_brl_rate: Exchange rate used
    
    Returns:
    - Trade details
    - PIX QR Code (EMV payload for copy-paste)
    - PIX QR Code image (base64)
    - Expiration time (15 minutes)
    
    Requires:
    - KYC Básico para operações até R$ 1.000
    - KYC Intermediário para operações até R$ 50.000
    - KYC Avançado para operações acima de R$ 50.000
    """
    try:
        from app.services.banco_brasil_service import get_banco_brasil_service
        
        logger.info(f"Creating trade with PIX: quote_id={request.quote_id}, user_id={current_user.id}")
        
        # ========== VALIDAÇÃO KYC ==========
        brl_total = float(request.brl_total_amount) if request.brl_total_amount else 0
        if brl_total > 0:
            await check_kyc_limit(
                db=db,
                user=current_user,
                service_type="instant_trade",
                operation_type="transaction",
                amount_brl=brl_total
            )
        # ====================================
        
        # 1. Create trade with PIX payment method
        service = get_instant_trade_service(db)
        user_id_str = str(current_user.id)
        
        # Convert BRL values to Decimal
        brl_amount = Decimal(str(request.brl_amount)) if request.brl_amount else None
        brl_total_amount = Decimal(str(request.brl_total_amount)) if request.brl_total_amount else None
        usd_to_brl_rate = Decimal(str(request.usd_to_brl_rate)) if request.usd_to_brl_rate else None
        
        trade = service.create_trade_from_quote(
            user_id=user_id_str,
            quote_id=request.quote_id,
            payment_method="pix",  # Force PIX for this endpoint
            brl_amount=brl_amount,
            brl_total_amount=brl_total_amount,
            usd_to_brl_rate=usd_to_brl_rate,
            receiving_method_id=request.receiving_method_id,
        )
        
        # 2. Generate PIX via Banco do Brasil API
        bb_service = get_banco_brasil_service(db)
        
        # Generate unique TXID from reference_code
        # BB API requires txid between 26-35 alphanumeric chars [a-zA-Z0-9]
        base_txid = trade["reference_code"].replace("-", "").replace("OTC", "WOLK")
        # Pad with random alphanumeric chars to reach minimum 26 chars
        if len(base_txid) < 26:
            padding_needed = 26 - len(base_txid)
            random_padding = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(padding_needed))
            txid = base_txid + random_padding
        else:
            txid = base_txid[:35]  # Max 35 chars
        
        # Get amount to charge (BRL total)
        valor_pix = brl_total_amount or Decimal(str(trade.get("total_amount", 0)))
        
        # Create PIX charge
        pix_data = await bb_service.criar_cobranca_pix(
            txid=txid,
            valor=valor_pix,
            descricao=f"WOLK NOW - Compra {trade.get('crypto_amount', 0):.8f} {trade.get('symbol', 'CRYPTO')}",
            expiracao_segundos=900,  # 15 minutes
            info_adicionais={
                "trade_id": trade["trade_id"],
                "ref": trade["reference_code"],
                "symbol": trade.get("symbol"),
            }
        )
        
        # 3. Update trade with PIX data
        try:
            trade_obj = db.query(InstantTrade).filter(
                InstantTrade.id == trade["trade_id"]
            ).first()
            
            if trade_obj:
                # IMPORTANTE: Usar o txid retornado pelo BB, não o gerado localmente
                # O BB pode modificar/complementar o txid
                actual_txid = pix_data.get("txid", txid)
                trade_obj.pix_txid = actual_txid
                trade_obj.pix_location = pix_data.get("location")
                trade_obj.pix_qrcode = pix_data.get("qrcode")
                db.commit()
                logger.info(f"Trade {trade['reference_code']} updated with PIX txid={actual_txid}")
        except Exception as update_error:
            logger.warning(f"Failed to update trade with PIX data: {update_error}")
            db.rollback()
            # Continue anyway - trade was created, PIX was generated
        
        # 4. Build response
        return {
            "success": True,
            "trade_id": trade["trade_id"],
            "reference_code": trade["reference_code"],
            "message": "Trade criado com PIX. Escaneie o QR Code para pagar.",
            "pix": {
                "txid": pix_data.get("txid", txid),
                "qrcode": pix_data.get("qrcode", ""),
                "qrcode_image": pix_data.get("qrcode_base64", ""),
                "valor": f"{float(valor_pix):.2f}",
                "expiracao_segundos": 900,
                "chave": COMPANY_BANK_DETAILS["pix_key"],
            },
            "auto_confirmation": True,  # Indicates payment will be confirmed automatically via webhook
            "expires_at": trade.get("expires_at"),
            "crypto_amount": trade.get("crypto_amount"),
            "symbol": trade.get("symbol"),
        }

    except Exception as e:
        # IMPORTANTE: Fazer rollback para limpar transação abortada
        db.rollback()
        
        logger.error(f"Error creating trade with PIX: {str(e)}")
        
        # Provide helpful error messages
        error_detail = str(e)
        if "Credenciais" in error_detail or "token" in error_detail.lower():
            error_detail = "Erro de configuração da API Banco do Brasil. Contate o suporte."
        elif "Quote not found" in error_detail or "expired" in error_detail:
            error_detail = "Cotação expirada. Por favor, solicite uma nova cotação."
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail,
        )


@router.get("/{trade_id}/pix-status")
async def check_pix_status(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Check PIX payment status for a trade.
    
    This endpoint queries Banco do Brasil API to check if PIX was paid.
    Useful for polling payment status before webhook arrives.
    
    Parameters:
    - trade_id: Trade ID to check
    
    Returns:
    - Payment status
    - Value received (if paid)
    - Trade status
    """
    try:
        from app.services.banco_brasil_service import get_banco_brasil_service
        
        # Get trade
        trade_obj = db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()
        
        if not trade_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trade não encontrado"
            )
        
        # Verify ownership
        if str(trade_obj.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )
        
        # Check if trade has PIX txid
        if not trade_obj.pix_txid:
            return {
                "success": True,
                "trade_id": trade_id,
                "has_pix": False,
                "message": "Este trade não possui PIX associado",
                "trade_status": trade_obj.status.value if trade_obj.status else None,
            }
        
        # Query BB API for payment status
        bb_service = get_banco_brasil_service(db)
        pix_status = await bb_service.verificar_pagamento(trade_obj.pix_txid)
        
        return {
            "success": True,
            "trade_id": trade_id,
            "reference_code": trade_obj.reference_code,
            "has_pix": True,
            "pix_txid": trade_obj.pix_txid,
            "pix_pago": pix_status.get("pago", False),
            "pix_status": pix_status.get("status"),
            "valor_pago": pix_status.get("valor_pago"),
            "horario_pagamento": pix_status.get("horario_pagamento"),
            "trade_status": trade_obj.status.value if trade_obj.status else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking PIX status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
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


@router.get("/{trade_id}/bank-details")
async def get_bank_details(
    trade_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get bank details for payment (TED/PIX).
    
    Parameters:
    - trade_id: Trade ID
    
    Returns:
    - Bank account details for wire transfer
    - PIX key if applicable
    """
    try:
        service = get_instant_trade_service(db)
        trade = service.get_trade_status(trade_id)
        
        # Verify trade belongs to current user
        trade_obj = db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()
        if not trade_obj or str(trade_obj.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Only return bank details for pending trades with TED/PIX
        if trade["status"] != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bank details only available for pending trades"
            )
        
        payment_method = trade.get("payment_method", "").lower()
        if payment_method not in ["ted", "pix"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bank details only available for TED/PIX payments"
            )
        
        # Use company bank details constant
        bank_details = {
            "bank_name": COMPANY_BANK_DETAILS["bank_name"],
            "bank_code": COMPANY_BANK_DETAILS["bank_code"],
            "agency": COMPANY_BANK_DETAILS["agency"],
            "account": COMPANY_BANK_DETAILS["account"],
            "account_type": COMPANY_BANK_DETAILS["account_type"],
            "holder_name": COMPANY_BANK_DETAILS["holder_name"],
            "holder_document": COMPANY_BANK_DETAILS["cnpj"],
        }
        
        # Add PIX key for PIX payments
        if payment_method == "pix":
            bank_details["pix_key"] = COMPANY_BANK_DETAILS["pix_key"]
        
        # Usar brl_total_amount se disponível, senão total_amount
        amount_to_pay = trade.get("brl_total_amount") or trade["total_amount"]
        
        return {
            "success": True,
            "bank_details": bank_details,
            "reference_code": trade["reference_code"],
            "amount": amount_to_pay,
            "brl_total_amount": trade.get("brl_total_amount"),
            "total_amount_usd": trade["total_amount"],
        }

    except HTTPException:
        raise
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
        logger.info(f"[my-trades] Fetching trades for user: {user_id_str}")
        
        history = service.get_user_trades(
            user_id=user_id_str,
            page=page,
            per_page=per_page,
        )
        
        logger.info(f"[my-trades] Found {len(history.get('trades', []))} trades for user {user_id_str}")

        # Return trades directly at root level for frontend compatibility
        return {
            "success": True,
            "trades": history.get("trades", []),
            "total": history.get("total", 0),
            "page": history.get("page", page),
            "per_page": history.get("per_page", per_page),
        }

    except Exception as e:
        logger.error(f"[my-trades] Error fetching trades: {e}")
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
