"""
🏦 HOLD Wallet - Bank Transfer Payment Service (TransfBank Integration)
======================================================================

Service for handling automatic bank transfers as payment method.
Supports multiple banks and automatic verification.

Uses TransfBank API or similar for automated bank transfers.
Eventually integrates with PIX for instant confirmation.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import logging
import asyncio
import httpx

from app.core.exceptions import ValidationError, PaymentError
from app.models.user_settings import UserSettings

logger = logging.getLogger(__name__)


class BankTransferPaymentService:
    """
    Service for bank transfer payments.
    
    Supports:
    - Multiple banks (Via, Itaú, Bradesco, Caixa, Santander, etc)
    - Automatic account validation
    - TransfBank API integration
    - PIX as fallback (future)
    """

    # Gateway configuration
    TRANSFBANK_API_URL = "https://api.transfbank.com.br/v1"  # Will be in .env
    TRANSFBANK_API_KEY = None  # Will be loaded from .env
    
    # Constants
    TRANSFER_TIMEOUT_MINUTES = 15
    TRANSFER_VALIDITY_MINUTES = 30
    MAX_TRANSFER_AMOUNT_BRL = Decimal("50000.00")
    MIN_TRANSFER_AMOUNT_BRL = Decimal("10.00")
    
    # Supported banks
    SUPPORTED_BANKS = {
        "001": "Banco do Brasil",
        "033": "Banco Santander",
        "041": "Banco do Estado de São Paulo",
        "047": "Banco do Estado de Santa Catarina",
        "104": "Caixa Econômica Federal",
        "237": "Bradesco",
        "341": "Itaú Unibanco",
        "389": "Banco Mercantil do Brasil",
        "422": "Banco Safra",
        "633": "Banco Rendic",
        "655": "Banco de Brasília",
        "756": "Banco Cooperativo do Brasil",
        "825": "Banco de Crédito de Pessoa Física",
        "846": "Banco da Amazônia",
        "847": "Banco BRJ",
        "999": "Outros"
    }

    def __init__(self, db: Session):
        self.db = db
        self.transfbank_api_url = self.TRANSFBANK_API_URL
        # Load from environment in production
        # self.transfbank_api_key = os.getenv("TRANSFBANK_API_KEY")

    async def get_bank_account_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch saved bank account info for a user.
        
        Returns:
            Dict with bank details or None if not configured
        """
        try:
            settings = self.db.query(UserSettings).filter_by(user_id=user_id).first()
            
            if not settings or not settings.payment_methods:
                logger.warning(f"No payment methods configured for user {user_id}")
                return None
            
            # payment_methods should be a dict with bank account data
            bank_data = settings.payment_methods.get("bank_account")
            
            if not bank_data:
                return None
            
            return {
                "bank_code": bank_data.get("bank_code"),
                "account_number": bank_data.get("account_number"),
                "account_digit": bank_data.get("account_digit"),
                "agency": bank_data.get("agency"),
                "owner_name": bank_data.get("owner_name"),
                "owner_cpf": bank_data.get("owner_cpf"),
                "account_type": bank_data.get("account_type", "checking"),  # checking, savings
            }
        except Exception as e:
            logger.error(f"Error fetching bank account info: {str(e)}")
            raise ValidationError("Erro ao recuperar dados bancários")

    async def validate_bank_account(self, bank_code: str, account_number: str, agency: str) -> bool:
        """
        Validate bank account using TransfBank API.
        
        Args:
            bank_code: Código do banco (ex: 341 para Itaú)
            account_number: Número da conta (ex: 12345)
            agency: Agência (ex: 0001)
        
        Returns:
            True if account is valid
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.transfbank_api_url}/validate-account",
                    json={
                        "bank_code": bank_code,
                        "agency": agency,
                        "account_number": account_number,
                    },
                    headers={"Authorization": f"Bearer {self.transfbank_api_key}"}
                )
            
            if response.status_code != 200:
                logger.error(f"TransfBank validation failed: {response.text}")
                return False
            
            data = response.json()
            return data.get("valid", False)
        
        except httpx.TimeoutException:
            logger.error("TransfBank API timeout")
            raise PaymentError("Validação com gateway timeout")
        except Exception as e:
            logger.error(f"Bank validation error: {str(e)}")
            raise PaymentError(f"Erro ao validar conta bancária: {str(e)}")

    async def create_transfer_request(
        self,
        user_id: str,
        amount: Decimal,
        description: str,
        reference_code: str
    ) -> Dict[str, Any]:
        """
        Create a bank transfer payment request.
        
        This generates a unique account/ID that the user must transfer to.
        User transfers money → We verify → Complete trade.
        
        Args:
            user_id: ID do usuário
            amount: Valor a transferir em BRL
            description: Descrição (ex: "Compra de 0.05 BTC")
            reference_code: Código único (ex: "HOLD-2025-XXXXX")
        
        Returns:
            Dict with transfer details and account to send money to
        """
        # Validate amount
        if amount < self.MIN_TRANSFER_AMOUNT_BRL or amount > self.MAX_TRANSFER_AMOUNT_BRL:
            raise ValidationError(
                f"Valor deve estar entre R$ {self.MIN_TRANSFER_AMOUNT_BRL} "
                f"e R$ {self.MAX_TRANSFER_AMOUNT_BRL}"
            )

        try:
            # Generate unique transfer ID
            transfer_id = f"TRF_{uuid.uuid4().hex[:12].upper()}"
            expires_at = datetime.utcnow() + timedelta(minutes=self.TRANSFER_VALIDITY_MINUTES)

            # Create transfer request with TransfBank
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.transfbank_api_url}/create-transfer",
                    json={
                        "transfer_id": transfer_id,
                        "amount_brl": float(amount),
                        "description": f"{description} - Ref: {reference_code}",
                        "expires_at": expires_at.isoformat(),
                        "webhook_url": "https://api.holdwallet.com/webhooks/bank-transfer",  # in .env
                        "metadata": {
                            "user_id": user_id,
                            "reference_code": reference_code,
                            "trade_id": reference_code,
                        }
                    },
                    headers={"Authorization": f"Bearer {self.transfbank_api_key}"}
                )

            if response.status_code not in [200, 201]:
                logger.error(f"TransfBank transfer creation failed: {response.text}")
                raise PaymentError("Erro ao criar solicitação de transferência")

            data = response.json()

            return {
                "transfer_id": transfer_id,
                "status": "pending",
                "amount_brl": float(amount),
                "bank_account": {
                    "bank_code": data.get("bank_code"),
                    "bank_name": self.SUPPORTED_BANKS.get(data.get("bank_code"), "Unknown"),
                    "agency": data.get("agency"),
                    "account_number": data.get("account_number"),
                    "account_digit": data.get("account_digit"),
                    "account_name": data.get("account_name", "HOLD Wallet"),
                    "account_type": data.get("account_type", "checking"),
                },
                "pix_key": data.get("pix_key"),  # PIX as alternative (if available)
                "qr_code": data.get("qr_code"),  # QR Code for PIX
                "reference_code": reference_code,
                "description": f"{description} - Ref: {reference_code}",
                "expires_at": expires_at.isoformat(),
                "instructions": (
                    f"Faça uma transferência bancária de R$ {amount:.2f} "
                    f"para a conta HOLD Wallet informada. "
                    f"Use o código {reference_code} como descrição da transferência."
                ),
                "webhook_enabled": True,  # Will receive automatic confirmation
            }

        except httpx.TimeoutException:
            logger.error("TransfBank API timeout during transfer creation")
            raise PaymentError("Timeout ao criar transferência")
        except Exception as e:
            logger.error(f"Transfer creation error: {str(e)}")
            raise PaymentError(f"Erro ao criar transferência: {str(e)}")

    async def verify_transfer_received(
        self,
        transfer_id: str,
        expected_amount: Decimal,
        timeout_minutes: int = 15
    ) -> bool:
        """
        Verify if transfer was received.
        
        In production, this is called by webhook from TransfBank.
        Can also be called manually for polling.
        
        Args:
            transfer_id: ID da transferência
            expected_amount: Valor esperado
            timeout_minutes: Timeout em minutos
        
        Returns:
            True if transfer confirmed
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.transfbank_api_url}/transfer/{transfer_id}",
                    headers={"Authorization": f"Bearer {self.transfbank_api_key}"}
                )

            if response.status_code != 200:
                logger.warning(f"Transfer not found: {transfer_id}")
                return False

            data = response.json()
            
            # Check if transfer was received
            if data.get("status") not in ["confirmed", "received", "completed"]:
                return False
            
            # Verify amount matches
            received_amount = Decimal(str(data.get("amount_received", 0)))
            if received_amount != expected_amount:
                logger.error(
                    f"Amount mismatch for {transfer_id}: "
                    f"expected {expected_amount}, got {received_amount}"
                )
                return False

            logger.info(f"Transfer verified: {transfer_id}")
            return True

        except Exception as e:
            logger.error(f"Transfer verification error: {str(e)}")
            return False

    async def handle_transfer_webhook(self, webhook_data: Dict[str, Any]) -> bool:
        """
        Handle webhook from TransfBank confirming transfer receipt.
        
        This is called by TransfBank API when transfer is confirmed.
        Updates trade status automatically.
        
        Args:
            webhook_data: Dados do webhook
        
        Returns:
            True if handled successfully
        """
        try:
            transfer_id = webhook_data.get("transfer_id")
            status = webhook_data.get("status")
            amount_received = webhook_data.get("amount_received")
            metadata = webhook_data.get("metadata", {})
            
            logger.info(
                f"Transfer webhook received: {transfer_id}, "
                f"Status: {status}, Amount: {amount_received}"
            )

            # Verify webhook signature (IMPORTANT for security)
            # In production: verify_webhook_signature(webhook_data, signature)

            if status not in ["confirmed", "received", "completed"]:
                logger.warning(f"Transfer not confirmed: {transfer_id}")
                return False

            # Extract trade information from metadata
            trade_id = metadata.get("trade_id")
            reference_code = metadata.get("reference_code")

            logger.info(f"Transfer confirmed for trade: {trade_id}")

            # Update trade status (this will be called by your trade service)
            # trade_service.complete_payment(trade_id, transfer_id, amount_received)

            return True

        except Exception as e:
            logger.error(f"Webhook handling error: {str(e)}")
            return False

    def get_bank_list(self) -> Dict[str, str]:
        """Get list of supported banks"""
        return self.SUPPORTED_BANKS

    async def poll_transfer_status(self, transfer_id: str) -> Optional[Dict[str, Any]]:
        """
        Poll current status of a transfer (alternative to webhook).
        
        Useful for checking status without relying on webhooks.
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.transfbank_api_url}/transfer/{transfer_id}",
                    headers={"Authorization": f"Bearer {self.transfbank_api_key}"}
                )

            if response.status_code != 200:
                return None

            data = response.json()
            return {
                "transfer_id": transfer_id,
                "status": data.get("status"),
                "amount_received": data.get("amount_received"),
                "received_at": data.get("received_at"),
                "sender_name": data.get("sender_name"),
                "sender_bank": data.get("sender_bank"),
            }

        except Exception as e:
            logger.error(f"Poll status error: {str(e)}")
            return None


# Singleton instance
_bank_transfer_service: Optional[BankTransferPaymentService] = None


def get_bank_transfer_service(db: Session) -> BankTransferPaymentService:
    """Get or create bank transfer service"""
    global _bank_transfer_service
    if _bank_transfer_service is None:
        _bank_transfer_service = BankTransferPaymentService(db)
    return _bank_transfer_service
