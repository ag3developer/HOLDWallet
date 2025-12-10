"""
💱 HOLD Wallet - Instant Trade OTC Service
==========================================

Business logic for OTC trading operations.
Simple, professional, and scalable.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import logging
import asyncio

from app.models.instant_trade import InstantTrade, InstantTradeHistory, TradeStatus, PaymentMethod
from app.core.exceptions import ValidationError
from app.services.price_aggregator import price_aggregator

logger = logging.getLogger(__name__)

# Cache de cotações em memória (quote_id -> quote_data)
# Em produção, usar Redis ou banco de dados
_quote_cache: Dict[str, Dict[str, Any]] = {}


class InstantTradeService:
    """Service for OTC trading operations"""

    # Constants
    SPREAD_PERCENTAGE = Decimal("3.00")
    NETWORK_FEE_PERCENTAGE = Decimal("0.25")
    QUOTE_VALIDITY_SECONDS = 30
    TRADE_EXPIRATION_MINUTES = 15
    MIN_TRADE_AMOUNT_BRL = Decimal("50.00")
    MAX_TRADE_AMOUNT_BRL = Decimal("50000.00")

    def __init__(self, db: Session):
        self.db = db

    async def get_current_price(self, symbol: str) -> Decimal:
        """Get current crypto price from price_aggregator API (ALWAYS real-time, NO fallback)"""
        symbol_upper = symbol.upper()
        
        # Always get from price_aggregator API (real-time prices)
        try:
            # Get prices from aggregator (async)
            prices = await price_aggregator.get_prices([symbol_upper], currency="usd")
            if symbol_upper in prices:
                price_data = prices[symbol_upper]
                logger.info(f"Got real-time price for {symbol_upper}: ${price_data.price} USD from API")
                return Decimal(str(price_data.price))
        except Exception as e:
            logger.error(f"Failed to get price from API for {symbol_upper}: {str(e)}")
            raise ValidationError(f"Unable to fetch price for {symbol_upper}. Please try again.")
        
        # Symbol not found in API response
        raise ValidationError(f"Symbol {symbol_upper} not found in price data")

    async def calculate_quote(self, operation: str, symbol: str, amount: Decimal) -> Dict[str, Any]:
        """Calculate quote with fees and cache it"""
        symbol_upper = symbol.upper()
        price = await self.get_current_price(symbol_upper)

        # Initialize variables for both operations
        fiat_amount = 0
        crypto_amount = 0
        spread_amount = 0
        fee = 0
        total = 0

        if operation == "buy":
            # For buy: spread increases price
            otc_price = price * (1 + self.SPREAD_PERCENTAGE / 100)
            fiat_amount = amount  # Input is fiat
            spread_amount = amount * (self.SPREAD_PERCENTAGE / 100)
            fee = amount * (self.NETWORK_FEE_PERCENTAGE / 100)
            crypto_amount = (amount - fee) / otc_price
            total = amount + spread_amount + fee

        else:  # sell
            # For sell: spread decreases price
            otc_price = price * (1 - self.SPREAD_PERCENTAGE / 100)
            crypto_amount = amount  # Input is crypto
            fiat_before_fees = amount * otc_price  # Value in fiat BEFORE fees
            spread_amount = fiat_before_fees * (self.SPREAD_PERCENTAGE / 100)
            fee = fiat_before_fees * (self.NETWORK_FEE_PERCENTAGE / 100)
            fiat_amount = fiat_before_fees  # Fiat amount before fees (for display)
            total = fiat_before_fees - spread_amount - fee  # Net amount user receives

        # Generate quote ID
        quote_id = f"quote_{uuid.uuid4().hex[:12]}"
        expires_at = datetime.now() + timedelta(seconds=self.QUOTE_VALIDITY_SECONDS)

        quote_data = {
            "quote_id": quote_id,
            "operation": operation,
            "symbol": symbol_upper,
            "crypto_price": float(price),
            "fiat_amount": float(fiat_amount),
            "crypto_amount": float(crypto_amount),
            "spread_percentage": float(self.SPREAD_PERCENTAGE),
            "spread_amount": float(spread_amount),
            "network_fee_percentage": float(self.NETWORK_FEE_PERCENTAGE),
            "network_fee_amount": float(fee),
            "total_amount": float(total),
            "expires_in_seconds": self.QUOTE_VALIDITY_SECONDS,
            "expires_at": expires_at.isoformat(),
        }

        # Cache the quote
        _quote_cache[quote_id] = quote_data
        
        # Clean old quotes (every time we generate a new one)
        self._cleanup_expired_quotes()

        return quote_data

    def _cleanup_expired_quotes(self):
        """Remove expired quotes from cache"""
        current_time = datetime.now()
        expired_quotes = [
            qid for qid, qdata in _quote_cache.items()
            if datetime.fromisoformat(qdata.get("expires_at", "")) < current_time
        ]
        for qid in expired_quotes:
            del _quote_cache[qid]

    def get_cached_quote(self, quote_id: str) -> Dict[str, Any]:
        """Get a cached quote by ID"""
        quote = _quote_cache.get(quote_id)
        if not quote:
            raise ValidationError("Quote not found or expired")
        
        # Check if expired
        expires_at = datetime.fromisoformat(quote.get("expires_at", ""))
        if expires_at < datetime.now():
            del _quote_cache[quote_id]
            raise ValidationError("Quote has expired")
        
        return quote

    def create_trade_from_quote(self, user_id: str, quote_id: str, payment_method: str) -> Dict[str, Any]:
        """Create trade from a cached quote"""
        # Get the quote from cache
        quote = self.get_cached_quote(quote_id)
        
        operation = quote["operation"]
        symbol = quote["symbol"]
        fiat_amount = Decimal(str(quote["fiat_amount"]))
        crypto_amount = Decimal(str(quote["crypto_amount"]))
        
        trade_id = str(uuid.uuid4())
        reference_code = f"OTC-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        expires_at = datetime.now() + timedelta(minutes=self.TRADE_EXPIRATION_MINUTES)

        trade = InstantTrade(
            id=trade_id,
            user_id=user_id,
            operation_type=operation,
            symbol=symbol,
            fiat_amount=fiat_amount,
            crypto_amount=crypto_amount,
            crypto_price=Decimal(str(quote["crypto_price"])),
            spread_percentage=Decimal(str(quote["spread_percentage"])),
            spread_amount=Decimal(str(quote["spread_amount"])),
            network_fee_percentage=Decimal(str(quote["network_fee_percentage"])),
            network_fee_amount=Decimal(str(quote["network_fee_amount"])),
            total_amount=Decimal(str(quote["total_amount"])),
            payment_method=payment_method,
            status=TradeStatus.PENDING,
            reference_code=reference_code,
            expires_at=expires_at,
        )

        self.db.add(trade)
        self.db.commit()

        # Create history record for trade creation
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=None,
            new_status=TradeStatus.PENDING,
            reason="Trade created from quote",
            history_details=f"Quote ID: {quote_id}, Payment method: {payment_method}"
        )
        self.db.add(history)
        self.db.commit()

        logger.info(f"Trade created from quote: {reference_code}")

        # Remove quote from cache after using it
        del _quote_cache[quote_id]

        return {
            "trade_id": trade.id,
            "reference_code": reference_code,
            "status": TradeStatus.PENDING.value,
            "operation": operation,
            "symbol": symbol,
            "fiat_amount": float(fiat_amount),
            "crypto_amount": float(crypto_amount),
            "total_amount": float(quote["total_amount"]),
            "expires_at": expires_at.isoformat(),
        }

    async def create_trade(self, user_id: str, operation: str, symbol: str, amount: Decimal, payment_method: str) -> Dict[str, Any]:
        """Create new trade (legacy method for backward compatibility)"""
        quote = await self.calculate_quote(operation, symbol, amount)

        trade_id = str(uuid.uuid4())
        reference_code = f"OTC-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"
        expires_at = datetime.now() + timedelta(minutes=self.TRADE_EXPIRATION_MINUTES)

        trade = InstantTrade(
            id=trade_id,
            user_id=user_id,
            operation_type=operation,
            symbol=symbol,
            fiat_amount=Decimal(str(quote["fiat_amount"])),
            crypto_amount=Decimal(str(quote["crypto_amount"])),
            crypto_price=Decimal(str(quote["crypto_price"])),
            spread_percentage=self.SPREAD_PERCENTAGE,
            spread_amount=Decimal(str(quote["spread_amount"])),
            network_fee_percentage=self.NETWORK_FEE_PERCENTAGE,
            network_fee_amount=Decimal(str(quote["network_fee_amount"])),
            total_amount=Decimal(str(quote["total_amount"])),
            payment_method=payment_method,
            status=TradeStatus.PENDING,
            reference_code=reference_code,
            expires_at=expires_at,
        )

        self.db.add(trade)
        self.db.commit()

        # Create history record for trade creation
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=None,
            new_status=TradeStatus.PENDING,
            reason="Trade created directly",
            history_details=f"Operation: {operation}, Symbol: {symbol}, Amount: {amount}"
        )
        self.db.add(history)
        self.db.commit()

        logger.info(f"Trade created: {reference_code}")

        return {
            "id": trade.id,
            "reference_code": reference_code,
            "status": TradeStatus.PENDING.value,
            "operation": operation,
            "symbol": symbol,
            "fiat_amount": float(quote["fiat_amount"]),
            "crypto_amount": float(quote["crypto_amount"]),
            "total_amount": float(quote["total_amount"]),
            "expires_at": expires_at.isoformat(),
        }

    def get_trade_status(self, trade_id: str) -> Dict[str, Any]:
        """Get trade status"""
        trade = self.db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()

        if not trade:
            raise ValidationError("Trade not found")

        return {
            "id": trade.id,
            "reference_code": trade.reference_code,
            "status": trade.status.value,
            "operation": trade.operation_type,
            "symbol": trade.symbol,
            "fiat_amount": float(trade.fiat_amount),  # type: ignore
            "crypto_amount": float(trade.crypto_amount),  # type: ignore
            "total_amount": float(trade.total_amount),  # type: ignore
            "created_at": trade.created_at.isoformat(),
        }

    def cancel_trade(self, trade_id: str) -> bool:
        """Cancel pending trade"""
        trade = self.db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()

        if not trade:
            raise ValidationError("Trade not found")

        old_status = trade.status
        trade.status = TradeStatus.CANCELLED  # type: ignore
        self.db.commit()

        # Create history record
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=TradeStatus.CANCELLED,
            reason="Trade cancelled by user",
            history_details="User initiated cancellation"
        )
        self.db.add(history)
        self.db.commit()

        logger.info(f"Trade cancelled: {trade.reference_code}")
        return True

    def confirm_payment(self, trade_id: str, payment_proof_url: Optional[str] = None) -> Dict[str, Any]:
        """Confirm payment and mark trade as completed"""
        trade = self.db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()

        if not trade:
            raise ValidationError("Trade not found")

        if trade.status.value != TradeStatus.PENDING.value:
            raise ValidationError(f"Can only confirm payment for pending trades. Current status: {trade.status.value}")

        old_status = trade.status
        trade.status = TradeStatus.PAYMENT_CONFIRMED  # type: ignore
        trade.payment_confirmed_at = datetime.now()  # type: ignore
        if payment_proof_url:
            trade.payment_proof_url = payment_proof_url  # type: ignore
        self.db.commit()

        # Create history record for payment confirmation
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=TradeStatus.PAYMENT_CONFIRMED,
            reason="Payment confirmed",
            history_details=f"Payment received at {datetime.now().isoformat()}"
        )
        self.db.add(history)
        self.db.commit()

        logger.info(f"Payment confirmed for trade: {trade.reference_code}")

        confirmed_at = trade.payment_confirmed_at.isoformat() if trade.payment_confirmed_at is not None else None
        return {
            "trade_id": trade.id,
            "reference_code": trade.reference_code,
            "status": trade.status.value,
            "payment_confirmed_at": confirmed_at,
        }

    def complete_trade(self, trade_id: str) -> Dict[str, Any]:
        """Mark trade as completed"""
        trade = self.db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()

        if not trade:
            raise ValidationError("Trade not found")

        if trade.status.value != TradeStatus.PAYMENT_CONFIRMED.value:
            raise ValidationError(f"Can only complete trades with confirmed payment. Current status: {trade.status.value}")

        old_status = trade.status
        trade.status = TradeStatus.COMPLETED  # type: ignore
        trade.completed_at = datetime.now()  # type: ignore
        self.db.commit()

        # Create history record for completion
        history = InstantTradeHistory(
            trade_id=trade.id,
            old_status=old_status,
            new_status=TradeStatus.COMPLETED,
            reason="Trade completed successfully",
            history_details=f"Crypto transferred to user wallet at {datetime.now().isoformat()}"
        )
        self.db.add(history)
        self.db.commit()

        logger.info(f"Trade completed: {trade.reference_code}")

        completed_at = trade.completed_at.isoformat() if trade.completed_at is not None else None
        return {
            "trade_id": trade.id,
            "reference_code": trade.reference_code,
            "status": trade.status.value,
            "completed_at": completed_at,
        }

    def get_trade_history(self, trade_id: str) -> Dict[str, Any]:
        """Get complete history of a trade"""
        trade = self.db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()

        if not trade:
            raise ValidationError("Trade not found")

        history_records = self.db.query(InstantTradeHistory).filter(
            InstantTradeHistory.trade_id == trade_id
        ).order_by(InstantTradeHistory.created_at).all()

        return {
            "trade_id": trade.id,
            "reference_code": trade.reference_code,
            "current_status": trade.status.value,
            "history": [
                {
                    "timestamp": record.created_at.isoformat(),
                    "old_status": record.old_status.value if record.old_status is not None else None,
                    "new_status": record.new_status.value,
                    "reason": record.reason,
                    "details": record.history_details,
                }
                for record in history_records
            ]
        }

    def get_user_trades(self, user_id: str, page: int = 1, per_page: int = 10) -> Dict[str, Any]:
        """Get user's trade history"""
        query = self.db.query(InstantTrade).filter(InstantTrade.user_id == user_id)
        total = query.count()

        trades = query.offset((page - 1) * per_page).limit(per_page).all()

        return {
            "trades": [
                {
                    "id": t.id,
                    "reference_code": t.reference_code,
                    "operation": t.operation_type,
                    "symbol": t.symbol,
                    "fiat_amount": float(t.fiat_amount),  # type: ignore
                    "crypto_amount": float(t.crypto_amount),  # type: ignore
                    "status": t.status.value,
                    "created_at": t.created_at.isoformat(),
                }
                for t in trades
            ],
            "total": total,
            "page": page,
            "per_page": per_page,
        }


def get_instant_trade_service(db: Session) -> InstantTradeService:
    """Get service instance"""
    return InstantTradeService(db)
