"""
💱 HOLD Wallet - Instant Trade OTC Service
==========================================

Business logic for OTC trading operations.
Simple, professional, and scalable.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
import logging
import asyncio

from app.models.instant_trade import InstantTrade, InstantTradeHistory, TradeStatus, PaymentMethod
from app.models.quote_cache import QuoteCache
from app.core.exceptions import ValidationError
from app.services.price_aggregator import price_aggregator
from app.services.platform_settings_service import platform_settings_service

logger = logging.getLogger(__name__)

# Cache de cotações em memória (usado como fallback local)
# Em produção, as quotes são persistidas no banco via QuoteCache
_quote_cache: Dict[str, Dict[str, Any]] = {}


class InstantTradeService:
    """Service for OTC trading operations"""

    # Default Constants (usados como fallback se o banco não tiver)
    DEFAULT_SPREAD_PERCENTAGE = Decimal("3.00")
    DEFAULT_NETWORK_FEE_PERCENTAGE = Decimal("0.25")
    QUOTE_VALIDITY_SECONDS = 120  # 120 segundos (2 minutos) para dar tempo ao usuário
    TRADE_EXPIRATION_MINUTES = 15
    MIN_TRADE_AMOUNT_BRL = Decimal("50.00")
    MAX_TRADE_AMOUNT_BRL = Decimal("50000.00")

    def __init__(self, db: Session):
        self.db = db
    
    def _parse_expires_at(self, expires_at_str: str) -> datetime:
        """Parse expires_at string to timezone-aware datetime"""
        if not expires_at_str:
            return datetime.min.replace(tzinfo=timezone.utc)
        try:
            dt = datetime.fromisoformat(expires_at_str)
            # Se não tem timezone, assume UTC
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return datetime.min.replace(tzinfo=timezone.utc)
    
    def _get_utc_now(self) -> datetime:
        """Get current UTC time (timezone-aware)"""
        return datetime.now(timezone.utc)
    
    @property
    def SPREAD_PERCENTAGE(self) -> Decimal:
        """Obtém spread OTC das configurações do banco de dados"""
        try:
            spread = platform_settings_service.get(self.db, "otc_spread_percentage", None)
            if spread is not None:
                return Decimal(str(spread))
        except Exception as e:
            logger.warning(f"⚠️ Erro ao buscar otc_spread_percentage: {e}")
        return self.DEFAULT_SPREAD_PERCENTAGE
    
    @property
    def NETWORK_FEE_PERCENTAGE(self) -> Decimal:
        """Obtém taxa de rede das configurações do banco de dados"""
        try:
            fee = platform_settings_service.get(self.db, "network_fee_percentage", None)
            if fee is not None:
                return Decimal(str(fee))
        except Exception as e:
            logger.warning(f"⚠️ Erro ao buscar network_fee_percentage: {e}")
        return self.DEFAULT_NETWORK_FEE_PERCENTAGE

    async def get_current_price(self, symbol: str) -> Decimal:
        """Get current crypto price from price_aggregator API (ALWAYS real-time, NO fallback)"""
        symbol_upper = symbol.upper()
        
        # Stablecoins sempre têm preço fixo de $1.00
        if symbol_upper in ["USDT", "USDC", "DAI", "BUSD"]:
            logger.info(f"Returning fixed price $1.00 for stablecoin {symbol_upper}")
            return Decimal("1.00")
        
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
            # For buy: usuário PAGA spread + taxa de rede (ambos são revenue da plataforma)
            fiat_amount = amount  # Input: quanto o usuário quer gastar (total)
            
            # Taxa de rede: cobrada do valor total
            fee = fiat_amount * (self.NETWORK_FEE_PERCENTAGE / 100)
            
            # Valor disponível para comprar crypto (após taxa de rede)
            fiat_after_fee = fiat_amount - fee
            
            # Preço OTC: mercado + spread (usuário paga mais caro)
            otc_price = price * (1 + self.SPREAD_PERCENTAGE / 100)
            
            # Spread: diferença paga pelo usuário
            market_crypto = fiat_after_fee / price  # Quanto compraria no mercado
            otc_crypto = fiat_after_fee / otc_price  # Quanto compra com spread
            spread_amount = (market_crypto - otc_crypto) * price  # Perda em fiat
            
            # Crypto recebido: menos devido ao preço OTC mais alto
            crypto_amount = fiat_after_fee / otc_price
            
            # Total: usuário paga o valor que especificou
            total = fiat_amount

        else:  # sell
            # For sell: usuário vende para a plataforma
            # Plataforma compra ABAIXO do mercado (spread) e cobra taxa
            crypto_amount = amount  # Input is crypto (quanto o usuário está vendendo)
            
            # 1. Valor de mercado (preço justo, sem spreads)
            market_value = amount * price
            
            # 2. Spread: plataforma compra X% mais barato (LUCRO da plataforma)
            spread_amount = market_value * (self.SPREAD_PERCENTAGE / 100)
            
            # 3. Preço OTC: quanto a plataforma efetivamente paga por unidade
            otc_price = price * (1 - self.SPREAD_PERCENTAGE / 100)
            
            # 4. Valor OTC: quanto a plataforma paga no total (mercado - spread)
            otc_value = market_value - spread_amount  # ou: amount * otc_price
            
            # 5. Taxa de rede: cobrada sobre o valor OTC (LUCRO adicional da plataforma)
            fee = otc_value * (self.NETWORK_FEE_PERCENTAGE / 100)
            
            # 6. Valores para exibição
            fiat_amount = market_value  # Mostrar valor de mercado para comparação
            
            # 7. Total: quanto o usuário efetivamente recebe
            # = Valor OTC - Taxa de rede
            # = (Mercado - Spread) - Taxa
            total = otc_value - fee

        # Generate quote ID
        quote_id = f"quote_{uuid.uuid4().hex[:12]}"
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=self.QUOTE_VALIDITY_SECONDS)

        # Mapeamento de símbolos para nomes
        CRYPTO_NAMES = {
            "BTC": "Bitcoin",
            "ETH": "Ethereum",
            "USDT": "Tether USD",
            "USDC": "USD Coin",
            "MATIC": "Polygon",
            "POL": "Polygon",
            "BNB": "Binance Coin",
            "SOL": "Solana",
            "XRP": "Ripple",
            "ADA": "Cardano",
            "DOGE": "Dogecoin",
            "DOT": "Polkadot",
            "AVAX": "Avalanche",
            "LINK": "Chainlink",
            "LTC": "Litecoin",
            "UNI": "Uniswap",
            "SHIB": "Shiba Inu",
        }

        crypto_name = CRYPTO_NAMES.get(symbol_upper, symbol_upper)

        quote_data = {
            "quote_id": quote_id,
            "operation": operation,
            "symbol": symbol_upper,
            "name": crypto_name,
            "crypto_price": float(price),  # Preço de mercado (sem spread)
            "otc_price": float(otc_price),  # Preço OTC (com spread aplicado)
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
        
        # Persistir no banco de dados para produção (múltiplos workers)
        try:
            db_quote = QuoteCache(
                quote_id=quote_id,
                expires_at=expires_at
            )
            db_quote.set_data(quote_data)
            self.db.add(db_quote)
            self.db.commit()
            logger.info(f"✅ Quote {quote_id} salva no banco de dados")
        except Exception as e:
            logger.warning(f"⚠️ Erro ao salvar quote no DB (usando cache memória): {e}")
            self.db.rollback()
        
        # Clean old quotes (every time we generate a new one)
        self._cleanup_expired_quotes()

        return quote_data

    def _cleanup_expired_quotes(self):
        """Remove expired quotes from cache (memory and database)"""
        current_time = datetime.now(timezone.utc)
        
        # Limpa cache em memória
        expired_quotes = [
            qid for qid, qdata in _quote_cache.items()
            if self._parse_expires_at(qdata.get("expires_at", "")) < current_time
        ]
        for qid in expired_quotes:
            del _quote_cache[qid]
        
        # Limpa banco de dados (quotes expiradas há mais de 1 hora)
        try:
            cleanup_time = current_time - timedelta(hours=1)
            self.db.query(QuoteCache).filter(QuoteCache.expires_at < cleanup_time).delete()
            self.db.commit()
        except Exception as e:
            logger.debug(f"Cleanup DB quotes: {e}")
            self.db.rollback()

    def get_cached_quote(self, quote_id: str) -> Dict[str, Any]:
        """Get a cached quote by ID (from memory or database)"""
        current_time = self._get_utc_now()
        
        # 1. Tenta cache em memória primeiro (mesmo worker)
        quote = _quote_cache.get(quote_id)
        if quote:
            expires_at = self._parse_expires_at(quote.get("expires_at", ""))
            if expires_at >= current_time:
                logger.info(f"✅ Quote {quote_id} encontrada em memória")
                return quote
            else:
                del _quote_cache[quote_id]
        
        # 2. Tenta buscar do banco de dados (outro worker pode ter criado)
        try:
            db_quote = self.db.query(QuoteCache).filter(
                QuoteCache.quote_id == quote_id
            ).first()
            
            if db_quote:
                # Compare with naive datetime (db stores naive UTC)
                db_expires = db_quote.expires_at
                if db_expires.tzinfo is None:
                    db_expires = db_expires.replace(tzinfo=timezone.utc)
                
                if db_expires >= current_time:
                    quote_data = db_quote.get_data()
                    # Atualiza cache local para próximas chamadas
                    _quote_cache[quote_id] = quote_data
                    logger.info(f"✅ Quote {quote_id} encontrada no banco de dados")
                    return quote_data
                else:
                    # Expirada, remove
                    self.db.delete(db_quote)
                    self.db.commit()
                    logger.info(f"⏰ Quote {quote_id} expirada, removida do DB")
        except Exception as e:
            logger.warning(f"⚠️ Erro ao buscar quote do DB: {e}")
        
        logger.warning(f"❌ Quote {quote_id} não encontrada (memory cache: {len(_quote_cache)} quotes)")
        raise ValidationError("Quote not found or expired")

    def create_trade_from_quote(
        self, 
        user_id: str, 
        quote_id: str, 
        payment_method: str,
        brl_amount: Optional[Decimal] = None,
        brl_total_amount: Optional[Decimal] = None,
        usd_to_brl_rate: Optional[Decimal] = None,
        receiving_method_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create trade from a cached quote"""
        # Get the quote from cache
        quote = self.get_cached_quote(quote_id)
        
        operation = quote["operation"]
        symbol = quote["symbol"]
        name = quote.get("name", symbol)  # Fallback para symbol se name não existir
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
            name=name,
            fiat_amount=fiat_amount,
            crypto_amount=crypto_amount,
            crypto_price=Decimal(str(quote["crypto_price"])),
            spread_percentage=Decimal(str(quote["spread_percentage"])),
            spread_amount=Decimal(str(quote["spread_amount"])),
            network_fee_percentage=Decimal(str(quote["network_fee_percentage"])),
            network_fee_amount=Decimal(str(quote["network_fee_amount"])),
            total_amount=Decimal(str(quote["total_amount"])),
            # Valores em BRL para TED/PIX
            brl_amount=brl_amount,
            brl_total_amount=brl_total_amount,
            usd_to_brl_rate=usd_to_brl_rate,
            payment_method=payment_method,
            receiving_method_id=receiving_method_id,
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

        # Remove quote from cache after using it (memory and database)
        if quote_id in _quote_cache:
            del _quote_cache[quote_id]
        try:
            self.db.query(QuoteCache).filter(QuoteCache.quote_id == quote_id).delete()
            self.db.commit()
        except Exception as e:
            # IMPORTANTE: Fazer rollback para limpar transação abortada
            logger.debug(f"Error deleting quote from cache: {e}")
            self.db.rollback()

        result = {
            "trade_id": trade.id,
            "reference_code": reference_code,
            "status": trade.status.value,
            "operation": operation,
            "symbol": symbol,
            "fiat_amount": float(fiat_amount),
            "crypto_amount": float(crypto_amount),
            "total_amount": float(quote["total_amount"]),
            "expires_at": expires_at.isoformat(),
        }

        # VENDA (SELL): Processar automaticamente
        # Fluxo automático:
        # 1. Usuário cria pedido de venda -> Status: PENDING
        # 2. Sistema automaticamente retira crypto do usuário -> Status: CRYPTO_RECEIVED
        # 3. Admin só precisa enviar PIX e finalizar
        
        if operation == "sell":
            logger.info(f"🔄 Ordem de VENDA criada: {reference_code} - Processando automaticamente...")
            logger.info(f"Crypto: {trade.crypto_amount} {trade.symbol}")
            logger.info(f"Valor BRL: R$ {trade.fiat_amount}")
            
            try:
                from app.services.blockchain_withdraw_service import blockchain_withdraw_service
                
                # Determinar rede (polygon é mais barato para USDT/USDC)
                network = "polygon"
                
                # Executar withdraw automático (transferência do usuário para plataforma)
                withdraw_result = blockchain_withdraw_service.withdraw_crypto_from_user(
                    db=self.db,
                    trade=trade,
                    network=network
                )
                
                if withdraw_result["success"]:
                    logger.info(f"✅ SELL automático OK! TX: {withdraw_result['tx_hash']}")
                    
                    # Atualizar trade no banco
                    trade.status = TradeStatus.CRYPTO_RECEIVED
                    trade.tx_hash = withdraw_result["tx_hash"]
                    trade.network = network
                    
                    # Histórico
                    history_auto = InstantTradeHistory(
                        trade_id=trade.id,
                        old_status=TradeStatus.PENDING,
                        new_status=TradeStatus.CRYPTO_RECEIVED,
                        reason="Crypto retirada automaticamente do usuário",
                        history_details=f"TX: {withdraw_result['tx_hash']}, Network: {network}, Automático: Sim"
                    )
                    self.db.add(history_auto)
                    self.db.commit()
                    
                    # Atualizar result para refletir novo status
                    result["status"] = TradeStatus.CRYPTO_RECEIVED.value
                    result["tx_hash"] = withdraw_result["tx_hash"]
                    result["auto_processed"] = True
                    
                else:
                    logger.warning(f"⚠️ SELL automático falhou: {withdraw_result.get('error')}")
                    logger.info("Trade permanece PENDING - Admin deve processar manualmente")
                    result["auto_processed"] = False
                    result["auto_error"] = withdraw_result.get("error")
                    
            except Exception as auto_sell_error:
                logger.error(f"❌ Erro no SELL automático: {str(auto_sell_error)}")
                logger.info("Trade permanece PENDING - Admin deve processar manualmente")
                result["auto_processed"] = False
                result["auto_error"] = str(auto_sell_error)
        
        return result

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
        """Get trade status with full details"""
        trade = self.db.query(InstantTrade).filter(InstantTrade.id == trade_id).first()

        if not trade:
            raise ValidationError("Trade not found")

        # Buscar detalhes do método de recebimento se existir
        receiving_method_details = None
        if trade.receiving_method_id:
            from sqlalchemy import text
            import json
            result = self.db.execute(
                text("SELECT * FROM payment_methods WHERE id = :method_id"),
                {"method_id": trade.receiving_method_id}
            )
            receiving_method = result.fetchone()
            if receiving_method:
                # Parse details JSON
                details = {}
                if receiving_method.details:
                    try:
                        details = json.loads(receiving_method.details) if isinstance(receiving_method.details, str) else receiving_method.details
                        if isinstance(details, str):
                            details = json.loads(details)
                    except (json.JSONDecodeError, TypeError):
                        details = {}
                
                receiving_method_details = {
                    "id": str(receiving_method.id),
                    "method_type": receiving_method.type,
                    "holder_name": details.get("holderName") or details.get("holder_name"),
                    "pix_key": details.get("keyValue") or details.get("pix_key"),
                    "pix_key_type": details.get("keyType") or details.get("pix_key_type"),
                    "bank_name": details.get("bankName") or details.get("bank_name"),
                    "bank_code": details.get("bankCode") or details.get("bank_code"),
                    "account_number": details.get("accountNumber") or details.get("account_number"),
                    "account_type": details.get("accountType") or details.get("account_type"),
                    "branch_number": details.get("agency") or details.get("branch_number"),
                }

        return {
            "id": trade.id,
            "reference_code": trade.reference_code,
            "status": trade.status.value.upper() if hasattr(trade.status, 'value') else str(trade.status).upper(),
            "operation": trade.operation_type.value if hasattr(trade.operation_type, 'value') else trade.operation_type,
            "symbol": trade.symbol,
            "name": trade.name,
            "fiat_amount": float(trade.fiat_amount),  # type: ignore
            "crypto_amount": float(trade.crypto_amount),  # type: ignore
            "crypto_price": float(trade.crypto_price) if trade.crypto_price else None,  # type: ignore
            "total_amount": float(trade.total_amount),  # type: ignore
            # Valores em BRL para TED/PIX
            "brl_amount": float(trade.brl_amount) if trade.brl_amount else None,  # type: ignore
            "brl_total_amount": float(trade.brl_total_amount) if trade.brl_total_amount else None,  # type: ignore
            "usd_to_brl_rate": float(trade.usd_to_brl_rate) if trade.usd_to_brl_rate else None,  # type: ignore
            "spread_percentage": float(trade.spread_percentage) if trade.spread_percentage else 3.0,  # type: ignore
            "spread_amount": float(trade.spread_amount) if trade.spread_amount else None,  # type: ignore
            "network_fee_percentage": float(trade.network_fee_percentage) if trade.network_fee_percentage else 0.25,  # type: ignore
            "network_fee_amount": float(trade.network_fee_amount) if trade.network_fee_amount else None,  # type: ignore
            "payment_method": trade.payment_method.value if hasattr(trade.payment_method, 'value') else trade.payment_method,
            "receiving_method_id": trade.receiving_method_id,
            "receiving_method": receiving_method_details,
            "created_at": trade.created_at.isoformat() if trade.created_at else None,
            "updated_at": trade.updated_at.isoformat() if trade.updated_at else None,
            "expires_at": trade.expires_at.isoformat() if trade.expires_at else None,
            "payment_confirmed_at": trade.payment_confirmed_at.isoformat() if trade.payment_confirmed_at else None,
            "completed_at": trade.completed_at.isoformat() if trade.completed_at else None,
            "wallet_address": trade.wallet_address,
            "tx_hash": trade.tx_hash,
            "network": trade.network,
            # Campos PIX - Banco do Brasil (BB-AUTO)
            "pix_txid": trade.pix_txid,
            "pix_qrcode": trade.pix_qrcode,
            "pix_location": trade.pix_location,
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

        # 💰 REGISTRAR TAXAS NA CARTEIRA DO SISTEMA
        try:
            from app.services.system_blockchain_wallet_service import system_wallet_service
            from sqlalchemy import text
            from app.core.config import settings
            
            # Calcular taxas coletadas (spread + network fee)
            spread_amount = float(trade.spread_amount) if trade.spread_amount else 0.0
            network_fee = float(trade.network_fee_amount) if trade.network_fee_amount else 0.0
            total_fees = spread_amount + network_fee
            
            if total_fees > 0:
                # 1. Atualizar carteira contábil (system_wallets)
                try:
                    self.db.execute(text("""
                        UPDATE system_wallets
                        SET brl_balance = brl_balance + :fee_amount,
                            total_fees_collected_brl = total_fees_collected_brl + :fee_amount,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = :wallet_id
                    """), {"fee_amount": total_fees, "wallet_id": settings.SYSTEM_BLOCKCHAIN_WALLET_ID})
                    logger.info(f"💰 OTC Fee {total_fees} BRL added to system wallet (contábil)")
                except Exception as wallet_error:
                    logger.warning(f"Could not add fee to system wallet: {wallet_error}")
                
                # 2. Registrar spread na carteira blockchain
                if spread_amount > 0:
                    system_wallet_service.record_fee_collected(
                        db=self.db,
                        amount=spread_amount,
                        cryptocurrency="BRL",
                        network="ethereum",
                        trade_id=str(trade.id),
                        trade_type="otc_spread",
                        description=f"Spread {trade.spread_percentage}% do trade OTC {trade.reference_code}"
                    )
                
                # 3. Registrar network fee na carteira blockchain
                if network_fee > 0:
                    system_wallet_service.record_fee_collected(
                        db=self.db,
                        amount=network_fee,
                        cryptocurrency="BRL",
                        network="ethereum",
                        trade_id=str(trade.id),
                        trade_type="network_fee",
                        description=f"Taxa de rede {trade.network_fee_percentage}% do trade OTC {trade.reference_code}"
                    )
                
                logger.info(f"✅ OTC Fees recorded: spread={spread_amount}, network={network_fee}, total={total_fees}")
        except Exception as fee_error:
            logger.error(f"❌ Error recording OTC fees: {fee_error}")

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

        # 📊 UPDATE USER PORTFOLIO WITH COST BASIS
        try:
            from app.services.portfolio_service import portfolio_service
            
            # Get trade details
            crypto_symbol = trade.symbol.upper() if trade.symbol else ""
            crypto_amount = float(trade.crypto_amount) if trade.crypto_amount else 0
            unit_price = float(trade.unit_price) if trade.unit_price else 0
            user_id = int(trade.user_id) if trade.user_id else None
            operation = trade.operation_type.value if trade.operation_type else ""
            
            if user_id and crypto_amount > 0 and unit_price > 0:
                if operation == "buy":
                    # User bought crypto - add to portfolio with cost basis
                    asyncio.create_task(
                        portfolio_service.update_portfolio_on_buy(
                            db=self.db,
                            user_id=user_id,
                            symbol=crypto_symbol,
                            amount=crypto_amount,
                            price_usd=unit_price
                        )
                    )
                    logger.info(f"📊 Portfolio updated: +{crypto_amount} {crypto_symbol} @ ${unit_price}")
                elif operation == "sell":
                    # User sold crypto - remove from portfolio
                    asyncio.create_task(
                        portfolio_service.update_portfolio_on_sell(
                            db=self.db,
                            user_id=user_id,
                            symbol=crypto_symbol,
                            amount=crypto_amount
                        )
                    )
                    logger.info(f"📊 Portfolio updated: -{crypto_amount} {crypto_symbol}")
        except Exception as portfolio_error:
            logger.warning(f"⚠️ Could not update portfolio: {portfolio_error}")

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

        # Order by created_at descending (most recent first)
        trades = query.order_by(InstantTrade.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
        
        print(f"[get_user_trades] Found {len(trades)} trades for user {user_id}")
        for t in trades:
            print(f"[get_user_trades] Trade {t.id}: status={t.status}, operation={t.operation_type}")

        return {
            "trades": [
                {
                    "id": t.id,
                    "reference_code": t.reference_code,
                    "operation": t.operation_type.value if hasattr(t.operation_type, 'value') else t.operation_type,
                    "symbol": t.symbol,
                    "name": t.name,
                    "fiat_amount": float(t.fiat_amount),  # type: ignore
                    "crypto_amount": float(t.crypto_amount),  # type: ignore
                    "total_amount": float(t.total_amount) if t.total_amount else float(t.fiat_amount),  # type: ignore
                    "spread_percentage": float(t.spread_percentage) if t.spread_percentage else 3.0,  # type: ignore
                    "network_fee_percentage": float(t.network_fee_percentage) if t.network_fee_percentage else 0.25,  # type: ignore
                    "payment_method": t.payment_method.value if hasattr(t.payment_method, 'value') else t.payment_method,
                    "status": t.status.value.upper() if hasattr(t.status, 'value') else str(t.status).upper(),
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "updated_at": t.updated_at.isoformat() if t.updated_at else None,
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
