"""
🚀 HOLD Wallet - Instant Trade OTC Models
==========================================

Models para operações OTC (Over-The-Counter) de compra/venda instantânea de criptomoedas.
Estrutura preparada para escalar de PF para PJ.

Author: HOLD Wallet Team
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, 
    Text, Numeric, Enum as SQLEnum, Index, func
)
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from decimal import Decimal
import enum

from app.core.db import Base


class TradeOperationType(str, enum.Enum):
    """Tipo de operação OTC"""
    BUY = "buy"      # Compra de criptomoeda
    SELL = "sell"    # Venda de criptomoeda


class TradeStatus(str, enum.Enum):
    """Status da operação OTC"""
    PENDING = "PENDING"                          # Aguardando confirmação
    PAYMENT_PROCESSING = "PAYMENT_PROCESSING"    # Processando pagamento
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED"      # Pagamento confirmado (BUY)
    CRYPTO_RECEIVED = "CRYPTO_RECEIVED"          # Crypto recebida (SELL) - aguardando PIX
    COMPLETED = "COMPLETED"                      # Operação concluída
    EXPIRED = "EXPIRED"                          # Expirou (15 min)
    CANCELLED = "CANCELLED"                      # Cancelada pelo usuário
    FAILED = "FAILED"                            # Falha na operação


class PaymentMethod(str, enum.Enum):
    """Métodos de pagamento aceitos"""
    PIX = "pix"                    # PIX (Brasil)
    TED = "ted"                    # Transferência eletrônica
    CREDIT_CARD = "credit_card"    # Cartão de crédito
    DEBIT_CARD = "debit_card"      # Cartão de débito
    PAYPAL = "paypal"              # PayPal


class InstantTrade(Base):
    """
    Modelo para operações OTC instantâneas
    
    FLUXO DE COMPRA (usuário compra cripto da plataforma):
    1. Usuário solicita compra (ex: R$ 100 de USDT)
    2. Usuário paga via PIX/TED/Cartão
    3. Admin confirma pagamento (status: PAYMENT_CONFIRMED)
    4. Sistema deposita crypto na wallet blockchain do usuário
    5. Registra tx_hash, wallet_address, network
    6. Status: COMPLETED
    
    FLUXO DE VENDA (usuário vende cripto para a plataforma):
    1. Usuário solicita venda (ex: 10 MATIC)
    2. Sistema verifica saldo na wallet do usuário
    3. Usuário confirma venda
    4. Plataforma processa pagamento fiat (PIX/TED)
    5. Status: COMPLETED
    """
    __tablename__ = "instant_trades"

    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign keys (String para UUID compatível com PostgreSQL)
    user_id = Column(String, nullable=False, index=True)
    
    # Tipo de operação
    operation_type = Column(
        SQLEnum(TradeOperationType), 
        nullable=False, 
        index=True
    )
    
    # Criptomoeda
    symbol = Column(String(10), nullable=False)  # 'BTC', 'ETH', 'USDT', etc
    name = Column(String(50), nullable=False)    # 'Bitcoin', 'Ethereum', etc
    
    # Valores (em precisão decimal)
    fiat_amount = Column(Numeric(18, 2), nullable=False)           # Valor em USD
    crypto_amount = Column(Numeric(28, 18), nullable=False)        # Quantidade de crypto
    crypto_price = Column(Numeric(18, 2), nullable=False)          # Preço no momento (USD)
    
    # Taxas e spreads
    spread_percentage = Column(Numeric(5, 2), nullable=False, default=3.00)      # 3%
    spread_amount = Column(Numeric(18, 2), nullable=False)                       # Valor spread
    network_fee_percentage = Column(Numeric(5, 2), nullable=False, default=0.25) # 0.25%
    network_fee_amount = Column(Numeric(18, 2), nullable=False)                  # Valor fee
    total_amount = Column(Numeric(18, 2), nullable=False)                        # Total com taxas (USD)
    
    # Valor em BRL para pagamento TED/PIX
    brl_amount = Column(Numeric(18, 2), nullable=True)             # Valor original em BRL
    brl_total_amount = Column(Numeric(18, 2), nullable=True)       # Total a pagar em BRL (TED/PIX)
    usd_to_brl_rate = Column(Numeric(10, 4), nullable=True)        # Taxa USD/BRL no momento
    
    # Pagamento
    payment_method = Column(
        SQLEnum(PaymentMethod), 
        nullable=False,
        index=True
    )
    payment_id = Column(String(255), nullable=True)          # ID externo do gateway
    payment_proof_url = Column(String(500), nullable=True)   # URL comprovante
    
    # Status
    status = Column(
        SQLEnum(TradeStatus),
        nullable=False,
        default=TradeStatus.PENDING,
        index=True
    )
    
    # Reference code (OTC-2025-000123)
    reference_code = Column(String(20), nullable=False, unique=True, index=True)
    
    # Blockchain - Wallet info
    wallet_id = Column(String(36), nullable=True)            # ID da wallet do usuário
    wallet_address = Column(String(255), nullable=True)       # Endereço blockchain
    network = Column(String(20), nullable=True)               # 'ethereum', 'polygon', 'base', etc
    tx_hash = Column(String(255), nullable=True)              # Hash da transação blockchain
    
    # PIX - Dados do Banco do Brasil API
    pix_txid = Column(String(50), nullable=True, index=True)  # TXID do PIX no BB
    pix_location = Column(String(500), nullable=True)          # URL do QR Code
    pix_qrcode = Column(Text, nullable=True)                   # Payload EMV copia-e-cola
    pix_valor_recebido = Column(Numeric(18, 2), nullable=True) # Valor efetivamente recebido
    pix_end_to_end_id = Column(String(50), nullable=True)      # ID único do PIX (e2e)
    pix_confirmado_em = Column(DateTime, nullable=True)        # Quando foi confirmado via webhook
    
    # Timing
    expires_at = Column(DateTime, nullable=False, index=True)          # Válido por 15 min
    payment_confirmed_at = Column(DateTime, nullable=True)              # Quando pagou
    completed_at = Column(DateTime, nullable=True)                      # Quando completou
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Dados adicionais (JSON para flexibilidade futura)
    trade_metadata = Column(Text, nullable=True)  # JSON com dados extras
    error_message = Column(Text, nullable=True)  # Se falhar
    
    # Relationships
    # Como user_id é String (UUID) e não ForeignKey, usamos primaryjoin explícito
    user = relationship(
        "User", 
        back_populates="instant_trades",
        foreign_keys=[user_id],
        primaryjoin="foreign(InstantTrade.user_id) == cast(User.id, String)"
    )
    history = relationship(
        "InstantTradeHistory",
        back_populates="trade",
        cascade="all, delete-orphan"
    )
    
    # Índices para performance
    __table_args__ = (
        Index('idx_instant_trades_user_id', 'user_id'),
        Index('idx_instant_trades_status', 'status'),
        Index('idx_instant_trades_created_at', 'created_at'),
        Index('idx_instant_trades_expires_at', 'expires_at'),
        Index('idx_instant_trades_reference_code', 'reference_code'),
        Index('idx_instant_trades_symbol', 'symbol'),
        Index('idx_instant_trades_pix_txid', 'pix_txid'),
    )
    
    def __repr__(self):
        return f"<InstantTrade(id={self.id}, ref={self.reference_code}, status={self.status})>"


class InstantTradeHistory(Base):
    """Histórico de mudanças de status das operações OTC"""
    __tablename__ = "instant_trade_history"
    
    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign key
    trade_id = Column(String(36), ForeignKey("instant_trades.id"), nullable=False, index=True)
    
    # Status anterior e novo
    old_status = Column(
        SQLEnum(TradeStatus),
        nullable=True
    )
    new_status = Column(
        SQLEnum(TradeStatus),
        nullable=False
    )
    
    # Motivo da mudança
    reason = Column(String(255), nullable=True)
    history_details = Column(Text, nullable=True)  # JSON com detalhes
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationship
    trade = relationship("InstantTrade", back_populates="history")
    
    __table_args__ = (
        Index('idx_instant_trade_history_trade_id', 'trade_id'),
        Index('idx_instant_trade_history_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<InstantTradeHistory(trade={self.trade_id}, {self.old_status} -> {self.new_status})>"
