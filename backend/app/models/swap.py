"""
🔄 Swap Model
=============

Modelo para armazenar transações de swap (troca de tokens).
"""

from sqlalchemy import (
    Column, 
    Integer, 
    String, 
    DateTime, 
    Numeric, 
    Text,
    ForeignKey,
    Enum,
    Index,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.models.base import BaseModel


class SwapStatus(str, enum.Enum):
    """Status do swap."""
    PENDING = "pending"           # Aguardando execução
    APPROVING = "approving"       # Aguardando aprovação do token
    EXECUTING = "executing"       # Executando swap
    COMPLETED = "completed"       # Concluído com sucesso
    FAILED = "failed"             # Falhou
    CANCELLED = "cancelled"       # Cancelado
    EXPIRED = "expired"           # Cotação expirou


class SwapTransaction(BaseModel):
    """Modelo de transação de swap."""
    
    __tablename__ = "swap_transactions"
    
    # Identificadores
    swap_id = Column(String(50), unique=True, nullable=False, index=True)
    quote_id = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Rede/Chain
    chain_id = Column(Integer, nullable=False)
    chain_name = Column(String(50))
    
    # Token de origem (from)
    from_token_address = Column(String(100), nullable=False)
    from_token_symbol = Column(String(20))
    from_amount = Column(Numeric(36, 18), nullable=False)  # Em unidades mínimas
    from_amount_usd = Column(Numeric(18, 2))
    
    # Token de destino (to)
    to_token_address = Column(String(100), nullable=False)
    to_token_symbol = Column(String(20))
    to_amount_gross = Column(Numeric(36, 18))  # Valor bruto antes da taxa
    to_amount_net = Column(Numeric(36, 18))    # Valor líquido após taxa
    to_amount_usd = Column(Numeric(18, 2))
    
    # Taxa HOLDWallet
    fee_percentage = Column(Numeric(6, 4))     # Ex: 0.0030 = 0.30%
    fee_amount = Column(Numeric(36, 18))       # Valor da taxa
    fee_amount_usd = Column(Numeric(18, 2))
    fee_recipient = Column(String(100))        # Endereço que recebeu a taxa
    
    # Configurações
    slippage = Column(Numeric(5, 2))           # Tolerância de slippage %
    
    # Taxa de câmbio
    exchange_rate = Column(Numeric(36, 18))    # Taxa from -> to
    
    # Transações na blockchain
    approval_tx_hash = Column(String(100))      # Hash da tx de approval
    swap_tx_hash = Column(String(100))          # Hash da tx de swap
    fee_tx_hash = Column(String(100))           # Hash da tx de coleta de taxa
    
    # Endereços
    user_address = Column(String(100), nullable=False)
    router_address = Column(String(100))        # Router usado (1inch)
    
    # DEX utilizado
    dex_aggregator = Column(String(50), default="1inch")  # 1inch, 0x, etc
    dex_route = Column(Text)                              # JSON com rota usada
    
    # Status e timestamps
    status = Column(Enum(SwapStatus), default=SwapStatus.PENDING, nullable=False)
    error_message = Column(Text)
    
    # Gas
    gas_estimate = Column(Integer)
    gas_used = Column(Integer)
    gas_price_gwei = Column(Numeric(12, 4))
    gas_cost_native = Column(Numeric(36, 18))   # Custo em token nativo
    gas_cost_usd = Column(Numeric(18, 2))
    
    # Timestamps específicos
    quoted_at = Column(DateTime(timezone=True))
    executed_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    
    # Relacionamentos
    user = relationship("User", backref="swaps")
    
    # Índices
    __table_args__ = (
        Index("ix_swap_user_created", "user_id", "created_at"),
        Index("ix_swap_status_created", "status", "created_at"),
        Index("ix_swap_chain_user", "chain_id", "user_id"),
    )
    
    def __repr__(self):
        return f"<SwapTransaction {self.swap_id}: {self.from_token_symbol} -> {self.to_token_symbol}>"
    
    def to_dict(self):
        """Converter para dicionário."""
        # Helper para converter valores numéricos com segurança
        def safe_float(val):
            try:
                return float(val) if val is not None else None
            except (TypeError, ValueError):
                return None
        
        def safe_str(val):
            return str(val) if val is not None else None
        
        return {
            "swap_id": self.swap_id,
            "quote_id": self.quote_id,
            "user_id": self.user_id,
            "chain_id": self.chain_id,
            "chain_name": self.chain_name,
            "from_token": {
                "address": self.from_token_address,
                "symbol": self.from_token_symbol,
                "amount": safe_str(self.from_amount),
                "amount_usd": safe_float(self.from_amount_usd),
            },
            "to_token": {
                "address": self.to_token_address,
                "symbol": self.to_token_symbol,
                "amount_gross": safe_str(self.to_amount_gross),
                "amount_net": safe_str(self.to_amount_net),
                "amount_usd": safe_float(self.to_amount_usd),
            },
            "fee": {
                "percentage": safe_float(self.fee_percentage),
                "amount": safe_str(self.fee_amount),
                "amount_usd": safe_float(self.fee_amount_usd),
            },
            "slippage": safe_float(self.slippage),
            "exchange_rate": safe_float(self.exchange_rate),
            "status": self.status.value if self.status else None,
            "transactions": {
                "approval": self.approval_tx_hash,
                "swap": self.swap_tx_hash,
                "fee": self.fee_tx_hash,
            },
            "gas": {
                "estimate": self.gas_estimate,
                "used": self.gas_used,
                "price_gwei": safe_float(self.gas_price_gwei),
                "cost_usd": safe_float(self.gas_cost_usd),
            },
            "dex": self.dex_aggregator,
            "error": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class SwapFeeCollection(BaseModel):
    """
    Registro de taxas coletadas.
    
    Usado para rastrear taxas a serem consolidadas
    e enviadas para a carteira principal.
    """
    
    __tablename__ = "swap_fee_collections"
    
    # Referência ao swap
    swap_id = Column(Integer, ForeignKey("swap_transactions.id"), nullable=False)
    
    # Detalhes da taxa
    chain_id = Column(Integer, nullable=False)
    token_address = Column(String(100), nullable=False)
    token_symbol = Column(String(20))
    amount = Column(Numeric(36, 18), nullable=False)
    amount_usd = Column(Numeric(18, 2))
    
    # Coleta
    is_collected = Column(Boolean, default=False)
    collected_at = Column(DateTime(timezone=True))
    collection_tx_hash = Column(String(100))
    
    # Endereços
    from_address = Column(String(100))  # Origem (carteira do usuário)
    to_address = Column(String(100))    # Destino (carteira de taxas)
    
    # Relacionamentos
    swap = relationship("SwapTransaction", backref="fee_collections")
    
    __table_args__ = (
        Index("ix_fee_collection_pending", "is_collected", "chain_id"),
    )


class DailySwapStats(BaseModel):
    """
    Estatísticas diárias de swap.
    
    Para dashboard admin e relatórios.
    """
    
    __tablename__ = "daily_swap_stats"
    
    date = Column(DateTime(timezone=True), nullable=False, unique=True)
    chain_id = Column(Integer)
    
    # Volume
    total_swaps = Column(Integer, default=0)
    successful_swaps = Column(Integer, default=0)
    failed_swaps = Column(Integer, default=0)
    total_volume_usd = Column(Numeric(18, 2), default=0)
    
    # Taxas
    total_fees_collected_usd = Column(Numeric(18, 2), default=0)
    
    # Usuários
    unique_users = Column(Integer, default=0)
    
    # Tokens mais trocados (JSON)
    top_from_tokens = Column(Text)
    top_to_tokens = Column(Text)
    
    __table_args__ = (
        Index("ix_daily_stats_date_chain", "date", "chain_id"),
    )
