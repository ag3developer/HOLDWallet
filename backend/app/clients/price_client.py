import httpx
from typing import Dict, List, Optional, Any
from decimal import Decimal
from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import PriceServiceError

logger = get_logger("price_client")

class PriceClient:
    """Client for fetching cryptocurrency prices from external APIs."""
    
    def __init__(self):
        self.base_url = "https://api.coingecko.com/api/v3"
        self.timeout = 10.0
        
        # Symbol mapping for CoinGecko IDs
        self.symbol_mapping = {
            "btc": "bitcoin",
            "eth": "ethereum", 
            "matic": "polygon-ecosystem-token",  # POL é o novo nome de MATIC
            "pol": "polygon-ecosystem-token",    # POL é alias de MATIC
            "bnb": "binancecoin",
            "trx": "tron",
            "sol": "solana",
            "ltc": "litecoin",
            "doge": "dogecoin",
            "ada": "cardano",
            "avax": "avalanche-2",
            "dot": "polkadot",
            "link": "chainlink",
            "shib": "shiba-inu",
            "xrp": "ripple",
            "usdt": "tether",
            "usdc": "usd-coin",
            "dai": "dai",
            "tray": "trayon",  # Add TRAY token when available
        }
    
    async def get_prices(
        self, 
        symbols: List[str], 
        currencies: List[str] = ["usd", "brl"]
    ) -> Dict[str, Dict[str, float]]:
        """
        Get current prices for multiple cryptocurrencies.
        
        Args:
            symbols: List of crypto symbols (btc, eth, etc.)
            currencies: List of fiat currencies (usd, brl, etc.)
            
        Returns:
            Dict with structure: {"btc": {"usd": 50000, "brl": 250000}}
        """
        try:
            # Normalizar símbolos: POL → MATIC e remover duplicatas
            normalized_symbols = []
            seen = set()
            for s in symbols:
                symbol = 'matic' if s.lower() == 'pol' else s.lower()
                if symbol not in seen:
                    seen.add(symbol)
                    normalized_symbols.append(symbol)
            
            # Convert symbols to CoinGecko IDs
            coin_ids = []
            for symbol in normalized_symbols:
                coin_id = self.symbol_mapping.get(symbol.lower(), symbol.lower())
                coin_ids.append(coin_id)
            
            # Build request parameters
            params = {
                "ids": ",".join(coin_ids),
                "vs_currencies": ",".join([c.lower() for c in currencies]),
                "include_market_cap": "true",
                "include_24hr_vol": "true", 
                "include_24hr_change": "true",
                "include_last_updated_at": "true"
            }
            
            # Add API key if available
            if settings.COINGECKO_API_KEY:
                params["x_cg_demo_api_key"] = settings.COINGECKO_API_KEY
            
            # Make request
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/simple/price",
                    params=params
                )
                response.raise_for_status()
                data = response.json()
            
            # Convert response to expected format
            result = {}
            for i, symbol in enumerate(normalized_symbols):
                coin_id = coin_ids[i]
                if coin_id in data:
                    result[symbol.lower()] = {}
                    for currency in currencies:
                        currency_lower = currency.lower()
                        if currency_lower in data[coin_id]:
                            result[symbol.lower()][currency_lower] = data[coin_id][currency_lower]
                        else:
                            result[symbol.lower()][currency_lower] = 0.0
                else:
                    # Symbol not found, set to 0
                    result[symbol.lower()] = {c.lower(): 0.0 for c in currencies}
            
            logger.info(f"Fetched prices for {len(normalized_symbols)} symbols")
            return result
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching prices: {e}")
            raise PriceServiceError(f"Failed to fetch prices: {e}")
        except Exception as e:
            logger.error(f"Error fetching prices: {e}")
            raise PriceServiceError(f"Price service error: {e}")
    
    async def get_price(
        self, 
        symbol: str, 
        currency: str = "usd"
    ) -> Optional[float]:
        """
        Get current price for a single cryptocurrency.
        
        Args:
            symbol: Crypto symbol (btc, eth, etc.)
            currency: Fiat currency (usd, brl, etc.)
            
        Returns:
            Price as float or None if not found
        """
        try:
            prices = await self.get_prices([symbol], [currency])
            return prices.get(symbol.lower(), {}).get(currency.lower())
        except Exception as e:
            logger.error(f"Error fetching single price: {e}")
            return None
    
    async def get_market_data(self, symbol: str, currency: str = "usd") -> Dict[str, Any]:
        """
        Get detailed market data for a cryptocurrency.
        
        Args:
            symbol: Crypto symbol
            currency: Fiat currency
            
        Returns:
            Dict with detailed market data
        """
        try:
            coin_id = self.symbol_mapping.get(symbol.lower(), symbol.lower())
            
            params = {
                "vs_currency": currency.lower(),
                "market_cap": "true",
                "24hr_vol": "true",
                "24hr_change": "true",
                "circulating_supply": "true"
            }
            
            if settings.COINGECKO_API_KEY:
                params["x_cg_demo_api_key"] = settings.COINGECKO_API_KEY
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/coins/{coin_id}",
                    params=params
                )
                response.raise_for_status()
                data = response.json()
            
            # Extract relevant market data
            market_data = data.get("market_data", {})
            current_price = market_data.get("current_price", {}).get(currency.lower(), 0)
            
            result = {
                "symbol": symbol.lower(),
                "currency": currency.lower(),
                "price": current_price,
                "market_cap": market_data.get("market_cap", {}).get(currency.lower()),
                "volume_24h": market_data.get("total_volume", {}).get(currency.lower()),
                "price_change_24h": market_data.get("price_change_24h"),
                "price_change_percentage_24h": market_data.get("price_change_percentage_24h"),
                "circulating_supply": market_data.get("circulating_supply"),
                "total_supply": market_data.get("total_supply"),
                "max_supply": market_data.get("max_supply"),
                "last_updated": data.get("last_updated")
            }
            
            logger.info(f"Fetched market data for {symbol}")
            return result
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error fetching market data: {e}")
            raise PriceServiceError(f"Failed to fetch market data: {e}")
        except Exception as e:
            logger.error(f"Error fetching market data: {e}")
            raise PriceServiceError(f"Market data error: {e}")
    
    async def get_trending_coins(self) -> List[Dict[str, Any]]:
        """
        Get trending cryptocurrencies.
        
        Returns:
            List of trending coin data
        """
        try:
            params = {}
            if settings.COINGECKO_API_KEY:
                params["x_cg_demo_api_key"] = settings.COINGECKO_API_KEY
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/search/trending",
                    params=params
                )
                response.raise_for_status()
                data = response.json()
            
            trending = []
            for coin_data in data.get("coins", []):
                coin = coin_data.get("item", {})
                trending.append({
                    "id": coin.get("id"),
                    "symbol": coin.get("symbol"),
                    "name": coin.get("name"),
                    "market_cap_rank": coin.get("market_cap_rank"),
                    "thumb": coin.get("thumb"),
                    "price_btc": coin.get("price_btc")
                })
            
            logger.info(f"Fetched {len(trending)} trending coins")
            return trending
            
        except Exception as e:
            logger.error(f"Error fetching trending coins: {e}")
            raise PriceServiceError(f"Trending coins error: {e}")

# Global instance
price_client = PriceClient()
