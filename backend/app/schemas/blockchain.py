from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

# Price schemas
class PriceData(BaseModel):
    symbol: str
    currency: str
    price: Decimal
    market_cap: Optional[Decimal] = None
    volume_24h: Optional[Decimal] = None
    price_change_24h: Optional[Decimal] = None
    price_change_percentage_24h: Optional[Decimal] = None
    last_updated: datetime

class PriceResponse(BaseModel):
    data: List[PriceData]
    source: str
    cached: bool
    cache_expires_at: Optional[datetime] = None

class MultiPriceResponse(BaseModel):
    prices: Dict[str, Dict[str, Decimal]]  # {"BTC": {"USD": 50000, "BRL": 250000}}
    last_updated: datetime
    source: str

# Balance schemas  
class BalanceData(BaseModel):
    address: str
    balance: str
    token_symbol: str
    token_address: Optional[str] = None
    network: str
    decimals: int = 18

class BalanceResponse(BaseModel):
    address: str
    network: str
    native_balance: str
    balance_wei: Optional[int] = None
    balance_satoshis: Optional[int] = None
    confirmed_txs: Optional[int] = None
    unconfirmed_txs: Optional[int] = None
    token_balances: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True

# Network info schemas
class NetworkInfo(BaseModel):
    name: str
    chain_id: int
    rpc_url: str
    explorer_url: str
    symbol: str
    decimals: int
    is_testnet: bool = False

class NetworksResponse(BaseModel):
    networks: List[NetworkInfo]

# Gas estimation schemas
class GasEstimation(BaseModel):
    slow: Decimal
    standard: Decimal
    fast: Decimal
    unit: str  # "gwei" for EVM, "sat/byte" for BTC
    estimated_time_minutes: Dict[str, int]  # {"slow": 10, "standard": 5, "fast": 2}

class GasResponse(BaseModel):
    gas_prices: GasEstimation
    network: str
    last_updated: datetime


# Novos schemas para blockchain integration

class TransactionData(BaseModel):
    """Schema para dados de transação"""
    hash: str = Field(..., description="Hash da transação")
    confirmed: bool = Field(..., description="Status de confirmação")
    timestamp: Optional[int] = Field(None, description="Timestamp da transação")
    value_received: str = Field("0", description="Valor recebido")
    value_sent: str = Field("0", description="Valor enviado")
    fee: str = Field("0", description="Taxa da transação")
    network: str = Field(..., description="Rede da transação")
    block_height: Optional[int] = Field(None, description="Altura do bloco")
    confirmations: Optional[int] = Field(None, description="Número de confirmações")

    class Config:
        from_attributes = True


class TransactionHistoryResponse(BaseModel):
    """Schema para resposta de histórico de transações"""
    address: str
    network: str
    transactions: List[TransactionData]
    count: int
    error: Optional[str] = None

    class Config:
        from_attributes = True


class AddressValidationResponse(BaseModel):
    """Schema para resposta de validação de endereço"""
    address: str
    network: str
    is_valid: bool
    format_info: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class FeeEstimateResponse(BaseModel):
    """Schema para resposta de estimativa de taxas"""
    network: str
    slow_fee: Optional[str] = Field(None, description="Taxa lenta")
    standard_fee: Optional[str] = Field(None, description="Taxa padrão")
    fast_fee: Optional[str] = Field(None, description="Taxa rápida")
    estimated_fee: Optional[str] = Field(None, description="Taxa estimada")
    gas_limit: Optional[int] = Field(None, description="Limite de gas (EVM)")
    gas_price: Optional[str] = Field(None, description="Preço do gas (EVM)")
    unit: Optional[str] = Field(None, description="Unidade da taxa")
    error: Optional[str] = None

    class Config:
        from_attributes = True


class BroadcastTransactionRequest(BaseModel):
    """Schema para request de broadcast de transação"""
    network: str
    signed_transaction: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class BroadcastTransactionResponse(BaseModel):
    """Schema para resposta de broadcast"""
    transaction_hash: Optional[str]
    status: str  # broadcasted, failed, pending
    network: str
    timestamp: datetime
    error: Optional[str] = None

    class Config:
        from_attributes = True
