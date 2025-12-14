"""
🏦 HOLD Wallet - Bank Transfer Payment Router
==============================================

API endpoints for bank transfer payment processing.
Integrates with Instant Trade and P2P trading.

Author: HOLD Wallet Team
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
from decimal import Decimal
import logging
import hmac
import hashlib
import json

from app.core.deps import get_db, get_current_user
from app.core.exceptions import PaymentError, ValidationError
from app.services.bank_transfer_service import get_bank_transfer_service
from app.services.instant_trade_service import InstantTradeService
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payments/bank", tags=["Bank Transfer Payments"])


class BankTransferRequest:
    """Request model for bank transfer"""
    def __init__(self, trade_id: str, amount_brl: float):
        self.trade_id = trade_id
        self.amount_brl = Decimal(str(amount_brl))


class TransferWebhookRequest:
    """Request model for transfer webhook"""
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


@router.get("/banks")
async def get_supported_banks(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """
    Get list of supported banks for transfers.
    
    Returns:
        {
            "001": "Banco do Brasil",
            "033": "Banco Santander",
            ...
        }
    """
    service = get_bank_transfer_service(db)
    banks = service.get_bank_list()
    return {"banks": banks, "total": len(banks)}


@router.post("/validate-account")
async def validate_bank_account(
    bank_code: str,
    agency: str,
    account_number: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Validate a bank account for transfers.
    
    Args:
        bank_code: Código do banco (ex: 341)
        agency: Agência (ex: 0001)
        account_number: Número da conta (ex: 12345)
    
    Returns:
        {"valid": true, "message": "Conta válida"}
    """
    try:
        service = get_bank_transfer_service(db)
        is_valid = await service.validate_bank_account(bank_code, account_number, agency)
        
        return {
            "valid": is_valid,
            "message": "Conta válida" if is_valid else "Conta inválida",
            "bank_code": bank_code,
            "agency": agency,
            "account_number": account_number
        }
    
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Account validation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao validar conta")


@router.post("/create-transfer")
async def create_bank_transfer(
    trade_id: str,
    amount_brl: float,
    description: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Create a bank transfer payment request for a trade.
    
    Returns account details and transfer instructions.
    
    Args:
        trade_id: ID do trade (ex: HOLD-2025-XXXXX)
        amount_brl: Valor em BRL
        description: Descrição (ex: "Compra de 0.05 BTC")
    
    Returns:
        {
            "transfer_id": "TRF_ABC123",
            "status": "pending",
            "bank_account": {
                "bank_code": "341",
                "bank_name": "Itaú Unibanco",
                "agency": "0001",
                "account_number": "12345",
                "account_digit": "6",
                "account_name": "HOLD Wallet"
            },
            "amount_brl": 1000.00,
            "expires_at": "2025-12-11T20:30:00",
            "instructions": "Faça uma transferência de R$ 1000.00..."
        }
    """
    try:
        service = get_bank_transfer_service(db)
        trade_service = InstantTradeService(db)
        
        # Validate trade exists (implement this in your trade service)
        # trade = trade_service.get_trade(trade_id)
        # if not trade or trade.user_id != user.id:
        #     raise ValidationError("Trade não encontrado")
        
        # Create transfer request
        transfer_data = await service.create_transfer_request(
            user_id=str(user.id),
            amount=Decimal(str(amount_brl)),
            description=description,
            reference_code=trade_id
        )
        
        return transfer_data
    
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PaymentError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        logger.error(f"Transfer creation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao criar transferência")


@router.get("/transfer/{transfer_id}")
async def get_transfer_status(
    transfer_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get status of a transfer.
    
    Returns:
        {
            "transfer_id": "TRF_ABC123",
            "status": "pending|confirmed|failed",
            "amount_received": 1000.00,
            "received_at": "2025-12-11T20:00:00",
            "sender_bank": "341 - Itaú"
        }
    """
    try:
        service = get_bank_transfer_service(db)
        status_data = await service.poll_transfer_status(transfer_id)
        
        if not status_data:
            raise HTTPException(status_code=404, detail="Transferência não encontrada")
        
        return status_data
    
    except Exception as e:
        logger.error(f"Get transfer status error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao obter status")


@router.post("/webhook/transfer")
async def handle_transfer_webhook(
    request_body: dict,
    x_transfbank_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint for TransfBank payment confirmations.
    
    Called by TransfBank when a transfer is confirmed.
    
    IMPORTANT: In production, verify the signature:
    1. Get the signature from X-TransfBank-Signature header
    2. Verify it using HMAC-SHA256 with your API key
    3. Only process if signature is valid
    
    Expected webhook data:
    {
        "transfer_id": "TRF_ABC123",
        "status": "confirmed",
        "amount_received": 1000.00,
        "received_at": "2025-12-11T20:00:00",
        "sender_name": "João Silva",
        "sender_bank": "341",
        "metadata": {
            "trade_id": "HOLD-2025-XXXXX",
            "user_id": "uuid-here"
        }
    }
    """
    try:
        # SECURITY: Verify webhook signature
        if x_transfbank_signature:
            # In production: verify_webhook_signature(request_body, x_transfbank_signature)
            pass
        
        service = get_bank_transfer_service(db)
        result = await service.handle_transfer_webhook(request_body)
        
        if not result:
            logger.warning(f"Webhook processing failed: {request_body}")
            return {"ok": False, "message": "Falha ao processar webhook"}
        
        # Extract metadata
        metadata = request_body.get("metadata", {})
        trade_id = metadata.get("trade_id")
        user_id = metadata.get("user_id")
        amount_received = request_body.get("amount_received")
        
        logger.info(
            f"Transfer webhook processed: "
            f"trade_id={trade_id}, "
            f"amount={amount_received}, "
            f"user={user_id}"
        )
        
        # TODO: Update trade status to "payment_received"
        # TODO: Complete the trade automatically
        # trade_service.complete_payment(trade_id, amount_received)
        
        return {
            "ok": True,
            "message": "Webhook processado com sucesso",
            "trade_id": trade_id
        }
    
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        # Don't expose error details to external webhooks
        return {"ok": False}


@router.get("/account-info")
async def get_user_account_info(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Get saved bank account info for current user.
    
    Returns:
        {
            "bank_code": "341",
            "account_number": "12345",
            "account_digit": "6",
            "agency": "0001",
            "owner_name": "João Silva",
            "owner_cpf": "123.456.789-00",
            "account_type": "checking"
        }
    """
    try:
        service = get_bank_transfer_service(db)
        account_info = await service.get_bank_account_info(str(user.id))
        
        if not account_info:
            raise HTTPException(
                status_code=404,
                detail="Nenhuma conta bancária configurada"
            )
        
        return account_info
    
    except Exception as e:
        logger.error(f"Get account info error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao obter dados bancários")


# Utility function to verify webhook signature (use in production)
def verify_webhook_signature(
    request_body: dict,
    signature: str,
    api_key: str
) -> bool:
    """
    Verify TransfBank webhook signature.
    
    Args:
        request_body: Request JSON body
        signature: Signature from X-TransfBank-Signature header
        api_key: Your TransfBank API key
    
    Returns:
        True if signature is valid
    """
    # Convert body to JSON string for verification
    body_str = json.dumps(request_body, separators=(',', ':'), sort_keys=True)
    
    # Create HMAC-SHA256
    expected_signature = hmac.new(
        api_key.encode(),
        body_str.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Compare signatures (use constant-time comparison for security)
    return hmac.compare_digest(expected_signature, signature)
