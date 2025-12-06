from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from decimal import Decimal
import uuid

# Request schemas
class TransactionCreateRequest(BaseModel):
    """Request para criar uma nova transação"""
    from_address: str = Field(..., description="Endereço de origem")
    to_address: str = Field(..., min_length=1, description="Endereço de destino")
    amount: str = Field(..., pattern=r"^[0-9]+(\.[0-9]+)?$", description="Valor a enviar")
    network: str = Field(..., description="Rede blockchain (bitcoin, ethereum, polygon, bsc)")
    fee_preference: str = Field("standard", description="Preferência de taxa (slow, standard, fast)")
    memo: Optional[str] = Field(None, max_length=500, description="Nota/memo opcional")
    token_address: Optional[str] = Field(None, description="Endereço do token (para ERC-20/BEP-20)")
    
    class Config:
        schema_extra = {
            "example": {
                "from_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                "to_address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
                "amount": "0.001",
                "network": "bitcoin",
                "fee_preference": "standard",
                "memo": "Pagamento de serviços"
            }
        }

class TransactionSignRequest(BaseModel):
    """Request para assinar uma transação"""
    transaction_id: int = Field(..., description="ID da transação")
    password: Optional[str] = Field(None, description="Senha para descriptografar carteira")
    
class TransactionBroadcastRequest(BaseModel):
    """Request para fazer broadcast de transação assinada"""
    transaction_id: int = Field(..., description="ID da transação")

class TransactionEstimateRequest(BaseModel):
    """Request schema for estimating transaction fees."""
    from_address: str
    to_address: str = Field(..., min_length=1)
    amount: str = Field(..., pattern=r"^[0-9]+(\.[0-9]+)?$")
    network: str = Field(..., description="Rede blockchain")
    token_address: Optional[str] = None
    
class TransactionSendRequest(BaseModel):
    """Request schema for sending a transaction."""
    from_address: str
    to_address: str = Field(..., min_length=1)
    amount: str = Field(..., pattern=r"^[0-9]+(\.[0-9]+)?$")
    token_address: Optional[str] = None
    fee: Optional[str] = None
    note: Optional[str] = Field(None, max_length=500)

# Response schemas
class TransactionCreateResponse(BaseModel):
    """Response para transação criada"""
    transaction_id: int = Field(..., description="ID da transação")
    from_address: str = Field(..., description="Endereço de origem")
    to_address: str = Field(..., description="Endereço de destino")
    amount: str = Field(..., description="Valor")
    fee: str = Field(..., description="Taxa estimada")
    network: str = Field(..., description="Rede")
    status: str = Field(..., description="Status atual")
    estimated_confirmation_time: str = Field(..., description="Tempo estimado de confirmação")
    
class TransactionSignResponse(BaseModel):
    """Response para transação assinada"""
    transaction_id: int = Field(..., description="ID da transação")
    status: str = Field(..., description="Status atual")
    signed_transaction: str = Field(..., description="Transação assinada")
    ready_for_broadcast: bool = Field(..., description="Pronta para broadcast")

class TransactionBroadcastResponse(BaseModel):
    """Response para broadcast de transação"""
    transaction_id: int = Field(..., description="ID da transação")
    tx_hash: Optional[str] = Field(None, description="Hash da transação")
    status: str = Field(..., description="Status atual")
    network: str = Field(..., description="Rede")
    broadcast_result: Dict[str, Any] = Field(..., description="Resultado do broadcast")

class TransactionStatusResponse(BaseModel):
    """Response para status da transação"""
    transaction_id: int = Field(..., description="ID da transação")
    tx_hash: Optional[str] = Field(None, description="Hash da transação")
    status: str = Field(..., description="Status atual")
    confirmations: int = Field(0, description="Número de confirmações")
    network: str = Field(..., description="Rede")
    block_number: Optional[int] = Field(None, description="Número do bloco")
    gas_used: Optional[int] = Field(None, description="Gas usado (EVM)")
    final: bool = Field(False, description="Transação finalizada")

class TransactionResponse(BaseModel):
    """Response schema for transaction information."""
    id: Union[int, uuid.UUID]
    hash: Optional[str] = None
    tx_hash: Optional[str] = None  # Alias for hash
    from_address: str
    to_address: str
    amount: str
    fee: Optional[str] = None
    status: str
    confirmations: Optional[int] = 0
    block_number: Optional[int] = None
    network: str
    token_address: Optional[str] = None
    token_symbol: Optional[str] = None
    memo: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TransactionEstimateResponse(BaseModel):
    """Response schema for transaction fee estimates."""
    network: str
    estimated_fee: str
    fee_options: Dict[str, str] = {}
    gas_limit: Optional[int] = None
    gas_price: Optional[str] = None
    valid: bool = True
    error_message: Optional[str] = None

class TransactionListResponse(BaseModel):
    """Response schema for transaction list."""
    transactions: List[TransactionResponse]
    total: int
    limit: int
    offset: int
    has_more: bool

class TransactionStatsResponse(BaseModel):
    """Response para estatísticas de transações"""
    total_transactions: int = Field(..., description="Total de transações")
    pending_transactions: int = Field(..., description="Transações pendentes") 
    confirmed_transactions: int = Field(..., description="Transações confirmadas")
    failed_transactions: int = Field(..., description="Transações falharam")
    total_sent: str = Field(..., description="Total enviado")
    total_fees_paid: str = Field(..., description="Total de taxas pagas")
    networks: List[str] = Field(..., description="Redes utilizadas")
    last_transaction_date: Optional[datetime] = Field(None, description="Data da última transação")
