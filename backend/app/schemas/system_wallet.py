"""
System Wallet Schemas
=====================

Schemas para operacoes com as carteiras do sistema.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
import re


class SystemWalletSendRequest(BaseModel):
    """Request para enviar crypto da carteira do sistema."""
    
    wallet_name: str = Field(
        default="main_fees_wallet",
        description="Nome da carteira de origem"
    )
    network: str = Field(
        ...,
        description="Rede blockchain (polygon, ethereum, bitcoin, etc.)"
    )
    to_address: str = Field(
        ...,
        description="Endereco de destino (Ledger, exchange, etc.)"
    )
    amount: Decimal = Field(
        ...,
        gt=0,
        description="Valor a enviar"
    )
    token: str = Field(
        default="native",
        description="Token a enviar: 'native', 'USDT', 'USDC', 'DAI'"
    )
    memo: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Nota/memo opcional para registro"
    )
    two_factor_code: Optional[str] = Field(
        default=None,
        min_length=6,
        max_length=6,
        description="Codigo 2FA (6 digitos) - obrigatorio para envios"
    )
    
    @validator('network')
    def validate_network(cls, v):
        valid_networks = [
            'ethereum', 'polygon', 'bsc', 'base', 'avalanche',
            'bitcoin', 'litecoin', 'dogecoin',
            'tron', 'solana', 'xrp', 'cardano', 'polkadot'
        ]
        if v.lower() not in valid_networks:
            raise ValueError(f"Rede invalida. Redes suportadas: {', '.join(valid_networks)}")
        return v.lower()
    
    @validator('token')
    def validate_token(cls, v):
        valid_tokens = ['native', 'USDT', 'USDC', 'DAI', 'TRAY']
        if v.upper() not in [t.upper() for t in valid_tokens] and v != 'native':
            raise ValueError(f"Token invalido. Tokens suportados: {', '.join(valid_tokens)}")
        return v.upper() if v != 'native' else 'native'
    
    @validator('to_address')
    def validate_address_format(cls, v, values):
        # Validacao basica de formato por rede
        network = values.get('network', '').lower()
        
        # EVM networks (Ethereum, Polygon, BSC, etc.)
        evm_networks = ['ethereum', 'polygon', 'bsc', 'base', 'avalanche']
        if network in evm_networks:
            if not re.match(r'^0x[a-fA-F0-9]{40}$', v):
                raise ValueError(f"Endereco EVM invalido. Deve comecar com 0x e ter 42 caracteres.")
        
        # Bitcoin
        elif network == 'bitcoin':
            # Aceita Legacy (1...), SegWit (3...), Native SegWit (bc1...)
            if not (v.startswith('1') or v.startswith('3') or v.startswith('bc1')):
                raise ValueError("Endereco Bitcoin invalido. Deve comecar com 1, 3 ou bc1.")
        
        # Tron
        elif network == 'tron':
            if not v.startswith('T') or len(v) != 34:
                raise ValueError("Endereco Tron invalido. Deve comecar com T e ter 34 caracteres.")
        
        # Solana
        elif network == 'solana':
            if len(v) < 32 or len(v) > 44:
                raise ValueError("Endereco Solana invalido. Deve ter entre 32 e 44 caracteres.")
        
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "wallet_name": "main_fees_wallet",
                "network": "polygon",
                "to_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8dB1E",
                "amount": "1000.00",
                "token": "USDT",
                "memo": "Saque mensal para Ledger"
            }
        }


class SystemWalletSendResponse(BaseModel):
    """Response de envio de crypto."""
    
    success: bool
    tx_hash: Optional[str] = None
    from_address: str
    to_address: str
    amount: str
    token: str
    network: str
    status: str  # "pending", "confirmed", "failed"
    explorer_url: Optional[str] = None
    gas_used: Optional[str] = None
    gas_price: Optional[str] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "tx_hash": "0x1234567890abcdef...",
                "from_address": "0xSystemWallet...",
                "to_address": "0xLedgerAddress...",
                "amount": "1000.00",
                "token": "USDT",
                "network": "polygon",
                "status": "pending",
                "explorer_url": "https://polygonscan.com/tx/0x..."
            }
        }


class SystemWalletBalanceResponse(BaseModel):
    """Response de saldo da carteira."""
    
    wallet_name: str
    network: str
    address: str
    native_balance: Decimal
    native_symbol: str
    tokens: Dict[str, Decimal] = {}  # {"USDT": 1000.00, "USDC": 500.00}
    total_usd: Optional[Decimal] = None
    last_updated: Optional[datetime] = None


class InternalTransferRequest(BaseModel):
    """Request para transferencia interna entre carteiras do sistema."""
    
    from_wallet: str = Field(..., description="Carteira de origem")
    to_wallet: str = Field(..., description="Carteira de destino")
    network: str = Field(..., description="Rede blockchain")
    amount: Decimal = Field(..., gt=0, description="Valor a transferir")
    token: str = Field(default="native", description="Token a transferir")
    reason: Optional[str] = Field(default=None, max_length=500)
    
    @validator('network')
    def validate_network(cls, v):
        valid_networks = [
            'ethereum', 'polygon', 'bsc', 'base', 'avalanche',
            'bitcoin', 'litecoin', 'dogecoin',
            'tron', 'solana', 'xrp'
        ]
        if v.lower() not in valid_networks:
            raise ValueError(f"Rede invalida")
        return v.lower()


class InternalTransferResponse(BaseModel):
    """Response de transferencia interna."""
    
    success: bool
    transfer_id: Optional[str] = None
    from_wallet: str
    to_wallet: str
    amount: str
    token: str
    network: str
    tx_hash: Optional[str] = None  # Se precisou de tx blockchain
    status: str  # "completed", "pending", "failed"
    message: Optional[str] = None
    error: Optional[str] = None


class CreateWalletRequest(BaseModel):
    """Request para criar nova carteira do sistema."""
    
    name: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Nome unico da carteira"
    )
    wallet_type: str = Field(
        ...,
        description="Tipo: 'hot', 'cold', 'fees'"
    )
    description: Optional[str] = Field(
        default=None,
        max_length=500
    )
    daily_limit: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Limite diario de saque em USD"
    )
    min_balance_alert: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Alerta quando saldo abaixo deste valor"
    )
    max_balance_auto_transfer: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Auto-transferir quando saldo acima deste valor"
    )
    use_existing_mnemonic: bool = Field(
        default=True,
        description="Usar mnemonic existente (deriva novos enderecos) ou criar nova"
    )
    
    @validator('wallet_type')
    def validate_wallet_type(cls, v):
        valid_types = ['hot', 'cold', 'fees']
        if v.lower() not in valid_types:
            raise ValueError(f"Tipo invalido. Tipos suportados: {', '.join(valid_types)}")
        return v.lower()
    
    @validator('name')
    def validate_name(cls, v):
        # Apenas letras, numeros e underscore
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]*$', v):
            raise ValueError("Nome deve comecar com letra e conter apenas letras, numeros e underscore")
        return v.lower()


class CreateWalletResponse(BaseModel):
    """Response de criacao de carteira."""
    
    success: bool
    wallet_id: Optional[str] = None
    name: str
    wallet_type: str
    addresses: Optional[Dict[str, str]] = None  # {"polygon": "0x...", "bitcoin": "bc1..."}
    mnemonic: Optional[str] = None  # Apenas se criou nova mnemonic
    warning: Optional[str] = None
    error: Optional[str] = None


class WalletStatusResponse(BaseModel):
    """Status geral de uma carteira."""
    
    wallet_id: str
    name: str
    wallet_type: str
    is_active: bool
    is_locked: bool
    daily_limit: Optional[Decimal] = None
    daily_spent: Decimal = Decimal("0")
    daily_remaining: Optional[Decimal] = None
    total_balance_usd: Optional[Decimal] = None
    balances_by_network: Dict[str, Dict[str, Any]] = {}
    alerts: List[str] = []
    last_transaction: Optional[datetime] = None


class TransferRequestCreate(BaseModel):
    """Request para criar solicitacao de transferencia (com delay)."""
    
    from_wallet: str
    to_wallet: Optional[str] = None  # Se interno
    to_external_address: Optional[str] = None  # Se externo
    network: str
    token: str = "native"
    amount: Decimal
    reason: Optional[str] = None
    urgency: str = Field(default="normal", description="'normal' ou 'urgent'")
    
    @validator('urgency')
    def validate_urgency(cls, v):
        if v not in ['normal', 'urgent']:
            raise ValueError("Urgencia deve ser 'normal' ou 'urgent'")
        return v


class TransferRequestResponse(BaseModel):
    """Response de solicitacao de transferencia."""
    
    request_id: str
    status: str  # "pending_approval", "pending_delay", "approved", "executed", "rejected", "cancelled"
    from_wallet: str
    to_wallet: Optional[str] = None
    to_external_address: Optional[str] = None
    network: str
    token: str
    amount: str
    delay_until: Optional[datetime] = None  # Quando podera ser executada
    created_at: datetime
    message: Optional[str] = None
