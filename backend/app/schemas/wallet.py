"""
Wallet schemas for API requests and responses with HD wallet support.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# Request schemas
class WalletCreate(BaseModel):
    """Schema for creating a new wallet."""
    name: Optional[str] = Field(default=None, max_length=100, description="Optional wallet name (auto-generated if not provided)")
    network: str = Field(..., description="Blockchain network (multi, bitcoin, ethereum, polygon, bsc, solana, usdt, litecoin, dogecoin, cardano, avalanche, polkadot, chainlink, usdc, shiba, xrp)")
    passphrase: Optional[str] = Field(default="", description="Optional passphrase for additional security")
    
    @validator('network')
    def validate_network(cls, v):
        allowed_networks = ['multi', 'bitcoin', 'ethereum', 'polygon', 'bsc', 'solana', 'usdt', 'litecoin', 'dogecoin', 'cardano', 'avalanche', 'polkadot', 'chainlink', 'usdc', 'shiba', 'xrp']
        if v.lower() not in allowed_networks:
            raise ValueError(f'Network must be one of: {", ".join(allowed_networks)}')
        return v.lower()

class WalletRestore(BaseModel):
    """Schema for restoring a wallet from mnemonic."""
    name: str = Field(..., min_length=1, max_length=100, description="Wallet name")
    network: str = Field(..., description="Blockchain network")
    mnemonic: str = Field(..., description="BIP39 mnemonic phrase (12 or 24 words)")
    passphrase: Optional[str] = Field(default="", description="Optional passphrase")
    
    @validator('network')
    def validate_network(cls, v):
        allowed_networks = ['multi', 'bitcoin', 'ethereum', 'polygon', 'bsc', 'solana', 'usdt', 'litecoin', 'dogecoin', 'cardano', 'avalanche', 'polkadot', 'chainlink', 'usdc', 'shiba', 'xrp']
        if v.lower() not in allowed_networks:
            raise ValueError(f'Network must be one of: {", ".join(allowed_networks)}')
        return v.lower()
    
    @validator('mnemonic')
    def validate_mnemonic(cls, v):
        words = v.strip().split()
        if len(words) not in [12, 24]:
            raise ValueError('Mnemonic must be 12 or 24 words')
        return v.strip()

class WalletAddressRequest(BaseModel):
    """Request schema for creating a new address in a wallet."""
    address_type: str = Field(default="receiving", description="Type of address (receiving, change)")
    derivation_index: Optional[int] = None

# Response schemas
class AddressResponse(BaseModel):
    """Response schema for wallet addresses."""
    id: int
    address: str
    network: Optional[str] = None
    address_type: str
    derivation_index: Optional[int]
    derivation_path: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class WalletResponse(BaseModel):
    """Schema for wallet responses."""
    id: UUID
    name: str
    network: str
    derivation_path: Optional[str]
    first_address: Optional[str]
    created_at: datetime
    is_active: bool
    restored: Optional[bool] = False
    
    class Config:
        from_attributes = True

class WalletWithMnemonic(WalletResponse):
    """Schema for wallet creation response with mnemonic (SECURITY SENSITIVE)."""
    mnemonic: Optional[str] = Field(None, description="⚠️ BIP39 mnemonic phrase - SAVE SECURELY! Only shown once for new seeds.")
    
    class Config:
        from_attributes = True
        schema_extra = {
            "example": {
                "id": "d01af195-b535-4dcb-9eab-f0ae58910a1d",
                "name": "My Bitcoin Wallet", 
                "network": "bitcoin",
                "derivation_path": "m/44'/0'/0'",
                "first_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                "created_at": "2025-01-01T00:00:00Z",
                "is_active": True,
                "mnemonic": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
            }
        }

class WalletBalanceResponse(BaseModel):
    """Response schema for wallet balance information."""
    wallet_id: UUID
    network: str
    native_balance: str
    token_balances: Dict[str, str] = {}
    total_usd_value: str = "0"
    last_updated: Optional[datetime] = None

class NetworkBalanceDetail(BaseModel):
    """Balance detail for a specific network."""
    network: str
    address: str
    balance: str
    balance_usd: str = "0"
    balance_brl: str = "0"
    last_updated: Optional[datetime] = None

class WalletBalancesByNetworkResponse(BaseModel):
    """Response schema for wallet balances grouped by network."""
    wallet_id: UUID
    wallet_name: str
    balances: Dict[str, NetworkBalanceDetail]
    total_usd: str = "0"
    total_brl: str = "0"

class WalletListResponse(BaseModel):
    """Response schema for wallet list."""
    wallets: List[WalletResponse]
    total_count: int
    offset: int
    limit: int
