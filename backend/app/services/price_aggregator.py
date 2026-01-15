"""
Price Data Aggregator Service
Centralizes price fetching from multiple sources (CoinGecko, Binance, etc.)
with intelligent fallback and caching strategy.
"""

import asyncio
import httpx
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)

@dataclass
class PriceData:
    """Price data structure"""
    symbol: str
    price: float
    change_24h: float
    market_cap: Optional[float] = None
    volume_24h: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    source: str = "coingecko"
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def is_stale(self, max_age_seconds: int = 300) -> bool:
        """Check if price data is older than max_age_seconds"""
        age = (datetime.now(timezone.utc) - self.timestamp).total_seconds()
        return age > max_age_seconds


class PriceSource:
    """Base class for price sources"""
    
    def __init__(self, timeout: float = 15.0):  # Aumentado para 15s
        self.timeout = timeout
    
    async def fetch_prices(
        self, 
        symbols: List[str], 
        currency: str = "usd"
    ) -> Dict[str, PriceData]:
        """Fetch prices from source"""
        raise NotImplementedError


class CoinGeckoSource(PriceSource):
    """CoinGecko API price source"""
    
    # Mapeamento de símbolos para IDs do CoinGecko
    SYMBOL_MAP = {
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'MATIC': 'polygon-ecosystem-token',
        'POL': 'polygon-ecosystem-token',  # POL é o novo nome de MATIC
        'POLYGON': 'polygon-ecosystem-token',  # Padronizado: aceitar POLYGON como símbolo
        'BNB': 'binancecoin', 'TRX': 'tron', 'BASE': 'base',
        'USDT': 'tether', 'SOL': 'solana', 'LTC': 'litecoin',
        'DOGE': 'dogecoin', 'ADA': 'cardano', 'AVAX': 'avalanche-2',
        'DOT': 'polkadot', 'LINK': 'chainlink', 'SHIB': 'shiba-inu',
        'XRP': 'ripple', 'BCH': 'bitcoin-cash', 'XLM': 'stellar',
        'ATOM': 'cosmos', 'NEAR': 'near', 'APE': 'apecoin',
        'USDC': 'usd-coin', 'DAI': 'dai',
    }
    
    async def fetch_prices(
        self, 
        symbols: List[str], 
        currency: str = "usd"
    ) -> Dict[str, PriceData]:
        """Fetch prices from CoinGecko"""
        try:
            # Validar símbolos
            coin_ids = []
            valid_symbols = []
            for symbol in symbols:
                coin_id = self.SYMBOL_MAP.get(symbol.upper())
                if coin_id:
                    coin_ids.append(coin_id)
                    valid_symbols.append(symbol.upper())
            
            if not coin_ids:
                logger.warning(f"No valid symbols found for CoinGecko: {symbols}")
                return {}
            
            # Fazer requisição
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                url = "https://api.coingecko.com/api/v3/simple/price"
                params = {
                    "ids": ",".join(coin_ids),
                    "vs_currencies": currency.lower(),
                    "include_market_cap": "true",
                    "include_24hr_vol": "true",
                    "include_24hr_change": "true"
                }
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                # Parsear resposta
                prices = {}
                for symbol, coin_id in zip(valid_symbols, coin_ids):
                    coin_data = data.get(coin_id, {})
                    price = coin_data.get(currency.lower(), 0)
                    
                    if price > 0:
                        change_24h = coin_data.get(f"{currency.lower()}_24h_change", 0) or 0
                        
                        # Estimar high_24h e low_24h a partir da variação
                        # Se a variação é positiva, o preço subiu - então low era menor
                        # Se negativa, o preço caiu - então high era maior
                        variation_factor = abs(change_24h) / 100
                        estimated_high = price * (1 + variation_factor * 0.5)
                        estimated_low = price * (1 - variation_factor * 0.5)
                        
                        # Garantir que high >= price >= low
                        if change_24h >= 0:
                            estimated_low = price / (1 + change_24h / 100) if change_24h > 0 else price * 0.98
                            estimated_high = price * 1.02
                        else:
                            estimated_high = price / (1 + change_24h / 100)  # change_24h é negativo
                            estimated_low = price * 0.98
                        
                        prices[symbol] = PriceData(
                            symbol=symbol,
                            price=float(price),
                            change_24h=change_24h,
                            market_cap=coin_data.get(f"{currency.lower()}_market_cap"),
                            volume_24h=coin_data.get(f"{currency.lower()}_24h_vol"),
                            high_24h=round(estimated_high, 6),
                            low_24h=round(estimated_low, 6),
                            source="coingecko",
                            timestamp=datetime.now(timezone.utc)
                        )
                
                logger.info(f"CoinGecko: Fetched {len(prices)} prices successfully")
                return prices
                
        except asyncio.TimeoutError:
            logger.error("CoinGecko: Request timeout")
            return {}
        except asyncio.CancelledError:
            logger.warning("CoinGecko: Request cancelled")
            raise  # Re-raise para permitir shutdown graceful
        except httpx.HTTPStatusError as e:
            logger.error(f"CoinGecko: HTTP error {e.response.status_code}")
            return {}
        except Exception as e:
            logger.error(f"CoinGecko: Error fetching prices - {str(e)}")
            return {}


class BinanceSource(PriceSource):
    """Binance API price source (PRIMARY for BRL, supports USD)"""
    
    # Mapeamento de símbolos para pares Binance USD
    SYMBOL_MAP_USD = {
        'BTC': 'BTCUSDT', 'ETH': 'ETHUSDT', 'MATIC': 'POLUSDT',
        'POL': 'POLUSDT',  # POL é o novo nome de MATIC - usar POLUSDT
        'POLYGON': 'POLUSDT',  # Padronizado: aceitar POLYGON como símbolo
        'BNB': 'BNBUSDT', 'SOL': 'SOLUSDT', 'ADA': 'ADAUSDT',
        'AVAX': 'AVAXUSDT', 'DOT': 'DOTUSDT', 'LINK': 'LINKUSDT',
        'DOGE': 'DOGEUSDT', 'LTC': 'LTCUSDT', 'XRP': 'XRPUSDT',
        'USDC': 'USDCUSDT', 'TRX': 'TRXUSDT',
        # USDT e USDC não precisam de par USD - são stablecoins = $1.00
    }
    
    # Mapeamento de símbolos para pares Binance BRL
    SYMBOL_MAP_BRL = {
        'BTC': 'BTCBRL', 'ETH': 'ETHBRL', 'USDT': 'USDTBRL',
        'BNB': 'BNBBRL', 'SOL': 'SOLBRL', 'XRP': 'XRPBRL',
        'DOGE': 'DOGEBRL', 'ADA': 'ADABRL', 'DOT': 'DOTBRL',
        'MATIC': 'POLBRL', 'POL': 'POLBRL',  # POL é o novo nome - usar POLBRL
        'POLYGON': 'POLBRL',  # Padronizado: aceitar POLYGON como símbolo
        'AVAX': 'AVAXBRL', 'LINK': 'LINKBRL',
        'LTC': 'LTCBRL', 'USDC': 'USDCBRL',
    }
    
    # Stablecoins - retornam preço fixo em USD
    STABLECOINS = {'USDT', 'USDC', 'DAI', 'BUSD'}
    
    async def fetch_prices(
        self, 
        symbols: List[str], 
        currency: str = "usd"
    ) -> Dict[str, PriceData]:
        """Fetch prices from Binance (supports USD and BRL)"""
        currency_lower = currency.lower()
        
        # Selecionar mapeamento baseado na moeda
        if currency_lower == "brl":
            symbol_map = self.SYMBOL_MAP_BRL
        elif currency_lower == "usd":
            symbol_map = self.SYMBOL_MAP_USD
        else:
            logger.info(f"Binance: Currency {currency} not supported, only USD and BRL")
            return {}
        
        try:
            prices = {}
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                for symbol in symbols:
                    symbol_upper = symbol.upper()
                    
                    # Stablecoins em USD sempre retornam $1.00
                    if currency_lower == "usd" and symbol_upper in self.STABLECOINS:
                        prices[symbol_upper] = PriceData(
                            symbol=symbol_upper,
                            price=1.0,
                            change_24h=0.0,
                            high_24h=1.0,
                            low_24h=1.0,
                            volume_24h=0.0,
                            source="binance",
                            timestamp=datetime.now(timezone.utc)
                        )
                        continue
                    
                    pair = symbol_map.get(symbol_upper)
                    if not pair:
                        continue
                    
                    try:
                        # Fetch ticker - Binance tem high/low nativamente!
                        url = "https://api.binance.com/api/v3/ticker/24hr"
                        params = {"symbol": pair}
                        response = await client.get(url, params=params)
                        response.raise_for_status()
                        data = response.json()
                        
                        prices[symbol_upper] = PriceData(
                            symbol=symbol_upper,
                            price=float(data.get("lastPrice", 0)),
                            change_24h=float(data.get("priceChangePercent", 0)),
                            high_24h=float(data.get("highPrice", 0)),
                            low_24h=float(data.get("lowPrice", 0)),
                            volume_24h=float(data.get("quoteAssetVolume", 0)),
                            source="binance",
                            timestamp=datetime.now(timezone.utc)
                        )
                    except asyncio.CancelledError:
                        raise  # Re-raise para permitir shutdown graceful
                    except Exception as e:
                        logger.debug(f"Binance: Error fetching {pair} - {str(e)}")
                        continue
            
            if prices:
                logger.info(f"Binance: Fetched {len(prices)} prices in {currency.upper()} successfully")
            return prices
        
        except asyncio.CancelledError:
            logger.warning("Binance: Request cancelled")
            raise  # Re-raise para permitir shutdown graceful
        except Exception as e:
            logger.error(f"Binance: Error fetching prices - {str(e)}")
            return {}


class PriceCache:
    """Simple in-memory price cache for rate limiting external APIs"""
    
    def __init__(self):
        self.cache: Dict[str, Dict[str, PriceData]] = {}
        self.lock = asyncio.Lock()
    
    async def get(self, currency: str) -> Optional[Dict[str, PriceData]]:
        """Get cached prices for currency"""
        async with self.lock:
            return self.cache.get(currency.lower())
    
    async def set(self, currency: str, prices: Dict[str, PriceData]):
        """Set cached prices for currency"""
        async with self.lock:
            self.cache[currency.lower()] = prices
    
    async def is_stale(self, currency: str, max_age_seconds: int = 30) -> bool:
        """Check if cache is stale - default 30s for real-time trading"""
        prices = await self.get(currency)
        if not prices:
            return True
        
        # Check if any price is stale
        for price in prices.values():
            if price.is_stale(max_age_seconds):
                return True
        return False


class PriceAggregator:
    """Aggregates prices from multiple sources with fallback strategy"""
    
    def __init__(self):
        # Binance é PRIMÁRIO (preços mais precisos, especialmente BRL)
        # CoinGecko é FALLBACK (agregador, preços ~2% acima do mercado)
        self.binance_source = BinanceSource()
        self.coingecko_source = CoinGeckoSource()
        self.cache = PriceCache()
        self.cache_ttl = 60  # 60 segundos - evita rate limiting e timeouts
    
    async def get_prices(
        self,
        symbols: List[str],
        currency: str = "usd",
        force_refresh: bool = False
    ) -> Dict[str, PriceData]:
        """
        Get prices from cache or sources with fallback strategy
        
        Priority:
        - BRL: Binance (primary) → CoinGecko (fallback)
        - USD: Binance (primary) → CoinGecko (fallback)
        
        Args:
            symbols: List of crypto symbols (BTC, ETH, etc.)
            currency: Target currency (usd, brl, eur)
            force_refresh: Force fetch from sources, ignore cache
        
        Returns:
            Dict mapping symbol to PriceData
        """
        currency = currency.lower()
        
        # Normalizar símbolos: POL → MATIC (POL é o novo nome de MATIC)
        # E remover duplicatas
        normalized_symbols = []
        seen = set()
        for s in symbols:
            symbol = 'MATIC' if s.upper() == 'POL' else s.upper()
            if symbol not in seen:
                seen.add(symbol)
                normalized_symbols.append(symbol)
        
        symbols = normalized_symbols
        
        # Check cache first
        if not force_refresh and not await self.cache.is_stale(currency, self.cache_ttl):
            cached_prices = await self.cache.get(currency)
            if cached_prices:
                logger.debug(f"Cache hit for {currency}")
                # Filter to requested symbols
                return {s: cached_prices[s] for s in symbols if s in cached_prices}
        
        # Try sources in order: Binance (primary) → CoinGecko (fallback)
        all_prices = {}
        remaining_symbols = set(symbols)
        
        try:
            # 1. Try Binance first (more accurate prices, especially for BRL)
            if remaining_symbols:
                logger.info(f"🔵 Binance (PRIMARY): Fetching {remaining_symbols} in {currency.upper()}")
                binance_prices = await self.binance_source.fetch_prices(
                    list(remaining_symbols),
                    currency
                )
                if binance_prices:
                    all_prices.update(binance_prices)
                    remaining_symbols -= set(binance_prices.keys())
                    logger.info(f"✅ Binance: Got {len(binance_prices)} prices")
            
            # 2. Fallback to CoinGecko for remaining symbols
            if remaining_symbols:
                logger.info(f"🟡 CoinGecko (FALLBACK): Fetching {remaining_symbols} in {currency.upper()}")
                coingecko_prices = await self.coingecko_source.fetch_prices(
                    list(remaining_symbols),
                    currency
                )
                if coingecko_prices:
                    all_prices.update(coingecko_prices)
                    remaining_symbols -= set(coingecko_prices.keys())
                    logger.info(f"✅ CoinGecko: Got {len(coingecko_prices)} prices (fallback)")
        except asyncio.CancelledError:
            logger.warning(f"⚠️ Price fetch cancelled for {currency.upper()}")
            raise  # Re-raise para permitir shutdown graceful
        
        # Cache successful prices
        if all_prices:
            await self.cache.set(currency, all_prices)
            logger.info(f"📦 Cached {len(all_prices)} prices for {currency.upper()}")
        
        if remaining_symbols:
            logger.warning(f"⚠️ Failed to fetch prices for: {remaining_symbols}")
        
        return all_prices
    
    async def get_single_price(
        self,
        symbol: str,
        currency: str = "usd"
    ) -> Optional[PriceData]:
        """Get price for single symbol"""
        prices = await self.get_prices([symbol], currency)
        return prices.get(symbol.upper())


# Global aggregator instance
price_aggregator = PriceAggregator()


async def get_price_aggregator() -> PriceAggregator:
    """Dependency for FastAPI"""
    return price_aggregator
