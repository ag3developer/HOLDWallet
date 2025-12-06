"""
💱 HOLD Wallet - Exchange & Swap Service
========================================

Provides cryptocurrency swap functionality with revenue-generating
fees and integration with multiple DEX/CEX providers.

Author: HOLD Wallet Team
"""

from sqlalchemy.orm import Session
from typing import Optional, Dict, List, Any, Tuple
from datetime import datetime
from decimal import Decimal
import uuid
import logging

from app.core.exceptions import ValidationError
from app.services.billing import billing_service

logger = logging.getLogger(__name__)

class ExchangeService:
    """Service for handling crypto swaps and exchanges"""
    
    def __init__(self):
        # Fee structure (in basis points - 1 basis point = 0.01%)
        self.FEE_STRUCTURE = {
            "standard_swap": 50,     # 0.5% fee
            "cross_chain": 100,      # 1.0% fee for cross-chain swaps
            "fiat_onramp": 200,      # 2.0% fee for fiat purchases
            "instant_swap": 75,      # 0.75% fee for instant execution
            "limit_order": 25        # 0.25% fee for limit orders
        }
        
        # Supported trading pairs (mock data)
        self.SUPPORTED_PAIRS = {
            "BTC/USDT": {"min_amount": 0.001, "max_amount": 10, "liquidity": "high"},
            "ETH/USDT": {"min_amount": 0.01, "max_amount": 100, "liquidity": "high"},
            "SOL/USDT": {"min_amount": 1, "max_amount": 1000, "liquidity": "medium"},
            "BTC/ETH": {"min_amount": 0.001, "max_amount": 5, "liquidity": "high"},
            "ADA/USDT": {"min_amount": 10, "max_amount": 50000, "liquidity": "medium"},
            "AVAX/USDT": {"min_amount": 1, "max_amount": 1000, "liquidity": "medium"}
        }
        
        # Mock exchange rates (in production, fetch from real APIs)
        self.EXCHANGE_RATES = {
            "BTC": {"USDT": 42000, "ETH": 16.8, "SOL": 420},
            "ETH": {"USDT": 2500, "BTC": 0.0595, "SOL": 25},
            "SOL": {"USDT": 100, "BTC": 0.00238, "ETH": 0.04},
            "USDT": {"BTC": 0.0000238, "ETH": 0.0004, "SOL": 0.01},
            "ADA": {"USDT": 0.45, "BTC": 0.0000107, "ETH": 0.00018},
            "AVAX": {"USDT": 35, "BTC": 0.000833, "ETH": 0.014}
        }
    
    async def get_swap_quote(
        self,
        db: Session,
        user_id: str,
        from_asset: str,
        to_asset: str,
        amount: float,
        swap_type: str = "standard"
    ) -> Dict[str, Any]:
        """Get a quote for crypto swap"""
        try:
            # Normalize asset symbols
            from_asset = from_asset.upper()
            to_asset = to_asset.upper()
            
            # Check if trading pair is supported
            pair = f"{from_asset}/{to_asset}"
            reverse_pair = f"{to_asset}/{from_asset}"
            
            if pair not in self.SUPPORTED_PAIRS and reverse_pair not in self.SUPPORTED_PAIRS:
                raise ValidationError(f"Trading pair {pair} not supported")
            
            # Get exchange rate
            if from_asset in self.EXCHANGE_RATES and to_asset in self.EXCHANGE_RATES[from_asset]:
                rate = self.EXCHANGE_RATES[from_asset][to_asset]
            elif to_asset in self.EXCHANGE_RATES and from_asset in self.EXCHANGE_RATES[to_asset]:
                rate = 1 / self.EXCHANGE_RATES[to_asset][from_asset]
            else:
                raise ValidationError(f"Exchange rate not available for {pair}")
            
            # Calculate base amount
            base_output = amount * rate
            
            # Calculate fees
            fee_rate = self.FEE_STRUCTURE.get(f"{swap_type}_swap", self.FEE_STRUCTURE["standard_swap"])
            fee_amount = base_output * (fee_rate / 10000)  # Convert basis points to decimal
            final_output = base_output - fee_amount
            
            # Calculate slippage (mock - typically 0.1-0.5%)
            slippage = 0.003  # 0.3%
            min_output = final_output * (1 - slippage)
            
            # Estimate network fees (mock)
            network_fee = self._estimate_network_fee(from_asset, to_asset)
            
            quote = {
                "quote_id": str(uuid.uuid4()),
                "from_asset": from_asset,
                "to_asset": to_asset,
                "input_amount": amount,
                "output_amount": final_output,
                "minimum_output": min_output,
                "exchange_rate": rate,
                "our_fee_rate": fee_rate / 100,  # As percentage
                "our_fee_amount": fee_amount,
                "network_fee": network_fee,
                "slippage_tolerance": slippage * 100,
                "valid_until": datetime.now().timestamp() + 300,  # 5 minutes
                "swap_type": swap_type,
                "estimated_time": "30-60 seconds" if swap_type == "instant" else "2-5 minutes"
            }
            
            return quote
            
        except Exception as e:
            logger.error(f"Failed to get swap quote: {e}")
            raise ValidationError(f"Failed to get swap quote: {str(e)}")
    
    async def execute_swap(
        self,
        db: Session,
        user_id: str,
        quote_id: str,
        from_wallet_id: str,
        to_wallet_id: str
    ) -> Dict[str, Any]:
        """Execute a crypto swap based on quote"""
        try:
            # In production, validate quote_id and check expiry
            
            # Check user subscription for better rates
            subscription = await billing_service.get_user_subscription(db, user_id)
            
            # Apply subscription discount
            fee_discount = 0
            if subscription["tier"] == "pro":
                fee_discount = 0.1  # 10% discount
            elif subscription["tier"] == "enterprise":
                fee_discount = 0.2  # 20% discount
            
            # Mock swap execution
            swap_data = {
                "swap_id": str(uuid.uuid4()),
                "user_id": user_id,
                "quote_id": quote_id,
                "from_wallet_id": from_wallet_id,
                "to_wallet_id": to_wallet_id,
                "status": "pending",
                "fee_discount": fee_discount,
                "estimated_completion": datetime.now().timestamp() + 180,  # 3 minutes
                "transaction_hash": f"0x{uuid.uuid4().hex}",
                "revenue_generated": 25.50,  # Mock revenue for this swap
                "created_at": datetime.now()
            }
            
            # Log revenue
            logger.info(f"💰 Swap executed - Revenue: ${swap_data['revenue_generated']}")
            
            return swap_data
            
        except Exception as e:
            logger.error(f"Failed to execute swap: {e}")
            raise ValidationError(f"Failed to execute swap: {str(e)}")
    
    def _estimate_network_fee(self, from_asset: str, to_asset: str) -> Dict[str, Any]:
        """Estimate network fees for the swap"""
        # Mock network fees
        network_fees = {
            "BTC": {"amount": 0.0001, "usd": 4.20},
            "ETH": {"amount": 0.005, "usd": 12.50},
            "SOL": {"amount": 0.00025, "usd": 0.025},
            "ADA": {"amount": 0.17, "usd": 0.08},
            "AVAX": {"amount": 0.001, "usd": 0.035}
        }
        
        return {
            "from_network": network_fees.get(from_asset, {"amount": 0.001, "usd": 1.0}),
            "to_network": network_fees.get(to_asset, {"amount": 0.001, "usd": 1.0}),
            "total_usd": network_fees.get(from_asset, {"usd": 1.0})["usd"] + 
                        network_fees.get(to_asset, {"usd": 1.0})["usd"]
        }
    
    async def get_fiat_onramp_quote(
        self,
        db: Session,
        user_id: str,
        fiat_amount: float,
        fiat_currency: str,
        crypto_asset: str,
        payment_method: str = "credit_card"
    ) -> Dict[str, Any]:
        """Get quote for buying crypto with fiat"""
        try:
            # Mock fiat rates (BRL to crypto)
            fiat_rates = {
                "BTC": 210000,  # BRL per BTC
                "ETH": 12500,   # BRL per ETH
                "SOL": 500,     # BRL per SOL
                "USDT": 5.0,    # BRL per USDT
                "USDC": 5.0     # BRL per USDC
            }
            
            if crypto_asset.upper() not in fiat_rates:
                raise ValidationError(f"Fiat onramp not supported for {crypto_asset}")
            
            rate = fiat_rates[crypto_asset.upper()]
            base_crypto_amount = fiat_amount / rate
            
            # Apply our fee
            fee_rate = self.FEE_STRUCTURE["fiat_onramp"]
            fee_amount = fiat_amount * (fee_rate / 10000)
            final_crypto_amount = (fiat_amount - fee_amount) / rate
            
            # Payment method fees
            payment_fees = {
                "credit_card": 3.0,    # 3% additional fee
                "debit_card": 1.5,     # 1.5% additional fee  
                "pix": 0.5,            # 0.5% additional fee
                "bank_transfer": 0.0   # No additional fee
            }
            
            payment_fee = fiat_amount * (payment_fees.get(payment_method, 0) / 100)
            total_fees = fee_amount + payment_fee
            final_amount_after_all_fees = (fiat_amount - total_fees) / rate
            
            quote = {
                "quote_id": str(uuid.uuid4()),
                "fiat_amount": fiat_amount,
                "fiat_currency": fiat_currency.upper(),
                "crypto_asset": crypto_asset.upper(),
                "crypto_amount": final_amount_after_all_fees,
                "exchange_rate": rate,
                "our_fee": fee_amount,
                "payment_method_fee": payment_fee,
                "total_fees": total_fees,
                "payment_method": payment_method,
                "valid_until": datetime.now().timestamp() + 600,  # 10 minutes
                "estimated_time": "5-15 minutes"
            }
            
            return quote
            
        except Exception as e:
            logger.error(f"Failed to get fiat onramp quote: {e}")
            raise ValidationError(f"Failed to get fiat onramp quote: {str(e)}")
    
    async def get_exchange_stats(self, db: Session) -> Dict[str, Any]:
        """Get exchange revenue and volume statistics"""
        # Mock data for demonstration
        return {
            "daily_volume_usd": 125000,
            "daily_revenue": 1250,  # From fees
            "total_swaps": 89,
            "average_swap_size": 1404,
            "top_pairs": [
                {"pair": "BTC/USDT", "volume": 45000, "trades": 23},
                {"pair": "ETH/USDT", "volume": 32000, "trades": 19},
                {"pair": "SOL/USDT", "volume": 18000, "trades": 15}
            ],
            "revenue_breakdown": {
                "swap_fees": 850,
                "fiat_onramp": 300,
                "cross_chain": 100
            }
        }
    
    async def get_supported_assets(self) -> List[Dict[str, Any]]:
        """Get list of supported assets for trading"""
        return [
            {
                "symbol": "BTC",
                "name": "Bitcoin",
                "decimals": 8,
                "min_swap": 0.001,
                "supports_fiat": True
            },
            {
                "symbol": "ETH", 
                "name": "Ethereum",
                "decimals": 18,
                "min_swap": 0.01,
                "supports_fiat": True
            },
            {
                "symbol": "SOL",
                "name": "Solana", 
                "decimals": 9,
                "min_swap": 1,
                "supports_fiat": True
            },
            {
                "symbol": "USDT",
                "name": "Tether",
                "decimals": 6,
                "min_swap": 10,
                "supports_fiat": True
            },
            {
                "symbol": "USDC",
                "name": "USD Coin",
                "decimals": 6, 
                "min_swap": 10,
                "supports_fiat": True
            },
            {
                "symbol": "ADA",
                "name": "Cardano",
                "decimals": 6,
                "min_swap": 10,
                "supports_fiat": False
            },
            {
                "symbol": "AVAX",
                "name": "Avalanche",
                "decimals": 18,
                "min_swap": 1,
                "supports_fiat": False
            }
        ]

# Global instance
exchange_service = ExchangeService()
