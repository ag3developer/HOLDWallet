"""
Price Service - Serviço para obter preços de criptomoedas
"""
import httpx
import asyncio
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.config import settings
from app.services.cache_service import cache_service, cached
import logging

logger = logging.getLogger(__name__)

class PriceService:
    """Serviço para obter preços de criptomoedas"""
    
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.coingecko_url = "https://api.coingecko.com/api/v3"
        self.coin_mapping = {
            # Bitcoin
            "bitcoin": "bitcoin",
            "btc": "bitcoin",
            # Ethereum
            "ethereum": "ethereum", 
            "eth": "ethereum",
            # Stablecoins
            "usdt": "tether",
            "tether": "tether",
            "usdc": "usd-coin",
            "usd-coin": "usd-coin",
            "dai": "dai",
            "busd": "binance-usd",
            # Binance
            "bnb": "binancecoin",
            "bsc": "binancecoin",
            "binancecoin": "binancecoin",
            # Polygon (POL - novo nome desde 2024)
            "matic": "polygon-ecosystem-token",
            "polygon": "polygon-ecosystem-token",
            "pol": "polygon-ecosystem-token",
            # Solana
            "sol": "solana",
            "solana": "solana",
            # Tron
            "trx": "tron",
            "tron": "tron",
            # Outros populares
            "xrp": "ripple",
            "ripple": "ripple",
            "ada": "cardano",
            "cardano": "cardano",
            "doge": "dogecoin",
            "dogecoin": "dogecoin",
            "dot": "polkadot",
            "polkadot": "polkadot",
            "avax": "avalanche-2",
            "avalanche": "avalanche-2",
            "link": "chainlink",
            "chainlink": "chainlink",
            "ltc": "litecoin",
            "litecoin": "litecoin",
            # Shiba Inu
            "shib": "shiba-inu",
            "shiba-inu": "shiba-inu",
        }
    
    @cached(ttl=60, key_prefix="price")
    async def get_price(self, symbol: str, currency: str = "USD") -> Optional[Dict]:
        """Obtém preço de uma criptomoeda"""
        try:
            coin_id = self.coin_mapping.get(symbol.lower())
            if not coin_id:
                logger.warning(f"Símbolo não encontrado: {symbol}")
                return None
            
            async with httpx.AsyncClient() as client:
                url = f"{self.coingecko_url}/simple/price"
                params = {
                    "ids": coin_id,
                    "vs_currencies": currency.lower(),
                    "include_market_cap": "true",
                    "include_24hr_vol": "true",
                    "include_24hr_change": "true"
                }
                
                if settings.COINGECKO_API_KEY:
                    params["x_cg_demo_api_key"] = settings.COINGECKO_API_KEY
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                coin_data = data.get(coin_id, {})
                
                if not coin_data:
                    return None
                
                return {
                    "symbol": symbol.upper(),
                    "currency": currency.upper(), 
                    "price": float(coin_data.get(f"{currency.lower()}", 0)),
                    "market_cap": coin_data.get(f"{currency.lower()}_market_cap"),
                    "volume_24h": coin_data.get(f"{currency.lower()}_24h_vol"),
                    "change_24h": coin_data.get(f"{currency.lower()}_24h_change"),
                    "last_updated": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Erro ao obter preço de {symbol}: {e}")
            return None
    
    async def get_current_prices(
        self, 
        symbols: List[str], 
        vs_currency: str = "usd"
    ) -> Dict[str, Dict[str, Any]]:
        """Obtém preços atuais para múltiplas criptomoedas"""
        prices = {}
        tasks = []
        
        for symbol in symbols:
            task = self.get_price(symbol, vs_currency)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for symbol, result in zip(symbols, results):
            if isinstance(result, Exception):
                logger.error(f"Erro ao obter preço de {symbol}: {result}")
                prices[symbol] = {}
            else:
                prices[symbol] = result or {}
        
        return prices
    
    async def get_price_history(
        self,
        symbol: str,
        vs_currency: str,
        days: int,
        interval: str = "daily"
    ) -> Dict[str, Any]:
        """Obtém histórico de preços"""
        try:
            coin_id = self.coin_mapping.get(symbol.lower())
            if not coin_id:
                return {"prices": [], "market_caps": [], "total_volumes": []}
            
            async with httpx.AsyncClient() as client:
                url = f"{self.coingecko_url}/coins/{coin_id}/market_chart"
                params = {
                    "vs_currency": vs_currency,
                    "days": days,
                    "interval": interval
                }
                
                if settings.COINGECKO_API_KEY:
                    params["x_cg_demo_api_key"] = settings.COINGECKO_API_KEY
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                return response.json()
                
        except Exception as e:
            logger.error(f"Erro ao obter histórico de {symbol}: {e}")
            return {"prices": [], "market_caps": [], "total_volumes": []}
    
    async def get_ohlc_data(
        self,
        symbol: str,
        days: int = 30
    ) -> List[List[float]]:
        """
        Get OHLC (candlestick) data from CoinGecko.
        
        Args:
            symbol: Crypto symbol (btc, eth, etc.)
            days: Number of days (1, 7, 14, 30, 90, 180, 365)
            
        Returns:
            List of [timestamp, open, high, low, close] arrays
        """
        try:
            coin_id = self.coin_mapping.get(symbol.lower())
            if not coin_id:
                logger.warning(f"Symbol {symbol} not found in mapping")
                return []
            
            async with httpx.AsyncClient() as client:
                url = f"{self.coingecko_url}/coins/{coin_id}/ohlc"
                params = {
                    "vs_currency": "usd",
                    "days": days
                }
                
                if settings.COINGECKO_API_KEY:
                    params["x_cg_demo_api_key"] = settings.COINGECKO_API_KEY
                
                response = await client.get(url, params=params, timeout=30.0)
                response.raise_for_status()
                
                data = response.json()
                logger.info(f"Got {len(data)} OHLC candles for {symbol}")
                return data
                
        except Exception as e:
            logger.error(f"Error getting OHLC data for {symbol}: {e}")
            return []
    
    async def get_supported_assets(
        self,
        page: int = 1,
        per_page: int = 100
    ) -> Dict[str, Any]:
        """Obtém criptomoedas suportadas"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.coingecko_url}/coins/list"
                params = {"include_platform": "false"}
                
                if settings.COINGECKO_API_KEY:
                    params["x_cg_demo_api_key"] = settings.COINGECKO_API_KEY
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                coins = response.json()
                
                # Paginação
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                paginated_coins = coins[start_idx:end_idx]
                
                return {
                    "coins": paginated_coins,
                    "total": len(coins),
                    "page": page,
                    "per_page": per_page
                }
                
        except Exception as e:
            logger.error(f"Erro ao obter moedas suportadas: {e}")
            return {"coins": []}
    
    async def get_trending_coins(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Obtém moedas em alta"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.coingecko_url}/search/trending"
                
                params = {}
                if settings.COINGECKO_API_KEY:
                    params["x_cg_demo_api_key"] = settings.COINGECKO_API_KEY
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                trending = data.get("coins", [])[:limit]
                
                result = []
                for coin in trending:
                    coin_info = coin.get("item", {})
                    result.append({
                        "id": coin_info.get("id"),
                        "name": coin_info.get("name"),
                        "symbol": coin_info.get("symbol"),
                        "rank": coin_info.get("market_cap_rank"),
                        "thumb": coin_info.get("thumb"),
                        "price_btc": coin_info.get("price_btc")
                    })
                
                return result
                
        except Exception as e:
            logger.error(f"Erro ao obter moedas em alta: {e}")
            return []
    
    async def search_assets(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Busca por criptomoedas"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.coingecko_url}/search"
                params = {"query": query}
                
                if settings.COINGECKO_API_KEY:
                    params["x_cg_demo_api_key"] = settings.COINGECKO_API_KEY
                
                response = await client.get(url, params=params)
                response.raise_for_status()
                
                search_results = response.json()
                coins = search_results.get("coins", [])[:limit]
                
                return coins
                
        except Exception as e:
            logger.error(f"Erro ao buscar moedas: {e}")
            return []
    
    async def calculate_portfolio_value(
        self, 
        holdings: Dict[str, float], 
        currency: str = "USD"
    ) -> Dict:
        """Calcula valor total do portfólio"""
        try:
            symbols = list(holdings.keys())
            prices = await self.get_current_prices(symbols, currency)
            
            total_value = 0
            asset_values = {}
            
            for symbol, amount in holdings.items():
                price_data = prices.get(symbol, {})
                if price_data and price_data.get("price"):
                    asset_value = float(amount) * price_data["price"]
                    asset_values[symbol] = {
                        "amount": amount,
                        "price": price_data["price"],
                        "value": asset_value,
                        "change_24h": price_data.get("change_24h", 0)
                    }
                    total_value += asset_value
                else:
                    asset_values[symbol] = {
                        "amount": amount,
                        "price": 0,
                        "value": 0,
                        "change_24h": 0,
                        "error": "Price not available"
                    }
            
            return {
                "total_value": total_value,
                "currency": currency.upper(),
                "assets": asset_values,
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erro ao calcular valor do portfólio: {e}")
            return {
                "total_value": 0,
                "currency": currency.upper(),
                "assets": {},
                "error": str(e),
                "last_updated": datetime.utcnow().isoformat()
            }


# Instância global do price service
price_service = PriceService()
